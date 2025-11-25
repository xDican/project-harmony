import { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Stethoscope, Calendar, CalendarCheck, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getAdminMetrics } from '@/lib/api';
import type { AdminMetrics } from '@/lib/api';

/**
 * AdminDashboard - Administrative overview page
 * Displays key metrics and statistics about patients, doctors, and appointments
 */
export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load metrics on mount
  useEffect(() => {
    getAdminMetrics()
      .then(data => {
        setMetrics(data);
      })
      .catch(error => {
        console.error('Error loading metrics:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Panel de Administración</h1>
          <p className="text-muted-foreground">
            Estadísticas y métricas del sistema
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        )}

        {/* Metrics Grid */}
        {!isLoading && metrics && (
          <>
            {/* Main Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Patients */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pacientes
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{metrics.totalPatients}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total registrados
                  </p>
                </CardContent>
              </Card>

              {/* Total Doctors */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Médicos
                  </CardTitle>
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{metrics.totalDoctors}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total en el sistema
                  </p>
                </CardContent>
              </Card>

              {/* Total Appointments */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Citas Totales
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{metrics.totalAppointments}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Todas las citas
                  </p>
                </CardContent>
              </Card>

              {/* Today's Appointments */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Citas Hoy
                  </CardTitle>
                  <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{metrics.todayAppointments}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Programadas para hoy
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Status Breakdown */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Estado de las Citas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Scheduled/Agendadas */}
                <Card className="border-yellow-500/20 bg-yellow-500/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Agendadas
                    </CardTitle>
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {metrics.statusBreakdown.agendada}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((metrics.statusBreakdown.agendada / metrics.totalAppointments) * 100).toFixed(0)}% del total
                    </p>
                  </CardContent>
                </Card>

                {/* Confirmed */}
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Confirmadas
                    </CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {metrics.statusBreakdown.confirmada}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((metrics.statusBreakdown.confirmada / metrics.totalAppointments) * 100).toFixed(0)}% del total
                    </p>
                  </CardContent>
                </Card>

                {/* Completed */}
                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Completadas
                    </CardTitle>
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {metrics.statusBreakdown.completada}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((metrics.statusBreakdown.completada / metrics.totalAppointments) * 100).toFixed(0)}% del total
                    </p>
                  </CardContent>
                </Card>

                {/* Canceled */}
                <Card className="border-red-500/20 bg-red-500/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Canceladas
                    </CardTitle>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {metrics.statusBreakdown.cancelada}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((metrics.statusBreakdown.cancelada / metrics.totalAppointments) * 100).toFixed(0)}% del total
                    </p>
                  </CardContent>
                </Card>

                {/* No se presentaron */}
                <Card className="border-orange-500/20 bg-orange-500/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      No se presentaron
                    </CardTitle>
                    <XCircle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {metrics.statusBreakdown.no_asistio}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((metrics.statusBreakdown.no_asistio / metrics.totalAppointments) * 100).toFixed(0)}% del total
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
