import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { formatCurrency } from '../lib/formatters';
import { Truck, Plus, Mail, Phone, MapPin, DollarSign, X } from 'lucide-react';

export const Suppliers: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, settings } = usePharmacy();
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    addSupplier({
      name,
      contactPerson,
      email,
      phone,
      address,
      paymentTerms,
      status: 'Active'
    });
    setShowAddModal(false);
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Supplier Directory</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage pharmaceutical wholesalers, distributors & outstanding balances
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add New Supplier
        </button>
      </div>

      {suppliers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Truck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">No suppliers registered yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Add pharmaceutical wholesalers, distributors, and manufacturers to manage procurement and order balances.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add First Supplier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5" />
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {s.paymentTerms}
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white">{s.name}</h3>
                <p className="text-xs text-slate-500 mb-3">Contact: {s.contactPerson}</p>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> {s.email}</p>
                  <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {s.phone}</p>
                  <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {s.address}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Orders</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(s.totalPurchased, settings.currencySymbol)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Balance Owed</span>
                  <span className={`font-bold ${s.balanceOwed > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                    {formatCurrency(s.balanceOwed, settings.currencySymbol)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-base">Add New Supplier</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Company / Wholesaler Name *</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Contact Person</label>
                <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Email *</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Phone *</label>
                  <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Address</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
