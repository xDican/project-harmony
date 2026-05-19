/**
 * PromotionsPage — listado de promociones de la org.
 *
 * Sprint 5 (Centro de Atencion — Promociones del mes).
 *
 * Adaptacion del mockup Stitch:
 *   - Header: titulo + descripcion + boton "Nueva promocion"
 *   - Banner amarillo si hay promos por expirar en proximos 3 dias
 *   - Tabs: Todas / Activas / Borradores / Expiradas / Archivadas
 *   - Grid responsive de cards (3 cols desktop, 1 col mobile)
 *   - FAB "+" flotante en mobile
 *   - Confirmaciones para archivar / eliminar / duplicar
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Sparkles,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useCurrentUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePromotions, type PromotionsFilter } from "@/hooks/usePromotions";
import { usePromotionsExpiringSoon } from "@/hooks/usePromotionsExpiringSoon";
import { PromoCard } from "@/components/promotions/PromoCard";
import type { Promotion } from "@/lib/promotionsApi";

const TAB_LABELS: Record<PromotionsFilter, string> = {
  all: "Todas",
  active: "Activas",
  draft: "Borradores",
  expired: "Expiradas",
  archived: "Archivadas",
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function PromotionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { organizationId } = useCurrentUser();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Tab desde URL ?tab=active|draft|...
  const initialTab = (searchParams.get("tab") as PromotionsFilter | null) ?? "all";
  const [tab, setTab] = useState<PromotionsFilter>(initialTab);

  useEffect(() => {
    if (tab === "all") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", tab);
    }
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const {
    data: promotions,
    isLoading,
    error,
    archive,
    reactivate,
    duplicate,
    remove,
  } = usePromotions(organizationId ?? undefined, { filter: tab });

  const { promotions: expiringPromos, count: expiringCount } =
    usePromotionsExpiringSoon(organizationId ?? undefined, { withinDays: 3 });

  // Mapa service_type_id → name (para mostrar badge en cards)
  const [serviceTypeNames, setServiceTypeNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from("service_types")
      .select("id, name")
      .eq("organization_id", organizationId)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((st: { id: string; name: string }) => {
          map[st.id] = st.name;
        });
        setServiceTypeNames(map);
      });
  }, [organizationId]);

  // Dialogs
  const [archiveTarget, setArchiveTarget] = useState<Promotion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<Promotion | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<Promotion | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Duplicate state
  const [dupValidFrom, setDupValidFrom] = useState(todayISO());
  const [dupValidTo, setDupValidTo] = useState(plusDaysISO(30));

  // Reactivate state
  const [reactValidTo, setReactValidTo] = useState(plusDaysISO(30));

  // Filtros para banner: solo mostrar si hay expirando
  const banner = useMemo(() => {
    if (expiringCount === 0) return null;
    const first = expiringPromos[0];
    if (!first) return null;
    const days = Math.ceil(
      (new Date(first.valid_to + "T00:00:00").getTime() -
        new Date(todayISO() + "T00:00:00").getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return {
      count: expiringCount,
      first,
      daysLeft: Math.max(0, days),
    };
  }, [expiringCount, expiringPromos]);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setActionLoading(true);
    try {
      await archive(archiveTarget.id);
      toast({ title: "Promoción archivada" });
      setArchiveTarget(null);
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await remove(deleteTarget.id);
      toast({ title: "Promoción eliminada" });
      setDeleteTarget(null);
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateTarget) return;
    if (dupValidFrom > dupValidTo) {
      toast({ title: "Fechas inválidas", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    try {
      const created = await duplicate(duplicateTarget, dupValidFrom, dupValidTo);
      toast({ title: "Promoción duplicada" });
      setDuplicateTarget(null);
      navigate(`/configuracion/promociones/${created.id}/editar`);
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!reactivateTarget) return;
    if (reactValidTo <= todayISO()) {
      toast({
        title: "Fecha inválida",
        description: "La nueva fecha de fin debe ser posterior a hoy.",
        variant: "destructive",
      });
      return;
    }
    setActionLoading(true);
    try {
      await reactivate(reactivateTarget.id, reactValidTo);
      toast({ title: "Promoción reactivada" });
      setReactivateTarget(null);
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-4 pb-24 md:pb-8">
        {/* Banner expiring */}
        {banner ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50 px-4 py-3 cursor-pointer hover:bg-amber-100/50 transition-colors"
            onClick={() =>
              navigate(`/configuracion/promociones/${banner.first.id}/editar`)
            }
          >
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                {banner.count === 1
                  ? `1 promoción expira ${banner.daysLeft <= 0 ? "hoy" : `en ${banner.daysLeft} ${banner.daysLeft === 1 ? "día" : "días"}`}`
                  : `${banner.count} promociones expiran en los próximos 3 días`}
                {" — "}
                <span className="underline">actualizá la próxima</span>
              </p>
              {banner.count === 1 ? (
                <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                  {banner.first.title}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Promociones del mes
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestioná las ofertas y campañas activas de tu negocio.
            </p>
          </div>
          {!isMobile && (
            <Button onClick={() => navigate("/configuracion/promociones/nueva")}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva promoción
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as PromotionsFilter)}>
          <TabsList className="grid grid-cols-5 w-full md:w-auto md:inline-flex">
            {(Object.keys(TAB_LABELS) as PromotionsFilter[]).map((key) => (
              <TabsTrigger key={key} value={key} className="text-xs md:text-sm">
                {TAB_LABELS[key]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Content */}
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
        ) : promotions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-3">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40" />
              {tab === "all" ? (
                <>
                  <p className="font-medium">Todavía no hay promociones.</p>
                  <p className="text-sm">
                    Creá la primera para que el bot la pueda ofrecer cuando un paciente pregunte.
                  </p>
                  <Button
                    onClick={() => navigate("/configuracion/promociones/nueva")}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear promoción
                  </Button>
                </>
              ) : (
                <p>No hay promociones en esta categoría.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotions.map((p) => (
              <PromoCard
                key={p.id}
                promotion={p}
                serviceTypeLabel={p.service_type_id ? serviceTypeNames[p.service_type_id] : null}
                onArchive={() => setArchiveTarget(p)}
                onDuplicate={() => {
                  setDuplicateTarget(p);
                  setDupValidFrom(todayISO());
                  setDupValidTo(plusDaysISO(30));
                }}
                onReactivate={() => {
                  setReactivateTarget(p);
                  setReactValidTo(plusDaysISO(30));
                }}
                onDelete={() => setDeleteTarget(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB mobile */}
      {isMobile && (
        <Button
          onClick={() => navigate("/configuracion/promociones/nueva")}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
          aria-label="Nueva promoción"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Dialog archivar */}
      <AlertDialog
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar esta promoción?</AlertDialogTitle>
            <AlertDialogDescription>
              "{archiveTarget?.title}" se moverá a Archivadas. El bot ya no la
              ofrecerá. Podés reactivarla o duplicarla más adelante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog eliminar */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta promoción?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" se borrará permanentemente. No se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog duplicar */}
      <Dialog
        open={!!duplicateTarget}
        onOpenChange={(o) => !o && setDuplicateTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar promoción</DialogTitle>
            <DialogDescription>
              Se creará una copia de "{duplicateTarget?.title}" con las fechas
              que elijas. Podés editar el resto en el siguiente paso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="dup-from">Desde</Label>
              <Input
                id="dup-from"
                type="date"
                value={dupValidFrom}
                onChange={(e) => setDupValidFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dup-to">Hasta</Label>
              <Input
                id="dup-to"
                type="date"
                value={dupValidTo}
                onChange={(e) => setDupValidTo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDuplicateTarget(null)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleDuplicate} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Duplicar y editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog reactivar */}
      <Dialog
        open={!!reactivateTarget}
        onOpenChange={(o) => !o && setReactivateTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivar promoción</DialogTitle>
            <DialogDescription>
              "{reactivateTarget?.title}" vuelve a estar activa. La fecha de
              inicio se actualiza a hoy. Elegí hasta cuándo va a estar vigente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="react-to">Nueva fecha de fin</Label>
              <Input
                id="react-to"
                type="date"
                value={reactValidTo}
                onChange={(e) => setReactValidTo(e.target.value)}
                min={plusDaysISO(1)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setReactivateTarget(null)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleReactivate} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Reactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
