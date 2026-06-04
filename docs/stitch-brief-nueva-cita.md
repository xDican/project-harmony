# Brief para Stitch — Rediseño de "Nueva Cita" (OrionCare)

> Documento para entregar a Google Stitch junto con un screenshot de la pantalla actual.
> Objetivo: rediseñar la pantalla de agendamiento manual conservando TODA la lógica/estados
> que se describen abajo. Stitch produce el mockup; nosotros analizamos cómo implementarlo.
> Generado 3 Jun 2026 desde el código real (`src/pages/NuevaCita.tsx` + componentes).

---

## 1. Qué es esta pantalla

**Nueva Cita** = la pantalla donde la **asistente/secretaria** (o el doctor) agenda una cita
manualmente desde la plataforma web de OrionCare (un SaaS de gestión de clínicas con WhatsApp).
Ruta: `/agenda/nueva-cita`. Vive **dentro de un layout con sidebar** (navegación lateral
izquierda + header); Stitch solo rediseña el **área de contenido** (la columna central), no el
sidebar.

**Usuario típico:** una asistente con prisa, atendiendo pacientes por WhatsApp/teléfono en
paralelo, en una clínica de medicina estética/dermatología con **1 doctor + varias técnicas**
operando a la vez (cabinas, máquinas). Necesita agendar **rápido y sin errores**. Es una
herramienta de uso intensivo diario, no ocasional.

**Dispositivos:** se usa en **desktop** (recepción) y **móvil** (asistente moviéndose). Debe
verse excelente en ambos.

**Idioma:** todo el copy es **español** (Honduras). Conservar los textos tal cual (abajo van
verbatim). Tono: claro, directo, cálido pero profesional.

---

## 2. Problema actual (por qué rediseñar)

- Usa el **tema slate por defecto de shadcn/ui** → gris genérico, sin identidad de marca, plano,
  "se ve medio feo".
- **Layout de una sola columna** apilada verticalmente (`max-w-2xl` centrado). Hay mucho scroll;
  en desktop desperdicia el ancho. (El código tiene un comentario que prometía "2 columnas:
  izquierda=quién, derecha=cuándo" pero **nunca se construyó** — es una oportunidad del rediseño).
- Jerarquía visual débil: todos los pasos pesan igual, no guía el ojo.
- Selectores de servicio/duración/hora son grids de botones idénticos, monótonos.
- Estados de carga/vacío son spinners y texto gris sin gracia.

**Lo que SÍ funciona y hay que conservar como concepto:** el flujo por pasos numerados, el
calendario con días no disponibles tachados, el chip de paciente/profesional seleccionado, el
resumen final en el toast.

---

## 3. Identidad visual / design tokens actuales (base a mejorar)

Sistema: **shadcn/ui + Tailwind**, variables HSL. Hoy es el tema por defecto:

- `--primary`: azul-marino muy oscuro `hsl(222 47% 11%)` (casi negro) — botones primarios.
- `--background`: blanco. `--card`: blanco. `--muted-foreground`: gris `hsl(215 16% 47%)`.
- `--border`: gris claro `hsl(214 32% 91%)`. `--radius`: `0.5rem` (8px).
- Soporta **dark mode** (hay variables `.dark`).
- Tipografía: sans-serif del sistema (sin fuente de marca definida).

**Pedido a Stitch para la identidad:** proponer una paleta con **personalidad** apropiada para
salud/estética (limpia, confiable, moderna; un color de acento cálido o un teal/verde-azulado
funcionan bien en el rubro), mantener buen contraste y accesibilidad, radios suaves, y un sistema
consistente de tipografía. Conservar compatibilidad con dark mode. **No** usar morados chillones
ni degradados pesados; clínico pero no frío.

---

## 4. Estructura y flujo COMPLETO (todos los modos)

La pantalla es **adaptativa**: cambia según la configuración de la clínica y el rol del usuario.
Hay **3 grandes variantes** que el rediseño debe contemplar. La meta del producto es la Variante A
(clínica multi-recurso) — es el cliente ideal.

### Modo de cabecera (solo en clínicas multi-profesional con servicios)

Antes de todo aparecen DOS toggles (botones grandes, 2 columnas):

**Toggle 1 — "¿Qué querés agendar?"**
- `Cita simple` / subtítulo "Un solo procedimiento"
- `Visita (varios)` / subtítulo "Procedimientos consecutivos"

**Toggle 2 — "¿Cómo agendar?"** (solo en modo Cita simple)
- `Cualquier profesional` / subtítulo "El sistema asigna al que esté libre"  ← **recomendado/default**
- `Elegir profesional` / subtítulo "Para un profesional específico"

---

### VARIANTE A — Cita simple, "Cualquier profesional" (service-first + auto-asignación) ★ EL CASO ESTRELLA

Este es el flujo que queremos lucir. Pasos (numerados, apilados):

1. **Seleccionar Paciente** — buscador con dropdown (ver §5 PatientSearch). Debajo, cuando hay
   paciente, aparece la card **"Recordatorio extra"** (ver §5).
2. **Seleccionar Fecha** — pero primero un sub-bloque:
   - **Servicio** (grid de botones, 2–3 columnas): el usuario elige UN servicio (ej. "Limpieza
     facial", "Botox", "Consulta general"). Al elegir, debajo aparece "Duración: 30 min" (el
     servicio fija la duración). **El servicio va primero** porque determina qué profesionales
     pueden hacerlo y la capacidad de cabinas/recursos.
   - **Separador**.
   - **Calendario** (mes completo, siempre visible en desktop). Días no laborables / sin cupo se
     muestran **tachados y deshabilitados**. Mientras carga: overlay "Cargando disponibilidad…".
     Si no hay servicio elegido aún, el calendario está **bloqueado** con overlay "Selecciona un
     servicio para ver disponibilidad".
   - **Separador**.
   - **Horario** — grid de botones con las horas disponibles (formato 12h, ej. "10:00 AM"). Título
     dinámico: "Horario — jueves 5 de junio".
3. **Profesional asignado** (card que aparece al elegir hora): el sistema **auto-asigna al
   profesional libre menos cargado**. Muestra su nombre. Si hay varios libres en esa hora, muestra
   chips para **cambiarlo manualmente** + texto "Auto-asignado al menos cargado; podés cambiarlo".
4. **Botón "Agendar"** (full-width, grande, con check). Deshabilitado hasta completar todo; debajo
   "Completa todos los campos para crear la cita".

**Por qué importa esta variante:** 2 pacientes a la misma hora pueden ser atendidos por 2
profesionales/recursos distintos. La pantalla debe comunicar esa "magia" de coordinación (llenar
capacidad ociosa) sin abrumar.

### VARIANTE A2 — Cita simple, "Elegir profesional" (override)

Igual que A, pero **aparece un paso extra al inicio**: "1. Seleccionar Profesional" (buscador
DoctorSearch, ver §5). Aquí los pasos se renumeran a: 1 Profesional, 2 Paciente, 3 Fecha. El resto
idéntico, pero sin la card de auto-asignación (el profesional ya está fijo).

### VARIANTE B — Visita multi-procedimiento ("Visita (varios)")

Reemplaza todo el cuerpo por el componente `VisitBooking`. Pasos:
1. **Seleccionar Paciente** (igual).
2. **Procedimientos de la visita** — subtítulo "Agrega los servicios en el orden en que se
   atenderán (uno tras otro)". Grid de botones de servicio con ícono `+`. Al agregar, aparece una
   **lista ordenada** abajo: cada fila = `[número] Nombre del servicio · 30 min` + botones
   ↑ ↓ (reordenar) y ✕ (quitar).
3. **Fecha y hora de inicio** — calendario (mes) + lista de **horas de inicio factibles** donde
   TODA la cadena de procedimientos cabe back-to-back ese día. Si no hay: alerta "No hay horarios
   donde toda la visita quepa ese día. Prueba otra fecha."
4. **Detalle de la visita** (card al elegir inicio): lista cada procedimiento con su rango horario
   (`10:00–10:30 · Limpieza facial`) y el profesional asignado (auto-sugerido, con chips para
   cambiar si hay varios libres). Texto "Auto-asignado al profesional menos cargado; podés
   cambiarlo."
5. **Botón "Agendar visita"**.

### VARIANTE C — Degradación (clínicas simples / clientes actuales) — SIN servicios configurados

Si la org **no tiene servicios** configurados (caso de los clientes actuales de 1 doctor): NO
aparecen toggles, NO hay paso de servicio. En su lugar:
- (Si multi-doctor) Paso "1. Seleccionar Profesional".
- Paso Paciente.
- Paso Fecha: en vez de "Servicio" muestra **"Duración"** (grid: 15 min / 30 min / 1 hora / 1.5
  horas / 2 horas) → calendario → horario.
- Botón Agendar.

**Nota de rol:** si el usuario es un **doctor logueado** (no asistente), el profesional se
auto-rellena con él mismo y no se muestra el paso de profesional ni los toggles combinados.

---

## 5. Componentes reutilizables (copy y comportamiento verbatim)

### PatientSearch (buscar/seleccionar paciente)
- Input con ícono lupa, placeholder **"Buscar por nombre o teléfono…"**.
- Dropdown de resultados: cada item = ícono usuario + **nombre** + ícono teléfono + número
  (formato "9999-9999") + opcional "DNI: …".
- Sin resultados: "No existe cliente, verifique el número o cree uno nuevo." + botón
  **"Crear nuevo paciente"** (ícono UserPlus) si lo escrito tiene ≥3 caracteres.
- Cargando: "Buscando…".
- **Seleccionado:** card con fondo primary suave (`bg-primary/5`, borde `primary/20`): ícono
  usuario + nombre + teléfono + DNI opcional, y botón ✕ ("Cambiar paciente").

### DoctorSearch (buscar/seleccionar profesional) — solo modo "Elegir profesional"
- Input placeholder **"Buscar por profesional o especialidad…"**.
- Dropdown: ícono usuario + nombre + (ícono estetoscopio + especialidad).
- Cargando: "Buscando profesionales…". Vacío: 'No se encontraron profesionales para "…"'.
- Seleccionado: card primary suave con nombre + especialidad + ✕ ("Cambiar profesional").
- **OJO terminología:** se usa **"Profesional"** (no "Doctor") en todo el copy visible — porque
  pueden ser técnicas/asistentes, no solo médicos. Mantener "Profesional".

### Card "Recordatorio extra" (debajo del paciente)
- Ícono campana + título **"Recordatorio extra"** + subtítulo dinámico:
  - apagado: "1 WhatsApp: 24h antes"
  - encendido: "2 WhatsApp: 3 días + 24h"
- Switch a la derecha.

### Calendario (shadcn `Calendar`, mes completo)
- Días pasados: deshabilitados. Días no laborables / sin cupo: **tachados + gris + no clickeables**
  (`line-through`, `text-muted-foreground/50`).
- Desktop: **siempre visible**, ancho completo, dentro de un borde con padding.
- Móvil: **colapsado** en un botón "Seleccionar fecha" (con ícono calendario y chevron) que abre
  el calendario como popup. Al elegir día se cierra.
- Overlays sobre el calendario: "Cargando disponibilidad…" (spinner) y, si bloqueado, el hint
  ("Selecciona un servicio/profesional para ver disponibilidad").
- Si falla la carga: alerta "No se pudieron cargar los días disponibles. Puedes seleccionar
  cualquier fecha manualmente."

### SlotSelector (horarios)
- Título "Selecciona un horario disponible:".
- Grid de botones de hora (3 cols móvil → 6 cols desktop), fuente monoespaciada, formato 12h
  ("10:00 AM"). Seleccionado: relleno primary + ring.
- Vacío: card "No hay horarios disponibles para esta fecha".

### Diálogo "Crear nuevo paciente" (modal)
- Título "Crear nuevo paciente", descripción "Ingresa los datos del paciente para agregarlo al
  sistema."
- Campos: "Nombre completo" (placeholder "Ej: María García López") + "Teléfono" (placeholder
  "1234-5678", máx 9 chars con guion).
- Footer: "Cancelar" / "Guardar" (→ "Guardando…").

### Toast de éxito (tras agendar)
- Cita simple: título "¡Cita creada exitosamente!" + resumen: **Paciente / Profesional / Fecha /
  Hora / Duración**. Si WhatsApp no se envió, nota gris al pie.
- Visita: "¡Visita agendada!" + Paciente / Fecha + una línea por procedimiento
  (`10:00 — Limpieza facial (Dra. Lizzy)`).

---

## 6. Estados que el diseño debe cubrir (no solo el "happy path")

Para cada variante, diseñar:
- **Vacío inicial** (nada seleccionado): calendario bloqueado con hint, slots con "Selecciona una
  fecha en el calendario".
- **Cargando** días / cargando slots (spinners con texto).
- **Sin disponibilidad** (día sin slots; visita que no cabe).
- **Error de carga** (alerta no bloqueante, permite seguir).
- **Todo completo** → botón Agendar activo.
- **Enviando** ("Agendando…" / "Agendando visita…").
- **Card de auto-asignación** con 1 profesional vs varios (chips).
- **Modal** crear paciente.

---

## 7. Lo que NO se puede cambiar (restricciones funcionales)

Stitch puede reorganizar/embellecer libremente, pero el rediseño debe **preservar estos hechos**
porque vienen de la lógica del motor:

1. **El servicio se elige ANTES de la fecha** (service-first) en clínicas con servicios — determina
   profesionales y capacidad de recursos. No mover el servicio después del calendario.
2. **La duración la fija el servicio** (no se edita a mano cuando hay servicios). El selector de
   duración manual SOLO existe en la variante degradada (sin servicios).
3. **Auto-asignación** ocurre al elegir la hora (no antes): el profesional concreto se conoce
   recién cuando se sabe día+hora. La card de "Profesional asignado" aparece después del horario.
4. **Días no disponibles** deben ser visiblemente no seleccionables (tachados).
5. **Visita = lista ordenada** de procedimientos back-to-back; el orden importa y se puede
   reordenar. Las horas de inicio son las que permiten que toda la cadena quepa.
6. Existe siempre el camino **"crear paciente nuevo"** desde el buscador.
7. Terminología **"Profesional"** (no "Doctor/Médico") en el copy de agendamiento.

---

## 8. Oportunidades concretas para Stitch (qué mejorar)

1. **Layout desktop de 2 columnas**: izquierda = "Quién" (paciente + servicio + profesional),
   derecha = "Cuándo" (calendario + horarios + asignación + botón). Aprovechar el ancho, menos
   scroll. En móvil colapsa a 1 columna.
2. **Identidad de marca**: paleta con personalidad para salud/estética, jerarquía tipográfica
   clara, micro-detalles (íconos, chips, estados activos) que se sientan premium.
3. **Selector de servicio más rico**: en vez de botones grises idénticos, cards con quizá ícono +
   nombre + duración (+ precio si existe). Que se entienda de un vistazo.
4. **"Profesional asignado" como momento destacado**: comunicar la coordinación inteligente
   (avatar/iniciales del profesional, "el menos cargado hoy") — es el diferenciador del producto.
5. **Resumen lateral o sticky** de la cita en construcción (paciente, servicio, fecha, hora,
   profesional) que se va llenando — refuerza confianza antes de confirmar.
6. **Horarios** más legibles, quizá agrupados por mañana/tarde.
7. **Estados de carga/vacío** con ilustración o skeleton, no solo spinner gris.
8. Mantener **densidad eficiente** (es herramienta de uso diario rápido), no sacrificar velocidad
   por estética: pocos clics, todo a la vista.

---

## 9. Resumen de un vistazo (para el prompt de Stitch)

> Rediseña la pantalla "Nueva Cita" de un SaaS de clínicas (medicina estética). Es donde una
> asistente agenda citas rápido. Flujo service-first: elegir paciente → servicio → fecha (calendario
> con días no disponibles tachados) → hora → el sistema auto-asigna al profesional libre menos
> cargado (con opción de cambiarlo). Hay un modo "Visita" para varios procedimientos consecutivos
> y un modo "Elegir profesional" manual. Desktop 2 columnas (quién / cuándo), móvil 1 columna.
> Español de Honduras, terminología "Profesional". Estética: salud limpia, moderna, confiable, con
> identidad de marca (hoy es el shadcn slate gris por defecto, plano). Conservar todos los estados:
> vacío, cargando, sin disponibilidad, error, resumen final. Herramienta de uso intensivo: rápida,
> clara, pocos clics.
