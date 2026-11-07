# Data Privacy & Security Note — Udyam Digital

**Accel Business | YTL Hackathon 2026, Track A**

---

## 1. Consent Architecture (DPDP Act 2023, Section 6)

| Consent | Type | Default | When collected |
|---------|------|---------|----------------|
| KYC verification | Required | — | Before any document upload |
| Marketing communications | Optional | **Off** | Same screen, separate checkbox |

The user sees a dedicated consent screen before the KYC module. It explains **what** is collected, **why**, **how long** it is kept, **who** can access it, and the user's **right to request deletion**. KYC consent is required to proceed; marketing consent is never pre-checked and can be withdrawn at any time.

## 2. Data Minimisation (Section 4(2))

- The advisor collects only 6 fields needed for bundle eligibility: business type, city, staff count, sites, current tools, GSTIN status. No names, phone numbers or emails are collected at this stage.
- KYC collects only the 4 documents mandated by telecom KYC norms: GST certificate, Udyam certificate, signatory ID, and address proof.
- The GSTIN and Udyam lookup APIs fetch only the fields needed for validation (legal name, status, address). No financial or tax data is retrieved.

## 3. Document Handling & Retention

| Stage | What happens |
|-------|-------------|
| Upload | Documents stored in encrypted temporary storage, never in browser localStorage |
| Verification | OCR extracts only the required fields (GSTIN, legal name, address, dates) |
| Post-verification | **Document images are deleted** immediately after checks complete; only the pass/fail result and extracted field values are retained |
| Audit trail | Verification result, timestamp and check outcomes are logged for compliance |

## 4. Identifier Masking

All GSTINs, Udyam numbers and signatory ID numbers are masked in the UI using the format `XXXX****XXX` (first 4 and last 3 characters visible). Full identifiers are never displayed in chat messages, logs or error messages shown to the user.

## 5. Access Logging

Every GSTIN lookup, Udyam lookup and document access is logged with:
- Timestamp
- Action performed (lookup, verify, delete)
- User session identifier (anonymised)
- Result (pass/fail)

Logs do not contain the full identifier values — only masked versions.

## 6. LLM Guardrails

| Rule | Implementation |
|------|---------------|
| Product eligibility | Decided by a **deterministic rules engine**, never by the LLM |
| Pricing | Comes from `product_catalogue.csv` — the LLM cannot set or override prices |
| Personal data isolation | Business type, city and size are sent to the LLM for conversation; **no names, GSTINs, document content or contact details** are ever included in LLM prompts |
| Hallucination prevention | The LLM can only recommend products the rules engine has already marked eligible |
| Human hand-off | A "Talk to a person" option is always visible on every screen |

## 7. Security Measures

- No API keys, tokens or secrets are stored in the codebase or committed to the repository
- All registry lookups use server-side mock APIs (not exposed to the client in production)
- Document uploads accept only image and PDF formats with size limits
- No personal data is stored in browser localStorage or sessionStorage

## 8. User Rights (Section 12-14)

- **Right to access**: Users can view all data collected about them through the tracker
- **Right to correction**: KYC failures name the exact field to fix, allowing re-upload
- **Right to erasure**: Users can request deletion of all their data; document images are already auto-deleted post-verification
- **Right to grievance redressal**: "Talk to a person" hand-off available at every stage

---

*This note covers the privacy and security choices implemented in the Udyam Digital prototype. In a production deployment, these would be supplemented by a full Data Protection Impact Assessment, a formal privacy policy, and registration with the Data Protection Board of India as required under the DPDP Act, 2023.*
