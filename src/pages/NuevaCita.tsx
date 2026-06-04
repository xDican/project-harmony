import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckCircle, Loader2, Bell, Plus, ArrowUp, ArrowDown, Sparkles, CalendarClock, Calendar, Pencil,
  Search, Trash2, Check, ChevronRight,
} from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import PatientSearch from '@/components/PatientSearch';
import DoctorSearch from '@/components/DoctorSearch';
import MonthGrid from '@/components/MonthGrid';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { toast } from '@/hooks/use-toast';
import { cn, formatPhoneInput, formatPhoneForStorage } from '@/lib/utils';
import { useAppointmentComposer } from '@/hooks/useAppointmentComposer';
import type { OrgServiceType } from '@/lib/serviceTypesApi';
import type { Doctor } from '@/types/doctor';

/** "HH:mm" (24h) → "10:00 AM". */
function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

/** Minutos → "1h 05m" / "45m". */
function fmtDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`;
}

function fmtMoney(n: number): string {
  return `L ${n.toLocaleString('en-US')}`;
}

/** Iniciales (máx 2) para el avatar del paciente. */
function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

/** Pill "Paso N" en el header de cada sección; check cuando el paso está completo. */
function StepBadge({ n, done }: { n: number; done: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        done ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
      )}
    >
      {done && <Check className="h-3 w-3" />}
      Paso {n}
    </span>
  );
}

/**
 * NuevaCita — vista única de agendamiento (rediseño). Una sola pantalla basada en
 * servicios: con 1 servicio es una cita normal, con 2+ son procedimientos
 * consecutivos de una visita (sin toggle de modo). Toda la lógica/datos viven en
 * useAppointmentComposer; aquí solo el layout app-shell 2-col + footer sticky.
 */
export default function NuevaCita() {
  const c = useAppointmentComposer();

  // Crear paciente nuevo
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const labelFor = (id: string | null): string =>
    id ? (c.doctorsDict[id]?.label ?? c.selectedDoctor?.name ?? '—') : '—';

  const showServices = c.path !== 'duration';

  const handleCreateNew = ({ nameOrPhone }: { nameOrPhone: string }) => {
    const isPhone = /^\d+[-\s]?\d*$/.test(nameOrPhone);
    if (isPhone) {
      setNewName('');
      setNewPhone(nameOrPhone);
    } else {
      setNewName(nameOrPhone);
      setNewPhone('');
    }
    setCreateOpen(true);
  };

  const handleSaveNew = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Completa nombre y teléfono.' });
      return;
    }
    setCreating(true);
    try {
      const patient = await c.createPatientForBooking({
        name: newName.trim(),
        phone: formatPhoneForStorage(newPhone.trim()),
      });
      c.setSelectedPatient(patient);
      setCreateOpen(false);
      setNewName('');
      setNewPhone('');
      toast({
        title: patient.isExisting ? 'Número ya registrado' : 'Paciente creado',
        description: patient.isExisting
          ? `El teléfono ya pertenece a "${patient.name}". Se seleccionó para esta cita.`
          : `${patient.name} agregado exitosamente.`,
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo crear el paciente.' });
    } finally {
      setCreating(false);
    }
  };

  const handleAgendar = async () => {
    try {
      const res = await c.submit();
      toast({
        title: res.kind === 'visit' ? '¡Visita agendada!' : '¡Cita creada exitosamente!',
        description: (
          <div className="mt-2 space-y-1">
            <p><strong>Paciente:</strong> {c.selectedPatient?.name}</p>
            {c.selectedDate && (
              <p><strong>Fecha:</strong> {format(c.selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
            )}
            {c.chain.map((p, i) => (
              <p key={i}>
                <strong>{to12h(p.start)}</strong> — {p.serviceName} ({labelFor(p.doctorId)})
              </p>
            ))}
            {!res.whatsappSent && (
              <p className="text-muted-foreground text-xs mt-1">
                WhatsApp no enviado{res.whatsappError ? `: ${res.whatsappError}` : ''}.
              </p>
            )}
          </div>
        ),
      });
      c.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al agendar', description: e.message || 'Intenta nuevamente.' });
    }
  };

  // Hint del siguiente paso pendiente (footer): guía cuando "Agendar" está
  // deshabilitado, en el mismo orden visual del flujo.
  const submitHint: string | null = (() => {
    if (c.isSubmitting || c.canSubmit) return null;
    if (!c.selectedPatient) return 'Selecciona un paciente';
    if (c.path === 'duration') {
      if (c.requiresDoctorSelection && !c.selectedDoctor) return 'Selecciona un profesional';
    } else if (c.items.length === 0) {
      return 'Agrega un servicio';
    }
    if (!c.selectedDate) return 'Elige una fecha';
    if (!c.selectedStart) return 'Elige un horario';
    return null;
  })();

  return (
    <MainLayout mainClassName="overflow-hidden flex flex-col">
      {/* Contenido scrollable (en Fase 3 se ajusta a no-scroll con cajas internas) */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="mx-auto grid w-full max-w-[1700px] gap-4 p-4 md:gap-6 md:p-6 lg:grid-cols-[2fr_3fr]">
          {/* ===== Columna izquierda — armar la cita =====
              min-w-0: evita el "grid blowout" (los chips nowrap forzarían a la
              columna a crecer al ancho del contenido y empujarían la página). */}
          <div className="space-y-4 min-w-0">
            {/* 1. Paciente — al seleccionar, en mobile se elimina el chrome del Paso 1
                (header + borde/padding de la sección) y queda solo la tarjeta de info con
                el recordatorio adentro, subiendo los servicios; en desktop se mantiene la
                card con header. */}
            <section
              className={cn(
                'rounded-xl',
                c.selectedPatient ? 'lg:border lg:bg-card lg:p-4' : 'border bg-card p-4',
              )}
            >
              <div
                className={cn(
                  'mb-3 flex items-center justify-between gap-2',
                  c.selectedPatient && 'hidden lg:flex',
                )}
              >
                <Label className="text-base font-semibold">Paciente</Label>
                <StepBadge n={1} done={!!c.selectedPatient} />
              </div>
              {c.selectedPatient ? (
                // Seleccionado → un solo bloque: info del paciente + recordatorio adentro.
                <div className="overflow-hidden rounded-lg border bg-card">
                  <div className="flex items-center gap-3 p-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initialsOf(c.selectedPatient.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Paciente</p>
                      <p className="truncate text-sm font-medium">{c.selectedPatient.name}</p>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto shrink-0 p-0"
                      onClick={() => c.setSelectedPatient(null as any)}
                    >
                      Cambiar
                    </Button>
                  </div>
                  <div className="flex items-center justify-between border-t px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        Recordatorio extra <span className="text-muted-foreground">· 3 días antes</span>
                      </p>
                    </div>
                    <Switch checked={c.reminder3dEnabled} onCheckedChange={c.setReminder3d} />
                  </div>
                </div>
              ) : (
                // Sin seleccionar → buscador + crear nuevo (estado expandido, Paso 1).
                <>
                  <PatientSearch
                    onSelect={c.setSelectedPatient}
                    onCreateNew={handleCreateNew}
                    value={c.selectedPatient}
                    doctorId={c.selectedDoctor?.id}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setNewName(''); setNewPhone(''); setCreateOpen(true); }}
                    className="mt-2 w-full border-dashed text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Crear nuevo paciente
                  </Button>
                </>
              )}
            </section>

            {/* Selector de profesional (solo path duración multi-doctor) */}
            {c.requiresDoctorSelection && (
              <section className="rounded-xl border bg-card p-4">
                <Label className="text-base font-semibold mb-3 block">Profesional</Label>
                <DoctorSearch onSelect={(d: Doctor | null) => c.setSelectedDoctor(d)} value={c.selectedDoctor} />
              </section>
            )}

            {/* 2. Servicios (o Duración en degradación) */}
            <section className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-baseline gap-2">
                  <Label className="text-base font-semibold">
                    {showServices ? 'Servicios a realizar' : 'Duración'}
                  </Label>
                  {showServices && c.items.length > 0 && (
                    <span className="shrink-0 text-xs text-muted-foreground">est. {fmtDuration(c.totalDuration)}</span>
                  )}
                </div>
                <StepBadge n={2} done={showServices ? c.items.length > 0 : true} />
              </div>
              {showServices ? (
                <ServicePicker composer={c} />
              ) : (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {c.durationOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={c.durationMinutes === opt.value ? 'default' : 'outline'}
                      onClick={() => c.setDurationMinutes(opt.value)}
                      className="h-11"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ===== Columna derecha — cuándo (desktop: inline; mobile: drawer) ===== */}
          {/* Desktop: el panel va inline en la 2ª columna (sin cambios visuales). */}
          <div className="hidden lg:block">
            <section className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <Label className="text-base font-semibold">Fecha y hora</Label>
                <StepBadge n={3} done={!!(c.selectedDate && c.selectedStart)} />
              </div>
              <DateTimePanel composer={c} />
            </section>
          </div>

          {/* Mobile: tarjeta resumen tappable que abre el calendario en un bottom-sheet. */}
          <MobileDateTime composer={c} />
        </div>
      </div>

      {/* ===== Footer sticky — profesional + total estimado + Agendar =====
          Móvil: resumen (profesional · total) arriba + botón full-width abajo.
          Desktop: resumen a la izquierda, botón a la derecha. */}
      <footer className="shrink-0 border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 py-3 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            {/* Resumen (profesional + total). Mobile: filas etiqueta→valor alineadas; no
                aparece hasta elegir fecha y hora. Desktop (lg+): siempre, en columnas. */}
            <div
              className={cn(
                'gap-2 md:gap-10',
                c.selectedDate && c.selectedStart
                  ? 'flex flex-col md:flex-row md:items-end'
                  : 'hidden lg:flex lg:flex-row lg:items-end',
              )}
            >
              {/* Profesional */}
              <div className="flex items-center justify-between gap-3 md:block md:gap-0">
                <span className="text-xs text-muted-foreground">
                  Profesional{c.chain.length > 1 ? 'es' : ''} asignado{c.chain.length > 1 ? 's' : ''}
                </span>
                {c.selectedStart && c.chain.length > 0 ? (
                  <ProfesionalSummary composer={c} labelFor={labelFor} />
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">Por asignar</span>
                )}
              </div>

              {/* Total estimado (solo con servicios) */}
              {showServices && (
                <div className="flex items-center justify-between gap-3 md:block md:gap-0">
                  <span className="text-xs text-muted-foreground">Total estimado</span>
                  <span className="text-base font-bold">{fmtMoney(c.totalPrice)}</span>
                </div>
              )}
            </div>

            <div className="md:shrink-0">
              {submitHint && (
                <p
                  className={cn(
                    'mb-1.5 text-xs text-muted-foreground md:text-right',
                    !(c.selectedDate && c.selectedStart) && 'hidden lg:block',
                  )}
                >
                  {submitHint}
                </p>
              )}
              <Button onClick={handleAgendar} disabled={!c.canSubmit} size="lg" className="w-full md:w-auto">
                {c.isSubmitting
                  ? <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  : <CheckCircle className="mr-2 h-5 w-5" />}
                {c.isSubmitting ? 'Agendando…' : 'Agendar cita'}
              </Button>
            </div>
          </div>
        </div>
      </footer>

      {/* Crear paciente */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo paciente</DialogTitle>
            <DialogDescription>Ingresa los datos del paciente para agregarlo al sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="np-name">Nombre completo</Label>
              <Input id="np-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: María García López" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="np-phone">Teléfono</Label>
              <Input id="np-phone" value={newPhone} onChange={(e) => setNewPhone(formatPhoneInput(e.target.value))} placeholder="1234-5678" maxLength={9} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</Button>
            <Button onClick={handleSaveNew} disabled={creating}>{creating ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

type Composer = ReturnType<typeof useAppointmentComposer>;

/**
 * ServicePicker — selección de servicios estilo "carrito limpio": buscador +
 * chips horizontales (catálogo, scroll lateral) en vez de la grilla 2-col que se
 * amontonaba. Los servicios elegidos se listan como cards de ancho completo con
 * duración + precio a la derecha y un solo botón de quitar. Single-servicio:
 * el chip seleccionado se resalta y reemplaza (maxItems=1). Multi: acumula en orden.
 */
function ServicePicker({ composer: c }: { composer: Composer }) {
  const [query, setQuery] = useState('');
  const multiService = c.maxItems > 1;
  const q = query.trim().toLowerCase();
  const filtered = q ? c.catalog.filter((s) => s.displayName.toLowerCase().includes(q)) : c.catalog;

  // Fila compacta de un servicio elegido: nombre + duración + precio en 1 línea.
  const ServiceRow = ({ svc, idx }: { svc: OrgServiceType; idx: number }) => (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
      {multiService && (
        <div className="flex shrink-0 flex-col leading-none text-muted-foreground">
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => c.moveService(idx, -1)}
            className="hover:text-foreground disabled:opacity-30"
            aria-label="Subir"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={idx === c.items.length - 1}
            onClick={() => c.moveService(idx, 1)}
            className="hover:text-foreground disabled:opacity-30"
            aria-label="Bajar"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{svc.displayName}</p>
      <span className="shrink-0 text-xs text-muted-foreground">{svc.durationMinutes ?? 30} min</span>
      {svc.price != null && <span className="shrink-0 text-sm font-medium">{fmtMoney(svc.price)}</span>}
      <button
        type="button"
        onClick={() => c.removeService(idx)}
        className="shrink-0 rounded-full p-1 text-destructive transition-colors hover:bg-destructive/10"
        aria-label="Quitar servicio"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <>
      {/* Buscador */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar tratamientos…"
          className="pl-9"
        />
      </div>

      {/* Chips horizontales del catálogo (scroll lateral, sin barra visible) */}
      {filtered.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filtered.map((svc) => {
            const selectedSingle = !multiService && c.items[0]?.id === svc.id;
            return (
              <button
                key={svc.id}
                type="button"
                onClick={() => c.addService(svc)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors',
                  selectedSingle ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
                )}
              >
                {svc.displayName}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="py-2 text-sm text-muted-foreground">Sin resultados para “{query}”.</p>
      )}

      {/* Servicios elegidos (o placeholder corto si aún no hay ninguno) */}
      {c.items.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-center">
          <p className="text-sm text-muted-foreground">Selecciona servicios para ver el total</p>
        </div>
      ) : multiService ? (
        <div className="mt-3 space-y-2">
          {c.items.map((svc, idx) => (
            <ServiceRow key={`${svc.id}-${idx}`} svc={svc} idx={idx} />
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <ServiceRow svc={c.items[0]} idx={0} />
        </div>
      )}
    </>
  );
}

/**
 * Compuerta de la zona de fecha: si falta el insumo previo (profesional/servicio/
 * duración) no se puede mostrar disponibilidad. Centralizado para que el panel
 * inline (desktop) y la tarjeta del drawer (mobile) usen el mismo criterio.
 */
function dateGate(c: Composer): { blocked: boolean; hint: string } {
  const blocked =
    (c.path === 'duration' && !c.selectedDoctor)
    || (c.path !== 'duration' && c.items.length === 0)
    || (c.requiresDoctorSelection && !c.selectedDoctor);
  const hint = c.requiresDoctorSelection && !c.selectedDoctor
    ? 'Selecciona un profesional para ver disponibilidad'
    : c.path === 'duration'
      ? 'Selecciona una duración para ver disponibilidad'
      : 'Selecciona un servicio para ver disponibilidad';
  return { blocked, hint };
}

/**
 * DateTimePanel — calendario mensual + horarios Mañana/Tarde. Mismo cuerpo que se
 * usaba inline en la columna derecha; ahora reutilizable para renderizar tanto
 * inline (desktop) como dentro del bottom-sheet (mobile).
 */
function DateTimePanel({ composer: c, collapsibleCalendar }: { composer: Composer; collapsibleCalendar?: boolean }) {
  const { blocked, hint } = dateGate(c);
  const morning = c.starts.filter((t) => Number(t.split(':')[0]) < 12);
  const afternoon = c.starts.filter((t) => Number(t.split(':')[0]) >= 12);

  if (blocked) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center">
        <CalendarClock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
        <p className="text-sm font-medium text-muted-foreground">{hint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MonthGrid
        monthAnchor={c.monthAnchor}
        days={c.monthDays}
        daysMap={c.daysMap}
        selectedDate={c.selectedDate}
        onSelect={c.setSelectedDate}
        canGoPrev={c.canGoPrev}
        onPrev={c.goPrevMonth}
        onNext={c.goNextMonth}
        isLoading={c.isLoadingDays || Object.keys(c.daysMap).length === 0}
        collapsible={collapsibleCalendar}
      />
      {c.daysError && (
        <p className="text-xs text-destructive">{c.daysError}. Probá otro mes.</p>
      )}

      <Separator />

      {/* Horarios mañana / tarde */}
      <div>
        {!c.selectedDate ? (
          <p className="py-4 text-center text-sm italic text-muted-foreground">
            Selecciona un día en el calendario
          </p>
        ) : c.isLoadingSlots ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : c.starts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {c.slotsReason ?? 'No hay horarios disponibles para esta fecha'}
          </p>
        ) : (
          <div className="space-y-3">
            {[{ label: 'Horario en la mañana', times: morning }, { label: 'Horario en la tarde', times: afternoon }]
              .filter((g) => g.times.length > 0)
              .map((g) => (
                <div key={g.label}>
                  <p className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">{g.label}</p>
                  <div className="grid grid-cols-4 gap-2 lg:grid-cols-5">
                    {g.times.map((t) => (
                      <Button
                        key={t}
                        type="button"
                        size="sm"
                        variant={c.selectedStart === t ? 'default' : 'outline'}
                        onClick={() => c.setSelectedStart(t)}
                        className={cn('px-1 font-mono text-xs', c.selectedStart === t && 'ring-2 ring-primary ring-offset-1')}
                      >
                        {to12h(t)}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * MobileDateTime — solo mobile (`lg:hidden`). Reemplaza el calendario inline por una
 * tarjeta-resumen tappable; al tocarla se abre un bottom-sheet con el DateTimePanel.
 * Resuelve el problema de que el calendario + slots ocupaban ~2 pantallas de scroll.
 */
function MobileDateTime({ composer: c }: { composer: Composer }) {
  const [open, setOpen] = useState(false);
  const { blocked, hint } = dateGate(c);
  const hasSel = Boolean(c.selectedDate && c.selectedStart);

  return (
    <section className="lg:hidden min-w-0">
      <Drawer open={open} onOpenChange={setOpen}>
        {/* Tarjeta única del Paso 3: título "Fecha y hora" + badge + valor, todo
            tappable (abre el calendario). Sin header/borde extra encima. */}
        <DrawerTrigger asChild>
          <button
            type="button"
            disabled={blocked}
            className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Calendar className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-base font-semibold">Fecha y hora</span>
                <StepBadge n={3} done={hasSel} />
              </span>
              <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                {hasSel
                  ? `${format(c.selectedDate!, "EEE d 'de' MMM", { locale: es })} · ${to12h(c.selectedStart!)}${c.chain.length > 0 ? ` · ${fmtDuration(c.totalDuration)}` : ''}`
                  : blocked
                    ? hint
                    : 'Toca para elegir fecha y hora'}
              </span>
            </span>
            {!blocked && (hasSel
              ? <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
              : <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />)}
          </button>
        </DrawerTrigger>
        <DrawerContent className="mt-0 h-[100dvh] max-h-[100dvh] rounded-none">
          <DrawerHeader className="pb-2 text-left">
            <div className="flex items-center justify-between gap-2">
              <DrawerTitle>Seleccionar fecha y hora</DrawerTitle>
              <StepBadge n={3} done={hasSel} />
            </div>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
            <DateTimePanel composer={c} collapsibleCalendar />
          </div>
          <DrawerFooter className="gap-2 border-t">
            {hasSel && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Selección:</span>
                <span className="font-semibold capitalize text-primary">
                  {format(c.selectedDate!, "EEE d 'de' MMM", { locale: es })} · {to12h(c.selectedStart!)}
                </span>
              </div>
            )}
            <Button onClick={() => setOpen(false)} disabled={!hasSel} size="lg" className="w-full">
              {hasSel ? 'Confirmar fecha y hora' : 'Seleccione fecha y hora'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </section>
  );
}

/** Resumen del/los profesional(es) asignado(s) en el footer, con cambio por procedimiento. */
function ProfesionalSummary({
  composer: c,
  labelFor,
}: {
  composer: ReturnType<typeof useAppointmentComposer>;
  labelFor: (id: string | null) => string;
}) {
  const isAuto = c.path === 'visit-engine';
  const single = c.chain.length === 1;
  const canChange = c.chain.some((p) => p.freeDoctorIds.length > 1);

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm font-medium">
        {single ? labelFor(c.chain[0].doctorId) : `${c.chain.length} profesionales`}
        {isAuto && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-700">
            <Sparkles className="h-3 w-3" /> Auto
          </span>
        )}
      </span>
      {isAuto && (canChange || !single) && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
              {single ? 'Cambiar' : 'Ver detalle'}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <p className="mb-2 text-sm font-medium">Detalle de la visita</p>
            <div className="space-y-3">
              {c.chain.map((p, i) => (
                <div key={i} className="border-b pb-2 last:border-b-0 last:pb-0">
                  <p className="text-sm font-medium">{p.start}–{p.end} · {p.serviceName}</p>
                  {p.freeDoctorIds.length <= 1 ? (
                    <p className="text-sm text-muted-foreground">{labelFor(p.doctorId)}</p>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {p.freeDoctorIds.map((docId) => (
                        <Button
                          key={docId}
                          type="button"
                          size="sm"
                          variant={p.doctorId === docId ? 'default' : 'outline'}
                          onClick={() => c.setAssignment(i, docId)}
                        >
                          {labelFor(docId)}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Auto-asignado al menos cargado; podés cambiarlo.</p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
