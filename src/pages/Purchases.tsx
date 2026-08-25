import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Purchase, PurchaseItem } from '../types';
import { formatCurrency, formatDate } from '../lib/formatters';
import { Search, Plus, PackageCheck, CheckCircle2, Truck, X, ShoppingBag } from 'lucide-react';

export const Purchases: React.FC = () => {
  const { purchases, suppliers, medicines, settings, addPurchaseOrder, receivePurchaseOrder } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Pending'>('Pending');
  const [notes, setNotes] = useState('');

  const [poItems, setPoItems] = useState<PurchaseItem[]>([
    {
      medicineId: medicines[0]?.id || '',
      name: medicines[0]?.name || '',
      batchNumber: 'BATCH-' + Math.floor(Math.random() * 90000 + 10000),
      expiryDate: new Date(Date.now() + 365 * 86400000 * 2).toISOString().split('T')[0],
      quantityOrdered: 100,
      quantityReceived: 0,
      unitCost: medicines[0]?.purchasePrice || 10,
      totalCost: (medicines[0]?.purchasePrice || 10) * 100
    }
  ]);

  const filteredPurchases = purchases.filter(p =>
    p.purchaseOrderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = () => {
    const defaultMed = medicines[0];
    setPoItems([
      ...poItems,
      {
        medicineId: defaultMed?.id || '',
        name: defaultMed?.name || '',
        batchNumber: 'BATCH-' + Math.floor(Math.random() * 90000 + 10000),
        expiryDate: new Date(Date.now() + 365 * 86400000 * 2).toISOString().split('T')[0],
        quantityOrdered: 50,
        quantityReceived: 0,
        unitCost: defaultMed?.purchasePrice || 10,
        totalCost: (defaultMed?.purchasePrice || 10) * 50
      }
    ]);
  };

  const handleMedChange = (index: number, medId: string) => {
    const med = medicines.find(m => m.id === medId);
    if (!med) return;
    const updated = [...poItems];
    updated[index].medicineId = med.id;
    updated[index].name = med.name;
    updated[index].unitCost = med.purchasePrice;
    updated[index].totalCost = med.purchasePrice * updated[index].quantityOrdered;
    setPoItems(updated);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...poItems];
    updated[index].quantityOrdered = qty;
    updated[index].totalCost = updated[index].unitCost * qty;
    setPoItems(updated);
  };

  const totalPOAmount = poItems.reduce((acc, curr) => acc + curr.totalCost, 0);

  const handleSavePO = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find(s => s.id === selectedSupplierId);
    if (!sup) return;

    addPurchaseOrder({
      supplierId: sup.id,
      supplierName: sup.name,
      items: poItems,
      totalAmount: totalPOAmount,
      paymentStatus,
      orderDate: new Date().toISOString().split('T')[0],
      notes
    });

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Purchases & Stock-In</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create supplier purchase orders & update inventory stock levels
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Purchase Order
        </button>
      </div>

      {/* Table */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 rounded-l-xl">PO Number</th>
                <th className="p-3">Supplier Name</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Order Date</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Delivery Status</th>
                <th className="p-3 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">No purchase orders recorded yet</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                          Click "+ Create Purchase Order" to log incoming stock shipments from wholesale suppliers.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{p.purchaseOrderNo}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{p.supplierName}</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.totalAmount, settings.currencySymbol)}
                    </td>
                    <td className="p-3 text-slate-500">{formatDate(p.orderDate)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          p.deliveryStatus === 'Received'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {p.deliveryStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {p.deliveryStatus === 'Pending' && (
                        <button
                          onClick={() => receivePurchaseOrder(p.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer shadow-sm"
                          title="Receive Stock"
                        >
                          <PackageCheck className="w-3.5 h-3.5" /> Receive Stock
                        </button>
                      )}
                      {p.deliveryStatus === 'Received' && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Received on {formatDate(p.receivedDate)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add PO Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 text-xs">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Create Purchase Order</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePO} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Select Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border"
                  >
                    <option value="Pending">Pending (Net 30/45)</option>
                    <option value="Paid">Paid Immediately</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold">Order Line Items</h4>
                  <button type="button" onClick={handleAddItem} className="text-emerald-600 font-bold hover:underline">
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {poItems.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                      <select
                        value={item.medicineId}
                        onChange={e => handleMedChange(idx, e.target.value)}
                        className="p-2 rounded bg-white dark:bg-slate-900 border font-semibold"
                      >
                        {medicines.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>

                      <input
                        type="number"
                        placeholder="Quantity"
                        value={item.quantityOrdered}
                        onChange={e => handleQtyChange(idx, parseInt(e.target.value) || 0)}
                        className="p-2 rounded bg-white dark:bg-slate-900 border font-bold"
                      />

                      <input
                        type="text"
                        placeholder="Batch #"
                        value={item.batchNumber}
                        onChange={e => {
                          const updated = [...poItems];
                          updated[idx].batchNumber = e.target.value;
                          setPoItems(updated);
                        }}
                        className="p-2 rounded bg-white dark:bg-slate-900 border font-mono"
                      />

                      <div className="font-bold text-right text-emerald-600">
                        {formatCurrency(item.totalCost, settings.currencySymbol)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t text-sm font-extrabold">
                <span>Total Purchase Order Amount:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalPOAmount, settings.currencySymbol)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700">
                  Save Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
