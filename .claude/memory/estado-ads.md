# Estado Ads — OrionCare

> Ultima actualizacion: 4 Mar 2026 (demo bot + funnel actualizado)

## Dashboard

| Metrica | Valor actual | Meta |
|---------|-------------|------|
| Campanas activas | 0 (congelada para construir bot) | 1-2 |
| Gasto ultima campana | $203.81 | $100/mes |
| Leads totales historicos | 125 | 20/mes |
| CPL (ultima campana) | $4.16 | < $5 |
| CPA (historico) | ~$68 (3 clientes de 125 leads) | < $20 |
| CTR (enlace) | 0.54% | > 1.5% |
| CPM | $1.36 | — |
| CPC (enlace) | $0.25 | — |

## Estado actual

Campana congelada desde hace semanas. Se congelo porque los leads hicieron market pull hacia el bot de autoagenda (el producto solo tenia agenda + recordatorios). Ahora el bot ya esta listo y en campo — el producto es mucho mas fuerte que antes.

## Analisis de campana anterior (completado)

### Metricas
- Gasto: $203.81 | Impresiones: 149,360 | CPM: $1.36
- Clics enlace: 811 | CPC: $0.25 | CTR: 0.54%
- Clics todos: 1,127 | CTR todos: 0.75% | CPC todos: $0.18
- Resultados: 49 | Costo por resultado: $4.16

### Funnel historico (125 leads totales)
- Funnel: Ad → encuesta (7 preguntas) → contacto via WhatsApp
- Filtro: solo leads que dijeron "mucho" o "demasiado" tiempo agendando
- Calificados: 56 (38 independientes + 18 con secretaria)

### Medicos independientes (38 calificados)
- 20 no interesados (52.6%)
- 9 mostraron interes (23.7%)
- 3 convertidos (7.9%) — los 3 clientes actuales
- 3 en espera de respuesta (7.9%)
- 2 no contestaron (5.3%)
- 1 medico futuro (2.6%)

### Medicos con secretaria (18 calificados)
- 3 mostraron interes, 1 seguimiento pendiente, 2 no contestaron
- 0 convertidos — la secretaria "resuelve" el problema, dolor menor

### Aprendizajes clave
1. **CPL bueno ($4.16)** pero **CTR malo (0.54%)** — el creativo no genera suficiente clic
2. **CPM baratisimo ($1.36)** — Honduras es ventaja competitiva, si sube CTR los leads se abaratan mucho
3. **Independientes convierten 10x mejor** que medicos con secretaria
4. **52% de independientes calificados dijeron "no interesado"** — posible causa: no comprendian bien el producto al ser contactados (en ese momento era solo agenda + recordatorios)
5. **El mercado hondureno no lee, prefiere visual** — imagen estatica limita CTR
6. **Los leads causaron market pull hacia el bot** — ahora el producto es mas fuerte

### Creativo anterior
- Imagen estatica: robot en consultorio dental con burbuja "El paciente ya confirmo para manana"
- Problema: demasiado futurista, no genera urgencia, texto pequeno en mobile

## Decisiones tomadas (sesion 2 Mar)

1. **Audiencia: solo medicos independientes** — eliminar medicos con secretaria del targeting
2. **Formato: video con avatar AI** (persona hablando a camara, no la cara del fundador)
3. **Mensaje core cambia:** de "agenda con recordatorios" a "tus pacientes se agendan solos por WhatsApp"
4. **Herramienta de video:** probar HeyGen (trial gratis, 3 videos) antes de reactivar Veo 3.1
5. **Encuesta simplificada:** de 7 a 5 preguntas (eliminar redundantes para reducir friccion)

## Campana nueva — AD-005 Imagen A (lista para lanzar)

**Creativo:** Imagen estatica — doctor en cama de noche, notificaciones WhatsApp apiladas.
**A/B test:** 2 variantes de copy (misma imagen):
- Variante 1: Dolor + Solucion ("Cuantas citas perdio esta semana...")
- Variante 2: Pregunta directa ("Todavia agenda citas uno por uno...")

**Configuracion:**
- Objetivo: Leads (formulario con 5 preguntas)
- Presupuesto: Lifetime budget $100, ~2 semanas (~$7/dia automatico)
- Audiencia: Honduras, medicos independientes
- Placements: Feed (4:5) + Stories (9:16) automatico
- Evaluacion: revisar al llegar a $50 gastados (~1 semana)

**Detalle completo en:** `docs/ad-creatives.md`

## Decisiones sesion 4 Mar

1. **Demo bot integrado al funnel:** Lead termina formulario → thank you page lo envia a probar el bot por WhatsApp (+50493133496)
2. **Thank you page actualizada:**
   - Titulo: "¡Listo! Ahora póngase en el lugar de su paciente."
   - Cuerpo: "Presione el botón de abajo y envíe la palabra DEMO para ver cómo sus pacientes agendarían citas solos por WhatsApp."
   - Boton: "Probar el asistente por WhatsApp" → `https://wa.me/+50493133496?text=DEMO`
3. **Texto pre-formulario actualizado:** "Al finalizar, podrá probar el asistente virtual de OrionCare directo en su WhatsApp. Su información solo se usará para este fin."
4. **Pendiente dev:** Crear flujo especial en el bot para cuando reciba "DEMO" — contexto guiado para el doctor, no el flujo normal de paciente
5. **Desactivar Messenger** en configuracion del formulario (Settings → desmarcar Messenger)

## Proximos pasos

1. **DEV (blocker):** Implementar flujo "DEMO" en el bot — que al recibir "DEMO" guie al doctor por la experiencia
2. **Generar imagen AD-005** en Gemini (o plan B: Canva con stock + overlays)
3. **LANZAR campana AD-005** en Meta Ads Manager (checklist en `docs/ad-creatives.md`)
4. **Revisar metricas** al llegar a $50 gastados (~1 semana)
   - Comparar CTR de ambas variantes — pausar la peor
   - Medir: cuantos leads hacen clic en "Probar el asistente" vs cuantos no
5. **En paralelo (prioridad baja):** video AD-003 Veo 3.1 — prompts listos, pendiente generar
6. **Semana 3:** scripts de seguimiento/cierre + posts organicos

## Restricciones Meta para salud

- No prometer resultados medicos
- No imagenes antes/despues
- Enfocarse en beneficios operativos del medico
- Copy sobre el negocio del medico, no sobre tratamientos
