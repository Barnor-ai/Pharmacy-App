import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Medicine, StockStatus } from '../types';
import { formatCurrency, formatDate, getStockStatusBadge } from '../lib/formatters';
import { triggerLowStockEmailAlert, LowStockAlertResponse } from '../lib/edgeFunctions';
import { SearchInput } from '../components/SearchInput';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { CsvImportModal, CsvTargetField } from '../components/CsvImportModal';
import { generateCSV, downloadCSV } from '../lib/csvHelper';
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  SlidersHorizontal,
  FileSpreadsheet,
  AlertTriangle,
  Pill,
  X,
  CheckCircle2,
  BellRing,
  Mail,
  Send,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  RotateCcw,
  Clock,
  Layers,
  ChevronDown,
  History,
  PackageCheck
} from 'lucide-react';

const MEDICINE_TARGET_FIELDS: CsvTargetField[] = [
  { key: 'barcode', label: 'Medicine Code / SKU / Barcode', required: false, description: 'Unique barcode or SKU (auto-generated if omitted)', aliases: ['barcode', 'sku', 'code', 'medicine code', 'item code'] },
  { key: 'name', label: 'Medicine Brand / Trade Name', required: true, description: 'Brand or commercial name of drug', aliases: ['medicine', 'name', 'medicine name', 'trade name', 'drug name'] },
  { key: 'genericName', label: 'Generic Name (Active Ingredient)', required: false, description: 'Scientific formula or active molecule', aliases: ['generic', 'generic name', 'active ingredient', 'formula', 'molecule'] },
  { key: 'category', label: 'Category / Drug Class', required: false, description: 'e.g. Antibiotics, Analgesics, Antidiabetics', aliases: ['category', 'drug class', 'classification', 'department'] },
  { key: 'strength', label: 'Dosage Strength', required: false, description: 'e.g. 500mg, 10ml, 5mg/ml', aliases: ['strength', 'dosage', 'potency', 'mg'] },
  { key: 'dosageForm', label: 'Dosage Form', required: false, description: 'e.g. Tablet, Capsule, Syrup, Injection', aliases: ['dosage form', 'form', 'presentation'] },
  { key: 'unit', label: 'Unit of Measure', required: false, description: 'e.g. Box (30 Tabs), Strip (10 Tabs), Bottle', aliases: ['unit', 'unit of measure', 'packaging', 'pack size'] },
  { key: 'purchasePrice', label: 'Cost Price (GH₵)', required: true, description: 'Wholesale acquisition cost per unit', aliases: ['purchase price', 'cost price', 'cost', 'unit cost', 'wholesale price'] },
  { key: 'sellingPrice', label: 'Selling Price (GH₵)', required: true, description: 'Retail price to patient', aliases: ['selling price', 'retail price', 'price', 'unit price'] },
  { key: 'minReorderLevel', label: 'Reorder Level Threshold', required: false, description: 'Threshold to trigger low stock warning', aliases: ['reorder level', 'min stock', 'threshold', 'minimum level'] },
  { key: 'batchNumber', label: 'Batch / Lot Number', required: false, description: 'Manufacturer batch code', aliases: ['batch', 'batch number', 'lot', 'lot number'] },
  { key: 'expiryDate', label: 'Expiry Date (YYYY-MM-DD)', required: false, description: 'Shelf life expiry date', aliases: ['expiry date', 'expiry', 'exp date', 'expiration'] },
  { key: 'locationRack', label: 'Storage / Rack Location', required: false, description: 'e.g. Shelf A-01, Fridge 2', aliases: ['location', 'rack', 'shelf', 'location rack', 'bin'] },
  { key: 'isPrescriptionRequired', label: 'Prescription Required (Yes/No)', required: false, description: 'POM prescription status', aliases: ['prescription required', 'rx required', 'prescription', 'pom'] },
  { key: 'openingStock', label: 'Verified Opening Stock (Units)', required: false, description: 'Initial stock on hand (leaves stock at 0 if omitted)', aliases: ['opening stock', 'stock', 'initial stock', 'quantity', 'stock quantity'] }
];

const SAMPLE_MEDICINE_TEMPLATE = [
  {
    barcode: '890104819201',
    name: 'Amoxicillin Trihydrate 500mg',
    genericName: 'Amoxicillin',
    category: 'Antibiotics',
    strength: '500mg',
    dosageForm: 'Capsule',
    unit: 'Box (100 Caps)',
    purchasePrice: '35.00',
    sellingPrice: '52.00',
    minReorderLevel: '20',
    batchNumber: 'AMX-2025-01',
    expiryDate: '2026-11-30',
    locationRack: 'Shelf A-02',
    isPrescriptionRequired: 'Yes',
    openingStock: '50'
  },
  {
    barcode: '890104819202',
    name: 'Metformin HCl 500mg Tablets',
    genericName: 'Metformin',
    category: 'Antidiabetics',
    strength: '500mg',
    dosageForm: 'Tablet',
    unit: 'Box (84 Tabs)',
    purchasePrice: '22.50',
    sellingPrice: '34.00',
    minReorderLevel: '15',
    batchNumber: 'MET-2025-B2',
    expiryDate: '2027-04-15',
    locationRack: 'Shelf C-01',
    isPrescriptionRequired: 'Yes',
    openingStock: '40'
  }
];

export const Inventory: React.FC = () => {
  const {
    medicines,
    categories,
    suppliers,
    settings,
    currentUser,
    auditLogs,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    adjustStock,
    addAuditLog
  } = usePharmacy();
  const { plan, limits, canAddMedicine, isExpired } = useSubscription();

  // Navigation tab within Inventory: 'catalog' | 'timeline'
  const [activeInventoryTab, setActiveInventoryTab] = useState<'catalog' | 'timeline'>('catalog');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'expiring-30' | 'expiring-90' | 'valid'>('all');

  // Custom Period Filter State (10 presets)
  const [datePreset, setDatePreset] = useState<
    | 'all'
    | 'today'
    | 'yesterday'
    | 'this-week'
    | 'last-week'
    | 'this-month'
    | 'last-month'
    | 'this-quarter'
    | 'this-year'
    | 'previous-year'
    | 'custom'
  >('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [adjustingMed, setAdjustingMed] = useState<Medicine | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Physical Audit Stock Count');

  // Delete modal state
  const [medicineToDelete, setMedicineToDelete] = useState<Medicine | null>(null);
  const [isDeletingMed, setIsDeletingMed] = useState(false);

  // Low stock email alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertSending, setAlertSending] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [alertResult, setAlertResult] = useState<LowStockAlertResponse | null>(null);

  // Form State
  const initialFormState = {
    barcode: '',
    name: '',
    genericName: '',
    category: categories[0]?.name || 'Antibiotics',
    brand: '',
    dosageForm: 'Tablet',
    strength: '500mg',
    batchNumber: 'BATCH-' + Math.floor(Math.random() * 90000 + 10000),
    manufactureDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 86400000 * 2).toISOString().split('T')[0],
    purchasePrice: 10,
    sellingPrice: 18,
    stockQuantity: 100,
    minReorderLevel: 20,
    unit: 'Box (30 Tabs)',
    supplierId: suppliers[0]?.id || '',
    locationRack: 'Shelf A-01',
    isPrescriptionRequired: false,
    description: '',
    sideEffects: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const canManageInventory =
    currentUser.role === 'Super Admin' ||
    currentUser.role === 'Pharmacy Owner' ||
    currentUser.role === 'Administrator' ||
    currentUser.role === 'Store Manager' ||
    currentUser.role === 'Pharmacist';

  // 10-Preset Date Range Helper
  const getInventoryDateRange = (preset: string): { start: string; end: string } | null => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (preset === 'yesterday') {
      const y = new Date(now.getTime() - 86400000);
      return { start: y.toISOString().split('T')[0], end: y.toISOString().split('T')[0] };
    }
    if (preset === 'this-week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return { start: monday.toISOString().split('T')[0], end: todayStr };
    }
    if (preset === 'last-week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const lastMonday = new Date(d.setDate(diff));
      const lastSunday = new Date(lastMonday.getTime() + 6 * 86400000);
      return { start: lastMonday.toISOString().split('T')[0], end: lastSunday.toISOString().split('T')[0] };
    }
    if (preset === 'this-month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (preset === 'last-month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (preset === 'this-quarter') {
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), (q + 1) * 3, 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (preset === 'this-year') {
      return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
    }
    if (preset === 'previous-year') {
      return { start: `${now.getFullYear() - 1}-01-01`, end: `${now.getFullYear() - 1}-12-31` };
    }
    return null;
  };

  // Medicine Catalog Filter logic (IMPORTANT: Does not hide catalog records due to transaction dates!)
  const filteredMedicines = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const in90Days = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

    return medicines.filter(m => {
      // 1. Text Search across name, code/SKU, barcode, generic name, batch, brand, rack
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesGeneric = m.genericName.toLowerCase().includes(q);
        const matchesBarcode = m.barcode.toLowerCase().includes(q);
        const matchesBatch = m.batchNumber.toLowerCase().includes(q);
        const matchesBrand = m.brand ? m.brand.toLowerCase().includes(q) : false;
        const matchesCategory = m.category ? m.category.toLowerCase().includes(q) : false;
        const matchesRack = m.locationRack ? m.locationRack.toLowerCase().includes(q) : false;

        if (!matchesName && !matchesGeneric && !matchesBarcode && !matchesBatch && !matchesBrand && !matchesCategory && !matchesRack) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'All' && m.category !== selectedCategory) {
        return false;
      }

      // 3. Stock Status Filter
      if (selectedStatus !== 'All' && m.status !== selectedStatus) {
        return false;
      }

      // 4. Expiry Filter
      if (expiryFilter !== 'all') {
        const exp = m.expiryDate ? m.expiryDate.split('T')[0] : '';
        if (expiryFilter === 'expired' && exp >= today) return false;
        if (expiryFilter === 'expiring-30' && (exp < today || exp > in30Days)) return false;
        if (expiryFilter === 'expiring-90' && (exp < today || exp > in90Days)) return false;
        if (expiryFilter === 'valid' && exp <= in90Days) return false;
      }

      return true;
    });
  }, [medicines, searchQuery, selectedCategory, selectedStatus, expiryFilter]);

  // Inventory Movement & Expiry Timeline Filter logic (Dated records)
  const datedInventoryRecords = useMemo(() => {
    // Collect stock-related audit log transactions
    const stockAuditEntries = auditLogs.filter(
      log => log.module === 'Inventory' || log.module === 'Purchases' || log.action.includes('Stock')
    );

    let periodStart = '';
    let periodEnd = '';
    if (datePreset === 'custom') {
      periodStart = startDate;
      periodEnd = endDate;
    } else if (datePreset !== 'all') {
      const range = getInventoryDateRange(datePreset);
      if (range) {
        periodStart = range.start;
        periodEnd = range.end;
      }
    }

    // Filter audit logs by date period
    const filteredAudits = stockAuditEntries.filter(log => {
      const logDate = log.timestamp.split(' ')[0];
      if (periodStart && logDate < periodStart) return false;
      if (periodEnd && logDate > periodEnd) return false;
      return true;
    });

    // Also filter medicines expiring in the specified period
    const expiringInPeriod = medicines.filter(m => {
      const exp = m.expiryDate ? m.expiryDate.split('T')[0] : '';
      if (!exp) return false;
      if (periodStart && exp < periodStart) return false;
      if (periodEnd && exp > periodEnd) return false;
      return true;
    });

    return { audits: filteredAudits, expiringMedicines: expiringInPeriod };
  }, [auditLogs, medicines, datePreset, startDate, endDate]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'All' ||
    selectedStatus !== 'All' ||
    expiryFilter !== 'all' ||
    datePreset !== 'all' ||
    startDate !== '' ||
    endDate !== '';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedStatus('All');
    setExpiryFilter('all');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  const lowStockCount = medicines.filter(
    m => m.stockQuantity <= m.minReorderLevel || m.status === 'Low Stock' || m.status === 'Out of Stock'
  ).length;

  const handleOpenAdd = () => {
    setLimitWarning(null);
    if (isExpired) {
      setLimitWarning('Your subscription is expired. Please renew or upgrade your plan to add new inventory.');
      return;
    }
    if (!canAddMedicine) {
      setLimitWarning(`Medicine inventory limit reached (${limits.currentMedicines}/${limits.maxMedicines.toLocaleString()} items). Upgrade to Professional or Business to add more medicine SKUs.`);
      return;
    }

    setFormData({
      ...initialFormState,
      barcode: '89010' + Math.floor(Math.random() * 900000 + 100000),
      supplierId: suppliers[0]?.id || ''
    });
    setEditingMedicine(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (med: Medicine) => {
    setEditingMedicine(med);
    setFormData({
      barcode: med.barcode,
      name: med.name,
      genericName: med.genericName,
      category: med.category,
      brand: med.brand,
      dosageForm: med.dosageForm,
      strength: med.strength,
      batchNumber: med.batchNumber,
      manufactureDate: med.manufactureDate,
      expiryDate: med.expiryDate,
      purchasePrice: med.purchasePrice,
      sellingPrice: med.sellingPrice,
      stockQuantity: med.stockQuantity,
      minReorderLevel: med.minReorderLevel,
      unit: med.unit,
      supplierId: med.supplierId,
      locationRack: med.locationRack,
      isPrescriptionRequired: med.isPrescriptionRequired,
      description: med.description || '',
      sideEffects: med.sideEffects || ''
    });
    setShowAddModal(true);
  };

  const handleSaveMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);

    if (editingMedicine) {
      updateMedicine(editingMedicine.id, {
        ...formData,
        supplierName: selectedSupplier?.name
      });
      setToastMessage(`Medicine "${formData.name}" updated successfully.`);
    } else {
      addMedicine({
        ...formData,
        supplierName: selectedSupplier?.name
      });
      setToastMessage(`New medicine "${formData.name}" added to catalog.`);
    }

    setShowAddModal(false);
    setEditingMedicine(null);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleStockAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustingMed && adjustDelta !== 0) {
      adjustStock(adjustingMed.id, adjustDelta, adjustReason);
      setToastMessage(`Stock adjusted for "${adjustingMed.name}": ${adjustDelta > 0 ? '+' : ''}${adjustDelta} units.`);
      setTimeout(() => setToastMessage(null), 3500);
    }
    setAdjustingMed(null);
    setAdjustDelta(0);
  };

  const handleTriggerAlert = async () => {
    setAlertSending(true);
    setAlertResult(null);

    try {
      const res = await triggerLowStockEmailAlert(
        'org_default',
        medicines,
        15,
        customEmail.trim() || undefined
      );
      setAlertResult(res);
    } catch (err: any) {
      setAlertResult({
        success: false,
        message: err?.message || 'Failed to dispatch email alert.',
        count: 0,
        error: err?.message
      });
    } finally {
      setAlertSending(false);
    }
  };

  // CSV Export Handler
  const exportCSV = () => {
    const dataToExport = filteredMedicines.length > 0 ? filteredMedicines : medicines;
    if (dataToExport.length === 0) {
      alert('No medicine records to export.');
      return;
    }

    const columns = [
      { key: 'barcode', label: 'Medicine Code / SKU / Barcode' },
      { key: 'name', label: 'Medicine Name' },
      { key: 'genericName', label: 'Generic Name' },
      { key: 'category', label: 'Category' },
      { key: 'strength', label: 'Strength' },
      { key: 'dosageForm', label: 'Dosage Form' },
      { key: 'unit', label: 'Unit' },
      { key: 'purchasePrice', label: `Cost Price (${settings.currencySymbol})` },
      { key: 'sellingPrice', label: `Selling Price (${settings.currencySymbol})` },
      { key: 'stockQuantity', label: 'Stock On Hand' },
      { key: 'minReorderLevel', label: 'Reorder Level' },
      { key: 'batchNumber', label: 'Batch Number' },
      { key: 'expiryDate', label: 'Expiry Date' },
      { key: 'locationRack', label: 'Rack Location' },
      { key: 'isPrescriptionRequired', label: 'Prescription Required' },
      { key: 'status', label: 'Status' }
    ];

    const formattedData = dataToExport.map(m => ({
      barcode: m.barcode,
      name: m.name,
      genericName: m.genericName,
      category: m.category,
      strength: m.strength,
      dosageForm: m.dosageForm,
      unit: m.unit,
      purchasePrice: m.purchasePrice,
      sellingPrice: m.sellingPrice,
      stockQuantity: m.stockQuantity,
      minReorderLevel: m.minReorderLevel,
      batchNumber: m.batchNumber,
      expiryDate: m.expiryDate,
      locationRack: m.locationRack,
      isPrescriptionRequired: m.isPrescriptionRequired ? 'Yes' : 'No',
      status: m.status
    }));

    const csvContent = generateCSV(columns, formattedData);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `medicine-catalog-${hasActiveFilters ? 'filtered-' : 'all-'}${dateStr}.csv`;
    downloadCSV(filename, csvContent);
    setToastMessage(`Exported ${dataToExport.length} medicine records to CSV.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // CSV Import Validation & Execution
  const validateMedicineRow = (row: Record<string, string>): { isValid: boolean; error?: string } => {
    if (!row.name || !row.name.trim()) {
      return { isValid: false, error: 'Medicine Brand / Trade Name is required.' };
    }
    if (!row.sellingPrice || isNaN(Number(row.sellingPrice)) || Number(row.sellingPrice) <= 0) {
      return { isValid: false, error: `Selling Price must be a positive number. Got "${row.sellingPrice}".` };
    }
    if (row.purchasePrice !== undefined && row.purchasePrice !== '') {
      if (isNaN(Number(row.purchasePrice)) || Number(row.purchasePrice) < 0) {
        return { isValid: false, error: `Purchase Cost must be a valid number >= 0. Got "${row.purchasePrice}".` };
      }
    }
    if (row.minReorderLevel !== undefined && row.minReorderLevel !== '') {
      if (isNaN(Number(row.minReorderLevel)) || Number(row.minReorderLevel) < 0) {
        return { isValid: false, error: `Reorder Level must be a valid number >= 0. Got "${row.minReorderLevel}".` };
      }
    }
    if (row.openingStock !== undefined && row.openingStock !== '') {
      if (isNaN(Number(row.openingStock)) || Number(row.openingStock) < 0) {
        return { isValid: false, error: `Opening Stock must be a valid number >= 0. Got "${row.openingStock}".` };
      }
    }
    if (row.expiryDate && row.expiryDate.trim()) {
      const d = new Date(row.expiryDate.trim());
      if (isNaN(d.getTime())) {
        return { isValid: false, error: `Invalid expiry date format: "${row.expiryDate}". Use YYYY-MM-DD.` };
      }
    }
    return { isValid: true };
  };

  const findMedicineDuplicate = (
    row: Record<string, string>,
    existing: Medicine[]
  ): { isDuplicate: boolean; matchDescription?: string; existingRecord?: Medicine } => {
    const rawBarcode = row.barcode ? row.barcode.trim().toLowerCase() : '';
    const rawName = row.name ? row.name.trim().toLowerCase() : '';

    const matched = existing.find(m => {
      if (rawBarcode && m.barcode.toLowerCase() === rawBarcode) return true;
      if (rawName && m.name.toLowerCase() === rawName) return true;
      return false;
    });

    if (matched) {
      const reason = rawBarcode && matched.barcode.toLowerCase() === rawBarcode
        ? `Barcode/SKU "${matched.barcode}" matches ${matched.name}`
        : `Medicine name "${matched.name}" already exists`;
      return { isDuplicate: true, matchDescription: reason, existingRecord: matched };
    }
    return { isDuplicate: false };
  };

  const handleConfirmImportMedicines = async (
    recordsToImport: Record<string, string>[],
    recordsToUpdate: Record<string, string>[],
    duplicateAction: 'skip' | 'update'
  ): Promise<{ importedCount: number; updatedCount: number; skippedCount: number }> => {
    let imported = 0;
    let updated = 0;

    // 1. Process new medicine catalog items
    for (const row of recordsToImport) {
      const cost = parseFloat(row.purchasePrice) || 10;
      const sell = parseFloat(row.sellingPrice) || 15;
      const reorder = parseInt(row.minReorderLevel) || 15;
      const stock = parseInt(row.openingStock) || 0; // Safe: 0 unless opening stock explicitly supplied
      const isRx = (row.isPrescriptionRequired || '').toLowerCase().startsWith('y');
      const barcode = row.barcode ? row.barcode.trim() : '89010' + Math.floor(Math.random() * 900000 + 100000);

      addMedicine({
        barcode,
        name: row.name.trim(),
        genericName: row.genericName?.trim() || row.name.trim(),
        category: row.category?.trim() || categories[0]?.name || 'Antibiotics',
        brand: row.brand?.trim() || 'Generic Pharma',
        dosageForm: row.dosageForm?.trim() || 'Tablet',
        strength: row.strength?.trim() || '500mg',
        batchNumber: row.batchNumber?.trim() || 'BATCH-' + Math.floor(Math.random() * 90000 + 10000),
        manufactureDate: new Date().toISOString().split('T')[0],
        expiryDate: row.expiryDate?.trim() || new Date(Date.now() + 365 * 86400000 * 2).toISOString().split('T')[0],
        purchasePrice: cost,
        sellingPrice: sell,
        stockQuantity: stock,
        minReorderLevel: reorder,
        unit: row.unit?.trim() || 'Box',
        supplierId: suppliers[0]?.id || '',
        locationRack: row.locationRack?.trim() || 'Shelf A-01',
        isPrescriptionRequired: isRx
      });

      if (stock > 0) {
        addAuditLog(
          'Opening Stock Ingested',
          'Inventory',
          `Recorded verified opening stock of ${stock} units for ${row.name.trim()} via CSV import.`
        );
      }
      imported++;
    }

    // 2. Process duplicate updates if selected
    if (duplicateAction === 'update') {
      for (const row of recordsToUpdate) {
        const dup = findMedicineDuplicate(row, medicines);
        if (dup.existingRecord) {
          const cost = row.purchasePrice !== undefined ? parseFloat(row.purchasePrice) : dup.existingRecord.purchasePrice;
          const sell = row.sellingPrice !== undefined ? parseFloat(row.sellingPrice) : dup.existingRecord.sellingPrice;
          const reorder = row.minReorderLevel !== undefined ? parseInt(row.minReorderLevel) : dup.existingRecord.minReorderLevel;
          const isRx = row.isPrescriptionRequired !== undefined
            ? (row.isPrescriptionRequired || '').toLowerCase().startsWith('y')
            : dup.existingRecord.isPrescriptionRequired;

          updateMedicine(dup.existingRecord.id, {
            name: row.name ? row.name.trim() : dup.existingRecord.name,
            genericName: row.genericName !== undefined ? row.genericName.trim() : dup.existingRecord.genericName,
            category: row.category !== undefined ? row.category.trim() : dup.existingRecord.category,
            dosageForm: row.dosageForm !== undefined ? row.dosageForm.trim() : dup.existingRecord.dosageForm,
            strength: row.strength !== undefined ? row.strength.trim() : dup.existingRecord.strength,
            unit: row.unit !== undefined ? row.unit.trim() : dup.existingRecord.unit,
            purchasePrice: cost,
            sellingPrice: sell,
            minReorderLevel: reorder,
            locationRack: row.locationRack !== undefined ? row.locationRack.trim() : dup.existingRecord.locationRack,
            isPrescriptionRequired: isRx
          });
          updated++;
        }
      }
    }

    setToastMessage(`Medicine import completed: ${imported} added${updated > 0 ? `, ${updated} updated` : ''}.`);
    setTimeout(() => setToastMessage(null), 4500);

    return {
      importedCount: imported,
      updatedCount: updated,
      skippedCount: duplicateAction === 'skip' ? recordsToUpdate.length : 0
    };
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

      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Medicine Catalog & Inventory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total {medicines.length} medicine SKUs registered in dispensary catalog
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Plan SKU Quota Badge */}
          <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">SKU Capacity:</span>
            <span className={`font-bold font-mono ${!canAddMedicine ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
              {limits.currentMedicines} / {limits.maxMedicines.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => {
              setAlertResult(null);
              setShowAlertModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 hover:bg-amber-100 text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <BellRing className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Low Stock ({lowStockCount})</span>
          </button>

          {canManageInventory && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm cursor-pointer"
              title="Import medicines from CSV file"
            >
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Import CSV</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm cursor-pointer"
            title="Export medicine catalog to CSV"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Export CSV ({filteredMedicines.length})</span>
          </button>

          {canManageInventory && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Medicine
            </button>
          )}
        </div>
      </div>

      {/* Navigation View Segmented Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveInventoryTab('catalog')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition cursor-pointer ${
            activeInventoryTab === 'catalog'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Medicine Catalog & Active Stock</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white">
            {medicines.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveInventoryTab('timeline')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition cursor-pointer ${
            activeInventoryTab === 'timeline'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Stock Movements & Expiry Timeline (Dated)</span>
        </button>
      </div>

      {/* Warnings & Subscription Quota Banner */}
      {limitWarning && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{limitWarning}</span>
          </div>
          <button
            onClick={() => setLimitWarning(null)}
            className="p-1 text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: MEDICINE CATALOG & ACTIVE STOCK */}
      {activeInventoryTab === 'catalog' && (
        <div className="space-y-4">
          {/* Search & Custom Multi-Filter Engine */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex-1">
                <SearchInput
                  placeholder="Search by Medicine Name, SKU, Barcode, Generic, Batch, Rack..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  matchCount={filteredMedicines.length}
                  totalCount={medicines.length}
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Category Selector */}
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="All">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>

                {/* Stock Status Selector */}
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="All">All Stock Levels</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                  <option value="Expiring Soon">Expiring Soon</option>
                  <option value="Expired">Expired</option>
                </select>

                {/* Expiry Selector */}
                <select
                  value={expiryFilter}
                  onChange={e => setExpiryFilter(e.target.value as any)}
                  className="py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Expiries</option>
                  <option value="expired">Already Expired</option>
                  <option value="expiring-30">Expiring in 30 Days</option>
                  <option value="expiring-90">Expiring in 90 Days</option>
                  <option value="valid">Valid &gt; 90 Days</option>
                </select>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
                    title="Reset all search queries and filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Medicines Table */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Medicine Details</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Batch & Expiry</th>
                    <th className="p-3">Cost Price</th>
                    <th className="p-3">Selling Price</th>
                    <th className="p-3">Stock Level</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {medicines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Pill className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-sm text-slate-900 dark:text-white">No medicine catalog records</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                              Click &quot;+ Add Medicine&quot; or &quot;Import CSV&quot; to populate your dispensary catalog.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredMedicines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                            <Pill className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-sm text-slate-900 dark:text-white">No matching medicines found</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                              No medicines matched your search terms and category criteria. Reset filters to view all catalog records.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleClearFilters}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            Reset Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMedicines.map((m, idx) => (
                      <tr key={`med-row-${m.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3">
                          <span className="font-bold text-slate-900 dark:text-white block">{m.name}</span>
                          <span className="text-[11px] text-slate-400 block">{m.genericName} • {m.strength}</span>
                          <span className="font-mono text-[10px] text-slate-400">{m.barcode}</span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {m.category}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-[11px] block">{m.batchNumber}</span>
                          <span className="text-[11px] text-slate-500">Exp: {formatDate(m.expiryDate)}</span>
                        </td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                          {formatCurrency(m.purchasePrice, settings.currencySymbol)}
                        </td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(m.sellingPrice, settings.currencySymbol)}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 dark:text-white">{m.stockQuantity}</span>
                          <span className="text-[10px] text-slate-400 block">Min: {m.minReorderLevel}</span>
                        </td>
                        <td className="p-3">
                          {getStockStatusBadge(m.status)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canManageInventory && (
                              <button
                                onClick={() => {
                                  setAdjustingMed(m);
                                  setAdjustDelta(0);
                                }}
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition"
                                title="Adjust Stock Quantity"
                              >
                                Adjust
                              </button>
                            )}

                            {canManageInventory && (
                              <button
                                onClick={() => handleOpenEdit(m)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                                title="Edit Medicine"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canManageInventory && (
                              <button
                                onClick={() => setMedicineToDelete(m)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition"
                                title="Delete Medicine"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATED INVENTORY MOVEMENTS & EXPIRY TIMELINE */}
      {activeInventoryTab === 'timeline' && (
        <div className="space-y-4">
          {/* 10-Preset Custom Period Filter Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Custom Period Filter Engine</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Filter inventory movements, stock audits, and expiring batches by transaction dates
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={datePreset}
                  onChange={e => setDatePreset(e.target.value as any)}
                  className="py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this-week">This Week</option>
                  <option value="last-week">Last Week</option>
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="this-quarter">This Quarter</option>
                  <option value="this-year">This Year</option>
                  <option value="previous-year">Previous Year</option>
                  <option value="custom">Custom Date Range...</option>
                </select>

                {datePreset !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      setDatePreset('all');
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Period</span>
                  </button>
                )}
              </div>
            </div>

            {datePreset === 'custom' && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Custom Range:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>
            )}
          </div>

          {/* Dated Grid: Left: Stock Movements Audit Trail, Right: Batches Expiring in Period */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Stock Movement Log */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-600" />
                <span>Stock Adjustments & Movements in Period ({datedInventoryRecords.audits.length})</span>
              </h4>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {datedInventoryRecords.audits.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    No stock movements recorded in the selected period.
                  </p>
                ) : (
                  datedInventoryRecords.audits.map((log, idx) => (
                    <div key={`audit-${log.id}-${idx}`} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{log.action}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">{log.details}</p>
                      <span className="text-[10px] text-slate-400 block">Operator: {log.userName} ({log.role})</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Batches Expiring in Period */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Batches Expiring in Selected Period ({datedInventoryRecords.expiringMedicines.length})</span>
              </h4>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {datedInventoryRecords.expiringMedicines.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    No medicines expiring in the selected period.
                  </p>
                ) : (
                  datedInventoryRecords.expiringMedicines.map((m, idx) => (
                    <div key={`exp-${m.id}-${idx}`} className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{m.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                          Exp: {formatDate(m.expiryDate)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        Batch: <span className="font-mono">{m.batchNumber}</span> • In Stock: <span className="font-bold">{m.stockQuantity} units</span>
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Medicine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingMedicine ? 'Edit Medicine SKU' : 'Add New Medicine to Catalog'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingMedicine(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Medicine Trade Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxicillin 500mg"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Generic Name (Formula)</label>
                  <input
                    type="text"
                    placeholder="e.g. Amoxicillin Trihydrate"
                    value={formData.genericName}
                    onChange={e => setFormData({ ...formData, genericName: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Dosage Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg, 10ml"
                    value={formData.strength}
                    onChange={e => setFormData({ ...formData, strength: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Barcode / SKU</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Cost Price ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.purchasePrice}
                    onChange={e => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Selling Price ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={e => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Min Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minReorderLevel}
                    onChange={e => setFormData({ ...formData, minReorderLevel: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Rack / Shelf Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Shelf A-01"
                    value={formData.locationRack}
                    onChange={e => setFormData({ ...formData, locationRack: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingMedicine(null);
                  }}
                  className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer shadow-sm"
                >
                  {editingMedicine ? 'Update Medicine' : 'Save to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjust Modal */}
      {adjustingMed && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-xs animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Adjust Stock Count: {adjustingMed.name}
            </h3>
            <p className="text-slate-500">Current Stock: <span className="font-bold text-slate-900 dark:text-white">{adjustingMed.stockQuantity} units</span></p>

            <form onSubmit={handleStockAdjustSubmit} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Adjustment Delta (+ or -)</label>
                <input
                  type="number"
                  required
                  value={adjustDelta}
                  onChange={e => setAdjustDelta(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  placeholder="+10 or -5"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Reason for Adjustment</label>
                <select
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Physical Audit Stock Count">Physical Audit Stock Count</option>
                  <option value="Damaged / Broken Stock">Damaged / Broken Stock</option>
                  <option value="Expired Stock Removal">Expired Stock Removal</option>
                  <option value="Supplier Return">Supplier Return</option>
                  <option value="Correction of Entry Error">Correction of Entry Error</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustingMed(null)}
                  className="px-3 py-1.5 font-bold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
                >
                  Apply Stock Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Medicine Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!medicineToDelete}
        onClose={() => setMedicineToDelete(null)}
        onConfirm={async () => {
          if (!medicineToDelete) return;
          setIsDeletingMed(true);
          try {
            deleteMedicine(medicineToDelete.id);
            setToastMessage(`Medicine "${medicineToDelete.name}" removed from catalog.`);
            setMedicineToDelete(null);
            setTimeout(() => setToastMessage(null), 3500);
          } finally {
            setIsDeletingMed(false);
          }
        }}
        title="Delete Medicine"
        recordName={medicineToDelete ? `${medicineToDelete.name} (${medicineToDelete.genericName || medicineToDelete.batchNumber})` : ''}
        recordType="Medicine"
        consequenceMessage="This will permanently delete this medicine SKU from your active catalog and inventory valuation reports."
        warningNote={
          medicineToDelete && medicineToDelete.stockQuantity > 0
            ? `Warning: This medicine currently has ${medicineToDelete.stockQuantity} units in stock. Deleting it will permanently discard this inventory valuation.`
            : undefined
        }
        confirmButtonText="Delete Medicine"
        isDeleting={isDeletingMed}
      />

      {/* CSV Import Modal */}
      <CsvImportModal<Medicine>
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Medicine Catalog & Inventory"
        entityName="Medicine SKU"
        targetFields={MEDICINE_TARGET_FIELDS}
        sampleTemplateData={SAMPLE_MEDICINE_TEMPLATE}
        templateFilename="medicine-catalog-template.csv"
        existingRecords={medicines}
        validator={validateMedicineRow}
        duplicateFinder={findMedicineDuplicate}
        onConfirmImport={handleConfirmImportMedicines}
      />
    </div>
  );
};
