import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Purchase, PurchaseItem } from '../types';
import { formatCurrency, formatDate } from '../lib/formatters';
import { SearchInput } from '../components/SearchInput';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import {
  Search,
  Plus,
  PackageCheck,
  CheckCircle2,
  Truck,
  X,
  ShoppingBag,
  Trash2
} from 'lucide-react';

export const Purchases: React.FC = () => {
  const {
    purchases,
    suppliers,
    medicines,
    settings,
    addPurchaseOrder,
    receivePurchaseOrder,
    deletePurchaseOrder
  } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [poToDelete, setPoToDelete] = useState<Purchase | null>(null);
  const [isDeletingPO, setIsDeletingPO] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const filteredPurchases = purchases.filter(p => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.purchaseOrderNo.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q) ||
      (p.items && p.items.some(i => i.name.toLowerCase().includes(q) || (i.batchNumber && i.batchNumber.toLowerCase().includes(q))))
    );
  });

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
    setToastMessage(`Purchase Order created successfully for ${sup.name}.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-between text-xs font-bold shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Purchases & Stock-In</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create supplier purchase orders & update inventory stock levels
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Purchase Order
        </button>
      </div>

      {/* Search Input Bar */}
      {purchases.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <SearchInput
            placeholder="Search by Purchase Order #, Supplier name, or item description..."
            value={searchQuery}
            onChange={setSearchQuery}
            matchCount={filteredPurchases.length}
            totalCount={purchases.length}
          />
        </div>
      )}

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
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">No purchase orders recorded yet</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                          Click &quot;+ Create Purchase Order&quot; to log incoming stock shipments from wholesale suppliers.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">No matching purchase orders found</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                          No orders match your search query &quot;{searchQuery}&quot;. Check the spelling or reset your query.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Clear Search
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p, idx) => (
                  <tr key={`po-row-${p.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
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
                      <div className="flex items-center justify-end gap-1.5">
                        {p.deliveryStatus === 'Pending' && (
                          <button
                            onClick={() => receivePurchaseOrder(p.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Receive Stock"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Receive Stock</span>
                          </button>
                        )}
                        {p.deliveryStatus === 'Received' && (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Received {formatDate(p.receivedDate)}
                          </span>
                        )}
                        <button
                          onClick={() => setPoToDelete(p)}
                          className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                          title="Delete Purchase Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 text-xs animate-in zoom-in-95">
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
                    <option value="Pending">Pending (Unpaid)</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Fully Paid</option>
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Ordered Medicine Items</span>
                  <button type="button" onClick={handleAddItem} className="text-emerald-600 font-bold hover:underline">
                    + Add Item Row
                  </button>
                </div>

                {poItems.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <label className="block text-[10px] text-slate-400">Medicine</label>
                      <select
                        value={item.medicineId}
                        onChange={e => handleMedChange(idx, e.target.value)}
                        className="w-full p-1.5 rounded-lg border bg-white dark:bg-slate-800 text-[11px]"
                      >
                        {medicines.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.strength})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400">Qty Ordered</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantityOrdered}
                        onChange={e => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                        className="w-full p-1.5 rounded-lg border bg-white dark:bg-slate-800 text-[11px]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400">Cost/Unit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitCost}
                        readOnly
                        className="w-full p-1.5 rounded-lg border bg-slate-100 dark:bg-slate-800/80 text-[11px]"
                      />
                    </div>
                    <div className="col-span-3 text-right">
                      <label className="block text-[10px] text-slate-400">Line Subtotal</label>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.totalCost, settings.currencySymbol)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="font-semibold block mb-1">Purchase Order Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional delivery or batch tracking instructions..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border"
                />
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

      {/* Delete PO Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!poToDelete}
        onClose={() => setPoToDelete(null)}
        onConfirm={async () => {
          if (!poToDelete) return;
          setIsDeletingPO(true);
          try {
            deletePurchaseOrder(poToDelete.id);
            setToastMessage(`Purchase order ${poToDelete.purchaseOrderNo} was deleted.`);
            setPoToDelete(null);
            setTimeout(() => setToastMessage(null), 3500);
          } finally {
            setIsDeletingPO(false);
          }
        }}
        title="Delete Purchase Order"
        recordName={poToDelete ? `${poToDelete.purchaseOrderNo} • ${poToDelete.supplierName} (${formatCurrency(poToDelete.totalAmount, settings.currencySymbol)})` : ''}
        recordType="Purchase Order"
        consequenceMessage="This will permanently delete this purchase order record."
        warningNote={
          poToDelete && poToDelete.deliveryStatus === 'Received'
            ? 'Notice: This order was marked as Received. Deleting this purchase order record will remove it from procurement history, but already received items in your stock will remain unless manually adjusted in Inventory.'
            : undefined
        }
        confirmButtonText="Delete Purchase Order"
        isDeleting={isDeletingPO}
      />
    </div>
  );
};
