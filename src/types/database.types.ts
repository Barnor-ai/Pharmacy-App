export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          website: string | null;
          license_number: string | null;
          vat_number: string | null;
          currency: string;
          timezone: string;
          invoice_prefix: string;
          receipt_header_notice: string | null;
          receipt_footer_notice: string | null;
          logo_url: string | null;
          tax_rate: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_id: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          website?: string | null;
          license_number?: string | null;
          vat_number?: string | null;
          currency?: string;
          timezone?: string;
          invoice_prefix?: string;
          receipt_header_notice?: string | null;
          receipt_footer_notice?: string | null;
          logo_url?: string | null;
          tax_rate?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          owner_id?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          website?: string | null;
          license_number?: string | null;
          vat_number?: string | null;
          currency?: string;
          timezone?: string;
          invoice_prefix?: string;
          receipt_header_notice?: string | null;
          receipt_footer_notice?: string | null;
          logo_url?: string | null;
          tax_rate?: number;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role_id: string;
          is_active: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role_id: string;
          is_active?: boolean;
          joined_at?: string;
        };
        Update: {
          role_id?: string;
          is_active?: boolean;
        };
      };
      roles: {
        Row: {
          id: string;
          organization_id: string | null;
          name: string;
          description: string | null;
          is_system_role: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          name: string;
          description?: string | null;
          is_system_role?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
      };
      permissions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
          created_at: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
          created_at?: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
        };
      };
      medicines: {
        Row: {
          id: string;
          organization_id: string;
          supplier_id: string | null;
          name: string;
          generic_name: string | null;
          barcode: string | null;
          batch_number: string | null;
          category: string | null;
          quantity: number;
          unit_price: number;
          selling_price: number;
          expiry_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          supplier_id?: string | null;
          name: string;
          generic_name?: string | null;
          barcode?: string | null;
          batch_number?: string | null;
          category?: string | null;
          quantity?: number;
          unit_price?: number;
          selling_price?: number;
          expiry_date?: string | null;
          created_at?: string;
        };
        Update: {
          supplier_id?: string | null;
          name?: string;
          generic_name?: string | null;
          barcode?: string | null;
          batch_number?: string | null;
          category?: string | null;
          quantity?: number;
          unit_price?: number;
          selling_price?: number;
          expiry_date?: string | null;
        };
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
        };
      };
      sales: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string | null;
          sold_by: string;
          total_amount: number;
          payment_method: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id?: string | null;
          sold_by: string;
          total_amount: number;
          payment_method?: string;
          created_at?: string;
        };
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          medicine_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          medicine_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at?: string;
        };
      };
      prescriptions: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string | null;
          doctor_name: string | null;
          file_url: string | null;
          notes: string | null;
          sale_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id?: string | null;
          doctor_name?: string | null;
          file_url?: string | null;
          notes?: string | null;
          sale_id?: string | null;
          created_at?: string;
        };
        Update: {
          doctor_name?: string | null;
          file_url?: string | null;
          notes?: string | null;
          sale_id?: string | null;
        };
      };
      expenses: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          amount: number;
          category: string;
          expense_date: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          amount: number;
          category: string;
          expense_date?: string;
          created_by: string;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          action: 'INSERT' | 'UPDATE' | 'DELETE';
          table_name: string;
          record_id: string;
          old_data: Json | null;
          new_data: Json | null;
          created_at: string;
        };
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          currency: string;
          billing_interval: string;
          max_users: number;
          max_medicines: number;
          features: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          price?: number;
          currency?: string;
          billing_interval?: string;
          max_users?: number;
          max_medicines?: number;
          features?: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          price?: number;
          currency?: string;
          billing_interval?: string;
          max_users?: number;
          max_medicines?: number;
          features?: Json;
          is_active?: boolean;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          plan_id: string;
          status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'incomplete';
          current_period_start: string;
          current_period_end: string;
          trial_start: string | null;
          trial_end: string | null;
          cancel_at_period_end: boolean;
          provider: string | null;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          plan_id: string;
          status?: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'incomplete';
          current_period_start?: string;
          current_period_end?: string;
          trial_start?: string | null;
          trial_end?: string | null;
          cancel_at_period_end?: boolean;
          provider?: string | null;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan_id?: string;
          status?: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'incomplete';
          current_period_start?: string;
          current_period_end?: string;
          trial_start?: string | null;
          trial_end?: string | null;
          cancel_at_period_end?: boolean;
          provider?: string | null;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          updated_at?: string;
        };
      };
    };
    Functions: {
      get_my_organization_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      has_permission: {
        Args: {
          permission_name: string;
        };
        Returns: boolean;
      };
      complete_sale_transaction: {
        Args: {
          p_items: Json;
          p_customer_id?: string | null;
          p_payment_method?: string;
        };
        Returns: Json;
      };
      change_subscription_plan: {
        Args: {
          p_org_id: string;
          p_plan_slug: string;
        };
        Returns: Json;
      };
      check_organization_can_add_user: {
        Args: {
          p_org_id: string;
        };
        Returns: boolean;
      };
      check_organization_can_add_medicine: {
        Args: {
          p_org_id: string;
        };
        Returns: boolean;
      };
    };
  };
}
