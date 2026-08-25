import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useOrganization() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrg() {
      try {
        const { data: orgId, error: rpcError } = await supabase.rpc('get_my_organization_id');
        if (rpcError || !orgId) {
          setLoading(false);
          return;
        }

        setOrganizationId(orgId);

        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single();

        setOrganization(orgData);
      } catch (err) {
        console.error('Failed to load organization:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrg();
  }, []);

  return { organizationId, organization, loading };
}
