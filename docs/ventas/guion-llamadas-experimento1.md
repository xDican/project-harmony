# Guion — Llamada fría Experimento #1 (cola directorio + IG)

> Creado 9 Jul 2026. Complementa la spec del experimento en `guion-40-test.md` (Etapa 2: calificación).
> Pitch basado en frase TEXTUAL de Wilmer (P2, 9 Jul). NO usar "pierde pacientes nuevos por no contestar" — sin respaldo en casos reales (hallazgo 6 Jul).

## Regla madre

Una llamada exitosa termina en UNA de dos cosas:
1. **Visita agendada con día y hora** (la demo y el cierre pasan EN el consultorio — regla cerrar-en-primera-visita), o
2. **Descarte limpio registrado en menos de 3 minutos** (alimenta el censo).

Una llamada "que salió bonita" sin fecha = fracaso disfrazado. No hay demo por teléfono, no hay "le mando la info y hablamos".

---

## Flujo (máx 4 minutos)

### 0. Antes de marcar (10 seg)
Ver la fila del CSV: nombre, especialidad, ¿celular o fijo?, ciudad. Celular = probablemente contesta el doctor. Fijo = probablemente recepción (ya es media respuesta a P1).

### 1. Apertura (0-20 seg)
> "¿Doctor(a) [apellido]? Le saludo rapidito — soy Diego, trabajo con dentistas aquí en Tegucigalpa en el tema de las citas por WhatsApp. ¿Me regala dos minutos o lo agarro ocupado?"

- **Ocupado:** "¿a qué hora le caigo mejor?" → anotar hora y CUMPLIRLA. No es retiro, es cita de llamada.
- **Contesta asistente/secretaria:** pedir al doctor UNA vez. Si no está, seguir con ella — la calificación es la misma y ella puede ser la champion (canal asistente validado).

### 2. Calificación (20-90 seg) — decide todo. NUNCA preguntar volumen de pacientes ni plata.

**P1 — conducta:** "¿Quién les lleva la agenda — usted mismo o tienen alguien?"

> **Si contesta "tiene secretaria": NO descalifica — bifurca.** Seguimiento: *"¿y ella cómo les recuerda las citas — les escribe uno por uno?"*
> - Ella lo hace a mano → dolor real, perfil Consultorio Familiar (doctor paga, ella sufre). CALIFICA, pero **segundo escalón de la cola** (gancho sin preferencia revelada hasta que Yeni pague #95; solo-doctor va arriba). Pitch al PAGADOR: NO "libere el tiempo de su secretaria" (costo hundido, no vende) — SÍ (a) **cita rescatada**: "cuando un paciente no confirma, el sistema libera el espacio — rescata 1 de cada 5 citas" (1 cita de ortodoncia recuperada paga meses, asumir en voz alta); (b) **control y continuidad**: "usted ve quién confirmó sin preguntar; si la secretaria falta o se va, los recordatorios salen igual". NUNCA sonar a reemplazo (lección Medilaser: asistente amenazada = barrera que mata la cuenta); en la visita ELLA presente y ganada primero (asistentes = puerta).
> - "Ella se encarga", cómodo y sin fricción → sonda de plantones igual (caso Yeni: con secretaria, 21% no confirmaba). Nada → censo y salir.
> - Recepción 3+ / PMS con recordatorios automáticos → descarte (problema resuelto con plata).
> - Señal extra: doctor con secretaria que contesta el celular ÉL MISMO = doctor involucrado, mejor comprador. Anotar.

**P2a — la puerta del dolor (corregida 9 Jul):** el plantón frecuente casi NO existe en consultorios de paciente fiel (Wilmer 3.1%, barbería "rara vez") — y cuando no existe, suele ser porque ALGUIEN paga el costo de prevenirlo a mano. El recordatorio manual ES el ladrillo. Preguntar primero por el trabajo, no por el plantón:

> "¿Y ustedes les recuerdan las citas a los pacientes, o la gente llega solita?"

- **"Les recordamos"** → "¿cómo hacen — uno por uno por WhatsApp?" + "¿cuánto tiempo se le va en eso?" → **perfil Wilmer, gancho TIEMPO. CALIFICA.** (Ojo: si hubiéramos preguntado "¿lo dejan plantado?" a Wilmer, habría dicho "casi nunca" y lo habríamos descartado.)
- **"La gente llega solita"** → sonda de plantones: "¿y cuando alguien no aparece — le guardan el espacio o pasan al siguiente?"
  - Historia real de plantones → **perfil Consultorio Familiar, gancho NO-SHOWS. CALIFICA.**
  - Tampoco hay → sin dolor. Censo y retirada limpia.

**Detector del ladrillo (si hay señal):** "¿Ya probaron algo para eso?"

**CALIFICA** = P1 (el doctor mismo, o alguien que lo hace a mano con esfuerzo) **Y** P2 con costo real visible (tiempo en recordatorios manuales, o historia de plantones).

**Registro de censo por llamada:** anotar en qué mundo cayó — (a) recuerda-a-mano, (b) no-recuerda-y-no-pasa-nada, (c) no-recuerda-y-hay-plantones — **y "usa PMS/Dentalink S/N"**. La tasa real de cada mundo + la penetración de PMS en el segmento son el dato de TAM que no tenemos.

> **Especialidades:** Experimento #1 = SOLO dental (la prueba social del pitch es un dentista; una variable a la vez). Dermato + pediatría (60 perfiles ya scrapeados en el CSV) quedan como **Experimento #2** — hipótesis: con-asistente no-dental tiene menos riesgo de PMS incumbente. Se dispara si el censo dental muestra saturación Dentalink, no antes.

### 3A. CALIFICA → pitch de 30 segundos (la frase de Wilmer) + pedir la visita

> "Le cuento por qué le llamaba: trabajo con un dentista aquí en Tegus que se ponía hasta una hora del fin de semana mandando los recordatorios de la semana a mano. Ahora el sistema se los manda solo, desde su mismo número de WhatsApp, y él nomás ve quién confirmó. Me gustaría enseñárselo en su consultorio — son 15 minutos, yo llego. ¿Le queda bien el jueves por la tarde, o le cae mejor otro día?"

Si el dolor que salió en P2 fue plantones (no tiempo), cambiar la vitrina: *"...y cuando un paciente no confirma, el sistema le avisa y libera el espacio — a una clínica con la que trabajo le rescata una de cada cinco citas."*

Reglas del pedido de visita:
- **Dos opciones concretas de día/hora**, nunca "cuando usted pueda" (elegir entre opciones no es pregunta de sí/no).
- **Si pregunta precio en la llamada, se dice sin rodeos:** "$40 al mes y el primer mes es gratis para que lo pruebe con sus pacientes reales; lo del WhatsApp de Meta va aparte, son centavos por mensaje." Y volver a la visita. No se negocia por teléfono.
- No listar features. Una historia + una invitación.

### 3B. NO CALIFICA → retirada limpia (30 seg)

> "Perfecto doctor, entonces eso ya lo tienen resuelto — no le quito más tiempo. Que le vaya bonito."

Registrar perfil (censo) y siguiente número. **NO pitchear "por si acaso"** — quema tiempo y número.

---

## Cuándo retirarse (señales de salida)

| Señal | Acción |
|---|---|
| No califica (P1 resuelta o P2 sin dolor) | Salir de una, cortés. Es censo, no derrota. |
| "Mándeme la información" | UNA contraoferta: "con gusto, pero esto se entiende viéndolo — ¿15 minutos el jueves?". Si insiste → mandar mensaje de 3 líneas, registrar, **NO perseguir** (los leads mueren en el 2do toque; la llamada ERA la oportunidad). |
| "Déjeme pensarlo / lo consulto" | "Claro, me dice con confianza" + intentar UNA fecha tentativa. Si no la da → registrar tibio, sin cadencia de acoso. |
| Molesto, apurado, cortante | Cortar con gracia inmediatamente. No es personal, es censo. |
| **Regla dura: minuto 4 sin fecha** | La llamada terminó. Cierre amable y siguiente. |

## Registro post-llamada (30 seg, obligatorio — sin esto no hay experimento)

`contestó S/N | calificó S/N | P1 y P2 textuales | objeción textual | resultado (VISITA fecha-hora / info enviada / descarte + motivo)`

Métrica pre-registrada: 20 llamadas CALIFICADAS → éxito = ≥3 visitas agendadas y ≥1 cierre. El veredicto se lee a las 20, no antes.
