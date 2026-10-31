/**
 * PropertyDrawer — ver/crear/editar una propiedad, patrón Hub + Drawer.
 *
 * Piloto bienes raices Bruno (10 Ago 2026). Un solo Drawer con 2 modos
 * internos ('view' | 'form') en vez de anidar un segundo Drawer para editar
 * (a diferencia de Reagendar/RescheduleModal, este form no se reusa en
 * ningún otro lugar del repo — no amerita esa separación). Ver
 * CLAUDE.md Fase 3 / memoria feedback_patron-hub-drawer.
 */

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Bed, Bath, Home, Pencil, Plus, Loader2, Star, Car, X as XIcon } from "lucide-react";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  type Property,
  type PropertyInsert,
  type PropertyStatus,
  type PropertyType,
  type PropertyUpdate,
} from "@/lib/propertiesApi";
import {
  getPropertyPhotoSignedUrl,
  uploadPropertyPhoto,
  deletePropertyPhoto,
} from "@/lib/propertyPhotoUpload";

interface PropertyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property;
  organizationId: string;
  onCreate: (input: Omit<PropertyInsert, "organization_id" | "code">) => Promise<Property>;
  onUpdate: (id: string, patch: PropertyUpdate) => Promise<Property>;
}

const STATUS_OPTIONS: PropertyStatus[] = ["disponible", "reservada", "vendida", "inactiva"];
const TYPE_OPTIONS: PropertyType[] = ["casa", "apartamento", "townhouse", "terreno"];

function formatPrice(price: number | null): string {
  if (price === null) return "Precio a consultar";
  return `L ${price.toLocaleString("es-HN")}`;
}

/** Miniatura con signed URL propio — mismo patrón que PropertyCard. */
function PhotoThumb({
  path,
  isCover,
  onMakeCover,
  onRemove,
}: {
  path: string;
  isCover?: boolean;
  onMakeCover?: () => void;
  onRemove?: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPropertyPhotoSignedUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const editable = !!onRemove;

  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border bg-muted group">
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {isCover && (
        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
          Portada
        </div>
      )}
      {editable && (
        <div className="absolute inset-0 flex items-start justify-end gap-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isCover && onMakeCover && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-6 w-6"
              title="Hacer portada"
              onClick={onMakeCover}
            >
              <Star className="h-3 w-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-6 w-6 text-destructive"
            title="Eliminar foto"
            onClick={onRemove}
          >
            <XIcon className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function PropertyDrawer({
  open,
  onOpenChange,
  property,
  organizationId,
  onCreate,
  onUpdate,
}: PropertyDrawerProps) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<"view" | "form">(property ? "view" : "form");

  const [title, setTitle] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [zone, setZone] = useState("");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [sizeVaras, setSizeVaras] = useState("");
  const [constructionSizeM2, setConstructionSizeM2] = useState("");
  const [parkingSpots, setParkingSpots] = useState("");
  const [frontYard, setFrontYard] = useState(false);
  const [backYard, setBackYard] = useState(false);
  const [status, setStatus] = useState<PropertyStatus>("disponible");
  const [photos, setPhotos] = useState<string[]>([]);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const statusMessageTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(statusMessageTimeoutRef.current), []);

  // Reset completo solo al ABRIR — no en cada cambio de referencia de
  // `property` (usePropierties refetch-en-focus cambia la referencia y
  // resetear el form mid-edicion seria un bug de UX, no un feature).
  useEffect(() => {
    if (!open) return;
    setMode(property ? "view" : "form");
    setTitle(property?.title ?? "");
    setPropertyType((property?.property_type as PropertyType) ?? "");
    setZone(property?.zone ?? "");
    setPrice(property?.price != null ? String(property.price) : "");
    setBedrooms(property?.bedrooms != null ? String(property.bedrooms) : "");
    setBathrooms(property?.bathrooms != null ? String(property.bathrooms) : "");
    setSizeVaras(property?.size_varas != null ? String(property.size_varas) : "");
    setConstructionSizeM2(
      property?.construction_size_m2 != null ? String(property.construction_size_m2) : "",
    );
    setParkingSpots(property?.parking_spots != null ? String(property.parking_spots) : "");
    setFrontYard(property?.front_yard ?? false);
    setBackYard(property?.back_yard ?? false);
    setStatus((property?.status as PropertyStatus) ?? "disponible");
    setPhotos(property?.photos ?? []);
    setError(null);
    setStatusMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const { path } = await uploadPropertyPhoto({ orgId: organizationId, file });
      setPhotos((prev) => [...prev, path]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleMakeCover = (index: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  };

  const handleRemovePhoto = (index: number) => {
    const path = photos[index];
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    void deletePropertyPhoto(path);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !propertyType) {
      setError("Título y tipo son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    const patch = {
      title: title.trim(),
      property_type: propertyType,
      zone: zone.trim() || null,
      price: price ? Number(price) : null,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      size_varas: sizeVaras ? Number(sizeVaras) : null,
      construction_size_m2: constructionSizeM2 ? Number(constructionSizeM2) : null,
      parking_spots: parkingSpots ? Number(parkingSpots) : null,
      front_yard: frontYard,
      back_yard: backYard,
      photos,
    };
    try {
      if (property) {
        await onUpdate(property.id, { ...patch, status });
      } else {
        await onCreate(patch);
      }
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la propiedad.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusChange = async (newStatus: PropertyStatus) => {
    if (!property) return;
    setChangingStatus(true);
    try {
      await onUpdate(property.id, { status: newStatus });
      setStatusMessage(`Estado actualizado a ${PROPERTY_STATUS_LABELS[newStatus]}`);
      clearTimeout(statusMessageTimeoutRef.current);
      statusMessageTimeoutRef.current = setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo cambiar el estado.",
        variant: "destructive",
      });
    } finally {
      setChangingStatus(false);
    }
  };

  const viewContent = property ? (
    <div className="relative flex flex-col gap-4 pb-2 min-h-full">
      {statusMessage && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center pointer-events-none">
          <p className="pointer-events-auto text-sm font-medium text-center text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 shadow-md rounded-full py-1.5 px-4 truncate max-w-full">
            {statusMessage}
          </p>
        </div>
      )}

      {photos.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <div key={p} className="w-32 shrink-0">
              <PhotoThumb path={p} isCover={i === 0} />
            </div>
          ))}
        </div>
      ) : (
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <Home className="h-10 w-10 text-muted-foreground/40" />
        </div>
      )}

      <Badge variant="outline" className="w-fit">
        {property.code}
      </Badge>

      <div>
        <h2 className="text-lg font-semibold leading-tight">{property.title}</h2>
        <p className="text-sm text-muted-foreground">{property.zone}</p>
        <p className="text-xl font-bold text-primary mt-1">{formatPrice(property.price)}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted rounded-lg p-3 flex flex-col items-center gap-1">
          <Bed className="h-4 w-4 text-primary" />
          <span className="font-semibold">{property.bedrooms ?? "—"}</span>
          <span className="text-[10px] text-muted-foreground uppercase">Hab.</span>
        </div>
        <div className="bg-muted rounded-lg p-3 flex flex-col items-center gap-1">
          <Bath className="h-4 w-4 text-primary" />
          <span className="font-semibold">{property.bathrooms ?? "—"}</span>
          <span className="text-[10px] text-muted-foreground uppercase">Baños</span>
        </div>
        <div className="bg-muted rounded-lg p-3 flex flex-col items-center gap-1">
          <Car className="h-4 w-4 text-primary" />
          <span className="font-semibold">{property.parking_spots ?? "—"}</span>
          <span className="text-[10px] text-muted-foreground uppercase">Parqueos</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
          <span className="text-muted-foreground">Terreno</span>
          <span className="font-medium">
            {property.size_varas ?? "—"} v²
          </span>
        </div>
        <div className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
          <span className="text-muted-foreground">Construcción</span>
          <span className="font-medium">
            {property.construction_size_m2 ?? "—"} m²
          </span>
        </div>
      </div>

      {(property.front_yard || property.back_yard) && (
        <p className="text-sm text-muted-foreground">
          Patio: {[property.front_yard && "frontal", property.back_yard && "trasero"]
            .filter(Boolean)
            .join(" y ")}
        </p>
      )}
    </div>
  ) : null;

  const formContent = (
    <div className="flex flex-col gap-4">
      {property && (
        <p className="text-xs text-muted-foreground">
          Código <span className="font-medium">{property.code}</span> (no editable)
        </p>
      )}

      <div className="space-y-1.5">
        <Label>Título</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Casa 3 habitaciones, Zona Viera" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={propertyType} onValueChange={(v) => setPropertyType(v as PropertyType)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {PROPERTY_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Zona</Label>
          <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ej. Res. El Trapiche" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Precio (Lempiras)</Label>
        <NumericInput value={price} onChange={setPrice} placeholder="0" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Habitaciones</Label>
          <NumericInput value={bedrooms} onChange={setBedrooms} />
        </div>
        <div className="space-y-1.5">
          <Label>Baños</Label>
          <NumericInput value={bathrooms} onChange={setBathrooms} allowDecimal />
        </div>
        <div className="space-y-1.5">
          <Label>Parqueos</Label>
          <NumericInput value={parkingSpots} onChange={setParkingSpots} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Terreno (v²)</Label>
          <NumericInput value={sizeVaras} onChange={setSizeVaras} allowDecimal />
        </div>
        <div className="space-y-1.5">
          <Label>Construcción (m²)</Label>
          <NumericInput value={constructionSizeM2} onChange={setConstructionSizeM2} allowDecimal />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={frontYard} onCheckedChange={(v) => setFrontYard(v === true)} />
          Patio frontal
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={backYard} onCheckedChange={(v) => setBackYard(v === true)} />
          Patio trasero
        </label>
      </div>

      {property && (
        <div className="space-y-1.5">
          <Label>Estado</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as PropertyStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {PROPERTY_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Fotos</Label>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <PhotoThumb
              key={p}
              path={p}
              isCover={i === 0}
              onMakeCover={() => handleMakeCover(i)}
              onRemove={() => handleRemovePhoto(i)}
            />
          ))}
          <label className="aspect-square border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploadingPhoto}
            />
          </label>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  const footer =
    mode === "view" && property ? (
      <div className="flex items-center gap-2 w-full">
        <Select
          value={property.status}
          onValueChange={(v) => handleQuickStatusChange(v as PropertyStatus)}
          disabled={changingStatus}
        >
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {PROPERTY_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setMode("form")}>
          <Pencil className="h-4 w-4 mr-1.5" />
          Editar
        </Button>
      </div>
    ) : isMobile ? (
      <Button className="w-full" onClick={handleSubmit} disabled={saving}>
        {saving ? "Guardando..." : property ? "Guardar cambios" : "Crear propiedad"}
      </Button>
    ) : (
      <>
        <Button variant="outline" onClick={() => (property ? setMode("view") : onOpenChange(false))}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Guardando..." : property ? "Guardar cambios" : "Crear propiedad"}
        </Button>
      </>
    );

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "view" && property ? property.title : property ? "Editar propiedad" : "Nueva propiedad"}
      footer={footer}
      mobileFullScreen
      desktopMaxWidth="max-w-2xl"
    >
      {mode === "view" && property ? viewContent : formContent}
    </ResponsiveModal>
  );
}
