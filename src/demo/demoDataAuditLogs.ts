import { AuditLog } from '../types';

export const demoAuditLogs: AuditLog[] = [
  {
    id: "log-gh-001",
    timestamp: "2026-09-25 15:35:10",
    userName: "Daniel Owusu",
    role: "Cashier",
    action: "Sale Completed",
    module: "POS",
    details: "Processed invoice INV-2026-0886 (GH₵ 317.75) via Mobile Payment for customer Afia Serwaa"
  },
  {
    id: "log-gh-002",
    timestamp: "2026-09-25 14:40:22",
    userName: "Daniel Owusu",
    role: "Cashier",
    action: "Sale Completed",
    module: "POS",
    details: "Processed invoice INV-2026-0885 (GH₵ 120.75) via Cash for Walk-in Customer"
  },
  {
    id: "log-gh-003",
    timestamp: "2026-09-25 13:28:45",
    userName: "Ama Boateng",
    role: "Pharmacist",
    action: "Prescription Dispensed",
    module: "Prescriptions",
    details: "Dispensed prescription RX-2026-0115 (Cataflam 50mg & Omeprazole 20mg) for Kweku Boateng"
  },
  {
    id: "log-gh-004",
    timestamp: "2026-09-25 12:15:30",
    userName: "Grace Asante",
    role: "Store Manager",
    action: "Stock Adjusted",
    module: "Inventory",
    details: "Stock reconciliation for Redoxon 1000mg: verified physical count match (48 units)"
  },
  {
    id: "log-gh-005",
    timestamp: "2026-09-25 11:52:18",
    userName: "Ama Boateng",
    role: "Pharmacist",
    action: "Prescription Verified",
    module: "Prescriptions",
    details: "Verified doctor authorization for RX-2026-0112 (Ventolin Inhaler) by Dr. Emmanuel Ofori"
  },
  {
    id: "log-gh-006",
    timestamp: "2026-09-25 10:18:05",
    userName: "Daniel Owusu",
    role: "Cashier",
    action: "Sale Completed",
    module: "POS",
    details: "Processed invoice INV-2026-0882 (GH₵ 163.30) via Cash for Walk-in Customer"
  },
  {
    id: "log-gh-007",
    timestamp: "2026-09-25 09:30:40",
    userName: "Kwesi Appiah",
    role: "Accountant",
    action: "Expense Logged",
    module: "Financials",
    details: "Recorded expense: Courier delivery for urgent emergency cold-chain supplies (GH₵ 680.00)"
  },
  {
    id: "log-gh-008",
    timestamp: "2026-09-25 08:47:12",
    userName: "Daniel Owusu",
    role: "Cashier",
    action: "Sale Completed",
    module: "POS",
    details: "Processed opening sale INV-2026-0881 (GH₵ 277.90) for Akosua Frimpong"
  },
  {
    id: "log-gh-009",
    timestamp: "2026-09-24 16:35:00",
    userName: "John Mensah",
    role: "Pharmacy Owner",
    action: "Stock Valuation Reviewed",
    module: "Reports",
    details: "Generated comprehensive inventory valuation & monthly profit margin statement"
  },
  {
    id: "log-gh-010",
    timestamp: "2026-09-24 14:20:15",
    userName: "Grace Asante",
    role: "Store Manager",
    action: "Purchase Received",
    module: "Purchases",
    details: "Received shipment PO-2026-0142 from Atlantic Medicals Ghana (35 Pregnacare, 60 Fefol)"
  },
  {
    id: "log-gh-011",
    timestamp: "2026-09-22 11:10:00",
    userName: "Grace Asante",
    role: "Store Manager",
    action: "Stock Inward",
    module: "Inventory",
    details: "Added batch BN-2026-VEN02 (60 units Ventolin Inhaler) from CarePoint Distributors"
  },
  {
    id: "log-gh-012",
    timestamp: "2026-09-20 15:45:00",
    userName: "Ama Boateng",
    role: "Pharmacist",
    action: "Inventory Expiry Check",
    module: "Inventory",
    details: "Flagged batch BN-2024-EXP01 for quarantine - Expiry date reached"
  },
  {
    id: "log-gh-013",
    timestamp: "2026-09-18 10:25:00",
    userName: "Kwesi Appiah",
    role: "Accountant",
    action: "Supplier Payment Recorded",
    module: "Financials",
    details: "Recorded partial payment of GH₵ 12,000.00 to West Africa Pharma Wholesale (PO-2026-0072)"
  }
];
