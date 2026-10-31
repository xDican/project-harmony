/**
 * ProductDrawer — ver/crear/editar un producto, patrón Hub + Drawer.
 *
 * Un solo Drawer con 2 modos internos ('view' | 'form'), como PropertyDrawer.
 * Un producto nunca se borra (order_items es RESTRICT): se desactiva.
 * `canEdit=false` (secretary) deja solo la vista.
 */

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Package, Pencil, Plus, Loader2 } from "lucide-react";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import type { Product, ProductInsert, ProductUpdate } from "@/lib/productsApi";
import { uploadProductPhoto, deleteProductPhoto } from "@/lib/productPhotoUpload";
import { formatMoney } from "@/lib/formatMoney";
import { ProductPhoto } from "@/components/products/ProductPhoto";
import { StockBar } from "@/components/products/StockBar";

interface ProductDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  organizationId: string;
  /** Unidades en pedidos abiertos (reservado / en_revision) */
  reserved: number;
  canEdit: boolean;
  onCreate: (input: Omit<ProductInsert, "organization_id" | "code">) => Promise<Product>;
  onUpdate: (id: string, patch: ProductUpdate) => Promise<Product>;
}

export function ProductDrawer({
  open,
  onOpenChange,
  product,
  organizationId,
  reserved,
  canEdit,
  onCreate,
  onUpdate,
}: ProductDrawerProps) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<"view" | "form">(product ? "view" : "form");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [photos, setPhotos] = useState<string[]>([]);
  const [active, setActive] = useState(true);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fotos subidas en esta sesión de edición pero aún no guardadas: si se
  // cierra sin guardar quedarían huérfanas en el bucket.
  const sessionUploads = useRef<string[]>([]);

  // Reset solo al ABRIR — el refetch en focus cambia la referencia de `product`
  // y resetear mid-edición sería un bug de UX.
  useEffect(() => {
    if (!open) return;
    setMode(product ? "view" : "form");
    setName(product?.name ?? "");
    setDescription(product?.description ?? "");
    setPrice(product ? String(product.price) : "");
    setStock(product ? String(product.stock) : "1");
    setPhotos(product?.photos ?? []);
    setActive(product?.active ?? true);
    setError(null);
    sessionUploads.current = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const discardUnsavedUploads = () => {
    for (const path of sessionUploads.current) {
      if (!product?.photos?.includes(path)) void deleteProductPhoto(path);
    }
    sessionUploads.current = [];
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) discardUnsavedUploads();
    onOpenChange(next);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const { path } = await uploadProductPhoto({ orgId: organizationId, file });
      sessionUploads.current.push(path);
      setPhotos((prev) => [...prev, path]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto.");
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

  // No se borra del bucket acá: la foto sigue referenciada por la BD hasta
  // guardar. Se limpia en handleSubmit (guardado) o al descartar (sesión).
  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const priceNum = Number(price);
    const stockNum = Number(stock);
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (price === "" || !Number.isFinite(priceNum) || priceNum < 0) {
      setError("Ingresá un precio válido.");
      return;
    }
    if (stock === "" || !Number.isInteger(stockNum) || stockNum < 0) {
      setError("El stock debe ser un número entero, 0 o más.");
      return;
    }
    setSaving(true);
    setError(null);
    const patch = {
      name: name.trim(),
      description: description.trim() || null,
      price: priceNum,
      stock: stockNum,
      photos,
    };
    try {
      if (product) {
        await onUpdate(product.id, { ...patch, active });
        // fotos quitadas del producto: ahora sí se pueden borrar del bucket
        for (const path of product.photos ?? []) {
          if (!photos.includes(path)) void deleteProductPhoto(path);
        }
      } else {
        await onCreate({ ...patch, active });
      }
      sessionUploads.current = [];
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!product) return;
    setTogglingActive(true);
    try {
      await onUpdate(product.id, { active: !product.active });
      toast({
        title: product.active ? "Producto desactivado" : "Producto reactivado",
        description:
          product.active && reserved > 0
            ? `Las ${reserved} ${reserved === 1 ? "reservada" : "reservadas"} en pedidos abiertos se mantienen.`
            : undefined,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo cambiar el estado.",
        variant: "destructive",
      });
    } finally {
      setTogglingActive(false);
    }
  };

  const viewContent = product ? (
    <div className="flex flex-col gap-4 pb-2">
      <div className="rounded-xl bg-muted py-6 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Código</p>
        <p className="text-6xl font-extrabold tracking-wider leading-none mt-1">{product.code}</p>
      </div>

      {product.photos.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {product.photos.map((p, i) => (
            <div key={p} className="w-32 shrink-0">
              <ProductPhoto path={p} isCover={i === 0} />
            </div>
          ))}
        </div>
      ) : (
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <Package className="h-10 w-10 text-muted-foreground/40" />
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold leading-tight">{product.name}</h2>
        {product.description && (
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{product.description}</p>
        )}
        <p className="text-xl font-bold text-primary mt-2">{formatMoney(product.price, product.currency)}</p>
      </div>

      {product.stock + reserved > 0 ? (
        <StockBar stock={product.stock} reserved={reserved} large />
      ) : (
        <p className="text-sm text-red-700 dark:text-red-300">Agotado</p>
      )}

      {!product.active && (
        <Alert>
          <AlertDescription>
            Producto inactivo: el bot no lo ofrece ni lo reserva. Se conserva para el historial de pedidos.
            {reserved > 0 &&
              ` Las ${reserved} ${reserved === 1 ? "reservada" : "reservadas"} en pedidos abiertos se mantienen.`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  ) : null;

  const formContent = (
    <div className="flex flex-col gap-4">
      {product ? (
        <p className="text-xs text-muted-foreground">
          Código <span className="font-medium">{product.code}</span> (no editable)
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          El código (ej. A101) se genera solo al guardar. Escribilo en la etiqueta de la pieza.
        </p>
      )}

      <div className="space-y-1.5">
        <Label>Nombre</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Camisa azul talla M" />
      </div>

      <div className="space-y-1.5">
        <Label>Descripción (opcional)</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Precio (Lempiras)</Label>
          <NumericInput value={price} onChange={setPrice} placeholder="0" allowDecimal />
        </div>
        <div className="space-y-1.5">
          <Label>Unidades disponibles</Label>
          <NumericInput value={stock} onChange={setStock} />
        </div>
      </div>
      {product && reserved > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-300 -mt-2">
          Además hay {reserved} {reserved === 1 ? "reservada" : "reservadas"} en pedidos abiertos; no se cuentan acá.
        </p>
      )}

      <div className="space-y-1.5">
        <Label>Fotos (JPG o PNG)</Label>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <ProductPhoto
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

      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          Activo
          <span className="block text-xs text-muted-foreground">Si está apagado el bot no lo ofrece.</span>
        </span>
        <Switch checked={active} onCheckedChange={setActive} />
      </label>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  const saveLabel = saving ? "Guardando..." : product ? "Guardar cambios" : "Crear producto";

  const footer =
    mode === "view" && product ? (
      canEdit ? (
        <div className="flex items-center gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={handleToggleActive} disabled={togglingActive}>
            {product.active ? "Desactivar" : "Reactivar"}
          </Button>
          <Button className="flex-1" onClick={() => setMode("form")}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Editar
          </Button>
        </div>
      ) : undefined
    ) : isMobile ? (
      <Button className="w-full" onClick={handleSubmit} disabled={saving}>
        {saveLabel}
      </Button>
    ) : (
      <>
        <Button
          variant="outline"
          onClick={() => {
            if (product) {
              discardUnsavedUploads();
              setPhotos(product.photos ?? []);
              setMode("view");
            } else {
              handleOpenChange(false);
            }
          }}
        >
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saveLabel}
        </Button>
      </>
    );

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleOpenChange}
      title={mode === "view" && product ? product.name : product ? "Editar producto" : "Nuevo producto"}
      footer={footer}
      mobileFullScreen
      desktopMaxWidth="max-w-xl"
    >
      {mode === "view" && product ? viewContent : formContent}
    </ResponsiveModal>
  );
}
