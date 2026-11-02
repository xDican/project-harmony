# Prompt para Stitch — Simplificar la navegación de OrionCare

> Objetivo: que Stitch proponga una **arquitectura de navegación simplificada** para una plataforma
> que creció por capas. Inventario completo y análisis en `docs/reporte-navegacion-plataforma.md`.
> Generado 5 Jun 2026.

---

## CÓMO USARLO

Pegá en Stitch toda la sección **"▼ PROMPT … ▲ FIN DEL PROMPT"**. Los apéndices (identidad visual,
copy, notas para nosotros) van al final y NO se pegan tal cual salvo el Apéndice A si querés fijar
la paleta. Es un prompt **exploratorio**: dejá que Stitch proponga el agrupamiento; después iteramos.

---

## ▼ PROMPT (pegar esto en Stitch)

Diseñá una **navegación simplificada** para OrionCare, un SaaS web de gestión de clínicas centrado
en WhatsApp (agenda de citas, recordatorios, inbox de WhatsApp, y un bot que auto-agenda). La
plataforma creció por capas y hoy la navegación está fragmentada; **quiero que propongas una
estructura limpia desde cero**, no que reproduzcas la actual.

**Mantené EXACTAMENTE la misma identidad visual que ya generaste para la pantalla "Nueva Cita"**
(paleta teal + ámbar, fuente Geist, cards de esquinas suaves, sidebar y top bar). Es la misma app.

### Contexto del producto
- Usuarios en español (Honduras). Herramienta de uso intensivo diario para asistentes de clínica.
- **4 roles**, la nav debe adaptarse a cada uno:
  - **Asistente/Secretaria** (la que más la usa): atiende el WhatsApp, agenda, gestiona pacientes.
  - **Doctor:** ve su agenda, agenda citas, sus pacientes.
  - **Admin:** todo lo de la asistente + configura la clínica + reportes.
  - **Admin-Doctor:** alterna entre operar como doctor y administrar.
- Desktop (sidebar) y móvil (menú).

### El problema a resolver (qué está descontrolado hoy)
- **Tres vistas de agenda** separadas en el menú ("Semanal", "De Hoy", "Médica").
- **WhatsApp aparece en dos lugares**: conexión de números por un lado, plantillas por otro.
- **Promociones está duplicada** (menú principal + dentro de Configuración).
- **"Configuración" es un cajón de sastre** (perfil + WhatsApp + plantillas + promociones + consumo).
- **El menú "Administrador" mezcla** setup-de-una-vez (organización, clínicas, calendarios, usuarios)
  con cosas de operación recurrente (reportes, FAQs del bot, motor de agendamiento).

### Las páginas que existen (agrupalas como creas mejor)
**Operación diaria:** Bandeja (inbox de WhatsApp) · Agenda (hoy / semana / por profesional) ·
Nueva Cita · Pacientes (lista + ficha individual).
**Mensajería y marketing:** Promociones · Respuestas rápidas · Plantillas de WhatsApp · Bot FAQs.
**Cuenta:** Perfil · Uso/consumo de mensajes.
**Configuración de la clínica (setup):** Organización · Clínicas (sedes) · Calendarios y horarios ·
Usuarios y roles · Conexión de WhatsApp (números) · Motor de agendamiento (recursos/recetas/skills).
**Reportes:** Reporte de citas.

### Lo que buscamos (principios, no solución cerrada)
1. **Menú principal corto** = solo lo de uso diario (idealmente 4-5 items).
2. **Una sola "Agenda"** con un selector de vista (hoy / semana / por profesional) DENTRO de la
   página, no tres items distintos.
3. **Un solo hogar "WhatsApp & Bot"** que reúna inbox-adyacentes: plantillas, respuestas rápidas,
   FAQs del bot, promociones, conexión de números.
4. **Separar "Operar" (diario) de "Configurar" (ocasional)**: el setup de la clínica vive en un área
   de Administración aparte, no mezclado con lo diario.
5. **El área de Administración como un hub con secciones** (ej. Organización, Equipo, Agendamiento,
   Mensajería, Reportes), no una lista plana larga.
6. **Nav adaptada al rol**: la asistente ve una nav mínima; el admin ve además Administración.

### Qué quiero que entregues (pantallas)
1. **App shell con la nueva barra lateral** (desktop), mostrando la nav del rol **Admin** (la más
   completa) — con el agrupamiento que propongas y, si aplica, secciones colapsables o un acceso a
   "Administración" separado del uso diario.
2. **La misma nav para el rol Asistente** (versión reducida) para mostrar cómo se adapta.
3. **El menú en móvil** (drawer/hamburguesa).
4. **La página "hub" de Administración** — landing del área de setup, con tarjetas o secciones que
   agrupen las páginas de configuración de forma escaneable.

Mostrá cada pantalla con contenido de ejemplo realista de una clínica de medicina estética.

## ▲ FIN DEL PROMPT

---

## Apéndice A — Identidad visual (fijar para consistencia con "Nueva Cita")

Reusar la paleta/tokens ya definidos para el rediseño de Nueva Cita
(ver `docs/stitch-prompt-vista-unica.md`, Apéndice A): primary teal `#00685f`, acento ámbar
`#fea619`, fondo `#f8f9ff`, cards blancas con borde suave, fuente **Geist**, radios card `0.75rem`.
Dark mode compatible.

## Apéndice B — Copy verbatim (español Honduras)
- Marca/título: "OrionCare" (hoy el header dice "Agenda Médica" — proponer si conviene renombrar).
- Términos: "Profesional" (no "Doctor") para quien atiende la cita. "Bandeja" = inbox.
  "Pacientes". "Promociones". "Motor" = motor de agendamiento. "Administración".

## Apéndice C — Notas para nosotros (NO va a Stitch)
- Inventario y análisis completo: `docs/reporte-navegacion-plataforma.md`.
- Restricciones técnicas que el rediseño debe respetar al implementarse (NO se le dicen a Stitch,
  pero las tenemos presentes):
  - El shell vive en `MainLayout.tsx`; la nav es role-based en `getNavigationItems()`.
  - Hay **rutas huérfanas** (`/admin/specialties`, `/admin/reports`, `/admin/files`,
    `/admin/settings`, `/internal/activations`, `/debug-whatsapp`, `/agenda-medico`): decidir cuáles
    re-entran y cuáles se eliminan ANTES de implementar (parte del "destralizar").
  - Cambios de nav son de bajo riesgo (no tocan datos), pero el toggle Vista Médico/Administrador y
    el `OrgSwitcher` deben sobrevivir al rediseño.
  - "Una sola Agenda con selector de vista" implica unificar `/agenda-semanal` + `/agenda-secretaria`
    (+ `/agenda-medico`) — es trabajo de front, no de backend.
