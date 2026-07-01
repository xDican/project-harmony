# Plantilla — Prompt para Gemini: landing page de médico (enganche)

Herramienta reusable para el play de "landing gratis como enganche" (ver estrategia:
plantilla reusable, no bespoke). Se le pasa a **Gemini** JUNTO CON una imagen de la
paleta de colores de la marca del médico. Gemini investiga, analiza la paleta y devuelve
un **prompt listo para Lovable**.

## Cómo usarla
1. Reemplazá las variables `[ ]` con los datos del médico.
2. Pegá el prompt en Gemini + adjuntá la imagen con la paleta de colores.
3. Copiá el bloque "PROMPT PARA LOVABLE" que devuelve Gemini y pegalo en Lovable.
4. Reemplazá `[WHATSAPP_NUMERO]` con el número real del cliente (NO el demo de OrionCare)
   una vez conectado vía Coexistence.

## Variables
- `[DRA_NOMBRE]` — nombre del médico (ej. Dra. Grecia Rodríguez)
- `[CLINICA]` — nombre de la clínica (ej. Smile Design)
- `[ESPECIALIDAD]` — rubro (ej. odontología / dental)
- `[CIUDAD]` — ciudad (ej. Tegucigalpa, Honduras)
- `[INSTAGRAM_URL]` — perfil de Instagram (ej. https://www.instagram.com/...)

---

## PROMPT (copiar, reemplazar variables, pegar en Gemini + imagen)

```
Eres un especialista en branding y desarrollo web para negocios de salud en Honduras.
Vas a ayudarme a crear una landing page para una clínica. Trabajás en 3 pasos.

## DATOS DEL MÉDICO
- Nombre: [DRA_NOMBRE]
- Clínica: [CLINICA]
- Especialidad: [ESPECIALIDAD]
- Ubicación: [CIUDAD]
- Instagram: [INSTAGRAM_URL]
- Te adjunto una IMAGEN con su paleta de colores de marca (úsala en el paso 2).

## PASO 1 — INVESTIGAR AL MÉDICO
Revisá su Instagram (y cualquier web/perfil público que encuentres) y extraé:
- Nombre completo y credenciales/especialidad
- Servicios que ofrece (listalos)
- Ubicación exacta / edificio / dirección si aparece
- Número de WhatsApp o teléfono si aparece
- Tono y estética de su marca (elegante, moderno, cercano, minimalista…)
- Tagline o frase que use, y el tipo de contenido/fotos que publica
IMPORTANTE: Separá claramente lo que SÍ pudiste confirmar de lo que NO. Si no podés
acceder a Instagram, decilo y trabajá con supuestos razonables del rubro, marcándolos
como "[POR CONFIRMAR]" para que yo los complete.

## PASO 2 — ANALIZAR LA PALETA DE COLORES
De la imagen adjunta, extraé:
- Colores principales en formato HEX: primario, secundario, acento, fondo, texto
- Descripción de la estética que transmite (ej. "elegante y femenino", "limpio y clínico")

## PASO 3 — GENERAR EL PROMPT PARA LOVABLE
Con lo anterior, escribí un prompt DETALLADO y listo para pegar en Lovable que genere
una landing page con estas especificaciones:

**Generales:**
- Mobile-first (en Honduras la gente entra desde el celular; atención de ~2 seg → visual > texto)
- Todo el copy en ESPAÑOL, cálido y hondureño, frases cortas
- Estética moderna, limpia y confiable, acorde al rubro
- Usar EXACTAMENTE la paleta de colores del paso 2 (pasá los HEX)
- Stack por defecto de Lovable (React + Vite + Tailwind), rápida y responsive
- RESTRICCIÓN DE SALUD: nada de prometer resultados médicos; hablar de la experiencia,
  la atención y la confianza, no de garantías de tratamiento

**Secciones (en este orden):**
1. Hero: [CLINICA] + [DRA_NOMBRE] + tagline + subtítulo breve + botón CTA principal
   "Agendar por WhatsApp". Imagen de fondo acorde al rubro, limpia.
2. Servicios: grid con íconos (llenar con sus servicios reales del paso 1)
3. Sobre el médico: foto + bio corta + credenciales + link a su Instagram (genera confianza)
4. Por qué elegirnos: 3-4 diferenciadores (atención personalizada, tecnología, etc.)
5. Ubicación y horarios: dirección + horarios + espacio para mapa (placeholder)
6. CTA final grande: "Agendá tu cita por WhatsApp"
7. Footer: Instagram, WhatsApp, dirección
- Botón flotante de WhatsApp fijo (esquina inferior derecha) visible en todo el scroll

**Call-to-action de WhatsApp (clave):**
- TODOS los botones de "Agendar/Agenda por WhatsApp" deben apuntar a un link wa.me con
  mensaje pre-cargado, usando este placeholder para que yo ponga el número:
  https://wa.me/504XXXXXXXX?text=Hola%2C%20quiero%20agendar%20una%20cita%20en%20[CLINICA]
- Dejá el número como [WHATSAPP_NUMERO] bien visible para que yo lo reemplace.

**Formato de tu respuesta final (3 bloques):**
A) FICHA DE INVESTIGACIÓN (confirmado vs por confirmar)
B) PALETA DE COLORES (HEX + descripción)
C) PROMPT PARA LOVABLE (en un bloque de código, listo para copiar y pegar)
```

---

## Notas
- El CTA de WhatsApp amarra todo: la landing empuja al número del cliente (que va en
  OrionCare vía Coexistence). Por eso el `wa.me` con placeholder.
- Extensiones opcionales según el caso: sección antes/después (OJO restricción de salud),
  testimonios, formulario además del WhatsApp.
- Primer uso real: Dra. Grecia Rodríguez / Smile Design (1 Jul 2026).
