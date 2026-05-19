/**
 * QuickRepliesPage — administracion de plantillas rapidas de la asistente.
 *
 * Sprint 4 (Centro de Atencion). Ruta `/configuracion/quick-replies`.
 *
 * Funcionalidad:
 *   - Listar plantillas de la org activa (todas, activas + inactivas)
 *   - Filtrar por categoria
 *   - Crear, editar, eliminar (delete: solo admin via RLS)
 *   - Toggle is_active rapido desde la tabla
 *
 * Patron simplificado de BotFAQsPage. No tiene scope clinic/doctor — todas las
 * plantillas son org-level en este Sprint.
 */

import { useMemo, useState } from "react";
import { Loader2, Plus, Edit, Trash2, MessageSquareReply } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useCurrentUser } from "@/context/UserContext";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import {
  QUICK_REPLY_CATEGORIES,
  QUICK_REPLY_CATEGORY_LABELS,
  type QuickReply,
  type QuickReplyCategory,
} from "@/lib/quickRepliesApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const MAX_TITLE_LENGTH = 80;
const MAX_CONTENT_LENGTH = 2000;

type CategoryFilter = QuickReplyCategory | "all";

export default function QuickRepliesPage() {
  const { organizationId, isAdmin } = useCurrentUser();
  const { toast } = useToast();
  const { data, isLoading, error, create, update, remove } = useQuickReplies(
    organizationId ?? undefined,
  );

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  // Dialog crear/editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [saving, setSaving] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<QuickReplyCategory>("otro");
  const [formContent, setFormContent] = useState("");
  const [formActive, setFormActive] = useState(true);

  // Dialog confirm delete
  const [deleteTarget, setDeleteTarget] = useState<QuickReply | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return data;
    return data.filter((qr) => qr.category === categoryFilter);
  }, [data, categoryFilter]);

  const openCreateDialog = () => {
    setEditing(null);
    setFormTitle("");
    setFormCategory("otro");
    setFormContent("");
    setFormActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (qr: QuickReply) => {
    setEditing(qr);
    setFormTitle(qr.title);
    setFormCategory(qr.category as QuickReplyCategory);
    setFormContent(qr.content);
    setFormActive(qr.is_active);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const trimmedTitle = formTitle.trim();
    const trimmedContent = formContent.trim();

    if (!trimmedTitle) {
      toast({
        title: "Falta título",
        description: "Dale un nombre corto para reconocer la plantilla.",
        variant: "destructive",
      });
      return;
    }
    if (!trimmedContent) {
      toast({
        title: "Falta contenido",
        description: "Escribí el texto que se va a insertar.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await update(editing.id, {
          title: trimmedTitle,
          category: formCategory,
          content: trimmedContent,
          is_active: formActive,
        });
        toast({ title: "Plantilla actualizada" });
      } else {
        await create({
          title: trimmedTitle,
          category: formCategory,
          content: trimmedContent,
          is_active: formActive,
        });
        toast({ title: "Plantilla creada" });
      }
      setDialogOpen(false);
    } catch (e) {
      toast({
        title: "Error al guardar",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (qr: QuickReply) => {
    try {
      await update(qr.id, { is_active: !qr.is_active });
    } catch (e) {
      toast({
        title: "Error al actualizar",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
      toast({ title: "Plantilla eliminada" });
      setDeleteTarget(null);
    } catch (e) {
      toast({
        title: "Error al eliminar",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <MessageSquareReply className="h-6 w-6 text-primary" />
              Respuestas rápidas
            </h1>
            <p className="text-sm text-muted-foreground">
              Plantillas que se insertan al responder en el inbox de tu negocio.
            </p>
          </div>
          <Button onClick={openCreateDialog} className="md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nueva respuesta
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="cat-filter" className="text-sm">
            Categoría:
          </Label>
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
          >
            <SelectTrigger id="cat-filter" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {QUICK_REPLY_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {QUICK_REPLY_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-destructive">
              {error}
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {data.length === 0
                ? "Todavía no hay plantillas. Creá la primera para responder más rápido."
                : "No hay plantillas en esta categoría."}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead className="w-32">Categoría</TableHead>
                  <TableHead className="hidden md:table-cell">Vista previa</TableHead>
                  <TableHead className="w-20 text-center">Activa</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((qr) => (
                  <TableRow key={qr.id}>
                    <TableCell className="font-medium">{qr.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {QUICK_REPLY_CATEGORY_LABELS[qr.category as QuickReplyCategory] ?? qr.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-md truncate">
                      {qr.content}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={qr.is_active}
                        onCheckedChange={() => handleToggleActive(qr)}
                        aria-label={`Activar ${qr.title}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(qr)}
                          aria-label={`Editar ${qr.title}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(qr)}
                            aria-label={`Eliminar ${qr.title}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar respuesta rápida" : "Nueva respuesta rápida"}
            </DialogTitle>
            <DialogDescription>
              Podés editar el texto antes de enviarlo cuando uses la plantilla.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="qr-title">Título</Label>
              <Input
                id="qr-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
                placeholder="ej: Dirección y mapa"
                maxLength={MAX_TITLE_LENGTH}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qr-category">Categoría</Label>
              <Select
                value={formCategory}
                onValueChange={(v) => setFormCategory(v as QuickReplyCategory)}
              >
                <SelectTrigger id="qr-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUICK_REPLY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {QUICK_REPLY_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qr-content">Contenido</Label>
              <Textarea
                id="qr-content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
                placeholder="Escribí el texto que se va a insertar..."
                rows={6}
                className="resize-y"
              />
              <p className="text-xs text-muted-foreground text-right">
                {formContent.length} / {MAX_CONTENT_LENGTH}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <Label htmlFor="qr-active" className="text-sm font-medium">
                  Plantilla activa
                </Label>
                <p className="text-xs text-muted-foreground">
                  Si está desactivada, no aparece al elegir respuestas en el inbox.
                </p>
              </div>
              <Switch id="qr-active" checked={formActive} onCheckedChange={setFormActive} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editing ? "Guardar cambios" : "Crear plantilla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará "{deleteTarget?.title}" para todo el negocio. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
