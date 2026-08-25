import React from 'react';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  Building2,
  Calendar,
  CreditCard,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { SubscriptionPayment } from '../types';
import { usePharmacy } from '../context/PharmacyContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SubscriptionInvoiceModalProps {
  payment: SubscriptionPayment;
  onClose: () => void;
}

export const SubscriptionInvoiceModal: React.FC<SubscriptionInvoiceModalProps> = ({
  payment,
  onClose
}) => {
  const { pharmacySettings } = usePharmacy();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();

      // Header Banner
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(0, 0, 210, 25, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SUBSCRIPTION PAYMENT RECEIPT / INVOICE', 14, 16);

      // Company Info
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.text(pharmacySettings.pharmacyName || 'Pharmacy SaaS Management System', 14, 38);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Address: ${pharmacySettings.address || 'Central Headquarters'}`, 14, 44);
      doc.text(`Phone: ${pharmacySettings.phone || 'N/A'} | Email: ${pharmacySettings.email || 'support@pharmacore-saas.com'}`, 14, 49);
      if (pharmacySettings.taxNumber) {
        doc.text(`Tax / VAT ID: ${pharmacySettings.taxNumber}`, 14, 54);
      }

      // Invoice Details (Right Side)
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(`Invoice Ref: ${payment.paymentReference}`, 120, 38);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Issue Date: ${new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}`, 120, 44);
      doc.text(`Payment Gateway: ${payment.provider.toUpperCase()}`, 120, 49);
      doc.text(`Status: ${payment.status.toUpperCase()}`, 120, 54);

      // Table of Items
      autoTable(doc, {
        startY: 65,
        head: [['Description', 'Billing Interval', 'Gateway Ref', 'Amount']],
        body: [
          [
            `${payment.planName || 'Commercial'} SaaS Plan License`,
            '1 Month Recurring',
            payment.paymentReference,
            `$${payment.amount.toFixed(2)} ${payment.currency}`
          ]
        ],
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5 }
      });

      // Total summary
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Total Paid: $${payment.amount.toFixed(2)} ${payment.currency}`, 140, finalY);

      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text('Thank you for subscribing. This document serves as official payment verification and tax invoice.', 14, finalY + 25);

      doc.save(`Invoice_${payment.paymentReference}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Payment Receipt & Invoice
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official transaction record #{payment.paymentReference}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 text-xs font-bold shadow-md shadow-emerald-600/20"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet Content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto print:p-0">
          {/* Header Card */}
          <div className="flex flex-wrap justify-between items-start gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-lg">
                <Building2 className="w-5 h-5" />
                <span>{pharmacySettings.pharmacyName || 'Pharmacy SaaS Management'}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                {pharmacySettings.address || 'Central Pharmacy Operations'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pharmacySettings.email || 'billing@pharmacore-saas.com'} | {pharmacySettings.phone || '+1 (800) 555-PHARM'}
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Paid & Verified
              </span>
              <p className="text-xs font-mono text-slate-600 dark:text-slate-300 font-bold">
                Ref: {payment.paymentReference}
              </p>
              <p className="text-[11px] text-slate-400">
                Date: {new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Plan License</span>
              <p className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">
                {payment.planName || 'Commercial'} Plan
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Payment Method</span>
              <p className="font-extrabold text-slate-900 dark:text-white capitalize text-sm mt-0.5">
                {payment.provider}
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Currency</span>
              <p className="font-extrabold text-slate-900 dark:text-white font-mono text-sm mt-0.5">
                {payment.currency}
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Amount Paid</span>
              <p className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-base mt-0.5">
                ${payment.amount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
            <div className="grid grid-cols-12 bg-slate-100 dark:bg-slate-800 p-3 font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[10px]">
              <div className="col-span-6">Service Description</div>
              <div className="col-span-3 text-center">Interval</div>
              <div className="col-span-3 text-right">Subtotal</div>
            </div>
            <div className="grid grid-cols-12 p-3.5 border-t border-slate-100 dark:border-slate-800 items-center">
              <div className="col-span-6">
                <p className="font-bold text-slate-900 dark:text-white">
                  PharmaSys {payment.planName || 'Commercial'} SaaS License
                </p>
                <p className="text-[11px] text-slate-400">
                  Full multi-tenant access, secure audit logging, POS & inventory management.
                </p>
              </div>
              <div className="col-span-3 text-center text-slate-600 dark:text-slate-300">
                1 Month
              </div>
              <div className="col-span-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                ${payment.amount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  ${payment.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax / VAT (0% Included):</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">$0.00</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  ${payment.amount.toFixed(2)} {payment.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Legal / Tax Note */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Verified Merchant Record</span>
            </div>
            <p>
              Payment was authenticated and captured securely via {payment.provider.toUpperCase()} Gateway with verified server-side signature validation. No credit card information is stored locally.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
