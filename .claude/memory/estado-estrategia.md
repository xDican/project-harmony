# Estado Estrategia — OrionCare

> Ultima actualizacion: 19 May 2026 noche (Sprint 4 + 5 + 5.1 cerrados. Tier verification Meta, plan inbox-only Torre Zafiro 25 May, decision medico-6m-luego-diversificar, Stitch para mockups UX)
> Updates historicos en `estado-estrategia-historial.md`

---

## Dashboard

| Metrica | Valor |
|---|---|
| Clientes activos | 4 — Guevara $35, Yeni Ramos $35, Medilaser $75 (desconectado), Ecoclinicas $35 |
| MRR | $180 (efectivo ~$105 si Medilaser sigue desconectado pero pagando, $180 si la facturacion continua) |
| Hito real Q2-Q3 2026 | $1,500/mes paz mental |
| Pipeline | PAUSADO hasta MVP. NO llamada/mensaje a Dulce hasta 25 May. |
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
| 6 — Calling API (simplificado) | proximo (mier 20) | Webhook events calls.* + UI inbox llamadas + softphone WebRTC |
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

1. **CRITICO:** Capacidad Diego <3h/dia mata cronograma. Mitigacion: check-in viernes, sacrificar Tier 2 antes que pilot.
2. **ALTO:** Bug critico encontrado por Dulce semana 1 quema oportunidad. Mitigacion: QA full sabado 23 antes de instalar.
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
