# Estado Estrategia — OrionCare

> Ultima actualizacion: 2 Jul 2026 TARDE (CASO STACY RECINOS → modelo CLINICA-HUB + demo Orthos EJECUTADO. Grecia NO aparecio a la instalacion (2do no-show, ultimo mensaje enviado, pelota en su cancha). Lumina reagendo al VIERNES via el bot. CDH sin visitar. Hallazgo de campo mayor: Stacy Recinos paga Dentalink Y usa TimeTree para coordinar medicos externos (llamada telefonica por cada procedimiento) → pidio demo. Decisiones: unidad que paga = LA CLINICA (1 Pro) + medicos externos free (loop: el free empuja a sus otras clinicas); free = single-player ilimitado, pago = invitar + recordatorios; add-on $35/calendario MUERTO; $40 NO se baja; cuña vs Dentalink corregida (SI tiene recordatorios WhatsApp — cuña real = numero propio + conversacion + coordinacion externos); bot fuera del pitch (pero ON en demo Orthos). Demo Orthos configurado completo via SQL (sillon=RECURSO, linea Demo Bot movida — rollback documentado). Ver Sesion 2 Jul TARDE al final y [[orthos-demo-stacy]].)
> Update previo: 2 Jul 2026 (INSTALACION GRECIA / SMILE DESIGN en marcha. Grecia no contesto confirmaciones (3 toques, regla: no 4to; silencio matutino ≠ no) → decision ir igual (15 min de distancia, asimetria clara). Durante el onboarding: org **Smile Design** creada (`40bd31f5-51b5-4abb-b448-5c81029dabd8`), Grecia = admin+doctora (`greciarodriguez@orioncare.app`); Diego llevo cuenta propia admin+doctor para preparar todo. **DKapilar (nombre correcto, antes "Capilar") reprogramada para SABADO** — mensaje enviado; hoja de prep seguridad #66 pendiente ANTES del sabado. Wilmer: cero contacto (loop respira solo, check-in natural lun-mar prox semana). Diego durmio bien → riesgo capacidad bajo. PENDIENTE CONFIRMAR: resultado final de la instalacion. Ver Sesion 2 Jul al final.)
> Update previo: 1 Jul 2026 (LOOP DE WILMER DISPARADO + tiers Free/Pro + Dentalink descartado. Wilmer confirmo que comparte silla con **2 profesionales mas** (uno "poco" movimiento) + usa **TimeTree con una colega**; Diego le pitcheo "TimeTree + nuestra plataforma", le ENCANTO, dijo que hablaria con sus colegas esta semana para ver como lo pagan y unirse — free tier ya comunicado a Wilmer. **= el loop #71 disparandose SOLO/organico con nuestro N=1 feliz como semilla; silla-compartida pasa de N=1 a potencialmente N=3.** Modelo de tiers para combatir "todo o nada": **Free** = calendario compartido (reemplazo TimeTree) + **Pro $40** = recordatorios+bot; el free es la mercancia que TimeTree YA regala (no se regala valor), el valor pago queda intacto → guardas: (1) no anclar $40 contra free — vender vs paciente-perdido/secretaria; (2) free-como-motor-viral DEPENDE del self-service #73 (diferido) → piloto Wilmer = provision MANUAL. Filtro ICP mas afilado: **"usa TimeTree + otro calendario X"** (TimeTree solo reserva la silla, las citas propias van aparte = malabarea 2 apps = dolor agudo; el motor ya las une). "Por que no Dentalink": mercado ya voto (7/10 TimeTree no Dentalink → switching-cost ~0 xq RECHAZARON el PMS), trabajo distinto (expediente vs agenda+comunicacion), dental-only vs ICP vertical-agnostico, asume clinica de sede fija, terreno del competidor — **TimeTree Y Dentalink fallan en lo MISMO: no le hablan al paciente desde el numero del medico = nuestra cuña**. Capacidad: Diego durmio 4.5h por emocion → **mañana SOLO instalacion Grecia, Capilar reprogramada 2-3 dias** (decision de CAPACIDAD, no evitar-por-tesis; sin reloj financiero, +$15/mes). Ver Sesion 1 Jul al final.)
> Update previo: 30 Jun 2026 (cont.) — DESCUBRIMIENTO DE SEGMENTO. 3 leads de campo (Jensi itinerante; Capilar = champion 4-medicos, LEAD MAS CALIENTE, mensaje mañana 6pm; Montserrat expediente = mismatch) + gap analysis del codigo abren una tesis: el incumbente real NO es Dentalink, es **TimeTree** (7/10 medicos contactados lo usan) — gratis y mudo. **"Usa TimeTree" = filtro de ICP por conducta** (proxy de "situacion Wilmer", switching-cost ~0). Mercado = subarriendo de espacio clinico (Airbnb de cubiculos): compartir silla (el CUARTO limita → motor co-working) e itinerancia (el MEDICO limita → agregacion de calendarios) = 2 ejes del mismo mercado; OC ya respeta ambos, solo falta "bloqueo sin paciente" (hack placeholder = pilotear con 0 codigo). El motor co-working revive con este fit. Precio: NO bajar $40 (sesgo costo-marginal); reframe vs paciente-perdido/secretaria + mes gratis. RIESGO: teorizamos sobre 2 anecdotas → ir a CONTAR (mini-tarjeta 3 preguntas). Ver Sesion 30 Jun (cont.) al final. Detalle en [[timetree-incumbente-filtro-icp]].)
> Update previo: 30 Jun 2026 (CORRECCION DE DATOS + PRIMERA CACERIA ICP REAL. Tres hallazgos que mueven la estrategia: (1) El "Wilmer usa 10% / le da igual el bot" es FALSO — datos: 121 citas recurrentes, bot activo 245 logs/42 sesiones los 5 meses, recordatorios+confirmacion intensivos; lo que NO usa es la capa cara (inbox/calling/promos/motor multi-recurso). Wilmer ademas es DENTAL. (2) Cash flow real = +$15/mes, no -$30: unico costo operativo = Claude $20. (3) Diego salio a la calle 29 Jun (Edificio Artemisa + dentales) = primeras conversaciones ICP reales desde 1 Jun; el motor multi-recurso $150 NO salio ni una vez, el mercado vota SIMPLE + DENTAL. Decisiones: dental = beachhead candidato, regla "no feature vertical sin 3+ clientes pagando aparte de Wilmer", primer-mes-gratis = enganche, asistentes = puerta (ya no bloqueo). Reddit muerto como canal ICP (prediccion confirmada). Ver Sesion 30 Jun al final.)
> Update previo: 27 Jun (RE-EXAMEN DE TESIS DE NEGOCIO. Diego cuestiona si el ICP clinica multi-recurso es demasiado complejo. Insight clave: Wilmer (unico cliente feliz, $35) usa ~10% de la plataforma (calendario+recordatorios), no le importa el bot — el pivote al motor $150 abandono la unica config validada. La ADQUISICION siempre fue el cuello de botella, no el producto; Wilmer llego a-pulso (canal menos escalable). 3 modelos: A vertical SaaS, B horizontal mismo-motor, C agencia/bespoke=TRAMPA solo. Decision: smoke test de demanda barato. Diego eligio regalar 1 landing page en Reddit; COO recomendo ad FB targeteado + hermana (hotel=ICP caliente) como canales superiores. Post de Reddit reescrito (gratis, sin venta, con calificacion). Resultados pendientes. Ver Sesion 27 Jun al final.)
> Update previo: 15 Jun (semana muerta + reframe motor de crecimiento = caceria concierge, NO funnel de ads)
> Update previo: 2 Jun (decision construir el motor multi-recurso como producto real)
> Updates historicos en `estado-estrategia-historial.md`

---

## Dashboard

| Metrica | Valor |
|---|---|
| Clientes activos | **1** — Guevara $35 (ancla, unico activo). Yeni/David/Paredes marcados PERDIDOS 22 Jun; Skin Medic perdido 27 May |
| MRR facturado | **$35** |
| MRR efectivo | **$35** (solo Guevara) |
| Hito real Q2-Q3 2026 | $1,500/mes paz mental → faltan **$1,465** (8-10 clientes ICP) |
| Cliente top | Guevara ($35 = 100% del MRR) — DENTAL, caso de estudio, NPS 9.5. **CORRECCION 30 Jun:** usa el CORE COMPLETO (calendario 121 citas + recordatorios + confirmacion + BOT 245 logs/42 sesiones, activo). NO usa la capa cara (inbox/calling/promos/motor). El "10%/le da igual el bot" era falso |
| Pipeline | **Activo (campo 29 Jun):** Grecia/Smile Design (interesada), Lumina (vuelve mie), CDH (vuelve jue), Alvarado (futuro), Jacome (demo pendiente), +asistente 20 Jul. Lead pediatra "por verificar". Cluster DENTAL denso. Reddit muerto como canal ICP. |
| Ads | PAUSADOS — pero ad FB targeteado $20-30 recomendado como canal del smoke test |
| Cash flow real | **+$15/mes** (CORREGIDO 30 Jun) — ingreso $35 Wilmer − $20 Claude (unico costo operativo real; free tiers Supabase/Vercel, fuera de Twilio). NO es −$30 |

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

---

## Sesion 1 Jun 2026 — Skin Medic cerrado, ICP refinado, Sprint Coexistence aprobado

### Lo que cambio

**Skin Medic perdido definitivamente 27 May.** Cliente top ($150, 45% del MRR efectivo) cancelo a las 48h por gap fundamental: el modelo "migrar el numero al Cloud API" desactiva la WhatsApp Business App de la asistente, quien queda "amputada" sin features esenciales (reenviar archivo, etiquetas, etc.). Post-mortem en [[skin-medic-perdido]].

**Observacion empirica clave de Diego:** al desconectar el numero a las 5pm del dia anterior, Skin Medic perdio leads INMEDIATAMENTE — no a los 4 dias como esperaba Diego. Tres hipotesis (no excluyentes):
1. Pacientes agendan dia-a-dia, no a 4 dias
2. El paciente quiere respuesta en 1-2h, no espera — si no contestas se va a otra clinica
3. El numero ya es marca conocida (boca a boca, etiquetas en celulares de recurrentes) — downtime = 100% perdida de trafico organico habitual

**Implicacion:** ZERO DOWNTIME es no-negociable. El playbook "migrar el sabado en la noche" murio.

### ICP definitivo confirmado

| Segmento | Volumen tipico | Veredicto |
|---|---|---|
| Medico independiente | <5 msj/dia | OUT — sin dolor |
| Medico + 1 asistente | 10-20 msj/dia | OUT — dolor manejable a mano |
| **Clinica multi-recurso (1 doc + N tecnicas)** | **14 msj/HORA observado en Skin Medic** | **UNICO ICP real** |
| Edificio multi-doctor asistente comun | medio | Posible, secundario |

Diego cerro las puertas con todos los demas segmentos basado en feedback en campo. La unica metrica de mercado dura: **Skin Medic generaba ~150 msj/dia, otros clientes generan <20%**.

### Solucion tecnica validada — Coexistence

Investigacion con Gemini 1 Jun cerro el loop completo:

1. **Coexistence es GA** (no beta) desde mediados 2025 en la mayoria del mundo
2. **Permite mismo numero en WA Business App + Cloud API simultaneamente** via QR scan
3. **Embedded Signup ya esta 100% implementado** en el codigo (build v16). Solo falta el switch del flavor: `featureType: 'whatsapp_business_app_onboarding'` + `sessionInfoVersion: '3'` + skipear el `POST /register`
4. **2 webhooks adicionales criticos:** `smb_message_echoes` (lo que la asistente envia desde su celular llega al inbox web) + `smb_app_state_sync` (sincroniza cambios contactos)
5. **History flood:** 5-15 min de inyeccion intensa al escanear QR. Filtrar por `timestamp > 5min en el pasado` para skipear bot/transcription/notifications. Debounce de 5 min sin updates = sync completo
6. **Tech Provider status:** ya confirmado por Diego
7. **3 clientes actuales no se pueden migrar a Coexistence sin downtime** — quedan en modo migracion destructivo. Silencio + churn organico

Detalle tecnico completo en `estado-dev.md` seccion "PRIORIDAD #1 — Sprint Coexistence" y en memoria [[sprint-coexistence]].

### Decisiones tomadas 1 Jun

1. **Churn organico de Yeni Ramos, David Diaz/Ecoclinicas, Paredes/Medilaser** — silencio total, no comunicacion proactiva, no se intenta retencion. Su perfil no es ICP. Suma ~$145 que se va a perder en 1-3 meses. Aceptable.
2. **Guevara se mantiene como testimonial** — NPS 9.5, 2 referidos pendientes. Cuidar.
3. **Skin Medic NO se intenta recuperar.** En 3-4 meses con Coexistence operativo se puede reabrir conversacion como "version 2" si Mendoza/Dulce muestran interes — pero NO se busca activamente.
4. **Sprint Coexistence arranca 1 Jun (hoy) tarde** — 14-17h trabajo concentrado, 3-4 dias calendario. Pruebas con Demo Bot verified + numero personal Diego ANTES de cualquier cliente real.
5. **Lista 20 clinicas TGU con Warhol** — prompt enviado a Gemini (Deep Research). Inventariado puede empezar HOY en paralelo al sprint codigo. Onboarding real comienza solo despues de sprint validado.
6. **TAM estimado:** ~20 clinicas TGU + replica a SPS/La Ceiba + horizontal a salones de belleza (mismo perfil multi-recurso) = **$8K-15K MRR techo realista**. Hito $1,500 paz mental con 8-10 clientes del ICP correcto.
7. **Pivot horizontal posterior:** salones de belleza grandes (estilistas/manicuristas/esteticistas en paralelo) tienen mismo perfil operativo que clinica multi-recurso. Ruta de diversificacion 2027 reforzada.

### Dashboard actualizado 1 Jun

| Metrica | Valor |
|---|---|
| Clientes activos | **3** (Guevara $35, Yeni $35, Ecoclinicas $35) + Medilaser $75 desconectado |
| MRR facturado | **$180** |
| MRR efectivo | **$105** sin Medilaser / $180 si reconecta (improbable) |
| Churn proyectado | -$105-$180 en 1-3 meses (Yeni, David, Paredes salen) |
| MRR pos-churn (probable) | **$35** (solo Guevara) |
| Burn stack | ~$65/mes |
| Cash flow pos-churn | **-$30/mes** — sostenible muchos meses, no es negocio |
| Hito $1,500 | Faltan $1,465 — requiere 8-10 clientes del ICP nuevo |
| Pipeline | PAUSADO hasta Sprint Coexistence + lista 20 clinicas listas |
| Ads | PAUSADOS permanentes — reactivar cuando haya caso de estudio ICP nuevo |

### Tareas activas (post-1 Jun)

- [ ] **#36** Sprint Coexistence — 10 items tecnicos. Ver `estado-dev.md` para detalle. ETA: 4 Jun
- [ ] **#37** Inventariado 20 clinicas TGU con Warhol — prompt enviado a Gemini. Diego va recopilando lista en paralelo
- [ ] **#38** Test Coexistence end-to-end con Demo Bot verified + numero personal Diego ANTES de cliente real
- [ ] **#39** Documentar playbook cero-downtime: sandbox 3 dias para asistente + ventana viernes 7pm + pre-load contactos via Coexistence sync (Gemini sugiere este patron)
- [ ] **#40** Verificar requisito version WA Business App 2.24.17+ del cliente antes de cada onboarding futuro
- [ ] **#41** Una vez Sprint Coexistence cerrado: identificar primera clinica del ICP nuevo de la lista TGU para onboarding piloto
- [ ] **#42** Reactivar ads ~Jul-Ago 2026 con caso de estudio del primer cliente ICP nuevo (cuando haya 4-6 semanas de uso real)

### Riesgos activos (actualizado 1 Jun)

1. **ALTO:** Sprint Coexistence excede 17h estimadas (probable factor sorpresa con `smb_message_echoes`/`smb_app_state_sync` que son types nuevos en webhook). Mitigacion: tests con Demo Bot antes de cliente.
2. **ALTO:** History flood saltea filtro `isHistoricalMessage` y dispara bot a mensajes viejos en cliente real. Mitigacion: bot OFF al conectar, transcription OFF la primera hora.
3. **MEDIO:** Lista 20 clinicas TGU no es suficiente (clinicas multi-recurso reales en TGU son < 10). Mitigacion: salir a SPS rapido + considerar horizontal salones antes.
4. **MEDIO:** Capacidad Diego < 3h/dia + sprint + onboarding piloto. Mitigacion: sprint termina antes de buscar cliente nuevo.
5. **BAJO:** WA Business App version < 2.24.17 en clinicas mas viejas. Mitigacion: validar pre-onboarding.

### Para retomar proxima sesion estrategia

Estado mental al cierre 1 Jun: Sprint Coexistence aprobado. Diego entra a modo-dev mas tarde HOY para arrancar. Primer test en Demo Bot, no cliente real. Lista TGU corre en paralelo (Warhol + Diego con outputs de Gemini Deep Research).

**Primera pregunta a hacer al retomar:** ¿como fue el sprint Coexistence? ¿Cuantos items cerrados? ¿Hay clientes potenciales de la lista TGU para validar el pitch?

**Decision pendiente proxima sesion:** una vez Coexistence funcional, ¿precio entrada para clinica multi-recurso sigue siendo $150 flat o se ajusta con aprendizajes Skin Medic? Validar si "$150 sin demo previo" repite o se requiere demo guiada.

---

## Sesion 2 Jun 2026 — Decision: construir el motor de agendamiento multi-recurso (el producto real)

**Contexto entrante:** Coexistence funciona en numero de prueba de Diego. Diego planteo la duda: ¿desarrollamos mas la plataforma antes de buscar clientes, o ya estamos listos? Preocupacion concreta: el flujo de crear cita es engorroso para clinica multi-recurso (frontdesk saltando entre 6-7 calendarios) + el tema del numero de equipos.

### El debate (build vs sell) y como evoluciono

- Mi postura inicial (COO): NO serializar. Construir solo la vista combinada barata (~3-4h) + prospectar en paralelo, diferir el flujo perfecto (25-30h) hasta validar con cliente real. Riesgo: construir 5 semanas apostando a un N=1 muerto (Skin Medic).
- Diego empujo de vuelta con buen razonamiento: el ICP ES multi-recurso → el flujo NO es feature, es el loop central del producto. Mercado chico e implacable (~20 clinicas TGU) premia calidad sobre velocidad.
- **Punto que cerro el debate (Diego):** "¿que hubiera pasado si tuvieramos Coexistence con Skin Medic? Habriamos tenido que construir esto igual, porque sino solo seria otra plataforma de calendario como la que tienen." Correcto. Esto invalido mi objecion de "especulacion": el motor NO es para Skin Medic, es para TODA la categoria del ICP. Skin Medic solo lo revelo.

### Decisiones tomadas

1. **Construir el motor de agendamiento multi-recurso AHORA, antes de buscar clientes.** No es especulacion — es el producto-categoria. Ver [[motor-agendamiento-es-producto]].
2. **Reframe de que ES OrionCare:** Gancho (Coexistence + bot que contesta) = adquisicion. **Motor de agendamiento = retencion / foso / justificacion del $150.** El inbox consigue al cliente; el motor lo amarra. Un competidor copia el bot en un trimestre; el motor no.
3. **Tesis del dolor (estrella polar del scope):** fuga bilateral = pacientes que abandonan ("nunca te contestan") + recursos ociosos. Cada feature del flujo se justifica solo si reduce una de las dos fugas. El medico solo no tiene este dolor → valida el ICP. Calendario multi-recurso = table stakes (Mendoza ya lo tenia); bot que contesta = el diferenciador. Mensaje de venta = "nunca te contestan".
4. **Modelo de datos cerrado** (con datos reales del cuestionario, seccion A4):
   - `servicios`: nombre, duracion_min, buffer_min (default 10 = limpieza entre pacientes), equipo_tipo_id (FK nullable), requiere_consulta_previa (regla A3.4: paciente nuevo → Mendoza), precio (bot da precios, B5.4)
   - `equipos`: nombre, **cantidad** (la columna que ES el constraint) → `3 laser, 2 radiofrecuencia, 1 CO2, 1 frag, 6 cabinas, 1 consultorio`
   - `profesional_servicios`: M2M = la skill matrix
   - Disponibilidad = 3 contadores (profesional libre + cabina < 6 + equipo_tipo < cantidad). Sin solver, sin optimizacion.
   - **Hallazgo clave:** la CABINA (6) es probablemente el cuello de botella real, no la maquina. Diego solo pensaba en maquinas. Cabina = otro recurso fungible con cantidad. Buffer 10min bloquea cabina+persona, NO la maquina (A4.6: sin cooldown). El buffer es un gap competitivo (su plataforma no lo puede asignar).
5. **Secuenciador multi-procedimiento = v1** (Diego eligio, A5.3 lo respalda: multi-procedimiento es comun). **Riesgo de scope #1** — convierte 5 semanas en 7. Definicion de "done" estricta: encadenar procedimientos consecutivos del mismo paciente en una visita, greedy primero-disponible, sin optimizacion global del dia. Si se infla → recortar a v2.
6. **NLP / lenguaje natural del bot = DIFERIDO hasta primer cliente.** Entrenar con mensajes reales, no inventados (alinea [[inbox-only-primera-semana]] + [[no-data-inferida]]). El motor entrega valor dia 1 sin NLP (humano + flujos estructurados/botones).
7. **Primer cliente inbox-only → analisis de mensajes semana 1 = triple proposito:** (a) training data del bot, (b) comparativa de valor para el cliente (ataca riesgo "mes 1 sin valor visible" que fue factor con Skin Medic), (c) caso de estudio para reactivar ads.
8. **Prospeccion en paralelo = OBLIGATORIA.** No para decidir si construir (ya decidido) sino para validar que la estructura de recursos generaliza. Skin Medic (6 cabinas / 3 laser) no es universal: clinica dental tiene sillas, estetica chica tiene 3 cabinas. El modelo (recetas + cantidades) es universal; los numeros no.

### Hallazgo: el cuestionario Skin Medic SI tiene datos reales

Diego creia que no estaba la data de equipos. Si esta (seccion A4 contestada). Es oro para el modelo y como caso de prueba de generalizacion.

### Riesgos activos (actualizado 2 Jun)

1. **ALTO (nuevo):** Secuenciador multi-procedimiento infla las ~5 semanas a 7. Mitigacion: definicion de done estricta, fallback a v2.
2. **MEDIO (nuevo):** Estructura de recursos de Skin Medic (6 cabinas/3 laser) puede no generalizar a otras clinicas del ICP → modelo cerrado en piedra prematuramente. Mitigacion: validar con 1-2 prospectos reales mientras se construye.
3. **MEDIO:** Capacidad Diego <3h/dia + 5-7 semanas de build sin ingreso nuevo. Cash flow pos-churn -$30/mes lo aguanta muchos meses (no es bloqueador, pero el reloj corre).
4. **MEDIO (de 1 Jun, vigente):** Lista 20 clinicas TGU insuficiente (multi-recurso reales < 10). Mitigacion: SPS + horizontal salones.
5. Riesgos tecnicos de Coexistence (1 Jun) se mantienen hasta primer onboarding real.

### Tareas activas (post-2 Jun)

- [ ] **#43** Bajar el motor de agendamiento a spec tecnico en `/modo-dev` (secuenciador acotado, horas reales, definicion de done)
- [ ] **#44** Prospeccion en paralelo (Warhol + lista TGU) — conversaciones validan estructura de recursos antes de cerrar el modelo
- [ ] **#45** Primer cliente → inbox-only semana 1 → analisis de mensajes (training bot + comparativa cliente + caso de estudio)
- [ ] Vigentes de 1 Jun: #38 (test Coexistence end-to-end), #39 (playbook cero-downtime), #41 (identificar primera clinica ICP), #42 (reactivar ads ~Jul-Ago con caso de estudio)

### Para retomar proxima sesion

**Estado mental al cierre 2 Jun:** Modelo conceptual y de datos del motor cerrado y validado contra datos reales. Diego pasa a `/modo-dev` cuando quiera para el spec tecnico. Prospeccion corre en paralelo.

**Primera pregunta al retomar:** ¿avanzo el spec del motor en dev? ¿El secuenciador se mantuvo en estimacion o se inflo? ¿Hubo conversaciones de prospeccion que confirmen/refuten que la estructura de recursos generaliza?

---

## Sesion 7 Jun 2026 — Hueco de modelado cabina vs equipo (Riesgo #2 materializado)

**Contexto entrante:** Motor completo (Fases 0-6) + Coexistence + rediseño UI Nueva Cita + optimizacion performance (calendario ICP 2430→820ms) todo en prod (3-6 Jun). Pendiente solo QA en vivo de Diego. Prospeccion en paralelo (#37 lista TGU) sin update visible.

**Pregunta de Diego que destapo el hueco:** ¿las cabinas solo sirven para laser o para multiples procedimientos? ¿El equipo es fijo a la cabina o se mueve? Intuyo (N=1, no vi a nadie cargando equipos pesados en Skin Medic) que es fijo. "Tengo algo en mente que puede estar fallando en nuestra logica."

**Hallazgo — su instinto es correcto, y la data lo confirma:**
- El motor modela disponibilidad como **3 contadores independientes** (profesional + cabina<6 + equipo_tipo<cantidad). Esto solo es valido si el equipo es **portatil**. Si es **fijo** (cabina-laser = la maquina), el modelo **sobreestima disponibilidad** y promete citas imposibles (5 facials ocupan 5 cabinas, la libre no tiene laser, pero el contador dice "laser disponible"). = la fuga exacta que el motor existe para tapar.
- **La data nunca lo valido:** cuestionario A4.5 ("¿cabina especifica?") = **sin respuesta**; A4.2 dio conteos (2 RF, 3 laser, 1 CO2, 1 frag) sin mapear equipo→cabina; Diego anoto que no entendia bien como operan. Extra: **7 maquinas / 6 cabinas** = al menos una cabina con 2 equipos (otra sobre-disponibilidad).
- **Esto ES el Riesgo MEDIO #2 del 2 Jun materializandose:** modelo cerrado en piedra sobre un N=1 que ya esta muerto (Skin Medic).

**Decision tomada:**
1. **NO reconstruir sobre otra suposicion.** Diego va a averiguar la fisica real (¿maquinas fijas o moviles? ¿que cabina tiene que?) con Dulce/Mendoza o prospectos, idealmente 2-3 clinicas, ANTES de tocar codigo.
2. Modelo correcto que generaliza a ambos mundos: **cabina = recurso atomico con capacidades instaladas**; procedimiento necesita cabina cuyas capacidades lo cubran. Generaliza a dental (sillas) y estetica chica. Fix acotado (capacidades por cabina + asignacion procedimiento→cabina), no reescritura del motor.
3. Memoria durable actualizada en [[motor-agendamiento-es-producto]] (seccion "HUECO DE MODELADO ABIERTO").

**Pendiente:**
- [ ] **#46** Diego: averiguar fisica real de cabinas/equipos (fijo vs movil + mapeo equipo→cabina) con Dulce/Mendoza/prospectos, 2-3 clinicas para confirmar que generaliza
- [ ] **#47** Verificar como computa hoy `_shared/availability.ts` (confirmar si el bug ya esta en prod vs solo nota conceptual) — antes de ajustar
- [ ] Cuando #46 cierre: ajustar modelo de disponibilidad (capacidades por cabina)

**Riesgo #2 (2 Jun) RE-CONFIRMADO y elevado a accionable:** la estructura de recursos no se valido fuera de Skin Medic. Es el mismo hueco. Mitigacion ahora concreta = #46.

### Onboarding — playbook v1 acordado (7 Jun)

Diego planteo el flujo de onboarding. Tras revision COO, 3 decisiones cerradas:

1. **Coexistence = unico metodo de vinculacion de ahora en adelante.** La migracion destructiva (que mato a Skin Medic) NO vuelve como opcion. "Vincular" = QR de Coexistence, zero downtime. Ver [[coexistence-unico-metodo]].
2. **Cutover limpio** (no doble-sistema): cargar citas futuras del sistema viejo a OC antes de activar, para que el motor tenga la foto completa y no doble-bookee una cabina. El doble-sistema dispara el "bug visible" que quema la oportunidad.
3. **Presencial las 2 visitas, primeros 10 clientes.** Decision de Diego: lo presencial es el instrumento de investigacion de campo a N<10 (resolver #46, validar supuesto FB-logueado, confirmar generalizacion de recursos) + abre oportunidades. Remoto se gana el derecho despues (~50% menos costo: 1 visita + activacion remota), diferido post-10.

Playbook completo (pre-visita checklist + visita 1 instalacion + semana 1 calibracion silenciosa + visita 2 activacion cutover) guardado en [[onboarding-playbook]].

**Huecos que el playbook cierra (eran riesgos del plan original de Diego):**
- "Vincular" ambiguo → forzado a Coexistence.
- Doble-sistema → doble-booking de cabina → cutover limpio + carga de futuras.
- "FB logueado en todas las clinicas" = supuesto no validado → checklist pre-visita.
- Irse antes de confirmar el echo (`smb_message_echoes`) → "no irse hasta ver round-trip".
- Creds por WhatsApp en texto plano → tipear directo + super-admin custodio.
- "Mejorar NLP en 1 semana" → alcance realista = top 10 FAQs + prompts.

**Tareas nuevas:**
- [ ] **#48** Definir donde viven los emails `admin@NOMBRECLINICA` (¿alias Zoho?) + su 2FA, antes de escalar onboarding
- [ ] **#49** Resolver el metodo de carga de citas futuras en cutover (manual con asistente vs import rapido si son muchas)

---

## Sesion 15 Jun 2026 — Semana muerta + reframe motor de crecimiento + prospeccion reiniciada

**Contexto entrante:** 8 dias sin update (7-15 Jun). Diego confirmo: **semana muerta** — familia/otras cosas, el proyecto no avanzo. Sin culpa: cash flow pos-churn -$30/mes lo permite, familia es prioridad. Costo real = momentum, no dinero.

### Diagnostico COO

**El lado de ventas del negocio esta en CERO, no en pausa.** Confirmado por Diego en sesion:
- Lista 20 clinicas TGU (#37): **hay que reiniciar desde cero** — el prompt Gemini del 1 Jun no produjo lista real.
- Acceso ICP: **ninguno** — toca abrir en frio.
- Motor 100% construido (Fases 0-6 en prod) + Coexistence. Mercado 100% sin tocar.

Todo el riesgo del negocio concentrado en un punto: cero validacion de demanda del ICP nuevo desde que se decidio construir el motor (1 Jun = 15 dias). El hueco de modelado cabina/equipo (#46, Riesgo #2) **solo se cierra hablando con clinicas reales** — y eso no ha pasado.

### Reframe estrategico (decision clave de la sesion)

**El motor de crecimiento del business plan (ads → leads → Warhol convierte) esta MUERTO para este ICP.** Audiencia demasiado chica (ya validado: ads pausados permanentes, AD-006 70-90% basura).

**El motor real ahora = venta concierge mano a mano sobre lista corta y nombrada. No es funnel, es caceria selectiva.** Los numeros lo obligan:
- Hito $1,500 = 8-10 clientes ICP a ~$150
- TAM realista = ~20 TGU + SPS/Ceiba + salones grandes = ~30-40 alcanzables
- = 25-30% penetracion de TODO el mercado. Cada conversacion pesa. No hay volumen que compense.

**Implicacion para el rol de Warhol:** deja de ser "convertir leads que llegan" → pasa a "cortejar una lista de ~15 clinicas especificas". Trabajo y ritmo distintos.

### Decisiones tomadas 15 Jun

1. **Build congelado** hasta tener 1 conversacion con clinica ICP que confirme o refute el modelo de recursos (#46). El motor NO necesita mas codigo — necesita un humano del ICP enfrente.
2. **Dos vias de prospeccion en paralelo, mismo formato de salida** (se cruzan sin duplicar; coincidencia en ambas = candidata mas fuerte):
   - **Via manual (Warhol):** brief ejecutable creado. Instagram + Google Maps, 15-20 clinicas TGU, ~2h. Salida = filas para el G-Sheet existente (estado `Nuevo`).
   - **Via Gemini Deep Research:** prompt nuevo redactado (mejor que el del 1 Jun: tabla forzada con columnas exactas + link verificable por fila + prohibido inventar + nota de cobertura). Ataca el fallo previo de "rellenar con basura plausible".
3. **Contacto = investigacion, no venta.** Primera conversacion (apertura consultiva, tono Honduras) hace doble trabajo: (a) mide dolor "nunca te contestan", (b) resuelve #46 (fisica real cabinas/equipos). Mensaje de apertura pendiente de redactar (diferido hasta tener primeras clinicas en lista).
4. **ICP de la lista incluye salones de belleza grandes** (no solo medico) — mismo perfil multi-recurso, refuerza ruta horizontal 2027.

### Trigger definido (el reloj)

Si en **3-4 semanas** de caceria selectiva sobre mercado de <40 clinicas no sale **1 clinica ICP interesada** → NO es señal de "construir mas", es señal de que la tesis ICP/mercado necesita re-examen. El codigo ya no es la variable; la validacion de demanda si.

### Entregables de la sesion

- `docs/ventas/brief-lista-icp-tgu.md` — brief en markdown
- `docs/ventas/Instrucciones_Lista_Clinicas_Warhol.docx` — version Word legible para Warhol (lenguaje simple, cajas de color, tablas, ejemplo Skin Medic como ancla)
- `generar_brief_warhol.py` — script para regenerar el Word si hay ajustes
- Prompt Gemini Deep Research (en hilo de la sesion, falta guardarlo en archivo si se quiere reusar)

### Tareas activas (post-15 Jun)

- [ ] **#37 (reactivada)** Construir lista 15-20 clinicas ICP TGU — Warhol (brief Word listo) + Gemini (prompt listo). Cruzar ambas listas.
- [ ] **#50** Redactar mensaje de apertura en frio (WhatsApp, tono Honduras, investigacion + abre puerta) cuando caigan las primeras clinicas
- [ ] **#46 (vigente, ahora desbloqueable):** resolver fisica cabinas/equipos en las conversaciones de investigacion
- [ ] **#51** Definir trigger checkpoint: ~6-13 Jul evaluar si salio 1 clinica ICP interesada
- Vigentes: #38 (test Coexistence E2E), #39 (playbook cero-downtime), #47 (verificar bug availability.ts en prod), #48-49 (onboarding)

### Riesgos activos (actualizado 15 Jun)

1. **ALTO (elevado):** prospeccion no arranca / mercado <40 clinicas no produce 1 ICP interesado en 3-4 sem → tesis ICP en duda. Mitigacion: dos vias paralelas + trigger explicito.
2. **ALTO:** momentum perdido se vuelve cronico (1 semana muerta → varias). Mitigacion: arranque de bajo esfuerzo (lista barata, no Gemini-only que ya fallo 2x).
3. **MEDIO:** hueco #46 (cabina vs equipo) sigue abierto, motor cerrado sobre N=1 muerto. Mitigacion: investigacion en cada conversacion.
4. **MEDIO:** capacidad Diego <3h/dia. Mitigacion: prospeccion delegable a Warhol; Diego solo en conversacion tecnica.

### Para retomar proxima sesion estrategia

**Estado mental al cierre 15 Jun:** dos vias de prospeccion armadas y listas para ejecutar. Build en pausa consciente. Diego pasa a `/modo-dev` ahora (no para mas motor — probablemente QA/fixes o verificar #47).

**Primera pregunta al retomar:** ¿Warhol y Gemini produjeron lista? ¿Cuantas clinicas "Si"/"Tal vez"? ¿Se cruzaron las dos vias? ¿Hubo primera conversacion de investigacion? ¿Que dijo sobre cabinas/equipos (#46)?

---

## Sesion 27 Jun 2026 — Re-examen de la tesis de negocio + smoke test de demanda

**Contexto entrante:** 12 dias desde 15 Jun. Trigger #51 corriendo (checkpoint 6-13 Jul). Cliente unico activo: Guevara $35 (otros 3 marcados perdidos 22 Jun). Diego abrio con pregunta GLOBAL, no tactica: ¿apuntamos a un segmento demasiado complejo?

### El hilo (5 turnos de exploracion estrategica)

Diego empujo progresivamente a repensar el MODELO del negocio, no la tactica de clinicas:
1. ¿Podemos trabajar otros rubros? (esta haciendo un PMS para el hotel de su hermana) → "¿cuanta gente hay asi, negocios chicos que quieren digitalizarse?"
2. ¿El ICP medico/clinica es demasiado complejo? Wilmer se engancho con plataforma BASICA.
3. Buscar clientes tipo Wilmer en varios rubros, "combos" de herramientas (calendario+WhatsApp).
4. Smoke test: regalar landing page para descubrir que dueños/rubros existen, luego upsell.
5. Canal: Reddit (insiste) porque FB grupos = marketplace saturado. (Diego FUE a mirar FB en campo.)

### Insights clave (COO)

1. **Wilmer es el dato mas importante del memory y la estrategia lo ha ignorado.** Unico cliente feliz ($35, NPS 9.5, 2 meses sin tocar, refiere), usa ~10% de la plataforma (calendario+recordatorios), le da IGUAL el bot. **El pivote al motor multi-recurso $150 abandono la unica config validada que retuvo a un cliente feliz.** "Sin dolor" del medico independiente ([[icp-individual-fuera]]) era juicio sobre el BOT, no el calendario. Confundimos "no necesita el bot" con "no es cliente".

2. **3 modelos que Diego estaba mezclando:**
   - A. SaaS vertical (clinicas) — lo que hay. Leverage = reuso.
   - B. SaaS horizontal mismo-motor (clinica/salon/hotel-lite/gym) — [[diversificacion-2027]] adelantada. Leverage preservado SI el motor encaja.
   - C. Agencia/bespoke por cliente — **TRAMPA solo:** cola de soporte se acumula (codebase distinto no amortiza) + vende horas (sin MRR floor) + Claude no multiplica venta/soporte. "Calculadora rosada" (bespoke unico) = sin segundo comprador.
   - Forma ganadora = **Simple + COMUN + recurrente + vendido a muchos.** El core simple es MAS horizontal que el motor (sirve a todo negocio de citas), no menos.

3. **La ADQUISICION siempre fue el cuello de botella, nunca el producto.** Wilmer llego A-PULSO (lista manual 1-a-1) = canal MENOS escalable y unico que ha funcionado. Ads a medicos fallaron (audiencia chica). Producto simple validado; lo no resuelto = conseguir clientes barato.

4. **Lo simple es MAS viable para Diego solo:** los 175 del modelo simple solo son sobrevivibles porque casi no llaman (fire-and-forget, Wilmer lo prueba). Los 50 del motor (alto touch + onboarding presencial + bot) lo saturan.

5. **Patron de evasion nombrado (3x):** cada turno propuso un test mas comodo y menos informativo (otros rubros → combos → bespoke simple → landing gratis en Reddit). PERO en los ultimos turnos convergio a un funnel legitimo (carnada→calificar→upsell) y fue a mirar FB en campo. Progreso real.

### Decisiones / acciones

1. **Correr smoke test de demanda barato** (descubrir si existen dueños reales y de que rubros). NO mide willingness-to-pay (eso es despues, en el DM/upsell).
2. **Diego eligio: regalar 1 landing page en Reddit.** Su post original fue bajado por la puja L.250 = venta. COO reescribio el post: 100% gratis (cumple reglas + test mas limpio), sin subasta, con preguntas de calificacion metidas ("¿que rubro?", "¿como conseguis/atendes clientes hoy?" = destapa dolor de citas/WhatsApp), nota hosting Vercel gratis + dominio aparte que ellos pagan pero Diego configura sin costo. **Post final entregado, listo para publicar.**
3. **COO recomendo (no ejecutado aun) canales superiores en paralelo:** ad FB targeteado $20-30 (brinca la saturacion organica que Diego vio; en HN todos estan en FB) + la HERMANA (hotel = prospecto ICP real, caliente, gratis, rubro nuevo). Diego difirio el ad FB.
4. **Criterio de exito del test Reddit:** ✅ señal = ≥5 dueños reales de ≥3 rubros con dolor de citas. ❌ ruido = devs, extranjeros, cazadores de gratis. <2 reales → canal flojo confirmado, volcar a FB ad + hermana.
5. **Prediccion COO anotada:** Reddit traera mayormente pares y cazadores de gratis, casi cero ICP. Costo $0 → que la realidad arbitre. La landing construida se reusa como demo (hermana + respondientes FB), no se desperdicia.

### Tension estrategica abierta (a resolver con datos)

Dos apuestas que compiten por el tiempo escaso de Diego:
- **Motor/clinica $150:** ARPU alto / pocos / alto touch / NO validado / mercado <40 TGU.
- **Simple horizontal $35:** ARPU bajo / muchos / bajo touch / VALIDADO (Wilmer) / mercado enorme (todo negocio de citas).
No puede correr ambas a fondo solo. Smoke test + hermana deben inclinar la balanza con datos, no teoria. Ver [[re-examen-tesis-negocio]].

### Tareas activas (post-27 Jun)

- [ ] **#52** Diego publica el post de Reddit (gratis, reescrito) + revisa reglas del sub (r/Honduras > r/emprendedores)
- [ ] **#53** Construir 1 landing page para el ganador → reusar como demo
- [ ] **#54** DM a dueños reales que comenten (aun los que no ganan): "¿como llevas tus citas hoy?" = abre upsell
- [ ] **#55** Trabajar el caso de la hermana (hotel) como probe de generalizacion del motor + descubrimiento de dolor. Definir: ¿PMS real (NO es el motor) o reservas+WhatsApp+recordatorios (SI es el motor)?
- [ ] **#56** (diferido, recomendado) Ad FB targeteado $20-30 mismo gancho — soltar en paralelo cuando Diego quiera
- [ ] Vigentes: #46 (fisica cabinas/equipos), #51 (checkpoint trigger 6-13 Jul), #37 (lista TGU), #38/#39 (Coexistence)

### Riesgos activos (actualizado 27 Jun)

1. **ALTO:** test de Reddit confirma canal equivocado y se pierde otra semana sin validar demanda. Mitigacion: criterio de exito definido + hermana (canal caliente) en paralelo + prediccion explicita para aprender rapido.
2. **ALTO:** posible error del pivote (motor $150 abandono la config validada de Wilmer) — pero NO se confirma ni revierte sin datos. NO reorganizar con N=1.
3. **MEDIO:** patron de re-teorizar el modelo en vez de contactar prospectos reales (3 sesiones, ~26 dias desde 1 Jun, cero conversaciones ICP). Mitigacion: esta sesion produjo accion concreta (post listo) + hermana = contacto real inmediato.
4. **MEDIO:** capacidad Diego <3h/dia. Mitigacion: Warhol publica/gestiona Reddit; hermana es warm.

### Para retomar proxima sesion

**Estado mental al cierre:** post de Reddit listo para publicar. Diego cierra para ver resultados. Tension estrategica (motor $150 vs simple horizontal $35) abierta, a inclinar con datos.

**Primera pregunta al retomar:** ¿Se publico el post? ¿Cuantos comentarios, de que rubros, cuantos dueños REALES vs ruido (vs la prediccion)? ¿Hubo DMs con dolor de citas? ¿Se avanzo con la hermana (hotel = PMS real o motor)? ¿Inclina hacia simple-horizontal o seguimos motor-clinica?

---

## Sesion 30 Jun 2026 — Correccion de datos + primera caceria ICP real + Reddit muerto

**Contexto entrante:** 3 dias desde 27 Jun. Diego abrio corrigiendo el dashboard (burn mal calculado) y pidiendo verificar el "Wilmer usa 10%". Luego descargo una salida de campo (29 Jun) + resultado del smoke test de Reddit.

### Correcciones de datos (verificadas via SQL)

1. **Cash flow real = +$15/mes, NO −$30.** El "~$65 burn stack" venia del business plan viejo (proyeccion a 175 clientes: Supabase Pro + Vercel + Twilio). Realidad hoy: free tiers + fuera de Twilio → unico costo operativo = **Claude $20**. Ingreso $35 Wilmer − $20 = **+$15/mes**. No estamos quemando; el reloj de presion es momentum/oportunidad, no plata.

2. **El "Wilmer usa 10% / le da igual el bot" es FALSO.** Radiografia SQL de su org (`c7234d61-1586-42ae-bc0a-db8abb96a75c`):
   - **Citas:** 121 (memory decia 85), recurrentes los 6 meses, ultima creada 29 Jun, 18 en ult. 30 dias. Confirmadas 64.
   - **Recordatorios:** 100 reminder_24h, 98 confirmaciones, **41 pacientes respondieron confirmando** (el flujo Bukele/[[confirmacion-con-consecuencia]] funciona en campo).
   - **BOT:** 245 logs, 42 sesiones, los 5 meses, ultimo 29 Jun. Intents booking 64, faq 49, handoff 12; llega a estados completed/booking_confirm. **El bot SI se usa.**
   - Lo que NO usa: promociones (1), inbox manual (14 conv), calling (0). = **la capa cara construida para el ICP multi-recurso/asistente.**
   - **Salvedad honesta:** no se puede probar via SQL cuantas citas creo el bot vs a mano (appointments no guarda origen). Pero el paciente usa el bot para agendar, indiscutible.
   - **Correccion fina del "10%":** Wilmer usa ~100% del CORE simple (calendario+recordatorios+confirmacion+bot) y ~0% de la capa cara. No es que use poco el producto — es que el producto le CRECIO una capa que el cliente validado no toca. **Esto afina y en parte da vuelta la tesis del 27 Jun: el bot es parte del core barato validado, NO el lujo. El lujo no validado es el motor multi-recurso $150 (N=0 real).**

3. **Wilmer es DENTAL** (citas: Limpieza Dental, Extraccion, Cementacion). Dato clave para el beachhead.

### Caceria de campo 29 Jun (Edificio Artemisa + dentales) — primeras conversaciones ICP desde 1 Jun

- **Dra. Jacome** (medicina estetica, 2 anos en edificio). Asistente vio demo, MUY de acuerdo. Dra pidio presentacion pero **la plataforma no cargo (bug del page-tracking de esta rama)** → quemo la demo. **Bug YA resuelto** (Diego volvio a casa, lo arreglo, recogio iPad). Pendiente: volver con presentacion + agendar con asistente.
- **Dra. Grecia Rodriguez** (Smile Design, dental) — INTERESADA. Pidio control de planes de pago + landing page (Diego prometio ambas — ver trampa abajo).
- **CDO** (dental) — usan Dentalink, ~$60 por 2 medicos = **$30/medico**. +2 dentales mas con Dentalink; una se quejo: **"no es mobile-friendly".**
- **Dr. Luis Avila / Lumina Dental** — lo piensa, vuelve miercoles.
- **Dra. Fany Urrea** — contrato otra SaaS hace 1 sem, paga 800 Lps (~$32). Amiga de Grecia. Volver en 1 mes.
- **Dr. Ali Alvarado** (implantes) — va a invertir en pauta, posible bot. Conexion, futuro.
- **CDH / Dr. Luis Avila** — flujo no muy alto pero **"es muy sencilla" (repitio 2x)**. Vuelve jueves, hablara con colegas de CDH.
- Una asistente: volver 20 Jul (medicos fuera de ciudad).

**Patron:** el motor multi-recurso $150 NO salio ni una vez. Lo que vende = **simplicidad + mobile + bot**. Cluster denso = **dental**. (Sesgo de lugar: el edificio era de medicos solos/multi-medico, no multi-recurso; es posible que multi-recurso exista en otro lado — pero lo simple convierte HOY.)

### Smoke test Reddit — veredicto

Prediccion del 27 Jun confirmada: 4 comentarios, top-engagement fue un par criticando el uso de IA (9 upvotes), cero dueños reales con dolor de citas. Unico "interesado" = influencer (fuera de tesis). **Reddit muerto como canal de descubrimiento de ICP** (criterio pre-definido <2 reales → canal flojo). Victoria del proceso: test $0, arbitrio en 3 dias, sin apego. **Calle dirigida >> online amplio** (8 clinicas/1 salida vs ~0).

### Decisiones tomadas 30 Jun

1. **Dental = beachhead candidato** (convergencia: Wilmer es dental + cluster Artemisa). El producto a vender = core simple, cuña **mobile + WhatsApp/bot + simple** contra Dentalink (fuerte en profundidad clinica, DEBIL en mobile — no pelear en su terreno).
2. **REGLA: no se construye feature vertical/de rama (odontograma, planes de pago, recetas, historial) hasta 3+ clientes PAGANDO aparte de Wilmer que lo pidan.** Libro de demanda = conteo de votos por feature; 3+ marcas → se gradua a build, financiado con MRR. Voto fuerte = pagando, no "interesado". Ver [[no-feature-vertical-sin-3-clientes]]. **Trampa pisada:** Diego prometio pagos+landing a Grecia → reframe: "esta en roadmap, te dejo el mes gratis con lo que hay".
3. **Primer mes gratis = enganche de cierre** ([[primer-mes-gratis-enganche]]). Landing gratis = enganche pasivo complementario.
4. **Asistentes = puerta de entrada, ya NO bloqueo.** Campo 29 Jun: la asistente de Jacome vio demo y la quiere. El miedo a reemplazo (que mato el pitch de mayo) desaparecio con el pitch nuevo. Matiza [[admin-edificio-no-prospecta]] (admins siguen sin servir; la champion=asistente abre, y ahora sin friccion).
5. **"Wilmer" es una SITUACION, no un rubro:** profesional solo, reservas le caen a el/su familia, quiere quitarse el peso, necesidades simples (calendario+recordatorios+bot), fire-and-forget. La unidad replicable de adquisicion es esa persona, cruza especialidades.
6. **Ana Suazo (influencer 100k IG, gano la landing gratis de Reddit):** NO es cliente (sin dolor de citas) ni su audiencia es ICP. Manejo: (a) construir la landing como **PLANTILLA reusable** (sirve a Grecia + enganche futuro), pocas horas, no bespoke; (b) su valor = su RED (hace publicidad a hoteles/turismo → dolor de reservas), pedir intros DESPUES de entregar, no promo a followers. No pivotar a influencer marketing.
7. **Hospitalidad/reservas = hilo abierto (no pivote):** sale por hermana (hotel) + red de Ana. Refuerza "persona, no rubro". Sondear gratis; si 2 hoteleros confirman el mismo dolor, mirar en serio.

### Tension estrategica (actualizada)

La balanza del 27 Jun (motor $150 vs simple horizontal $35) se inclina hacia **simple-horizontal** con la data de hoy: Wilmer usa el core simple completo (incl. bot), el campo vota simple+dental, el motor $150 sigue N=0. NO se mata el motor (ya construido, ahi queda si aparece multi-recurso), pero deja de ser la apuesta principal.

### Que probaria conseguir la "Wilmer-pediatra" (analisis pedido por Diego)

- **SI prueba:** la persona es vertical-agnostica (dental→pediatria, mas fuerte que 2 dentistas) → TAM se ensancha de "clinicas dentales TGU" a "todo profesional solo con peso de reservas". De-risquea QUIEN + pitch + retencion.
- **NO prueba:** el CANAL. Ambos llegaron por medios no escalables. Saber a quien vender ≠ encontrarlos barato. **La velocidad sigue topada por las horas de Diego (~1-2 clientes/mes manual → hito $1,500 en 6-9 meses).**
- **Lo que desbloquea para velocidad:** vuelve racional invertir en canales repetibles — loop de referidos (CAC≈0, compone), ad FB targeteado ahora escribible, Warhol corriendo script de calificacion. El siguiente experimento post-pediatra debe ser de CANAL, no mas caceria manual.

### Tareas activas (post-30 Jun)

- [ ] **#57** Volver a Jacome con presentacion (iPad, plataforma ya arreglada) + agendar con asistente
- [ ] **#58** Cerrar a Grecia/Smile Design en core simple + mes gratis (reframe pagos/landing como roadmap)
- [ ] **#59** Volver a Lumina (mie) y CDH (jue); seguimiento Urrea (~1 mes, Grecia puede empujar), Alvarado (futuro), asistente (20 Jul)
- [ ] **#60** Verificar lead pediatra: ¿asistente hoy? ¿quien maneja reservas? ¿le pesa? (clasificador Wilmer)
- [ ] **#61** Construir landing como PLANTILLA reusable (Ana = 1ra instancia, reuso Grecia + futuro). Cap: pocas horas, no bespoke
- [ ] **#62** Tras entregar landing a Ana: pedir intros a su red de hoteles/turismo (dolor de reservas)
- [ ] **#63** Sistema de captura de prospectos en campo (nota de voz por clinica → volcar a docs/ventas/leads). NO Excel nuevo por edificio; usar infra existente
- [ ] **#64** "Lo de Eliza" — pendiente, Diego lo maneja en otra sesion
- [ ] **#65** Definir primer experimento de CANAL (voto COO: loop de referidos primero, ad chico en paralelo) — cuando haya 2da cuenta feliz
- Vigentes: #46 (fisica cabinas/equipos — ahora secundario si dental/simple gana), #51 (checkpoint trigger), #55 (hermana hotel = PMS real o motor)

### Riesgos activos (actualizado 30 Jun)

1. **ALTO:** la velocidad de adquisicion sigue sin resolver — depende 100% de horas de Diego (manual ~1-2/mes). El canal escalable no esta probado. Mitigacion: convertir 2da cuenta feliz en experimento de referidos.
2. **MEDIO:** aflojar la regla de "no feature sin 3+ pagando" bajo presion de cierre (ej. prometerle a Grecia el modulo de pagos). Mitigacion: regla en memoria + libro de demanda.
3. **MEDIO:** dispersion por objetos brillantes (influencer 100k, hospitalidad) en vez de cazar Wilmers. Mitigacion: caps de esfuerzo + hilos marcados como "no pivote".
4. **MEDIO:** capacidad Diego <3h/dia + familia. Mitigacion: Warhol en prospeccion/calificacion; Diego en cierre tecnico.
5. **BAJO→resuelto:** bug page-tracking que tumbo demo Jacome — ya arreglado.

### Para retomar proxima sesion

**Estado mental al cierre 30 Jun:** sesion muy productiva — se corrigieron 2 datos load-bearing (cash flow, uso real de Wilmer), se confirmo dental como beachhead con campo real, se clavo la regla de features, Reddit murio limpio. Pipeline activo por primera vez desde 1 Jun. Tension motor-vs-simple inclinandose a simple-horizontal.

**Primera pregunta al retomar:** ¿Como fueron Lumina (mie), CDH (jue), la vuelta a Jacome? ¿Se cerro Grecia con mes gratis? ¿Se verifico la pediatra (es Wilmer o no)? ¿Se entrego la plantilla-landing? ¿"Lo de Eliza"? ¿Algun cierre = arrancar el experimento de referidos?

---

## Sesion 30 Jun 2026 (cont.) — Descubrimiento de segmento: cubiculos compartidos + TimeTree como incumbente

**Contexto entrante:** misma sesion, mas tarde. Diego descargo 3 leads nuevos de la caceria de campo (29 Jun) y pidio (a) medir en el codigo cuanto falta para servirlos y (b) entender el modelo de trabajo real de estos medicos. La conversacion se volvio discovery profundo del segmento medico-edificio.

### 3 leads nuevos de campo

1. **Dra. Jensi** — medica **itinerante** (visita otras clinicas). Su calendario funciona a demanda de otros (la agarran 3pm Edif A, 4pm su clinica, 5pm Edif B). Dijo que **TODOS sus colegas de la clinica compartida tienen el mismo problema y por eso nunca contrataron plataforma** (calendario asume sede fija, se rompe con el itinerante). Idea de Diego (link a clinicas aliadas) = sobre-ingenieria; el core ya resuelve el 80%.
2. **Clinica Capilar — LEAD MAS CALIENTE.** Asistente champion de **4 medicos** (canal que abre puertas). Llevan todo en **Notion** (migrable, cutover manual). **Cobro por adelantado** via link de pago que ella genera a mano + transferencias; quiere que el bot llegue al punto de "aqui va el link de pago" y ellos marcan pagado a mano (feature LIGERA, no pasarela). **Accion caliente: mensaje MAÑANA 6pm a la doctora** para coordinar llamada con ella + su esposo (ing. ciberseguridad = gatekeeper tecnico). Migrar data de Notion.
3. **Dra. Montserrat — MISMATCH.** Quiere **expediente medico** (recetas, consultas), ya lo tiene con Medicatel. Es pelear en el terreno del competidor (profundidad clinica), no en nuestra cuña. NO perseguir, NO construir expediente.

### Hallazgo #1 — El incumbente real es TimeTree, no Dentalink/Medicatel

**7 de 10 medicos que Diego ha contactado usan TimeTree** (app de calendario compartido, gratis). Es señal de CONDUCTA (lo que hacen > lo que dicen). TimeTree es la version **gratis y muda de nuestro CORE**: no contesta pacientes, no agenda por WhatsApp, no recuerda, no maneja pacientes. Muchos ademas juntan TimeTree (compartido con otros medicos) + Google Calendar (propio) = malabarean 2 apps.

**Wedge regalado:** no hay que convencerlos de que necesitan un calendario (ya lo hackearon). Solo de que el nuestro **atiende** y el de ellos no. Switching cost ~0 (app gratis, no PMS con años de expedientes).

### Hallazgo #2 — "Usa TimeTree" = filtro de ICP por conducta

Mejor que rubro o tamaño. Es alguien que **ya siente el dolor** del calendario (tanto que hackeo algo), con switching cost casi nulo. Es casi proxy directo de **"la situacion Wilmer"** (profesional con peso de reservas que busca quitarselo). Dejar de cazar por "clinica dental" y empezar a cazar por conducta observable: *¿ya usas un calendario compartido para tus citas?*

### Hallazgo #3 — Los dos ejes (aclaracion de producto que confundia a Diego)

Dos razones DISTINTAS por las que un slot puede estar ocupado:

| Eje | Que limita | OC lo resuelve con |
|---|---|---|
| **Cuarto compartido** | El **cuarto** (N medicos, 1 silla). Si Pérez usa el cubículo 3pm, Jensi no puede aunque este libre | Medicos que comparten silla → **mismo calendario** (co-working). Cualquier cita tapa la silla para todos. ✅ construido (era el motor "compartir la silla") |
| **Medico en N lugares** | El **medico** (1 medico, N sillas). Si Jensi tiene 5pm en Edif B, no puede 5pm en Edif A aunque este vacio | Todos los calendarios del medico cuelgan de EL → el motor los agrega, nunca lo choca consigo mismo. ✅ (`availability.ts` agrega todos sus `calendar_doctors`) |

OC respeta **ambos automatico**. Unico hueco: compromisos en lugares que NO estan en OC → **"bloqueo sin paciente"** (no existe: `appointments.patient_id` es NOT NULL, sin tabla de bloqueos). **Hack para pilotear con CERO codigo:** paciente-placeholder "🔒 Ocupado", se agenda contra el con `notes`="Edif B". El bot ya lo trata como hora ocupada.

### Hallazgo #4 — Es un mercado de subarriendo de espacio clinico (Airbnb de cubiculos)

Compartir cubiculo y saltar entre edificios son **el mismo mercado desde dos lados**: el cuarto se comparte PORQUE sus medicos son de medio tiempo (saltan a otros lados). Evidencia de campo: un medico que hace **~20 clinicas** (demanda extrema) + una clinica que **le renta a 2 medicos** (oferta). Compartir = sintoma, itinerancia = causa. **Implicacion de crecimiento:** cada itinerante es un **puente entre edificios** (ganas 1, te expone a 5); la clinica que subarrienda es **hub Y canal** (necesita coordinar a sus subarrendatarios).

**El motor co-working NO esta muerto** — estaba apuntado al ICP equivocado (clinica multi-recurso $150, N=0). Su fit real = edificios de cubiculos compartidos, probablemente mas comunes.

### Marco de precio (Diego pregunto si $40 es mucho)

**NO bajar $40** (recordar [[pricing-costo-marginal]]: sesgo de Diego a bajar cuando "no cuesta nada"; $40 ya sub-optimo). El instinto correcto de Diego ("que sientan que reciben mas de lo que pagan") se logra **subiendo valor percibido, no bajando precio.**
- Anclajes de mercado: Urrea paga otra SaaS **~$32** (800 Lps), Dentalink **~$30/medico**, Wilmer **$35 feliz**. El mercado ya paga $30-35; $40 esta en el techo de la banda, no fuera.
- Reframe: NO competir "vs TimeTree/Google gratis" (ahi $40 es caro) → competir "vs perder un paciente / vs una secretaria" (ahi es barato).
- Matematica que sienten: $40/mes ≈ **L.33/dia**; si el bot salva **1 paciente/mes** ya se pago. Stack de valor: 2 apps → 1 + bot + recordatorios + agenda unificada.
- Cierre: **primer mes gratis** ([[primer-mes-gratis-enganche]]).

### Disciplina / riesgo de la sesion

Llevamos ~6 turnos teorizando el mercado sobre **2 anecdotas** (el de 20 clinicas, la que renta a 2). Es el riesgo del 30 Jun #3 (re-teorizar en vez de contar en campo). **La distribucion del mercado es la incognita #1** — decide si construimos para "1 cuarto compartido" (simple, ya esta) o "medico en N lugares" (necesita el bloqueo). No se resuelve pensando, se CUENTA.

### Tareas activas (post-30 Jun cont.)

- [ ] **#66** Mensaje MAÑANA 6pm a Dra. Capilar (coordinar llamada con ella + esposo ing.) + **hoja de prep de seguridad** para la llamada (Supabase/RLS/acceso/backups/encriptacion) — el ingeniero es gatekeeper
- [ ] **#67** Mini-tarjeta de campo, 3 preguntas por medico (Warhol/Diego llenan cada visita): (1) ¿en cuantos lugares trabajas? (2) ¿compartis cubiculo o es tuyo? (3) ¿para que usas TimeTree — asistente / otros medicos / tus horarios?
- [ ] **#68** Discovery Jensi — Mundo A vs B: ¿maneja los datos (nombre+tel) de los pacientes externos, o solo llega a atenderlos? Decide si es "paciente con tag de clinica" (product casi listo) o "bloqueo sin paciente"
- [ ] **#69** Registrar Jensi/Capilar/Montserrat en `docs/ventas/leads/` (con el gap analysis)
- [ ] **#70** Si Jensi/edificio cierra: pilotear con hack paciente-placeholder (CERO codigo). Solo graduar "bloqueo sin paciente" (feature horizontal) si 3+ pagando lo piden ([[no-feature-vertical-sin-3-clientes]])
- Vigentes: #57-65 (pipeline dental, Jacome/Grecia/Lumina/CDH, plantilla-landing, referidos), #46, #51, #55

### Riesgos activos (actualizado 30 Jun cont.)

1. **ALTO:** re-teorizar el segmento en vez de ir a contar (2 anecdotas → 4 hipotesis). Mitigacion: mini-tarjeta #67, ir a campo.
2. **ALTO (heredado):** velocidad de adquisicion = horas de Diego. Sin cambio.
3. **MEDIO:** llamada Capilar con el ing. ciberseguridad se pierde por respuesta improvisada de seguridad. Mitigacion: hoja de prep #66.
4. **MEDIO:** aflojar regla "no feature sin 3+ pagando" con Capilar (link de pago) o Jensi (bloqueo). Mitigacion: hack placeholder + libro de demanda (link de pago = voto horizontal mas votado: Grecia + Capilar; aun 0 pagando).

### Para retomar

**Estado mental al cierre:** tesis inclinada fuerte a **simple-horizontal**, con TimeTree como incumbente/filtro y el edificio de cubiculos como cluster candidato. El motor co-working revive como fit de ese cluster. Falta lo de siempre: **datos de campo, no mas teoria.** Accion caliente inmediata = Capilar mañana 6pm.

**Primera pregunta al retomar:** ¿Se mando el mensaje a Capilar? ¿Como fue la llamada con el esposo ing.? ¿Se lleno la mini-tarjeta en alguna visita — que dijo la gente del "para que usan TimeTree" y "cuantos lugares"? ¿Sigue el pipeline dental (Lumina/CDH/Grecia/Jacome)?

### Addendum (misma sesion, mas tarde) — modelo de negocio cristalizado + REENCUADRE ICP a silla-compartida

Discovery profundo de ~12 turnos que cristaliza el modelo. Lo nuevo y load-bearing:

**REENCUADRE ICP (el hallazgo mayor): de "medico DUEÑO de clinica" a "medico de SILLA COMPARTIDA".**
- **VALIDADO N=1: Wilmer comparte silla** (Diego confirmo, Wilmer se lo dijo). Nuestro UNICO cliente feliz ES el ICP silla-compartida. La tesis deja de ser N=0.
- El diseño ORIGINAL de OC (compartir calendario porque la clinica se comparte con otros medicos) YA era para esto — pero pensado a **nivel clinica**, no a **nivel usuario/TimeTree**. Reencuadre de **LENTE, no de construccion.** La plomeria existe, estaba mal etiquetada.
- Toda la venta previa se framo como "dueño de clinica"; **nunca se pitcheo "invita/unite a calendarios de otros por un solo pago".** Angulo virgen.

**Valor killer CORREGIDO: notificaciones/confirmaciones automaticas > bot.** Para medico de bajo volumen sin asistente que recuerda a mano, el killer es el recordatorio+confirmacion automatico **DESDE SU NUMERO** (TimeTree nunca le habla al paciente). El bot pesa segun volumen (bonus). Baja la barrera de venta (no hay que confiar en un bot que agenda solo). Prueba en mano: Wilmer, 41 pacientes confirmaron.

**Modelo de cobro (cristalizado): por MEDICO, plano, una vez — NUNCA por cubiculo/edificio.** Med C en 3 sillas paga UN $40 (analogia: pagas tu linea de WhatsApp 1 vez, estas en los grupos que quieras). El cubiculo compartido NO se factura — emerge de que cada medico paga lo suyo. El "$120" que asusta = suma de 3 personas (Jensi+W+V), no la factura de una. Upside: 1 edificio de 10 medicos = $400/mes, pegajoso (candado de red). Es [[modelo-ownership-multi-doctor]]: org = **workspace (NO clinica)**, owner = super-admin, billing per-doctor (gap doctor_subscriptions, manual por ahora).

**Arquitectura (verificado en RLS): compartir calendario = MISMA org, NO federar orgs (esa es la trampa).** Acceso es a nivel org (`organization_id IN get_user_organizations`). Piloto (cluster que ya se comparte los cuartos) corre **HOY sin construir** (= estructura Skin Medic con medicos-login en vez de tecnicas pasivas). Unico gap a ESCALA: aislamiento por calendario/paciente dentro de una org (para meter desconocidos). NO es org-federation.

**Producto = TimeTree(cal compartido) + notificaciones + reagendas + bot.** Las 3 ultimas existen en prod; el "TimeTree self-service (usuario crea/invita solo)" NO existe — pero Diego lo hara **MANUAL/gratis** (provisionado por detras, incluido en $40), NO self-service. El self-service ESCALA el loop, se construye DESPUES de probarlo. No prometer en cierre lo no construido (trampa Grecia).

**Test del loop = MANUAL antes de construir:** enganchar 1 medico silla-compartida con recordatorios → cuando lo ame, Diego mete al compañero de silla a mano → ¿el compañero paga? Si → loop respira → recien ahi construir self-service. Prueba la tesis a **$0 de build.**

**Probes vivos:**
- **Jensi:** Diego YA le planteo el framing TimeTree ("puede unirse al calendario de otros usuarios + notificaciones + bot que reagenda"). Esperando respuesta. Sharpening: agregar outcome (menos citas caidas). **Vigilar por donde muerde** (calendario vs notificaciones vs "¿y los otros medicos?" = loop prendio).
- **Dr. Ali Alvarado (implantes):** usa TimeTree **desde 2018** (7 años, entrenado), en **~20 clinicas** = SUPER-SPREADER candidato (era el "medico de 20 clinicas"). Pendiente: ¿usa TimeTree en las 20? ¿mismos o distintos medicos? (grado en la red).

**Regla de pitch:** el *lead* se adapta al dolor del prospecto (Jensi=calendario adelante; medico-que-recuerda-a-mano=notificaciones adelante). Outcome, no feature. NO decir "sustituir TimeTree" de frente — "TimeTree + lo que le falta"; el reemplazo se vuelve obvio solo.

**Tareas nuevas:**
- [ ] **#71** Piloto del loop MANUAL: 1 medico silla-compartida con recordatorios → meter compañero a mano → medir si paga
- [ ] **#72** Verificar grado de Alvarado en la red (¿TimeTree en las 20? ¿mismos o distintos medicos?)
- [ ] **#73** (DIFERIDO, post-loop-probado) Construir self-service de calendarios compartidos + invitar (el motor del loop). NO antes.
- [ ] **#67 (ampliada)** 5ta pregunta a la mini-tarjeta: ¿comparte otros TimeTree en otros edificios? ¿mismos o distintos medicos? (mide grado / super-spreader)

**Detalle completo en memoria [[timetree-incumbente-filtro-icp]].**

---

## Sesion 1 Jul 2026 — Loop de Wilmer disparado + tiers Free/Pro + "¿por que no Dentalink?"

**Contexto entrante:** dia siguiente de la sesion densa del 30 Jun (correccion de datos + reencuadre ICP a silla-compartida). Diego abrio descargando una conversacion real con Wilmer + su idea de tiers + una pregunta directa: ¿por que no Dentalink? Cerro pivotando a un E2E tecnico de Coexistence para de-risquear la instalacion de Grecia (paso a /modo-dev).

### 1. EL LOOP SE DISPARO SOLO (lo mas importante de la sesion)

Diego hablo con Wilmer. Datos nuevos de campo (N=1 con nombre):
- **Wilmer comparte silla con 2 profesionales mas** (uno de "poco" movimiento, asumir < que Wilmer). Su edificio ES un cluster silla-compartida vivo de 3.
- **Wilmer usa TimeTree con una colega** — nuestro unico cliente feliz vive la realidad "TimeTree + otra cosa".
- Diego le pitcheo **"TimeTree + nuestra plataforma"** → le parecio **excelente**, lo suficiente para decir que **hablaria con sus colegas esta semana para ver como lo pagan** porque "si era algo importante para ellos en la clinica". **Free tier ya comunicado a Wilmer.**

**Lectura COO:** esto es el **test #71 (loop manual) disparandose ORGANICO**, sin que Diego lo forzara. El champion recluta gratis (CAC de los companeros ≈ $0). Confirma de golpe: Wilmer ES el ICP silla-compartida, el candado de red es real, y el pitch "TimeTree + plataforma" convierte. Si un companero paga Pro → la tesis deja de ser N=1. **NO dejar enfriar** — el siguiente paso es facilitarle el reclutamiento (conectarlos gratis al calendario compartido). Wilmer lo maneja el/su gente esta semana; Diego solo espera y provisiona.

### 2. Modelo de tiers Free / Pro (idea de Diego para combatir el "todo o nada")

| Tier | Incluye | Costo marginal | Rol |
|---|---|---|---|
| **Free** | Calendario compartido (= reemplazo TimeTree) + une los 2 calendarios que hoy malabarean | ~$0 (Supabase free, sin WhatsApp) | Motor del loop: champion invita gratis, cero barrera |
| **Pro $40** | Recordatorios + confirmaciones **desde su numero** + bot | Meta WhatsApp | Donde vive el valor y el precio; upsell por cabeza |

**Aprobado con 2 guardas:**
1. **No anclar el precio contra el free.** El free es la mercancia que TimeTree YA regala (no se regala valor). Vender "$40 vs perder un paciente / vs una secretaria", nunca "vs calendario gratis". NO bajar de $40 ([[pricing-costo-marginal]]).
2. **El free-como-motor-viral depende del self-service (#73, diferido).** Para que el champion invite solo necesita el "crear/invitar" self-service que NO existe. Piloto Wilmer = **provision manual** (Diego los conecta por detras). El self-service se construye DESPUES de que un companero pague Pro. No prometer lo no construido (trampa Grecia).

Esto ademas concreta el billing per-medico ([[modelo-ownership-multi-doctor]]): el workspace es gratis de unirse, cada medico paga $40 por Pro.

### 3. Filtro ICP mas afilado: "usa TimeTree + otro calendario"

Diego observo: TimeTree **solo reserva el espacio de la clinica (la silla)** → las citas propias las llevan **aparte** en otro calendario (Google, etc.). Son los 2 ejes del 30 Jun (la silla compartida + las citas del medico). **Malabarean 2 apps.** Alguien que juega TimeTree **+** Google siente el dolor mas agudo que quien solo usa TimeTree — y **el motor OC nativamente une los dos** (`availability.ts` agrega todos los `calendar_doctors`). Nuevo pitch del free: *"deja de malabarear TimeTree y tu Google, todo en uno"*. Nueva pregunta de calificacion (mini-tarjeta #67): **"¿ademas de TimeTree, en que llevas tus citas propias?"** → si contesta "otro calendario", es Wilmer confirmado.

### 4. "¿Por que no Dentalink?" (pregunta directa de Diego — respondida)

Por que el ICP no se va (ni lo mandamos) a Dentalink:
1. **El mercado ya voto con los pies:** 7/10 usan TimeTree, NO Dentalink. Su switching-cost es ~0 *porque* rechazaron el PMS pesado. Venderles Dentalink = venderles lo que ya declinaron.
2. **Trabajo distinto:** Dentalink = expediente clinico (guardar registros). Nosotros = agenda compartida + hablarle al paciente. El dolor del usuario de TimeTree no es "guardar expedientes". Es la trampa Montserrat.
3. **Dentalink es dental; el ICP no.** El filtro "usa TimeTree" cruza especialidades (estetica, pediatria, itinerantes). Dentalink no puede servir a Jensi/Jacome.
4. **Dentalink asume clinica de sede fija** (facturado a la clinica). El modelo silla-compartida/itinerante (cobro por medico, calendario que sigue al doctor) es arquitectonicamente ajeno.
5. **Es el terreno del competidor** (profundidad clinica) donde decidimos NO pelear (30 Jun). Dentalink es debil en mobile ("no es mobile-friendly", cita de campo) y no le habla al paciente.

**Foto que aclara todo:** TimeTree (gratis, mudo) Y Dentalink (pago, clinico) **fallan en lo mismo** — ninguno le habla al paciente desde el numero del medico. **Ese hueco es el producto.** No competimos con Dentalink; vendemos la capa que ninguno da. (Matiz: los que SI tienen Dentalink y se quejan del mobile son segmento distinto y mas dificil — no el beachhead.)

### 5. Capacidad / energia — decision de agenda

Diego durmio **4.5h** (1am–5:30am) por la emocion de que el producto "encaja". Mañana tenia instalacion Grecia **+** llamada Capilar. Sintio que Capilar "estaba un poco fuera" de la tesis silla-compartida y quiso evitar la llamada; el mismo lo nombro como funnel vision.

**Diagnostico COO:** el instinto de evitar por tesis era el error (Capilar = champion de 4 medicos = ~$160/mes potencial; usa Notion = misma señal conductual que TimeTree, NO esta fuera; foco = calificar despues, no en vez de). PERO el problema real resulto ser **capacidad**, no tesis. Decision: **mañana SOLO instalacion Grecia; Capilar se reprograma 2-3 dias** (mantener caliente, no cancelar). Reprogramar ademas mejora la llamada (descansado + con hoja de prep para el esposo ing. ciberseguridad). Sin reloj financiero que apure (+$15/mes, cero burn). Mensaje de reprogramacion redactado (corto, sin pushiness). Recordatorio de bienestar dado: 1am-5:30am insostenible, horizonte 3 años, familia primero (regla #4).

### Decisiones tomadas 1 Jul

1. **Facilitar el loop de Wilmer** (no esperar pasivo): ofrecerle conectar gratis a sus 2 companeros de silla al calendario compartido (provision manual). Es #71 en vivo.
2. **Adoptar el modelo Free/Pro** con las 2 guardas (no anclar precio; self-service diferido).
3. **Agregar el filtro "usa TimeTree + otro calendario"** a la mini-tarjeta #67.
4. **Dentalink = no-competencia** (categoria distinta); no pelear en profundidad clinica, cuña = hablarle al paciente + mobile + simple.
5. **Instalacion Grecia mañana en solitario; Capilar reprogramada** (capacidad).

### Tareas activas (post-1 Jul)

- [ ] **#74** Facilitar loop Wilmer: conectar gratis a sus 2 companeros de silla (provision manual) cuando Wilmer confirme interes de ellos. Medir si alguno paga Pro (= #71 resuelto en vivo)
- [ ] **#75** Enviar mensaje de reprogramacion a Capilar (redactado) + agendar 2-3 dias adelante
- [ ] **#66 (vigente)** Hoja de prep de seguridad para la llamada Capilar (esposo ing. ciberseguridad) — hacerla ANTES de la llamada reprogramada, no hoy
- [ ] **#76** Definir feature-por-feature que va en Free vs Pro (para no improvisar en la proxima venta) — pendiente, Diego difirio para cerrar primero E2E
- [ ] **#67 (ampliada 2x)** mini-tarjeta ahora incluye: "¿ademas de TimeTree, en que llevas tus citas propias?"
- Vigentes: #57-65 (pipeline dental: Jacome/Grecia/Lumina/CDH, plantilla-landing, referidos), #71-73 (loop manual / grado Alvarado / self-service diferido), #46, #51, #55

### Riesgos activos (actualizado 1 Jul)

1. **ALTO:** Diego quemandose por emocion (4.5h sueño) → riesgo de ejecucion en instalaciones/llamadas + insostenible con niño de 2 años. Mitigacion: 1 evento grande/dia, sin reloj financiero, ritmo > cramming.
2. **ALTO (heredado):** velocidad de adquisicion = horas de Diego. El loop de Wilmer es la primera señal de un canal que compone (referidos CAC≈0) — si respira, cambia el techo.
3. **MEDIO:** aflojar regla "no feature sin 3+ pagando" (link de pago Capilar, self-service free). Mitigacion: provision manual + libro de demanda.
4. **MEDIO:** dejar enfriar el pipeline caliente (Capilar reprogramada, Lumina/CDH/Grecia) por capacidad. Mitigacion: reprogramar ≠ soltar; mensajes cortos de seguimiento.

### Para retomar proxima sesion estrategia

**Estado mental al cierre:** sesion corta y fuerte — el loop de Wilmer se disparo solo (la mejor señal en meses), el modelo Free/Pro quedo definido, Dentalink descartado como competencia. Diego paso a /modo-dev para un E2E de Coexistence (unlink/re-link de numero) que de-risquea la instalacion de Grecia. Capacidad es el riesgo #1 hoy (energia, no plata).

**Primera pregunta al retomar:** ¿Hablo Wilmer con sus companeros — se anima alguno a pagar? ¿Como fue la instalacion de Grecia? ¿Se reprogramo Capilar y se hizo la hoja de prep? ¿Se cerro el detalle Free vs Pro (#76)? ¿El E2E de Coexistence paso limpio (unlink/re-link no rompe onboarding)?

---

## Sesion 2 Jul 2026 — Dia de instalacion Grecia (Smile Design)

**Contexto entrante:** dia de la instalacion de Grecia (10am). Diego durmio bien (riesgo #1 de ayer mitigado).

### Estado al abrir (8:42am)

- **DKapilar** (nombre correcto del lead, antes registrado como "Capilar"): mensaje de reprogramacion ENVIADO, llamada reagendada para el **SABADO**. #75 ✅. Diego pidio explicitamente NO trabajar en DKapilar hoy — la hoja de prep #66 queda pendiente ANTES del sabado.
- **Grecia sin responder confirmaciones:** mensaje ayer 5pm + llamada y mensaje hoy 8:35am. Decision COO: NO 4to toque (3 en <18h ya es el limite cultural), silencio matutino de dentista ≠ señal negativa (esta con pacientes), y la cita ya estaba acordada.
- **Decision: ir igual a las 10am.** Clinica a 15 min. Asimetria: ir en vano cuesta 30 min; no ir y que ella espere quema el cierre mas avanzado del pipeline.
- **Wilmer: cero contacto** (decision Diego, correcta). El loop #71/#74 solo vale si respira solo. Check-in natural: lunes-martes proxima semana, con excusa de servicio, NO preguntando por los colegas.

### Instalacion en marcha — datos operativos

Diego preparo el onboarding con una cuenta propia admin+doctor y agrego a Grecia:

- Org **Smile Design** creada: `40bd31f5-51b5-4abb-b448-5c81029dabd8`
- Grecia: `greciarodriguez@orioncare.app`, user_id `5759daf3-93bc-4caf-9654-80be969b24f3`, doctor_id `2996127b-e3eb-4589-82da-a616bdbc4070`, **admin+doctora** (upgrade via SQL)
- **Patron tecnico admin+doctor** (guardado en [[admin-doctor-role-pattern]]): UNA sola fila en `org_members` con `role='admin'` + `doctor_id` lleno. NUNCA 2 filas (el frontend lee el rol con `.limit(1)` → comportamiento aleatorio). Flujo: crear como doctor en UI (`create-user-with-role` cablea todo) → UPDATE role a 'admin' en `org_members` + `user_roles`. Requiere re-login para ver panel admin.

### Al cierre de sesion

**PENDIENTE CONFIRMAR:** resultado final de la instalacion (¿llego Grecia? ¿quedo operativa? ¿Coexistence limpio?). La sesion se cerro con la instalacion en curso.

### Tareas actualizadas (post-2 Jul)

- [x] **#75** ✅ Mensaje reprogramacion DKapilar enviado — llamada el SABADO
- [ ] **#66** Hoja de prep de seguridad DKapilar (esposo ing. ciberseguridad) — hacer VIERNES a mas tardar (llamada es sabado)
- [ ] **#77** Confirmar resultado instalacion Grecia + registrar en estado (¿cliente #2 activo? ¿MRR $70?)
- [ ] **#74 (vigente)** Loop Wilmer: esperar sin contacto; check-in natural lun-mar 6-7 Jul
- Vigentes: #76 (Free vs Pro feature-por-feature), #57-65, #67-73, #46, #51, #55

### Riesgos activos (actualizado 2 Jul)

1. **ALTO (heredado):** velocidad de adquisicion = horas de Diego. El loop Wilmer sigue siendo la señal de canal que compone.
2. **MEDIO:** dejar enfriar DKapilar — la hoja de prep #66 NO esta hecha y la llamada es el sabado. Mitigacion: hacerla viernes.
3. **MEDIO:** capacidad — mejor que ayer (durmio bien), pero semana cargada (Grecia hoy, Lumina mie, CDH jue, DKapilar sab).
4. **BAJO (nuevo):** Grecia no aparecio a la instalacion → reagendar sin friccion ("pase como quedamos, ¿le queda mejor otro dia?").

### Para retomar proxima sesion

**Primera pregunta al retomar:** ¿Como termino la instalacion de Grecia — cliente #2 activo? ¿Se hizo la hoja de prep DKapilar antes del sabado? ¿Como fue la llamada del sabado con el esposo ing.? ¿Lumina (mie) y CDH (jue) aparecieron? ¿Noticias organicas de Wilmer y sus colegas?

---

## Sesion 2 Jul 2026 (TARDE) — Caso Stacy Recinos → modelo clinica-hub + demo Orthos ejecutado

**Contexto entrante:** cierre del dia de campo. Grecia NO aparecio (2do no-show; mensaje final enviado — "estuve en la clinica, podemos agendar sin problema"; pelota en su cancha, NO mas toques). Lumina reagendo al VIERNES **via el bot** (señal: un lead usando el producto para reagendar). CDH se paso por alto — reprogramar con mensaje corto. TimeTree confirmado en 2 clinicas odontologicas mas (hipotesis valida en dental; fuera de dental sin contar).

### El hallazgo: Dra. Stacy Recinos (clinica dental "grande")

Paga **Dentalink Y usa TimeTree** para coordinar medicos externos. Flujo verbalizado: paciente pregunta horarios → llaman al medico externo → confirma fechas → presentan al paciente → elige → coordinan via TimeTree. = 2-4 toques + espera sincrona POR CADA cita de procedimiento, justo cuando el paciente esta caliente. **Pidio demo para evaluar sustituir TimeTree.**

Lecturas estrategicas:
1. **Cliente pagando de Dentalink que AUN necesita TimeTree** = la prueba mas dura de la cuña (ni el PMS pago resuelve coordinacion de agenda).
2. **Correccion de cuña (verificada web):** Dentalink SI tiene recordatorios WhatsApp (add-on pago, botones confirmar/cancelar, probablemente numero generico). La cuña "Dentalink no le habla al paciente" es FALSA tal cual. Cuña real segmentada: mayoria TimeTree-sin-PMS → recordatorios desde SU numero; minoria con Dentalink (Stacy) → coordinacion con externos + capa conversacional ("ellos avisan, nosotros conversamos"). NO liderar con recordatorios ante dueños de Dentalink.
3. **TimeTree = protocolo de coordinacion ENTRE organizaciones** (no solo intra-clinica). Silla-compartida e itinerancia son las 2 puntas del mismo cable.

### Decisiones de modelo (secuencia de la sesion)

1. **Unidad que paga = LA CLINICA** (no el medico itinerante — propuesta de Diego, correcta): el dolor/perdida del paciente es de la clinica; el externo no paga por dolor ajeno. 1 clinica Pro = X externos free adentro; el externo con calendario que "se llena solo" (las citas de las clinicas SON la actualizacion) tiene interes propio en meter a sus otras clinicas (evitar doble-booking) = **loop clinica-hub, espejo del loop Wilmer** (regla comun: paga quien es dueño de la relacion con el paciente).
2. **Linea Free/Pro afilada:** free = single-player completo (calendarios y medicos ilimitados, filas pasivas que el free mantiene a mano = TimeTree); pago = INVITAR (el externo entra con cuenta propia, se llena solo) + recordatorios. "Free da la vitamina, pago da el analgesico." Peaje: conectar/escribir al calendario de un externo = Pro.
3. **Add-on $35/calendario extra MUERTO** (ya implicito en "cobro por medico plano" del 30 Jun). Expansion revenue se muda a asientos/conexiones.
4. **$40 NO se baja** ("hay que ver resultados" — Diego). El "$40 caro" del odontologo de campo = filtro de ICP + problema de ancla; el free absorbe la objecion de precio (el precio se discute cuando ya viven adentro).
5. **Bot fuera del PITCH** (nadie muestra pull en campo; vulgarizado — caso Zendy/ManyChat) pero NO del producto (Wilmer 245 logs, Lumina reagendo via bot hoy). Bot = infraestructura silenciosa + palanca de margenes, no vitrina. En demo Orthos va ON (decision Diego).
6. **#73 re-especificado** (sigue DIFERIDO): cuenta-medico con calendario unico cross-clinica + invite desde Pro. Se construye cuando una 2da clinica del mismo medico pague.

### Demo Orthos — EJECUTADO (config completa via SQL)

Detalle e IDs en [[orthos-demo-stacy]]; rollback de la linea demo en `~/.claude/plans/ya-tengo-la-org-twinkling-dove.md`. Puntos clave:
- **Sillon = RECURSO (qty 1), NO calendario compartido** — verificado en `availability.ts`: el co-working bloquea slots con cualquier cita de cualquier miembro (calendario compartido NO simula la silla; corrige receta inicial del COO).
- Calendarios 1:1 (Stacy + 5 externos ficticios con login), 6 servicios con receta sillon + "Ocupado — otra clinica" SIN receta (eje 2: el externo se llena sin afectar el sillon), skill matrix poblada, 15 pacientes + 19 citas seed con flags de envio marcados (crons no disparan a numeros falsos).
- Fixes aplicados sobre el montaje manual de Diego: Stacy doctor→ADMIN, Diego desactivado del calendario de Stacy (co-working), Molero sin calendario activo, Rivas sin horarios, domingos abiertos eliminados.
- **Linea Demo Bot +504 9313-3496 MOVIDA a Orthos** (bot ON). Mientras dure el piloto NO hay Demo Bot en la org OrionCare.
- Guion: demo auto-explorable sin la escena del externo; demo guiado cierra con escena de 60s (login externo en telefono de Diego agrega "Ocupado" → desaparece de slots, sillon libre). Trigger de compra = "¿el doctor puede ver esto el mismo?" / crea citas sola semana 1 (medir con page_views). NO prometer cross-clinica.

### Tareas activas (post-2 Jul tarde)

- [ ] **#78** QA de las 4 escenas: **(1) cruce 2 ejes ✅ VERIFICADO 2 Jul via API contra get-available-slots** — el sillon de Cervantes (extraccion jue 9:30-10:40) le come a Molero los slots 9:30/10:00/10:30 con servicio, y reaparecen sin servicio (control negativo); la consulta de Stacy NO bloquea sillon. Motor resource-aware confirmado en prod. Pendientes en UI: (2) escena login-externo en telefono; (3) mensaje real al **+504 9787-0752 (linea Pinares reactivada — llevaba meses inactiva, PROBAR envio/recepcion antes del demo)** → bot responde bajo Orthos + inbox; (4) page_views registrando
- [ ] **#79** Crear 1 paciente vivo con numero real de Diego (cita futura, flags en false) para el flujo real de recordatorio/confirmacion
- [x] **#80** ✅ Acceso ENTREGADO a Stacy el mismo 2 Jul (caliente, mismo dia de la conversacion). Ahora: observar `page_views` (¿entra? ¿navega? ¿crea citas?) y esperar su primera reaccion. NO hacer follow-up antes de 48-72h salvo que ella escriba.
- [ ] **#84** Probar envio/recepcion real de la linea +504 9787-0752 (quedo SIN probar antes de entregar el acceso — si Stacy reporta que algo no manda mensajes, es lo primero a revisar)
- [ ] **#85** Merge de `feat/page-tracking-navegacion` a main — la rama acumula **4 commits de polish mobile** (2-3 Jul): scroll del menu admin (53ad867), paginas admin mobile-friendly + autoscroll a opcion activa al abrir menu (b614777: WhatsApp Lines, Motor tabs/recursos card-view, Bot FAQs card-view), y card de servicio del Motor reestructurada (318798c). Stacy entra por celular como admin — validar preview Vercel y mergear. Typecheck+build verificados en cada commit.
- [x] **#81** ✅ Linea Demo Bot REVERTIDA a org OrionCare el mismo 2 Jul (config original restaurada; sigue como herramienta de ventas). Orthos usa la linea Pinares +504 9787-0752 (reactivada, bot ON, handoff doctor)
- [ ] **#82** Preguntas empiricas para Stacy: ¿tiene el add-on de recordatorios de Dentalink? ¿de que numero llegan? ¿que pasa cuando el paciente responde fuera del boton? + ¿cuantos sillones tiene? (qty del recurso)
- [ ] **#83** Mensaje corto a CDH (se paso la visita) — no dejar enfriar >48h
- [ ] **#67 (ampliada 3x)** mini-tarjeta: + "¿coordinas procedimientos con medicos externos? ¿cuantos?" y "¿como consultas su disponibilidad?"
- [ ] **#76 (vigente)** linea Free vs Pro feature-por-feature — nueva pregunta obligatoria: ¿que sostiene el tier $150 si los calendarios pasivos son gratis? (motor/volumen)
- Vigentes: #66 (prep DKapilar — viernes), #74 (loop Wilmer, check-in lun-mar), #57-65, #71-73, #77 (Grecia — ahora en su cancha)

### Riesgos activos (actualizado 2 Jul tarde)

1. **ALTO (heredado):** velocidad de adquisicion = horas de Diego. Ahora hay 2 loops candidatos (Wilmer silla-compartida + Stacy clinica-hub) — ninguno probado con plata aun.
2. **MEDIO (nuevo):** la linea de Orthos (+504 9787-0752, ex-Pinares) llevaba meses inactiva — riesgo de que el lado Meta no funcione (webhook, templates, quality). Mitigacion: QA #78 escena 3 ANTES de mandar el acceso a Stacy. (El Demo Bot ya fue revertido a OrionCare y sigue disponible para otros demos.)
3. **MEDIO:** teorizamos el modelo clinica-hub sobre N=1 (Stacy) — ir a CONTAR (mini-tarjeta #67 ampliada) antes de reorganizar pitch de calle.
4. **MEDIO:** semana densa sin cerrar: Grecia en su cancha, CDH sin reprogramar, Lumina viernes, DKapilar sabado (prep #66 pendiente = viernes).
5. **BAJO:** citas demo creadas SIN servicio no consumen sillon → si Stacy usa "cita rapida" la simulacion no luce. Mitigacion: guiarla al flujo con servicio.

### Para retomar proxima sesion

**Primera pregunta al retomar:** ¿Stacy entro — que dicen los `page_views` (navego, creo citas, cuanto tiempo)? ¿Escribio algo / pregunto por el medico externo (= trigger)? ¿La linea +504 9787-0752 probada (#84)? ¿Fix mobile mergeado a main (#85)? ¿Lumina viernes cerro? ¿Prep DKapilar (#66) hecha y como salio el sabado? ¿CDH reprogramado (#83)? ¿Noticias de Wilmer/colegas (check-in lun-mar, #74)?

**Query util para medir a Stacy (page_views):**
```sql
SELECT path, COUNT(*) AS vistas, MIN(created_at) AS primera, MAX(created_at) AS ultima
FROM page_views WHERE user_id='c56559ae-cfc8-482d-9134-92b096f7a98d'
GROUP BY path ORDER BY MAX(created_at) DESC;
```
