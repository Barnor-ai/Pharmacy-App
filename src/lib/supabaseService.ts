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
    if (sessionError || !session?.user) {
      return { userId: null, orgId: null, error: 'User is not authenticated' };
    }

    const userId = session.user.id;

    // 1. Try public.get_my_organization_id() RPC
    const { data: orgId, error: rpcError } = await supabase.rpc('get_my_organization_id');
    if (!rpcError && orgId && isValidUUID(orgId)) {
      return { userId, orgId, error: null };
    }

    // 2. Check if user is already an active member of any organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membership?.organization_id && isValidUUID(membership.organization_id)) {
      return { userId, orgId: membership.organization_id, error: null };
    }

    // 3. Check if user owns an organization
    const { data: ownedOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', userId)
      .limit(1)
      .maybeSingle();

    if (ownedOrg?.id && isValidUUID(ownedOrg.id)) {
      return { userId, orgId: ownedOrg.id, error: null };
    }

    // 4. If no organization exists for this user, bootstrap a new tenant organization
    const userMeta = session.user.user_metadata || {};
    const pharmacyName = userMeta.name || userMeta.full_name || 'My Pharmacy';
    const slug = `org-${userId.substring(0, 8)}-${Date.now()}`;

    const { data: newOrg, error: createOrgError } = await supabase
      .from('organizations')
      .insert({
        name: `${pharmacyName} Store`,
        slug,
        owner_id: userId
      })
      .select('id')
      .single();

    if (createOrgError) {
      console.error('Failed to auto-provision tenant organization:', createOrgError);
      return { userId, orgId: null, error: createOrgError.message };
    }

    return { userId, orgId: newOrg.id, error: null };
  } catch (err: any) {
    console.error('Error resolving tenant organization:', err);
    return { userId: null, orgId: null, error: err?.message || 'Tenant resolution failed' };
  }
}

/**
 * Resolves the verified database role for a user in an organization.
 * Checks organization ownership first (Super Admin), then active membership in organization_members.
 */
export async function fetchVerifiedUserRole(userId: string, orgId?: string | null): Promise<UserRole> {
  try {
    if (!userId) return 'Cashier';

    // 1. Check if user is the organization owner
    if (orgId) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', orgId)
        .maybeSingle();

      if (orgData?.owner_id === userId) {
        return 'Super Admin';
      }

      // 2. Fetch role assigned in organization_members
      const { data: memberData } = await supabase
        .from('organization_members')
        .select(`
          is_active,
          role:roles (
            name
          )
        `)
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      const roleName = (memberData as any)?.role?.name;
      if (roleName === 'Super Admin' || roleName === 'Store Manager' || roleName === 'Pharmacist' || roleName === 'Cashier') {
        return roleName as UserRole;
      }
    }

    // Default fallback
    return 'Pharmacist';
  } catch (err) {
    console.warn('Error fetching verified user role from database:', err);
    return 'Pharmacist';
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

export async function fetchMedicinesFromSupabase(orgId: string): Promise<Medicine[]> {
  try {
    const { data, error } = await supabase
      .from('medicines')
      .select('*, supplier:suppliers(id, name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching medicines from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any) => mapSupabaseMedicine(row));
  } catch (err) {
    console.warn('Failed to load medicines from Supabase:', err);
    return [];
  }
}

export async function fetchMedicineByIdFromSupabase(medId: string, orgId: string): Promise<Medicine | null> {
  try {
    const { data, error } = await supabase
      .from('medicines')
      .select('*, supplier:suppliers(id, name)')
      .eq('id', medId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error || !data) return null;
    return mapSupabaseMedicine(data);
  } catch (err) {
    return null;
  }
}

export async function fetchCustomersFromSupabase(orgId: string): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching customers from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any) => mapSupabaseCustomer(row));
  } catch (err) {
    console.warn('Failed to load customers from Supabase:', err);
    return [];
  }
}

export async function fetchSuppliersFromSupabase(orgId: string): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching suppliers from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any) => mapSupabaseSupplier(row));
  } catch (err) {
    console.warn('Failed to load suppliers from Supabase:', err);
    return [];
  }
}

export async function fetchSaleByIdFromSupabase(saleId: string, orgId: string): Promise<Sale | null> {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        organization_id,
        customer_id,
        sold_by,
        total_amount,
        payment_method,
        created_at,
        customer:customers(name, phone),
        profile:profiles(full_name, email),
        sale_items(
          id,
          medicine_id,
          quantity,
          unit_price,
          subtotal,
          medicine:medicines(name, generic_name, barcode)
        )
      `)
      .eq('id', saleId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error || !data) return null;

    const items: SaleItem[] = (data.sale_items || []).map((si: any) => ({
      medicineId: si.medicine_id,
      barcode: si.medicine?.barcode || '',
      name: si.medicine?.name || 'Item',
      genericName: si.medicine?.generic_name || '',
      dosageForm: 'Unit',
      unitPrice: Number(si.unit_price) || 0,
      quantity: Number(si.quantity) || 1,
      discount: 0,
      total: Number(si.subtotal) || 0,
      isPrescriptionRequired: false
    }));

    const grandTotal = Number(data.total_amount) || 0;
    const subtotal = items.reduce((acc, it) => acc + it.total, 0) || grandTotal;

    const anyData = data as any;
    const custObj = Array.isArray(anyData.customer) ? anyData.customer[0] : anyData.customer;
    const profObj = Array.isArray(anyData.profile) ? anyData.profile[0] : anyData.profile;

    return {
      id: data.id,
      invoiceNo: `INV-${new Date(data.created_at || Date.now()).getFullYear()}-${data.id.substring(0, 5).toUpperCase()}`,
      customerId: data.customer_id || undefined,
      customerName: custObj?.name || 'Walk-in Customer',
      customerPhone: custObj?.phone || '',
      items,
      subtotal,
      taxAmount: 0,
      discountAmount: 0,
      grandTotal,
      paymentMethod: (data.payment_method as any) || 'Cash',
      amountPaid: grandTotal,
      changeGiven: 0,
      status: 'Completed',
      cashierName: profObj?.full_name || 'Pharmacist',
      createdAt: data.created_at || new Date().toISOString()
    };
  } catch (err) {
    return null;
  }
}

export async function fetchSalesFromSupabase(orgId: string): Promise<Sale[]> {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        organization_id,
        customer_id,
        sold_by,
        total_amount,
        payment_method,
        created_at,
        customer:customers(name, phone),
        profile:profiles(full_name, email),
        sale_items(
          id,
          medicine_id,
          quantity,
          unit_price,
          subtotal,
          medicine:medicines(name, generic_name, barcode)
        )
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching sales from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any, idx: number) => {
      const items: SaleItem[] = (row.sale_items || []).map((si: any) => ({
        medicineId: si.medicine_id,
        barcode: si.medicine?.barcode || '',
        name: si.medicine?.name || 'Item',
        genericName: si.medicine?.generic_name || '',
        dosageForm: 'Unit',
        unitPrice: Number(si.unit_price) || 0,
        quantity: Number(si.quantity) || 1,
        discount: 0,
        total: Number(si.subtotal) || 0,
        isPrescriptionRequired: false
      }));

      const grandTotal = Number(row.total_amount) || 0;
      const subtotal = items.reduce((acc, it) => acc + it.total, 0) || grandTotal;

      return {
        id: row.id,
        invoiceNo: `INV-${new Date(row.created_at || Date.now()).getFullYear()}-${String(idx + 1).padStart(5, '0')}`,
        customerId: row.customer_id || undefined,
        customerName: row.customer?.name || 'Walk-in Customer',
        customerPhone: row.customer?.phone || '',
        items,
        subtotal,
        taxAmount: 0,
        discountAmount: 0,
        grandTotal,
        paymentMethod: (row.payment_method as any) || 'Cash',
        amountPaid: grandTotal,
        changeGiven: 0,
        status: 'Completed',
        cashierName: row.profile?.full_name || 'Pharmacist',
        createdAt: row.created_at || new Date().toISOString()
      };
    });
  } catch (err) {
    console.warn('Failed to load sales from Supabase:', err);
    return [];
  }
}

export function mapSupabasePrescription(row: any, idx = 1): Prescription {
  return {
    id: row.id,
    prescriptionNo: `RX-${new Date(row.created_at || Date.now()).getFullYear()}-${row.id.substring(0, 5).toUpperCase()}`,
    customerId: row.customer_id || '',
    customerName: row.customer?.name || 'Registered Patient',
    doctorName: row.doctor_name || 'Dr. Physician',
    doctorRegNo: 'MD-GENERAL',
    hospitalClinic: 'Central Clinic',
    diagnosis: row.notes || 'Prescription',
    items: [
      {
        medicineName: 'Prescribed Medication',
        dosage: 'As Directed',
        frequency: 'Daily',
        duration: '30 Days',
        quantity: 1,
        instructions: row.notes || ''
      }
    ],
    status: row.sale_id ? 'Dispensed' : 'Verified',
    scannedFileUrl: row.file_url || undefined,
    notes: row.notes || '',
    createdAt: row.created_at || new Date().toISOString()
  };
}

export async function fetchPrescriptionByIdFromSupabase(rxId: string, orgId: string): Promise<Prescription | null> {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*, customer:customers(name)')
      .eq('id', rxId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error || !data) return null;
    return mapSupabasePrescription(data);
  } catch (err) {
    return null;
  }
}

export async function fetchPrescriptionsFromSupabase(orgId: string): Promise<Prescription[]> {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*, customer:customers(name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching prescriptions from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any, idx: number) => ({
      id: row.id,
      prescriptionNo: `RX-${new Date(row.created_at || Date.now()).getFullYear()}-${String(idx + 1001).padStart(4, '0')}`,
      customerId: row.customer_id || '',
      customerName: row.customer?.name || 'Registered Patient',
      doctorName: row.doctor_name || 'Dr. Physician',
      doctorRegNo: 'MD-GENERAL',
      hospitalClinic: 'Central Clinic',
      diagnosis: row.notes || 'Prescription',
      items: [
        {
          medicineName: 'Prescribed Medication',
          dosage: 'As Directed',
          frequency: 'Daily',
          duration: '30 Days',
          quantity: 1,
          instructions: row.notes || ''
        }
      ],
      status: row.sale_id ? 'Dispensed' : 'Verified',
      scannedFileUrl: row.file_url || undefined,
      notes: row.notes || '',
      createdAt: row.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Failed to load prescriptions from Supabase:', err);
    return [];
  }
}

export async function fetchExpensesFromSupabase(orgId: string): Promise<Expense[]> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, profile:profiles(full_name)')
      .eq('organization_id', orgId)
      .order('expense_date', { ascending: false });

    if (error) {
      console.warn('Error fetching expenses from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      category: (row.category as any) || 'Other',
      description: row.title || '',
      amount: Number(row.amount) || 0,
      date: row.expense_date || new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      recordedBy: row.profile?.full_name || 'Admin'
    }));
  } catch (err) {
    console.warn('Failed to load expenses from Supabase:', err);
    return [];
  }
}

export async function fetchAuditLogsFromSupabase(orgId: string): Promise<AuditLog[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, profile:profiles(full_name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('Error fetching audit logs from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      timestamp: row.created_at || new Date().toISOString(),
      userName: row.profile?.full_name || 'System Operator',
      role: 'Super Admin',
      action: `${row.action} ${row.table_name}`,
      module: row.table_name,
      details: row.new_data ? JSON.stringify(row.new_data) : (row.old_data ? `Deleted: ${JSON.stringify(row.old_data)}` : `Record ${row.record_id}`),
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

export async function syncMedicineToSupabase(medicine: Medicine, targetOrgId?: string) {
  try {
    const orgId = targetOrgId || (await resolveUserOrganization()).orgId;
    if (!orgId) {
      console.error('Cannot save medicine: No active organization ID');
      return { data: null, error: new Error('No active tenant organization found') };
    }

    const payload = {
      id: ensureUUID(medicine.id),
      organization_id: orgId,
      supplier_id: isValidUUID(medicine.supplierId) ? medicine.supplierId : null,
      name: medicine.name.trim(),
      generic_name: medicine.genericName?.trim() || null,
      barcode: medicine.barcode?.trim() || null,
      batch_number: medicine.batchNumber?.trim() || null,
      category: medicine.category || null,
      quantity: Math.max(0, Math.floor(medicine.stockQuantity || 0)),
      unit_price: Math.max(0, Number(medicine.purchasePrice || 0)),
      selling_price: Math.max(0, Number(medicine.sellingPrice || 0)),
      expiry_date: medicine.expiryDate ? medicine.expiryDate.split('T')[0] : null
    };

    const { data, error } = await supabase
      .from('medicines')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase save medicine error:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Supabase save medicine failed:', err);
    return { data: null, error: err };
  }
}

export async function deleteMedicineFromSupabase(medicineId: string, targetOrgId?: string) {
  try {
    const orgId = targetOrgId || (await resolveUserOrganization()).orgId;
    if (!orgId || !isValidUUID(medicineId)) return;

    const { error } = await supabase
      .from('medicines')
      .delete()
      .eq('id', medicineId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Supabase delete medicine error:', error.message);
    }
  } catch (err) {
    console.error('Supabase delete medicine exception:', err);
  }
}

export async function syncCustomerToSupabase(customer: Customer, targetOrgId?: string) {
  try {
    const orgId = targetOrgId || (await resolveUserOrganization()).orgId;
    if (!orgId) return { data: null, error: new Error('No tenant organization') };

    const payload = {
      id: ensureUUID(customer.id),
      organization_id: orgId,
      name: customer.name.trim(),
      phone: customer.phone?.trim() || null,
      email: customer.email?.trim() || null,
      address: customer.address?.trim() || null
    };

    const { data, error } = await supabase
      .from('customers')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase save customer error:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Supabase save customer failed:', err);
    return { data: null, error: err };
  }
}

export async function deleteCustomerFromSupabase(customerId: string, targetOrgId?: string) {
  try {
    const orgId = targetOrgId || (await resolveUserOrganization()).orgId;
    if (!orgId || !isValidUUID(customerId)) return;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Supabase delete customer error:', error.message);
    }
  } catch (err) {
    console.error('Supabase delete customer exception:', err);
  }
}

export async function syncSupplierToSupabase(supplier: Supplier, targetOrgId?: string) {
  try {
    const orgId = targetOrgId || (await resolveUserOrganization()).orgId;
    if (!orgId) return { data: null, error: new Error('No tenant organization') };

    const payload = {
      id: ensureUUID(supplier.id),
      organization_id: orgId,
      name: supplier.name.trim(),
      contact_person: supplier.contactPerson?.trim() || null,
      phone: supplier.phone?.trim() || null,
      email: supplier.email?.trim() || null,
      address: supplier.address?.trim() || null
    };

    const { data, error } = await supabase
      .from('suppliers')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase save supplier error:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Supabase save supplier failed:', err);
    return { data: null, error: err };
  }
}

export async function deleteSupplierFromSupabase(supplierId: string, targetOrgId?: string) {
  try {
    const orgId = targetOrgId || (await resolveUserOrganization()).orgId;
    if (!orgId || !isValidUUID(supplierId)) return;

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', supplierId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Supabase delete supplier error:', error.message);
    }
  } catch (err) {
    console.error('Supabase delete supplier exception:', err);
  }
}

export async function syncSaleToSupabase(sale: Sale, targetOrgId?: string, targetUserId?: string) {
  try {
    const authInfo = await resolveUserOrganization();
    const orgId = targetOrgId || authInfo.orgId;
    const userId = targetUserId || authInfo.userId;

    if (!orgId || !userId) {
      console.error('Cannot save sale: Missing tenant organization ID or authenticated user ID');
      return { data: null, error: new Error('Missing auth or tenant ID') };
    }

    const saleId = ensureUUID(sale.id);

    // 1. Insert parent sale
    const salePayload = {
      id: saleId,
      organization_id: orgId,
      customer_id: isValidUUID(sale.customerId) ? sale.customerId : null,
      sold_by: userId,
      total_amount: Math.max(0, Number(sale.grandTotal || 0)),
      payment_method: sale.paymentMethod || 'Cash',
      created_at: sale.createdAt || new Date().toISOString()
    };

    const { data: savedSale, error: saleError } = await supabase
      .from('sales')
      .upsert(salePayload, { onConflict: 'id' })
      .select()
      .single();

    if (saleError) {
      console.error('Supabase save sale error:', saleError.message);
      return { data: null, error: saleError };
    }

    // 2. Insert line items
    if (sale.items && sale.items.length > 0) {
      const itemsPayload = sale.items.map(it => ({
        id: crypto.randomUUID(),
        sale_id: saleId,
        medicine_id: ensureUUID(it.medicineId),
        quantity: Math.max(1, Number(it.quantity || 1)),
        unit_price: Math.max(0, Number(it.unitPrice || 0)),
        subtotal: Math.max(0, Number(it.total || 0))
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsPayload);

      if (itemsError) {
        console.error('Supabase save sale_items warning:', itemsError.message);
      }
    }

    return { data: savedSale, error: null };
  } catch (err: any) {
    console.error('Supabase save sale exception:', err);
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

export async function syncPrescriptionToSupabase(rx: Prescription, targetOrgId?: string) {
  try {
    const orgId = targetOrgId || (await resolveUserOrganization()).orgId;
    if (!orgId) return { data: null, error: new Error('No tenant organization') };

    const payload = {
      id: ensureUUID(rx.id),
      organization_id: orgId,
      customer_id: isValidUUID(rx.customerId) ? rx.customerId : null,
      doctor_name: rx.doctorName?.trim() || null,
      file_url: rx.scannedFileUrl || null,
      notes: rx.notes || (rx.diagnosis ? `Diagnosis: ${rx.diagnosis}` : null),
      created_at: rx.createdAt || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('prescriptions')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase save prescription error:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Supabase save prescription failed:', err);
    return { data: null, error: err };
  }
}

export async function syncExpenseToSupabase(expense: Expense, targetOrgId?: string, targetUserId?: string) {
  try {
    const authInfo = await resolveUserOrganization();
    const orgId = targetOrgId || authInfo.orgId;
    const userId = targetUserId || authInfo.userId;

    if (!orgId || !userId) return { data: null, error: new Error('Missing auth or tenant ID') };

    const payload = {
      id: ensureUUID(expense.id),
      organization_id: orgId,
      title: expense.description.trim(),
      amount: Math.max(0, Number(expense.amount || 0)),
      category: expense.category || 'Other',
      expense_date: expense.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0],
      created_by: userId
    };

    const { data, error } = await supabase
      .from('expenses')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase save expense error:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Supabase save expense failed:', err);
    return { data: null, error: err };
  }
}

export async function deleteExpenseFromSupabase(expenseId: string, targetOrgId?: string) {
  try {
    const orgId = targetOrgId || (await resolveUserOrganization()).orgId;
    if (!orgId || !isValidUUID(expenseId)) return;

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Supabase delete expense error:', error.message);
    }
  } catch (err) {
    console.error('Supabase delete expense exception:', err);
  }
}

export async function syncAuditLogToSupabase(log: AuditLog, targetOrgId?: string, targetUserId?: string) {
  // PostgreSQL database triggers already automatically generate audit logs for medicines, sales, expenses.
  // This helper is available for direct user actions if desired.
  return { data: null, error: null };
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
      console.warn('Failed to fetch organization settings from Supabase:', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.warn('fetchOrganizationSettingsFromSupabase error:', err);
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
      console.error('Supabase organization settings update error:', error);
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
      console.error('Supabase organization update error:', error);
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


