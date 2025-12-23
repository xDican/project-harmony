import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MonthlyUsage {
  period_start: string;
  period_end: string;
  billable_outbound: number;
  unit_price: number;
  estimated_cost: number;
}

interface DailyUsage {
  day: string;
  billable_outbound: number;
  estimated_cost: number;
}

export default function UsoMensajes() {
  const navigate = useNavigate();
  const [monthlyData, setMonthlyData] = useState<MonthlyUsage | null>(null);
  const [dailyData, setDailyData] = useState<DailyUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsageData() {
      try {
        setIsLoading(true);
        setError(null);

        // First, get current month summary
        const { data: monthlyResult, error: monthlyError } = await supabase
          .rpc('get_message_usage_current_month');

        if (monthlyError) {
          throw monthlyError;
        }

        const monthly = monthlyResult?.[0] || null;
        setMonthlyData(monthly);

        // If we have monthly data, fetch daily breakdown
        if (monthly?.period_start && monthly?.period_end) {
          const { data: dailyResult, error: dailyError } = await supabase
            .rpc('get_message_usage_daily', {
              period_start: monthly.period_start,
              period_end: monthly.period_end,
            });

          if (dailyError) {
            throw dailyError;
          }

          // Sort by date ascending
          const sortedDaily = (dailyResult || []).sort((a: DailyUsage, b: DailyUsage) => 
            new Date(a.day).getTime() - new Date(b.day).getTime()
          );
          setDailyData(sortedDaily);
        }
      } catch (err) {
        console.error('Error fetching usage data:', err);
        setError('Error al cargar los datos de uso');
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsageData();
  }, []);

  const formatCurrency = (amount: number, decimals: number = 2) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  return (
    <MainLayout backTo="/configuracion">
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Uso de Mensajes</h1>
          <p className="text-muted-foreground">Resumen de notificaciones enviadas a tus pacientes</p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Cargando datos...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <div className="grid gap-6">
            {/* Card 1: Monthly Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Resumen del mes
                </CardTitle>
                <CardDescription>
                  Estadísticas de mensajes del período actual
                </CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Mensajes enviados este mes</p>
                        <p className="text-2xl font-bold">{monthlyData.billable_outbound}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Precio por mensaje</p>
                        <p className="text-2xl font-bold">{formatCurrency(monthlyData.unit_price, 4)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Costo estimado del mes</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(monthlyData.estimated_cost, 4)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground border-t pt-4">
                      Este monto es solo informativo. No se realizan cargos automáticos.
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Aún no se han enviado mensajes este mes.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Daily Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Detalle por día
                </CardTitle>
                <CardDescription>
                  Desglose diario de mensajes enviados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dailyData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Mensajes</TableHead>
                        <TableHead className="text-right">Costo estimado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyData.map((day) => (
                        <TableRow key={day.day}>
                          <TableCell>{formatDate(day.day)}</TableCell>
                          <TableCell className="text-right">{day.billable_outbound}</TableCell>
                          <TableCell className="text-right">{formatCurrency(day.estimated_cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Aún no se han enviado mensajes este mes.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
