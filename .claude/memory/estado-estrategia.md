# Estado Estrategia — OrionCare

> Ultima actualizacion: 5 Mar 2026

## Dashboard

| Metrica | Valor | Meta |
|---------|-------|------|
| Clientes activos | 3 | 175 |
| MRR | $105 | $7,000 |
| Gasto en ads | $100 (campaña AD-005 activa) | $100/mes |
| Leads/mes | 1 (primer lead de campaña nueva) | 20 |
| CPA proyectado | ~$33 (si se mantiene tendencia) | < $20 |
| LTV:CPA ratio | 14.5x (a 12 meses) | > 3x |
| Churn | 0% | < 5% |
| Producto | 85% listo | Estable |

## Clientes actuales

| Cliente | Estado | Pago | Notas |
|---------|--------|------|-------|
| A | Activo | $35/mes | Esperando tarjeta Meta para activar bot completo |
| B | Instalacion | $35/mes | 2 clinicas con secretaria, instalacion pendiente |
| C | Prospecto | $35/mes | Cierre pendiente |

## Pipeline

| Prospecto | Fuente | Estado | Notas |
|-----------|--------|--------|-------|
| Dra. Tejeda (Podosalud) | Ad Meta (campaña AD-005) | Negociando — objecion precio | Podologa, +504 3330-5877. Probo bot, pregunto personalización y recordatorios. Dijo "me interesa pero dejeme analizar el precio". No escribir hoy, esperar. Si no escribe mañana → SC-003. Precio $40/mes. |
| Dra. Ramos | Lead anterior (Ene 2026) | Contactado — volvio a responder | +504 9910-2805. Retomar con SC-007. Asignar a esposa. |

## Riesgos activos

1. **ALTO: Sistema de recepcion de leads no listo.** Campaña corriendo pero: "Empezar ahora" apunta a numero personal de Diego, esposa sin scripts ni CRM configurado, sin numero de ventas dedicado. Cada lead que entra se pierde o lo atiende Diego improvisando.
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

## Proximos pasos

1. **HOY (Diego):** Obtener numero nuevo de ventas → cambiar "Empezar ahora" en Lovable → configurar WhatsApp Business en ese numero
2. **HOY (Diego):** Grabar audio de presentacion (30-40 seg, 1 toma, natural)
3. **HOY (Diego):** Terminar de configurar CRM (formulas Dashboard + Filter Views + listas desplegables)
4. **HOY (Diego):** Compartir `scripts-ventas.md` con esposa en G-Drive (ya subido)
5. **MAÑANA (Esposa):** Si Dra. Tejeda no escribe → enviar SC-003 (seguimiento suave)
6. **MAÑANA (Esposa):** Retomar Dra. Ramos con SC-007
7. **ESTA SEMANA:** Cerrar Cliente C, instalar Cliente B
8. **ESTA SEMANA:** Sesion con esposa (30 min) para explicarle CRM + scripts + Filter Views
9. **SEMANA 2:** Revisar metricas AD-005 al llegar a $50 gastados — pausar variante peor
10. **VIERNES 7 Mar:** Primera revision semanal con datos de campaña nueva
