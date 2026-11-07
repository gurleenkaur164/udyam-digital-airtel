import { useState, useEffect } from 'react';
import { loadLeads } from '../engine/rulesEngine';

export default function BackOffice({ onBack }) {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeads().then(data => {
      setLeads(data);
      setLoading(false);
    });
  }, []);

  const filtered = leads.filter(lead => {
    if (filter === 'dropped' && lead.outcome !== 'Dropped') return false;
    if (filter === 'activated' && lead.outcome !== 'Activated') return false;
    if (filter === 'stuck' && !['Lead', 'Contacted', 'Needs assessed'].includes(lead.stage_reached)) return false;
    if (search) {
      const s = search.toLowerCase();
      return (lead.business_name || '').toLowerCase().includes(s) ||
             (lead.city || '').toLowerCase().includes(s) ||
             (lead.segment || '').toLowerCase().includes(s);
    }
    return true;
  }).slice(0, 100);

  const stats = {
    total: leads.length,
    activated: leads.filter(l => l.outcome === 'Activated').length,
    dropped: leads.filter(l => l.outcome === 'Dropped').length,
    withGstin: leads.filter(l => l.has_gstin === 'Y').length,
  };

  const convRate = stats.total > 0 ? ((stats.activated / stats.total) * 100).toFixed(1) : 0;

  // Propensity score (simple)
  function propensityScore(lead) {
    let score = 50;
    if (lead.has_gstin === 'Y') score += 25;
    const turnover = lead.annual_turnover_band || '';
    if (turnover.includes('5') || turnover.includes('25')) score += 15;
    if (lead.lead_source === 'Referral') score += 10;
    if (lead.lead_source === 'Website form') score += 5;
    if (lead.segment === 'Professional offices') score += 10;
    if (lead.segment === 'Small multi-site businesses') score += 15;
    if (parseInt(lead.employee_count) > 10) score += 5;
    return Math.min(100, score);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-slate-400 hover:text-white">← Back</button>
          <h1 className="text-xl font-bold">Back Office — Sales Dashboard</h1>
        </div>
        <span className="text-sm text-slate-400">{stats.total.toLocaleString()} leads loaded</span>
      </header>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Leads', value: stats.total.toLocaleString(), color: 'text-blue-400' },
            { label: 'Activated', value: stats.activated, color: 'text-emerald-400' },
            { label: 'Conversion Rate', value: `${convRate}%`, color: 'text-amber-400' },
            { label: 'With GSTIN', value: stats.withGstin, color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-800 rounded-xl p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'stuck', label: 'Stuck Leads' },
              { id: 'dropped', label: 'Dropped' },
              { id: 'activated', label: 'Activated' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.id ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, city, segment..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500" />
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading leads...</div>
        ) : (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="text-left px-4 py-3">Business</th>
                    <th className="text-left px-4 py-3">Segment</th>
                    <th className="text-left px-4 py-3">City</th>
                    <th className="text-left px-4 py-3">Stage</th>
                    <th className="text-left px-4 py-3">Drop Reason</th>
                    <th className="text-left px-4 py-3">GSTIN</th>
                    <th className="text-right px-4 py-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => {
                    const score = propensityScore(lead);
                    return (
                      <tr key={lead.lead_id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{lead.business_name}</p>
                          <p className="text-xs text-slate-500">{lead.lead_id}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{lead.segment}</td>
                        <td className="px-4 py-3 text-slate-300">{lead.city}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            lead.outcome === 'Activated' ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'
                          }`}>
                            {lead.stage_reached}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate">{lead.drop_reason || '—'}</td>
                        <td className="px-4 py-3">{lead.has_gstin === 'Y' ? '✓' : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            score >= 80 ? 'bg-emerald-900 text-emerald-300' :
                            score >= 60 ? 'bg-amber-900 text-amber-300' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {score}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-700 text-xs text-slate-500">
              Showing {filtered.length} of {leads.length} leads (max 100)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
