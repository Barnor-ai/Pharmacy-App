-- ==============================================================================
-- PHASE 6E P1: FIX PROFILES RLS (TENANT ISOLATION)
-- Eliminates USING (true) and restricts profile visibility to self or co-tenants
-- ==============================================================================

-- 1. Drop overly permissive legacy policy
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by co-tenants" ON public.profiles;

-- 2. Implement Tenant-Isolated SELECT Policy for Profiles
-- A user can only view their own profile OR profiles belonging to members of their active organization
CREATE POLICY "Profiles viewable by co-tenants" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    id IN (
      SELECT om.user_id
      FROM public.organization_members om
      WHERE om.organization_id = public.get_my_organization_id()
    )
    OR
    id IN (
      SELECT o.owner_id
      FROM public.organizations o
      WHERE o.id = public.get_my_organization_id()
    )
  );
