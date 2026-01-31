import { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MessageSquare, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/context/UserContext';

interface BillingSummary {
  month_key: string;
  base_fee: number;
  messages_total: number;
  usage_total: number;
  total_due: number;
  avg_cost_per_message: number;
  inbound_msgs: number;
  inbound_cost: number;
  in_window_msgs: number;
  in_window_cost: number;
  outside_window_template_msgs: number;
  outside_window_template_cost: number;
}

interface DailyUsage {
  day: string;
  billable_outbound: number;
  estimated_cost: number;
}

export default function UsoMensajes() {
  const { user, loading: userLoading } = useCurrentUser();
  const [billingData, setBillingData] = useState<BillingSummary | null>(null);
  const [dailyData, setDailyData] = useState<DailyUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDailyOpen, setIsDailyOpen] = useState(false);

  useEffect(() => {
    async function fetchUsageData() {
      if (!user?.doctorId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get current month in format YYYY-MM-01
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        // Fetch billing summary using the new function
        const { data: summaryResult, error: summaryError } = await supabase
          .rpc('get_monthly_billing_summary', {
            p_doctor_id: user.doctorId,
            p_month: currentMonth,
          });

        if (summaryError) {
          throw summaryError;
        }

        const billing = summaryResult?.[0] || null;
        setBillingData(billing);

        // Fetch daily breakdown for collapsible section
        if (billing) {
          const periodStart = `${currentMonth}T00:00:00Z`;
          const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
          
          const { data: dailyResult, error: dailyError } = await supabase
            .rpc('get_message_usage_daily', {
              period_start: periodStart,
              period_end: periodEnd,
            });

          if (dailyError) {
            console.error('Error fetching daily data:', dailyError);
          } else {
            const sortedDaily = (dailyResult || []).sort((a: DailyUsage, b: DailyUsage) => 
              new Date(a.day).getTime() - new Date(b.day).getTime()
            );
            setDailyData(sortedDaily);
          }
        }
      } catch (err) {
        console.error('Error fetching usage data:', err);
        setError('Error al cargar los datos de uso');
      } finally {
        setIsLoading(false);
      }
    }

    if (!userLoading) {
      fetchUsageData();
    }
  }, [user?.doctorId, userLoading]);

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

  const isLoadingState = isLoading || userLoading;

  return (
    <MainLayout backTo="/configuracion">
      <div className="p-4 md:p-6 lg:p-8 space-y-6">

        {/* Loading State */}
        {isLoadingState && (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Cargando datos...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoadingState && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {!isLoadingState && !error && (
          <div className="grid gap-6">
            {/* Card 1: Resumen del mes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Resumen del mes
                </CardTitle>
                <CardDescription>
                  Este es un resumen de tu consumo real de mensajes durante el mes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {billingData ? (
                  <div className="space-y-6">
                    {/* 3 Main Metrics */}
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="space-y-1 p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm text-muted-foreground">Total a pagar este mes</p>
                        <p className="text-3xl font-bold text-primary">{formatCurrency(billingData.total_due)}</p>
                        <p className="text-xs text-muted-foreground">Incluye plan base + consumo de mensajes</p>
                      </div>
                      <div className="space-y-1 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Plan base</p>
                        <p className="text-2xl font-bold">{formatCurrency(billingData.base_fee)}</p>
                      </div>
                      <div className="space-y-1 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Consumo de mensajes</p>
                        <p className="text-2xl font-bold">{formatCurrency(billingData.usage_total)}</p>
                        <p className="text-xs text-muted-foreground">Uso real del mes</p>
                      </div>
                    </div>

                    {/* Informative metrics */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t pt-4">
                      <span>Mensajes totales: <strong className="text-foreground">{billingData.messages_total}</strong></span>
                      <span>•</span>
                      <span>Costo promedio por mensaje: <strong className="text-foreground">{formatCurrency(billingData.avg_cost_per_message, 4)}</strong></span>
                    </div>

                    {/* Footer note */}
                    <p className="text-xs text-muted-foreground border-t pt-4">
                      El costo final incluye tu plan base y el uso de mensajes enviados y recibidos. Los montos se calculan según el uso real del servicio.
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Aún no se han enviado mensajes este mes.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Detalle de consumo */}
            {billingData && billingData.messages_total > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalle de consumo</CardTitle>
                  <CardDescription>
                    Desglose por tipo de mensaje
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo de mensaje</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Costo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Mensajes recibidos</TableCell>
                        <TableCell className="text-right">{billingData.inbound_msgs}</TableCell>
                        <TableCell className="text-right">{formatCurrency(billingData.inbound_cost)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Mensajes dentro de ventana</TableCell>
                        <TableCell className="text-right">{billingData.in_window_msgs}</TableCell>
                        <TableCell className="text-right">{formatCurrency(billingData.in_window_cost)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Mensajes fuera de ventana (template)</TableCell>
                        <TableCell className="text-right">{billingData.outside_window_template_msgs}</TableCell>
                        <TableCell className="text-right">{formatCurrency(billingData.outside_window_template_cost)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Card 3: Detalle por día (Collapsible) */}
            {dailyData.length > 0 && (
              <Collapsible open={isDailyOpen} onOpenChange={setIsDailyOpen}>
                <Card>
                  <CardHeader className="pb-3">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-5 w-5" />
                          <div className="text-left">
                            <CardTitle className="text-lg">Detalle por día</CardTitle>
                            <CardDescription>
                              Desglose diario de mensajes enviados
                            </CardDescription>
                          </div>
                        </div>
                        {isDailyOpen ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead className="text-right">Mensajes</TableHead>
                            <TableHead className="text-right">Costo</TableHead>
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
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
