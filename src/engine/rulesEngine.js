import Papa from 'papaparse';

let catalogue = null;
let gstinRegistry = null;
let udyamRegistry = null;
let leadsData = null;

export async function loadCatalogue() {
  if (catalogue) return catalogue;
  const res = await fetch('/data/product_catalogue.csv');
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  catalogue = parsed.data.map(row => ({
    ...row,
    price_min_inr_per_month: Number(row.price_min_inr_per_month),
    price_max_inr_per_month: Number(row.price_max_inr_per_month),
    one_time_setup_inr: Number(row.one_time_setup_inr),
    min_contract_months: Number(row.min_contract_months),
    min_employees: Number(row.min_employees),
    min_sites: Number(row.min_sites),
    typical_install_days: Number(row.typical_install_days),
    target_segments: row.target_segments ? row.target_segments.split(';') : [],
    available_city_tiers: row.available_city_tiers ? row.available_city_tiers.split(';').map(Number) : [],
    requires_one_of: row.requires_one_of ? row.requires_one_of.split('|') : [],
  }));
  return catalogue;
}

export async function loadGstinRegistry() {
  if (gstinRegistry) return gstinRegistry;
  const res = await fetch('/data/mock_gstin_registry.csv');
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  gstinRegistry = new Map();
  parsed.data.forEach(row => {
    if (row.gstin) gstinRegistry.set(row.gstin.trim(), row);
  });
  return gstinRegistry;
}

export async function loadUdyamRegistry() {
  if (udyamRegistry) return udyamRegistry;
  const res = await fetch('/data/mock_udyam_registry.csv');
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  udyamRegistry = new Map();
  parsed.data.forEach(row => {
    if (row.udyam_number) udyamRegistry.set(row.udyam_number.trim(), row);
  });
  return udyamRegistry;
}

export async function loadLeads() {
  if (leadsData) return leadsData;
  const res = await fetch('/data/smb_leads.csv');
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  leadsData = parsed.data;
  return leadsData;
}

const SEGMENT_MAP = {
  'kirana': 'micro', 'salon': 'micro', 'pharmacy': 'micro', 'bakery': 'micro',
  'grocery': 'micro', 'stationery': 'micro', 'laundry': 'micro', 'tailor': 'micro',
  'tea stall': 'micro', 'mobile shop': 'micro', 'sweet shop': 'micro', 'flower shop': 'micro',
  'general store': 'micro', 'retail': 'micro', 'shop': 'micro', 'restaurant': 'micro',
  'cafe': 'micro', 'food': 'micro', 'micro retail & services': 'micro',

  'clinic': 'prof', 'doctor': 'prof', 'dentist': 'prof', 'ca firm': 'prof',
  'law firm': 'prof', 'lawyer': 'prof', 'coaching': 'prof', 'tuition': 'prof',
  'architect': 'prof', 'consultant': 'prof', 'accountant': 'prof',
  'professional offices': 'prof', 'diagnostic': 'prof',

  'chain': 'multi', 'multi-site': 'multi', 'branches': 'multi', 'franchise': 'multi',
  'small multi-site businesses': 'multi', 'multi site': 'multi',

  'manufacturer': 'mfg', 'factory': 'mfg', 'manufacturing': 'mfg',
  'production': 'mfg', 'small manufacturers': 'mfg', 'textile': 'mfg',
  'auto-parts': 'mfg',
};

export function detectSegment(businessType) {
  const lower = businessType.toLowerCase();
  for (const [key, seg] of Object.entries(SEGMENT_MAP)) {
    if (lower.includes(key)) return seg;
  }
  return 'micro';
}

export function getEligibleProducts(profile, allProducts) {
  const { segment, cityTier, employees, sites, hasGstin, selectedProducts = [] } = profile;

  return allProducts.filter(p => {
    if (!p.target_segments.includes(segment)) return false;
    if (!p.available_city_tiers.includes(cityTier)) return false;
    if (employees < p.min_employees) return false;
    if (sites < p.min_sites) return false;
    if (p.requires_gstin === 'Y' && !hasGstin) return false;
    return true;
  });
}

export function checkDependency(product, selectedProductIds) {
  if (!product.requires_one_of || product.requires_one_of.length === 0 ||
      (product.requires_one_of.length === 1 && product.requires_one_of[0] === '')) {
    return { met: true };
  }
  const met = product.requires_one_of.some(dep => selectedProductIds.includes(dep));
  return { met, requires: product.requires_one_of };
}

export function calculateQuote(selectedItems, allProducts) {
  let monthlyTotal = 0;
  let setupTotal = 0;
  let maxContract = 0;
  const lineItems = [];

  for (const item of selectedItems) {
    const product = allProducts.find(p => p.product_id === item.productId);
    if (!product) continue;
    const monthly = product.price_min_inr_per_month * item.quantity;
    const setup = product.one_time_setup_inr * item.quantity;
    monthlyTotal += monthly;
    setupTotal += setup;
    maxContract = Math.max(maxContract, product.min_contract_months);
    lineItems.push({
      ...product,
      quantity: item.quantity,
      monthlySubtotal: monthly,
      setupSubtotal: setup,
    });
  }

  return { monthlyTotal, setupTotal, maxContract, lineItems };
}

export function normaliseGstin(raw) {
  if (!raw) return '';
  let gstin = raw.replace(/\s/g, '').toUpperCase();
  // GSTIN format: 2 digits, 5 letters, 4 digits, 1 letter/digit, 1 letter, Z, 1 alphanumeric
  // Normalise O/0 and I/J confusion by position
  const chars = gstin.split('');
  for (let i = 0; i < chars.length && i < 15; i++) {
    if (i < 2) {
      // positions 0-1: digits
      if (chars[i] === 'O') chars[i] = '0';
      if (chars[i] === 'I') chars[i] = '1';
    } else if (i >= 2 && i < 7) {
      // positions 2-6: letters (PAN first 5)
      if (chars[i] === '0') chars[i] = 'O';
      if (chars[i] === '1') chars[i] = 'I';
    } else if (i >= 7 && i < 11) {
      // positions 7-10: digits (PAN last 4)
      if (chars[i] === 'O') chars[i] = '0';
      if (chars[i] === 'I') chars[i] = '1';
    }
  }
  return chars.join('');
}

export function validateGstinFormat(gstin) {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z0-9]{1}[A-Z]{1}Z[A-Z0-9]{1}$/.test(gstin);
}

export async function lookupGstin(gstin) {
  const registry = await loadGstinRegistry();
  const normalised = normaliseGstin(gstin);
  const record = registry.get(normalised);
  if (!record) {
    for (const [key, val] of registry) {
      if (normaliseGstin(key) === normalised) return val;
    }
    return null;
  }
  return record;
}

export async function lookupUdyam(udyamNumber) {
  const registry = await loadUdyamRegistry();
  return registry.get(udyamNumber.trim()) || null;
}

export function recommendBundle(profile, allProducts) {
  const eligible = getEligibleProducts(profile, allProducts);

  const connectivity = eligible.filter(p => p.category === 'Connectivity' && !p.requires_one_of.length);
  const communication = eligible.filter(p => p.category === 'Communication');
  const cloud = eligible.filter(p => p.category === 'Cloud & Productivity');
  const security = eligible.filter(p => p.category === 'Security');
  const iot = eligible.filter(p => p.category === 'IoT & Physical');

  const bundle = [];

  // Pick primary connectivity
  if (profile.segment === 'mfg' && connectivity.find(p => p.product_id === 'P05')) {
    bundle.push({ productId: 'P05', quantity: profile.sites || 1 });
  } else if (profile.segment === 'multi' && connectivity.find(p => p.product_id === 'P02')) {
    bundle.push({ productId: 'P02', quantity: profile.sites || 1 });
  } else if (connectivity.find(p => p.product_id === 'P02')) {
    bundle.push({ productId: 'P02', quantity: 1 });
  } else if (connectivity.find(p => p.product_id === 'P01')) {
    bundle.push({ productId: 'P01', quantity: 1 });
  } else if (connectivity.find(p => p.product_id === 'P04')) {
    bundle.push({ productId: 'P04', quantity: 1 });
  }

  // Business lines
  const postpaid = eligible.find(p => p.product_id === 'P07');
  if (postpaid) {
    const lines = Math.min(profile.employees || 1, 5);
    bundle.push({ productId: 'P07', quantity: lines });
  }

  // Cloud email for prof/multi/mfg
  if (['prof', 'multi', 'mfg'].includes(profile.segment)) {
    const email = eligible.find(p => p.product_id === 'P16');
    if (email) bundle.push({ productId: 'P16', quantity: Math.min(profile.employees || 5, 10) });
  }

  // Security
  if (['prof', 'mfg'].includes(profile.segment)) {
    const endpoint = eligible.find(p => p.product_id === 'P20');
    if (endpoint) bundle.push({ productId: 'P20', quantity: Math.min(profile.employees || 5, 10) });
  }

  // CCTV for micro/multi
  if (['micro', 'multi'].includes(profile.segment)) {
    const cctv = eligible.find(p => p.product_id === 'P23');
    if (cctv) {
      const hasConn = bundle.some(b => ['P01','P02','P03','P04','P05','P06'].includes(b.productId));
      if (hasConn) bundle.push({ productId: 'P23', quantity: 2 });
    }
  }

  // WhatsApp for those with GSTIN
  if (profile.hasGstin && ['micro', 'prof', 'multi'].includes(profile.segment)) {
    const wa = eligible.find(p => p.product_id === 'P15');
    if (wa) bundle.push({ productId: 'P15', quantity: 1 });
  }

  // POS for micro
  if (profile.segment === 'micro') {
    const pos = eligible.find(p => p.product_id === 'P19');
    if (pos) bundle.push({ productId: 'P19', quantity: 1 });
  }

  // IoT sensors for mfg
  if (profile.segment === 'mfg') {
    const iot_sensor = eligible.find(p => p.product_id === 'P24');
    if (iot_sensor) bundle.push({ productId: 'P24', quantity: Math.min(profile.employees || 10, 10) });
  }

  // SD-WAN for multi with 3+ sites
  if (profile.segment === 'multi' && profile.sites >= 3) {
    const sdwan = eligible.find(p => p.product_id === 'P10');
    if (sdwan) {
      const hasConn = bundle.some(b => ['P01','P02','P03','P05','P06'].includes(b.productId));
      if (hasConn) bundle.push({ productId: 'P10', quantity: profile.sites });
    }
  }

  // Managed firewall for mfg
  if (profile.segment === 'mfg') {
    const fw = eligible.find(p => p.product_id === 'P21');
    if (fw) {
      const hasConn = bundle.some(b => ['P01','P02','P03','P05','P06'].includes(b.productId));
      if (hasConn) bundle.push({ productId: 'P21', quantity: 1 });
    }
  }

  return bundle;
}
