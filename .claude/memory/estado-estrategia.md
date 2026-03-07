# Estado Estrategia — OrionCare

> Ultima actualizacion: 6 Mar 2026

## Dashboard

| Metrica | Valor | Meta |
|---------|-------|------|
| Clientes activos | 2 | 175 |
| MRR | $70 | $7,000 |
| Gasto en ads | $29.42 de $100 (AD-005 activa, 3 dias) | $100/mes |
| Leads campaña | 5 (Meta reporta) / 6 (Diego cuenta) | 20/mes |
| CPL actual | $5.88 | < $5 |
| CPA proyectado | Por definir (0 cierres de AD-005 aun) | < $20 |
| LTV:CPA ratio | 14.5x (a 12 meses, teorico) | > 3x |
| Churn | 0% | < 5% |
| Producto | 85% listo | Estable |

## Clientes actuales

| Cliente | Estado | Pago | Notas |
|---------|--------|------|-------|
| B (Dra. Yeni) | Activo — configurada | $35/mes | 2 clinicas con secretaria, operativa. Solicito features, se completaron hand-off y bug secretaria. |
| Dra. Ramos | Activo — recien integrada | $35/mes | Integrada hace 2 dias (4 Mar). Solicito features, hand-off completado para ella. |

## Pipeline

| Prospecto | Fuente | Estado | Notas |
|-----------|--------|--------|-------|
| Cliente A | Lead original | Descartado | Nunca activo, dice que el avisa. No perseguir. |
| Dra. Tejeda (Podosalud) | AD-005 | Perdido — precio | "de momento no lo tomare". Recontactar en 60 dias. |
| 4-5 leads frios AD-005 | AD-005 | Sin contactar | Contactar manana (7 Mar) con numero activo o numero de Warhol |

**Pipeline efectivo: 0 prospectos calientes. Cuello de botella = volumen de leads, no producto.**

## Riesgos activos

1. **ALTO: Numero de ventas bloqueado por Meta.** Numero nuevo configurado, "Empezar ahora" ya apunta a el, pero Meta lo bloqueo. Esperando resolucion (~24hrs desde 5 Mar). **Deadline: si el 7 Mar no esta resuelto → cambiar a otro numero.** Campaña AD-005 corre pero leads que hagan clic caen a numero muerto.
2. **ALTO: Bot sin validacion en campo.** Dra. Tejeda probo el bot (primer uso real por lead), pero ningun paciente real ha agendado todavia.
3. **MEDIO: Dependencia de 3 clientes.** Si uno se va, perdemos 33% del ingreso.
4. **BAJO: Deuda tecnica de seguridad.** 4 advisories de Supabase pendientes.

## Decisiones vigentes

- Feature freeze hasta Junio 2026
- Precio early adopter: $35/mes (subir a $40 para nuevos clientes)
- No contratar — escalar con automatizacion y AI
- Mercado: solo Honduras hasta dominar
- Presupuesto ads: $100 campaña AD-005 (lifetime budget, ~2 semanas)
- Bot de ventas automatizado: NO ahora. Primero recolectar 30+ conversaciones, luego diseñar (post feature freeze Jun 2026)

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
| Arranque (Mar) | 5-8 | $200-320 | En progreso — campaña activa, 1 lead dia 1 |
| Traccion (May) | 25 | $1,000 | Pendiente |
| Momentum (Jul) | 50 | $2,000 | Pendiente |
| Objetivo (Dic) | 175 | $7,000 | Pendiente |

## Decisiones sesion 6 Mar

### Sprint mini aprobado (4 items)
- Bug secretaria + bloquear fechas + UI medico unico + completar hand-off
- Todo lo demas diferido a Junio — se le comunica a Dra. Yeni: "Lo tenemos anotado, en la siguiente actualizacion"
- Max 2-3 dias de desarrollo

### Numero de ventas bloqueado por Meta
- Diego decidio dejar campaña corriendo con numero muerto (leads son frios, pocos haran clic a WhatsApp)
- Deadline: 7 Mar — si no se resuelve, cambiar a otro numero
- No revertir a numero personal de Diego

### Seguimiento de prospectos
- Diego maneja Dra. Tejeda y Dra. Ramos personalmente (no delegar, son relaciones iniciadas por el)
- Warhol maneja leads nuevos que lleguen de campaña

## Decisiones sesion 5 Mar

### Scripts de ventas — sistema completo creado
- **Archivo:** `docs/scripts-ventas.md` (compartir con esposa via G-Drive)
- 7 scripts: SC-001 a SC-007 cubriendo todo el funnel
- Estilo ajustado a la personalidad de Diego: calido, natural, sin presion
- Incluye audio de presentacion (30-40s) como herramienta clave — Diego graba UNO, esposa lo reenvia
- Manejo de objeciones: precio, secretaria, "lo voy a pensar", WhatsApp
- Filosofia: "ser humano primero, vender despues, pero siempre con brujula hacia el cierre"

### CRM reestructurado
- **Arquitectura nueva:** 3 tabs (LEADS + CLIENTES + DASHBOARD) en vez de archivos separados
- **Tab LEADS:** RAW de Meta (cols A-Q) + Clasificación formula (col S) + seguimiento manual (cols T-AA) en la misma fila. Cero copiar datos.
- **Clasificación automática:** formula en col S que marca Caliente/Frío/Descartado basado en respuestas del formulario
- **Tab DASHBOARD:** formulas COUNTIF/QUERY que calculan metricas generales, funnel de conversion, y objeciones automaticamente
- **5 Filter Views configurados:** Calientes nuevos, Trabajo Esposa hoy, Trabajo Diego hoy, Negociando, Todos activos
- **Google Sheet de registro de conversaciones:** estructura definida para alimentar futuro bot de ventas

### Decisiones estrategicas
- **"Empezar ahora" debe cambiar** de numero personal de Diego a numero de ventas dedicado (esposa). Numero nuevo en camino (~1 hora).
- **Dra. Tejeda NO fue lead organico** — vino de la campaña AD-005 (correccion). El funnel completo funciono en dia 1: ad → formulario → bot → web → contacto.
- **Bot de ventas automatizado descartado por ahora.** Razon: sin datos suficientes (1 conversacion), feature freeze, y humano convierte mejor con 3 clientes y cero marca. Secuencia: documentar 30+ conversaciones → analizar patrones (Abr-May) → diseñar bot (Jun) → produccion (Jul).
- **No agregar ChatGPT ni herramientas extra al proceso de ventas.** El sistema es: lead entra → esposa responde con script → documenta en Sheet. Simple.

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

## Proximos pasos

### Inmediato (7 Mar)
1. **Contactar 4-5 leads frios de AD-005** (con numero activo o numero de Warhol)
2. **Verificar aprobacion de templates Meta** (handoff_notification para 3 orgs)
3. **QA handoff** con Demo Bot cuando template se apruebe
4. **Si Meta no desbloquea numero de ventas** → cambiar a otro numero

### Esta semana
5. **Sesion con Warhol** (30 min) para explicarle CRM + scripts + Filter Views
6. **Grabar audio de presentacion** (30-40 seg, pendiente desde 5 Mar)
7. **Sprint mini dev:** bloquear fechas + UI medico unico (2 items restantes)
8. **Viernes 7 Mar:** Primera revision semanal con datos reales

### Semana 2
9. **Revisar metricas AD-005** al llegar a $50 gastados — pausar variante peor
