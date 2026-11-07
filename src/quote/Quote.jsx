import { useState, useEffect } from 'react';
import { getEligibleProducts, checkDependency, calculateQuote } from '../engine/rulesEngine';

export default function Quote({ catalogue, profile, initialItems, onComplete }) {
  const [selectedItems, setSelectedItems] = useState(initialItems || []);
  const [eligible, setEligible] = useState([]);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (profile && catalogue.length) {
      setEligible(getEligibleProducts(profile, catalogue));
    }
  }, [profile, catalogue]);

  const quote = calculateQuote(selectedItems, catalogue);
  const selectedIds = selectedItems.map(i => i.productId);

  function toggleProduct(productId) {
    const exists = selectedItems.find(i => i.productId === productId);
    if (exists) {
      // Check if other selected products depend on this one
      const wouldRemove = selectedItems.filter(i => i.productId !== productId);
      const remainingIds = wouldRemove.map(i => i.productId);
      const broken = wouldRemove.filter(i => {
        const prod = catalogue.find(p => p.product_id === i.productId);
        if (!prod || !prod.requires_one_of || prod.requires_one_of.length === 0) return false;
        if (prod.requires_one_of.length === 1 && prod.requires_one_of[0] === '') return false;
        return !prod.requires_one_of.some(dep => remainingIds.includes(dep));
      });
      // Remove this product and any that depend solely on it
      const brokenIds = broken.map(b => b.productId);
      setSelectedItems(wouldRemove.filter(i => !brokenIds.includes(i.productId)));
    } else {
      const product = catalogue.find(p => p.product_id === productId);
      if (!product) return;
      const dep = checkDependency(product, selectedIds);
      if (!dep.met) return; // blocked
      setSelectedItems([...selectedItems, { productId, quantity: 1 }]);
    }
  }

  function updateQuantity(productId, qty) {
    setSelectedItems(selectedItems.map(i =>
      i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i
    ));
  }

  const categories = [...new Set(eligible.map(p => p.category))];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">Your Quote</h2>
          <p className="text-red-100 text-sm">Toggle add-ons and adjust quantities</p>
        </div>

        <div className="p-6 space-y-6">
          {categories.map(cat => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{cat}</h3>
              <div className="space-y-2">
                {eligible.filter(p => p.category === cat).map(product => {
                  const isSelected = selectedIds.includes(product.product_id);
                  const dep = checkDependency(product, selectedIds);
                  const isBlocked = !dep.met;
                  const item = selectedItems.find(i => i.productId === product.product_id);

                  return (
                    <div key={product.product_id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        isSelected ? 'border-red-300 bg-red-50' : isBlocked ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-slate-200 hover:border-red-200'
                      }`}>
                      <div className="flex items-center gap-3 flex-1">
                        <button onClick={() => !isBlocked && toggleProduct(product.product_id)}
                          disabled={isBlocked}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-red-600 border-red-600 text-white' : isBlocked ? 'border-slate-300' : 'border-slate-300 hover:border-red-400'
                          }`}>
                          {isSelected && <span className="text-xs">✓</span>}
                        </button>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{product.product_name}</p>
                          <p className="text-xs text-slate-500">{product.description}</p>
                          {isBlocked && (
                            <p className="text-xs text-amber-600 mt-1">
                              Requires: {dep.requires.map(id => catalogue.find(p => p.product_id === id)?.product_name || id).join(' or ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {isSelected && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500">{product.unit}:</span>
                            <input type="number" min="1" max="100" value={item?.quantity || 1}
                              onChange={e => updateQuantity(product.product_id, parseInt(e.target.value) || 1)}
                              className="w-14 border border-slate-300 rounded-lg px-2 py-1 text-sm text-center" />
                          </div>
                        )}
                        <span className="text-sm font-semibold text-slate-700 w-28 text-right">
                          ₹{product.price_min_inr_per_month.toLocaleString('en-IN')}/{product.unit === 'per site' ? 'site' : product.unit.replace('per ', '')}/mo
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quote summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Order Summary</h3>
        {quote.lineItems.map(item => (
          <div key={item.product_id} className="flex justify-between py-2 border-b border-slate-100 text-sm">
            <span>{item.product_name} × {item.quantity}</span>
            <span className="font-medium">₹{item.monthlySubtotal.toLocaleString('en-IN')}/mo</span>
          </div>
        ))}
        <div className="mt-4 pt-4 border-t-2 border-slate-200">
          <div className="flex justify-between text-lg font-bold">
            <span>Monthly Total</span>
            <span className="text-red-600">₹{quote.monthlyTotal.toLocaleString('en-IN')}/mo</span>
          </div>
          {quote.setupTotal > 0 && (
            <div className="flex justify-between text-sm text-slate-600 mt-1">
              <span>One-time Setup</span>
              <span>₹{quote.setupTotal.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-slate-600 mt-1">
            <span>Contract Duration</span>
            <span>{quote.maxContract} months</span>
          </div>
        </div>

        {/* E-sign */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={signed} onChange={e => setSigned(e.target.checked)}
              className="mt-1 w-4 h-4 text-red-600 rounded" />
            <span className="text-sm text-slate-700">
              I accept the terms and conditions, including the {quote.maxContract}-month contract commitment and the pricing above. This serves as my electronic signature.
            </span>
          </label>
        </div>

        <button onClick={() => onComplete(selectedItems)}
          disabled={!signed || selectedItems.length === 0}
          className={`mt-4 w-full py-3 rounded-xl font-medium transition-colors ${
            signed && selectedItems.length > 0
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}>
          Accept Quote & Proceed to KYC →
        </button>
      </div>
    </div>
  );
}
