-- ==============================================================================
-- PHASE 6E: P0-1 PRIVATE PRESCRIPTION STORAGE & TENANT ISOLATION MIGRATION
-- Creates private 'prescriptions' storage bucket with strict RLS policies
-- ==============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    -- 1. Ensure private 'prescriptions' bucket exists (public = FALSE)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'prescriptions',
      'prescriptions',
      FALSE,
      10485760, -- 10MB file limit
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    )
    ON CONFLICT (id) DO UPDATE
    SET public = FALSE,
        file_size_limit = 10485760,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

    -- 2. Ensure RLS on storage.objects is enabled
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    -- 3. Drop existing prescription storage policies if any to prevent collision
    DROP POLICY IF EXISTS "Prescription files are tenant-isolated and require read permission" ON storage.objects;
    DROP POLICY IF EXISTS "Prescription upload requires tenant matching and create permission" ON storage.objects;
    DROP POLICY IF EXISTS "Prescription update requires tenant matching and edit permission" ON storage.objects;
    DROP POLICY IF EXISTS "Prescription delete requires tenant matching and delete permission" ON storage.objects;
    DROP POLICY IF EXISTS "Prescriptions viewable by co-tenants" ON storage.objects;
    DROP POLICY IF EXISTS "Prescriptions insertable by co-tenants" ON storage.objects;

    -- 4. Storage SELECT Policy (Read / Download / Generate Signed URL)
    -- Enforces authenticated session, active organization match, and prescriptions.read permission
    CREATE POLICY "Prescription files are tenant-isolated and require read permission"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'prescriptions' AND (
          (
            (storage.foldername(name))[1] = 'organizations' AND
            (storage.foldername(name))[2] = public.get_my_organization_id()::text
          ) OR (
            (storage.foldername(name))[1] = public.get_my_organization_id()::text
          )
        ) AND
        public.has_permission('prescriptions.read')
      );

    -- 5. Storage INSERT Policy (Upload Scanned Rx)
    -- Enforces authenticated session, active organization match, and prescriptions.create permission
    CREATE POLICY "Prescription upload requires tenant matching and create permission"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'prescriptions' AND (
          (
            (storage.foldername(name))[1] = 'organizations' AND
            (storage.foldername(name))[2] = public.get_my_organization_id()::text
          ) OR (
            (storage.foldername(name))[1] = public.get_my_organization_id()::text
          )
        ) AND
        public.has_permission('prescriptions.create')
      );

    -- 6. Storage UPDATE Policy (Update Rx Document)
    CREATE POLICY "Prescription update requires tenant matching and edit permission"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'prescriptions' AND (
          (
            (storage.foldername(name))[1] = 'organizations' AND
            (storage.foldername(name))[2] = public.get_my_organization_id()::text
          ) OR (
            (storage.foldername(name))[1] = public.get_my_organization_id()::text
          )
        ) AND
        public.has_permission('prescriptions.edit')
      );

    -- 7. Storage DELETE Policy (Delete Rx Document)
    CREATE POLICY "Prescription delete requires tenant matching and delete permission"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'prescriptions' AND (
          (
            (storage.foldername(name))[1] = 'organizations' AND
            (storage.foldername(name))[2] = public.get_my_organization_id()::text
          ) OR (
            (storage.foldername(name))[1] = public.get_my_organization_id()::text
          )
        ) AND
        public.has_permission('prescriptions.delete')
      );

  END IF;
END $$;
