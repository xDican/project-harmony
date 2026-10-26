/**
 * ProductsPage — catálogo de productos (PatPat Live), hub del patrón Hub + Drawer.
 *
 * Única ruta (/productos); crear/ver/editar viven en ProductDrawer. Mismo
 * esqueleto que PropertiesPage: búsqueda client-side, filtro por Select con
 * estado en la URL, grid de 2 columnas, FAB mobile / botón header desktop.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Package, Loader2, Search, Settings } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useCurrentUser } from "@/context/UserContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts, type ProductsFilter } from "@/hooks/useProducts";
import type { Product } from "@/lib/productsApi";
import { useOrders } from "@/hooks/useOrders";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductDrawer } from "@/components/products/ProductDrawer";
import { StoreSettingsDrawer } from "@/components/products/StoreSettingsDrawer";

const TAB_LABELS: Record<ProductsFilter, string> = {
  all: "Todos",
  active: "Activos",
  inactive: "Inactivos",
};

export default function ProductsPage() {
  const { organizationId, isAdmin } = useCurrentUser();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get("tab") as ProductsFilter | null) ?? "all";
  const [tab, setTab] = useState<ProductsFilter>(initialTab in TAB_LABELS ? initialTab : "all");

  useEffect(() => {
    if (tab === "all") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", tab);
    }
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const { data: products, isLoading, error, create, update } = useProducts(
    organizationId ?? undefined,
    { filter: tab },
  );

  // stock en BD = disponible (ya descuenta reservas); "reservado" se deriva de
  // los ítems de pedidos abiertos.
  const { data: openOrders } = useOrders(organizationId ?? undefined, {
    statuses: ["reservado", "en_revision"],
  });
  const reservedByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of openOrders) {
      for (const item of order.order_items) {
        map.set(item.product_id, (map.get(item.product_id) ?? 0) + item.quantity);
      }
    }
    return map;
  }, [openOrders]);

  const { data: settings, save: saveSettings } = useStoreSettings(organizationId ?? undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // undefined = drawer cerrado; null = modo crear; string = id del producto a ver/editar.
  // Se guarda el ID (no una copia) para que el Drawer siempre reciba el objeto vivo.
  const [drawerTargetId, setDrawerTargetId] = useState<string | null | undefined>(undefined);
  // Con filtro Activos/Inactivos, desactivar/reactivar saca la fila de la lista
  // mientras el Drawer sigue abierto: se conserva la última copia vista para que
  // no pase a modo "crear".
  const lastDrawerProduct = useRef<Product | undefined>();
  const liveDrawerProduct = drawerTargetId != null ? products.find((p) => p.id === drawerTargetId) : undefined;
  if (liveDrawerProduct) lastDrawerProduct.current = liveDrawerProduct;
  const drawerProduct =
    drawerTargetId == null
      ? undefined
      : liveDrawerProduct ??
        (lastDrawerProduct.current?.id === drawerTargetId ? lastDrawerProduct.current : undefined);

  const [search, setSearch] = useState("");
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) =>
      [p.code, p.name, String(p.price)].join(" ").toLowerCase().includes(term),
    );
  }, [products, search]);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-4 pb-24 md:pb-8">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código o nombre"
              className="pl-9"
            />
          </div>

          <Separator orientation="vertical" className="h-8 bg-border w-px" />

          <Select value={tab} onValueChange={(v) => setTab(v as ProductsFilter)}>
            <SelectTrigger className="w-32 md:w-40 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TAB_LABELS) as ProductsFilter[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {TAB_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin && (
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => setSettingsOpen(true)}
              aria-label="Ajustes de la tienda"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}

          {isAdmin && !isMobile && (
            <Button onClick={() => setDrawerTargetId(null)} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo producto
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-destructive">{error}</CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-3">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/40" />
              {tab === "all" ? (
                <>
                  <p className="font-medium">Aún no hay productos.</p>
                  {isAdmin ? (
                    <>
                      <p className="text-sm">
                        Subí una foto clara de cada pieza: se genera su código (A101…) para escribirlo en la
                        etiqueta.
                      </p>
                      <Button onClick={() => setDrawerTargetId(null)} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo producto
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm">Un administrador debe cargar el catálogo.</p>
                  )}
                </>
              ) : (
                <p>No hay productos en esta categoría.</p>
              )}
            </CardContent>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Search className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p>Sin resultados para "{search}".</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                reserved={reservedByProduct.get(p.id) ?? 0}
                onClick={() => setDrawerTargetId(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {isAdmin && isMobile && (
        <Button
          onClick={() => setDrawerTargetId(null)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
          aria-label="Nuevo producto"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {organizationId && (
        <ProductDrawer
          open={drawerTargetId !== undefined}
          onOpenChange={(open) => {
            if (!open) setDrawerTargetId(undefined);
          }}
          product={drawerProduct}
          organizationId={organizationId}
          reserved={drawerProduct ? reservedByProduct.get(drawerProduct.id) ?? 0 : 0}
          canEdit={isAdmin}
          onCreate={create}
          onUpdate={async (id, patch) => {
            const row = await update(id, patch);
            lastDrawerProduct.current = row; // refleja el cambio si la fila salió del filtro
            return row;
          }}
        />
      )}

      {isAdmin && (
        <StoreSettingsDrawer
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={settings}
          onSave={saveSettings}
        />
      )}
    </MainLayout>
  );
}
