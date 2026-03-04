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
