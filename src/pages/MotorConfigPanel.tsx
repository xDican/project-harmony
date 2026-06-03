/**
 * MotorConfigPanel — configuracion interna del Motor de Agendamiento Multi-Recurso.
 *
 * Fase 3. Ruta `/admin/motor` (admin-only). Power tool white-glove: Diego se loguea
 * como el admin de la org del cliente y configura aqui los recursos, recetas y skills.
 * Opera sobre la org del usuario logueado (sin selector — un admin por org).
 *
 * Tres pestanas:
 *   - Recursos:     cabinas/equipos/salas con cantidad (capacidad finita).
 *   - Servicios:    por servicio → buffer/precio/consulta-previa + receta de recursos.
 *   - Profesionales: skill matrix (que servicios ejecuta cada profesional).
 *
 * La creacion de servicios (nombre/duracion) vive en Lineas de WhatsApp; aqui solo
 * se editan sus atributos del motor y su receta.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Cog, Box, Stethoscope, Wrench } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useCurrentUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import {
  loadMotorBootstrap,
  saveResource,
  setResourceActive,
  setServiceRecipe,
  setProfessionalSkills,
  updateServiceTypeAttrs,
  type MotorBootstrap,
  type ResourceRow,
  type ResourceType,
  type ServiceTypeRow,
} from "@/lib/motorConfigApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
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

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  equipment: "Equipo",
  room: "Cabina / Sala",
};

export default function MotorConfigPanel() {
  const { organizationId } = useCurrentUser();
  const { toast } = useToast();

  const [boot, setBoot] = useState<MotorBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);
    try {
      setBoot(await loadMotorBootstrap(organizationId));
    } catch (e: any) {
      setError(e?.message ?? "No se pudo cargar la configuracion.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!organizationId) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <p className="text-muted-foreground">
            No hay una organizacion activa para configurar.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Cog className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Motor de agendamiento</h1>
            <p className="text-sm text-muted-foreground">
              Recursos, recetas y habilidades. Configuracion interna del motor
              multi-recurso.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando configuracion…
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center space-y-3">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={reload}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : boot ? (
          <Tabs defaultValue="recursos">
            <TabsList>
              <TabsTrigger value="recursos" className="gap-1.5">
                <Box className="h-4 w-4" /> Recursos
              </TabsTrigger>
              <TabsTrigger value="servicios" className="gap-1.5">
                <Wrench className="h-4 w-4" /> Servicios
              </TabsTrigger>
              <TabsTrigger value="profesionales" className="gap-1.5">
                <Stethoscope className="h-4 w-4" /> Profesionales
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recursos" className="mt-4">
              <ResourcesTab
                organizationId={organizationId}
                resources={boot.resources}
                onChanged={reload}
              />
            </TabsContent>

            <TabsContent value="servicios" className="mt-4">
              <ServicesTab
                organizationId={organizationId}
                boot={boot}
                onChanged={reload}
              />
            </TabsContent>

            <TabsContent value="profesionales" className="mt-4">
              <ProfessionalsTab
                organizationId={organizationId}
                boot={boot}
                onChanged={reload}
              />
            </TabsContent>
          </Tabs>
        ) : null}
      </div>
    </MainLayout>
  );
}

// ===========================================================================
// Tab Recursos
// ===========================================================================

function ResourcesTab({
  organizationId,
  resources,
  onChanged,
}: {
  organizationId: string;
  resources: ResourceRow[];
  onChanged: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceRow | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<ResourceType>("room");
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setType("room");
    setQuantity(1);
    setDialogOpen(true);
  };

  const openEdit = (r: ResourceRow) => {
    setEditing(r);
    setName(r.display_name);
    setType((r.resource_type as ResourceType) ?? "room");
    setQuantity(r.quantity);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Falta el nombre", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await saveResource({
        organizationId,
        id: editing?.id,
        input: { displayName: name, resourceType: type, quantity },
      });
      setDialogOpen(false);
      await onChanged();
      toast({ title: editing ? "Recurso actualizado" : "Recurso creado" });
    } catch (e: any) {
      toast({
        title: "No se pudo guardar",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (r: ResourceRow, isActive: boolean) => {
    setTogglingId(r.id);
    try {
      await setResourceActive({ organizationId, id: r.id, isActive });
      await onChanged();
    } catch (e: any) {
      toast({
        title: "No se pudo actualizar",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recursos finitos</CardTitle>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Agregar
        </Button>
      </CardHeader>
      <CardContent>
        {resources.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aun no hay recursos. Agrega cabinas, equipos o salas para activar el
            control de capacidad (ej: 3 maquinas de laser = max 3 citas de laser
            en paralelo).
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recurso</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Cantidad</TableHead>
                <TableHead className="text-center">Activo</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((r) => (
                <TableRow key={r.id} className={r.is_active ? "" : "opacity-50"}>
                  <TableCell className="font-medium">{r.display_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {RESOURCE_TYPE_LABELS[r.resource_type as ResourceType] ??
                        r.resource_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{r.quantity}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={r.is_active}
                      disabled={togglingId === r.id}
                      onCheckedChange={(v) => handleToggle(r, v)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar recurso" : "Nuevo recurso"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Cabina 1, Maquina laser Soprano"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as ResourceType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">Cabina / Sala</SelectItem>
                  <SelectItem value="equipment">Equipo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cantidad disponible</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Cuantas unidades hay. Limita las citas simultaneas que usan este
                recurso.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ===========================================================================
// Tab Servicios
// ===========================================================================

function ServicesTab({
  organizationId,
  boot,
  onChanged,
}: {
  organizationId: string;
  boot: MotorBootstrap;
  onChanged: () => Promise<void> | void;
}) {
  if (boot.serviceTypes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Esta organizacion no tiene servicios configurados. Crea los servicios
          primero en <span className="font-medium">Lineas de WhatsApp</span> y
          luego configura aqui su receta de recursos.
        </CardContent>
      </Card>
    );
  }

  const activeResources = boot.resources.filter((r) => r.is_active);

  return (
    <div className="space-y-4">
      {boot.serviceTypes.map((st) => (
        <ServiceConfigCard
          key={st.id}
          organizationId={organizationId}
          service={st}
          resources={activeResources}
          recipe={boot.recipes[st.id] ?? []}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

function ServiceConfigCard({
  organizationId,
  service,
  resources,
  recipe,
  onChanged,
}: {
  organizationId: string;
  service: ServiceTypeRow;
  resources: ResourceRow[];
  recipe: { resourceId: string; quantityRequired: number }[];
  onChanged: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [buffer, setBuffer] = useState(service.buffer_minutes ?? 0);
  const [price, setPrice] = useState<string>(
    service.price != null ? String(service.price) : "",
  );
  const [requiresConsult, setRequiresConsult] = useState(
    service.requires_prior_consult ?? false,
  );
  // recurso_id → cantidad (presente = en la receta)
  const [selected, setSelected] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const it of recipe) map[it.resourceId] = it.quantityRequired;
    return map;
  });
  const [saving, setSaving] = useState(false);

  const toggleResource = (resourceId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (checked) next[resourceId] = prev[resourceId] ?? 1;
      else delete next[resourceId];
      return next;
    });
  };

  const setQty = (resourceId: string, qty: number) => {
    setSelected((prev) => ({ ...prev, [resourceId]: Math.max(1, Math.floor(qty || 1)) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedPrice = price.trim() === "" ? null : Number(price);
      await updateServiceTypeAttrs({
        organizationId,
        serviceTypeId: service.id,
        attrs: {
          bufferMinutes: buffer,
          price: parsedPrice != null && !Number.isNaN(parsedPrice) ? parsedPrice : null,
          requiresPriorConsult: requiresConsult,
        },
      });
      await setServiceRecipe({
        organizationId,
        serviceTypeId: service.id,
        items: Object.entries(selected).map(([resourceId, quantityRequired]) => ({
          resourceId,
          quantityRequired,
        })),
      });
      await onChanged();
      toast({ title: `Guardado: ${service.display_name}` });
    } catch (e: any) {
      toast({
        title: "No se pudo guardar",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {service.display_name}
          {service.duration_minutes != null && (
            <Badge variant="secondary" className="font-normal">
              {service.duration_minutes} min
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Limpieza / buffer (min)</Label>
            <Input
              type="number"
              min={0}
              value={buffer}
              onChange={(e) => setBuffer(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Precio (opcional)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="—"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Requiere consulta previa</Label>
            <div className="flex items-center h-10">
              <Switch
                checked={requiresConsult}
                onCheckedChange={setRequiresConsult}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Receta de recursos</Label>
          {resources.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No hay recursos activos. Agregalos en la pestana Recursos.
            </p>
          ) : (
            <div className="space-y-2">
              {resources.map((r) => {
                const checked = r.id in selected;
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`${service.id}-${r.id}`}
                      checked={checked}
                      onCheckedChange={(v) => toggleResource(r.id, v === true)}
                    />
                    <Label
                      htmlFor={`${service.id}-${r.id}`}
                      className="font-normal flex-1 cursor-pointer"
                    >
                      {r.display_name}
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        (cap. {r.quantity})
                      </span>
                    </Label>
                    {checked && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">usa</span>
                        <Input
                          type="number"
                          min={1}
                          className="w-16 h-8"
                          value={selected[r.id]}
                          onChange={(e) => setQty(r.id, Number(e.target.value))}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ===========================================================================
// Tab Profesionales (skill matrix)
// ===========================================================================

function ProfessionalsTab({
  organizationId,
  boot,
  onChanged,
}: {
  organizationId: string;
  boot: MotorBootstrap;
  onChanged: () => Promise<void> | void;
}) {
  if (boot.doctors.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Esta organizacion no tiene profesionales registrados.
        </CardContent>
      </Card>
    );
  }
  if (boot.serviceTypes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Configura primero los servicios para poder asignar quien ejecuta cada
          uno.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {boot.doctors.map((doc) => (
        <ProfessionalSkillCard
          key={doc.id}
          organizationId={organizationId}
          doctor={doc}
          serviceTypes={boot.serviceTypes}
          currentSkills={boot.skills[doc.id] ?? []}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

function ProfessionalSkillCard({
  organizationId,
  doctor,
  serviceTypes,
  currentSkills,
  onChanged,
}: {
  organizationId: string;
  doctor: MotorBootstrap["doctors"][number];
  serviceTypes: ServiceTypeRow[];
  currentSkills: string[];
  onChanged: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(currentSkills),
  );
  const [saving, setSaving] = useState(false);

  const toggle = (stId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(stId);
      else next.delete(stId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setProfessionalSkills({
        organizationId,
        doctorId: doctor.id,
        serviceTypeIds: Array.from(selected),
      });
      await onChanged();
      toast({ title: "Habilidades guardadas" });
    } catch (e: any) {
      toast({
        title: "No se pudo guardar",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const displayName = `${doctor.prefix ?? ""} ${doctor.name}`.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {displayName}
          {!doctor.user_id && (
            <Badge variant="outline" className="font-normal">
              Tecnica
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {serviceTypes.map((st) => (
            <div key={st.id} className="flex items-center gap-2.5">
              <Checkbox
                id={`${doctor.id}-${st.id}`}
                checked={selected.has(st.id)}
                onCheckedChange={(v) => toggle(st.id, v === true)}
              />
              <Label
                htmlFor={`${doctor.id}-${st.id}`}
                className="font-normal cursor-pointer"
              >
                {st.display_name}
              </Label>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
