import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabaseClient';

interface SuperAdminRouteProps {
  children: ReactNode;
}

/**
 * SuperAdminRoute - Protects routes that require superadmin access.
 * Verifies user is in superadmin_whitelist via RPC call.
 * Regular admins and other roles are redirected to /agenda-semanal.
 */
export default function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { user, loading } = useCurrentUser();
  const [isSuperadmin, setIsSuperadmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;

    supabase.rpc('is_superadmin', { _user_id: user.id })
      .then(({ data }) => {
        setIsSuperadmin(data === true);
      })
      .catch(() => {
        setIsSuperadmin(false);
      });
  }, [user?.id]);

  if (loading || isSuperadmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperadmin) return <Navigate to="/agenda-semanal" replace />;

  return <>{children}</>;
}
