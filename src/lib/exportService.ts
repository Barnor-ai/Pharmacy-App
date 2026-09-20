import JSZip from 'jszip';
import { supabase } from './supabase';
import { resolveUserOrganization, isValidUUID } from './supabaseService';

export interface ExportMetadata {
  exportDate: string;
  organizationName: string;
  organizationId: string;
  applicationName: string;
  applicationVersion: string;
  format: 'csv' | 'json' | 'zip';
  datasetList: string[];
  totalRecordsSummary?: Record<string, number>;
}

export type ExportDatasetKey =
  | 'medicines'
  | 'customers'
  | 'suppliers'
  | 'sales'
  | 'sale_items'
  | 'prescriptions'
  | 'expenses'
  | 'audit_logs'
  | 'staff'
  | 'organization'
  | 'subscription'
  | 'subscription_payments';

export interface DatasetInfo {
  key: ExportDatasetKey;
  label: string;
  description: string;
  category: 'Inventory & Catalog' | 'Commerce & Sales' | 'Clinical & Rx' | 'Financial & Operations' | 'Administration';
  sensitiveNotice?: string;
  recordCountEstimate?: number;
}

export const EXPORTABLE_DATASETS: DatasetInfo[] = [
  {
    key: 'medicines',
    label: 'Medicines & Inventory',
    description: 'All pharmaceutical stock items, pricing, batch numbers, barcodes, and categories.',
    category: 'Inventory & Catalog'
  },
  {
    key: 'customers',
    label: 'Customer Directory',
    description: 'Patient and customer contact details, phone numbers, and addresses.',
    category: 'Commerce & Sales'
  },
  {
    key: 'suppliers',
    label: 'Suppliers & Vendors',
    description: 'Supplier directory, representative contact numbers, and vendor addresses.',
    category: 'Inventory & Catalog'
  },
  {
    key: 'sales',
    label: 'Sales Transactions',
    description: 'Completed POS checkout transactions, invoice totals, payment methods, and timestamps.',
    category: 'Commerce & Sales'
  },
  {
    key: 'sale_items',
    label: 'Sale Line Items',
    description: 'Granular itemized breakdown for each sale with quantities and unit prices.',
    category: 'Commerce & Sales'
  },
  {
    key: 'prescriptions',
    label: 'Prescription Metadata',
    description: 'Doctor names, diagnoses, dates, and verification status. (Physical files remain secured).',
    category: 'Clinical & Rx',
    sensitiveNotice: 'Physical prescription files are excluded to maintain HIPAA/GDPR clinical storage compliance.'
  },
  {
    key: 'expenses',
    label: 'Operating Expenses',
    description: 'Categorized dispensary expenses, utility payments, and operating costs.',
    category: 'Financial & Operations'
  },
  {
    key: 'audit_logs',
    label: 'System Audit Trail',
    description: 'Historical security and mutation audit records for your organization.',
    category: 'Financial & Operations'
  },
  {
    key: 'staff',
    label: 'Staff & Members',
    description: 'Active staff members, assigned roles, email addresses, and joining dates.',
    category: 'Administration',
    sensitiveNotice: 'Passwords, session hashes, and JWT auth tokens are strictly excluded.'
  },
  {
    key: 'organization',
    label: 'Organization Settings',
    description: 'Pharmacy license number, tax settings, address, invoice prefix, and receipt notices.',
    category: 'Administration'
  },
  {
    key: 'subscription',
    label: 'Subscription Status',
    description: 'Active plan tier, billing frequency, quota limits, and period boundaries.',
    category: 'Financial & Operations'
  },
  {
    key: 'subscription_payments',
    label: 'Billing & Invoices',
    description: 'Subscription billing history, payment references, and payment timestamps.',
    category: 'Financial & Operations'
  }
];

/**
 * Sanitize filename strings by stripping non-alphanumeric chars
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'pharmacy';
}

/**
 * Format a JavaScript Date into ISO YYYY-MM-DD-HHmmss
 */
export function getExportTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const mins = pad(now.getMinutes());
  const secs = pad(now.getSeconds());
  return `${year}-${month}-${day}-${hours}${mins}${secs}`;
}

/**
 * Converts array of objects into RFC 4180 compliant CSV string
 * with CSV Formula Injection (Excel DDE) mitigation and UTF-8 safety
 */
export function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Collect all unique keys from all rows
  const keySet = new Set<string>();
  data.forEach((row) => {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach((k) => keySet.add(k));
    }
  });

  const headers = Array.from(keySet);

  const escapeCSVValue = (val: any): string => {
    if (val === null || val === undefined) {
      return '';
    }
    if (typeof val === 'object') {
      val = JSON.stringify(val);
    }
    let str = String(val);

    // CSV / Excel Formula Injection Protection:
    // Neutralize values starting with '=', '+', '-', '@', '\t', '\r' if they are not pure numbers
    if (str.length > 0 && /^[=+\-@\t\r]/.test(str)) {
      // If it's not a standard valid number (e.g. formula strings like "=1+1", "@SUM", "-cmd")
      const isPureNumeric = !isNaN(Number(str)) && !/^[=@\t\r]/.test(str);
      if (!isPureNumeric) {
        str = `'${str}`;
      }
    }

    // If value contains quotes, commas, newlines or carriage returns, wrap in quotes and double internal quotes
    if (/[",\n\r\t]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map((h) => escapeCSVValue(h)).join(',');
  const rows = data.map((row) => {
    return headers.map((header) => escapeCSVValue(row[header])).join(',');
  });

  return [headerRow, ...rows].join('\r\n');
}

/**
 * Trigger local browser download for Blob
 */
export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

// ==============================================================================
// TENANT-ISOLATED DATA EXTRACTION ENGINE (PAGINATED & SECURE)
// ==============================================================================

const CHUNK_SIZE = 500;

/**
 * Fetch all rows using paginated range queries with deterministic secondary sort
 */
async function fetchAllWithPagination<T = any>(
  tableName: string,
  orgId: string,
  selectQuery: string = '*',
  orderBy: string = 'created_at',
  orderAsc: boolean = false
): Promise<T[]> {
  const results: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const to = from + CHUNK_SIZE - 1;
    const { data, error } = await supabase
      .from(tableName)
      .select(selectQuery)
      .eq('organization_id', orgId)
      .order(orderBy, { ascending: orderAsc })
      .order('id', { ascending: orderAsc })
      .range(from, to);

    if (error) {
      console.warn(`Error fetching batch from ${tableName}:`, error.message);
      break;
    }

    if (data && data.length > 0) {
      results.push(...(data as unknown as T[]));
      if (data.length < CHUNK_SIZE) {
        hasMore = false;
      } else {
        from += CHUNK_SIZE;
      }
    } else {
      hasMore = false;
    }
  }

  return results;
}

export class TenantExportEngine {
  /**
   * 1. Export Medicines / Inventory
   */
  static async exportMedicines(orgId: string): Promise<any[]> {
    const rows = await fetchAllWithPagination('medicines', orgId, '*, supplier:suppliers(name)', 'created_at', false);
    return rows.map((row: any) => ({
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      generic_name: row.generic_name || '',
      barcode: row.barcode || '',
      batch_number: row.batch_number || '',
      category: row.category || 'General',
      quantity: Number(row.quantity) || 0,
      unit_purchase_price: Number(row.unit_price) || 0,
      selling_price: Number(row.selling_price) || 0,
      expiry_date: row.expiry_date || '',
      supplier_id: row.supplier_id || '',
      supplier_name: row.supplier?.name || '',
      created_at: row.created_at || ''
    }));
  }

  /**
   * 2. Export Customers
   */
  static async exportCustomers(orgId: string): Promise<any[]> {
    const rows = await fetchAllWithPagination('customers', orgId, '*', 'created_at', false);
    return rows.map((row: any) => ({
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
      created_at: row.created_at || ''
    }));
  }

  /**
   * 3. Export Suppliers
   */
  static async exportSuppliers(orgId: string): Promise<any[]> {
    const rows = await fetchAllWithPagination('suppliers', orgId, '*', 'created_at', false);
    return rows.map((row: any) => ({
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      contact_person: row.contact_person || '',
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
      created_at: row.created_at || ''
    }));
  }

  /**
   * 4. Export Sales
   */
  static async exportSales(orgId: string): Promise<any[]> {
    const rows = await fetchAllWithPagination('sales', orgId, '*, customer:customers(name, phone), profile:profiles(full_name, email)', 'created_at', false);
    return rows.map((row: any) => ({
      id: row.id,
      organization_id: row.organization_id,
      customer_id: row.customer_id || '',
      customer_name: row.customer?.name || 'Walk-in Customer',
      customer_phone: row.customer?.phone || '',
      sold_by_user_id: row.sold_by || '',
      cashier_name: row.profile?.full_name || row.profile?.email || 'Staff Member',
      total_amount: Number(row.total_amount) || 0,
      payment_method: row.payment_method || 'Cash',
      created_at: row.created_at || ''
    }));
  }

  /**
   * 5. Export Sale Items (Paginated and Tenant-Isolated)
   */
  static async exportSaleItems(orgId: string): Promise<any[]> {
    const results: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const to = from + CHUNK_SIZE - 1;
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          id,
          sale_id,
          medicine_id,
          quantity,
          unit_price,
          subtotal,
          created_at,
          sale:sales!inner(organization_id, payment_method, created_at),
          medicine:medicines(name, generic_name, barcode)
        `)
        .eq('sale.organization_id', orgId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      if (error) {
        console.warn('Error exporting sale items batch:', error.message);
        break;
      }

      if (data && data.length > 0) {
        results.push(...data);
        if (data.length < CHUNK_SIZE) {
          hasMore = false;
        } else {
          from += CHUNK_SIZE;
        }
      } else {
        hasMore = false;
      }
    }

    return results.map((row: any) => ({
      id: row.id,
      sale_id: row.sale_id,
      medicine_id: row.medicine_id,
      medicine_name: row.medicine?.name || 'Medication Item',
      generic_name: row.medicine?.generic_name || '',
      barcode: row.medicine?.barcode || '',
      quantity: Number(row.quantity) || 0,
      unit_price: Number(row.unit_price) || 0,
      subtotal: Number(row.subtotal) || 0,
      created_at: row.created_at || ''
    }));
  }

  /**
   * 6. Export Prescription Metadata (Strictly SAFE metadata, NO raw document files)
   */
  static async exportPrescriptions(orgId: string): Promise<any[]> {
    const rows = await fetchAllWithPagination('prescriptions', orgId, '*, customer:customers(name, phone)', 'created_at', false);
    return rows.map((row: any) => ({
      id: row.id,
      organization_id: row.organization_id,
      customer_id: row.customer_id || '',
      customer_name: row.customer?.name || 'Registered Patient',
      customer_phone: row.customer?.phone || '',
      doctor_name: row.doctor_name || 'Dr. Physician',
      notes_and_diagnosis: row.notes || '',
      dispensed_sale_id: row.sale_id || '',
      has_attached_document: Boolean(row.file_url),
      storage_document_status: row.file_url ? 'Protected by Private Tenant Storage Policy' : 'No document attached',
      created_at: row.created_at || ''
    }));
  }

  /**
   * 7. Export Expenses
   */
  static async exportExpenses(orgId: string): Promise<any[]> {
    const rows = await fetchAllWithPagination('expenses', orgId, '*, profile:profiles(full_name, email)', 'expense_date', false);
    return rows.map((row: any) => ({
      id: row.id,
      organization_id: row.organization_id,
      title: row.title,
      amount: Number(row.amount) || 0,
      category: row.category || 'Other',
      expense_date: row.expense_date || '',
      recorded_by_user_id: row.created_by || '',
      recorded_by_name: row.profile?.full_name || row.profile?.email || 'Admin',
      created_at: row.created_at || ''
    }));
  }

  /**
   * 8. Export Audit Logs
   */
  static async exportAuditLogs(orgId: string): Promise<any[]> {
    const rows = await fetchAllWithPagination('audit_logs', orgId, '*, profile:profiles(full_name, email)', 'created_at', false);
    return rows.map((row: any) => ({
      id: row.id,
      organization_id: row.organization_id,
      timestamp: row.created_at || '',
      user_id: row.user_id || '',
      user_name: row.profile?.full_name || row.profile?.email || 'System Operator',
      action: row.action,
      table_name: row.table_name,
      record_id: row.record_id,
      old_data_summary: row.old_data ? JSON.stringify(row.old_data) : '',
      new_data_summary: row.new_data ? JSON.stringify(row.new_data) : ''
    }));
  }

  /**
   * 9. Export Staff / Members (Sanitized, NO password/JWT/secret tokens)
   */
  static async exportStaff(orgId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        organization_id,
        user_id,
        is_active,
        joined_at,
        profile:profiles(id, full_name, email),
        role:roles(name, description)
      `)
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: true });

    if (error || !data) {
      console.warn('Error exporting staff:', error?.message);
      return [];
    }

    return (data as any[]).map((row: any) => ({
      membership_id: row.id,
      organization_id: row.organization_id,
      user_id: row.user_id,
      full_name: row.profile?.full_name || 'Staff Member',
      email: row.profile?.email || '',
      assigned_role: row.role?.name || 'Staff',
      role_description: row.role?.description || '',
      is_active: row.is_active ? 'Active' : 'Inactive',
      joined_date: row.joined_at || ''
    }));
  }

  /**
   * 10. Export Organization Settings (Sanitized, NO secret keys)
   */
  static async exportOrganizationSettings(orgId: string): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        owner_id,
        phone,
        email,
        address,
        website,
        license_number,
        vat_number,
        currency,
        timezone,
        tax_rate,
        invoice_prefix,
        receipt_header_notice,
        receipt_footer_notice,
        logo_url,
        created_at
      `)
      .eq('id', orgId)
      .maybeSingle();

    if (error || !data) {
      return {
        id: orgId,
        message: 'Organization settings retrieved from active session context.'
      };
    }

    return {
      organization_id: data.id,
      pharmacy_name: data.name,
      slug: data.slug,
      owner_user_id: data.owner_id,
      license_number: data.license_number || '',
      vat_number: data.vat_number || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      website: data.website || '',
      currency: data.currency || 'USD',
      timezone: data.timezone || 'UTC',
      tax_rate: Number(data.tax_rate) || 0,
      invoice_prefix: data.invoice_prefix || 'INV',
      receipt_header_notice: data.receipt_header_notice || '',
      receipt_footer_notice: data.receipt_footer_notice || '',
      logo_url: data.logo_url || '',
      registered_date: data.created_at || ''
    };
  }

  /**
   * 11. Export Subscription Details
   */
  static async exportSubscription(orgId: string): Promise<Record<string, any>> {
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*, plan:subscription_plans(*)')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!subData) {
      return {
        organization_id: orgId,
        status: 'trialing',
        plan: 'Starter Plan',
        notice: 'Default tenant trial active.'
      };
    }

    const anySub = subData as any;
    const plan = anySub.plan;

    return {
      organization_id: subData.organization_id,
      subscription_id: subData.id,
      status: subData.status,
      plan_name: plan?.name || 'Starter',
      plan_slug: plan?.slug || 'starter',
      price: plan?.price || 0,
      currency: plan?.currency || 'USD',
      billing_interval: plan?.billing_interval || 'month',
      max_users_limit: plan?.max_users || 3,
      max_medicines_limit: plan?.max_medicines || 1000,
      current_period_start: subData.current_period_start || '',
      current_period_end: subData.current_period_end || '',
      trial_start: subData.trial_start || '',
      trial_end: subData.trial_end || '',
      cancel_at_period_end: subData.cancel_at_period_end,
      last_payment_date: (subData as any).last_payment_at || ''
    };
  }

  /**
   * 12. Export Subscription Payment History
   */
  static async exportSubscriptionPayments(orgId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('*, plan:subscription_plans(name, slug)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return (data as any[]).map((row: any) => ({
      payment_id: row.id,
      organization_id: row.organization_id,
      plan_name: row.plan?.name || (row.metadata?.plan_slug ? row.metadata.plan_slug.toUpperCase() : 'Subscription'),
      amount: Number(row.amount) || 0,
      currency: row.currency || 'USD',
      status: row.status,
      payment_provider: row.provider || 'paystack',
      payment_reference: row.payment_reference,
      provider_transaction_id: row.provider_transaction_id || '',
      paid_at: row.paid_at || row.created_at || '',
      created_at: row.created_at || ''
    }));
  }

  /**
   * Universal fetcher for a dataset key
   */
  static async fetchDatasetData(key: ExportDatasetKey, orgId: string): Promise<any[] | Record<string, any>> {
    switch (key) {
      case 'medicines':
        return await this.exportMedicines(orgId);
      case 'customers':
        return await this.exportCustomers(orgId);
      case 'suppliers':
        return await this.exportSuppliers(orgId);
      case 'sales':
        return await this.exportSales(orgId);
      case 'sale_items':
        return await this.exportSaleItems(orgId);
      case 'prescriptions':
        return await this.exportPrescriptions(orgId);
      case 'expenses':
        return await this.exportExpenses(orgId);
      case 'audit_logs':
        return await this.exportAuditLogs(orgId);
      case 'staff':
        return await this.exportStaff(orgId);
      case 'organization':
        return await this.exportOrganizationSettings(orgId);
      case 'subscription':
        return await this.exportSubscription(orgId);
      case 'subscription_payments':
        return await this.exportSubscriptionPayments(orgId);
      default:
        return [];
    }
  }

  /**
   * Export a single dataset as CSV or JSON file download
   */
  static async downloadSingleDataset(
    key: ExportDatasetKey,
    format: 'csv' | 'json',
    orgName: string,
    orgId: string
  ): Promise<{ success: boolean; recordCount: number; error?: string }> {
    try {
      if (!orgId || !isValidUUID(orgId)) {
        throw new Error('Valid organization ID is required for tenant data export');
      }

      const data = await this.fetchDatasetData(key, orgId);
      const isArray = Array.isArray(data);
      const recordCount = isArray ? data.length : 1;
      const cleanSlug = sanitizeFilename(orgName);
      const timestamp = getExportTimestamp();

      const metadata: ExportMetadata = {
        exportDate: new Date().toISOString(),
        organizationName: orgName,
        organizationId: orgId,
        applicationName: 'Pharmacy Enterprise Management System',
        applicationVersion: 'v2026.8.26-enterprise',
        format,
        datasetList: [key],
        totalRecordsSummary: { [key]: recordCount }
      };

      if (format === 'json') {
        const payload = {
          metadata,
          data
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const filename = `pharmacy-${cleanSlug}-${key}-${timestamp}.json`;
        triggerBrowserDownload(blob, filename);
      } else {
        // CSV Format with UTF-8 BOM for spreadsheet encoding compatibility
        let csvContent = '';
        if (isArray) {
          csvContent = convertToCSV(data);
        } else {
          csvContent = convertToCSV([data]);
        }
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
        const filename = `pharmacy-${cleanSlug}-${key}-${timestamp}.csv`;
        triggerBrowserDownload(blob, filename);
      }

      return { success: true, recordCount };
    } catch (err: any) {
      console.error('Error downloading dataset:', err);
      return { success: false, recordCount: 0, error: err?.message || 'Export failed' };
    }
  }

  /**
   * Export All Data as a structured ZIP package
   */
  static async downloadAllDataZip(
    orgName: string,
    orgId: string,
    onProgress?: (progressText: string, percentage: number) => void
  ): Promise<{ success: boolean; totalRecords: number; error?: string }> {
    try {
      if (!orgId || !isValidUUID(orgId)) {
        throw new Error('Valid organization ID is required for tenant data export');
      }

      const zip = new JSZip();
      const cleanSlug = sanitizeFilename(orgName);
      const timestamp = getExportTimestamp();
      const recordsSummary: Record<string, number> = {};
      let totalRecords = 0;

      const totalSteps = EXPORTABLE_DATASETS.length;

      for (let i = 0; i < EXPORTABLE_DATASETS.length; i++) {
        const ds = EXPORTABLE_DATASETS[i];
        if (onProgress) {
          onProgress(`Extracting ${ds.label}...`, Math.round(((i + 0.2) / totalSteps) * 90));
        }

        const data = await this.fetchDatasetData(ds.key, orgId);
        const isArray = Array.isArray(data);
        const count = isArray ? data.length : 1;
        recordsSummary[ds.key] = count;
        totalRecords += count;

        // Structured export format per dataset
        if (ds.key === 'organization') {
          zip.file('organization.json', JSON.stringify(data, null, 2));
          zip.file('organization.csv', '\uFEFF' + convertToCSV([data]));
        } else if (ds.key === 'subscription') {
          zip.file('subscription.json', JSON.stringify(data, null, 2));
          zip.file('subscription.csv', '\uFEFF' + convertToCSV([data]));
        } else {
          // Both CSV and JSON files for granular access
          if (isArray) {
            zip.file(`${ds.key}.csv`, '\uFEFF' + convertToCSV(data));
            zip.file(`${ds.key}.json`, JSON.stringify(data, null, 2));
          }
        }
      }

      // Add Master metadata.json to root of ZIP
      const metadata: ExportMetadata = {
        exportDate: new Date().toISOString(),
        organizationName: orgName,
        organizationId: orgId,
        applicationName: 'Pharmacy Enterprise Management System',
        applicationVersion: 'v2026.8.26-enterprise',
        format: 'zip',
        datasetList: EXPORTABLE_DATASETS.map((d) => d.key),
        totalRecordsSummary: recordsSummary
      };

      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      // Add Disaster Recovery & Data Isolation Notice
      const readmeNotice = `# Pharmacy Enterprise Tenant Data Export

Export Date: ${metadata.exportDate}
Organization: ${orgName}
Tenant ID: ${orgId}
Application: ${metadata.applicationName} (${metadata.applicationVersion})

## Summary of Exported Datasets:
${Object.entries(recordsSummary)
  .map(([k, v]) => `- ${k}: ${v} records`)
  .join('\n')}

## Security & Compliance Notice:
1. This archive contains sensitive commercial and clinical operational data scoped exclusively to ${orgName}.
2. Physical prescription document files stored in Supabase Storage buckets are not included in this flat archive and remain securely managed by strict tenant Row-Level Security (RLS) policies.
3. System authentication tokens, hashed passwords, database connection strings, and gateway secret credentials have been stripped to uphold Zero-Trust architecture.
4. Provider-level database backup configuration is managed by your infrastructure administrator.
`;

      zip.file('README.txt', readmeNotice);

      if (onProgress) {
        onProgress('Compressing archive...', 95);
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const zipFilename = `pharmacy-${cleanSlug}-export-${timestamp}.zip`;
      triggerBrowserDownload(zipBlob, zipFilename);

      if (onProgress) {
        onProgress('Export complete!', 100);
      }

      return { success: true, totalRecords };
    } catch (err: any) {
      console.error('Error generating ZIP export package:', err);
      return { success: false, totalRecords: 0, error: err?.message || 'ZIP Export failed' };
    }
  }
}
