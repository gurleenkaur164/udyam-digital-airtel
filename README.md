# Udyam Digital — Accel Business MSME Onboarding Prototype

A digital-first acquisition and onboarding journey for small businesses to discover, buy, verify KYC, and track activation — on a phone, in their preferred language.

**YTL Hackathon 2026 | Enterprise Track A**

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Advisor    │ ──→ │    Quote     │ ──→ │   Smart KYC  │ ──→ │   Tracker    │
│  (GenAI Chat)│     │  & Checkout  │     │ (Doc Verify) │     │ (Order View) │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
        │                    │                    │
        └────────────────────┴────────────────────┘
                             │
                    ┌────────────────┐
                    │  Rules Engine  │  ← Eligibility, pricing, dependencies
                    │  (Deterministic)│     (LLM never sets prices or picks products)
                    └────────────────┘
                             │
                    ┌────────────────┐
                    │   Data Layer   │  ← product_catalogue.csv, mock registries
                    └────────────────┘
```

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Data

All data is synthetic from `YTL_TrackA_Udyam_Digital_Data.zip`:

| File | Purpose |
|------|---------|
| `data/product_catalogue.csv` | 25 products with eligibility rules |
| `data/smb_leads.csv` | 5,000 SMB leads for back office |
| `data/mock_gstin_registry.csv` | 3,534 records for GSTIN lookup |
| `data/mock_udyam_registry.csv` | 2,723 records for Udyam lookup |
| `data/kyc_documents/` | 47 specimen images (K01-K12) |

## Modules

### 1. AI Advisor (`src/advisor/`)
- Conversational chat in 10 Indian languages
- Asks: business type, city, staff count, sites, current tools, GSTIN status
- Rules engine filters eligible products (never the LLM)
- Recommends a personalised bundle with clear monthly pricing
- "Talk to a person" hand-off always available

### 2. Quote & Checkout (`src/quote/`)
- Live monthly total recalculates on every toggle
- Add-ons blocked if dependency is missing (e.g., CCTV needs broadband)
- Setup fee and contract length shown
- E-sign acceptance

### 3. Smart KYC (`src/kyc/`)
- DPDP Act consent screen (separate KYC vs marketing consent, marketing off by default)
- Document upload: GST certificate, Udyam certificate, signatory ID, address proof
- Mock GSTIN/Udyam registry lookup with OCR normalisation (O/0, I/J confusion)
- Validation: status check, name match, document readability, address proof recency
- Each failure names the exact field to fix
- 12 specimen applicants loadable for demo

### 4. Order Tracker (`src/tracker/`)
- Statuses: Placed → KYC Verified → Install Booked → Technician Assigned → Live
- Expected dates from `typical_install_days`
- Per-product progress bar

### 5. Back Office (`src/backoffice/`) — Stretch Goal
- 5,000 leads with filters (stuck, dropped, activated)
- Propensity score based on GSTIN, turnover, source, segment
- Search by business name, city, segment

## Rules Engine (`src/engine/`)

Eligibility is deterministic — the LLM never decides:
- `target_segments` must include the business segment
- `available_city_tiers` must include the city tier
- `min_employees` and `min_sites` enforced
- `requires_gstin = Y` hides the product without GSTIN
- `requires_one_of` blocks add-ons if no dependency is selected

## Privacy and Safety (DPDP Act 2023)
- Separate consent for KYC (required) and marketing (optional, off by default)
- Only needed fields collected; documents deleted after verification
- ID numbers masked in UI
- All lookups logged
- Personal data stripped before LLM sees it
- LLM only chooses from rules engine's eligible products, never sets a price

## Testing

Judge scenarios covered:
1. Micro shop without GSTIN -> WhatsApp API hidden
2. Tier 2 office -> Fibre 1G not available
3. Factory with <10 staff -> no leased line
4. Firm with 3+ sites -> SD-WAN eligible
5. All 12 KYC applicants with planted flags

## Tech Stack
- React 19 + Vite
- TailwindCSS 4
- PapaParse (CSV parsing)
- No API keys or secrets
