# Plan de QA Manual — OrionCare / Agenda Médica

**Fecha:** 2026-02-23
**Proyecto:** project-harmony (dazzling-cannon branch)
**Entorno de prueba:** Supabase proyecto `soxrlxvivuplezssgssq`

---

## Convenciones

| Prioridad | Descripción |
|-----------|-------------|
| P1 | Bloqueante — debe funcionar antes de producción |
| P2 | Importante — afecta flujos principales |
| P3 | Deseable — calidad / UX |

| Estado | Símbolo |
|--------|---------|
| Pendiente | `[ ]` |
| Pasó | `[x]` |
| Falló | `[F]` |
| Omitido | `[-]` |

---

## Módulo 1: Autenticación y Registro

### 1.1 Registro de nuevo usuario

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 1.1.1 | Registro exitoso | 1. Ir a /register. 2. Ingresar email válido y contraseña. 3. Submit. | Muestra mensaje de confirmación de email, redirige o espera. | P1 |
| 1.1.2 | Email ya registrado | Repetir registro con mismo email. | Muestra error claro de email duplicado. | P1 |
| 1.1.3 | Validación de campos | Enviar formulario vacío / password débil. | Errores de validación en campo correspondiente. | P2 |
| 1.1.4 | Confirmación de email | Abrir enlace de confirmación del email. | Usuario confirmado, redirige a /onboarding/clinic. | P1 |

### 1.2 Login

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 1.2.1 | Login con credenciales válidas | Ingresar email + password correctos en /login. | Redirige según rol: admin→/admin, secretaria→/agenda-secretaria, médico→/agenda-medico. | P1 |
| 1.2.2 | Credenciales incorrectas | Password erróneo. | Mensaje de error sin revelar qué campo es incorrecto. | P1 |
| 1.2.3 | Usuario inactivo / sin org | Login con usuario recién registrado sin completar onboarding. | Redirige a /onboarding/clinic. | P1 |
| 1.2.4 | Logout | Click en logout desde cualquier página. | Sesión cerrada, redirige a /login. | P1 |

---

## Módulo 2: Onboarding

> Pre-condición: usuario autenticado sin organización (isNewUser = true).

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 2.1 | Flujo completo | Completar StepClinic → StepDoctor → StepSchedule → StepSummary. | Al finalizar, onboarding_status = setup_in_progress, redirige fuera del onboarding. | P1 |
| 2.2 | Reanudación de paso | Interrumpir onboarding en StepDoctor, volver a iniciar sesión. | Redirige automáticamente al paso correcto (StepDoctor). | P1 |
| 2.3 | Validación StepClinic | Enviar sin nombre de clínica. | Error de validación en campo. | P2 |
| 2.4 | Validación StepDoctor | Enviar sin nombre del médico. | Error de validación en campo. | P2 |
| 2.5 | StepSchedule sin horario | Guardar sin seleccionar ningún día. | Error o advertencia visible. | P2 |
| 2.6 | Bloqueo post-onboarding | Usuario activo intenta navegar a /onboarding/*. | OnboardingRoute redirige fuera (a su home según rol). | P1 |

---

## Módulo 3: Citas — Ciclo de vida completo

### 3.1 Crear cita

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 3.1.1 | Flujo completo de nueva cita | Ir a /citas/nueva → buscar/crear paciente → seleccionar médico → seleccionar duración → seleccionar fecha (días disponibles) → seleccionar horario → confirmar. | Cita creada, aparece en agenda del día. | P1 |
| 3.1.2 | Crear paciente nuevo en el flujo | Click en "Nuevo paciente" dentro de PatientSearch. | Formulario de creación, al guardar vuelve al flujo de cita con el nuevo paciente seleccionado. | P1 |
| 3.1.3 | Sin slots disponibles | Seleccionar fecha sin disponibilidad. | Mensaje de "sin horarios disponibles", no permite continuar. | P2 |
| 3.1.4 | Doble reserva | Intentar agendar en un slot ya ocupado. | Error claro, no se crea la cita. | P1 |

### 3.2 Visualización de agenda

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 3.2.1 | Agenda secretaria — hoy | Navegar a /agenda-secretaria. | Lista de citas de hoy con nombre paciente, médico, hora, estado. | P1 |
| 3.2.2 | Agenda médico — hoy/mañana | Navegar a /agenda-medico y alternar toggle. | Muestra citas del día seleccionado. | P1 |
| 3.2.3 | Agenda semanal | Navegar a /agenda-semanal. | Vista por días con citas correctamente posicionadas, navegación de semana. | P1 |
| 3.2.4 | Selector de médico (admin) | En /agenda-medico como admin, cambiar médico desde selector. | Recarga agenda con citas del médico seleccionado. | P2 |

### 3.3 Cambiar estado de cita

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 3.3.1 | Confirmar cita | En AppointmentRow, cambiar estado a "confirmada". | Badge actualiza, cambio persiste al recargar. | P1 |
| 3.3.2 | Completar cita | Cambiar estado a "completada". | Badge actualiza. | P1 |
| 3.3.3 | Cancelar cita | Cambiar estado a "cancelada". | Badge actualiza, slot vuelve a estar disponible. | P1 |

### 3.4 Reagendar cita

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 3.4.1 | Reagendar desde agenda semanal | Abrir RescheduleModal, seleccionar nueva fecha y hora, guardar. | Cita movida a nuevo slot, slot anterior liberado. | P1 |
| 3.4.2 | Reagendar a slot ocupado | Intentar mover a slot ya reservado. | Error, cita original sin cambios. | P1 |

---

## Módulo 4: Pacientes

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 4.1 | Listar pacientes | Navegar a /pacientes. | Lista paginada o completa con búsqueda funcional. | P1 |
| 4.2 | Buscar paciente | Tipear nombre o teléfono en buscador. | Lista filtra en tiempo real. | P1 |
| 4.3 | Crear paciente | Click "Nuevo paciente" → llenar formulario → guardar. | Paciente creado, aparece en lista. | P1 |
| 4.4 | Detalle de paciente | Click en paciente → /pacientes/:id. | Muestra info + pestañas de citas próximas e historial. | P2 |
| 4.5 | Historial de citas | En PatientDetail, pestaña historial. | Lista de citas pasadas con fecha, médico, estado. | P2 |

---

## Módulo 5: Administración

### 5.1 Dashboard admin

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 5.1.1 | Métricas | Navegar a /admin. | Se muestran conteos de pacientes, médicos, citas (hoy/mes). | P2 |

### 5.2 Gestión de usuarios

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 5.2.1 | Listar usuarios | /admin/users. | Lista con nombre, email, rol, estado. | P1 |
| 5.2.2 | Crear usuario admin | /admin/users/create → rol admin → guardar. | Usuario creado, recibe email de bienvenida. | P1 |
| 5.2.3 | Crear usuario secretaria | Idem, rol secretaria. | Mismos. | P1 |
| 5.2.4 | Crear usuario médico | Idem, rol doctor. | Mismos, se asocia a doctor si corresponde. | P1 |
| 5.2.5 | Editar usuario | /admin/users/:id/edit → cambiar rol → guardar. | Cambio persistido, permisos actualizados al próximo login. | P1 |
| 5.2.6 | Búsqueda / filtro | Filtrar por rol en lista de usuarios. | Lista filtra correctamente. | P2 |

### 5.3 Clínicas

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 5.3.1 | Listar clínicas | /admin/clinics. | Lista de clínicas activas. | P1 |
| 5.3.2 | Crear clínica | Botón nuevo → formulario → guardar. | Aparece en lista. | P1 |
| 5.3.3 | Editar / desactivar | Editar nombre o marcar inactiva. | Cambio persistido. | P2 |

### 5.4 Calendarios

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 5.4.1 | Listar calendarios | /admin/calendars. | Lista de calendarios con clínica y médicos asignados. | P1 |
| 5.4.2 | Crear calendario | Asignar médico + clínica + horarios. | Calendario disponible para agendar citas. | P1 |
| 5.4.3 | Editar horarios | Modificar start_time/end_time de un calendar_schedule. | Slots afectados se actualizan en nueva cita. | P1 |

### 5.5 Configuración de horario por médico

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 5.5.1 | Ver horario | /admin/doctors/:id/schedule. | Muestra días y horas configuradas. | P1 |
| 5.5.2 | Actualizar horario | Cambiar horas o días activos → guardar. | Cambios en doctor_schedules, slots ajustados. | P1 |

### 5.6 Configuración de organización

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 5.6.1 | Actualizar nombre | /admin/organization → cambiar nombre → guardar. | Nombre actualizado en DB y UI. | P2 |
| 5.6.2 | Cambiar timezone | Seleccionar timezone de Americas → guardar. | Persiste correctamente. | P2 |

### 5.7 Reporte de citas

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 5.7.1 | Filtrar por fecha | /admin/reports/appointments → seleccionar rango → aplicar. | Tabla muestra solo citas del período. | P2 |
| 5.7.2 | Filtrar por médico | Seleccionar médico en filtro. | Tabla filtra correctamente. | P2 |
| 5.7.3 | Filtrar por estado | Seleccionar estado (confirmada, cancelada, etc.). | Tabla filtra correctamente. | P2 |

---

## Módulo 6: WhatsApp / Mensajería

### 6.1 Conexión de línea WhatsApp

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 6.1.1 | Embedded signup | /configuracion/whatsapp → click "Conectar con Meta" → completar flujo Facebook SDK. | Línea conectada, aparece en lista con número de teléfono. | P1 |
| 6.1.2 | OAuth clásico | Usar flujo OAuth alternativo si está disponible. | Mismos. | P2 |
| 6.1.3 | Activar línea | En WhatsAppSettings, click "Activar línea". | Estado cambia a activo, mensajería habilitada. | P1 |
| 6.1.4 | Callback con error | Simular /auth/meta/callback?error=access_denied. | Página muestra error descriptivo, no rompe la app. | P2 |

### 6.2 Gestión de líneas (admin)

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 6.2.1 | Listar líneas | /admin/whatsapp-lines. | Lista con número, etiqueta, estado bot, estado activo. | P1 |
| 6.2.2 | Editar etiqueta | Cambiar label de una línea → guardar. | Persiste. | P2 |
| 6.2.3 | Habilitar/deshabilitar bot | Toggle bot_enabled. | Estado persiste en DB. | P2 |
| 6.2.4 | Configurar mensaje de bienvenida | Editar greeting text → guardar. | Texto guardado. | P3 |

### 6.3 Plantillas de mensajes

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 6.3.1 | Listar plantillas | /configuracion/whatsapp → sección plantillas. | Lista de plantillas con nombre y estado de aprobación. | P1 |
| 6.3.2 | Crear plantilla UTILITY | /configuracion/whatsapp/plantillas/nueva → categoría UTILITY → completar body → guardar. | Plantilla creada, aparece en lista con status PENDING. | P1 |
| 6.3.3 | Editar plantilla | /configuracion/whatsapp/plantillas/:id → modificar body → guardar. | Cambios persisten. | P2 |
| 6.3.4 | Parámetros en plantilla | Usar variables {{1}} en body. | Se guarda correctamente, preview muestra variable. | P2 |

### 6.4 Bot de FAQs

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 6.4.1 | Listar FAQs | /admin/bot-faqs. | Lista de preguntas con respuesta y scope. | P1 |
| 6.4.2 | Crear FAQ org | Nueva FAQ con scope=org → guardar. | Aparece en lista. | P1 |
| 6.4.3 | Crear FAQ por clínica | Scope=clinic → seleccionar clínica → guardar. | FAQ con scope correcto. | P2 |
| 6.4.4 | Editar / eliminar FAQ | Modificar respuesta, luego eliminar. | Cambios y eliminación persisten. | P2 |

### 6.5 Uso y facturación de mensajes

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 6.5.1 | Ver resumen mensual | /configuracion/uso-mensajes. | Muestra costo base, conteo de mensajes, costo total del mes. | P1 |
| 6.5.2 | Desglose diario | Ver tabla de uso diario. | Columnas: fecha, mensajes entrantes, salientes en ventana, fuera de ventana, costo. | P2 |
| 6.5.3 | Cambio de mes | Navegar a mes anterior (si aplica). | Datos cambian correctamente. | P3 |

---

## Módulo 7: Control de acceso por rol (RBAC)

> Para cada prueba, autenticarse con un usuario del rol indicado.

| # | Rol | Caso | Resultado esperado | P |
|---|-----|------|--------------------|---|
| 7.1 | Secretaria | Acceder a /admin. | Redirige o muestra 403/Not Found. | P1 |
| 7.2 | Secretaria | Acceder a /configuracion/whatsapp. | Redirige o muestra 403. | P1 |
| 7.3 | Médico | Acceder a /admin/users. | Redirige o muestra 403. | P1 |
| 7.4 | Médico | Acceder a /agenda-secretaria. | Redirige o muestra 403. | P1 |
| 7.5 | Admin | Acceder a /internal/activations. | Redirige o muestra 403 (solo superadmin). | P1 |
| 7.6 | Admin | Acceder a /admin/users, /admin/clinics, /admin/calendars. | Acceso permitido. | P1 |
| 7.7 | Secretaria | Crear cita desde /citas/nueva. | Acceso permitido, puede crear para cualquier médico. | P1 |
| 7.8 | Médico | Ver solo su propia agenda. | En /agenda-medico no puede cambiar a otro médico. | P2 |

---

## Módulo 8: Perfil de médico (configuración personal)

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 8.1 | Ver perfil | /configuracion/perfil. | Muestra nombre, prefijo, email, teléfono, especialidad. | P1 |
| 8.2 | Editar perfil | Cambiar prefijo o especialidad → guardar. | Cambio persiste, se refleja en UI (agenda, etc.). | P1 |
| 8.3 | Ver menú configuración | /configuracion. | Muestra ítems: Perfil, Horario, Mensajes, WhatsApp. | P2 |

---

## Módulo 9: SuperAdmin — Panel de activación

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 9.1 | Listar organizaciones | /internal/activations. | Lista de orgs con estado de onboarding y billing. | P1 |
| 9.2 | Filtrar por estado | Filtro por onboarding_status o messaging_enabled. | Lista filtra correctamente. | P2 |
| 9.3 | Activar organización | Click "Activar" en una org con status setup_in_progress. | onboarding_status → active, usuario puede usar plataforma. | P1 |
| 9.4 | Suspender organización | Click "Suspender". | Org suspendida, usuarios no pueden acceder. | P1 |
| 9.5 | Bloqueo a no-superadmin | Autenticarse con admin normal, intentar /internal/activations. | SuperAdminRoute bloquea acceso. | P1 |

---

## Módulo 10: Multi-tenant / Aislamiento de datos

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 10.1 | Pacientes aislados | Usuario de Org A no ve pacientes de Org B. | Consultas retornan solo datos de la org del usuario. | P1 |
| 10.2 | Médicos aislados | Mismo para lista de médicos. | Idem. | P1 |
| 10.3 | OrgSwitcher | Si el usuario tiene múltiples orgs, cambiar en OrgSwitcher. | Datos recargan para la nueva org seleccionada. | P2 |

---

## Módulo 11: Mensajería automática (WhatsApp outbound)

> Requiere línea WhatsApp activa y messaging_enabled = true.

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 11.1 | Mensaje de confirmación al crear cita | Crear cita con paciente que tiene teléfono. | Se envía WhatsApp de confirmación (verificar en message_logs). | P1 |
| 11.2 | Recordatorio 24h | Esperar cron o disparar manualmente send-reminders. | Mensaje enviado 24h antes, registrado en message_logs. | P2 |
| 11.3 | Mensaje entrante — confirmar | Enviar "confirmar" al número WhatsApp. | Bot procesa intento confirm, cita cambia a "confirmada". | P2 |
| 11.4 | Mensaje entrante — cancelar | Enviar "cancelar" al número WhatsApp. | Bot procesa intento cancel, cita cambia a "cancelada". | P2 |
| 11.5 | Inbound fuera de contexto | Enviar mensaje arbitrario al bot. | Bot responde con menú principal o mensaje de fallback. | P3 |

---

## Módulo 12: UX / Interfaz general

| # | Caso | Pasos | Resultado esperado | P |
|---|------|-------|--------------------|---|
| 12.1 | Responsive mobile | Abrir plataforma en 375px de ancho. | Sidebar se oculta, hamburger menu funciona. | P2 |
| 12.2 | Navegación por rol | Login con secretaria, verificar ítems de nav. | Solo aparecen: Agenda, Nueva cita, Pacientes. | P2 |
| 12.3 | Navegación admin | Login con admin, verificar ítems de nav. | Aparecen secciones admin + agenda + citas. | P2 |
| 12.4 | Toast de errores | Provocar error de API (campo inválido). | Toast o mensaje de error visible y descriptivo. | P2 |
| 12.5 | Toast de éxito | Guardar cualquier formulario exitosamente. | Toast de confirmación visible. | P3 |
| 12.6 | 404 | Navegar a ruta inexistente /foo. | Página 404 visible, enlace para volver. | P3 |

---

## Checklist pre-producción (resumen de P1)

```
[ ] Auth: registro → confirmación email → login funciona end-to-end
[ ] Auth: logout cierra sesión correctamente
[ ] Onboarding: flujo completo para usuario nuevo
[ ] Onboarding: reanudación en paso correcto
[ ] Citas: crear cita completa (paciente + médico + slot)
[ ] Citas: confirmar / cancelar / completar estado
[ ] Citas: reagendar sin conflicto
[ ] Agenda: vistas secretaria, médico y semanal muestran datos correctos
[ ] RBAC: secretaria no accede a admin
[ ] RBAC: médico no accede a admin
[ ] RBAC: admin no accede a /internal/activations
[ ] Admin: crear usuario de cada rol
[ ] Admin: gestionar clínicas y calendarios
[ ] WhatsApp: conectar línea via embedded signup
[ ] WhatsApp: activar línea correctamente
[ ] WhatsApp: crear plantilla UTILITY
[ ] WhatsApp: cita creada dispara mensaje de confirmación
[ ] Multi-tenant: datos de org A no visibles para org B
[ ] SuperAdmin: activar organización cambia estado correctamente
[ ] SuperAdmin: panel bloqueado para admin normal
```

---

## Notas de entorno

- URL de producción: obtener de Supabase project `soxrlxvivuplezssgssq` (ver `get_project_url`).
- Para probar cron de recordatorios, invocar `send-reminders` manualmente desde Supabase Dashboard → Edge Functions → Invoke.
- Para verificar mensajes enviados: `select * from message_logs order by created_at desc limit 20;` en Supabase SQL Editor.
- Variables de entorno críticas a verificar antes de producción: `META_APP_ID`, `META_APP_SECRET`, `WHATSAPP_PHONE_NUMBER_ID`, `SUPABASE_SERVICE_ROLE_KEY`.
