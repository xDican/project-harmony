# OrionCare — Sistema Operativo del Negocio

## Norte

OrionCare existe para darle libertad financiera y de tiempo a nuestra familia. $7,000/mes para 3 personas resuelve la vida. Todo lo que hagamos debe acercarnos a esa meta sin sacrificar tiempo con nuestro hijo.

**No buscamos:** ser la empresa más grande, levantar inversión, contratar un equipo enorme.
**Sí buscamos:** 175 clientes a $40/mes, pocas horas de trabajo diario, un producto que funcione solo.

---

## Estado actual (28 Feb 2026)

**Producto:** 85% listo. Agenda + recordatorios en producción. Bot de autoagenda listo para campo.
**Clientes:** 3 (A: esperando tarjeta Meta, B: instalación lunes, C: prospecto cierra lunes).
**Ingreso:** ~$105/mes ($35 × 3).
**Equipo:** Tú (producto/datos/estrategia) + tu esposa (ventas/seguimiento).
**Ads:** Tienes datos detallados de campañas anteriores con métricas y creativos.
**Restricción:** Niño de 2 años, sin ayuda doméstica por ahora.

---

## Estructura del negocio

### Roles

| Persona | Responsabilidad | Objetivo |
|---------|----------------|----------|
| **Tú** | Producto, datos, estrategia, ads | Que la plataforma funcione perfecta y lleguen leads |
| **Tu esposa** | Ventas, seguimiento de prospectos, atención al cliente | Que los leads se conviertan en clientes y estén felices |
| **Claude** | Desarrollo técnico, análisis de datos, copy, estrategia | Tu multiplicador de productividad |

### Ritmo semanal

```
LUNES:    Revisar métricas de ads del fin de semana. Ajustar campañas. (Tú)
          Seguimiento a prospectos pendientes. (Esposa)

MARTES:   Desarrollo/mejoras del producto si hay bugs o polish. (Tú)
          Atención a clientes activos, resolver dudas. (Esposa)

MIÉRCOLES: Crear contenido para ads/redes de la semana. (Tú + Claude)
           Seguimiento de ventas en proceso. (Esposa)

JUEVES:   Análisis de datos del sistema: uso del bot, citas, no-shows. (Tú)
          Seguimiento + cierre de prospectos calientes. (Esposa)

VIERNES:  Revisión semanal: ¿cuántos leads, cuántos cierres, cuánto gastamos?
          Planificar la siguiente semana. (Ambos, 30 min)

FIN DE SEMANA: Descanso. Los ads corren solos.
```

**Tiempo estimado por persona:** 2-4 horas/día, flexible alrededor del niño.

---

## Plan de acción inmediato

### Esta semana (1–7 Mar)

**Lunes 3:**
- [ ] Instalación Cliente B (configurar agenda, WhatsApp, horarios)
- [ ] Cierre Cliente C (confirmar número de teléfono y pago)
- [ ] Deploy bot-handler a producción (si no está ya)

**Mar-Vie:**
- [ ] Corregir advisories de seguridad de Supabase:
  - Vista `bot_analytics_summary` → cambiar SECURITY DEFINER a INVOKER
  - 10 funciones → agregar `SET search_path = ''`
  - Habilitar leaked password protection en Auth
- [ ] Analizar datos de ads anteriores con Claude:
  - ¿Cuál fue el CPA? ¿Qué creativo convirtió mejor? ¿Qué audiencia respondió?
  - Definir la próxima campaña basada en datos reales
- [ ] Tu esposa: familiarizarse con el producto (que lo use, que entienda el flujo del cliente)

### Semana 2 (8–14 Mar)

- [ ] Lanzar nueva campaña de ads optimizada basada en el análisis
- [ ] Monitorear que Clientes A, B, C estén usando el bot (primeros datos reales)
- [ ] Tu esposa: responder a los primeros leads que lleguen de la campaña
- [ ] Tú: observar datos del bot en campo — ¿dónde se traban los pacientes?

### Semana 3-4 (15–31 Mar)

- [ ] Iterar ads según resultados de semana 2 (pausar lo malo, escalar lo bueno)
- [ ] Corregir problemas del bot encontrados en campo
- [ ] Medir: ¿cuántos leads? ¿cuántos se convirtieron? ¿cuánto costó cada uno?
- [ ] Primer reporte mensual del negocio

**Meta de Marzo:** 5-8 clientes activos, ads corriendo con CPA medido, bot probado en campo.

---

## Motor de crecimiento: Ads

Este es el corazón del negocio. Sin leads, no hay clientes. Sin clientes, no hay $7K.

### Framework de ads 80/20

```
Presupuesto mensual de ads → Leads → Tu esposa los contacta → Clientes
       (tú controlas)        (llegan)    (ella convierte)      ($40/mes)
```

### Ciclo de optimización semanal

1. **Lunes:** Revisar métricas de la semana anterior (CPA, CTR, leads)
2. **Lunes:** Pausar creativos con CPA > $25. Escalar creativos con CPA < $15.
3. **Miércoles:** Crear 1-2 creativos nuevos para testear (con Claude)
4. **Viernes:** ¿Cuántos leads entraron? ¿Cuántos cerró tu esposa? ¿Cuánto gastamos?

### Métricas de ads a trackear

| Métrica | Qué es | Meta |
|---------|--------|------|
| **CPA** | Cuánto cuesta adquirir 1 cliente | < $20 (recuperas en 15 días) |
| **CTR** | % de personas que hacen click en tu ad | > 1.5% |
| **CPL** | Costo por lead (antes de convertir) | < $5 |
| **Tasa de cierre** | % de leads que se vuelven clientes | > 25% |
| **ROAS** | Retorno sobre inversión en ads (a 3 meses) | > 5x |

### Escalar ads progresivamente

| Mes | Presupuesto ads | Leads esperados (CPL $5) | Clientes nuevos (25% cierre) | Acumulado |
|-----|----------------|--------------------------|------------------------------|-----------|
| Mar | $100 | 20 | 5 | 8 |
| Abr | $150 | 30 | 7-8 | 15 |
| May | $200 | 40 | 10 | 25 |
| Jun | $250 | 50 | 12 | 37 |
| Jul | $300 | 60 | 15 | 52 |
| Ago | $350 | 70 | 17 | 69 |
| Sep | $400 | 80 | 20 | 89 |
| Oct | $400 | 80 | 20 | 109 |
| Nov | $400 | 80 | 20 | 129 |
| Dic | $400 | 80 | 20 | 149 |

**Nota:** Esto NO incluye referidos. Con un programa de referidos activo, llegas a 175 antes.

### Funnel de ventas

```
Ad en Facebook/Instagram
  ↓
Landing page (qué es OrionCare, precio, video demo de 2 min, botón de contacto)
  ↓
Lead llega por WhatsApp: "Me interesa"
  ↓
Tu esposa responde (tiene script + video demo pre-grabado)
  ↓
Si interesado → registra al cliente → onboarding automático
  ↓
Tú activas → cliente activo → $40/mes
```

---

## Operaciones 80/20

### Qué automatizar (el 80%)

| Proceso | Cómo automatizarlo |
|---------|-------------------|
| **Recordatorios a pacientes** | Ya funciona (cron de Supabase) |
| **Agendamiento** | Bot lo hace (en campo ahora) |
| **Onboarding de cliente** | Wizard de registro ya existe. Reducir activación manual. |
| **Respuestas a preguntas de clientes** | Base de conocimiento / FAQ (crear con Claude) |
| **Reportes del negocio** | Dashboard en la plataforma + consultas SQL mensuales |
| **Creación de contenido** | Batch con Claude cada 2 semanas (6-8 posts de una vez) |

### Qué hacer manualmente (el 20%)

| Proceso | Quién | Frecuencia |
|---------|-------|------------|
| **Seguimiento de leads** | Esposa | Diario |
| **Cerrar ventas** | Esposa | Cuando hay lead caliente |
| **Analizar datos del sistema** | Tú | 2-3 veces/semana |
| **Optimizar ads** | Tú | Lunes + miércoles |
| **Corregir bugs críticos** | Tú | Cuando aparezcan |
| **Activar clientes nuevos** | Tú | Cuando se registran (~5 min) |

---

## Hitos financieros

| Hito | Clientes | Ingreso/mes | Qué cambia |
|------|----------|-------------|------------|
| **Arranque** (Mar) | 5-8 | $200-320 | Validación: el modelo funciona |
| **Tracción** (May) | 25 | $1,000 | Pagar ayuda doméstica. Más tiempo para ambos. |
| **Momentum** (Jul) | 50 | $2,000 | Reinvertir más en ads. Producto super pulido. |
| **Velocidad** (Sep) | 90 | $3,600 | Evaluar si abrir otro país |
| **Objetivo** (Dic) | 175 | $7,000 | Libertad financiera lograda |

### Costos mensuales al llegar a $7K

```
Supabase Pro:       $25
Twilio:             $50
Claude Pro:         $20
Vercel:             $20
Ads:                $400
Ayuda doméstica:    $200 (desde ~$1K/mes de ingreso)
────────────────────
Total:              ~$715
Neto:               ~$6,285/mes
```

---

## Congelamiento de features (Mar–May 2026)

**Por 3 meses NO se agregan features nuevos.** Solo:
- Corrección de bugs encontrados en campo
- Fixes de seguridad (advisories de Supabase)
- Polish de UX basado en feedback real de clientes
- Mejoras al bot basadas en datos de uso real

**En Junio:** 1 semana dedicada a evaluar qué features agregar basado en:
- ¿Qué piden los clientes repetidamente?
- ¿Qué feature reduciría churn?
- ¿Cumple la regla 80/20? (¿se configura solo y funciona para todos?)

---

## Reglas del juego (framework de decisión)

Antes de hacer CUALQUIER cosa, pregúntate:

1. **¿Esto me acerca a 175 clientes?** Si no → no lo hagas.
2. **¿Puedo automatizarlo?** Si sí → automatízalo antes de hacerlo manual.
3. **¿Requiere mi intervención por cada cliente?** Si sí → rediseñalo.
4. **¿Un cliente lo pidió o yo lo imaginé?** Si lo imaginaste → espera a que 3 clientes lo pidan.
5. **¿Puedo hacerlo en menos de 2 horas con Claude?** Si sí → hazlo ahora. Si no → planifícalo.

### Qué NO hacer

- No agregar features que nadie pidió
- No personalizar por cliente (es producto, no servicio)
- No gastar en herramientas que no generan clientes directamente
- No trabajar más de 4-5 horas/día (tu recurso más valioso es tu tiempo y tu familia)
- No escalar a otro país hasta dominar Honduras
- No contratar empleados — escalar con automatización y AI

---

## Deuda técnica (resolver primera semana de Marzo)

| Issue | Severidad | Acción |
|-------|-----------|--------|
| `bot_analytics_summary` SECURITY DEFINER | ERROR | Cambiar a INVOKER |
| 10 funciones sin `search_path` fijo | WARN | Agregar `SET search_path = ''` |
| Leaked password protection deshabilitada | WARN | Habilitar en Auth settings |
| 4 tablas sin RLS policies | INFO | Documentar (son service_role only) |
| Dependencia `lovable-tagger` | Limpieza | Remover de package.json |

---

## Resumen en una frase

**OrionCare es una máquina de $40/mes: los ads traen leads, tu esposa los convierte, el producto funciona solo, tú analizas datos y mejoras. A 175 clientes, la familia es libre.**
