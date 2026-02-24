import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, CheckCircle, XCircle, MessageSquare, MessageSquareOff, AlertCircle, Calendar, Save } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export interface OrgData {
  id: string;
  name: string;
  onboarding_status: string;
  billing_status: string;
  messaging_enabled: boolean;
  daily_message_cap: number;
  monthly_message_cap: number;
  max_calendars: number;
  created_at: string;
  recent_audit: AuditEntry[];
}

interface AuditEntry {
  id: string;
  action: string;
  performed_by_email: string | null;
  details: Record<string, any>;
  created_at: string;
}

interface OrgActivationCardProps {
  org: OrgData;
  onUpdated: (org: OrgData) => void;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  setup_in_progress: 'Configurando',
  ready_to_activate: 'Listo p/ activar',
  active: 'Activo',
  suspended: 'Suspendido',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'secondary',
  setup_in_progress: 'secondary',
  ready_to_activate: 'outline',
  active: 'default',
  suspended: 'destructive',
};

const ACTION_LABELS: Record<string, string> = {
  activate: 'Activar',
  suspend: 'Suspender',
  enable_messaging: 'Habilitar mensajes',
  disable_messaging: 'Deshabilitar mensajes',
  note: 'Nota',
  update_caps: 'Límites actualizados',
  update_calendar_limit: 'Calendarios actualizados',
};

export default function OrgActivationCard({ org, onUpdated }: OrgActivationCardProps) {
  const [loading, setLoading] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [calendarLimit, setCalendarLimit] = useState<number>(org.max_calendars ?? 1);
  const calendarLimitChanged = calendarLimit !== (org.max_calendars ?? 1);

  async function executeAction(action: string, details?: Record<string, any>) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('activation-actions', {
        body: { organization_id: org.id, action, details: details ?? {} },
      });

      if (res.error) throw res.error;
      if (res.data?.org) {
        onUpdated({ ...org, ...res.data.org, recent_audit: org.recent_audit });
      }
    } catch (err: any) {
      console.error('Action error:', err);
      alert(`Error: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }

  const isActive = org.onboarding_status === 'active';
  const isSuspended = org.onboarding_status === 'suspended';
  const isReadyToActivate = org.onboarding_status === 'ready_to_activate';

  return (
    <Card className={isSuspended ? 'border-red-500/30 bg-red-500/5' : isReadyToActivate ? 'border-yellow-500/30 bg-yellow-500/5' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{org.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(org.created_at).toLocaleDateString('es-HN')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={STATUS_VARIANTS[org.onboarding_status] ?? 'secondary'}>
              {STATUS_LABELS[org.onboarding_status] ?? org.onboarding_status}
            </Badge>
            <Badge variant={org.messaging_enabled ? 'default' : 'outline'} className="text-xs">
              {org.messaging_enabled ? 'Mensajes ON' : 'Mensajes OFF'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Caps info */}
        <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
          <span>Cap diario: {org.daily_message_cap}</span>
          <span>Cap mensual: {org.monthly_message_cap}</span>
        </div>

        {/* Calendar limit */}
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Calendarios:</span>
          <Input
            type="number"
            min={1}
            max={100}
            value={calendarLimit}
            onChange={e => setCalendarLimit(Number(e.target.value))}
            className="h-7 w-16 text-xs"
          />
          {calendarLimitChanged && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              disabled={loading}
              onClick={() => executeAction('update_calendar_limit', { max_calendars: calendarLimit })}
            >
              <Save className="h-3 w-3" />
              Guardar
            </Button>
          )}
        </div>

        {/* Primary actions */}
        <div className="flex gap-2 flex-wrap">
          {!isActive && (
            <Button
              size="sm"
              className="gap-1"
              disabled={loading}
              onClick={() => executeAction('activate')}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Activar
            </Button>
          )}
          {!isSuspended && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1"
              disabled={loading}
              onClick={() => {
                if (confirm(`¿Suspender "${org.name}"? Se deshabilitarán los mensajes.`)) {
                  executeAction('suspend');
                }
              }}
            >
              <XCircle className="h-3.5 w-3.5" />
              Suspender
            </Button>
          )}
          {!org.messaging_enabled && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={loading}
              onClick={() => executeAction('enable_messaging')}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Habilitar mensajes
            </Button>
          )}
          {org.messaging_enabled && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={loading}
              onClick={() => {
                if (confirm(`¿Deshabilitar mensajes para "${org.name}"?`)) {
                  executeAction('disable_messaging');
                }
              }}
            >
              <MessageSquareOff className="h-3.5 w-3.5" />
              Deshabilitar msgs
            </Button>
          )}
        </div>

        {/* Audit log collapsible */}
        {org.recent_audit.length > 0 && (
          <Collapsible open={auditOpen} onOpenChange={setAuditOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <AlertCircle className="h-3 w-3" />
              <span>Historial ({org.recent_audit.length})</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${auditOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-1.5 border-l-2 border-muted pl-3">
                {org.recent_audit.map((entry) => (
                  <div key={entry.id} className="text-xs">
                    <span className="font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                    <span className="text-muted-foreground">
                      {' — '}{entry.performed_by_email ?? 'sistema'}
                      {' · '}{new Date(entry.created_at).toLocaleString('es-HN')}
                    </span>
                    {entry.details?.note && (
                      <p className="text-muted-foreground italic">{entry.details.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
