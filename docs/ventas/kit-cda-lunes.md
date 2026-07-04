# Kit visita CDA (Centro Dental Avanzado) — Lunes 6 Jul 2026

> Sede: Edificio Xcala, Piso 8, Local 801, Col. América, TGU. Contacto: asistente (médico, da consulta general) — champion. Decisor: el jefe.
> Contexto: red de 5 sedes (Xcala, Blvd. Suyapa, SPS, Juticalpa, Catacamas). Tienen Dentalink. Coordinan médicos por llamada/WhatsApp. **Dolor verbalizado: hasta 24h para cuadrar una cita.**
> Regla de la visita: TODO se cierra en la sala. No hay segunda oportunidad. No prometer: push de cita nueva al médico, sync cross-sede automático, vista mensual de calendario.

---

## 1. Secuencia (una sola visita)

1. **Apertura con SU número:** "Me contaron que cuadrar una cita con sus médicos les toma hasta 24 horas — les muestro cómo queda en 30 segundos."
2. **Demo guiada Orthos (5 min):** escena "sustituir la llamada" — la asistente ve la disponibilidad real del médico en pantalla y agenda EN el momento. Si hay señal: escena del externo (login en tu teléfono, bloque "Ocupado" → desaparece de los slots).
3. **Calculadora a lapicero** (hoja de abajo) — ellos corrigen los supuestos.
4. **Precio en la sala:** "$150 al mes por esta sede, sus médicos entran gratis, y el primer mes es gratis: en 30 días le muestro nuestro tiempo-de-cuadre contra sus 24 horas."
5. **Fecha de instalación agendada ahí mismo.** Cierre: "me dice con confianza."

**Regla de la escalera (por si la calculadora revela operación chica):** si son 2-3 médicos y pocas citas coordinadas/semana → no es tier clínica: "$40 por médico" en la sala, sin titubear. La regla decide, no los nervios.

---

## 2. Hoja calculadora (imprimir — llenar a lapicero frente al jefe)

```
   LO QUE CUESTA LA ESPERA — Sede Xcala

   Citas coordinadas con médicos por semana:   ______  (A)
   (al mes: A x 4 = ______)

   Espera actual para cuadrar cada una:  hasta 24 horas  (dato de su equipo)

   Valor promedio de un procedimiento:   L. ______  (B)
   ("pongamos L.10,000 — corríjame si estoy lejos")

   Pacientes que se enfrían esperando:   1 de cada 20  (supuesto conservador)

   ────────────────────────────────────────────
   FUGA MENSUAL ESTIMADA:  (A x 4) ÷ 20 x B = L. ______

   OrionCare: $150/mes (~L.3,750)
   → se paga con MEDIO paciente recuperado
   ────────────────────────────────────────────

   + Tiempo de asistente: 2-4 llamadas por cita → 0 llamadas
   + El paciente elige su cita ANTES de colgar
   + Sus médicos: acceso gratis, su agenda en el celular
```

Notas de uso:
- El ticket (B) NO se pregunta (equivale a preguntar ingresos): se asume en voz alta y se deja que corrijan. Cuando corrigen, el número ya es de ellos.
- El 1/20 es deliberadamente conservador: que el jefe piense "es más" solo.
- La hoja llena REGRESA A CASA (es el baseline del caso de estudio).

---

## 3. Checklist de captura (traer a casa si hay SÍ)

### Bloque 1 — Número de WhatsApp de la sede (CRÍTICO — el lado Meta es lo que mata instalaciones)
- [ ] Número exacto que usan los pacientes de Xcala
- [ ] ¿WhatsApp Business App? ¿Actualizada (v2.24.17+)? ¿7+ días activo?
- [ ] ¿Quién tiene el teléfono físico / quién contesta?
- [ ] ¿Página de Facebook de la clínica? ¿Sitio web? (prerrequisito portfolio Meta)
- [ ] **¿Dentalink les manda recordatorios por WhatsApp? ¿Desde QUÉ número?** (conflicto potencial si usa el mismo número de la sede)

### Bloque 2 — Personas (usuarios a crear)
- [ ] Lista de médicos que rotan en Xcala: nombre, procedimientos que hace, celular
- [ ] Asistente(s) que operarán: nombre, correo. ¿Cuántas personas contestan?
- [ ] ¿Quién es admin? (champion médico-asistente = probable patrón admin+doctor)

### Bloque 3 — Operación (config del motor)
- [ ] Horarios de cada médico EN Xcala (no su semana completa)
- [ ] Catálogo de procedimientos coordinados: nombre, duración, ¿consulta previa?
- [ ] ¿Cuántos sillones/cubículos? ¿Los procedimientos compiten por sillón o cada médico tiene el suyo?
- [ ] Frontera con Dentalink verbalizada: Dentalink = expediente, OrionCare = coordinación + comunicación
- [ ] Citas futuras ya agendadas (para cargar en el cutover)

### Bloque 4 — Baseline del caso de estudio
- [ ] Flujo exacto de toques confirmado (quién llama a quién, por dónde, cuántas veces)
- [ ] 2-3 ejemplos recientes concretos de citas que tardaron ("¿la última vez, cuánto tardó?")
- [ ] Hoja calculadora llena

### Bloque 5 — Acuerdos cerrados EN la sala
- [ ] Fecha y hora de instalación (presencial, con el teléfono de la sede y la asistente)
- [ ] Alcance semana 1 dicho en voz alta: agenda + coordinación; bot OFF; sin promesas de cross-sede ni push
- [ ] Métrica del mes gratis pactada: 24h → nuestro número en 30 días
- [ ] Facturación: ¿a nombre de quién? ¿quién aprueba mes 2? ¿CAI? (si CAI, impuesto se suma)

### De oído (sin interrogar)
- [ ] ¿Sus médicos atienden también en otras clínicas? (vivero de proliferación)
- [ ] ¿Las otras 4 sedes coordinan igual? (expansión: 5 sedes ≈ $600-750/mes)
- [ ] Quejas de Dentalink (libro de demanda)

---

## 4. Gaps que NO se prometen (auditoría 3 Jul)

1. **Sin push de "cita nueva" al médico** — solo le llega WhatsApp si el paciente pide reagendar. Decir: "el médico la ve en su app al instante", NO "le llega notificación". (Si lo piden: ~1 día de build, post-cierre.)
2. **Sin sync automático entre sedes/orgs** — el médico que rota usa bloques "Ocupado" manuales + OrgSwitcher para ver cada sede. NO prometer cross-sede.
3. **Agenda del médico = lista del día**, no calendario mensual. (Candidata #1 libro de demanda; se construye si cliente pagando la pide.)

## 5. Pre-lunes (pendientes técnicos)

- [ ] **#85** Merge `feat/page-tracking-navegacion` → main (12 commits de drift; prod parece servir la rama — confirmar branch de producción en Vercel)
- [ ] **#84** Probar envío/recepción línea Orthos +504 9787-0752 (la demo del lunes la usa si se toca mensajería)
