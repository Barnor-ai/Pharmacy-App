import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Sale, SaleItem } from '../types';
import { formatCurrency, formatDateTime, formatDate } from '../lib/formatters';
import { generateInvoicePDF } from '../lib/pdf/generateInvoicePDF';
import { generateCSV, downloadCSV } from '../lib/csvHelper';
import {
  Search,
  ReceiptText,
  Download,
  RotateCcw,
  Eye,
  X,
  Printer,
  FileDown,
  CheckCircle2,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Calendar,
  Filter,
  BarChart3,
  CreditCard,
  User,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  ChevronDown,
  Clock,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { SearchInput } from '../components/SearchInput';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export const SalesHistory: React.FC = () => {
  const { sales, medicines, settings, currentUser, refundSale } = usePharmacy();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
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
  >('this-month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [cashierFilter, setCashierFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Completed' | 'Refunded' | 'Cancelled'>('all');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Analytics Trends Controls
  const [showTrendsSection, setShowTrendsSection] = useState(true);
  const [chartGrouping, setChartGrouping] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'transactions'>('revenue');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleToRefund, setSaleToRefund] = useState<Sale | null>(null);
  const [isRefundingSale, setIsRefundingSale] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper: Calculate 10-Preset Date Ranges
  const getDateRangeForPreset = (preset: string): { start: string; end: string } | null => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (preset === 'yesterday') {
      const y = new Date(now.getTime() - 86400000);
      const yStr = y.toISOString().split('T')[0];
      return { start: yStr, end: yStr };
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

  // Derive Current Active Date Range
  const activeDateRange = useMemo(() => {
    if (datePreset === 'custom') {
      return { start: startDate, end: endDate };
    }
    if (datePreset !== 'all') {
      return getDateRangeForPreset(datePreset);
    }
    return null;
  }, [datePreset, startDate, endDate]);

  // Derive Equivalent Previous Comparison Period
  const comparisonDateRange = useMemo(() => {
    if (!activeDateRange || !activeDateRange.start || !activeDateRange.end) return null;
    const s = new Date(activeDateRange.start);
    const e = new Date(activeDateRange.end);
    const diffMs = e.getTime() - s.getTime() + 86400000;
    const compEnd = new Date(s.getTime() - 86400000);
    const compStart = new Date(compEnd.getTime() - diffMs + 86400000);
    return {
      start: compStart.toISOString().split('T')[0],
      end: compEnd.toISOString().split('T')[0]
    };
  }, [activeDateRange]);

  // Unique Filter Options
  const uniqueCustomers = useMemo(() => {
    const list = Array.from(new Set(sales.map(s => s.customerName).filter(Boolean)));
    return list.sort();
  }, [sales]);

  const uniqueCashiers = useMemo(() => {
    const list = Array.from(new Set(sales.map(s => s.cashierName).filter(Boolean)));
    return list.sort();
  }, [sales]);

  // Filtered Sales Memo
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // 1. Text Search query: Invoice #, Customer, Cashier, Payment method, Medicine name/code
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesInvoice = s.invoiceNo.toLowerCase().includes(q);
        const matchesCustomer = s.customerName.toLowerCase().includes(q);
        const matchesCashier = s.cashierName.toLowerCase().includes(q);
        const matchesPayment = s.paymentMethod.toLowerCase().includes(q);
        const matchesStatus = s.status.toLowerCase().includes(q);
        const matchesItems =
          s.items &&
          s.items.some(
            i =>
              i.name.toLowerCase().includes(q) ||
              (i.genericName && i.genericName.toLowerCase().includes(q)) ||
              (i.barcode && i.barcode.toLowerCase().includes(q))
          );

        if (!matchesInvoice && !matchesCustomer && !matchesCashier && !matchesPayment && !matchesStatus && !matchesItems) {
          return false;
        }
      }

      // 2. Date Filtering (Inclusive of day boundary)
      if (activeDateRange && activeDateRange.start && activeDateRange.end) {
        const saleDate = s.createdAt ? s.createdAt.substring(0, 10) : '';
        if (saleDate < activeDateRange.start || saleDate > activeDateRange.end) {
          return false;
        }
      }

      // 3. Customer Filter
      if (customerFilter !== 'all' && s.customerName !== customerFilter) {
        return false;
      }

      // 4. Cashier Filter
      if (cashierFilter !== 'all' && s.cashierName !== cashierFilter) {
        return false;
      }

      // 5. Payment Method Filter
      if (paymentMethodFilter !== 'all' && s.paymentMethod !== paymentMethodFilter) {
        return false;
      }

      // 6. Sale Status Filter
      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [
    sales,
    searchQuery,
    activeDateRange,
    customerFilter,
    cashierFilter,
    paymentMethodFilter,
    statusFilter
  ]);

  // Reset pagination on filter change
  useMemo(() => {
    setCurrentPage(1);
  }, [filteredSales.length, pageSize]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    datePreset !== 'all' ||
    customerFilter !== 'all' ||
    cashierFilter !== 'all' ||
    paymentMethodFilter !== 'all' ||
    statusFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setCustomerFilter('all');
    setCashierFilter('all');
    setPaymentMethodFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // Financial Metrics Calculations (Accurate & Reconciled)
  const financialMetrics = useMemo(() => {
    // Current period eligible sales (excluding Cancelled)
    const eligibleSales = filteredSales.filter(s => s.status !== 'Cancelled');
    const completedSales = eligibleSales.filter(s => s.status === 'Completed');
    const refundedSales = eligibleSales.filter(s => s.status === 'Refunded');

    const grossSales = eligibleSales.reduce((sum, s) => sum + (s.subtotal || s.grandTotal), 0);
    const totalDiscounts = eligibleSales.reduce((sum, s) => sum + (s.discountAmount || 0), 0);
    const totalTaxes = eligibleSales.reduce((sum, s) => sum + (s.taxAmount || 0), 0);
    const refundTotal = refundedSales.reduce((sum, s) => sum + s.grandTotal, 0);

    // True Net Sales = Completed sales revenue (or total grandTotal minus refunds)
    const netSales = Math.max(0, completedSales.reduce((sum, s) => sum + s.grandTotal, 0));
    const eligibleTransactionCount = completedSales.length;
    const averageTransactionValue = eligibleTransactionCount > 0 ? netSales / eligibleTransactionCount : 0;

    // COGS & Gross Profit based on medicine purchase prices
    let totalCOGS = 0;
    completedSales.forEach(s => {
      s.items.forEach(item => {
        const med = medicines.find(m => m.id === item.medicineId || m.name.toLowerCase() === item.name.toLowerCase());
        const cost = med?.purchasePrice || (item.unitPrice * 0.6); // Reliable cost or standard margin
        totalCOGS += cost * item.quantity;
      });
    });
    const grossProfit = Math.max(0, netSales - totalCOGS);
    const profitMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

    // Comparison Period Calculation
    let compNetSales = 0;
    let compTransactions = 0;
    if (comparisonDateRange) {
      const compSales = sales.filter(s => {
        if (s.status === 'Cancelled') return false;
        const d = s.createdAt ? s.createdAt.substring(0, 10) : '';
        return d >= comparisonDateRange.start && d <= comparisonDateRange.end;
      });
      const compCompleted = compSales.filter(s => s.status === 'Completed');
      compNetSales = compCompleted.reduce((sum, s) => sum + s.grandTotal, 0);
      compTransactions = compCompleted.length;
    }

    const revenueGrowthPercent = compNetSales > 0 ? ((netSales - compNetSales) / compNetSales) * 100 : 0;
    const transactionGrowthPercent = compTransactions > 0 ? ((eligibleTransactionCount - compTransactions) / compTransactions) * 100 : 0;

    return {
      grossSales,
      totalDiscounts,
      totalTaxes,
      refundTotal,
      refundCount: refundedSales.length,
      netSales,
      eligibleTransactionCount,
      averageTransactionValue,
      totalCOGS,
      grossProfit,
      profitMargin,
      compNetSales,
      compTransactions,
      revenueGrowthPercent,
      transactionGrowthPercent
    };
  }, [filteredSales, medicines, sales, comparisonDateRange]);

  // Grouped Chart Data for Sales Trends
  const trendChartData = useMemo(() => {
    const validSales = filteredSales.filter(s => s.status === 'Completed');
    const groups = new Map<string, { label: string; revenue: number; transactions: number }>();

    validSales.forEach(s => {
      const d = new Date(s.createdAt);
      if (isNaN(d.getTime())) return;

      let key = '';
      let label = '';

      if (chartGrouping === 'daily') {
        key = s.createdAt.substring(0, 10);
        label = formatDate(key);
      } else if (chartGrouping === 'weekly') {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        key = monday.toISOString().substring(0, 10);
        label = `Wk ${key}`;
      } else if (chartGrouping === 'monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      } else {
        key = `${d.getFullYear()}`;
        label = `${d.getFullYear()}`;
      }

      const existing = groups.get(key) || { label, revenue: 0, transactions: 0 };
      existing.revenue += s.grandTotal;
      existing.transactions += 1;
      groups.set(key, existing);
    });

    const sortedKeys = Array.from(groups.keys()).sort();
    return sortedKeys.map(k => groups.get(k)!);
  }, [filteredSales, chartGrouping]);

  // Top-Selling Medicines Leaderboard
  const topSellingMedicines = useMemo(() => {
    const validSales = filteredSales.filter(s => s.status === 'Completed');
    const medMap = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();

    validSales.forEach(s => {
      s.items.forEach(item => {
        const key = item.name.trim();
        const med = medicines.find(m => m.id === item.medicineId || m.name.toLowerCase() === key.toLowerCase());
        const cost = med?.purchasePrice || (item.unitPrice * 0.6);
        const itemProfit = item.total - (cost * item.quantity);

        const current = medMap.get(key) || { name: key, quantity: 0, revenue: 0, profit: 0 };
        current.quantity += item.quantity;
        current.revenue += item.total;
        current.profit += itemProfit;
        medMap.set(key, current);
      });
    });

    const list = Array.from(medMap.values());
    list.sort((a, b) => b.quantity - a.quantity);
    return list.slice(0, 5);
  }, [filteredSales, medicines]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredSales.length / pageSize) || 1;
  const paginatedSales = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredSales.slice(startIdx, startIdx + pageSize);
  }, [filteredSales, currentPage, pageSize]);

  // PDF Download Handler
  const handleDownloadInvoicePDF = (s: Sale) => {
    generateInvoicePDF({
      invoiceNumber: s.invoiceNo,
      date: s.createdAt,
      customerName: s.customerName,
      customerPhone: s.customerPhone,
      cashierName: s.cashierName,
      paymentMethod: s.paymentMethod,
      items: s.items.map((i: SaleItem) => ({
        name: i.name,
        generic_name: i.genericName,
        barcode: i.barcode,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        subtotal: i.total
      })),
      subtotal: s.subtotal,
      discountAmount: s.discountAmount,
      taxAmount: s.taxAmount,
      grandTotal: s.grandTotal,
      amountPaid: s.amountPaid,
      changeGiven: s.changeGiven,
      pharmacyName: settings.pharmacyName,
      pharmacyAddress: settings.address,
      pharmacyPhone: settings.phone,
      licenseNumber: settings.licenseNumber,
      prescriptionNo: s.prescriptionNo,
      currencySymbol: settings.currencySymbol
    });
  };

  // CSV Export: Filtered Sales Records
  const handleExportFilteredSalesCSV = () => {
    const dataToExport = filteredSales.length > 0 ? filteredSales : sales;
    if (dataToExport.length === 0) {
      alert('No sales transactions to export.');
      return;
    }

    const columns = [
      { key: 'invoiceNo', label: 'Invoice No' },
      { key: 'createdAt', label: 'Transaction Date & Time' },
      { key: 'customerName', label: 'Customer / Patient Name' },
      { key: 'customerPhone', label: 'Contact Phone' },
      { key: 'cashierName', label: 'Cashier / Sales User' },
      { key: 'itemsCount', label: 'Items Count' },
      { key: 'itemsSummary', label: 'Medicines Sold & Quantities' },
      { key: 'subtotal', label: `Subtotal (${settings.currencySymbol})` },
      { key: 'discountAmount', label: `Discount (${settings.currencySymbol})` },
      { key: 'taxAmount', label: `Tax / VAT (${settings.currencySymbol})` },
      { key: 'grandTotal', label: `Grand Total (${settings.currencySymbol})` },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'status', label: 'Sale Status' }
    ];

    const formattedData = dataToExport.map(s => ({
      invoiceNo: s.invoiceNo,
      createdAt: s.createdAt,
      customerName: s.customerName,
      customerPhone: s.customerPhone || '',
      cashierName: s.cashierName,
      itemsCount: s.items ? s.items.length : 0,
      itemsSummary: s.items ? s.items.map(i => `${i.name} (Qty: ${i.quantity}, Price: ${i.unitPrice})`).join('; ') : '',
      subtotal: s.subtotal,
      discountAmount: s.discountAmount,
      taxAmount: s.taxAmount,
      grandTotal: s.grandTotal,
      paymentMethod: s.paymentMethod,
      status: s.status
    }));

    const csvContent = generateCSV(columns, formattedData);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `sales-invoices-${hasActiveFilters ? 'filtered-' : 'all-'}${dateStr}.csv`;
    downloadCSV(filename, csvContent);
    setToastMessage(`Exported ${dataToExport.length} sales records to CSV.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // CSV Export: Financial Summary Report
  const handleExportSummaryCSV = () => {
    const columns = [
      { key: 'metric', label: 'Sales & Financial KPI' },
      { key: 'value', label: 'Calculated Value' },
      { key: 'notes', label: 'Methodology & Accounting Notes' }
    ];

    const summaryData = [
      { metric: 'Reporting Period', value: datePreset, notes: activeDateRange ? `${activeDateRange.start} to ${activeDateRange.end}` : 'All time records' },
      { metric: 'Comparison Period', value: comparisonDateRange ? `${comparisonDateRange.start} to ${comparisonDateRange.end}` : 'N/A', notes: 'Prior equivalent period for growth benchmark' },
      { metric: 'Gross Sales', value: `${settings.currencySymbol}${financialMetrics.grossSales.toFixed(2)}`, notes: 'Total sales value before deductions' },
      { metric: 'Discounts Granted', value: `${settings.currencySymbol}${financialMetrics.totalDiscounts.toFixed(2)}`, notes: 'Promotional and customer line discounts' },
      { metric: 'Tax / VAT Collected', value: `${settings.currencySymbol}${financialMetrics.totalTaxes.toFixed(2)}`, notes: 'Statutory pharmaceutical tax liability' },
      { metric: 'Refunds & Returns', value: `${settings.currencySymbol}${financialMetrics.refundTotal.toFixed(2)}`, notes: `${financialMetrics.refundCount} refunded transactions returned to stock` },
      { metric: 'Net Revenue', value: `${settings.currencySymbol}${financialMetrics.netSales.toFixed(2)}`, notes: 'Recognized revenue from completed sales' },
      { metric: 'COGS (Acquisition Cost)', value: `${settings.currencySymbol}${financialMetrics.totalCOGS.toFixed(2)}`, notes: 'Wholesale acquisition cost of dispensed items' },
      { metric: 'Gross Profit', value: `${settings.currencySymbol}${financialMetrics.grossProfit.toFixed(2)}`, notes: 'Net sales minus cost of goods sold' },
      { metric: 'Gross Margin %', value: `${financialMetrics.profitMargin.toFixed(1)}%`, notes: 'Profit share of net dispensary revenue' },
      { metric: 'Completed Transactions', value: financialMetrics.eligibleTransactionCount.toString(), notes: 'Eligible non-cancelled customer invoices' },
      { metric: 'Average Transaction Value', value: `${settings.currencySymbol}${financialMetrics.averageTransactionValue.toFixed(2)}`, notes: 'Net sales divided by completed transactions' },
      { metric: 'Period Revenue Growth', value: `${financialMetrics.revenueGrowthPercent.toFixed(1)}%`, notes: 'Comparison against prior period revenue' }
    ];

    const csvContent = generateCSV(columns, summaryData);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCSV(`sales-summary-report-${dateStr}.csv`, csvContent);
    setToastMessage('Exported Sales Financial Summary Report.');
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

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ReceiptText className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>Sales & Invoice History</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Interactive sales analytics, customer receipts, and reconciled revenue trends
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowTrendsSection(!showTrendsSection)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition shadow-sm cursor-pointer ${
              showTrendsSection
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{showTrendsSection ? 'Hide Analytics' : 'Show Analytics'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportSummaryCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm cursor-pointer"
            title="Download executive financial summary CSV report"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Summary</span>
          </button>

          <button
            type="button"
            onClick={handleExportFilteredSalesCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm cursor-pointer"
            title="Export filtered sales transactions list to CSV"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Export Sales CSV ({filteredSales.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Net Sales */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Sales Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(financialMetrics.netSales, settings.currencySymbol)}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Gross: {formatCurrency(financialMetrics.grossSales, settings.currencySymbol)}</span>
            {comparisonDateRange && (
              <span
                className={`font-bold flex items-center ${
                  financialMetrics.revenueGrowthPercent >= 0 ? 'text-emerald-600' : 'text-rose-500'
                }`}
              >
                {financialMetrics.revenueGrowthPercent >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {Math.abs(financialMetrics.revenueGrowthPercent).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Transactions & ATV */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed Transactions</span>
            <ReceiptText className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white">
            {financialMetrics.eligibleTransactionCount}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              Avg Ticket (ATV): <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(financialMetrics.averageTransactionValue, settings.currencySymbol)}</strong>
            </span>
            {comparisonDateRange && (
              <span
                className={`font-bold flex items-center ${
                  financialMetrics.transactionGrowthPercent >= 0 ? 'text-emerald-600' : 'text-rose-500'
                }`}
              >
                {financialMetrics.transactionGrowthPercent >= 0 ? '+' : ''}
                {financialMetrics.transactionGrowthPercent.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Gross Profit & COGS */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dispensary Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {formatCurrency(financialMetrics.grossProfit, settings.currencySymbol)}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Margin: <strong className="text-slate-800 dark:text-slate-200">{financialMetrics.profitMargin.toFixed(1)}%</strong></span>
            <span className="text-slate-400">COGS: {formatCurrency(financialMetrics.totalCOGS, settings.currencySymbol)}</span>
          </div>
        </div>

        {/* Refunds & Returns */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Refunds & Returns</span>
            <RotateCcw className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
            {formatCurrency(financialMetrics.refundTotal, settings.currencySymbol)}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">{financialMetrics.refundCount} invoice(s) refunded</span>
            <span className="text-slate-400">Discounts: {formatCurrency(financialMetrics.totalDiscounts, settings.currencySymbol)}</span>
          </div>
        </div>
      </div>

      {/* SALES TRENDS & INTERACTIVE ANALYTICS SECTION */}
      {showTrendsSection && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Chart */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>Sales Revenue & Volume Trend</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {activeDateRange ? `${formatDate(activeDateRange.start)} – ${formatDate(activeDateRange.end)}` : 'Full records history'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Granularity Selector */}
                <div className="p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex text-xs font-bold">
                  {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setChartGrouping(g)}
                      className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                        chartGrouping === g
                          ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                {/* Metric Selector */}
                <div className="p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setChartMetric('revenue')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      chartMetric === 'revenue'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Revenue
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric('transactions')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      chartMetric === 'transactions'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Volume
                  </button>
                </div>
              </div>
            </div>

            {/* Recharts Component */}
            <div className="h-64 w-full">
              {trendChartData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-1">
                  <BarChart3 className="w-8 h-8 text-slate-300" />
                  <p className="text-xs">No completed sales records for the selected period.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {chartMetric === 'revenue' ? (
                    <AreaChart data={trendChartData}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={val => `${val}`} />
                      <Tooltip
                        formatter={(val: any) => [`${formatCurrency(Number(val) || 0, settings.currencySymbol)}`, 'Revenue']}
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                    </AreaChart>
                  ) : (
                    <BarChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        formatter={(val: any) => [`${val} transactions`, 'Volume']}
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                      />
                      <Bar dataKey="transactions" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top-Selling Medicines Leaderboard */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
              <span>Top-Selling Medicines</span>
              <span className="text-[10px] text-slate-400 font-normal">Ranked by volume</span>
            </h3>

            {topSellingMedicines.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">No sales items logged in period.</p>
            ) : (
              <div className="space-y-2.5">
                {topSellingMedicines.map((med, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{med.name}</p>
                        <p className="text-[10px] text-slate-400">{med.quantity} units sold</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(med.revenue, settings.currencySymbol)}
                      </p>
                      <p className="text-[10px] text-indigo-500 font-semibold">
                        +{formatCurrency(med.profit, settings.currencySymbol)} profit
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADVANCED MULTI-FILTER ENGINE & CUSTOM PERIOD ENGINE */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="flex-1">
            <SearchInput
              placeholder="Search by invoice #, customer name, medicine name/code, cashier, or status..."
              value={searchQuery}
              onChange={setSearchQuery}
              matchCount={filteredSales.length}
              totalCount={sales.length}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer ${
              hasActiveFilters || showFiltersPanel
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Criteria</span>
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
              title="Clear all search terms and filter criteria"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Collapsible Filter Panel */}
        {showFiltersPanel && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* 10-Preset Date Range Filter */}
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Date Period (10 Presets)</span>
              </label>
              <select
                value={datePreset}
                onChange={e => setDatePreset(e.target.value as any)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
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
            </div>

            {/* Customer Filter */}
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                <span>Customer / Patient</span>
              </label>
              <select
                value={customerFilter}
                onChange={e => setCustomerFilter(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Customers</option>
                {uniqueCustomers.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Cashier Filter */}
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                <span>Cashier / Sales User</span>
              </label>
              <select
                value={cashierFilter}
                onChange={e => setCashierFilter(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Cashiers</option>
                {uniqueCashiers.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-slate-400" />
                <span>Payment Method</span>
              </label>
              <select
                value={paymentMethodFilter}
                onChange={e => setPaymentMethodFilter(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Payment Methods</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Mobile Payment">Mobile Payment</option>
                <option value="Insurance">Insurance</option>
              </select>
            </div>

            {/* Sale Status Filter */}
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-slate-400" />
                <span>Sale Status</span>
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Refunded">Refunded</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Custom Date Inputs if 'custom' is active */}
            {datePreset === 'custom' && (
              <div className="col-span-full pt-2 flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">Custom Date Range:</span>
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

      {/* SALES INVOICES TABLE WITH PAGINATION */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 rounded-l-xl">Invoice No</th>
                <th className="p-3">Customer / Patient</th>
                <th className="p-3">Purchased Items</th>
                <th className="p-3">Grand Total</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Cashier</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">No sales recorded yet</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                          Completed point-of-sale customer receipts and prescriptions will appear here.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">No matching sales transactions found</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                          No invoices match your search query &quot;{searchQuery}&quot; or filter combinations. Check spelling or reset criteria.
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
                paginatedSales.map((s, idx) => (
                  <tr key={`sale-row-${s.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{s.invoiceNo}</td>
                    <td className="p-3">
                      <span className="font-medium text-slate-900 dark:text-white block">{s.customerName}</span>
                      {s.customerPhone && <span className="text-[10px] text-slate-400">{s.customerPhone}</span>}
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-slate-700 dark:text-slate-300 block">
                        {s.items.length > 0 ? s.items[0].name : 'No items'}
                        {s.items.length > 1 && ` + ${s.items.length - 1} more`}
                      </span>
                      <span className="text-[10px] text-slate-400">({s.items.length} item{s.items.length !== 1 ? 's' : ''})</span>
                    </td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(s.grandTotal, settings.currencySymbol)}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{s.cashierName}</td>
                    <td className="p-3 text-slate-500">{formatDateTime(s.createdAt)}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : s.status === 'Refunded'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownloadInvoicePDF(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          title="Download PDF Invoice"
                        >
                          <FileDown className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => setSelectedSale(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {s.status === 'Completed' && (
                          <button
                            onClick={() => setSaleToRefund(s)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Issue Refund & Restock Items"
                          >
                            <RotateCcw className="w-4 h-4" />
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

        {/* Pagination Bar */}
        {filteredSales.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredSales.length)} of {filteredSales.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Invoice: {selectedSale.invoiceNo}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  selectedSale.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedSale.status}
                </span>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                <p>Customer: <span className="font-semibold text-slate-900 dark:text-white">{selectedSale.customerName}</span></p>
                <p>Cashier: <span className="font-semibold text-slate-900 dark:text-white">{selectedSale.cashierName}</span></p>
                <p>Payment Method: <span className="font-semibold text-slate-900 dark:text-white">{selectedSale.paymentMethod}</span></p>
                <p>Date: <span className="font-semibold text-slate-900 dark:text-white">{formatDateTime(selectedSale.createdAt)}</span></p>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-bold mb-2">Purchased Items:</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedSale.items.map((item, i) => (
                    <div key={i} className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-[10px] text-slate-500">{item.quantity} x {formatCurrency(item.unitPrice, settings.currencySymbol)}</p>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(item.total, settings.currencySymbol)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1 font-semibold text-right">
                <p>Subtotal: {formatCurrency(selectedSale.subtotal, settings.currencySymbol)}</p>
                {selectedSale.discountAmount > 0 && (
                  <p className="text-rose-500">Discount: -{formatCurrency(selectedSale.discountAmount, settings.currencySymbol)}</p>
                )}
                <p>Tax: {formatCurrency(selectedSale.taxAmount, settings.currencySymbol)}</p>
                <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  Grand Total: {formatCurrency(selectedSale.grandTotal, settings.currencySymbol)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => handleDownloadInvoicePDF(selectedSale)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
              >
                <FileDown className="w-4 h-4" /> Download PDF Invoice
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Sale Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!saleToRefund}
        onClose={() => setSaleToRefund(null)}
        onConfirm={async () => {
          if (!saleToRefund) return;
          setIsRefundingSale(true);
          try {
            refundSale(saleToRefund.id);
            setToastMessage(`Invoice ${saleToRefund.invoiceNo} refunded and items restocked into inventory.`);
            setSaleToRefund(null);
            setTimeout(() => setToastMessage(null), 3500);
          } finally {
            setIsRefundingSale(false);
          }
        }}
        title="Issue Refund & Restock Items"
        recordName={
          saleToRefund
            ? `${saleToRefund.invoiceNo} • ${saleToRefund.customerName} (${formatCurrency(saleToRefund.grandTotal, settings.currencySymbol)})`
            : ''
        }
        recordType="Sale Invoice"
        consequenceMessage="This will mark this invoice as Refunded and automatically return all purchased medicine quantities back to active inventory stock."
        confirmButtonText="Confirm Refund & Restock"
        isDeleting={isRefundingSale}
      />
    </div>
  );
};
