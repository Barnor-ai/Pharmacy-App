import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import { Customer } from '../types';
import { SearchInput } from '../components/SearchInput';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import {
  Users,
  Plus,
  Phone,
  Mail,
  AlertTriangle,
  Award,
  HeartHandshake,
  X,
  Edit2,
  Trash2,
  Activity,
  CheckCircle2
} from 'lucide-react';

export const Customers: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, settings } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [allergiesInput, setAllergiesInput] = useState('');
  const [chronicInput, setChronicInput] = useState('');

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.allergies && c.allergies.some(a => a.toLowerCase().includes(q))) ||
      (c.chronicConditions && c.chronicConditions.some(cond => cond.toLowerCase().includes(q)))
    );
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAllergiesInput('');
    setChronicInput('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone);
    setEmail(cust.email || '');
    setAllergiesInput(cust.allergies ? cust.allergies.join(', ') : '');
    setChronicInput(cust.chronicConditions ? cust.chronicConditions.join(', ') : '');
    setShowAddModal(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const allergies = allergiesInput
      ? allergiesInput.split(',').map(a => a.trim()).filter(Boolean)
      : [];
    const chronicConditions = chronicInput
      ? chronicInput.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        allergies,
        chronicConditions
      });
      setSuccessToast(`Patient profile "${name.trim()}" updated successfully.`);
    } else {
      addCustomer({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        allergies,
        chronicConditions
      });
      setSuccessToast(`New patient "${name.trim()}" registered successfully.`);
    }

    setShowAddModal(false);
    setEditingCustomer(null);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-between text-xs font-bold shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Patient & Client Profiles</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track customer medical history, drug allergies, chronic conditions & loyalty reward points
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Register New Patient
        </button>
      </div>

      {/* Search Input Bar */}
      {customers.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <SearchInput
            placeholder="Search patients by name, phone, email, drug allergy, or condition..."
            value={searchQuery}
            onChange={setSearchQuery}
            matchCount={filteredCustomers.length}
            totalCount={customers.length}
          />
        </div>
      )}

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
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Register First Patient
          </button>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">No matching patients found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              No registered patient matches your query &quot;{searchQuery}&quot;. Check the spelling or reset search.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((c, idx) => (
            <div
              key={`cust-card-${c.id}-${idx}`}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-sm border border-emerald-200 dark:border-emerald-800">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{c.name}</h3>
                      <p className="text-[11px] text-slate-500">{c.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <Award className="w-3 h-3" /> {c.loyaltyPoints} pts
                    </span>
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      title="Edit Patient"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCustomerToDelete(c)}
                      className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                      title="Delete Patient"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  {c.email && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </p>
                  )}
                </div>

                {/* Chronic Conditions */}
                {c.chronicConditions && c.chronicConditions.length > 0 && (
                  <div className="my-2 p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-[11px]">
                    <span className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Chronic:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.chronicConditions.map((cond, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-blue-200/70 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-semibold text-[10px]">
                          {cond}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drug Allergy Warnings */}
                {c.allergies && c.allergies.length > 0 && (
                  <div className="my-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px]">
                    <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Drug Allergies:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.allergies.map((alg, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 font-semibold text-[10px]">
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
                  Last visit: {c.lastVisit ? formatDate(c.lastVisit) : 'Never'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingCustomer ? 'Edit Patient Profile' : 'Register Patient Profile'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Full Patient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kwame Mensah"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+233 20 123 4567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Email</label>
                  <input
                    type="email"
                    placeholder="patient@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Drug Allergies (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, NSAIDs, Sulfa drugs"
                  value={allergiesInput}
                  onChange={e => setAllergiesInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Chronic Conditions (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma"
                  value={chronicInput}
                  onChange={e => setChronicInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
                >
                  {editingCustomer ? 'Update Patient' : 'Save Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Patient Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={async () => {
          if (!customerToDelete) return;
          setIsDeletingCustomer(true);
          try {
            deleteCustomer(customerToDelete.id);
            setSuccessToast(`Patient profile for "${customerToDelete.name}" was successfully removed.`);
            setCustomerToDelete(null);
            setTimeout(() => setSuccessToast(null), 3500);
          } finally {
            setIsDeletingCustomer(false);
          }
        }}
        title="Delete Patient Profile"
        recordName={customerToDelete ? `${customerToDelete.name} (${customerToDelete.phone})` : ''}
        recordType="Patient Profile"
        consequenceMessage="This action will permanently delete this patient profile and allergy notes from your pharmacy directory. Associated historical invoices and sales records will remain preserved for legal auditing."
        warningNote={
          customerToDelete && customerToDelete.loyaltyPoints > 0
            ? `Notice: This patient currently holds ${customerToDelete.loyaltyPoints} unredeemed loyalty reward points.`
            : undefined
        }
        confirmButtonText="Delete Patient"
        isDeleting={isDeletingCustomer}
      />
    </div>
  );
};
