# Prompt para Stitch — Catálogo de propiedades (piloto Bruno)

> Objetivo: mockup de la pantalla nueva de propiedades para el piloto de bienes raíces
> (Bruno, agente inmobiliario). Schema real ya cerrado y aplicado en BD (Fase 1) +
> capa de datos ya lista (Fase 2) — ver `project_piloto-bienes-raices-bruno.md` (memoria).
> Generado 10 Ago 2026.

---

## CÓMO USARLO

Pegá en Stitch toda la sección **"▼ PROMPT … ▲ FIN DEL PROMPT"**. Es pantalla NUEVA (no un
rediseño), así que Stitch puede proponer libremente el layout — pero los campos y estados
listados son los reales del schema, no inventar otros. Los apéndices no se pegan (salvo que
quieras fijar la paleta con el Apéndice A).

---

## ▼ PROMPT (pegar esto en Stitch)

Diseñá una pantalla de **catálogo de propiedades** para un agente inmobiliario, dentro de
OrionCare (un SaaS que hoy es de gestión de clínicas con WhatsApp, pero esta pantalla es para
su primer cliente de un rubro distinto: bienes raíces). Es un catálogo simple tipo CRUD, no un
portal público — lo usa un solo agente para llevar control de sus propiedades y que un bot de
WhatsApp las consulte.

**Mantené la misma identidad visual ya usada en el resto de la app** (ver Apéndice A si la
tenés a mano: paleta teal + ámbar, fuente Geist, cards de esquinas suaves con imagen arriba).

### Contexto de uso
- Usuario en español (Honduras), un solo agente operando solo (sin equipo).
- Uso desde escritorio y desde el celular (recién carga propiedades entre visitas).
- Volumen bajo-medio: decenas de propiedades, no cientos — no hace falta paginación agresiva
  ni buscador avanzado, un filtro simple por estado alcanza.

### Datos reales de cada propiedad (no inventes campos nuevos)
- **Código** (autogenerado, ej. `COD-101` — se muestra pero nunca se edita)
- **Título** (texto libre, ej. "Casa 3 habitaciones, Zona Viera")
- **Tipo** (texto libre — ej. casa, apartamento, terreno; el agente puede escribir cualquiera)
- **Zona** (texto libre)
- **Precio** + moneda (Lempiras por default, siempre visible — sin campo "precio oculto")
- **Habitaciones** (número entero)
- **Baños** (número, admite medios baños: 2.5)
- **Tamaño** en varas cuadradas (unidad hondureña, NO metros)
- **Fotos** (varias por propiedad, la primera es la de portada)
- **Estado**, con badge de color, EXACTAMENTE estos 4 (no agregues "alquilada" ni otros):
  - Disponible (verde)
  - Reservada (ámbar/naranja — tiene visita agendada)
  - Vendida (gris/neutro)
  - Inactiva (gris apagado)

### Pantallas a entregar
1. **Catálogo (grid de cards)** — una card por propiedad: foto de portada arriba, badge de
   estado en la esquina, código chico, título, zona, precio destacado, fila de iconos
   habitaciones/baños/tamaño. Filtro por pestañas o chips de estado arriba (Todas / Disponibles
   / Reservadas / Vendidas / Inactivas). Botón flotante o de header "+ Nueva propiedad".
2. **Estado vacío** — cuando el agente todavía no cargó ninguna propiedad (primera vez que entra).
3. **Formulario de crear/editar propiedad** — todos los campos de arriba. El código NO es
   editable (se muestra de solo lectura una vez creada la propiedad, y no existe en el form de
   "crear nueva" porque se genera después de guardar). Selector de estado como el único campo
   que cambia el ciclo de vida (no botones separados por transición). Zona de carga de fotos
   con miniaturas y opción de marcar cuál es la de portada.
4. **Vista de detalle de una propiedad** (al tocar una card) — galería de fotos más grande,
   todos los datos, botón editar, y un botón secundario para cambiar el estado rápido sin
   entrar al formulario completo.

Mostrá cada pantalla con contenido de ejemplo realista (propiedades reales de Tegucigalpa:
zonas como Lomas del Guijarro, Zona Viera, Colonia Palmira, Res. El Trapiche).

## ▲ FIN DEL PROMPT

---

## Apéndice A — Identidad visual (fijar para consistencia con el resto de la app)

Paleta ya usada en el resto de OrionCare: primary teal `#00685f`, acento ámbar `#fea619`,
fondo `#f8f9ff`, cards blancas con borde suave, fuente **Geist**, radios de card `0.75rem`.
Dark mode compatible. Mismo patrón de card con imagen 16:9 arriba + badge de estado en la
esquina superior derecha que ya usa la pantalla de Promociones (`PromoCard.tsx`).

## Apéndice B — Copy verbatim (español Honduras)

- "Propiedades" (nombre de la sección/página).
- "Nueva propiedad" (botón de crear).
- Estados: "Disponible", "Reservada", "Vendida", "Inactiva".
- "Habitaciones", "Baños", "Tamaño (varas²)", "Zona", "Código".

## Apéndice C — Notas para nosotros (NO va a Stitch)

- Al portar: descartar cualquier campo que Stitch invente sin respaldo en el schema real
  (`code`, `title`, `property_type`, `zone`, `price`, `currency`, `bedrooms`, `bathrooms`,
  `size_varas`, `photos`, `status` — ver `supabase/migrations/20260810120000_bruno_properties_schema.sql`).
- Conectar desde el primer commit a `useProperties` (`src/hooks/useProperties.ts`) — nunca datos
  hardcodeados como paso intermedio, por regla del repo.
- Subida de fotos: falta decidir en plan mode si reusa el patrón de `promoImageUpload.ts`
  (bucket de Storage + signed URLs) o uno nuevo — pendiente de la sesión de implementación,
  no se le pide a Stitch.
- Vista de detalle (pantalla 4) es la única que no tiene aún un equivalente 1:1 en el repo
  (Promociones no tiene detalle, solo card + form) — evaluar en plan mode si de verdad hace
  falta para v1 o si es la card + form alcanzan (candidato a recortar si el tiempo aprieta
  antes del 17/8).
