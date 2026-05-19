/**
 * PromotionFormPage — crear o editar promocion.
 *
 * Sprint 5 (Centro de Atencion — Promociones del mes).
 *
 * Adaptacion del mockup Stitch:
 *   - Header con breadcrumb + titulo + botones Cancelar / Guardar
 *   - Layout 2 columnas (desktop) / apilado (mobile):
 *       - Izquierda (data): card "Informacion General" + card "Configuracion"
 *       - Derecha (preview): card "Imagen Principal" + card "Vista Previa WhatsApp"
 *
 * Rutas:
 *   - /configuracion/promociones/nueva
 *   - /configuracion/promociones/:id/editar
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Save,
  X,
  ChevronRight,
  Info,
  Settings as SettingsIcon,
  Image as ImageIcon,
  Loader2,
  Upload,
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useCurrentUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPromotion,
  updatePromotion,
  type Promotion,
  type PromotionStatus,
} from "@/lib/promotionsApi";
import {
  getPromoImageSignedUrl,
  uploadPromoImage,
  PromoImageUploadError,
} from "@/lib/promoImageUpload";
import { WhatsAppPreview } from "@/components/promotions/WhatsAppPreview";

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 300;
const MAX_CONDITIONS = 200;

interface ServiceType {
  id: string;
  name: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function PromotionFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { organizationId } = useCurrentUser();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [conditions, setConditions] = useState("");
  const [validFrom, setValidFrom] = useState(todayISO());
  const [validTo, setValidTo] = useState(plusDaysISO(30));
  const [serviceTypeId, setServiceTypeId] = useState<string>("none");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Imagen
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageLocalPreview, setImageLocalPreview] = useState<string | null>(null);
  const [imageSignedUrl, setImageSignedUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Service types
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);

  // Loading / saving
  const [loadingPromo, setLoadingPromo] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Cargar service types de la org
  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from("service_types")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.warn("[PromotionFormPage] service_types fetch:", error.message);
          return;
        }
        setServiceTypes((data as ServiceType[]) ?? []);
      });
  }, [organizationId]);

  // Si esta editando, cargar la promo
  useEffect(() => {
    if (!isEditing || !id) return;
    let cancelled = false;
    setLoadingPromo(true);

    supabase
      .from("promotions")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          toast({
            title: "No se pudo cargar la promoción",
            description: error?.message ?? "No encontrada",
            variant: "destructive",
          });
          navigate("/configuracion/promociones");
          return;
        }
        const p = data as Promotion;
        setTitle(p.title);
        setDescription(p.description);
        setConditions(p.conditions ?? "");
        setValidFrom(p.valid_from);
        setValidTo(p.valid_to);
        setServiceTypeId(p.service_type_id ?? "none");
        setKeywords(p.keywords ?? []);
        setIsActive(p.status !== "draft");
        setImagePath(p.image_url);
        setLoadingPromo(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEditing, navigate, toast]);

  // Resolver signed URL cuando hay imagePath persistido (sin preview local)
  useEffect(() => {
    if (!imagePath || imageLocalPreview) {
      setImageSignedUrl(null);
      return;
    }
    let cancelled = false;
    getPromoImageSignedUrl(imagePath).then((url) => {
      if (!cancelled) setImageSignedUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [imagePath, imageLocalPreview]);

  const previewImageUrl = imageLocalPreview ?? imageSignedUrl;

  const datesValid = useMemo(() => validFrom <= validTo, [validFrom, validTo]);

  const handleImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !organizationId) return;

    setUploadingImage(true);
    // Preview local inmediato
    const localUrl = URL.createObjectURL(file);
    setImageLocalPreview(localUrl);

    try {
      const { path } = await uploadPromoImage({ orgId: organizationId, file });
      setImagePath(path);
      // Si estaba editando, ya guardamos el cambio para que persista incluso sin
      // tocar el boton "Guardar" — UX más amable. Sólo si hay id.
      if (isEditing && id) {
        await updatePromotion(id, { image_url: path });
        toast({ title: "Imagen actualizada" });
      }
    } catch (err) {
      const msg =
        err instanceof PromoImageUploadError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Error desconocido";
      toast({ title: "No se pudo subir la imagen", description: msg, variant: "destructive" });
      setImageLocalPreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const addKeyword = () => {
    const v = keywordInput.trim();
    if (!v) return;
    if (keywords.includes(v)) {
      setKeywordInput("");
      return;
    }
    setKeywords((prev) => [...prev, v]);
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const handleSubmit = async () => {
    if (!organizationId) {
      toast({ title: "Sin organización", variant: "destructive" });
      return;
    }
    const t = title.trim();
    const d = description.trim();
    if (!t) {
      toast({ title: "Falta el título", variant: "destructive" });
      return;
    }
    if (!d) {
      toast({ title: "Falta la descripción", variant: "destructive" });
      return;
    }
    if (!datesValid) {
      toast({
        title: "Fechas inválidas",
        description: "La fecha 'Hasta' no puede ser anterior a 'Desde'.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // El toggle del usuario manda: si marcó "Activa" guardamos active aun si
      // valid_from es futuro — el bot filtra por (valid_from <= today AND
      // valid_to >= today) asi que no se muestra antes de tiempo. Si marcó
      // borrador guardamos draft (el cron lo activa cuando llegue valid_from).
      const today = new Date().toISOString().slice(0, 10);
      let userPickedStatus: PromotionStatus;
      if (!isActive) {
        userPickedStatus = "draft";
      } else if (validTo < today) {
        userPickedStatus = "expired";
      } else {
        userPickedStatus = "active";
      }

      const payload = {
        title: t,
        description: d,
        conditions: conditions.trim() || null,
        valid_from: validFrom,
        valid_to: validTo,
        service_type_id: serviceTypeId === "none" ? null : serviceTypeId,
        keywords,
        image_url: imagePath,
        status: userPickedStatus,
      };

      if (isEditing && id) {
        await updatePromotion(id, payload);
        toast({ title: "Promoción actualizada" });
      } else {
        await createPromotion({
          organization_id: organizationId,
          ...payload,
        });
        toast({ title: "Promoción creada" });
      }

      navigate("/configuracion/promociones");
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

  if (loadingPromo) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <Link to="/configuracion/promociones" className="hover:text-foreground">
                Promociones
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>{isEditing ? "Editar promoción" : "Nueva promoción"}</span>
            </nav>
            <h1 className="text-2xl font-semibold">
              {isEditing ? "Editar promoción" : "Crear promoción"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/configuracion/promociones")}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? "Guardar cambios" : "Guardar promoción"}
            </Button>
          </div>
        </div>

        {/* Layout 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda — datos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información General */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <Info className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Información general</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Título de la promoción</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
                    placeholder="ej: Botox primera consulta -30%"
                    maxLength={MAX_TITLE}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Descripción para pacientes</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value.slice(0, MAX_DESCRIPTION))
                    }
                    placeholder="Lo que el bot le va a contar al paciente..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {description.length}/{MAX_DESCRIPTION} caracteres
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conditions">Condiciones y restricciones</Label>
                  <Textarea
                    id="conditions"
                    value={conditions}
                    onChange={(e) =>
                      setConditions(e.target.value.slice(0, MAX_CONDITIONS))
                    }
                    placeholder="Aplica de lunes a viernes. No acumulable."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Configuración */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <SettingsIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Configuración</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="from">Fecha de inicio</Label>
                    <Input
                      id="from"
                      type="date"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="to">Fecha de fin</Label>
                    <Input
                      id="to"
                      type="date"
                      value={validTo}
                      onChange={(e) => setValidTo(e.target.value)}
                      className={!datesValid ? "border-destructive" : undefined}
                    />
                    {!datesValid ? (
                      <p className="text-xs text-destructive">
                        La fecha final no puede ser anterior a la inicial.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="service">Servicio asociado (opcional)</Label>
                  <Select value={serviceTypeId} onValueChange={setServiceTypeId}>
                    <SelectTrigger id="service">
                      <SelectValue placeholder="Sin servicio específico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin servicio específico</SelectItem>
                      {serviceTypes.map((st) => (
                        <SelectItem key={st.id} value={st.id}>
                          {st.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Si lo asociás, el bot la sugiere cuando el paciente pregunta por ese servicio.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="keywords">Palabras clave (para que el bot la encuentre)</Label>
                  <div className="flex flex-wrap items-center gap-1.5 p-2 border rounded-md min-h-10">
                    {keywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="gap-1">
                        {kw}
                        <button
                          type="button"
                          onClick={() => removeKeyword(kw)}
                          className="hover:text-destructive"
                          aria-label={`Quitar ${kw}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      id="keywords"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addKeyword();
                        }
                      }}
                      onBlur={addKeyword}
                      placeholder={
                        keywords.length === 0
                          ? "estética facial, juventud, arrugas"
                          : "Agregar..."
                      }
                      className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border px-3 py-3">
                  <div>
                    <Label htmlFor="active" className="text-sm font-medium">
                      Estado: {isActive ? "Activa" : "Borrador"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isActive
                        ? "Visible para el bot desde su fecha de inicio."
                        : "Guardada sin publicar. El bot no la muestra."}
                    </p>
                  </div>
                  <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha — preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <ImageIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Imagen principal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="relative aspect-square bg-muted rounded-md overflow-hidden border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewImageUrl ? (
                    <img
                      src={previewImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <Upload className="h-8 w-8" />
                      <p className="text-xs text-center px-4">
                        Click para subir
                        <br />
                        (JPG o PNG — max 5 MB)
                      </p>
                    </div>
                  )}
                  {uploadingImage ? (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : null}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  hidden
                  onChange={handleImageSelect}
                />
                {previewImageUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    Reemplazar imagen
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <WhatsAppPreview
              title={title}
              description={description}
              conditions={conditions}
              validFrom={validFrom}
              validTo={validTo}
              imageUrl={previewImageUrl}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
