import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OrgActivationCard, { type OrgData } from '@/components/activation/OrgActivationCard';

/**
 * ActivationPanel - Internal superadmin panel for activating/suspending organizations.
 * Accessible only via /internal/activations (protected by SuperAdminRoute).
 */
export default function ActivationPanel() {
  const [orgs, setOrgs] = useState<OrgData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [messagingFilter, setMessagingFilter] = useState<string>('all');

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.onboarding_status = statusFilter;
      if (messagingFilter !== 'all') params.messaging_enabled = messagingFilter;

      const { data, error } = await supabase.functions.invoke('activation-actions', {
        method: 'GET',
        headers: {},
        body: undefined,
      });

      if (error) throw error;
      setOrgs(data?.orgs ?? []);
    } catch (err: any) {
      console.error('Error loading orgs:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, messagingFilter]);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  function handleOrgUpdated(updated: OrgData) {
    setOrgs(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
  }

  // Client-side search filter
  const filtered = orgs.filter(org => {
    if (search && !org.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && org.onboarding_status !== statusFilter) return false;
    if (messagingFilter === 'true' && !org.messaging_enabled) return false;
    if (messagingFilter === 'false' && org.messaging_enabled) return false;
    return true;
  });

  const readyToActivateCount = orgs.filter(o => o.onboarding_status === 'ready_to_activate').length;
  const suspendedCount = orgs.filter(o => o.onboarding_status === 'suspended').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 max-w-6xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Panel de Activación</h1>
                <p className="text-xs text-muted-foreground">OrionCare — Acceso interno</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {readyToActivateCount > 0 && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                  {readyToActivateCount} listos p/ activar
                </Badge>
              )}
              {suspendedCount > 0 && (
                <Badge variant="destructive">
                  {suspendedCount} suspendidos
                </Badge>
              )}
              <Button variant="ghost" size="icon" onClick={loadOrgs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-6 py-4 max-w-6xl">
        <div className="flex gap-3 flex-wrap mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar organización..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="new">Nuevo</SelectItem>
              <SelectItem value="setup_in_progress">Configurando</SelectItem>
              <SelectItem value="ready_to_activate">Listo p/ activar</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="suspended">Suspendido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={messagingFilter} onValueChange={setMessagingFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Mensajes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Mensajes ON</SelectItem>
              <SelectItem value="false">Mensajes OFF</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats bar */}
        <div className="text-sm text-muted-foreground mb-4">
          {loading ? 'Cargando...' : `${filtered.length} de ${orgs.length} organizaciones`}
        </div>

        {/* Org cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {orgs.length === 0 ? 'No hay organizaciones registradas' : 'No hay resultados para los filtros seleccionados'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(org => (
              <OrgActivationCard key={org.id} org={org} onUpdated={handleOrgUpdated} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
