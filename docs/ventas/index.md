# Ventas OrionCare — Index

> Archivo central del sistema de ventas. El modo `/modo-seguimiento` lee este archivo al activarse.
> Archivos individuales de leads en `docs/ventas/leads/`.

---

## CRM y fuentes de datos

**CRM principal:** Google Sheets (dashboard de metricas, todos los leads, estados, objeciones)
**Lead files (`docs/ventas/leads/`):** Solo para leads que necesitan analisis detallado de conversacion.

### Politica de lead files

**NO crear archivo `LEAD-XXX.md` para cada lead.** Solo crear archivo cuando el lead:
- Respondio Y mostro interes real (probo bot, pregunto precio, pidio info)
- Necesita analisis detallado de conversacion para mejorar scripts

Leads que nunca responden → solo G-Sheet, no archivo.

### Dropdowns del G-Sheet (valores exactos)

**Estado:** `Nuevo`, `Contactado`, `En demo`, `Negociando`, `Cerrado`, `Perdido`

**Objecion:** `Ninguna`, `Evaluando precio`, `Tiene secretaria`, `No responde`, `Lo va a pensar`, `Otra`

**Proxima accion:** `SC-001`, `SC-002`, `SC-003`, `SC-004`, `Audio`, `Esperar respuesta`, `Enviar datos config`, `Mover a clientes`, `Mover a archivo/perdido`

**Razon perdida:** `No respondió`, `Precio`, `Tiene secretaria`, `No le interesó`, `No es médico`, `Otra`

### Formulas del dashboard (COUNTIF con valores exactos)

**Funnel:**
```
Sin contactar    = COUNTIF(Estado, "Nuevo")
Contactados      = COUNTIF(Estado, "Contactado")
En demo          = COUNTIF(Estado, "En demo")
Negociando       = COUNTIF(Estado, "Negociando")
Cerrados         = COUNTIF(Estado, "Cerrado")
Perdidos         = COUNTIF(Estado, "Perdido")
% Conversion     = Cerrados / Total
```

**Razones de perdida:**
```
No respondio     = COUNTIF(Razon_perdida, "No respondió")
Precio           = COUNTIF(Razon_perdida, "Precio")
Tiene secretaria = COUNTIF(Razon_perdida, "Tiene secretaria")
No le intereso   = COUNTIF(Razon_perdida, "No le interesó")
No es medico     = COUNTIF(Razon_perdida, "No es médico")
Otra             = COUNTIF(Razon_perdida, "Otra")
```

**Objeciones activas (leads no-perdidos):**
```
Evaluando precio  = COUNTIF(Objecion, "Evaluando precio")
Tiene secretaria  = COUNTIF(Objecion, "Tiene secretaria")
No responde       = COUNTIF(Objecion, "No responde")
Lo va a pensar    = COUNTIF(Objecion, "Lo va a pensar")
```

**Bot engagement:**
```
Probaron bot     = COUNTIF(Probo_bot, "Sí")
No probaron      = COUNTIF(Probo_bot, "No")
Sin dato         = Total - Probaron - No_probaron
```

> Para verificar si un lead probo el bot, usar SQL query contra `bot_sessions` + `bot_conversation_logs`.
> IMPORTANTE: Los valores con tildes ("No respondió", "No le interesó", "No es médico") deben coincidir EXACTO en las formulas.

---

## Dashboard de leads

### Leads activos

| ID | Nombre | Tipo | Estado | Ultimo contacto | Proximo paso |
|----|--------|------|--------|-----------------|--------------|
| — | David Sibrian | Ortodoncia | Contactado — voice note enviado | 18 Mar 2026 | Si responde → demo inmediata. Si no → dia 2 cadencia (llamar 5:30-6pm 19 Mar) |

### Leads descartados (18 Mar — demasiado frios, no invertir mas tiempo)

| ID | Nombre | Razon | Archivo |
|----|--------|-------|---------|
| LEAD-001 | Dra. Herrera | No contesto demo ni seguimientos | [LEAD-001](leads/LEAD-001-herrera.md) |
| LEAD-002 | Dra. Cubero | Perdida — precio vs secretaria | [LEAD-002](leads/LEAD-002-cubero.md) |
| LEAD-003 | Dra. Banegas | Sin respuesta despues de multiples seguimientos | [LEAD-003](leads/LEAD-003-banegas.md) |
| LEAD-004 | Dra. Peralta | Sin respuesta | [LEAD-004](leads/LEAD-004-peralta.md) |
| LEAD-005 | Dr. Pena | No contesto cierre, enfrio | [LEAD-005](leads/LEAD-005-pena.md) |
| LEAD-006 | Dr. Servellon | No contesto demo ni seguimientos | [LEAD-006](leads/LEAD-006-servellon.md) |

> Para pipeline completo y metricas de negocio ver `.claude/memory/estado-estrategia.md`

### Discovery con clientes activos (Jul 2026)

**[Guion 40% test](guion-40-test.md)** — llamadas a Wilmer (versión A) y secretaria Consultorio Familiar (versión B: incluye facturación #95 + corrección citas madrugada). Incluye árbol de decisión pre-acordado. Wilmer EJECUTADA 9 Jul (registro dentro del archivo: rama A no dispara, veredicto en suspenso hasta #99).

**[Guion llamadas frías — Experimento #1](guion-llamadas-experimento1.md)** — flujo completo de llamada: apertura, calificación 60s (P1 conducta + P2 dolor + detector del ladrillo), pitch textual de Wilmer, pedido de visita, y señales de retirada. Cola de leads: `leads/directorio-dhn-detalles.csv` (208 perfiles, 9 Jul).

> ⚠️ Los "Perfiles de cliente" de abajo (Doctor-Empresario / Doctor Independiente) son PRE-6-Jul y su pitch "pierde pacientes que escriben" quedó sin respaldo en datos. Para llamadas frías usar el guion del Experimento #1; ICP vigente = 2 ganchos (tiempo administrativo / no-shows) en `.claude/memory/estado-estrategia.md`.

---

## Persona de ventas

> Esta seccion evoluciona con cada correccion de Diego. Tiene prioridad sobre scripts base.
> Los scripts en `docs/scripts-ventas.md` se actualizan cuando esta Persona aprende reglas nuevas.
> Ver tabla de sincronizacion al final de ese archivo.

### Tono general
- Amigable, cercano, como un colega que quiere ayudar — no como vendedor
- Emojis con moderacion (1-2 por mensaje, solo al final)
- Mensajes cortos: max 3-4 lineas en WhatsApp
- Si necesita mas contexto, partir en 2 mensajes separados

### Frases que funcionan
- "Me dice con confianza" (cierre suave)
- "Aqui estoy por cualquier duda" (puerta abierta)
- "Estoy trabajando con un par de clinicas aqui en Honduras" (prueba social indirecta)
- "Yo se lo dejo listo en una hora" (facilidad de setup)
- Empezar con saludo + deseo genuino ("Espero que este teniendo una gran semana!")

### Frases/enfoques que NO funcionan
- "Pocos espacios disponibles" o cualquier urgencia artificial
- Preguntas directas de si/no ("Le interesa?", "Quiere agendar?")
- Repetir features que el lead ya vio en el bot
- Parrafos largos — pierden atencion en WhatsApp
- Preguntar volumen de pacientes
- Thumbs up en precio ≠ aprobacion — en Honduras es "ok, anotado", no interes real
- **No CTA con accion en seguimientos tempranos** — solo informar + puerta abierta. Cualquier CTA ("se lo dejo listo", "pruebe agendar", "son $40/mes") empuja a decidir si/no y va contra la cultura hondurena. *(Correccion #2, 12 Mar)*
- **Nunca revelar datos de bot_conversation_logs al lead** — referenciar la conversacion de WhatsApp como fuente, no su comportamiento en el bot. Decir "lo que me pregunto" no "lo que vio en el bot". Revelar monitoreo se siente invasivo/creepy. *(Correccion #3, 12 Mar)*

### Proceso de venta (no visible en copy-paste de WhatsApp)
- Cuando un lead pregunta por el servicio, Diego envia un **audio de presentacion** + **link al bot demo** (+504 9313-3496)
- El mensaje que aparece como "Asistente de Citas - OrionCare" en el copy-paste incluye el audio y el numero del bot
- Los audios y reacciones emoji no se exportan en texto — tomar en cuenta al leer conversaciones

### Perfiles de cliente (buyer persona)

**Perfil primario: "Doctor-Empresario con Equipo"**
- Clinica con 2+ doctores (propietario + contratados/subarrendados)
- Asistentes con rol MIXTO: front desk + asistir en procedimientos (llevan scrubs, no ropa de oficina)
- Gestion manual o software sin WhatsApp integrado
- **Dolor principal:** La asistente esta saturada — agenda, cobra, contesta WhatsApp, asiste en procedimientos. Todo al mismo tiempo.
- **Precio:** $75-110/mes ($40 primer doctor + $35 cada adicional) | LTV:CPA: 27-40x
- **Angulo de venta:** "Su asistente deja de correr y usted deja de perder citas"
- **Señales:** Menciona asistentes/personal, tiene multiples doctores, usa ERM sin mensajeria
- **Ejemplo real:** Carla Paredes / Medilaser (2 doctores, 2 asistentes, 39 pacientes en 3 dias, $75/mes)

**Perfil secundario: "Doctor Independiente"**
- Medico solo o con secretaria basica
- El mismo ES quien contesta WhatsApp entre pacientes
- **Dolor principal:** No puede contestar durante consultas, pierde pacientes que escriben y no reciben respuesta.
- **Precio:** $40/mes | LTV:CPA: 14.5x
- **Angulo de venta:** "Un asistente virtual atiende a sus pacientes al instante, sin que usted conteste uno por uno"
- **Señales:** Trabaja solo, menciona que no puede contestar, tiene auto-reply manual
- **Ejemplo real:** Yeni, Ramos

### Enfoque por tipo de clinica
- **Doctor-empresario (multi-doctor):** Resaltar que la asistente se libera de WhatsApp, manejo de multiples doctores/agendas, expansion a $35/doctor adicional
- **Centro estetico/spa:** Seleccion de multiples servicios, recordatorios automaticos (reduce no-shows)
- **Clinica dental:** FAQs automatizados, manejo de multiples doctores/servicios
- **Medico independiente:** Simplicidad, "se lo dejo listo en una hora", bot atiende 24/7 sin necesitar secretaria
- **Neurologa/especialista solo:** No necesita estar pendiente del telefono, el bot atiende cuando esta en consulta

---

## Reglas culturales Honduras (INMUTABLES)

1. **No preguntas directas de si/no** — cerrar con "me dice con confianza" o "aqui estoy"
2. **No preguntar volumen de pacientes** — equivale a preguntar cuanto ganan, genera desconfianza
3. **No urgencia artificial** — "pocos espacios" o "oferta limitada" genera desconfianza
4. **"Lo analizare" ≠ no** — es indecision, dar tiempo y una razon nueva para re-enganchar
5. **Prueba social indirecta** — "estoy trabajando con clinicas" > "tengo X clientes"
6. **Visual > texto** — prefieren audio/video sobre parrafos largos
7. **No ser directo/pushy** — dar espacio para que el prospecto venga a ti

---

## Patrones de conversion

### Senales de compra
- Responde thumbs up o positivo a precio
- Pregunta por features especificos (FAQs, servicios)
- Completa el flujo del bot de demo
- Tiene auto-reply manual (siente dolor de atender mensajes)
- Pide instalacion o pregunta por horarios de setup

### Senales de no-compra
- "Lo analizare" sin engagement previo con el bot
- No responde despues de 2 seguimientos
- Objecion de precio vs volumen bajo de pacientes
- Busca producto diferente (ej. EMR/expediente clinico)

### Objeciones frecuentes
- **"Lo analizare"** → Dar tiempo, regresar con angulo nuevo (caso de uso especifico para su tipo)
- **"Ya tengo plataforma"** → Diferenciador: autoagenda via WhatsApp sin descargar app
- **"Esta caro"** → Precio vs costo de perder 1 paciente/mes por no-show

---

## Log de correcciones

> Ultimas 10 correcciones. Cuando se acumulen patrones, absorber en seccion Persona y archivar.

| # | Fecha | Lead | Claude sugirio | Diego envio | Razon del cambio |
|---|-------|------|---------------|-------------|-----------------|
| 1 | 12 Mar 2026 | LEAD-001 | (mensaje sugerido modo-seguimiento) | "Buen dia Dra. Herrera! Espero que este teniendo una gran semana!..." | Primera iteracion — Diego redacto directamente, aun sin loop de correccion activo |
| 2 | 12 Mar 2026 | LEAD-003 | CTA con accion ("se lo dejo listo en una hora") | Elimino CTA, solo informar + puerta abierta | Cualquier CTA empuja a decidir si/no — contra cultura hondurena. **Absorbido en Persona.** |
| 3 | 12 Mar 2026 | LEAD-003 | "las FAQs que vio en el bot" | "lo que me pregunto sobre las preguntas frecuentes" | Revelar datos de bot_conversation_logs se siente invasivo/creepy. **Absorbido en Persona.** |
| 4 | 12 Mar 2026 | LEAD-004/005 | Precio "$40 incluye todo" | Agregar desglose Meta aparte (~L.120/200 citas) | OC no cobra ni maneja pagos de Meta. Siempre separar ambos costos. **Absorbido en scripts SC-005.** |

> Cuando haya 5+ correcciones con patron similar, proponer actualizacion a la seccion Persona.
