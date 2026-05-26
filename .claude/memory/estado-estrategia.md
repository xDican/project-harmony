# Estado Estrategia — OrionCare

> Ultima actualizacion: 25 May 2026 (Instalacion Skin Medic ejecutada. Meta restringio cuenta por falta de sitio web en portfolio — landing creada, revision enviada, esperando 24h. Numero migrado OK. Feature "iniciar conversacion desde link wa.me" construido y deployado. Bug busqueda por nombre corregido.)
> Updates historicos en `estado-estrategia-historial.md`

---

## Dashboard

| Metrica | Valor |
|---|---|
| Clientes activos | 4 + Skin Medic instalando 25 May — Guevara $35, Yeni Ramos $35, Medilaser $75 (desconectado), Ecoclinicas $35, **Skin Medic $150** |
| MRR facturado | **$330** ($180 + $150 Skin Medic) |
| MRR efectivo | **$255** (si Medilaser sigue desconectado), **$330** (si Medilaser se reconecta) |
| Hito real Q2-Q3 2026 | $1,500/mes paz mental → faltan **$1,170-1,245** |
| Cliente top | Skin Medic ($150 = 45% del MRR efectivo) |
| Pipeline | PAUSADO hasta MVP. NO llamada/mensaje a otros leads. |
| Ads | PAUSADOS permanentemente |
| Burn mensual | ~$65 (SaaS stack) + $0 ads |

## Pivot 18 May — Centro de Atencion (resumen)

- Modelo viejo "OrionCare toma el numero" murio el 16 May (asistentes no ceden WhatsApp)
- Nuevo modelo: asistente sigue dueña del numero, OrionCare es centro de atencion (inbox + llamadas + agenda + promos)
- Habilitador: WhatsApp Business Calling API GA via Meta Cloud directo
- Filosofia operativa: bot maximizado, asistente fallback. Pitch externo: "asistente potenciada".
- Detalle completo en `estado-estrategia-historial.md` (UPDATE 18 May)

## Sprints MVP Centro de Atencion

| Sprint | Estado | Notas |
|---|---|---|
| 0 — Schema | ✅ 18 May | 4 tablas + bucket Storage + RLS + 17 service_types |
| 1 — Persistencia + bot dual mode | ✅ 18 May | 5 functions deployadas, conversation tracking |
| 2 — Multimedia + transcripcion | ✅ 18 May | Whisper español, audios ~3s, $0.002 total |
| 3 — Frontend Inbox | ✅ 18 May 23:30 | Inbox + InboxContext realtime una-fuente-verdad |
| 4 — Quick replies + multimedia outbound | ✅ 19 May | Picker composer + upload archivos. QA aprobado. |
| 5 — Promociones del mes | ✅ 19 May PM | Panel admin con mockups Stitch + bot matching escalonado con keywords + FAQ override + destacada del mes + matcheo natural en menu comprimido + cron diario lifecycle. Magic bytes fix para imagenes. QA SQL aprobado. |
| 6 — Calling API (simplificado) | ✅ 20 May | Calling end-to-end (inbound + outbound + queue + permission flow + softphone WebRTC) en 1 dia, 5 sem antes plan. Refactor CallContext + 3 fixes UX. |
| 7-8 — Pilot + lanzamiento | revisar | Decision 19 May: inbox-only Torre Zafiro 25 May |

## Decisiones tomadas 19 May

### Estrategia lanzamiento Torre Zafiro
1. **NO llamada / NO mensaje a Dulce** antes del 25 May. Silencio total. Vamos directo con producto.
2. **Instalacion 25 May: inbox-only, bot DESACTIVADO.** Dulce trabaja 1 semana normal capturando data real.
3. **Bot se entrena con respuestas reales de Dulce** — "duplicar virtualmente a la asistente".
4. **Activacion gradual del bot** desde 8 Jun: fuera horario primero, escalado.
5. **Calling entra el dia 8 Jun en simultaneo** si la primera semana alcanza tier orgánico (ver siguiente seccion).

### Tier WABA — hallazgo critico de la sesion

Investigacion completa via API:

- **Todos los clientes pagos en TIER_250** (Ecoclinicas, Guevara, Yeni). Inicial sin Business Verification.
- **Medilaser confirmado desconectado** — API responde 400 sobre el phone_number_id (sin permisos)
- **OrionCare Demo Bot:** verified con limite **2K mensajes/dia** — herramienta de ventas para demos calling outbound HOY
- **Cada cliente tiene SU PROPIO Business Portfolio** (5 portfolios distintos: Ecoclinicas2, Meat Lab, Consultorio Familiar, OrionCare, Medilaser BOT). Tier NO se agrega entre clientes — cada uno aislado.
- **Limite Meta: max 5 phone numbers por WABA** — razon arquitectonica de "cada clinica su propia WABA"

**Inbound vs Outbound:**
- Inbound (paciente llama) → no requiere tier alto, funciona en TIER_250 desde dia 1
- Outbound via API (clinica llama paciente) → requiere ~2K conversaciones/dia (tier_1K+ con Business Verification)

**Path para clientes nuevos (Mendoza et al):**
- Path 1: Business Verification (RTN, escritura, factura — 5-15 dias) → salto auto a TIER_1K
- Path 2: Crecimiento organico = 125 conversaciones/semana × 7 dias con quality GREEN → upgrade auto en 6h

**Plan operativo Mendoza:** vamos con el numero PRINCIPAL (no el de respaldo). Volumen alto del numero principal cumple 125 conversaciones la primera semana. La oferta a la doctora: "primera semana de calibracion sin llamadas via WhatsApp Cloud, al dia 8 se activa todo en simultaneo". El plan inbox-only ya cubria esa semana — sin sacrificio adicional.

### Recalibracion de estimaciones
- Mis estimaciones originales asumian "Diego solo, 3-4h/dia, padding humano". Reales con Claude codificando + Diego QA: **~75-80% mas rapidos** en sprints solo-codigo (Sprints 0-3: 9h reales vs ~30-40h planeadas).
- **Regla:** sprints puro-codigo → dividir mi estimacion por ~4. Sprints con UX/integracion externa → mantener estimacion.

### Memoria corregida 19 May
- "Marleny Vargas" no existia — era el segundo nombre de **Carla Marleny Paredes** (propietaria Medilaser).
- **Kener** es la asistente de Medilaser, actualmente desconectada.
- **Yeni Ramos** confirmada como doctora del Consultorio Familiar.

## Decisiones estrategicas a mediano plazo (19 May)

### Especializacion vs diversificacion — hoja de ruta acordada

| Periodo | Postura |
|---|---|
| **May-Oct 2026** | Especializacion en medico. Coherencia caso estudio Wilmer+Mendoza+Medilaser. ICP unico = edificio medico con asistente champion. |
| **Octubre 2026** | Piloto UN cliente no-medico (dentista o estética — cercano cultural y operativamente). Validar producto-horizontal sin tocar codigo. |
| **2027+** | Decision grande con data: Camino A (medico vertical profundo, plataforma $140-160 con historial) vs Camino B (horizontal multi-rubro, $60-85 cualquier negocio servicio). |

**Decision tecnica derivada:** mantener **codigo agnostico al rubro** mientras se pueda. Variables, copys UI, prompts del bot en lenguaje generico ("tu negocio", "tus clientes") cuando no haya razon para ser especifico. Si en Oct se decide horizontal, no hay reescritura. Si se decide vertical, se agregan features encima. Ver [[codigo-agnostico-rubro]].

### Pricing — diferido

Diego decide pensarlo con cabeza fresca. Insight clave para cuando vuelva:
- El problema NO es inventar justificacion del precio. Es vender desde **outcome** (resultados financieros) no **feature** ("WhatsApp Web bonito")
- Outcome candidato: "menos pacientes perdidos por no contestar" + "tu asistente recupera 2-3h/dia" + "menos quejas"
- Caso de estudio Mendoza post-semana-1 = munición para vender el upgrade $40→$60
- Ver [[pricing-desde-outcome]]

### Plataforma medica completa $140-160 — Q1 2027 tentativo

Esta vision sigue viva pero diferida. Razones:
- 100 clientes × $150 = $15K MRR (supera hito $7K original con menos del 30% de clientes)
- Sustituir plataforma actual de Mendoza = 2x precio con valor demostrable
- Pero: compliance medica, migracion datos, soporte intensivo
- Pre-requisito: centro de atencion completamente "fire-and-forget"

**Recon Mendoza durante visita 25 May:** observar fisico (papel/digital), digital (software abierto en PC asistente), conversacional ("¿como lleva las citas?"). Anotar competencia HN identificada para futuro.

### Fire-and-forget — medicion postponed

Diego decide NO medir horas-soporte/cliente HOY (plataforma muy volatil, baseline no confiable). Acordado: **post-Mendoza ~Ago-Sep 2026** se establece baseline con producto estable.

Senal positiva existente: **Wilmer = 2 meses sin tocar, feliz** con calendario+notificaciones. Fire-and-forget logrado en el nivel actual del producto. Pendiente que el centro de atencion alcance el mismo nivel.

## Riesgos activos

1. **ALTO:** Bug critico encontrado por Dulce semana 1 quema oportunidad. Mitigacion: QA full sabado 23 + battle-test con Demo Bot verified jue/vie 21-22. Sprint 6 cerro en 1 dia → calling NO tiene horas reales de uso, bandera amarilla.
2. **MEDIO:** Capacidad Diego <3h/dia. Mitigado parcial — estamos adelantados al cronograma (Sprint 6 cerro 5 sem antes).
3. **MEDIO:** Mendoza no alcanza 125 conversaciones/semana — fallback Business Verification (5-15 dias).
4. **MEDIO:** Pacientes con WhatsApp viejo no reciben Business Calling. Investigar % adopcion semana 1.
5. **BAJO:** Tarifa Honduras outbound mas alta de lo estimado — confirmar dashboard cuando se active calling.
6. **BAJO:** Pricing $60 base no aterriza con doctores — diferido, depende del pitch desde outcome.

## Tareas activas

- [ ] **#4** Diseñar pitch a la doctora de Mendoza con framing "calibracion semana 1 + activacion completa dia 8" (incluye opcion Business Verification)
- [ ] **#5** Confirmar tarifa Honduras outbound dashboard Meta (cuando se active calling)
- [ ] **#6** Disenar pricing 3 tiers + materiales venta (diferido — depende del pitch desde outcome)
- [ ] **#7** Recon competencia HN durante visita Mendoza 25 May (observar plataforma actual)
- [ ] **#8** Disenar feature "Promociones del mes" (Sprint 5)
- [ ] **#14** Sprint 4 Quick Replies (hoy)
- [ ] Sprint 5 Promociones del mes
- [ ] Sprint 6 Calling API simplificado (inbound + UI, softphone diferido)
- [ ] Configurar Torre Zafiro en DB pre-instalacion
- [ ] QA full inbox-only sabado 23 May
- [ ] Mantener Demo Bot funcional como herramienta de ventas permanente

## Proximos pasos semana 19-25 May

| Dia | Trabajo | Responsable |
|---|---|---|
| Mar 19 (hoy) | ✅ Sprint 4 + 5 + 5.1 cerrados (quick replies + multimedia + promociones con magia) | Claude + Diego QA |
| **Mie 20** | Sprint 6: Calling API simplificado (webhooks inbound + UI llamadas en inbox + softphone WebRTC) | Claude / Diego QA |
| Jue 21 - Vie 22 | Sprint 6 finalizar + bug fixes Sprint 4-5 si aparecen | Claude / Diego QA |
| Sab 23 | QA full. Configurar Torre Zafiro en DB. | Diego |
| Dom 24 | Bug fixes finales. Briefing operativo. | Claude / Diego |
| **Lun 25** | **INSTALACION Torre Zafiro — inbox-only, bot OFF, calling OFF** + recon plataforma actual | Diego presencial |

## Proximas 4 semanas (25 May - 21 Jun)

- 25 May - 1 Jun: Dulce trabaja normal. Monitor conversaciones + bug fixes. Quality rating verde mantenido.
- 1-7 Jun: Analisis conversaciones reales. Verificar si Mendoza llego a TIER_1K organicamente.
- 8-14 Jun: Activacion gradual bot + calling (si tier subio). Sino, plan B Business Verification.
- 15-21 Jun: Bot completo activo. Evaluar pricing real con data de uso. Decidir Medilaser/2da ola Torre Zafiro.

## Decisiones nuevas guardadas en memoria

- [[pricing-desde-outcome]] — vender desde resultado, no feature
- [[diversificacion-2027]] — medico 6 meses → piloto Oct → decidir grande 2027
- [[codigo-agnostico-rubro]] — UI/copy genericos mientras se pueda
- [[business-portfolio-aislado]] — cada cliente su propio portfolio, tier no agregable
- [[oncare-verified-demo]] — Demo Bot verified 2K = herramienta de ventas
- [[inbox-only-primera-semana]] — filosofia fine-tuning bot con asistente real
- [[modelo-ownership-multi-doctor]] — 21 May: org=edificio (ficcion logica), owner=OrionCare super-admin, billing por doctor independiente. Gap doctor_subscriptions diferido.
- [[admin-edificio-no-prospecta]] — 21 May: admins NO son canal. Solo champion abre puertas.

---

## Sesion 21 May 2026 — Modelo ownership multi-doctor

**Contexto entrante:** Sprint 6 Calling cerrado 20 May (1 dia, 5 sem antes plan). Adelantado al cronograma. T-4 dias para Torre Zafiro.

**Pregunta de Diego:** ¿a que correo vinculamos el "owner" cuando se conectan multiples doctores? ¿Mendoza tiene el control? Si Dulce o Mendoza renuncian, ¿se llevan control total? ¿Como retiramos?

**Clarificacion clave de Diego:** Mendoza es **doctor-inquilino**, NO propietaria del edificio. Hablar con admin del edificio NO funciono (les tiran la pelota — no ven beneficio). El canal real es la champion (asistente) con multiples doctores inquilinos, cada uno paga independiente.

**Hallazgo del schema actual:**
- `organizations` → `clinics` → `doctors`, con M2M via `org_members`, `calendar_doctors`, `whatsapp_line_doctors`
- Una linea whatsapp puede servir N doctores
- Pacientes pertenecen a org (no a doctor)
- → Schema YA SOPORTA multi-doctor + asistente compartida en una sola organization

**Gap identificado:** `organizations.billing_type` default `'organization'` asume el edificio paga. Modelo real es por doctor. Falta `doctor_subscriptions` con plan/amount/is_active por doctor. **No bloqueador para 25 May** (Mendoza arranca sola). Diferido a Jun-Jul cuando se agregue 2do doctor.

**Decision para Torre Zafiro 25 May:**

| Capa | Quien |
|---|---|
| `organization` | "Consultorio Mendoza - Torre Zafiro" (ficcion logica del edificio) |
| `owner_user_id` | Correo de servicio OrionCare super-admin (NO Dulce, NO Mendoza) |
| `secretary` | Dulce — operacional, sin billing |
| `doctor` | Mendoza — su calendar, su agenda |
| `whatsapp_line` | Una sola, a nombre de la org, usando el numero que ya tiene Dulce |
| Billing | $35/mes a Mendoza directamente, fuera del schema por ahora |

**Beneficios del modelo:**
- Dulce renuncia → revocar user_id, invitar nueva asistente. Cero disrupcion.
- Mendoza se va → deactivar doctor + calendar. Otros doctores (si existen) intactos.
- Diego mantiene acceso siempre via super-admin (custodia formal del workspace).
- Cuando Dulce abra puerta a Dra X en Torre Zafiro → se agrega como doctor en LA MISMA org. Dulce ve inbox consolidado.

**Tareas nuevas derivadas:**
- [x] **#15** ✅ Crear correo de servicio OrionCare como super-admin custodio — **HECHO 23 May**. Email: `admin@orioncare.app` (dominio propio que Diego ya tenia). Stack: Zoho Mail Free para bandeja + ImprovMX NO se uso porque Zoho ya estaba configurado en DNS Vercel desde dic 2025. User en auth.users + public.users + user_roles + superadmin_whitelist. user_id: `6d1dfa3b-b6aa-4235-afd4-e20df1b09158`. Bug encontrado en SuperAdminRoute (requiere 3 filas en DB para que funcione) — workaround SQL aplicado, fix de codigo diferido post-Skin Medic. Pendiente: activar 2FA Zoho si Diego no lo hizo, quitar `dican19+smoketest05@gmail.com` del whitelist cuando confirme acceso estable, decidir que hacer con `admin@dican.com` huerfano.
- [ ] **#16** Disenar `doctor_subscriptions` antes de Jun-Jul (cuando se agregue 2do doctor a un edificio)
- [ ] **#17** Decidir politica de atribucion de costos Meta cuando una linea sirve N doctores (Jun-Jul)
- [ ] **#18** Validar 21-22 May con battle-test del Demo Bot verified que calling/inbox aguantan uso real (Sprint 6 cerro muy rapido, sin horas de campo)

**Pendiente conversar proxima sesion estrategia:**
- ¿El correo de servicio OrionCare ya existe o hay que crearlo?
- ¿Como se presenta el workspace en UI a Dulce? "Consultorio Mendoza" suena raro si ella opera para varios. ¿Mejor renombrar a "Centro Atencion Dulce" o algo neutro?
- Cuando se agregue Dra X, ¿se renombra el workspace o se queda con el nombre del primer doctor?
- Pricing operativo: si Dulce trae 3 doctores al edificio, ¿descuento por volumen al doctor? ¿O cada uno paga $35 full?

---

## Sesion 22 May 2026 — Skin Medic cerrado $150 + revision flujo agendamiento

**Contexto entrante:** T-3 dias a instalacion Torre Zafiro. Diego visito a Dulce y Mendoza el 21 May para pre-aprobacion, lo aprobaron. Durante la espera Diego descubrio que la operacion real NO es "Mendoza + asistente" sino que hay **6 tecnicas adicionales** haciendo procedimientos en paralelo.

### Decisiones tomadas

1. **Pricing Skin Medic cerrado en $150/mes flat** — Diego se arriesgo a romper su techo mental de $40. Mendoza acepto, lo vio "algo elevado" pero confia. Cierre directo, sin demo previo del producto. Tier nuevo "Clinica multi-recurso" creado por este caso. Ver [[pricing-tier-clinica]].

2. **Mendoza entrego credenciales FB** — Diego va a hacer el onboarding tecnico de Meta Business Manager directamente. Trust enorme. Protocolo de manejo guardado en [[credenciales-cliente-protocolo]].

3. **Operacion Skin Medic redefinida como "multi-recurso"** — NO es multi-doctor. Es 1 doctora + 6 tecnicas + Dulce. Pacientes piden procedimiento, no persona. Skill-based assignment es lo que necesitan. Consulta = solo Mendoza, procedimientos = pool con capacidades. Ver [[skin-medic-cliente]].

4. **Filosofia "inbox-only pura" revisada** — La regla "inbox-only, agenda OFF, calling OFF semana 1" murio para Skin Medic. Con $150/mes Mendoza necesita VALOR visible dia 1. Nueva regla: **dia 1 = todo funcional EXCEPTO bot**. Bot OFF sigue, pero agenda + calling + recordatorios + confirmaciones activos. Memoria [[inbox-only-primera-semana]] actualizada.

5. **Flujo perfecto de agendamiento diseñado** — 3 pasos desde chat, autoasignacion default "cualquiera disponible", skill matching, pizarron del dia. Estimado ~25-30h Diego time = 4-5 semanas calendario. NO se construye antes del lunes. Fase Jun-Jul post-observacion. Ver [[flujo-perfecto-agendamiento]].

### Auditoria de plataforma — resultado

Plataforma esta al **85% para Skin Medic dia 1**. Lo que SI existe (multi-calendario sin limite, doctores sin user_id login, recordatorios 24h+3d, confirmacion automatica, calling Sprint 6, promociones Sprint 5, bot ON/OFF + handoff) cubre la mayoria.

**Gaps reales criticos dia 1 (en orden de prioridad):**
1. UI labels "Doctor/Medico" hardcodeados → las tecnicas no son doctoras → 2-3h ajuste
2. Vista combinada multi-calendario NO existe → Dulce tendria que clickear 7 veces → 3-4h version simple
3. Notificacion automatica al cancelar/reagendar NO existe → Dulce avisaria manual → 2-3h

**Gaps diferibles a sem 1-2:**
- Agendamiento desde chat (Dulce va a NuevaCita aparte por ahora)
- Vacaciones/excepciones laborales
- Recordatorio 2h (24h cubre 90%)
- Skill matching automatico (Dulce asigna mental — sabe quien puede que)

### Plan tactico 22-25 May (propuesto, pendiente confirmar mañana)

| Cuando | Bloque | Horas |
|---|---|---|
| Vie 22 PM | Llamada Dulce + crear correo super-admin + guardar credenciales FB | 1.5h |
| Sab 23 AM | Ajuste labels "Doctor"→"Profesional" | 2.5h |
| Sab 23 PM | Vista combinada multi-calendario simple + Setup DB Skin Medic | 5h |
| Dom 24 AM | Notificacion automatica cancelar/reagendar | 2.5h |
| Dom 24 PM | QA full + briefing operativo lunes | 3h |
| Lun 25 AM | Onboarding tecnico in-situ + handoff Dulce | 3h |
| **Total** | | **~14h trabajo concentrado** |

**Opcion de recorte:** si la agenda no aguanta, sacrificar notificacion cancelacion (manual sem 1) → 11.5h. Mas recorte = sacrificar vista combinada → 8.5h pero operacion se complica.

### Entregables de la sesion

1. **`docs/cuestionario-skin-medic-onboarding.md`** — 105 preguntas en 7 partes (A: Dulce, B: Mendoza, C: Diego, D: observacion lunes, E: decisiones derivadas, F: notas libres, G: proximos pasos). Diego lo va a revisar mañana antes de retomar.

2. **Memorias creadas:**
   - [[skin-medic-cliente]] — Caso completo
   - [[pricing-tier-clinica]] — Tier $150 validado
   - [[credenciales-cliente-protocolo]] — Protocolo FB
   - [[flujo-perfecto-agendamiento]] — Diseño para fase Jun-Jul

3. **Memoria corregida:** [[inbox-only-primera-semana]] — Regla revisada para Skin Medic

### Tareas activas actualizadas (post-sesion 22 May)

Anteriores que siguen vigentes:
- [ ] **#4** Pitch a Mendoza framing "calibracion semana 1 + activacion completa dia 8" — **YA NO APLICA** (Diego ya cerro $150 sin demo previo, no hay pitch que armar para vender; lo que queda es comunicar el plan de semana 1)
- [ ] **#5** Confirmar tarifa Honduras outbound dashboard Meta (cuando se active calling)
- [ ] **#7** Recon competencia HN durante visita 25 May
- [ ] **#15** Crear correo de servicio OrionCare super-admin antes del 25 May
- [ ] **#16** Disenar `doctor_subscriptions` antes Jun-Jul (cuando se agregue 2do doctor a un edificio)
- [ ] **#17** Politica atribucion costos Meta cuando una linea sirve N doctores (Jun-Jul)
- [ ] **#18** Battle-test Demo Bot verified que calling/inbox aguantan uso real

Nuevas derivadas 22 May:
- [ ] **#19** Diego revisar cuestionario `docs/cuestionario-skin-medic-onboarding.md` mañana 23 May
- [ ] **#20** Llamada con Dulce — Parte A del cuestionario (40 preguntas operativas)
- [ ] **#21** Conversacion con Mendoza — Parte B del cuestionario (35 preguntas de politica)
- [ ] **#22** Confirmar scope final fin de semana (14h vs recorte 11.5h vs recorte 8.5h)
- [ ] **#23** Configurar org Skin Medic en DB: super-admin owner + 7 profesionales (Mendoza + 6 tecnicas con user_id NULL) + horarios + catalogo procedimientos
- [ ] **#24** Ajuste UI labels "Doctor/Medico" → "Profesional" o equivalente agnostico
- [ ] **#25** Vista combinada multi-calendario simple (dropdown "Ver: Todos" o tab "Agenda completa")
- [ ] **#26** Notificacion automatica al cancelar/reagendar (edge function ajuste)
- [ ] **#27** Decision: pricing si llega segundo cliente del tier Clinica — ¿se mantiene $150 o sube a $180?
- [ ] **#28** Decision: contrato firmado con Skin Medic o acuerdo verbal (riesgo $150 sin papel)

### Riesgos activos (actualizado 22 May)

1. **ALTO:** Bug critico encontrado por Dulce semana 1 quema oportunidad ($150 cliente top, Mendoza vio precio "elevado"). Mitigacion: QA full sabado + battle-test Demo Bot.
2. **ALTO (nuevo):** Mes 1 Skin Medic sin valor visible → Mendoza cuestiona $150 en mes 2. **Critico:** primer mes debe demostrar ahorros, mejora operativa, citas no perdidas.
3. **MEDIO:** Capacidad Diego <3h/dia + 5 clientes = soporte saturado en sem 1-2 Skin Medic.
4. **MEDIO:** Gap multi-recurso se nota sem 2-3 → primera excepcion al feature freeze en Junio.
5. **MEDIO:** Skin Medic = N=1 del tier $150. NO reorganizar estrategia con esta sola data, pero registrar anclaje.
6. **BAJO:** Tarifa Honduras outbound mas alta de lo estimado.
7. **BAJO:** Sprint 6 calling sin horas reales de uso, bandera amarilla.

### Para retomar mañana (23 May)

**Estado mental al cierre:** Diego va a leer el cuestionario `docs/cuestionario-skin-medic-onboarding.md` (es largo). Va a volver con dudas o ajustes. NO empezar a ejecutar nada hasta que confirme.

**Primera pregunta a hacerle al volver:**
- ¿Reviso el cuestionario? ¿Algo que ajustar o eliminar?
- ¿Confirmamos plan tactico de 14h o recortamos a 11.5h?
- ¿Llamo a Dulce hoy o esperas algo antes?

**Decisiones que estan abiertas y se deben cerrar mañana:**
- Scope final fin de semana (14h / 11.5h / 8.5h)
- Cuando llamar a Dulce (hoy 23 May AM/PM o sabado)
- Cuando hablar con Mendoza para Parte B (sab/dom o lunes temprano)
- Correo super-admin OrionCare: ¿existe o crearlo?
- Linea WhatsApp lunes: la actual de Dulce o nueva
- Contrato firmado o verbal

**Lo primero que se ejecuta cuando se confirme plan:**
1. Llamada Dulce (Parte A cuestionario)
2. Crear correo super-admin
3. Guardar credenciales FB en gestor seguro
4. Identificar hardcodes "Doctor/Medico" en el repo para acelerar ajuste sabado AM

---

## Sesion 23 May 2026 — Super-admin operativo + Org Skin Medic shell + plan WhatsApp

**Contexto entrante:** T-2 dias a instalacion Torre Zafiro. Tarea #15 (correo super-admin) pendiente. Diego pregunto como funciona el super-admin tecnica y operativamente.

### Decisiones tomadas

1. **Correo super-admin = `admin@orioncare.app`** (no admin@dican.com que era huerfano + sin buzon). Aprovechamos dominio orioncare.app que Diego ya poseia. Stack: Zoho Mail Free (bandeja propia) — ya estaba configurado en DNS Vercel desde dic 2025 (DKIM + SPF + MX zoho.com). No hubo que tocar DNS.

2. **Seguridad: ruta pragmatica** — Chrome Password Manager + Google Keep para 2FA recovery codes. Migracion a Bitwarden postponed post-feature-freeze. Razon: no introducir friccion nueva con cliente top instalando lunes. Ver [[seguridad-pragmatica-fase-actual]].

3. **Org Torre Zafiro - Piso 3 creada (shell)** — id `7dc5c5db-6476-4a31-b9b3-ceba4e7ffb64`. Nombre interno futuro-proof (modelo "org = edificio" para soportar multi-doctor a futuro, ver [[modelo-ownership-multi-doctor]]). Si Mendoza objeta el nombre el lunes, es 1 UPDATE de 1 segundo. owner_user_id apunta a admin@orioncare.app. max_calendars=7 (Mendoza + 6 tecnicas). auto_cancel_enabled=true (alineado con [[confirmacion-con-consecuencia]]).

4. **Plan WhatsApp:** Opcion A — usar numero actual de Dulce, NO numero nuevo. Migracion sabado o domingo noche, NO lunes en vivo. Dulce y Mendoza ya saben que el numero se "corta" y pasa a la plataforma (cero WhatsApp Web/app, todo via OrionCare inbox).

### Bug encontrado y workaround aplicado

`SuperAdminRoute.tsx` requiere que el user este en `public.users` Y `user_roles` (no solo en `superadmin_whitelist`). Sin esas filas, getCurrentUserWithRole retorna null antes del fallback, y el panel queda en "Cargando..." infinito.

**Workaround vigente:** 3 inserts en DB (public.users + user_roles + superadmin_whitelist) para cada super-admin. Documentado en [[super-admin-protocol]]. Fix de codigo (~10 lineas) diferido post-Skin Medic.

### Tareas cerradas en esta sesion

- [x] **#15** ✅ Crear correo super-admin (admin@orioncare.app operativo, panel /internal/activations accesible)
- [x] **Parcial de #23** ✅ Org Skin Medic shell creada (faltan doctors + tecnicas + secretary + lineas + horarios)

### Tareas nuevas / actualizadas (23 May)

- [ ] **#29** Visita Diego a Dulce 23 May AM — extraer 5 datos pre-migracion WhatsApp: numero exacto, normal/Business, PIN 2FA, quien tiene celular, backup chats. Ver [[whatsapp-cloud-api-migration]].
- [ ] **#30** Migracion WhatsApp sabado o domingo noche — pasos tecnicos en [[whatsapp-cloud-api-migration]]. Requiere acceso al Meta Business Manager de Mendoza (Diego tiene credenciales FB).
- [ ] **#31** Activar 2FA en Zoho Mail para admin@orioncare.app (pendiente confirmar de Diego)
- [ ] **#32** Quitar `dican19+smoketest05@gmail.com` del superadmin_whitelist cuando admin@orioncare.app tenga 2-3 logins estables
- [ ] **#33** Banear `admin@dican.com` user huerfano en Supabase Auth (no urgente, no tiene buzon real)
- [ ] **#34** Crear `doctors` (Mendoza + 6 tecnicas) + `secretaries` (Dulce) + `org_members` posterior a llamada Dulce (parte A cuestionario)
- [ ] **#35** Bug SuperAdminRoute fix de codigo — diferido post-Junio 2026 (feature freeze). Documentado en estado-dev.md.

### Pendientes que se quedaron abiertos al cierre de sesion

Decisiones del fin de semana que SIGUEN abiertas (Diego aun no las cerro):
- Scope fin de semana (14h / 11.5h / 8.5h)
- Cuando exacto llamar a Dulce (visita matinal 23 May en marcha pero faltan llamadas formales)
- Cuando hablar con Mendoza para Parte B (35 preguntas politica)
- Contrato firmado o verbal

### Para retomar proxima sesion

**Estado mental al cierre:** Diego va a visita matinal con Dulce. Va a traer datos de los 5 puntos del checklist WhatsApp. Cuando vuelva, retomamos con:

1. Confirmacion de los 5 datos pre-migracion WhatsApp
2. Decision firme: migracion sabado o domingo noche
3. Acceso a Meta Business Manager de Mendoza (Diego usa credenciales FB que ya tiene)
4. Ejecucion migracion WABA
5. Test inbox OrionCare recibiendo mensajes
6. Configurar org Torre Zafiro - Piso 3 con doctors/secretaries cuando se tenga la data

**Datos clave para no perder:**
- Org id: `7dc5c5db-6476-4a31-b9b3-ceba4e7ffb64`
- Super-admin user_id: `6d1dfa3b-b6aa-4235-afd4-e20df1b09158`
- Org slug: `torre-zafiro-piso-3`

---

## Sesion 25 May 2026 — Instalacion Skin Medic + feature wa.me link

**Contexto:** Dia de instalacion Torre Zafiro / Skin Medic.

### Que paso en la instalacion

1. **Numero migrado correctamente** — Diego logro enviar 1 mensaje de ambos extremos antes de la restriccion.
2. **Meta restringio la cuenta** — El Business Portfolio no tenia sitio web asociado. Diego creo landing page en Lovable, la publico como sitio web del portfolio, y envio revision. Meta dio plazo de 24h.
3. **Restriccion = no enviar NI recibir** — Dulce completamente offline en la plataforma hasta que Meta apruebe.
4. **Dulce tiene numero alterno** para urgencias durante la restriccion.
5. **Mendoza y Dulce se incomodaron** — conscientes de la situacion, esperaran las 24h.
6. **Templates ya creados en Meta** — pendientes de aprobacion post-restriccion.

### Gap critico descubierto

La otra plataforma de Dulce genera links `wa.me` para enviar recordatorios. Con el numero migrado al Cloud API, esos links ya no funcionan (WhatsApp app no tiene el numero). Dulce perdio su herramienta de recordatorios manuales.

Ademas, la plataforma OrionCare no tenia forma de iniciar conversaciones con pacientes que no han escrito primero.

### Feature construido: iniciar conversacion desde link wa.me

**Flujo:** Dulce pega link wa.me en barra de busqueda → sistema detecta, parsea telefono y texto → muestra tarjeta de preview → Dulce llena campos (nombre, doctor, fecha, hora) → click enviar → template sale por Cloud API → conversacion aparece en inbox.

**3 tipos de notificacion** de la otra plataforma (cada uno genera link distinto):
- Creacion de cita → template `confirmacion_cita`
- Recordatorio 24h → template `recordatorio_cita_24h`
- Recordatorio del dia → template `recordatorio_3d` (texto generico sirve para cualquier dia)

**Commits (5):**
1. `ce81e43` — feat: parser wa.me + NewConversationCard + RPC initiate_conversation + inboxActions
2. `5c7ba62` — fix: texto legible del template en timeline (no nombre interno)
3. `659bcfe` — fix: crear paciente en tabla patients al iniciar conversacion
4. `b09ff89` — fix: card siempre visible cuando se detecta link wa.me
5. `cef11b3` — fix: busqueda por nombre (bug pre-existente `phone.includes("")`)

**Archivos creados:** `src/lib/waLinkParser.ts`, `src/components/inbox/NewConversationCard.tsx`, `supabase/migrations/20260525120000_add_initiate_conversation_rpc.sql`

**Archivos modificados:** `src/lib/inboxActions.ts`, `src/components/inbox/InboxList.tsx`, `src/hooks/useConversations.ts`

**RPC `initiate_conversation` deployado en produccion.** Incluye `find_or_create_patient` para auto-crear paciente.

### Pendiente manana (modo-dev, ~15 min)

1. Diego trae link real de la otra plataforma
2. Implementar `parseAppointmentText()` con regex del formato exacto
3. Implementar `detectTemplateType()` para auto-seleccionar tipo
4. Verificar que Meta levanto la restriccion

### Riesgos activos (actualizado 25 May)

1. **ALTO:** Meta no levanta restriccion en 24h → Dulce sigue offline, confianza erosiona. Mitigacion: landing ya subida, revision enviada.
2. **ALTO:** Templates no aprobados post-restriccion → Dulce puede recibir pero no enviar proactivamente. Mitigacion: templates ya creados, aprobacion suele ser rapida.
3. **ALTO:** Bug critico semana 1 quema oportunidad ($150 cliente top). Mitigacion: feature wa.me link construido y testeado, bug busqueda corregido.
4. **MEDIO:** Dulce no adopta el inbox como reemplazo → fricciona y Mendoza cuestiona. Mitigacion: flujo wa.me link replica su workflow anterior.
5. **BAJO:** Onboarding fallido genera desconfianza inicial. Parcialmente materializado (incomodidad por restriccion). Mitigable si manana todo funciona.

### Leccion operativa

**Checklist onboarding pre-migracion (agregar):** Verificar que el Business Portfolio tiene sitio web ANTES de migrar el numero. Si no tiene, crear landing + agregar sitio + esperar aprobacion ANTES de la migracion.
