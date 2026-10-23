import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Purchase, PurchaseItem } from '../types';
import { formatCurrency, formatDate } from '../lib/formatters';
import { SearchInput } from '../components/SearchInput';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { CsvImportModal, CsvTargetField } from '../components/CsvImportModal';
import { generateCSV, downloadCSV } from '../lib/csvHelper';
import {
  Search,
  Plus,
  PackageCheck,
  CheckCircle2,
  Truck,
  X,
  ShoppingBag,
  Trash2,
  Edit2,
  Download,
  Upload,
  Filter,
  Calendar,
  RotateCcw,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  Clock,
  Layers,
  ChevronDown
} from 'lucide-react';

const PURCHASE_TARGET_FIELDS: CsvTargetField[] = [
  { key: 'purchaseOrderNo', label: 'Purchase Reference / PO #', required: true, description: 'Purchase reference (multiple rows with the same reference are grouped into one purchase order)', aliases: ['po number', 'po no', 'reference', 'po', 'order no', 'purchase order', 'po reference'] },
  { key: 'supplierName', label: 'Supplier / Vendor Name', required: true, description: 'Wholesaler or distributor name', aliases: ['supplier name', 'supplier', 'vendor', 'distributor'] },
  { key: 'orderDate', label: 'Order Date (YYYY-MM-DD)', required: false, description: 'Date order was placed (defaults to today)', aliases: ['order date', 'purchase date', 'date', 'po date'] },
  { key: 'medicineName', label: 'Medicine Item Name or Code', required: true, description: 'Medicine brand name, generic name, or barcode SKU', aliases: ['medicine', 'medicine name', 'item', 'drug', 'product name', 'medicine code', 'sku'] },
  { key: 'quantityOrdered', label: 'Quantity Ordered', required: true, description: 'Total units ordered', aliases: ['quantity', 'qty', 'quantity ordered', 'units'] },
  { key: 'unitCost', label: 'Unit Cost', required: true, description: 'Wholesale cost per single unit', aliases: ['unit cost', 'cost', 'unit price', 'price', 'rate'] },
  { key: 'batchNumber', label: 'Batch / Lot Number', required: false, description: 'Manufacturer batch code', aliases: ['batch', 'batch number', 'lot', 'lot number'] },
  { key: 'discount', label: 'Discount Amount', required: false, description: 'Line discount if applicable', aliases: ['discount', 'discount amount'] },
  { key: 'tax', label: 'Tax Amount', required: false, description: 'Tax if applicable', aliases: ['tax', 'vat', 'tax amount'] },
  { key: 'deliveryStatus', label: 'Delivery / Stock Status', required: false, description: 'Pending or Received (defaults to Pending)', aliases: ['delivery status', 'delivery', 'stock status', 'status'] },
  { key: 'paymentStatus', label: 'Payment Status', required: false, description: 'Pending, Partial, or Paid', aliases: ['payment status', 'payment', 'paid status'] },
  { key: 'notes', label: 'Purchase Description / Notes', required: false, description: 'Dedicated purchase description or delivery instructions', aliases: ['notes', 'description', 'purchase description', 'memo', 'remarks'] }
];

const SAMPLE_PURCHASE_TEMPLATE = [
  {
    purchaseOrderNo: 'PO-2025-0811',
    supplierName: 'Ernest Chemists Wholesale Ltd',
    orderDate: '2025-06-15',
    medicineName: 'Amoxicillin 500mg Capsules',
    quantityOrdered: '100',
    unitCost: '12.50',
    batchNumber: 'AMX-2025-B4',
    discount: '0.00',
    tax: '0.00',
    deliveryStatus: 'Received',
    paymentStatus: 'Pending',
    notes: 'Priority clinical antibiotics restock'
  },
  {
    purchaseOrderNo: 'PO-2025-0811', // Groups with PO-2025-0811 above!
    supplierName: 'Ernest Chemists Wholesale Ltd',
    orderDate: '2025-06-15',
    medicineName: 'Ciprofloxacin 500mg Tablets',
    quantityOrdered: '60',
    unitCost: '18.00',
    batchNumber: 'CIP-2025-C1',
    discount: '0.00',
    tax: '0.00',
    deliveryStatus: 'Received',
    paymentStatus: 'Pending',
    notes: 'Priority clinical antibiotics restock'
  },
  {
    purchaseOrderNo: 'PO-2025-0812',
    supplierName: 'Kinapharma Pharmaceuticals',
    orderDate: '2025-06-16',
    medicineName: 'Paracetamol 500mg Tablets',
    quantityOrdered: '250',
    unitCost: '4.20',
    batchNumber: 'PCM-9912-K1',
    discount: '5.00',
    tax: '0.00',
    deliveryStatus: 'Pending',
    paymentStatus: 'Paid',
    notes: 'Routine replenishment shipment'
  }
];

export const Purchases: React.FC = () => {
  const {
    purchases,
    suppliers,
    medicines,
    settings,
    currentUser,
    addPurchaseOrder,
    updatePurchaseOrder,
    receivePurchaseOrder,
    deletePurchaseOrder
  } = usePharmacy();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'this-week' | 'this-month' | 'this-quarter' | 'this-year' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [medicineFilter, setMedicineFilter] = useState('all');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<'all' | 'Pending' | 'Received' | 'Partial'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'Pending' | 'Partial' | 'Paid' | 'Overdue'>('all');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Modals & Action State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingPO, setEditingPO] = useState<Purchase | null>(null);
  const [viewingPO, setViewingPO] = useState<Purchase | null>(null);
  const [poToDelete, setPoToDelete] = useState<Purchase | null>(null);
  const [isDeletingPO, setIsDeletingPO] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Create PO Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Pending'>('Pending');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Edit PO Form State
  const [editSupplierId, setEditSupplierId] = useState('');
  const [editOrderDate, setEditOrderDate] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'Paid' | 'Partial' | 'Pending' | 'Overdue'>('Pending');
  const [editDeliveryStatus, setEditDeliveryStatus] = useState<'Received' | 'Pending' | 'Partial'>('Pending');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<PurchaseItem[]>([]);

  // Permissions check
  const canManagePurchases =
    currentUser.role === 'Super Admin' ||
    currentUser.role === 'Pharmacy Owner' ||
    currentUser.role === 'Administrator' ||
    currentUser.role === 'Store Manager' ||
    currentUser.role === 'Pharmacist';

  // Date Range Helper for Presets
  const getDateRangeForPreset = (preset: string): { start: string; end: string } | null => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (preset === 'this-week') {
      const d = new Date(now);
      const day = d.getDay(); // 0 is Sunday, 1 is Monday
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return { start: monday.toISOString().split('T')[0], end: todayStr };
    }
    if (preset === 'this-month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (preset === 'this-quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), (quarter + 1) * 3, 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (preset === 'this-year') {
      const start = `${now.getFullYear()}-01-01`;
      const end = `${now.getFullYear()}-12-31`;
      return { start, end };
    }
    return null;
  };

  // Filtered Purchases Memo
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      // 1. Text Search query: PO #, Supplier, Medicine name/code/barcode, Delivery, Payment, Notes
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesPO = p.purchaseOrderNo.toLowerCase().includes(q);
        const matchesSupplier = p.supplierName.toLowerCase().includes(q);
        const matchesDelivery = p.deliveryStatus.toLowerCase().includes(q);
        const matchesPayment = p.paymentStatus.toLowerCase().includes(q);
        const matchesNotes = p.notes ? p.notes.toLowerCase().includes(q) : false;
        const matchesItems =
          p.items &&
          p.items.some(i => {
            if (i.name.toLowerCase().includes(q)) return true;
            if (i.batchNumber && i.batchNumber.toLowerCase().includes(q)) return true;
            const relatedMed = medicines.find(m => m.id === i.medicineId);
            if (relatedMed) {
              if (relatedMed.barcode && relatedMed.barcode.toLowerCase().includes(q)) return true;
              if (relatedMed.genericName && relatedMed.genericName.toLowerCase().includes(q)) return true;
            }
            return false;
          });

        if (!matchesPO && !matchesSupplier && !matchesDelivery && !matchesPayment && !matchesNotes && !matchesItems) {
          return false;
        }
      }

      // 2. Date Filtering
      if (datePreset !== 'all') {
        const pDate = p.orderDate ? p.orderDate.split('T')[0] : '';
        if (datePreset === 'custom') {
          if (startDate && pDate < startDate) return false;
          if (endDate && pDate > endDate) return false;
        } else {
          const range = getDateRangeForPreset(datePreset);
          if (range) {
            if (pDate < range.start || pDate > range.end) return false;
          }
        }
      }

      // 3. Supplier Filter
      if (supplierFilter !== 'all') {
        if (p.supplierId !== supplierFilter && p.supplierName !== supplierFilter) {
          return false;
        }
      }

      // 4. Medicine Filter
      if (medicineFilter !== 'all') {
        const hasMed =
          p.items &&
          p.items.some(
            i => i.medicineId === medicineFilter || i.name.toLowerCase() === medicineFilter.toLowerCase()
          );
        if (!hasMed) return false;
      }

      // 5. Delivery Status Filter
      if (deliveryStatusFilter !== 'all') {
        if (p.deliveryStatus !== deliveryStatusFilter) return false;
      }

      // 6. Payment Status Filter
      if (paymentStatusFilter !== 'all') {
        if (p.paymentStatus !== paymentStatusFilter) return false;
      }

      return true;
    });
  }, [
    purchases,
    searchQuery,
    datePreset,
    startDate,
    endDate,
    supplierFilter,
    medicineFilter,
    deliveryStatusFilter,
    paymentStatusFilter,
    medicines
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    datePreset !== 'all' ||
    startDate !== '' ||
    endDate !== '' ||
    supplierFilter !== 'all' ||
    medicineFilter !== 'all' ||
    deliveryStatusFilter !== 'all' ||
    paymentStatusFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSupplierFilter('all');
    setMedicineFilter('all');
    setDeliveryStatusFilter('all');
    setPaymentStatusFilter('all');
  };

  // Add Item to Create PO Form
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

  const handleRemoveItem = (index: number) => {
    if (poItems.length <= 1) return;
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const totalPOAmount = poItems.reduce((acc, curr) => acc + curr.totalCost, 0);

  const handleSavePO = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find(s => s.id === selectedSupplierId);
    if (!sup) {
      alert('Please select a valid supplier.');
      return;
    }

    addPurchaseOrder({
      supplierId: sup.id,
      supplierName: sup.name,
      items: poItems,
      totalAmount: totalPOAmount,
      paymentStatus,
      orderDate: orderDate || new Date().toISOString().split('T')[0],
      notes
    });

    setShowAddModal(false);
    setToastMessage(`Purchase Order created successfully for ${sup.name}.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Edit PO Handlers
  const handleOpenEditPO = (po: Purchase) => {
    setEditingPO(po);
    setEditSupplierId(po.supplierId);
    setEditOrderDate(po.orderDate ? po.orderDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditPaymentStatus(po.paymentStatus || 'Pending');
    setEditDeliveryStatus(po.deliveryStatus || 'Pending');
    setEditNotes(po.notes || '');
    setEditItems(po.items ? po.items.map(item => ({ ...item })) : []);
  };

  const handleEditMedChange = (index: number, medId: string) => {
    const med = medicines.find(m => m.id === medId);
    if (!med) return;
    const updated = [...editItems];
    updated[index].medicineId = med.id;
    updated[index].name = med.name;
    updated[index].unitCost = med.purchasePrice;
    updated[index].totalCost = med.purchasePrice * updated[index].quantityOrdered;
    setEditItems(updated);
  };

  const handleEditQtyChange = (index: number, qty: number) => {
    const updated = [...editItems];
    updated[index].quantityOrdered = qty;
    updated[index].totalCost = updated[index].unitCost * qty;
    setEditItems(updated);
  };

  const handleEditCostChange = (index: number, cost: number) => {
    const updated = [...editItems];
    updated[index].unitCost = cost;
    updated[index].totalCost = cost * updated[index].quantityOrdered;
    setEditItems(updated);
  };

  const handleEditBatchChange = (index: number, batch: string) => {
    const updated = [...editItems];
    updated[index].batchNumber = batch;
    setEditItems(updated);
  };

  const handleEditAddItem = () => {
    const defaultMed = medicines[0];
    setEditItems([
      ...editItems,
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

  const handleEditRemoveItem = (index: number) => {
    if (editItems.length <= 1) return;
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const totalEditAmount = editItems.reduce((acc, curr) => acc + curr.totalCost, 0);

  const handleSaveEditedPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPO) return;

    const sup = suppliers.find(s => s.id === editSupplierId) || {
      name: editingPO.supplierName,
      id: editingPO.supplierId
    };

    const res = updatePurchaseOrder(editingPO.id, {
      supplierId: sup.id,
      supplierName: sup.name,
      orderDate: editOrderDate,
      paymentStatus: editPaymentStatus,
      deliveryStatus: editDeliveryStatus,
      notes: editNotes,
      items: editItems,
      totalAmount: totalEditAmount
    });

    if (!res.success) {
      alert(res.error || 'Failed to update purchase order.');
      return;
    }

    setEditingPO(null);
    setToastMessage(`Purchase Order ${editingPO.purchaseOrderNo} updated and reconciled successfully.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const dataToExport = filteredPurchases.length > 0 ? filteredPurchases : purchases;
    if (dataToExport.length === 0) {
      alert('No purchase order records to export.');
      return;
    }

    const columns = [
      { key: 'purchaseOrderNo', label: 'Purchase Order #' },
      { key: 'supplierName', label: 'Supplier Name' },
      { key: 'orderDate', label: 'Order Date' },
      { key: 'deliveryStatus', label: 'Delivery Status' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'totalAmount', label: `Total Amount (${settings.currencySymbol})` },
      { key: 'itemCount', label: 'Line Items Count' },
      { key: 'medicinesList', label: 'Ordered Medicines & Quantities' },
      { key: 'receivedDate', label: 'Received Date' },
      { key: 'notes', label: 'Notes' }
    ];

    const formattedData = dataToExport.map(p => ({
      purchaseOrderNo: p.purchaseOrderNo,
      supplierName: p.supplierName,
      orderDate: p.orderDate || '',
      deliveryStatus: p.deliveryStatus,
      paymentStatus: p.paymentStatus,
      totalAmount: p.totalAmount,
      itemCount: p.items ? p.items.length : 0,
      medicinesList: p.items ? p.items.map(i => `${i.name} (Qty: ${i.quantityOrdered}, Cost: ${i.unitCost})`).join('; ') : '',
      receivedDate: p.receivedDate || '',
      notes: p.notes || ''
    }));

    const csvContent = generateCSV(columns, formattedData);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `purchase-orders-${hasActiveFilters ? 'filtered-' : 'all-'}${dateStr}.csv`;
    downloadCSV(filename, csvContent);
    setToastMessage(`Exported ${dataToExport.length} purchase orders to CSV.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // CSV Import Validation & Execution
  const validatePurchaseRow = (row: Record<string, string>): { isValid: boolean; error?: string } => {
    if (!row.supplierName || !row.supplierName.trim()) {
      return { isValid: false, error: 'Supplier Name is required.' };
    }
    if (!row.medicineName || !row.medicineName.trim()) {
      return { isValid: false, error: 'Medicine Item Name is required.' };
    }
    if (!row.quantityOrdered || isNaN(Number(row.quantityOrdered)) || Number(row.quantityOrdered) <= 0) {
      return { isValid: false, error: `Quantity Ordered must be a positive number. Got "${row.quantityOrdered}".` };
    }
    if (!row.unitCost || isNaN(Number(row.unitCost)) || Number(row.unitCost) < 0) {
      return { isValid: false, error: `Unit Cost must be a valid positive number. Got "${row.unitCost}".` };
    }
    if (row.deliveryStatus && row.deliveryStatus.trim()) {
      const s = row.deliveryStatus.trim().toLowerCase();
      if (s !== 'pending' && s !== 'received' && s !== 'partial') {
        return { isValid: false, error: `Invalid delivery status: "${row.deliveryStatus}". Expected Pending or Received.` };
      }
    }
    if (row.paymentStatus && row.paymentStatus.trim()) {
      const p = row.paymentStatus.trim().toLowerCase();
      if (p !== 'pending' && p !== 'paid' && p !== 'partial' && p !== 'overdue') {
        return { isValid: false, error: `Invalid payment status: "${row.paymentStatus}". Expected Pending, Partial, or Paid.` };
      }
    }
    return { isValid: true };
  };

  const findPurchaseDuplicate = (
    row: Record<string, string>,
    existing: Purchase[]
  ): { isDuplicate: boolean; matchDescription?: string; existingRecord?: Purchase } => {
    const rawPO = row.purchaseOrderNo ? row.purchaseOrderNo.trim().toLowerCase() : '';
    if (!rawPO) return { isDuplicate: false };
    const matched = existing.find(p => p.purchaseOrderNo.toLowerCase() === rawPO);
    if (matched) {
      return {
        isDuplicate: true,
        matchDescription: `Purchase Order # "${matched.purchaseOrderNo}" already exists for ${matched.supplierName}`,
        existingRecord: matched
      };
    }
    return { isDuplicate: false };
  };

  const handleConfirmImportPurchases = async (
    recordsToImport: Record<string, string>[],
    recordsToUpdate: Record<string, string>[],
    duplicateAction: 'skip' | 'update'
  ): Promise<{ importedCount: number; updatedCount: number; skippedCount: number }> => {
    let imported = 0;
    let updated = 0;

    // Group new records by purchase reference so multiple rows belong to ONE purchase order header
    const groupedNewOrders = new Map<string, Record<string, string>[]>();
    recordsToImport.forEach((row, index) => {
      const ref = row.purchaseOrderNo?.trim() || `PO-IMPORT-${Date.now()}-${index}`;
      const list = groupedNewOrders.get(ref) || [];
      list.push(row);
      groupedNewOrders.set(ref, list);
    });

    for (const [poRef, rows] of groupedNewOrders.entries()) {
      const firstRow = rows[0];
      const matchedSup = suppliers.find(
        s => s.name.toLowerCase() === firstRow.supplierName.trim().toLowerCase()
      );

      const items: PurchaseItem[] = rows.map(r => {
        const qty = parseInt(r.quantityOrdered) || 1;
        const cost = parseFloat(r.unitCost) || 10;
        const discount = parseFloat(r.discount) || 0;
        const tax = parseFloat(r.tax) || 0;
        const matchedMed = medicines.find(
          m => m.name.toLowerCase() === r.medicineName.trim().toLowerCase() ||
               m.barcode.toLowerCase() === r.medicineName.trim().toLowerCase()
        );
        const lineTotal = Math.max(0, (qty * cost) - discount + tax);

        return {
          medicineId: matchedMed?.id || 'med-import-' + Math.floor(Math.random() * 9000),
          name: r.medicineName.trim(),
          batchNumber: r.batchNumber ? r.batchNumber.trim() : 'BATCH-' + Math.floor(Math.random() * 90000 + 10000),
          expiryDate: new Date(Date.now() + 365 * 86400000 * 2).toISOString().split('T')[0],
          quantityOrdered: qty,
          quantityReceived: r.deliveryStatus?.toLowerCase() === 'received' ? qty : 0,
          unitCost: cost,
          totalCost: lineTotal
        };
      });

      const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);
      const pStatus = (firstRow.paymentStatus && ['Paid', 'Partial', 'Pending', 'Overdue'].includes(firstRow.paymentStatus))
        ? (firstRow.paymentStatus as 'Paid' | 'Partial' | 'Pending')
        : 'Pending';

      const allNotes = Array.from(new Set(rows.map(r => r.notes?.trim()).filter(Boolean))).join('; ');

      addPurchaseOrder({
        supplierId: matchedSup?.id || 'sup-import-' + Math.floor(Math.random() * 9000),
        supplierName: firstRow.supplierName.trim(),
        items,
        totalAmount,
        paymentStatus: pStatus,
        orderDate: firstRow.orderDate || new Date().toISOString().split('T')[0],
        notes: allNotes || undefined
      });
      imported++;
    }

    // Process duplicate updates by grouping multiple rows sharing the same PO reference
    if (duplicateAction === 'update') {
      const groupedUpdates = new Map<string, Record<string, string>[]>();
      recordsToUpdate.forEach(row => {
        const ref = row.purchaseOrderNo?.trim() || '';
        if (ref) {
          const list = groupedUpdates.get(ref) || [];
          list.push(row);
          groupedUpdates.set(ref, list);
        }
      });

      for (const [poRef, rows] of groupedUpdates.entries()) {
        const dup = findPurchaseDuplicate(rows[0], purchases);
        if (dup.existingRecord) {
          const newItemsToAdd: PurchaseItem[] = rows.map(r => {
            const qty = parseInt(r.quantityOrdered) || 1;
            const cost = parseFloat(r.unitCost) || 10;
            const discount = parseFloat(r.discount) || 0;
            const tax = parseFloat(r.tax) || 0;
            const matchedMed = medicines.find(
              m => m.name.toLowerCase() === r.medicineName.trim().toLowerCase() ||
                   m.barcode.toLowerCase() === r.medicineName.trim().toLowerCase()
            );
            const lineTotal = Math.max(0, (qty * cost) - discount + tax);

            return {
              medicineId: matchedMed?.id || 'med-import-' + Math.floor(Math.random() * 9000),
              name: r.medicineName.trim(),
              batchNumber: r.batchNumber ? r.batchNumber.trim() : 'BATCH-' + Math.floor(Math.random() * 90000 + 10000),
              expiryDate: new Date(Date.now() + 365 * 86400000 * 2).toISOString().split('T')[0],
              quantityOrdered: qty,
              quantityReceived: r.deliveryStatus?.toLowerCase() === 'received' ? qty : 0,
              unitCost: cost,
              totalCost: lineTotal
            };
          });

          const updatedItems = [...dup.existingRecord.items, ...newItemsToAdd];
          const newTotal = updatedItems.reduce((acc, curr) => acc + curr.totalCost, 0);
          const newNotes = rows.map(r => r.notes?.trim()).filter(Boolean).join('; ');

          updatePurchaseOrder(dup.existingRecord.id, {
            items: updatedItems,
            totalAmount: newTotal,
            notes: newNotes ? `${dup.existingRecord.notes || ''} | ${newNotes}` : dup.existingRecord.notes
          });
          updated++;
        }
      }
    }

    setToastMessage(`Purchase orders import: ${imported} order headers created (${recordsToImport.length} line items), ${updated} updated.`);
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

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Purchases & Stock-In</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create, search, filter and edit supplier purchase orders & update inventory stock levels
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canManagePurchases && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm cursor-pointer"
              title="Import purchase orders from CSV file"
            >
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Import CSV</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm cursor-pointer"
            title="Export purchase orders matching current search and filters"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Export CSV {filteredPurchases.length > 0 && `(${filteredPurchases.length})`}</span>
          </button>

          {canManagePurchases && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* Advanced Custom Search & Filtering Engine */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="flex-1">
            <SearchInput
              placeholder="Search PO #, supplier name, medicine name, barcode, notes, or status..."
              value={searchQuery}
              onChange={setSearchQuery}
              matchCount={filteredPurchases.length}
              totalCount={purchases.length}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer ${
              hasActiveFilters || showFiltersPanel
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Engine</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFiltersPanel ? 'rotate-180' : ''}`} />
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
              title="Clear all search keywords and filter criteria"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Collapsible Custom Filter Bar */}
        {showFiltersPanel && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* Date Range Preset */}
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Date Range</span>
              </label>
              <select
                value={datePreset}
                onChange={e => setDatePreset(e.target.value as any)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
                <option value="this-quarter">This Quarter</option>
                <option value="this-year">This Year</option>
                <option value="custom">Custom Date Range...</option>
              </select>
            </div>

            {/* Supplier Filter */}
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Truck className="w-3 h-3 text-slate-400" />
                <span>Supplier</span>
              </label>
              <select
                value={supplierFilter}
                onChange={e => setSupplierFilter(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Suppliers</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Medicine Filter */}
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-slate-400" />
                <span>Medicine Item</span>
              </label>
              <select
                value={medicineFilter}
                onChange={e => setMedicineFilter(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Medicines</option>
                {medicines.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Delivery Status Filter */}
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <PackageCheck className="w-3 h-3 text-slate-400" />
                <span>Delivery Status</span>
              </label>
              <select
                value={deliveryStatusFilter}
                onChange={e => setDeliveryStatusFilter(e.target.value as any)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending Delivery</option>
                <option value="Received">Stock Received</option>
                <option value="Partial">Partial Delivery</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Payment Status</span>
              </label>
              <select
                value={paymentStatusFilter}
                onChange={e => setPaymentStatusFilter(e.target.value as any)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Payments</option>
                <option value="Pending">Pending (Unpaid)</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Fully Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            {/* Custom Date Inputs if 'custom' is selected */}
            {datePreset === 'custom' && (
              <div className="col-span-full pt-2 flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">Specific Range:</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Purchase Orders Table */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 rounded-l-xl">PO Reference</th>
                <th className="p-3">Supplier Name</th>
                <th className="p-3">Items / Medicines</th>
                <th className="p-3">Order Date</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Stock Status</th>
                <th className="p-3 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">No purchase orders recorded yet</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                          Click &quot;+ Create Purchase Order&quot; or &quot;Import CSV&quot; to log incoming wholesale shipments.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">No matching purchase records found</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                          No orders matched your search criteria or filter combinations. Reset your filters to view all records.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p, idx) => {
                  const itemCount = p.items ? p.items.length : 0;
                  const itemSummary = p.items && p.items.length > 0
                    ? `${p.items[0].name}${p.items.length > 1 ? ` + ${p.items.length - 1} more` : ''}`
                    : 'No items';

                  return (
                    <tr key={`po-row-${p.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">
                          {p.purchaseOrderNo}
                        </span>
                        {p.notes && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[150px] block" title={p.notes}>
                            {p.notes}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{p.supplierName}</td>
                      <td className="p-3">
                        <span className="font-medium text-slate-700 dark:text-slate-300 block">{itemSummary}</span>
                        <span className="text-[10px] text-slate-400">({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                      </td>
                      <td className="p-3 text-slate-500">{formatDate(p.orderDate)}</td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.totalAmount, settings.currencySymbol)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : p.paymentStatus === 'Partial'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
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
                          {p.deliveryStatus === 'Pending' && canManagePurchases && (
                            <button
                              onClick={() => receivePurchaseOrder(p.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                              title="Receive Stock and update medicine inventory levels"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>Receive</span>
                            </button>
                          )}

                          {canManagePurchases && (
                            <button
                              onClick={() => handleOpenEditPO(p)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                              title="Edit Purchase Order details, quantities, and line items"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canManagePurchases && (
                            <button
                              onClick={() => setPoToDelete(p)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                              title="Delete Purchase Order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Create Purchase Order</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePO} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Select Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Order Date</label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={e => setOrderDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Pending">Pending (Unpaid)</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Fully Paid</option>
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white">Ordered Medicine Items</span>
                  <button type="button" onClick={handleAddItem} className="text-emerald-600 font-bold hover:underline cursor-pointer">
                    + Add Item Row
                  </button>
                </div>

                {poItems.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <label className="block text-[10px] text-slate-400">Medicine</label>
                      <select
                        value={item.medicineId}
                        onChange={e => handleMedChange(idx, e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-900 dark:text-white"
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
                        className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400">Cost/Unit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitCost}
                        readOnly
                        className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <label className="block text-[10px] text-slate-400">Line Subtotal</label>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.totalCost, settings.currencySymbol)}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      {poItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Remove item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="font-semibold block mb-1">Purchase Order Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional delivery instructions, batch notes, or PO reference..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800 text-sm font-extrabold">
                <span>Total Purchase Order Amount:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalPOAmount, settings.currencySymbol)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer shadow-sm"
                >
                  Save Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit PO Modal */}
      {editingPO && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Edit Purchase Order: {editingPO.purchaseOrderNo}
                </h3>
                <p className="text-[11px] text-slate-400">Update supplier, delivery status, line item quantities or costs</p>
              </div>
              <button onClick={() => setEditingPO(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedPO} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold block mb-1">Supplier</label>
                  <select
                    value={editSupplierId}
                    onChange={e => setEditSupplierId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Order Date</label>
                  <input
                    type="date"
                    value={editOrderDate}
                    onChange={e => setEditOrderDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Payment Status</label>
                  <select
                    value={editPaymentStatus}
                    onChange={e => setEditPaymentStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Pending">Pending (Unpaid)</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Fully Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Delivery Status</label>
                <select
                  value={editDeliveryStatus}
                  onChange={e => setEditDeliveryStatus(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Pending">Pending Delivery</option>
                  <option value="Received">Received & Stocked In</option>
                  <option value="Partial">Partial Delivery</option>
                </select>
              </div>

              {/* Editable Items List */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white">Line Items</span>
                  <button
                    type="button"
                    onClick={handleEditAddItem}
                    className="text-emerald-600 font-bold hover:underline cursor-pointer"
                  >
                    + Add Item Row
                  </button>
                </div>

                {editItems.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <label className="block text-[10px] text-slate-400">Medicine</label>
                      <select
                        value={item.medicineId}
                        onChange={e => handleEditMedChange(idx, e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-900 dark:text-white"
                      >
                        {medicines.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400">Batch #</label>
                      <input
                        type="text"
                        value={item.batchNumber || ''}
                        onChange={e => handleEditBatchChange(idx, e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantityOrdered}
                        onChange={e => handleEditQtyChange(idx, parseInt(e.target.value) || 1)}
                        className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400">Unit Cost</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitCost}
                        onChange={e => handleEditCostChange(idx, parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <label className="block text-[10px] text-slate-400">Subtotal</label>
                      <span className="font-bold text-slate-900 dark:text-white text-[11px]">
                        {formatCurrency(item.totalCost, settings.currencySymbol)}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      {editItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleEditRemoveItem(idx)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Remove item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="font-semibold block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800 text-sm font-extrabold">
                <span>Updated PO Total:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalEditAmount, settings.currencySymbol)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPO(null)}
                  className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer shadow-sm"
                >
                  Save Changes
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
        recordName={
          poToDelete
            ? `${poToDelete.purchaseOrderNo} • ${poToDelete.supplierName} (${formatCurrency(poToDelete.totalAmount, settings.currencySymbol)})`
            : ''
        }
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

      {/* CSV Import Modal */}
      <CsvImportModal<Purchase>
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Purchase Orders & Shipments"
        entityName="Purchase Order"
        targetFields={PURCHASE_TARGET_FIELDS}
        sampleTemplateData={SAMPLE_PURCHASE_TEMPLATE}
        templateFilename="purchase-orders-template.csv"
        existingRecords={purchases}
        validator={validatePurchaseRow}
        duplicateFinder={findPurchaseDuplicate}
        onConfirmImport={handleConfirmImportPurchases}
      />
    </div>
  );
};
