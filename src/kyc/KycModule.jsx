import { useState } from 'react';
import { runKycChecks, SPECIMEN_KYC } from '../engine/kycChecks';

export default function KycModule({ profile, onComplete }) {
  const [consentKyc, setConsentKyc] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [gstin, setGstin] = useState('');
  const [udyamNumber, setUdyamNumber] = useState('');
  const [legalName, setLegalName] = useState('');
  const [address, setAddress] = useState('');
  const [addressProofDate, setAddressProofDate] = useState('');
  const [hasUdyamCert, setHasUdyamCert] = useState(false);
  const [hasSignatoryId, setHasSignatoryId] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [results, setResults] = useState(null);
  const [checking, setChecking] = useState(false);
  const [selectedSpecimen, setSelectedSpecimen] = useState('');

  function loadSpecimen(key) {
    const spec = SPECIMEN_KYC[key];
    if (!spec) return;
    setGstin(spec.gstin || '');
    setUdyamNumber(spec.udyamNumber || '');
    setLegalName(spec.legalNameFromDoc || '');
    setAddress(spec.addressFromDoc || '');
    setAddressProofDate(spec.addressProofDate || '');
    setHasUdyamCert(spec.hasUdyamCertificate);
    setHasSignatoryId(spec.hasSignatoryId);
    setIsRegistered(spec.isRegisteredBusiness);
    setUploadedDocs({
      gst_certificate: true,
      signatory_id: spec.hasSignatoryId,
      udyam_certificate: spec.hasUdyamCertificate,
      address_proof: true,
    });
    setSelectedSpecimen(key);
    setResults(null);
  }

  async function runChecks() {
    setChecking(true);
    const spec = selectedSpecimen ? SPECIMEN_KYC[selectedSpecimen] : null;
    const kycData = {
      gstin,
      gstinFromDoc: gstin,
      legalNameFromDoc: legalName,
      isRegisteredBusiness: isRegistered,
      udyamNumber,
      hasUdyamCertificate: hasUdyamCert,
      addressProofDate,
      hasSignatoryId,
      addressFromDoc: address,
      documentIssues: spec?.documentIssues || [],
    };

    const res = await runKycChecks(kycData);
    setResults(res);
    setChecking(false);
  }

  const allPassed = results && results.every(r => r.status !== 'FAIL');

  if (!consentGiven) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔐</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Data Consent</h2>
          <p className="text-sm text-slate-600 mt-2">
            Before we proceed with KYC verification, we need your consent as per the Digital Personal Data Protection Act, 2023.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 space-y-3">
            <p><strong>What we collect:</strong> GST certificate, Udyam certificate, signatory ID, and address proof.</p>
            <p><strong>Why:</strong> To verify your business identity and complete the registration.</p>
            <p><strong>How long:</strong> Documents are deleted after verification is complete. Only the verification result is retained.</p>
            <p><strong>Who can access:</strong> Only authorised verification staff. All access is logged.</p>
            <p><strong>Your rights:</strong> You can request deletion of your data at any time.</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
            <input type="checkbox" checked={consentKyc} onChange={e => setConsentKyc(e.target.checked)}
              className="mt-1 w-4 h-4 text-red-600 rounded" />
            <span className="text-sm text-slate-700">
              <strong>Required:</strong> I consent to Accel Business collecting and processing my KYC documents for business verification purposes.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
            <input type="checkbox" checked={consentMarketing} onChange={e => setConsentMarketing(e.target.checked)}
              className="mt-1 w-4 h-4 text-red-600 rounded" />
            <span className="text-sm text-slate-700">
              <strong>Optional:</strong> I consent to receiving product updates and offers from Accel Business via email and SMS.
            </span>
          </label>
        </div>

        <button onClick={() => consentKyc && setConsentGiven(true)}
          disabled={!consentKyc}
          className={`w-full py-3 rounded-xl font-medium transition-colors ${
            consentKyc ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}>
          I Consent — Proceed to KYC
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">Smart KYC Verification</h2>
          <p className="text-red-100 text-sm">Upload documents or select a specimen applicant to test</p>
        </div>

        <div className="p-6">
          {/* Specimen selector for demo */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-medium text-amber-800 mb-2">Demo: Load specimen applicant</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(SPECIMEN_KYC).map(key => (
                <button key={key} onClick={() => loadSpecimen(key)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    selectedSpecimen === key ? 'bg-amber-600 text-white border-amber-600' : 'border-amber-300 text-amber-700 hover:bg-amber-100'
                  }`}>
                  {key}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Business Details</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN</label>
                <input type="text" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Legal Name (from certificate)</label>
                <input type="text" value={legalName} onChange={e => setLegalName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Address</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isRegistered} onChange={e => setIsRegistered(e.target.checked)} className="w-4 h-4 text-red-600 rounded" />
                <span className="text-sm text-slate-700">Udyam-registered business</span>
              </label>
              {isRegistered && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Udyam Number</label>
                  <input type="text" value={udyamNumber} onChange={e => setUdyamNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. UDYAM-KA-00-1234567"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Documents</h3>
              {[
                { id: 'gst_certificate', label: 'GST Certificate', required: true },
                { id: 'udyam_certificate', label: 'Udyam Certificate', required: isRegistered },
                { id: 'signatory_id', label: 'Signatory ID (Aadhaar/PAN)', required: true },
                { id: 'address_proof', label: 'Address Proof (recent utility bill)', required: true },
              ].map(doc => (
                <div key={doc.id} className={`p-3 rounded-xl border ${uploadedDocs[doc.id] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{doc.label}</p>
                      <p className="text-xs text-slate-500">{doc.required ? 'Required' : 'Optional'}</p>
                    </div>
                    {uploadedDocs[doc.id] ? (
                      <span className="text-emerald-600 text-sm font-medium">✓ Uploaded</span>
                    ) : (
                      <label className="cursor-pointer bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-200">
                        Upload
                        <input type="file" className="hidden" accept="image/*,.pdf"
                          onChange={() => {
                            setUploadedDocs(prev => ({ ...prev, [doc.id]: true }));
                            if (doc.id === 'udyam_certificate') setHasUdyamCert(true);
                            if (doc.id === 'signatory_id') setHasSignatoryId(true);
                          }} />
                      </label>
                    )}
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address Proof Date</label>
                <input type="date" value={addressProofDate} onChange={e => setAddressProofDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <button onClick={runChecks} disabled={checking}
            className="mt-6 w-full bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">
            {checking ? 'Running checks...' : 'Verify Documents'}
          </button>
        </div>
      </div>

      {results && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Verification Results</h3>
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className={`p-4 rounded-xl border ${
                r.status === 'PASS' ? 'border-emerald-200 bg-emerald-50' :
                r.status === 'WARN' ? 'border-amber-200 bg-amber-50' :
                'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-start gap-3">
                  <span className={`text-lg ${r.status === 'PASS' ? 'text-emerald-600' : r.status === 'WARN' ? 'text-amber-600' : 'text-red-600'}`}>
                    {r.status === 'PASS' ? '✓' : r.status === 'WARN' ? '⚠' : '✗'}
                  </span>
                  <div>
                    <p className="font-medium text-sm text-slate-900">{r.check}</p>
                    <p className="text-sm text-slate-600 mt-1">{r.message}</p>
                    {r.status === 'FAIL' && (
                      <p className="text-xs text-red-700 mt-1 font-medium">Field to fix: {r.field}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {allPassed && (
            <button onClick={() => onComplete(results)}
              className="mt-6 w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700">
              KYC Verified — Place Order →
            </button>
          )}
          {!allPassed && (
            <p className="mt-4 text-center text-sm text-red-600">
              Please fix the issues above and re-verify.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
