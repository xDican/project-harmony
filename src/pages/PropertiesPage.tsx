/**
 * PropertiesPage — catálogo de propiedades, hub del patrón Hub + Drawer.
 *
 * Piloto bienes raices Bruno (10 Ago 2026). Única ruta (/propiedades) —
 * crear/ver/editar viven en PropertyDrawer, nunca en rutas separadas.
 * Filtro de estado vía Select (no Tabs) con estado en la URL, grid fijo de
 * 2 columnas, FAB mobile / botón header desktop — ajustes post-QA de Diego.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Home, Loader2, Search } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useCurrentUser } from "@/context/UserContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProperties, type PropertiesFilter } from "@/hooks/useProperties";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyDrawer } from "@/components/properties/PropertyDrawer";
import { PROPERTY_TYPE_LABELS, type PropertyType } from "@/lib/propertiesApi";

const TAB_LABELS: Record<PropertiesFilter, string> = {
  all: "Todas",
  disponible: "Disponibles",
  reservada: "Reservadas",
  vendida: "Vendidas",
  inactiva: "Inactivas",
};

export default function PropertiesPage() {
  const { organizationId } = useCurrentUser();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get("tab") as PropertiesFilter | null) ?? "all";
  const [tab, setTab] = useState<PropertiesFilter>(initialTab);

  useEffect(() => {
    if (tab === "all") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", tab);
    }
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const { data: properties, isLoading, error, create, update } = useProperties(
    organizationId ?? undefined,
    { filter: tab },
  );

  // undefined = drawer cerrado; null = modo crear; string = id de la propiedad a ver/editar.
  // Se guarda el ID, no una copia de la propiedad — así el Drawer siempre recibe el objeto
  // vivo del array `properties` (ver abajo) y refleja cambios (ej. status) sin cerrarse.
  const [drawerTargetId, setDrawerTargetId] = useState<string | null | undefined>(undefined);
  const drawerProperty =
    drawerTargetId != null ? properties.find((p) => p.id === drawerTargetId) : undefined;

  // Buscador client-side — volumen bajo por org (decenas, no cientos, ver
  // Fase 0), no amerita busqueda server-side. Busca en cualquier dato
  // relevante: titulo, codigo, zona, tipo, precio.
  const [search, setSearch] = useState("");
  const filteredProperties = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return properties;
    return properties.filter((p) => {
      const haystack = [
        p.title,
        p.code,
        p.zone,
        PROPERTY_TYPE_LABELS[p.property_type as PropertyType] ?? p.property_type,
        p.price != null ? String(p.price) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [properties, search]);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-4 pb-24 md:pb-8">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar"
              className="pl-9"
            />
          </div>

          <Separator orientation="vertical" className="h-8 bg-border w-px" />

          <Select value={tab} onValueChange={(v) => setTab(v as PropertiesFilter)}>
            <SelectTrigger className="w-36 md:w-44 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TAB_LABELS) as PropertiesFilter[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {TAB_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isMobile && (
            <Button onClick={() => setDrawerTargetId(null)} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Nueva propiedad
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
        ) : properties.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-3">
              <Home className="h-10 w-10 mx-auto text-muted-foreground/40" />
              {tab === "all" ? (
                <>
                  <p className="font-medium">Aún no tienes propiedades.</p>
                  <p className="text-sm">
                    Empieza cargando tu primera propiedad para que tu bot de WhatsApp pueda
                    consultarlas.
                  </p>
                  <Button onClick={() => setDrawerTargetId(null)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva propiedad
                  </Button>
                </>
              ) : (
                <p>No hay propiedades en esta categoría.</p>
              )}
            </CardContent>
          </Card>
        ) : filteredProperties.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Search className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p>Sin resultados para "{search}".</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProperties.map((p) => (
              <PropertyCard key={p.id} property={p} onClick={() => setDrawerTargetId(p.id)} />
            ))}
          </div>
        )}
      </div>

      {isMobile && (
        <Button
          onClick={() => setDrawerTargetId(null)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
          aria-label="Nueva propiedad"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {organizationId && (
        <PropertyDrawer
          open={drawerTargetId !== undefined}
          onOpenChange={(open) => {
            if (!open) setDrawerTargetId(undefined);
          }}
          property={drawerProperty}
          organizationId={organizationId}
          onCreate={create}
          onUpdate={update}
        />
      )}
    </MainLayout>
  );
}
