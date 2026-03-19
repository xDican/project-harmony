# Creativos de Ads — OrionCare

> Todos los creativos (video + imagen) para campanas de Meta Ads.

---

# Imagen A — Doctor de noche (AD-005)

> Imagen estatica: doctor en cama de noche, notificaciones de WhatsApp apiladas. Formatos: 4:5 (Feed) + 9:16 (Stories).

## Imagen

**Escena base:** Doctor acostado en cama de noche, mirando celular frustrado/agotado, pantalla iluminandole la cara con luz azul. Fondo oscuro (azul noche).

**Elementos overlay:**
1. **"10:47 PM"** — texto blanco grande y bold en la esquina superior (comunica hora tardia)
2. **3 burbujas de WhatsApp** (verde, apiladas, parcialmente superpuestas):
   - "Doc necesito cita urgente"
   - "Tiene disponible mañana?"
   - "Ya no contesta?"
3. **Badge rojo** con "47" (estilo notificacion de app — estres digital universal)
4. **Expresion del doctor** — agotado, cejas fruncidas, mano en la frente (frustracion)

**Contraste de color:** fondo azul oscuro, verde WhatsApp en burbujas, rojo en badge, blanco en texto overlay, azul brillante en pantalla del celular.

**Formatos:**
- **4:5** para Feed (recortar si es necesario)
- **9:16** para Stories (extender fondo oscuro arriba/abajo si es necesario)

**Estado:** Pendiente — generar con elementos overlay actualizados.

---

## Copy del Ad — 2 variantes para A/B test

### Variante 1 — Dolor + Solucion

**Texto primario:**
> Doctor, ¿cuántas citas perdió esta semana porque no contestó a tiempo?
>
> Mientras usted duerme, sus pacientes le escriben por WhatsApp. Y cuando no les contesta rápido... buscan otro doctor.
>
> Con OrionCare, sus pacientes se agendan solos por WhatsApp. A cualquier hora. Sin que usted levante un dedo.
>
> Responda 4 preguntas y le mostramos cómo funciona 👇

**Headline:** Sus pacientes se agendan solos por WhatsApp

**Descripcion:** OrionCare — La agenda inteligente para médicos

### Variante 2 — Pregunta directa

**Texto primario:**
> ¿Todavía agenda citas por WhatsApp uno por uno?
>
> 20 mensajes para agendar 1 cita. Pacientes que escriben a las 10 de la noche. Citas que se pierden porque no contestó a tiempo.
>
> Ya hay una mejor forma: con OrionCare sus pacientes se agendan solos por WhatsApp. 24/7. Automático.
>
> Descubra cómo en 4 preguntas 👇

**Headline:** Cero mensajes. Cero citas perdidas.

**Descripcion:** OrionCare — Agenda automática por WhatsApp

---

## Formulario de leads (Instant Form en Meta)

Destino del ad: formulario nativo de Meta (Instant Form). El lead nunca sale de Facebook/Instagram.

### Configuracion general

| Campo | Valor |
|-------|-------|
| Nombre interno | OrionCare - Autoagenda WhatsApp - Mar 2026 |
| Tipo de formulario | Mas volumen (More Volume) |
| Idioma | Español |

### Intro (pantalla inicial)

| Campo | Valor |
|-------|-------|
| Titulo | Descubra cómo sus pacientes se agendan solos |
| Descripcion | Responda estas preguntas rápidas para saber si OrionCare es para usted. Un asesor le contactará por WhatsApp para mostrarle cómo funciona. Su información solo se usará para este fin y no se compartirá con terceros. |

### Preguntas

| # | Pregunta | Tipo en Meta | Opciones |
|---|----------|-------------|----------|
| 1 | ¿Ejerce como médico o dentista? | Multiple choice | Sí / No |
| 2 | ¿Cuánto tiempo pierde agendando citas al día? | Multiple choice | Poco / Mucho / Demasiado |
| 3 | ¿Cuál es su especialidad? | Short answer | (texto libre) |

### Datos de contacto (prefill)

Estos campos se llenan automaticamente desde el perfil de Facebook. El lead solo confirma.

| # | Campo | Tipo en Meta |
|---|-------|-------------|
| 4 | Nombre completo | Prefill: FULL_NAME |
| 5 | Numero de telefono | Prefill: PHONE_NUMBER |

> **Nota:** El CTA del ad dice "4 preguntas" — las 3 preguntas + especialidad se sienten como 4 interacciones. Nombre y telefono son prefill automatico, no se sienten como preguntas.

### Politica de privacidad

| Campo | Valor |
|-------|-------|
| URL | https://orioncare.app/privacidad *(o la URL que exista)* |
| Texto del enlace | Política de privacidad |

### Pantalla de agradecimiento (Thank You Screen)

| Campo | Valor |
|-------|-------|
| Titulo | ¡Listo! Le contactaremos pronto |
| Descripcion | Un asesor de OrionCare le escribirá por WhatsApp en las próximas 24 horas para mostrarle cómo funciona. |
| Texto del boton | Visitar sitio web |
| URL del boton | https://orioncare.app |

---

## Configuracion de campana Meta

| Parametro | Valor |
|-----------|-------|
| Objetivo | Leads (formulario) |
| Presupuesto | Lifetime budget $100, fecha fin ~2 semanas |
| Distribucion | Meta distribuye ~$7/dia automaticamente |
| Audiencia | Honduras, medicos independientes |
| Placements | Feed + Stories (automatico) |
| A/B test | Misma imagen, 2 variantes de copy |
| Evaluacion | Revisar metricas al llegar a $50 gastados (~1 semana) |

**Nota:** Lifetime budget evita el minimo de $25/dia del presupuesto diario.

---

## Checklist de lanzamiento — Imagen A

- [ ] Exportar imagen en formato 4:5 (Feed)
- [ ] Exportar imagen en formato 9:16 (Stories — extender fondo oscuro si necesario)
- [ ] Crear campana en Meta Ads Manager con objetivo Leads
- [ ] Configurar formulario con las 5 preguntas
- [ ] Crear Ad Set: Honduras, medicos independientes, placements automaticos
- [ ] Crear Ad 1: Imagen A + Copy Variante 1
- [ ] Crear Ad 2: Imagen A + Copy Variante 2
- [ ] Configurar lifetime budget $100 con fecha fin (~2 semanas)
- [ ] Publicar y esperar aprobacion de Meta
- [ ] Revisar metricas al llegar a $50 gastados

---

# AD-007 — 2 Variantes de Imagen + 2 de Copy (19 Mar 2026)

> **Objetivo:** Filtrar leads basura via creativo (no via formulario ni audiencia). 2 imagenes que solo un medico reconoce como "mi dia a dia".

> **Decision estrategica:** NO estrechar audiencia en Meta. TAM Honduras ~5,000-7,000 medicos. El CREATIVO es el filtro. Audiencia Meta sin cambios (Honduras, medicos/dentistas). 2 variantes de imagen en la misma campana: Meta optimiza entrega via Advantage+.

---

## Buyer Persona (2 perfiles)

**Perfil primario: "Doctor-Empresario con Equipo"**
- Clinica con 2+ doctores (propietario + contratados/subarrendados)
- Asistentes con rol MIXTO: front desk + asistir en procedimientos
- Gestion manual o software sin WhatsApp integrado
- Dolor: la asistente esta saturada (agenda, cobra, contesta WhatsApp, asiste en procedimientos)
- Precio: $75-110/mes | LTV:CPA: 27-40x
- Ejemplo real: Carla Paredes / Medilaser

**Perfil secundario: "Doctor Independiente"**
- Medico solo o con secretaria basica
- El mismo ES quien contesta WhatsApp entre pacientes
- Dolor: no puede contestar durante consultas, pierde pacientes
- Precio: $40/mes | LTV:CPA: 14.5x
- Ejemplo real: Yeni, Ramos

---

## Imagen A: "La Asistente Saturada" (perfil empresario)

**Visual:** Asistente de clinica (~25-35, scrubs, pelo recogido) en recepcion de consultorio. Celular en mano con notificaciones WhatsApp acumuladas. Paciente esperando al fondo (borroso). Elementos de clinica visibles.

**Detalle clave:** Lleva SCRUBS (no ropa oficina) → comunica rol mixto medico+admin. Solo un doctor-empresario reconoce este escenario.

**Por que filtra:** Un no-medico ve a una asistente de clinica y sigue scrolleando. Un doctor-empresario piensa "eso pasa todos los dias en mi clinica."

**Formatos:** 1:1 (1080x1080), 9:16 (1143x2048), 1.91:1 (1200x628)

### Prompt AI para generar — Imagen A

```
Photorealistic image of a young Latin American woman (25-35 years old) working as a medical clinic receptionist. She is wearing medical SCRUBS (light blue or teal), hair pulled back in a ponytail. She is standing behind a clinic reception desk, holding a smartphone showing multiple WhatsApp notification bubbles stacked on screen (green chat bubbles with unread badges).

Her expression is stressed and overwhelmed — slightly furrowed brows, looking at the phone with concern while a patient (blurred, out of focus) waits in the background sitting in a waiting room chair.

The setting is a modern but modest Latin American medical clinic reception area — white walls, a small desk with a computer monitor, appointment book, and medical files. Warm fluorescent lighting. The scene feels busy and chaotic.

Camera angle: medium shot from slightly above, focused on the receptionist. Shallow depth of field — the waiting patient in the background is blurred.

Style: Clean, professional, editorial photography look. Natural lighting. No text overlays. No logos. Colors: predominantly white/teal (scrubs) with green (WhatsApp notifications) as accent.

IMPORTANT: The woman wears medical SCRUBS, not office clothes. This is a medical assistant who also handles reception, not just an office worker.
```

**Generar en 3 formatos:** 1:1 (1080x1080), 9:16 (1143x2048), 1.91:1 (1200x628)

---

## Imagen B: "El Doctor Entre Pacientes" (perfil independiente)

**Visual:** Doctor (~35-50, bata blanca, estetoscopio) sentado en su consultorio, solo, revisando el celular con expresion de cansancio/preocupacion. Pantalla muestra notificaciones WhatsApp. Ambiente: consultorio con diploma en la pared, escritorio con expedientes, camilla al fondo.

**Detalle clave:** El consultorio y la bata blanca son el filtro visual. Solo un medico reconoce ese ambiente como "mi dia a dia." Un no-medico ve un consultorio generico y no siente conexion.

**Por que filtra:** AD-005 (doctor de noche) tenia 86% calificados porque era especificamente medico. Esta imagen tiene el mismo principio pero angulo fresco (entre pacientes, no de noche).

**Formatos:** 1:1 (1080x1080), 9:16 (1143x2048), 1.91:1 (1200x628)

### Prompt AI para generar — Imagen B

```
Photorealistic image of a Latin American male doctor (35-50 years old) sitting alone in his private medical office. He wears a white lab coat with a stethoscope around his neck. He is looking at his smartphone with a tired, worried expression — bags under his eyes, slight frown.

The smartphone screen shows multiple WhatsApp notification bubbles (green chat bubbles stacked with unread message badges). He holds the phone in one hand, the other hand resting on his forehead in a gesture of exhaustion.

The setting is a modest private medical office in Latin America — a wooden desk with medical files and papers, a framed diploma/certificate on the wall behind him, a medical examination bed/table visible in the background. Warm artificial lighting from a desk lamp. The room feels quiet — he is alone between patients.

Camera angle: medium close-up, slightly off-center, focused on the doctor's face and phone. Shallow depth of field — the office background is slightly soft.

Style: Clean, editorial photography. Natural, warm tones. No text overlays. No logos. Mood: solitary, tired, overwhelmed by digital demands. Colors: white (lab coat), warm wood tones (desk/office), green accent (WhatsApp notifications).

IMPORTANT: This is a PRIVATE PRACTICE doctor, not a hospital. The office should look like an independent consultation room, not a hospital ward.
```

**Generar en 3 formatos:** 1:1 (1080x1080), 9:16 (1143x2048), 1.91:1 (1200x628)

---

## Copy AD-007 — 3 textos + 2 titulos por ad (Advantage+ rota)

> **Decision:** 3 textos principales + 2 titulos por ad (no 5×5 como AD-005). Razon: $10/dia ÷ 2 ads = $5/ad/dia. Con 5×5 no hay suficiente data para optimizar. 6 combinaciones por ad, 12 total.

### Ad 1: Imagen A — "La Asistente Saturada" (perfil empresario)

**Texto 1 — Enumerar tareas (dolor explicito):**
> Doctor, su asistente contesta WhatsApp, recibe pacientes, cobra, agenda y encima le ayuda en procedimientos. Todo al mismo tiempo.
>
> Con OrionCare, los pacientes se agendan solos por WhatsApp. Su asistente deja de correr y usted deja de perder citas.

**Texto 2 — El momento de dolor (asistente en procedimiento):**
> Mientras su asistente le ayuda en un procedimiento, los pacientes siguen escribiendo por WhatsApp. Nadie contesta. Algunos se cansan de esperar y buscan otro doctor.
>
> Con OrionCare, un asistente virtual atiende por WhatsApp las 24 horas. Su equipo se enfoca en lo que importa.

**Texto 3 — La consecuencia (pacientes perdidos):**
> ¿Cuantos pacientes dejaron de escribir porque nadie les contesto a tiempo?
>
> Su asistente no puede contestar WhatsApp, atender la recepcion y ayudarle en procedimientos al mismo tiempo. Con OrionCare, los pacientes se agendan solos. Sin esperas. Sin citas perdidas.

**Titulo 1:** Su asistente ya no puede con todo
**Titulo 2:** Los pacientes escriben, nadie contesta

**Descripcion:** OrionCare — Agenda automatica por WhatsApp para clinicas
**CTA:** Mas informacion

### Ad 2: Imagen B — "El Doctor Entre Pacientes" (perfil independiente)

**Texto 1 — Pregunta directa:**
> Cuando esta con un paciente, ¿quien contesta los que escriben por WhatsApp?
>
> Con OrionCare, un asistente virtual atiende a sus pacientes al instante. Agenda citas, responde preguntas y envia recordatorios. Las 24 horas. Sin que usted tenga que contestar uno por uno.

**Texto 2 — El momento entre pacientes:**
> Entre paciente y paciente, usted agarra el celular y ve 12 mensajes de WhatsApp. Todos quieren cita. Y solo tiene 5 minutos antes del siguiente.
>
> Con OrionCare, esos 12 pacientes ya se agendaron solos. Sin que usted contestara ni uno.

**Texto 3 — La noche (conecta con exito de AD-005):**
> Son las 9 de la noche y todavia le estan escribiendo por WhatsApp para agendar cita.
>
> Con OrionCare, sus pacientes se agendan solos. A cualquier hora. Sin que usted levante un dedo.

**Titulo 1:** Atienda pacientes sin soltar el telefono
**Titulo 2:** Sus pacientes se agendan solos por WhatsApp

**Descripcion:** OrionCare — Agenda automatica por WhatsApp para medicos
**CTA:** Mas informacion

---

## Formulario AD-007

> Sin cambios mayores vs AD-006. **Especialidad se mantiene en texto libre** (escribir requiere intencion = filtro involuntario). NO agregar mas preguntas.

| # | Pregunta | Tipo en Meta | Opciones |
|---|----------|-------------|----------|
| 1 | ¿Ejerce como médico o dentista? | Multiple choice | Sí / No |
| 2 | ¿Cuánto tiempo pierde agendando citas al día? | Multiple choice | Poco / Mucho / Demasiado |
| 3 | ¿Cuál es su especialidad? | Short answer | (texto libre) |

> **Nota:** El dropdown de especialidad (probado en AD-006) no resolvio el problema de leads basura (90% basura el 19 Mar). Se revierte a texto libre porque escribir requiere mas intencion que seleccionar de una lista.

---

## Configuracion de campana Meta — AD-007

| Parametro | Valor |
|-----------|-------|
| Objetivo | Leads (formulario) |
| Estructura | 1 campana, 1 ad set, **2 ads** (uno por imagen) |
| Ad 1 | Imagen A + 3 textos equipo + 2 titulos |
| Ad 2 | Imagen B + 3 textos independiente + 2 titulos |
| Combinaciones | 6 por ad, 12 total. Meta optimiza via Advantage+. |
| Presupuesto | $20/dia total ($10/dia por ad) |
| Audiencia | Honduras, medicos/dentistas (sin cambios) |
| Placements | Feed + Stories (automatico) |
| Formatos por imagen | 3: 1:1 (1080x1080), 9:16 (1143x2048), 1.91:1 (1200x628) |
| Formulario | Especialidad en texto libre |
| CTA | Mas informacion |

**AD-006: Pausar al lanzar AD-007.** Solo pausar, no eliminar (Meta conserva aprendizajes).

### Performance esperado

| Metrica | AD-006 (actual) | AD-007 (hipotesis) |
|---------|-----------------|---------------------|
| CTR | 1.57% | 0.8-1.3% (menor pero mejor calidad) |
| % calificados | 10-31% | 70-85% |
| CPL calificado | $2.69-12.80 | $2.50-4.50 |

> **Metrica clave: CPL calificado, NO CTR.** Un CTR menor con mejor calidad es victoria.

---

## Checklist de lanzamiento — AD-007

- [x] Generar Imagen A (Asistente Saturada) en 3 formatos (Gemini)
- [x] Generar Imagen B (Doctor Entre Pacientes) en 3 formatos (Gemini)
- [x] Revisar imagenes: escenario clinico claro, sin procedimientos medicos (restriccion Meta)
- [x] Revertir campo especialidad a texto libre en formulario Meta
- [x] Crear campana AD-007 en Meta Ads Manager (1 campana, 1 ad set, 2 ads)
- [x] Ad 1: Imagen A + 3 textos equipo + 2 titulos (Advantage+)
- [x] Ad 2: Imagen B + 3 textos independiente + 2 titulos (Advantage+)
- [x] Configurar presupuesto $20/dia total ($10/dia por ad)
- [x] Pausar AD-006 (no eliminar)
- [x] Guardar metricas finales AD-005/AD-006 en estado-ads.md
- [x] Publicar AD-007 y esperar aprobacion de Meta
- [x] Verificar aprobacion Meta — aprobada y en circulacion
- [ ] Monitorear dia 3-5 (~$20-30 gastados): % calificados es la metrica clave
- [ ] Dia 7: cual imagen tiene mejor % calificados → pausar la peor

---
---

# Video Ad — Comedia/Chisme Veo 3.1 (AD-003)

> 2 clips x 8 seg = 16 seg total. Formato comedia/chisme hondureno. Para Meta feed (9:16 + 4:5).

---

## Concepto creativo

**Arco narrativo:** Tension (engano?) → Reveal inocente (agendando pacientes) → Decepcion comica → CTA
**Tono:** Comedia hondurena, chisme de barrio, doble sentido
**Referencia cultural:** Estilo "chorizo" — sugiere algo picante, reveal inocente

---

## Personajes

| Personaje | Descripcion | Rol |
|-----------|-------------|-----|
| Doctor "Jose Luis" | Latino ~35, cabello oscuro, ropa casual de casa | No habla. Solo se ve/escucha la reaccion desde afuera. |
| Esposa | Solo voz off-screen | Grita "QUE ES ESTO JOSE LUIS!!" — no se ve |
| Vecina (protagonista) | Latina ~25-35, cabello oscuro, ropa casual moderna, estilo tiktoker | Unica que habla a camara. Narra el chisme + hace CTA |

---

## Clip 1 — El Escandalo (8 seg)

### Timeline

| Seg | Que pasa |
|-----|----------|
| 0-2s | Exterior de una casa centroamericana de noche. Tranquilo, grillos. Se ve luz encendida por la ventana. |
| 2-4s | De repente, grito furioso de mujer desde adentro: "QUE ES ESTO JOSE LUIS!!" Se ve movimiento/sombras adentro. |
| 4-6s | La vecina (joven, casual) que estaba afuera — caminando o en su porche — se frena en seco. Ojos grandes, boca abierta. Se acerca curiosa hacia la casa. |
| 6-8s | Mira directo a camara con cara de "oyeron eso?" — expresion picara, intrigada. Sin hablar. |

### Prompt Veo — Clip 1 (copiar/pegar directo)

```
Cinematic 9:16 vertical video, 8 seconds. Shallow depth of field, nighttime exterior of a modest Central American home. Warm light glows through a window. Quiet ambient sounds — crickets, distant dogs. Handheld camera feel, like someone filming secretly.

The scene is peaceful for the first two seconds. Then suddenly, a woman's furious voice screams from inside the house:

"QUE ES ESTO JOSE LUIS!!"

The scream is loud, sharp, angry — like a wife who just discovered something on her husband's phone. Through the window, shadows move frantically — a man jumping up from a couch, startled.

A young Latin American woman in her mid 20s to early 30s, dark hair, wearing casual modern clothes — a neighbor who was walking by or standing on her porch nearby — freezes. Her eyes go wide, mouth drops open. She leans toward the house, curious, trying to hear more.

She then turns to look directly at the camera with a knowing, mischievous expression — eyebrows raised, slight smirk, as if saying "did you hear that?" to the viewer. She does NOT speak. She holds this look at the camera for the final two seconds.

Audio: crickets and quiet night ambience, then the loud angry female scream from inside the house, muffled commotion sounds, then silence as the neighbor looks at camera. No music. No text overlays. Only one voice is heard in this clip — the off-screen scream.
```

---

## Clip 2 — El Reveal + CTA (8 seg)

### Timeline

| Seg | Que pasa |
|-----|----------|
| 0-3s | Vecina a camara, tono de chisme/TikTok: "No, no es lo que piensan... el hombre estaba contestandole a los pacientes por WhatsApp. A las diez de la noche." |
| 3-5s | Cara de decepcion comica / "que pena ajena". Niega con la cabeza. |
| 5-6s | Cambia expresion: "Con OrionCare, los pacientes se agendan solos." |
| 6-8s | Sonrisa calida/picara directo a camara: "Quiere saber como? Aqui abajo." Senala hacia abajo (al boton del ad). |

### Prompt Veo — Clip 2 (copiar/pegar directo)

```
Cinematic 9:16 vertical video, 8 seconds. Shallow depth of field, nighttime exterior — same neighborhood setting. Close-up framing on a young Latin American woman in her mid 20s to early 30s, dark hair, casual modern clothes. She faces the camera directly, TikTok-style, like she is telling gossip to the viewer.

She speaks to the camera with a conspiratorial, gossipy tone — like she is sharing the juiciest neighborhood drama. She starts with a reassuring hand gesture:

(Latin American Spanish, casual tone, slight amusement)
"No, no es lo que piensan... el hombre estaba contestándole a los pacientes por WhatsApp. A las diez de la noche."

Her expression shifts to comic disappointment — she shakes her head slowly, like "what a letdown." Then her face brightens with a knowing look:

"Con OrionCare, los pacientes se agendan solos."

She leans slightly toward the camera with a warm, confident smile and points downward (toward where the ad button would be):

"¿Quiere saber cómo? Aquí abajo."

She holds her smile at the camera for the final second.

Audio: only her voice — casual, gossipy, then warm and inviting for the final line. Quiet night ambience in background. No music. No text overlays.
```

---

## Post-produccion (CapCut/VN)

1. Unir Clip 1 + Clip 2 con corte directo
2. Subtitulos grandes estilo TikTok/reel (legibles en celular)
3. Ultimo segundo: texto CTA overlay "Responda 4 preguntas →" o flecha al boton
4. Opcional: logo OrionCare durante ultimos 3 seg
5. Exportar: 9:16 (Stories/Reels) + 4:5 (Feed)

---

## Ventajas tecnicas de esta version

| Aspecto | Solucion |
|---------|----------|
| Lip-sync | Clip 1: zero lip-sync (grito off-screen + reaccion facial). Clip 2: 1 sola actriz a camara. |
| Consistencia | La vecina es el unico personaje que importa entre clips. Doctor/esposa son secundarios. |
| Acento | Si Veo no suena hondureno, solo hay que re-grabar la voz de 1 persona (la vecina). |

## Riesgos y mitigacion

| Riesgo | Mitigacion |
|--------|------------|
| El grito off-screen no suena convincente | Grabarlo aparte y pegarlo en edicion |
| La vecina no se ve igual entre clips | Descripcion identica. Regenerar Clip 2 hasta que matchee. |
| El reveal no se entiende sin contexto | Los subtitulos hacen el trabajo. "No es lo que piensan" conecta con la escena anterior. |

---

## Checklist de produccion

- [ ] Generar Clip 1 en Veo 3.1 (prompt de arriba)
- [ ] Evaluar: escena nocturna convincente? Grito se escucha? Vecina reacciona bien?
- [ ] Si el grito no funciona: grabarlo aparte y reemplazar en edicion
- [ ] Generar Clip 2 en Veo 3.1 (prompt de arriba)
- [ ] Evaluar: la vecina se parece a la del Clip 1? Lip-sync aceptable?
- [ ] Si no matchea: regenerar Clip 2 hasta que la actriz sea consistente
- [ ] Unir clips en CapCut/VN con corte directo
- [ ] Agregar subtitulos grandes estilo TikTok
- [ ] Agregar CTA overlay en ultimo segundo ("Responda 4 preguntas →")
- [ ] Opcional: logo OrionCare en ultimos 3 seg
- [ ] Exportar 9:16 (Stories/Reels)
- [ ] Exportar 4:5 (Feed)
- [ ] Subir a Meta Ads Manager
