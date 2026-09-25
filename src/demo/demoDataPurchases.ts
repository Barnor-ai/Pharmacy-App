import { Purchase } from '../types';

export const demoPurchases: Purchase[] = [
  // ==========================================
  // YEAR 2024 PURCHASES
  // ==========================================
  {
    id: "po-gh-2024-001",
    purchaseOrderNo: "PO-2024-0081",
    supplierId: "sup-gh-1",
    supplierName: "MedCare Distributors Ghana",
    orderDate: "2024-02-05",
    expectedDeliveryDate: "2024-02-08",
    receivedDate: "2024-02-08",
    dueDate: "2024-03-08",
    paymentStatus: "Paid",
    deliveryStatus: "Received",
    totalAmount: 18450.00,
    amountPaid: 18450.00,
    items: [
      {
        medicineId: "med-gh-44",
        name: "Augmentin 625mg Tablets",
        batchNumber: "BN-2024-AUG12",
        expiryDate: "2026-06-30",
        quantityOrdered: 100,
        quantityReceived: 100,
        unitCost: 55.00,
        totalCost: 5500.00
      },
      {
        medicineId: "med-gh-46",
        name: "Amlodipine 10mg Tablets",
        batchNumber: "BN-2024-AML05",
        expiryDate: "2026-08-31",
        quantityOrdered: 300,
        quantityReceived: 300,
        unitCost: 24.00,
        totalCost: 7200.00
      },
      {
        medicineId: "med-gh-48",
        name: "Glucophage 500mg Metformin",
        batchNumber: "BN-2024-MET09",
        expiryDate: "2026-09-30",
        quantityOrdered: 220,
        quantityReceived: 220,
        unitCost: 26.00,
        totalCost: 5750.00
      }
    ],
    notes: "Q1 2024 Essential antibiotics and cardio restocking - Paid via bank transfer"
  },
  {
    id: "po-gh-2024-002",
    purchaseOrderNo: "PO-2024-0145",
    supplierId: "sup-gh-3",
    supplierName: "Prime Pharma Ltd",
    orderDate: "2024-04-12",
    expectedDeliveryDate: "2024-04-15",
    receivedDate: "2024-04-15",
    dueDate: "2024-05-15",
    paymentStatus: "Paid",
    deliveryStatus: "Received",
    totalAmount: 9600.00,
    amountPaid: 9600.00,
    items: [
      {
        medicineId: "med-gh-09",
        name: "Panadol Extra Tablets (Pack of 24)",
        batchNumber: "BN-2024-PAN18",
        expiryDate: "2026-12-31",
        quantityOrdered: 400,
        quantityReceived: 400,
        unitCost: 17.50,
        totalCost: 7000.00
      },
      {
        medicineId: "med-gh-11",
        name: "Brufen 400mg Ibuprofen Tablets",
        batchNumber: "BN-2024-BRU08",
        expiryDate: "2026-11-30",
        quantityOrdered: 120,
        quantityReceived: 120,
        unitCost: 21.50,
        totalCost: 2600.00
      }
    ],
    notes: "OTC analgesics baseline replenishment"
  },
  {
    id: "po-gh-2024-003",
    purchaseOrderNo: "PO-2024-0230",
    supplierId: "sup-gh-8",
    supplierName: "MediSource Ghana",
    orderDate: "2024-07-10",
    expectedDeliveryDate: "2024-07-14",
    receivedDate: "2024-07-14",
    dueDate: "2024-08-14",
    paymentStatus: "Paid",
    deliveryStatus: "Received",
    totalAmount: 14200.00,
    amountPaid: 14200.00,
    items: [
      {
        medicineId: "med-gh-01",
        name: "Wellman Original Multivitamin",
        batchNumber: "BN-2024-WM01",
        expiryDate: "2026-07-31",
        quantityOrdered: 80,
        quantityReceived: 80,
        unitCost: 95.00,
        totalCost: 7600.00
      },
      {
        medicineId: "med-gh-02",
        name: "Wellwoman Original Multivitamin",
        batchNumber: "BN-2024-WW01",
        expiryDate: "2026-07-31",
        quantityOrdered: 65,
        quantityReceived: 65,
        unitCost: 98.00,
        totalCost: 6600.00
      }
    ],
    notes: "Vitabiotics wellness line stock replenishment"
  },
  {
    id: "po-gh-2024-004",
    purchaseOrderNo: "PO-2024-0320",
    supplierId: "sup-gh-6",
    supplierName: "West Africa Pharma Wholesale",
    orderDate: "2024-10-18",
    expectedDeliveryDate: "2024-10-22",
    receivedDate: "2024-10-22",
    dueDate: "2024-11-22",
    paymentStatus: "Paid",
    deliveryStatus: "Received",
    totalAmount: 22800.00,
    amountPaid: 22800.00,
    items: [
      {
        medicineId: "med-gh-45",
        name: "Ciprofloxacin 500mg Tablets",
        batchNumber: "BN-2024-CIP09",
        expiryDate: "2026-10-31",
        quantityOrdered: 300,
        quantityReceived: 300,
        unitCost: 28.00,
        totalCost: 8400.00
      },
      {
        medicineId: "med-gh-50",
        name: "Omeprazole 20mg Capsules",
        batchNumber: "BN-2024-OME14",
        expiryDate: "2026-12-31",
        quantityOrdered: 400,
        quantityReceived: 400,
        unitCost: 19.50,
        totalCost: 7800.00
      },
      {
        medicineId: "med-gh-10",
        name: "Cataflam 50mg Tablets",
        batchNumber: "BN-2024-CAT03",
        expiryDate: "2026-09-30",
        quantityOrdered: 160,
        quantityReceived: 160,
        unitCost: 41.25,
        totalCost: 6600.00
      }
    ],
    notes: "Q4 Year-end bulk stocking order"
  },

  // ==========================================
  // YEAR 2025 PURCHASES
  // ==========================================
  {
    id: "po-gh-2025-001",
    purchaseOrderNo: "PO-2025-0062",
    supplierId: "sup-gh-10",
    supplierName: "Atlantic Medicals Ghana",
    orderDate: "2025-01-20",
    expectedDeliveryDate: "2025-01-24",
    receivedDate: "2025-01-24",
    dueDate: "2025-02-24",
    paymentStatus: "Paid",
    deliveryStatus: "Received",
    totalAmount: 16500.00,
    amountPaid: 16500.00,
    items: [
      {
        medicineId: "med-gh-33",
        name: "Pregnacare Plus Dual Pack",
        batchNumber: "BN-2025-PG01",
        expiryDate: "2027-02-28",
        quantityOrdered: 90,
        quantityReceived: 90,
        unitCost: 115.00,
        totalCost: 10350.00
      },
      {
        medicineId: "med-gh-35",
        name: "Abidec Multivitamin Drops for Infants",
        batchNumber: "BN-2025-AB02",
        expiryDate: "2027-01-31",
        quantityOrdered: 180,
        quantityReceived: 180,
        unitCost: 34.00,
        totalCost: 6150.00
      }
    ],
    notes: "Maternity and pediatric line re-order"
  },
  {
    id: "po-gh-2025-002",
    purchaseOrderNo: "PO-2025-0140",
    supplierId: "sup-gh-2",
    supplierName: "Ghana Health Supplies Ltd",
    orderDate: "2025-03-15",
    expectedDeliveryDate: "2025-03-19",
    receivedDate: "2025-03-19",
    dueDate: "2025-04-19",
    paymentStatus: "Paid",
    deliveryStatus: "Received",
    totalAmount: 12900.00,
    amountPaid: 12900.00,
    items: [
      {
        medicineId: "med-gh-05",
        name: "Benylin 4 Flu Liquid 100ml",
        batchNumber: "BN-2025-BEN04",
        expiryDate: "2027-03-31",
        quantityOrdered: 200,
        quantityReceived: 200,
        unitCost: 38.00,
        totalCost: 7600.00
      },
      {
        medicineId: "med-gh-06",
        name: "Prospan Cough Syrup 100ml",
        batchNumber: "BN-2025-PRO02",
        expiryDate: "2027-04-30",
        quantityOrdered: 110,
        quantityReceived: 110,
        unitCost: 48.00,
        totalCost: 5300.00
      }
    ],
    notes: "Flu season preparation inventory"
  },
  {
    id: "po-gh-2025-003",
    purchaseOrderNo: "PO-2025-0210",
    supplierId: "sup-gh-7",
    supplierName: "CarePoint Distributors",
    orderDate: "2025-05-18",
    expectedDeliveryDate: "2025-05-21",
    receivedDate: "2025-05-21",
    dueDate: "2025-06-21",
    paymentStatus: "Paid",
    deliveryStatus: "Received",
    totalAmount: 18200.00,
    amountPaid: 18200.00,
    items: [
      {
        medicineId: "med-gh-47",
        name: "Ventolin Inhaler 100mcg",
        batchNumber: "BN-2025-VEN06",
        expiryDate: "2027-05-31",
        quantityOrdered: 250,
        quantityReceived: 250,
        unitCost: 45.00,
        totalCost: 11250.00
      },
      {
        medicineId: "med-gh-13",
        name: "Voltaren Emulgel 50g",
        batchNumber: "BN-2025-VOL03",
        expiryDate: "2027-06-30",
        quantityOrdered: 200,
        quantityReceived: 200,
        unitCost: 34.75,
        totalCost: 6950.00
      }
    ],
    notes: "Cold chain & asthma relief supplies"
  },
  {
    id: "po-gh-2025-004",
    purchaseOrderNo: "PO-2025-0305",
    supplierId: "sup-gh-1",
    supplierName: "MedCare Distributors Ghana",
    orderDate: "2025-08-11",
    expectedDeliveryDate: "2025-08-15",
    receivedDate: "2025-08-15",
    dueDate: "2025-09-15",
    paymentStatus: "Paid",
    deliveryStatus: "Received",
    totalAmount: 26400.00,
    amountPaid: 26400.00,
    items: [
      {
        medicineId: "med-gh-44",
        name: "Augmentin 625mg Tablets",
        batchNumber: "BN-2025-AUG08",
        expiryDate: "2027-08-31",
        quantityOrdered: 200,
        quantityReceived: 200,
        unitCost: 55.00,
        totalCost: 11000.00
      },
      {
        medicineId: "med-gh-48",
        name: "Glucophage 500mg Metformin",
        batchNumber: "BN-2025-MET11",
        expiryDate: "2027-09-30",
        quantityOrdered: 350,
        quantityReceived: 350,
        unitCost: 26.00,
        totalCost: 9100.00
      },
      {
        medicineId: "med-gh-46",
        name: "Amlodipine 10mg Tablets",
        batchNumber: "BN-2025-AML07",
        expiryDate: "2027-10-31",
        quantityOrdered: 260,
        quantityReceived: 260,
        unitCost: 24.23,
        totalCost: 6300.00
      }
    ],
    notes: "Mid-year chronic medicine restock"
  },
  {
    id: "po-gh-2025-005",
    purchaseOrderNo: "PO-2025-0388",
    supplierId: "sup-gh-8",
    supplierName: "MediSource Ghana",
    orderDate: "2025-11-04",
    expectedDeliveryDate: "2025-11-08",
    receivedDate: "2025-11-08",
    dueDate: "2025-12-08",
    paymentStatus: "Paid",
    deliveryStatus: "Received",
    totalAmount: 21500.00,
    amountPaid: 21500.00,
    items: [
      {
        medicineId: "med-gh-41",
        name: "Marine Collagen Peptides Powder 300g",
        batchNumber: "BN-2025-COL04",
        expiryDate: "2027-11-30",
        quantityOrdered: 60,
        quantityReceived: 60,
        unitCost: 190.00,
        totalCost: 11400.00
      },
      {
        medicineId: "med-gh-42",
        name: "Perfectil Triple Active Skin Hair Nails",
        batchNumber: "BN-2025-PF06",
        expiryDate: "2027-12-31",
        quantityOrdered: 90,
        quantityReceived: 90,
        unitCost: 112.00,
        totalCost: 10100.00
      }
    ],
    notes: "Beauty supplements Christmas holiday surge order"
  },

  // ==========================================
  // YEAR 2026 PURCHASES (ACTIVE PAYABLES DEMO)
  // ==========================================
  {
    id: "po-gh-2026-001",
    purchaseOrderNo: "PO-2026-0015",
    supplierId: "sup-gh-1",
    supplierName: "MedCare Distributors Ghana",
    orderDate: "2026-01-15",
    expectedDeliveryDate: "2026-01-18",
    receivedDate: "2026-01-18",
    dueDate: "2026-02-18",
    paymentStatus: "Paid",
    deliveryStatus: "Received",
    totalAmount: 18500.00,
    amountPaid: 18500.00,
    items: [
      {
        medicineId: "med-gh-44",
        name: "Augmentin 625mg Tablets",
        batchNumber: "BN-2026-AUG01",
        expiryDate: "2028-01-31",
        quantityOrdered: 120,
        quantityReceived: 120,
        unitCost: 55.00,
        totalCost: 6600.00
      },
      {
        medicineId: "med-gh-46",
        name: "Amlodipine 10mg Tablets",
        batchNumber: "BN-2026-AML02",
        expiryDate: "2028-02-28",
        quantityOrdered: 300,
        quantityReceived: 300,
        unitCost: 24.00,
        totalCost: 7200.00
      },
      {
        medicineId: "med-gh-48",
        name: "Glucophage 500mg Metformin",
        batchNumber: "BN-2026-MET03",
        expiryDate: "2028-03-31",
        quantityOrdered: 180,
        quantityReceived: 180,
        unitCost: 26.11,
        totalCost: 4700.00
      }
    ],
    notes: "Q1 2026 bulk order - Fully cleared"
  },
  {
    id: "po-gh-2026-002",
    purchaseOrderNo: "PO-2026-0048",
    supplierId: "sup-gh-4",
    supplierName: "Accra Medical Distributors",
    orderDate: "2026-03-02",
    expectedDeliveryDate: "2026-03-06",
    receivedDate: "2026-03-06",
    dueDate: "2026-04-15",
    paymentStatus: "Overdue",
    deliveryStatus: "Received",
    totalAmount: 18200.00,
    amountPaid: 0.00,
    items: [
      {
        medicineId: "med-gh-45",
        name: "Ciprofloxacin 500mg Tablets",
        batchNumber: "BN-2026-CIP01",
        expiryDate: "2028-03-31",
        quantityOrdered: 300,
        quantityReceived: 300,
        unitCost: 28.00,
        totalCost: 8400.00
      },
      {
        medicineId: "med-gh-50",
        name: "Omeprazole 20mg Capsules",
        batchNumber: "BN-2026-OME02",
        expiryDate: "2028-04-30",
        quantityOrdered: 350,
        quantityReceived: 350,
        unitCost: 19.50,
        totalCost: 6825.00
      },
      {
        medicineId: "med-gh-11",
        name: "Brufen 400mg Ibuprofen Tablets",
        batchNumber: "BN-2026-BRU02",
        expiryDate: "2028-02-28",
        quantityOrdered: 138,
        quantityReceived: 138,
        unitCost: 21.55,
        totalCost: 2975.00
      }
    ],
    notes: "Overdue supplier invoice - Pending payment approval by Accountant"
  },
  {
    id: "po-gh-2026-003",
    purchaseOrderNo: "PO-2026-0072",
    supplierId: "sup-gh-6",
    supplierName: "West Africa Pharma Wholesale",
    orderDate: "2026-05-10",
    expectedDeliveryDate: "2026-05-14",
    receivedDate: "2026-05-14",
    dueDate: "2026-06-15",
    paymentStatus: "Partial",
    deliveryStatus: "Received",
    totalAmount: 24500.00,
    amountPaid: 12000.00,
    items: [
      {
        medicineId: "med-gh-37",
        name: "Gold Standard 100% Whey Protein 2lbs",
        batchNumber: "BN-2026-WH01",
        expiryDate: "2027-10-31",
        quantityOrdered: 40,
        quantityReceived: 40,
        unitCost: 310.00,
        totalCost: 12400.00
      },
      {
        medicineId: "med-gh-38",
        name: "Optimum Nutrition Creatine Monohydrate",
        batchNumber: "BN-2026-CR01",
        expiryDate: "2027-11-30",
        quantityOrdered: 50,
        quantityReceived: 50,
        unitCost: 150.00,
        totalCost: 7500.00
      },
      {
        medicineId: "med-gh-39",
        name: "Durex Invisible Ultra Thin (Pack of 12)",
        batchNumber: "BN-2026-DX01",
        expiryDate: "2028-05-31",
        quantityOrdered: 105,
        quantityReceived: 105,
        unitCost: 43.80,
        totalCost: 4600.00
      }
    ],
    notes: "Partially settled - GH₵12,500.00 remaining due under Net 30 agreement"
  },
  {
    id: "po-gh-2026-004",
    purchaseOrderNo: "PO-2026-0095",
    supplierId: "sup-gh-1",
    supplierName: "MedCare Distributors Ghana",
    orderDate: "2026-07-22",
    expectedDeliveryDate: "2026-07-26",
    receivedDate: "2026-07-26",
    dueDate: "2026-08-25",
    paymentStatus: "Partial",
    deliveryStatus: "Received",
    totalAmount: 16500.00,
    amountPaid: 4000.00,
    items: [
      {
        medicineId: "med-gh-44",
        name: "Augmentin 625mg Tablets",
        batchNumber: "BN-2026-AUG04",
        expiryDate: "2028-07-31",
        quantityOrdered: 150,
        quantityReceived: 150,
        unitCost: 55.00,
        totalCost: 8250.00
      },
      {
        medicineId: "med-gh-10",
        name: "Cataflam 50mg Tablets",
        batchNumber: "BN-2026-CAT02",
        expiryDate: "2028-06-30",
        quantityOrdered: 200,
        quantityReceived: 200,
        unitCost: 41.25,
        totalCost: 8250.00
      }
    ],
    notes: "Outstanding payable balance of GH₵12,500.00"
  },
  {
    id: "po-gh-2026-005",
    purchaseOrderNo: "PO-2026-0112",
    supplierId: "sup-gh-8",
    supplierName: "MediSource Ghana",
    orderDate: "2026-08-15",
    expectedDeliveryDate: "2026-08-19",
    receivedDate: "2026-08-19",
    dueDate: "2026-09-30",
    paymentStatus: "Pending",
    deliveryStatus: "Received",
    totalAmount: 9500.00,
    amountPaid: 0.00,
    items: [
      {
        medicineId: "med-gh-01",
        name: "Wellman Original Multivitamin",
        batchNumber: "BN-2026-WM02",
        expiryDate: "2028-04-30",
        quantityOrdered: 50,
        quantityReceived: 50,
        unitCost: 95.00,
        totalCost: 4750.00
      },
      {
        medicineId: "med-gh-02",
        name: "Wellwoman Original Multivitamin",
        batchNumber: "BN-2026-WW02",
        expiryDate: "2028-04-30",
        quantityOrdered: 48,
        quantityReceived: 48,
        unitCost: 98.95,
        totalCost: 4750.00
      }
    ],
    notes: "Pending payment due on September 30, 2026"
  },
  {
    id: "po-gh-2026-006",
    purchaseOrderNo: "PO-2026-0128",
    supplierId: "sup-gh-3",
    supplierName: "Prime Pharma Ltd",
    orderDate: "2026-09-08",
    expectedDeliveryDate: "2026-09-12",
    receivedDate: "2026-09-12",
    dueDate: "2026-10-08",
    paymentStatus: "Pending",
    deliveryStatus: "Received",
    totalAmount: 7400.00,
    amountPaid: 0.00,
    items: [
      {
        medicineId: "med-gh-09",
        name: "Panadol Extra Tablets (Pack of 24)",
        batchNumber: "BN-2026-PAN04",
        expiryDate: "2028-08-31",
        quantityOrdered: 300,
        quantityReceived: 300,
        unitCost: 17.50,
        totalCost: 5250.00
      },
      {
        medicineId: "med-gh-11",
        name: "Brufen 400mg Ibuprofen Tablets",
        batchNumber: "BN-2026-BRU03",
        expiryDate: "2028-08-31",
        quantityOrdered: 100,
        quantityReceived: 100,
        unitCost: 21.50,
        totalCost: 2150.00
      }
    ],
    notes: "Prime Pharma Net 15 credit delivery"
  },
  {
    id: "po-gh-2026-007",
    purchaseOrderNo: "PO-2026-0135",
    supplierId: "sup-gh-7",
    supplierName: "CarePoint Distributors",
    orderDate: "2026-09-18",
    expectedDeliveryDate: "2026-09-22",
    receivedDate: "2026-09-22",
    dueDate: "2026-10-05",
    paymentStatus: "Pending",
    deliveryStatus: "Received",
    totalAmount: 4200.00,
    amountPaid: 0.00,
    items: [
      {
        medicineId: "med-gh-47",
        name: "Ventolin Inhaler 100mcg",
        batchNumber: "BN-2026-VEN02",
        expiryDate: "2028-09-30",
        quantityOrdered: 60,
        quantityReceived: 60,
        unitCost: 45.00,
        totalCost: 2700.00
      },
      {
        medicineId: "med-gh-13",
        name: "Voltaren Emulgel 50g",
        batchNumber: "BN-2026-VOL02",
        expiryDate: "2028-09-30",
        quantityOrdered: 43,
        quantityReceived: 43,
        unitCost: 34.88,
        totalCost: 1500.00
      }
    ],
    notes: "Cold chain inhalers and topicals delivered"
  },
  {
    id: "po-gh-2026-008",
    purchaseOrderNo: "PO-2026-0142",
    supplierId: "sup-gh-10",
    supplierName: "Atlantic Medicals Ghana",
    orderDate: "2026-09-21",
    expectedDeliveryDate: "2026-09-24",
    receivedDate: "2026-09-24",
    dueDate: "2026-10-21",
    paymentStatus: "Pending",
    deliveryStatus: "Received",
    totalAmount: 5800.00,
    amountPaid: 0.00,
    items: [
      {
        medicineId: "med-gh-33",
        name: "Pregnacare Plus Dual Pack",
        batchNumber: "BN-2026-PG03",
        expiryDate: "2028-08-31",
        quantityOrdered: 35,
        quantityReceived: 35,
        unitCost: 115.00,
        totalCost: 4025.00
      },
      {
        medicineId: "med-gh-34",
        name: "Fefol Spansule Iron & Folic Acid",
        batchNumber: "BN-2026-FEF02",
        expiryDate: "2028-07-31",
        quantityOrdered: 60,
        quantityReceived: 60,
        unitCost: 29.58,
        totalCost: 1775.00
      }
    ],
    notes: "Prenatal line restock - due Net 30"
  }
];
