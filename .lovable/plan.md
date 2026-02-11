

## Plan: i18n minimal para flujo WhatsApp (ES + EN)

### Resumen
Crear un sistema de internacionalizacion ligero con un diccionario ES/EN y una funcion `t(key)`, luego reemplazar todos los strings hardcodeados en las 4 paginas de WhatsApp.

---

### Archivos a crear

#### 1. `src/lib/i18n.ts` - Utilidad de internacionalizacion

Contenido:
- Tipo `Lang = 'es' | 'en'`
- Diccionario `translations` con claves para todos los textos visibles (~50 keys)
- Funcion `getLang()`: lee `?lang=` del URL > `localStorage.app_lang` > default `'es'`
- Funcion `setLang(lang)`: guarda en `localStorage.app_lang`
- Funcion `t(key)`: devuelve `translations[key][getLang()]`

Ejemplo de estructura del diccionario:

```typescript
const translations: Record<string, Record<Lang, string>> = {
  // WhatsAppSettings
  'ws.title': { es: 'Configuracion de WhatsApp', en: 'WhatsApp Settings' },
  'ws.meta_title': { es: 'Conexion con Meta', en: 'Meta Connection' },
  'ws.connected': { es: 'Conectado', en: 'Connected' },
  'ws.not_connected': { es: 'No conectado', en: 'Not connected' },
  'ws.meta_desc': { es: 'Esta conexion es obligatoria para la revision de Meta.', en: 'This connection is required for Meta App Review.' },
  'ws.connect_btn': { es: 'Conectar WhatsApp Business', en: 'Connect WhatsApp Business' },
  'ws.no_auth_url': { es: 'No se recibio la URL de autorizacion.', en: 'Authorization URL not received.' },
  'ws.templates_title': { es: 'Plantillas de Mensajes', en: 'Message Templates' },
  'ws.templates_desc': { es: 'Requerido para la revision de Meta', en: 'Required for Meta App Review' },
  'ws.create_template': { es: 'Crear plantilla', en: 'Create template' },
  'ws.mock_banner': { es: 'Backend no conectado aun. Ejecutando en modo demostracion.', en: 'Backend not connected yet. Running in demo mode.' },
  'ws.no_templates': { es: 'Aun no hay plantillas creadas.', en: 'No templates created yet.' },
  'ws.col_name': { es: 'Nombre', en: 'Name' },
  'ws.col_category': { es: 'Categoria', en: 'Category' },
  'ws.col_language': { es: 'Idioma', en: 'Language' },
  'ws.col_status': { es: 'Estado', en: 'Status' },
  'ws.col_updated': { es: 'Actualizacion', en: 'Updated' },
  // Status labels
  'status.approved': { es: 'Aprobada', en: 'Approved' },
  'status.pending': { es: 'Pendiente', en: 'Pending' },
  'status.rejected': { es: 'Rechazada', en: 'Rejected' },
  'status.draft': { es: 'Borrador', en: 'Draft' },
  // Callback page
  'cb.connecting': { es: 'Conectando WhatsApp...', en: 'Connecting WhatsApp...' },
  'cb.do_not_close': { es: 'No cierre esta ventana.', en: 'Do not close this window.' },
  'cb.success': { es: 'Conectado correctamente', en: 'Connected successfully' },
  'cb.redirecting': { es: 'Redirigiendo a configuracion...', en: 'Redirecting to settings...' },
  'cb.error': { es: 'Error de conexion', en: 'Connection error' },
  'cb.back': { es: 'Volver a configuracion', en: 'Back to settings' },
  'cb.missing_params': { es: 'Faltan parametros de autorizacion (code o state).', en: 'Missing authorization parameters (code or state).' },
  'cb.not_completed': { es: 'La conexion no se completo correctamente.', en: 'The connection was not completed successfully.' },
  // Create template page
  'ct.title': { es: 'Crear plantilla', en: 'Create template' },
  'ct.name_label': { es: 'Nombre de la plantilla *', en: 'Template name *' },
  'ct.category_label': { es: 'Categoria', en: 'Category' },
  'ct.language_label': { es: 'Idioma', en: 'Language' },
  'ct.body_label': { es: 'Cuerpo del mensaje *', en: 'Message body *' },
  'ct.body_hint': { es: 'Use {{1}}, {{2}} para variables dinamicas.', en: 'Use {{1}}, {{2}} for dynamic variables.' },
  'ct.cancel': { es: 'Cancelar', en: 'Cancel' },
  'ct.submit': { es: 'Crear plantilla', en: 'Create template' },
  'ct.success': { es: 'Plantilla creada correctamente', en: 'Template created successfully' },
  // Template detail page
  'td.not_found': { es: 'Plantilla no encontrada.', en: 'Template not found.' },
  'td.back': { es: 'Volver', en: 'Back' },
  'td.category': { es: 'Categoria', en: 'Category' },
  'td.language': { es: 'Idioma', en: 'Language' },
  'td.status': { es: 'Estado', en: 'Status' },
  'td.updated': { es: 'Ultima actualizacion', en: 'Last updated' },
  'td.body': { es: 'Cuerpo del mensaje', en: 'Message body' },
  'td.use_btn': { es: 'Usar en confirmacion de cita', en: 'Use for appointment confirmation' },
};
```

---

### Archivos a modificar

#### 2. `src/pages/WhatsAppSettings.tsx`

- Import `t`, `getLang`, `setLang` from `@/lib/i18n`
- Add `lang` state initialized with `getLang()`
- Add language toggle `ES | EN` in the page header (using `ToggleGroup` from existing UI components)
- Replace all hardcoded strings with `t('key')` calls
- Replace `statusLabel` object with `t('status.approved')`, etc.
- Change date locale based on lang (`'es-MX'` vs `'en-US'`)

#### 3. `src/pages/MetaOAuthCallback.tsx`

- Import `t` from `@/lib/i18n`
- Replace all hardcoded strings with `t('key')` calls

#### 4. `src/pages/WhatsAppPlantillaNueva.tsx`

- Import `t` from `@/lib/i18n`
- Replace all hardcoded strings with `t('key')` calls
- Toast messages use `t()` as well

#### 5. `src/pages/WhatsAppPlantillaDetalle.tsx`

- Import `t` from `@/lib/i18n`
- Replace all hardcoded strings with `t('key')` calls
- Status labels use `t('status.*')`
- Date locale based on `getLang()`

---

### Componente de cambio de idioma (dentro de WhatsAppSettings)

Ubicacion: junto al titulo `h1` en la cabecera de la pagina.

```
[Configuracion de WhatsApp]          [ES | EN]
```

Usando `ToggleGroup` de Radix (ya disponible en el proyecto) con `type="single"`:
- Al cambiar: llama `setLang(value)`, actualiza estado local para re-render inmediato
- Pequeno y discreto, no modifica el layout

---

### Lo que NO cambia
- Rutas (siguen siendo `/configuracion/whatsapp`, etc.)
- Estructura visual / UX
- Logica de negocio
- whatsappApi.ts (los mensajes de error de API se mantienen tecnicos)
