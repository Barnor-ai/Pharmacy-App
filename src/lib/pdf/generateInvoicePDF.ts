import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceItem {
  name: string;
  generic_name?: string;
  dosage_form?: string;
  barcode?: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string | Date;
  customerName?: string;
  customerPhone?: string;
  cashierName?: string;
  paymentMethod: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  grandTotal: number;
  amountPaid?: number;
  changeGiven?: number;
  pharmacyName?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  licenseNumber?: string;
  prescriptionNo?: string;
  currencySymbol?: string;
}

export function generateInvoicePDF(data: InvoiceData, shouldDownload = true): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currency = data.currencySymbol || '$';
  const pharmacyName = data.pharmacyName || 'PHARMACORE SAAS PHARMACY';
  const pharmacyAddress = data.pharmacyAddress || '100 Medical Center Blvd, Suite 400, NY 10001';
  const pharmacyPhone = data.pharmacyPhone || '+1 (800) 555-0199';
  const licenseNumber = data.licenseNumber || 'RX-LIC-984420-NY';

  const primaryColor: [number, number, number] = [16, 185, 129];
  const darkColor: [number, number, number] = [15, 23, 42];
  const slateMuted: [number, number, number] = [100, 116, 139];
  const lightBg: [number, number, number] = [248, 250, 252];

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 8, 'F');

  // 2. Pharmacy Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(pharmacyName, 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(pharmacyAddress, 14, 28);
  doc.text(`Phone: ${pharmacyPhone}  |  License #: ${licenseNumber}`, 14, 33);

  // 3. INVOICE Title Badge
  doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.roundedRect(140, 14, 56, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE', 168, 22, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`INV #: ${data.invoiceNumber}`, 168, 30, { align: 'center' });

  // 4. Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 40, 196, 40);

  // 5. Patient & Transaction Info
  const formattedDate = typeof data.date === 'string' 
    ? new Date(data.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : data.date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('BILLED TO (PATIENT):', 14, 48);
  doc.text('TRANSACTION DETAILS:', 110, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);

  doc.text(`Name: ${data.customerName || 'Walk-in Patient'}`, 14, 54);
  if (data.customerPhone) {
    doc.text(`Contact: ${data.customerPhone}`, 14, 59);
  }
  if (data.prescriptionNo) {
    doc.text(`Prescription Ref (Rx): ${data.prescriptionNo}`, 14, 64);
  }

  doc.text(`Date & Time: ${formattedDate}`, 110, 54);
  doc.text(`Cashier / Dispenser: ${data.cashierName || 'Staff Dispenser'}`, 110, 59);
  doc.text(`Payment Mode: ${data.paymentMethod}`, 110, 64);

  // 6. Table
  const tableRows = data.items.map((item, index) => {
    const unitPrice = Number(item.unit_price) || 0;
    const total = item.subtotal ?? (unitPrice * item.quantity);
    const desc = item.generic_name ? `${item.name}\nGeneric: ${item.generic_name}` : item.name;

    return [
      (index + 1).toString(),
      desc,
      item.barcode || '—',
      item.quantity.toString(),
      `${currency}${unitPrice.toFixed(2)}`,
      `${currency}${total.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: 72,
    head: [['#', 'Medicine / Product Description', 'Barcode', 'Qty', 'Unit Price', 'Total']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 32, font: 'courier' },
      3: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // 7. Totals Summary
  const finalY = (doc as any).lastAutoTable?.finalY || 140;
  const summaryStartX = 120;
  let currentY = finalY + 8;

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(summaryStartX - 4, currentY - 4, 80, 44, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryStartX - 4, currentY - 4, 80, 44, 2, 2, 'D');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);

  doc.text('Subtotal:', summaryStartX, currentY);
  doc.text(`${currency}${data.subtotal.toFixed(2)}`, 190, currentY, { align: 'right' });

  if (data.discountAmount && data.discountAmount > 0) {
    currentY += 5;
    doc.text('Discount Applied:', summaryStartX, currentY);
    doc.setTextColor(220, 38, 38);
    doc.text(`-${currency}${data.discountAmount.toFixed(2)}`, 190, currentY, { align: 'right' });
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  }

  if (data.taxAmount !== undefined && data.taxAmount > 0) {
    currentY += 5;
    doc.text('Tax / VAT:', summaryStartX, currentY);
    doc.text(`${currency}${data.taxAmount.toFixed(2)}`, 190, currentY, { align: 'right' });
  }

  currentY += 7;
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryStartX, currentY - 2, 192, currentY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Grand Total:', summaryStartX, currentY + 2);
  doc.text(`${currency}${data.grandTotal.toFixed(2)}`, 190, currentY + 2, { align: 'right' });

  if (data.amountPaid !== undefined) {
    currentY += 7;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(`Amount Paid (${data.paymentMethod}):`, summaryStartX, currentY);
    doc.text(`${currency}${data.amountPaid.toFixed(2)}`, 190, currentY, { align: 'right' });

    if (data.changeGiven !== undefined) {
      currentY += 4.5;
      doc.text('Change Returned:', summaryStartX, currentY);
      doc.text(`${currency}${data.changeGiven.toFixed(2)}`, 190, currentY, { align: 'right' });
    }
  }

  // 8. Signature Area
  const footerY = Math.max(finalY + 12, 235);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('Pharmacist Dispensation Verification:', 14, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Verified by licensed registered pharmacist. All controlled substances logged.', 14, footerY + 5);

  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(14, footerY + 24, 75, footerY + 24);
  doc.text('Authorized Pharmacist Signature & Stamp', 14, footerY + 28);
  doc.setLineDashPattern([], 0);

  // 9. Legal Policy
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Terms & Conditions:', 14, 275);
  doc.text(
    '1. Prescription medications once dispensed cannot be returned or refunded under state pharmacy regulations.\n2. Store medications below 25°C away from direct sunlight and reach of children.\n3. This computer-generated invoice is valid under pharmacy SaaS multi-tenant compliance.',
    14,
    279
  );

  // 10. Bottom Accent Bar
  doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.rect(0, 292, 210, 5, 'F');

  if (shouldDownload) {
    const filename = `Invoice_${data.invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }

  return doc;
}
