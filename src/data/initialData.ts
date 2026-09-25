import {
  Medicine,
  Category,
  Supplier,
  Customer,
  Sale,
  Purchase,
  Prescription,
  Expense,
  User,
  AuditLog,
  PharmacySettings
} from '../types';

export const initialSettings: PharmacySettings = {
  pharmacyName: "St. Jude International Pharmacy & Clinic",
  licenseNumber: "RX-INTL-9042-2025",
  address: "742 Healthcare Boulevard, Suite 100, Metro City, NY 10001",
  phone: "+1 (555) 742-8900",
  email: "care@stjudepharmacy.com",
  website: "https://www.stjudepharmacy.com",
  vatNumber: "VAT-992384-US",
  currency: "USD",
  currencySymbol: "$",
  country: "United States",
  countryCode: "US",
  language: "English (US)",
  languageCode: "en-US",
  timezone: "America/New_York",
  vatRate: 7.5,
  invoicePrefix: "INV",
  lowStockThreshold: 20,
  expiryWarningDays: 90,
  enablePrescriptionAlert: true,
  enableLoyaltyProgram: true,
  receiptHeaderNotice: "Thank you for choosing St. Jude International Pharmacy! Quality Healthcare You Can Trust.",
  receiptFooterNotice: "Keep medicines out of reach of children. Valid Rx required for all controlled prescription items. Emergency Helpline: +1 (555) 742-8900.",
  isCompanyConfigured: true
};

export const initialCategories: Category[] = [
  // 10 Major Medicine Categories
  { id: "cat-vitamins", name: "Vitamins & Supplements", description: "Nutritional supplements, multivitamins and immunity boosters" },
  { id: "cat-cough-cold", name: "Cough, Cold & Flu", description: "Decongestants, cough syrups, antihistamines and flu relief" },
  { id: "cat-pain-relief", name: "Pain Relief", description: "Analgesics, anti-inflammatories, fever reducers and muscle relief" },
  { id: "cat-mens-health", name: "Men's Health", description: "Prostate care, testosterone support, hair retention and vitality" },
  { id: "cat-womens-health", name: "Women's Health", description: "Hormone balance, menopause relief, menstrual care and wellness" },
  { id: "cat-pregnancy", name: "Conception & Pregnancy", description: "Prenatal vitamins, folic acid, fertility tests and maternity care" },
  { id: "cat-baby-child", name: "Baby & Child Health", description: "Pediatric syrups, colic drops, teething gel and child nutrition" },
  { id: "cat-diet-fitness", name: "Diet & Fitness", description: "Protein powders, weight management, hydration and energy" },
  { id: "cat-sexual-wellness", name: "Sexual Wellness", description: "Intimate health, reproductive care and wellness products" },
  { id: "cat-beauty-supplements", name: "Beauty Supplements", description: "Collagen, biotin, skin radiance and hair & nail nutrients" },

  // Preserved Therapeutic Categories
  { id: "cat-1", name: "Antibiotics", description: "Bacterial infection treatments and antimicrobials" },
  { id: "cat-2", name: "Analgesics & Antipyretics", description: "Pain relievers and fever reducers" },
  { id: "cat-3", name: "Cardiovascular", description: "Blood pressure, cholesterol, and heart health" },
  { id: "cat-4", name: "Diabetes Care", description: "Blood glucose management and insulin support" },
  { id: "cat-5", name: "Gastrointestinal", description: "Antacids, proton pump inhibitors, and digestive aid" },
  { id: "cat-6", name: "Respiratory", description: "Asthma inhalers, allergy relief, and cough syrups" },
  { id: "cat-8", name: "Dermatological", description: "Topical creams, ointments, and skin care" },
];

export const initialSuppliers: Supplier[] = [
  {
    id: "sup-1",
    name: "PharmaCare Global Distributors",
    contactPerson: "Dr. Robert Vance",
    email: "orders@pharmacareglobal.com",
    phone: "+1 (555) 888-0192",
    address: "12 Logistics Parkway, Warehouse District",
    taxId: "TAX-998124",
    paymentTerms: "Net 30",
    totalPurchased: 45800.00,
    balanceOwed: 2400.00,
    status: "Active"
  },
  {
    id: "sup-2",
    name: "Apex Healthcare Supplies",
    contactPerson: "Sarah Jenkins",
    email: "s.jenkins@apexhealth.com",
    phone: "+1 (555) 443-8900",
    address: "88 BioTech Hub, Suite 400",
    taxId: "TAX-441092",
    paymentTerms: "Net 15",
    totalPurchased: 28900.00,
    balanceOwed: 0.00,
    status: "Active"
  },
  {
    id: "sup-3",
    name: "MediSupply Wholesale Corp",
    contactPerson: "Michael Chang",
    email: "mchang@medisupply.org",
    phone: "+1 (555) 771-3322",
    address: "505 Industrial Blvd, Sector 9",
    taxId: "TAX-772910",
    paymentTerms: "Net 45",
    totalPurchased: 62400.00,
    balanceOwed: 5120.00,
    status: "Active"
  }
];

export const initialMedicines: Medicine[] = [
  {
    id: "med-1",
    barcode: "89010203001",
    name: "Amoxil Capsules",
    genericName: "Amoxicillin",
    category: "Antibiotics",
    brand: "GSK",
    dosageForm: "Capsule",
    strength: "500mg",
    batchNumber: "AMX-2024-09",
    manufactureDate: "2024-01-15",
    expiryDate: "2026-11-20",
    purchasePrice: 12.50,
    sellingPrice: 22.00,
    stockQuantity: 140,
    minReorderLevel: 30,
    unit: "Box (10x10)",
    supplierId: "sup-1",
    supplierName: "PharmaCare Global Distributors",
    locationRack: "Shelf A-12",
    isPrescriptionRequired: true,
    status: "In Stock",
    description: "Broad-spectrum penicillin antibiotic used for bacterial infections.",
    sideEffects: "Nausea, skin rash, diarrhea."
  },
  {
    id: "med-2",
    barcode: "89010203002",
    name: "Panadol Extra",
    genericName: "Paracetamol & Caffeine",
    category: "Analgesics & Antipyretics",
    brand: "Haleon",
    dosageForm: "Tablet",
    strength: "500mg / 65mg",
    batchNumber: "PND-2024-11",
    manufactureDate: "2024-02-10",
    expiryDate: "2027-04-15",
    purchasePrice: 3.20,
    sellingPrice: 6.50,
    stockQuantity: 280,
    minReorderLevel: 50,
    unit: "Pack (24 Tabs)",
    supplierId: "sup-2",
    supplierName: "Apex Healthcare Supplies",
    locationRack: "Shelf B-02",
    isPrescriptionRequired: false,
    status: "In Stock",
    description: "Effective relief for tough pain, headache, and fever.",
    sideEffects: "Insomnia if taken late at night, mild restlessness."
  },
  {
    id: "med-3",
    barcode: "89010203003",
    name: "Glucophage XR",
    genericName: "Metformin Hydrochloride",
    category: "Diabetes Care",
    brand: "Merck",
    dosageForm: "Extended Release Tablet",
    strength: "500mg",
    batchNumber: "GLU-2023-88",
    manufactureDate: "2023-10-01",
    expiryDate: "2026-09-30",
    purchasePrice: 15.00,
    sellingPrice: 28.50,
    stockQuantity: 18,
    minReorderLevel: 25,
    unit: "Box (60 Tabs)",
    supplierId: "sup-3",
    supplierName: "MediSupply Wholesale Corp",
    locationRack: "Shelf D-05",
    isPrescriptionRequired: true,
    status: "Low Stock",
    description: "First-line oral anti-diabetic medication for type 2 diabetes.",
    sideEffects: "Gastrointestinal upset, metallic taste."
  },
  {
    id: "med-4",
    barcode: "89010203004",
    name: "Lipitor Tablets",
    genericName: "Atorvastatin Calcium",
    category: "Cardiovascular",
    brand: "Pfizer",
    dosageForm: "Tablet",
    strength: "20mg",
    batchNumber: "LIP-2024-03",
    manufactureDate: "2024-03-01",
    expiryDate: "2026-12-15",
    purchasePrice: 18.00,
    sellingPrice: 34.00,
    stockQuantity: 85,
    minReorderLevel: 20,
    unit: "Box (30 Tabs)",
    supplierId: "sup-1",
    supplierName: "PharmaCare Global Distributors",
    locationRack: "Shelf C-09",
    isPrescriptionRequired: true,
    status: "In Stock",
    description: "Statin lipid-lowering medication used to prevent cardiovascular disease.",
    sideEffects: "Muscle soreness, mild elevated liver enzymes."
  },
  {
    id: "med-5",
    barcode: "89010203005",
    name: "Prilosec OTC",
    genericName: "Omeprazole",
    category: "Gastrointestinal",
    brand: "Procter & Gamble",
    dosageForm: "Delayed Release Capsule",
    strength: "20mg",
    batchNumber: "OMP-2023-12",
    manufactureDate: "2023-11-20",
    expiryDate: "2026-10-10",
    purchasePrice: 8.50,
    sellingPrice: 16.00,
    stockQuantity: 110,
    minReorderLevel: 30,
    unit: "Pack (28 Caps)",
    supplierId: "sup-2",
    supplierName: "Apex Healthcare Supplies",
    locationRack: "Shelf B-11",
    isPrescriptionRequired: false,
    status: "In Stock",
    description: "Proton pump inhibitor treating frequent heartburn and acid reflux.",
    sideEffects: "Headache, abdominal pain."
  },
  {
    id: "med-6",
    barcode: "89010203006",
    name: "Ventolin Evohaler",
    genericName: "Salbutamol Sulfate",
    category: "Respiratory",
    brand: "GSK",
    dosageForm: "Inhaler",
    strength: "100mcg/actuation",
    batchNumber: "VNT-2024-05",
    manufactureDate: "2024-04-10",
    expiryDate: "2026-08-30",
    purchasePrice: 9.00,
    sellingPrice: 18.50,
    stockQuantity: 12,
    minReorderLevel: 20,
    unit: "Inhaler (200 doses)",
    supplierId: "sup-1",
    supplierName: "PharmaCare Global Distributors",
    locationRack: "Shelf R-01",
    isPrescriptionRequired: true,
    status: "Low Stock",
    description: "Fast-acting bronchodilator for asthma and COPD acute bronchospasm.",
    sideEffects: "Fine tremor, tachycardia."
  },
  {
    id: "med-7",
    barcode: "89010203007",
    name: "Zyrtec Allergy",
    genericName: "Cetirizine Hydrochloride",
    category: "Respiratory",
    brand: "McNeil",
    dosageForm: "Tablet",
    strength: "10mg",
    batchNumber: "ZYR-2023-01",
    manufactureDate: "2023-01-10",
    expiryDate: "2026-09-10",
    purchasePrice: 4.50,
    sellingPrice: 9.80,
    stockQuantity: 190,
    minReorderLevel: 40,
    unit: "Box (30 Tabs)",
    supplierId: "sup-3",
    supplierName: "MediSupply Wholesale Corp",
    locationRack: "Shelf R-04",
    isPrescriptionRequired: false,
    status: "In Stock",
    description: "Non-drowsy 24-hour antihistamine relief for hay fever and hives.",
    sideEffects: "Mild drowsiness, dry mouth."
  },
  {
    id: "med-8",
    barcode: "89010203008",
    name: "Cebion Vitamin C",
    genericName: "Ascorbic Acid",
    category: "Vitamins & Supplements",
    brand: "Merck",
    dosageForm: "Effervescent Tablet",
    strength: "1000mg",
    batchNumber: "CEB-2024-01",
    manufactureDate: "2024-01-05",
    expiryDate: "2027-01-10",
    purchasePrice: 4.00,
    sellingPrice: 8.00,
    stockQuantity: 320,
    minReorderLevel: 50,
    unit: "Tube (20 Tabs)",
    supplierId: "sup-2",
    supplierName: "Apex Healthcare Supplies",
    locationRack: "Shelf V-01",
    isPrescriptionRequired: false,
    status: "In Stock",
    description: "High potency immune support effervescent drink.",
    sideEffects: "Mild stomach discomfort if taken empty stomach."
  },
  {
    id: "med-9",
    barcode: "89010203009",
    name: "Norvasc Tablets",
    genericName: "Amlodipine Besylate",
    category: "Cardiovascular",
    brand: "Pfizer",
    dosageForm: "Tablet",
    strength: "5mg",
    batchNumber: "NOR-2023-08",
    manufactureDate: "2023-08-15",
    expiryDate: "2026-09-01",
    purchasePrice: 11.00,
    sellingPrice: 21.00,
    stockQuantity: 0,
    minReorderLevel: 20,
    unit: "Box (30 Tabs)",
    supplierId: "sup-1",
    supplierName: "PharmaCare Global Distributors",
    locationRack: "Shelf C-03",
    isPrescriptionRequired: true,
    status: "Out of Stock",
    description: "Calcium channel blocker treating high blood pressure and angina.",
    sideEffects: "Peripheral edema, dizziness."
  },
  {
    id: "med-10",
    barcode: "89010203010",
    name: "Zithromax Z-Pak",
    genericName: "Azithromycin",
    category: "Antibiotics",
    brand: "Pfizer",
    dosageForm: "Tablet",
    strength: "250mg",
    batchNumber: "ZTH-2022-09",
    manufactureDate: "2022-09-01",
    expiryDate: "2026-09-15", // Expiring soon in 1 month
    purchasePrice: 16.50,
    sellingPrice: 29.00,
    stockQuantity: 24,
    minReorderLevel: 15,
    unit: "Pack (6 Tabs)",
    supplierId: "sup-1",
    supplierName: "PharmaCare Global Distributors",
    locationRack: "Shelf A-05",
    isPrescriptionRequired: true,
    status: "Expiring Soon",
    description: "Macrolide antibiotic used for respiratory and soft tissue infections.",
    sideEffects: "Diarrhea, nausea, abdominal pain."
  },
  {
    id: "med-11",
    barcode: "89010203011",
    name: "Hydrocortisone Cream 1%",
    genericName: "Hydrocortisone",
    category: "Dermatological",
    brand: "Cortizone",
    dosageForm: "Topical Cream",
    strength: "1% w/w",
    batchNumber: "HYD-2021-02",
    manufactureDate: "2021-02-10",
    expiryDate: "2026-05-10", // Expired
    purchasePrice: 3.50,
    sellingPrice: 7.20,
    stockQuantity: 8,
    minReorderLevel: 10,
    unit: "Tube (30g)",
    supplierId: "sup-2",
    supplierName: "Apex Healthcare Supplies",
    locationRack: "Shelf D-10",
    isPrescriptionRequired: false,
    status: "Expired",
    description: "Mild corticosteroid for itchy skin rashes, eczema, and insect bites.",
    sideEffects: "Skin thinning with prolonged use."
  }
];

export const initialCustomers: Customer[] = [
  {
    id: "cust-1",
    name: "Eleanor Vance",
    phone: "+1 (555) 123-9876",
    email: "e.vance@example.com",
    address: "104 Willow Lane, Healthcare City",
    dateOfBirth: "1982-04-12",
    gender: "Female",
    allergies: ["Penicillin", "Sulfa Drugs"],
    chronicConditions: ["Hypertension", "Asthma"],
    loyaltyPoints: 340,
    totalSpent: 820.50,
    lastVisit: "2026-08-10"
  },
  {
    id: "cust-2",
    name: "Marcus Aurelius Thorne",
    phone: "+1 (555) 456-1122",
    email: "m.thorne@example.com",
    address: "42 Cypress Avenue, Sector 4",
    dateOfBirth: "1965-11-28",
    gender: "Male",
    allergies: ["NSAIDs"],
    chronicConditions: ["Type 2 Diabetes"],
    loyaltyPoints: 580,
    totalSpent: 1420.00,
    lastVisit: "2026-08-11"
  },
  {
    id: "cust-3",
    name: "Sophia Martinez",
    phone: "+1 (555) 789-3344",
    email: "sophia.m@example.com",
    address: "808 Oakwood Drive, Downtown",
    dateOfBirth: "1994-08-05",
    gender: "Female",
    allergies: [],
    chronicConditions: [],
    loyaltyPoints: 120,
    totalSpent: 260.00,
    lastVisit: "2026-08-08"
  }
];

export const initialPrescriptions: Prescription[] = [
  {
    id: "rx-1001",
    prescriptionNo: "RX-2026-0891",
    customerId: "cust-1",
    customerName: "Eleanor Vance",
    doctorName: "Dr. Arthur Pendelton",
    doctorRegNo: "MD-88201",
    hospitalClinic: "St. Jude Heart & Asthma Institute",
    diagnosis: "Acute Bronchospasm & Hypertension Check",
    items: [
      {
        medicineName: "Ventolin Evohaler",
        dosage: "100mcg",
        frequency: "2 puffs every 6 hours as needed",
        duration: "30 days",
        quantity: 1,
        instructions: "Inhale deeply. Rinse mouth with water afterwards."
      },
      {
        medicineName: "Lipitor Tablets 20mg",
        dosage: "20mg",
        frequency: "1 tablet once daily at bedtime",
        duration: "30 days",
        quantity: 1,
        instructions: "Take with or without food."
      }
    ],
    status: "Verified",
    scannedFileUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop",
    createdAt: "2026-08-11T10:30:00Z",
    notes: "Patient allergic to Penicillin. Verified no penicillin components."
  },
  {
    id: "rx-1002",
    prescriptionNo: "RX-2026-0892",
    customerId: "cust-2",
    customerName: "Marcus Aurelius Thorne",
    doctorName: "Dr. Evelyn Reed",
    doctorRegNo: "MD-90112",
    hospitalClinic: "Metropolitan Diabetes Clinic",
    diagnosis: "Type 2 Diabetes Mellitus Maintenance",
    items: [
      {
        medicineName: "Glucophage XR 500mg",
        dosage: "500mg",
        frequency: "1 tablet twice daily with meals",
        duration: "60 days",
        quantity: 2,
        instructions: "Swallow whole, do not crush or chew."
      }
    ],
    status: "Dispensed",
    dispensedAt: "2026-08-11T14:20:00Z",
    dispensedBy: "Pharm. Sarah Connor",
    createdAt: "2026-08-11T11:15:00Z"
  }
];

export const initialSales: Sale[] = [
  {
    id: "sale-101",
    invoiceNo: "INV-2026-00401",
    customerId: "cust-1",
    customerName: "Eleanor Vance",
    items: [
      {
        medicineId: "med-2",
        barcode: "89010203002",
        name: "Panadol Extra",
        genericName: "Paracetamol & Caffeine",
        dosageForm: "Tablet",
        unitPrice: 6.50,
        quantity: 2,
        discount: 0,
        total: 13.00,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-8",
        barcode: "89010203008",
        name: "Cebion Vitamin C",
        genericName: "Ascorbic Acid",
        dosageForm: "Effervescent Tablet",
        unitPrice: 8.00,
        quantity: 1,
        discount: 0,
        total: 8.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 21.00,
    taxAmount: 1.58,
    discountAmount: 0.00,
    grandTotal: 22.58,
    paymentMethod: "Credit Card",
    amountPaid: 22.58,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "John Pharmacist",
    createdAt: "2026-08-12T09:15:00Z"
  },
  {
    id: "sale-102",
    invoiceNo: "INV-2026-00402",
    customerId: "cust-2",
    customerName: "Marcus Aurelius Thorne",
    items: [
      {
        medicineId: "med-3",
        barcode: "89010203003",
        name: "Glucophage XR",
        genericName: "Metformin Hydrochloride",
        dosageForm: "Extended Release Tablet",
        unitPrice: 28.50,
        quantity: 2,
        discount: 2.00,
        total: 55.00,
        isPrescriptionRequired: true
      }
    ],
    subtotal: 55.00,
    taxAmount: 4.13,
    discountAmount: 2.00,
    grandTotal: 59.13,
    paymentMethod: "Cash",
    amountPaid: 60.00,
    changeGiven: 0.87,
    status: "Completed",
    cashierName: "Sarah Cashier",
    createdAt: "2026-08-12T11:45:00Z",
    prescriptionNo: "RX-2026-0892"
  },
  {
    id: "sale-103",
    invoiceNo: "INV-2026-00403",
    customerName: "Walk-in Customer",
    items: [
      {
        medicineId: "med-7",
        barcode: "89010203007",
        name: "Zyrtec Allergy",
        genericName: "Cetirizine Hydrochloride",
        dosageForm: "Tablet",
        unitPrice: 9.80,
        quantity: 1,
        discount: 0,
        total: 9.80,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 9.80,
    taxAmount: 0.74,
    discountAmount: 0.00,
    grandTotal: 10.54,
    paymentMethod: "Mobile Payment",
    amountPaid: 10.54,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Sarah Cashier",
    createdAt: "2026-08-12T14:10:00Z"
  },
  {
    id: "sale-104",
    invoiceNo: "INV-2026-00404",
    customerId: "cust-1",
    customerName: "Eleanor Vance",
    items: [
      {
        medicineId: "med-1",
        barcode: "89010203001",
        name: "Amoxil Capsules 500mg",
        genericName: "Amoxicillin Trihydrate",
        dosageForm: "Capsule",
        unitPrice: 18.50,
        quantity: 2,
        discount: 0,
        total: 37.00,
        isPrescriptionRequired: true
      },
      {
        medicineId: "med-2",
        barcode: "89010203002",
        name: "Panadol Extra",
        genericName: "Paracetamol / Caffeine",
        dosageForm: "Tablet",
        unitPrice: 6.50,
        quantity: 3,
        discount: 0,
        total: 19.50,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 56.50,
    taxAmount: 4.24,
    discountAmount: 0.00,
    grandTotal: 60.74,
    paymentMethod: "Cash",
    amountPaid: 70.00,
    changeGiven: 9.26,
    status: "Completed",
    cashierName: "Sarah Cashier",
    createdAt: "2026-09-24T10:30:00Z"
  },
  {
    id: "sale-105",
    invoiceNo: "INV-2026-00405",
    customerName: "Walk-in Customer",
    items: [
      {
        medicineId: "med-4",
        barcode: "89010203004",
        name: "Lipitor 20mg",
        genericName: "Atorvastatin Calcium",
        dosageForm: "Tablet",
        unitPrice: 32.00,
        quantity: 1,
        discount: 2.00,
        total: 30.00,
        isPrescriptionRequired: true
      }
    ],
    subtotal: 30.00,
    taxAmount: 2.25,
    discountAmount: 2.00,
    grandTotal: 32.25,
    paymentMethod: "Mobile Payment",
    amountPaid: 32.25,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "Sarah Cashier",
    createdAt: "2026-09-25T08:15:00Z"
  },
  // Historical 2025 Sales
  {
    id: "sale-2025-01",
    invoiceNo: "INV-2025-08101",
    customerId: "cust-1",
    customerName: "Eleanor Vance",
    items: [
      {
        medicineId: "med-1",
        barcode: "89010203001",
        name: "Amoxil Capsules 500mg",
        genericName: "Amoxicillin Trihydrate",
        dosageForm: "Capsule",
        unitPrice: 17.50,
        quantity: 4,
        discount: 0,
        total: 70.00,
        isPrescriptionRequired: true
      },
      {
        medicineId: "med-5",
        barcode: "89010203005",
        name: "Ventolin Evohaler",
        genericName: "Salbutamol Sulfate",
        dosageForm: "Aerosol Inhaler",
        unitPrice: 22.00,
        quantity: 2,
        discount: 0,
        total: 44.00,
        isPrescriptionRequired: true
      }
    ],
    subtotal: 114.00,
    taxAmount: 8.55,
    discountAmount: 4.00,
    grandTotal: 118.55,
    paymentMethod: "Credit Card",
    amountPaid: 118.55,
    changeGiven: 0.00,
    status: "Completed",
    cashierName: "John Pharmacist",
    createdAt: "2025-11-14T14:22:00Z"
  },
  {
    id: "sale-2025-02",
    invoiceNo: "INV-2025-09204",
    customerId: "cust-2",
    customerName: "Marcus Aurelius Thorne",
    items: [
      {
        medicineId: "med-3",
        barcode: "89010203003",
        name: "Glucophage XR",
        genericName: "Metformin Hydrochloride",
        dosageForm: "Extended Release Tablet",
        unitPrice: 27.00,
        quantity: 3,
        discount: 0,
        total: 81.00,
        isPrescriptionRequired: true
      }
    ],
    subtotal: 81.00,
    taxAmount: 6.08,
    discountAmount: 0.00,
    grandTotal: 87.08,
    paymentMethod: "Cash",
    amountPaid: 90.00,
    changeGiven: 2.92,
    status: "Completed",
    cashierName: "Sarah Cashier",
    createdAt: "2025-12-20T16:45:00Z"
  },
  // Historical 2024 Sales
  {
    id: "sale-2024-01",
    invoiceNo: "INV-2024-05101",
    customerName: "Walk-in Customer",
    items: [
      {
        medicineId: "med-2",
        barcode: "89010203002",
        name: "Panadol Extra",
        genericName: "Paracetamol / Caffeine",
        dosageForm: "Tablet",
        unitPrice: 5.50,
        quantity: 5,
        discount: 0,
        total: 27.50,
        isPrescriptionRequired: false
      },
      {
        medicineId: "med-6",
        barcode: "89010203006",
        name: "Cebion Vitamin C",
        genericName: "Ascorbic Acid",
        dosageForm: "Effervescent Tablet",
        unitPrice: 7.50,
        quantity: 2,
        discount: 0,
        total: 15.00,
        isPrescriptionRequired: false
      }
    ],
    subtotal: 42.50,
    taxAmount: 3.19,
    discountAmount: 0.00,
    grandTotal: 45.69,
    paymentMethod: "Cash",
    amountPaid: 50.00,
    changeGiven: 4.31,
    status: "Completed",
    cashierName: "John Pharmacist",
    createdAt: "2024-10-18T11:10:00Z"
  }
];

export const initialPurchases: Purchase[] = [
  {
    id: "po-101",
    purchaseOrderNo: "PO-2026-091",
    supplierId: "sup-1",
    supplierName: "PharmaCare Global Distributors",
    items: [
      {
        medicineId: "med-1",
        name: "Amoxil Capsules 500mg",
        batchNumber: "AMX-2024-09",
        expiryDate: "2026-11-20",
        quantityOrdered: 100,
        quantityReceived: 100,
        unitCost: 12.50,
        totalCost: 1250.00
      },
      {
        medicineId: "med-4",
        name: "Lipitor Tablets 20mg",
        batchNumber: "LIP-2024-03",
        expiryDate: "2026-12-15",
        quantityOrdered: 50,
        quantityReceived: 50,
        unitCost: 18.00,
        totalCost: 900.00
      }
    ],
    totalAmount: 2150.00,
    amountPaid: 2150.00,
    dueDate: "2026-09-01",
    paymentStatus: "Paid",
    deliveryStatus: "Received",
    orderDate: "2026-08-01",
    receivedDate: "2026-08-04",
    notes: "Delivered intact with cold chain verification."
  },
  {
    id: "po-102",
    purchaseOrderNo: "PO-2026-092",
    supplierId: "sup-3",
    supplierName: "MediSupply Wholesale Corp",
    items: [
      {
        medicineId: "med-3",
        name: "Glucophage XR 500mg",
        batchNumber: "GLU-2024-02",
        expiryDate: "2027-08-10",
        quantityOrdered: 80,
        quantityReceived: 0,
        unitCost: 15.00,
        totalCost: 1200.00
      }
    ],
    totalAmount: 1200.00,
    amountPaid: 400.00,
    dueDate: "2026-09-10",
    paymentStatus: "Partial",
    deliveryStatus: "Pending",
    orderDate: "2026-08-10",
    expectedDeliveryDate: "2026-08-15",
    notes: "Urgent restocking order for low stock diabetes meds."
  },
  {
    id: "po-103",
    purchaseOrderNo: "PO-2026-093",
    supplierId: "sup-1",
    supplierName: "PharmaCare Global Distributors",
    items: [
      {
        medicineId: "med-2",
        name: "Panadol Extra",
        batchNumber: "PAN-2025-01",
        expiryDate: "2027-05-30",
        quantityOrdered: 200,
        quantityReceived: 200,
        unitCost: 3.80,
        totalCost: 760.00
      },
      {
        medicineId: "med-6",
        name: "Cebion Vitamin C",
        batchNumber: "CEB-2025-04",
        expiryDate: "2027-09-15",
        quantityOrdered: 100,
        quantityReceived: 100,
        unitCost: 4.50,
        totalCost: 450.00
      }
    ],
    totalAmount: 1210.00,
    amountPaid: 0.00,
    dueDate: "2026-09-15",
    paymentStatus: "Overdue",
    deliveryStatus: "Received",
    orderDate: "2026-08-15",
    receivedDate: "2026-08-18",
    notes: "Awaiting invoice settlement."
  },
  {
    id: "po-2025-01",
    purchaseOrderNo: "PO-2025-045",
    supplierId: "sup-2",
    supplierName: "Apex Healthcare Supplies",
    items: [
      {
        medicineId: "med-5",
        name: "Ventolin Evohaler",
        batchNumber: "VTN-2024-11",
        expiryDate: "2026-11-01",
        quantityOrdered: 150,
        quantityReceived: 150,
        unitCost: 14.00,
        totalCost: 2100.00
      }
    ],
    totalAmount: 2100.00,
    amountPaid: 2100.00,
    dueDate: "2025-11-30",
    paymentStatus: "Paid",
    deliveryStatus: "Received",
    orderDate: "2025-11-02",
    receivedDate: "2025-11-05",
    notes: "Seasonal winter respiratory stock."
  }
];

export const initialExpenses: Expense[] = [
  {
    id: "exp-1",
    category: "Electricity",
    description: "Monthly electricity bill for refrigeration & dispensary AC",
    amount: 450.00,
    date: "2026-09-05",
    paymentMethod: "Bank Transfer",
    recordedBy: "Super Admin",
    payee: "Metropolitan Power Utility",
    referenceNumber: "ELEC-2026-09"
  },
  {
    id: "exp-2",
    category: "Repairs & Maintenance",
    description: "Cold chain temperature logger calibration & service",
    amount: 180.00,
    date: "2026-09-08",
    paymentMethod: "Credit Card",
    recordedBy: "Super Admin",
    payee: "BioTech Precision Services",
    referenceNumber: "INV-9921"
  },
  {
    id: "exp-3",
    category: "Rent",
    description: "Monthly retail pharmacy facility lease",
    amount: 2200.00,
    date: "2026-09-01",
    paymentMethod: "Bank Transfer",
    recordedBy: "Super Admin",
    payee: "City Commercial Properties",
    referenceNumber: "RENT-SEP-26"
  },
  {
    id: "exp-4",
    category: "Internet",
    description: "High-speed optical fiber internet & POS gateway",
    amount: 95.00,
    date: "2026-09-12",
    paymentMethod: "Mobile Payment",
    recordedBy: "Store Manager",
    payee: "Telecom Express",
    referenceNumber: "NET-2026-09"
  },
  {
    id: "exp-5",
    category: "Office Supplies",
    description: "Thermal POS receipt paper rolls (box of 50)",
    amount: 65.00,
    date: "2026-09-15",
    paymentMethod: "Cash",
    recordedBy: "Sarah Cashier",
    payee: "Stationery Depot",
    referenceNumber: "REC-4410"
  },
  // 2025 Expenses
  {
    id: "exp-2025-01",
    category: "Rent",
    description: "Monthly pharmacy premise rent",
    amount: 2100.00,
    date: "2025-12-01",
    paymentMethod: "Bank Transfer",
    recordedBy: "Super Admin",
    payee: "City Commercial Properties"
  },
  {
    id: "exp-2025-02",
    category: "Salaries & Wages",
    description: "Staff payroll & pharmacist dispensary bonus",
    amount: 3800.00,
    date: "2025-12-25",
    paymentMethod: "Bank Transfer",
    recordedBy: "Super Admin",
    payee: "Pharmacy Staff Accounts"
  },
  // 2024 Expenses
  {
    id: "exp-2024-01",
    category: "Licences & Registration",
    description: "State Pharmacy Council annual license renewal",
    amount: 650.00,
    date: "2024-10-10",
    paymentMethod: "Bank Transfer",
    recordedBy: "Super Admin",
    payee: "State Pharmacy Licensing Board"
  }
];

export const initialUsers: User[] = [];

export const initialAuditLogs: AuditLog[] = [
  {
    id: "log-1",
    timestamp: "2026-08-12 14:10:02",
    userName: "Sarah Cashier",
    role: "Cashier",
    action: "Completed Sale Invoice INV-2026-00403",
    module: "POS",
    details: "Sale amount: $10.54 via Mobile Payment."
  },
  {
    id: "log-2",
    timestamp: "2026-08-12 11:45:15",
    userName: "Sarah Cashier",
    role: "Cashier",
    action: "Completed Sale Invoice INV-2026-00402",
    module: "POS",
    details: "Linked prescription RX-2026-0892. Total $59.13."
  },
  {
    id: "log-3",
    timestamp: "2026-08-11 14:20:00",
    userName: "Pharm. Sarah Connor",
    role: "Pharmacist",
    action: "Dispensed Prescription RX-2026-0892",
    module: "Prescriptions",
    details: "Customer Marcus Aurelius Thorne. Meds: Glucophage XR."
  },
  {
    id: "log-4",
    timestamp: "2026-08-10 09:30:00",
    userName: "Dr. Alexander Hayes",
    role: "Super Admin",
    action: "Created Purchase Order PO-2026-092",
    module: "Purchases",
    details: "Supplier: MediSupply Wholesale Corp. Amount: $1200.00."
  }
];
