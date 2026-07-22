# Prompt para Stitch — Bloqueador de horario

> Objetivo: que Stitch proponga su propia UI/UX para el feature "bloqueador de horario" desde cero.
> Ya existe una versión funcional mínima (fase 3 del feature, backend completo), pero es intencional
> NO describirla acá — es un prompt exploratorio, dejá que Stitch invente la solución.

---

## CÓMO USARLO

Pegá la sección **"▼ PROMPT … ▲ FIN DEL PROMPT"** en Stitch. Los apéndices no se pegan (salvo el A
si querés fijar la paleta) — son para nosotros o para vos si querés iterar el prompt.

---

## ▼ PROMPT (pegar esto en Stitch)

Diseñá la pantalla de un feature nuevo para **OrionCare**, un SaaS web de gestión de clínicas
centrado en WhatsApp (agenda de citas, recordatorios, bot de auto-agenda). **Mantené la misma
identidad visual** que ya generaste para las pantallas anteriores de esta app (paleta teal + ámbar,
fuente Geist, cards de esquinas suaves).

### El problema real que motiva el feature

Un médico (usuario real de la plataforma) reportó que sus pacientes agendan citas en horarios donde
él tiene compromisos personales — no hay ninguna forma hoy de bloquear ese tiempo para que no se
ofrezca como disponible. El feature se llama **"bloqueos de horario"**: el médico puede marcar rangos
de tiempo en los que no quiere recibir citas, sin tocar su horario semanal normal (que ya existe por
separado — esto es una excepción puntual encima de ese horario).

### Usuarios

- **El médico**, gestionando su propio calendario — es el caso de uso principal y más frecuente.
  Accede desde su menú de Configuración personal.
- **Admin o secretaria de la clínica**, que en algunos casos puede gestionar el bloqueo de cualquier
  profesional de su organización (menos frecuente, pero real en clínicas con varios médicos).
- Uso real es mayormente desde el **celular** — los médicos y secretarias casi siempre entran desde
  su teléfono, no desde escritorio. Priorizá mobile.

### Lo que el feature necesita resolver (principios, no solución cerrada)

1. **Crear un bloqueo es un rango continuo de tiempo** — puede durar desde una hora específica de
   un día hasta varias semanas seguidas (ej. vacaciones). La experiencia de elegir ese rango tiene
   que sentirse fluida y rápida, no un formulario tedioso con muchos campos sueltos — pensá en cómo
   simplificar la elección de "desde cuándo hasta cuándo" para casos cortos Y casos largos con la
   misma interacción.
2. **Motivo opcional**, breve (ej. "vacaciones", "cita personal") — nunca obligatorio.
3. **Ver los bloqueos activos** en una lista clara, con la posibilidad de borrarlos. No hay edición
   — para cambiar un bloqueo se borra y se crea uno nuevo (está bien que la UI lo refleje así, no
   hace falta un botón de "editar").
4. **Si el rango que se quiere bloquear choca con citas de pacientes ya agendadas, hay que avisarlo
   con claridad** — mostrar cuáles citas específicas chocan (paciente + hora) — y no permitir crear
   el bloqueo hasta que la persona lo resuelva manualmente (reagendando esas citas por su cuenta).
   Nunca se cancela nada automáticamente.
5. Vive dentro del área de **Configuración** del médico, junto a donde ya configura su horario
   semanal normal — son conceptos relacionados pero pantallas distintas.

### Qué quiero que entregues (pantallas)

1. **Pantalla principal** de "Bloqueos de horario": lista de bloqueos activos + acceso para crear uno
   nuevo. Contenido de ejemplo realista (médico dental, un par de bloqueos ya creados).
2. **El flujo/pantalla de crear un bloqueo nuevo** — mostrá cómo resolvés la elección del rango de
   fecha/hora de forma simple tanto para "bloquear 2 horas hoy" como para "bloquear 3 semanas".
3. **El estado de conflicto** — cómo se ve cuando la persona intenta bloquear un rango que choca con
   citas ya agendadas, y qué información le das para que decida qué hacer.
4. **Versión móvil** de la pantalla principal y de crear un bloqueo (es el uso real más frecuente).

## ▲ FIN DEL PROMPT

---

## Apéndice A — Identidad visual (fijar para consistencia)

Reusar la paleta/tokens ya definidos en los prompts anteriores: primary teal `#00685f`, acento ámbar
`#fea619`, fondo `#f8f9ff`, cards blancas con borde suave, fuente **Geist**, radios card `0.75rem`.
Dark mode compatible.

## Apéndice B — Copy verbatim (español Honduras)

"Profesional" (no "Doctor") si Stitch necesita referirse a quien atiende. "Bloqueos de horario" como
nombre del feature. Evitar tecnicismos ("excepción", "rango" como palabras de UI) — hablarle al
usuario en términos simples ("bloquear", "desde/hasta").

## Apéndice C — Notas para nosotros (NO va a Stitch)

- Ya existe una implementación funcional mínima: página en `/admin/doctors/:doctorId/bloqueos`
  (`src/pages/DoctorScheduleExceptionsPage.tsx`), con inputs nativos de fecha/hora (sin librería de
  date-picker) y entrada desde `ConfiguracionMedico.tsx` → botón "Bloqueos de horario". Es la Fase 3
  de un feature de 4 fases (schema/RLS → motor de disponibilidad → UI → verificación con roles).
- Lo que Stitch proponga es exploratorio — si trae algo mejor para elegir el rango de fecha/hora
  (mobile-first) que los inputs nativos actuales, vale la pena evaluarlo para portar antes de cerrar
  Fase 3/4. Si no aporta nada mejor que lo ya construido y funcionando, se queda como está — no forzar
  un rediseño solo porque Stitch generó algo.
- Restricción técnica real que el rediseño deberá respetar si se porta: sin edición de un bloqueo
  existente (se borra y se crea otro), el chequeo de conflicto con citas SIEMPRE bloquea la creación
  (nunca cancela citas automático), y el rango se guarda en UTC con offset explícito de Honduras
  (-06:00, sin horario de verano) — cualquier picker que Stitch proponga debe poder mapear a esos dos
  campos (inicio, fin) sin ambigüedad de zona horaria.
