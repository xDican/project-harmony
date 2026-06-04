# Prompt afinado para Stitch — "Nueva Cita" VISTA ÚNICA (OrionCare)

> Iteración 3. Construye sobre el diseño anterior de Stitch. Conserva su paleta y tipografía
> (fijas abajo) y aplica: vista única (sin toggle de modo), 2 columnas con **vista de semana**
> (no grilla de mes), horarios en caja de scroll contenido, footer sticky de resumen + CTA, y
> cambio de profesional por procedimiento. Actualizado 3 Jun 2026.

---

## CÓMO USARLO

Pegá en Stitch toda la sección **"▼ PROMPT … ▲ FIN DEL PROMPT"**. Los apéndices (paleta exacta,
copy, estados) van al final.

---

## ▼ PROMPT (pegar esto en Stitch)

Itera sobre el diseño anterior de "Nueva Cita". Mantené EXACTAMENTE la misma identidad visual que
ya generaste (paleta teal + ámbar, fuente Geist, cards con borde superior de color, esquinas
redondeadas suaves, sidebar y top bar). NO cambies colores ni tipografía; solo el contenido y el
layout según esto.

**Concepto — UNA SOLA pantalla, sin modos.** La asistente arma la cita agregando **uno o más
servicios**: con uno es una cita normal; con varios son procedimientos consecutivos de la misma
visita. El usuario NUNCA elige "modo". Debe verse limpio y natural con UN solo servicio (el 90% de
los casos): nada de lenguaje de "visita" cuando hay uno solo.

**Contexto:** pantalla donde una asistente de una clínica de medicina estética/dermatología (1
doctor + varias técnicas en paralelo, con cabinas/máquinas) agenda citas rápido, todo el día, en
desktop y móvil. Español de Honduras. Terminología "Profesional" (no "Doctor"). Herramienta de uso
intensivo: rápida, clara, pocos clics.

### Layout — 2 columnas en desktop + footer sticky. SIN scroll de página.

Objetivo central: **completar una cita SIN tener que scrollear la página.** Todo lo esencial cabe
en una pantalla. Lo que pueda crecer (muchos horarios, muchos procedimientos) **scrollea DENTRO de
su propia caja de altura fija**, nunca empuja la página.

- **Columna izquierda — "armar la cita":** 1) Paciente, 2) Servicios de la cita.
- **Columna derecha — "cuándo":** 3) Fecha y hora.
- **Footer sticky (abajo, siempre visible):** resumen de la cita + profesional(es) asignado(s) +
  botón "Agendar cita". El contenido lleva **padding inferior** para que el footer NUNCA tape las
  cards.

### Columna izquierda

**1. Paciente.** Buscador; el seleccionado se ve como chip: avatar con iniciales + nombre +
teléfono, con link "Cambiar" y opción "Crear nuevo paciente".

**2. Servicios de la cita.** Subtítulo "Agrega uno o más servicios." Buscador de servicios; los
agregados aparecen en una lista. Cada servicio muestra nombre + duración + precio (ej. "Limpieza
Facial · 45m · L 1,200").
- Con **UN** servicio: fila limpia, SIN número de orden ni flechas de reordenar; solo una ✕ para
  quitar. Que NO parezca lista de visita.
- Con **DOS O MÁS**: filas numeradas (1, 2, 3…) con flechas ↑↓ para reordenar (el orden = secuencia
  de atención back-to-back) y ✕; al pie "Duración total estimada: 1h 05m".

### Columna derecha

**3. Fecha y hora.**
- **Selector de fecha = VISTA DE SEMANA** (NO grilla de mes — una grilla de mes se ve cortada en
  una columna angosta). Una fila de 7 días (Dom a Sáb) con flechas **‹ ›** para avanzar/retroceder
  de semana, y un encabezado tipo "Semana 8–14 Oct". El día seleccionado resaltado en primary; los
  días pasados o sin cupo, **tachados y deshabilitados**. Compacto, siempre completo.
- **Horarios** debajo, agrupados en **"Mañana" y "Tarde"**, como botones formato 12h ("10:00 AM"),
  DENTRO de una **caja de altura fija con scroll interno** (para que un día con muchos horarios no
  agrande la página). Seleccionado: resaltado. Sin cupo: tachado.

### Footer sticky — resumen + profesional + CTA

Barra inferior fija, siempre visible. De izquierda a derecha:
- **Fecha y hora** elegidas (ej. "Mar 10 Oct · 02:30 PM").
- **Total** ("2 servicios · L 4,700").
- **Profesional(es) asignado(s)** — EL MOMENTO ESTRELLA del producto (el sistema auto-asigna al
  profesional libre **menos cargado**):
  - Con **UN** servicio: avatar + nombre + badge **"Auto"** (asignado automáticamente) + link
    "Cambiar".
  - Con **DOS O MÁS**: avatares apilados + "Auto · N profesionales" + un link **"Ver detalle"** que
    abre un panel/popover con el **timeline de la visita**: cada procedimiento como fila (rango
    horario · servicio · profesional asignado) con un chip **"cambiar" SOLO si hay otro profesional
    libre en esa franja**. Al pie del panel: "Auto-asignado al menos cargado; podés cambiarlo."
- **Botón "Agendar cita"** (prominente, con ícono check/calendario). Deshabilitado hasta completar
  todo.

### Estados a diseñar (no solo el happy path)

Vacío inicial (sin servicio): la zona de fecha bloqueada con hint "Selecciona un servicio para ver
disponibilidad". Cargando disponibilidad. Sin horarios ese día ("No hay horarios para esta fecha,
probá otra"). Footer con todo listo para confirmar.

### Reglas que el diseño NO puede romper

(a) El servicio se elige ANTES de la fecha. (b) El profesional concreto se conoce y se muestra
DESPUÉS de elegir la hora (depende de quién esté libre) — NO pegues un profesional al servicio en
el paso 2. (c) Días/horarios sin cupo deben verse claramente no seleccionables (tachados). (d)
Terminología "Profesional". (e) La página no scrollea para completar la cita; el overflow va
contenido en cajas de altura fija.

### Móvil

Colapsa a una columna en este orden: Paciente → Servicios → Fecha (vista de semana) → Horarios →
y el footer (resumen + profesional + "Agendar cita") **fijo abajo**. La vista de semana y la caja
de horarios siguen siendo compactas.

## ▲ FIN DEL PROMPT

---

## Apéndice A — Paleta y tokens EXACTOS (fijar para consistencia)

| Token | Hex | Uso |
|---|---|---|
| primary | `#00685f` | botones primarios, activo, marca |
| primary-container | `#008378` | hover/variante |
| primary-fixed-dim | `#6bd8cb` | acentos claros |
| on-primary | `#ffffff` | texto sobre primary |
| secondary-container | `#fea619` | ámbar — badge "Auto", borde de resumen |
| secondary | `#855300` | texto/acento ámbar oscuro |
| tertiary | `#b90538` | rojo-magenta (destacados/alertas) |
| error | `#ba1a1a` | errores, "Cerrar sesión" |
| background / surface | `#f8f9ff` | fondo general |
| surface-container | `#e5eeff` | top bar, footer, contenedores |
| surface-container-low | `#eff4ff` | superficies sutiles |
| surface-container-lowest | `#ffffff` | cards |
| on-surface / on-background | `#0b1c30` | texto principal |
| on-surface-variant | `#3d4947` | texto secundario |
| outline | `#6d7a77` | bordes fuertes |
| outline-variant | `#bcc9c6` | bordes suaves de card |

- **Fuente:** Geist (400/500/600/700).
- **Radios:** card `0.75rem`, botones/inputs `0.5rem`, chips `full`.
- **Card "clave":** fondo blanco, borde `outline-variant`, sombra suave, **borde superior de color**
  (primary para activa; ámbar/`secondary-container` para resumen/profesional).
- **Badge "Auto":** fondo ámbar suave, texto ámbar oscuro, con ícono de chispa (✨).
- Mantener **dark mode** compatible.

## Apéndice B — Copy verbatim (español Honduras)

- Pasos: "1. Paciente" · "2. Servicios de la cita" · "3. Fecha y hora".
- Subtítulos: "Agrega uno o más servicios." · (2+ servicios) "Agrega los servicios en el orden en
  que se atenderán."
- Buscador paciente: "Buscar por nombre o teléfono…". Sin resultados: "No existe cliente, verifique
  el número o cree uno nuevo." + "Crear nuevo paciente".
- Buscador servicio: "Buscar servicio…". Encabezado de lista: "Servicios a agendar (N)".
- Vista de semana: encabezado "Semana 8–14 Oct" + flechas ‹ ›.
- Slots: grupos "Mañana" / "Tarde". Sin slots: "No hay horarios disponibles para esta fecha".
- Bloqueo: "Selecciona un servicio para ver disponibilidad". Cargando: "Cargando disponibilidad…".
- Duración (2+): "Duración total estimada".
- Footer: "Total (N servicios)", badge "Auto", links "Cambiar" / "Ver detalle".
- Panel detalle (2+): "Detalle de la visita" + "Auto-asignado al menos cargado; podés cambiarlo."
- Botón: "Agendar cita" / al enviar "Agendando…".
- Toast éxito: "¡Cita creada exitosamente!" con Paciente / Profesional / Fecha / Hora / Duración.

## Apéndice C — Nota para nosotros (NO va a Stitch)

UI única, pero el INSERT ramifica por cantidad: **1 servicio → `create-appointment` (sin
`visit_id`, reagenda normal); 2+ → `create-visit` (con `visit_id`, atómico).** Disponibilidad
siempre vía `get-visit-slots` (maneja 1..N). Evita la regresión de reagendar (cita con `visit_id`
bloquea el reagendar normal). Orgs sin servicios → flujo viejo basado en duración (fallback; el ICP
siempre tiene servicios). El cambio de profesional por procedimiento usa los `freeDoctorIds` que ya
devuelve `get-visit-slots`. Razonamiento completo en la conversación de modo-dev 3 Jun.
