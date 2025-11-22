import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import { Download, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { AppointmentStatus } from '@/types/appointment';
import type { Doctor } from '@/types/doctor';

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
  // Estados para filtros
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
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
    try {
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
        .gte('date', fromDate)
        .lte('date', toDate)
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
      <div className="max-w-7xl mx-auto py-6 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Reporte de Citas</CardTitle>
            <CardDescription>
              Filtra y exporta el historial de citas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Desde</label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Hasta</label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>

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

              <div className="flex justify-between items-center">
                <Button onClick={handleApplyFilters} disabled={isLoading}>
                  <Filter className="h-4 w-4 mr-2" />
                  Aplicar filtros
                </Button>

                <Button
                  variant="outline"
                  onClick={exportAppointmentsToCsv}
                  disabled={appointments.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>

            {/* Contador */}
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Cargando...' : `${appointments.length} citas encontradas`}
              </p>
            </div>

            {/* Tabla */}
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
              <div className="border rounded-lg overflow-hidden">
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
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
