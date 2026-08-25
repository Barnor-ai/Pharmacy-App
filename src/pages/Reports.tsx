import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
  CheckCircle2,
  FileCode
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { sales, medicines, settings, currentUser } = usePharmacy();
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Financial calculations
  const totalRevenue = sales.reduce((a, b) => a + b.grandTotal, 0);
  const totalSubtotal = sales.reduce((a, b) => a + b.subtotal, 0);
  const totalTax = sales.reduce((a, b) => a + b.taxAmount, 0);
  const totalDiscount = sales.reduce((a, b) => a + b.discountAmount, 0);

  // COGS estimate
  const estimatedCOGS = medicines.reduce((acc, med) => {
    return acc + (med.purchasePrice * (100 - med.stockQuantity));
  }, 0);
  const grossProfit = Math.max(0, totalSubtotal - estimatedCOGS);

  // Inventory Valuation
  const totalStockValuationCost = medicines.reduce((a, b) => a + b.purchasePrice * b.stockQuantity, 0);
  const totalStockValuationRetail = medicines.reduce((a, b) => a + b.sellingPrice * b.stockQuantity, 0);

  // Category Breakdown Data
  const categoryMap: Record<string, number> = {};
  medicines.forEach(m => {
    categoryMap[m.category] = (categoryMap[m.category] || 0) + m.stockQuantity * m.sellingPrice;
  });
  const pieData = Object.keys(categoryMap).map(cat => ({
    name: cat,
    value: categoryMap[cat]
  }));

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#64748B'];

  // Helper trigger notification
  const triggerNotice = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  // 1. Export to CSV
  const handleExportCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    let csvContent = `data:text/csv;charset=utf-8,`;
    
    csvContent += `=======================================================\n`;
    csvContent += `${settings.pharmacyName.toUpperCase()} - FINANCIAL & INVENTORY REPORT\n`;
    csvContent += `Generated On: ${new Date().toLocaleString()} | By: ${currentUser.name}\n`;
    csvContent += `=======================================================\n\n`;

    csvContent += `FINANCIAL SUMMARY METRICS\n`;
    csvContent += `Metric,Amount (${settings.currency})\n`;
    csvContent += `Total Sales Revenue,${totalRevenue.toFixed(2)}\n`;
    csvContent += `Tax Collected,${totalTax.toFixed(2)}\n`;
    csvContent += `Total Discounts,${totalDiscount.toFixed(2)}\n`;
    csvContent += `Estimated Gross Profit,${grossProfit.toFixed(2)}\n`;
    csvContent += `Inventory Asset Value (Purchase Cost),${totalStockValuationCost.toFixed(2)}\n`;
    csvContent += `Inventory Potential Retail Revenue,${totalStockValuationRetail.toFixed(2)}\n\n`;

    csvContent += `INVENTORY ASSET VALUATION DETAILS\n`;
    csvContent += `Medicine Name,Category,Stock Qty,Purchase Price,Selling Price,Total Cost Value,Total Retail Value\n`;
    medicines.forEach(m => {
      const costVal = (m.stockQuantity * m.purchasePrice).toFixed(2);
      const retailVal = (m.stockQuantity * m.sellingPrice).toFixed(2);
      csvContent += `"${m.name}","${m.category}",${m.stockQuantity},${m.purchasePrice.toFixed(2)},${m.sellingPrice.toFixed(2)},${costVal},${retailVal}\n`;
    });

    csvContent += `\nSALES TRANSACTIONS SUMMARY\n`;
    csvContent += `Invoice No,Customer,Payment Method,Subtotal,Tax,Discount,Grand Total,Date\n`;
    sales.forEach(s => {
      csvContent += `"${s.invoiceNo}","${s.customerName}","${s.paymentMethod}",${s.subtotal.toFixed(2)},${s.taxAmount.toFixed(2)},${s.discountAmount.toFixed(2)},${s.grandTotal.toFixed(2)},"${s.createdAt}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${settings.pharmacyName.replace(/\s+/g, '_')}_Report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerNotice('Financial & Sales report exported to CSV successfully!');
  };

  // 2. Export to Printable PDF
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${settings.pharmacyName} - Executive Financial Report</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 15px; margin-bottom: 25px; }
          .title { font-size: 24px; font-weight: bold; color: #065f46; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 5px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; rounded-radius: 12px; }
          .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
          .card-val { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; }
          .footer { margin-top: 40px; border-t: 1px solid #cbd5e1; pt: 15px; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${settings.pharmacyName}</h1>
          <p class="subtitle">License #${settings.licenseNumber} • ${settings.address} • Phone: ${settings.phone}</p>
          <p class="subtitle"><strong>Official Financial & Inventory Valuation Report</strong> | Date: ${new Date().toLocaleDateString()}</p>
        </div>

        <h3>Financial Performance Overview</h3>
        <div class="metrics-grid">
          <div class="card">
            <div class="card-title">Total Revenue</div>
            <div class="card-val">${formatCurrency(totalRevenue, settings.currencySymbol)}</div>
          </div>
          <div class="card">
            <div class="card-title">Est. Gross Profit</div>
            <div class="card-val">${formatCurrency(grossProfit, settings.currencySymbol)}</div>
          </div>
          <div class="card">
            <div class="card-title">Stock Valuation (Cost)</div>
            <div class="card-val">${formatCurrency(totalStockValuationCost, settings.currencySymbol)}</div>
          </div>
          <div class="card">
            <div class="card-title">Stock Valuation (Retail)</div>
            <div class="card-val">${formatCurrency(totalStockValuationRetail, settings.currencySymbol)}</div>
          </div>
        </div>

        <h3>Inventory Valuation Summary</h3>
        <table>
          <thead>
            <tr>
              <th>Medicine Name</th>
              <th>Category</th>
              <th>Stock Qty</th>
              <th>Unit Cost</th>
              <th>Unit Retail</th>
              <th>Total Asset Cost</th>
            </tr>
          </thead>
          <tbody>
            ${medicines.slice(0, 15).map(m => `
              <tr>
                <td><strong>${m.name}</strong> (${m.strength})</td>
                <td>${m.category}</td>
                <td>${m.stockQuantity}</td>
                <td>${formatCurrency(m.purchasePrice, settings.currencySymbol)}</td>
                <td>${formatCurrency(m.sellingPrice, settings.currencySymbol)}</td>
                <td><strong>${formatCurrency(m.stockQuantity * m.purchasePrice, settings.currencySymbol)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>Prepared By: <strong>${currentUser.name} (${currentUser.role})</strong></div>
          <div>Authorized Signature: _______________________</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    triggerNotice('Printable PDF window launched!');
  };

  // 3. Export to MS Word (.doc/.docx)
  const handleExportWord = () => {
    const today = new Date().toISOString().split('T')[0];
    const wordHTML = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${settings.pharmacyName} Financial Report</title>
        <style>
          body { font-family: Calibri, sans-serif; padding: 20px; }
          h1 { color: #047857; font-size: 22pt; margin-bottom: 2pt; }
          p { font-size: 10pt; color: #475569; }
          .table-header { background-color: #047857; color: white; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt; }
          td, th { border: 1px solid #cbd5e1; padding: 6px 10px; }
          .summary-box { background-color: #f1f5f9; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>${settings.pharmacyName}</h1>
        <p><strong>Pharmacy Executive Financial & Asset Report</strong></p>
        <p>Generated On: ${new Date().toLocaleString()} | Prepared By: ${currentUser.name} (${currentUser.role})</p>
        <hr/>

        <div class="summary-box">
          <h3>Financial Performance Metrics</h3>
          <p><strong>Total Sales Revenue:</strong> ${formatCurrency(totalRevenue, settings.currencySymbol)}</p>
          <p><strong>Estimated Gross Profit:</strong> ${formatCurrency(grossProfit, settings.currencySymbol)}</p>
          <p><strong>Total Tax Collected:</strong> ${formatCurrency(totalTax, settings.currencySymbol)}</p>
          <p><strong>Inventory Asset Value (Cost):</strong> ${formatCurrency(totalStockValuationCost, settings.currencySymbol)}</p>
          <p><strong>Inventory Asset Value (Potential Retail):</strong> ${formatCurrency(totalStockValuationRetail, settings.currencySymbol)}</p>
        </div>

        <h3>Top Capital Investment Medicines</h3>
        <table>
          <tr class="table-header">
            <th>Medicine Name</th>
            <th>Category</th>
            <th>Units in Stock</th>
            <th>Unit Cost</th>
            <th>Total Asset Investment</th>
          </tr>
          ${medicines.slice(0, 15).map(m => `
            <tr>
              <td>${m.name}</td>
              <td>${m.category}</td>
              <td>${m.stockQuantity}</td>
              <td>${formatCurrency(m.purchasePrice, settings.currencySymbol)}</td>
              <td>${formatCurrency(m.stockQuantity * m.purchasePrice, settings.currencySymbol)}</td>
            </tr>
          `).join('')}
        </table>

        <br/><br/>
        <p>Verified & Approved By: _____________________________</p>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', wordHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${settings.pharmacyName.replace(/\s+/g, '_')}_Financial_Report_${today}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    triggerNotice('Report exported to Word (.doc) file successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Pharmacy Analytics & Reports</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Executive financial overview, profit & loss, inventory asset valuations & multi-format exporting
          </p>
        </div>

        {/* Export Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Export PDF / Print</span>
          </button>

          <button
            onClick={handleExportWord}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
          >
            <FileText className="w-4 h-4" />
            <span>Export Word (.doc)</span>
          </button>
        </div>
      </div>

      {/* Export Success Banner */}
      {downloadSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 block font-semibold">Total Sales Revenue</span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1">
            {formatCurrency(totalRevenue, settings.currencySymbol)}
          </span>
          <span className="text-[11px] text-slate-400">Tax Collected: {formatCurrency(totalTax, settings.currencySymbol)}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 block font-semibold">Estimated Gross Profit</span>
          <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 block mt-1">
            {formatCurrency(grossProfit, settings.currencySymbol)}
          </span>
          <span className="text-[11px] text-slate-400">Discounts: {formatCurrency(totalDiscount, settings.currencySymbol)}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 block font-semibold">Inventory Value (Cost)</span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white block mt-1">
            {formatCurrency(totalStockValuationCost, settings.currencySymbol)}
          </span>
          <span className="text-[11px] text-slate-400">At Wholesaler Purchase Cost</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 block font-semibold">Inventory Potential Retail</span>
          <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400 block mt-1">
            {formatCurrency(totalStockValuationRetail, settings.currencySymbol)}
          </span>
          <span className="text-[11px] text-slate-400">Potential Retail Revenue</span>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">Stock Value by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(Number(v), settings.currencySymbol)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Top Value Inventory Items</h3>
          <p className="text-xs text-slate-500 mb-4">Medicines with highest capital tie-up</p>
          <div className="space-y-2.5">
            {medicines
              .slice()
              .sort((a, b) => b.stockQuantity * b.purchasePrice - a.stockQuantity * a.purchasePrice)
              .slice(0, 5)
              .map(m => (
                <div key={m.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white">{m.name}</h5>
                    <p className="text-slate-500">{m.stockQuantity} units in stock</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 block">
                      {formatCurrency(m.stockQuantity * m.purchasePrice, settings.currencySymbol)}
                    </span>
                    <span className="text-[10px] text-slate-400">Total Asset Cost</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

