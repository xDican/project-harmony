export type Lang = 'es' | 'en';

const translations: Record<string, Record<Lang, string>> = {
  // WhatsAppSettings
  'ws.title': { es: 'Configuración de WhatsApp', en: 'WhatsApp Settings' },
  'ws.meta_title': { es: 'Conexión con Meta', en: 'Meta Connection' },
  'ws.connected': { es: 'Conectado', en: 'Connected' },
  'ws.not_connected': { es: 'No conectado', en: 'Not connected' },
  'ws.meta_desc': { es: 'Esta conexión es obligatoria para la revisión de Meta.', en: 'This connection is required for Meta App Review.' },
  'ws.connect_btn': { es: 'Conectar WhatsApp Business', en: 'Connect WhatsApp Business' },
  'ws.no_auth_url': { es: 'No se recibió la URL de autorización.', en: 'Authorization URL not received.' },
  'ws.templates_title': { es: 'Plantillas de Mensajes', en: 'Message Templates' },
  'ws.templates_desc': { es: 'Requerido para la revisión de Meta', en: 'Required for Meta App Review' },
  'ws.create_template': { es: 'Crear plantilla', en: 'Create template' },
  'ws.mock_banner': { es: 'Backend no conectado aún. Ejecutando en modo demostración.', en: 'Backend not connected yet. Running in demo mode.' },
  'ws.no_templates': { es: 'Aún no hay plantillas creadas.', en: 'No templates created yet.' },
  'ws.col_name': { es: 'Nombre', en: 'Name' },
  'ws.col_category': { es: 'Categoría', en: 'Category' },
  'ws.col_language': { es: 'Idioma', en: 'Language' },
  'ws.col_status': { es: 'Estado', en: 'Status' },
  'ws.col_updated': { es: 'Actualización', en: 'Updated' },
  // Status labels
  'status.approved': { es: 'Aprobada', en: 'Approved' },
  'status.pending': { es: 'Pendiente', en: 'Pending' },
  'status.rejected': { es: 'Rechazada', en: 'Rejected' },
  'status.draft': { es: 'Borrador', en: 'Draft' },
  // Callback page
  'cb.connecting': { es: 'Conectando WhatsApp...', en: 'Connecting WhatsApp...' },
  'cb.do_not_close': { es: 'No cierre esta ventana.', en: 'Do not close this window.' },
  'cb.success': { es: 'Conectado correctamente', en: 'Connected successfully' },
  'cb.redirecting': { es: 'Redirigiendo a configuración…', en: 'Redirecting to settings…' },
  'cb.error': { es: 'Error de conexión', en: 'Connection error' },
  'cb.back': { es: 'Volver a configuración', en: 'Back to settings' },
  'cb.missing_params': { es: 'Faltan parámetros de autorización (code o state).', en: 'Missing authorization parameters (code or state).' },
  'cb.not_completed': { es: 'La conexión no se completó correctamente.', en: 'The connection was not completed successfully.' },
  // Create template page
  'ct.title': { es: 'Crear plantilla', en: 'Create template' },
  'ct.name_label': { es: 'Nombre de la plantilla *', en: 'Template name *' },
  'ct.name_placeholder': { es: 'confirmacion_cita', en: 'appointment_confirmation' },
  'ct.category_label': { es: 'Categoría', en: 'Category' },
  'ct.language_label': { es: 'Idioma', en: 'Language' },
  'ct.lang_es': { es: 'Español (es_ES)', en: 'Spanish (es_ES)' },
  'ct.lang_en': { es: 'Inglés (en_US)', en: 'English (en_US)' },
  'ct.body_label': { es: 'Cuerpo del mensaje *', en: 'Message body *' },
  'ct.body_placeholder': { es: 'Hola {{1}}, tu cita con {{2}} es el {{3}} a las {{4}}.', en: 'Hello {{1}}, your appointment with {{2}} is on {{3}} at {{4}}.' },
  'ct.body_hint': { es: 'Use {{1}}, {{2}} para variables dinámicas.', en: 'Use {{1}}, {{2}} for dynamic variables.' },
  'ct.cancel': { es: 'Cancelar', en: 'Cancel' },
  'ct.submit': { es: 'Crear plantilla', en: 'Create template' },
  'ct.success': { es: 'Plantilla creada correctamente', en: 'Template created successfully' },
  'ct.error': { es: 'Error', en: 'Error' },
  // Template detail page
  'td.not_found': { es: 'Plantilla no encontrada.', en: 'Template not found.' },
  'td.back': { es: 'Volver', en: 'Back' },
  'td.category': { es: 'Categoría', en: 'Category' },
  'td.language': { es: 'Idioma', en: 'Language' },
  'td.status': { es: 'Estado', en: 'Status' },
  'td.updated': { es: 'Última actualización', en: 'Last updated' },
  'td.body': { es: 'Cuerpo del mensaje', en: 'Message body' },
  'td.use_btn': { es: 'Usar en confirmación de cita', en: 'Use for appointment confirmation' },
};

export function getLang(): Lang {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('lang');
  if (fromUrl === 'en' || fromUrl === 'es') return fromUrl;

  const stored = localStorage.getItem('app_lang');
  if (stored === 'en' || stored === 'es') return stored;

  return 'es';
}

export function setLang(lang: Lang): void {
  localStorage.setItem('app_lang', lang);
}

export function t(key: string): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[getLang()] ?? entry.es ?? key;
}

export function getDateLocale(): string {
  return getLang() === 'en' ? 'en-US' : 'es-MX';
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    APPROVED: t('status.approved'),
    PENDING: t('status.pending'),
    REJECTED: t('status.rejected'),
    borrador: t('status.draft'),
  };
  return map[status] ?? status;
}
