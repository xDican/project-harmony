import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/context/UserContext';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { getWhatsAppLinesByOrganization, updateWhatsAppLine, disconnectWhatsAppLine } from '@/lib/api.supabase';
import { type EmbeddedSignupResult } from '@/lib/whatsappApi';
import MetaEmbeddedSignup from '@/components/whatsapp/MetaEmbeddedSignup';
import type { WhatsAppLine } from '@/types/organization';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, Edit, MessageCircle, Plus, RefreshCw, Trash2 } from 'lucide-react';

export default function WhatsAppLinesList() {
  const { isAdmin } = useCurrentUser();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [lines, setLines] = useState<WhatsAppLine[]>([]);
  const [filteredLines, setFilteredLines] = useState<WhatsAppLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 5 : 10;

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<WhatsAppLine | null>(null);
  const [saving, setSaving] = useState(false);

  // Connect dialog state
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);

  // Form fields
  const [formLabel, setFormLabel] = useState('');
  const [formBotEnabled, setFormBotEnabled] = useState(false);
  const [formBotGreeting, setFormBotGreeting] = useState('');
  const [formDefaultDuration, setFormDefaultDuration] = useState<number | ''>('');
  const [formHandoffType, setFormHandoffType] = useState<'secretary' | 'doctor'>('secretary');
  const [formIsActive, setFormIsActive] = useState(true);

  // Template mappings for the editing line
  const [templateMappings, setTemplateMappings] = useState<Array<{ logical_type: string; template_name: string; template_language: string; is_active: boolean; meta_status: string | null }>>([]);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Disconnect confirmation state
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [disconnectConfirmPhone, setDisconnectConfirmPhone] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    loadLines();
  }, []);

  useEffect(() => {
    filterLines();
  }, [lines, searchQuery]);

  const loadLines = async () => {
    setLoading(true);
    try {
      const data = await getWhatsAppLinesByOrganization();
      setLines(data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Error al cargar lineas de WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterLines = () => {
    let result = [...lines];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.label.toLowerCase().includes(query) ||
          l.phoneNumber.toLowerCase().includes(query)
      );
    }
    setFilteredLines(result);
    setCurrentPage(1);
  };

  const openEditDialog = async (line: WhatsAppLine) => {
    setEditingLine(line);
    setFormLabel(line.label);
    setFormBotEnabled(line.botEnabled);
    setFormBotGreeting(line.botGreeting || '');
    setFormHandoffType(line.botHandoffType || 'secretary');
    setFormDefaultDuration(line.defaultDurationMinutes || '');
    setFormIsActive(line.isActive);
    setTemplateMappings([]);
    setDialogOpen(true);

    // Load template mappings for this line
    const { data } = await supabase
      .from('template_mappings')
      .select('logical_type, template_name, template_language, is_active, meta_status')
      .eq('whatsapp_line_id', line.id)
      .order('logical_type');
    if (data) setTemplateMappings(data);
  };

  const handleConnected = (result: EmbeddedSignupResult) => {
    setConnectDialogOpen(false);
    toast({
      title: 'Línea conectada',
      description: `${result.verified_name} · ${result.phone_number}`,
    });
    loadLines();
  };

  const handleSave = async () => {
    if (!editingLine) return;

    if (!formLabel.trim()) {
      toast({
        title: 'Error',
        description: 'La etiqueta es obligatoria',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await updateWhatsAppLine(editingLine.id, {
        label: formLabel.trim(),
        botEnabled: formBotEnabled,
        botGreeting: formBotGreeting.trim() || undefined,
        botHandoffType: formHandoffType,
        defaultDurationMinutes: formDefaultDuration !== '' ? Number(formDefaultDuration) : undefined,
        isActive: formIsActive,
      });
      toast({
        title: 'Exito',
        description: 'Linea de WhatsApp actualizada correctamente',
      });
      setDialogOpen(false);
      await loadLines();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Error al actualizar la linea',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!editingLine) return;
    setDisconnecting(true);
    try {
      await disconnectWhatsAppLine(editingLine.id);
      toast({
        title: 'Linea desconectada',
        description: `La linea ${editingLine.phoneNumber} ha sido eliminada`,
      });
      setDisconnectDialogOpen(false);
      setDialogOpen(false);
      setDisconnectConfirmPhone('');
      await loadLines();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Error al desconectar la linea',
        variant: 'destructive',
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const getProviderBadge = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'twilio':
        return <Badge variant="default">Twilio</Badge>;
      case 'meta':
        return <Badge variant="secondary">Meta</Badge>;
      default:
        return <Badge variant="outline">{provider}</Badge>;
    }
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

  const totalPages = Math.ceil(filteredLines.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLines = filteredLines.slice(startIndex, startIndex + itemsPerPage);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Page Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Lineas de WhatsApp</h1>
            <p className="text-muted-foreground">
              Administra las lineas de WhatsApp conectadas a tu organizacion.
            </p>
          </div>
          <Button onClick={() => setConnectDialogOpen(true)} className="flex-shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Conectar línea
          </Button>
        </div>

        <div>
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por etiqueta o telefono"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
                  {filteredLines.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No se encontraron lineas de WhatsApp
                    </div>
                  ) : (
                    <>
                      {paginatedLines.map((line) => (
                        <WhatsAppLineCard
                          key={line.id}
                          line={line}
                          onEdit={() => openEditDialog(line)}
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
                          <TableHead>Label</TableHead>
                          <TableHead>Telefono</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Bot</TableHead>
                          <TableHead>Clinica</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLines.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No se encontraron lineas de WhatsApp
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedLines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  {line.label}
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {line.phoneNumber}
                              </TableCell>
                              <TableCell>{getProviderBadge(line.provider)}</TableCell>
                              <TableCell>
                                <Badge variant={line.botEnabled ? 'default' : 'outline'}>
                                  {line.botEnabled ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </TableCell>
                              <TableCell>{line.clinicName || '\u2014'}</TableCell>
                              <TableCell>
                                <Badge variant={line.isActive ? 'default' : 'secondary'}>
                                  {line.isActive ? 'Activa' : 'Inactiva'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(line)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Editar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
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

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Linea de WhatsApp</DialogTitle>
              <DialogDescription>
                Modifica la configuracion de la linea.
                {editingLine && (
                  <span className="block mt-1 font-mono text-xs">
                    Tel: {editingLine.phoneNumber}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[60vh] overflow-y-auto py-4">
              <Tabs defaultValue="general">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="bot">Bot</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="wa-label">Etiqueta *</Label>
                    <Input
                      id="wa-label"
                      value={formLabel}
                      onChange={(e) => setFormLabel(e.target.value)}
                      placeholder="Etiqueta de la linea"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wa-phone">Telefono</Label>
                    <Input
                      id="wa-phone"
                      value={editingLine?.phoneNumber || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wa-duration">Duracion por defecto (minutos)</Label>
                    <Select
                      value={formDefaultDuration !== '' ? String(formDefaultDuration) : ''}
                      onValueChange={(val) => setFormDefaultDuration(val ? Number(val) : '')}
                      disabled={saving}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar duracion" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="90">1.5 horas</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="wa-active"
                      checked={formIsActive}
                      onCheckedChange={(checked) => setFormIsActive(checked === true)}
                      disabled={saving}
                    />
                    <Label htmlFor="wa-active" className="cursor-pointer">
                      Linea activa
                    </Label>
                  </div>
                </TabsContent>

                <TabsContent value="bot" className="space-y-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="wa-bot"
                      checked={formBotEnabled}
                      onCheckedChange={(checked) => setFormBotEnabled(checked === true)}
                      disabled={saving}
                    />
                    <Label htmlFor="wa-bot" className="cursor-pointer">
                      Bot habilitado
                    </Label>
                  </div>

                  {formBotEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="wa-bot-greeting">Mensaje de bienvenida del bot</Label>
                        <Textarea
                          id="wa-bot-greeting"
                          value={formBotGreeting}
                          onChange={(e) => setFormBotGreeting(e.target.value)}
                          placeholder="Ej: ¡Hola! Soy el asistente virtual de la Clínica. ¿En qué puedo ayudarte hoy?"
                          disabled={saving}
                          rows={4}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          Este mensaje se enviará cuando un paciente inicie una conversación con el bot.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="wa-handoff-type">Etiqueta de contacto en el bot</Label>
                        <Select
                          value={formHandoffType}
                          onValueChange={(val) => setFormHandoffType(val as 'secretary' | 'doctor')}
                          disabled={saving}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="secretary">La secretaría</SelectItem>
                            <SelectItem value="doctor">El doctor</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          El bot mostrará "Hablar con la secretaría" o "Hablar con el doctor" según esta configuración.
                        </p>
                      </div>
                    </>
                  )}

                  {/* Template mappings (read-only) */}
                  {templateMappings.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Plantillas configuradas</Label>
                        {templateMappings.some((m) => m.meta_status === 'PENDING') && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={checkingStatus}
                            onClick={async () => {
                              setCheckingStatus(true);
                              try {
                                const { data: result, error } = await supabase.functions.invoke('check-template-status');
                                if (error) throw error;
                                toast({
                                  title: 'Estado verificado',
                                  description: `Aprobadas: ${result?.approved ?? 0}, Rechazadas: ${result?.rejected ?? 0}, Pendientes: ${result?.still_pending ?? 0}`,
                                });
                                // Reload mappings
                                if (editingLine) {
                                  const { data } = await supabase
                                    .from('template_mappings')
                                    .select('logical_type, template_name, template_language, is_active, meta_status')
                                    .eq('whatsapp_line_id', editingLine.id)
                                    .order('logical_type');
                                  if (data) setTemplateMappings(data);
                                }
                              } catch (err: any) {
                                toast({ title: 'Error', description: err.message || 'Error al verificar estado', variant: 'destructive' });
                              } finally {
                                setCheckingStatus(false);
                              }
                            }}
                          >
                            {checkingStatus ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                            Verificar estado
                          </Button>
                        )}
                      </div>
                      <div className="rounded-md border divide-y text-sm">
                        {templateMappings.map((m) => (
                          <div key={m.logical_type} className="px-3 py-2 flex items-center justify-between gap-2">
                            <span className="text-muted-foreground capitalize">{m.logical_type.replace(/_/g, ' ')}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs truncate max-w-[200px]" title={m.template_name}>{m.template_name}</span>
                              {m.meta_status === 'APPROVED' && <Badge variant="default" className="bg-green-600 text-xs">Aprobada</Badge>}
                              {m.meta_status === 'PENDING' && <Badge variant="secondary" className="bg-yellow-500 text-white text-xs">Pendiente</Badge>}
                              {m.meta_status === 'REJECTED' && <Badge variant="destructive" className="text-xs">Rechazada</Badge>}
                              {m.meta_status === 'FAILED' && <Badge variant="destructive" className="text-xs">Error al crear</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {editingLine?.provider === 'meta' && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDisconnectConfirmPhone('');
                    setDisconnectDialogOpen(true);
                  }}
                  disabled={saving}
                  className="sm:mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Desconectar linea
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Disconnect confirmation dialog */}
        <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Desconectar linea de WhatsApp</DialogTitle>
              <DialogDescription>
                Esto eliminara la conexion WhatsApp, plantillas y sesiones de bot.
                El numero podra reconectarse despues. Los logs de mensajes se conservan.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Esta accion no se puede deshacer. Se deregistrara el telefono del Cloud API
                  de Meta y se eliminaran todos los datos asociados a esta linea.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="disconnect-confirm">
                  Escribe <span className="font-mono font-bold">{editingLine?.phoneNumber}</span> para confirmar
                </Label>
                <Input
                  id="disconnect-confirm"
                  value={disconnectConfirmPhone}
                  onChange={(e) => setDisconnectConfirmPhone(e.target.value)}
                  placeholder={editingLine?.phoneNumber}
                  disabled={disconnecting}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDisconnectDialogOpen(false)}
                disabled={disconnecting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={disconnecting || disconnectConfirmPhone !== editingLine?.phoneNumber}
              >
                {disconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar desconexion
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Connect new line dialog */}
        <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conectar línea de WhatsApp</DialogTitle>
              <DialogDescription>
                Conecta una nueva línea de WhatsApp Business a través de Meta.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <MetaEmbeddedSignup
                onSuccess={handleConnected}
                onError={(err) => toast({ title: 'Error al conectar', description: err, variant: 'destructive' })}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

// Mobile Card Component
interface WhatsAppLineCardProps {
  line: WhatsAppLine;
  onEdit: () => void;
}

function WhatsAppLineCard({ line, onEdit }: WhatsAppLineCardProps) {
  return (
    <div className="border-b last:border-b-0 py-3 px-4 hover:bg-muted/30 transition-colors">
      {/* Line 1: Label and Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-base font-semibold text-foreground">
            {line.label}
          </span>
        </div>
        <Badge variant={line.isActive ? 'default' : 'secondary'}>
          {line.isActive ? 'Activa' : 'Inactiva'}
        </Badge>
      </div>

      {/* Line 2: Details */}
      <div className="flex flex-col gap-1 mb-3 text-sm text-muted-foreground">
        <span>{line.phoneNumber}</span>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {line.provider}
          </Badge>
          <Badge variant={line.botEnabled ? 'default' : 'outline'} className="text-xs">
            Bot: {line.botEnabled ? 'Activo' : 'Inactivo'}
          </Badge>
          {line.clinicName && (
            <Badge variant="outline" className="text-xs">
              {line.clinicName}
            </Badge>
          )}
        </div>
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
