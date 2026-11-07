import { useMemo } from 'react';

const STATUSES = ['Order Placed', 'KYC Verified', 'Install Booked', 'Technician Assigned', 'Live'];

export default function Tracker({ order, catalogue }) {
  const orderDate = order ? new Date(order.placedAt) : new Date();

  const productStatuses = useMemo(() => {
    if (!order || !catalogue.length) return [];
    return order.items.map(item => {
      const product = catalogue.find(p => p.product_id === item.productId);
      if (!product) return null;
      const installDays = product.typical_install_days;
      const statusIndex = Math.min(3, Math.floor(Math.random() * 4) + 1); // simulate progress
      const expectedDate = new Date(orderDate);
      expectedDate.setDate(expectedDate.getDate() + installDays);

      return {
        ...product,
        quantity: item.quantity,
        currentStatus: STATUSES[statusIndex],
        statusIndex,
        expectedDate: expectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        installDays,
      };
    }).filter(Boolean);
  }, [order, catalogue]);

  if (!order) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
        <span className="text-4xl">📦</span>
        <h2 className="text-xl font-bold text-slate-900 mt-4">No Active Order</h2>
        <p className="text-slate-600 mt-2">Complete the advisor, quote, and KYC steps to place an order.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">Order Tracker</h2>
          <p className="text-red-100 text-sm">Order {order.id} — Placed {orderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>

        <div className="p-6 space-y-6">
          {productStatuses.map((ps, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{ps.product_name} × {ps.quantity}</h3>
                  <p className="text-xs text-slate-500">{ps.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-red-600">{ps.currentStatus}</p>
                  <p className="text-xs text-slate-500">Expected: {ps.expectedDate}</p>
                </div>
              </div>

              {/* Progress steps */}
              <div className="flex items-center">
                {STATUSES.map((status, i) => (
                  <div key={status} className="flex items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      i <= ps.statusIndex
                        ? i === ps.statusIndex
                          ? 'bg-red-600 text-white ring-4 ring-red-100'
                          : 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                      {i < ps.statusIndex ? '✓' : i + 1}
                    </div>
                    {i < STATUSES.length - 1 && (
                      <div className={`flex-1 h-1 mx-1 rounded ${
                        i < ps.statusIndex ? 'bg-emerald-500' : 'bg-slate-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                {STATUSES.map(s => (
                  <span key={s} className="text-[10px] text-slate-500 flex-1 text-center">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Order Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-2xl font-bold text-red-600">{productStatuses.length}</p>
            <p className="text-xs text-slate-500">Products</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-2xl font-bold text-red-600">
              {Math.max(...productStatuses.map(p => p.installDays))}
            </p>
            <p className="text-xs text-slate-500">Max Install Days</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-2xl font-bold text-emerald-600">
              {productStatuses.filter(p => p.statusIndex >= 2).length}/{productStatuses.length}
            </p>
            <p className="text-xs text-slate-500">Install Booked</p>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          You will receive WhatsApp updates at each stage. No need to call.
        </p>
      </div>
    </div>
  );
}
