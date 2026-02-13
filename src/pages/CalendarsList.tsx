import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/context/UserContext';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  getCalendarsByOrganization,
  createCalendar,
  updateCalendar,
  getClinicsByOrganization,
} from '@/lib/api.supabase';
import type { CalendarEntry, Clinic } from '@/types/organization';
import { Loader2, Search, Plus, Edit, CalendarDays } from 'lucide-react';

const NO_CLINIC_VALUE = '__none__';

export default function CalendarsList() {
  const { isAdmin } = useCurrentUser();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [calendars, setCalendars] = useState<CalendarEntry[]>([]);
  const [filteredCalendars, setFilteredCalendars] = useState<CalendarEntry[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 5 : 10;

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<CalendarEntry | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formClinicId, setFormClinicId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCalendars();
  }, [calendars, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [calendarsData, clinicsData] = await Promise.all([
        getCalendarsByOrganization(),
        getClinicsByOrganization(),
      ]);
      setCalendars(calendarsData);
      setClinics(clinicsData);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Error al cargar datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCalendars = () => {
    let result = [...calendars];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(query));
    }
    setFilteredCalendars(result);
    setCurrentPage(1);
  };

  const openCreateDialog = () => {
    setEditingCalendar(null);
    setFormName('');
    setFormClinicId('');
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (calendar: CalendarEntry) => {
    setEditingCalendar(calendar);
    setFormName(calendar.name);
    setFormClinicId(calendar.clinicId || '');
    setFormIsActive(calendar.isActive);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const clinicIdValue = formClinicId && formClinicId !== NO_CLINIC_VALUE ? formClinicId : undefined;

      if (editingCalendar) {
        await updateCalendar(editingCalendar.id, {
          name: formName.trim(),
          clinicId: clinicIdValue,
          isActive: formIsActive,
        });
        toast({
          title: 'Exito',
          description: 'Calendario actualizado correctamente',
        });
      } else {
        await createCalendar({
          name: formName.trim(),
          clinicId: clinicIdValue,
        });
        toast({
          title: 'Exito',
          description: 'Calendario creado correctamente',
        });
      }
      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Error al guardar el calendario',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDoctors = (doctors?: Array<{ id: string; name: string }>) => {
    if (!doctors || doctors.length === 0) return null;
    return doctors.map((d) => d.name);
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              No tienes permisos para acceder a esta pagina
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  const totalPages = Math.ceil(filteredCalendars.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCalendars = filteredCalendars.slice(startIndex, startIndex + itemsPerPage);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2">Calendarios</h1>
          <p className="text-muted-foreground">
            Gestiona los calendarios de citas de tu organizacion.
          </p>
        </div>

        <div>
          {/* Create Button - Mobile Top */}
          {isMobile && (
            <div className="mb-4">
              <Button onClick={openCreateDialog} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Calendario
              </Button>
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Create Button - Desktop */}
            {!isMobile && (
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Calendario
              </Button>
            )}
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {isMobile ? (
                /* Mobile Card View */
                <div className="space-y-0 border rounded-md overflow-hidden">
                  {filteredCalendars.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No se encontraron calendarios
                    </div>
                  ) : (
                    <>
                      {paginatedCalendars.map((calendar) => (
                        <CalendarCard
                          key={calendar.id}
                          calendar={calendar}
                          onEdit={() => openEditDialog(calendar)}
                        />
                      ))}
                      {totalPages > 1 && (
                        <div className="border-t p-4">
                          <div className="flex items-center justify-between">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                            >
                              Anterior
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Pagina {currentPage} de {totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                            >
                              Siguiente
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* Desktop Table View */
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Clinica</TableHead>
                          <TableHead>Doctores</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCalendars.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No se encontraron calendarios
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedCalendars.map((calendar) => {
                            const doctorNames = formatDoctors(calendar.doctors);
                            return (
                              <TableRow key={calendar.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    {calendar.name}
                                  </div>
                                </TableCell>
                                <TableCell>{calendar.clinicName || '\u2014'}</TableCell>
                                <TableCell>
                                  {doctorNames ? (
                                    <div className="flex flex-wrap gap-1">
                                      {doctorNames.map((name, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                          {name}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">\u2014</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={calendar.isActive ? 'default' : 'secondary'}>
                                    {calendar.isActive ? 'Activo' : 'Inactivo'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(calendar)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Editar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 px-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Pagina {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCalendar ? 'Editar Calendario' : 'Nuevo Calendario'}
              </DialogTitle>
              <DialogDescription>
                {editingCalendar
                  ? 'Modifica los datos del calendario.'
                  : 'Completa los datos para crear un nuevo calendario.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="calendar-name">Nombre *</Label>
                <Input
                  id="calendar-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nombre del calendario"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendar-clinic">Clinica</Label>
                <Select
                  value={formClinicId || NO_CLINIC_VALUE}
                  onValueChange={(val) => setFormClinicId(val === NO_CLINIC_VALUE ? '' : val)}
                  disabled={saving}
                >
                  <SelectTrigger id="calendar-clinic">
                    <SelectValue placeholder="Selecciona una clinica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLINIC_VALUE}>Sin clinica asignada</SelectItem>
                    {clinics.map((clinic) => (
                      <SelectItem key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editingCalendar && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="calendar-active"
                    checked={formIsActive}
                    onCheckedChange={(checked) => setFormIsActive(checked === true)}
                    disabled={saving}
                  />
                  <Label htmlFor="calendar-active" className="cursor-pointer">
                    Calendario activo
                  </Label>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCalendar ? 'Guardar cambios' : 'Crear calendario'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

// Mobile Card Component
interface CalendarCardProps {
  calendar: CalendarEntry;
  onEdit: () => void;
}

function CalendarCard({ calendar, onEdit }: CalendarCardProps) {
  const doctorNames = calendar.doctors?.map((d) => d.name) || [];

  return (
    <div className="border-b last:border-b-0 py-3 px-4 hover:bg-muted/30 transition-colors">
      {/* Line 1: Name and Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-base font-semibold text-foreground">
            {calendar.name}
          </span>
        </div>
        <Badge variant={calendar.isActive ? 'default' : 'secondary'}>
          {calendar.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>

      {/* Line 2: Clinic and Doctors */}
      <div className="flex flex-col gap-1 mb-3 text-sm text-muted-foreground">
        {calendar.clinicName && <span>Clinica: {calendar.clinicName}</span>}
        {doctorNames.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {doctorNames.map((name, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Line 3: Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </div>
    </div>
  );
}
