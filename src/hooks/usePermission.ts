import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePermission(permissionName: string) {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      if (!permissionName) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_permission', {
          permission_name: permissionName,
        });

        if (error) {
          console.error('Error checking permission:', error);
          setHasPermission(false);
        } else {
          setHasPermission(!!data);
        }
      } catch (err) {
        console.error('Failed to verify permission:', err);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermission();
  }, [permissionName]);

  return { hasPermission, loading };
}
