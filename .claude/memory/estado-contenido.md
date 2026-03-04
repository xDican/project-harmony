# Estado Contenido — OrionCare

> Ultima actualizacion: 3 Mar 2026 (AD-005 imagen actualizada con elementos scroll-stopping + prompt Gemini)

## Pilares de contenido activos

1. **Dolor:** "Cuantos pacientes perdiste esta semana por no-shows?"
2. **Solucion:** "Tus pacientes se agendan solos por WhatsApp con OrionCare"
3. **Prueba social:** Resultados de clientes reales (cuando haya datos)
4. **Facilidad:** "Se configura en 15 minutos, funciona solo"
5. **Urgencia/FOMO:** "Mientras lees esto, un paciente esta buscando otro doctor porque no le contestaste"

## Decisiones de ads que impactan contenido

- **Formato principal:** video corto (15-25 seg) + imagen estatica — avatar AI (HeyGen), comedia UGC (Veo 3.1), o imagen AI
- **Herramientas:** HeyGen (avatar AI, trial gratis) + Veo 3.1 (comedia/UGC generativo)
- **Audiencia:** solo medicos independientes (no medicos con secretaria)
- **Mensaje core:** "Tus pacientes se agendan solos por WhatsApp" (ya no "agenda con recordatorios")
- **Insight cultural:** hondurenos prefieren visual — video > imagen > texto largo
- **Encuesta simplificada:** 5 preguntas (era 7)

## Calendario Marzo 2026

| Semana | Prioridad | Piezas |
|--------|-----------|--------|
| 1 (3-9 Mar) | **Lanzar campana AD-005** (imagen + 2 copy A/B + encuesta) | Paquete listo, falta subir a Meta |
| 2 (10-16 Mar) | Revisar metricas AD-005, pausar variante peor. Video AD-003 si hay tiempo | Iteracion + video |
| 3 (17-23 Mar) | Posts organicos + segundo script (seguimiento) | 4-6 piezas |
| 4 (24-30 Mar) | Revision de metricas, ajustar copy segun datos, tercer script (cierre) | Iteracion |

## Inventario de contenido

### Ads

| # | Pilar | Formato | Estado | Notas |
|---|-------|---------|--------|-------|
| AD-001 | Dolor + Solucion | Video 15-25s (guion) | Guion listo | Avatar AI, pendiente producir en HeyGen |
| AD-002a | Dolor + Urgencia | Copy ad (variante A) | Listo | "Mientras usted contesta..." — dolor directo |
| AD-002b | Dolor + Urgencia | Copy ad (variante B) | Listo | "Cuantas citas perdio..." — pregunta + solucion |
| AD-003 | Dolor + Solucion | Video Veo 3.1 (2x8s = 16s) | Prompts listos | Comedia/chisme hondureno. Prompts en `docs/ad-creatives.md` |
| AD-005 | Dolor + Solucion | Imagen estatica (2 copy A/B) | Imagen pendiente regenerar | Doctor de noche + overlays scroll-stopping (10:47 PM, burbujas WhatsApp, badge 47). Prompt Gemini listo. Copy, encuesta, config en `docs/ad-creatives.md` |

**Categorias de tracking:**
- Por formato: video / imagen estatica
- Por pilar: dolor / solucion / facilidad / urgencia / prueba social
- Entregables completos en: `docs/contenido-semana1.md`

### Scripts de venta (WhatsApp)

| # | Momento funnel | Estado | Notas |
|---|---------------|--------|-------|
| SC-001 | Primer contacto | Listo | Mensaje + variante corta, en `docs/contenido-semana1.md` |
| — | Seguimiento | Pendiente | Para leads que no respondieron (semana 3) |
| — | Cierre | Pendiente | Para leads interesados (semana 4) |

### Posts organicos

| # | Pilar | Formato | Estado | Notas |
|---|-------|---------|--------|-------|
| — | — | — | Vacio | No es prioridad hasta semana 3 |

## Restricciones

- Feature freeze: no prometer features que no existen
- Meta salud: no prometer resultados medicos, enfocarse en beneficios operativos
- **Visual > texto:** hondurenos no leen — priorizar video y grafica sobre copy largo
- Tiempo: max 1-2 horas por sesion de contenido
- La esposa maneja los scripts — deben ser claros y faciles de seguir

## Notas para proxima sesion

- **Sesion anterior (3 Mar):** AD-005 imagen actualizada con elementos scroll-stopping + prompt Gemini generado
- **Cambio clave en imagen:** se anadieron overlays para comunicar dolor en <1 seg de scroll:
  - "10:47 PM" (hora tardia), 3 burbujas WhatsApp con mensajes de pacientes, badge rojo "47", doctor agotado
  - Objetivo: subir CTR de 0.54% a >1.5%
- **Prompt Gemini:** listo para copiar/pegar — si texto no sale bien, generar foto base y agregar overlays en Canva/Figma
- **Inventario completo en:** `docs/contenido-semana1.md`
- **Creativos de ads en:** `docs/ad-creatives.md`
- **Siguiente paso critico:** generar imagen en Gemini → exportar 4:5 + 9:16 → lanzar campana en Meta
  - Crear campana Leads, lifetime budget $100 (~2 semanas)
  - Configurar formulario 5 preguntas
  - 2 ads con 2 variantes de copy (A/B)
  - Revisar metricas al llegar a $50 gastados (~1 semana)
- **En paralelo (prioridad baja):** AD-003 video Veo 3.1 — prompts listos, pendiente generar clips
- Semana 3: scripts de seguimiento y cierre + posts organicos
