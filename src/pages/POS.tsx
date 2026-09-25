import React, { useState, useRef } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Medicine, SaleItem } from '../types';
import { formatCurrency } from '../lib/formatters';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { generateInvoicePDF } from '../lib/pdf/generateInvoicePDF';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  Printer,
  FileDown,
  Camera,
  AlertTriangle,
  X,
  Cross,
  Loader2
} from 'lucide-react';

export const POS: React.FC = () => {
  const {
    medicines,
    categories,
    customers,
    prescriptions,
    settings,
    completeSale,
    currentUser,
    addCustomer
  } = usePharmacy();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedRxNo, setSelectedRxNo] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash' | 'Credit Card' | 'Debit Card' | 'Mobile Payment' | 'Insurance'
  >('Cash');
  const [amountPaid, setAmountPaid] = useState<string>('');

  // Barcode Scanner Modal State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanNotification, setScanNotification] = useState<string | null>(null);

  // POS Checkout processing and error states
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Completed receipt modal state
  const [completedSaleModal, setCompletedSaleModal] = useState<any | null>(null);

  // New customer quick modal state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Filter medicines for POS grid
  const filteredMedicines = medicines.filter(m => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.barcode.includes(searchQuery);
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart helper functions
  const addToCart = (med: Medicine) => {
    if (med.stockQuantity <= 0) return;

    setCart(prevCart => {
      const existing = prevCart.find(i => i.medicineId === med.id);
      if (existing) {
        if (existing.quantity >= med.stockQuantity) return prevCart;
        return prevCart.map(i =>
          i.medicineId === med.id
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice - i.discount }
            : i
        );
      } else {
        const newItem: SaleItem = {
          medicineId: med.id,
          barcode: med.barcode,
          name: med.name,
          genericName: med.genericName,
          dosageForm: med.dosageForm,
          unitPrice: med.sellingPrice,
          quantity: 1,
          discount: 0,
          total: med.sellingPrice,
          isPrescriptionRequired: med.isPrescriptionRequired
        };
        return [...prevCart, newItem];
      }
    });

    setScanNotification(`Added ${med.name} to cart`);
    setTimeout(() => setScanNotification(null), 2500);
  };

  const handleBarcodeScanned = (barcode: string) => {
    const med = medicines.find(m => m.barcode === barcode.trim());
    if (med) {
      addToCart(med);
    } else {
      setScanNotification(`Barcode not found: ${barcode}`);
      setTimeout(() => setScanNotification(null), 3000);
    }
  };

  const updateQuantity = (medicineId: string, delta: number) => {
    setCart(prevCart =>
      prevCart
        .map(i => {
          if (i.medicineId !== medicineId) return i;
          const med = medicines.find(m => m.id === medicineId);
          const maxQty = med ? med.stockQuantity : 999;
          const newQty = Math.min(maxQty, Math.max(0, i.quantity + delta));
          if (newQty === 0) return null;
          return {
            ...i,
            quantity: newQty,
            total: newQty * i.unitPrice - i.discount
          };
        })
        .filter(Boolean) as SaleItem[]
    );
  };

  const removeFromCart = (medicineId: string) => {
    setCart(prev => prev.filter(i => i.medicineId !== medicineId));
  };

  // Cart Summary Calculations
  const subtotal = cart.reduce((acc, curr) => acc + curr.total, 0);
  const effectiveDiscount = Math.min(subtotal, discountAmount);
  const taxableAmount = Math.max(0, subtotal - effectiveDiscount);
  const taxAmount = (taxableAmount * settings.vatRate) / 100;
  const grandTotal = taxableAmount + taxAmount;

  const numericPaid = parseFloat(amountPaid) || grandTotal;
  const changeGiven = Math.max(0, numericPaid - grandTotal);

  const hasRxRequiredItem = cart.some(i => i.isPrescriptionRequired);

  const handleCheckout = async () => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setCheckoutError(null);

    try {
      const cust = customers.find(c => c.id === selectedCustomerId);
      const customerName = cust ? cust.name : 'Walk-in Customer';

      const newSale = await completeSale({
        customerId: selectedCustomerId || undefined,
        customerName,
        customerPhone: cust?.phone,
        items: cart,
        subtotal,
        taxAmount,
        discountAmount: effectiveDiscount,
        grandTotal,
        paymentMethod,
        amountPaid: numericPaid,
        changeGiven,
        cashierName: currentUser.name,
        prescriptionNo: selectedRxNo || undefined
      });

      setCompletedSaleModal(newSale);

      // Reset Cart only upon successful transaction
      setCart([]);
      setSelectedCustomerId('');
      setSelectedRxNo('');
      setDiscountAmount(0);
      setAmountPaid('');
      setCheckoutError(null);
    } catch (err: any) {
      console.error('POS Checkout error:', err);
      setCheckoutError(err?.message || 'Transaction failed. Please check stock and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadInvoicePDF = (saleData: any) => {
    if (!saleData) return;
    generateInvoicePDF({
      invoiceNumber: saleData.invoiceNo || 'INV-001',
      date: saleData.createdAt || new Date(),
      customerName: saleData.customerName,
      customerPhone: saleData.customerPhone,
      cashierName: saleData.cashierName,
      paymentMethod: saleData.paymentMethod,
      items: saleData.items.map((i: SaleItem) => ({
        name: i.name,
        generic_name: i.genericName,
        barcode: i.barcode,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        subtotal: i.total,
      })),
      subtotal: saleData.subtotal,
      discountAmount: saleData.discountAmount,
      taxAmount: saleData.taxAmount,
      grandTotal: saleData.grandTotal,
      amountPaid: saleData.amountPaid,
      changeGiven: saleData.changeGiven,
      pharmacyName: settings.pharmacyName,
      pharmacyAddress: settings.address,
      pharmacyPhone: settings.phone,
      licenseNumber: settings.licenseNumber,
      prescriptionNo: saleData.prescriptionNo,
      currencySymbol: settings.currencySymbol,
    });
  };

  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;
    addCustomer({
      name: newCustName,
      phone: newCustPhone,
      allergies: [],
      chronicConditions: []
    });
    setNewCustName('');
    setNewCustPhone('');
    setShowAddCustomerModal(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Product Search & Grid (8 Cols) */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        {/* Scan / Action Toast */}
        {scanNotification && (
          <div className="p-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{scanNotification}</span>
          </div>
        )}

        {/* Search & Barcode Input */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Medicine Name, Generic, or Barcode..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Barcode</span>
          </button>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'All'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Medicines ({medicines.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat.name
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredMedicines.map((med, idx) => {
            const inCart = cart.find(i => i.medicineId === med.id);
            const isOutOfStock = med.stockQuantity <= 0;

            return (
              <div
                key={`pos-med-${med.id}-${idx}`}
                onClick={() => !isOutOfStock && addToCart(med)}
                className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition cursor-pointer relative flex flex-col justify-between ${
                  isOutOfStock
                    ? 'opacity-60 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                    : inCart
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                      {med.dosageForm} • {med.strength}
                    </span>
                    {med.isPrescriptionRequired && (
                      <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded border border-rose-300 dark:border-rose-800">
                        Rx Required
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                    {med.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {med.genericName}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                    Barcode: {med.barcode}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Price</span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-base">
                      {formatCurrency(med.sellingPrice, settings.currencySymbol)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[11px] font-bold block ${
                        med.stockQuantity <= med.minReorderLevel
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      Stock: {med.stockQuantity}
                    </span>
                    {inCart ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {inCart.quantity} in cart
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {isOutOfStock ? 'Out of Stock' : '+ Add'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Interactive Cart & Checkout Panel */}
      <div className="lg:col-span-5 xl:col-span-4 space-y-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between min-h-[600px]">
          <div>
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Current Cart</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {cart.reduce((a, c) => a + c.quantity, 0)} Items
              </span>
            </div>

            {/* Customer & Prescription Selectors */}
            <div className="my-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="flex-1 text-xs py-2 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - {c.loyaltyPoints} pts
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold shrink-0"
                  title="Quick Add Customer"
                >
                  + Patient
                </button>
              </div>

              {/* Rx linkage dropdown */}
              {hasRxRequiredItem && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300 mb-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> Prescription Required Item in Cart
                  </div>
                  <select
                    value={selectedRxNo}
                    onChange={e => setSelectedRxNo(e.target.value)}
                    className="w-full text-xs py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="">-- Link Doctor Prescription (Optional) --</option>
                    {prescriptions.map(rx => (
                      <option key={rx.id} value={rx.prescriptionNo}>
                        {rx.prescriptionNo} - {rx.customerName} ({rx.doctorName})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Your cart is empty. Scan barcode or click medicines to add.
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={`cart-item-${item.medicineId}-${idx}`}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 truncate">
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {item.name}
                      </h5>
                      <p className="text-[11px] text-slate-500 truncate">
                        {formatCurrency(item.unitPrice, settings.currencySymbol)} / unit
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.medicineId, -1)}
                        className="p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.medicineId, 1)}
                        className="p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right shrink-0 w-16">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        {formatCurrency(item.total, settings.currencySymbol)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.medicineId)}
                        className="text-[10px] text-rose-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Summary & Checkout Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 mt-4">
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(subtotal, settings.currencySymbol)}
                </span>
              </div>

              {/* Discount Input */}
              <div className="flex justify-between items-center">
                <span>Discount</span>
                <div className="flex items-center gap-1 w-24">
                  <span className="text-slate-400">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount || ''}
                    onChange={e => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full text-right text-xs py-1 px-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <span>VAT / Tax ({settings.vatRate}%)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(taxAmount, settings.currencySymbol)}
                </span>
              </div>

              <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Grand Total</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(grandTotal, settings.currencySymbol)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector Pills */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['Cash', 'Credit Card', 'Mobile Payment'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 px-1 rounded-xl font-bold border transition ${
                      paymentMethod === m
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Tendered & Change calculator if Cash */}
            {paymentMethod === 'Cash' && (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Tendered</span>
                  <input
                    type="number"
                    placeholder={grandTotal.toFixed(2)}
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    className="w-20 text-xs font-bold py-1 px-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px]">Change Due</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(changeGiven, settings.currencySymbol)}
                  </span>
                </div>
              </div>
            )}

            {/* Checkout Error Alert Banner */}
            {checkoutError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start justify-between gap-2 shadow-sm animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div>
                    <p className="font-bold">Transaction Failed</p>
                    <p className="text-[11px] mt-0.5 text-rose-700 dark:text-rose-300">{checkoutError}</p>
                  </div>
                </div>
                <button
                  onClick={() => setCheckoutError(null)}
                  className="p-1 text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Complete Checkout Button */}
            <button
              disabled={cart.length === 0 || isProcessing}
              onClick={handleCheckout}
              className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 ${
                cart.length === 0 || isProcessing
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Atomic Transaction...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Complete Sale ({formatCurrency(grandTotal, settings.currencySymbol)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Scan Medicine Barcode"
      />

      {/* Quick Add Patient Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Quick Add Patient</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleQuickAddCustomer} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Save Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable / PDF Receipt Modal */}
      {completedSaleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 font-mono">
            {/* Header */}
            <div className="text-center space-y-1 border-b pb-3 border-slate-200">
              <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Cross className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base uppercase tracking-wider">{settings.pharmacyName}</h3>
              <p className="text-[11px] text-slate-600">{settings.address}</p>
              <p className="text-[11px] text-slate-600">Tel: {settings.phone} • Lic: {settings.licenseNumber}</p>
            </div>

            {/* Sale Details */}
            <div className="text-xs space-y-1 border-b pb-3 border-slate-200">
              <div className="flex justify-between">
                <span>Invoice:</span> <span className="font-bold">{completedSaleModal.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span> <span>{new Date(completedSaleModal.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span> <span>{completedSaleModal.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span> <span>{completedSaleModal.cashierName}</span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="space-y-1.5 text-xs border-b pb-3 border-slate-200 max-h-48 overflow-y-auto">
              {completedSaleModal.items.map((i: SaleItem, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <div>
                    <p className="font-bold">{i.name}</p>
                    <p className="text-[10px] text-slate-500">{i.quantity} x {formatCurrency(i.unitPrice, settings.currencySymbol)}</p>
                  </div>
                  <span className="font-bold">{formatCurrency(i.total, settings.currencySymbol)}</span>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div className="text-xs space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Subtotal</span> <span>{formatCurrency(completedSaleModal.subtotal, settings.currencySymbol)}</span>
              </div>
              {completedSaleModal.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount</span> <span>-{formatCurrency(completedSaleModal.discountAmount, settings.currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax ({settings.vatRate}%)</span> <span>{formatCurrency(completedSaleModal.taxAmount, settings.currencySymbol)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1 border-t">
                <span>Total</span> <span>{formatCurrency(completedSaleModal.grandTotal, settings.currencySymbol)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Paid ({completedSaleModal.paymentMethod})</span> <span>{formatCurrency(completedSaleModal.amountPaid, settings.currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span>Change</span> <span>{formatCurrency(completedSaleModal.changeGiven, settings.currencySymbol)}</span>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-[10px] text-center text-slate-500 pt-2 border-t">
              <p>{settings.receiptFooterNotice}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 font-sans">
              <button
                onClick={() => handleDownloadInvoicePDF(completedSaleModal)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
              >
                <FileDown className="w-4 h-4" /> Download PDF Invoice
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={() => setCompletedSaleModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-300"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
