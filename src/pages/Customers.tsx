import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import { Users, Plus, Phone, Mail, AlertTriangle, Award, HeartHandshake, X } from 'lucide-react';

export const Customers: React.FC = () => {
  const { customers, addCustomer, settings } = usePharmacy();
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [allergiesInput, setAllergiesInput] = useState('');
  const [chronicInput, setChronicInput] = useState('');

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer({
      name,
      phone,
      email,
      allergies: allergiesInput ? allergiesInput.split(',').map(a => a.trim()) : [],
      chronicConditions: chronicInput ? chronicInput.split(',').map(c => c.trim()) : []
    });
    setShowAddModal(false);
    setName('');
    setPhone('');
    setEmail('');
    setAllergiesInput('');
    setChronicInput('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Patient & Client Profiles</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track customer medical history, drug allergies, chronic conditions & loyalty reward points
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Register New Patient
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">No registered patients yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Add patient records to track chronic conditions, allergies, loyalty points, and prescription records.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Register First Patient
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map(c => (
            <div key={c.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-sm border">
                    {c.name.charAt(0)}
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <Award className="w-3.5 h-3.5" /> {c.loyaltyPoints} pts
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white">{c.name}</h3>
                <p className="text-xs text-slate-500 mb-2">{c.phone} • {c.email || 'No email'}</p>

                {/* Allergy Warnings */}
                {c.allergies && c.allergies.length > 0 && (
                  <div className="my-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px]">
                    <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Allergies:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.allergies.map((alg, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 font-semibold">
                          {alg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Spent</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(c.totalSpent, settings.currencySymbol)}
                  </span>
                </div>
                <div className="text-right text-slate-400 text-[11px]">
                  Last visit: {formatDate(c.lastVisit)}
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
              <h3 className="font-bold text-base">Register Patient Profile</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Full Patient Name *</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Phone Number *</label>
                  <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800" />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Drug Allergies (Comma separated)</label>
                <input type="text" placeholder="e.g. Penicillin, NSAIDs" value={allergiesInput} onChange={e => setAllergiesInput(e.target.value)} className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Chronic Conditions (Comma separated)</label>
                <input type="text" placeholder="e.g. Hypertension, Diabetes" value={chronicInput} onChange={e => setChronicInput(e.target.value)} className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold">Save Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
