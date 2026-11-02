# Reporte de navegación y páginas — OrionCare

> Inventario completo de la plataforma para alimentar el rediseño de navegación con Stitch.
> Generado 5 Jun 2026 desde `MainLayout.tsx` (navegación) + `App.tsx` (rutas).

---

## 1. Resumen ejecutivo — por qué se siente descontrolado

La navegación creció por capas, no por diseño. Hoy hay **cuatro sistemas de navegación distintos**
operando a la vez:

1. **Menú principal** (top-level), que cambia según el rol.
2. **Submenú "Administrador"** colapsable (8 items).
3. **Toggle "Vista Médico / Administrador"** (para admin-doctores).
4. **"Configuración"** como hub-cajón-de-sastre con sub-páginas que no se ven en el menú.

El resultado: **funciones duplicadas en dos lugares**, **tres vistas de agenda**, y **7+ rutas que
existen pero no tienen entrada en ningún menú**. Un usuario nuevo no sabe dónde está cada cosa.

---

## 2. Navegación actual (cómo está hoy)

### 2.1 Menú principal (top-level) — depende del rol

| Item | Ruta | Secretaria | Admin | Doctor | Admin-Doctor (Vista Médico) |
|---|---|:--:|:--:|:--:|:--:|
| Bandeja | `/inbox` | ✓ | ✓ | — | — |
| Agenda Semanal | `/agenda-semanal` | ✓ | ✓ | ✓ | ✓ |
| Agenda de Hoy | `/agenda-secretaria` | ✓ | ✓ | — | — |
| Nueva Cita | `/citas/nueva` | ✓ | ✓ | ✓ | ✓ |
| Pacientes | `/pacientes` | ✓ | ✓ | ✓ | ✓ |
| Promociones | `/configuracion/promociones` | ✓ | ✓ | — | — |
| Configuración / Mi Configuración | `/configuracion` | — | — | ✓ | ✓ |

### 2.2 Submenú "Administrador" (colapsable, solo Admin)

| Item | Ruta |
|---|---|
| Usuarios | `/admin/users` |
| Organización | `/admin/organization` |
| Clínicas | `/admin/clinics` |
| Calendarios | `/admin/calendars` |
| WhatsApp | `/admin/whatsapp-lines` |
| Motor | `/admin/motor` |
| Bot FAQs | `/admin/bot-faqs` |
| Reporte de Citas | `/admin/reports/appointments` |

### 2.3 Toggle de Vista (solo admin-doctores)
Botonera Médico / Administrador que **reemplaza todo el menú** por la vista del rol elegido.

---

## 3. Inventario completo de páginas

### A. Operación diaria
| Página | Ruta | Qué hace | Rol |
|---|---|---|---|
| Bandeja | `/inbox` | Inbox de conversaciones WhatsApp (chat) | Admin, Secretaria |
| Agenda Semanal | `/agenda-semanal` | Vista semanal de citas | Todos |
| Agenda de Hoy | `/agenda-secretaria` | Citas del día, vista operativa | Admin, Secretaria |
| Agenda Médica | `/agenda-medico` | Agenda del doctor logueado | Doctor / Vista Médico |
| Nueva Cita | `/citas/nueva` | Agendar cita/visita (rediseño reciente) | Todos |
| Pacientes | `/pacientes` | Listado de pacientes | Todos |
| Detalle Paciente | `/pacientes/:id` | Ficha + historial de citas del paciente | Todos |

### B. Mensajería y marketing
| Página | Ruta | Qué hace | Rol |
|---|---|---|---|
| Promociones | `/configuracion/promociones` (+ `/nueva`, `/:id/editar`) | Campañas/promos por WhatsApp | Admin, Secretaria |
| Respuestas rápidas | `/configuracion/quick-replies` | Plantillas de respuesta del inbox | Admin, Secretaria |

### C. Configuración (cuenta / mensajería)
| Página | Ruta | Qué hace | Rol |
|---|---|---|---|
| Configuración (hub) | `/configuracion` | Punto de entrada a ajustes | Todos |
| Perfil | `/configuracion/perfil` (+ `/editar`) | Datos del usuario | Todos |
| Uso de mensajes | `/configuracion/uso-mensajes` | Consumo/costos de mensajes Meta | Admin |
| WhatsApp Business | `/configuracion/whatsapp` (+ `plantillas/nueva`, `plantillas/:id`) | Conexión + plantillas WhatsApp | Admin |

### D. Administrador (setup de la organización)
| Página | Ruta | Qué hace | Rol |
|---|---|---|---|
| Usuarios | `/admin/users` (+ `/create`, `/:userId/edit`) | Gestión de usuarios y roles | Admin |
| Organización | `/admin/organization` | Datos de la organización | Admin |
| Clínicas | `/admin/clinics` | Sedes/clínicas | Admin |
| Calendarios | `/admin/calendars` (+ `/:id/schedule`) | Calendarios y sus horarios | Admin |
| Horarios de doctor | `/admin/doctors/:doctorId/schedule` | Horario de un profesional | Admin |
| WhatsApp (líneas) | `/admin/whatsapp-lines` | Conexión/onboarding de números | Admin |
| Motor | `/admin/motor` | Recursos, recetas y skills (multi-recurso) | Admin |
| Bot FAQs | `/admin/bot-faqs` | Preguntas frecuentes del bot | Admin |
| Reporte de Citas | `/admin/reports/appointments` | Reporte de citas | Admin |

### E. ⚠️ Rutas SIN entrada en ningún menú (revisar — posible código muerto)
Existen en `App.tsx` pero **ningún menú las enlaza**. Hay que decidir: re-incorporar, consolidar o eliminar.
| Ruta | Título probable |
|---|---|
| `/admin` | Índice admin |
| `/admin/specialties` | Especialidades |
| `/admin/reports` | Reportes (hub) — además de `/admin/reports/appointments` |
| `/admin/files` | Archivos |
| `/admin/settings` | Ajustes admin |
| `/internal/activations` | Activaciones (SuperAdmin interno) |
| `/debug-whatsapp` | Debug WhatsApp |
| `/agenda-medico` | Agenda Médica (no aparece en `getNavigationItems`) |

### F. Fuera del shell (auth / onboarding)
`/login` · `/register` · `/onboarding/{clinic,doctor,schedule,summary}` · `/auth/meta/callback`

---

## 4. Problemas detectados (foco del rediseño)

1. **Tres vistas de agenda** — "Agenda Semanal", "Agenda de Hoy" y "Agenda Médica". No es obvio
   cuál usar; dos están linkeadas y una no.
2. **WhatsApp vive en dos lugares** — "WhatsApp" en Administrador (`/admin/whatsapp-lines`, conexión
   de números) y "WhatsApp Business" en Configuración (`/configuracion/whatsapp`, plantillas). El
   usuario no sabe dónde está cada cosa.
3. **Promociones duplicada** — aparece como item top-level (✨) y también colgada de
   `/configuracion/...`. Dos rutas mentales para lo mismo.
4. **Reportes fragmentados** — `/admin/reports` (hub) y `/admin/reports/appointments` (citas)
   coexisten; solo una está en el menú.
5. **Configuración = cajón de sastre** — mezcla cuenta personal (Perfil), mensajería (WhatsApp,
   quick-replies, promociones) y consumo (uso de mensajes), sin jerarquía clara.
6. **El submenú Administrador mezcla dos cosas distintas** — "setup una vez" (Organización,
   Clínicas, Calendarios, Usuarios) con "operación recurrente" (Bot FAQs, Reporte de Citas, Motor).
7. **7-8 rutas huérfanas** — deuda de navegación; algunas pueden ser código muerto.
8. **Doble taxonomía por toggle de Vista** — agrega una dimensión más de "¿dónde estoy?".

---

## 5. Roles y qué necesita cada uno (para una nav role-aware)

- **Secretaria / Asistente (usuario más intensivo):** Bandeja, Agenda, Nueva Cita, Pacientes,
  Promociones. NO necesita el setup de la org.
- **Admin:** todo lo de la secretaria + el setup (Organización, Clínicas, Calendarios, Usuarios,
  WhatsApp, Motor, Bot FAQs) + Reportes.
- **Doctor:** su Agenda, Nueva Cita, Pacientes, su Configuración. Vista enfocada y mínima.
- **Admin-Doctor:** alterna entre "operar como doctor" y "administrar"; hoy vía toggle.

---

## 6. Hipótesis de simplificación (no prescriptivo — material para Stitch)

> Esto NO es la solución cerrada; es el norte que le damos a Stitch para que proponga.

- **Reducir el top-level** a lo de uso diario (Bandeja, Agenda, Nueva Cita, Pacientes).
- **Una sola "Agenda"** con cambios de vista (hoy / semana / por profesional) dentro de la página,
  no tres items de menú.
- **Un solo hogar "WhatsApp / Bot"** que agrupe: líneas/conexión, plantillas, Bot FAQs, respuestas
  rápidas y promociones.
- **Separar claramente "Operar" (diario) de "Configurar" (setup ocasional)** — que el setup viva en
  un área de Administración bien agrupada, no mezclado con lo diario.
- **Un hub de Administración** con secciones (Organización, Equipo, Agendamiento/Motor,
  Mensajería, Reportes) en vez de una lista plana de 8 items.
- **Resolver las rutas huérfanas:** decidir cuáles re-entran y cuáles se eliminan.
