import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import { FinancialsSubTab, Expense, Sale, Purchase } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  FileText,
  Calendar,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Download,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Building,
  ChevronDown,
  X,
  Wallet,
  Coins,
  FileSpreadsheet
} from 'lucide-react';

export const FinancialsPage: React.FC = () => {
  const {
    sales,
    purchases,
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    recordPurchasePayment,
    suppliers,
    medicines,
    settings,
    currentUser,
    financialsSubTab,
    setFinancialsSubTab
  } = usePharmacy();

  // Date Filter State for Financials
  type DateRangePreset = 'today' | 'this-week' | 'this-month' | 'prev-month' | 'this-quarter' | 'this-year' | 'prev-year' | 'custom';
  const [datePreset, setDatePreset] = useState<DateRangePreset>('this-month');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Common Date Filter Computation
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (datePreset === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { startDate: start, endDate: end };
    }

    if (datePreset === 'this-week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { startDate: monday, endDate: sunday };
    }

    if (datePreset === 'this-month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { startDate: start, endDate: end };
    }

    if (datePreset === 'prev-month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { startDate: start, endDate: end };
    }

    if (datePreset === 'this-quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
      return { startDate: start, endDate: end };
    }

    if (datePreset === 'this-year') {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      return { startDate: start, endDate: end };
    }

    if (datePreset === 'prev-year') {
      const start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
      const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      return { startDate: start, endDate: end };
    }

    // Custom
    const start = customStartDate ? new Date(`${customStartDate}T00:00:00`) : new Date(0);
    const end = customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date();
    return { startDate: start, endDate: end };
  }, [datePreset, customStartDate, customEndDate]);

  // Helper date checker
  const isDateInRange = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d >= startDate && d <= endDate;
    } catch {
      return false;
    }
  };

  // Filtered sales in range
  const rangeSales = useMemo(() => {
    return sales.filter(s => isDateInRange(s.createdAt));
  }, [sales, startDate, endDate]);

  // Filtered expenses in range
  const rangeExpenses = useMemo(() => {
    return expenses.filter(e => isDateInRange(e.date));
  }, [expenses, startDate, endDate]);

  // -------------------------------------------------------------
  // SECTION 5A: INCOME / SALES CALCULATIONS
  // -------------------------------------------------------------
  const salesMetrics = useMemo(() => {
    let totalSales = 0;
    let totalDiscounts = 0;
    let totalRefunds = 0;
    let cashSales = 0;
    let mobileMoneySales = 0;
    let cardSales = 0;
    let bankTransferSales = 0;
    let otherSales = 0;

    rangeSales.forEach(s => {
      if (s.status === 'Refunded') {
        totalRefunds += s.grandTotal;
      } else {
        totalSales += s.grandTotal;
        totalDiscounts += s.discountAmount || 0;

        const pm = (s.paymentMethod || '').toLowerCase();
        if (pm.includes('cash')) {
          cashSales += s.grandTotal;
        } else if (pm.includes('mobile') || pm.includes('momo')) {
          mobileMoneySales += s.grandTotal;
        } else if (pm.includes('card') || pm.includes('visa') || pm.includes('mastercard')) {
          cardSales += s.grandTotal;
        } else if (pm.includes('bank') || pm.includes('transfer')) {
          bankTransferSales += s.grandTotal;
        } else {
          otherSales += s.grandTotal;
        }
      }
    });

    const netSales = Math.max(0, totalSales - totalRefunds);

    return {
      totalSales,
      transactionCount: rangeSales.length,
      cashSales,
      mobileMoneySales,
      cardSales,
      bankTransferSales,
      otherSales,
      totalDiscounts,
      totalRefunds,
      netSales
    };
  }, [rangeSales]);

  // State for Income / Sales search & modal
  const [salesSearch, setSalesSearch] = useState('');
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);

  const filteredUnderlyingSales = useMemo(() => {
    return rangeSales.filter(s => {
      const q = salesSearch.toLowerCase();
      return (
        s.invoiceNo.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.cashierName && s.cashierName.toLowerCase().includes(q)) ||
        s.paymentMethod.toLowerCase().includes(q)
      );
    });
  }, [rangeSales, salesSearch]);

  // -------------------------------------------------------------
  // SECTION 5B: EXPENSES STATE & ACTIONS
  // -------------------------------------------------------------
  const DEFAULT_EXPENSE_CATEGORIES = [
    'Rent',
    'Salaries & Wages',
    'Electricity',
    'Water',
    'Internet',
    'Telephone',
    'Transportation',
    'Fuel',
    'Repairs & Maintenance',
    'Marketing',
    'Bank Charges',
    'POS Charges',
    'Licences & Registration',
    'Insurance',
    'Office Supplies',
    'Cleaning',
    'Professional Fees',
    'Other Expenses'
  ];

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pharma_custom_expense_cats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allExpenseCategories = useMemo(() => {
    return Array.from(new Set([...DEFAULT_EXPENSE_CATEGORIES, ...customCategories]));
  }, [customCategories]);

  // Expense modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [selectedExpenseCategoryFilter, setSelectedExpenseCategoryFilter] = useState('ALL');

  // Expense form fields
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expCategory, setExpCategory] = useState('Rent');
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPaymentMethod, setExpPaymentMethod] = useState('Cash');
  const [expPayee, setExpPayee] = useState('');
  const [expRefNumber, setExpRefNumber] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [newCustomCategoryInput, setNewCustomCategoryInput] = useState('');
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState<string | null>(null);

  const resetExpenseForm = () => {
    setExpDate(new Date().toISOString().split('T')[0]);
    setExpCategory('Rent');
    setExpDescription('');
    setExpAmount('');
    setExpPaymentMethod('Cash');
    setExpPayee('');
    setExpRefNumber('');
    setExpNotes('');
    setEditingExpense(null);
    setShowNewCatInput(false);
    setNewCustomCategoryInput('');
  };

  const handleOpenAddExpense = () => {
    resetExpenseForm();
    setShowExpenseModal(true);
  };

  const handleOpenEditExpense = (e: Expense) => {
    setEditingExpense(e);
    setExpDate(e.date);
    setExpCategory(e.category);
    setExpDescription(e.description);
    setExpAmount(String(e.amount));
    setExpPaymentMethod(e.paymentMethod || 'Cash');
    setExpPayee(e.payee || '');
    setExpRefNumber(e.referenceNumber || '');
    setExpNotes(e.notes || '');
    setShowExpenseModal(true);
  };

  const handleAddCustomCategory = () => {
    if (newCustomCategoryInput.trim()) {
      const cat = newCustomCategoryInput.trim();
      const updated = Array.from(new Set([...customCategories, cat]));
      setCustomCategories(updated);
      localStorage.setItem('pharma_custom_expense_cats', JSON.stringify(updated));
      setExpCategory(cat);
      setNewCustomCategoryInput('');
      setShowNewCatInput(false);
    }
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(expAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        date: expDate,
        category: expCategory,
        description: expDescription.trim(),
        amount: amountVal,
        paymentMethod: expPaymentMethod,
        payee: expPayee.trim() || undefined,
        referenceNumber: expRefNumber.trim() || undefined,
        notes: expNotes.trim() || undefined
      });
      setExpenseSuccessMsg('Expense record updated successfully.');
    } else {
      addExpense({
        date: expDate,
        category: expCategory,
        description: expDescription.trim(),
        amount: amountVal,
        paymentMethod: expPaymentMethod,
        recordedBy: currentUser.name,
        payee: expPayee.trim() || undefined,
        referenceNumber: expRefNumber.trim() || undefined,
        notes: expNotes.trim() || undefined
      });
      setExpenseSuccessMsg('Expense recorded successfully.');
    }

    setShowExpenseModal(false);
    resetExpenseForm();
    setTimeout(() => setExpenseSuccessMsg(null), 3500);
  };

  const filteredExpensesList = useMemo(() => {
    return rangeExpenses.filter(e => {
      const matchesCat =
        selectedExpenseCategoryFilter === 'ALL' || e.category === selectedExpenseCategoryFilter;
      const q = expenseSearch.toLowerCase();
      const matchesSearch =
        e.description.toLowerCase().includes(q) ||
        (e.payee && e.payee.toLowerCase().includes(q)) ||
        (e.referenceNumber && e.referenceNumber.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [rangeExpenses, selectedExpenseCategoryFilter, expenseSearch]);

  const totalExpenseAmount = useMemo(() => {
    return filteredExpensesList.reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [filteredExpensesList]);

  // -------------------------------------------------------------
  // SECTION 5C: PAYABLES (SUPPLIER INVOICES)
  // -------------------------------------------------------------
  const [payablesFilterStatus, setPayablesFilterStatus] = useState<string>('ALL');
  const [payablesSearch, setPayablesSearch] = useState('');
  const [selectedPayable, setSelectedPayable] = useState<Purchase | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState('Bank Transfer');
  const [paymentNotesInput, setPaymentNotesInput] = useState('');
  const [payableSuccessMsg, setPayableSuccessMsg] = useState<string | null>(null);

  interface PayableRecord {
    purchase: Purchase;
    supplierName: string;
    invoiceNo: string;
    purchaseDate: string;
    dueDate: string;
    invoiceAmount: number;
    amountPaid: number;
    outstandingBalance: number;
    paymentStatus: 'Paid' | 'Partially Paid' | 'Unpaid' | 'Overdue';
  }

  const payablesList: PayableRecord[] = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    return purchases.map(p => {
      const invoiceAmount = p.totalAmount || 0;
      const amountPaid = p.amountPaid || 0;
      const outstandingBalance = Math.max(0, invoiceAmount - amountPaid);

      // Determine due date (use provided dueDate or calculate 30 days from orderDate)
      let calculatedDueDate = p.dueDate;
      if (!calculatedDueDate && p.orderDate) {
        try {
          const od = new Date(p.orderDate);
          od.setDate(od.getDate() + 30);
          calculatedDueDate = od.toISOString().split('T')[0];
        } catch {
          calculatedDueDate = today;
        }
      }

      let status: 'Paid' | 'Partially Paid' | 'Unpaid' | 'Overdue' = 'Unpaid';
      if (outstandingBalance <= 0) {
        status = 'Paid';
      } else if (calculatedDueDate && calculatedDueDate < today) {
        status = 'Overdue';
      } else if (amountPaid > 0) {
        status = 'Partially Paid';
      } else {
        status = 'Unpaid';
      }

      return {
        purchase: p,
        supplierName: p.supplierName,
        invoiceNo: p.purchaseOrderNo,
        purchaseDate: p.orderDate,
        dueDate: calculatedDueDate || 'N/A',
        invoiceAmount,
        amountPaid,
        outstandingBalance,
        paymentStatus: status
      };
    });
  }, [purchases]);

  const filteredPayables = useMemo(() => {
    return payablesList.filter(item => {
      const matchesStatus =
        payablesFilterStatus === 'ALL' || item.paymentStatus === payablesFilterStatus;
      const q = payablesSearch.toLowerCase();
      const matchesSearch =
        item.supplierName.toLowerCase().includes(q) ||
        item.invoiceNo.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [payablesList, payablesFilterStatus, payablesSearch]);

  const payablesSummary = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let overdueAmount = 0;

    payablesList.forEach(p => {
      totalInvoiced += p.invoiceAmount;
      totalPaid += p.amountPaid;
      totalOutstanding += p.outstandingBalance;
      if (p.paymentStatus === 'Overdue') {
        overdueAmount += p.outstandingBalance;
      }
    });

    return { totalInvoiced, totalPaid, totalOutstanding, overdueAmount };
  }, [payablesList]);

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayable) return;
    const pAmt = parseFloat(paymentAmountInput);
    if (isNaN(pAmt) || pAmt <= 0) return;

    recordPurchasePayment(selectedPayable.id, pAmt, paymentMethodInput, paymentNotesInput);
    setPayableSuccessMsg(`Recorded payment of ${settings.currencySymbol}${pAmt.toFixed(2)} for ${selectedPayable.purchaseOrderNo}`);
    setSelectedPayable(null);
    setPaymentAmountInput('');
    setPaymentNotesInput('');
    setTimeout(() => setPayableSuccessMsg(null), 4000);
  };

  // -------------------------------------------------------------
  // SECTION 5D: PROFIT & LOSS CALCULATIONS
  // -------------------------------------------------------------
  const pnlData = useMemo(() => {
    // 1. Sales Revenue (excluding refunded)
    let salesRevenue = 0;
    let cogsTotal = 0;

    // Build lookup for medicine purchase price (Cost Price)
    const costMap = new Map<string, number>();
    medicines.forEach(m => {
      costMap.set(m.id, m.purchasePrice || 0);
      costMap.set(m.name.toLowerCase(), m.purchasePrice || 0);
    });

    rangeSales.forEach(s => {
      if (s.status !== 'Refunded') {
        salesRevenue += s.grandTotal;

        // Calculate COGS for this sale
        if (s.items && Array.isArray(s.items)) {
          s.items.forEach(item => {
            const costPrice =
              costMap.get(item.medicineId) ??
              costMap.get(item.name.toLowerCase()) ??
              item.unitPrice * 0.65; // realistic fallback if med cost unavailable
            cogsTotal += item.quantity * costPrice;
          });
        }
      }
    });

    // 2. Gross Profit = Sales Revenue - COGS
    const grossProfit = salesRevenue - cogsTotal;
    const grossMargin = salesRevenue > 0 ? (grossProfit / salesRevenue) * 100 : 0;

    // 3. Operating Expenses in selected period
    const operatingExpenses = rangeExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // 4. Net Profit = Gross Profit - Operating Expenses
    const netProfit = grossProfit - operatingExpenses;
    const netMargin = salesRevenue > 0 ? (netProfit / salesRevenue) * 100 : 0;

    return {
      salesRevenue,
      cogsTotal,
      grossProfit,
      grossMargin,
      operatingExpenses,
      netProfit,
      netMargin
    };
  }, [rangeSales, rangeExpenses, medicines]);

  // -------------------------------------------------------------
  // SECTION 5E: FINANCIAL REPORTS EXPORT & PRINT
  // -------------------------------------------------------------
  const [selectedReportType, setSelectedReportType] = useState<
    'sales' | 'revenue' | 'expenses' | 'payables' | 'gross-profit' | 'pnl' | 'cogs' | 'payment-methods'
  >('pnl');

  const exportReportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    const timestamp = new Date().toISOString().split('T')[0];

    if (selectedReportType === 'pnl' || selectedReportType === 'gross-profit') {
      csvContent += 'Financial Profit & Loss Statement\r\n';
      csvContent += `Generated On,${timestamp}\r\n`;
      csvContent += `Period,${datePreset}\r\n\r\n`;
      csvContent += 'Line Item,Amount\r\n';
      csvContent += `Sales Revenue,${pnlData.salesRevenue.toFixed(2)}\r\n`;
      csvContent += `Cost of Goods Sold (COGS),(${pnlData.cogsTotal.toFixed(2)})\r\n`;
      csvContent += `Gross Profit,${pnlData.grossProfit.toFixed(2)}\r\n`;
      csvContent += `Gross Margin,${pnlData.grossMargin.toFixed(2)}%\r\n`;
      csvContent += `Operating Expenses,(${pnlData.operatingExpenses.toFixed(2)})\r\n`;
      csvContent += `Net Profit,${pnlData.netProfit.toFixed(2)}\r\n`;
      csvContent += `Net Margin,${pnlData.netMargin.toFixed(2)}%\r\n`;
    } else if (selectedReportType === 'expenses') {
      csvContent += 'Expenses Statement\r\n';
      csvContent += 'Date,Category,Description,Payee,Reference,Payment Method,Amount\r\n';
      filteredExpensesList.forEach(e => {
        csvContent += `"${e.date}","${e.category}","${e.description}","${e.payee || ''}","${e.referenceNumber || ''}","${e.paymentMethod}","${e.amount}"\r\n`;
      });
      csvContent += `,,,,,TOTAL,${totalExpenseAmount.toFixed(2)}\r\n`;
    } else if (selectedReportType === 'payables') {
      csvContent += 'Supplier Payables Statement\r\n';
      csvContent += 'Supplier,Invoice Number,Order Date,Due Date,Status,Invoice Amount,Amount Paid,Outstanding Balance\r\n';
      filteredPayables.forEach(p => {
        csvContent += `"${p.supplierName}","${p.invoiceNo}","${p.purchaseDate}","${p.dueDate}","${p.paymentStatus}","${p.invoiceAmount}","${p.amountPaid}","${p.outstandingBalance}"\r\n`;
      });
      csvContent += `,,,,,TOTAL,${payablesSummary.totalPaid.toFixed(2)},${payablesSummary.totalOutstanding.toFixed(2)}\r\n`;
    } else {
      csvContent += 'Sales & Revenue Statement\r\n';
      csvContent += 'Invoice No,Date,Customer,Payment Method,Status,Subtotal,Discount,Tax,Grand Total\r\n';
      rangeSales.forEach(s => {
        csvContent += `"${s.invoiceNo}","${s.createdAt}","${s.customerName || 'Walk-in'}","${s.paymentMethod}","${s.status}","${s.subtotal}","${s.discountAmount}","${s.taxAmount}","${s.grandTotal}"\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedReportType}_report_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportReportToPDF = () => {
    const doc = new jsPDF();
    const timestamp = new Date().toISOString().split('T')[0];

    // Header
    doc.setFontSize(16);
    doc.text(settings.pharmacyName || 'Pharmacy Financial Report', 14, 20);
    doc.setFontSize(11);
    doc.text(`Report: ${selectedReportType.toUpperCase().replace('-', ' ')}`, 14, 28);
    doc.setFontSize(9);
    doc.text(`Generated on: ${timestamp} | Currency: ${settings.currencySymbol}`, 14, 34);

    if (selectedReportType === 'pnl' || selectedReportType === 'gross-profit') {
      autoTable(doc, {
        startY: 42,
        head: [['Financial Metric', 'Calculation', 'Amount']],
        body: [
          ['Sales Revenue', 'Gross completed receipts', `${settings.currencySymbol}${pnlData.salesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
          ['Cost of Goods Sold (COGS)', 'LESS purchase cost of medicines sold', `(${settings.currencySymbol}${pnlData.cogsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })})`],
          ['Gross Profit', 'Sales Revenue LESS COGS', `${settings.currencySymbol}${pnlData.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
          ['Gross Profit Margin', 'Gross Profit / Sales Revenue', `${pnlData.grossMargin.toFixed(1)}%`],
          ['Operating Expenses', 'LESS recorded pharmacy operational costs', `(${settings.currencySymbol}${pnlData.operatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })})`],
          ['Net Profit', 'Gross Profit LESS Operating Expenses', `${settings.currencySymbol}${pnlData.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
          ['Net Profit Margin', 'Net Profit / Sales Revenue', `${pnlData.netMargin.toFixed(1)}%`]
        ]
      });
    } else if (selectedReportType === 'expenses') {
      const rows = filteredExpensesList.map(e => [
        e.date,
        e.category,
        e.description,
        e.payee || '-',
        e.paymentMethod,
        `${settings.currencySymbol}${e.amount.toFixed(2)}`
      ]);
      autoTable(doc, {
        startY: 42,
        head: [['Date', 'Category', 'Description', 'Payee', 'Method', 'Amount']],
        body: rows
      });
    } else if (selectedReportType === 'payables') {
      const rows = filteredPayables.map(p => [
        p.supplierName,
        p.invoiceNo,
        p.dueDate,
        p.paymentStatus,
        `${settings.currencySymbol}${p.invoiceAmount.toFixed(2)}`,
        `${settings.currencySymbol}${p.amountPaid.toFixed(2)}`,
        `${settings.currencySymbol}${p.outstandingBalance.toFixed(2)}`
      ]);
      autoTable(doc, {
        startY: 42,
        head: [['Supplier', 'Invoice #', 'Due Date', 'Status', 'Invoiced', 'Paid', 'Outstanding']],
        body: rows
      });
    } else {
      const rows = rangeSales.slice(0, 50).map(s => [
        s.invoiceNo,
        formatDate(s.createdAt),
        s.customerName || 'Walk-in',
        s.paymentMethod,
        s.status,
        `${settings.currencySymbol}${s.grandTotal.toFixed(2)}`
      ]);
      autoTable(doc, {
        startY: 42,
        head: [['Invoice #', 'Date', 'Customer', 'Method', 'Status', 'Total']],
        body: rows
      });
    }

    doc.save(`${selectedReportType}_report_${timestamp}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Subtab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-600" />
            Financials & Accounting
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor money in, money out, profitability & supplier payables seamlessly
          </p>
        </div>

        {/* Global Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value as DateRangePreset)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-none pr-2 cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="prev-month">Previous Month</option>
              <option value="this-quarter">This Quarter</option>
              <option value="this-year">This Year</option>
              <option value="prev-year">Previous Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium"
              />
            </div>
          )}
        </div>
      </div>

      {/* 5 Dropdown / Sub-navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
        <button
          onClick={() => setFinancialsSubTab('income-sales')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            financialsSubTab === 'income-sales'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>1. Income / Sales</span>
        </button>

        <button
          onClick={() => setFinancialsSubTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            financialsSubTab === 'expenses'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>2. Expenses</span>
        </button>

        <button
          onClick={() => setFinancialsSubTab('payables')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            financialsSubTab === 'payables'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>3. Payables</span>
        </button>

        <button
          onClick={() => setFinancialsSubTab('profit-loss')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            financialsSubTab === 'profit-loss'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>4. Profit & Loss</span>
        </button>

        <button
          onClick={() => setFinancialsSubTab('financial-reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            financialsSubTab === 'financial-reports'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>5. Financial Reports</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 5A. INCOME / SALES SECTION */}
      {/* ========================================================================= */}
      {financialsSubTab === 'income-sales' && (
        <div className="space-y-6">
          {/* KPI Dashboard Figures */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Total Sales Revenue
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {formatCurrency(salesMetrics.totalSales, settings.currencySymbol)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {salesMetrics.transactionCount} Total Transactions
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Net Sales
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(salesMetrics.netSales, settings.currencySymbol)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Total Sales minus Refunds & Deductions
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Discounts Granted
              </span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {formatCurrency(salesMetrics.totalDiscounts, settings.currencySymbol)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Applied during POS checkout
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Refunds & Reversals
              </span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {formatCurrency(salesMetrics.totalRefunds, settings.currencySymbol)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Returned items and cancelled sales
              </p>
            </div>
          </div>

          {/* Payment Method Breakdown Cards */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Sales by Payment Method
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Cash Sales</span>
                <p className="text-base font-black text-slate-900 dark:text-white mt-1">
                  {formatCurrency(salesMetrics.cashSales, settings.currencySymbol)}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Mobile Money</span>
                <p className="text-base font-black text-slate-900 dark:text-white mt-1">
                  {formatCurrency(salesMetrics.mobileMoneySales, settings.currencySymbol)}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Card Sales</span>
                <p className="text-base font-black text-slate-900 dark:text-white mt-1">
                  {formatCurrency(salesMetrics.cardSales, settings.currencySymbol)}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Bank Transfer</span>
                <p className="text-base font-black text-slate-900 dark:text-white mt-1">
                  {formatCurrency(salesMetrics.bankTransferSales, settings.currencySymbol)}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Other Methods</span>
                <p className="text-base font-black text-slate-900 dark:text-white mt-1">
                  {formatCurrency(salesMetrics.otherSales, settings.currencySymbol)}
                </p>
              </div>
            </div>
          </div>

          {/* Underlying Sales Transactions Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Underlying Sales Transactions
                </h3>
                <p className="text-xs text-slate-500">
                  Live feed directly synced from Point of Sale (POS) checkouts
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search invoice, customer, cashier..."
                  value={salesSearch}
                  onChange={e => setSalesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Invoice No</th>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3">Grand Total</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredUnderlyingSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No sales transactions found in this period.
                      </td>
                    </tr>
                  ) : (
                    filteredUnderlyingSales.map((s, idx) => (
                      <tr key={`fin-sale-${s.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                          {s.invoiceNo}
                        </td>
                        <td className="p-3">{formatDate(s.createdAt)}</td>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          {s.customerName || 'Walk-in Customer'}
                        </td>
                        <td className="p-3 font-semibold text-slate-600 dark:text-slate-300">
                          {s.paymentMethod}
                        </td>
                        <td className="p-3">{s.items?.length || 0} items</td>
                        <td className="p-3 text-amber-600">
                          {s.discountAmount ? formatCurrency(s.discountAmount, settings.currencySymbol) : '-'}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {formatCurrency(s.grandTotal, settings.currencySymbol)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setViewingSale(s)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                            title="View Transaction Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
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

      {/* ========================================================================= */}
      {/* 5B. EXPENSES SECTION */}
      {/* ========================================================================= */}
      {financialsSubTab === 'expenses' && (
        <div className="space-y-6">
          {expenseSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-between text-xs font-bold shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{expenseSuccessMsg}</span>
              </div>
              <button onClick={() => setExpenseSuccessMsg(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Pharmacy Operating Expenses
              </h2>
              <p className="text-xs text-slate-500">
                Track overhead, rent, salaries, utilities, marketing and custom expense categories
              </p>
            </div>

            <button
              onClick={handleOpenAddExpense}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Record Expense
            </button>
          </div>

          {/* Filters & Search Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search description, payee, ref #..."
                  value={expenseSearch}
                  onChange={e => setExpenseSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={selectedExpenseCategoryFilter}
                onChange={e => setSelectedExpenseCategoryFilter(e.target.value)}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="ALL">All Categories</option>
                {allExpenseCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                Total in Period:{' '}
                <strong className="text-slate-900 dark:text-white font-extrabold text-sm ml-1">
                  {formatCurrency(totalExpenseAmount, settings.currencySymbol)}
                </strong>
              </span>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Payee</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Ref #</th>
                    <th className="p-3">Recorded By</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredExpensesList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No expenses recorded matching the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredExpensesList.map((exp, idx) => (
                      <tr key={`exp-row-${exp.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3 whitespace-nowrap">{formatDate(exp.date)}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white max-w-[200px] truncate">
                          {exp.description}
                        </td>
                        <td className="p-3">{exp.payee || '-'}</td>
                        <td className="p-3">{exp.paymentMethod || 'Cash'}</td>
                        <td className="p-3 font-mono text-[11px]">{exp.referenceNumber || '-'}</td>
                        <td className="p-3 text-slate-500">{exp.recordedBy || 'Admin'}</td>
                        <td className="p-3 font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(exp.amount, settings.currencySymbol)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingExpense(exp)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                              title="View Expense"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditExpense(exp)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 transition"
                              title="Edit Expense"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteExpense(exp.id)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition"
                              title="Delete Expense"
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5C. PAYABLES SECTION */}
      {/* ========================================================================= */}
      {financialsSubTab === 'payables' && (
        <div className="space-y-6">
          {payableSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-between text-xs font-bold shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{payableSuccessMsg}</span>
              </div>
              <button onClick={() => setPayableSuccessMsg(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Payables Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Total Invoiced
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {formatCurrency(payablesSummary.totalInvoiced, settings.currencySymbol)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Across all supplier purchase orders</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Amount Paid
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(payablesSummary.totalPaid, settings.currencySymbol)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Disbursed to pharmaceutical vendors</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Outstanding Balance
              </span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {formatCurrency(payablesSummary.totalOutstanding, settings.currencySymbol)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Invoice Amount - Amount Paid</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Overdue Payables
              </span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {formatCurrency(payablesSummary.overdueAmount, settings.currencySymbol)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Past due payment terms</p>
            </div>
          </div>

          {/* Payables Search & Status Filters */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search supplier or invoice #..."
                  value={payablesSearch}
                  onChange={e => setPayablesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={payablesFilterStatus}
                onChange={e => setPayablesFilterStatus(e.target.value)}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          {/* Payables List Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Supplier</th>
                    <th className="p-3">Invoice / PO #</th>
                    <th className="p-3">Purchase Date</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Invoice Amount</th>
                    <th className="p-3">Amount Paid</th>
                    <th className="p-3">Outstanding Balance</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredPayables.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No supplier invoices found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPayables.map((item, idx) => (
                      <tr key={`payable-row-${item.purchase.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {item.supplierName}
                        </td>
                        <td className="p-3 font-mono font-semibold">{item.invoiceNo}</td>
                        <td className="p-3">{formatDate(item.purchaseDate)}</td>
                        <td className="p-3 font-semibold">{formatDate(item.dueDate)}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.invoiceAmount, settings.currencySymbol)}
                        </td>
                        <td className="p-3 text-emerald-600 font-bold">
                          {formatCurrency(item.amountPaid, settings.currencySymbol)}
                        </td>
                        <td className="p-3 font-extrabold text-amber-600 dark:text-amber-400">
                          {formatCurrency(item.outstandingBalance, settings.currencySymbol)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : item.paymentStatus === 'Partially Paid'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : item.paymentStatus === 'Overdue'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {item.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {item.outstandingBalance > 0 && (
                            <button
                              onClick={() => {
                                setSelectedPayable(item.purchase);
                                setPaymentAmountInput(String(item.outstandingBalance));
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm"
                            >
                              Record Payment
                            </button>
                          )}
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

      {/* ========================================================================= */}
      {/* 5D. PROFIT & LOSS SECTION */}
      {/* ========================================================================= */}
      {financialsSubTab === 'profit-loss' && (
        <div className="space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Sales Revenue
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {formatCurrency(pnlData.salesRevenue, settings.currencySymbol)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Based on selling price of dispensed medicines</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Gross Profit
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(pnlData.grossProfit, settings.currencySymbol)}
              </p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">
                {pnlData.grossMargin.toFixed(1)}% Gross Margin
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Net Profit
              </span>
              <p className={`text-2xl font-black ${pnlData.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {formatCurrency(pnlData.netProfit, settings.currencySymbol)}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {pnlData.netMargin.toFixed(1)}% Net Margin
              </p>
            </div>
          </div>

          {/* Simple Standard P&L Statement Structure */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Profit & Loss Statement (Simple Format)
              </h3>
              <p className="text-xs text-slate-500">
                Calculated strictly distinguishing Selling Price vs Purchase/Cost Price (COGS)
              </p>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {/* Sales Revenue */}
              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Sales Revenue</span>
                  <p className="text-xs text-slate-500">Total income from dispensed and sold items</p>
                </div>
                <span className="font-black text-base text-slate-900 dark:text-white">
                  {formatCurrency(pnlData.salesRevenue, settings.currencySymbol)}
                </span>
              </div>

              {/* COGS */}
              <div className="py-3 flex justify-between items-center text-rose-600 dark:text-rose-400">
                <div>
                  <span className="font-semibold">LESS Cost of Goods Sold (COGS)</span>
                  <p className="text-xs text-slate-400">
                    Calculated from actual wholesale medicine purchase cost price (never selling price)
                  </p>
                </div>
                <span className="font-bold text-base">
                  ({formatCurrency(pnlData.cogsTotal, settings.currencySymbol)})
                </span>
              </div>

              {/* Gross Profit */}
              <div className="py-3.5 flex justify-between items-center bg-slate-50/60 dark:bg-slate-800/40 px-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <span className="font-black text-slate-900 dark:text-white text-base">
                    = Gross Profit
                  </span>
                  <span className="text-xs text-emerald-600 font-bold ml-2">
                    ({pnlData.grossMargin.toFixed(1)}% margin)
                  </span>
                </div>
                <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(pnlData.grossProfit, settings.currencySymbol)}
                </span>
              </div>

              {/* Operating Expenses */}
              <div className="py-3 flex justify-between items-center text-rose-600 dark:text-rose-400">
                <div>
                  <span className="font-semibold">LESS Operating Expenses</span>
                  <p className="text-xs text-slate-400">
                    Rent, wages, utilities, licences, bank fees, and miscellaneous operational costs
                  </p>
                </div>
                <span className="font-bold text-base">
                  ({formatCurrency(pnlData.operatingExpenses, settings.currencySymbol)})
                </span>
              </div>

              {/* Net Profit */}
              <div className="py-4 flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/40 px-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div>
                  <span className="font-black text-slate-900 dark:text-white text-lg">
                    = Net Profit
                  </span>
                  <span className="text-xs font-bold text-slate-500 ml-2">
                    (Final take-home profitability: {pnlData.netMargin.toFixed(1)}%)
                  </span>
                </div>
                <span className={`font-black text-xl ${pnlData.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                  {formatCurrency(pnlData.netProfit, settings.currencySymbol)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5E. FINANCIAL REPORTS SECTION */}
      {/* ========================================================================= */}
      {financialsSubTab === 'financial-reports' && (
        <div className="space-y-6">
          {/* Header & Export Actions */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Financial Reports Center
              </h2>
              <p className="text-xs text-slate-500">
                Generate, view on screen, print, or export statements in PDF and Excel formats
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={exportReportToPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
              <button
                onClick={exportReportToCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export Excel / CSV
              </button>
            </div>
          </div>

          {/* Report Type Selector Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'pnl', label: 'Profit & Loss Report', icon: TrendingUp },
              { id: 'sales', label: 'Sales Report', icon: Receipt },
              { id: 'revenue', label: 'Revenue Report', icon: DollarSign },
              { id: 'expenses', label: 'Expense Report', icon: TrendingDown },
              { id: 'payables', label: 'Supplier Payables', icon: Truck },
              { id: 'gross-profit', label: 'Gross Profit Report', icon: Coins },
              { id: 'cogs', label: 'COGS Report', icon: Wallet },
              { id: 'payment-methods', label: 'Payment Method Report', icon: CreditCard }
            ].map(rep => {
              const Icon = rep.icon;
              const isSel = selectedReportType === rep.id;
              return (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReportType(rep.id as any)}
                  className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 ${
                    isSel
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSel ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="font-bold text-xs">{rep.label}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive On-Screen Report Viewer */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {selectedReportType.toUpperCase().replace('-', ' ')} STATEMENT
                </h3>
                <span className="text-[11px] text-slate-500">
                  {settings.pharmacyName} • Range: {formatDate(startDate.toISOString())} to {formatDate(endDate.toISOString())}
                </span>
              </div>
            </div>

            {/* Content for selected report type */}
            {(selectedReportType === 'pnl' || selectedReportType === 'gross-profit' || selectedReportType === 'cogs') && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Revenue</span>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-1">
                      {formatCurrency(pnlData.salesRevenue, settings.currencySymbol)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">COGS</span>
                    <p className="text-base font-black text-rose-600 mt-1">
                      {formatCurrency(pnlData.cogsTotal, settings.currencySymbol)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Gross Margin</span>
                    <p className="text-base font-black text-emerald-600 mt-1">
                      {pnlData.grossMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Net Profit</span>
                    <p className="text-base font-black text-emerald-600 mt-1">
                      {formatCurrency(pnlData.netProfit, settings.currencySymbol)}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between py-1">
                    <span>1. Gross Sales Revenue</span>
                    <span className="font-bold">{formatCurrency(pnlData.salesRevenue, settings.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-rose-600">
                    <span>2. Cost of Medicines Sold (COGS)</span>
                    <span className="font-bold">({formatCurrency(pnlData.cogsTotal, settings.currencySymbol)})</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-t font-black text-emerald-600">
                    <span>= Gross Profit</span>
                    <span>{formatCurrency(pnlData.grossProfit, settings.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-rose-600">
                    <span>3. Pharmacy Operating Expenses</span>
                    <span className="font-bold">({formatCurrency(pnlData.operatingExpenses, settings.currencySymbol)})</span>
                  </div>
                  <div className="flex justify-between py-2 border-t font-black text-sm text-slate-900 dark:text-white">
                    <span>= Net Profit</span>
                    <span className={pnlData.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {formatCurrency(pnlData.netProfit, settings.currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedReportType === 'expenses' && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold py-2 border-b">
                  <span>Category Breakdown</span>
                  <span>Amount</span>
                </div>
                {allExpenseCategories.map(cat => {
                  const catTotal = filteredExpensesList
                    .filter(e => e.category === cat)
                    .reduce((acc, e) => acc + (e.amount || 0), 0);
                  if (catTotal === 0) return null;
                  return (
                    <div key={cat} className="flex justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span>{cat}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(catTotal, settings.currencySymbol)}
                      </span>
                    </div>
                  );
                })}
                <div className="flex justify-between text-sm font-black pt-2">
                  <span>Total Operating Expenses</span>
                  <span className="text-rose-600">
                    {formatCurrency(totalExpenseAmount, settings.currencySymbol)}
                  </span>
                </div>
              </div>
            )}

            {selectedReportType === 'payables' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 mb-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
                    <span className="text-slate-400">Total Billed</span>
                    <p className="font-black text-sm">{formatCurrency(payablesSummary.totalInvoiced, settings.currencySymbol)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
                    <span className="text-slate-400">Total Paid</span>
                    <p className="font-black text-sm text-emerald-600">{formatCurrency(payablesSummary.totalPaid, settings.currencySymbol)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
                    <span className="text-slate-400">Outstanding Balance</span>
                    <p className="font-black text-sm text-amber-600">{formatCurrency(payablesSummary.totalOutstanding, settings.currencySymbol)}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 font-bold">
                      <tr>
                        <th className="p-2">Supplier</th>
                        <th className="p-2">Invoice #</th>
                        <th className="p-2">Due Date</th>
                        <th className="p-2">Status</th>
                        <th className="p-2 text-right">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredPayables.slice(0, 15).map((p, idx) => (
                        <tr key={`rep-pay-${idx}`}>
                          <td className="p-2 font-bold">{p.supplierName}</td>
                          <td className="p-2 font-mono">{p.invoiceNo}</td>
                          <td className="p-2">{formatDate(p.dueDate)}</td>
                          <td className="p-2">{p.paymentStatus}</td>
                          <td className="p-2 text-right font-bold text-amber-600">
                            {formatCurrency(p.outstandingBalance, settings.currencySymbol)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(selectedReportType === 'sales' || selectedReportType === 'revenue' || selectedReportType === 'payment-methods') && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Total Transactions</span>
                    <p className="font-black text-base mt-1">{salesMetrics.transactionCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Gross Sales</span>
                    <p className="font-black text-base mt-1">{formatCurrency(salesMetrics.totalSales, settings.currencySymbol)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Total Discounts</span>
                    <p className="font-black text-base mt-1 text-amber-600">{formatCurrency(salesMetrics.totalDiscounts, settings.currencySymbol)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Net Revenue</span>
                    <p className="font-black text-base mt-1 text-emerald-600">{formatCurrency(salesMetrics.netSales, settings.currencySymbol)}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 font-bold">
                      <tr>
                        <th className="p-2">Invoice #</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Customer</th>
                        <th className="p-2">Method</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rangeSales.slice(0, 15).map((s, idx) => (
                        <tr key={`rep-s-${idx}`}>
                          <td className="p-2 font-mono font-bold">{s.invoiceNo}</td>
                          <td className="p-2">{formatDate(s.createdAt)}</td>
                          <td className="p-2">{s.customerName || 'Walk-in'}</td>
                          <td className="p-2 font-semibold">{s.paymentMethod}</td>
                          <td className="p-2 text-right font-bold text-slate-900 dark:text-white">
                            {formatCurrency(s.grandTotal, settings.currencySymbol)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT EXPENSE */}
      {/* ========================================================================= */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {editingExpense ? 'Edit Pharmacy Expense' : 'Record Pharmacy Expense'}
                </h3>
              </div>
              <button onClick={() => setShowExpenseModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={e => setExpDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Category *</label>
                    <button
                      type="button"
                      onClick={() => setShowNewCatInput(!showNewCatInput)}
                      className="text-[10px] text-emerald-600 font-bold hover:underline"
                    >
                      {showNewCatInput ? 'Choose Existing' : '+ Custom Category'}
                    </button>
                  </div>
                  {showNewCatInput ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="New category name..."
                        value={newCustomCategoryInput}
                        onChange={e => setNewCustomCategoryInput(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomCategory}
                        className="px-2 py-2 rounded-lg bg-emerald-600 text-white font-bold text-[10px]"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select
                      value={expCategory}
                      onChange={e => setExpCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {allExpenseCategories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Pharmacy Store Rental"
                  value={expDescription}
                  onChange={e => setExpDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Amount ({settings.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={expAmount}
                    onChange={e => setExpAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Payment Method
                  </label>
                  <select
                    value={expPaymentMethod}
                    onChange={e => setExpPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit/Debit Card">Credit/Debit Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Payee / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. City Power Corp or Landlord"
                    value={expPayee}
                    onChange={e => setExpPayee(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Reference / Receipt #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. REC-99214 or Cheque #41"
                    value={expRefNumber}
                    onChange={e => setExpRefNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional details, tax invoice notes, receipt reference..."
                  value={expNotes}
                  onChange={e => setExpNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
                >
                  {editingExpense ? 'Save Changes' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW EXPENSE DETAILS */}
      {/* ========================================================================= */}
      {viewingExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Expense Details</h3>
              <button onClick={() => setViewingExpense(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-bold">{formatDate(viewingExpense.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="font-bold">{viewingExpense.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Description:</span>
                <span className="font-bold">{viewingExpense.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-black text-rose-600 text-sm">
                  {formatCurrency(viewingExpense.amount, settings.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-semibold">{viewingExpense.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payee:</span>
                <span className="font-semibold">{viewingExpense.payee || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ref / Receipt #:</span>
                <span className="font-mono">{viewingExpense.referenceNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recorded By:</span>
                <span>{viewingExpense.recordedBy}</span>
              </div>
              {viewingExpense.notes && (
                <div className="pt-2 border-t text-slate-600 dark:text-slate-300">
                  <span className="font-bold block mb-0.5">Notes:</span>
                  <p>{viewingExpense.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingExpense(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW SALE TRANSACTION DETAILS */}
      {/* ========================================================================= */}
      {viewingSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Sale Invoice {viewingSale.invoiceNo}
                </h3>
                <span className="text-[10px] text-slate-500">{formatDate(viewingSale.createdAt)}</span>
              </div>
              <button onClick={() => setViewingSale(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold">{viewingSale.customerName || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span className="font-semibold">{viewingSale.cashierName || 'Admin'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold text-emerald-600">{viewingSale.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold">{viewingSale.status}</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-2">Dispensed Items ({viewingSale.items?.length || 0})</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-xl p-2">
                {viewingSale.items?.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{item.name}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {item.quantity} × {formatCurrency(item.unitPrice, settings.currencySymbol)}
                      </span>
                    </div>
                    <span className="font-bold">
                      {formatCurrency(item.totalPrice, settings.currencySymbol)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-2 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>{formatCurrency(viewingSale.subtotal, settings.currencySymbol)}</span>
              </div>
              {viewingSale.discountAmount > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(viewingSale.discountAmount, settings.currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>VAT / Tax:</span>
                <span>{formatCurrency(viewingSale.taxAmount, settings.currencySymbol)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1 border-t">
                <span>Grand Total:</span>
                <span className="text-emerald-600">
                  {formatCurrency(viewingSale.grandTotal, settings.currencySymbol)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingSale(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD PAYMENT ON SUPPLIER PAYABLE */}
      {/* ========================================================================= */}
      {selectedPayable && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Record Supplier Payment
                </h3>
                <span className="text-[11px] text-slate-500">PO #{selectedPayable.purchaseOrderNo}</span>
              </div>
              <button onClick={() => setSelectedPayable(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier:</span>
                <span className="font-bold">{selectedPayable.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Amount:</span>
                <span className="font-bold">{formatCurrency(selectedPayable.totalAmount, settings.currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Paid:</span>
                <span className="font-bold text-emerald-600">{formatCurrency(selectedPayable.amountPaid || 0, settings.currencySymbol)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t">
                <span className="font-bold text-slate-700 dark:text-slate-300">Remaining Balance:</span>
                <span className="font-black text-amber-600">
                  {formatCurrency(Math.max(0, selectedPayable.totalAmount - (selectedPayable.amountPaid || 0)), settings.currencySymbol)}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Disbursed Payment Amount ({settings.currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Math.max(0, selectedPayable.totalAmount - (selectedPayable.amountPaid || 0))}
                  required
                  value={paymentAmountInput}
                  onChange={e => setPaymentAmountInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Payment Method
                </label>
                <select
                  value={paymentMethodInput}
                  onChange={e => setPaymentMethodInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Payment Reference / Cheque # / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wire Ref #99214"
                  value={paymentNotesInput}
                  onChange={e => setPaymentNotesInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedPayable(null)}
                  className="px-4 py-2 font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
