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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { getWhatsAppLinesByOrganization, updateWhatsAppLine } from '@/lib/api.supabase';
import type { WhatsAppLine } from '@/types/organization';
import { Loader2, Search, Edit, MessageCircle } from 'lucide-react';

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

  // Form fields
  const [formLabel, setFormLabel] = useState('');
  const [formBotEnabled, setFormBotEnabled] = useState(false);
  const [formBotGreeting, setFormBotGreeting] = useState('');
  const [formDefaultDuration, setFormDefaultDuration] = useState<number | ''>('');
  const [formIsActive, setFormIsActive] = useState(true);

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

  const openEditDialog = (line: WhatsAppLine) => {
    setEditingLine(line);
    setFormLabel(line.label);
    setFormBotEnabled(line.botEnabled);
    setFormBotGreeting(line.botGreeting || '');
    setFormDefaultDuration(line.defaultDurationMinutes || '');
    setFormIsActive(line.isActive);
    setDialogOpen(true);
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
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2">Lineas de WhatsApp</h1>
          <p className="text-muted-foreground">
            Administra las lineas de WhatsApp conectadas a tu organizacion.
          </p>
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

            <div className="space-y-4 py-4">
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
                <Input
                  id="wa-duration"
                  type="number"
                  min={1}
                  max={480}
                  value={formDefaultDuration}
                  onChange={(e) =>
                    setFormDefaultDuration(e.target.value ? Number(e.target.value) : '')
                  }
                  placeholder="Ej: 30"
                  disabled={saving}
                />
              </div>

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
              )}

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
                Guardar cambios
              </Button>
            </DialogFooter>
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
