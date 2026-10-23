import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { formatCurrency } from '../lib/formatters';
import { Supplier } from '../types';
import { SearchInput } from '../components/SearchInput';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { CsvImportModal, CsvTargetField } from '../components/CsvImportModal';
import { generateCSV, downloadCSV } from '../lib/csvHelper';
import {
  Truck,
  Plus,
  Mail,
  Phone,
  MapPin,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Tag,
  ShieldAlert,
  Building,
  Upload,
  Download,
  FileSpreadsheet
} from 'lucide-react';

const SUPPLIER_TARGET_FIELDS: CsvTargetField[] = [
  { key: 'name', label: 'Supplier / Vendor Name', required: true, description: 'Company or distributor name', aliases: ['supplier name', 'vendor name', 'company', 'vendor', 'name'] },
  { key: 'contactPerson', label: 'Contact Person', required: true, description: 'Sales representative or account manager', aliases: ['contact person', 'representative', 'contact', 'rep', 'manager'] },
  { key: 'phone', label: 'Phone Number', required: true, description: 'Direct phone or dispatch number', aliases: ['phone', 'mobile', 'telephone', 'contact number', 'phone number'] },
  { key: 'email', label: 'Email Address', required: false, description: 'Orders & invoicing email', aliases: ['email', 'email address', 'e-mail'] },
  { key: 'address', label: 'Business Address', required: false, description: 'Warehouse or office location', aliases: ['address', 'location', 'office', 'warehouse'] },
  { key: 'category', label: 'Category', required: false, description: 'e.g. Pharmaceutical Wholesaler, Manufacturer', aliases: ['category', 'supplier category', 'type'] },
  { key: 'paymentTerms', label: 'Payment Terms', required: false, description: 'e.g. Net 30, Net 15, COD', aliases: ['payment terms', 'terms'] },
  { key: 'taxId', label: 'Tax ID / TIN', required: false, description: 'Business registration or tax identification number', aliases: ['tax id', 'tin', 'vat number'] },
  { key: 'notes', label: 'Notes', required: false, description: 'Delivery schedules or terms', aliases: ['notes', 'remarks'] },
  { key: 'status', label: 'Status', required: false, description: 'Active or Inactive (defaults to Active)', aliases: ['status'] }
];

const SAMPLE_SUPPLIER_TEMPLATE = [
  {
    name: 'Ernest Chemists Wholesale Ltd',
    contactPerson: 'Kwame Asante',
    phone: '+233 30 222 3344',
    email: 'orders@ernestchemists.example',
    address: 'Industrial Area, Ring Road, Accra',
    category: 'Pharmaceutical Wholesaler',
    paymentTerms: 'Net 30',
    taxId: 'TIN-GH-8829104',
    notes: 'Primary bulk generic medicines distributor',
    status: 'Active'
  },
  {
    name: 'Kinapharma Pharmaceuticals',
    contactPerson: 'Ama Serwaa',
    phone: '+233 30 255 6677',
    email: 'distribution@kinapharma.example',
    address: 'North Industrial Area, Accra',
    category: 'Manufacturer',
    paymentTerms: 'Net 15',
    taxId: 'TIN-GH-9912048',
    notes: 'Local manufacturer of pain relief and antibiotics',
    status: 'Active'
  }
];

export const Suppliers: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, settings, currentUser } = usePharmacy();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Delete states
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeletingSupplier, setIsDeletingSupplier] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('Pharmaceutical Wholesaler');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  const canManageSuppliers =
    currentUser.role === 'Super Admin' ||
    currentUser.role === 'Pharmacy Owner' ||
    currentUser.role === 'Administrator' ||
    currentUser.role === 'Store Manager' ||
    currentUser.role === 'Pharmacist';

  const filteredSuppliers = suppliers.filter(s => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.paymentTerms && s.paymentTerms.toLowerCase().includes(q))
    );
  });

  const resetForm = () => {
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCategory('Pharmaceutical Wholesaler');
    setPaymentTerms('Net 30');
    setTaxId('');
    setNotes('');
    setStatus('Active');
    setErrorMessage(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setContactPerson(supplier.contactPerson || '');
    setEmail(supplier.email || '');
    setPhone(supplier.phone || '');
    setAddress(supplier.address || '');
    setCategory(supplier.category || 'Pharmaceutical Wholesaler');
    setPaymentTerms(supplier.paymentTerms || 'Net 30');
    setTaxId(supplier.taxId || '');
    setNotes(supplier.notes || '');
    setStatus(supplier.status || 'Active');
    setErrorMessage(null);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Supplier Name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Phone Number is required.');
      return;
    }

    addSupplier({
      name: name.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      category: category.trim(),
      paymentTerms,
      taxId: taxId.trim(),
      notes: notes.trim(),
      status
    });

    setShowAddModal(false);
    resetForm();
    setSuccessMessage(`Supplier "${name.trim()}" added successfully.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleUpdateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    if (!name.trim()) {
      setErrorMessage('Supplier Name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Phone Number is required.');
      return;
    }

    updateSupplier(editingSupplier.id, {
      name: name.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      category: category.trim(),
      paymentTerms,
      taxId: taxId.trim(),
      notes: notes.trim(),
      status
    });

    setEditingSupplier(null);
    resetForm();
    setSuccessMessage(`Supplier "${name.trim()}" updated successfully.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const dataToExport = filteredSuppliers.length > 0 ? filteredSuppliers : suppliers;
    if (dataToExport.length === 0) {
      alert('No supplier records to export.');
      return;
    }

    const columns = [
      { key: 'id', label: 'Supplier ID' },
      { key: 'name', label: 'Supplier Name' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'phone', label: 'Phone Number' },
      { key: 'email', label: 'Email Address' },
      { key: 'address', label: 'Address' },
      { key: 'category', label: 'Category' },
      { key: 'paymentTerms', label: 'Payment Terms' },
      { key: 'taxId', label: 'Tax ID / TIN' },
      { key: 'balanceOwed', label: `Outstanding Payable (${settings.currencySymbol})` },
      { key: 'totalPurchased', label: `Total Purchased (${settings.currencySymbol})` },
      { key: 'status', label: 'Status' },
      { key: 'notes', label: 'Notes' }
    ];

    const formattedData = dataToExport.map(s => ({
      id: s.id,
      name: s.name,
      contactPerson: s.contactPerson || '',
      phone: s.phone,
      email: s.email || '',
      address: s.address || '',
      category: s.category || '',
      paymentTerms: s.paymentTerms || '',
      taxId: s.taxId || '',
      balanceOwed: s.balanceOwed ?? 0,
      totalPurchased: s.totalPurchased ?? 0,
      status: s.status || 'Active',
      notes: s.notes || ''
    }));

    const csvContent = generateCSV(columns, formattedData);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `suppliers-${searchQuery.trim() ? 'filtered-' : 'all-'}${dateStr}.csv`;
    downloadCSV(filename, csvContent);
    setSuccessMessage(`Exported ${dataToExport.length} supplier records to CSV.`);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Import Validator
  const validateSupplierRow = (row: Record<string, string>): { isValid: boolean; error?: string } => {
    if (!row.name || !row.name.trim()) {
      return { isValid: false, error: 'Supplier / Vendor Name is required.' };
    }
    if (!row.phone || !row.phone.trim()) {
      return { isValid: false, error: 'Phone Number is required.' };
    }
    const cleanDigits = row.phone.replace(/[^0-9]/g, '');
    if (cleanDigits.length < 6) {
      return { isValid: false, error: 'Phone Number must contain at least 6 digits.' };
    }
    if (row.email && row.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email.trim())) {
        return { isValid: false, error: `Invalid email format: "${row.email}"` };
      }
    }
    if (row.status && row.status.trim()) {
      const s = row.status.trim().toLowerCase();
      if (s !== 'active' && s !== 'inactive') {
        return { isValid: false, error: `Invalid status: "${row.status}". Expected Active or Inactive.` };
      }
    }
    return { isValid: true };
  };

  // Duplicate Finder
  const findSupplierDuplicate = (
    row: Record<string, string>,
    existing: Supplier[]
  ): { isDuplicate: boolean; matchDescription?: string; existingRecord?: Supplier } => {
    const rawId = row.id ? row.id.trim().toLowerCase() : '';
    const rawName = row.name ? row.name.trim().toLowerCase() : '';
    const rawPhone = row.phone ? row.phone.replace(/[^0-9]/g, '') : '';
    const rawTaxId = row.taxId ? row.taxId.trim().toLowerCase() : '';

    const matched = existing.find(s => {
      if (rawId && s.id.toLowerCase() === rawId) return true;
      if (rawTaxId && s.taxId && s.taxId.trim().toLowerCase() === rawTaxId) return true;
      if (rawName && s.name.trim().toLowerCase() === rawName) return true;
      if (rawPhone && s.phone.replace(/[^0-9]/g, '') === rawPhone) return true;
      return false;
    });

    if (matched) {
      let reason = `Supplier "${matched.name}" already exists`;
      if (rawTaxId && matched.taxId && matched.taxId.toLowerCase() === rawTaxId) {
        reason = `TIN/Tax ID matches "${matched.name}"`;
      } else if (rawPhone && matched.phone.replace(/[^0-9]/g, '') === rawPhone) {
        reason = `Phone number matches "${matched.name}"`;
      }
      return { isDuplicate: true, matchDescription: reason, existingRecord: matched };
    }
    return { isDuplicate: false };
  };

  // Import Confirmation Handler
  const handleConfirmImportSuppliers = async (
    recordsToImport: Record<string, string>[],
    recordsToUpdate: Record<string, string>[],
    duplicateAction: 'skip' | 'update'
  ): Promise<{ importedCount: number; updatedCount: number; skippedCount: number }> => {
    let imported = 0;
    let updated = 0;

    for (const row of recordsToImport) {
      const statusVal = row.status && row.status.trim().toLowerCase() === 'inactive' ? 'Inactive' : 'Active';
      addSupplier({
        name: row.name.trim(),
        contactPerson: (row.contactPerson || '').trim(),
        phone: row.phone.trim(),
        email: (row.email || '').trim(),
        address: (row.address || '').trim(),
        category: (row.category || 'Pharmaceutical Wholesaler').trim(),
        paymentTerms: (row.paymentTerms || 'Net 30').trim(),
        taxId: (row.taxId || '').trim(),
        notes: (row.notes || '').trim(),
        status: statusVal
      });
      imported++;
    }

    if (duplicateAction === 'update') {
      for (const row of recordsToUpdate) {
        const dup = findSupplierDuplicate(row, suppliers);
        if (dup.existingRecord) {
          const statusVal = row.status && row.status.trim().toLowerCase() === 'inactive' ? 'Inactive' : 'Active';
          updateSupplier(dup.existingRecord.id, {
            name: row.name ? row.name.trim() : dup.existingRecord.name,
            contactPerson: row.contactPerson !== undefined ? row.contactPerson.trim() : dup.existingRecord.contactPerson,
            phone: row.phone ? row.phone.trim() : dup.existingRecord.phone,
            email: row.email !== undefined ? row.email.trim() : dup.existingRecord.email,
            address: row.address !== undefined ? row.address.trim() : dup.existingRecord.address,
            category: row.category !== undefined ? row.category.trim() : dup.existingRecord.category,
            paymentTerms: row.paymentTerms !== undefined ? row.paymentTerms.trim() : dup.existingRecord.paymentTerms,
            taxId: row.taxId !== undefined ? row.taxId.trim() : dup.existingRecord.taxId,
            notes: row.notes !== undefined ? row.notes.trim() : dup.existingRecord.notes,
            status: statusVal
          });
          updated++;
        }
      }
    }

    setSuccessMessage(`Supplier import: ${imported} added${updated > 0 ? `, ${updated} updated` : ''}.`);
    setTimeout(() => setSuccessMessage(null), 4500);

    return {
      importedCount: imported,
      updatedCount: updated,
      skippedCount: duplicateAction === 'skip' ? recordsToUpdate.length : 0
    };
  };

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-between text-xs font-bold shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Supplier Directory</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage pharmaceutical wholesalers, distributors & outstanding balances
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canManageSuppliers && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm"
              title="Import suppliers from CSV file"
            >
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Import CSV</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm"
            title="Export supplier records to CSV"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Export CSV {filteredSuppliers.length > 0 && `(${filteredSuppliers.length})`}</span>
          </button>

          {canManageSuppliers && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add New Supplier
            </button>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      {suppliers.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <SearchInput
            placeholder="Search suppliers by name, contact person, phone, email, category..."
            value={searchQuery}
            onChange={setSearchQuery}
            matchCount={filteredSuppliers.length}
            totalCount={suppliers.length}
          />
        </div>
      )}

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
          {canManageSuppliers && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add First Supplier
            </button>
          )}
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Truck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">No matching suppliers found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              No registered suppliers match your search query &quot;{searchQuery}&quot;. Check the spelling or reset your query.
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
          {filteredSuppliers.map((s, idx) => (
            <div
              key={`sup-card-${s.id}-${idx}`}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {s.status}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {s.paymentTerms || 'Net 30'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">{s.name}</h3>
                    {s.category && (
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                        {s.category}
                      </span>
                    )}
                    <p className="text-xs text-slate-500 mb-3 mt-0.5">Contact: {s.contactPerson || 'N/A'}</p>
                  </div>

                  {canManageSuppliers && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(s)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                        title="Edit Supplier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSupplierToDelete(s)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                        title="Remove Supplier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mt-2">
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{s.email || 'No email provided'}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{s.phone}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{s.address || 'No physical address'}</span>
                  </p>
                  {s.taxId && (
                    <p className="flex items-center gap-2 text-[11px] text-slate-500">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Tax/VAT: {s.taxId}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Orders</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(s.totalPurchased || 0, settings.currencySymbol)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Balance Owed</span>
                  <span
                    className={`font-bold ${
                      (s.balanceOwed || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(s.balanceOwed || 0, settings.currencySymbol)}
                  </span>
                </div>
              </div>

              {canManageSuppliers && (
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleOpenEditModal(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Supplier
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Add New Supplier</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Company / Wholesaler Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Apex Health Pharmaceuticals Ltd"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="e.g. Dr. Samuel Addo"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Supplier Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Pharmaceutical Wholesaler">Pharmaceutical Wholesaler</option>
                    <option value="Manufacturer Direct">Manufacturer Direct</option>
                    <option value="Medical Equipment Distributor">Medical Equipment Distributor</option>
                    <option value="Packaging & Consumables">Packaging & Consumables</option>
                    <option value="Generic Drugs Importer">Generic Drugs Importer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+233 24 000 0000"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="orders@supplier.com"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Physical Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Plot 12 Industrial Area, Accra, Ghana"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Immediate">Immediate / Cash</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Tax / VAT ID</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={e => setTaxId(e.target.value)}
                    placeholder="e.g. C0001234567"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Notes / Contract Details</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Special discounts, delivery schedules, return policies..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Edit Supplier Details</h3>
                  <p className="text-[11px] text-slate-500">ID: {editingSupplier.id}</p>
                </div>
              </div>
              <button onClick={() => setEditingSupplier(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSupplier} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Supplier Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Pharmaceutical Wholesaler">Pharmaceutical Wholesaler</option>
                    <option value="Manufacturer Direct">Manufacturer Direct</option>
                    <option value="Medical Equipment Distributor">Medical Equipment Distributor</option>
                    <option value="Packaging & Consumables">Packaging & Consumables</option>
                    <option value="Generic Drugs Importer">Generic Drugs Importer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Physical Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Immediate">Immediate / Cash</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Tax / VAT ID</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={e => setTaxId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Notes / Terms</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Supplier Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!supplierToDelete}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={async () => {
          if (!supplierToDelete) return;
          setIsDeletingSupplier(true);
          try {
            deleteSupplier(supplierToDelete.id);
            setSuccessMessage(`Supplier "${supplierToDelete.name}" was successfully removed.`);
            setSupplierToDelete(null);
            setTimeout(() => setSuccessMessage(null), 3500);
          } finally {
            setIsDeletingSupplier(false);
          }
        }}
        title="Remove Supplier"
        recordName={supplierToDelete?.name || ''}
        recordType="Supplier"
        consequenceMessage="This will remove this supplier from your active directory. Historical purchase orders from this supplier will be preserved for financial tracking."
        warningNote={
          supplierToDelete && supplierToDelete.balanceOwed > 0
            ? `Notice: You currently have an outstanding payable balance of ${formatCurrency(supplierToDelete.balanceOwed, settings.currencySymbol)} owed to this supplier.`
            : undefined
        }
        confirmButtonText="Remove Supplier"
        isDeleting={isDeletingSupplier}
      />

      {/* CSV Import Modal */}
      <CsvImportModal<Supplier>
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Supplier Directory"
        entityName="Supplier"
        targetFields={SUPPLIER_TARGET_FIELDS}
        sampleTemplateData={SAMPLE_SUPPLIER_TEMPLATE}
        templateFilename="suppliers-directory-template.csv"
        existingRecords={suppliers}
        validator={validateSupplierRow}
        duplicateFinder={findSupplierDuplicate}
        onConfirmImport={handleConfirmImportSuppliers}
      />
    </div>
  );
};
