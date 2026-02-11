

## Plan: Interfaz de WhatsApp Business bajo /configuracion/whatsapp

### Resumen

Refactorizar y expandir las páginas existentes de WhatsApp (`/settings/whatsapp` y `/auth/meta/callback`) para moverlas bajo `/configuracion/whatsapp`, traducir todo a español latino, agregar gestión de plantillas con modo mock, y registrar las nuevas rutas en el router.

---

### Archivos a crear

#### 1. `src/lib/whatsappApi.ts` - Servicio centralizado de API

Centraliza todas las llamadas a Edge Functions de WhatsApp:

```typescript
const SUPABASE_URL = 'https://soxrlxvivuplezssgssq.supabase.co';

// startOAuth: POST meta-oauth-start
// exchangeOAuth: POST meta-oauth-exchange
// listTemplates: GET templates-list (con fallback a mock)
// createTemplate: POST templates-create (con fallback a localStorage)
```

- Si las llamadas fallan, usa datos mock desde localStorage
- Flag `isMockMode` en las respuestas para mostrar banner

#### 2. `src/pages/WhatsAppPlantillaNueva.tsx` - Crear plantilla

Formulario con:
- Nombre (requerido)
- Categoría: select con UTILITY, MARKETING, AUTHENTICATION
- Idioma: select con es_ES (default), en_US
- Cuerpo del mensaje: textarea (requerido)
- Texto explicativo: "Use {{1}}, {{2}} para variables dinámicas."
- Botones: "Crear plantilla" y "Cancelar"
- POST a `templates-create`, fallback a localStorage con estado "borrador"
- Al crear, navegar a `/configuracion/whatsapp` con toast de éxito

#### 3. `src/pages/WhatsAppPlantillaDetalle.tsx` - Ver plantilla

Muestra:
- Nombre, Categoría, Idioma, Estado, Cuerpo del mensaje
- Botón "Volver"
- Botón deshabilitado "Usar en confirmación de cita"

---

### Archivos a modificar

#### 4. `src/pages/WhatsAppSettings.tsx` - Reescritura completa

Cambios principales:
- Traducir todo a español latino
- **Tarjeta 1: Conexión con Meta**
  - Badge: "Conectado" o "No conectado" (basado en `localStorage.meta_connected`)
  - Botón "Conectar WhatsApp Business"
  - Texto auxiliar: "Esta conexión es obligatoria para la revisión de Meta."
- **Tarjeta 2: Plantillas de Mensajes**
  - Subtítulo: "Requerido para la revisión de Meta"
  - Tabla: Nombre, Categoría, Idioma, Estado, Última actualización
  - GET a `templates-list`, fallback a mock con banner "Backend no conectado aún. Ejecutando en modo demostración."
  - Botón "Crear plantilla" -> `/configuracion/whatsapp/plantillas/nueva`
  - Click en fila -> `/configuracion/whatsapp/plantillas/:id`
  - Estado vacío: "Aún no hay plantillas creadas."
- `backTo="/configuracion"` en MainLayout

#### 5. `src/pages/MetaOAuthCallback.tsx` - Actualizar

- Traducir textos a español
- Título: "Conectando WhatsApp..."
- Éxito: "Conectado correctamente" + redirección a `/configuracion/whatsapp`
- Error: mensaje claro + botón "Volver a configuración"
- Texto: "No cierre esta ventana."
- Errores de `code`/`state` faltantes: mensaje en español

#### 6. `src/pages/ConfiguracionMedico.tsx` - Agregar enlace

Agregar nueva fila en la Card después de "Uso y Notificaciones":
- Icono: `MessageCircle` o similar de lucide
- Título: "WhatsApp Business"
- Subtítulo: "Conexión y plantillas de mensajes"
- Navega a `/configuracion/whatsapp`

#### 7. `src/App.tsx` - Registrar rutas

Cambios:
- Importar `WhatsAppPlantillaNueva` y `WhatsAppPlantillaDetalle`
- Cambiar ruta de `/settings/whatsapp` a `/configuracion/whatsapp`
- Agregar rutas:
  - `/configuracion/whatsapp` -> WhatsAppSettings (doctor)
  - `/configuracion/whatsapp/plantillas/nueva` -> WhatsAppPlantillaNueva (doctor)
  - `/configuracion/whatsapp/plantillas/:id` -> WhatsAppPlantillaDetalle (doctor)
  - `/auth/meta/callback` -> MetaOAuthCallback (sin protección, ya existe)
- Eliminar la ruta vieja `/settings/whatsapp`

#### 8. `src/components/MainLayout.tsx` - Actualizar routeTitles

- Eliminar entrada `/settings/whatsapp`
- Agregar `/configuracion/whatsapp`: "WhatsApp Business"

---

### Detalles tecnicos

**Modo mock para plantillas:**
- `localStorage` key: `whatsapp_templates_mock`
- Formato: array de objetos `{ id, name, category, language, body, status, updated_at }`
- Se usa cuando `templates-list` falla con error de red o 404

**Estructura de archivos resultante:**
```
src/
  lib/whatsappApi.ts          (nuevo)
  pages/
    WhatsAppSettings.tsx       (reescrito)
    MetaOAuthCallback.tsx      (actualizado)
    WhatsAppPlantillaNueva.tsx (nuevo)
    WhatsAppPlantillaDetalle.tsx (nuevo)
    ConfiguracionMedico.tsx    (modificado)
  App.tsx                      (modificado)
  components/MainLayout.tsx    (modificado)
```

**Rutas finales:**
| Ruta | Componente | Roles |
|------|-----------|-------|
| `/configuracion/whatsapp` | WhatsAppSettings | doctor |
| `/configuracion/whatsapp/plantillas/nueva` | WhatsAppPlantillaNueva | doctor |
| `/configuracion/whatsapp/plantillas/:id` | WhatsAppPlantillaDetalle | doctor |
| `/auth/meta/callback` | MetaOAuthCallback | sin protección |

