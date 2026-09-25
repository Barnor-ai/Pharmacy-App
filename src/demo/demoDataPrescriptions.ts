import { Prescription } from '../types';

export const demoPrescriptions: Prescription[] = [
  {
    id: "rx-gh-001",
    prescriptionNo: "RX-2026-0015",
    customerId: "cust-gh-22",
    customerName: "Gideon Lamptey",
    doctorName: "Dr. Kwabena Frimpong",
    doctorRegNo: "MDC-GH-44182",
    hospitalClinic: "Ridge Regional Hospital, Accra",
    diagnosis: "Urinary Tract Infection (UTI) with fever and inflammation",
    items: [
      {
        medicineName: "Ciprofloxacin 500mg Tablets",
        dosage: "500mg",
        frequency: "Twice daily (every 12 hours)",
        duration: "7 days",
        quantity: 14,
        instructions: "Take with plenty of water. Complete the entire course."
      },
      {
        medicineName: "Cataflam 50mg Tablets",
        dosage: "50mg",
        frequency: "Twice daily after meals",
        duration: "3 days",
        quantity: 6,
        instructions: "Take strictly after food for pain relief."
      }
    ],
    status: "Dispensed",
    createdAt: "2026-02-05",
    dispensedAt: "2026-02-05 11:25:00",
    dispensedBy: "Ama Boateng",
    notes: "Patient advised on plenty of fluids and sun sensitivity during antibiotic course."
  },
  {
    id: "rx-gh-002",
    prescriptionNo: "RX-2026-0032",
    customerId: "cust-gh-03",
    customerName: "Kofi Poku",
    doctorName: "Dr. Nana Yaa Asantewaa",
    doctorRegNo: "MDC-GH-33921",
    hospitalClinic: "Korle Bu Teaching Hospital, Accra",
    diagnosis: "Type 2 Diabetes Mellitus & Essential Hypertension (Chronic Refill)",
    items: [
      {
        medicineName: "Glucophage 500mg Metformin",
        dosage: "500mg",
        frequency: "Twice daily with meals (morning and evening)",
        duration: "30 days",
        quantity: 60,
        instructions: "Take with meals to minimize stomach upset."
      },
      {
        medicineName: "Amlodipine 10mg Tablets",
        dosage: "10mg",
        frequency: "Once daily in the morning",
        duration: "30 days",
        quantity: 30,
        instructions: "Monitor blood pressure regularly."
      }
    ],
    status: "Dispensed",
    createdAt: "2026-03-02",
    dispensedAt: "2026-03-02 09:15:00",
    dispensedBy: "Ama Boateng",
    notes: "Monthly chronic medication refill. Blood sugar log checked by pharmacist."
  },
  {
    id: "rx-gh-003",
    prescriptionNo: "RX-2026-0068",
    customerId: "cust-gh-28",
    customerName: "Richard Donkor",
    doctorName: "Dr. Seth Mensah",
    doctorRegNo: "MDC-GH-55209",
    hospitalClinic: "Nyaho Medical Centre, Airport Residential, Accra",
    diagnosis: "Acute Bacterial Sinusitis & Facial Pain",
    items: [
      {
        medicineName: "Augmentin 625mg Tablets",
        dosage: "625mg",
        frequency: "One tablet every 12 hours",
        duration: "7 days",
        quantity: 14,
        instructions: "Take at start of meals to improve absorption and avoid nausea."
      },
      {
        medicineName: "Brufen 400mg Ibuprofen Tablets",
        dosage: "400mg",
        frequency: "Every 8 hours as needed",
        duration: "5 days",
        quantity: 15,
        instructions: "Take with food or milk."
      }
    ],
    status: "Dispensed",
    createdAt: "2026-07-08",
    dispensedAt: "2026-07-08 12:40:00",
    dispensedBy: "Ama Boateng",
    notes: "Patient reported no known drug allergies. Advised to complete antibiotic."
  },
  {
    id: "rx-gh-004",
    prescriptionNo: "RX-2026-0084",
    customerId: "cust-gh-04",
    customerName: "Abena Osei",
    doctorName: "Dr. Emmanuel Ofori",
    doctorRegNo: "MDC-GH-22814",
    hospitalClinic: "Trust Hospital, Osu, Accra",
    diagnosis: "Moderate Bronchial Asthma Exacerbation",
    items: [
      {
        medicineName: "Ventolin Inhaler 100mcg",
        dosage: "100mcg/puff",
        frequency: "1-2 puffs every 4-6 hours as needed for shortness of breath",
        duration: "30 days",
        quantity: 2,
        instructions: "Shake well before use. Rinse mouth after inhalation."
      }
    ],
    status: "Dispensed",
    createdAt: "2026-08-29",
    dispensedAt: "2026-08-29 11:30:00",
    dispensedBy: "Ama Boateng",
    notes: "Demonstrated proper inhaler technique with spacer."
  },
  {
    id: "rx-gh-005",
    prescriptionNo: "RX-2026-0105",
    customerId: "cust-gh-01",
    customerName: "Kwame Mensah",
    doctorName: "Dr. Patrick Lamptey",
    doctorRegNo: "MDC-GH-88192",
    hospitalClinic: "37 Military Hospital, Accra",
    diagnosis: "Stage 1 Hypertension Routine Review",
    items: [
      {
        medicineName: "Amlodipine 10mg Tablets",
        dosage: "10mg",
        frequency: "Once daily morning",
        duration: "30 days",
        quantity: 30,
        instructions: "Maintain low sodium diet and take at same time daily."
      }
    ],
    status: "Dispensed",
    createdAt: "2026-09-24",
    dispensedAt: "2026-09-24 16:20:00",
    dispensedBy: "Daniel Owusu",
    notes: "Refill dispensed under standing order protocol."
  },
  {
    id: "rx-gh-006",
    prescriptionNo: "RX-2026-0112",
    customerId: "cust-gh-04",
    customerName: "Abena Osei",
    doctorName: "Dr. Emmanuel Ofori",
    doctorRegNo: "MDC-GH-22814",
    hospitalClinic: "Trust Hospital, Osu, Accra",
    diagnosis: "Asthma Maintenance & Bronchodilator Refill",
    items: [
      {
        medicineName: "Ventolin Inhaler 100mcg",
        dosage: "100mcg/puff",
        frequency: "2 puffs as needed for wheezing",
        duration: "30 days",
        quantity: 2,
        instructions: "Keep one inhaler in purse and one at bedside."
      }
    ],
    status: "Dispensed",
    createdAt: "2026-09-25",
    dispensedAt: "2026-09-25 11:50:00",
    dispensedBy: "Ama Boateng",
    notes: "Dispensed today during morning clinic hours."
  },
  {
    id: "rx-gh-007",
    prescriptionNo: "RX-2026-0115",
    customerId: "cust-gh-06",
    customerName: "Kweku Boateng",
    doctorName: "Dr. Patricia Donkor",
    doctorRegNo: "MDC-GH-77319",
    hospitalClinic: "Finney Hospital & Fertility Centre, Accra",
    diagnosis: "Acute Osteoarthritis Flare-up with Peptic Ulcer History",
    items: [
      {
        medicineName: "Cataflam 50mg Tablets",
        dosage: "50mg",
        frequency: "Twice daily after full meals",
        duration: "5 days",
        quantity: 10,
        instructions: "Must be taken alongside gastric protection."
      },
      {
        medicineName: "Omeprazole 20mg Capsules",
        dosage: "20mg",
        frequency: "Once daily 30 minutes before breakfast",
        duration: "14 days",
        quantity: 14,
        instructions: "Swallow whole with a full glass of water."
      }
    ],
    status: "Dispensed",
    createdAt: "2026-09-25",
    dispensedAt: "2026-09-25 13:25:00",
    dispensedBy: "Grace Asante",
    notes: "Dispensed today - patient educated on gastric ulcer warning signs."
  },
  {
    id: "rx-gh-008",
    prescriptionNo: "RX-2026-0119",
    customerId: "cust-gh-16",
    customerName: "Isaac Gyan",
    doctorName: "Dr. Kwabena Frimpong",
    doctorRegNo: "MDC-GH-44182",
    hospitalClinic: "Ridge Regional Hospital, Accra",
    diagnosis: "Severe Dental Abscess Post-Extraction",
    items: [
      {
        medicineName: "Augmentin 625mg Tablets",
        dosage: "625mg",
        frequency: "Every 12 hours",
        duration: "7 days",
        quantity: 14,
        instructions: "Take with food. Complete all tablets."
      },
      {
        medicineName: "Cataflam 50mg Tablets",
        dosage: "50mg",
        frequency: "Three times daily after meals",
        duration: "4 days",
        quantity: 12,
        instructions: "Do not exceed prescribed frequency."
      }
    ],
    status: "Verified",
    createdAt: "2026-09-25",
    notes: "Verified by Pharmacist Ama Boateng. Ready for customer pickup at POS counter."
  },
  {
    id: "rx-gh-009",
    prescriptionNo: "RX-2026-0120",
    customerId: "cust-gh-09",
    customerName: "Esi Badu",
    doctorName: "Dr. Nana Yaa Asantewaa",
    doctorRegNo: "MDC-GH-33921",
    hospitalClinic: "Greater Accra Regional Hospital",
    diagnosis: "Pediatric Upper Respiratory Tract Infection",
    items: [
      {
        medicineName: "Calpol Infant Suspension 100ml",
        dosage: "5ml (120mg)",
        frequency: "Every 6 hours as needed for fever",
        duration: "3 days",
        quantity: 1,
        instructions: "Shake well. Use oral syringe provided in box."
      }
    ],
    status: "Pending",
    createdAt: "2026-09-25",
    notes: "Awaiting parent arrival for dosage counseling and dispensing."
  }
];
