-- ==============================================================================
-- PHASE 5D: SUPABASE REALTIME MULTI-TENANT CONFIGURATION
-- Enables replication and Realtime publication for core pharmacy tables:
-- 1. medicines
-- 2. sales
-- 3. sale_items
-- 4. customers
-- 5. suppliers
-- 6. prescriptions
-- 7. expenses
-- 8. audit_logs
-- ==============================================================================

-- 1. Configure Replica Identity for accurate UPDATE/DELETE event payloads
ALTER TABLE IF EXISTS public.medicines REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.sales REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.sale_items REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.customers REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.suppliers REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.prescriptions REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.expenses REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.audit_logs REPLICA IDENTITY FULL;

-- 2. Ensure the supabase_realtime publication exists and includes the tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 3. Safely add tables to supabase_realtime publication
DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'medicines',
    'sales',
    'sale_items',
    'customers',
    'suppliers',
    'prescriptions',
    'expenses',
    'audit_logs'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public'
        AND c.relname = v_table
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', v_table);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notice: could not add table % to publication: %', v_table, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;
