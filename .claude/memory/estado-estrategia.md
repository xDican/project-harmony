# Estado Estrategia — OrionCare

> Ultima actualizacion: 10 Mar 2026 (sesion estrategia — CSV actualizado + diversificacion canales)

## Dashboard

| Metrica | Valor | Meta |
|---------|-------|------|
| Clientes activos | 2 | 175 |
| MRR | $70 | $7,000 |
| Gasto en ads | $58.75 (AD-005 activa, $10/dia) | $100/mes |
| Leads totales AD-005 | 26 | 20/mes |
| Leads calientes | 2 activos | — |
| CPL actual | **$2.26** | < $5 |
| CPA proyectado | Por definir (0 cierres aun) | < $20 |
| LTV:CPA ratio | 14.5x (a 12 meses, teorico) | > 3x |
| CTR enlace | 0.81% | > 1.5% |
| CPM | $1.79 | — |
| CPC enlace | $0.22 | — |
| Churn | 0% | < 5% |
| Producto | 85% listo | Estable |
| Canales activos | 4 (ads + puerta a puerta + afiliado + referidos) | — |

## Metricas AD-005 (datos CSV 8 Feb - 9 Mar)

- Gasto: $58.75 | Impresiones: 32,784 | CPM: $1.79
- Alcance: 16,889 | Frecuencia: 1.94
- Clics enlace: 265 | CPC: $0.22 | CTR: 0.81%
- Clics todos: 596 | CTR todos: 1.82% | CPC todos: $0.10
- Resultados (leads): 26 | Costo por resultado: $2.26
- Presupuesto: $10/dia continuo

**Comparacion vs campana anterior:**
- CPL: $4.16 → $2.26 (-46%)
- CTR: 0.54% → 0.81% (+50%)
- Frecuencia 1.94 — vigilar fatiga de audiencia

## Clientes actuales

| Cliente | Estado | Pago | Notas |
|---------|--------|------|-------|
| B (Dra. Yeni) | Activo — configurada | $35/mes | 2 clinicas con secretaria, operativa. Solicito features, se completaron hand-off y bug secretaria. |
| Dra. Ramos | Activo — recien integrada | $35/mes | Integrada hace 5 dias (4 Mar). Hand-off completado. |

## Pipeline

| Prospecto | Fuente | Estado | Notas |
|-----------|--------|--------|-------|
| Dra. Paola Cubero (Neurologa) | AD-005 | **Caliente — seguimiento 11 Mar** | Contactada 10 Mar. Respondio thumbs up a precio. Tiene auto-reply WhatsApp. Seguimiento martes 9am. |
| Dra. Luisa Banegas (Lumident Dental) | AD-005 | **Tibia — seguimiento 11 Mar** | Entro fria pero respondio caliente. Pregunto por FAQs y clinica dental. Tiene auto-reply. Seguimiento miercoles. |
| Lead "ya tiene plataforma" | AD-005 | Tibia | Tiene competidor. Proximo: 1 mensaje diferenciador (autoagenda WhatsApp). |
| Lead 4 | AD-005 | **Caliente — no respuesta 1** | 1 seguimiento sin reply. 1 intento mas, si nada → frio. |
| Lead 5 | AD-005 | **Caliente — no respuesta 2** | 2 seguimientos sin reply. Ultimo intento, si nada → frio. |
| Dra. Tejeda (Podosalud) | AD-005 | **Perdido — precio** | Recontactar en 60 dias (~5 May). |
| 2 leads no-medico | AD-005 | **Descartados** | No son medicos, no califican. |
| Lead EMR | AD-005 | **Descartado — sin fit** | Busca expediente clinico electronico. |
| Cliente A | Lead original | Descartado | Nunca activo. |
| Leads frios AD-005 | AD-005 | Contactados | Resto de leads no calificados o sin respuesta. |

**Pipeline efectivo: 2 calientes + 2 tibias. Cuello de botella sigue siendo conversion.**

**Proyeccion Marzo: 2-4 clientes nuevos (4-6 total). Meta de 8 no alcanzable.**

## Riesgos activos

1. **ALTO: Conversion sin validar.** 0 cierres con funnel nuevo. 26 leads y 0 cierres. Semana critica — Cubero y Banegas son la prueba.
2. **ALTO: Dependencia de un solo canal.** Se esta mitigando activamente con 4 canales (ads + puerta a puerta + afiliado Manuel + referidos).
3. **MEDIO: Dependencia de 2 clientes.** Si uno se va, perdemos 50% del ingreso.
4. **MEDIO: Frecuencia AD-005 en 1.94.** Acercandose a 2.0 — posible fatiga de audiencia pronto.
5. **BAJO: Deuda tecnica de seguridad.** Advisories de Supabase pendientes.

## Decisiones vigentes

- Feature freeze hasta Junio 2026
- Precio early adopter: $35/mes (subir a $40 para nuevos clientes)
- No contratar — escalar con automatizacion y AI
- Mercado: solo Honduras hasta dominar
- Presupuesto ads: $100 campaña AD-005 ($10/dia). **No subir hasta validar tasa de cierre.**
- Bot de ventas automatizado: NO ahora. Primero recolectar 30+ conversaciones, luego diseñar (post feature freeze Jun 2026)
- **Comisiones afiliados:** 25% por 12 meses (~$120/cliente) o bounty $80. NO comision permanente.
- **Manuel (TikToker):** Primer afiliado activado. Tomo plan 25% x 12 meses. Muy emocionado. Para futuros afiliados evaluar 15-20%.
- **Warhol = socia, no afiliada.** Compensacion via utilidad del negocio, no por comision por venta.
- **NO preguntar volumen de pacientes a leads.** En Honduras equivale a preguntar cuanto ganan — genera desconfianza y riesgo de seguridad. El formulario de Meta ya filtra por dolor real.

## Unit economics validados (sesion 5 Mar)

| Concepto | Valor |
|----------|-------|
| Precio mensual | $40 (nuevos), $35 (early adopters) |
| CPA proyectado | ~$33 |
| Payback period | Mes 1 (recuperas CPA con primer pago) |
| LTV 12 meses | $480 |
| Ratio LTV:CPA | 14.5x |
| Modelo | Cada $1 en ads → $14 en LTV. Ingreso recurrente se acumula. |

## Hitos del plan

| Hito | Clientes | MRR | Status |
|------|----------|-----|--------|
| Arranque (Mar) | 5-8 | $200-320 | En progreso — 2 activos, 2 calientes, 2 tibias, 4 canales activos. Proyeccion realista: 4-6. |
| Traccion (May) | 25 | $1,000 | Pendiente |
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

## Proximos pasos

### Martes 11 Mar
1. **Seguimiento Dra. Cubero** (~9am) — preguntarle si probo el bot
2. **Puerta a puerta** en edificio medico — llevar telefono con bot demo listo
3. **Seguimiento Lead 4** (no respuesta 1) — 1 intento mas

### Miercoles 12 Mar
4. **Seguimiento Dra. Banegas** (~9am) — si probo el bot
5. **Ultimo intento Lead 5** (no respuesta 2) — si nada → frio

### Esta semana (10-14 Mar)
6. **Sprint mini dev:** bloquear fechas + UI medico unico (2 items restantes)
7. **Sesion con Warhol** (30 min) — CRM + scripts
8. **Revision semanal viernes 14 Mar** — primera con datos reales multi-canal
