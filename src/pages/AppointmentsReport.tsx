import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import StatusBadge from '@/components/StatusBadge';
import { Download, Filter, CalendarIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { AppointmentStatus } from '@/types/appointment';
import type { Doctor } from '@/types/doctor';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AppointmentReport {
  id: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes?: string;
  doctors: { id: string; name: string } | null;
  patients: { id: string; name: string; phone?: string } | null;
}

export default function AppointmentsReport() {
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Estados para filtros
  const [fromDate, setFromDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  });
  const [toDate, setToDate] = useState<Date>(() => new Date());
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Estados de datos
  const [appointments, setAppointments] = useState<AppointmentReport[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

  // Cargar doctores al montar
  useEffect(() => {
    loadDoctors();
  }, []);

  // Cargar citas al montar con filtros por defecto
  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadDoctors() {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los doctores.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingDoctors(false);
    }
  }

  async function loadAppointments() {
    setIsLoading(true);
    setCurrentPage(1); // Reset to page 1 when loading new data
    try {
      const fromDateStr = format(fromDate, 'yyyy-MM-dd');
      const toDateStr = format(toDate, 'yyyy-MM-dd');
      
      let query = supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          status,
          notes,
          doctors:doctor_id (
            id,
            name
          ),
          patients:patient_id (
            id,
            name,
            phone
          )
        `)
        .gte('date', fromDateStr)
        .lte('date', toDateStr)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (selectedDoctorId && selectedDoctorId !== 'all') {
        query = query.eq('doctor_id', selectedDoctorId);
      }

      if (selectedStatus && selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments((data as AppointmentReport[]) || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las citas.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleApplyFilters() {
    loadAppointments();
  }

  function exportAppointmentsToCsv() {
    const headers = [
      'Fecha',
      'Hora',
      'Doctor',
      'Paciente',
      'Teléfono',
      'Estado',
      'Notas'
    ];

    const rows = appointments.map((appt) => [
      appt.date,
      appt.time,
      appt.doctors?.name ?? '',
      appt.patients?.name ?? '',
      appt.patients?.phone ?? '',
      appt.status,
      appt.notes ?? ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row =>
        row
          .map((value) => {
            const v = String(value ?? '');
            const escaped = v.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `reporte_citas_${today}.csv`);
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exportación exitosa',
      description: `Se descargaron ${appointments.length} citas.`,
    });
  }

  function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">Reporte de Citas</h1>
          <p className="text-sm text-muted-foreground">
            Filtra y exporta el historial de citas del sistema
          </p>
        </div>

        <div className="space-y-6">
          {/* Filtros */}
          <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Desde */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Desde</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !fromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fromDate ? format(fromDate, "dd/MM/yyyy") : <span>Seleccionar</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={(date) => date && setFromDate(date)}
                        initialFocus
                        locale={es}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Hasta */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hasta</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !toDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {toDate ? format(toDate, "dd/MM/yyyy") : <span>Seleccionar</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={(date) => date && setToDate(date)}
                        initialFocus
                        locale={es}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Doctor */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Doctor</label>
                  <Select
                    value={selectedDoctorId}
                    onValueChange={setSelectedDoctorId}
                    disabled={isLoadingDoctors}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Estado */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="confirmed">Confirmada</SelectItem>
                      <SelectItem value="completed">Completada</SelectItem>
                      <SelectItem value="canceled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={`flex ${isMobile ? 'flex-col' : 'flex-row justify-between items-center'} gap-3`}>
                <Button 
                  onClick={handleApplyFilters} 
                  disabled={isLoading}
                  className={isMobile ? 'w-full' : ''}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Aplicar filtros
                </Button>

                <Button
                  variant="outline"
                  onClick={exportAppointmentsToCsv}
                  disabled={appointments.length === 0}
                  className={isMobile ? 'w-full' : ''}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Contador */}
          <div>
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Cargando...' : `${appointments.length} citas encontradas`}
              </p>
          </div>

          {/* Tabla / Cards */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Cargando citas...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">
                No hay citas que coincidan con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <>
              {isMobile ? (
                <>
                  <div className="space-y-0 border rounded-md overflow-hidden bg-card">
                      {(() => {
                        const totalPages = Math.ceil(appointments.length / itemsPerPage);
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const paginatedAppointments = appointments.slice(startIndex, endIndex);
                        
                        return (
                          <>
                            {paginatedAppointments.map((appointment) => (
                              <AppointmentReportCard
                                key={appointment.id}
                                appointment={appointment}
                                formatDate={formatDate}
                              />
                            ))}
                            {totalPages > 1 && (
                              <div className="border-t p-4">
                                <div className="flex items-center justify-between">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                  >
                                    Anterior
                                  </Button>
                                  <span className="text-sm text-muted-foreground">
                                    Página {currentPage} de {totalPages}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                  >
                                    Siguiente
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        );
                    })()}
                  </div>
                </>
              ) : (
                <div className="border rounded-lg overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Hora</TableHead>
                          <TableHead>Doctor</TableHead>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Notas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointments.map((appointment) => (
                          <TableRow key={appointment.id}>
                            <TableCell>{formatDate(appointment.date)}</TableCell>
                            <TableCell>{appointment.time}</TableCell>
                            <TableCell>{appointment.doctors?.name || '-'}</TableCell>
                            <TableCell>{appointment.patients?.name || '-'}</TableCell>
                            <TableCell>{appointment.patients?.phone || '-'}</TableCell>
                            <TableCell>
                              <StatusBadge status={appointment.status} />
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {appointment.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
              </>
            )}
        </div>
      </div>
    </MainLayout>
  );
}

// Mobile Card Component for Appointment Reports
interface AppointmentReportCardProps {
  appointment: AppointmentReport;
  formatDate: (date: string) => string;
}

function AppointmentReportCard({ appointment, formatDate }: AppointmentReportCardProps) {
  return (
    <div className="border-b last:border-b-0 py-3 px-4 hover:bg-muted/30 transition-colors">
      {/* Line 1: Date, Time and Status */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-base font-bold text-foreground">
          {formatDate(appointment.date)} • {appointment.time}
        </span>
        <StatusBadge status={appointment.status} />
      </div>

      {/* Line 2: Patient and Doctor */}
      <div className="flex flex-col gap-1 mb-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">👤</span>
          <span className="font-medium">{appointment.patients?.name || '-'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">🩺</span>
          <span className="text-muted-foreground">{appointment.doctors?.name || '-'}</span>
        </div>
      </div>

      {/* Line 3: Phone and Notes */}
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        {appointment.patients?.phone && (
          <div className="flex items-center gap-2">
            <span>📱</span>
            <span>{appointment.patients.phone}</span>
          </div>
        )}
        {appointment.notes && (
          <div className="flex items-start gap-2">
            <span>📝</span>
            <span className="line-clamp-2">{appointment.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
