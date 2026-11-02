# Playbook — Activación del Bot SDR para un cliente

> Método reproducible para activar `sdr_mode_enabled` en la línea de un cliente sin regresiones de precio/horario.
> **Creado:** 7 Ago 2026, a partir del piloto de Hanoy (27 Jul) + auditoría pre-activación de Wilmer y Consultorio Familiar.
> **Output esperado:** línea con SDR encendido sin que ninguna pregunta de precio/horario que el bot clásico contestaba bien hoy empeore.

## Objetivo

El SDR es más capaz que el bot clásico (negocia en lenguaje libre, ofrece slots reales, filtra FAQs que contradicen el catálogo) pero **solo si el catálogo (`service_types`) tiene los datos reales que el negocio ya comunica por FAQ o a mano.** Activar sin auditar primero puede convertir un "sí, L800" instantáneo de hoy en un "necesita evaluación" del SDR — una regresión silenciosa, no un error visible.

## Pre-requisitos de plataforma (una sola vez, ya cumplidos)

- Gemini 3.5 Flash-Lite configurado y proyecto en plan **Paid** (free tier entrena con datos de pacientes — inaceptable). Ya confirmado globalmente, no es por-org.
- `organizations.llm_monthly_budget_usd` — default $10/mes cubre el volumen de un consultorio de 1 doctor (~$2.6/mes real medido con Hanoy). Revisar solo si el cliente tiene volumen de ads alto.

## Checklist por cliente (repetir para cada línea)

### 1. Estado actual de la línea
```sql
select bot_enabled, sdr_mode_enabled, is_active from whatsapp_lines where organization_id = '<org_id>';
```
Confirmar `bot_enabled=true` (bot clásico corriendo hoy, dato de comparación).

### 2. Auditoría de catálogo — el paso que más importa
```sql
select display_name, price, requires_prior_consult, is_active,
  case when is_active and not requires_prior_consult and price is null
    then 'REVISAR: sin precio y no requiere consulta' end as flag
from service_types where organization_id = '<org_id>' order by is_active desc, display_name;
```
`cotizable = !requires_prior_consult && price != null` (regla fijada 24 Jul). Cualquier fila con el flag necesita una decisión: cargar precio real, o marcar `requires_prior_consult=true` si es genuinamente variable (mismo resultado de UX, pero queda semánticamente correcto).

### 3. Auditoría de FAQs — buscar precios "escondidos" que el catálogo no tiene
```sql
select question, answer from bot_faqs where organization_id = '<org_id>' and is_active;
```
**Gotcha crítico (encontrado 7 Ago con Wilmer):** el SDR filtra automáticamente CUALQUIER FAQ que toque el dominio de precio/horario/especialidad (`filterStructuredDomainFaqs`), sin importar si esa FAQ tiene el dato correcto — el diseño asume que el precio real vive en `service_types`. Si un cliente tiene una FAQ con precios reales que el catálogo NO tiene (caso Wilmer: extracción, restauraciones, consulta general — 4 FAQs con precios reales, catálogo con esos mismos servicios en `price=NULL`), **el SDR pierde la respuesta que el bot clásico da bien hoy.** Antes de activar: migrar esos números de la FAQ al `service_types.price` correspondiente, o confirmar con el cliente si el precio sigue vigente.
- Precio fijo y limpio (ej. "consulta general L800") → cargar directo a `service_types.price`.
- Precio variable/escalonado (ej. "extracción L1200-1500 según pieza", "restauración L700-1200") → no cabe en un solo campo `price`. Dos salidas: (a) dejarlo con `price=NULL` (el SDR dirá "se determina en la evaluación", resultado aceptable porque el precio real tampoco es fijo), o (b) partir el servicio en sub-ítems si el cliente quiere que el bot cotice cada uno. **Preguntar al cliente, no decidir por él** — es dato de negocio, no técnico.
- Cliente sin ninguna FAQ ni precio cargado (caso Consultorio Familiar, 7 Ago: 0 FAQs, catálogo 100% sin precio) → antes de activar, confirmar con el cliente si sus precios son fijos y vale la pena cargarlos, o si de verdad todo depende de evaluación (consulta médica general suele ser más variable que un tratamiento dental — puede que "requiere evaluación" sea honesto, no un gap).

### 4. Activar
```sql
update whatsapp_lines set sdr_mode_enabled = true where organization_id = '<org_id>';
delete from bot_sessions where whatsapp_line_id = '<line_id>' and status != 'completed';
```
El flag de modo se cachea por sesión con TTL de 30 min — sin borrar las sesiones vivas, pacientes a mitad de conversación no ven el cambio hasta que expire el cache.

### 5. Supervisión primera semana
Revisar `llm_call_logs` (costo real vs. proyectado) y `bot_faq_proposals` (gaps de conocimiento que el SDR encontró solo — es la cola que puebla las FAQs nuevas, revisar y aprobar desde el admin).

## Rollback
`update whatsapp_lines set sdr_mode_enabled = false where organization_id = '<org_id>';` — inmediato, el bot clásico vuelve a responder en el siguiente mensaje (no hace falta limpiar sesiones para apagar, solo para prender).

## Evolución del playbook

- **7 Ago 2026:** primera ejecución del checklist completo (post-piloto Hanoy) sobre Wilmer y Consultorio Familiar. Encontró el gotcha del filtro de dominio de precio en ambos — Wilmer tiene datos para resolverlo (FAQs con precios reales sin migrar), Consultorio Familiar no tiene ninguna fuente de precio configurada. Pendiente confirmar con ambos clientes antes de activar.
- Si aparece un nuevo dominio estructurado (ej. políticas de pago) con el mismo patrón de filtro, agregar su chequeo aquí.
