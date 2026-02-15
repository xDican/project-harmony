import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/context/UserContext';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { getFAQs, createFAQ, updateFAQ, deleteFAQ } from '@/api/botFaqs';
import type { BotFAQ, BotFAQInsert } from '@/types/bot.types';
import { Loader2, Search, Plus, Edit, Trash2, MessageCircleQuestion, GripVertical } from 'lucide-react';

export default function BotFAQsPage() {
  const { isAdmin, isSecretary, organizationId, currentDoctorId } = useCurrentUser();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [faqs, setFaqs] = useState<BotFAQ[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<BotFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'org' | 'clinic' | 'doctor'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 5 : 10;

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<BotFAQ | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [formScope, setFormScope] = useState<1 | 2 | 3>(3); // Default to org-level
  const [formIsActive, setFormIsActive] = useState(true);
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<BotFAQ | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (organizationId) {
      loadFAQs();
    }
  }, [organizationId]);

  useEffect(() => {
    filterFAQs();
  }, [faqs, searchQuery, scopeFilter]);

  const loadFAQs = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const data = await getFAQs({
        organizationId,
        doctorId: currentDoctorId || undefined,
        includeInactive: true,
      });
      setFaqs(data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Error al cargar FAQs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterFAQs = () => {
    let result = [...faqs];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (faq) =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query) ||
          faq.keywords?.some((k) => k.toLowerCase().includes(query))
      );
    }

    // Filter by scope
    if (scopeFilter !== 'all') {
      if (scopeFilter === 'org') {
        result = result.filter((faq) => faq.scope_priority === 3);
      } else if (scopeFilter === 'clinic') {
        result = result.filter((faq) => faq.scope_priority === 2);
      } else if (scopeFilter === 'doctor') {
        result = result.filter((faq) => faq.scope_priority === 1);
      }
    }

    setFilteredFaqs(result);
    setCurrentPage(1);
  };

  const openCreateDialog = () => {
    setEditingFaq(null);
    setFormQuestion('');
    setFormAnswer('');
    setFormKeywords('');
    setFormScope(3); // Default to org-level
    setFormIsActive(true);
    setFormDisplayOrder(faqs.length);
    setDialogOpen(true);
  };

  const openEditDialog = (faq: BotFAQ) => {
    setEditingFaq(faq);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormKeywords(faq.keywords?.join(', ') || '');
    setFormScope(faq.scope_priority as 1 | 2 | 3);
    setFormIsActive(faq.is_active);
    setFormDisplayOrder(faq.display_order);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!organizationId) return;

    // Validation
    if (formQuestion.trim().length < 5) {
      toast({
        title: 'Error',
        description: 'La pregunta debe tener al menos 5 caracteres',
        variant: 'destructive',
      });
      return;
    }

    if (formAnswer.trim().length < 10) {
      toast({
        title: 'Error',
        description: 'La respuesta debe tener al menos 10 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const keywords = formKeywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      if (editingFaq) {
        // Update existing FAQ
        await updateFAQ(editingFaq.id, {
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
          keywords,
          is_active: formIsActive,
          display_order: formDisplayOrder,
        });

        toast({
          title: 'FAQ actualizado',
          description: 'El FAQ se actualizó correctamente',
        });
      } else {
        // Create new FAQ
        const newFaq: BotFAQInsert = {
          organization_id: organizationId,
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
          keywords,
          scope_priority: formScope,
          is_active: formIsActive,
          display_order: formDisplayOrder,
        };

        // Set doctor_id or clinic_id based on scope
        if (formScope === 1 && currentDoctorId) {
          newFaq.doctor_id = currentDoctorId;
        }
        // Note: clinic_id would need to be selected from a dropdown if scope === 2

        await createFAQ(newFaq);

        toast({
          title: 'FAQ creado',
          description: 'El FAQ se creó correctamente',
        });
      }

      setDialogOpen(false);
      loadFAQs();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Error al guardar FAQ',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (faq: BotFAQ) => {
    setFaqToDelete(faq);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!faqToDelete) return;

    setDeleting(true);
    try {
      await deleteFAQ(faqToDelete.id, false); // Soft delete
      toast({
        title: 'FAQ eliminado',
        description: 'El FAQ se desactivó correctamente',
      });
      setDeleteDialogOpen(false);
      loadFAQs();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Error al eliminar FAQ',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const getScopeLabel = (faq: BotFAQ) => {
    if (faq.scope_priority === 1) return 'Doctor';
    if (faq.scope_priority === 2) return 'Clínica';
    return 'Organización';
  };

  const getScopeBadgeVariant = (faq: BotFAQ) => {
    if (faq.scope_priority === 1) return 'default';
    if (faq.scope_priority === 2) return 'secondary';
    return 'outline';
  };

  // Pagination
  const totalPages = Math.ceil(filteredFaqs.length / itemsPerPage);
  const paginatedFaqs = filteredFaqs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!isAdmin && !isSecretary) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertDescription>No tienes permisos para acceder a esta página</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">FAQs del Bot</h1>
            <p className="text-muted-foreground">
              Gestiona las preguntas frecuentes del bot de WhatsApp
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo FAQ
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Buscar en preguntas, respuestas o palabras clave..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope">Alcance</Label>
                <Select value={scopeFilter} onValueChange={(v: any) => setScopeFilter(v)}>
                  <SelectTrigger id="scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="org">Organización</SelectItem>
                    <SelectItem value="clinic">Clínica</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {loading ? 'Cargando...' : `${filteredFaqs.length} FAQ${filteredFaqs.length !== 1 ? 's' : ''}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredFaqs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircleQuestion className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No se encontraron FAQs</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Pregunta</TableHead>
                      <TableHead>Alcance</TableHead>
                      <TableHead>Palabras clave</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFaqs.map((faq) => (
                      <TableRow key={faq.id}>
                        <TableCell className="text-muted-foreground">
                          {faq.display_order}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="font-medium">{faq.question}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {faq.answer}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getScopeBadgeVariant(faq)}>
                            {getScopeLabel(faq)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {faq.keywords?.slice(0, 3).map((keyword, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                            {faq.keywords && faq.keywords.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{faq.keywords.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={faq.is_active ? 'default' : 'secondary'}>
                            {faq.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(faq)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(faq)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFaq ? 'Editar FAQ' : 'Nuevo FAQ'}
            </DialogTitle>
            <DialogDescription>
              {editingFaq
                ? 'Modifica los detalles del FAQ'
                : 'Crea un nuevo FAQ para el bot de WhatsApp'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question">
                Pregunta <span className="text-destructive">*</span>
              </Label>
              <Input
                id="question"
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="¿Cuál es el horario de atención?"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formQuestion.length}/500 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer">
                Respuesta <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="answer"
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                placeholder="Nuestro horario es de lunes a viernes..."
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                {formAnswer.length}/2000 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Palabras clave</Label>
              <Input
                id="keywords"
                value={formKeywords}
                onChange={(e) => setFormKeywords(e.target.value)}
                placeholder="horario, atención, horas (separadas por comas)"
              />
              <p className="text-xs text-muted-foreground">
                Separa las palabras clave con comas
              </p>
            </div>

            {!editingFaq && (
              <div className="space-y-2">
                <Label htmlFor="scope">Alcance</Label>
                <Select
                  value={formScope.toString()}
                  onValueChange={(v) => setFormScope(parseInt(v) as 1 | 2 | 3)}
                >
                  <SelectTrigger id="scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Organización (todos)</SelectItem>
                    <SelectItem value="2" disabled>
                      Clínica (próximamente)
                    </SelectItem>
                    <SelectItem value="1" disabled={!currentDoctorId}>
                      Doctor (solo mis pacientes)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="display_order">Orden de visualización</Label>
              <Input
                id="display_order"
                type="number"
                value={formDisplayOrder}
                onChange={(e) => setFormDisplayOrder(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formIsActive}
                onCheckedChange={(checked) => setFormIsActive(checked as boolean)}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                FAQ activo
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingFaq ? 'Guardar cambios' : 'Crear FAQ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar FAQ?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas desactivar este FAQ? Los usuarios ya no verán esta pregunta.
            </DialogDescription>
          </DialogHeader>

          {faqToDelete && (
            <div className="py-4">
              <p className="font-medium">{faqToDelete.question}</p>
              <p className="text-sm text-muted-foreground mt-1">{faqToDelete.answer}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
