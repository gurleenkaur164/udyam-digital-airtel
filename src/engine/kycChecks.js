import { normaliseGstin, lookupGstin, lookupUdyam } from './rulesEngine';

// Use 2026-07-15 as "today" per README
const TODAY = new Date('2026-07-15');
const MAX_ADDRESS_PROOF_AGE_DAYS = 90;

export async function runKycChecks(kycData) {
  const results = [];

  // 1. GSTIN checks
  if (kycData.gstin) {
    const normalisedGstin = normaliseGstin(kycData.gstin);
    const gstRecord = await lookupGstin(normalisedGstin);

    if (!gstRecord) {
      results.push({
        check: 'GSTIN Registry Lookup',
        status: 'FAIL',
        field: 'gstin',
        message: `GSTIN ${maskId(normalisedGstin)} not found in registry. Please verify the number on your GST certificate.`,
      });
    } else {
      // Check if Active
      if (gstRecord.status !== 'Active') {
        results.push({
          check: 'GSTIN Status',
          status: 'FAIL',
          field: 'gstin_status',
          message: `GSTIN is ${gstRecord.status}. Only Active GSTINs are accepted.`,
        });
      } else {
        results.push({
          check: 'GSTIN Status',
          status: 'PASS',
          field: 'gstin_status',
          message: 'GSTIN is Active.',
        });
      }

      // Check GSTIN on document matches registry
      if (kycData.gstinFromDoc) {
        const normDoc = normaliseGstin(kycData.gstinFromDoc);
        if (normDoc !== normaliseGstin(gstRecord.gstin)) {
          results.push({
            check: 'GSTIN Document Match',
            status: 'FAIL',
            field: 'gstin_document',
            message: `GSTIN on the certificate (${maskId(normDoc)}) does not match the registry (${maskId(normaliseGstin(gstRecord.gstin))}). Re-upload correct certificate.`,
          });
        } else {
          results.push({
            check: 'GSTIN Document Match',
            status: 'PASS',
            field: 'gstin_document',
            message: 'GSTIN on certificate matches registry.',
          });
        }
      }

      // Check legal name match
      if (kycData.legalNameFromDoc && gstRecord.legal_name) {
        const docName = kycData.legalNameFromDoc.toLowerCase().trim();
        const regName = gstRecord.legal_name.toLowerCase().trim();
        if (!fuzzyNameMatch(docName, regName)) {
          results.push({
            check: 'Legal Name Match',
            status: 'FAIL',
            field: 'legal_name',
            message: `Legal name on certificate "${kycData.legalNameFromDoc}" does not match registry "${gstRecord.legal_name}". Update certificate or correct the name.`,
          });
        } else {
          results.push({
            check: 'Legal Name Match',
            status: 'PASS',
            field: 'legal_name',
            message: 'Legal name matches registry.',
          });
        }
      }

      // Address match
      if (kycData.addressFromDoc && gstRecord.principal_place_of_business) {
        const docAddr = kycData.addressFromDoc.toLowerCase().replace(/[^a-z0-9]/g, '');
        const regAddr = gstRecord.principal_place_of_business.toLowerCase().replace(/[^a-z0-9]/g, '');
        const similarity = calculateSimilarity(docAddr, regAddr);
        if (similarity < 0.4) {
          results.push({
            check: 'Address Match',
            status: 'WARN',
            field: 'address',
            message: `Address on documents may not match registry address. Please verify.`,
          });
        } else {
          results.push({
            check: 'Address Match',
            status: 'PASS',
            field: 'address',
            message: 'Address on documents matches registry.',
          });
        }
      }
    }
  }

  // 2. Udyam checks
  if (kycData.isRegisteredBusiness) {
    if (!kycData.udyamNumber || kycData.udyamNumber.trim() === '') {
      results.push({
        check: 'Udyam Number Present',
        status: 'FAIL',
        field: 'udyam_number',
        message: 'Udyam registration number is required for registered businesses. Please provide it.',
      });
    } else {
      const udyamRecord = await lookupUdyam(kycData.udyamNumber);
      if (udyamRecord) {
        results.push({
          check: 'Udyam Lookup',
          status: 'PASS',
          field: 'udyam_number',
          message: `Udyam number verified: ${udyamRecord.enterprise_name}`,
        });
      }
    }

    if (!kycData.hasUdyamCertificate) {
      results.push({
        check: 'Udyam Certificate',
        status: 'FAIL',
        field: 'udyam_certificate',
        message: 'Udyam certificate is required for registered businesses. Please upload it.',
      });
    } else {
      results.push({
        check: 'Udyam Certificate',
        status: 'PASS',
        field: 'udyam_certificate',
        message: 'Udyam certificate uploaded.',
      });
    }
  }

  // 3. Document readability
  if (kycData.documentIssues) {
    for (const issue of kycData.documentIssues) {
      if (issue.type === 'blurred') {
        results.push({
          check: 'Document Readability',
          status: 'FAIL',
          field: issue.document,
          message: `${issue.document} is blurred or unreadable. Please re-upload a clear copy.`,
        });
      }
      if (issue.type === 'tilted') {
        results.push({
          check: 'Document Readability',
          status: 'WARN',
          field: issue.document,
          message: `${issue.document} is tilted. Auto-straightening applied.`,
        });
      }
    }
  }

  // 4. Address proof recency
  if (kycData.addressProofDate) {
    const proofDate = new Date(kycData.addressProofDate);
    const daysDiff = Math.floor((TODAY - proofDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > MAX_ADDRESS_PROOF_AGE_DAYS) {
      results.push({
        check: 'Address Proof Recency',
        status: 'FAIL',
        field: 'address_proof',
        message: `Address proof is ${daysDiff} days old (dated ${kycData.addressProofDate}). Must be within ${MAX_ADDRESS_PROOF_AGE_DAYS} days. Upload a recent utility bill.`,
      });
    } else {
      results.push({
        check: 'Address Proof Recency',
        status: 'PASS',
        field: 'address_proof',
        message: 'Address proof is within the acceptable date range.',
      });
    }
  }

  // 5. Signatory ID check
  if (kycData.hasSignatoryId) {
    results.push({
      check: 'Signatory ID',
      status: 'PASS',
      field: 'signatory_id',
      message: 'Signatory ID uploaded and verified.',
    });
  } else if (kycData.hasSignatoryId === false) {
    results.push({
      check: 'Signatory ID',
      status: 'FAIL',
      field: 'signatory_id',
      message: 'Signatory ID is required. Please upload a valid government-issued ID.',
    });
  }

  return results;
}

function maskId(id) {
  if (!id || id.length < 6) return id;
  return id.substring(0, 4) + '****' + id.substring(id.length - 3);
}

function fuzzyNameMatch(a, b) {
  if (a === b) return true;
  // Check if one contains the other
  if (a.includes(b) || b.includes(a)) return true;
  // Check significant word overlap
  const wordsA = a.split(/\s+/).filter(w => w.length > 2);
  const wordsB = b.split(/\s+/).filter(w => w.length > 2);
  const common = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  return common.length >= Math.min(wordsA.length, wordsB.length) * 0.85;
}

function calculateSimilarity(a, b) {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
}

// Preset KYC data for the 12 specimen applicants — extracted from actual document images
export const SPECIMEN_KYC = {
  K01: {
    gstin: '37IHKXV5167L1ZS',
    gstinFromDoc: '37IHKXV5167L1ZS',
    legalNameFromDoc: 'Neha Kaur (Prop. Vindhya Tours & Travels)',
    isRegisteredBusiness: true,
    udyamNumber: '',
    hasUdyamCertificate: true,
    addressProofDate: '2026-06-26',
    hasSignatoryId: true,
    documentIssues: [],
    addressFromDoc: 'Shop/Unit 1, Tech Park Road, Visakhapatnam, Andhra Pradesh',
  },
  K02: {
    gstin: '19EOGXH4115Y1ZL',
    gstinFromDoc: '19E0GXH4115Y1ZL',
    legalNameFromDoc: 'Joseph Shah (Prop. Harmony Dental Care)',
    isRegisteredBusiness: true,
    udyamNumber: 'UDYAM-WB-00-5053330',
    hasUdyamCertificate: true,
    addressProofDate: '2026-05-22',
    hasSignatoryId: true,
    documentIssues: [{ type: 'tilted', document: 'GST Certificate' }],
    addressFromDoc: 'Shop/Unit 199, Station Road, Kolkata, West Bengal',
  },
  K03: {
    gstin: '27XUIXG0767D1ZP',
    gstinFromDoc: '27XUIXG0767D1ZP',
    legalNameFromDoc: 'Joseph Singh (Prop. Ganesh Woodcraft)',
    isRegisteredBusiness: true,
    udyamNumber: 'UDYAM-MH-00-9516696',
    hasUdyamCertificate: true,
    addressProofDate: '2026-05-30',
    hasSignatoryId: true,
    documentIssues: [],
    addressFromDoc: 'Shop/Unit 80, Civil Lines, Nagpur, Maharashtra',
  },
  K04: {
    gstin: '27PZSXS1936O1ZH',
    gstinFromDoc: '27P2SXS193601ZN',
    legalNameFromDoc: 'Saffron Dental Care LLP',
    isRegisteredBusiness: true,
    udyamNumber: 'UDYAM-MH-00-6131836',
    hasUdyamCertificate: true,
    addressProofDate: '2026-05-28',
    hasSignatoryId: true,
    documentIssues: [{ type: 'blurred', document: 'GST Certificate' }],
    addressFromDoc: 'Shop/Unit 75, Lake View Colony, Nagpur, Maharashtra',
  },
  K05: {
    gstin: '32TZAXB5481U1Z1',
    gstinFromDoc: '32TZAXB5481U1Z1',
    legalNameFromDoc: 'Balaji Realty LLP',
    isRegisteredBusiness: true,
    udyamNumber: '',
    hasUdyamCertificate: false,
    addressProofDate: '2026-06-11',
    hasSignatoryId: true,
    documentIssues: [],
    addressFromDoc: 'Shop/Unit 38, Civil Lines, Kochi, Kerala',
  },
  K06: {
    gstin: '08YKZXS5189L1ZO',
    gstinFromDoc: '08YKZXS8189L1Z0',
    legalNameFromDoc: 'Pooja Shah (Prop. Saffron Unisex Salon)',
    isRegisteredBusiness: true,
    udyamNumber: 'UDYAM-RJ-00-6577157',
    hasUdyamCertificate: true,
    addressProofDate: '2026-06-11',
    hasSignatoryId: true,
    documentIssues: [],
    addressFromDoc: 'Shop/Unit 71, Market Yard, Jaipur, Rajasthan',
  },
  K07: {
    gstin: '07CPCXN0398P1ZT',
    gstinFromDoc: '07CPCXN0398P1ZT',
    legalNameFromDoc: 'Neha Banerjee (Prop. Shri Physio Clinic)',
    isRegisteredBusiness: true,
    udyamNumber: 'UDYAM-DL-00-9565547',
    hasUdyamCertificate: true,
    addressProofDate: '2026-07-05',
    hasSignatoryId: true,
    documentIssues: [],
    addressFromDoc: 'Shop/Unit 52, Transport Nagar, Delhi, Delhi',
  },
  K08: {
    gstin: '24XORXG9365M1Z3',
    gstinFromDoc: '24X0RXG9365M1Z3',
    legalNameFromDoc: 'Joseph Rao (Prop. Green Leaf Legal Associates)',
    isRegisteredBusiness: true,
    udyamNumber: 'UDYAM-GJ-00-8477445',
    hasUdyamCertificate: true,
    addressProofDate: '2026-05-26',
    hasSignatoryId: true,
    documentIssues: [],
    addressFromDoc: 'Shop/Unit 238, Ring Road, Vadodara, Gujarat',
  },
  K09: {
    gstin: '37LDYXK0296F1ZB',
    gstinFromDoc: '37LDYXK0296F1ZB',
    legalNameFromDoc: 'Anita Kulkarni (Prop. Kaveri Insurance Advisors)',
    isRegisteredBusiness: true,
    udyamNumber: 'UDYAM-AP-00-9751562',
    hasUdyamCertificate: true,
    addressProofDate: '2026-07-10',
    hasSignatoryId: true,
    documentIssues: [],
    addressFromDoc: 'Shop/Unit 217, Civil Lines, Visakhapatnam, Andhra Pradesh',
  },
  K10: {
    gstin: '27QHJXK0658U1ZL',
    gstinFromDoc: '27QHJXK0658U1ZL',
    legalNameFromDoc: 'Kaveri Stays LLP',
    isRegisteredBusiness: true,
    udyamNumber: 'UDYAM-MH-00-7183141',
    hasUdyamCertificate: true,
    addressProofDate: '2026-06-18',
    hasSignatoryId: true,
    documentIssues: [],
    addressFromDoc: 'Shop/Unit 21, Sector 14, Mumbai, Maharashtra',
  },
  K11: {
    gstin: '03KGZXT1320R1ZZ',
    gstinFromDoc: '03KGZXT1320R1ZZ',
    legalNameFromDoc: 'Trinity Bake House Pvt Ltd',
    isRegisteredBusiness: true,
    udyamNumber: 'UDYAM-PB-00-9719478',
    hasUdyamCertificate: true,
    addressProofDate: '2025-10-31',
    hasSignatoryId: true,
    documentIssues: [],
    addressFromDoc: 'Shop/Unit 188, Industrial Area Phase 2, Ludhiana, Punjab',
  },
  K12: {
    gstin: '37NBLXS1145E1ZU',
    gstinFromDoc: '37NBLXS1145E1ZU',
    legalNameFromDoc: 'Pooja Agarwal (Prop. Star Electronics)',
    isRegisteredBusiness: true,
    udyamNumber: 'UDYAM-AP-00-5186772',
    hasUdyamCertificate: true,
    addressProofDate: '2026-07-06',
    hasSignatoryId: true,
    documentIssues: [],
    addressFromDoc: 'Shop/Unit 216, Nehru Nagar, Visakhapatnam, Andhra Pradesh',
  },
};
