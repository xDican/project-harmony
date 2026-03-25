# Estado Ads — OrionCare

> Ultima actualizacion: 21 Mar 2026 (AD-007 budget fix — limite campaña removido, presupuesto subido a $20/dia)

## Dashboard

| Metrica | Valor actual | Meta |
|---------|-------------|------|
| Campanas activas | **1 (AD-007)** — 2 ads, presupuesto campana $20/dia | 1-2 |
| Gasto total historico | ~$150 (AD-005 $92.30 + AD-006 $57.33 + AD-007 ~$2.40) | — |
| Leads totales historicos | 80 (AD-005: 38 + AD-006: 42 + AD-007: 0) | — |
| Cierres totales | **1** (Carla Paredes, $75/mes) | — |
| Presupuesto AD-007 | **$20/dia** (campana level, limite removido 21 Mar) | — |
| Limite cuenta | **$20/dia** (subido de $15, 21 Mar) | — |

## Campanas

### AD-007 — Asistente Saturada + Doctor Entre Pacientes (ACTIVA 19 Mar)
- **Estado:** ACTIVA. Aprobada por Meta. Entrega casi nula primeros 2 dias (~$2.40 gastados).
- **Problema detectado 21 Mar:** Limite de cuenta $15/dia + limite campaña $10/dia + $10/dia por ad = 3 capas de restriccion. Meta no encontraba espacio para gastar.
- **Fix 21 Mar:** Limite cuenta subido a $20/dia. Limite campaña removido. Presupuesto campaña: $20/dia.
- **Concepto:** 2 imagenes que solo un medico reconoce como "mi dia a dia" = creativo como filtro de calidad.
- **Imagen A:** "La Asistente Saturada" — perfil empresario. 3 textos + 2 titulos (Advantage+).
- **Imagen B:** "El Doctor Entre Pacientes" — perfil independiente. 3 textos + 2 titulos (Advantage+).
- **Config:** 1 campana, 1 ad set, 2 ads. 6 combinaciones por ad, 12 total. Meta optimiza.
- **Presupuesto:** $20/dia (campana level).
- **Formulario:** Texto libre en especialidad (escribir requiere intencion = filtro).
- **Hipotesis:** CTR menor (0.8-1.3%) pero % calificados 70-85% vs 10-31% de AD-006.
- **Metrica clave:** CPL calificado, NO CTR.
- **Checkpoint lunes 24 Mar:** Si <$30 gastados total → creativo no funciona, pivotar a AD-005 con imagenes frescas.
- **Plan B:** Reactivar AD-005 (86% calificados, 1 cierre) con creativos nuevos para evitar fatiga.
- **Detalle completo:** `docs/ad-creatives.md` seccion AD-007.

### AD-006 — "20 mensajes = 1 cita" (PAUSADA 19 Mar)
- **Estado:** Pausada. No eliminar (Meta conserva aprendizajes).
- **Razon pausa:** 70-90% leads basura. Creativo universalmente relatable — no filtra.
- **Metricas finales (CSV 17 Feb-18 Mar):** Gasto $55.78 | 42 leads | CPL $1.33 | CTR 1.38% | CPM $1.39 | CPC $0.10 | Alcance 21,942 | Frecuencia 1.83 | Impresiones 40,101
- **Calidad:** ~10-31% calificados. Batch 19 Mar fue 90% basura.
- **Aprendizaje:** Generacion excelente, calidad inaceptable. El formulario no puede compensar un creativo que atrae a todos.

### AD-005 — Doctor de noche (PAUSADA 13 Mar)
- **Estado:** Pausada. Fatigada — frecuencia 2.23, CTR cayendo.
- **Metricas finales (CSV 17 Feb-18 Mar):** Gasto $92.30 | 38 leads | CPL $2.43 | CTR 0.72% | CPM $1.73 | CPC $0.24 | Alcance 24,011 | Frecuencia 2.23 | Impresiones 53,433
- **Calidad:** ~86% calificados (el creativo "doctor en cama" filtraba bien). 1 cierre (Carla Paredes).
- **CPL calificado:** ~$2.83

## Metricas finales AD-005 y AD-006 (CSV 17 Feb - 18 Mar)

### AD-005 (AutoAgenda)
- Gasto: $92.30 | Impresiones: 53,433 | CPM: $1.73
- Alcance: 24,011 | Frecuencia: **2.23** (fatiga confirmada)
- Clics enlace: 387 | CPC: $0.24 | CTR: 0.72%
- Clics todos: 925 | CTR todos: 1.73% | CPC todos: $0.10
- Resultados (leads): 38 | Costo por resultado: $2.43
- **Cierres: 1** (Carla Paredes)

### AD-006 (20mensajes1cita)
- Gasto: $55.78 | Impresiones: 40,101 | CPM: $1.39
- Alcance: 21,942 | Frecuencia: **1.83**
- Clics enlace: 554 | CPC: $0.10 | CTR: 1.38%
- Clics todos: 676 | CTR todos: 1.69% | CPC todos: $0.08
- Resultados (leads): 42 | Costo por resultado: $1.33

### Comparativa final

| Metrica | AD-005 | AD-006 |
|---------|--------|--------|
| Gasto | $92.30 | $55.78 |
| Leads | 38 | 42 |
| CPL | $2.43 | $1.33 |
| CTR | 0.72% | 1.38% |
| % calificados | ~86% | ~10-31% |
| CPL calificado | ~$2.83 | ~$4.30-$13.30 |
| Cierres | 1 | 0 |

> **Conclusion:** AD-005 gana en calidad (86% calificados, 1 cierre). AD-006 gana en volumen pero la basura invalida la ventaja de CPL bajo.

## Funnel real AD-005 (con datos del bot)

| Etapa | Cantidad | % del anterior | Costo unitario |
|-------|----------|---------------|----------------|
| Impresiones | 54,583 | — | — |
| Clicks | 398 | 0.73% | $0.23 |
| Form fills | 35 | 8.8% de clicks | $2.66 |
| Interactuaron con bot | ~21 | 64% de forms | ~$4.43 |
| Agendaron cita en bot | 8 | 38% de interactores | ~$11.63 |
| Cierres | 1 | 12.5% de bookings | $93.02 |

**Fugas principales:**
- 36% de form fills nunca tocan el bot (posible problema de redirect)
- Dolor "Poco" = 0% conversion (10+ leads, ~$27 desperdiciados)
- FAQ del bot no explica OrionCare (3-4 leads perdidos)

## Analisis de campana anterior (historico)

### Metricas
- Gasto: $203.81 | Impresiones: 149,360 | CPM: $1.36
- Clics enlace: 811 | CPC: $0.25 | CTR: 0.54%
- Resultados: 49 | Costo por resultado: $4.16

### Funnel historico (125 leads totales)
- Funnel: Ad → encuesta (7 preguntas) → contacto via WhatsApp
- Filtro: solo leads que dijeron "mucho" o "demasiado" tiempo agendando
- Calificados: 56 (38 independientes + 18 con secretaria)
- Independientes: 3 convertidos de 38 (7.9%)
- Con secretaria: 0 convertidos de 18 (0%)

### Aprendizajes clave
1. CPL bueno ($4.16) pero CTR malo (0.54%)
2. CPM baratisimo ($1.36) — Honduras es ventaja competitiva
3. Independientes convierten 10x mejor que medicos con secretaria
4. El mercado hondureno prefiere visual — imagen estatica limita CTR

## Investigacion mercado Honduras (13 Mar 2026)

### Audiencia
- Facebook Honduras: 4.6M alcanzables, 5.43M usuarios totales
- TAM medicos/dentistas privados: ~5,000-7,000
- No hay competidor local con Meta Ads — first-mover advantage

### Benchmarks
- CPM Honduras: $1.50-$3.00 (OrionCare: $1.70 — excelente)
- CPC Honduras: $0.10-$0.30 (OrionCare: $0.23 — bien)
- CPL Honduras: $2.00-$8.00 (OrionCare: $2.66 — muy bueno)
- CTR benchmark imagen: ~0.90% (OrionCare: 0.73% — por debajo)

### Formatos (benchmarks globales)
- Video: CTR 0.98% (mejor CTR)
- Carousel: 30-50% menor costo por conversion (mejor conversion)
- Imagen: CTR 0.91% (baseline)

### Implicaciones
- Audiencia pequeña (~5K-7K) = creativos se fatigan rapido, rotar cada 2-3 semanas
- Mobile-first: atencion de 1.7 segundos
- 95% de medicos LATAM ya usan WhatsApp para su practica
- Carousel no probado aun — potencial para menor costo por conversion
- Video pendiente (AD-001 HeyGen, AD-003 Veo 3.1) — potencial para mejor CTR

### Competencia
- Ningun competidor anuncia en Honduras
- Ninguno tiene WhatsApp bot nativo (diferenciador unico)
- Precios competidores: $19-$50/mes. OrionCare $40 = rango medio-alto pero con WhatsApp

## Buyer persona refinado (19 Mar)

**Decision:** NO estrechar audiencia en Meta. El CREATIVO funciona como filtro.
- Audiencia Meta: sin cambios (Honduras, medicos/dentistas)
- 2 variantes de imagen en la misma campana: Meta optimiza entrega via Advantage+
- Ambos perfiles cubiertos por el creativo

**Perfil primario: "Doctor-Empresario con Equipo"**
- Clinica 2+ doctores, asistentes con rol mixto (front desk + procedimientos)
- Precio: $75-110/mes | LTV:CPA: 27-40x
- Ejemplo: Carla Paredes / Medilaser

**Perfil secundario: "Doctor Independiente"**
- Medico solo o con secretaria basica
- Precio: $40/mes | LTV:CPA: 14.5x
- Ejemplo: Yeni, Ramos

## Decisiones tomadas

### Sesion 19 Mar
1. **AD-006 pausada** — 70-90% leads basura, creativo universalmente relatable
2. **AD-007 en preparacion** — 2 imagenes (asistente saturada + doctor entre pacientes) + 2 copys
3. **Buyer persona refinado** — 2 perfiles (empresario + independiente), creativo como filtro
4. **Audiencia Meta sin cambios** — no estrechar, el creativo filtra
5. **Formulario:** especialidad revertida a texto libre (escribir requiere intencion)
6. **Metrica clave cambiada:** CPL calificado, no CTR

### Sesion 13 Mar
1. **AD-006 lanzada** — imagen "20 mensajes = 1 cita", 3 formatos (1:1, 9:16, 1.91:1)
2. **Formulario sin cambios** — "Poco" se mantiene como señal de calidad, no como filtro
3. **CTA cambiado** de "Registrarte" a "Más información" (menor friccion)
4. **Copy con Advantage+** — 2 variantes de texto principal, Meta rota automaticamente

### Sesion 4 Mar
1. Demo bot integrado al funnel (thank you page → WhatsApp bot)
2. Desactivar Messenger en config del formulario

### Sesion 2 Mar
1. Audiencia: solo medicos independientes
2. Mensaje core: "tus pacientes se agendan solos por WhatsApp"
3. Encuesta simplificada: de 7 a 5 preguntas

## Proximos pasos

1. **Monitorear AD-007 dia 3-5** (~$60-100 gastados) — % calificados es la metrica clave
2. **Evaluacion dia 7 (~26 Mar):** % calificados vs meta 70%. Cual imagen rinde mejor. Pausar la peor.
3. **Siguiente rotacion:** Carousel o video (AD-001/AD-003) si AD-007 se fatiga
4. **Regla:** Siempre generar 3 formatos por creativo: 1:1 (1080x1080), 9:16 (1143x2048), 1.91:1 (1200x628)

## Restricciones Meta para salud

- No prometer resultados medicos
- No imagenes antes/despues
- Enfocarse en beneficios operativos del medico
- Copy sobre el negocio del medico, no sobre tratamientos
