

## Plan: Conectar plantillas WhatsApp a Edge Functions reales

### Resumen
Actualizar `src/lib/whatsappApi.ts` para incluir el token de autorizacion del usuario en las llamadas, agregar `getTemplate(id)` como llamada al backend, y cambiar la logica de fallback para que solo use mock mode en caso de 404. Actualizar la pagina de detalle para cargar desde el backend.

---

### Archivos a modificar

#### 1. `src/lib/whatsappApi.ts`

**Cambios:**

- Actualizar `getAuthHeaders()` para incluir el token JWT del usuario autenticado (obtenido de `supabase.auth.getSession()`)
- Importar el cliente supabase desde `@/integrations/supabase/client`

```typescript
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': '<anon_key>',
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}
```

- Hacer `getAuthHeaders` asincrona y actualizar todas las llamadas que la usan (await)

- **`listTemplates()`**: cambiar el catch para solo hacer fallback a mock si el status es 404. Si es otro error (500, 401, etc.), devolver `{ data: null, error: "mensaje", isMockMode: false }`

- **`createTemplate()`**: misma logica -- solo fallback a mock en 404. Otros errores se muestran al usuario.

- **Agregar `getTemplate(id)`**: nueva funcion asincrona

```typescript
export async function getTemplate(id: string): Promise<ApiResult<WhatsAppTemplate>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/templates-get?id=${encodeURIComponent(id)}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    return { data: data.template ?? data, error: null, isMockMode: false };
  } catch {
    // Fallback to local mock
    const local = getTemplateById(id);
    return { data: local, error: local ? null : 'Template not found', isMockMode: !!local };
  }
}
```

- Mantener `getTemplateById` como funcion sincorna de fallback interno

---

#### 2. `src/pages/WhatsAppPlantillaDetalle.tsx`

**Cambios:**
- Cambiar de carga sincrona (`getTemplateById`) a carga asincrona (`getTemplate`)
- Agregar estados: `loading`, `template`, `error`
- Usar `useEffect` para cargar el template al montar
- Mostrar spinner mientras carga
- Mostrar error si falla

---

#### 3. `src/pages/WhatsAppPlantillaNueva.tsx`

**Cambio minimo:**
- El `createTemplate` ya se usa correctamente, solo se beneficia del fix en `whatsappApi.ts` (auth headers + error handling mejorado)
- Agregar manejo del caso donde `result.error` existe (ya esta implementado)

---

### Lo que NO cambia
- Rutas
- UI/UX visual
- i18n
- WhatsAppSettings.tsx (ya usa `listTemplates` correctamente, solo se beneficia del fix en whatsappApi)
- MetaOAuthCallback.tsx

### Resultado esperado
- Las plantillas se cargan desde el backend real cuando las Edge Functions responden
- El banner de mock mode solo aparece si el endpoint devuelve 404
- Errores reales (401, 500) se muestran al usuario como mensajes de error
- La pagina de detalle carga desde `templates-get?id=` en vez de localStorage

