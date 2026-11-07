import { useState, useEffect } from 'react';
import { loadCatalogue } from './engine/rulesEngine';
import Advisor from './advisor/Advisor';
import Quote from './quote/Quote';
import KycModule from './kyc/KycModule';
import Tracker from './tracker/Tracker';
import BackOffice from './backoffice/BackOffice';

const STEPS = [
  { id: 'advisor', label: 'Advisor', icon: '💬' },
  { id: 'quote', label: 'Quote', icon: '📋' },
  { id: 'kyc', label: 'KYC', icon: '🔐' },
  { id: 'tracker', label: 'Tracker', icon: '📦' },
];

export default function App() {
  const [step, setStep] = useState('advisor');
  const [catalogue, setCatalogue] = useState([]);
  const [profile, setProfile] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [order, setOrder] = useState(null);
  const [kycDone, setKycDone] = useState(false);
  const [showBackOffice, setShowBackOffice] = useState(false);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    loadCatalogue().then(setCatalogue);
  }, []);

  if (showBackOffice) {
    return <BackOffice onBack={() => setShowBackOffice(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">A</div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Accel Business</h1>
              <p className="text-xs text-slate-500">Udyam Digital</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white">
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="ta">தமிழ்</option>
              <option value="te">తెలుగు</option>
              <option value="ml">മലയാളം</option>
              <option value="pa">ਪੰਜਾਬੀ</option>
              <option value="mr">मराठी</option>
              <option value="bn">বাংলা</option>
              <option value="gu">ગુજરાતી</option>
              <option value="kn">ಕನ್ನಡ</option>
            </select>
            <button onClick={() => setShowBackOffice(true)}
              className="text-sm text-slate-600 hover:text-red-600 border border-slate-300 rounded-lg px-3 py-1.5">
              Back Office
            </button>
            <button className="text-sm text-red-600 hover:text-red-700 font-medium border border-red-200 rounded-lg px-3 py-1.5">
              Talk to a person
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between bg-white rounded-2xl p-2 shadow-sm border border-slate-100">
          {STEPS.map((s, i) => {
            const stepIndex = STEPS.findIndex(x => x.id === step);
            const isDone = i < stepIndex || (s.id === 'kyc' && kycDone && stepIndex > i);
            const isActive = s.id === step;
            return (
              <button key={s.id}
                onClick={() => { if (i <= stepIndex || (s.id === 'tracker' && order)) setStep(s.id); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-red-600 text-white shadow-md' : isDone ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'
                }`}>
                <span>{isDone ? '✓' : s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 pb-8">
        {step === 'advisor' && (
          <Advisor catalogue={catalogue} lang={lang}
            onComplete={(prof, items) => { setProfile(prof); setSelectedItems(items); setStep('quote'); }} />
        )}
        {step === 'quote' && (
          <Quote catalogue={catalogue} profile={profile} initialItems={selectedItems}
            onComplete={(items) => { setSelectedItems(items); setStep('kyc'); }} />
        )}
        {step === 'kyc' && (
          <KycModule profile={profile}
            onComplete={(kycResult) => {
              setKycDone(true);
              setOrder({ id: 'ORD-' + Date.now().toString(36).toUpperCase(), items: selectedItems, profile, kycResult, placedAt: new Date().toISOString() });
              setStep('tracker');
            }} />
        )}
        {step === 'tracker' && <Tracker order={order} catalogue={catalogue} />}
      </main>
    </div>
  );
}
