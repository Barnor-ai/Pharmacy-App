import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Sale, SaleItem } from '../types';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { generateInvoicePDF } from '../lib/pdf/generateInvoicePDF';
import { Search, ReceiptText, Download, RotateCcw, Eye, X, Printer, FileDown, CheckCircle2, ShoppingBag } from 'lucide-react';

export const SalesHistory: React.FC = () => {
  const { sales, settings, refundSale } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const filteredSales = sales.filter(s =>
    s.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.cashierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        subtotal: i.total,
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
      currencySymbol: settings.currencySymbol,
    });
  };

  const exportSalesCSV = () => {
    const headers = ['Invoice No,Customer,Subtotal,Tax,Discount,Grand Total,Payment Method,Status,Cashier,Date\n'];
    const rows = sales.map(s =>
      `"${s.invoiceNo}","${s.customerName}",${s.subtotal},${s.taxAmount},${s.discountAmount},${s.grandTotal},"${s.paymentMethod}","${s.status}","${s.cashierName}","${s.createdAt}"\n`
    );
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy_sales_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Sales & Invoice History</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total {sales.length} sale transactions logged
          </p>
        </div>

        <button
          onClick={exportSalesCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold transition shadow-sm"
        >
          <Download className="w-4 h-4 text-emerald-600" /> Export Sales CSV
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice #, Customer, or Cashier..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 rounded-l-xl">Invoice No</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Items</th>
                <th className="p-3">Grand Total</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Cashier</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">No sales recorded yet</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                          Completed point-of-sale transactions and customer receipts will be listed here with invoice downloads.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{s.invoiceNo}</td>
                    <td className="p-3 font-medium">{s.customerName}</td>
                    <td className="p-3">{s.items.length} item(s)</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(s.grandTotal, settings.currencySymbol)}
                    </td>
                    <td className="p-3">{s.paymentMethod}</td>
                    <td className="p-3">{s.cashierName}</td>
                    <td className="p-3 text-slate-500">{formatDateTime(s.createdAt)}</td>
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownloadInvoicePDF(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                          title="Download PDF Invoice"
                        >
                          <FileDown className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => setSelectedSale(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {s.status === 'Completed' && (
                          <button
                            onClick={() => refundSale(s.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition cursor-pointer"
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
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Invoice Details: {selectedSale.invoiceNo}
              </h3>
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
                <p>Tax: {formatCurrency(selectedSale.taxAmount, settings.currencySymbol)}</p>
                <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  Grand Total: {formatCurrency(selectedSale.grandTotal, settings.currencySymbol)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
    </div>
  );
};
