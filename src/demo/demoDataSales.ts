import { Sale, SaleItem } from '../types';

// Helper to construct sales consistently
export const demoSales: Sale[] = [
  // ==========================================
  // YEAR 2024 (HISTORICAL BASELINE)
  // ==========================================
  {
    id: "sale-gh-2024-001",
    invoiceNo: "INV-2024-0104",
    customerId: "cust-gh-01",
    customerName: "Kwame Mensah",
    customerPhone: "+233 24 411 2233",
    items: [
      {
        medicineId: "med-gh-01",
        barcode: "60010010001",
        name: "Wellman Original Multivitamin",
        genericName: "Micronutrients with Ginseng & CoQ10",
        dosageForm: "Tablet",
        unitPrice: 145.00,
        quantity: 2,
        discount: 0,
        total: 290.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-03",
        barcode: "60010010003",
        name: "Seven Seas Cod Liver Oil Plus Omega-3",
        genericName: "Omega-3 with Vitamin D & E",
        dosageForm: "Capsule",
        unitPrice: 95.00,
        quantity: 1,
        discount: 0,
        total: 95.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 385.00,
    taxAmount: 57.75,
    discountAmount: 0.00,
    grandTotal: 442.75,
    paymentMethod: "Mobile Payment",
    amountPaid: 442.75,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2024-02-14 10:24:00"
  },
  {
    id: "sale-gh-2024-002",
    invoiceNo: "INV-2024-0182",
    customerId: "cust-gh-03",
    customerName: "Kofi Poku",
    customerPhone: "+233 20 633 4455",
    items: [
      {
        medicineId: "med-gh-48",
        barcode: "60010010048",
        name: "Glucophage 500mg Metformin",
        genericName: "Metformin Hydrochloride",
        dosageForm: "Tablet",
        unitPrice: 42.00,
        quantity: 3,
        discount: 0,
        total: 126.00,
        isPrescriptionRequired: true
      },
      {
        medicineId: "med-gh-46",
        barcode: "60010010046",
        name: "Amlodipine 10mg Tablets",
        genericName: "Amlodipine Besylate",
        dosageForm: "Tablet",
        unitPrice: 38.00,
        quantity: 2,
        discount: 0,
        total: 76.00,
        isPrescriptionRequired: true
      }
    ],
    subtotal: 202.00,
    taxAmount: 30.30,
    discountAmount: 5.00,
    grandTotal: 227.30,
    paymentMethod: "Cash",
    amountPaid: 250.00,
    changeGiven: 22.70,
    status: "Completed",
    cashierName: "Ama Boateng",
    createdAt: "2024-03-10 14:15:00",
    prescriptionNo: "RX-2024-0012"
  },
  {
    id: "sale-gh-2024-003",
    invoiceNo: "INV-2024-0245",
    customerId: "cust-gh-02",
    customerName: "Akosua Frimpong",
    customerPhone: "+233 24 522 3344",
    items: [
      {
        medicineId: "med-gh-02",
        barcode: "60010010002",
        name: "Wellwoman Original Multivitamin",
        genericName: "Vitamins B6, B12, Iron & Evening Primrose",
        dosageForm: "Capsule",
        unitPrice: 150.00,
        quantity: 1,
        discount: 0,
        total: 150.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-33",
        barcode: "60010010033",
        name: "Pregnacare Plus Dual Pack",
        genericName: "Multivitamin with Omega-3 DHA",
        dosageForm: "Tablet/Capsule",
        unitPrice: 175.00,
        quantity: 1,
        discount: 0,
        total: 175.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 325.00,
    taxAmount: 48.75,
    discountAmount: 10.00,
    grandTotal: 363.75,
    paymentMethod: "Credit Card",
    amountPaid: 363.75,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Grace Asante",
    createdAt: "2024-04-18 11:42:00"
  },
  {
    id: "sale-gh-2024-004",
    invoiceNo: "INV-2024-0311",
    customerName: "Walk-in Customer",
    items: [
      {
        medicineId: "med-gh-09",
        barcode: "60010010009",
        name: "Panadol Extra Tablets (Pack of 24)",
        genericName: "Paracetamol 500mg + Caffeine 65mg",
        dosageForm: "Tablet",
        unitPrice: 28.00,
        quantity: 2,
        discount: 0,
        total: 56.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-05",
        barcode: "60010010005",
        name: "Benylin 4 Flu Liquid 100ml",
        genericName: "Diphenhydramine, Pseudoephedrine, Paracetamol",
        dosageForm: "Syrup",
        unitPrice: 58.00,
        quantity: 1,
        discount: 0,
        total: 58.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 114.00,
    taxAmount: 17.10,
    discountAmount: 0.00,
    grandTotal: 131.10,
    paymentMethod: "Cash",
    amountPaid: 150.00,
    changeGiven: 18.90,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2024-05-22 09:18:00"
  },
  {
    id: "sale-gh-2024-005",
    invoiceNo: "INV-2024-0402",
    customerId: "cust-gh-06",
    customerName: "Kweku Boateng",
    customerPhone: "+233 24 966 7788",
    items: [
      {
        medicineId: "med-gh-10",
        barcode: "60010010010",
        name: "Cataflam 50mg Tablets",
        genericName: "Diclofenac Potassium 50mg",
        dosageForm: "Tablet",
        unitPrice: 65.00,
        quantity: 2,
        discount: 0,
        total: 130.00,
        isPrescriptionRequired: true
      },
      {
        medicineId: "med-gh-50",
        barcode: "60010010050",
        name: "Omeprazole 20mg Capsules",
        genericName: "Omeprazole",
        dosageForm: "Capsule",
        unitPrice: 32.00,
        quantity: 2,
        discount: 0,
        total: 64.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 194.00,
    taxAmount: 29.10,
    discountAmount: 0.00,
    grandTotal: 223.10,
    paymentMethod: "Mobile Payment",
    amountPaid: 223.10,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Ama Boateng",
    createdAt: "2024-06-30 16:35:00",
    prescriptionNo: "RX-2024-0038"
  },
  {
    id: "sale-gh-2024-006",
    invoiceNo: "INV-2024-0498",
    customerId: "cust-gh-08",
    customerName: "Yaw Darko",
    customerPhone: "+233 24 288 9900",
    items: [
      {
        medicineId: "med-gh-44",
        barcode: "60010010044",
        name: "Augmentin 625mg Tablets",
        genericName: "Amoxicillin + Clavulanic Acid 625mg",
        dosageForm: "Tablet",
        unitPrice: 85.00,
        quantity: 2,
        discount: 0,
        total: 170.00,
        isPrescriptionRequired: true
      }
    ],
    subtotal: 170.00,
    taxAmount: 25.50,
    discountAmount: 0.00,
    grandTotal: 195.50,
    paymentMethod: "Insurance",
    amountPaid: 195.50,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2024-07-15 11:10:00",
    prescriptionNo: "RX-2024-0056"
  },
  {
    id: "sale-gh-2024-007",
    invoiceNo: "INV-2024-0570",
    customerId: "cust-gh-09",
    customerName: "Esi Badu",
    customerPhone: "+233 20 399 0011",
    items: [
      {
        medicineId: "med-gh-35",
        barcode: "60010010035",
        name: "Abidec Multivitamin Drops for Infants",
        genericName: "Pediatric Vitamins A, B, C, D",
        dosageForm: "Drops",
        unitPrice: 55.00,
        quantity: 2,
        discount: 0,
        total: 110.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-36",
        barcode: "60010010036",
        name: "Calpol Infant Suspension 100ml",
        genericName: "Paracetamol 120mg/5ml",
        dosageForm: "Syrup",
        unitPrice: 42.00,
        quantity: 1,
        discount: 0,
        total: 42.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 152.00,
    taxAmount: 22.80,
    discountAmount: 0.00,
    grandTotal: 174.80,
    paymentMethod: "Mobile Payment",
    amountPaid: 174.80,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Grace Asante",
    createdAt: "2024-08-20 15:45:00"
  },
  {
    id: "sale-gh-2024-008",
    invoiceNo: "INV-2024-0644",
    customerId: "cust-gh-10",
    customerName: "Kofi Annan",
    customerPhone: "+233 27 400 1122",
    items: [
      {
        medicineId: "med-gh-42",
        barcode: "60010010042",
        name: "Perfectil Triple Active Skin Hair Nails",
        genericName: "Micronutrients with Minerals & Botanical Extracts",
        dosageForm: "Tablet",
        unitPrice: 165.00,
        quantity: 1,
        discount: 0,
        total: 165.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 165.00,
    taxAmount: 24.75,
    discountAmount: 5.00,
    grandTotal: 184.75,
    paymentMethod: "Credit Card",
    amountPaid: 184.75,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2024-09-12 13:20:00"
  },
  {
    id: "sale-gh-2024-009",
    invoiceNo: "INV-2024-0731",
    customerName: "Walk-in Customer",
    items: [
      {
        medicineId: "med-gh-07",
        barcode: "60010010007",
        name: "Strepsils Honey & Lemon (Pack of 24)",
        genericName: "Dichlorobenzyl Alcohol, Amylmetacresol",
        dosageForm: "Lozenges",
        unitPrice: 35.00,
        quantity: 3,
        discount: 0,
        total: 105.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 105.00,
    taxAmount: 15.75,
    discountAmount: 0.00,
    grandTotal: 120.75,
    paymentMethod: "Cash",
    amountPaid: 130.00,
    changeGiven: 9.25,
    status: "Completed",
    cashierName: "Ama Boateng",
    createdAt: "2024-10-05 17:05:00"
  },
  {
    id: "sale-gh-2024-010",
    invoiceNo: "INV-2024-0820",
    customerId: "cust-gh-04",
    customerName: "Abena Osei",
    customerPhone: "+233 27 744 5566",
    items: [
      {
        medicineId: "med-gh-47",
        barcode: "60010010047",
        name: "Ventolin Inhaler 100mcg",
        genericName: "Salbutamol Sulphate",
        dosageForm: "Inhaler",
        unitPrice: 68.00,
        quantity: 2,
        discount: 0,
        total: 136.00,
        isPrescriptionRequired: true
      },
      {
        medicineId: "med-gh-04",
        barcode: "60010010004",
        name: "Redoxon Vitamin C 1000mg Effervescent",
        genericName: "Ascorbic Acid + Zinc",
        dosageForm: "Effervescent",
        unitPrice: 48.00,
        quantity: 1,
        discount: 0,
        total: 48.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 184.00,
    taxAmount: 27.60,
    discountAmount: 0.00,
    grandTotal: 211.60,
    paymentMethod: "Mobile Payment",
    amountPaid: 211.60,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2024-11-18 10:50:00",
    prescriptionNo: "RX-2024-0089"
  },
  {
    id: "sale-gh-2024-011",
    invoiceNo: "INV-2024-0914",
    customerId: "cust-gh-05",
    customerName: "Nana Kwame Addo",
    customerPhone: "+233 20 855 6677",
    items: [
      {
        medicineId: "med-gh-13",
        barcode: "60010010013",
        name: "Voltaren Emulgel 50g",
        genericName: "Diclofenac Diethylamine 1.16%",
        dosageForm: "Gel",
        unitPrice: 52.00,
        quantity: 2,
        discount: 0,
        total: 104.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-11",
        barcode: "60010010011",
        name: "Brufen 400mg Ibuprofen Tablets",
        genericName: "Ibuprofen 400mg",
        dosageForm: "Tablet",
        unitPrice: 35.00,
        quantity: 2,
        discount: 0,
        total: 70.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 174.00,
    taxAmount: 26.10,
    discountAmount: 4.00,
    grandTotal: 196.10,
    paymentMethod: "Debit Card",
    amountPaid: 196.10,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Ama Boateng",
    createdAt: "2024-12-08 15:30:00"
  },
  {
    id: "sale-gh-2024-012",
    invoiceNo: "INV-2024-0988",
    customerId: "cust-gh-07",
    customerName: "Afia Serwaa",
    customerPhone: "+233 20 177 8899",
    items: [
      {
        medicineId: "med-gh-43",
        barcode: "60010010043",
        name: "Biotin 10,000mcg Maximum Strength",
        genericName: "Pure Biotin (Vitamin B7)",
        dosageForm: "Capsule",
        unitPrice: 120.00,
        quantity: 1,
        discount: 0,
        total: 120.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-01",
        barcode: "60010010001",
        name: "Wellman Original Multivitamin",
        genericName: "Micronutrients with Ginseng & CoQ10",
        dosageForm: "Tablet",
        unitPrice: 145.00,
        quantity: 1,
        discount: 0,
        total: 145.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 265.00,
    taxAmount: 39.75,
    discountAmount: 10.00,
    grandTotal: 294.75,
    paymentMethod: "Mobile Payment",
    amountPaid: 294.75,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Grace Asante",
    createdAt: "2024-12-28 12:10:00"
  },

  // ==========================================
  // YEAR 2025 (EXPANSION YEAR)
  // ==========================================
  {
    id: "sale-gh-2025-001",
    invoiceNo: "INV-2025-0102",
    customerId: "cust-gh-11",
    customerName: "Doreen Asamoah",
    customerPhone: "+233 24 511 2233",
    items: [
      {
        medicineId: "med-gh-33",
        barcode: "60010010033",
        name: "Pregnacare Plus Dual Pack",
        genericName: "Multivitamin with Omega-3 DHA",
        dosageForm: "Tablet/Capsule",
        unitPrice: 175.00,
        quantity: 2,
        discount: 0,
        total: 350.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-34",
        barcode: "60010010034",
        name: "Fefol Spansule Iron & Folic Acid",
        genericName: "Dried Ferrous Sulphate + Folic Acid",
        dosageForm: "Capsule",
        unitPrice: 45.00,
        quantity: 2,
        discount: 0,
        total: 90.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 440.00,
    taxAmount: 66.00,
    discountAmount: 15.00,
    grandTotal: 491.00,
    paymentMethod: "Mobile Payment",
    amountPaid: 491.00,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2025-01-14 11:20:00"
  },
  {
    id: "sale-gh-2025-002",
    invoiceNo: "INV-2025-0219",
    customerId: "cust-gh-12",
    customerName: "Emmanuel Tetteh",
    customerPhone: "+233 20 622 3344",
    items: [
      {
        medicineId: "med-gh-15",
        barcode: "60010010015",
        name: "Men's Prostate Defense Complex",
        genericName: "Saw Palmetto, Pygeum & Zinc",
        dosageForm: "Capsule",
        unitPrice: 135.00,
        quantity: 1,
        discount: 0,
        total: 135.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-16",
        barcode: "60010010016",
        name: "Testosterone Support Formula",
        genericName: "Fenugreek, Ashwagandha, Vitamin D3 & Zinc",
        dosageForm: "Capsule",
        unitPrice: 160.00,
        quantity: 1,
        discount: 0,
        total: 160.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 295.00,
    taxAmount: 44.25,
    discountAmount: 10.00,
    grandTotal: 329.25,
    paymentMethod: "Credit Card",
    amountPaid: 329.25,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Ama Boateng",
    createdAt: "2025-02-18 16:40:00"
  },
  {
    id: "sale-gh-2025-003",
    invoiceNo: "INV-2025-0340",
    customerId: "cust-gh-13",
    customerName: "Linda Kwarteng",
    customerPhone: "+233 27 733 4455",
    items: [
      {
        medicineId: "med-gh-21",
        barcode: "60010010021",
        name: "Evening Primrose Oil 1000mg",
        genericName: "Gamma-Linolenic Acid (GLA)",
        dosageForm: "Capsule",
        unitPrice: 85.00,
        quantity: 2,
        discount: 0,
        total: 170.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-22",
        barcode: "60010010022",
        name: "Menopace Original Tablets",
        genericName: "Nutrient Formula with Soya Isoflavones",
        dosageForm: "Tablet",
        unitPrice: 140.00,
        quantity: 1,
        discount: 0,
        total: 140.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 310.00,
    taxAmount: 46.50,
    discountAmount: 0.00,
    grandTotal: 356.50,
    paymentMethod: "Mobile Payment",
    amountPaid: 356.50,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2025-03-24 14:15:00"
  },
  {
    id: "sale-gh-2025-004",
    invoiceNo: "INV-2025-0455",
    customerName: "Walk-in Customer",
    items: [
      {
        medicineId: "med-gh-09",
        barcode: "60010010009",
        name: "Panadol Extra Tablets (Pack of 24)",
        genericName: "Paracetamol 500mg + Caffeine 65mg",
        dosageForm: "Tablet",
        unitPrice: 28.00,
        quantity: 3,
        discount: 0,
        total: 84.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-06",
        barcode: "60010010006",
        name: "Prospan Cough Syrup 100ml",
        genericName: "Dried Ivy Leaf Extract",
        dosageForm: "Syrup",
        unitPrice: 72.00,
        quantity: 1,
        discount: 0,
        total: 72.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 156.00,
    taxAmount: 23.40,
    discountAmount: 0.00,
    grandTotal: 179.40,
    paymentMethod: "Cash",
    amountPaid: 200.00,
    changeGiven: 20.60,
    status: "Completed",
    cashierName: "Grace Asante",
    createdAt: "2025-04-12 10:05:00"
  },
  {
    id: "sale-gh-2025-005",
    invoiceNo: "INV-2025-0588",
    customerId: "cust-gh-03",
    customerName: "Kofi Poku",
    customerPhone: "+233 20 633 4455",
    items: [
      {
        medicineId: "med-gh-48",
        barcode: "60010010048",
        name: "Glucophage 500mg Metformin",
        genericName: "Metformin Hydrochloride",
        dosageForm: "Tablet",
        unitPrice: 42.00,
        quantity: 4,
        discount: 0,
        total: 168.00,
        isPrescriptionRequired: true
      },
      {
        medicineId: "med-gh-46",
        barcode: "60010010046",
        name: "Amlodipine 10mg Tablets",
        genericName: "Amlodipine Besylate",
        dosageForm: "Tablet",
        unitPrice: 38.00,
        quantity: 3,
        discount: 0,
        total: 114.00,
        isPrescriptionRequired: true
      }
    ],
    subtotal: 282.00,
    taxAmount: 42.30,
    discountAmount: 10.00,
    grandTotal: 314.30,
    paymentMethod: "Mobile Payment",
    amountPaid: 314.30,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Ama Boateng",
    createdAt: "2025-05-19 15:30:00",
    prescriptionNo: "RX-2025-0045"
  },
  {
    id: "sale-gh-2025-006",
    invoiceNo: "INV-2025-0712",
    customerId: "cust-gh-14",
    customerName: "Samuel Boadu",
    customerPhone: "+233 24 844 5566",
    items: [
      {
        medicineId: "med-gh-37",
        barcode: "60010010037",
        name: "Gold Standard 100% Whey Protein 2lbs",
        genericName: "Whey Protein Isolate & Concentrate",
        dosageForm: "Powder",
        unitPrice: 450.00,
        quantity: 1,
        discount: 0,
        total: 450.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-38",
        barcode: "60010010038",
        name: "Optimum Nutrition Creatine Monohydrate",
        genericName: "Micronized Creatine Powder",
        dosageForm: "Powder",
        unitPrice: 220.00,
        quantity: 1,
        discount: 0,
        total: 220.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 670.00,
    taxAmount: 100.50,
    discountAmount: 20.00,
    grandTotal: 750.50,
    paymentMethod: "Credit Card",
    amountPaid: 750.50,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2025-06-25 18:20:00"
  },
  {
    id: "sale-gh-2025-007",
    invoiceNo: "INV-2025-0845",
    customerId: "cust-gh-15",
    customerName: "Mercy Adjei",
    customerPhone: "+233 20 955 6677",
    items: [
      {
        medicineId: "med-gh-41",
        barcode: "60010010041",
        name: "Marine Collagen Peptides Powder 300g",
        genericName: "Hydrolyzed Marine Collagen + Hyaluronic Acid",
        dosageForm: "Powder",
        unitPrice: 280.00,
        quantity: 1,
        discount: 0,
        total: 280.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-42",
        barcode: "60010010042",
        name: "Perfectil Triple Active Skin Hair Nails",
        genericName: "Micronutrients with Minerals & Botanical Extracts",
        dosageForm: "Tablet",
        unitPrice: 165.00,
        quantity: 1,
        discount: 0,
        total: 165.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 445.00,
    taxAmount: 66.75,
    discountAmount: 15.00,
    grandTotal: 496.75,
    paymentMethod: "Mobile Payment",
    amountPaid: 496.75,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Grace Asante",
    createdAt: "2025-07-28 13:40:00"
  },
  {
    id: "sale-gh-2025-008",
    invoiceNo: "INV-2025-0990",
    customerId: "cust-gh-16",
    customerName: "Isaac Gyan",
    customerPhone: "+233 24 166 7788",
    items: [
      {
        medicineId: "med-gh-44",
        barcode: "60010010044",
        name: "Augmentin 625mg Tablets",
        genericName: "Amoxicillin + Clavulanic Acid 625mg",
        dosageForm: "Tablet",
        unitPrice: 85.00,
        quantity: 2,
        discount: 0,
        total: 170.00,
        isPrescriptionRequired: true
      },
      {
        medicineId: "med-gh-10",
        barcode: "60010010010",
        name: "Cataflam 50mg Tablets",
        genericName: "Diclofenac Potassium 50mg",
        dosageForm: "Tablet",
        unitPrice: 65.00,
        quantity: 1,
        discount: 0,
        total: 65.00,
        isPrescriptionRequired: true
      }
    ],
    subtotal: 235.00,
    taxAmount: 35.25,
    discountAmount: 0.00,
    grandTotal: 270.25,
    paymentMethod: "Insurance",
    amountPaid: 270.25,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2025-08-30 09:45:00",
    prescriptionNo: "RX-2025-0092"
  },
  {
    id: "sale-gh-2025-009",
    invoiceNo: "INV-2025-1120",
    customerId: "cust-gh-17",
    customerName: "Beatrice Ofori",
    customerPhone: "+233 20 277 8899",
    items: [
      {
        medicineId: "med-gh-02",
        barcode: "60010010002",
        name: "Wellwoman Original Multivitamin",
        genericName: "Vitamins B6, B12, Iron & Evening Primrose",
        dosageForm: "Capsule",
        unitPrice: 150.00,
        quantity: 2,
        discount: 0,
        total: 300.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-04",
        barcode: "60010010004",
        name: "Redoxon Vitamin C 1000mg Effervescent",
        genericName: "Ascorbic Acid + Zinc",
        dosageForm: "Effervescent",
        unitPrice: 48.00,
        quantity: 2,
        discount: 0,
        total: 96.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 396.00,
    taxAmount: 59.40,
    discountAmount: 10.00,
    grandTotal: 445.40,
    paymentMethod: "Mobile Payment",
    amountPaid: 445.40,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Ama Boateng",
    createdAt: "2025-09-18 16:15:00"
  },
  {
    id: "sale-gh-2025-010",
    invoiceNo: "INV-2025-1250",
    customerId: "cust-gh-18",
    customerName: "Prince Arthur",
    customerPhone: "+233 27 388 9900",
    items: [
      {
        medicineId: "med-gh-39",
        barcode: "60010010039",
        name: "Durex Invisible Ultra Thin (Pack of 12)",
        genericName: "Natural Rubber Latex Condoms",
        dosageForm: "Device",
        unitPrice: 65.00,
        quantity: 2,
        discount: 0,
        total: 130.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-40",
        barcode: "60010010040",
        name: "KY Jelly Personal Lubricant 100g",
        genericName: "Sterile Water Soluble Jelly",
        dosageForm: "Gel",
        unitPrice: 45.00,
        quantity: 1,
        discount: 0,
        total: 45.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 175.00,
    taxAmount: 26.25,
    discountAmount: 0.00,
    grandTotal: 201.25,
    paymentMethod: "Cash",
    amountPaid: 210.00,
    changeGiven: 8.75,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2025-10-22 19:30:00"
  },
  {
    id: "sale-gh-2025-011",
    invoiceNo: "INV-2025-1390",
    customerId: "cust-gh-01",
    customerName: "Kwame Mensah",
    customerPhone: "+233 24 411 2233",
    items: [
      {
        medicineId: "med-gh-46",
        barcode: "60010010046",
        name: "Amlodipine 10mg Tablets",
        genericName: "Amlodipine Besylate",
        dosageForm: "Tablet",
        unitPrice: 38.00,
        quantity: 3,
        discount: 0,
        total: 114.00,
        isPrescriptionRequired: true
      },
      {
        medicineId: "med-gh-01",
        barcode: "60010010001",
        name: "Wellman Original Multivitamin",
        genericName: "Micronutrients with Ginseng & CoQ10",
        dosageForm: "Tablet",
        unitPrice: 145.00,
        quantity: 1,
        discount: 0,
        total: 145.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 259.00,
    taxAmount: 38.85,
    discountAmount: 0.00,
    grandTotal: 297.85,
    paymentMethod: "Mobile Payment",
    amountPaid: 297.85,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2025-11-15 11:05:00",
    prescriptionNo: "RX-2025-0118"
  },
  {
    id: "sale-gh-2025-012",
    invoiceNo: "INV-2025-1520",
    customerId: "cust-gh-20",
    customerName: "Justice Appau",
    customerPhone: "+233 20 500 1122",
    items: [
      {
        medicineId: "med-gh-09",
        barcode: "60010010009",
        name: "Panadol Extra Tablets (Pack of 24)",
        genericName: "Paracetamol 500mg + Caffeine 65mg",
        dosageForm: "Tablet",
        unitPrice: 28.00,
        quantity: 4,
        discount: 0,
        total: 112.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-05",
        barcode: "60010010005",
        name: "Benylin 4 Flu Liquid 100ml",
        genericName: "Diphenhydramine, Pseudoephedrine, Paracetamol",
        dosageForm: "Syrup",
        unitPrice: 58.00,
        quantity: 2,
        discount: 0,
        total: 116.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 228.00,
    taxAmount: 34.20,
    discountAmount: 8.00,
    grandTotal: 254.20,
    paymentMethod: "Cash",
    amountPaid: 260.00,
    changeGiven: 5.80,
    status: "Completed",
    cashierName: "Grace Asante",
    createdAt: "2025-12-24 17:15:00"
  },

  // ==========================================
  // YEAR 2026 (CURRENT ACTIVE YEAR - HIGHER VOLUME)
  // ==========================================
  {
    id: "sale-gh-2026-001",
    invoiceNo: "INV-2026-0014",
    customerId: "cust-gh-02",
    customerName: "Akosua Frimpong",
    customerPhone: "+233 24 522 3344",
    items: [
      {
        medicineId: "med-gh-02",
        barcode: "60010010002",
        name: "Wellwoman Original Multivitamin",
        genericName: "Vitamins B6, B12, Iron & Evening Primrose",
        dosageForm: "Capsule",
        unitPrice: 150.00,
        quantity: 2,
        discount: 0,
        total: 300.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-42",
        barcode: "60010010042",
        name: "Perfectil Triple Active Skin Hair Nails",
        genericName: "Micronutrients with Minerals & Botanical Extracts",
        dosageForm: "Tablet",
        unitPrice: 165.00,
        quantity: 1,
        discount: 0,
        total: 165.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 465.00,
    taxAmount: 69.75,
    discountAmount: 15.00,
    grandTotal: 519.75,
    paymentMethod: "Mobile Payment",
    amountPaid: 519.75,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2026-01-08 10:14:00"
  },
  {
    id: "sale-gh-2026-002",
    invoiceNo: "INV-2026-0045",
    customerId: "cust-gh-21",
    customerName: "Constance Boakye",
    customerPhone: "+233 24 611 2233",
    items: [
      {
        medicineId: "med-gh-33",
        barcode: "60010010033",
        name: "Pregnacare Plus Dual Pack",
        genericName: "Multivitamin with Omega-3 DHA",
        dosageForm: "Tablet/Capsule",
        unitPrice: 175.00,
        quantity: 2,
        discount: 0,
        total: 350.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-35",
        barcode: "60010010035",
        name: "Abidec Multivitamin Drops for Infants",
        genericName: "Pediatric Vitamins A, B, C, D",
        dosageForm: "Drops",
        unitPrice: 55.00,
        quantity: 2,
        discount: 0,
        total: 110.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 460.00,
    taxAmount: 69.00,
    discountAmount: 20.00,
    grandTotal: 509.00,
    paymentMethod: "Mobile Payment",
    amountPaid: 509.00,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Ama Boateng",
    createdAt: "2026-01-20 14:40:00"
  },
  {
    id: "sale-gh-2026-003",
    invoiceNo: "INV-2026-0082",
    customerId: "cust-gh-22",
    customerName: "Gideon Lamptey",
    customerPhone: "+233 20 722 3344",
    items: [
      {
        medicineId: "med-gh-45",
        barcode: "60010010045",
        name: "Ciprofloxacin 500mg Tablets",
        genericName: "Ciprofloxacin Hydrochloride",
        dosageForm: "Tablet",
        unitPrice: 45.00,
        quantity: 2,
        discount: 0,
        total: 90.00,
        isPrescriptionRequired: true
      },
      {
        medicineId: "med-gh-10",
        barcode: "60010010010",
        name: "Cataflam 50mg Tablets",
        genericName: "Diclofenac Potassium 50mg",
        dosageForm: "Tablet",
        unitPrice: 65.00,
        quantity: 1,
        discount: 0,
        total: 65.00,
        isPrescriptionRequired: true
      }
    ],
    subtotal: 155.00,
    taxAmount: 23.25,
    discountAmount: 0.00,
    grandTotal: 178.25,
    paymentMethod: "Cash",
    amountPaid: 200.00,
    changeGiven: 21.75,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2026-02-05 11:25:00",
    prescriptionNo: "RX-2026-0015"
  },
  {
    id: "sale-gh-2026-004",
    invoiceNo: "INV-2026-0118",
    customerId: "cust-gh-23",
    customerName: "Priscilla Quaye",
    customerPhone: "+233 27 833 4455",
    items: [
      {
        medicineId: "med-gh-41",
        barcode: "60010010041",
        name: "Marine Collagen Peptides Powder 300g",
        genericName: "Hydrolyzed Marine Collagen + Hyaluronic Acid",
        dosageForm: "Powder",
        unitPrice: 280.00,
        quantity: 2,
        discount: 0,
        total: 560.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-43",
        barcode: "60010010043",
        name: "Biotin 10,000mcg Maximum Strength",
        genericName: "Pure Biotin (Vitamin B7)",
        dosageForm: "Capsule",
        unitPrice: 120.00,
        quantity: 1,
        discount: 0,
        total: 120.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 680.00,
    taxAmount: 102.00,
    discountAmount: 25.00,
    grandTotal: 757.00,
    paymentMethod: "Credit Card",
    amountPaid: 757.00,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Grace Asante",
    createdAt: "2026-02-17 15:50:00"
  },
  {
    id: "sale-gh-2026-005",
    invoiceNo: "INV-2026-0155",
    customerId: "cust-gh-03",
    customerName: "Kofi Poku",
    customerPhone: "+233 20 633 4455",
    items: [
      {
        medicineId: "med-gh-48",
        barcode: "60010010048",
        name: "Glucophage 500mg Metformin",
        genericName: "Metformin Hydrochloride",
        dosageForm: "Tablet",
        unitPrice: 42.00,
        quantity: 4,
        discount: 0,
        total: 168.00,
        isPrescriptionRequired: true
      },
      {
        medicineId: "med-gh-46",
        barcode: "60010010046",
        name: "Amlodipine 10mg Tablets",
        genericName: "Amlodipine Besylate",
        dosageForm: "Tablet",
        unitPrice: 38.00,
        quantity: 4,
        discount: 0,
        total: 152.00,
        isPrescriptionRequired: true
      }
    ],
    subtotal: 320.00,
    taxAmount: 48.00,
    discountAmount: 10.00,
    grandTotal: 358.00,
    paymentMethod: "Mobile Payment",
    amountPaid: 358.00,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Ama Boateng",
    createdAt: "2026-03-02 09:15:00",
    prescriptionNo: "RX-2026-0032"
  },
  {
    id: "sale-gh-2026-006",
    invoiceNo: "INV-2026-0199",
    customerId: "cust-gh-24",
    customerName: "Benjamin Aidoo",
    customerPhone: "+233 24 944 5566",
    items: [
      {
        medicineId: "med-gh-37",
        barcode: "60010010037",
        name: "Gold Standard 100% Whey Protein 2lbs",
        genericName: "Whey Protein Isolate & Concentrate",
        dosageForm: "Powder",
        unitPrice: 450.00,
        quantity: 1,
        discount: 0,
        total: 450.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-01",
        barcode: "60010010001",
        name: "Wellman Original Multivitamin",
        genericName: "Micronutrients with Ginseng & CoQ10",
        dosageForm: "Tablet",
        unitPrice: 145.00,
        quantity: 1,
        discount: 0,
        total: 145.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 595.00,
    taxAmount: 89.25,
    discountAmount: 15.00,
    grandTotal: 669.25,
    paymentMethod: "Mobile Payment",
    amountPaid: 669.25,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2026-03-18 16:30:00"
  },
  {
    id: "sale-gh-2026-007",
    invoiceNo: "INV-2026-0240",
    customerName: "Walk-in Customer",
    items: [
      {
        medicineId: "med-gh-09",
        barcode: "60010010009",
        name: "Panadol Extra Tablets (Pack of 24)",
        genericName: "Paracetamol 500mg + Caffeine 65mg",
        dosageForm: "Tablet",
        unitPrice: 28.00,
        quantity: 2,
        discount: 0,
        total: 56.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-07",
        barcode: "60010010007",
        name: "Strepsils Honey & Lemon (Pack of 24)",
        genericName: "Dichlorobenzyl Alcohol, Amylmetacresol",
        dosageForm: "Lozenges",
        unitPrice: 35.00,
        quantity: 2,
        discount: 0,
        total: 70.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-04",
        barcode: "60010010004",
        name: "Redoxon Vitamin C 1000mg Effervescent",
        genericName: "Ascorbic Acid + Zinc",
        dosageForm: "Effervescent",
        unitPrice: 48.00,
        quantity: 1,
        discount: 0,
        total: 48.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 174.00,
    taxAmount: 26.10,
    discountAmount: 0.00,
    grandTotal: 200.10,
    paymentMethod: "Cash",
    amountPaid: 210.00,
    changeGiven: 9.90,
    status: "Completed",
    cashierName: "Ama Boateng",
    createdAt: "2026-04-09 11:45:00"
  },
  {
    id: "sale-gh-2026-008",
    invoiceNo: "INV-2026-0298",
    customerId: "cust-gh-25",
    customerName: "Harriet Mensah",
    customerPhone: "+233 20 055 6677",
    items: [
      {
        medicineId: "med-gh-22",
        barcode: "60010010022",
        name: "Menopace Original Tablets",
        genericName: "Nutrient Formula with Soya Isoflavones",
        dosageForm: "Tablet",
        unitPrice: 140.00,
        quantity: 2,
        discount: 0,
        total: 280.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-03",
        barcode: "60010010003",
        name: "Seven Seas Cod Liver Oil Plus Omega-3",
        genericName: "Omega-3 with Vitamin D & E",
        dosageForm: "Capsule",
        unitPrice: 95.00,
        quantity: 1,
        discount: 0,
        total: 95.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 375.00,
    taxAmount: 56.25,
    discountAmount: 10.00,
    grandTotal: 421.25,
    paymentMethod: "Debit Card",
    amountPaid: 421.25,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Grace Asante",
    createdAt: "2026-05-04 14:10:00"
  },
  {
    id: "sale-gh-2026-009",
    invoiceNo: "INV-2026-0352",
    customerId: "cust-gh-26",
    customerName: "Collins Okyere",
    customerPhone: "+233 24 166 7788",
    items: [
      {
        medicineId: "med-gh-15",
        barcode: "60010010015",
        name: "Men's Prostate Defense Complex",
        genericName: "Saw Palmetto, Pygeum & Zinc",
        dosageForm: "Capsule",
        unitPrice: 135.00,
        quantity: 2,
        discount: 0,
        total: 270.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 270.00,
    taxAmount: 40.50,
    discountAmount: 5.00,
    grandTotal: 305.50,
    paymentMethod: "Mobile Payment",
    amountPaid: 305.50,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2026-05-28 17:35:00"
  },
  {
    id: "sale-gh-2026-010",
    invoiceNo: "INV-2026-0410",
    customerId: "cust-gh-27",
    customerName: "Felicia Damptey",
    customerPhone: "+233 20 277 8899",
    items: [
      {
        medicineId: "med-gh-33",
        barcode: "60010010033",
        name: "Pregnacare Plus Dual Pack",
        genericName: "Multivitamin with Omega-3 DHA",
        dosageForm: "Tablet/Capsule",
        unitPrice: 175.00,
        quantity: 2,
        discount: 0,
        total: 350.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-34",
        barcode: "60010010034",
        name: "Fefol Spansule Iron & Folic Acid",
        genericName: "Dried Ferrous Sulphate + Folic Acid",
        dosageForm: "Capsule",
        unitPrice: 45.00,
        quantity: 2,
        discount: 0,
        total: 90.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 440.00,
    taxAmount: 66.00,
    discountAmount: 15.00,
    grandTotal: 491.00,
    paymentMethod: "Mobile Payment",
    amountPaid: 491.00,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Ama Boateng",
    createdAt: "2026-06-16 10:20:00"
  },
  {
    id: "sale-gh-2026-011",
    invoiceNo: "INV-2026-0485",
    customerId: "cust-gh-28",
    customerName: "Richard Donkor",
    customerPhone: "+233 27 388 9900",
    items: [
      {
        medicineId: "med-gh-44",
        barcode: "60010010044",
        name: "Augmentin 625mg Tablets",
        genericName: "Amoxicillin + Clavulanic Acid 625mg",
        dosageForm: "Tablet",
        unitPrice: 85.00,
        quantity: 2,
        discount: 0,
        total: 170.00,
        isPrescriptionRequired: true
      },
      {
        medicineId: "med-gh-11",
        barcode: "60010010011",
        name: "Brufen 400mg Ibuprofen Tablets",
        genericName: "Ibuprofen 400mg",
        dosageForm: "Tablet",
        unitPrice: 35.00,
        quantity: 2,
        discount: 0,
        total: 70.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 240.00,
    taxAmount: 36.00,
    discountAmount: 0.00,
    grandTotal: 276.00,
    paymentMethod: "Insurance",
    amountPaid: 276.00,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2026-07-08 12:40:00",
    prescriptionNo: "RX-2026-0068"
  },
  {
    id: "sale-gh-2026-012",
    invoiceNo: "INV-2026-0560",
    customerId: "cust-gh-29",
    customerName: "Theresa Quansah",
    customerPhone: "+233 24 499 0011",
    items: [
      {
        medicineId: "med-gh-42",
        barcode: "60010010042",
        name: "Perfectil Triple Active Skin Hair Nails",
        genericName: "Micronutrients with Minerals & Botanical Extracts",
        dosageForm: "Tablet",
        unitPrice: 165.00,
        quantity: 2,
        discount: 0,
        total: 330.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-43",
        barcode: "60010010043",
        name: "Biotin 10,000mcg Maximum Strength",
        genericName: "Pure Biotin (Vitamin B7)",
        dosageForm: "Capsule",
        unitPrice: 120.00,
        quantity: 1,
        discount: 0,
        total: 120.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 450.00,
    taxAmount: 67.50,
    discountAmount: 20.00,
    grandTotal: 497.50,
    paymentMethod: "Credit Card",
    amountPaid: 497.50,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Grace Asante",
    createdAt: "2026-07-26 15:10:00"
  },
  {
    id: "sale-gh-2026-013",
    invoiceNo: "INV-2026-0630",
    customerId: "cust-gh-30",
    customerName: "Alex Asiedu",
    customerPhone: "+233 20 500 1122",
    items: [
      {
        medicineId: "med-gh-37",
        barcode: "60010010037",
        name: "Gold Standard 100% Whey Protein 2lbs",
        genericName: "Whey Protein Isolate & Concentrate",
        dosageForm: "Powder",
        unitPrice: 450.00,
        quantity: 1,
        discount: 0,
        total: 450.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-38",
        barcode: "60010010038",
        name: "Optimum Nutrition Creatine Monohydrate",
        genericName: "Micronized Creatine Powder",
        dosageForm: "Powder",
        unitPrice: 220.00,
        quantity: 1,
        discount: 0,
        total: 220.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 670.00,
    taxAmount: 100.50,
    discountAmount: 25.00,
    grandTotal: 745.50,
    paymentMethod: "Mobile Payment",
    amountPaid: 745.50,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2026-08-12 18:45:00"
  },
  {
    id: "sale-gh-2026-014",
    invoiceNo: "INV-2026-0710",
    customerId: "cust-gh-04",
    customerName: "Abena Osei",
    customerPhone: "+233 27 744 5566",
    items: [
      {
        medicineId: "med-gh-47",
        barcode: "60010010047",
        name: "Ventolin Inhaler 100mcg",
        genericName: "Salbutamol Sulphate",
        dosageForm: "Inhaler",
        unitPrice: 68.00,
        quantity: 2,
        discount: 0,
        total: 136.00,
        isPrescriptionRequired: true
      },
      {
        medicineId: "med-gh-11",
        barcode: "60010010011",
        name: "Brufen 400mg Ibuprofen Tablets",
        genericName: "Ibuprofen 400mg",
        dosageForm: "Tablet",
        unitPrice: 35.00,
        quantity: 2,
        discount: 0,
        total: 70.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 206.00,
    taxAmount: 30.90,
    discountAmount: 0.00,
    grandTotal: 236.90,
    paymentMethod: "Mobile Payment",
    amountPaid: 236.90,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Ama Boateng",
    createdAt: "2026-08-29 11:30:00",
    prescriptionNo: "RX-2026-0084"
  },
  {
    id: "sale-gh-2026-015",
    invoiceNo: "INV-2026-0795",
    customerId: "cust-gh-05",
    customerName: "Nana Kwame Addo",
    customerPhone: "+233 20 855 6677",
    items: [
      {
        medicineId: "med-gh-13",
        barcode: "60010010013",
        name: "Voltaren Emulgel 50g",
        genericName: "Diclofenac Diethylamine 1.16%",
        dosageForm: "Gel",
        unitPrice: 52.00,
        quantity: 2,
        discount: 0,
        total: 104.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-09",
        barcode: "60010010009",
        name: "Panadol Extra Tablets (Pack of 24)",
        genericName: "Paracetamol 500mg + Caffeine 65mg",
        dosageForm: "Tablet",
        unitPrice: 28.00,
        quantity: 2,
        discount: 0,
        total: 56.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 160.00,
    taxAmount: 24.00,
    discountAmount: 5.00,
    grandTotal: 179.00,
    paymentMethod: "Cash",
    amountPaid: 200.00,
    changeGiven: 21.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2026-09-10 14:15:00"
  },
  {
    id: "sale-gh-2026-016",
    invoiceNo: "INV-2026-0850",
    customerId: "cust-gh-01",
    customerName: "Kwame Mensah",
    customerPhone: "+233 24 411 2233",
    items: [
      {
        medicineId: "med-gh-46",
        barcode: "60010010046",
        name: "Amlodipine 10mg Tablets",
        genericName: "Amlodipine Besylate",
        dosageForm: "Tablet",
        unitPrice: 38.00,
        quantity: 3,
        discount: 0,
        total: 114.00,
        isPrescriptionRequired: true
      },
      {
        medicineId: "med-gh-01",
        barcode: "60010010001",
        name: "Wellman Original Multivitamin",
        genericName: "Micronutrients with Ginseng & CoQ10",
        dosageForm: "Tablet",
        unitPrice: 145.00,
        quantity: 2,
        discount: 0,
        total: 290.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 404.00,
    taxAmount: 60.60,
    discountAmount: 10.00,
    grandTotal: 454.60,
    paymentMethod: "Mobile Payment",
    amountPaid: 454.60,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2026-09-24 16:20:00",
    prescriptionNo: "RX-2026-0105"
  },
  // TODAY'S SALES (2026-09-25)
  {
    id: "sale-gh-2026-today-01",
    invoiceNo: "INV-2026-0881",
    customerId: "cust-gh-02",
    customerName: "Akosua Frimpong",
    customerPhone: "+233 24 522 3344",
    items: [
      {
        medicineId: "med-gh-02",
        barcode: "60010010002",
        name: "Wellwoman Original Multivitamin",
        genericName: "Vitamins B6, B12, Iron & Evening Primrose",
        dosageForm: "Capsule",
        unitPrice: 150.00,
        quantity: 1,
        discount: 0,
        total: 150.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-04",
        barcode: "60010010004",
        name: "Redoxon Vitamin C 1000mg Effervescent",
        genericName: "Ascorbic Acid + Zinc",
        dosageForm: "Effervescent",
        unitPrice: 48.00,
        quantity: 2,
        discount: 0,
        total: 96.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 246.00,
    taxAmount: 36.90,
    discountAmount: 5.00,
    grandTotal: 277.90,
    paymentMethod: "Mobile Payment",
    amountPaid: 277.90,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2026-09-25 08:45:00"
  },
  {
    id: "sale-gh-2026-today-02",
    invoiceNo: "INV-2026-0882",
    customerName: "Walk-in Customer",
    items: [
      {
        medicineId: "med-gh-09",
        barcode: "60010010009",
        name: "Panadol Extra Tablets (Pack of 24)",
        genericName: "Paracetamol 500mg + Caffeine 65mg",
        dosageForm: "Tablet",
        unitPrice: 28.00,
        quantity: 3,
        discount: 0,
        total: 84.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-05",
        barcode: "60010010005",
        name: "Benylin 4 Flu Liquid 100ml",
        genericName: "Diphenhydramine, Pseudoephedrine, Paracetamol",
        dosageForm: "Syrup",
        unitPrice: 58.00,
        quantity: 1,
        discount: 0,
        total: 58.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 142.00,
    taxAmount: 21.30,
    discountAmount: 0.00,
    grandTotal: 163.30,
    paymentMethod: "Cash",
    amountPaid: 170.00,
    changeGiven: 6.70,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2026-09-25 10:15:00"
  },
  {
    id: "sale-gh-2026-today-03",
    invoiceNo: "INV-2026-0883",
    customerId: "cust-gh-04",
    customerName: "Abena Osei",
    customerPhone: "+233 27 744 5566",
    items: [
      {
        medicineId: "med-gh-47",
        barcode: "60010010047",
        name: "Ventolin Inhaler 100mcg",
        genericName: "Salbutamol Sulphate",
        dosageForm: "Inhaler",
        unitPrice: 68.00,
        quantity: 2,
        discount: 0,
        total: 136.00,
        isPrescriptionRequired: true
      }
    ],
    subtotal: 136.00,
    taxAmount: 20.40,
    discountAmount: 0.00,
    grandTotal: 156.40,
    paymentMethod: "Mobile Payment",
    amountPaid: 156.40,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Ama Boateng",
    createdAt: "2026-09-25 11:50:00",
    prescriptionNo: "RX-2026-0112"
  },
  {
    id: "sale-gh-2026-today-04",
    invoiceNo: "INV-2026-0884",
    customerId: "cust-gh-06",
    customerName: "Kweku Boateng",
    customerPhone: "+233 24 966 7788",
    items: [
      {
        medicineId: "med-gh-10",
        barcode: "60010010010",
        name: "Cataflam 50mg Tablets",
        genericName: "Diclofenac Potassium 50mg",
        dosageForm: "Tablet",
        unitPrice: 65.00,
        quantity: 2,
        discount: 0,
        total: 130.00,
        isPrescriptionRequired: true
      },
      {
        medicineId: "med-gh-50",
        barcode: "60010010050",
        name: "Omeprazole 20mg Capsules",
        genericName: "Omeprazole",
        dosageForm: "Capsule",
        unitPrice: 32.00,
        quantity: 2,
        discount: 0,
        total: 64.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 194.00,
    taxAmount: 29.10,
    discountAmount: 0.00,
    grandTotal: 223.10,
    paymentMethod: "Credit Card",
    amountPaid: 223.10,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Grace Asante",
    createdAt: "2026-09-25 13:25:00",
    prescriptionNo: "RX-2026-0115"
  },
  {
    id: "sale-gh-2026-today-05",
    invoiceNo: "INV-2026-0885",
    customerName: "Walk-in Customer",
    items: [
      {
        medicineId: "med-gh-07",
        barcode: "60010010007",
        name: "Strepsils Honey & Lemon (Pack of 24)",
        genericName: "Dichlorobenzyl Alcohol, Amylmetacresol",
        dosageForm: "Lozenges",
        unitPrice: 35.00,
        quantity: 2,
        discount: 0,
        total: 70.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-11",
        barcode: "60010010011",
        name: "Brufen 400mg Ibuprofen Tablets",
        genericName: "Ibuprofen 400mg",
        dosageForm: "Tablet",
        unitPrice: 35.00,
        quantity: 1,
        discount: 0,
        total: 35.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 105.00,
    taxAmount: 15.75,
    discountAmount: 0.00,
    grandTotal: 120.75,
    paymentMethod: "Cash",
    amountPaid: 150.00,
    changeGiven: 29.25,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2026-09-25 14:40:00"
  },
  {
    id: "sale-gh-2026-today-06",
    invoiceNo: "INV-2026-0886",
    customerId: "cust-gh-07",
    customerName: "Afia Serwaa",
    customerPhone: "+233 20 177 8899",
    items: [
      {
        medicineId: "med-gh-42",
        barcode: "60010010042",
        name: "Perfectil Triple Active Skin Hair Nails",
        genericName: "Micronutrients with Minerals & Botanical Extracts",
        dosageForm: "Tablet",
        unitPrice: 165.00,
        quantity: 1,
        discount: 0,
        total: 165.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-gh-43",
        barcode: "60010010043",
        name: "Biotin 10,000mcg Maximum Strength",
        genericName: "Pure Biotin (Vitamin B7)",
        dosageForm: "Capsule",
        unitPrice: 120.00,
        quantity: 1,
        discount: 0,
        total: 120.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 285.00,
    taxAmount: 42.75,
    discountAmount: 10.00,
    grandTotal: 317.75,
    paymentMethod: "Mobile Payment",
    amountPaid: 317.75,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Daniel Owusu",
    createdAt: "2026-09-25 15:35:00"
  },
  // Deterministic generated historical sales to reach 150+ transactions
  ...(() => {
    const extraSales: Sale[] = [];
    const cashiers = ["Daniel Owusu", "Ama Boateng", "Grace Asante", "John Mensah"];
    const paymentMethods: Sale['paymentMethod'][] = [
      "Cash", "Mobile Payment", "Mobile Payment", "Credit Card", "Debit Card", "Insurance"
    ];
    
    // 35 historical seeds across 2024, 40 across 2025, and 30 across 2026
    const sampleItems = [
      { id: "med-gh-01", name: "Wellman Original Multivitamin", gen: "Micronutrients with Ginseng", price: 145.00, barcode: "60010010001", rx: false },
      { id: "med-gh-02", name: "Wellwoman Original Multivitamin", gen: "Vitamins B6, B12, Iron", price: 150.00, barcode: "60010010002", rx: false },
      { id: "med-gh-09", name: "Panadol Extra Tablets (Pack of 24)", gen: "Paracetamol 500mg + Caffeine", price: 28.00, barcode: "60010010009", rx: false },
      { id: "med-gh-04", name: "Redoxon Vitamin C 1000mg Effervescent", gen: "Ascorbic Acid + Zinc", price: 48.00, barcode: "60010010004", rx: false },
      { id: "med-gh-10", name: "Cataflam 50mg Tablets", gen: "Diclofenac Potassium 50mg", price: 65.00, barcode: "60010010010", rx: true },
      { id: "med-gh-44", name: "Augmentin 625mg Tablets", gen: "Amoxicillin + Clavulanic Acid", price: 85.00, barcode: "60010010044", rx: true },
      { id: "med-gh-46", name: "Amlodipine 10mg Tablets", gen: "Amlodipine Besylate", price: 38.00, barcode: "60010010046", rx: true },
      { id: "med-gh-48", name: "Glucophage 500mg Metformin", gen: "Metformin Hydrochloride", price: 42.00, barcode: "60010010048", rx: true },
      { id: "med-gh-33", name: "Pregnacare Plus Dual Pack", gen: "Multivitamin with Omega-3", price: 175.00, barcode: "60010010033", rx: false },
      { id: "med-gh-37", name: "Gold Standard Whey Protein", gen: "Whey Protein Isolate", price: 450.00, barcode: "60010010037", rx: false },
      { id: "med-gh-41", name: "Marine Collagen Peptides 300g", gen: "Hydrolyzed Collagen", price: 280.00, barcode: "60010010041", rx: false },
      { id: "med-gh-05", name: "Benylin 4 Flu Liquid 100ml", gen: "Diphenhydramine + Paracetamol", price: 58.00, barcode: "60010010005", rx: false }
    ];

    const customerSeeds = [
      { id: "cust-gh-01", name: "Kwame Mensah", phone: "+233 24 411 2233" },
      { id: "cust-gh-02", name: "Akosua Frimpong", phone: "+233 24 522 3344" },
      { id: "cust-gh-03", name: "Kofi Poku", phone: "+233 20 633 4455" },
      { id: "cust-gh-04", name: "Abena Osei", phone: "+233 27 744 5566" },
      { id: "cust-gh-05", name: "Nana Kwame Addo", phone: "+233 20 855 6677" },
      { id: "cust-gh-06", name: "Kweku Boateng", phone: "+233 24 966 7788" },
      { id: "cust-gh-07", name: "Afia Serwaa", phone: "+233 20 177 8899" },
      { id: "cust-gh-08", name: "Yaw Darko", phone: "+233 24 288 9900" },
      { id: "cust-gh-10", name: "Kofi Annan", phone: "+233 27 400 1122" },
      { id: "cust-gh-11", name: "Doreen Asamoah", phone: "+233 24 511 2233" },
      { id: "cust-gh-14", name: "Samuel Boadu", phone: "+233 24 844 5566" },
      { id: "cust-gh-16", name: "Isaac Gyan", phone: "+233 24 166 7788" },
      { id: "cust-gh-21", name: "Constance Boakye", phone: "+233 24 611 2233" }
    ];

    // Build timeline batches
    const timeline = [
      // 2024 Months (1 to 12)
      ...Array.from({ length: 35 }, (_, i) => {
        const month = String(1 + (i % 12)).padStart(2, '0');
        const day = String(1 + (i * 3 % 27)).padStart(2, '0');
        const hour = String(9 + (i % 9)).padStart(2, '0');
        const min = String((i * 17) % 60).padStart(2, '0');
        return { year: '2024', date: `2024-${month}-${day} ${hour}:${min}:00`, index: 100 + i };
      }),
      // 2025 Months (1 to 12)
      ...Array.from({ length: 42 }, (_, i) => {
        const month = String(1 + (i % 12)).padStart(2, '0');
        const day = String(1 + (i * 4 % 27)).padStart(2, '0');
        const hour = String(8 + (i % 11)).padStart(2, '0');
        const min = String((i * 19) % 60).padStart(2, '0');
        return { year: '2025', date: `2025-${month}-${day} ${hour}:${min}:00`, index: 200 + i };
      }),
      // 2026 Months (1 to 9)
      ...Array.from({ length: 32 }, (_, i) => {
        const month = String(1 + (i % 9)).padStart(2, '0');
        const day = String(1 + (i * 5 % 24)).padStart(2, '0');
        const hour = String(9 + (i % 10)).padStart(2, '0');
        const min = String((i * 23) % 60).padStart(2, '0');
        return { year: '2026', date: `2026-${month}-${day} ${hour}:${min}:00`, index: 300 + i };
      })
    ];

    timeline.forEach((t, idx) => {
      const item1 = sampleItems[(idx * 3) % sampleItems.length];
      const item2 = sampleItems[(idx * 7 + 1) % sampleItems.length];
      const qty1 = 1 + (idx % 3);
      const qty2 = 1 + ((idx + 1) % 2);
      const total1 = item1.price * qty1;
      const total2 = item2.price * qty2;
      const subtotal = total1 + total2;
      const discount = (idx % 5 === 0) ? Math.round(subtotal * 0.05) : 0;
      const taxAmount = Math.round((subtotal - discount) * 0.15 * 100) / 100;
      const grandTotal = Math.round((subtotal - discount + taxAmount) * 100) / 100;
      const cust = (idx % 4 === 0) ? null : customerSeeds[idx % customerSeeds.length];
      const method = paymentMethods[idx % paymentMethods.length];
      const cashier = cashiers[idx % cashiers.length];

      extraSales.push({
        id: `sale-gh-hist-${t.year}-${String(idx + 1).padStart(3, '0')}`,
        invoiceNo: `INV-${t.year}-${String(t.index).padStart(4, '0')}`,
        customerId: cust ? cust.id : undefined,
        customerName: cust ? cust.name : "Walk-in Customer",
        customerPhone: cust ? cust.phone : undefined,
        items: [
          {
            medicineId: item1.id,
            barcode: item1.barcode,
            name: item1.name,
            genericName: item1.gen,
            dosageForm: "Tablet",
            unitPrice: item1.price,
            quantity: qty1,
            discount: 0,
            total: total1,
            isPrescriptionRequired: item1.rx
          },
          {
            medicineId: item2.id,
            barcode: item2.barcode,
            name: item2.name,
            genericName: item2.gen,
            dosageForm: "Capsule",
            unitPrice: item2.price,
            quantity: qty2,
            discount: 0,
            total: total2,
            isPrescriptionRequired: item2.rx
          }
        ],
        subtotal,
        taxAmount,
        discountAmount: discount,
        grandTotal,
        paymentMethod: method,
        amountPaid: grandTotal,
        changeGiven: 0.00,
        status: "Completed",
        cashierName: cashier,
        createdAt: t.date,
        prescriptionNo: (item1.rx || item2.rx) ? `RX-${t.year}-${String(idx + 10).padStart(4, '0')}` : undefined
      });
    });

    return extraSales;
  })()
];
