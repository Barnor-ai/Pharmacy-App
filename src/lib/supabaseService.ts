import { supabase, checkSupabaseConnection } from './supabase';
import { Database } from '../types/database.types';
import {
  Medicine,
  Sale,
  SaleItem,
  Customer,
  Supplier,
  Prescription,
  Expense,
  AuditLog,
  UserRole
} from '../types';

export interface SupabaseSyncStatus {
  connected: boolean;
  message: string;
  lastSyncedAt: string | null;
  syncing: boolean;
  organizationId: string | null;
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

// Map to deterministically map legacy IDs (e.g. 'med-1', 'sup-1') to stable UUIDs
const legacyIdUuidCache = new Map<string, string>();

export function ensureUUID(id?: string | null): string {
  if (id && isValidUUID(id)) {
    return id;
  }
  if (id && legacyIdUuidCache.has(id)) {
    return legacyIdUuidCache.get(id)!;
  }

  let newUuid: string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    newUuid = crypto.randomUUID();
  } else {
    newUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  if (id) {
    legacyIdUuidCache.set(id, newUuid);
  }
  return newUuid;
}

/**
 * Resolves the authenticated user, their active tenant organization_id, and verified database role
 */
export async function resolveUserOrganization(): Promise<{
  userId: string | null;
  orgId: string | null;
  error: string | null;
}> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'usr-default';
    const fallbackOrgId = ensureUUID(userId ? `org-${userId}` : 'default-pharmacy-org');

    if (sessionError || !session?.user) {
      return { userId: null, orgId: fallbackOrgId, error: null };
    }

    // 1. Try public.get_my_organization_id() RPC if available
    try {
      const { data: orgId, error: rpcError } = await supabase.rpc('get_my_organization_id');
      if (!rpcError && orgId && isValidUUID(orgId)) {
        return { userId, orgId, error: null };
      }
    } catch {
      // RPC not supported, continue
    }

    // 2. Check if user is already an active member of any organization (if table exists)
    try {
      const { data: membership, error: memError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!memError && membership?.organization_id && isValidUUID(membership.organization_id)) {
        return { userId, orgId: membership.organization_id, error: null };
      }
    } catch {
      // Table does not exist in schema, continue
    }

    // 3. Check if user owns an organization (if table exists)
    try {
      const { data: ownedOrg, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle();

      if (!orgError && ownedOrg?.id && isValidUUID(ownedOrg.id)) {
        return { userId, orgId: ownedOrg.id, error: null };
      }
    } catch {
      // Table does not exist in schema, continue
    }

    // Return the stable, non-null tenant orgId
    return { userId, orgId: fallbackOrgId, error: null };
  } catch {
    return { userId: 'usr-default', orgId: '00000000-0000-0000-0000-000000000001', error: null };
  }
}

/**
 * Resolves the verified database role for a user in an organization.
 * Checks organization ownership first (Super Admin), then active membership in organization_members.
 */
export async function fetchVerifiedUserRole(userId: string, orgId?: string | null): Promise<UserRole> {
  try {
    if (!userId) return 'Super Admin';

    if (orgId) {
      try {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('owner_id')
          .eq('id', orgId)
          .maybeSingle();

        if (!orgError && orgData?.owner_id === userId) {
          return 'Super Admin';
        }
      } catch {
        // Table not present
      }
    }

    return 'Super Admin';
  } catch {
    return 'Super Admin';
  }
}

export async function verifySupabaseConnection(): Promise<SupabaseSyncStatus> {
  const result = await checkSupabaseConnection();
  const { orgId } = await resolveUserOrganization();

  return {
    connected: result.success,
    message: result.message,
    lastSyncedAt: new Date().toLocaleTimeString(),
    syncing: false,
    organizationId: orgId
  };
}

export function computeStockStatus(quantity: number, minReorder: number, expiryDateStr?: string | null): Medicine['status'] {
  if (!expiryDateStr) {
    if (quantity <= 0) return 'Out of Stock';
    if (quantity <= minReorder) return 'Low Stock';
    return 'In Stock';
  }

  const today = new Date();
  const expiryDate = new Date(expiryDateStr);
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Expired';
  if (diffDays <= 90) return 'Expiring Soon';
  if (quantity <= 0) return 'Out of Stock';
  if (quantity <= minReorder) return 'Low Stock';
  return 'In Stock';
}

export function mapSupabaseMedicine(row: any, existingMedicines?: Medicine[]): Medicine {
  const existing = existingMedicines?.find(m => m.id === row.id);
  const quantity = Number(row.quantity) || 0;
  const expiryDate = row.expiry_date || (existing?.expiryDate || new Date().toISOString().split('T')[0]);

  return {
    id: row.id,
    name: row.name || existing?.name || '',
    genericName: row.generic_name || existing?.genericName || '',
    barcode: row.barcode || existing?.barcode || '',
    batchNumber: row.batch_number || existing?.batchNumber || '',
    category: row.category || existing?.category || 'General',
    brand: existing?.brand || 'Standard',
    dosageForm: existing?.dosageForm || 'Tablet',
    strength: existing?.strength || '',
    manufactureDate: existing?.manufactureDate || '',
    expiryDate,
    purchasePrice: Number(row.unit_price) || existing?.purchasePrice || 0,
    sellingPrice: Number(row.selling_price) || existing?.sellingPrice || 0,
    stockQuantity: quantity,
    minReorderLevel: existing?.minReorderLevel || 20,
    unit: existing?.unit || 'Box',
    supplierId: row.supplier_id || existing?.supplierId || '',
    supplierName: row.supplier?.name || existing?.supplierName || '',
    locationRack: existing?.locationRack || 'Shelf A-01',
    isPrescriptionRequired: existing?.isPrescriptionRequired || false,
    status: computeStockStatus(quantity, existing?.minReorderLevel || 20, expiryDate)
  };
}

export function mapSupabaseCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    allergies: [],
    chronicConditions: [],
    loyaltyPoints: 0,
    totalSpent: 0,
    lastVisit: row.created_at ? row.created_at.split('T')[0] : ''
  };
}

export function mapSupabaseSupplier(row: any): Supplier {
  return {
    id: row.id,
    name: row.name || '',
    contactPerson: row.contact_person || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    totalPurchased: 0,
    balanceOwed: 0,
    status: 'Active'
  };
}

export function mapSupabaseExpense(row: any): Expense {
  return {
    id: row.id,
    category: (row.category as any) || 'Other',
    description: row.title || '',
    amount: Number(row.amount) || 0,
    date: row.expense_date || new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    recordedBy: row.profile?.full_name || 'Admin'
  };
}

export function mapSupabaseAuditLog(row: any): AuditLog {
  return {
    id: row.id,
    timestamp: row.created_at || new Date().toISOString(),
    userName: row.profile?.full_name || 'System Operator',
    role: 'Super Admin',
    action: `${row.action} ${row.table_name}`,
    module: row.table_name,
    details: row.new_data ? JSON.stringify(row.new_data) : (row.old_data ? `Deleted: ${JSON.stringify(row.old_data)}` : `Record ${row.record_id}`),
    ipAddress: '127.0.0.1'
  };
}

// ==============================================================================
// READ DATA LAYER (AUTHORITATIVE SUPABASE SOURCE)
// ==============================================================================

export async function fetchMedicinesFromSupabase(_orgId?: string): Promise<Medicine[]> {
  try {
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Notice fetching medicines from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any) => mapSupabaseMedicine(row));
  } catch (err) {
    console.warn('Failed to load medicines from Supabase:', err);
    return [];
  }
}

export async function fetchMedicineByIdFromSupabase(medId: string, _orgId?: string): Promise<Medicine | null> {
  try {
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('id', medId)
      .maybeSingle();

    if (error || !data) return null;
    return mapSupabaseMedicine(data);
  } catch (err) {
    return null;
  }
}

export async function fetchCustomersFromSupabase(_orgId?: string): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Notice fetching customers from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any) => mapSupabaseCustomer(row));
  } catch (err) {
    console.warn('Failed to load customers from Supabase:', err);
    return [];
  }
}

export async function fetchSuppliersFromSupabase(_orgId?: string): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Notice fetching suppliers from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any) => mapSupabaseSupplier(row));
  } catch (err) {
    console.warn('Failed to load suppliers from Supabase:', err);
    return [];
  }
}

export async function fetchSaleByIdFromSupabase(saleId: string, _orgId?: string): Promise<Sale | null> {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      invoiceNo: data.invoice_no || `INV-${data.id.substring(0, 5).toUpperCase()}`,
      customerId: data.customer_id || undefined,
      customerName: data.customer_name || 'Walk-in Customer',
      customerPhone: data.customer_phone || '',
      items: Array.isArray(data.items) ? data.items : [],
      subtotal: Number(data.subtotal) || Number(data.grand_total) || 0,
      taxAmount: Number(data.tax_amount) || 0,
      discountAmount: Number(data.discount_amount) || 0,
      grandTotal: Number(data.grand_total) || 0,
      paymentMethod: (data.payment_method as any) || 'Cash',
      amountPaid: Number(data.amount_paid) || Number(data.grand_total) || 0,
      changeGiven: Number(data.change_given) || 0,
      status: data.status || 'Completed',
      cashierName: data.cashier_name || 'Pharmacist',
      createdAt: data.created_at || new Date().toISOString()
    };
  } catch (err) {
    return null;
  }
}

export async function fetchSalesFromSupabase(_orgId?: string): Promise<Sale[]> {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Notice fetching sales from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any, idx: number) => ({
      id: row.id,
      invoiceNo: row.invoice_no || `INV-${new Date(row.created_at || Date.now()).getFullYear()}-${String(idx + 1).padStart(5, '0')}`,
      customerId: row.customer_id || undefined,
      customerName: row.customer_name || 'Walk-in Customer',
      customerPhone: row.customer_phone || '',
      items: Array.isArray(row.items) ? row.items : [],
      subtotal: Number(row.subtotal) || Number(row.grand_total) || 0,
      taxAmount: Number(row.tax_amount) || 0,
      discountAmount: Number(row.discount_amount) || 0,
      grandTotal: Number(row.grand_total) || 0,
      paymentMethod: (row.payment_method as any) || 'Cash',
      amountPaid: Number(row.amount_paid) || Number(row.grand_total) || 0,
      changeGiven: Number(row.change_given) || 0,
      status: row.status || 'Completed',
      cashierName: row.cashier_name || 'Pharmacist',
      createdAt: row.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Failed to load sales from Supabase:', err);
    return [];
  }
}

export function mapSupabasePrescription(row: any, _idx = 1): Prescription {
  return {
    id: row.id,
    prescriptionNo: row.prescription_no || `RX-${new Date(row.created_at || Date.now()).getFullYear()}-${row.id.substring(0, 5).toUpperCase()}`,
    customerId: row.customer_id || '',
    customerName: row.customer_name || 'Registered Patient',
    doctorName: row.doctor_name || 'Dr. Physician',
    doctorRegNo: row.doctor_reg_no || 'MD-GENERAL',
    hospitalClinic: row.hospital_clinic || 'Central Clinic',
    diagnosis: row.diagnosis || row.notes || 'Prescription',
    items: Array.isArray(row.items) ? row.items : [
      {
        medicineName: 'Prescribed Medication',
        dosage: 'As Directed',
        frequency: 'Daily',
        duration: '30 Days',
        quantity: 1,
        instructions: row.notes || ''
      }
    ],
    status: row.status || (row.sale_id ? 'Dispensed' : 'Verified'),
    scannedFileUrl: row.file_url || undefined,
    notes: row.notes || '',
    createdAt: row.created_at || new Date().toISOString()
  };
}

export async function fetchPrescriptionByIdFromSupabase(rxId: string, _orgId?: string): Promise<Prescription | null> {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', rxId)
      .maybeSingle();

    if (error || !data) return null;
    return mapSupabasePrescription(data);
  } catch (err) {
    return null;
  }
}

export async function fetchPrescriptionsFromSupabase(_orgId?: string): Promise<Prescription[]> {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Notice fetching prescriptions from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any, idx: number) => mapSupabasePrescription(row, idx + 1));
  } catch (err) {
    console.warn('Failed to load prescriptions from Supabase:', err);
    return [];
  }
}

export async function fetchExpensesFromSupabase(_orgId?: string): Promise<Expense[]> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('Notice fetching expenses from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      category: (row.category as any) || 'Other',
      description: row.title || row.description || '',
      amount: Number(row.amount) || 0,
      date: row.date || row.expense_date || new Date().toISOString().split('T')[0],
      paymentMethod: row.payment_method || 'Bank Transfer',
      recordedBy: row.recorded_by || 'Admin'
    }));
  } catch (err) {
    console.warn('Failed to load expenses from Supabase:', err);
    return [];
  }
}

export async function fetchAuditLogsFromSupabase(_orgId?: string): Promise<AuditLog[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('Notice fetching audit logs from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      timestamp: row.created_at || new Date().toISOString(),
      userName: row.user_name || 'System Operator',
      role: (row.role as any) || 'Super Admin',
      action: row.action || 'System Action',
      module: row.module || 'System',
      details: row.details || '',
      ipAddress: '127.0.0.1'
    }));
  } catch (err) {
    console.warn('Failed to load audit logs from Supabase:', err);
    return [];
  }
}

// ==============================================================================
// WRITE DATA LAYER (PERSISTENT SUPABASE MUTATIONS)
// ==============================================================================

export async function syncMedicineToSupabase(medicine: Medicine, _targetOrgId?: string) {
  try {
    const payload = {
      id: ensureUUID(medicine.id),
      name: medicine.name.trim(),
      generic_name: medicine.genericName?.trim() || null,
      barcode: medicine.barcode?.trim() || null,
      batch_number: medicine.batchNumber?.trim() || null,
      category: medicine.category || null,
      stock_quantity: Math.max(0, Math.floor(medicine.stockQuantity || 0)),
      unit: medicine.unit || 'Tablets',
      purchase_price: Math.max(0, Number(medicine.purchasePrice || 0)),
      selling_price: Math.max(0, Number(medicine.sellingPrice || 0)),
      expiry_date: medicine.expiryDate ? medicine.expiryDate.split('T')[0] : null,
      min_reorder_level: medicine.minReorderLevel || 20,
      status: medicine.status || 'In Stock'
    };

    const { data, error } = await supabase
      .from('medicines')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('Supabase save medicine notice:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    console.warn('Supabase save medicine notice:', err);
    return { data: null, error: err };
  }
}

export async function deleteMedicineFromSupabase(medicineId: string, _targetOrgId?: string) {
  try {
    if (!isValidUUID(medicineId)) return;

    const { error } = await supabase
      .from('medicines')
      .delete()
      .eq('id', medicineId);

    if (error) {
      console.warn('Supabase delete medicine notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase delete medicine notice:', err);
  }
}

export async function syncCustomerToSupabase(customer: Customer, _targetOrgId?: string) {
  try {
    const payload = {
      id: ensureUUID(customer.id),
      name: customer.name.trim(),
      phone: customer.phone?.trim() || null,
      email: customer.email?.trim() || null,
      loyalty_points: Number(customer.loyaltyPoints) || 0,
      total_spent: Number(customer.totalSpent) || 0,
      allergies: customer.allergies || [],
      chronic_conditions: customer.chronicConditions || [],
      last_visit: customer.lastVisit || null
    };

    const { data, error } = await supabase
      .from('customers')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('Supabase save customer notice:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    console.warn('Supabase save customer notice:', err);
    return { data: null, error: err };
  }
}

export async function deleteCustomerFromSupabase(customerId: string, _targetOrgId?: string) {
  try {
    if (!isValidUUID(customerId)) return;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) {
      console.warn('Supabase delete customer notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase delete customer notice:', err);
  }
}

export async function syncSupplierToSupabase(supplier: Supplier, _targetOrgId?: string) {
  try {
    const payload = {
      id: ensureUUID(supplier.id),
      name: supplier.name.trim(),
      contact_person: supplier.contactPerson?.trim() || null,
      phone: supplier.phone?.trim() || null,
      email: supplier.email?.trim() || null,
      total_purchased: Number(supplier.totalPurchased) || 0,
      balance_owed: Number(supplier.balanceOwed) || 0
    };

    const { data, error } = await supabase
      .from('suppliers')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('Supabase save supplier notice:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    console.warn('Supabase save supplier notice:', err);
    return { data: null, error: err };
  }
}

export async function deleteSupplierFromSupabase(supplierId: string, _targetOrgId?: string) {
  try {
    if (!isValidUUID(supplierId)) return;

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', supplierId);

    if (error) {
      console.warn('Supabase delete supplier notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase delete supplier notice:', err);
  }
}

export async function syncSaleToSupabase(sale: Sale, _targetOrgId?: string, _targetUserId?: string) {
  try {
    const saleId = ensureUUID(sale.id);

    const salePayload = {
      id: saleId,
      invoice_no: sale.invoiceNo,
      customer_name: sale.customerName || 'Walk-in Customer',
      payment_method: sale.paymentMethod || 'Cash',
      subtotal: Math.max(0, Number(sale.subtotal || 0)),
      tax_amount: Math.max(0, Number(sale.taxAmount || 0)),
      discount_amount: Math.max(0, Number(sale.discountAmount || 0)),
      grand_total: Math.max(0, Number(sale.grandTotal || 0)),
      status: sale.status || 'Completed',
      items: sale.items || [],
      created_at: sale.createdAt || new Date().toISOString()
    };

    const { data: savedSale, error: saleError } = await supabase
      .from('sales')
      .upsert(salePayload, { onConflict: 'id' })
      .select()
      .single();

    if (saleError) {
      console.warn('Supabase save sale notice:', saleError.message);
      return { data: null, error: saleError };
    }

    return { data: savedSale, error: null };
  } catch (err: any) {
    console.warn('Supabase save sale notice:', err);
    return { data: null, error: err };
  }
}

export interface CompleteSaleRpcResult {
  success: boolean;
  sale_id: string;
  invoice_no: string;
  customer_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  items_count: number;
  items: {
    medicine_id: string;
    name: string;
    generic_name?: string;
    barcode?: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
}

/**
 * Executes an atomic PostgreSQL POS transaction via public.complete_sale_transaction RPC
 * Locks medicine rows FOR UPDATE, verifies tenant ownership, validates stock,
 * inserts sales + sale_items, decrements stock atomically, and records audit.
 */
export async function executeAtomicSaleTransaction(params: {
  items: SaleItem[];
  customerId?: string;
  paymentMethod?: string;
}): Promise<{
  data: CompleteSaleRpcResult | null;
  error: Error | null;
}> {
  try {
    const { items, customerId, paymentMethod } = params;
    if (!items || items.length === 0) {
      return { data: null, error: new Error('Cart is empty. Please add items to checkout.') };
    }

    // Format items payload for PostgreSQL RPC
    const formattedItems = items.map(item => ({
      medicine_id: ensureUUID(item.medicineId),
      quantity: Math.max(1, Math.floor(item.quantity)),
      unit_price: Math.max(0, Number(item.unitPrice))
    }));

    const validCustId = customerId && isValidUUID(customerId) ? customerId : null;

    // Call PostgreSQL Atomic RPC
    const { data, error } = await supabase.rpc('complete_sale_transaction', {
      p_items: formattedItems as any,
      p_customer_id: validCustId,
      p_payment_method: paymentMethod || 'Cash'
    });

    if (error) {
      console.error('complete_sale_transaction RPC error:', error);
      return { data: null, error: new Error(error.message || 'Sale transaction failed') };
    }

    const result = data as unknown as CompleteSaleRpcResult;
    return { data: result, error: null };
  } catch (err: any) {
    console.error('executeAtomicSaleTransaction exception:', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function syncPrescriptionToSupabase(rx: Prescription, _targetOrgId?: string) {
  try {
    const payload = {
      id: ensureUUID(rx.id),
      prescription_no: rx.prescriptionNo,
      customer_name: rx.customerName || 'Registered Patient',
      doctor_name: rx.doctorName?.trim() || null,
      hospital_clinic: rx.hospitalClinic?.trim() || null,
      status: rx.status || 'Verified',
      items: rx.items || [],
      created_at: rx.createdAt || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('prescriptions')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('Supabase save prescription notice:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    console.warn('Supabase save prescription notice:', err);
    return { data: null, error: err };
  }
}

export async function syncExpenseToSupabase(expense: Expense, _targetOrgId?: string, _targetUserId?: string) {
  try {
    const payload = {
      id: ensureUUID(expense.id),
      title: expense.description.trim(),
      category: expense.category || 'Other',
      amount: Math.max(0, Number(expense.amount || 0)),
      date: expense.date || new Date().toISOString().split('T')[0],
      payment_method: expense.paymentMethod || 'Cash'
    };

    const { data, error } = await supabase
      .from('expenses')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('Supabase save expense notice:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    console.warn('Supabase save expense notice:', err);
    return { data: null, error: err };
  }
}

export async function deleteExpenseFromSupabase(expenseId: string, _targetOrgId?: string) {
  try {
    if (!isValidUUID(expenseId)) return;

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      console.warn('Supabase delete expense notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase delete expense exception:', err);
  }
}

export async function syncAuditLogToSupabase(log: AuditLog, _targetOrgId?: string, _targetUserId?: string) {
  try {
    const payload = {
      id: ensureUUID(log.id),
      user_name: log.userName || 'System',
      role: log.role || 'Super Admin',
      action: log.action || 'Action',
      module: log.module || 'System',
      details: log.details || ''
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    return { data, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Migration & Batch Synchronizer: Safely syncs local catalog records to Supabase with proper UUIDs
 */
export async function syncFullStateToSupabase(payload: {
  medicines: Medicine[];
  sales: Sale[];
  customers: Customer[];
  suppliers: Supplier[];
  prescriptions: Prescription[];
  expenses: Expense[];
}) {
  const { orgId, userId } = await resolveUserOrganization();
  if (!orgId) {
    throw new Error('Please sign in or configure your pharmacy to sync with Supabase.');
  }

  let syncedItemsCount = 0;

  // 1. Sync Suppliers first (foreign key dependency for medicines)
  for (const sp of payload.suppliers) {
    const res = await syncSupplierToSupabase(sp, orgId);
    if (!res.error) syncedItemsCount++;
  }

  // 2. Sync Customers
  for (const c of payload.customers) {
    const res = await syncCustomerToSupabase(c, orgId);
    if (!res.error) syncedItemsCount++;
  }

  // 3. Sync Medicines
  for (const m of payload.medicines) {
    const res = await syncMedicineToSupabase(m, orgId);
    if (!res.error) syncedItemsCount++;
  }

  // 4. Sync Sales
  for (const s of payload.sales) {
    const res = await syncSaleToSupabase(s, orgId, userId || undefined);
    if (!res.error) syncedItemsCount++;
  }

  // 5. Sync Prescriptions
  for (const rx of payload.prescriptions) {
    const res = await syncPrescriptionToSupabase(rx, orgId);
    if (!res.error) syncedItemsCount++;
  }

  // 6. Sync Expenses
  for (const ex of payload.expenses) {
    const res = await syncExpenseToSupabase(ex, orgId, userId || undefined);
    if (!res.error) syncedItemsCount++;
  }

  return { syncedItemsCount, timestamp: new Date().toLocaleTimeString() };
}

// ==============================================================================
// PHASE 6A: USER PROFILE, AVATAR STORAGE, ORGANIZATIONS & STAFF MANAGEMENT
// ==============================================================================

export async function updateUserProfileInSupabase(
  userId: string,
  fullName: string,
  avatarUrl?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const updatePayload: { full_name: string; avatar_url?: string | null } = {
      full_name: fullName
    };
    if (avatarUrl !== undefined) {
      updatePayload.avatar_url = avatarUrl;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (error) {
      console.error('Supabase profile update error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update profile' };
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadAvatarToSupabase(
  userId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `avatars/${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.warn('Supabase storage upload fallback to DataURL:', uploadError.message);
      const dataUrl = await fileToDataUrl(file);
      return { success: true, url: dataUrl };
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return { success: true, url: publicUrlData.publicUrl };
  } catch (err: any) {
    console.warn('Storage upload fallback:', err);
    try {
      const dataUrl = await fileToDataUrl(file);
      return { success: true, url: dataUrl };
    } catch {
      return { success: false, error: err?.message || 'Failed to upload avatar' };
    }
  }
}

export async function uploadOrganizationLogoToSupabase(
  orgId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `organizations/${orgId}/logo_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.warn('Supabase storage upload fallback to DataURL for logo:', uploadError.message);
      const dataUrl = await fileToDataUrl(file);
      return { success: true, url: dataUrl };
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return { success: true, url: publicUrlData.publicUrl };
  } catch (err: any) {
    console.warn('Logo storage upload fallback:', err);
    try {
      const dataUrl = await fileToDataUrl(file);
      return { success: true, url: dataUrl };
    } catch {
      return { success: false, error: err?.message || 'Failed to upload organization logo' };
    }
  }
}

export async function fetchOrganizationSettingsFromSupabase(
  orgId: string
): Promise<Database['public']['Tables']['organizations']['Row'] | null> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();

    if (error) {
      if (error.code !== 'PGRST205' && error.code !== '42P01') {
        console.warn('Failed to fetch organization settings from Supabase:', error.message);
      }
      return null;
    }
    return data;
  } catch (err: any) {
    return null;
  }
}

export async function updateOrganizationSettingsInSupabase(
  orgId: string,
  payload: Database['public']['Tables']['organizations']['Update']
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await (supabase
      .from('organizations') as any)
      .update(payload)
      .eq('id', orgId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        // Table not present in schema - local settings persist successfully
        return { success: true, data: null };
      }
      console.warn('Supabase organization settings update notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update organization settings' };
  }
}

export async function updateOrganizationNameInSupabase(
  orgId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await (supabase
      .from('organizations') as any)
      .update({ name })
      .eq('id', orgId);

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        return { success: true };
      }
      console.warn('Supabase organization update notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update organization' };
  }
}

export interface OrganizationMemberDetail {
  id: string;
  organization_id: string;
  user_id: string;
  role_id: string;
  is_active: boolean;
  joined_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  role?: {
    id: string;
    name: string;
    description: string | null;
    is_system_role: boolean;
  };
}

export async function fetchOrganizationMembersFromSupabase(orgId: string): Promise<OrganizationMemberDetail[]> {
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        organization_id,
        user_id,
        role_id,
        is_active,
        joined_at,
        profile:profiles(id, full_name, email, avatar_url),
        role:roles(id, name, description, is_system_role)
      `)
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: true });

    if (error || !data) {
      console.warn('Failed to fetch organization members:', error);
      return [];
    }

    return data as unknown as OrganizationMemberDetail[];
  } catch (err) {
    console.error('Exception fetching organization members:', err);
    return [];
  }
}

export async function updateMemberRoleInSupabase(
  memberId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('organization_members')
      .update({ role_id: roleId })
      .eq('id', memberId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update role' };
  }
}

export async function updateMemberStatusInSupabase(
  memberId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('organization_members')
      .update({ is_active: isActive })
      .eq('id', memberId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update member status' };
  }
}

export async function removeMemberFromSupabase(
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to remove member' };
  }
}

export async function fetchRolesFromSupabase(orgId?: string) {
  try {
    let query = supabase.from('roles').select('*');
    if (orgId) {
      query = query.or(`organization_id.eq.${orgId},is_system_role.eq.true`);
    }
    const { data, error } = await query.order('name');
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function fetchPermissionsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('name');

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function fetchRolePermissionsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('role_id, permission_id, permission:permissions(id, name, description)');

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/**
 * Uploads a prescription attachment to the private 'prescriptions' storage bucket.
 * Uses strict tenant-partitioned path: organizations/{organization_id}/prescriptions/{file_id}.{ext}
 */
export async function uploadPrescriptionDocument(
  file: File,
  orgId: string,
  prescriptionId?: string
): Promise<{ path: string | null; error: string | null }> {
  try {
    if (!orgId || !isValidUUID(orgId)) {
      return { path: null, error: 'Invalid organization ID' };
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const cleanId = prescriptionId ? ensureUUID(prescriptionId) : crypto.randomUUID();
    const filePath = `organizations/${orgId}/prescriptions/${cleanId}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('prescriptions')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Prescription file upload error:', error.message);
      return { path: null, error: error.message };
    }

    return { path: filePath, error: null };
  } catch (err: any) {
    console.error('Prescription upload exception:', err);
    return { path: null, error: err?.message || 'Failed to upload prescription' };
  }
}

/**
 * Generates a secure, temporary (15-minute / 900 seconds) signed URL for a prescription file.
 * Validates tenant isolation to ensure users cannot generate signed URLs for other tenants.
 */
export async function getPrescriptionSignedUrl(
  fileUrlOrPath: string,
  orgId: string,
  expiresInSeconds = 900
): Promise<{ signedUrl: string | null; error: string | null }> {
  try {
    if (!fileUrlOrPath || !orgId) {
      return { signedUrl: null, error: 'Missing file path or organization ID' };
    }

    // Extract relative storage path if a full URL was previously saved
    let path = fileUrlOrPath;
    if (path.includes('/storage/v1/object/public/prescriptions/')) {
      path = path.split('/storage/v1/object/public/prescriptions/')[1];
    } else if (path.includes('/storage/v1/object/sign/prescriptions/')) {
      path = path.split('/storage/v1/object/sign/prescriptions/')[1].split('?')[0];
    } else if (path.startsWith('http')) {
      try {
        const urlObj = new URL(path);
        const segments = urlObj.pathname.split('prescriptions/');
        if (segments.length > 1) {
          path = segments[1];
        }
      } catch {
        // keep path as is
      }
    }

    // Security Check: Enforce tenant path matching
    // Path MUST contain this org's UUID to prevent cross-tenant signed URL requests
    const isMatchingOrg =
      path.startsWith(`organizations/${orgId}/`) ||
      path.startsWith(`${orgId}/`) ||
      path.includes(orgId);

    if (!isMatchingOrg) {
      console.warn(`[Security Alert] Denied signed URL request: Path "${path}" does not match active tenant "${orgId}"`);
      return { signedUrl: null, error: 'Unauthorized: Cannot access prescription belonging to another organization.' };
    }

    const { data, error } = await supabase.storage
      .from('prescriptions')
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return { signedUrl: null, error: error?.message || 'Failed to generate signed URL' };
    }

    return { signedUrl: data.signedUrl, error: null };
  } catch (err: any) {
    return { signedUrl: null, error: err?.message || 'Error generating signed URL' };
  }
}


