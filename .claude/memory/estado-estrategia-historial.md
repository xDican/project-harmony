# Estado Estrategia — Historial

> Archivo historico. Lo vivo esta en `estado-estrategia.md`.
> No se carga automaticamente al activar /modo-estrategia.
> Snapshot tomado el 19 May 2026 (incluye todos los updates hasta 18 May PM).
> Updates ordenados de mas reciente a mas viejo.

---

# Estado Estrategia — OrionCare (snapshot)

> Ultima actualizacion: 18 May 2026 PM (Sprints 0+1+2 backend completados en 1 sesion. Insight clave: tesis real es "bot maximizado", asistente como fallback. Feature candidata: llamadas perdidas → bot retoma.)

## UPDATE 18 May PM — 3 sprints en 1 sesion + refinamiento de tesis

### Avance tecnico (3 sprints completados en ~6.5h vs 62h estimadas)

Sprints 0, 1 y 2 del MVP Centro de Atencion completados y validados en prod:

- **Sprint 0** (schema) — 4 tablas + bucket Storage + RLS + 17 service_types migrados
- **Sprint 1** (persistencia + bot dual mode) — 5 functions deployadas, conversation tracking funcional, dual mode validado
- **Sprint 2** (multimedia + transcripcion) — Whisper en español funcionando, 2 audios reales transcritos en ~3 seg cada uno, $0.002 total

**Backend del MVP esta funcionalmente completo.** Quedan Sprints 3-6 (frontend, responder, promos, llamadas) + 7-8 (dogfooding + Mendoza launch).

### Insight estrategico — la tesis real

Durante Sprint 2, Diego clarifico algo importante: **la transcripcion de audios NO es para que la asistente lea texto en vez de oir audio (eso es nice-to-have). El valor real es que el bot procese la transcripcion y responda automaticamente al paciente**.

Esto refina la tesis del pivot:
- **PITCH externo** (a Dulce/Mendoza/asistentes): "Asistente potenciada — nunca quedas ciega, lo ves todo, puedes tomar cuando quieras"
- **VERDAD operativa**: "Bot maximizado — atiende el mayor numero posible de interacciones. Asistente es fallback excepcional, no protagonista"

Las dos verdades coexisten — la asistente SIEMPRE tiene la opcion, el bot SIEMPRE intenta primero.

Documentado en [[bot-maximo-control]] con criterios concretos: cada feature futura debe preguntarse "¿le da MAS control al bot o se lo quita?".

### Implicaciones para el roadmap

- **Sprint 4 (quick replies)** — ya no solo son atajos para la asistente. Las plantillas tambien las usa el bot.
- **Sprint 5 (promociones)** — confirma su importancia: bot necesita data fresca para responder solo.
- **Sprint 6 (llamadas)** — nueva feature candidata: si asistente NO contesta llamada WhatsApp, mensaje auto al paciente + bot retoma. Detalle en [[llamada-perdida-bot-retoma]].
- **Filosofia general**: el frontend del inbox (Sprint 3) debe diseñarse para gestion EXCEPCIONAL, no rutinaria. Si la asistente pasa 4h/dia en el inbox, fracasamos. Si pasa 30 min revisando lo que el bot escalo, exitamos.

### Por que la velocidad de Sprint 0-2 fue tan alta

3 sprints en 1 sesion (estimado 62h, real ~6.5h, 90% mas rapido):

1. Schema robusto de Sprint 0 — nada hubo que refactorizar despues
2. Helpers desacoplados — Sprint 2 reuso Sprint 1 sin tocarlo
3. Whisper API funciona out-of-the-box en español (forzado language='es')
4. Fire-and-forget evito complejidad de manejo de timeouts

**Cuidado interpretando este ratio:** Sprints 3 (UI frontend) y 6 (WebRTC + Calling API) son los riesgosos. UI tiene mas variables (UX, realtime edge cases) y WebRTC es nuevo. Mejor mantener target original 20 Jul Mendoza launch como red de seguridad, NO acelerar prematuramente.

### Pricing pendiente (sin cambios desde update AM)

- Tier 1 grandfathered $40-75 (clientes actuales)
- Tier 2 base $60/mes (nuevos)
- Tier 3 Pro $85/mes (multi-doctor)
- Task #6 pendiente — diseno completo + materiales de venta

### Comunicacion Dulce — sin cambios desde plan original

- Llamada 28-29 May (10 dias antes del 30 que Dulce espera)
- Mensaje: "Encontre que la solucion correcta es mas grande, vuelvo el 14-20 Jul con centro completo"
- Task #4 pendiente

### Decisiones tomadas hoy (PM)

1. **Transcripcion audios** → output para el BOT, no para la asistente (decisión filosofia bot maximo control)
2. **Llamadas perdidas → bot retoma** → feature candidata Sprint 6 (no scope creep, alineada con tesis)
3. **Pausa breve** — Diego retoma "en un par de horas". Estados actualizados para retomar limpio.

### Riesgos sin cambios

1. CRITICO: capacidad Diego cae <3h/dia (sin cambios, hoy se mantiene)
2. CRITICO: Dulce no espera 7 semanas → mitigado parcialmente por progreso tecnico (puedo mostrarle el centro completo en Jul)
3. ALTO: pilot Medilaser revela bugs → buffer Sprint 8 sigue
4. MEDIO: tarifa Honduras outbound — task #5 pendiente
5. BAJO: outbound multimedia mas complejo de lo esperado — Sprint 2 lo cerro

### Tareas activas

- #4 Llamar Dulce 28-29 May
- #5 Tarifa Honduras dashboard Meta
- #6 Disenar pricing 3 tiers
- #7 Investigar call permission templates
- #8 Disenar feature "Promociones del mes"
- #13 Validar inbox-send con JWT real (no bloqueante)
- #14 Sprint 3 Frontend Inbox Basico

---

## UPDATE 18 May — PIVOT FUNDAMENTAL: de "bot" a "centro de atencion"

### Que paso el sabado 16 May (Mendoza NO se instalo)

Diego decidio en sitio NO instalar a Mendoza. Razon: el modelo "OrionCare toma el numero principal" deja a la asistente **ciega** del WhatsApp. Mendoza solo tiene 1 numero, ya probaron 2 numeros con humanos y los pacientes se confundieron, y las llamadas WhatsApp son criticas (Paredes lo confirmo pidiendo devolver SU numero por la misma razon dias antes).

Dulce, la asistente champion de Torre Zafiro, se asusto cuando entendio el modelo. **Las asistentes no van a ceder su WhatsApp** — ES su trabajo, no algo que delegar.

### Triangulacion del mercado (3 senales mismo dia)

1. **Paredes:** numero devuelto a Medilaser, no podia perder llamadas WhatsApp
2. **Mendoza:** rechazo modelo 2 numeros, rechazo perder llamadas
3. **Dulce:** susto explicito por quedar ciega

Esto invalida la tesis "auto-agenda 100%" para el ICP unico (edificio medico con asistente champion). No es bug del bot — es producto-mercado fit que no era el correcto.

### Nuevo modelo: "Asistente potenciada"

**Antes:** Bot toma el numero. Asistente queda ciega. Llamadas se pierden.
**Ahora:** Asistente sigue dueña del numero. OrionCare es un **centro de atencion** donde ella ve mensajes + llamadas + agenda + promos en una pantalla. Bot atiende cuando ella delega (fuera de horario o mensaje especifico).

### Habilitador tecnico: WhatsApp Business Calling API GA

Investigacion 18 May confirmo:
- Meta Cloud API directo soporta Calling API (NO necesitamos Twilio — feedback critico: [[meta-cloud-api-directo]])
- Inbound (paciente llama) = **GRATIS**
- Outbound (clinica devuelve llamada) = por minuto, 6 segundos increments
- Honduras disponible (no en restringidos USA/Canada/Egipto/Vietnam/Nigeria)
- Tarifa exacta pendiente confirmar en dashboard Meta. Estimacion: ~$0.01-0.05/min
- Ventana 24h de mensajes NO aplica a llamadas, pero inbound calls REFRESCAN ventana de mensajes

**Estimacion costo llamadas por clinica/mes: ~$1-3.** El aumento de precio es por VALOR, no por costo.

### Insight nuevo de Mendoza: promociones rotativas mensual

Mendoza hace publicidad estetica que cambia cada 30 dias. El bot debe responder con la promo activa del mes. **Feature nuevo descubierto:** panel "Promociones del mes" donde la asistente sube las promos, el bot las usa, expiran auto, notif para renovar. **Diferenciador unico vs competencia generica (Respond.io, WATI no tienen esto).**

### MVP — 23 features clasificadas en 3 tiers

**Tier 1 (11 MUST HAVE) para instalar Mendoza:**
Inbox unificado, bot dual mode, llamadas WhatsApp, agenda integrada, notificaciones simples, plantillas respuesta rapida, promociones del mes, palomitas estado, adjuntar archivos, **transcripcion automatica de audios (Whisper)**, login backup asistente.

**Tier 2 (6 SHOULD HAVE):** etiquetas+busqueda, modo fuera oficina, notas privadas, sugerencia respuesta AI, detector urgencia auto, historial paciente al abrir.

**Tier 3 (POST-MVP):** broadcast, mensaje al doctor, reportes avanzados, multi-doctor avanzado, sync calendario externo, cobros, app movil, multi-canal.

Plan tecnico completo: `.claude/plans/centro-atencion-mvp.md`

### Cronograma 9 semanas (MVP en produccion 13 Jul, Mendoza 14-20 Jul)

| Semana | Trabajo |
|---|---|
| 1 (19-25 May) | Diseno tecnico + mockups + schema migrations |
| 2 (26 May-1 Jun) | Backend: webhook persiste TODO inbound, tablas conversations/messages |
| 3 (2-8 Jun) | Backend: bot dual mode, handoffs, transcripcion audios |
| 4 (9-15 Jun) | Frontend: inbox UI funcional |
| 5 (16-22 Jun) | Frontend: quick replies + promociones + notificaciones |
| 6 (23-29 Jun) | Calling API: webhooks, softphone WebRTC, permission templates |
| 7 (30 Jun-6 Jul) | Dogfooding Wilmer (Diego + Warhol responden desde inbox) |
| 8 (7-13 Jul) | Bug fixes + pilot Medilaser (Marleny entra al inbox) |
| 9 (14-20 Jul) | **Instalacion Mendoza Torre Zafiro** |

### Pricing nuevo (3 tiers)

- **Grandfathered $40-75:** los 4 clientes actuales se mantienen (buena fe)
- **Base $60/mes:** clientes nuevos desde Julio. Centro completo + ~50 llamadas outbound/mes incluidas.
- **Pro $85/mes:** multi-doctor o alto volumen. Llamadas ilimitadas, dashboards.

Math actualizada: 100 clientes × $60 = $6,000 (vs 175 × $40 originales). Hito paz mental ($1,500): ~25 clientes nuevos en lugar de 38. Mas alcanzable, mismo margen (~80%).

### Validacion del modelo: Dulce confirma efecto edificio

Dulce comento que **otro medico de Torre Zafiro espera ver resultados de Mendoza** antes de implementar. Significa: 1 instalacion buena = puerta a 5 medicos del edificio. Justifica el costo de calidad del MVP y refuerza que la instalacion del 14-20 Jul tiene que ser solida.

### Comunicacion con stakeholders

- **Dulce (Torre Zafiro):** llamada 28-29 May (10 dias antes del 30 que ella espera). Mensaje: "Encontre que la solucion correcta es mas grande, vuelvo el 14-20 Jul con centro completo, no parche."
- **Paredes:** sin accion ahora. En Jul se le ofrece pilot interno antes que clientes nuevos.
- **Resto pipeline (Hernandez, Escarleth, 6 demos pausadas):** NO contactar hasta tener MVP.
- **Clientes existentes (Wilmer, Yeni, Medilaser, Ecoclinicas):** comunicacion proactiva semana 7-8 "estamos lanzando inbox + llamadas, sin costo adicional este ano para uds."

### Decisiones implicitas tomadas hoy

1. **Feature freeze ROTO conscientemente.** Era para no dispersarse, no para ignorar al mercado. El centro de atencion ES supervivencia.
2. **Pipeline en PAUSA** hasta MVP. No mas demos.
3. **Ads en PAUSA permanente del concepto AD-005/006/007.** El mensaje "tus pacientes se agendan solos" ASUSTA a las asistentes (nuestro ICP). Nuevo pitch + creativos pospone hasta post-MVP.
4. **Multi-asistente concurrente NO entra al MVP.** Confirmado 1 + 1 backup pasivo.
5. **NO mas validacion previa con asistentes.** 3 senales triangulan, validar mas es procrastinar.

### Riesgos reordenados

1. **CRITICO:** capacidad Diego cae <3h/dia mata el cronograma. Mitigacion: check-in viernes semanal. Si <20h reales, sacrificar Tier 2 primero.
2. **CRITICO:** Mendoza/Dulce no espera 7 semanas. Mitigacion: llamada 28-29 May con mockups visuales.
3. **ALTO:** pilot Medilaser revela bugs criticos retrasan Mendoza. Mitigacion: buffer semana 8.
4. **MEDIO:** tarifa Honduras outbound mas alta de lo estimado. Mitigacion: confirmar dashboard semana 1, ajustar pricing si >$0.10/min.
5. **MEDIO:** pacientes con WhatsApp viejo no reciben Business Calling. Mitigacion: investigar % adopcion semana 1.
6. **BAJO:** call permission templates complicados de aprobar. Mitigacion: semana 1 prep.

### Bot Sprint 2 — postponer

El plan original era Sprint 2 finales de Mayo con data Mendoza. Como Mendoza no se instalo y el producto cambia, Sprint 2 queda **diferido**. Los items A-F del backlog del 15 May siguen validos pero entran como parte del bot dual mode dentro del MVP centro de atencion, no como sprint aparte.

### Tareas activas

- #4 Llamar Dulce 28-29 May reagendar Mendoza
- #5 Confirmar tarifa Honduras dashboard Meta
- #6 Disenar pricing 3 tiers
- #7 Investigar call permission templates Honduras
- #8 Disenar feature "Promociones del mes"
- #9 Disenar arquitectura tecnica MVP (parcialmente completo en plan doc)

### Proximos pasos esta semana (19-25 May)

- [ ] Lun-Mar: Mockups UI inbox (Figma o papel) + diseno schema final
- [ ] Mier: Confirmar tarifa Honduras outbound + investigar call permission templates
- [ ] Jue: Schema migrations desplegadas en branch
- [ ] Vie: Doc tecnico finalizado, arrancar backend semana 2

---

## UPDATE 15 May PM — Cierre dia: v62 deployado, handoffs analizados, Sprint 2 espera Mendoza

### Deploys del dia

- **bot-handler v62** deployado 15-May ~21:50 UTC con los 3 fixes pre-sabado (dedupe handoff 5min, SOFT_NO "confirmo", parser HH:MM). Validacion SQL: 0 nuevos handoffs duplicados post-deploy. Commits `d33a72c` (fix) + `544e557` (estado) en `origin/main`.

### Analisis de salud bot post-Sprint 1 (12-15 May, pre-v62)

Metricas por cliente (4 dias):

| Cliente | Sesiones | % Exito | Handoffs | Msgs prom |
|---|---:|---:|---:|---:|
| Medilaser | 31 | 54.8% ✅ | 5 (16.1%) | 3.3 |
| Wilmer | 5 | 80% ✅ | 0 | 1.3 (botones) |
| Consultorio Familiar | 1 | 100% | 0 | 12.0 |
| Ecoclinicas | 0 | — | — | — |

### Analisis profundo de 5 handoffs Medilaser

**Solo 2 de 5 fueron intencionales.** Los otros 3 fueron fallos UX que escalaron:

| Sesion | Tipo | Bug raiz |
|---|---|---|
| Sury Madrid (3 handoffs) | 1 LEGÍTIMO + 2 BUG | Paciente NO registrada en BD intenta reagendar → bot escala inmediato en vez de pedirle nombre. v62 arregla dups, no la causa raiz. |
| ...0402 ("Del consultorio") | BUG | Paciente pedia direccion. FAQ no tolera typo "direcccion" (3 c). Auto-handoff a 3 fallos lo escalo sin dar pista. |
| ...2665 ("si me ayuda") | LEGÍTIMO causado por BUG | Flow reschedule via texto va a menu cancel_confirm. Paciente eligio "2" pensando reagendar pero era cancelar. Cita cancelada accidentalmente. Sprint 1 item 1.2 fixeo este flow solo para reschedule via BOTON, no para texto libre desde main_menu. |

### Decision: NO ejecutar Sprint 2 antes de Mendoza

Cumple [[no-data-inferida]]. Sprint 2 sale finales Mayo con ~7 dias de data real de Mendoza para informar sinonimos esteticos correctos sin inferencia.

### Backlog refinado Sprint 2 (priorizado por handoffs reales)

| # | Item | Casos reales |
|---|---|---|
| **A** | Paciente no registrado en reschedule → pedir nombre (NO escalar) | Sury Madrid |
| **B** | Tolerancia typos en FAQ keywords (normalizar dobles/triples letras) | "direcccion" |
| **C** | Reschedule via texto → directo a `booking_select_day` (extender item 1.2 Sprint 1) | ...2665 |
| **D** | Auto-handoff 3 fallos → dar pista antes ("¿Busca ubicacion/horario/precio?") | ...0402 |
| **E** (ya estaba) | Parser fechas naturales ("sera la otra semana") | Medilaser 6 abandonos en booking_select_day |
| **F** (ya estaba) | Aliases en `bot_service_types` | Mendoza estetica (post-data) |

### Pre-config Mendoza — sin email no bloquea

Diego no tiene email de Mendoza. Workaround: llamar a Mendoza/Dulce viernes 15-20 min, pedir 5-7 FAQs basicas por voz/WhatsApp (ubicacion, horario, precios botox/depilacion/criofrecuencia, formas de pago, politica cancelacion). NO requiere email.

### Riesgos — sin cambios desde update 15 May AM

1. **CRITICO:** Sabado Mendoza = decision binaria Torre Zafiro
2. **CRITICO:** Conversion doctor 25% (n=4)
3. **CRITICO:** Capacidad Diego 60-70% probable cae a 1-2h/dia
4. **ALTO MITIGADO:** Bot V2 baseline 28% → Sprint 1 50% Medilaser. Cancel_confirm 64.7% → 0%.
5. **ALTO:** Edificio quemable
6. **ALTO:** Canal finito ~50 asistentes Honduras

### Proximos pasos

- [ ] **Viernes AM (16 May):** QA Demo Bot — validar 3 fixes en demo real (~30 min)
- [ ] **Viernes mediodia:** Llamada Mendoza/Dulce 15-20 min — capturar 5-7 FAQs basicas
- [ ] **Viernes PM:** Pre-config Mendoza (servicios esteticos + FAQs capturadas)
- [ ] **Sabado 9:30 AM:** Instalacion Mendoza en sitio
- [ ] **Dias 1-7 post-instalacion:** Reporte diario WhatsApp a Dulce, acumular data uso real
- [ ] **Finales Mayo (~24-31 May):** Sprint 2 con data Mendoza informando aliases

---

## UPDATE 15 May AM — Validacion Sprint 1 + reframe pitch medico + Dulce-Torre Zafiro

### 1. Sprint 1 SUPERO metas (Medilaser, metrica oficial del plan)

Medido con `bool_or(state_after = 'completed')` — la metrica original del plan de humanizacion. Comparacion baseline 14-28 Abr (15 dias) vs Sprint 1 12-15 May (4 dias).

| Metrica | Baseline | Sprint 1 | Meta plan | Veredicto |
|---|---:|---:|---:|---|
| % Exito Medilaser | **30.9%** | **50.0%** | 45-50% post-S1 | ✅ HIT top del rango |
| Sesiones entradas a cancel_confirm | 17 | 1 | — | -94% volumen |
| % Abandono cancel_confirm | **64.7%** | **0.0%** | 30% post-S1 | ✅✅ OVER-DELIVER |

Hallazgo critico: item 1.2 (`handleDirectReschedule` redirige a `booking_select_day` en vez de mostrar menu "Reagendar/Cancelar/Volver") **erradicó el bug de abandono masivo**. El paciente ya no se atora en el menu intermedio porque ya no existe.

Wilmer: baseline 0% (5 sesiones) → Sprint 1 75% (4 sesiones). n bajo pero direccion clarisima.

Yeni/CF + Ecoclinicas: sin actividad (0 sesiones nuevas en Sprint 1). Bajo volumen confirmado.

**Sprint 1 funciona. Mendoza arranca el sabado con bot validado.**

### 2. Dulce administra ~5 medicos en Torre Zafiro — reframe Mendoza

Diego confirmo el dato. Implicacion: Mendoza NO es cierre individual de $40. Es **caso ancla del edificio entero**.

Si la instalacion sale bien:
- Dulce pasa a los otros 4 medicos del edificio (no es pitch frio — es referido interno validado)
- Conversion doctor "via Dulce" probablemente ≥60% vs 25% en frio
- LTV potencial Torre Zafiro: **$120-200/mes** (Mendoza + 2-4 de 4 doctores adicionales)

Si la instalacion sale mediocre:
- Perdemos credibilidad con Dulce
- Por extension, perdemos Torre Zafiro entero
- Conversion doctor del canal asistente se mantiene en 25% (riesgo critico del plan del 14 May)

**Path critico absoluto**: sabado 16 May 9:30 AM no es "instalacion #5", es **decision binaria sobre Torre Zafiro**. Reporte diario a Dulce los primeros 7 dias = inversion en la gatekeeper, no solo en Mendoza.

### 3. Pitch medico: enterrar "70% fuera horario", usar 3 datos reales

El dato "70% interactua fuera de horario" del plan del 14 May NO se sostiene con SQL real. Medicion `message_logs.patient_reply` ultimas 4 semanas:

| Cliente | % fuera horario 17+ | % 18-21h |
|---|---:|---:|
| Medilaser (ICP-A real) | **23%** | 17.7% |
| Consultorio Familiar | 14% | 0% |
| Wilmer (outlier sin asistente) | 77% | 15% |

Wilmer 77% engaña — describe un mundo sin asistente. Doctor de Torre Zafiro tiene asistente. NO usar como argumento.

**Datos reales para pitch medico (Medilaser, 28 dias, 98 recordatorios enviados):**

| Numero | Significado vendible |
|---|---|
| **96.9% de recordatorios mueven la cita** | Confirma (40.8%) + auto-libera (47.9%) + cancela manual (11.2%). Solo 3.1% son artefactos de bug menor. |
| **48% de citas se ajustan ANTES del dia** | 47 slots por mes vendibles a otro paciente (47 auto-cancel + 11 manual). Brutalmente real. |
| **~18 mensajes por semana llegan despues de las 5pm** | Concreto, no inflado. Dulce confirmo el patron 7-9pm. |
| **92% prediccion no-show via autocancelacion** | Validado por Marleny. EL ancla mas fuerte. Sin asteriscos. |

Ranking de poder vendible: **#92% > #48% > #96.9% > #18 mensajes/sem**.

### 4. Bot natural en Medilaser — happy paths descubiertos

Sesion SQL revelo: **13 happy paths puros en 55 dias** (~7/mes) — pacientes nuevos que entraron por iniciativa propia, navegaron menu, agendaron cita nueva sin reagendar ni recordatorio.

- 12 de 13 = **pacientes NUEVOS en BD** (el bot los creo durante la sesion)
- 8 de 13 (62%) = **fuera de horario laboral** (5pm-11pm + madrugada)
- 3 happy paths completaron en ≤3 minutos (pacientes decididos)
- 1 ya existia antes (caso atipico, 2 min)

**Implicacion ventas:** 62% de pacientes que se autoagendan lo hacen cuando la asistente cerro. Sin bot, esos se enfrian. Esto SI valida un pitch real: *"6 de cada 10 pacientes que se agendan solos lo hacen despues que su asistente se fue."*

### 5. Bugs detectados post Sprint 1 — 3 fixeables antes del sabado

Barrido de produccion 12-15 May detecto 3 bugs reales fixeables en ~55 min total. Plan en [[estado-dev]]:

| # | Bug | Fix |
|---|---|---|
| 1 | Dedupe handoffs solo a 5s — Sury Madrid escalo 3 veces en 2 min | Ampliar ventana 5s → 5min |
| 2 | "Yo le aviso" no clasifico como SOFT_NO — paciente loop en main_menu | Agregar variantes "yo le aviso" al detector |
| 3 | Horas tipo "8:15" no aceptadas en booking_select_hour — paciente sufre 4 min | Regex HH:MM en handler |

Fix #1 critico para Mendoza: Dulce/asistentes NO PUEDEN recibir notificaciones duplicadas — destruye confianza desde dia 1.

Fix #3 critico para Mendoza: pacientes esteticos escriben horas literales ("9 am", "2:30"), no numeros del menu.

### 6. Bugs de observabilidad descubiertos (backlog post-sabado)

1. **`appointment_released` no se loguea siempre** — 13 de 47 auto-cancelaciones (27.7%) NO crean event en `message_logs`. Reportes basados en message_logs subestiman cancelaciones ~28%. Postponer.
2. **Recordatorios huerfanos** — 3 de 98 (3%) sin `appointment_id`. Race condition probable.
3. **`bot_conversation_logs` con duplicacion 4-6x** — 521 logs inbound vs 113 mensajes reales en `message_logs` (Medilaser, 28 dias). NO usar bot_conversation_logs para contar volumen — solo para flujo de estados.

### 7. Limpieza memoria — Lovable

Lovable fue cancelado hace tiempo. Quitar de "acciones pendientes" en cualquier UPDATE futuro. Ver [[suscripciones-ai]] (si existe — sino, ignorar).

### Acciones hoy/manana

- [ ] **Jueves PM (15 May):** Fix #1 (dedupe handoffs) + Fix #2 (SOFT_NO "yo le aviso") + deploy + tests (~50 min)
- [ ] **Viernes AM (16 May):** Fix #3 (horas HH:MM) + deploy + QA demo bot (~75 min)
- [ ] **Viernes PM (16 May):** Pre-config Mendoza — servicios esteticos + 5-7 FAQs pre-cargadas (ubicacion, horarios, precios botox/depilacion/criofrecuencia, formas de pago, politica cancelacion) (~1.5h)
- [ ] **Sabado 16 May 9:30 AM:** Instalacion Mendoza en sitio (~2h) — obsesion en calidad
- [ ] **Dias 1-7 Mendoza:** Reporte diario WhatsApp a Dulce (10-15 min/dia)

### Riesgos reordenados (delta vs 14 May)

1. **CRITICO: sabado Mendoza = decision binaria Torre Zafiro.** Mitigacion: 3 fixes pre-sabado + pre-config FAQs + reporte diario Dulce.
2. **CRITICO: conversion doctor 25% (n=4)** — sin cambios desde 14 May. Tarjeta credibilidad + pitch corregido salen finales Mayo.
3. **CRITICO: capacidad Diego 60-70% probable cae a 1-2h/dia** si entra trabajo en 4-6 sem.
4. **ALTO: bot V2 28% baseline.** **MITIGADO PARCIAL** — Sprint 1 valido, Medilaser 50% exito, abandono cancel_confirm 0%. Falta Sprint 2 para que pacientes nuevos entiendan fechas/horas naturales.
5. **ALTO: edificio quemable** (1 demo mala = perder 5-10 doctores). Reforzado por Dulce 5 medicos.
6. **ALTO: canal finito** ~50 asistentes total Honduras.
7. **MITIGADO**: ads pausadas, sesgo costo marginal documentado.

## UPDATE 14 May — Debrief 6 demos + busqueda trabajo + replanteo cronograma

### Marcador real de las 6 demos (12-14 May)

| Demo | Doctor respondio | Outcome |
|---|---|---|
| Ingrid (Torre Zafiro) | No (medicos part-time entre hospitales) | Bloqueada estructural |
| Sulay (Torre Zafiro) | Si, vago | Rechazo "no ven potencial" |
| Maryori → Dr. Hernandez | Si | Rechazo educado (no quiso probar bot, muy ocupado) |
| Dulce → **Dra. Mendoza** (estetica) | Si | **CIERRE $40 — instalacion sab 16 May 9:30 AM** |
| Dunia (CMH) | Logistica similar a Ingrid | Sin abrir puerta |
| Escarleth (Hospimed) | Si | Rechazo "no veo beneficio" — puerta abierta para volver |

**Conversion doctor real: 1 / 4 = 25%** — por debajo del threshold 30% del plan del 11 May.

### Insights operativos clave

1. **Medicos NO necesitan probar el bot.** Mendoza cerro sin probar, Hernandez rechazo sin probar. Entienden concepto en 5s. El demo del producto no mueve la aguja.
2. **Diferencia cierre vs rechazo:** tiempo del medico + dato especifico de comportamiento. Mendoza tuvo espacio, Diego pivoteo a "confirman 7-9pm" → ella valido con razon propia ("ya estan en casa") → cerro. Hernandez estaba ocupado en pasillo → rechazo.
3. **"Reservar cita formal con medico" es contracultural** — medicos hondurenos tienen puertas cerradas a terceros que "generan gastos". Solo funciona ventana organica de 10 min entre pacientes. Cambio de pitch a asistente: *"aviseme cuando tenga 10 min libres y regreso"*, no *"agendeme cita"*.
4. **Patron "no veo el beneficio" = dolor invisible para medico que no opera sistema** (confirmado de hallazgo 22 Abr). El dolor que SI siente: queja paciente "nunca me contestan en recepcion" + ~70% interactua fuera de horario. Ese es el pitch medico nuevo.

### Mendoza — detalles del cierre

- $40/mes precio base. **1 medica + 3 asistentes** (Dulce incluida).
- **Ya paga $100/mes** por software de historial clinico con recordatorios manuales. Tu $40 NO es objecion de precio, es valor.
- Empezo esceptica → Diego pivoteo a dato real (confirman 7-9pm) → ella valido → autoridad → cerro.
- Solo 1 numero WhatsApp principal (secundario tirado sin uso meses).
- **Instalacion sabado 16 May 9:30 AM** — path critico absoluto.

### Instalacion Mendoza — decisiones

- **Instalar en numero principal** (Mendoza autorizo). NO migrar al celular de Dulce — perderia 30 dias de cronograma para evitar 7 dias de incomodidad emocional.
- **Vista de chats no existe en dashboard** (feature freeze Junio) → reportes diarios manuales Diego→Dulce primeros 7 dias, despues semanales.
- Framing al cliente: *"soporte premium primeros 14 dias"* — convertido en valor, no en culpa.
- Costo Diego: ~1.5h primera semana. Sostenible incluso si entra a trabajo.

### Busqueda de trabajo Diego — variable critica

Diego tiene 2 procesos activos:
1. **Analista de Marca** — entrevista 14 May, probable etapa 2 proxima semana. Ya trabajo ahi antes con buenas referencias. Conoce persona interna que se quedo con buena impresion.
2. **Customer Success & Implementation Specialist** — agencia colocando.

**Probabilidad real: 60-70%** de conseguir uno en proximas 4-6 semanas.

Implicaciones si entra a trabajo:
- Tiempo OrionCare baja de 4-5h/dia a **1-2h/dia sostenible**.
- Ingreso fijo $1,000-2,500/mes Honduras = **paz mental cubierta sin esperar $1,500 MRR**.
- OrionCare pasa a "compound interest mode": defender clientes + crecimiento lento sin presion.
- Customer Success es skill 100% transferible a OrionCare cuando vuelva al ritmo completo.

**Esto NO es fracaso de OrionCare — es desacoplar seguridad economica de curva MRR.** Mejor decision a 3 anos. Reduce ansiedad → mejores decisiones de producto.

### Cronograma realista actualizado

| Periodo | Modo | Output |
|---|---|---|
| 14-31 May | Defensivo + Mendoza acumula data | 1 cierre confirmado (Mendoza). No agendar demos nuevas. |
| Lun 19 May | Ultimo seguimiento Dunia + Ingrid informal | Si no abre ventana organica, cerrar ciclo. No insistir. |
| 1-7 Jun | Tarjeta credibilidad + testimonial Mendoza listo | Material listo con caso Mendoza (perfil real ICP-A) |
| 8-30 Jun | Cierres con tarjeta + pitch medico "queja paciente + 70% fuera horario" | 3-5 edificios SI conversion sube a 40%+ |
| Jul | Ramp up canal asistente | 4-6 edificios |

**Paz mental ($1,500 = 8-9 edificios): realista Ago-Sep 2026, NO Jun-Jul.** Ajuste vs plan del 11 May que asumia ritmo optimista.

### Sprint del bot — decisiones

- **Sprint 1 deployed 11 May** (commit 2fb53f4 hotfix). Pendiente validar metricas en produccion ANTES del sabado de Mendoza.
- **Sprint 2 NO ejecutar antes del sabado.** Solo 3 dias desde Sprint 1, sin data; Mendoza es estetica (perfil nuevo), disenar sinonimos sin ver mensajes reales = inferir data de negocio (viola [[no-data-inferida]]).
- **Sprint 2 sale finales Mayo** con data real de Mendoza informando sinonimos correctos para estetica.
- **Sprint 3 (wizard onboarding) sale Junio**, ya en ritmo nuevo (con o sin trabajo).

### Tarjeta de credibilidad — POSTERGADA hasta finales Mayo / principios Junio

Decision correcta: esperar 2-4 semanas hasta data de Mendoza para que el testimonial valga 10x mas. Wilmer perfil ≠ perfil prospecto (general independiente vs especialista multi-staff). Mendoza es primer caso del perfil real.

Mientras tanto: scouting solo de ASISTENTE (no doctor), pitch verbal con datos duros (% mensajes 18-21h, % cancelacion predicha 92%, etc.). NO forzar conversacion con medico sin material.

### Sesgo de costo marginal de Diego — documentado

Confrontado 14 May. Diego tiende a sub-valorar el precio y a tomar decisiones operativas que priorizan incomodidad de corto plazo sobre valor de mediano plazo, ambos por el mismo sesgo: confundir costo marginal propio con valor para el cliente. Anclajes documentados en [[pricing-costo-marginal]] para recordatorio en futuras conversaciones.

### Riesgos reordenados

1. **CRITICO: capacidad Diego cae 60-80%** si entra a trabajo. Mitigacion: modo defensivo desde ya, producto sin bugs antes de Junio, no agregar clientes que requieran handholding.
2. **CRITICO: conversion doctor 25% (n=4)** por debajo del threshold. Si no sube con tarjeta + pitch nuevo, techo canal asistente baja a ~$1,000-1,300 MRR.
3. **ALTO: edificio quemable** — 1 demo mala pierde 5-10 doctores. Calidad > velocidad. Aceptar rechazo sin insistir.
4. **ALTO: canal finito** ~50 asistentes total Honduras.
5. **MEDIO: bot V2 28% exito baseline** — Sprint 1 deployed, falta medir.
6. **MITIGADO**: ads quemando capital (pausadas).
7. **NUEVO/MITIGADO**: sesgo costo marginal de Diego → ver [[pricing-costo-marginal]]. Confrontado 14 May.

### Acciones esta semana (~10-12h total)

- [ ] Hoy/manana: SQL Sprint 1 ultimos 3 dias vs baseline 14-28 Abr (30 min) — validar antes de Mendoza
- [ ] Hoy/manana: SQL "% mensajes entre 18-21h" ultimas 4 semanas para pitch medico (15 min)
- [ ] Vie 15: pre-config Mendoza (servicios esteticos, horarios, FAQs basicos) — 1.5h
- [ ] Sab 16 9:30 AM: instalacion Mendoza obsesiva en calidad — 2h
- [ ] Dias 1-7 Mendoza: reporte diario WhatsApp a Dulce — 10-15 min/dia
- [ ] Lun 19: ultimo seguimiento Dunia + Ingrid informal — 2-3h
- [ ] Mie 20: seguimiento Maryori SOLO si ella escribe primero
- [ ] Diario durante onboarding Mendoza: actualizar `diccionario-hondurenismos.md` con frases estetica

## UPDATE 11 May — Canal asistente validado + ICP final + reframe meta

### Hallazgo critico: canal asistente multi-doctor validado en una salida

Diego visito edificios medicos en Tegucigalpa (Torre Zafiro, CMH, Hospimed) en **medio dia** y agendo 6 demos para esta semana con asistentes champion. Pitch validado:

**Apertura sin OrionCare:** *"Estoy ayudando a las clinicas a digitalizar y simplificar el proceso de administracion de citas — un asistente virtual para USTED *(enfasis en usted)* la asistente."*

**Preguntas calificadoras (SPIN):**
1. ¿A que hora deja de contestar mensajes? → respuesta comun: **4 PM**
2. Al dia siguiente, ¿cuantos mensajes acumulados? → **10-20 mensajes POR medico**
3. ¿Cuales son las mismas preguntas? → "casi todos son lo mismo" (precios, ubicacion)
4. ¿Si le reduzco 80% de ese trabajo, como se sentiria? → 100% respondieron positivo tras ver demo

**Cierre demo:** Mostrar bot agendando + plataforma → "me ayudaria mucho" → abren puerta a segunda visita (con doctor).

### 6 demos agendadas esta semana

| Asistente | Edificio | Dia/hora | Estado |
|-----------|----------|----------|--------|
| Ingrid Espino | Torre Zafiro | Mar 12, 3 PM | Confirmado |
| Suley Coello | Torre Zafiro | Mar 12, PM | Confirmado |
| Maryori/Isabel | Torre Zafiro | Mar 12, 3:30 PM | Confirmado |
| Dulce Torres | Torre Zafiro | Mie 13, 3 PM | Confirmado |
| Dunia | CMH | Mie 13, AM | Confirmado |
| Escarleth | Hospimed | Jue 14, AM | Confirmado |

**Filtro presencial confirmado:** En Hospimed 1.5 de varias dijeron si (champion), las otras dieron portazo (no calificadas). El pitch auto-filtra sin quemar el edificio. **Modelo replicable sin vendedor experto.**

### TAM canal asistente — corregido

- **~50 asistentes champion en TODA Honduras** (no por ciudad)
- Quedan ~2 edificios mas en Tegucigalpa por visitar
- Resto en SPS, La Ceiba, otras ciudades = ~30-35 asistentes
- Cierre realista 40% → ~20 edificios convertidos
- Doctores promedio/edif: 3-5 (rango 2-16)
- **MRR techo del canal: ~$3,000-5,000** ($40 + $35×(N-1) por edificio)

Conclusion: canal asistente **finito y agotable en 60-90 dias** de ejecucion concentrada. Llega holgadamente al hito de $1,500 paz mental. NO llega a $7K solo — requiere motor #2 despues (decision diferida a Julio+).

### Reframe meta: $1,500 paz mental (Q2-Q3 2026)

**Nuevo hito explicito antes de $7K:**

| Meta | MRR | Clientes | Plazo realista | Significado |
|------|-----|----------|----------------|-------------|
| **Paz mental** | **$1,500** | 8-9 edificios | **Jun-Jul 2026** | Cubre vida + permite ahorrar |
| Libertad | $7,000 | ~40 edificios | 2027+ | Objetivo original, no urgencia |

**Horizonte real:** 3 anos para llegar a libertad. Primeros 12-18 meses criticos para **cash conservation y acumular efectivo protegido**. Cada dolar mal gastado tiene costo de oportunidad alto. Implicacion para decisiones: ROI rapido y conservacion de capital > experimentos de largo plazo.

### ICP — formalizacion final

**OUT definitivo** (ya no targeting):

| Segmento | Razon |
|----------|-------|
| Medico independiente sin asistente | Wilmer outlier feliz. 1.6 msgs/dia. No replicable. |
| Medico con asistente sin saturacion | No hay dolor → no compra |
| Medico que va a contratar asistente | Ya decidio "humano, no sistema". Invisible Y resistente. |

**IN definitivo:**

| Segmento | Canal | LTV |
|----------|-------|-----|
| **Edificio medico con asistente champion multi-doctor** | Presencial puerta a puerta | $180-400 MRR/edif × 12+ meses |
| **Clinica con volumen + asistente saturada** | Ads ICP-A (futuro, post $1,500) | $75-180 MRR × 12+ meses |

Wilmer/Yeni quedan como clientes activos por ingreso y testimonial, **NO se replican como targeting**. Yeni requiere acompanamiento quincenal (defensa churn). Wilmer ya hizo su trabajo (testimonial).

### Decision ads: PAUSADAS hasta llegar a $1,500

ROI comparativo brutal:
- Ads pagas (45 dias): 1 cierre / 117 leads / $267 → CPA $267
- Asistentes presencial (1 salida): 6 calientes / ~$10 gasolina → ~$2 lead calificado
- **Presencial: >100x ROI que ads**

Reactivar SOLO cuando:
1. MRR ≥ $1,500
2. Sprint 3 del bot completado (producto ≥50% success rate)
3. Targeting estricto ICP-A puro (no doctor independiente)
4. Presupuesto minimo $3-5/dia
5. Canal asistente agotandose o estancado

### Capacidad Diego — restriccion real

- **Diego solo es el cuello de botella.** Warhol en casa con nino, no acompana en ventas por ahora.
- Sin embargo, ritmo real es ~2x lo que asumi: 6 contactos en medio dia cuando estan concentrados en edificios.
- Esta semana al limite: Sprint 1 (9.5h) + 6 demos + activacion clientes
- Sostenible mientras dure (mximo 4-5 hrs/dia)

### Cronograma actualizado

| Semana | Foco |
|--------|------|
| 11 May (hoy) | Sprint 1 bot (9.5h) |
| 12-16 May | 6 primeras visitas asistente |
| 19-23 May | Segundas visitas (doctores) + 2 edificios restantes Tegucigalpa + Sprint 2 inicio |
| 26 May - 6 Jun | Activar primeros cierres + Sprint 2 + Sprint 3 |
| 9-13 Jun | Viaje SPS (sab-lun, ~$300) — si conversion doctor ≥30% |
| Resto Jun | La Ceiba + activar SPS |
| Jul | Canal asistente agotado → decidir motor #2 |

**Proyeccion realista:** 10-12 edificios cerrados fin de Junio = **$1,800-2,400 MRR**. Paz mental antes de Julio si todo sale bien.

### Riesgos reordenados

1. **CRITICO: % conversion doctor desconocido.** La asistente es champion pero NO paga. El doctor decide. Toda la tesis del canal colapsa si los doctores no cierran. Validacion empieza la semana del 19 May.
2. **ALTO: canal finito.** 50 asistentes total. 60-90 dias de motor concentrado, despues necesitas motor #2.
3. **ALTO: capacidad Diego.** Sin Warhol en ventas, el cuello de botella es real. Sostenible para esta fase pero impide paralelizar.
4. **ALTO: edificio quemable.** 1 demo mala con asistente = perder 5-10 doctores del edificio. Calidad > velocidad.
5. **MEDIO: bot V2 actual (28% exito).** Si los doctores nuevos llegan antes del Sprint 1 deployed, churn anunciado. Sprint 1 hoy es path critico.
6. **MITIGADO: ads quemando capital.** Pausadas. No reactivar hasta $1,500.
7. **ELIMINADO: Alan / The Brand Be.** No hubo respuesta despues de la reunion. No persistir.

### Acciones hoy

- [ ] **Sprint 1 humanizacion del bot** (9.5h, plan en `.claude/plans/bot-humanizacion.md`)
- [ ] Cancelar Lovable si no se ha hecho ya (cash conservation)

### Acciones esta semana

- [ ] 6 demos asistente (mar 12, mie 13, jue 14)
- [ ] Medir post-demo: % asistentes que efectivamente abrieron puerta a doctor

> Ultima actualizacion previa: 4 May 2026 (plan de humanizacion del bot en 3 sprints + diccionario de hondurenismos)

## UPDATE 4 May — Plan de humanizacion del bot definido

**Decision:** ejecutar plan de 3 sprints (~26.5h en 6 semanas) para que el bot procese lenguaje natural hondureno sin IA. Documentos producidos:

- `.claude/plans/bot-humanizacion.md` — plan completo con items, estimaciones, resultados esperados, mapping a Tiers originales, riesgos y bitacora de medicion
- `.claude/memory/diccionario-hondurenismos.md` — vivo, base de 2,357 mensajes reales (25 Feb - 4 May), 14 categorias de intent, 5 reglas culturales documentadas

**Arquitectura adoptada (capas):**
- **Capa universal** (estatica, codigo): hondurenismos + intents top + parser fechas/horas. ~50 frases. Estable.
- **Capa cliente** (dinamica, DB): `bot_faqs.keywords` + `bot_service_types.aliases`. Crece sin deploy. Cliente nuevo configura en onboarding.

**Hallazgos clave de la investigacion (4 May):**

1. **Boton "No puedo asistir" SI esta wired** en meta-webhook+bot-handler — el problema es UX (menu redundante "Reagendar/Cancelar/Volver" tras presionar el boton). 47% abandono en cancel_confirm.
2. **Caducidad NO es el problema** — 17/23 respondieron en <30 min del recordatorio. Todos dentro de la ventana 24h de WhatsApp.
3. **Bug de logging confirmado:** 23 "No puedo asistir" en `bot_conversation_logs` V2 vs 0 contraparte en `message_logs`. Templates en Meta SI tienen el boton (Diego verifico). Hay bug en logMessage o duplicate detection. Item 1.7 del plan.
4. **FAQ matching sin umbral:** `searchFAQ` retorna match con score=0.25 (un prefijo) — explica por que Wilmer responde "consulta de diagnostico" cuando preguntan "limpieza". Bug T2#7.
5. **bot_service_types sin sinonimos:** "Citologia" no matchea "papanicolau", "Procedimiento" no matchea "tatuaje". Sprint 2.
6. **Onboarding wizard solo tiene 4 pasos** (Clinica, Medico, Horario, Confirmacion) — no captura servicios ni FAQs. Cliente nuevo arranca sin vocabulario. Sprint 3.

**Metricas baseline V2 (14-28 Abr) — punto de partida para medicion:**

| Cliente | Sesiones | Exito | Abandono cancel_confirm | Opciones invalidas |
|---------|---------:|------:|------------------------:|-------------------:|
| Medilaser | 54 | **31.5%** | 62.5% | 22% del total |
| Wilmer | 6 | **0%** | 100% | — |
| Yeni/CF | 5 | 40% | 100% | — |
| Ecoclinicas | 2 | 0% | — | — |
| **Total** | **67** | **28.4%** | **70%** | — |

**Metas post Sprint 3:**
- Exito agregado >50%
- Abandono cancel_confirm <25%
- Opciones invalidas <10%
- Wilmer >40%, Medilaser >55%, Yeni/CF >55%
- Cliente nuevo >90% configurado dia 1 con vocabulario

**Cronograma:**
- 5-11 May: Sprint 1 (~9.5h, 3 sesiones)
- 12-18 May: medicion + ajustes
- 19-25 May: Sprint 2 (~8h)
- 26 May - 1 Jun: medicion
- 2-8 Jun: Sprint 3 (~9h)
- 9-15 Jun: medicion + cliente nuevo de prueba

**Items Sprint 1 (priorizados, en estado-dev.md):**
1.1 Crear `_shared/honduras-intents.ts` (3h)
1.2 Aplicar detector en greeting/main_menu/cancel_confirm/handleDirectReschedule (2h)
1.3 Migracion `bot_faqs.min_match_score` (30min)
1.4 Ajustar `searchFAQ` con umbral (30min)
1.5 Bug `user_message=""` + dedupe handoffs (1h)
1.6 Logging boton "Confirmar" (1h)
1.7 Bug logging button_replies que van al bot (1h)

**Mapping a Tiers originales:** cero items perdidos. T1#1-4, T2#5-7, T3#8-10 todos cubiertos en sprints.

> Ultima actualizacion previa: 28 Abr 2026 (analisis exhaustivo del bot por cliente — 56 sesiones documentadas)

## UPDATE 28 Abr — Analisis bot V2 (14-28 Abr) por cliente

**3 reportes nuevos en `docs/`:**
- `analisis-bot-medilaser-14abr-vs-28abr.md` — comparativo V1 vs V2 Medilaser
- `analisis-bot-por-cliente-14abr-28abr.md` (no escrito como archivo, en conversacion) — patrones por los 4 clientes
- `analisis-bot-detalle-pacientes-14abr-28abr.md` — **56 sesiones palabra por palabra** para lectura/analisis manual

**Distribucion outcomes V2 (14-28 Abr):**

| Cliente | Sesiones | Reagendo OK | Agendo OK | Escalo | Aband CC | Aband Booking | Tasa éxito |
|---------|---------:|------------:|----------:|-------:|---------:|--------------:|-----------:|
| Medilaser | 44 | 7 | 5 | 4 | 11 | 4 | 27% |
| Yeni/CF | 5 | 0 | 1 | 0 | 1 | 2 | 20% |
| Wilmer | 5 | 0 | 0 | 0 | 3 | 0 | **0%** |
| Ecoclinicas | 2 | 0 | 0 | 0 | 0 | 0 | 0% |

**Hallazgos criticos:**

1. **Wilmer 0% éxito en 14 dias.** Tu cliente NPS 9.5/10 testimonial estrella. 5 sesiones, 3 abandonos en cancel_confirm, 1 prospecto web perdido por FAQ erroneo, 1 disculpa formal "no podre asistir" rebotada. **Riesgo:** si descubre que el bot le pierde pacientes, dana la relacion. **Oportunidad:** caso real para vender "polish de bot".

2. **15 confirmaciones explicitas perdidas en Medilaser** — pacientes escribieron "Confirmo mi asistencia", "Confirmo ✅", "Listo gracias", "Ahi estare" y el bot las trato como saludos. Todas esas citas probablemente se marcaron como no-confirmadas y se liberaron.

3. **El boton "No puedo asistir" del recordatorio no esta wired.** "No puedo asistir" aparece literal 17 veces en 4 clientes — es texto de un boton interactivo de Meta WhatsApp que el sistema recibe como texto plano. El paciente cree que ya aviso, ve un menu nuevo y abandona.

4. **Pacientes hondurenos hablan al bot como humano.** Yeni/CF: 100% de sus pacientes escriben en libre ("Sita", "Holis", "Mire q tengo clases"). Medilaser tiene mezcla. Frases reales rechazadas: "Para el 14 de Mayo preferiblemente", "Confirmo ✅", "Hola fijese que la cita era para el dia viernes". El bot SI clasifica intent correcto, pero el SEGUNDO paso solo acepta numeros — abandono masivo ahi.

5. **Bug nuevo del 24 Abr** — 3 sesiones (M37, Y5 final) con `user_message=""` desde main_menu disparando handoffs duplicados en milisegundos. Probable: bot recibe sticker/audio/ubicacion sin transcribir y default-escala. Costo investigacion: 30 min.

6. **2 pacientes desde EEUU asumieron consulta online** (M36 Dariela, M40 Edwin) — agendaron presencial. Probable no-show.

7. **Tesis "autocancelacion = prediccion no-show" sigue viva.** Medilaser V2: 19/32 citas creadas = canceladas (59%, vs 44% historico). Cero marcadas como `completada`/`no_asistio` — sigue gap de adopcion del estado real.

**Para conversacion Marleny martes 28 Abr:**
- Llevar dato 59% canceladas (vs 44% historico)
- Preguntar percepcion no-shows
- Validar cuales de M36/M40 (US) llegaron o no
- Preguntar si el botón "No puedo asistir" se ve como botón en el WhatsApp del paciente o como texto

**Acciones pendientes (orden de impacto):**
1. Investigar bug `user_message=""` 24 Abr (30 min)
2. Investigar boton "No puedo asistir" — payload Meta vs texto (1h)
3. Aceptar texto libre en `cancel_confirm` ("reagendar"/"cancelar"/"confirmo"/"ok") (1h)
4. Intent `consultar_mi_cita` (2h)
5. Logging del boton Confirmar (sin implementar desde 14 Abr)

**Decisiones pendientes:**
- ¿Se le muestran los hallazgos a Wilmer o se arregla primero?
- ¿Yeni/CF es churn aceptable dada la incompatibilidad cultural (lenguaje natural vs flujo numerado)?
- Implementar fixes ANTES de cualquier escalamiento de ads, dado que estamos perdiendo pacientes que ya estan en la puerta.

> Ultima actualizacion previa: 23 Abr 2026 (ICP formalizado A+B en paralelo, scouting de edificios medicos iniciado)

## UPDATE 23 Abr — ICP definido formalmente

**Decision tomada:** perseguir **ICP-A (Clinica con Volumen)** e **ICP-B (Asistente Multi-doctor Champion)** en paralelo los proximos 60 dias. Documento formal en `.claude/memory/icp.md`.

**Validacion cuantitativa del threshold 20+ msgs/dia** (query 23 Abr a bot_conversation_logs, 30 dias):

| Cliente | msgs/dia (30d) | Pacientes unicos | Dias activos | Clasificacion |
|---------|---------------:|-----------------:|-------------:|---------------|
| Medilaser | **21.4** | 109 | 28/30 | **ICP-A puro** |
| Ecoclinicas (David) | 3.0 | 9 | 9/30 | NO-ICP rechazable |
| Consultorio Familiar (Yeni) | 1.6 | 7 | 9/30 | NO-ICP orgánico tolerado |
| Wilmer Guevara | 1.6 | 10 | 11/30 | NO-ICP orgánico tolerado (feliz accidental) |

**Hallazgo clave:** Wilmer y Yeni tienen **mismo volumen** (1.6 msgs/dia) pero Wilmer retiene feliz (NPS 9.5) y Yeni requiere acompanamiento quincenal. Conclusion: Wilmer es un outlier no replicable — cliente feliz accidental, no ICP. Los medicos individuales NO escalan automaticamente (Wilmer lleva 5 meses en 1.6 msgs/dia).

**Dato Wilmer sobre Google reseñas:** "casi no invierto en publicidad, mi fuente es Google con reseñas". Implicacion: los medicos hondurenos individuales NO invierten en marketing → no llegan al threshold nunca → el bot-closer (Junio+) NO los convierte en ICP. Closer amplifica a quien ya invierte; no crea inversion.

**Accion: scouting de edificios medicos** para identificar ICP-B (asistentes multi-doctor). Ver seccion "Plan scouting edificios" abajo.

**Proximos actualizacion de assets:**
- [Claude /modo-ads] Actualizar creativos y scripts con ICP formalizado (senal = volumen, canal = agencia + edificios)
- [Claude /modo-seguimiento] Integrar checklist de 6 preguntas de calificacion ICP a scripts de llamada fria
- [Diego + Claude] Perfil de afiliado Manuel con nuevo filtro: no medico independiente generico, medico que invierte en marketing

## UPDATE 22 Abr — sintesis de sesion

**Canal asistente 7 doctores: ENFRIADO.** Respuesta via texto "los medicos dijeron que por los momentos no". Diagnostico pendiente viernes (Diego visitara clinica pendiente del mismo edificio + pasa a saludar a la asistente con curiosidad genuina, NO rescate). Hipotesis mas probable: miedo de la asistente a ser reemplazada filtro el mensaje; los doctores probablemente nunca vieron el producto. Regla: no insistir con esta asistente — quemarla significa perder el edificio completo.

**Buyer persona refinado (hallazgo critico).** Diego visito 2 clinicas con asistente y volumen bajo (5-10 msgs/dia). Ambas NO son ICP. **Senal real = volumen de mensajes WhatsApp/dia, NO rol administrativo.**
- 20+ msgs/dia = dolor real = ICP
- 5-10 msgs/dia = no ve beneficio
- <5 msgs/dia = churn garantizado
- Pregunta permitida para calificar: *"¿como manejan los mensajes de pacientes en WhatsApp?"* (NO preguntar volumen de pacientes — regla Honduras)
- Impacto: ads, scripts y perfil afiliado Manuel deben actualizarse con esta senal.

**David Diaz (Ecoclinicas): churn aceptado.** Dijo que si deja de pagar solo "pausaria". Sin capital publicidad → bot invisible → no ICP. No invertir tiempo rescatando. Aceptar como aprendizaje: medicos sin capital publicidad NO son ICP.

**Nueva hipotesis estrategica: bot como conversion engine para agencias de marketing.** Reframe del canal B2B: agencia de marketing trae leads caros, pero clinica tarda horas en contestar y 70-80% se enfrian. Bot cierra ese gap (respuesta en 5s). Positioning nuevo: no es "vende mi bot", es "mi producto resuelve el problema #1 de tu servicio".

**Primer contacto agencia: Alan R. Bulnes / The Brand Be (agencia branding, Tegucigalpa).** Diego le vendio un monitor previamente. Al enviarle audio describiendo bot + buscar si tiene clinica cliente, Alan respondio afirmativo y acepto reunion presencial. Reunion propuesta 23 Abr en su oficina (pendiente confirmar hora). Perfil: agencia de branding corporativo (Lacthosa, Unilever, USAID en portfolio) — NO performance marketing, pero tiene al menos 1 clinica como cliente. Arquetipo: ex-corporativo emprendiendo, profesional, 18 anos experiencia. Guion reescrito como reunion caliente (no frio) en `docs/ventas/guion-agencia-marketing.md`. Objetivo concreto: salir con fecha de piloto en la clinica actual de Alan, O presentacion directa a esa clinica, O segunda reunion con agenda cerrada. Decisiones pre-tomadas: piloto 90 dias sin contrato, 25% × 12 meses, precio $40/$75 firme, sin exclusividad.

**Insight dual de propuesta de valor (22 Abr).** El producto tiene DOS propuestas para DOS audiencias: (1) a la asistente = "menos trabajo", traccionado por canal asistente interno; (2) al medico = "convierte leads caros en pacientes", traccionado por canal agencia marketing. El medico directo no siente dolor operativo (no usa el sistema). Por eso los ads con angulo "eficiencia operativa" no convierten medicos directamente — necesitan canal mediado (asistente o agencia). Ambos canales se refuerzan: agencia trae lead → bot agenda → asistente administra sin saturacion → medico ve ingresos. Implicacion: no construir ads ataque-directo al medico con angulo ingresos; apalancarse en funnel existente de la agencia (sales enablement, no campanas propias).

**Hallazgo validando tesis del producto (22 Abr — pendiente investigar con Marleny martes 28 Abr).** Las 92 "autocancelaciones" de Medilaser (44%) NO son perdida — son **predicciones**. Segun pruebas internas: semana 1 = 100% correlacion entre autocancelacion y no-show real, semana 2 = 92% correlacion. El boton Confirmar funciona como oraculo de asistencia. Esto reclasifica riesgo #4 (tesis sin validar) de ALTO a MITIGADO — la tesis esta validada por proxy (confirmacion = asistencia) aunque falte adopcion de "completada"/"no_asistio". Reframe comercial mayor: pasar de "reducimos no-shows" a "sabemos cuales van a ser no-shows ANTES con 92-100% precision". Llamada con Marleny reagendada de miercoles 22 a martes 28 Abr (miercoles es su dia pico con 35 citas efectivas, jueves 24 + sabado 23 tambien altos, martes 9 = ventana mas calmada).

**Volumen por dia de la semana analizado (22 Abr).** Corrida por status revelo que la gráfica inicial (incluía canceladas) distorsionaba. Gráfica efectiva (agendada+confirmada+completada):
- Medilaser 115 efectivas: pico miercoles 35, sabado 23, jueves 24
- Guevara 75 efectivas: pico viernes 21, consistente L-M-M (11-13)
- Yeni 16 efectivas: pico viernes 6, miercoles 4 — resto minimo
- Ecoclinicas 7 efectivas: muestra muy chica para patron
- **Tasas de cancelacion contrastan brutal:** Guevara 11% (sanísimo), Yeni 20%, Medilaser 44%, Ecoclinicas 46%. Mismo producto, comportamientos de paciente muy distintos por segmento — estetica/multi-doctor vs general.
- **Operacional:** evitar seguimientos/llamadas a clinicas en miercoles/viernes (dias pico). Martes = ventana mas calmada en todas.

**Modelo "agencia gratis hasta exito": RECHAZADO.** Financieramente insostenible para la agencia. Si funcionara, ya existiria. Mantener modelo Manuel estandar (25% × 12 meses o bounty $80).

**Volumen por dia de la semana analizado (4 clientes reales).** Miercoles y viernes son dias pico globales (96 y 51 citas sumadas). Medilaser concentra brutal en miercoles (70 citas, 3x promedio). Sabado es significativo en 3 de 4 clinicas. Insight operacional: evitar llamadas/seguimientos en miercoles/viernes — clinicas saturadas. Ver detalle en query o regenerar.

## HALLAZGO ESTRATEGICO: Canal "Asistente como Vendedora" (17 Abr)

**Diego visito una asistente que maneja calendario de 7 medicos independientes.** Ella esta encantada con OrionCare porque le quitaria carga nocturna. Ya hablo con los doctores: "si a usted le funciona, mandeme al muchacho". Demo martes (edificio 1) y miercoles (edificio 2).

- **Potencial inmediato:** 7 doctores × $40 = $280/mes MRR (mas que el MRR actual completo)
- **Efecto red:** 11 anos en el edificio, conoce a todas las asistentes
- **Competencia neutralizada:** "Doctor Ya" intento sustituir a la asistente → rechazo total. OC la potencia → aceptacion
- **Posicionamiento:** "OrionCare no te quita el trabajo, te quita la carga" — la asistente es la heroina, no la amenazada
- **Precio:** $40/mes cada doctor individual. No descuento a menos que lo pidan. La asistente no paga, es la administradora de los 7 calendarios.

**Riesgo:** Miedo latente de la asistente a ser reemplazada por tecnologia. Nunca usar palabras "automatizar" o "reemplazar" frente a ella.

**Problema tecnico encontrado:** App no cargaba en datos moviles de la asistente. Diagnosticado y resuelto en esta sesion (ver seccion rendimiento).

## Optimizacion rendimiento mobile (17 Abr) — COMPLETADA

La app no cargaba en datos moviles Honduras (Tigo/Claro). Sesion completa de diagnostico y fix en 3 fases:

### Fase 1: Carga JS/assets (deployed)
- Code splitting 31 paginas con React.lazy
- Vendor splitting + modulePreload filtrado (vendor-radix excluido del preload)
- Lazy-load Toaster, TooltipProvider removido del root, MainLayout lazy
- Auth timeout 10s, spinner CSS inline
- Service Worker (PWA), prefetch AgendaSemanal desde Login
- Favicon 307 KB → 1.2 KB OrionCare

### Fase 2: Carga datos — Nivel 1 (deployed)
- Fix seguridad: org_id faltante en getTodayAppointmentsByDoctor
- RPC `get_weekly_agenda`: 10+ round trips → 1 sola llamada PostgreSQL
- Select solo columnas necesarias (19 → 8)
- Doctor seleccionado persiste en localStorage
- QueryClient defaults: staleTime 30s, sin refetchOnWindowFocus
- Prefetch semanas adyacentes en background

### Metricas medidas (2G simulado, 50 kbps)

| Escenario | Original | Despues |
|-----------|----------|---------|
| **Primera visita** (login → agenda) | 1 min 15s | **56s** (-25%) |
| **Segunda visita** (con SW) | 35s | **14s** (-60%) |

En 3G real la segunda visita esta en ~3-5 segundos.

### Pendiente: Nivel 2 y 3
Plan detallado en `.claude/plans/zesty-dazzling-kitten.md` y `estado-dev.md`.
- **Nivel 2 (post-martes):** Migrar hooks a React Query, IndexedDB persistence, optimistic UI, skeletons, prefetch por intencion
- **Nivel 3 (Junio):** Supabase Realtime, indices PostgreSQL, critical CSS, background sync

## PENDIENTE REVISAR (14 Abr)

**2 reportes de análisis del bot completados y listos para decisiones:**

- `docs/analisis-bot-flujo-a.md` — Flujo reactivo (paciente con cita). 15 días, 236 notificaciones. Hallazgos: 31% confirma, 41% cita liberada, 0 cancelaciones explícitas registradas, gap de observabilidad en botón "Confirmar". 5 micro-ajustes propuestos.
- `docs/analisis-bot-flujo-b.md` — Flujo proactivo (paciente nuevo). 30 días, 181 sesiones. Hallazgos: bot da respuestas FAQ incorrectas (matching retorna FAQ "menos mala" sin umbral), 2 FAQs de Guevara sin keywords → nunca matchean, Medilaser con gap enorme de FAQs vs servicios, Consultorio Familiar con 0 FAQs. 5 micro-ajustes propuestos.

**Top 3 ajustes cross-flow (~4 horas total):**
1. Agregar keywords a FAQs de Guevara sin keywords (30 min, alto ROI)
2. Subir umbral de matching FAQ para evitar respuestas incorrectas (1-2h)
3. Loggear confirmaciones por botón (1h — hoy invisible en datos)

**Método usado:** `.claude/memory/playbook-analisis-bot.md` (reproducible, cadencia mensual sugerida).

> Ultima actualizacion previa: 10 Abr 2026 (llamada Yeni, dashboard corregido, Ecoclinicas descubierto como 4to cliente, regla acompañamiento quincenal)

## Dashboard

| Metrica | Valor | Meta |
|---------|-------|------|
| **Clientes activos** | **4** (Wilmer, Yeni, Carla/Medilaser, David/Ecoclinicas) | 175 |
| Calendarios activos | **5** (Wilmer×1, Yeni×1, Medilaser×2, Ecoclinicas×1) | — |
| **MRR** | **$180** (Wilmer $35 + Yeni $35 + Carla $75 + David $35) | $7,000 |
| Gasto total ads | **$267.48** (AD-005: $92.30 + AD-006: $57.33 + AD-007: $117.85) | — |
| Leads calientes | **0** | — |
| Leads totales historicos | **117** (AD-005: 38 + AD-006: 44 + AD-007: 35) | — |
| CPA real | **$267.48** (1 cierre total via ads) | <$20 |
| Todas las campanas | **PAUSADAS** desde 27 Mar — reactivacion prevista 7 Abr **NO ejecutada aun** | Reactivar |
| Churn | 0% (Yeni estuvo en riesgo, neutralizado 10 Abr) | < 5% |
| Producto | 87% listo | Recordatorio 3d DONE, notificacion doctor pendiente |
| Canales activos | **0 activos** | — |
| Pipeline efectivo | **0** | — |
| Canal llamadas frias | 15 llamadas, 3 callbacks, 1 info enviada (27% contacto). Sin cierres. | — |
| Manuel (afiliado) | Pausado — reactivar post-Semana Santa (pendiente) | — |
| NPS Wilmer | **9.5/10** — testimonial aprobado, 2 referidos (no pagan aun, ~6 meses) | — |
| **Data de no-shows** | **NO CAPTURADA** — 0 citas marcadas como `completada`/`no_asistio` en clientes reales. Tesis del producto sin validar con datos duros. | — |

## Metricas AD-006 "20mensajes1cita" (primeros 3 dias, 13-15 Mar)

- Gasto: $26.90 | Impresiones: 19,321 | CPM: $1.39
- Alcance: 12,765 | Frecuencia: 1.51 (saludable)
- Clics enlace: 304 | CPC: $0.09 | CTR: **1.57%** (meta superada!)
- Clics todos: 372 | CTR todos: 1.93% | CPC todos: $0.07
- Leads: 21 | CPL: **$1.28** (mitad de AD-005)
- **Calidad:** 10 calificados (7 medicos + 3 borderline), 11 basura (52%)
- CPL calificado efectivo: **$2.69**
- **Problema:** Especialidad en texto libre atrae curiosos. Solucion: cambiar a dropdown.

### Comparacion AD-005 vs AD-006

| Metrica | AD-005 (30 dias) | AD-006 (3 dias) | Cambio |
|---------|-------------------|------------------|--------|
| CPL | $2.66 | $1.28 | -52% |
| CTR | 0.73% | 1.57% | +115% |
| CPM | $1.70 | $1.39 | -18% |
| CPC | $0.23 | $0.09 | -62% |
| % calificados | ~86% | ~48% | Peor |
| CPL calificado | ~$3.10 | $2.69 | -13% |

## Metricas AD-005 (historico, PAUSADA 13 Mar)

- Gasto: $93.02 | Impresiones: 54,583 | CPM: $1.70
- Alcance: 24,969 | Frecuencia: **2.19** (fatiga confirmada)
- Clics enlace: 398 | CPC: $0.23 | CTR: 0.73%
- Clics todos: 927 | CTR todos: 1.70% | CPC todos: $0.10
- Resultados (leads): 35 | Costo por resultado: $2.66
- Presupuesto: $10/dia continuo
- **Cierres: 1** (Carla Paredes, $40/mes, SPS)

**Comparacion vs campana anterior:**
- CPL: $4.16 → $2.66 (-36%)
- CTR: 0.54% → 0.73% (+35%)
- **Frecuencia 2.19 — fatiga activa, creativos nuevos necesarios**

## Clientes actuales (corregido 10 Abr tras auditoria DB)

| Cliente | Org ID | Estado | Pago | Notas |
|---------|--------|--------|------|-------|
| **Dr. Wilmer Guevara** | c7234d61 | Activo — early adopter | **$35/mes** | 85 citas gestionadas. NPS 9.5/10, testimonial aprobado, 2 referidos (~6 meses). Ultimo login 25 Mar. Caso de estudio estrella. **No estaba en el dashboard anterior** — error de omision corregido. |
| **Dra. Yeni Ramos** / Consultorio Familiar | a182a362 | Activo — volumen bajo | $35/mes | **1 clinica, SIN secretaria** (ella es unica admin). No "2 clinicas con secretaria" como decia memoria anterior — Yeni y "Ramos" eran la misma persona duplicada. 12 citas en 39 dias. Llamada 10 Abr: "lento pero usando, va a continuar". |
| **Dra. Carla Paredes** / Medilaser | 1eec1734 | Activo — volumen alto | **$75/mes** ($40 + $35) | SPS, asistente Marleny Vargas, 2 doctoras (Carla + Alejandra Ortiz). 143 citas. ERM sin mensajeria. Primer cierre AD-005. Posible 3er doctor futuro. |
| **Dr. David Diaz** / Ecoclinicas | 7daa9810 | Activo — recien conectado | $35/mes | **Cliente nuevo descubierto 10 Abr**. Se conecto 2 Abr durante Semana Santa. Precio early adopter ofrecido hace tiempo, se honro. 12 citas iniciales. Ultimo login 9 Abr. No estaba en memoria anterior. |

**Pendiente confirmar:** Pinares Clinic (`andygodoyco96@hotmail.com`, ultimo login 25 Feb), Clinica Dicolle (`lvblccnt01@gmail.com`), Clinica Escalante (`digitalbooshn@gmail.com`) aparecen como `manual_paid` en DB pero sin actividad. Verificar si son tests abandonados o prospectos no arrancados. No cuentan en MRR hasta confirmar.

## Pipeline

| Prospecto | Fuente | Estado | Notas |
|-----------|--------|--------|-------|
| Dr. Pena | AD-005 | **Tibio — no contesto cierre 16 Mar** | Demo 14 Mar. Objecion "la gente no lo usara". No contesto llamada 5pm 16 Mar. Reintentar 17-18 Mar. Si no contesta 2do intento → frio. |
| Dr. Servellon | AD-005 | **Frio — no contesto demo** | No contesto llamadas ni mensajes 14 Mar. Ultimo seguimiento 16 Mar → si nada, descartar. |
| Dra. Herrera | AD-005 | **Frio — no contesto demo** | No contesto llamadas ni mensajes 14 Mar. Ultimo seguimiento 16 Mar → si nada, descartar. |
| Dra. Cubero (Neurologa) | AD-005 | **Perdida — precio/secretaria** | Llamo 16 Mar. "Me sale mejor secretaria a L.4K". Pidio link de pagos (no existe). "Cuando me decida le llamo" = no. |
| Dra. Banegas (Lumident Dental) | AD-005 | **Tibia — sin actualizacion** | Pendiente verificar status. |
| 7 leads calificados AD-006 | AD-006 | **Sin contactar** | Cx plastica, Ortodoncia, Estetica, Med Interna, Med Estetica x2, Neumologia. LLAMAR, no mensajear. |
| 11 leads basura AD-006 | AD-006 | **Descartados** | "Hola", "Muy bueno", "Shsjdjsj", etc. No medicos. |
| Dra. Tejeda (Podosalud) | AD-005 | **Perdido — precio** | Recontactar ~5 May. |

**Pipeline efectivo: 3 callbacks llamadas frias + 1 info enviada. Total cierres: 1 (Carla). Tasa cierre ads: 1/80 = 1.25%.**

**Proyeccion Marzo: 3 clientes / $145 MRR. Jorge descartado (jefe no es target). Llamadas frias son la unica fuente de pipeline activo.**

## Buyer persona refinado (19 Mar)

**Insight clave:** AD-006 genera 70-90% leads basura porque "20 mensajes = 1 cita" es universalmente relatable — cualquiera con WhatsApp se identifica. El problema no es el formulario, es el ad. Identificado via Manuel (amigo medico) + patron Carla Paredes.

**Decision de targeting:** NO estrechar audiencia en Meta. TAM Honduras ~5,000-7,000 medicos. El CREATIVO es el filtro.

**Perfil primario: "Doctor-Empresario con Equipo"**
- Clinica con 2+ doctores (propietario + contratados/subarrendados)
- Asistentes con rol MIXTO: front desk + asistir en procedimientos
- Gestion manual o software sin WhatsApp integrado
- Dolor: la asistente esta saturada (agenda, cobra, contesta WhatsApp, asiste en procedimientos)
- Precio: $75-110/mes | LTV:CPA: 27-40x
- Ejemplo real: Carla Paredes / Medilaser (39 pacientes en 3 dias, $75/mes)

**Perfil secundario: "Doctor Independiente"**
- Medico solo o con secretaria basica
- El mismo ES quien contesta WhatsApp entre pacientes
- Dolor: no puede contestar durante consultas, pierde pacientes
- Precio: $40/mes | LTV:CPA: 14.5x
- Ejemplo real: Yeni, Ramos

## Riesgos activos

1. **CRITICO: Tasa de cierre inaceptable.** 1/117 leads = 0.85%. Meta era 25%. CPA real $267.48. El cuello de botella NO es generacion — es conversion post-lead.
2. **ALTO: Pipeline en cero.** AD-007 calientes no convirtieron. Callbacks frias sin avance. Todo pausado desde 27 Mar. Reactivacion post-Semana Santa (7 Abr) NO ejecutada — llevamos 14 dias sin actividad comercial.
3. **ALTO: Churn pasivo por silencio en clientes de bajo volumen.** Yeni estuvo a punto de caer por 14 dias sin contacto. La llamada 10 Abr revelo que "lento pero usando" = realidad del mercado, no problema del producto. Pero sin acompañamiento proactivo, el siguiente churn silencioso ya esta gestandose. Aplica a Yeni, Ecoclinicas (recien conectado), potencialmente Wilmer post-vacaciones.
4. **ALTO: Tesis del producto sin validar con datos duros.** "Reducimos no-shows" es la propuesta de valor central pero NO podemos medir no-shows. 0 citas marcadas como `completada`/`no_asistio` en clientes reales (Wilmer 71 pasadas en limbo, Medilaser 80, Yeni 5). Diego trabajara la adopcion del dropdown manual por su cuenta — Claude NO debe proponer automatizacion (ver feedback_no-data-inferida). Impacto: reportes a clientes incompletos, scripts de venta sin KPI duro.
5. **MEDIO: Ningun canal de adquisicion funciona consistentemente.** Ads generan leads pero no cierran. Llamadas frias 27% contacto, 0 cierres. Manuel pausado. Referidos de Wilmer no pagan aun (~6 meses).
6. **BAJO: Deuda tecnica de seguridad.** Advisories de Supabase pendientes.
7. **BAJO: Bug `appointment_at` timezone (bomba de tiempo).** Registrado en estado-dev. No afecta flujos productivos hoy pero rompe cualquier feature futuro que lea la columna.
8. **RESUELTO: FAQ por keywords ineficiente.** Catalogo de 50 templates completado.
9. **RESUELTO: Bot UX frustrante.** Fix texto libre deployed 25 Mar.
10. **RESUELTO: AD-007 sin entregar.** Entrego $117.81, 35 leads. Calidad 43% — peor que AD-005.
11. **NEUTRALIZADO 10 Abr: Churn Yeni.** Llamada confirmo continuidad. Requiere seguimiento quincenal.

## Decisiones vigentes

- Feature freeze hasta Junio 2026
- **Pricing:** $40/mes primer doctor, $35/mes cada doctor adicional (definido 16 Mar)
- Precio early adopter: $35/mes (Yeni, Ramos)
- No contratar — escalar con automatizacion y AI
- Mercado: solo Honduras hasta dominar
- Presupuesto ads: $100 campaña AD-005 ($10/dia). **No subir hasta validar tasa de cierre.**
- Bot de ventas automatizado: NO ahora. Primero recolectar 30+ conversaciones, luego diseñar (post feature freeze Jun 2026)
- **Comisiones afiliados:** 25% por 12 meses (~$120/cliente) o bounty $80. NO comision permanente.
- **Manuel (TikToker):** Primer afiliado activado. Tomo plan 25% x 12 meses. Muy emocionado. Para futuros afiliados evaluar 15-20%.
- **Warhol = socia, no afiliada.** Compensacion via utilidad del negocio, no por comision por venta.
- **NO preguntar volumen de pacientes a leads.** En Honduras equivale a preguntar cuanto ganan — genera desconfianza y riesgo de seguridad. El formulario de Meta ya filtra por dolor real.

## Unit economics validados (actualizado 16 Mar)

| Concepto | Individual | Multi-doctor (2) | Multi-doctor (3) |
|----------|-----------|-------------------|-------------------|
| Precio mensual | $40 | $75 ($40+$35) | $110 ($40+$35+$35) |
| CPA | ~$33 | ~$33 (mismo) | ~$33 (mismo) |
| Payback period | Mes 1 | Mes 1 | Mes 1 |
| LTV 12 meses | $480 | **$900** | **$1,320** |
| Ratio LTV:CPA | 14.5x | **27x** | **40x** |

**Insight:** Clinicas multi-doctor son el segmento mas rentable. Expansion revenue = $0 CAC. Un cliente con 3 doctores equivale a ~3 clientes individuales.

## Hitos del plan

| Hito | Clientes | MRR | Status |
|------|----------|-----|--------|
| Arranque (Mar) | 5-8 | $200-320 | **PARCIAL — 4 clientes, $180 MRR** (corregido 10 Abr: antes se contaba 3/$145 por error). Sigue por debajo de la meta baja ($200) pero mas cerca. 117 leads, 1 cierre via ads. Conversion sigue siendo el problema. |
| Traccion (May) | 25 | $1,000 | En riesgo — requiere resolver conversion + reactivar ads + adoptar acompañamiento quincenal como defensa de churn |
| Momentum (Jul) | 50 | $2,000 | Pendiente |
| Objetivo (Dic) | 175 | $7,000 | Pendiente |

## Decisiones sesion 9 Mar (sesion 2)

### Datos reales de AD-005 analizados
- CSV importado con metricas reales. CPL real $2.77 (no $5.88 como se estimaba). Funnel de generacion funciona mejor de lo esperado.
- Cuello de botella reclasificado: de generacion → conversion.

### Pipeline depurado
- Lead no-medico removido de calientes (no califica)
- Lead frio que pide EMR → descartado con honestidad (no es nuestro producto)
- Dra. Tejeda: analisis de conversacion completa. Objecion fue precio vs volumen, no producto. Recontactar 60 dias.

### Presupuesto: mantener sin cambios
- Diego decidio NO subir presupuesto hasta ver como se desenvuelven los 4 leads calientes actuales. Correcto — validar conversion antes de escalar gasto.

### Regla nueva: no preguntar volumen de pacientes
- En Honduras, preguntar cuantos pacientes manejan equivale a preguntar cuanto ganan. Genera desconfianza y riesgo de extorsion. El formulario de Meta ya filtra por dolor real.

## Decisiones sesion 9 Mar (sesion 1)

### Canal de afiliados — analisis y estructura propuesta
- **Oportunidad:** Amigo medico TikToker con audiencia de medicos. Canal ideal (doctor vendiendo a doctores).
- **Modelo evaluado:** Comision permanente por venta → **RECHAZADO.** A escala come 25%+ del margen para siempre.
- **Modelo recomendado:** Comision 25% por 12 meses (total ~$120/cliente) — generoso, sostenible, sin carga permanente.
- **Alternativa simple:** Bounty de $80 por cliente activo (pagado al 2do mes de pago).
- **Warhol NO entra en esquema de afiliados.** Ella es co-fundadora/socia.
- **Accion inmediata:** Probar informalmente con el amigo TikToker primero (5 clientes, $80/cliente). Validar conversion antes de formalizar.

## Decisiones sesion 8 Mar

### Scripts de ventas actualizados
- Agregada objecion "ya tengo plataforma" a SC-005
- Agregada clasificacion de leads (Caliente/Tibio/Frio) con definiciones y reglas de esfuerzo

## Decisiones sesion 6 Mar

### Sprint mini aprobado (4 items)
- Bug secretaria + bloquear fechas + UI medico unico + completar hand-off
- Todo lo demas diferido a Junio
- Max 2-3 dias de desarrollo

### Seguimiento de prospectos
- Diego maneja relaciones iniciadas por el
- Warhol maneja leads nuevos de campaña

## Decisiones sesion 5 Mar

### Scripts de ventas — sistema completo creado
- **Archivo:** `docs/scripts-ventas.md`
- 7 scripts: SC-001 a SC-007 cubriendo todo el funnel

### CRM reestructurado
- 3 tabs (LEADS + CLIENTES + DASHBOARD)
- Clasificacion automatica + 5 Filter Views

## Sprint mini — progreso (aprobado 6 Mar, max 2-3 dias)

| # | Item | Estado |
|---|------|--------|
| 1 | Secretaria no puede crear pacientes | DONE |
| 2 | Bloquear fechas especificas | PENDIENTE |
| 3 | UI medico unico (ocultar dropdowns innecesarios) | PENDIENTE |
| 4 | Completar hand-off a secretaria/doctor | DONE |

### Diferidos a Junio 2026

| Item | Razon |
|------|-------|
| Requisitos por servicio (ej. "tomar agua 30 min antes") | Feature nuevo |
| Notas rapidas por paciente | Feature nuevo |
| Mensaje al cancelar con razon + re-agenda | Feature nuevo |
| Mensajes de publicidad/marketing | Feature nuevo (P2) |

## Decisiones sesion 10 Mar

### Metricas AD-005 actualizadas (CSV)
- CPL bajo a $2.26 (era $2.77). 26 leads totales. Frecuencia 1.94 — vigilar.

### Pipeline depurado
- 2 leads calientes eran no-medicos → descartados. Pipeline real: 2 calientes + 2 tibias.
- Dra. Cubero (neurologa): contactada, respondio thumbs up a precio. Seguimiento martes.
- Dra. Banegas (dentista Lumident): entro fria, respondio caliente con preguntas especificas. Reclasificada a tibia. Seguimiento miercoles.

### Diversificacion de canales — 4 canales activos
1. Meta Ads (AD-005 corriendo)
2. Puerta a puerta: Diego visita edificio medico martes 11 Mar
3. Afiliado Manuel (TikToker): activado con 25% x 12 meses. Muy motivado.
4. Referidos de clientes actuales (pasivo)

### Manuel (afiliado) confirmado
- Tomo el plan de 25% x 12 meses. Diego comodo con la decision.
- Para futuros afiliados, usar datos de Manuel para calibrar (probablemente 15-20%).

## Decisiones sesion 12 Mar

### Sistema de seguimiento de ventas reestructurado
- `docs/conversaciones-ventas.md` → migrado a `docs/ventas/` (index + leads individuales)
- Nuevo sistema: `docs/ventas/index.md` (dashboard + persona de ventas + patrones + log correcciones)
- Leads individuales: `docs/ventas/leads/LEAD-XXX-nombre.md` con template estandarizado
- `/modo-seguimiento` reescrito: lectura selectiva, SQL obligatorio, feedback loop, formato de sugerencia con intento/angulo/features excluidas
- **Objetivo:** Cada correccion de Diego entrena la persona de ventas. Para Junio 2026, suficiente data para bot autonomo.

### Seguimientos atrasados
- Dra. Cubero: seguimiento era 11 Mar — atrasado 1 dia. Lead caliente enfriandose. **URGENTE.**
- Dra. Banegas: seguimiento era 12 Mar — hacer hoy.
- Dra. Herrera: mensaje #2 enviado 12 Mar, esperando respuesta.

## Decisiones sesion 13 Mar

### Primer cierre AD-005: Carla Paredes
- **Perfil:** SPS, 2 asistentes, tiene ERM sin mensajeria. $40/mes.
- **Camino de conversion:** Ad → form → bot (creyo cita real) → reunion Teams → cierre mismo dia.
- **Insight:** Segundo perfil que convierte descubierto — medico con equipo + sistema sin mensajeria (no solo independientes).
- **Instalacion:** Lunes 16 Mar.

### Fatiga de ad confirmada
- Frecuencia 2.19 (>2.0), CTR cayendo 0.81→0.73%, CPL subiendo $2.26→$2.66.
- **Decision:** Crear creativos nuevos (imagen estatica primero, rapido). No mas presupuesto en creativo actual.

### Temas pospuestos (no decidir hoy)
- **Modificar bot para guiar a reunion:** Esperar 5-10 data points mas. Decision para Abril.
- **FAQ con AI en vez de keywords:** Evaluar como polish post-demos. Opcion intermedia: packs de FAQs pre-armados por especialidad.
- **"Plataforma mas completa" (integracion con ERMs):** Post feature-freeze, Junio 2026+.

## Decisiones sesion 16 Mar (sesion 3)

### Pricing multi-doctor definido
- **$40/mes primer doctor, $35/mes cada doctor adicional.** Sin escala de descuento adicional.
- Diego ofrecio $35 al 2do doctor de Carla en el momento — resulto ser el precio correcto.
- Carla: $40 + $35 = $75/mes. Posible 3er doctor en futuro ($110/mes).
- **Expansion revenue es el ingreso mas barato:** $0 CAC, $0 tiempo de ventas. LTV:CPA sube de 14.5x a 27x con 2 doctores.
- Clinicas multi-doctor identificadas como segmento premium. No cambiar targeting de ads, pero cuando un lead sea multi-doctor, es señal de alto valor.

### Carla Paredes instalada
- Configuracion completada 16 Mar. 2 doctores activos.
- MRR sube de $110 a **$145/mes**.
- Superadmin smoketest05 agregado para la activacion.

## Decisiones sesion 16 Mar

### Llamadas > Mensajes — cambio de proceso de ventas
- **Evidencia:** Cubero ignoro 2 mensajes pero contesto llamada. Servellon/Herrera no contestan nada.
- **Decision:** El proceso de seguimiento cambia de WhatsApp-first a llamada-first.
- **Nuevo flujo:** Lead entra → llamar en 24-48h → si no contesta, voz + 1 WhatsApp.
- **Script creado:** `docs/ventas/script-llamadas-hormozi.md` (LC-001, LC-002, LC-003 + objeciones).

### AD-006 metricas analizadas
- Generacion excelente: CPL $1.28 (-52% vs AD-005), CTR 1.57% (meta superada).
- **Problema:** 52% de leads son basura (texto libre en especialidad).
- **Decision:** Cambiar campo especialidad a dropdown en formulario Meta. Accion inmediata.
- CPL calificado ($2.69) sigue siendo mejor que AD-005 ($3.10), pero Warhol pierde tiempo en basura.

### Cubero perdida — lecciones
- Objecion: "me sale mejor secretaria a L.4,000". No es precio, es percepcion de valor (herramienta vs persona).
- Diego prometio "link de pagos" en la llamada — feature que no existe (feature freeze).
- **Regla nueva:** No prometer features. Decir "eso esta en nuestro plan de desarrollo" si preguntan algo que no hay.
- "Cuando me decida le llamo" = no en Honduras. Clasificada como perdida.

### Demos 14 Mar — resultado
- **1/3 contactados.** Solo Pena contesto. Servellon y Herrera no contestaron ni llamadas ni mensajes.
- Pena: interesado, objecion "la gente no lo usara", pidio callback hoy 5pm para decidir.
- **Leccion:** La tasa de contacto por mensaje/llamada fria es baja. Llamar rapido (<24h) es critico.

## Decisiones sesion 15 Mar

### Reframing Hormozi — propuesta creada
- Analisis de "$100M Offers" aplicado a OrionCare
- **Diagnostico:** El problema no es el producto ni los leads — es como se presenta la oferta (tasa de cierre 2.9%)
- **Cambio principal:** Presentacion, no oferta. Abrir con dolor (no mecanismo), presentar features como beneficios, garantia al frente
- Diego aclaro: la garantia de 1 mes YA existe, onboarding es self-service con acompanamiento (no "nosotros configuramos todo")
- **Archivos creados:** `docs/ventas/hormozi-reframing/` (5 archivos: README, audio v2, script precio v2, guia demos, comparacion antes/despues)
- **Estado:** BORRADOR — probar en demos antes de aplicar a scripts oficiales
- **NO se crean ads nuevos ahora** — AD-006 recien lanzada, el cuello de botella es post-ad (conversion), no generacion

### Numeros verificados sin interaccion bot
- +50498039444 y +50431769917 — ninguno tiene sesiones en bot_sessions
- Confirma el 36% de drop entre form fill y bot

## Decisiones sesion 19 Mar

### AD-007 diseñado — creativos como filtro de calidad
- **Problema:** AD-006 genera 70-90% basura. "20 mensajes = 1 cita" es universalmente relatable.
- **Solucion:** 2 imagenes que solo un medico reconoce: "Asistente Saturada" (scrubs = rol mixto, perfil empresario) + "Doctor Entre Pacientes" (bata + consultorio, perfil independiente).
- **Config:** 1 campana, 2 ads, 2 copys cada uno. Meta optimiza con Advantage+.
- **Formulario:** Especialidad revertida a texto libre (escribir requiere intencion). Dropdown no resolvio.
- **AD-006 a pausar** al lanzar (no eliminar). Metricas finales guardadas en estado-ads.md.
- **Hipotesis:** CTR menor pero % calificados 70-85%. Metrica clave: CPL calificado.
- **Detalle completo:** `docs/ad-creatives.md` seccion AD-007.

## Decisiones sesion 18 Mar (PM — llamadas)

### Leads viejos descartados — velocidad > persistencia
- **Hipotesis validada:** Cada hora entre interes y demo reduce conversion. Carla cerro mismo dia. Todos los que "agendaron para despues" se perdieron.
- **Decision:** Descartar Pena, Banegas, Herrera, Servellon, Cubero, Peralta. Demasiado frios, no invertir mas tiempo.

### Objetivo de cadencia cambiado: demo en el momento
- **Antes:** "Objetivo = agendar demo de 10 min"
- **Ahora:** "Objetivo = hacer la demo ahi mismo. Si no puede, agendar para HOY o MANANA maximo."
- **Frase clave:** "Ya que estamos hablando, ¿quiere que le muestre rapidito? Son 10 minutos"
- **Nunca aceptar "luego le llamo" sin horario concreto.** Responder: "¿Le parece mañana al mediodia?"

### Batch 10 leads — 60% basura
- 10 leads llamados en ventana dorada (12:42pm). Resultado: 6 perdidos, 2 activos (Sibrian, Pineda), 1 troll (Mali), 1 sin nombre.
- Basura 60% (peor que 52% anterior). Dropdown de especialidad no resolvio el problema.

### Kenia Rubio — aprendizaje
- Lead que visito bot 3 veces y empezo a agendar. Parecia la mas caliente. Resulto que ya tiene solucion y buscaba captacion de prospectos.
- **Leccion:** Repetir visitas al bot ≠ interes de compra. Puede ser evaluacion/comparacion.

### Sibrian — lead reciclado
- Ya contactado 26 Ene. Respondio "Si" al interes pero nunca avanzo. Volvio a llenar formulario AD-006.
- Voice note personalizado enviado reconociendo contacto previo. No repetir pitch generico con leads que ya te conocen.

## Decisiones sesion 18 Mar (AM — cadencia)

### Cadencia de seguimiento definida — "5 toques en 10 dias"
- **Origen:** Amigo medico (Jorge) confirmo que doctores estan saturados y no pueden contestar llamadas durante consulta.
- **Insight:** No es rechazo, es timing. Solo hay 3 ventanas utiles: 7-8am, 12-1:30pm (dorada), 5:30-6:30pm.
- **Cadencia:** Dia 1 llamada+voice note → Dia 2 llamada PM → Dia 3 texto valor → Dia 5 llamada+cierre → Dia 10 re-engagement.
- **Documento completo:** `docs/ventas/cadencia-seguimiento.md`
- **Complementa:** `docs/ventas/script-llamadas-hormozi.md` (que decir vs cuando/como contactar)

### Google Stitch evaluado y diferido
- Herramienta gratuita de Google Labs para generar UI con AI (Gemini). Solo visual, no genera logica ni backend.
- **Decision:** No es prioridad. Churn 0%, UI no es cuello de botella. Bookmarked para Junio 2026 (post feature-freeze) como herramienta de ideacion.
- Prompts de OC listos para probar cuando llegue el momento.

### Jorge — prospecto potencial (clinica multi-doctor)
- Amigo medico de Diego. Trabaja medio tiempo en clinica privada grande: 2 especialistas + 1 asistente.
- Sin bot ni sistema de agendas. Multi-doctor = segmento premium ($75-110/mes).
- **Estrategia:** NO vender. Reunion social el finde (~22-23 Mar). Mostrar producto como amigo. Si ve valor, se convierte en vendedor interno.

## Pipeline (actualizado 18 Mar PM)

**Decision: leads viejos descartados.** Pena, Banegas, Herrera, Servellon, Cubero, Peralta — todos demasiado frios. Hipotesis validada: cada hora entre interes y demo reduce conversion drasticamente.

| Prospecto | Fuente | Estado | Notas |
|-----------|--------|--------|-------|
| Microlaser TGU (Katherine) | Llamada fria ICP | **Callback agendado 2pm** | Asistente accedio a callback. |
| Clinica Paracelso (Rosa) | Llamada fria ICP | **Callback agendado 1pm** | Asistente accedio a callback. |
| Dra. Joselin Lopez | Llamada fria ICP | **Callback agendado 2:30pm** | Doctora contesto directo. |
| Famisalud | Llamada fria ICP | **Info enviada WhatsApp** | Doctora contesto, se envio info. Pendiente follow-up. |
| David Sibrian | AD-006 (reciclado) | **Descartado 21 Mar** | No respondio a cadencia completa. |
| Jorge | Referido personal | **Descartado** | Jefe no es target — sistema eficiente, citas 9 meses adelante. |

### Leads descartados 18 Mar (batch de 10)

| Nombre | Razon |
|--------|-------|
| Maybeli Ramirez | No es medico |
| Franco_xvhtt | No es medico (nombre spam) |
| Lorena Espinoza | Numero inexistente |
| Kenia Rubio | Ya tiene solucion de automatizacion, penso que era captacion de prospectos |
| Helen Garcia | Numero inexistente |
| Aner Ayala | No es medico |
| Mali Atunez | Troll — perfil FB sospechoso, dijo que "ya lo probo" (bot dice lo contrario), WhatsApp no recibe mensajes. No dar seguimiento. |
| Aitana Zoe Pineda Fiallos | Basura — no es medico real. Confirmado 19 Mar. |
| [Sin nombre] medicina interna | Basura — sin nombre, form con ";)" |

### Leads viejos descartados (decision 18 Mar)

Pena, Banegas, Herrera, Servellon, Cubero, Peralta — todos descartados por demasiado frios. Tejeda recontactar ~5 May.

## Caso de estudio: Medilaser (guardado 19 Mar)

- Archivo: `docs/ventas/caso-estudio-medilaser.md`
- Snapshot dia 3: 39 pacientes, 22 citas, 83% tasa confirmacion, bot 38.5% completion
- **Comparar al cumplir 1 semana (23-24 Mar)**

## Caso de estudio: Dr. Wilmer Guevara (analisis 25 Mar)

- **Reportes:** `docs/reporte-guevara-25mar.md` + `docs/reporte-guevara-25mar-llamada.md`
- **Periodo:** Dic 2025 — Mar 2026 (~3 meses)
- **Citas totales:** 78 | Pacientes unicos: ~30 | Confirmadas: 36 (46%) | Canceladas: 6 (8%)
- **Confirmaciones WhatsApp:** 78 enviadas, 75% leidas (status "read" via Meta)
- **Bot (corregido sin pruebas):** 10 pacientes reales, 3 agendaron solos (30%), 3 handoff, 2 FAQ, 2 perdidos (bugs ya corregidos)
- **Dato clave:** 2 de 3 autoagendaron de noche (9pm+). Sin bot = perdidos.
- **FAQs pendientes:** Wilmer debe agregar ubicacion, servicios, precios por servicio
- **Bug encontrado:** `confirmation_message_sent` nunca se marca true (registrado en estado-dev.md). Mensajes SI se envian.
- **Llamada programada 25 Mar** — guia de llamada en `docs/reporte-guevara-25mar-llamada.md`

## Decisiones sesion 23 Mar

### Canal llamadas frias a ICP — primer data real
- **Reemplazo de "puerta a puerta":** Se perfilo ICP (clinicas esteticas/derma) y se llamaron 15 clinicas.
- **Resultados:** 8 NC (53%), 3 callbacks agendados (20%), 1 info enviada WhatsApp (7%), 2 rechazados por politicas, 1 ya tiene plataforma.
- **Callbacks:** Microlaser (Katherine, 2pm), Paracelso (Rosa, 1pm), Dra. Joselin Lopez (3182-9585, 2:30pm).
- **Info enviada:** Famisalud (9917-8338, doctora contesto directo).
- **Problema detectado:** 2 clinicas no sabian quien llamaba. Necesitaban apertura con razon de llamada, no solo nombre.
- **Solucion:** Scripts v2 con apertura sin marca + beneficio directo.

### Scripts de ventas v2 — Hormozi adaptado
- **Script asistente v2:** `docs/ventas/script-canal-asistente.md` (reescrito completo)
  - Apertura sin OrionCare: *"Soy [nombre], llamo porque estamos ayudando a clinicas a quitarle la carga de WhatsApp a la asistente"*
  - Puente social proof antes de preguntas (no interrogatorio)
  - Hormozi adaptado: amplificar dolor emocional + resultado soñado
  - Armar champion: darle las PALABRAS exactas para pitchear al doctor
  - Desbloqueo para gatekeepers que se cierran
- **Script doctor v2:** `docs/ventas/script-doctor-hormozi.md` (nuevo archivo)
  - 3 aperturas segun origen: ads / llamada fria / callback via asistente
  - Misma filosofia: sin marca en apertura fria, puente social proof, demo en el momento
  - Seccion "doctor que no siente dolor"
  - Todas las objeciones del script anterior + nuevas
- **Filosofia comun:** OrionCare no se menciona hasta que pregunten. El beneficio ES la apertura. Demo > info siempre.
- **Script viejo (`script-llamadas-hormozi.md`) queda como referencia** pero los v2 son los activos para llamadas frias y canal asistente.

### Jorge descartado — jefe no es target
- El jefe de Jorge tiene sistema eficiente con citas hasta 9 meses adelante. No tiene dolor.
- Jorge sigue siendo contacto util pero no prospecto.

### Manuel pausado — Semana Santa
- Manuel dijo que hasta Semana Santa (~7 Abr) podria revisar todo con tranquilidad.
- Canal afiliado en pausa. No invertir tiempo hasta que Manuel se active.

### Canal "Asistente Medica" — diseñado sesion AM (actualizado PM)
- **Hipotesis original validada:** La asistente es gatekeeper natural. En vez de bypasearla, usarla como champion.
- **Validacion con datos Medilaser:**
  - 25 msgs/dia de pacientes, 72% en hora pico (11am-3pm), 20% fuera de horario
  - 61% de sesiones necesitaron intervencion humana
  - FAQ repetitivas: ubicacion, precios, reagendar
- **Script v2 diseñado:** ver arriba.
- **Prueba:** Warhol, 10 llamadas esta semana. Exito = 1+ callback de doctor.

## Decisiones sesion 21 Mar

### AD-007 casi sin entrega — diagnosticado y corregido
- **Problema:** 3 capas de limites (cuenta $15/dia + campaña $10/dia + ads $10/dia c/u). Meta gastó solo $2.40 en 2 dias.
- **Fix:** Limite cuenta subido a $20/dia. Limite campaña removido. Presupuesto campaña $20/dia.
- **Checkpoint lunes 24 Mar:** Si <$30 gastados → creativo no funciona, pivotar a AD-005 con imagenes frescas.

### Sibrian descartado
- No respondio a cadencia completa. Pipeline efectivo: 0 leads.

### Recordatorio 3 dias antes — aprobado (pedido por Carla Paredes)
- **Contexto:** Pacientes de fuera de la ciudad necesitan prepararse y confirmar. No todos los pacientes lo necesitan.
- **Diseño:** Checkbox per-appointment al crear cita ("Recordar 3 días antes"). Default: apagado.
- **Implementacion:** `reminder_3d_enabled` (boolean) en `appointments` + extend edge function `send-reminders` + template WhatsApp de confirmacion.
- **Califica como polish** (funcionalidad existente mejorada por feedback de cliente $75/mes). No viola feature freeze.
- **Esfuerzo estimado:** 3-4 horas.

### Reunion con Carla Paredes (20 Mar)
- Carla reporto necesidad de recordatorio 3 dias antes para pacientes fuera de la ciudad.
- Feature request real de cliente activo = señal de retencion.

## Decisiones sesion 25 Mar

### Analisis profundo Guevara y Medilaser — reportes de llamada creados
- **Guevara:** `docs/reporte-guevara-25mar.md` + `docs/reporte-guevara-25mar-llamada.md`
- **Medilaser:** `docs/reporte-medilaser-25mar.md` + `docs/reporte-medilaser-25mar-llamada.md`

### Hallazgo: WhatsApp read tracking via Meta
- `message_logs` tiene status "read"/"delivered"/"sent"/"failed" actualizado via webhooks de Meta
- Podemos saber si un paciente leyo el recordatorio/confirmacion
- No tenemos timestamp de CUANDO lo leyo (solo el status actual)
- Twilio (pre-migracion) solo reportaba "sent"/"queued" — sin tracking de lectura

### Bug encontrado: confirmation_message_sent nunca se marca true
- En `create-appointment/index.ts`, despues de enviar confirmacion via gateway, falta UPDATE del flag
- Los mensajes SI se envian (message_logs lo confirma) — solo el flag no se actualiza
- **Registrado en estado-dev.md** para /modo-dev

### Guevara — datos corregidos (sin pruebas)
- 78 citas, ~30 pacientes, 3 meses
- Confirmaciones: 75% leidas (Meta)
- Reminders: 68% respondieron, 98% llegaron
- Bot: 10 pacientes reales, 3 agendaron solos (2 de noche 9pm+), 80% resultado util
- 2 pacientes perdidos por bugs YA resueltos (texto libre 25 Mar)
- FAQs pendientes: ubicacion, servicios, precios — tarea de Wilmer
- Llamada enfocada en contrastar dolor + mostrar beneficio para generar referidos

### Medilaser — datos corregidos (sin pruebas)
- 76 citas reales en 9 dias, ~8.4/dia, 2 doctoras
- Confirmaciones: 67% leidas, 95% llegaron
- Reminders: 52% leidos, 25% respondieron "Confirmar"
- **Cancelaciones 20%** — preguntar a Marleny si es normal o nuevo
- Bot: 48 pacientes, 15 completaron (31%)
- **Llamada con Marleny** (no Carla) — ella vive el dolor del WhatsApp
- Pregunta clave: ¿los que leen y no confirman, llegan?
- No-shows: no sabemos, ensenarle a marcar en plataforma
- Referido NO va con Marleny — eso es con Carla en otra llamada

### Patron validado: pacientes leen pero no confirman
- Guevara: 5 pacientes leyeron reminder, no respondieron, cita quedo "agendada" — probablemente si llegaron
- Medilaser: 52% leyo reminder, solo 25% presiono "Confirmar"
- **"Agendada" no significa que no van** — significa que no les dio la gana de presionar el boton

## Decisiones sesion 27 Mar

### AD-007 resultados finales y PAUSADA (Semana Santa)
- **Metricas finales CSV (25 Feb - 26 Mar):**
  - Doctor Independiente: $117.81 | 35 leads | CPL $3.37 | CTR 0.82% | Alcance 39,470 | Frecuencia 2.12
  - Doctor Empresario: $0.04 | 0 leads | 15 impresiones — **MUERTO, Meta no lo entrego**
- **Calidad AD-007:** 15 calientes (43%), 15 frios (43%), 5 descartados (14%)
- **CPL calificado:** $7.85 (peor de las 3 campanas)
- **Los 15 "calientes":** muchos con especialidades basura ("Perder tiempo", "estar con cel", "hola"). Si filtramos por especialidad real, ~7 calificados = CPL calificado real ~$16.83
- **Resultado:** 0 cierres. Calientes no contestaron llamadas o colgaron.
- **Hipotesis "creativo como filtro": parcialmente fallida.** Mejor que AD-006 (43% vs 10-31%) pero muy inferior a AD-005 (86%).
- **Decision:** PAUSAR por Semana Santa. No reactivar — pivotar a AD-005 refrescado.

### Metricas finales actualizadas AD-006
- 44 leads (no 42 como se reportaba). CPL $1.30. CTR 1.39%.

### Gasto total ads corregido
- **$267.48 total** (no $150 como se tenia registrado). AD-007 gasto $117.85 que no estaba contabilizado.

### Wilmer Guevara — NPS 9.5/10, testimonial, referidos
- **Llamada completada 25 Mar.** Calificacion 9.5/10.
- **Para 10/10:** Notificacion WhatsApp al doctor cuando un paciente agenda. Evaluar en /modo-dev como polish.
- **Testimonial aprobado con nombre:** "Porque lo uso en mi dia a dia y realmente me ha funcionado, me facilita el trabajo y me siento seguro recomendandolo."
- **2 referidos:** Colegas que no estan en posicion de pagar (~6 meses). No son pipeline inmediato.
- **Uso estrategico:** Integrar a scripts de venta + futuros ads con social proof real.

### Carla Paredes — Marleny pendiente
- Se compartio dato y se pidio permiso para hablar con Marleny (asistente).
- **Mensaje sin leer hace 3 dias.** Accion: LLAMAR, no re-mensajear.

### Pausa Semana Santa (28 Mar - 6 Abr)
- Todas las campanas pausadas. No invertir en ads durante semana muerta.
- Ahorro estimado: $140-200.
- Tiempo de preparacion: creativos nuevos, scripts con testimonial, alineacion con Manuel.

### Bot text-libre fix — data insuficiente
- Fix deployed 25 Mar 19:00 UTC. Solo 3 sesiones post-fix (2 dias).
- 0 "opcion no valida" de pacientes reales post-fix (1 caso fue spam chino con mensaje vacio).
- "Reagendar" correctamente ruteado a booking hoy (27 Mar).
- Necesitamos 15-20 sesiones para evaluar. Revision: semana del 7 Abr.

## Decisiones sesion 10 Abr

### Auditoria de clientes reales — dashboard corregido
- **Dashboard anterior estaba mal:** decia 3 clientes / MRR $145. Realidad: **4 clientes / MRR $180**.
- **Yeni y "Ramos" eran la misma persona** (Dra. Yeni Ramos) duplicada en memoria desde ~4 Mar.
- **Wilmer no estaba en el dashboard** como cliente pago aunque si paga $35/mes. Error de omision.
- **Ecoclinicas (David Diaz) es cliente nuevo descubierto** — se conecto 2 Abr durante Semana Santa, precio early adopter $35 honrando oferta anterior.
- **Yeni tiene 1 clinica sin secretaria**, no 2 con secretaria como decia memoria. Ella es unica admin.

### Llamada Yeni (Diego) — churn neutralizado
- Yeni dijo: "sigue algo lento pero si estan usando, voy a continuar usando el servicio".
- Los datos confirman: 12 citas en 39 dias, 9 pacientes unicos, 3 citas futuras confirmadas (18/24/25 Abr), ayer 8 Abr un paciente confirmo con boton automaticamente.
- Disonancia "yo pensaba que no usaban" vs "si usan": fue error de vara — compare contra Medilaser (8+ citas/dia) en vez de contra realidad del mercado de Yeni.
- **Leccion:** 2 semanas de silencio en cliente de bajo volumen = 100% riesgo de churn pasivo aunque el producto funcione. El problema no era producto, era falta de acompañamiento.

### Regla nueva: acompañamiento quincenal proactivo para clientes de bajo volumen
- Contactar cada 2 semanas con mini-reporte tipo Guevara/Medilaser: "esto hizo el sistema por usted"
- Aplica a: Yeni, Ecoclinicas (recien conectado — critico primeras 4 semanas), Wilmer (ya establecido, quizas mensual basta)
- Medilaser NO necesita (alto volumen, uso diario de Marleny).
- Formato: llamada corta o audio de WhatsApp. No mensaje de texto ("los mensajes se pierden").

### Hallazgo: tesis del producto sin validar con datos duros
- 0 citas marcadas como `completada`/`no_asistio` en clientes reales. Wilmer 71 en limbo, Medilaser 80, Yeni 5.
- Los reportes a clientes tienen funnel de mensajeria (enviado/leido/confirmado) pero NO el funnel final (llego/no llego).
- **Decision Diego:** NO automatizar inferencia de estados. El doctor/secretaria se deben acostumbrar a marcar. Opcion A (adopcion) en sus manos.
- **Regla persistente:** feedback_no-data-inferida guardado en memoria Claude. No volver a proponer crons de inferencia.
- **Impacto comercial:** scripts de venta NO deben prometer metricas de no-shows hasta que adopcion suba y haya data real.

### Bugs tecnicos descubiertos (todos en estado-dev.md)
- `appointment_at` se guarda desfasada 6h (Honduras UTC-6). No afecta flujos productivos. Bomba de tiempo.
- `reminder_morning_sent` columna huerfana — ningun codigo la toca.
- Estado `reagendar` huerfano — existe en DB pero no en type definition (Wilmer 4, OrionCare 1, OrionCareEditado 32).
- Cita de Kensi Nicol Carcamo (Yeni, 24 Mar) sin `appointment_at` — bot-handler crasheo en algun flujo alterno.

### Reactivacion post-Semana Santa NO ejecutada
- Plan del 27 Mar decia: lanzar AD-005 refrescado, activar Manuel, integrar testimonial Wilmer, revisar data bot text-libre — todo para 7 Abr.
- Hoy es 10 Abr. **Nada de eso se ejecuto.** Llevamos 14 dias sin actividad comercial.
- Pregunta abierta: retomar el plan original, o repriorizar tras lo aprendido esta sesion?

## Proximos pasos (actualizado 23 Abr)

### Deliverables sesion 23 Abr (completados)
- [x] ICP formalizado en `.claude/memory/icp.md` (A + B + no-ICP aceptable + no-ICP rechazable + checklist calificacion 6 preguntas)
- [x] Validacion cuantitativa volumen msgs/dia por cliente (Medilaser 21.4 / Ecoclinicas 3.0 / Yeni 1.6 / Wilmer 1.6)
- [x] Prompts Gemini para research de edificios ICP-B y clinicas ICP-A en Tegucigalpa (Diego ejecuto ambos, listas obtenidas)

### Pendiente proxima sesion estrategia
- **[Diego]** Revisar las 2 listas de Gemini (ICP-A clinicas con volumen TGU + ICP-B edificios multi-doctor). Filtrar manualmente antes de pasarlas a Claude.
- **[Claude /modo-estrategia proxima sesion]** Cruzar ambas listas: identificar edificios donde coexistan ICP-A e ICP-B (doble rentabilidad por viaje). Priorizar por zona geografica y señal de inversion publicitaria (Meta Ads Library).
- **[Claude /modo-estrategia]** Generar itinerario fisico de scouting semana 29 Abr - 3 May con 3-5 edificios priorizados.

### Jueves 23 Abr (probable reunion Alan / The Brand Be)
1. **[Diego]** Revisar guion actualizado `docs/ventas/guion-agencia-marketing.md` (reunion caliente, no fria).
2. **[Diego]** Preparar material en telefono: bot en vivo, screenshots volumen Medilaser/Guevara, testimonial Wilmer, screenshot 44% autocancel como predictor.
3. **[Diego]** Confirmar hora con Alan. Reunion 60-90 min en oficina de el.
4. **[Diego]** Objetivo minimo: salir con fecha de piloto en clinica de Alan O presentacion directa esta semana O segunda reunion con fecha exacta.

### Viernes 25 Abr — Visita edificio medico
2. **[Diego]** Visita clinica pendiente (prioridad declarada). Es el proposito real de la salida.
3. **[Diego]** Pasar a saludar asistente 7 doctores con curiosidad genuina: *"Me quede pensando en su mensaje, ¿que le preocupaba?"* → diagnosticar si el no fue de ella o de los doctores. NO rescatar el deal. NO insistir.
4. **[Diego]** Si es miedo de ella: reframe "no te reemplaza, te potencia" + ofrecer demo a ella primero sin compromiso. Si es de los doctores: pedir 5 min directo con 1 solo.

### Esta semana y proxima (22 Abr - 6 May)
5. **[Diego]** Reunion 20 min con contacto agencia. Usar las 5 preguntas de Fase 2 + test Fase 3 del guion. Descartar rapido si red flags.
6. **[Diego]** Seguimiento quincenal a Yeni (~24 Abr).
7. **[Diego]** Verificar Pinares/Dicolle/Escalante — tests o clientes reales?
8. **[Claude /modo-ads]** Actualizar scripts y creativos con buyer persona refinado (senal = volumen de mensajes, no rol). Preparar perfil para reactivar Manuel lunes 28 Abr.
9. **[Claude /modo-dev]** Nivel 2 optimizacion: migrar hooks a React Query (habilita IndexedDB + optimistic UI).

### Pendientes arrastrados
- Integrar testimonial Wilmer a scripts de venta
- Reactivar Manuel (afiliado TikToker) con buyer persona actualizado
- Bug `appointment_at` timezone
- Adopcion dropdown `completada`/`no_asistio`
- Auditar FAQs (prerequisito para modelo agencia): Guevara keywords faltantes, Medilaser gap FAQs vs servicios, Consultorio Familiar 0 FAQs

### Descartes recientes
- **David Diaz (Ecoclinicas):** churn aceptado. No invertir tiempo en rescate.
- **Modelo "agencia gratis hasta exito":** financieramente insostenible. Mantener modelo Manuel estandar.
- **Aprender modelo agencia de marketing a fondo:** rabbit hole. 20 min conversacion basta para diagnosticar.
