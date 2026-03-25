# Análisis del Bot — Baseline 24 Mar 2026

> Período: 25 Feb — 24 Mar 2026
> Clínicas analizadas: Medilaser (Carla), Dr. Guevara (Ramos), Consultorio Familiar (Yeni)
> Objetivo: Medir estado actual para comparar después de fixes

---

## Métricas globales (3 clínicas reales)

| Métrica | Valor |
|---------|-------|
| Sesiones totales | **61** |
| Pacientes únicos | **61** (0 repiten — cada paciente = 1 sesión) |
| Completadas (cita agendada) | **23** (37.7%) |
| Mueren en main_menu | **23** (37.7%) |
| Sesiones falsas (<=2 msgs, mueren en menú) | **16** (26.2%) |
| Handoff a secretaria | **16** (26.2%) |
| "Opción no válida" (total veces) | **37** (0.61 por sesión) |

---

## Métricas por clínica

| Métrica | Medilaser | Dr. Guevara | Consultorio |
|---------|-----------|-------------|-------------|
| Sesiones totales | **41** | **16** | **4** |
| Pacientes únicos | **41** | **16** | **4** |
| Completadas | **17** (41.5%) | **6** (37.5%) | **0** (0%) |
| Mueren en main_menu | **13** (31.7%) | **7** (43.8%) | **3** (75%) |
| Sesiones falsas (<=2 msgs) | **10** (24.4%) | **5** (31.3%) | **1** (25%) |
| Handoff a secretaria | **12** (29.3%) | **4** (25%) | **0** |
| Opción no válida (veces) | **25** | **5** | **7** |
| Opción no válida / sesión | **0.61** | **0.31** | **1.75** |
| Avg msgs completada | **9.2** | **10.3** | — |
| Avg msgs menu death | **2.6** | **2.0** | **16.0** |
| Reagendar intentos | **16** | **1** | **1** |
| Reagendar completados | **8** (50%) | **1** (100%) | **0** (0%) |

---

## KPIs Baseline

| KPI | Valor | Qué mide |
|-----|-------|----------|
| Completion rate global | **37.7%** | Sesiones → cita agendada |
| Completion rate Medilaser | **41.5%** | Cliente principal |
| Sesiones falsas % | **26.2%** | Ruido que infla métricas |
| Opción no válida / sesión | **0.61** | Fricción del bot |
| Reagendar completion (Medilaser) | **50%** | 8/16 |
| Handoff rate | **26.2%** | Escalados a humano |
| Booking drop select_day→hour | **38.9%** | Mayor fuga del funnel (Medilaser) |
| Sesiones fuera de horario (7pm+) | **25%** | Bot capturando valor |
| Citas fuera de horario | **5** | Citas que se perderían sin bot |

---

## Funnel de booking — Medilaser

```
Sesiones totales ... 41  (100%)
Iniciaron booking .. 18  (43.9%)
Llegaron a hora .... 11  (26.8%)  ← 7 drops (-38.9%) ← MAYOR FUGA
Llegaron a confirm . 10  (24.4%)
Completaron ........ 10  (24.4%)
```

**Fuga principal: select_day → select_hour. 7 de 18 se pierden (38.9%).**

---

## Distribución por hora (Honduras)

| Hora | Sesiones | Completadas | Tasa |
|------|----------|-------------|------|
| 8-10am | 4 | 1 | 25% |
| **11am** | **12** | **7** | **58%** ← hora pico + mejor conversión |
| 12pm | 4 | 2 | 50% |
| 1pm | 9 | 4 | 44% |
| 2-4pm | 13 | 3 | 23% |
| 5pm | 1 | 1 | 100% |
| **7-8pm** | **10** | **5** | **50%** ← fuera de horario, bot captura |
| 9-10pm | 5 | 0 | 0% ← llegan pero no completan |

---

## Problema 1: Main Menu = Cementerio (37.7%)

23 de 61 sesiones terminan en main_menu sin hacer nada.

### Desglose por tipo

**Medilaser (13 sesiones mueren en menú):**
- Sesiones falsas (respuesta a recordatorio): "Ok", "Gracias", "Listo", "De acuerdo"
- Preguntas no entendidas: "Ubicación" ×2, "Háblame", "Me gustaría remover un lunar", "Mañana 3pm", "Mi agenda es para el 9 de abril"
- Saludos que reinician: "Hello", "Gracias feliz dia"

**Dr. Guevara (7 sesiones mueren en menú):**
- 3 pacientes desde sitio web ("Hola, estoy en su sitio web, tengo interés en un tratamiento") → preguntan precios → se van o piden handoff
- 1 prueba del propio doctor ("Excelente, funciona la prueba")
- 1 spam (código de Instagram)
- 1 paciente preguntando por cita existente ("Hola doctor, y cuando será mi cita?")
- 1 sesión fantasma

**Consultorio (3 sesiones mueren en menú):**
- 1 sesión de 1 msg ("Consultorio")
- 2 sesiones frustradas (22 y 25 msgs) — intentaron múltiples veces, bot no entendió

### Conclusión
De las 23 muertes en menú, ~16 son sesiones falsas de <=2 mensajes (ruido). Las ~7 restantes son pacientes reales que el bot no pudo ayudar.

---

## Problema 2: Handoff excesivo (26.2%)

16 sesiones escalan a humano.

**Triggers principales:**
- Opción "4" del menú (intencional)
- Mensajes confusos: "❓❓", "Hay no 😱"
- Pacientes de Guevara que llegan por sitio web preguntando precios
- Auto-handoff después de FAQ (funciona correctamente)

---

## Problema 3: Reagendar (50% abandono en Medilaser)

16 intentos, 8 completados, 7 abandonos, 1 terminó en otro estado.

### Exitosos (9 total)

| Tipo | Cantidad |
|------|----------|
| Flujo limpio (solo números) | **3** |
| Texto natural → falló → completó con números | **6** |

Solo 3 de 9 fueron limpios. Los otros 6 completaron a pesar del bot.

### Abandonos (9 total)

| Patrón | Cantidad | Ejemplo |
|--------|----------|---------|
| "Reagendar y se fue" | **4** | Escribieron "Reagendar", bot mostró semanas, nunca volvieron |
| Texto natural rechazado | **3** | "Yo les diré que fecha", "15 de junio", "05 de abril" |
| Loop frustrado | **2** | Múltiples caminos, se pierden entre cancelar y reagendar |

**Mensajes textuales de pacientes frustrados:**
- "Yo les diré que fecha"
- "Podría hasta en 15 de junio"
- "Para el 31 pudiera"
- "Mire no que no podré asistir 🥺"
- "Al final cancelar"

---

## Problema 4: "Opción no válida" (37 veces)

### Medilaser (25 veces)
- **Ubicación:** "Ubicación", "Me puede enviar la ubicación" ×2
- **Fechas en texto:** "05 de abril", "Semana del 30 al 5 abr", "Para el 31 pudiera", "Mañana 3pm"
- **Consultas naturales:** "Me gustaría remover un lunar", "Aún no tengo los resultados"
- **Saludos en medio de flujo:** "Hola buenos días", "Disculpe"
- **Cancelar en texto:** "Al final cancelar", "Cancelar"

### Consultorio Familiar (7 veces en solo 4 sesiones = 1.75/sesión)
- **Servicios en texto:** "Citología", "Consulta Médica" ×3, "Consulta"
- **Fecha:** "Sería mañana"
- Un paciente escribió "Consulta médica" **4 VECES** antes de entender que debía usar número

### Dr. Guevara (5 veces)
- "Mi novia solo puede sacarse las muelas del juicio en semana santa"
- "Necesito a alguien lo haga el lunes de semana santa"

---

## Problema 5: Consultorio Familiar — UX crítica

4 sesiones, 0 completadas, 1.75 opción no válida por sesión.

### Caso 1: +50493813442 (25 msgs — SÍ completó eventualmente)
```
"Quiero cita para mañana" → greeting (no entiende)
"Consulta" → opción no válida
"Consulta médica" → opción no válida ×3
Intentó 3 flujos completos
"Sería mañana" → opción no válida
Finalmente completó al 3er intento
```

### Caso 2: +50433899824 (22 msgs — NUNCA completó)
```
Intentó 3 veces de cero
Escribió "HOLA" frustrado
Probó "inicio" para resetear
Intentó Reagendar
"Hola" final — se rindió
```

---

## Datos de reagendar — detalle completo

### Completados

| Paciente | Msgs | Fue limpio? | Notas |
|----------|------|-------------|-------|
| +504321... | 5 | ✅ Sí | "Reagendar → 2 → 4 → 3 → 1" |
| +504965... | 9 | ✅ Sí | Solo números |
| +504998... (Guevara) | 5 | ✅ Sí | "Reagendar → 2 → 3 → 5 → 1" |
| +504965... | 8 | ❌ No | "Para el 31 pudiera" + "Disculpe" antes de usar números |
| +504338... | 10 | ❌ No | "Será que puedo moverla para el 30?" → texto ×2 → números |
| +504947... | 6 | ❌ No | "9 de abril" (texto) → falló → completó con número |
| +504953... | 10 | ❌ No | Seleccionó mal, re-navegó |
| +504950... | 15 | ❌ No | Escribió "Marleny Vargas" + intentó Reagendar 2 veces |
| +504989... | 9 | ❌ No | Duplicó pasos |

### Abandonos

| Paciente | Msgs | Patrón | Último mensaje |
|----------|------|--------|----------------|
| +504984... | 1 | Se fue | "Reagendar" |
| +504339... | 1 | Se fue | "Reagendar" |
| +504332... | 1 | Se fue | "Reagendar" |
| +504891... | 1 | Se fue | "Reagendar" |
| +504983... | 3 | Texto rechazado | "Yo les diré que fecha" |
| +504994... | 8 | Loop frustrado | "Al final cancelar → Reagendar" (loop) |
| +504975... | 9 | Texto rechazado | "05 de abril" |
| +504991... | 10 | Cansancio | Reagendar al final de sesión larga |
| +504338... (Consultorio) | 22 | Completamente perdido | 3 intentos, "HOLA" frustrado |

---

## Menu death — detalle

### Dr. Guevara (7 muertes, avg 2.0 msgs)

| Tipo | Cantidad | Descripción |
|------|----------|-------------|
| Paciente sitio web (precios) | 2 | Preguntan precios, bot no tiene respuesta útil |
| Paciente cita existente | 1 | "Hola doctor, y cuando será mi cita?" |
| Prueba del doctor | 1 | "Excelente, funciona la prueba" |
| Spam | 1 | Código de Instagram |
| Sesiones vacías | 2 | Sin mensajes útiles |

### Consultorio (3 muertes, avg 16.0 msgs)

| Tipo | Msgs | Descripción |
|------|------|-------------|
| Sesión corta | 1 | "Consultorio" y se fue |
| Frustración extrema | 22 | 3 intentos de booking, "HOLA", "inicio", se rindió |
| Frustración extrema | 25* | Escribió servicio 4 veces, eventualmente completó* |

*Nota: la sesión de 25 msgs SÍ completó eventualmente pero terminó en main_menu (escribió "Ok" después).

---

## Queries para comparación post-fix

Agregar este filtro a todas las queries para medir solo datos nuevos:
```sql
WHERE s.created_at >= '2026-03-25'  -- fecha del fix
```

KPIs a comparar:
1. Completion rate global y por clínica
2. % sesiones falsas
3. Opción no válida / sesión
4. Reagendar completion rate (Medilaser)
5. Handoff rate
6. Booking drop select_day → select_hour
