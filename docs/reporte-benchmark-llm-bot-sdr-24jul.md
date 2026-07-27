# Benchmark LLM — Bot SDR (24 Jul 2026)

Dataset: 25 casos reales anonimizados de la linea piloto (org Dra. Hanoy, 22-24 Jul). Prompt v0 con catalogo y FAQ reales. temperature=0.

## Resumen

| Modelo | JSON fallidos | Intent | Etapa | Handoff | Servicio | p50 | p95 | $/mes proy. |
|---|---|---|---|---|---|---|---|---|
| claude-haiku-4-5 | 0/25 | 88% (22/25) | 79.2% (19/24) | 88% (22/25) | 87.5% (7/8) | 2142ms | 3109ms | $8.91 |
| gpt-4o-mini | 9/25 | 93.8% (15/16) | 73.3% (11/15) | 81.3% (13/16) | 75% (3/4) | 2160ms | 3552ms | $0.88 |
| gemini-3.5-flash-lite | 0/25 | 96% (24/25) | 95.8% (23/24) | 96% (24/25) | 100% (8/8) | 758ms | 921ms | $2.61 |

Notas: GPT-4o-mini fallo el formato JSON 9/25 veces (puso etapas en el campo intent, corto JSON a medias, o respondio texto plano ignorando el formato) — sus % de acierto son solo sobre los 16 casos que sobrevivieron. Proyeccion mensual a 3,600 msgs (40 conv/dia x 3 msgs x 30 dias), sin prompt caching.

## Respuestas por caso (para spot-check de tono y guardrails)

### cta-ad

**claude-haiku-4-5** [intent✗ etapa✗] (info_servicio/nuevo):
> ¡Hola! Bienvenido a la clínica Dra Hanoy Medina. Con gusto le ayudo. ¿En qué tratamiento está interesado? Tenemos evaluaciones, limpiezas, blanqueamiento, ortodoncia, prótesis y más.

**gpt-4o-mini** [JSON INVALIDO]:
> {   "intent": "calificando",   "service_id": null,   "lead_stage": "calificando",   "needs_handoff": false,   "handoff_reason": null,   "reply": "¡Hola! Claro, con gusto. ¿En qué tratamiento está inte

**gemini-3.5-flash-lite** [ok] (saludo/calificando):
> ¡Hola! Qué gusto saludarle. Con mucho gusto le brindamos información, ¿en cuál de nuestros tratamientos está interesado/a?

### saludo-solo

**claude-haiku-4-5** [ok] (saludo/nuevo):
> ¡Buenas noches! Bienvenido a la clínica Dra Hanoy Medina. ¿En qué tratamiento dental estás interesado? Estamos para ayudarte.

**gpt-4o-mini** [ok] (saludo/nuevo):
> ¡Buenas noches! ¿En qué tratamiento está interesado/a?

**gemini-3.5-flash-lite** [ok] (saludo/nuevo):
> ¡Buenas noches! Qué gusto saludarle. ¿En qué tratamiento dental está interesado/a para poder ayudarle?

### interes-vago

**claude-haiku-4-5** [intent✗ etapa✗] (info_servicio/nuevo):
> ¡Hola! Qué gusto. Decime, ¿en qué tratamiento estás interesada? ¿Es para limpieza, blanqueamiento, ortodoncia, o tenés alguna otra necesidad dental?

**gpt-4o-mini** [JSON INVALIDO]:
> {   "intent": "calificando",   "service_id": null,   "lead_stage": "calificando",   "needs_handoff": false,   "handoff_reason": null,   "reply": "¡Hola! Qué gusto que esté interesada. ¿En qué tratamie

**gemini-3.5-flash-lite** [ok] (saludo/calificando):
> ¡Hola! Qué gusto saludarle. Para ayudarle mejor, ¿en qué tratamiento o servicio dental está interesada?

### precio-evaluacion-typo

**claude-haiku-4-5** [ok] (precio/cotizado):
> La evaluación cuesta L460. Ahí la doctora revisa sus piezas, le explica qué opciones tiene y le da el presupuesto exacto para las prótesis. ¿Le gustaría que le agende su cita?

**gpt-4o-mini** [JSON INVALIDO]:
> La evaluación tiene un costo de L460. ¿Le gustaría que le agende su cita?

**gemini-3.5-flash-lite** [ok] (precio/cotizado):
> La evaluación tiene un costo de L460. ¿Le gustaría que le agende su cita?

### precio-consulta-typo

**claude-haiku-4-5** [ok] (precio/cotizado):
> ¡Buenas! La evaluación con la Dra. Hanoy cuesta L460. En esa cita ella revisa su caso, le explica qué necesita y le da un presupuesto exacto para el tratamiento que requiera. ¿Le gustaría que le agende su cita?

**gpt-4o-mini** [ok] (precio/cotizado):
> La evaluación tiene un costo de L460. ¿Le gustaría que le agende su cita?

**gemini-3.5-flash-lite** [ok] (precio/cotizado):
> ¡Hola! Con mucho gusto le ayudo. La cita de evaluación tiene un valor de L460. ¿Le gustaría que le agende su cita?

### precio-protesis-total

**claude-haiku-4-5** [ok] (precio/cotizado):
> Buenas, gracias por consultarnos. La prótesis total superior depende de varios factores que la doctora evalúa en persona: el material exacto, la calidad y el ajuste personalizado para usted. Por eso el presupuesto se determina en la cita de evaluación.  ¿Le gustaría que le agende su cita con la Dra. Hanoy para que le haga la evaluación y le dé el presupuesto exacto?

**gpt-4o-mini** [ok] (precio/cotizado):
> El precio de una prótesis total se determina en la cita de evaluación, ya que cada caso es diferente. ¿Le gustaría que le agende su cita?

**gemini-3.5-flash-lite** [ok] (precio/cotizado):
> Fíjese que el precio exacto de la prótesis total se determina en la cita de evaluación, ya que la doctora necesita ver su caso para darle el plan y presupuesto ideal. ¿Le gustaría que le agende su cita?

### precio-limpieza

**claude-haiku-4-5** [ok] (precio/cotizado):
> Buenas, la limpieza dental se determina en la cita de evaluación porque cada caso es distinto. La doctora la revisa y le da el presupuesto exacto. ¿Le gustaría que le agende su evaluación? Cuesta L460.

**gpt-4o-mini** [servicio✗] (precio/cotizado):
> El precio de la limpieza dental se determina en la cita de evaluación, ya que cada caso es diferente. ¿Le gustaría que le agende su cita?

**gemini-3.5-flash-lite** [ok] (precio/cotizado):
> Fíjese que el costo de la limpieza se determina en la cita de evaluación, ya que la doctora necesita ver su caso para darle el presupuesto exacto. ¿Le gustaría que le agende su cita?

### precio-piezas-caps

**claude-haiku-4-5** [ok] (precio/cotizado):
> Entiendo, pero incluso con esa cantidad de piezas, el precio se determina en la evaluación. La Dra. Hanoy necesita verlo para darle el presupuesto exacto — cada caso es distinto.  ¿Le gustaría que le agende su cita de evaluación para que la doctora le dé el precio preciso?

**gpt-4o-mini** [JSON INVALIDO]:
> El precio exacto de las prótesis fijas se determina en la cita de evaluación, ya que cada caso es diferente. ¿Le gustaría que le agende su cita?

**gemini-3.5-flash-lite** [ok] (precio/cotizado):
> Fíjese que cada caso es distinto y la doctora lo evalúa en persona para darle el presupuesto exacto. ¿Le gustaría que le agende su cita de evaluación?

### precio-caso-mixto

**claude-haiku-4-5** [ok] (precio/cotizado):
> Entiendo, son varias piezas las que necesita reemplazar. El costo de una prótesis depende de cada caso — la doctora necesita evaluarlo en persona para darle un presupuesto exacto, porque varía según la cantidad de dientes, el tipo de prótesis que mejor le convenga y la condición de sus encías.  ¿Le gustaría que le agende una cita de evaluación? Ahí la Dra. Hanoy le revisa todo y le da el plan con el precio exacto.

**gpt-4o-mini** [etapa✗] (precio/calificando):
> El precio de la prótesis removible se determina en la cita de evaluación, ya que cada caso es distinto. ¿Le gustaría que le agende su cita para que la doctora lo evalúe?

**gemini-3.5-flash-lite** [ok] (precio/cotizado):
> Fíjese que el costo exacto de la prótesis se determina en la cita de evaluación, ya que la doctora debe revisar bien su caso para darle el presupuesto ideal. ¿Le gustaría que le agende su cita?

### precio-blanqueamiento

**claude-haiku-4-5** [ok] (precio/cotizado):
> ¡Buenas! El blanqueamiento dental tiene un costo de L3800. ¿Le gustaría que le agende su cita para que la Dra. Medina le haga la evaluación y le comience el tratamiento?

**gpt-4o-mini** [ok] (precio/cotizado):
> El precio del blanqueamiento es L3800. ¿Le gustaría que le agende su cita?

**gemini-3.5-flash-lite** [ok] (precio/cotizado):
> ¡Hola! El blanqueamiento dental tiene un precio de L3,800. ¿Le gustaría que le agende su cita?

### clinico-colmillos

**claude-haiku-4-5** [ok] (info_servicio/calificando):
> Perfecto, eso es buena noticia. De todas formas, la Dra. Hanoy necesita evaluarlo en persona para darle el plan exacto y el presupuesto de su prótesis fija, ya que cada caso es distinto.  ¿Le gustaría que le agende su cita de evaluación?

**gpt-4o-mini** [JSON INVALIDO]:
> Eso se determina en la evaluación, donde la doctora podrá valorar su caso específico. ¿Le gustaría que le agende su cita?

**gemini-3.5-flash-lite** [ok] (info_servicio/calificando):
> Fíjese que eso se lo revisa bien la doctora en su evaluación para darle el plan exacto. ¿Le gustaría que le agendemos su cita?

### clinico-cuellitos

**claude-haiku-4-5** [servicio✗] (info_servicio/calificando):
> Buena pregunta. Los cuellitos (raíces expuestas) son un tema que la doctora evalúa en persona, porque depende de cada caso. Lo que sí le puedo decir es que el blanqueamiento es un tratamiento que ofrecemos, pero primero hay que revisar bien su situación.  ¿Le gustaría agendar una evaluación para que la Dra. Medina vea exactamente qué se puede hacer en su caso?

**gpt-4o-mini** [JSON INVALIDO]:
> Fíjese que el blanqueamiento se determina en la evaluación, donde la doctora podrá ver su caso específico. ¿Le gustaría que le agende su cita para la evaluación?

**gemini-3.5-flash-lite** [ok] (info_servicio/calificando):
> Fíjese que cada caso es distinto y la doctora necesita evaluarlo en persona para ver si el blanqueamiento le funciona bien. ¿Le gustaría que le agende su cita de evaluación?

### clinico-piezas-fracturadas

**claude-haiku-4-5** [ok] (info_servicio/calificando):
> Claro que sí, podemos ayudarle. Con esas dos piezas fracturadas hay varias opciones que la Dra. Medina puede ofrecerle, pero necesita evaluarlo en persona para darle el mejor plan según cómo estén los dientes.  ¿Le gustaría que le agende una cita de evaluación? Ahí la doctora le explica qué se puede hacer y cuánto sería.

**gpt-4o-mini** [handoff✗] (info_servicio/calificando/HANDOFF):
> Fíjese que eso se determina en la evaluación. La doctora le podrá ayudar personalmente con su caso. ¿Le gustaría que le agende su cita?

**gemini-3.5-flash-lite** [ok] (info_servicio/calificando):
> Fíjese que cada caso es distinto y la doctora tiene que evaluarlo bien para darle el tratamiento adecuado y su presupuesto exacto. ¿Le gustaría que le agende su cita de evaluación?

### handoff-oncologico

**claude-haiku-4-5** [intent✗] (humano/handoff/HANDOFF):
> Entiendo, gracias por compartir eso. Por su situación, la Dra. Hanoy le responderá personalmente para darle la mejor atención. Un momento, por favor.

**gpt-4o-mini** [JSON INVALIDO]:
> Entiendo, en ese caso, la doctora le responderá personalmente. ¿Le gustaría que le pase su información?

**gemini-3.5-flash-lite** [ok] (info_servicio/handoff/HANDOFF):
> Fíjese que por su condición oncológica, la doctora preferirá responderle personalmente para darle la mejor atención. ¿Me permite comunicarla con ella?

### handoff-protocolo-tecnico

**claude-haiku-4-5** [etapa✗] (info_servicio/calificando/HANDOFF):
> Buenas, excelente pregunta. Ese es un tema técnico que la Dra. Hanoy Medina le explica mejor en persona, ya que depende de cada caso. ¿Le gustaría agendar una evaluación para que ella le detalle el protocolo y le haga un plan personalizado?

**gpt-4o-mini** [intent✗ etapa✗] (otro/nuevo/HANDOFF):
> Fíjese que esa consulta es más técnica y la doctora le podrá responder personalmente. ¿Le gustaría que le pase su contacto?

**gemini-3.5-flash-lite** [etapa✗] (info_servicio/calificando/HANDOFF):
> Fíjese que para ese procedimiento especializado la doctora prefiere evaluarlo personalmente. ¿Le gustaría que le agende su cita con la Dra. Hanoy Medina para que ella le explique todo en detalle?

### handoff-ninos

**claude-haiku-4-5** [etapa✗ handoff✗] (info_servicio/calificando):
> Sí, claro que sí atendemos niños. ¿Qué tratamiento necesita el pequeño? ¿Es limpieza, revisión o tiene algún problemita específico?

**gpt-4o-mini** [etapa✗ handoff✗] (info_servicio/calificando):
> ¡Hola! Sí, atendemos a niños de 7 años. ¿En qué tratamiento está interesado/a para su hijo/a?

**gemini-3.5-flash-lite** [intent✗] (humano/handoff/HANDOFF):
> Fíjese que para atender a menores de edad prefiero pasarle su consulta directamente a la doctora Hanoy para que le confirme. En un momentito le responde.

### handoff-pide-humano

**claude-haiku-4-5** [etapa✗] (humano/nuevo/HANDOFF):
> Claro, sin problema. Le paso su mensaje a la Dra. Hanoy Medina para que le responda personalmente. ¿En qué tratamiento está interesado/a para que ella tenga contexto?

**gpt-4o-mini** [etapa✗] (humano/nuevo/HANDOFF):
> Con gusto, le pasaré su solicitud para que la doctora le responda personalmente.

**gemini-3.5-flash-lite** [ok] (humano/handoff/HANDOFF):
> ¡Claro que sí! Con mucho gusto le paso la conversación a la doctora para que la atienda personalmente en un momento.

### faq-ubicacion

**claude-haiku-4-5** [ok] (logistica/nuevo):
> ¡Hola! Estamos ubicados en el Bulevar Morazán, Torre Morazán, torre 1, piso 12. Es la torre que está justo enfrente de Mall El Dorado.  ¿En qué tratamiento estás interesado/a? Así te ayudo mejor.

**gpt-4o-mini** [ok] (logistica/nuevo):
> Estamos ubicados en el Bulevar Morazán, Torre Morazán, torre 1, piso 12. Es la torre que está justo enfrente de Mall El Dorado.

**gemini-3.5-flash-lite** [ok] (logistica/nuevo):
> Buenas tardes, fíjese que estamos ubicados en el Bulevar Morazán, Torre Morazán, torre 1, piso 12 (frente a Mall El Dorado). ¿Le gustaría que le agendemos su cita?

### faq-ubicacion-virtual

**claude-haiku-4-5** [ok] (logistica/nuevo):
> ¡Claro! Estamos ubicados en el Bulevar Morazán, Torre Morazán, torre 1, piso 12. Es la torre que está justo enfrente de Mall El Dorado.  ¿En qué tratamiento estás interesado/a? Así le agendo su cita con la Dra. Hanoy.

**gpt-4o-mini** [ok] (logistica/nuevo):
> Estamos ubicados en el Bulevar Morazán, Torre Morazán, torre 1, piso 12. Es la torre que está justo enfrente de Mall El Dorado. ¿En qué tratamiento está interesado/a?

**gemini-3.5-flash-lite** [ok] (logistica/calificando):
> Con gusto, fíjese que estamos ubicados en el Bulevar Morazán, Torre Morazán, torre 1, piso 12 (la torre que está justo enfrente de Mall El Dorado).  ¿Le gustaría que le agende su cita para visitarnos?

### faq-horarios-sin-config

**claude-haiku-4-5** [handoff✗] (logistica/nuevo):
> ¡Hola! Gracias por escribir. Lamentablemente no tengo los horarios exactos a mano en este momento. ¿En qué tratamiento está interesado/a? Mientras tanto, le paso esa información con la doctora para que le confirme los horarios disponibles.

**gpt-4o-mini** [handoff✗] (logistica/nuevo):
> Lamentablemente, no tengo información sobre los horarios de atención. ¿En qué tratamiento está interesado/a? Así puedo ayudarle mejor.

**gemini-3.5-flash-lite** [ok] (logistica/calificando/HANDOFF):
> Fíjese que para darle el detalle exacto de nuestros horarios, la doctora le responderá personalmente en un momento. ¿En qué tratamiento le gustaría que le ayudemos?

### faq-cita-o-llegada

**claude-haiku-4-5** [ok] (logistica/nuevo):
> Buenas, acá en la clínica de Dra Hanoy Medina trabajamos por cita agendada. Así nos aseguramos de que usted sea atendido sin esperas.  ¿En qué tratamiento está interesado? Le agendo su cita sin problema.

**gpt-4o-mini** [ok] (logistica/nuevo):
> Para asegurar su atención, es mejor agendar una cita. ¿Le gustaría que le agende su cita?

**gemini-3.5-flash-lite** [ok] (logistica/calificando):
> Fíjese que atendemos con cita previa para dedicarle el tiempo que se merece. ¿Le gustaría que le agende su cita?

### softno-analizar

**claude-haiku-4-5** [ok] (futuro/seguimiento):
> Perfecto, sin problema. Cuando esté listo, nos avisa y le agendamos la cita con gusto. ¡Queda atento!

**gpt-4o-mini** [JSON INVALIDO]:
> Claro, tómese su tiempo. Si decide agendar la cita o tiene más preguntas, aquí estaré. ¡Que tenga un buen día!

**gemini-3.5-flash-lite** [ok] (futuro/seguimiento):
> Perfecto, me avisa cuando esté listo. Aquí vamos a estar para ayudarle a agendar su cita con la doctora.

### futuro-regreso-ciudad

**claude-haiku-4-5** [ok] (futuro/seguimiento):
> Perfecto, nos encantaría atenderle cuando regrese a Tegucigalpa. Cuando esté de vuelta, no dude en escribirnos y le agendamos su cita sin problema. ¡Que le vaya bien!

**gpt-4o-mini** [ok] (futuro/seguimiento):
> ¡Claro! Aquí estaré cuando regrese a Tegucigalpa. No dude en contactarme para agendar su cita. ¡Que tenga un buen día!

**gemini-3.5-flash-lite** [ok] (futuro/seguimiento):
> Con mucho gusto, por aquí le esperamos cuando regrese a la ciudad. Que tenga un feliz viaje.

### rechazo-explicito

**claude-haiku-4-5** [ok] (rechazo/perdido):
> Está bien, cualquier cosa nos avisa. ¡Que esté bien!

**gpt-4o-mini** [JSON INVALIDO]:
> Entiendo, si cambia de opinión, aquí estaré. ¡Que tenga un buen día!

**gemini-3.5-flash-lite** [ok] (rechazo/perdido):
> Entendido. Que tenga un excelente día, estamos a la orden por cualquier cosa que necesite más adelante.

### gestion-cambio-hora

**claude-haiku-4-5** [handoff✗] (gestion_cita/agendado/HANDOFF):
> Claro, sin problema. Déjeme pasar su solicitud con la doctora para ajustar la hora a las 10:00 AM. Le confirmo en un momento si queda disponible.

**gpt-4o-mini** [ok] (gestion_cita/agendado):
> Voy a verificar la disponibilidad para las 10:00 AM. Un momento, por favor.

**gemini-3.5-flash-lite** [handoff✗] (gestion_cita/calificando/HANDOFF):
> Fíjese que con gusto le ayudamos a ver lo del cambio de horario. Le comunico con la doctora o el personal encargado para confirmarle el ajuste, ¿le parece?

