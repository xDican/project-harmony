# Estado Estrategia — OrionCare

> Ultima actualizacion: 22 Jul 2026 (MIERCOLES — **INSTALACION HANOY CONFIRMADA EXITOSA**: uso real verificado por SQL el mismo dia 22 (sesion espontanea sin empuje, 4 citas creadas, 3 pacientes cargados, paginas mas visitadas agenda-semanal/citas-nueva/inbox/pacientes). Plantillas de mensajes en espera de aprobacion Meta, bot OFF segun plan (1 semana de calibracion). **Hallazgos nuevos de la instalacion:** (1) Hanoy Y su novio (bienes raices independiente) advirtieron explicitamente sobre "bots malos" — el novio pide piloto de calificacion de leads para su rubro PERO condicionado a ver primero que el bot de Hanoy no se sienta como bot barato; watch-item para diversificacion Oct 2026, NO perseguir ahora (choca con [[icp-individual-fuera]], costo $0 esperar). (2) Hanoy lleva su plan de pago de inquilinos en Word — señal debil (N=2 informal con anecdota Grecia, no cliente) que refuerza [[sistema-facturacion]], no cruza umbral de 3 clientes. (3) **Wilmer reporto problema real: pacientes agendan en horas donde el tiene compromisos personales, sin forma de bloquearlas** — Diego correctamente descarto un "servicio especial" ad-hoc por insalubre para el producto; es gap generico de bloqueo/excepciones de horario, ya anotado como diferible desde Skin Medic (22 May), ahora lo pide el cliente ancla. (4) **Vista mensual pedida por Hanoy + UNIMED** (prospecto perdido, feedback igual valido) + Diego cree que Wilmer tambien la querria — mismo gap que "vista combinada multi-calendario" de mayo, ahora especifico a "tipo TimeTree por mes". **Correccion al test de precio de inquilinos:** ventana bajada de 60 a 30 dias (Diego: van a hablar con cada medico individualmente antes de integrarlo, no es autoservicio pasivo; estrategia = hacer la experiencia de Hanoy "bella" para que ella empuje organicamente, peor caso quedan en Free hasta que quieran subir) — ademas el resultado YA NO es señal organica pura porque Diego confirma que "hara fuerza" en la venta; detalle en [[tesis-unidad-venta-instalacion]]. **DECISION: foco tecnico inmediato = bloqueador de horario + vista mensual + calibracion del bot (1 semana)** — sesion continua en /modo-dev para planificar orden de desarrollo. Ver Sesion 22 Jul al final.)
> Ultima actualizacion: 18 Jul 2026 (SABADO — **HANOY CERRADA: $15+ISV+Meta aparte, mes 1 gratis, INSTALACION MARTES 21 JUL PM** (cierre en primera visita + mes gratis aplicados; 3er cliente activo, primer caso real dueña-hub). Sonda clave resuelta: cobra por HORA al medico con cobro DIARIO → gancho no-show MUERTO para ella, VIVO para sus **3 inquilinos** (ellos pagan la hora del cubiculo aunque el paciente no llegue) = cuña del upsell futuro, no gastarla ahora. Valor mes 1 a demostrar: recordatorios propios automatizados + administrar leads de su publicidad (ella paga y maneja sus ads = primer caso real del uso "administrar leads"). **Debate de pricing → tesis emergente: la unidad de venta es la INSTALACION, no el medico** — cierres reales de julio a $11.5-15/medico via hub (UNIMED, Hanoy); $40 medico-solo tiene N=0 (Wilmer entro a $35); el funnel muere en DOLOR no en precio (solo 1 prospecto en 45 dias objeto precio; Hanoy dudo hasta con $15). Regla: precio bajo/medico SOLO donde CAC≈0 (dentro de hub); $40 frio se mantiene hasta n=20; fallback pre-registrado $25-30 si calificados-en-dolor objetan precio; $15 frio FUERA del menu (CAC founder-led no lo financia). **Test de precio pre-registrado con inquilinos:** Free = app completa sin restricciones (su agenda, sus pacientes) EXCEPTO mensajes; Pro $15 = recordatorios/bot con LINEA PROPIA (la linea de Hanoy es SOLO de ella — decision Diego; placeholder-sin-paciente DESCARTADO); umbral 60 dias: ≥1/3 toma Pro = señal viva, 0/3 = teoria precio-barrera muerta (usaron todo a diario y ni $15 los movio). **Verificaciones criticas pre-martes (modo-dev lunes):** (a) scoping crons/bot por doctor — NADA sale por la linea de Hanoy para citas de inquilinos (revisar `whatsapp_line_doctors`); (b) visibilidad pacientes/citas entre medicos independientes en la misma org; (c) 4 condiciones Coexistence del numero + website en portfolio; (d) ✅ **PWA minimo HECHO EL MISMO SABADO** (PR #74 mergeado a main + QA aprobado por Diego en Android e iPhone; el martes solo queda instalar el icono en el celular de Hanoy) — su "quisiera que fuera un app" quedo respondido en horas. UNIMED: Omar Diaz reporta atraso, respuesta LUNES 20 — bandera: el lenguaje paso de logistica a decision; plan 2 ramas (si→fecha+primer pago EN la llamada; evasiva→deadline digno UNICO y soltar). #99 Yeni sin contacto. Confirmafy $12 mencionado por Diego, no por leads → tratamiento AgendaPro: fantasma de pricing hasta aparecer en campo. Ver Sesion 18 Jul al final.)
> Update previo: 14 Jul 2026 (MARTES — **VISITA KAREN EJECUTADA: no-cierre digno → NURTURE con trigger** (pidio precio POR ESCRITO — legitimo, no "lo analizare": su dolor es FUTURO, arma flujo agencia-de-marketing→leads→administrarlos y aun no contrata la agencia; hay OTRO software cortejandola → precio escrito debe salir HOY: $40 + Meta aparte + gancho "cuando arranques con la agencia, mes 1 gratis y te monto todo"). Censo: 114 seguidores IG, poco flujo confirmado. Si algun dia cierra = primer caso de uso real "administrar leads de ads". **Fruto mayor de la visita: referida Dra. Hanoy Medina** — dueña de clinica que SUBARRIENDA cubiculo por hora (tesis Airbnb-de-cubiculos, lado dueño), arrendatarios agendan directo self-service en TimeTree, sus recordatorios propios a mano; **CITA SABADO 18 JUL**. Sesion mato 2 teorias en 24h (malabareo 2-apps = tibio, ya probado por 40% test Wilmer; horas-no-registradas = muerta porque reservar ES anotar) → sabado va SIN teoria de turno, con 4 sondas pre-registradas (la clave: ¿cobra hora apartada o consulta REALIZADA? — si es por consulta, el no-show del paciente del arrendatario le cuesta L400+ A ELLA = unico gancho $40 vivo; ademas: choques TimeTree sin bloqueo, recepcionista-invisible, facturacion-por-confianza). Regla: NO pitchear Free contra TimeTree que le funciona. Hanoy NO cuenta para umbral Experimento #1 (referida). Lead: `docs/ventas/leads/LEAD-008-medina.md`. Flag metodologico: usamos seguidores IG como proxy de volumen y nuestra propia tesis dice que el ICP es invisible online — estimar en voz alta, no descartar por redes. UNIMED: amarre SIGUE pendiente = riesgo #1. #99 Yeni sigue sin hacerse. Ver Sesion 14 Jul al final.)
> Update previo: 13 Jul 2026 TARDE (LUNES, 2da parte — **UNIMED: inbound cerrado en precio $11.5 × 20 medicos = $230/mes, la cuenta mas grande de la historia**. Clinica grande, 20 medicos, sistema propio (desarrollo interno) para expedientes/registros; ellos ya descartaron construir recordatorios "por costos" (build-vs-buy resuelto a nuestro favor = BATNA debil de ellos). Negociacion: Diego $20 → ellos $8 → cierre $11.5 los primeros 20, SIN mes gratis; leccion de proceso registrada en [[pricing-costo-marginal]] (piso $300 nunca se confirmo pre-llamada). **Modelo operativo resuelto: usaran OrionCare ESPECIFICAMENTE PARA AGENDAR** (su sistema = expedientes; separacion limpia, NO doble captura), **recepcion CENTRALIZADA** opera (pocas personas a entrenar, dueño natural del inbox), integracion "interesante pero no necesaria" = **CERO desarrollo** (estimado API archivado en el lead: ~8-12h si algun dia la piden; create/update-appointment ya hacen el 80%). Falta la LLAMADA DE AMARRE: fecha de arranque + primer pago + Meta aparte + medico 21+ al mismo $11.5 + nombre de la lider de recepcion + horarios en planilla. NO registrar como cliente hasta esa llamada. Lead completo: `docs/ventas/leads/LEAD-007-unimed.md`. Señal estrategica: institucion con equipo dev propio compro exactamente UNA cosa = recordatorios → 3ra confirmacion independiente del CVP core. Ademas hoy: arbol de llamadas rediseñado como arbol literal (mismo link artifact) + objecion "apps baratas/AgendaPro" agregada con la cuña (numero propio + slot liberado, $40 no se negocia); analisis AgendaPro: no aparecio en el censo batch 1 → fantasma de pricing, no competidor real (tope 50 msgs/mes queda corto justo donde empieza el dolor). Ver Sesion 13 Jul (cont.) al final.)
> Update previo: 13 Jul 2026 (LUNES — **EXPERIMENTO #1 BATCH 1 EJECUTADO**: Diego hizo 28 marcaciones el sabado 11 Jul SIN esperar #99 (decision correcta — la accion le gano al proceso; el "congelar cola" era salvaguarda, no bloqueo). Funnel: 28 marcaciones → ~9 contactos reales → 3 vivos → **1 visita agendada (Dra. Karen Murillo, MARTES 14 Jul)**. Registro completo en `docs/ventas/registro-llamadas-experimento1.md` + kit de visita en `docs/ventas/kit-visita-karen-murillo.md`. **Censo de campo: la mayoria de los contactados maneja su agenda A MANO y ELLOS MISMOS, sin software** — tesis "ICP invisible online / sin PMS" CONFIRMADA; PMS detectados: Dentalink ×1, ex-Dentalink insatisfecho ×1 ("engorroso"), Zendy ×1. Karen = bandera amarilla (sola, sin software, PERO poco flujo + "no tardaba mucho" + pacientes confirman en 2-3h → dolor bajo probable) → visita reencuadrada como discovery+censo+practica de demo, cierre solo si aparece gancho, descarte digno pre-autorizado. **Filtro ICP gana 3ra pata: volumen suficiente para que duela (~10+ citas/mes; Wilmer 15-20 = calibracion del dolor-tiempo)** — no se pregunta, se estima. Predicciones de Diego PRE-registradas: "Yeni no siente dolor" (test = si PAGA, no lo que declare). Umbral del experimento va 25-30% ejecutado, ritmo BUENO (1 visita con solo ~9 contactos). NO concluir pivote a mitad de experimento. Ver Sesion 13 Jul al final.)
> Update previo: 11 Jul 2026 (VIERNES — sesion corta de preparacion del Experimento #1, sin decisiones de negocio nuevas. Diego esta limpiando la lista de llamadas. Asset nuevo: **arbol de decision visual de la llamada fria** en `docs/ventas/arbol-llamadas-experimento1.html` (artifact publicado: https://claude.ai/code/artifact/f336fdc5-3452-4f4f-8d5c-ddbaaab37755) — 100% derivado del guion pre-registrado del 9 Jul, cero reglas nuevas; codigo de color por veredicto (verde califica / ambar bifurca-2do escalon / rojo descarte-censo), frases habladas en italica, ramas explicitas para "contesta la asistente" y "tengo secretaria". #99 (llamada Yeni) SIGUE sin hacerse = arbol de decision del experimento sigue EN SUSPENSO y la cola sin congelar. Ver Sesion 11 Jul al final.)
> Update previo: 9 Jul 2026 NOCHE (3ra sesion del dia — **40% TEST DE WILMER EJECUTADO: rama A NO dispara** (P1 "estaria afectado... buscaria otra app" = algo-afectado bajo la rubrica; el PROBLEMA quedo validado como must-solve pero la DIFERENCIACION es tibia; veredicto del arbol EN SUSPENSO hasta #99). Loop colegas MUERTO (colega 1 plaza gobierno/pocas citas, colega 2 embarazo). **P2 dio el pitch cuantificado: "hasta 1 HORA del fin de semana mandando los recordatorios de la semana a mano"**. P3: ICP segun Wilmer = medico que trabaja SOLO en su consultorio; su silla-compartida es "situacion atipica" → filtro silla-compartida pierde soporte. P4: numeros extranjeros sin soporte → libro de demanda. Registro completo en `docs/ventas/guion-40-test.md`. DECISION: NO pivote — falsa dicotomia; **Experimento #1 con filtro P3 ES el test de pivote mas barato**; el test hair-on-fire real de Consultorio Familiar = si Yeni PAGA (preferencia revelada, pre-registrado: paga sin friccion = señal CVP positiva del gancho no-shows; se resiste = rama B). **ASSETS DEL EXPERIMENTO CONSTRUIDOS HOY:** (1) scraping doctoresdehonduras.com → `docs/ventas/leads/directorio-dhn-index.csv` (973) + `directorio-dhn-detalles.csv` (208: 148 dental, 21 derma, 39 pediatria; 45 dental-TGU confirmados, 43 con celular; solo 4 con web propia — universo invisible online, consistente con perfil-Wilmer); (2) `docs/ventas/guion-llamadas-experimento1.md` = flujo de llamada completo (exito = visita con fecha o descarte <3 min; P2a corregida: **el recordatorio manual ES el ladrillo, el planton es 2da sonda** — Wilmer con 3.1% no-show habria sido descartado por la pregunta de planton; rama con-secretaria = 2do escalon con pitch cita-rescatada+continuidad NUNCA "libere su tiempo" (costo hundido); censo por llamada: 3 mundos + PMS S/N; #1 SOLO dental, derma/pediatria = Experimento #2 en fila). Consultorio Familiar: acceso admin propio `admin@consultoriofamiliar.com`, secretaria = **Elena Pineda Carcamo +504 9782-5738**, linea clinica +504 9768-2454 como canal respaldo; hoja de llamada Yeni lista (cobro $35 primero SIN retroactivo, se DICE no se pregunta; Yeni pidio que Diego la llame pronto). Censo barberia: citas por WhatsApp + cero dolor + dolor real = mano de obra → NO ICP, confirma que conducta sola no califica. Ver Sesion 9 Jul NOCHE al final.)
> Update previo: 9 Jul 2026 (JUEVES — LIBRO "THE EXPERIMENTATION MACHINE" LEIDO COMPLETO + diseño del primer experimento pre-registrado. Veredicto del libro aplicado a OrionCare: PMF nivel NASCENT; el hueco central es que NUNCA medimos si el CVP es hair-on-fire — el patron 1-cliente-por-canal es consistente con CVP tibio, no solo con canales sin empujar. Decision: NO pivotar aun; correr primero el **40% test de Sean Ellis** (+3 follow-ups Superhuman) con Wilmer y la secretaria de Consultorio Familiar — guion guardado en `docs/ventas/guion-40-test.md`, Diego agenda llamada ~10 Jul. **Arbol de decision PRE-ACORDADO** (A: pasa → Experimento #1; B: tibio en ambos → conversacion de pivote con datos; C: loop colegas avanzo → salta la fila). **Experimento #1 spec v2** (correccion de Diego: lista sucia mide la lista, no el pitch): 2 etapas — filtro de escritorio + calificacion conductual en primeros 60s de llamada ("¿quien lleva la agenda?"/"¿comparten consultorio?"); n=20 llamadas CALIFICADAS (~40-50 marcaciones); exito ≥3 visitas y ≥1 cierre; bonus = censo TAM real ("ir a CONTAR" pendiente desde 30 Jun). Hallazgo: `Investigar ICP.xlsx` tiene el **score INVERTIDO** para perfil-Wilmer (lista de era motor-$150: puntua alto ads/web/staff = problema ya resuelto; el ICP real es invisible online → listas IG mejor materia prima; torres = cardumen). Chequeo SQL Consultorio Familiar: VIVO — secretaria 17 views/4 dias (ultimo 8 Jul), ciclo completo conf→r24h→followup→auto-cancel funciono SOLO el 8 Jul, 12 citas futuras hasta 9 Sep; flags: 3 citas de agosto con hora de madrugada (probable error AM/PM de captura, corregir) y #95 facturacion MAS urgente (uso confirmado = conversacion segura). Ver Sesion 9 Jul al final.)
> Update previo: 8 Jul 2026 (MIERCOLES — sesion sin decisiones de negocio nuevas: se redacto un post para r/SaaS pidiendo feedback externo sobre adquisicion, y ese ejercicio forzo a precisar 3 hechos historicos que quedan corregidos en memoria. (1) Medilaser $75/mes vino del canal ADS (no de un canal sin registrar) — otra ciudad, aparentaba multi-recurso; churn por combo: comunicacion pobre con el medico (poco tiempo), la asistente actuo como barrera en vez de apoyo, sin Coexistence activo, problema con su linea principal → pidieron el numero de vuelta y desaparecieron. (2) CDA murio por hallazgo real en la reunion/2da visita (solo ~5 especialistas externos, espera ≤24h, dolor no significativo — mismo patron que otras clinicas de planta de la caza del 4 Jul), NO por el malentendido inicial de que el jefe no vio la demo. (3) Skin Medic $150 confirmado consistente con el post-mortem ya guardado (falta de Coexistence en la migracion). **Hallazgo consolidado nuevo (el mas importante de la sesion): en 6 meses se cerraron 4 clientes pagos, UNO POR CADA CANAL PROBADO** (ads→Medilaser $75, llamadas frias→Wilmer $35 [unico activo], presencial→Skin Medic $150, WhatsApp frio→Ecoclinicas $35) — 3 de 4 con churn, y NINGUN canal tiene mas de 1 conversion, o sea ningun canal esta probado como repetible todavia. Post completo redactado (en scratchpad de sesion, no en el repo) — pendiente que Diego lo publique en r/SaaS y traiga los comentarios. Ver Sesion 8 Jul al final.)
> Update previo: 6 Jul 2026 (LUNES — CDA MURIO (jefe sin interes, dolor delgado ~4 especialistas) + sesion completa de analisis de datos SQL sobre Wilmer y Consultorio Familiar. Hallazgo mayor: el pitch "no pierdas pacientes nuevos" NO tiene respaldo en ningun caso de estudio real — 94.5% de las citas de Wilmer las agenda el mismo manualmente, y las 7 que se autoagendaron via bot eran TODAS pacientes ya existentes, cero leads nuevos. ICP redefinido con 2 ganchos segun perfil: tiempo administrativo (Wilmer, pocos no-shows) vs reduccion real de no-shows (Consultorio Familiar, 19.6% auto-cancelado vs 3.1% de Wilmer). Comparacion N=2 confirma que el producto SI genera uso real en contextos distintos (no es solo timing/personalidad de Wilmer), pero el dolor que resuelve varia. 2 bugs tecnicos documentados (acentos rompen FAQ matching; texto libre en booking_select_hour da hora incorrecta) para post-freeze. Playbook de analisis de bot actualizado (gotcha de intent='confirm'). Ver Sesion 6 Jul al final.)
> Update previo: 5 Jul 2026 (DOMINGO pre-CDA — WAR-GAMING COMPLETO + BASE RATE DE CAMPO. Fin de semana: DKapilar NO contesto (sabado), Stacy MIA, Lumina nunca abrio. Caza 4 Jul: 6 clinicas, **0 con dolor agudo de coordinacion** → clinica-hub = OPORTUNISTA (~1/10), pitch default de calle vuelve al CORE; insight Dental Integral: externos CON asistente propia = sin dolor (pregunta de validacion para CDA); leccion Dental Smart: recien-instalo-PMS = descalificador temporal + **Dentalink SI envia desde el numero de la clinica** (pregunta trampa del numero RETIRADA). REFRAME CDA: **cierre-en-el-momento — "el paciente no se va sin fecha"**; demo = escena de 60 segundos; metrica = referidos que salen con cita el mismo dia; calculadora → referidos × ticket especialista. Kit actualizado (5 cambios). Escenario B war-gamed completo: playbook 80/20 (top 2-3 especialistas) + calendario compartido solo-ocupado + circuito calendario con estimados; regla nueva: **medico viewer o switcher, NUNCA dual-maintainer**. #85 RESUELTO (codigo ya en main via PRs #67-72; rama solo 3 commits docs). Pendiente unico pre-lunes: #84 linea Orthos + imprimir calculadora. Ver Sesion 5 Jul al final.)
> Update previo: 3 Jul 2026 (VIERNES — STACY FRIA + HALLAZGO CDA + PRECIO EN LA SALA. Stacy: page_views eran de Diego, ella probablemente nunca entro, 0 respuestas — leccion: acceso entregado ≠ demo hecha, el pitch entro por agenda/recordatorios y su dolor era coordinacion. Lumina planton. PATRON DE LA SEMANA: 4 leads muertos en el "2do toque" → regla nueva: TODO se cierra en la primera visita. Caceria 3 Jul: **Centro Dental Avanzado (CDA)** = 5 sedes, Dentalink, coordinan medicos por llamada/WhatsApp (sin TimeTree), **24h para cuadrar cita**, champion asistente-medico, REUNION CON EL JEFE LUNES 6 JUL. Auditoria de plataforma a fondo: lista para piloto 1 sede; 3 gaps no-prometer (sin push cita-nueva al medico, sin sync cross-org, agenda=lista del dia); OrgSwitcher multi-org YA existe → multi-sede = org-por-sede; rama 12 commits adelante de main (#85 urgente). PRECIO DECIDIDO: $150/sede, mes 1 gratis con metrica pactada (24h→minutos), dicho EN LA SALA tras calculadora a lapicero; escalera en el bolsillo ($40/medico si operacion chica). Kit completo en `docs/ventas/kit-cda-lunes.md`. Ver Sesion 3 Jul al final.)
> Update previo: 2 Jul 2026 TARDE (CASO STACY RECINOS → modelo CLINICA-HUB + demo Orthos EJECUTADO. Grecia NO aparecio a la instalacion (2do no-show, ultimo mensaje enviado, pelota en su cancha). Lumina reagendo al VIERNES via el bot. CDH sin visitar. Hallazgo de campo mayor: Stacy Recinos paga Dentalink Y usa TimeTree para coordinar medicos externos (llamada telefonica por cada procedimiento) → pidio demo. Decisiones: unidad que paga = LA CLINICA (1 Pro) + medicos externos free (loop: el free empuja a sus otras clinicas); free = single-player ilimitado, pago = invitar + recordatorios; add-on $35/calendario MUERTO; $40 NO se baja; cuña vs Dentalink corregida (SI tiene recordatorios WhatsApp — cuña real = numero propio + conversacion + coordinacion externos); bot fuera del pitch (pero ON en demo Orthos). Demo Orthos configurado completo via SQL (sillon=RECURSO, linea Demo Bot movida — rollback documentado). Ver Sesion 2 Jul TARDE al final y [[orthos-demo-stacy]].)
> Update previo: 2 Jul 2026 (INSTALACION GRECIA / SMILE DESIGN en marcha. Grecia no contesto confirmaciones (3 toques, regla: no 4to; silencio matutino ≠ no) → decision ir igual (15 min de distancia, asimetria clara). Durante el onboarding: org **Smile Design** creada (`40bd31f5-51b5-4abb-b448-5c81029dabd8`), Grecia = admin+doctora (`greciarodriguez@orioncare.app`); Diego llevo cuenta propia admin+doctor para preparar todo. **DKapilar (nombre correcto, antes "Capilar") reprogramada para SABADO** — mensaje enviado; hoja de prep seguridad #66 pendiente ANTES del sabado. Wilmer: cero contacto (loop respira solo, check-in natural lun-mar prox semana). Diego durmio bien → riesgo capacidad bajo. PENDIENTE CONFIRMAR: resultado final de la instalacion. Ver Sesion 2 Jul al final.)
> Update previo: 1 Jul 2026 (LOOP DE WILMER DISPARADO + tiers Free/Pro + Dentalink descartado. Wilmer confirmo que comparte silla con **2 profesionales mas** (uno "poco" movimiento) + usa **TimeTree con una colega**; Diego le pitcheo "TimeTree + nuestra plataforma", le ENCANTO, dijo que hablaria con sus colegas esta semana para ver como lo pagan y unirse — free tier ya comunicado a Wilmer. **= el loop #71 disparandose SOLO/organico con nuestro N=1 feliz como semilla; silla-compartida pasa de N=1 a potencialmente N=3.** Modelo de tiers para combatir "todo o nada": **Free** = calendario compartido (reemplazo TimeTree) + **Pro $40** = recordatorios+bot; el free es la mercancia que TimeTree YA regala (no se regala valor), el valor pago queda intacto → guardas: (1) no anclar $40 contra free — vender vs paciente-perdido/secretaria; (2) free-como-motor-viral DEPENDE del self-service #73 (diferido) → piloto Wilmer = provision MANUAL. Filtro ICP mas afilado: **"usa TimeTree + otro calendario X"** (TimeTree solo reserva la silla, las citas propias van aparte = malabarea 2 apps = dolor agudo; el motor ya las une). "Por que no Dentalink": mercado ya voto (7/10 TimeTree no Dentalink → switching-cost ~0 xq RECHAZARON el PMS), trabajo distinto (expediente vs agenda+comunicacion), dental-only vs ICP vertical-agnostico, asume clinica de sede fija, terreno del competidor — **TimeTree Y Dentalink fallan en lo MISMO: no le hablan al paciente desde el numero del medico = nuestra cuña**. Capacidad: Diego durmio 4.5h por emocion → **mañana SOLO instalacion Grecia, Capilar reprogramada 2-3 dias** (decision de CAPACIDAD, no evitar-por-tesis; sin reloj financiero, +$15/mes). Ver Sesion 1 Jul al final.)
> Update previo: 30 Jun 2026 (cont.) — DESCUBRIMIENTO DE SEGMENTO. 3 leads de campo (Jensi itinerante; Capilar = champion 4-medicos, LEAD MAS CALIENTE, mensaje mañana 6pm; Montserrat expediente = mismatch) + gap analysis del codigo abren una tesis: el incumbente real NO es Dentalink, es **TimeTree** (7/10 medicos contactados lo usan) — gratis y mudo. **"Usa TimeTree" = filtro de ICP por conducta** (proxy de "situacion Wilmer", switching-cost ~0). Mercado = subarriendo de espacio clinico (Airbnb de cubiculos): compartir silla (el CUARTO limita → motor co-working) e itinerancia (el MEDICO limita → agregacion de calendarios) = 2 ejes del mismo mercado; OC ya respeta ambos, solo falta "bloqueo sin paciente" (hack placeholder = pilotear con 0 codigo). El motor co-working revive con este fit. Precio: NO bajar $40 (sesgo costo-marginal); reframe vs paciente-perdido/secretaria + mes gratis. RIESGO: teorizamos sobre 2 anecdotas → ir a CONTAR (mini-tarjeta 3 preguntas). Ver Sesion 30 Jun (cont.) al final. Detalle en [[timetree-incumbente-filtro-icp]].)
> Update previo: 30 Jun 2026 (CORRECCION DE DATOS + PRIMERA CACERIA ICP REAL. Tres hallazgos que mueven la estrategia: (1) El "Wilmer usa 10% / le da igual el bot" es FALSO — datos: 121 citas recurrentes, bot activo 245 logs/42 sesiones los 5 meses, recordatorios+confirmacion intensivos; lo que NO usa es la capa cara (inbox/calling/promos/motor multi-recurso). Wilmer ademas es DENTAL. (2) Cash flow real = +$15/mes, no -$30: unico costo operativo = Claude $20. (3) Diego salio a la calle 29 Jun (Edificio Artemisa + dentales) = primeras conversaciones ICP reales desde 1 Jun; el motor multi-recurso $150 NO salio ni una vez, el mercado vota SIMPLE + DENTAL. Decisiones: dental = beachhead candidato, regla "no feature vertical sin 3+ clientes pagando aparte de Wilmer", primer-mes-gratis = enganche, asistentes = puerta (ya no bloqueo). Reddit muerto como canal ICP (prediccion confirmada). Ver Sesion 30 Jun al final.)
> Update previo: 27 Jun (RE-EXAMEN DE TESIS DE NEGOCIO. Diego cuestiona si el ICP clinica multi-recurso es demasiado complejo. Insight clave: Wilmer (unico cliente feliz, $35) usa ~10% de la plataforma (calendario+recordatorios), no le importa el bot — el pivote al motor $150 abandono la unica config validada. La ADQUISICION siempre fue el cuello de botella, no el producto; Wilmer llego a-pulso (canal menos escalable). 3 modelos: A vertical SaaS, B horizontal mismo-motor, C agencia/bespoke=TRAMPA solo. Decision: smoke test de demanda barato. Diego eligio regalar 1 landing page en Reddit; COO recomendo ad FB targeteado + hermana (hotel=ICP caliente) como canales superiores. Post de Reddit reescrito (gratis, sin venta, con calificacion). Resultados pendientes. Ver Sesion 27 Jun al final.)
> Update previo: 15 Jun (semana muerta + reframe motor de crecimiento = caceria concierge, NO funnel de ads)
> Update previo: 2 Jun (decision construir el motor multi-recurso como producto real)
> Updates historicos en `estado-estrategia-historial.md`

---

## Dashboard

| Metrica | Valor |
|---|---|
| Clientes activos | **3** — Guevara $35 (ancla) + **Hanoy Medina $15** (cerrada 18 Jul: $15+ISV+Meta aparte, mes 1 gratis → factura desde ~21 Ago; instalacion 21 Jul PM; 3 inquilinos en tier Free) + Yeni Ramos/Consultorio Familiar $35 (revivido 28 Jun; verificado 9 Jul: secretaria activa al 8 Jul, ciclo recordatorios→auto-cancel funcionando solo, 12 citas futuras hasta 9 Sep). Paredes/David marcados perdidos 22 Jun SIN VERIFICAR con logs (mismo falso-negativo que Yeni — pendiente revisar); Skin Medic perdido 27 May (confirmado) |
| MRR facturado | **$70** hoy ($35 + $35, facturacion Consultorio Familiar por confirmar); **$85 desde ~21 Ago** cuando Hanoy termine su mes gratis |
| MRR efectivo | **$70** |
| Hito real Q2-Q3 2026 | $1,500/mes paz mental → faltan **$1,415** (con Hanoy); **$1,185 si UNIMED amarra el lunes** |
| Cliente top | Guevara ($35) — DENTAL, caso de estudio, NPS 9.5, usa el core completo. **CORRECCION 6 Jul:** el pitch "no pierdas pacientes nuevos" NO tiene respaldo — 94.5% de citas las agenda el mismo manualmente, los 7 autoagendados via bot eran TODOS pacientes ya existentes. Valor real = ahorro de tiempo administrativo, no captura de leads |
| Pipeline | **Actualizado 18 Jul:** 🔥 **UNIMED $230/mes — respuesta LUNES 20 Jul** (Omar Diaz reporto atraso; bandera: "la respuesta" suena a decision pendiente, no logistica; plan 2 ramas pre-acordado). Karen Murillo en NURTURE (trigger: contrata su agencia de marketing). Inquilinos Hanoy ×3 = upsell futuro Pro $15 (test pre-registrado, no tocar hasta que usen el Free). **Previo 6 Jul:** 💀 **CDA MUERTA** (dolor de coordinacion delgado — solo ~5 especialistas externos, espera ≤24h, no significativo; confirma base rate ~1/10 de la caza 4 Jul). MUERTOS/FRIOS: Stacy (MIA), Grecia (2 no-shows), Lumina, CDH, DKapilar (no contesto sabado). Unica candidata viva: **Dental Roque** (dolor-producto core verbalizado, caza 4 Jul) — sin visita agendada. ICP redefinido con 2 ganchos: tiempo administrativo (perfil Wilmer) o reduccion de no-shows (perfil Consultorio Familiar, 19.6% auto-cancelado). Wilmer loop silla-compartida: check-in aun pendiente. |
| Canales — historial 6 meses (8 Jul) | **4 clientes cerrados, 1 por cada canal probado, ningun canal repetible aun:** ads→Medilaser $75 (churn), llamadas frias→Wilmer $35 (unico activo), presencial→Skin Medic $150 (churn), WhatsApp frio→Ecoclinicas $35 (churn por inactividad). Ver [[canales-adquisicion-sin-repetibilidad]]. |
| Experimento #1 (14 Jul) | **EN MARCHA — batch 1 ejecutado + visita #1 hecha:** 28 marcaciones → ~9 contactos → 3 vivos → 1 visita (Karen Murillo 14 Jul: **no-cierre digno → NURTURE**, trigger = cuando contrate su agencia de marketing; precio por escrito sale HOY). Bonus fuera de umbral: **referida Hanoy Medina, cita SAB 18 JUL** (`docs/ventas/leads/LEAD-008-medina.md`). Registro: `docs/ventas/registro-llamadas-experimento1.md`. Umbral (≥3 visitas + ≥1 cierre / n=20 calificadas) sigue vivo, ~25-30% ejecutado, ritmo BUENO. Quedan ~15-17 dental-TGU en CSV + reintentos + Chinchilla re-cola + listas IG (#100). Correcciones batch 2: filtro escritorio ANTES (7/28 quemadas en "clinica grande") + censo 3 mundos. Congelado durante el experimento: cero ads, cero features |
| Ads | PAUSADOS — pero ad FB targeteado $20-30 recomendado como canal del smoke test |
| Cash flow real | **+$15 a +$50/mes** — Wilmer $35 seguro + Yeni $35 (facturacion por confirmar) − $20 Claude (unico costo operativo). Hanoy suma +$15 desde ~21 Ago |
| Hanoy — uso real (22 Jul) | **CONFIRMADO activo, sesion espontanea sin empuje:** 4 citas creadas, 3 pacientes cargados. Paginas top: agenda-semanal (10), citas/nueva (8), inbox (6), pacientes (4), agenda-secretaria (4). Bot OFF segun plan (calibracion 1 semana) |

## Pivot 18 May — Centro de Atencion (resumen)

- Modelo viejo "OrionCare toma el numero" murio el 16 May (asistentes no ceden WhatsApp)
- Nuevo modelo: asistente sigue dueña del numero, OrionCare es centro de atencion (inbox + llamadas + agenda + promos)
- Habilitador: WhatsApp Business Calling API GA via Meta Cloud directo
- Filosofia operativa: bot maximizado, asistente fallback. Pitch externo: "asistente potenciada".
- Detalle completo en `estado-estrategia-historial.md` (UPDATE 18 May)

## Sprints MVP Centro de Atencion

| Sprint | Estado | Notas |
|---|---|---|
| 0 — Schema | ✅ 18 May | 4 tablas + bucket Storage + RLS + 17 service_types |
| 1 — Persistencia + bot dual mode | ✅ 18 May | 5 functions deployadas, conversation tracking |
| 2 — Multimedia + transcripcion | ✅ 18 May | Whisper español, audios ~3s, $0.002 total |
| 3 — Frontend Inbox | ✅ 18 May 23:30 | Inbox + InboxContext realtime una-fuente-verdad |
| 4 — Quick replies + multimedia outbound | ✅ 19 May | Picker composer + upload archivos. QA aprobado. |
| 5 — Promociones del mes | ✅ 19 May PM | Panel admin con mockups Stitch + bot matching escalonado con keywords + FAQ override + destacada del mes + matcheo natural en menu comprimido + cron diario lifecycle. Magic bytes fix para imagenes. QA SQL aprobado. |
| 6 — Calling API (simplificado) | ✅ 20 May | Calling end-to-end (inbound + outbound + queue + permission flow + softphone WebRTC) en 1 dia, 5 sem antes plan. Refactor CallContext + 3 fixes UX. |
| 7-8 — Pilot + lanzamiento | revisar | Decision 19 May: inbox-only Torre Zafiro 25 May |

## Decisiones tomadas 19 May

### Estrategia lanzamiento Torre Zafiro
1. **NO llamada / NO mensaje a Dulce** antes del 25 May. Silencio total. Vamos directo con producto.
2. **Instalacion 25 May: inbox-only, bot DESACTIVADO.** Dulce trabaja 1 semana normal capturando data real.
3. **Bot se entrena con respuestas reales de Dulce** — "duplicar virtualmente a la asistente".
4. **Activacion gradual del bot** desde 8 Jun: fuera horario primero, escalado.
5. **Calling entra el dia 8 Jun en simultaneo** si la primera semana alcanza tier orgánico (ver siguiente seccion).

### Tier WABA — hallazgo critico de la sesion

Investigacion completa via API:

- **Todos los clientes pagos en TIER_250** (Ecoclinicas, Guevara, Yeni). Inicial sin Business Verification.
- **Medilaser confirmado desconectado** — API responde 400 sobre el phone_number_id (sin permisos)
- **OrionCare Demo Bot:** verified con limite **2K mensajes/dia** — herramienta de ventas para demos calling outbound HOY
- **Cada cliente tiene SU PROPIO Business Portfolio** (5 portfolios distintos: Ecoclinicas2, Meat Lab, Consultorio Familiar, OrionCare, Medilaser BOT). Tier NO se agrega entre clientes — cada uno aislado.
- **Limite Meta: max 5 phone numbers por WABA** — razon arquitectonica de "cada clinica su propia WABA"

**Inbound vs Outbound:**
- Inbound (paciente llama) → no requiere tier alto, funciona en TIER_250 desde dia 1
- Outbound via API (clinica llama paciente) → requiere ~2K conversaciones/dia (tier_1K+ con Business Verification)

**Path para clientes nuevos (Mendoza et al):**
- Path 1: Business Verification (RTN, escritura, factura — 5-15 dias) → salto auto a TIER_1K
- Path 2: Crecimiento organico = 125 conversaciones/semana × 7 dias con quality GREEN → upgrade auto en 6h

**Plan operativo Mendoza:** vamos con el numero PRINCIPAL (no el de respaldo). Volumen alto del numero principal cumple 125 conversaciones la primera semana. La oferta a la doctora: "primera semana de calibracion sin llamadas via WhatsApp Cloud, al dia 8 se activa todo en simultaneo". El plan inbox-only ya cubria esa semana — sin sacrificio adicional.

### Recalibracion de estimaciones
- Mis estimaciones originales asumian "Diego solo, 3-4h/dia, padding humano". Reales con Claude codificando + Diego QA: **~75-80% mas rapidos** en sprints solo-codigo (Sprints 0-3: 9h reales vs ~30-40h planeadas).
- **Regla:** sprints puro-codigo → dividir mi estimacion por ~4. Sprints con UX/integracion externa → mantener estimacion.

### Memoria corregida 19 May
- "Marleny Vargas" no existia — era el segundo nombre de **Carla Marleny Paredes** (propietaria Medilaser).
- **Kener** es la asistente de Medilaser, actualmente desconectada.
- **Yeni Ramos** confirmada como doctora del Consultorio Familiar.

## Decisiones estrategicas a mediano plazo (19 May)

### Especializacion vs diversificacion — hoja de ruta acordada

| Periodo | Postura |
|---|---|
| **May-Oct 2026** | Especializacion en medico. Coherencia caso estudio Wilmer+Mendoza+Medilaser. ICP unico = edificio medico con asistente champion. |
| **Octubre 2026** | Piloto UN cliente no-medico (dentista o estética — cercano cultural y operativamente). Validar producto-horizontal sin tocar codigo. |
| **2027+** | Decision grande con data: Camino A (medico vertical profundo, plataforma $140-160 con historial) vs Camino B (horizontal multi-rubro, $60-85 cualquier negocio servicio). |

**Decision tecnica derivada:** mantener **codigo agnostico al rubro** mientras se pueda. Variables, copys UI, prompts del bot en lenguaje generico ("tu negocio", "tus clientes") cuando no haya razon para ser especifico. Si en Oct se decide horizontal, no hay reescritura. Si se decide vertical, se agregan features encima. Ver [[codigo-agnostico-rubro]].

### Pricing — diferido

Diego decide pensarlo con cabeza fresca. Insight clave para cuando vuelva:
- El problema NO es inventar justificacion del precio. Es vender desde **outcome** (resultados financieros) no **feature** ("WhatsApp Web bonito")
- Outcome candidato: "menos pacientes perdidos por no contestar" + "tu asistente recupera 2-3h/dia" + "menos quejas"
- Caso de estudio Mendoza post-semana-1 = munición para vender el upgrade $40→$60
- Ver [[pricing-desde-outcome]]

### Plataforma medica completa $140-160 — Q1 2027 tentativo

Esta vision sigue viva pero diferida. Razones:
- 100 clientes × $150 = $15K MRR (supera hito $7K original con menos del 30% de clientes)
- Sustituir plataforma actual de Mendoza = 2x precio con valor demostrable
- Pero: compliance medica, migracion datos, soporte intensivo
- Pre-requisito: centro de atencion completamente "fire-and-forget"

**Recon Mendoza durante visita 25 May:** observar fisico (papel/digital), digital (software abierto en PC asistente), conversacional ("¿como lleva las citas?"). Anotar competencia HN identificada para futuro.

### Fire-and-forget — medicion postponed

Diego decide NO medir horas-soporte/cliente HOY (plataforma muy volatil, baseline no confiable). Acordado: **post-Mendoza ~Ago-Sep 2026** se establece baseline con producto estable.

Senal positiva existente: **Wilmer = 2 meses sin tocar, feliz** con calendario+notificaciones. Fire-and-forget logrado en el nivel actual del producto. Pendiente que el centro de atencion alcance el mismo nivel.

## Riesgos activos

1. **ALTO:** Bug critico encontrado por Dulce semana 1 quema oportunidad. Mitigacion: QA full sabado 23 + battle-test con Demo Bot verified jue/vie 21-22. Sprint 6 cerro en 1 dia → calling NO tiene horas reales de uso, bandera amarilla.
2. **MEDIO:** Capacidad Diego <3h/dia. Mitigado parcial — estamos adelantados al cronograma (Sprint 6 cerro 5 sem antes).
3. **MEDIO:** Mendoza no alcanza 125 conversaciones/semana — fallback Business Verification (5-15 dias).
4. **MEDIO:** Pacientes con WhatsApp viejo no reciben Business Calling. Investigar % adopcion semana 1.
5. **BAJO:** Tarifa Honduras outbound mas alta de lo estimado — confirmar dashboard cuando se active calling.
6. **BAJO:** Pricing $60 base no aterriza con doctores — diferido, depende del pitch desde outcome.

## Tareas activas

- [ ] **#4** Diseñar pitch a la doctora de Mendoza con framing "calibracion semana 1 + activacion completa dia 8" (incluye opcion Business Verification)
- [ ] **#5** Confirmar tarifa Honduras outbound dashboard Meta (cuando se active calling)
- [ ] **#6** Disenar pricing 3 tiers + materiales venta (diferido — depende del pitch desde outcome)
- [ ] **#7** Recon competencia HN durante visita Mendoza 25 May (observar plataforma actual)
- [ ] **#8** Disenar feature "Promociones del mes" (Sprint 5)
- [ ] **#14** Sprint 4 Quick Replies (hoy)
- [ ] Sprint 5 Promociones del mes
- [ ] Sprint 6 Calling API simplificado (inbound + UI, softphone diferido)
- [ ] Configurar Torre Zafiro en DB pre-instalacion
- [ ] QA full inbox-only sabado 23 May
- [ ] Mantener Demo Bot funcional como herramienta de ventas permanente

## Proximos pasos semana 19-25 May

| Dia | Trabajo | Responsable |
|---|---|---|
| Mar 19 (hoy) | ✅ Sprint 4 + 5 + 5.1 cerrados (quick replies + multimedia + promociones con magia) | Claude + Diego QA |
| **Mie 20** | Sprint 6: Calling API simplificado (webhooks inbound + UI llamadas en inbox + softphone WebRTC) | Claude / Diego QA |
| Jue 21 - Vie 22 | Sprint 6 finalizar + bug fixes Sprint 4-5 si aparecen | Claude / Diego QA |
| Sab 23 | QA full. Configurar Torre Zafiro en DB. | Diego |
| Dom 24 | Bug fixes finales. Briefing operativo. | Claude / Diego |
| **Lun 25** | **INSTALACION Torre Zafiro — inbox-only, bot OFF, calling OFF** + recon plataforma actual | Diego presencial |

## Proximas 4 semanas (25 May - 21 Jun)

- 25 May - 1 Jun: Dulce trabaja normal. Monitor conversaciones + bug fixes. Quality rating verde mantenido.
- 1-7 Jun: Analisis conversaciones reales. Verificar si Mendoza llego a TIER_1K organicamente.
- 8-14 Jun: Activacion gradual bot + calling (si tier subio). Sino, plan B Business Verification.
- 15-21 Jun: Bot completo activo. Evaluar pricing real con data de uso. Decidir Medilaser/2da ola Torre Zafiro.

## Decisiones nuevas guardadas en memoria

- [[pricing-desde-outcome]] — vender desde resultado, no feature
- [[diversificacion-2027]] — medico 6 meses → piloto Oct → decidir grande 2027
- [[codigo-agnostico-rubro]] — UI/copy genericos mientras se pueda
- [[business-portfolio-aislado]] — cada cliente su propio portfolio, tier no agregable
- [[oncare-verified-demo]] — Demo Bot verified 2K = herramienta de ventas
- [[inbox-only-primera-semana]] — filosofia fine-tuning bot con asistente real
- [[modelo-ownership-multi-doctor]] — 21 May: org=edificio (ficcion logica), owner=OrionCare super-admin, billing por doctor independiente. Gap doctor_subscriptions diferido.
- [[admin-edificio-no-prospecta]] — 21 May: admins NO son canal. Solo champion abre puertas.

---

## Sesion 21 May 2026 — Modelo ownership multi-doctor

**Contexto entrante:** Sprint 6 Calling cerrado 20 May (1 dia, 5 sem antes plan). Adelantado al cronograma. T-4 dias para Torre Zafiro.

**Pregunta de Diego:** ¿a que correo vinculamos el "owner" cuando se conectan multiples doctores? ¿Mendoza tiene el control? Si Dulce o Mendoza renuncian, ¿se llevan control total? ¿Como retiramos?

**Clarificacion clave de Diego:** Mendoza es **doctor-inquilino**, NO propietaria del edificio. Hablar con admin del edificio NO funciono (les tiran la pelota — no ven beneficio). El canal real es la champion (asistente) con multiples doctores inquilinos, cada uno paga independiente.

**Hallazgo del schema actual:**
- `organizations` → `clinics` → `doctors`, con M2M via `org_members`, `calendar_doctors`, `whatsapp_line_doctors`
- Una linea whatsapp puede servir N doctores
- Pacientes pertenecen a org (no a doctor)
- → Schema YA SOPORTA multi-doctor + asistente compartida en una sola organization

**Gap identificado:** `organizations.billing_type` default `'organization'` asume el edificio paga. Modelo real es por doctor. Falta `doctor_subscriptions` con plan/amount/is_active por doctor. **No bloqueador para 25 May** (Mendoza arranca sola). Diferido a Jun-Jul cuando se agregue 2do doctor.

**Decision para Torre Zafiro 25 May:**

| Capa | Quien |
|---|---|
| `organization` | "Consultorio Mendoza - Torre Zafiro" (ficcion logica del edificio) |
| `owner_user_id` | Correo de servicio OrionCare super-admin (NO Dulce, NO Mendoza) |
| `secretary` | Dulce — operacional, sin billing |
| `doctor` | Mendoza — su calendar, su agenda |
| `whatsapp_line` | Una sola, a nombre de la org, usando el numero que ya tiene Dulce |
| Billing | $35/mes a Mendoza directamente, fuera del schema por ahora |

**Beneficios del modelo:**
- Dulce renuncia → revocar user_id, invitar nueva asistente. Cero disrupcion.
- Mendoza se va → deactivar doctor + calendar. Otros doctores (si existen) intactos.
- Diego mantiene acceso siempre via super-admin (custodia formal del workspace).
- Cuando Dulce abra puerta a Dra X en Torre Zafiro → se agrega como doctor en LA MISMA org. Dulce ve inbox consolidado.

**Tareas nuevas derivadas:**
- [x] **#15** ✅ Crear correo de servicio OrionCare como super-admin custodio — **HECHO 23 May**. Email: `admin@orioncare.app` (dominio propio que Diego ya tenia). Stack: Zoho Mail Free para bandeja + ImprovMX NO se uso porque Zoho ya estaba configurado en DNS Vercel desde dic 2025. User en auth.users + public.users + user_roles + superadmin_whitelist. user_id: `6d1dfa3b-b6aa-4235-afd4-e20df1b09158`. Bug encontrado en SuperAdminRoute (requiere 3 filas en DB para que funcione) — workaround SQL aplicado, fix de codigo diferido post-Skin Medic. Pendiente: activar 2FA Zoho si Diego no lo hizo, quitar `dican19+smoketest05@gmail.com` del whitelist cuando confirme acceso estable, decidir que hacer con `admin@dican.com` huerfano.
- [ ] **#16** Disenar `doctor_subscriptions` antes de Jun-Jul (cuando se agregue 2do doctor a un edificio)
- [ ] **#17** Decidir politica de atribucion de costos Meta cuando una linea sirve N doctores (Jun-Jul)
- [ ] **#18** Validar 21-22 May con battle-test del Demo Bot verified que calling/inbox aguantan uso real (Sprint 6 cerro muy rapido, sin horas de campo)

**Pendiente conversar proxima sesion estrategia:**
- ¿El correo de servicio OrionCare ya existe o hay que crearlo?
- ¿Como se presenta el workspace en UI a Dulce? "Consultorio Mendoza" suena raro si ella opera para varios. ¿Mejor renombrar a "Centro Atencion Dulce" o algo neutro?
- Cuando se agregue Dra X, ¿se renombra el workspace o se queda con el nombre del primer doctor?
- Pricing operativo: si Dulce trae 3 doctores al edificio, ¿descuento por volumen al doctor? ¿O cada uno paga $35 full?

---

## Sesion 22 May 2026 — Skin Medic cerrado $150 + revision flujo agendamiento

**Contexto entrante:** T-3 dias a instalacion Torre Zafiro. Diego visito a Dulce y Mendoza el 21 May para pre-aprobacion, lo aprobaron. Durante la espera Diego descubrio que la operacion real NO es "Mendoza + asistente" sino que hay **6 tecnicas adicionales** haciendo procedimientos en paralelo.

### Decisiones tomadas

1. **Pricing Skin Medic cerrado en $150/mes flat** — Diego se arriesgo a romper su techo mental de $40. Mendoza acepto, lo vio "algo elevado" pero confia. Cierre directo, sin demo previo del producto. Tier nuevo "Clinica multi-recurso" creado por este caso. Ver [[pricing-tier-clinica]].

2. **Mendoza entrego credenciales FB** — Diego va a hacer el onboarding tecnico de Meta Business Manager directamente. Trust enorme. Protocolo de manejo guardado en [[credenciales-cliente-protocolo]].

3. **Operacion Skin Medic redefinida como "multi-recurso"** — NO es multi-doctor. Es 1 doctora + 6 tecnicas + Dulce. Pacientes piden procedimiento, no persona. Skill-based assignment es lo que necesitan. Consulta = solo Mendoza, procedimientos = pool con capacidades. Ver [[skin-medic-cliente]].

4. **Filosofia "inbox-only pura" revisada** — La regla "inbox-only, agenda OFF, calling OFF semana 1" murio para Skin Medic. Con $150/mes Mendoza necesita VALOR visible dia 1. Nueva regla: **dia 1 = todo funcional EXCEPTO bot**. Bot OFF sigue, pero agenda + calling + recordatorios + confirmaciones activos. Memoria [[inbox-only-primera-semana]] actualizada.

5. **Flujo perfecto de agendamiento diseñado** — 3 pasos desde chat, autoasignacion default "cualquiera disponible", skill matching, pizarron del dia. Estimado ~25-30h Diego time = 4-5 semanas calendario. NO se construye antes del lunes. Fase Jun-Jul post-observacion. Ver [[flujo-perfecto-agendamiento]].

### Auditoria de plataforma — resultado

Plataforma esta al **85% para Skin Medic dia 1**. Lo que SI existe (multi-calendario sin limite, doctores sin user_id login, recordatorios 24h+3d, confirmacion automatica, calling Sprint 6, promociones Sprint 5, bot ON/OFF + handoff) cubre la mayoria.

**Gaps reales criticos dia 1 (en orden de prioridad):**
1. UI labels "Doctor/Medico" hardcodeados → las tecnicas no son doctoras → 2-3h ajuste
2. Vista combinada multi-calendario NO existe → Dulce tendria que clickear 7 veces → 3-4h version simple
3. Notificacion automatica al cancelar/reagendar NO existe → Dulce avisaria manual → 2-3h

**Gaps diferibles a sem 1-2:**
- Agendamiento desde chat (Dulce va a NuevaCita aparte por ahora)
- Vacaciones/excepciones laborales
- Recordatorio 2h (24h cubre 90%)
- Skill matching automatico (Dulce asigna mental — sabe quien puede que)

### Plan tactico 22-25 May (propuesto, pendiente confirmar mañana)

| Cuando | Bloque | Horas |
|---|---|---|
| Vie 22 PM | Llamada Dulce + crear correo super-admin + guardar credenciales FB | 1.5h |
| Sab 23 AM | Ajuste labels "Doctor"→"Profesional" | 2.5h |
| Sab 23 PM | Vista combinada multi-calendario simple + Setup DB Skin Medic | 5h |
| Dom 24 AM | Notificacion automatica cancelar/reagendar | 2.5h |
| Dom 24 PM | QA full + briefing operativo lunes | 3h |
| Lun 25 AM | Onboarding tecnico in-situ + handoff Dulce | 3h |
| **Total** | | **~14h trabajo concentrado** |

**Opcion de recorte:** si la agenda no aguanta, sacrificar notificacion cancelacion (manual sem 1) → 11.5h. Mas recorte = sacrificar vista combinada → 8.5h pero operacion se complica.

### Entregables de la sesion

1. **`docs/cuestionario-skin-medic-onboarding.md`** — 105 preguntas en 7 partes (A: Dulce, B: Mendoza, C: Diego, D: observacion lunes, E: decisiones derivadas, F: notas libres, G: proximos pasos). Diego lo va a revisar mañana antes de retomar.

2. **Memorias creadas:**
   - [[skin-medic-cliente]] — Caso completo
   - [[pricing-tier-clinica]] — Tier $150 validado
   - [[credenciales-cliente-protocolo]] — Protocolo FB
   - [[flujo-perfecto-agendamiento]] — Diseño para fase Jun-Jul

3. **Memoria corregida:** [[inbox-only-primera-semana]] — Regla revisada para Skin Medic

### Tareas activas actualizadas (post-sesion 22 May)

Anteriores que siguen vigentes:
- [ ] **#4** Pitch a Mendoza framing "calibracion semana 1 + activacion completa dia 8" — **YA NO APLICA** (Diego ya cerro $150 sin demo previo, no hay pitch que armar para vender; lo que queda es comunicar el plan de semana 1)
- [ ] **#5** Confirmar tarifa Honduras outbound dashboard Meta (cuando se active calling)
- [ ] **#7** Recon competencia HN durante visita 25 May
- [ ] **#15** Crear correo de servicio OrionCare super-admin antes del 25 May
- [ ] **#16** Disenar `doctor_subscriptions` antes Jun-Jul (cuando se agregue 2do doctor a un edificio)
- [ ] **#17** Politica atribucion costos Meta cuando una linea sirve N doctores (Jun-Jul)
- [ ] **#18** Battle-test Demo Bot verified que calling/inbox aguantan uso real

Nuevas derivadas 22 May:
- [ ] **#19** Diego revisar cuestionario `docs/cuestionario-skin-medic-onboarding.md` mañana 23 May
- [ ] **#20** Llamada con Dulce — Parte A del cuestionario (40 preguntas operativas)
- [ ] **#21** Conversacion con Mendoza — Parte B del cuestionario (35 preguntas de politica)
- [ ] **#22** Confirmar scope final fin de semana (14h vs recorte 11.5h vs recorte 8.5h)
- [ ] **#23** Configurar org Skin Medic en DB: super-admin owner + 7 profesionales (Mendoza + 6 tecnicas con user_id NULL) + horarios + catalogo procedimientos
- [ ] **#24** Ajuste UI labels "Doctor/Medico" → "Profesional" o equivalente agnostico
- [ ] **#25** Vista combinada multi-calendario simple (dropdown "Ver: Todos" o tab "Agenda completa")
- [ ] **#26** Notificacion automatica al cancelar/reagendar (edge function ajuste)
- [ ] **#27** Decision: pricing si llega segundo cliente del tier Clinica — ¿se mantiene $150 o sube a $180?
- [ ] **#28** Decision: contrato firmado con Skin Medic o acuerdo verbal (riesgo $150 sin papel)

### Riesgos activos (actualizado 22 May)

1. **ALTO:** Bug critico encontrado por Dulce semana 1 quema oportunidad ($150 cliente top, Mendoza vio precio "elevado"). Mitigacion: QA full sabado + battle-test Demo Bot.
2. **ALTO (nuevo):** Mes 1 Skin Medic sin valor visible → Mendoza cuestiona $150 en mes 2. **Critico:** primer mes debe demostrar ahorros, mejora operativa, citas no perdidas.
3. **MEDIO:** Capacidad Diego <3h/dia + 5 clientes = soporte saturado en sem 1-2 Skin Medic.
4. **MEDIO:** Gap multi-recurso se nota sem 2-3 → primera excepcion al feature freeze en Junio.
5. **MEDIO:** Skin Medic = N=1 del tier $150. NO reorganizar estrategia con esta sola data, pero registrar anclaje.
6. **BAJO:** Tarifa Honduras outbound mas alta de lo estimado.
7. **BAJO:** Sprint 6 calling sin horas reales de uso, bandera amarilla.

### Para retomar mañana (23 May)

**Estado mental al cierre:** Diego va a leer el cuestionario `docs/cuestionario-skin-medic-onboarding.md` (es largo). Va a volver con dudas o ajustes. NO empezar a ejecutar nada hasta que confirme.

**Primera pregunta a hacerle al volver:**
- ¿Reviso el cuestionario? ¿Algo que ajustar o eliminar?
- ¿Confirmamos plan tactico de 14h o recortamos a 11.5h?
- ¿Llamo a Dulce hoy o esperas algo antes?

**Decisiones que estan abiertas y se deben cerrar mañana:**
- Scope final fin de semana (14h / 11.5h / 8.5h)
- Cuando llamar a Dulce (hoy 23 May AM/PM o sabado)
- Cuando hablar con Mendoza para Parte B (sab/dom o lunes temprano)
- Correo super-admin OrionCare: ¿existe o crearlo?
- Linea WhatsApp lunes: la actual de Dulce o nueva
- Contrato firmado o verbal

**Lo primero que se ejecuta cuando se confirme plan:**
1. Llamada Dulce (Parte A cuestionario)
2. Crear correo super-admin
3. Guardar credenciales FB en gestor seguro
4. Identificar hardcodes "Doctor/Medico" en el repo para acelerar ajuste sabado AM

---

## Sesion 23 May 2026 — Super-admin operativo + Org Skin Medic shell + plan WhatsApp

**Contexto entrante:** T-2 dias a instalacion Torre Zafiro. Tarea #15 (correo super-admin) pendiente. Diego pregunto como funciona el super-admin tecnica y operativamente.

### Decisiones tomadas

1. **Correo super-admin = `admin@orioncare.app`** (no admin@dican.com que era huerfano + sin buzon). Aprovechamos dominio orioncare.app que Diego ya poseia. Stack: Zoho Mail Free (bandeja propia) — ya estaba configurado en DNS Vercel desde dic 2025 (DKIM + SPF + MX zoho.com). No hubo que tocar DNS.

2. **Seguridad: ruta pragmatica** — Chrome Password Manager + Google Keep para 2FA recovery codes. Migracion a Bitwarden postponed post-feature-freeze. Razon: no introducir friccion nueva con cliente top instalando lunes. Ver [[seguridad-pragmatica-fase-actual]].

3. **Org Torre Zafiro - Piso 3 creada (shell)** — id `7dc5c5db-6476-4a31-b9b3-ceba4e7ffb64`. Nombre interno futuro-proof (modelo "org = edificio" para soportar multi-doctor a futuro, ver [[modelo-ownership-multi-doctor]]). Si Mendoza objeta el nombre el lunes, es 1 UPDATE de 1 segundo. owner_user_id apunta a admin@orioncare.app. max_calendars=7 (Mendoza + 6 tecnicas). auto_cancel_enabled=true (alineado con [[confirmacion-con-consecuencia]]).

4. **Plan WhatsApp:** Opcion A — usar numero actual de Dulce, NO numero nuevo. Migracion sabado o domingo noche, NO lunes en vivo. Dulce y Mendoza ya saben que el numero se "corta" y pasa a la plataforma (cero WhatsApp Web/app, todo via OrionCare inbox).

### Bug encontrado y workaround aplicado

`SuperAdminRoute.tsx` requiere que el user este en `public.users` Y `user_roles` (no solo en `superadmin_whitelist`). Sin esas filas, getCurrentUserWithRole retorna null antes del fallback, y el panel queda en "Cargando..." infinito.

**Workaround vigente:** 3 inserts en DB (public.users + user_roles + superadmin_whitelist) para cada super-admin. Documentado en [[super-admin-protocol]]. Fix de codigo (~10 lineas) diferido post-Skin Medic.

### Tareas cerradas en esta sesion

- [x] **#15** ✅ Crear correo super-admin (admin@orioncare.app operativo, panel /internal/activations accesible)
- [x] **Parcial de #23** ✅ Org Skin Medic shell creada (faltan doctors + tecnicas + secretary + lineas + horarios)

### Tareas nuevas / actualizadas (23 May)

- [ ] **#29** Visita Diego a Dulce 23 May AM — extraer 5 datos pre-migracion WhatsApp: numero exacto, normal/Business, PIN 2FA, quien tiene celular, backup chats. Ver [[whatsapp-cloud-api-migration]].
- [ ] **#30** Migracion WhatsApp sabado o domingo noche — pasos tecnicos en [[whatsapp-cloud-api-migration]]. Requiere acceso al Meta Business Manager de Mendoza (Diego tiene credenciales FB).
- [ ] **#31** Activar 2FA en Zoho Mail para admin@orioncare.app (pendiente confirmar de Diego)
- [ ] **#32** Quitar `dican19+smoketest05@gmail.com` del superadmin_whitelist cuando admin@orioncare.app tenga 2-3 logins estables
- [ ] **#33** Banear `admin@dican.com` user huerfano en Supabase Auth (no urgente, no tiene buzon real)
- [ ] **#34** Crear `doctors` (Mendoza + 6 tecnicas) + `secretaries` (Dulce) + `org_members` posterior a llamada Dulce (parte A cuestionario)
- [ ] **#35** Bug SuperAdminRoute fix de codigo — diferido post-Junio 2026 (feature freeze). Documentado en estado-dev.md.

### Pendientes que se quedaron abiertos al cierre de sesion

Decisiones del fin de semana que SIGUEN abiertas (Diego aun no las cerro):
- Scope fin de semana (14h / 11.5h / 8.5h)
- Cuando exacto llamar a Dulce (visita matinal 23 May en marcha pero faltan llamadas formales)
- Cuando hablar con Mendoza para Parte B (35 preguntas politica)
- Contrato firmado o verbal

### Para retomar proxima sesion

**Estado mental al cierre:** Diego va a visita matinal con Dulce. Va a traer datos de los 5 puntos del checklist WhatsApp. Cuando vuelva, retomamos con:

1. Confirmacion de los 5 datos pre-migracion WhatsApp
2. Decision firme: migracion sabado o domingo noche
3. Acceso a Meta Business Manager de Mendoza (Diego usa credenciales FB que ya tiene)
4. Ejecucion migracion WABA
5. Test inbox OrionCare recibiendo mensajes
6. Configurar org Torre Zafiro - Piso 3 con doctors/secretaries cuando se tenga la data

**Datos clave para no perder:**
- Org id: `7dc5c5db-6476-4a31-b9b3-ceba4e7ffb64`
- Super-admin user_id: `6d1dfa3b-b6aa-4235-afd4-e20df1b09158`
- Org slug: `torre-zafiro-piso-3`

---

## Sesion 25 May 2026 — Instalacion Skin Medic + feature wa.me link

**Contexto:** Dia de instalacion Torre Zafiro / Skin Medic.

### Que paso en la instalacion

1. **Numero migrado correctamente** — Diego logro enviar 1 mensaje de ambos extremos antes de la restriccion.
2. **Meta restringio la cuenta** — El Business Portfolio no tenia sitio web asociado. Diego creo landing page en Lovable, la publico como sitio web del portfolio, y envio revision. Meta dio plazo de 24h.
3. **Restriccion = no enviar NI recibir** — Dulce completamente offline en la plataforma hasta que Meta apruebe.
4. **Dulce tiene numero alterno** para urgencias durante la restriccion.
5. **Mendoza y Dulce se incomodaron** — conscientes de la situacion, esperaran las 24h.
6. **Templates ya creados en Meta** — pendientes de aprobacion post-restriccion.

### Gap critico descubierto

La otra plataforma de Dulce genera links `wa.me` para enviar recordatorios. Con el numero migrado al Cloud API, esos links ya no funcionan (WhatsApp app no tiene el numero). Dulce perdio su herramienta de recordatorios manuales.

Ademas, la plataforma OrionCare no tenia forma de iniciar conversaciones con pacientes que no han escrito primero.

### Feature construido: iniciar conversacion desde link wa.me

**Flujo:** Dulce pega link wa.me en barra de busqueda → sistema detecta, parsea telefono y texto → muestra tarjeta de preview → Dulce llena campos (nombre, doctor, fecha, hora) → click enviar → template sale por Cloud API → conversacion aparece en inbox.

**3 tipos de notificacion** de la otra plataforma (cada uno genera link distinto):
- Creacion de cita → template `confirmacion_cita`
- Recordatorio 24h → template `recordatorio_cita_24h`
- Recordatorio del dia → template `recordatorio_3d` (texto generico sirve para cualquier dia)

**Commits (5):**
1. `ce81e43` — feat: parser wa.me + NewConversationCard + RPC initiate_conversation + inboxActions
2. `5c7ba62` — fix: texto legible del template en timeline (no nombre interno)
3. `659bcfe` — fix: crear paciente en tabla patients al iniciar conversacion
4. `b09ff89` — fix: card siempre visible cuando se detecta link wa.me
5. `cef11b3` — fix: busqueda por nombre (bug pre-existente `phone.includes("")`)

**Archivos creados:** `src/lib/waLinkParser.ts`, `src/components/inbox/NewConversationCard.tsx`, `supabase/migrations/20260525120000_add_initiate_conversation_rpc.sql`

**Archivos modificados:** `src/lib/inboxActions.ts`, `src/components/inbox/InboxList.tsx`, `src/hooks/useConversations.ts`

**RPC `initiate_conversation` deployado en produccion.** Incluye `find_or_create_patient` para auto-crear paciente.

### Pendiente manana (modo-dev, ~15 min)

1. Diego trae link real de la otra plataforma
2. Implementar `parseAppointmentText()` con regex del formato exacto
3. Implementar `detectTemplateType()` para auto-seleccionar tipo
4. Verificar que Meta levanto la restriccion

### Riesgos activos (actualizado 25 May)

1. **ALTO:** Meta no levanta restriccion en 24h → Dulce sigue offline, confianza erosiona. Mitigacion: landing ya subida, revision enviada.
2. **ALTO:** Templates no aprobados post-restriccion → Dulce puede recibir pero no enviar proactivamente. Mitigacion: templates ya creados, aprobacion suele ser rapida.
3. **ALTO:** Bug critico semana 1 quema oportunidad ($150 cliente top). Mitigacion: feature wa.me link construido y testeado, bug busqueda corregido.
4. **MEDIO:** Dulce no adopta el inbox como reemplazo → fricciona y Mendoza cuestiona. Mitigacion: flujo wa.me link replica su workflow anterior.
5. **BAJO:** Onboarding fallido genera desconfianza inicial. Parcialmente materializado (incomodidad por restriccion). Mitigable si manana todo funciona.

### Leccion operativa

**Checklist onboarding pre-migracion (agregar):** Verificar que el Business Portfolio tiene sitio web ANTES de migrar el numero. Si no tiene, crear landing + agregar sitio + esperar aprobacion ANTES de la migracion.

---

## Sesion 1 Jun 2026 — Skin Medic cerrado, ICP refinado, Sprint Coexistence aprobado

### Lo que cambio

**Skin Medic perdido definitivamente 27 May.** Cliente top ($150, 45% del MRR efectivo) cancelo a las 48h por gap fundamental: el modelo "migrar el numero al Cloud API" desactiva la WhatsApp Business App de la asistente, quien queda "amputada" sin features esenciales (reenviar archivo, etiquetas, etc.). Post-mortem en [[skin-medic-perdido]].

**Observacion empirica clave de Diego:** al desconectar el numero a las 5pm del dia anterior, Skin Medic perdio leads INMEDIATAMENTE — no a los 4 dias como esperaba Diego. Tres hipotesis (no excluyentes):
1. Pacientes agendan dia-a-dia, no a 4 dias
2. El paciente quiere respuesta en 1-2h, no espera — si no contestas se va a otra clinica
3. El numero ya es marca conocida (boca a boca, etiquetas en celulares de recurrentes) — downtime = 100% perdida de trafico organico habitual

**Implicacion:** ZERO DOWNTIME es no-negociable. El playbook "migrar el sabado en la noche" murio.

### ICP definitivo confirmado

| Segmento | Volumen tipico | Veredicto |
|---|---|---|
| Medico independiente | <5 msj/dia | OUT — sin dolor |
| Medico + 1 asistente | 10-20 msj/dia | OUT — dolor manejable a mano |
| **Clinica multi-recurso (1 doc + N tecnicas)** | **14 msj/HORA observado en Skin Medic** | **UNICO ICP real** |
| Edificio multi-doctor asistente comun | medio | Posible, secundario |

Diego cerro las puertas con todos los demas segmentos basado en feedback en campo. La unica metrica de mercado dura: **Skin Medic generaba ~150 msj/dia, otros clientes generan <20%**.

### Solucion tecnica validada — Coexistence

Investigacion con Gemini 1 Jun cerro el loop completo:

1. **Coexistence es GA** (no beta) desde mediados 2025 en la mayoria del mundo
2. **Permite mismo numero en WA Business App + Cloud API simultaneamente** via QR scan
3. **Embedded Signup ya esta 100% implementado** en el codigo (build v16). Solo falta el switch del flavor: `featureType: 'whatsapp_business_app_onboarding'` + `sessionInfoVersion: '3'` + skipear el `POST /register`
4. **2 webhooks adicionales criticos:** `smb_message_echoes` (lo que la asistente envia desde su celular llega al inbox web) + `smb_app_state_sync` (sincroniza cambios contactos)
5. **History flood:** 5-15 min de inyeccion intensa al escanear QR. Filtrar por `timestamp > 5min en el pasado` para skipear bot/transcription/notifications. Debounce de 5 min sin updates = sync completo
6. **Tech Provider status:** ya confirmado por Diego
7. **3 clientes actuales no se pueden migrar a Coexistence sin downtime** — quedan en modo migracion destructivo. Silencio + churn organico

Detalle tecnico completo en `estado-dev.md` seccion "PRIORIDAD #1 — Sprint Coexistence" y en memoria [[sprint-coexistence]].

### Decisiones tomadas 1 Jun

1. **Churn organico de Yeni Ramos, David Diaz/Ecoclinicas, Paredes/Medilaser** — silencio total, no comunicacion proactiva, no se intenta retencion. Su perfil no es ICP. Suma ~$145 que se va a perder en 1-3 meses. Aceptable.
2. **Guevara se mantiene como testimonial** — NPS 9.5, 2 referidos pendientes. Cuidar.
3. **Skin Medic NO se intenta recuperar.** En 3-4 meses con Coexistence operativo se puede reabrir conversacion como "version 2" si Mendoza/Dulce muestran interes — pero NO se busca activamente.
4. **Sprint Coexistence arranca 1 Jun (hoy) tarde** — 14-17h trabajo concentrado, 3-4 dias calendario. Pruebas con Demo Bot verified + numero personal Diego ANTES de cualquier cliente real.
5. **Lista 20 clinicas TGU con Warhol** — prompt enviado a Gemini (Deep Research). Inventariado puede empezar HOY en paralelo al sprint codigo. Onboarding real comienza solo despues de sprint validado.
6. **TAM estimado:** ~20 clinicas TGU + replica a SPS/La Ceiba + horizontal a salones de belleza (mismo perfil multi-recurso) = **$8K-15K MRR techo realista**. Hito $1,500 paz mental con 8-10 clientes del ICP correcto.
7. **Pivot horizontal posterior:** salones de belleza grandes (estilistas/manicuristas/esteticistas en paralelo) tienen mismo perfil operativo que clinica multi-recurso. Ruta de diversificacion 2027 reforzada.

### Dashboard actualizado 1 Jun

| Metrica | Valor |
|---|---|
| Clientes activos | **3** (Guevara $35, Yeni $35, Ecoclinicas $35) + Medilaser $75 desconectado |
| MRR facturado | **$180** |
| MRR efectivo | **$105** sin Medilaser / $180 si reconecta (improbable) |
| Churn proyectado | -$105-$180 en 1-3 meses (Yeni, David, Paredes salen) |
| MRR pos-churn (probable) | **$35** (solo Guevara) |
| Burn stack | ~$65/mes |
| Cash flow pos-churn | **-$30/mes** — sostenible muchos meses, no es negocio |
| Hito $1,500 | Faltan $1,465 — requiere 8-10 clientes del ICP nuevo |
| Pipeline | PAUSADO hasta Sprint Coexistence + lista 20 clinicas listas |
| Ads | PAUSADOS permanentes — reactivar cuando haya caso de estudio ICP nuevo |

### Tareas activas (post-1 Jun)

- [ ] **#36** Sprint Coexistence — 10 items tecnicos. Ver `estado-dev.md` para detalle. ETA: 4 Jun
- [ ] **#37** Inventariado 20 clinicas TGU con Warhol — prompt enviado a Gemini. Diego va recopilando lista en paralelo
- [ ] **#38** Test Coexistence end-to-end con Demo Bot verified + numero personal Diego ANTES de cliente real
- [ ] **#39** Documentar playbook cero-downtime: sandbox 3 dias para asistente + ventana viernes 7pm + pre-load contactos via Coexistence sync (Gemini sugiere este patron)
- [ ] **#40** Verificar requisito version WA Business App 2.24.17+ del cliente antes de cada onboarding futuro
- [ ] **#41** Una vez Sprint Coexistence cerrado: identificar primera clinica del ICP nuevo de la lista TGU para onboarding piloto
- [ ] **#42** Reactivar ads ~Jul-Ago 2026 con caso de estudio del primer cliente ICP nuevo (cuando haya 4-6 semanas de uso real)

### Riesgos activos (actualizado 1 Jun)

1. **ALTO:** Sprint Coexistence excede 17h estimadas (probable factor sorpresa con `smb_message_echoes`/`smb_app_state_sync` que son types nuevos en webhook). Mitigacion: tests con Demo Bot antes de cliente.
2. **ALTO:** History flood saltea filtro `isHistoricalMessage` y dispara bot a mensajes viejos en cliente real. Mitigacion: bot OFF al conectar, transcription OFF la primera hora.
3. **MEDIO:** Lista 20 clinicas TGU no es suficiente (clinicas multi-recurso reales en TGU son < 10). Mitigacion: salir a SPS rapido + considerar horizontal salones antes.
4. **MEDIO:** Capacidad Diego < 3h/dia + sprint + onboarding piloto. Mitigacion: sprint termina antes de buscar cliente nuevo.
5. **BAJO:** WA Business App version < 2.24.17 en clinicas mas viejas. Mitigacion: validar pre-onboarding.

### Para retomar proxima sesion estrategia

Estado mental al cierre 1 Jun: Sprint Coexistence aprobado. Diego entra a modo-dev mas tarde HOY para arrancar. Primer test en Demo Bot, no cliente real. Lista TGU corre en paralelo (Warhol + Diego con outputs de Gemini Deep Research).

**Primera pregunta a hacer al retomar:** ¿como fue el sprint Coexistence? ¿Cuantos items cerrados? ¿Hay clientes potenciales de la lista TGU para validar el pitch?

**Decision pendiente proxima sesion:** una vez Coexistence funcional, ¿precio entrada para clinica multi-recurso sigue siendo $150 flat o se ajusta con aprendizajes Skin Medic? Validar si "$150 sin demo previo" repite o se requiere demo guiada.

---

## Sesion 2 Jun 2026 — Decision: construir el motor de agendamiento multi-recurso (el producto real)

**Contexto entrante:** Coexistence funciona en numero de prueba de Diego. Diego planteo la duda: ¿desarrollamos mas la plataforma antes de buscar clientes, o ya estamos listos? Preocupacion concreta: el flujo de crear cita es engorroso para clinica multi-recurso (frontdesk saltando entre 6-7 calendarios) + el tema del numero de equipos.

### El debate (build vs sell) y como evoluciono

- Mi postura inicial (COO): NO serializar. Construir solo la vista combinada barata (~3-4h) + prospectar en paralelo, diferir el flujo perfecto (25-30h) hasta validar con cliente real. Riesgo: construir 5 semanas apostando a un N=1 muerto (Skin Medic).
- Diego empujo de vuelta con buen razonamiento: el ICP ES multi-recurso → el flujo NO es feature, es el loop central del producto. Mercado chico e implacable (~20 clinicas TGU) premia calidad sobre velocidad.
- **Punto que cerro el debate (Diego):** "¿que hubiera pasado si tuvieramos Coexistence con Skin Medic? Habriamos tenido que construir esto igual, porque sino solo seria otra plataforma de calendario como la que tienen." Correcto. Esto invalido mi objecion de "especulacion": el motor NO es para Skin Medic, es para TODA la categoria del ICP. Skin Medic solo lo revelo.

### Decisiones tomadas

1. **Construir el motor de agendamiento multi-recurso AHORA, antes de buscar clientes.** No es especulacion — es el producto-categoria. Ver [[motor-agendamiento-es-producto]].
2. **Reframe de que ES OrionCare:** Gancho (Coexistence + bot que contesta) = adquisicion. **Motor de agendamiento = retencion / foso / justificacion del $150.** El inbox consigue al cliente; el motor lo amarra. Un competidor copia el bot en un trimestre; el motor no.
3. **Tesis del dolor (estrella polar del scope):** fuga bilateral = pacientes que abandonan ("nunca te contestan") + recursos ociosos. Cada feature del flujo se justifica solo si reduce una de las dos fugas. El medico solo no tiene este dolor → valida el ICP. Calendario multi-recurso = table stakes (Mendoza ya lo tenia); bot que contesta = el diferenciador. Mensaje de venta = "nunca te contestan".
4. **Modelo de datos cerrado** (con datos reales del cuestionario, seccion A4):
   - `servicios`: nombre, duracion_min, buffer_min (default 10 = limpieza entre pacientes), equipo_tipo_id (FK nullable), requiere_consulta_previa (regla A3.4: paciente nuevo → Mendoza), precio (bot da precios, B5.4)
   - `equipos`: nombre, **cantidad** (la columna que ES el constraint) → `3 laser, 2 radiofrecuencia, 1 CO2, 1 frag, 6 cabinas, 1 consultorio`
   - `profesional_servicios`: M2M = la skill matrix
   - Disponibilidad = 3 contadores (profesional libre + cabina < 6 + equipo_tipo < cantidad). Sin solver, sin optimizacion.
   - **Hallazgo clave:** la CABINA (6) es probablemente el cuello de botella real, no la maquina. Diego solo pensaba en maquinas. Cabina = otro recurso fungible con cantidad. Buffer 10min bloquea cabina+persona, NO la maquina (A4.6: sin cooldown). El buffer es un gap competitivo (su plataforma no lo puede asignar).
5. **Secuenciador multi-procedimiento = v1** (Diego eligio, A5.3 lo respalda: multi-procedimiento es comun). **Riesgo de scope #1** — convierte 5 semanas en 7. Definicion de "done" estricta: encadenar procedimientos consecutivos del mismo paciente en una visita, greedy primero-disponible, sin optimizacion global del dia. Si se infla → recortar a v2.
6. **NLP / lenguaje natural del bot = DIFERIDO hasta primer cliente.** Entrenar con mensajes reales, no inventados (alinea [[inbox-only-primera-semana]] + [[no-data-inferida]]). El motor entrega valor dia 1 sin NLP (humano + flujos estructurados/botones).
7. **Primer cliente inbox-only → analisis de mensajes semana 1 = triple proposito:** (a) training data del bot, (b) comparativa de valor para el cliente (ataca riesgo "mes 1 sin valor visible" que fue factor con Skin Medic), (c) caso de estudio para reactivar ads.
8. **Prospeccion en paralelo = OBLIGATORIA.** No para decidir si construir (ya decidido) sino para validar que la estructura de recursos generaliza. Skin Medic (6 cabinas / 3 laser) no es universal: clinica dental tiene sillas, estetica chica tiene 3 cabinas. El modelo (recetas + cantidades) es universal; los numeros no.

### Hallazgo: el cuestionario Skin Medic SI tiene datos reales

Diego creia que no estaba la data de equipos. Si esta (seccion A4 contestada). Es oro para el modelo y como caso de prueba de generalizacion.

### Riesgos activos (actualizado 2 Jun)

1. **ALTO (nuevo):** Secuenciador multi-procedimiento infla las ~5 semanas a 7. Mitigacion: definicion de done estricta, fallback a v2.
2. **MEDIO (nuevo):** Estructura de recursos de Skin Medic (6 cabinas/3 laser) puede no generalizar a otras clinicas del ICP → modelo cerrado en piedra prematuramente. Mitigacion: validar con 1-2 prospectos reales mientras se construye.
3. **MEDIO:** Capacidad Diego <3h/dia + 5-7 semanas de build sin ingreso nuevo. Cash flow pos-churn -$30/mes lo aguanta muchos meses (no es bloqueador, pero el reloj corre).
4. **MEDIO (de 1 Jun, vigente):** Lista 20 clinicas TGU insuficiente (multi-recurso reales < 10). Mitigacion: SPS + horizontal salones.
5. Riesgos tecnicos de Coexistence (1 Jun) se mantienen hasta primer onboarding real.

### Tareas activas (post-2 Jun)

- [ ] **#43** Bajar el motor de agendamiento a spec tecnico en `/modo-dev` (secuenciador acotado, horas reales, definicion de done)
- [ ] **#44** Prospeccion en paralelo (Warhol + lista TGU) — conversaciones validan estructura de recursos antes de cerrar el modelo
- [ ] **#45** Primer cliente → inbox-only semana 1 → analisis de mensajes (training bot + comparativa cliente + caso de estudio)
- [ ] Vigentes de 1 Jun: #38 (test Coexistence end-to-end), #39 (playbook cero-downtime), #41 (identificar primera clinica ICP), #42 (reactivar ads ~Jul-Ago con caso de estudio)

### Para retomar proxima sesion

**Estado mental al cierre 2 Jun:** Modelo conceptual y de datos del motor cerrado y validado contra datos reales. Diego pasa a `/modo-dev` cuando quiera para el spec tecnico. Prospeccion corre en paralelo.

**Primera pregunta al retomar:** ¿avanzo el spec del motor en dev? ¿El secuenciador se mantuvo en estimacion o se inflo? ¿Hubo conversaciones de prospeccion que confirmen/refuten que la estructura de recursos generaliza?

---

## Sesion 7 Jun 2026 — Hueco de modelado cabina vs equipo (Riesgo #2 materializado)

**Contexto entrante:** Motor completo (Fases 0-6) + Coexistence + rediseño UI Nueva Cita + optimizacion performance (calendario ICP 2430→820ms) todo en prod (3-6 Jun). Pendiente solo QA en vivo de Diego. Prospeccion en paralelo (#37 lista TGU) sin update visible.

**Pregunta de Diego que destapo el hueco:** ¿las cabinas solo sirven para laser o para multiples procedimientos? ¿El equipo es fijo a la cabina o se mueve? Intuyo (N=1, no vi a nadie cargando equipos pesados en Skin Medic) que es fijo. "Tengo algo en mente que puede estar fallando en nuestra logica."

**Hallazgo — su instinto es correcto, y la data lo confirma:**
- El motor modela disponibilidad como **3 contadores independientes** (profesional + cabina<6 + equipo_tipo<cantidad). Esto solo es valido si el equipo es **portatil**. Si es **fijo** (cabina-laser = la maquina), el modelo **sobreestima disponibilidad** y promete citas imposibles (5 facials ocupan 5 cabinas, la libre no tiene laser, pero el contador dice "laser disponible"). = la fuga exacta que el motor existe para tapar.
- **La data nunca lo valido:** cuestionario A4.5 ("¿cabina especifica?") = **sin respuesta**; A4.2 dio conteos (2 RF, 3 laser, 1 CO2, 1 frag) sin mapear equipo→cabina; Diego anoto que no entendia bien como operan. Extra: **7 maquinas / 6 cabinas** = al menos una cabina con 2 equipos (otra sobre-disponibilidad).
- **Esto ES el Riesgo MEDIO #2 del 2 Jun materializandose:** modelo cerrado en piedra sobre un N=1 que ya esta muerto (Skin Medic).

**Decision tomada:**
1. **NO reconstruir sobre otra suposicion.** Diego va a averiguar la fisica real (¿maquinas fijas o moviles? ¿que cabina tiene que?) con Dulce/Mendoza o prospectos, idealmente 2-3 clinicas, ANTES de tocar codigo.
2. Modelo correcto que generaliza a ambos mundos: **cabina = recurso atomico con capacidades instaladas**; procedimiento necesita cabina cuyas capacidades lo cubran. Generaliza a dental (sillas) y estetica chica. Fix acotado (capacidades por cabina + asignacion procedimiento→cabina), no reescritura del motor.
3. Memoria durable actualizada en [[motor-agendamiento-es-producto]] (seccion "HUECO DE MODELADO ABIERTO").

**Pendiente:**
- [ ] **#46** Diego: averiguar fisica real de cabinas/equipos (fijo vs movil + mapeo equipo→cabina) con Dulce/Mendoza/prospectos, 2-3 clinicas para confirmar que generaliza
- [ ] **#47** Verificar como computa hoy `_shared/availability.ts` (confirmar si el bug ya esta en prod vs solo nota conceptual) — antes de ajustar
- [ ] Cuando #46 cierre: ajustar modelo de disponibilidad (capacidades por cabina)

**Riesgo #2 (2 Jun) RE-CONFIRMADO y elevado a accionable:** la estructura de recursos no se valido fuera de Skin Medic. Es el mismo hueco. Mitigacion ahora concreta = #46.

### Onboarding — playbook v1 acordado (7 Jun)

Diego planteo el flujo de onboarding. Tras revision COO, 3 decisiones cerradas:

1. **Coexistence = unico metodo de vinculacion de ahora en adelante.** La migracion destructiva (que mato a Skin Medic) NO vuelve como opcion. "Vincular" = QR de Coexistence, zero downtime. Ver [[coexistence-unico-metodo]].
2. **Cutover limpio** (no doble-sistema): cargar citas futuras del sistema viejo a OC antes de activar, para que el motor tenga la foto completa y no doble-bookee una cabina. El doble-sistema dispara el "bug visible" que quema la oportunidad.
3. **Presencial las 2 visitas, primeros 10 clientes.** Decision de Diego: lo presencial es el instrumento de investigacion de campo a N<10 (resolver #46, validar supuesto FB-logueado, confirmar generalizacion de recursos) + abre oportunidades. Remoto se gana el derecho despues (~50% menos costo: 1 visita + activacion remota), diferido post-10.

Playbook completo (pre-visita checklist + visita 1 instalacion + semana 1 calibracion silenciosa + visita 2 activacion cutover) guardado en [[onboarding-playbook]].

**Huecos que el playbook cierra (eran riesgos del plan original de Diego):**
- "Vincular" ambiguo → forzado a Coexistence.
- Doble-sistema → doble-booking de cabina → cutover limpio + carga de futuras.
- "FB logueado en todas las clinicas" = supuesto no validado → checklist pre-visita.
- Irse antes de confirmar el echo (`smb_message_echoes`) → "no irse hasta ver round-trip".
- Creds por WhatsApp en texto plano → tipear directo + super-admin custodio.
- "Mejorar NLP en 1 semana" → alcance realista = top 10 FAQs + prompts.

**Tareas nuevas:**
- [ ] **#48** Definir donde viven los emails `admin@NOMBRECLINICA` (¿alias Zoho?) + su 2FA, antes de escalar onboarding
- [ ] **#49** Resolver el metodo de carga de citas futuras en cutover (manual con asistente vs import rapido si son muchas)

---

## Sesion 15 Jun 2026 — Semana muerta + reframe motor de crecimiento + prospeccion reiniciada

**Contexto entrante:** 8 dias sin update (7-15 Jun). Diego confirmo: **semana muerta** — familia/otras cosas, el proyecto no avanzo. Sin culpa: cash flow pos-churn -$30/mes lo permite, familia es prioridad. Costo real = momentum, no dinero.

### Diagnostico COO

**El lado de ventas del negocio esta en CERO, no en pausa.** Confirmado por Diego en sesion:
- Lista 20 clinicas TGU (#37): **hay que reiniciar desde cero** — el prompt Gemini del 1 Jun no produjo lista real.
- Acceso ICP: **ninguno** — toca abrir en frio.
- Motor 100% construido (Fases 0-6 en prod) + Coexistence. Mercado 100% sin tocar.

Todo el riesgo del negocio concentrado en un punto: cero validacion de demanda del ICP nuevo desde que se decidio construir el motor (1 Jun = 15 dias). El hueco de modelado cabina/equipo (#46, Riesgo #2) **solo se cierra hablando con clinicas reales** — y eso no ha pasado.

### Reframe estrategico (decision clave de la sesion)

**El motor de crecimiento del business plan (ads → leads → Warhol convierte) esta MUERTO para este ICP.** Audiencia demasiado chica (ya validado: ads pausados permanentes, AD-006 70-90% basura).

**El motor real ahora = venta concierge mano a mano sobre lista corta y nombrada. No es funnel, es caceria selectiva.** Los numeros lo obligan:
- Hito $1,500 = 8-10 clientes ICP a ~$150
- TAM realista = ~20 TGU + SPS/Ceiba + salones grandes = ~30-40 alcanzables
- = 25-30% penetracion de TODO el mercado. Cada conversacion pesa. No hay volumen que compense.

**Implicacion para el rol de Warhol:** deja de ser "convertir leads que llegan" → pasa a "cortejar una lista de ~15 clinicas especificas". Trabajo y ritmo distintos.

### Decisiones tomadas 15 Jun

1. **Build congelado** hasta tener 1 conversacion con clinica ICP que confirme o refute el modelo de recursos (#46). El motor NO necesita mas codigo — necesita un humano del ICP enfrente.
2. **Dos vias de prospeccion en paralelo, mismo formato de salida** (se cruzan sin duplicar; coincidencia en ambas = candidata mas fuerte):
   - **Via manual (Warhol):** brief ejecutable creado. Instagram + Google Maps, 15-20 clinicas TGU, ~2h. Salida = filas para el G-Sheet existente (estado `Nuevo`).
   - **Via Gemini Deep Research:** prompt nuevo redactado (mejor que el del 1 Jun: tabla forzada con columnas exactas + link verificable por fila + prohibido inventar + nota de cobertura). Ataca el fallo previo de "rellenar con basura plausible".
3. **Contacto = investigacion, no venta.** Primera conversacion (apertura consultiva, tono Honduras) hace doble trabajo: (a) mide dolor "nunca te contestan", (b) resuelve #46 (fisica real cabinas/equipos). Mensaje de apertura pendiente de redactar (diferido hasta tener primeras clinicas en lista).
4. **ICP de la lista incluye salones de belleza grandes** (no solo medico) — mismo perfil multi-recurso, refuerza ruta horizontal 2027.

### Trigger definido (el reloj)

Si en **3-4 semanas** de caceria selectiva sobre mercado de <40 clinicas no sale **1 clinica ICP interesada** → NO es señal de "construir mas", es señal de que la tesis ICP/mercado necesita re-examen. El codigo ya no es la variable; la validacion de demanda si.

### Entregables de la sesion

- `docs/ventas/brief-lista-icp-tgu.md` — brief en markdown
- `docs/ventas/Instrucciones_Lista_Clinicas_Warhol.docx` — version Word legible para Warhol (lenguaje simple, cajas de color, tablas, ejemplo Skin Medic como ancla)
- `generar_brief_warhol.py` — script para regenerar el Word si hay ajustes
- Prompt Gemini Deep Research (en hilo de la sesion, falta guardarlo en archivo si se quiere reusar)

### Tareas activas (post-15 Jun)

- [ ] **#37 (reactivada)** Construir lista 15-20 clinicas ICP TGU — Warhol (brief Word listo) + Gemini (prompt listo). Cruzar ambas listas.
- [ ] **#50** Redactar mensaje de apertura en frio (WhatsApp, tono Honduras, investigacion + abre puerta) cuando caigan las primeras clinicas
- [ ] **#46 (vigente, ahora desbloqueable):** resolver fisica cabinas/equipos en las conversaciones de investigacion
- [ ] **#51** Definir trigger checkpoint: ~6-13 Jul evaluar si salio 1 clinica ICP interesada
- Vigentes: #38 (test Coexistence E2E), #39 (playbook cero-downtime), #47 (verificar bug availability.ts en prod), #48-49 (onboarding)

### Riesgos activos (actualizado 15 Jun)

1. **ALTO (elevado):** prospeccion no arranca / mercado <40 clinicas no produce 1 ICP interesado en 3-4 sem → tesis ICP en duda. Mitigacion: dos vias paralelas + trigger explicito.
2. **ALTO:** momentum perdido se vuelve cronico (1 semana muerta → varias). Mitigacion: arranque de bajo esfuerzo (lista barata, no Gemini-only que ya fallo 2x).
3. **MEDIO:** hueco #46 (cabina vs equipo) sigue abierto, motor cerrado sobre N=1 muerto. Mitigacion: investigacion en cada conversacion.
4. **MEDIO:** capacidad Diego <3h/dia. Mitigacion: prospeccion delegable a Warhol; Diego solo en conversacion tecnica.

### Para retomar proxima sesion estrategia

**Estado mental al cierre 15 Jun:** dos vias de prospeccion armadas y listas para ejecutar. Build en pausa consciente. Diego pasa a `/modo-dev` ahora (no para mas motor — probablemente QA/fixes o verificar #47).

**Primera pregunta al retomar:** ¿Warhol y Gemini produjeron lista? ¿Cuantas clinicas "Si"/"Tal vez"? ¿Se cruzaron las dos vias? ¿Hubo primera conversacion de investigacion? ¿Que dijo sobre cabinas/equipos (#46)?

---

## Sesion 27 Jun 2026 — Re-examen de la tesis de negocio + smoke test de demanda

**Contexto entrante:** 12 dias desde 15 Jun. Trigger #51 corriendo (checkpoint 6-13 Jul). Cliente unico activo: Guevara $35 (otros 3 marcados perdidos 22 Jun). Diego abrio con pregunta GLOBAL, no tactica: ¿apuntamos a un segmento demasiado complejo?

### El hilo (5 turnos de exploracion estrategica)

Diego empujo progresivamente a repensar el MODELO del negocio, no la tactica de clinicas:
1. ¿Podemos trabajar otros rubros? (esta haciendo un PMS para el hotel de su hermana) → "¿cuanta gente hay asi, negocios chicos que quieren digitalizarse?"
2. ¿El ICP medico/clinica es demasiado complejo? Wilmer se engancho con plataforma BASICA.
3. Buscar clientes tipo Wilmer en varios rubros, "combos" de herramientas (calendario+WhatsApp).
4. Smoke test: regalar landing page para descubrir que dueños/rubros existen, luego upsell.
5. Canal: Reddit (insiste) porque FB grupos = marketplace saturado. (Diego FUE a mirar FB en campo.)

### Insights clave (COO)

1. **Wilmer es el dato mas importante del memory y la estrategia lo ha ignorado.** Unico cliente feliz ($35, NPS 9.5, 2 meses sin tocar, refiere), usa ~10% de la plataforma (calendario+recordatorios), le da IGUAL el bot. **El pivote al motor multi-recurso $150 abandono la unica config validada que retuvo a un cliente feliz.** "Sin dolor" del medico independiente ([[icp-individual-fuera]]) era juicio sobre el BOT, no el calendario. Confundimos "no necesita el bot" con "no es cliente".

2. **3 modelos que Diego estaba mezclando:**
   - A. SaaS vertical (clinicas) — lo que hay. Leverage = reuso.
   - B. SaaS horizontal mismo-motor (clinica/salon/hotel-lite/gym) — [[diversificacion-2027]] adelantada. Leverage preservado SI el motor encaja.
   - C. Agencia/bespoke por cliente — **TRAMPA solo:** cola de soporte se acumula (codebase distinto no amortiza) + vende horas (sin MRR floor) + Claude no multiplica venta/soporte. "Calculadora rosada" (bespoke unico) = sin segundo comprador.
   - Forma ganadora = **Simple + COMUN + recurrente + vendido a muchos.** El core simple es MAS horizontal que el motor (sirve a todo negocio de citas), no menos.

3. **La ADQUISICION siempre fue el cuello de botella, nunca el producto.** Wilmer llego A-PULSO (lista manual 1-a-1) = canal MENOS escalable y unico que ha funcionado. Ads a medicos fallaron (audiencia chica). Producto simple validado; lo no resuelto = conseguir clientes barato.

4. **Lo simple es MAS viable para Diego solo:** los 175 del modelo simple solo son sobrevivibles porque casi no llaman (fire-and-forget, Wilmer lo prueba). Los 50 del motor (alto touch + onboarding presencial + bot) lo saturan.

5. **Patron de evasion nombrado (3x):** cada turno propuso un test mas comodo y menos informativo (otros rubros → combos → bespoke simple → landing gratis en Reddit). PERO en los ultimos turnos convergio a un funnel legitimo (carnada→calificar→upsell) y fue a mirar FB en campo. Progreso real.

### Decisiones / acciones

1. **Correr smoke test de demanda barato** (descubrir si existen dueños reales y de que rubros). NO mide willingness-to-pay (eso es despues, en el DM/upsell).
2. **Diego eligio: regalar 1 landing page en Reddit.** Su post original fue bajado por la puja L.250 = venta. COO reescribio el post: 100% gratis (cumple reglas + test mas limpio), sin subasta, con preguntas de calificacion metidas ("¿que rubro?", "¿como conseguis/atendes clientes hoy?" = destapa dolor de citas/WhatsApp), nota hosting Vercel gratis + dominio aparte que ellos pagan pero Diego configura sin costo. **Post final entregado, listo para publicar.**
3. **COO recomendo (no ejecutado aun) canales superiores en paralelo:** ad FB targeteado $20-30 (brinca la saturacion organica que Diego vio; en HN todos estan en FB) + la HERMANA (hotel = prospecto ICP real, caliente, gratis, rubro nuevo). Diego difirio el ad FB.
4. **Criterio de exito del test Reddit:** ✅ señal = ≥5 dueños reales de ≥3 rubros con dolor de citas. ❌ ruido = devs, extranjeros, cazadores de gratis. <2 reales → canal flojo confirmado, volcar a FB ad + hermana.
5. **Prediccion COO anotada:** Reddit traera mayormente pares y cazadores de gratis, casi cero ICP. Costo $0 → que la realidad arbitre. La landing construida se reusa como demo (hermana + respondientes FB), no se desperdicia.

### Tension estrategica abierta (a resolver con datos)

Dos apuestas que compiten por el tiempo escaso de Diego:
- **Motor/clinica $150:** ARPU alto / pocos / alto touch / NO validado / mercado <40 TGU.
- **Simple horizontal $35:** ARPU bajo / muchos / bajo touch / VALIDADO (Wilmer) / mercado enorme (todo negocio de citas).
No puede correr ambas a fondo solo. Smoke test + hermana deben inclinar la balanza con datos, no teoria. Ver [[re-examen-tesis-negocio]].

### Tareas activas (post-27 Jun)

- [ ] **#52** Diego publica el post de Reddit (gratis, reescrito) + revisa reglas del sub (r/Honduras > r/emprendedores)
- [ ] **#53** Construir 1 landing page para el ganador → reusar como demo
- [ ] **#54** DM a dueños reales que comenten (aun los que no ganan): "¿como llevas tus citas hoy?" = abre upsell
- [ ] **#55** Trabajar el caso de la hermana (hotel) como probe de generalizacion del motor + descubrimiento de dolor. Definir: ¿PMS real (NO es el motor) o reservas+WhatsApp+recordatorios (SI es el motor)?
- [ ] **#56** (diferido, recomendado) Ad FB targeteado $20-30 mismo gancho — soltar en paralelo cuando Diego quiera
- [ ] Vigentes: #46 (fisica cabinas/equipos), #51 (checkpoint trigger 6-13 Jul), #37 (lista TGU), #38/#39 (Coexistence)

### Riesgos activos (actualizado 27 Jun)

1. **ALTO:** test de Reddit confirma canal equivocado y se pierde otra semana sin validar demanda. Mitigacion: criterio de exito definido + hermana (canal caliente) en paralelo + prediccion explicita para aprender rapido.
2. **ALTO:** posible error del pivote (motor $150 abandono la config validada de Wilmer) — pero NO se confirma ni revierte sin datos. NO reorganizar con N=1.
3. **MEDIO:** patron de re-teorizar el modelo en vez de contactar prospectos reales (3 sesiones, ~26 dias desde 1 Jun, cero conversaciones ICP). Mitigacion: esta sesion produjo accion concreta (post listo) + hermana = contacto real inmediato.
4. **MEDIO:** capacidad Diego <3h/dia. Mitigacion: Warhol publica/gestiona Reddit; hermana es warm.

### Para retomar proxima sesion

**Estado mental al cierre:** post de Reddit listo para publicar. Diego cierra para ver resultados. Tension estrategica (motor $150 vs simple horizontal $35) abierta, a inclinar con datos.

**Primera pregunta al retomar:** ¿Se publico el post? ¿Cuantos comentarios, de que rubros, cuantos dueños REALES vs ruido (vs la prediccion)? ¿Hubo DMs con dolor de citas? ¿Se avanzo con la hermana (hotel = PMS real o motor)? ¿Inclina hacia simple-horizontal o seguimos motor-clinica?

---

## Sesion 30 Jun 2026 — Correccion de datos + primera caceria ICP real + Reddit muerto

**Contexto entrante:** 3 dias desde 27 Jun. Diego abrio corrigiendo el dashboard (burn mal calculado) y pidiendo verificar el "Wilmer usa 10%". Luego descargo una salida de campo (29 Jun) + resultado del smoke test de Reddit.

### Correcciones de datos (verificadas via SQL)

1. **Cash flow real = +$15/mes, NO −$30.** El "~$65 burn stack" venia del business plan viejo (proyeccion a 175 clientes: Supabase Pro + Vercel + Twilio). Realidad hoy: free tiers + fuera de Twilio → unico costo operativo = **Claude $20**. Ingreso $35 Wilmer − $20 = **+$15/mes**. No estamos quemando; el reloj de presion es momentum/oportunidad, no plata.

2. **El "Wilmer usa 10% / le da igual el bot" es FALSO.** Radiografia SQL de su org (`c7234d61-1586-42ae-bc0a-db8abb96a75c`):
   - **Citas:** 121 (memory decia 85), recurrentes los 6 meses, ultima creada 29 Jun, 18 en ult. 30 dias. Confirmadas 64.
   - **Recordatorios:** 100 reminder_24h, 98 confirmaciones, **41 pacientes respondieron confirmando** (el flujo Bukele/[[confirmacion-con-consecuencia]] funciona en campo).
   - **BOT:** 245 logs, 42 sesiones, los 5 meses, ultimo 29 Jun. Intents booking 64, faq 49, handoff 12; llega a estados completed/booking_confirm. **El bot SI se usa.**
   - Lo que NO usa: promociones (1), inbox manual (14 conv), calling (0). = **la capa cara construida para el ICP multi-recurso/asistente.**
   - **Salvedad honesta:** no se puede probar via SQL cuantas citas creo el bot vs a mano (appointments no guarda origen). Pero el paciente usa el bot para agendar, indiscutible.
   - **Correccion fina del "10%":** Wilmer usa ~100% del CORE simple (calendario+recordatorios+confirmacion+bot) y ~0% de la capa cara. No es que use poco el producto — es que el producto le CRECIO una capa que el cliente validado no toca. **Esto afina y en parte da vuelta la tesis del 27 Jun: el bot es parte del core barato validado, NO el lujo. El lujo no validado es el motor multi-recurso $150 (N=0 real).**

3. **Wilmer es DENTAL** (citas: Limpieza Dental, Extraccion, Cementacion). Dato clave para el beachhead.

### Caceria de campo 29 Jun (Edificio Artemisa + dentales) — primeras conversaciones ICP desde 1 Jun

- **Dra. Jacome** (medicina estetica, 2 anos en edificio). Asistente vio demo, MUY de acuerdo. Dra pidio presentacion pero **la plataforma no cargo (bug del page-tracking de esta rama)** → quemo la demo. **Bug YA resuelto** (Diego volvio a casa, lo arreglo, recogio iPad). Pendiente: volver con presentacion + agendar con asistente.
- **Dra. Grecia Rodriguez** (Smile Design, dental) — INTERESADA. Pidio control de planes de pago + landing page (Diego prometio ambas — ver trampa abajo).
- **CDO** (dental) — usan Dentalink, ~$60 por 2 medicos = **$30/medico**. +2 dentales mas con Dentalink; una se quejo: **"no es mobile-friendly".**
- **Dr. Luis Avila / Lumina Dental** — lo piensa, vuelve miercoles.
- **Dra. Fany Urrea** — contrato otra SaaS hace 1 sem, paga 800 Lps (~$32). Amiga de Grecia. Volver en 1 mes.
- **Dr. Ali Alvarado** (implantes) — va a invertir en pauta, posible bot. Conexion, futuro.
- **CDH / Dr. Luis Avila** — flujo no muy alto pero **"es muy sencilla" (repitio 2x)**. Vuelve jueves, hablara con colegas de CDH.
- Una asistente: volver 20 Jul (medicos fuera de ciudad).

**Patron:** el motor multi-recurso $150 NO salio ni una vez. Lo que vende = **simplicidad + mobile + bot**. Cluster denso = **dental**. (Sesgo de lugar: el edificio era de medicos solos/multi-medico, no multi-recurso; es posible que multi-recurso exista en otro lado — pero lo simple convierte HOY.)

### Smoke test Reddit — veredicto

Prediccion del 27 Jun confirmada: 4 comentarios, top-engagement fue un par criticando el uso de IA (9 upvotes), cero dueños reales con dolor de citas. Unico "interesado" = influencer (fuera de tesis). **Reddit muerto como canal de descubrimiento de ICP** (criterio pre-definido <2 reales → canal flojo). Victoria del proceso: test $0, arbitrio en 3 dias, sin apego. **Calle dirigida >> online amplio** (8 clinicas/1 salida vs ~0).

### Decisiones tomadas 30 Jun

1. **Dental = beachhead candidato** (convergencia: Wilmer es dental + cluster Artemisa). El producto a vender = core simple, cuña **mobile + WhatsApp/bot + simple** contra Dentalink (fuerte en profundidad clinica, DEBIL en mobile — no pelear en su terreno).
2. **REGLA: no se construye feature vertical/de rama (odontograma, planes de pago, recetas, historial) hasta 3+ clientes PAGANDO aparte de Wilmer que lo pidan.** Libro de demanda = conteo de votos por feature; 3+ marcas → se gradua a build, financiado con MRR. Voto fuerte = pagando, no "interesado". Ver [[no-feature-vertical-sin-3-clientes]]. **Trampa pisada:** Diego prometio pagos+landing a Grecia → reframe: "esta en roadmap, te dejo el mes gratis con lo que hay".
3. **Primer mes gratis = enganche de cierre** ([[primer-mes-gratis-enganche]]). Landing gratis = enganche pasivo complementario.
4. **Asistentes = puerta de entrada, ya NO bloqueo.** Campo 29 Jun: la asistente de Jacome vio demo y la quiere. El miedo a reemplazo (que mato el pitch de mayo) desaparecio con el pitch nuevo. Matiza [[admin-edificio-no-prospecta]] (admins siguen sin servir; la champion=asistente abre, y ahora sin friccion).
5. **"Wilmer" es una SITUACION, no un rubro:** profesional solo, reservas le caen a el/su familia, quiere quitarse el peso, necesidades simples (calendario+recordatorios+bot), fire-and-forget. La unidad replicable de adquisicion es esa persona, cruza especialidades.
6. **Ana Suazo (influencer 100k IG, gano la landing gratis de Reddit):** NO es cliente (sin dolor de citas) ni su audiencia es ICP. Manejo: (a) construir la landing como **PLANTILLA reusable** (sirve a Grecia + enganche futuro), pocas horas, no bespoke; (b) su valor = su RED (hace publicidad a hoteles/turismo → dolor de reservas), pedir intros DESPUES de entregar, no promo a followers. No pivotar a influencer marketing.
7. **Hospitalidad/reservas = hilo abierto (no pivote):** sale por hermana (hotel) + red de Ana. Refuerza "persona, no rubro". Sondear gratis; si 2 hoteleros confirman el mismo dolor, mirar en serio.

### Tension estrategica (actualizada)

La balanza del 27 Jun (motor $150 vs simple horizontal $35) se inclina hacia **simple-horizontal** con la data de hoy: Wilmer usa el core simple completo (incl. bot), el campo vota simple+dental, el motor $150 sigue N=0. NO se mata el motor (ya construido, ahi queda si aparece multi-recurso), pero deja de ser la apuesta principal.

### Que probaria conseguir la "Wilmer-pediatra" (analisis pedido por Diego)

- **SI prueba:** la persona es vertical-agnostica (dental→pediatria, mas fuerte que 2 dentistas) → TAM se ensancha de "clinicas dentales TGU" a "todo profesional solo con peso de reservas". De-risquea QUIEN + pitch + retencion.
- **NO prueba:** el CANAL. Ambos llegaron por medios no escalables. Saber a quien vender ≠ encontrarlos barato. **La velocidad sigue topada por las horas de Diego (~1-2 clientes/mes manual → hito $1,500 en 6-9 meses).**
- **Lo que desbloquea para velocidad:** vuelve racional invertir en canales repetibles — loop de referidos (CAC≈0, compone), ad FB targeteado ahora escribible, Warhol corriendo script de calificacion. El siguiente experimento post-pediatra debe ser de CANAL, no mas caceria manual.

### Tareas activas (post-30 Jun)

- [ ] **#57** Volver a Jacome con presentacion (iPad, plataforma ya arreglada) + agendar con asistente
- [ ] **#58** Cerrar a Grecia/Smile Design en core simple + mes gratis (reframe pagos/landing como roadmap)
- [ ] **#59** Volver a Lumina (mie) y CDH (jue); seguimiento Urrea (~1 mes, Grecia puede empujar), Alvarado (futuro), asistente (20 Jul)
- [ ] **#60** Verificar lead pediatra: ¿asistente hoy? ¿quien maneja reservas? ¿le pesa? (clasificador Wilmer)
- [ ] **#61** Construir landing como PLANTILLA reusable (Ana = 1ra instancia, reuso Grecia + futuro). Cap: pocas horas, no bespoke
- [ ] **#62** Tras entregar landing a Ana: pedir intros a su red de hoteles/turismo (dolor de reservas)
- [ ] **#63** Sistema de captura de prospectos en campo (nota de voz por clinica → volcar a docs/ventas/leads). NO Excel nuevo por edificio; usar infra existente
- [ ] **#64** "Lo de Eliza" — pendiente, Diego lo maneja en otra sesion
- [ ] **#65** Definir primer experimento de CANAL (voto COO: loop de referidos primero, ad chico en paralelo) — cuando haya 2da cuenta feliz
- Vigentes: #46 (fisica cabinas/equipos — ahora secundario si dental/simple gana), #51 (checkpoint trigger), #55 (hermana hotel = PMS real o motor)

### Riesgos activos (actualizado 30 Jun)

1. **ALTO:** la velocidad de adquisicion sigue sin resolver — depende 100% de horas de Diego (manual ~1-2/mes). El canal escalable no esta probado. Mitigacion: convertir 2da cuenta feliz en experimento de referidos.
2. **MEDIO:** aflojar la regla de "no feature sin 3+ pagando" bajo presion de cierre (ej. prometerle a Grecia el modulo de pagos). Mitigacion: regla en memoria + libro de demanda.
3. **MEDIO:** dispersion por objetos brillantes (influencer 100k, hospitalidad) en vez de cazar Wilmers. Mitigacion: caps de esfuerzo + hilos marcados como "no pivote".
4. **MEDIO:** capacidad Diego <3h/dia + familia. Mitigacion: Warhol en prospeccion/calificacion; Diego en cierre tecnico.
5. **BAJO→resuelto:** bug page-tracking que tumbo demo Jacome — ya arreglado.

### Para retomar proxima sesion

**Estado mental al cierre 30 Jun:** sesion muy productiva — se corrigieron 2 datos load-bearing (cash flow, uso real de Wilmer), se confirmo dental como beachhead con campo real, se clavo la regla de features, Reddit murio limpio. Pipeline activo por primera vez desde 1 Jun. Tension motor-vs-simple inclinandose a simple-horizontal.

**Primera pregunta al retomar:** ¿Como fueron Lumina (mie), CDH (jue), la vuelta a Jacome? ¿Se cerro Grecia con mes gratis? ¿Se verifico la pediatra (es Wilmer o no)? ¿Se entrego la plantilla-landing? ¿"Lo de Eliza"? ¿Algun cierre = arrancar el experimento de referidos?

---

## Sesion 30 Jun 2026 (cont.) — Descubrimiento de segmento: cubiculos compartidos + TimeTree como incumbente

**Contexto entrante:** misma sesion, mas tarde. Diego descargo 3 leads nuevos de la caceria de campo (29 Jun) y pidio (a) medir en el codigo cuanto falta para servirlos y (b) entender el modelo de trabajo real de estos medicos. La conversacion se volvio discovery profundo del segmento medico-edificio.

### 3 leads nuevos de campo

1. **Dra. Jensi** — medica **itinerante** (visita otras clinicas). Su calendario funciona a demanda de otros (la agarran 3pm Edif A, 4pm su clinica, 5pm Edif B). Dijo que **TODOS sus colegas de la clinica compartida tienen el mismo problema y por eso nunca contrataron plataforma** (calendario asume sede fija, se rompe con el itinerante). Idea de Diego (link a clinicas aliadas) = sobre-ingenieria; el core ya resuelve el 80%.
2. **Clinica Capilar — LEAD MAS CALIENTE.** Asistente champion de **4 medicos** (canal que abre puertas). Llevan todo en **Notion** (migrable, cutover manual). **Cobro por adelantado** via link de pago que ella genera a mano + transferencias; quiere que el bot llegue al punto de "aqui va el link de pago" y ellos marcan pagado a mano (feature LIGERA, no pasarela). **Accion caliente: mensaje MAÑANA 6pm a la doctora** para coordinar llamada con ella + su esposo (ing. ciberseguridad = gatekeeper tecnico). Migrar data de Notion.
3. **Dra. Montserrat — MISMATCH.** Quiere **expediente medico** (recetas, consultas), ya lo tiene con Medicatel. Es pelear en el terreno del competidor (profundidad clinica), no en nuestra cuña. NO perseguir, NO construir expediente.

### Hallazgo #1 — El incumbente real es TimeTree, no Dentalink/Medicatel

**7 de 10 medicos que Diego ha contactado usan TimeTree** (app de calendario compartido, gratis). Es señal de CONDUCTA (lo que hacen > lo que dicen). TimeTree es la version **gratis y muda de nuestro CORE**: no contesta pacientes, no agenda por WhatsApp, no recuerda, no maneja pacientes. Muchos ademas juntan TimeTree (compartido con otros medicos) + Google Calendar (propio) = malabarean 2 apps.

**Wedge regalado:** no hay que convencerlos de que necesitan un calendario (ya lo hackearon). Solo de que el nuestro **atiende** y el de ellos no. Switching cost ~0 (app gratis, no PMS con años de expedientes).

### Hallazgo #2 — "Usa TimeTree" = filtro de ICP por conducta

Mejor que rubro o tamaño. Es alguien que **ya siente el dolor** del calendario (tanto que hackeo algo), con switching cost casi nulo. Es casi proxy directo de **"la situacion Wilmer"** (profesional con peso de reservas que busca quitarselo). Dejar de cazar por "clinica dental" y empezar a cazar por conducta observable: *¿ya usas un calendario compartido para tus citas?*

### Hallazgo #3 — Los dos ejes (aclaracion de producto que confundia a Diego)

Dos razones DISTINTAS por las que un slot puede estar ocupado:

| Eje | Que limita | OC lo resuelve con |
|---|---|---|
| **Cuarto compartido** | El **cuarto** (N medicos, 1 silla). Si Pérez usa el cubículo 3pm, Jensi no puede aunque este libre | Medicos que comparten silla → **mismo calendario** (co-working). Cualquier cita tapa la silla para todos. ✅ construido (era el motor "compartir la silla") |
| **Medico en N lugares** | El **medico** (1 medico, N sillas). Si Jensi tiene 5pm en Edif B, no puede 5pm en Edif A aunque este vacio | Todos los calendarios del medico cuelgan de EL → el motor los agrega, nunca lo choca consigo mismo. ✅ (`availability.ts` agrega todos sus `calendar_doctors`) |

OC respeta **ambos automatico**. Unico hueco: compromisos en lugares que NO estan en OC → **"bloqueo sin paciente"** (no existe: `appointments.patient_id` es NOT NULL, sin tabla de bloqueos). **Hack para pilotear con CERO codigo:** paciente-placeholder "🔒 Ocupado", se agenda contra el con `notes`="Edif B". El bot ya lo trata como hora ocupada.

### Hallazgo #4 — Es un mercado de subarriendo de espacio clinico (Airbnb de cubiculos)

Compartir cubiculo y saltar entre edificios son **el mismo mercado desde dos lados**: el cuarto se comparte PORQUE sus medicos son de medio tiempo (saltan a otros lados). Evidencia de campo: un medico que hace **~20 clinicas** (demanda extrema) + una clinica que **le renta a 2 medicos** (oferta). Compartir = sintoma, itinerancia = causa. **Implicacion de crecimiento:** cada itinerante es un **puente entre edificios** (ganas 1, te expone a 5); la clinica que subarrienda es **hub Y canal** (necesita coordinar a sus subarrendatarios).

**El motor co-working NO esta muerto** — estaba apuntado al ICP equivocado (clinica multi-recurso $150, N=0). Su fit real = edificios de cubiculos compartidos, probablemente mas comunes.

### Marco de precio (Diego pregunto si $40 es mucho)

**NO bajar $40** (recordar [[pricing-costo-marginal]]: sesgo de Diego a bajar cuando "no cuesta nada"; $40 ya sub-optimo). El instinto correcto de Diego ("que sientan que reciben mas de lo que pagan") se logra **subiendo valor percibido, no bajando precio.**
- Anclajes de mercado: Urrea paga otra SaaS **~$32** (800 Lps), Dentalink **~$30/medico**, Wilmer **$35 feliz**. El mercado ya paga $30-35; $40 esta en el techo de la banda, no fuera.
- Reframe: NO competir "vs TimeTree/Google gratis" (ahi $40 es caro) → competir "vs perder un paciente / vs una secretaria" (ahi es barato).
- Matematica que sienten: $40/mes ≈ **L.33/dia**; si el bot salva **1 paciente/mes** ya se pago. Stack de valor: 2 apps → 1 + bot + recordatorios + agenda unificada.
- Cierre: **primer mes gratis** ([[primer-mes-gratis-enganche]]).

### Disciplina / riesgo de la sesion

Llevamos ~6 turnos teorizando el mercado sobre **2 anecdotas** (el de 20 clinicas, la que renta a 2). Es el riesgo del 30 Jun #3 (re-teorizar en vez de contar en campo). **La distribucion del mercado es la incognita #1** — decide si construimos para "1 cuarto compartido" (simple, ya esta) o "medico en N lugares" (necesita el bloqueo). No se resuelve pensando, se CUENTA.

### Tareas activas (post-30 Jun cont.)

- [ ] **#66** Mensaje MAÑANA 6pm a Dra. Capilar (coordinar llamada con ella + esposo ing.) + **hoja de prep de seguridad** para la llamada (Supabase/RLS/acceso/backups/encriptacion) — el ingeniero es gatekeeper
- [ ] **#67** Mini-tarjeta de campo, 3 preguntas por medico (Warhol/Diego llenan cada visita): (1) ¿en cuantos lugares trabajas? (2) ¿compartis cubiculo o es tuyo? (3) ¿para que usas TimeTree — asistente / otros medicos / tus horarios?
- [ ] **#68** Discovery Jensi — Mundo A vs B: ¿maneja los datos (nombre+tel) de los pacientes externos, o solo llega a atenderlos? Decide si es "paciente con tag de clinica" (product casi listo) o "bloqueo sin paciente"
- [ ] **#69** Registrar Jensi/Capilar/Montserrat en `docs/ventas/leads/` (con el gap analysis)
- [ ] **#70** Si Jensi/edificio cierra: pilotear con hack paciente-placeholder (CERO codigo). Solo graduar "bloqueo sin paciente" (feature horizontal) si 3+ pagando lo piden ([[no-feature-vertical-sin-3-clientes]])
- Vigentes: #57-65 (pipeline dental, Jacome/Grecia/Lumina/CDH, plantilla-landing, referidos), #46, #51, #55

### Riesgos activos (actualizado 30 Jun cont.)

1. **ALTO:** re-teorizar el segmento en vez de ir a contar (2 anecdotas → 4 hipotesis). Mitigacion: mini-tarjeta #67, ir a campo.
2. **ALTO (heredado):** velocidad de adquisicion = horas de Diego. Sin cambio.
3. **MEDIO:** llamada Capilar con el ing. ciberseguridad se pierde por respuesta improvisada de seguridad. Mitigacion: hoja de prep #66.
4. **MEDIO:** aflojar regla "no feature sin 3+ pagando" con Capilar (link de pago) o Jensi (bloqueo). Mitigacion: hack placeholder + libro de demanda (link de pago = voto horizontal mas votado: Grecia + Capilar; aun 0 pagando).

### Para retomar

**Estado mental al cierre:** tesis inclinada fuerte a **simple-horizontal**, con TimeTree como incumbente/filtro y el edificio de cubiculos como cluster candidato. El motor co-working revive como fit de ese cluster. Falta lo de siempre: **datos de campo, no mas teoria.** Accion caliente inmediata = Capilar mañana 6pm.

**Primera pregunta al retomar:** ¿Se mando el mensaje a Capilar? ¿Como fue la llamada con el esposo ing.? ¿Se lleno la mini-tarjeta en alguna visita — que dijo la gente del "para que usan TimeTree" y "cuantos lugares"? ¿Sigue el pipeline dental (Lumina/CDH/Grecia/Jacome)?

### Addendum (misma sesion, mas tarde) — modelo de negocio cristalizado + REENCUADRE ICP a silla-compartida

Discovery profundo de ~12 turnos que cristaliza el modelo. Lo nuevo y load-bearing:

**REENCUADRE ICP (el hallazgo mayor): de "medico DUEÑO de clinica" a "medico de SILLA COMPARTIDA".**
- **VALIDADO N=1: Wilmer comparte silla** (Diego confirmo, Wilmer se lo dijo). Nuestro UNICO cliente feliz ES el ICP silla-compartida. La tesis deja de ser N=0.
- El diseño ORIGINAL de OC (compartir calendario porque la clinica se comparte con otros medicos) YA era para esto — pero pensado a **nivel clinica**, no a **nivel usuario/TimeTree**. Reencuadre de **LENTE, no de construccion.** La plomeria existe, estaba mal etiquetada.
- Toda la venta previa se framo como "dueño de clinica"; **nunca se pitcheo "invita/unite a calendarios de otros por un solo pago".** Angulo virgen.

**Valor killer CORREGIDO: notificaciones/confirmaciones automaticas > bot.** Para medico de bajo volumen sin asistente que recuerda a mano, el killer es el recordatorio+confirmacion automatico **DESDE SU NUMERO** (TimeTree nunca le habla al paciente). El bot pesa segun volumen (bonus). Baja la barrera de venta (no hay que confiar en un bot que agenda solo). Prueba en mano: Wilmer, 41 pacientes confirmaron.

**Modelo de cobro (cristalizado): por MEDICO, plano, una vez — NUNCA por cubiculo/edificio.** Med C en 3 sillas paga UN $40 (analogia: pagas tu linea de WhatsApp 1 vez, estas en los grupos que quieras). El cubiculo compartido NO se factura — emerge de que cada medico paga lo suyo. El "$120" que asusta = suma de 3 personas (Jensi+W+V), no la factura de una. Upside: 1 edificio de 10 medicos = $400/mes, pegajoso (candado de red). Es [[modelo-ownership-multi-doctor]]: org = **workspace (NO clinica)**, owner = super-admin, billing per-doctor (gap doctor_subscriptions, manual por ahora).

**Arquitectura (verificado en RLS): compartir calendario = MISMA org, NO federar orgs (esa es la trampa).** Acceso es a nivel org (`organization_id IN get_user_organizations`). Piloto (cluster que ya se comparte los cuartos) corre **HOY sin construir** (= estructura Skin Medic con medicos-login en vez de tecnicas pasivas). Unico gap a ESCALA: aislamiento por calendario/paciente dentro de una org (para meter desconocidos). NO es org-federation.

**Producto = TimeTree(cal compartido) + notificaciones + reagendas + bot.** Las 3 ultimas existen en prod; el "TimeTree self-service (usuario crea/invita solo)" NO existe — pero Diego lo hara **MANUAL/gratis** (provisionado por detras, incluido en $40), NO self-service. El self-service ESCALA el loop, se construye DESPUES de probarlo. No prometer en cierre lo no construido (trampa Grecia).

**Test del loop = MANUAL antes de construir:** enganchar 1 medico silla-compartida con recordatorios → cuando lo ame, Diego mete al compañero de silla a mano → ¿el compañero paga? Si → loop respira → recien ahi construir self-service. Prueba la tesis a **$0 de build.**

**Probes vivos:**
- **Jensi:** Diego YA le planteo el framing TimeTree ("puede unirse al calendario de otros usuarios + notificaciones + bot que reagenda"). Esperando respuesta. Sharpening: agregar outcome (menos citas caidas). **Vigilar por donde muerde** (calendario vs notificaciones vs "¿y los otros medicos?" = loop prendio).
- **Dr. Ali Alvarado (implantes):** usa TimeTree **desde 2018** (7 años, entrenado), en **~20 clinicas** = SUPER-SPREADER candidato (era el "medico de 20 clinicas"). Pendiente: ¿usa TimeTree en las 20? ¿mismos o distintos medicos? (grado en la red).

**Regla de pitch:** el *lead* se adapta al dolor del prospecto (Jensi=calendario adelante; medico-que-recuerda-a-mano=notificaciones adelante). Outcome, no feature. NO decir "sustituir TimeTree" de frente — "TimeTree + lo que le falta"; el reemplazo se vuelve obvio solo.

**Tareas nuevas:**
- [ ] **#71** Piloto del loop MANUAL: 1 medico silla-compartida con recordatorios → meter compañero a mano → medir si paga
- [ ] **#72** Verificar grado de Alvarado en la red (¿TimeTree en las 20? ¿mismos o distintos medicos?)
- [ ] **#73** (DIFERIDO, post-loop-probado) Construir self-service de calendarios compartidos + invitar (el motor del loop). NO antes.
- [ ] **#67 (ampliada)** 5ta pregunta a la mini-tarjeta: ¿comparte otros TimeTree en otros edificios? ¿mismos o distintos medicos? (mide grado / super-spreader)

**Detalle completo en memoria [[timetree-incumbente-filtro-icp]].**

---

## Sesion 1 Jul 2026 — Loop de Wilmer disparado + tiers Free/Pro + "¿por que no Dentalink?"

**Contexto entrante:** dia siguiente de la sesion densa del 30 Jun (correccion de datos + reencuadre ICP a silla-compartida). Diego abrio descargando una conversacion real con Wilmer + su idea de tiers + una pregunta directa: ¿por que no Dentalink? Cerro pivotando a un E2E tecnico de Coexistence para de-risquear la instalacion de Grecia (paso a /modo-dev).

### 1. EL LOOP SE DISPARO SOLO (lo mas importante de la sesion)

Diego hablo con Wilmer. Datos nuevos de campo (N=1 con nombre):
- **Wilmer comparte silla con 2 profesionales mas** (uno de "poco" movimiento, asumir < que Wilmer). Su edificio ES un cluster silla-compartida vivo de 3.
- **Wilmer usa TimeTree con una colega** — nuestro unico cliente feliz vive la realidad "TimeTree + otra cosa".
- Diego le pitcheo **"TimeTree + nuestra plataforma"** → le parecio **excelente**, lo suficiente para decir que **hablaria con sus colegas esta semana para ver como lo pagan** porque "si era algo importante para ellos en la clinica". **Free tier ya comunicado a Wilmer.**

**Lectura COO:** esto es el **test #71 (loop manual) disparandose ORGANICO**, sin que Diego lo forzara. El champion recluta gratis (CAC de los companeros ≈ $0). Confirma de golpe: Wilmer ES el ICP silla-compartida, el candado de red es real, y el pitch "TimeTree + plataforma" convierte. Si un companero paga Pro → la tesis deja de ser N=1. **NO dejar enfriar** — el siguiente paso es facilitarle el reclutamiento (conectarlos gratis al calendario compartido). Wilmer lo maneja el/su gente esta semana; Diego solo espera y provisiona.

### 2. Modelo de tiers Free / Pro (idea de Diego para combatir el "todo o nada")

| Tier | Incluye | Costo marginal | Rol |
|---|---|---|---|
| **Free** | Calendario compartido (= reemplazo TimeTree) + une los 2 calendarios que hoy malabarean | ~$0 (Supabase free, sin WhatsApp) | Motor del loop: champion invita gratis, cero barrera |
| **Pro $40** | Recordatorios + confirmaciones **desde su numero** + bot | Meta WhatsApp | Donde vive el valor y el precio; upsell por cabeza |

**Aprobado con 2 guardas:**
1. **No anclar el precio contra el free.** El free es la mercancia que TimeTree YA regala (no se regala valor). Vender "$40 vs perder un paciente / vs una secretaria", nunca "vs calendario gratis". NO bajar de $40 ([[pricing-costo-marginal]]).
2. **El free-como-motor-viral depende del self-service (#73, diferido).** Para que el champion invite solo necesita el "crear/invitar" self-service que NO existe. Piloto Wilmer = **provision manual** (Diego los conecta por detras). El self-service se construye DESPUES de que un companero pague Pro. No prometer lo no construido (trampa Grecia).

Esto ademas concreta el billing per-medico ([[modelo-ownership-multi-doctor]]): el workspace es gratis de unirse, cada medico paga $40 por Pro.

### 3. Filtro ICP mas afilado: "usa TimeTree + otro calendario"

Diego observo: TimeTree **solo reserva el espacio de la clinica (la silla)** → las citas propias las llevan **aparte** en otro calendario (Google, etc.). Son los 2 ejes del 30 Jun (la silla compartida + las citas del medico). **Malabarean 2 apps.** Alguien que juega TimeTree **+** Google siente el dolor mas agudo que quien solo usa TimeTree — y **el motor OC nativamente une los dos** (`availability.ts` agrega todos los `calendar_doctors`). Nuevo pitch del free: *"deja de malabarear TimeTree y tu Google, todo en uno"*. Nueva pregunta de calificacion (mini-tarjeta #67): **"¿ademas de TimeTree, en que llevas tus citas propias?"** → si contesta "otro calendario", es Wilmer confirmado.

### 4. "¿Por que no Dentalink?" (pregunta directa de Diego — respondida)

Por que el ICP no se va (ni lo mandamos) a Dentalink:
1. **El mercado ya voto con los pies:** 7/10 usan TimeTree, NO Dentalink. Su switching-cost es ~0 *porque* rechazaron el PMS pesado. Venderles Dentalink = venderles lo que ya declinaron.
2. **Trabajo distinto:** Dentalink = expediente clinico (guardar registros). Nosotros = agenda compartida + hablarle al paciente. El dolor del usuario de TimeTree no es "guardar expedientes". Es la trampa Montserrat.
3. **Dentalink es dental; el ICP no.** El filtro "usa TimeTree" cruza especialidades (estetica, pediatria, itinerantes). Dentalink no puede servir a Jensi/Jacome.
4. **Dentalink asume clinica de sede fija** (facturado a la clinica). El modelo silla-compartida/itinerante (cobro por medico, calendario que sigue al doctor) es arquitectonicamente ajeno.
5. **Es el terreno del competidor** (profundidad clinica) donde decidimos NO pelear (30 Jun). Dentalink es debil en mobile ("no es mobile-friendly", cita de campo) y no le habla al paciente.

**Foto que aclara todo:** TimeTree (gratis, mudo) Y Dentalink (pago, clinico) **fallan en lo mismo** — ninguno le habla al paciente desde el numero del medico. **Ese hueco es el producto.** No competimos con Dentalink; vendemos la capa que ninguno da. (Matiz: los que SI tienen Dentalink y se quejan del mobile son segmento distinto y mas dificil — no el beachhead.)

### 5. Capacidad / energia — decision de agenda

Diego durmio **4.5h** (1am–5:30am) por la emocion de que el producto "encaja". Mañana tenia instalacion Grecia **+** llamada Capilar. Sintio que Capilar "estaba un poco fuera" de la tesis silla-compartida y quiso evitar la llamada; el mismo lo nombro como funnel vision.

**Diagnostico COO:** el instinto de evitar por tesis era el error (Capilar = champion de 4 medicos = ~$160/mes potencial; usa Notion = misma señal conductual que TimeTree, NO esta fuera; foco = calificar despues, no en vez de). PERO el problema real resulto ser **capacidad**, no tesis. Decision: **mañana SOLO instalacion Grecia; Capilar se reprograma 2-3 dias** (mantener caliente, no cancelar). Reprogramar ademas mejora la llamada (descansado + con hoja de prep para el esposo ing. ciberseguridad). Sin reloj financiero que apure (+$15/mes, cero burn). Mensaje de reprogramacion redactado (corto, sin pushiness). Recordatorio de bienestar dado: 1am-5:30am insostenible, horizonte 3 años, familia primero (regla #4).

### Decisiones tomadas 1 Jul

1. **Facilitar el loop de Wilmer** (no esperar pasivo): ofrecerle conectar gratis a sus 2 companeros de silla al calendario compartido (provision manual). Es #71 en vivo.
2. **Adoptar el modelo Free/Pro** con las 2 guardas (no anclar precio; self-service diferido).
3. **Agregar el filtro "usa TimeTree + otro calendario"** a la mini-tarjeta #67.
4. **Dentalink = no-competencia** (categoria distinta); no pelear en profundidad clinica, cuña = hablarle al paciente + mobile + simple.
5. **Instalacion Grecia mañana en solitario; Capilar reprogramada** (capacidad).

### Tareas activas (post-1 Jul)

- [ ] **#74** Facilitar loop Wilmer: conectar gratis a sus 2 companeros de silla (provision manual) cuando Wilmer confirme interes de ellos. Medir si alguno paga Pro (= #71 resuelto en vivo)
- [ ] **#75** Enviar mensaje de reprogramacion a Capilar (redactado) + agendar 2-3 dias adelante
- [ ] **#66 (vigente)** Hoja de prep de seguridad para la llamada Capilar (esposo ing. ciberseguridad) — hacerla ANTES de la llamada reprogramada, no hoy
- [ ] **#76** Definir feature-por-feature que va en Free vs Pro (para no improvisar en la proxima venta) — pendiente, Diego difirio para cerrar primero E2E
- [ ] **#67 (ampliada 2x)** mini-tarjeta ahora incluye: "¿ademas de TimeTree, en que llevas tus citas propias?"
- Vigentes: #57-65 (pipeline dental: Jacome/Grecia/Lumina/CDH, plantilla-landing, referidos), #71-73 (loop manual / grado Alvarado / self-service diferido), #46, #51, #55

### Riesgos activos (actualizado 1 Jul)

1. **ALTO:** Diego quemandose por emocion (4.5h sueño) → riesgo de ejecucion en instalaciones/llamadas + insostenible con niño de 2 años. Mitigacion: 1 evento grande/dia, sin reloj financiero, ritmo > cramming.
2. **ALTO (heredado):** velocidad de adquisicion = horas de Diego. El loop de Wilmer es la primera señal de un canal que compone (referidos CAC≈0) — si respira, cambia el techo.
3. **MEDIO:** aflojar regla "no feature sin 3+ pagando" (link de pago Capilar, self-service free). Mitigacion: provision manual + libro de demanda.
4. **MEDIO:** dejar enfriar el pipeline caliente (Capilar reprogramada, Lumina/CDH/Grecia) por capacidad. Mitigacion: reprogramar ≠ soltar; mensajes cortos de seguimiento.

### Para retomar proxima sesion estrategia

**Estado mental al cierre:** sesion corta y fuerte — el loop de Wilmer se disparo solo (la mejor señal en meses), el modelo Free/Pro quedo definido, Dentalink descartado como competencia. Diego paso a /modo-dev para un E2E de Coexistence (unlink/re-link de numero) que de-risquea la instalacion de Grecia. Capacidad es el riesgo #1 hoy (energia, no plata).

**Primera pregunta al retomar:** ¿Hablo Wilmer con sus companeros — se anima alguno a pagar? ¿Como fue la instalacion de Grecia? ¿Se reprogramo Capilar y se hizo la hoja de prep? ¿Se cerro el detalle Free vs Pro (#76)? ¿El E2E de Coexistence paso limpio (unlink/re-link no rompe onboarding)?

---

## Sesion 2 Jul 2026 — Dia de instalacion Grecia (Smile Design)

**Contexto entrante:** dia de la instalacion de Grecia (10am). Diego durmio bien (riesgo #1 de ayer mitigado).

### Estado al abrir (8:42am)

- **DKapilar** (nombre correcto del lead, antes registrado como "Capilar"): mensaje de reprogramacion ENVIADO, llamada reagendada para el **SABADO**. #75 ✅. Diego pidio explicitamente NO trabajar en DKapilar hoy — la hoja de prep #66 queda pendiente ANTES del sabado.
- **Grecia sin responder confirmaciones:** mensaje ayer 5pm + llamada y mensaje hoy 8:35am. Decision COO: NO 4to toque (3 en <18h ya es el limite cultural), silencio matutino de dentista ≠ señal negativa (esta con pacientes), y la cita ya estaba acordada.
- **Decision: ir igual a las 10am.** Clinica a 15 min. Asimetria: ir en vano cuesta 30 min; no ir y que ella espere quema el cierre mas avanzado del pipeline.
- **Wilmer: cero contacto** (decision Diego, correcta). El loop #71/#74 solo vale si respira solo. Check-in natural: lunes-martes proxima semana, con excusa de servicio, NO preguntando por los colegas.

### Instalacion en marcha — datos operativos

Diego preparo el onboarding con una cuenta propia admin+doctor y agrego a Grecia:

- Org **Smile Design** creada: `40bd31f5-51b5-4abb-b448-5c81029dabd8`
- Grecia: `greciarodriguez@orioncare.app`, user_id `5759daf3-93bc-4caf-9654-80be969b24f3`, doctor_id `2996127b-e3eb-4589-82da-a616bdbc4070`, **admin+doctora** (upgrade via SQL)
- **Patron tecnico admin+doctor** (guardado en [[admin-doctor-role-pattern]]): UNA sola fila en `org_members` con `role='admin'` + `doctor_id` lleno. NUNCA 2 filas (el frontend lee el rol con `.limit(1)` → comportamiento aleatorio). Flujo: crear como doctor en UI (`create-user-with-role` cablea todo) → UPDATE role a 'admin' en `org_members` + `user_roles`. Requiere re-login para ver panel admin.

### Al cierre de sesion

**PENDIENTE CONFIRMAR:** resultado final de la instalacion (¿llego Grecia? ¿quedo operativa? ¿Coexistence limpio?). La sesion se cerro con la instalacion en curso.

### Tareas actualizadas (post-2 Jul)

- [x] **#75** ✅ Mensaje reprogramacion DKapilar enviado — llamada el SABADO
- [ ] **#66** Hoja de prep de seguridad DKapilar (esposo ing. ciberseguridad) — hacer VIERNES a mas tardar (llamada es sabado)
- [ ] **#77** Confirmar resultado instalacion Grecia + registrar en estado (¿cliente #2 activo? ¿MRR $70?)
- [ ] **#74 (vigente)** Loop Wilmer: esperar sin contacto; check-in natural lun-mar 6-7 Jul
- Vigentes: #76 (Free vs Pro feature-por-feature), #57-65, #67-73, #46, #51, #55

### Riesgos activos (actualizado 2 Jul)

1. **ALTO (heredado):** velocidad de adquisicion = horas de Diego. El loop Wilmer sigue siendo la señal de canal que compone.
2. **MEDIO:** dejar enfriar DKapilar — la hoja de prep #66 NO esta hecha y la llamada es el sabado. Mitigacion: hacerla viernes.
3. **MEDIO:** capacidad — mejor que ayer (durmio bien), pero semana cargada (Grecia hoy, Lumina mie, CDH jue, DKapilar sab).
4. **BAJO (nuevo):** Grecia no aparecio a la instalacion → reagendar sin friccion ("pase como quedamos, ¿le queda mejor otro dia?").

### Para retomar proxima sesion

**Primera pregunta al retomar:** ¿Como termino la instalacion de Grecia — cliente #2 activo? ¿Se hizo la hoja de prep DKapilar antes del sabado? ¿Como fue la llamada del sabado con el esposo ing.? ¿Lumina (mie) y CDH (jue) aparecieron? ¿Noticias organicas de Wilmer y sus colegas?

---

## Sesion 2 Jul 2026 (TARDE) — Caso Stacy Recinos → modelo clinica-hub + demo Orthos ejecutado

**Contexto entrante:** cierre del dia de campo. Grecia NO aparecio (2do no-show; mensaje final enviado — "estuve en la clinica, podemos agendar sin problema"; pelota en su cancha, NO mas toques). Lumina reagendo al VIERNES **via el bot** (señal: un lead usando el producto para reagendar). CDH se paso por alto — reprogramar con mensaje corto. TimeTree confirmado en 2 clinicas odontologicas mas (hipotesis valida en dental; fuera de dental sin contar).

### El hallazgo: Dra. Stacy Recinos (clinica dental "grande")

Paga **Dentalink Y usa TimeTree** para coordinar medicos externos. Flujo verbalizado: paciente pregunta horarios → llaman al medico externo → confirma fechas → presentan al paciente → elige → coordinan via TimeTree. = 2-4 toques + espera sincrona POR CADA cita de procedimiento, justo cuando el paciente esta caliente. **Pidio demo para evaluar sustituir TimeTree.**

Lecturas estrategicas:
1. **Cliente pagando de Dentalink que AUN necesita TimeTree** = la prueba mas dura de la cuña (ni el PMS pago resuelve coordinacion de agenda).
2. **Correccion de cuña (verificada web):** Dentalink SI tiene recordatorios WhatsApp (add-on pago, botones confirmar/cancelar, probablemente numero generico). La cuña "Dentalink no le habla al paciente" es FALSA tal cual. Cuña real segmentada: mayoria TimeTree-sin-PMS → recordatorios desde SU numero; minoria con Dentalink (Stacy) → coordinacion con externos + capa conversacional ("ellos avisan, nosotros conversamos"). NO liderar con recordatorios ante dueños de Dentalink.
3. **TimeTree = protocolo de coordinacion ENTRE organizaciones** (no solo intra-clinica). Silla-compartida e itinerancia son las 2 puntas del mismo cable.

### Decisiones de modelo (secuencia de la sesion)

1. **Unidad que paga = LA CLINICA** (no el medico itinerante — propuesta de Diego, correcta): el dolor/perdida del paciente es de la clinica; el externo no paga por dolor ajeno. 1 clinica Pro = X externos free adentro; el externo con calendario que "se llena solo" (las citas de las clinicas SON la actualizacion) tiene interes propio en meter a sus otras clinicas (evitar doble-booking) = **loop clinica-hub, espejo del loop Wilmer** (regla comun: paga quien es dueño de la relacion con el paciente).
2. **Linea Free/Pro afilada:** free = single-player completo (calendarios y medicos ilimitados, filas pasivas que el free mantiene a mano = TimeTree); pago = INVITAR (el externo entra con cuenta propia, se llena solo) + recordatorios. "Free da la vitamina, pago da el analgesico." Peaje: conectar/escribir al calendario de un externo = Pro.
3. **Add-on $35/calendario extra MUERTO** (ya implicito en "cobro por medico plano" del 30 Jun). Expansion revenue se muda a asientos/conexiones.
4. **$40 NO se baja** ("hay que ver resultados" — Diego). El "$40 caro" del odontologo de campo = filtro de ICP + problema de ancla; el free absorbe la objecion de precio (el precio se discute cuando ya viven adentro).
5. **Bot fuera del PITCH** (nadie muestra pull en campo; vulgarizado — caso Zendy/ManyChat) pero NO del producto (Wilmer 245 logs, Lumina reagendo via bot hoy). Bot = infraestructura silenciosa + palanca de margenes, no vitrina. En demo Orthos va ON (decision Diego).
6. **#73 re-especificado** (sigue DIFERIDO): cuenta-medico con calendario unico cross-clinica + invite desde Pro. Se construye cuando una 2da clinica del mismo medico pague.

### Demo Orthos — EJECUTADO (config completa via SQL)

Detalle e IDs en [[orthos-demo-stacy]]; rollback de la linea demo en `~/.claude/plans/ya-tengo-la-org-twinkling-dove.md`. Puntos clave:
- **Sillon = RECURSO (qty 1), NO calendario compartido** — verificado en `availability.ts`: el co-working bloquea slots con cualquier cita de cualquier miembro (calendario compartido NO simula la silla; corrige receta inicial del COO).
- Calendarios 1:1 (Stacy + 5 externos ficticios con login), 6 servicios con receta sillon + "Ocupado — otra clinica" SIN receta (eje 2: el externo se llena sin afectar el sillon), skill matrix poblada, 15 pacientes + 19 citas seed con flags de envio marcados (crons no disparan a numeros falsos).
- Fixes aplicados sobre el montaje manual de Diego: Stacy doctor→ADMIN, Diego desactivado del calendario de Stacy (co-working), Molero sin calendario activo, Rivas sin horarios, domingos abiertos eliminados.
- **Linea Demo Bot +504 9313-3496 MOVIDA a Orthos** (bot ON). Mientras dure el piloto NO hay Demo Bot en la org OrionCare.
- Guion: demo auto-explorable sin la escena del externo; demo guiado cierra con escena de 60s (login externo en telefono de Diego agrega "Ocupado" → desaparece de slots, sillon libre). Trigger de compra = "¿el doctor puede ver esto el mismo?" / crea citas sola semana 1 (medir con page_views). NO prometer cross-clinica.

### Tareas activas (post-2 Jul tarde)

- [ ] **#78** QA de las 4 escenas: **(1) cruce 2 ejes ✅ VERIFICADO 2 Jul via API contra get-available-slots** — el sillon de Cervantes (extraccion jue 9:30-10:40) le come a Molero los slots 9:30/10:00/10:30 con servicio, y reaparecen sin servicio (control negativo); la consulta de Stacy NO bloquea sillon. Motor resource-aware confirmado en prod. Pendientes en UI: (2) escena login-externo en telefono; (3) mensaje real al **+504 9787-0752 (linea Pinares reactivada — llevaba meses inactiva, PROBAR envio/recepcion antes del demo)** → bot responde bajo Orthos + inbox; (4) page_views registrando
- [ ] **#79** Crear 1 paciente vivo con numero real de Diego (cita futura, flags en false) para el flujo real de recordatorio/confirmacion
- [x] **#80** ✅ Acceso ENTREGADO a Stacy el mismo 2 Jul (caliente, mismo dia de la conversacion). Ahora: observar `page_views` (¿entra? ¿navega? ¿crea citas?) y esperar su primera reaccion. NO hacer follow-up antes de 48-72h salvo que ella escriba.
- [ ] **#84** Probar envio/recepcion real de la linea +504 9787-0752 (quedo SIN probar antes de entregar el acceso — si Stacy reporta que algo no manda mensajes, es lo primero a revisar)
- [ ] **#85** Merge de `feat/page-tracking-navegacion` a main — la rama acumula **4 commits de polish mobile** (2-3 Jul): scroll del menu admin (53ad867), paginas admin mobile-friendly + autoscroll a opcion activa al abrir menu (b614777: WhatsApp Lines, Motor tabs/recursos card-view, Bot FAQs card-view), y card de servicio del Motor reestructurada (318798c). Stacy entra por celular como admin — validar preview Vercel y mergear. Typecheck+build verificados en cada commit.
- [x] **#81** ✅ Linea Demo Bot REVERTIDA a org OrionCare el mismo 2 Jul (config original restaurada; sigue como herramienta de ventas). Orthos usa la linea Pinares +504 9787-0752 (reactivada, bot ON, handoff doctor)
- [ ] **#82** Preguntas empiricas para Stacy: ¿tiene el add-on de recordatorios de Dentalink? ¿de que numero llegan? ¿que pasa cuando el paciente responde fuera del boton? + ¿cuantos sillones tiene? (qty del recurso)
- [ ] **#83** Mensaje corto a CDH (se paso la visita) — no dejar enfriar >48h
- [ ] **#67 (ampliada 3x)** mini-tarjeta: + "¿coordinas procedimientos con medicos externos? ¿cuantos?" y "¿como consultas su disponibilidad?"
- [ ] **#76 (vigente)** linea Free vs Pro feature-por-feature — nueva pregunta obligatoria: ¿que sostiene el tier $150 si los calendarios pasivos son gratis? (motor/volumen)
- Vigentes: #66 (prep DKapilar — viernes), #74 (loop Wilmer, check-in lun-mar), #57-65, #71-73, #77 (Grecia — ahora en su cancha)

### Riesgos activos (actualizado 2 Jul tarde)

1. **ALTO (heredado):** velocidad de adquisicion = horas de Diego. Ahora hay 2 loops candidatos (Wilmer silla-compartida + Stacy clinica-hub) — ninguno probado con plata aun.
2. **MEDIO (nuevo):** la linea de Orthos (+504 9787-0752, ex-Pinares) llevaba meses inactiva — riesgo de que el lado Meta no funcione (webhook, templates, quality). Mitigacion: QA #78 escena 3 ANTES de mandar el acceso a Stacy. (El Demo Bot ya fue revertido a OrionCare y sigue disponible para otros demos.)
3. **MEDIO:** teorizamos el modelo clinica-hub sobre N=1 (Stacy) — ir a CONTAR (mini-tarjeta #67 ampliada) antes de reorganizar pitch de calle.
4. **MEDIO:** semana densa sin cerrar: Grecia en su cancha, CDH sin reprogramar, Lumina viernes, DKapilar sabado (prep #66 pendiente = viernes).
5. **BAJO:** citas demo creadas SIN servicio no consumen sillon → si Stacy usa "cita rapida" la simulacion no luce. Mitigacion: guiarla al flujo con servicio.

### Para retomar proxima sesion

**Primera pregunta al retomar:** ¿Stacy entro — que dicen los `page_views` (navego, creo citas, cuanto tiempo)? ¿Escribio algo / pregunto por el medico externo (= trigger)? ¿La linea +504 9787-0752 probada (#84)? ¿Fix mobile mergeado a main (#85)? ¿Lumina viernes cerro? ¿Prep DKapilar (#66) hecha y como salio el sabado? ¿CDH reprogramado (#83)? ¿Noticias de Wilmer/colegas (check-in lun-mar, #74)?

**Query util para medir a Stacy (page_views):**
```sql
SELECT path, COUNT(*) AS vistas, MIN(created_at) AS primera, MAX(created_at) AS ultima
FROM page_views WHERE user_id='c56559ae-cfc8-482d-9134-92b096f7a98d'
GROUP BY path ORDER BY MAX(created_at) DESC;
```

---

## Sesion 3 Jul 2026 (VIERNES) — Stacy fria, patron del "2do toque", hallazgo CDA + precio en la sala

**Contexto entrante:** dia post-caceria. Lo primero fue medir a Stacy con page_views.

### 1. Stacy — post-mortem (probablemente perdida)

- **Los page_views eran de Diego**, no de ella: las citas del 3 Jul ("Dican", "Karen") las creo el probando la teoria TimeTree; la sesion del 2 Jul 5:41pm (6 min despues del seed, 6 paginas admin en 30s) = barrido de QA. Diego cree que ella nunca entro. **0 respuestas a los mensajes.**
- **Diagnostico real (de Diego):** el pitch de entrada fue "agenda con recordatorios + TimeTree", pero el dolor que ELLA verbalizo era coordinacion con medicos externos. El acceso auto-explorable mostro la parte que no vende; la escena guiada (la que ella pidio al pedir demo) nunca ocurrio.
- **Regla cultural de Diego (confirmada en campo):** el medico valora su tiempo — si no encajas A LA PRIMERA, no hay segunda oportunidad.
- **LECCION PLAYBOOK: acceso entregado ≠ demo hecha. Nunca soltar credenciales sin la escena guiada agendada/ejecutada.**
- Toque final opcional redactado (cerrar SU pedido: "le preparé el escenario de coordinación que me describió, 10 min cuando guste") — decision de Diego, no insistir.

### 2. Patron de la semana — mortalidad del "2do toque" → REGLA NUEVA

Grecia (2 no-shows), Lumina (planton 3 Jul, sin respuesta telefonica), CDH (visita perdida), Stacy (acceso sin demo) = **4 leads muertos/enfriados en el segundo toque**. Lo unico que avanzo fue lo que paso EN el momento (Wilmer emocionado en la conversacion; asistente CDA agendando al jefe ahi mismo).

**REGLA OPERATIVA NUEVA: todo lo cerrable se cierra en la primera visita** — demo guiada en el momento (en su celular / con su caso), precio en la sala, fecha de instalacion agendada antes de salir. "Le mando el acceso" / "regreso otro dia" / "le traigo propuesta" NUNCA como plan A.

### 3. Hallazgo CDA (Centro Dental Avanzado) — la bala del lunes

- Red NACIONAL de 5 sedes (Xcala TGU piso 8, Blvd. Suyapa, SPS, Juticalpa, Catacamas). Hub de alto perfil.
- **Tienen Dentalink** (ahi manejan citas) pero coordinan los medicos **por llamada/WhatsApp, SIN TimeTree** — un escalon PEOR que Stacy. **"Hasta 24 horas en cuadrar la cita con el paciente y medico"** = la cita de dolor mas dura y CUANTIFICADA de la tesis coordinacion (N=2 del DOLOR, no necesariamente del modelo hub).
- Champion: asistente que ademas es medico (da consulta general). **Pidio que Diego regrese el LUNES para que el jefe lo vea.**
- Flujo asumido por Diego (80%): paciente pregunta → llaman/msj al medico → paciente ESPERA hasta que haya respuesta → le avisan. Confirmar el lunes con pregunta inocente ("¿y mientras le responden, el paciente que hace?").
- **Marco de proliferacion (correccion de Diego al COO):** es irrelevante si los medicos rotan solo en sedes propias o tambien en clinicas ajenas — la jugada es LA MISMA: la clinica paga, los medicos entran free = semillas. Asumir que SI estan en otras clinicas (base: 7/10 multi-clinica). El numero de medicos no decide nada (solo mide fertilidad del vivero — dato de oido, no filtro).
- Guarda: **NO prometer cuenta-medico cross-clinica (#73 no construida)** — trampa Grecia.
- Tambien 3 Jul: 2 clinicas descalificadas (sin medicos rotantes) + Porsalud (sistema propio) = mini-tarjeta funcionando; viernes de pago = ruido, no señal.

### 4. Auditoria de plataforma a fondo (pedida por Diego: "¿estamos listos?")

**Veredicto: LISTA para piloto de 1 sede con provision manual.** Detalle:

LISTO Y PROBADO: motor resource-aware (QA 4 escenarios via API 2 Jul), **OrgSwitcher multi-org YA EXISTE en frontend** (usuario en N orgs cambia entre ellas → multi-sede se modela org-por-sede, medico rotante = 1 cuenta en varias orgs), Coexistence validado, templates completos, provisioning manual dominado (Orthos = 1 sesion via SQL).

**3 GAPS QUE NO SE PROMETEN:**
1. **Sin push de "cita nueva" al medico** — solo existe `reschedule_doctor` (le llega WhatsApp si el paciente pide reagendar). Cita nueva la ve al abrir su agenda. Decir "la ve en su app al instante", NO "le llega notificacion". Build ~1 dia si cliente pagando lo pide.
2. **Sin sync automatico entre orgs/sedes** (#73) — mitigacion: bloques "Ocupado" manuales + OrgSwitcher para ver cada sede.
3. **Agenda del medico = lista del dia** (sin vista mensual) — candidata #1 libro de demanda (rebote Stacy).

DATO TECNICO CLAVE: `resources` es org-scoped (no clinic-scoped) → multi-sede dentro de UNA org romperia los sillones. Org-por-sede lo evita. `calendars`/`service_types`/`whatsapp_lines` SI son por clinic_id.

**DRIFT DE RAMA (urgente):** `feat/page-tracking-navegacion` va **12 commits adelante de main** (PageTracker, fix outage edge functions, historial Coexistence, todo el polish mobile). page_views tiene datos de usuarios reales → **produccion aparentemente sirve la rama** — confirmar branch de prod en Vercel + merge #85 ANTES de instalar cliente nuevo.

### 5. Pricing CDA — decidido

- **$150/mes por sede** (tier multi-recurso existente — Xcala ES ese perfil; matiz honesto: $150 validado como aceptable-al-cierre con Skin Medic, NO como retenido — CDA seria la primera validacion de retencion del tier).
- **Primer mes gratis** con metrica pactada en voz alta: tiempo-de-cuadre 24h → nuestro numero en 30 dias. El mes gratis convierte la decision del lunes en "probar gratis con metrica", no "pagar $150".
- **El precio SE DICE EN LA SALA** (regla del 2do toque — propuesta escrita post-visita seria repetir el error Stacy), pero DESPUES de la calculadora a lapicero: A citas/semana × 1/20 que se enfria × ticket (se asume L.10K en voz alta, ellos corrigen — NO se pregunta el ticket) = fuga mensual vs $150 = "medio paciente recuperado lo paga".
- Razonamiento: ya pagan Dentalink (linea presupuestaria existe), señal de seriedad ante jefe de red nacional, no canibalizar la escalera ($40 aqui destruiria el precio en todo el mercado).
- **Escalera en el bolsillo:** si la calculadora revela operacion chica (2-3 medicos, poco volumen) → "$40 por medico" en la sala. La regla decide, no los nervios.
- Expansion (NO ofrecer lunes): 5 sedes ≈ $600-750/mes = **~mitad del hito paz mental en UNA cuenta**. Se negocia con el dato del mes 1.
- Cuentas de medicos gratis ilimitadas, explicito ("sus medicos no pagan nada") = las semillas.

### 6. Entregable

**`docs/ventas/kit-cda-lunes.md`** — secuencia de la visita, hoja calculadora imprimible, checklist de captura post-SI en 5 bloques (numero WhatsApp/lado Meta CRITICO incl. pregunta trampa "¿Dentalink manda recordatorios y desde que numero?"; personas; operacion/motor; baseline caso de estudio; acuerdos en-sala), gaps no-prometer, pendientes pre-lunes.

### Tareas activas (post-3 Jul)

- [ ] **#86** ✅ HECHO — Kit CDA en `docs/ventas/kit-cda-lunes.md` (imprimir hoja calculadora antes del lunes)
- [ ] **#87** LUNES 6 Jul: reunion jefe CDA — ejecutar kit (cerrar en la sala: demo + calculadora + $150 + mes gratis + fecha instalacion)
- [ ] **#85 (PRE-LUNES)** Merge rama → main + confirmar branch de prod en Vercel
- [ ] **#84 (PRE-LUNES)** Probar envio/recepcion linea Orthos +504 9787-0752 (la demo del lunes la usa)
- [ ] **#88** Decision Diego: toque final a Stacy (mensaje redactado, costo 0) o cerrar expediente
- [ ] **#89** Decision Diego: Lumina — ¿mensaje corto o se da por perdida? CDH (#83) sigue sin reprogramar
- [ ] **#74 (vigente)** Loop Wilmer: check-in natural lun-mar 6-7 Jul
- Vigentes: #76 (Free vs Pro), #82 (preguntas Stacy — reciclar para CDA: estan en el kit), #57-65, #67-73, #77 (Grecia en su cancha)

### Riesgos activos (actualizado 3 Jul)

1. **ALTO:** el lunes CDA es UNA bala (regla no-segunda-oportunidad) con 2 dependencias tecnicas abiertas (#84 linea sin probar, #85 drift de rama). Mitigacion: resolver ambas antes del lunes.
2. **ALTO (heredado):** velocidad de adquisicion = horas de Diego. La semana quemo 4 leads en el 2do toque — la regla "cerrar en la primera visita" es la respuesta estructural.
3. **MEDIO:** teorizamos CDA sobre 1 conversacion con el asistente — el jefe puede tener otra agenda (¿por que pagan Dentalink Y toleran 24h? puede haber politica interna). Mitigacion: descubrimiento DENTRO de la reunion antes del precio.
4. **MEDIO:** DKapilar sabado sin hoja de prep (#66 — Diego pidio no trabajarla hoy; queda bajo su control).
5. **BAJO:** $150 tier sin validacion de retencion (Skin Medic murio a 48h por gap tecnico). El mes gratis + metrica mitiga.

### Para retomar proxima sesion

**Primera pregunta al retomar:** ¿Como salio la reunion del lunes con el jefe de CDA — se cerro en la sala? ¿Que trajo el checklist (numero WhatsApp, medicos, sillones, Dentalink-recordatorios)? ¿#84 y #85 se hicieron antes? ¿Como salio DKapilar el sabado? ¿Noticias organicas de Wilmer/colegas? ¿Decidio Diego el toque final a Stacy (#88) y que hacer con Lumina/CDH (#89)?

---

## Sesion 5 Jul 2026 (DOMINGO) — Base rate de campo + war-gaming completo del piloto CDA

**Contexto entrante:** T-1 dia a la reunion CDA. Fin de semana: DKapilar no contesto (sabado), Stacy MIA, Lumina nunca abrio la puerta.

### 1. Base rate de campo — caza 4 Jul (6 clinicas) → clinica-hub = OPORTUNISTA

| Clinica | Hallazgo |
|---|---|
| Dental Roque | Personal rota dias fijos; dolor = coordinar con el PACIENTE → pitch core. Unica con quimica/dolor-producto de las 6 |
| Dental Integral | Externos SI, pero cada uno tiene asistente que responde rapido → **el dolor lo resuelve la capa humana** |
| Dental Smart | Recien instalo Dentalink, mucho papel; pitcheado $150 → lo vio como "recordatorios que Dentalink ya trae" y no vio valor |
| CDTM | Todos en piso, Dentalink. Descalificada |
| Summit | Papel, tipo NewSkin (burocracia multi-sucursal = OUT conocido) |
| Paper | Dolor = atraccion de clientes, no coordinacion. Fuera de ICP |

**Conclusiones:**
- **Base rate del dolor agudo de coordinacion: ~1 en 10** conversaciones de clinica (solo CDA en toda la muestra 3-4 Jul). Clinica-hub = cuenta oportunista, NO segmento. Con TAM TGU ~20 brutas → 2-3 cuentas maximo con ese perfil.
- **Pitch default de calle vuelve al CORE** (paciente perdido + numero propio + confirmacion con consecuencia). Coordinacion = cuña SOLO cuando la mini-tarjeta detecta latencia.
- **Insight Dental Integral (afila el filtro):** el dolor no es "trabaja con externos" — es **latencia de respuesta del lado del medico**. Externos CON asistente propia que responde = sin dolor. Filtro nuevo: "¿cuanto tardan en confirmar cita con un especialista externo?" — minutos = no hay venta.
- **Lecciones Dental Smart:** (1) "acaba de instalar un PMS" = descalificador temporal (switching cost recien pagado; revisar en 6-12 meses); (2) contra Dentalink NUNCA abrir con recordatorios/citas; (3) **Dentalink SI puede enviar desde el telefono de la clinica** (correccion de Diego) → pregunta trampa del numero RETIRADA del pitch; el numero queda en checklist solo por conflicto de instalacion.

### 2. Reframe del pitch CDA — cierre-en-el-momento (correccion de Diego al COO)

Flujo real CDA: odontologa general revisa → decide especialista → buscan contactar al especialista → **el paciente se va a casa y entra el ciclo de perseguirlo**. El producto para CDA = **"el paciente no se va sin fecha"** — cerrar la cita del especialista EN el momento, con el paciente presente.

- **Demo = escena de 60 segundos** (org Orthos): "su paciente esta en recepcion, la doctora dice 'necesita endodoncista'. Mire." → especialista → hueco real → cita → confirmacion al WhatsApp del paciente antes de levantarse. Todo lo demas es apendice.
- **Metrica del mes gratis reformulada:** "referidos que salen con cita el mismo dia: hoy ~0% → nuestro numero en 30 dias" (la misma 24h→minutos contada desde el paciente).
- **Calculadora reenfocada:** referidos a especialista/semana × 1/20 que se enfria × ticket ESPECIALISTA (endodoncia/implante, L.10K asumido en voz alta). Simulacion con 10 referidos/sem: fuga ~L.20K/mes = 5x el precio.
- **Respuesta a "eso lo hace Dentalink / un calendario gratis":** ya tienen Dentalink y calendarios gratis existen hace 10 años — y tardan 24h; ver el hueco ≠ cerrar y DEFENDER la cita (recordatorios + confirmacion con consecuencia + reagenda). Frontera: "Dentalink es su expediente; nosotros la coordinacion y la conversacion. Conviven."
- **Kit actualizado con 5 cambios** (apertura-pregunta, descubrimiento pre-precio, escena 60s, calculadora, seccion objecion 4.b + #85 marcado resuelto).
- **Lista de descubrimiento de 18 preguntas** entregada en chat (Diego la estudia; NO integrada al kit por decision suya). Decisivas: (1) "¿el paciente sale con su cita puesta?" (apertura), (6) ventanas fijas vs flotante (decide modelo y promesa), (7) top 2-3 especialistas por referidos (piloto 80/20), (8) "¿en que llevan su agenda?" (decide mecanismo y si hay sync posible), (9) ¿asistente propia? (valida el 24h), (11) "¿ya intentaron resolverlo?" (mina anti-objecion).

### 3. Escenario B war-gamed (flotante + medicos multi-clinica) — VENDIBLE con 0 codigo dia 1

Simulacion de Diego: flotante, 2-3 especialistas concentran referidos, llevan agenda propia, mayoria SIN asistente (= el 24h es real y estructural), 10 referidos/sem, 5 sillones → tier $150 se sostiene, escalera innecesaria.

**Playbook B (escalera de mecanismos, subir en orden):**
0. **Achicar 80/20:** piloto con los 2-3 especialistas top, el resto sigue por llamada.
1. **Calendario compartido solo-ocupado (0 codigo):** el medico comparte libre/ocupado de su GCal con la asistente (privacidad intacta — no ve otras clinicas). Asistente ve hueco → cierra en el momento. Metrica dura intacta.
2. **Bloques semanales impuestos por el JEFE (0 codigo):** la palanca sobre los medicos es del jefe (el da los pacientes), no nuestra.
3. **Tentativa + confirmacion WhatsApp (fallback):** reduce el ciclo, no lo elimina → promesa baja a suave + evaluar $40/medico.

**REGLA NUEVA (de Diego, confirmada en war-gaming): medico = VIEWER o SWITCHER, NUNCA dual-maintainer.** Jamas pedirle registrar en dos calendarios. Clave que desarma el miedo al doble trabajo: hoy el medico YA anota en su GCal tras cada llamada de CDA — con nosotros hace EL MISMO gesto gatillado por un WhatsApp. Trabajo neto nuevo: cero.

### 4. Circuito de calendarios — diseño completo con estimados (roadmap PRIVADO post-firma, NADA se promete en la sala)

| Peldaño | Que | Costo | Gatillo |
|---|---|---|---|
| WhatsApp "cita nueva" al medico | Cierra el circuito manual (reusa infra reschedule_doctor) | ~1 dia | Firma. Se construye ANTES de instalacion (unico build pre-dia-1) |
| Write-back OC→GCal | Citas CDA aparecen solas en su Google. **Fricción del medico → CERO** + protege la metrica (evita doble-compromiso por olvido) | ~2 dias | Fast-follow semana 1, apenas el lado Meta este asegurado |
| Entrada GCal→OC | Horas ocupadas de su GCal = bloques en OC → motor solo ofrece huecos reales → **asistente <1 min en UNA pantalla** | ~2-3 dias | Solo con evidencia del piloto (vistazo manual duele / colisiones) |
| Vista mensual / switcher | OC como su unico calendario (loop completo) | 1-2 sem | Solo con medicos activos pidiendolo |

- **Arquitectura write-back: CUENTA DE SERVICIO** (medico comparte su calendario con correo de servicio OrionCare con permiso de edicion — 30 seg, asistido en onboarding). NO OAuth por medico (verificacion Google = semanas, tokens testing expiran 7 dias).
- **TimeTree NO tiene API publica** → especialista en TimeTree = circuito manual permanente. La pregunta 8 del descubrimiento decide quien recibe sync.
- Experiencia dia 1 honesta: asistente ~90 seg (vistazo a calendario compartido en pestaña al lado); <1 min garantizado llega con la entrada GCal→OC. La metrica pactada es "sale con cita el mismo dia", no segundos.
- Decision de secuencia (COO, aceptada): NO cargar la ventana firma→instalacion con builds de growth — dia 1 minimo y a prueba de balas (leccion Skin Medic). Migracion de medicos NUNCA es proyecto: el switcher se gana con regalos (write-back), no se empuja.

### 5. #85 RESUELTO — drift de rama era falso alarma

`git fetch` 5 Jul: **el codigo ya esta en main via PRs #67-#72** (mergeados ~4 Jul). La rama `feat/page-tracking-navegacion` solo difiere en 3 commits de docs (estado-estrategia + kit CDA). Cero riesgo de drift para la demo. Push de los commits de docs: opcional, no bloquea.

### Tareas activas (post-5 Jul)

- [ ] **#84 (UNICO PRE-LUNES)** Probar envio/recepcion linea Orthos +504 9787-0752 + **imprimir hoja calculadora**
- [ ] **#87** LUNES 6 Jul: reunion jefe CDA — ejecutar kit (apertura-pregunta → descubrimiento → escena 60s → calculadora → $150 + mes gratis → fecha)
- [x] **#85** ✅ RESUELTO 5 Jul (codigo ya en main; quedan 3 commits docs, push opcional)
- [ ] **#90** DKapilar no contesto sabado — decidir: ¿un toque mas o expediente cerrado? (patron 2do toque otra vez)
- [ ] **#91** Dental Roque: unica de la caza con dolor-producto core — si se vuelve, es a CERRAR en esa visita (regla vigente)
- [ ] **#88/#89** Stacy toque final / Lumina-CDH — sin decision de Diego, no insistir
- [ ] **#74** Loop Wilmer: check-in natural lun-mar 6-7 Jul
- Post-firma CDA (si hay SI): checklist de captura del kit → lado Meta del numero → provision org → WhatsApp cita-nueva (1d) → write-back GCal (2d)

### Riesgos activos (actualizado 5 Jul)

1. **MEDIO (bajo de ALTO):** dependencias tecnicas pre-CDA — #85 resuelto; queda solo #84 (linea Orthos, prueba de 2 min pendiente al cierre de sesion).
2. **ALTO (heredado):** velocidad de adquisicion = horas de Diego. DKapilar se suma al patron del 2do toque (5 leads muertos/enfriados asi en 8 dias).
3. **MEDIO:** teorizamos CDA sobre 1 conversacion — el descubrimiento del lunes (preguntas 6-9) decide modelo, mecanismo y promesa ANTES del precio. El war-gaming cubre todas las ramas.
4. **MEDIO (nuevo):** sobre-diseño — la sesion invirtio horas en arquitectura de sync que UNA respuesta de la sala ("usan TimeTree"/"libreta") puede invalidar. Regla: ningun build post-firma arranca antes de tener las respuestas del descubrimiento.
5. **BAJO:** $150 sin validacion de retencion (mitigado: mes gratis + metrica pactada + piloto 1 sede).

### Para retomar proxima sesion

**Primera pregunta:** ¿Como salio CDA — se cerro en la sala? ¿Que revelo el descubrimiento: (a) ¿ventanas fijas o flotante? (b) ¿quienes son los top 2-3 especialistas? (c) ¿agenda en Google/TimeTree/libreta? (d) ¿asistente propia? (e) ¿desde que numero manda Dentalink? ¿Se hizo #84 antes? ¿Se pacto metrica y fecha de instalacion? Luego: Wilmer (check-in), DKapilar (#90), Stacy/Lumina (#88/#89).

---

## Sesion 6 Jul 2026 (LUNES) — CDA murio + redefinicion completa del ICP con datos reales (Wilmer + Consultorio Familiar)

**Contexto entrante:** dia de la reunion CDA. Resultado: MUERTA. El resto de la sesion fue analisis de datos (SQL via MCP Supabase) sobre los dos clientes activos para entender que ICP sostienen realmente los datos, no la teoria.

### 1. CDA — muerta, confirma base rate ya visto

Diego fue a la reunion pactada; el jefe no estaba (trabaja en otra ciudad). La asistente le menciono el proyecto al jefe de pasada — **sin la escena de 60s, sin calculadora, sin descubrimiento** — y el jefe no mostro interes. Dato duro que trajo Diego: son solo **~4 especialistas** esperando 24h, no una operacion grande. Diagnostico: no hubo pitch real (fue relato de segunda mano, no demo), Y el perfil (dolor de coordinacion delgado + Dentalink ya cubre recordatorios) confirma lo que la caza del 4 Jul ya habia mostrado — coordinacion = ~1/10, oportunista. **Puerta pasiva abierta (si el jefe pregunta, se responde), sin insistir.** Duda de Diego validada: "confirmacion" NO es cuna contra Dentalink (ya envia recordatorios/confirmaciones desde el numero de la clinica).

### 2. Correccion del filtro ICP — Wilmer rompe su propio filtro

Diego cuestiono el filtro que se armo en la sesion ("asistente saturada" + "silla compartida = dolor"): **Wilmer no tiene asistente (contesta el mismo) y el loop de silla-compartida lleva 5+ dias sin moverse** (si doliera de verdad, ya hubiera reclutado colegas). Filtro corregido a 2 preguntas: (1) ¿como agenda hoy? (papel/WhatsApp/TimeTree, no Dentalink comodo), (2) ¿se le pierden pacientes por no contestar a tiempo? — sin exigir asistente ni silla-compartida como requisito, solo como señales que suben probabilidad.

### 3. Analisis completo de datos de Wilmer (bot + agenda) — la pregunta que rompio la tesis

Auditoria via SQL (bot_conversation_logs, appointments, patients, message_logs, page_views) para Wilmer:
- **258 logs de bot, 46 pacientes distintos.** Booking 26%, FAQ 19%, greeting 16%, navigation 11%, confirm 9%, completed 6%, handoff 5%.
- **Bugs de FAQ encontrados:** (a) acentos rompen el match ("Dónde" no matchea keyword "donde" sin tilde) — silencio, no error, pasa inadvertido; (b) keyword generico "precio" secuestra FAQs especificas (blanqueamiento/restauraciones) dando **respuesta incorrecta**, peor que silencio; (c) gap real: no existe FAQ de "limpieza dental" (preguntada 3+ veces). Playbook actualizado (gotcha #1: `intent='confirm'` SI se loggea ahora, contradice nota de abril).
- **Bug tecnico nuevo (anotado en estado-dev.md):** en `booking_select_hour`, si el paciente escribe la hora en texto libre ("9 am") en vez de elegir el numero de lista, la confirmacion mostro una hora distinta (12:00 PM). El paciente se autocorrigio esa vez, pero no todos lo notarian. Pendiente de investigar codigo (NO tocar por feature freeze).
- **Reagendamiento:** 11 de 46 pacientes (24%) intento reagendar/cancelar alguna vez; solo 4-5 completaron el cambio 100% solos via bot.
- **LA PREGUNTA CLAVE (de Diego): ¿los que se autoagendaron ya estaban en la BD o eran leads nuevos?** Resultado: **127 citas totales, pero solo 7 (5.5%) se completaron de punta a punta via bot** — el 94.5% las agenda Wilmer manualmente (via `/citas/nueva`, que visito 19 veces). Y de esas 7, **las 7 (100%) eran pacientes YA existentes** (antiguedad de dias a meses) — **cero leads nuevos autoagendandose de cero.**
- **Esto invalida la premisa "paciente perdido por no contestar rapido"** como el dolor que Wilmer demuestra. Lo que SI sostiene el dato: Wilmer agenda presencial, el bot le ahorra **tiempo administrativo** (recordatorios + confirmacion de 121 citas historicas) + dan autoservicio ocasional a un puñado de recurrentes.
- **Contradiccion encontrada con el pitch original:** el reporte de la llamada de venta a Wilmer (25 Mar, `docs/reporte-guevara-25mar*.md`) YA usaba el argumento "pacientes de noche que se hubieran perdido" — construido sobre una muestra de 3 citas (2 de noche) en un mes. Los 4 "pacientes del sitio web capturados" que reportaba esa llamada **no existen hoy como pacientes** — no hay forma de confirmar que se hubieran perdido sin el bot; nunca hubo contrafactual. Es decir: **el pitch actual de "no pierdas pacientes" nace de la misma anecdota que ahora reciclamos como tesis de ICP — razonamiento circular.**
- **No-shows:** solo 4 de 127 (3.1%) auto-canceladas — tasa baja, sin baseline pre-bot para afirmar "redujimos no-shows".
- **Hora de confirmacion:** 46% de las confirmaciones ocurre a las 11am hora Honduras — coincide con la hora fija del cron de recordatorios (`send_reminders_daily_11am_tgu`), NO es comportamiento espontaneo. Pero **27% confirma entre 7-8pm**, fuera de horario de atencion (8am-5pm) — esa si es evidencia real de valor 24/7.
- **Recurrencia:** mediana 1.5 citas/paciente (mitad de los 61 pacientes solo tuvo 1 cita). El 20% (12 pacientes) con 4-7 citas muestra **rafagas de visitas seguidas en semanas** (patron de fase de tratamiento), no relacion cronica permanente. Los procedimientos tageados (solo 16% de citas, y casi todos de Jun-Jul cuando se lanzo el motor) muestran mayoria diagnostico/limpieza/extraccion — de una sola sesion, sin confirmar la hipotesis de tratamiento multi-sesion. Data quality: 2 de los 12 recurrentes tienen conteos inflados por cadenas de reagenda (misma cita movida, no visitas distintas) — util para no sobre-vender el caso de estudio, pero irrelevante para el ICP.

### 4. Comparacion N=2 — Consultorio Familiar (Yeni) vs Wilmer

Para responder "¿fue Wilmer solo timing + gusto personal?", se corrio el mismo analisis sobre el otro cliente activo:

| Metrica | Wilmer (dental, solo) | Consultorio Familiar (con secretaria) |
|---|---|---|
| Citas totales | 127 (7 meses) | 46 |
| Promedio citas/mes | ~18 | ~8 |
| Auto-canceladas (no-show real) | 3.1% | **19.6%** |
| Logs de bot | 258 | 251 (casi igual pese a menos citas) |
| % logs = booking | 26% | **59%** |
| % logs = FAQ | 19% | 1.6% |

**Conclusion:** el producto SI genera uso real en un contexto bien distinto (clinica con secretaria + centro de diagnostico por imagen, no solo dentista sin asistente) — no es puro azar de personalidad de Wilmer (N=2, no N=1). Pero **el dolor que resuelve es distinto en cada caso**: Wilmer = ahorro de tiempo administrativo (pocos no-shows); Consultorio Familiar = **reduccion real de no-shows** (1 de cada 5 citas se auto-cancela — probablemente por ser citas de diagnostico/referido, vinculo mas debil que "tu doctor de siempre"). **El ICP tiene 2 ganchos de venta segun el perfil del prospecto, no uno universal.**

Chequeo adicional: Consultorio Familiar NO parece enfriarse (otro falso-negativo de `last_sign_in_at`, igual que el 28 Jun) — la secretaria tiene `page_views` activos HOY mismo, aunque no crea citas nuevas ni manda mensajes manuales desde hace 10-12 dias (24 y 26 Jun respectivamente). Señal de bajo ritmo, no de abandono.

### ICP redefinido (reemplaza el de la sesion 5 Jul)

**Perfil:** clinica/consultorio pequeño (1-3 profesionales) con agenda manual (papel/WhatsApp/TimeTree, no Dentalink asentado), CON ALGUNO de estos dos dolores reales:
1. **Tiempo administrativo** — el doctor/secretaria pierde horas mandando recordatorios/confirmaciones a mano (perfil Wilmer).
2. **No-shows reales** — pacientes de paso/referidos/diagnostico que olvidan o no priorizan la cita (perfil Consultorio Familiar).

**Explicitamente FUERA / no usar como pitch principal:**
- "Se pierden pacientes NUEVOS por no contestar rapido" — sin evidencia en ningun caso de estudio propio.
- Coordinacion con especialistas externos (clinica-hub) — ~1/10, oportunista (confirmado 2 veces: caza 4 Jul + CDA hoy).
- Cadenas grandes con PMS pagado y jefe lejano (patron CDA/NewSkin) — no hay wedge.
- Asistente saturada / silla-compartida como REQUISITO — son señales que suben probabilidad, no dolor en si (Wilmer no tiene ninguna de las dos).

### Tareas activas (post-6 Jul)

- [x] **#87** CDA ejecutada — MUERTA (jefe sin interes, dolor delgado). Puerta pasiva, sin insistir.
- [ ] **#92** Decidir si Dental Roque se vuelve a visitar (unica con dolor-producto core de la caza del 4 Jul) — si se vuelve, es a CERRAR.
- [ ] **#93** Bug `booking_select_hour` texto libre ("9am" → hora incorrecta en confirmacion) — documentado en estado-dev.md, NO tocar hasta post-freeze.
- [ ] **#94** FAQs: normalizar acentos + prioridad de match + agregar FAQ limpieza dental — documentado, diferido a post-freeze.
- [ ] **#74 (vigente)** Loop Wilmer: check-in aun pendiente (se desvio la sesion hacia analisis de datos).
- [ ] **#90 (vigente)** DKapilar — decidir un toque mas o cerrar expediente.
- [ ] **#88/#89 (vigente)** Stacy/Lumina/CDH — sin decision de Diego, no insistir.

### Riesgos activos (actualizado 6 Jul)

1. **ALTO:** pipeline sin ningun prospecto caliente tras la muerte de CDA — Dental Roque es la unica candidata viva, y no esta agendada visita.
2. **MEDIO:** el pitch de venta actual ("no pierdas pacientes") no tiene respaldo en ninguno de los 2 casos de estudio reales — riesgo de venderle a un prospecto con una promesa que Wilmer/Yeni no demuestran. Usar en su lugar: tiempo administrativo (Wilmer) o reduccion de no-shows (Consultorio Familiar), segun el perfil.
3. **MEDIO (heredado):** velocidad de adquisicion = horas de Diego. Racha de leads muertos en el "2do toque" sigue sin frenar (CDA es el ultimo de la lista).
4. **BAJO:** 2 bugs tecnicos reales encontrados (acentos en FAQ, hora libre en booking) — no bloqueantes, documentados para cuando termine el freeze.

### Para retomar proxima sesion

**Primera pregunta:** ¿Diego hizo el check-in con Wilmer sobre sus colegas (loop silla-compartida, pendiente desde el 5 Jul)? ¿Alguna decision sobre Dental Roque (visitar de nuevo) o DKapilar (#90)? ¿Se uso el ICP de 2 ganchos (tiempo administrativo / no-shows) en algun prospecto nuevo?

### Notas de cierre (mismo dia, post-analisis) — 2 pendientes para mañana

**#95 — URGENTE, fuga de ingreso real:** Consultorio Familiar (Yeni) **NO se le esta cobrando.** Se habia marcado como PERDIDO/churn el 22 Jun junto con David (Ecoclinicas) — pero los datos de hoy confirman que SI esta activo (secretaria usando la plataforma a diario, `page_views` hasta hoy mismo). Osea: hay uso real sin monetizar. Revisar y decidir como facturar retroactivo/a partir de ahora. Ademas: **revisar David/Ecoclinicas con los mismos logs antes de asumir que tambien es churn** — mismo patron de falso negativo que ya se repitio 2 veces.

**#96 — Lead nuevo fuera de ICP, evaluar mañana:** Diego conocio en la calle a **Evelia**, dueña de un negocio de renta de buses con contratos con empresas grandes (ej. Pepsi). Su esposo fundo y operaba el negocio, murio hace ~1 año. Ella dio a entender que podria necesitar ayuda. Dos lecturas de Diego, sin resolver: (a) necesita apoyo administrativo real (un "asistente" para el negocio, dolor genuino post-fallecimiento del esposo), o (b) no es un lead de negocio real (posible interes personal/no serio, o simplemente no hay necesidad real). **Fuera del ICP medico/dental por completo** (logistica/transporte, contratos corporativos — problema probablemente distinto a agendar citas por WhatsApp).

**Desarrollo de la idea (misma sesion):** Diego considero la posibilidad de que ella lo contrate con salario para construir algo por dentro del negocio. **Bandera roja identificada:** esto es exactamente el "Modelo C: agencia/bespoke" que ya se rechazo como TRAMPA en la sesion del 27 Jun (re-examen de tesis) — consume las 4-5h/dia protegidas para OrionCare+familia, es tiempo-por-dinero (no escalable), y seria codigo bespoke para 1 cliente fuera de OrionCare. **Si Evelia ofrece empleo/consultoria, es una decision de vida/finanzas personal de Diego, separada de la estrategia de OrionCare — NO es diversificacion 2027 ni pipeline de ventas.**

**Como Diego debe averiguar intenciones reales de Evelia (antes de asumir):** pregunta directa — "¿esta buscando una herramienta que ya exista, o a alguien que se sume al negocio?" + si menciona contratar, preguntar modalidad (tiempo parcial/proyecto/planta) + preguntar si ya tiene idea de presupuesto (revela madurez real de la necesidad).

**Como medir la magnitud del negocio (una sola conversacion, 7 señales):** (1) cuantos buses tiene la flota, (2) cuantos contratos corporativos activos y desde hace cuanto, (3) formalidad (RTN/contratos escritos vs. todo de palabra), (4) como llevaba el esposo el control (Excel/cuaderno/todo en la cabeza — define el tamaño real del trabajo de "organizar"), (5) tiene alguien mas administrando o esta sola, (6) el negocio crecio/se mantuvo/se redujo en el ultimo año sin el, (7) pregunta directa: "¿cuantos buses y con cuantas empresas trabaja hoy?".

**Decision de si Diego deberia trabajar con ella (aparte de medir el negocio):** depende de 4 preguntas propias — cuantas horas/semana pide realmente (salen de las horas ya comprometidas a OrionCare+familia, no de la nada), cuanto pagaria (cifra concreta, no idea vaga), si es el tipo de trabajo que sabe hacer bien (sistema de agenda/contratos = cercano; logistica de flota/mantenimiento = negocio nuevo que aprender), y que le costaria a OrionCare decir que si. **La pregunta que mas pesa: cada hora aqui es una hora que no sale para cerrar clientes o hacer crecer OrionCare.**

No construir nada aun. Evaluar mañana con lo que Diego averigue.

---

## Sesion 8 Jul 2026 (MIERCOLES) — Post r/SaaS + reconstruccion del historial real de canales de adquisicion

**Contexto entrante:** sin agenda de decisiones — Diego pidio redactar un post para r/SaaS pidiendo feedback externo honesto sobre adquisicion (COO no habia resuelto el pipeline vacio post-CDA, asi que la idea es crowdsourcing gratis en vez de mas teoria interna). El ejercicio de escribir el post con "todo el contexto posible" obligo a reconstruir con precision de donde vino cada cliente historico — trabajo que nunca se habia hecho explicito en memoria.

### Hallazgo principal: 4 clientes en 6 meses, 1 por canal, cero canales probados como repetibles

| Canal | Cliente | Resultado |
|---|---|---|
| Ads (Meta, corrio ~2 meses en paralelo a un pivot de mensaje) | Medilaser $75/mes | Churn — ver detalle abajo |
| Llamadas frias a un listado | Wilmer $35/mes | **Unico activo hoy** (7 meses, NPS 9.5) |
| Presencial / puerta a puerta | Skin Medic $150/mes | Churn en 48h — ver [[skin-medic-perdido]] (ya documentado, confirmado consistente hoy) |
| Mensajes en frio por WhatsApp | Ecoclinicas $35/mes | Churn por inactividad ("sin movimiento") |

**Por que importa:** cada canal convirtio exactamente 1 vez. Eso es indistinguible entre "cada canal funciona a una tasa baja que no se ha empujado lo suficiente" y "las 4 conversiones fueron anecdota/suerte y ningun canal esta realmente validado". Con n=1 por canal, cualquier decision de "doblar apuesta en X canal" hoy seria sobre-ajuste a ruido. Memoria nueva creada: [[canales-adquisicion-sin-repetibilidad]].

### Correccion — Medilaser $75/mes (antes solo se sabia "perdido 22 Jun, desconectada, Kener sin contestar")

Vino de **ads**, durante un tramo en que el mensaje/ICP estaba pivotando (targeting inconsistente). Cliente en otra ciudad (SPS), aparentaba ser multi-recurso. Causas de churn, todas compuestas: (1) comunicacion pobre con la doctora — poco tiempo disponible; (2) la asistente actuo mas como barrera/gatekeeper que como aliada; (3) sin WhatsApp Coexistence activo en ese momento; (4) tuvieron un problema con su linea principal, pidieron recuperar el numero que habian integrado, y luego desaparecieron. Dificil aislar la causa raiz — combo de comunicacion + producto + operacion.

### Correccion — CDA (muerte del lunes 6 Jul)

La version guardada el 6 Jul decia "el jefe no estaba, se entero de oidas por la asistente, sin interes." Diego corrige: la causa real es que **en la (segunda) visita se confirmo que el dolor era delgado** — solo coordinan con ~5 especialistas externos, espera de hasta 24h para compartir agenda, no es lo bastante frecuente/costoso como para disparar una compra. Mismo patron que otras clinicas de la caza del 4 Jul, donde la mayoria del personal trabaja en planta (sin necesidad real de coordinacion externa). No fue un fallo de ejecucion de la visita — fue diligencia que revelo que el segmento no calificaba.

### Correccion — Skin Medic $150/mes

Confirmado que el post-mortem ya guardado ([[skin-medic-perdido]]) es correcto y completo: fallo tecnico/operativo (sin Coexistence, cierre-reapertura de cuenta, dia perdido de operacion, cuenta bloqueada por Meta por falta de sitio web verificado), no un problema de precio o desinteres. Sin cambios a esa memoria.

### Entregable

Post completo para r/SaaS redactado (titulo + cuerpo con desglose canal-por-canal, los 2 deals que murieron con las causas reales, y 5 preguntas especificas). Vive en el scratchpad de esta sesion (no en el repo, es contenido efimero de una vez). **Pendiente: Diego publica y trae los comentarios a una proxima sesion para que el COO los procese.**

### Tareas activas (post-8 Jul)

- [ ] **#97** Diego publica el post en r/SaaS y trae resultados/comentarios a la proxima sesion de estrategia.
- [ ] **#95 (vigente, sin resolver)** Consultorio Familiar sigue sin facturarse pese a uso real confirmado — fuga de ingreso pendiente.
- [ ] **#92/#90/#88/#89 (vigentes)** Dental Roque, DKapilar, Stacy/Lumina/CDH — sin decision nueva de Diego esta sesion.

### Para retomar proxima sesion

**Primera pregunta:** ¿Diego publico el post en r/SaaS? ¿Que comentarios llegaron — hay una senal real sobre que canal doblar o el consenso es "necesitas mas data"? Ademas, retomar lo que quedo pendiente del 6 Jul: check-in Wilmer (loop silla-compartida), decision Dental Roque, y la fuga de ingreso de Consultorio Familiar (#95).

---

## Sesion 9 Jul 2026 (JUEVES) — Libro leido + diseño del primer experimento pre-registrado

**Contexto entrante:** Diego pidio leer completo "The Experimentation Machine" (Bussgang, PDF en `docs/Libros/`) y responder: ¿sigue aplicable? ¿nuestro proyecto tiene futuro? ¿pivotamos?

### Veredicto del libro aplicado a OrionCare

1. **El libro sigue 100% aplicable** — metodos atemporales, solo las menciones de herramientas envejecieron. La parte "10x founder con IA" ya la ejecutamos mejor que sus casos. CAVEAT: escrito para VC-backed con mercados $25-50M+; filtrar todo lo de valuaciones/TAM/fundraising — la maquinaria de experimentacion SI aplica directo. Frameworks completos en [[libro-experimentation-machine]] (memoria actualizada hoy).
2. **HUNCH aplicado:** U (usage) verde n=2; N (NPS 9.5) verde n=1; C churn historico 75% pero causas operativas corregidas; LTV:CAC incalculable; **H (hair-on-fire) NUNCA MEDIDO — el hueco central.** Nivel PMF: **Nascent** (1 de 4).
3. **Insight clave:** "1 cliente por canal, ninguno repetible" tiene 2 explicaciones y asumiamos la equivocada. El libro: si el problema quema, el cliente intenta apagarse el fuego con un ladrillo — conversiones raquiticas parejas en 4 canales distintos es mas consistente con **CVP tibio** (problema de CVP) que con canales mal ejecutados (problema de GTM). Falsificable y barato de probar.
4. **NO pivotamos todavia** — falta el experimento que discrimina. Pivotar hoy = sobre-ajustar a ruido (coherente con conclusion del 8 Jul).

### Decision 1 — 40% test (Sean Ellis + follow-ups Superhuman) con clientes activos

- Guion completo en **`docs/ventas/guion-40-test.md`** (enlazado en `docs/ventas/index.md`). Version A = Wilmer (incluye check-in loop colegas); Version B = secretaria Consultorio Familiar (incluye facturacion #95 + correccion citas madrugada).
- Provenance: P1 = test de Sean Ellis (benchmark 100+ startups, umbral 40% "muy decepcionado"); P2-P4 = las 3 follow-ups de Rahul Vohra/Superhuman (beneficio→pitch, persona→targeting, mejora→libro de demanda). Adaptaciones Honduras: llamada no encuesta, salida digna en P1 (sesgo cortesia), "solo una cosa" en P2, perfil-no-nombre en P3, permiso-para-criticar en P4.
- **Diego agenda la llamada ~10 Jul.**

### Decision 2 — Arbol de decision PRE-ACORDADO (no se cambia despues de oir respuestas)

- **A. Pasa el test** → pitch = frase textual de Wilmer; filtro = su P3; disparar Experimento #1.
- **B. Tibio en AMBOS** → CVP nice-to-have incluso en el mejor caso → conversacion de pivote CON datos (otro WHO u otro WHAT).
- **C. Loop colegas avanzo** → salta la fila: visita esa semana, cerrar-en-primera-visita, mes 1 gratis.

### Decision 3 — Experimento #1 spec v2 (llamadas frias pre-registradas)

**Correccion de Diego al diseño v1:** las listas son heterogeneas (medicos de IG, tamaño desconocido) → lista sucia mide la LISTA, no el pitch; 0 cierres seria ininterpretable. Rediseño en 2 etapas:

1. **Etapa escritorio (Claude):** descarte grueso via Maps/IG/web — cadenas, hospitales, recepcion 3+, multi-sucursal-burocracia, recien-instalo-PMS.
2. **Calificacion en primeros 60s de llamada** (conductual, NUNCA volumen): "¿quien les lleva la agenda?" + "¿comparten consultorio?" (+ TimeTree si Wilmer lo confirma). Califica → pitch; no califica → registrar perfil. **Bonus: censo TAM real** (el "ir a CONTAR" pendiente desde 30 Jun).

Parametros: **n=20 CALIFICADAS** (~40-50 marcaciones), 3-4 sem, exito ≥3 visitas y ≥1 cierre → escalar n=50 + replicar SPS; fracaso 0-1 visitas → conversacion de segmento con datos. Diego calibra llamadas 1-5, Warhol toma 6-20 (pendiente confirmar). Congelado durante el experimento: cero ads (atribucion limpia), cero features. Matematica de contexto: si valida ~5% cierre → 7-9 clientes ICP restantes = ~150-180 llamadas en 4-6 meses; el loop silla-compartida mejora esa matematica si convierte.

### Hallazgo — score INVERTIDO en `Investigar ICP.xlsx`

Lista de la era motor-$150 (research Gemini): ~12-14 candidatos (5 torres + 7 clinicas). Puntua ALTO exactamente lo que hoy NO es ICP (ads/web optimizada/staff exclusivo/premium = problema ya resuelto; CDA score 5 y ya murio). **El perfil-Wilmer es invisible online** — cuanto mas facil encontrar la clinica en internet, menos probable que sea ICP. Consecuencias: (1) re-scorear lo existente con criterio nuevo (torres SUBEN: 40 consultorios chicos = cardumen perfil-Wilmer, puerta = asistente); (2) las listas de IG de Diego son mejor materia prima. **Matiz registrado:** "situacion de Wilmer" ≠ "medico independiente" — el parecido es CONDUCTUAL (agenda el mismo + comparte silla); independiente generico sigue FUERA salvo excepcion champion no-pagado (addendum 9 Jul), y la pregunta calificadora la detecta sola.

### Chequeo SQL — Consultorio Familiar VIVO (org `a182a362-62e4-45f4-84c7-f76c0735390c`)

- **Acceso:** secretaria (`yenimelissa_22+secretaria@`) 17 page views en 4 dias distintos 1-8 Jul, ultimo 8 Jul 7:12pm. Unica usuaria (consistente: ella opera, Yeni no entra).
- **Recordatorios funcionando de punta a punta SOLOS:** cita del 8 Jul recorrio conf → r24h (leido) → followup sin-confirmar (leido) → sin confirmacion → **auto-cancelada + slot liberado + template entregado**. Confirmacion-con-consecuencia operando en produccion sin intervencion.
- **Pipeline: 12 citas futuras** (15 Jul → 9 Sep). Bache de mensajes 27 Jun–7 Jul (secretaria siguio entrando; huele a semana floja de la clinica) reactivado el 8 Jul (8 out, 3 in, 1 cita nueva, 1 sesion bot).
- **Flag 1:** 3 citas de agosto con hora de MADRUGADA (01:00, 02:15, 02:30 — 10/11/12 Ago) = probable error de captura AM/PM de la secretaria; si no se corrige, recordatorios saldran con hora absurda. Corregir via llamada #99 o soporte.
- **Flag 2:** #95 facturacion mas urgente que nunca — uso diario + ciclo de valor completo + 12 citas futuras = la conversacion de cobro es SEGURA (no existe el "es que no lo usamos").

### Addendum 9 Jul (2da sesion del dia) — Asimetria pre-registrada del 40% test

Diego cuestiono si el test aplica igual a ambos clientes. Correccion PRE-REGISTRADA (antes de cualquier llamada, por lo tanto valida — la regla congela el arbol DESPUES de oir respuestas): **el test que decide es el de Wilmer** (unico caso usuario=pagador, 7 meses de uso); la llamada a la secretaria de Consultorio Familiar se reencuadra como **discovery+cobro** (primario: facturacion #95 + correccion AM/PM; secundario: discovery del gancho no-shows; el 40% va de yapa al final como señal de retencion del champion, NO veredicto de CVP — ella ni eligio ni paga, y el uso consistente lleva ~10 dias). Arbol ajustado en `docs/ventas/guion-40-test.md`: rama A se dispara aunque la secretaria salga tibia; rama B requiere tibio en ambos; rama B' nueva (Wilmer tibio + secretaria entusiasta = analizar si el CVP real es el gancho no-shows, sin pivotar mecanicamente). Dato operativo del dia: Wilmer con 2 citas hoy (11:30 y 14:00, ambas confirmadas) — tarde despejada despues de 2:30 PM si quiere llamar hoy.

### Tareas activas (post-9 Jul)

- [ ] **#98** Diego agenda y ejecuta llamada 40% test con Wilmer (~10 Jul) — guion version A. Dictar respuestas a Claude para registro.
- [ ] **#99** Llamada secretaria Consultorio Familiar (misma semana) — guion version B REENCUADRADA: discovery+cobro primero (facturacion #95 + citas madrugada), 40% de yapa al final.
- [ ] **#100** Diego pasa a Claude las listas de IG + estado real del G-Sheet (¿sigue vivo o los Excel son la fuente?).
- [ ] **#101** Claude: dedupe + re-score + descarte grueso → cola depurada de llamadas (bloqueada por #100; filtro final espera P3 de Wilmer).
- [ ] **#102** Decision pendiente de Diego: ¿Warhol toma la cadencia de llamadas 6-20?
- [ ] **#97 (vigente)** Post r/SaaS — publicar y traer comentarios.
- [ ] **#92 (vigente)** Dental Roque sin decision.

### Para retomar proxima sesion

**Primera pregunta:** ¿se hizo la llamada a Wilmer? → registrar respuestas textuales en `docs/ventas/guion-40-test.md` y leer el arbol: rama A dispara Experimento #1 (necesito #100 para armar la cola), rama B espera el dato de la secretaria antes de concluir, rama C = visita al colega esa semana. NO cambiar los umbrales pre-registrados despues de oir las respuestas.

---

## Sesion 9 Jul 2026 NOCHE (3ra del dia) — 40% test Wilmer ejecutado + assets completos del Experimento #1

**Contexto entrante:** Diego trajo las respuestas de Wilmer la misma tarde.

### 1. 40% test Wilmer — resultado y lectura (registro completo en `docs/ventas/guion-40-test.md`)

- **Loop colegas MUERTO:** colega 1 "interesado pero no prioridad" (plaza de gobierno, casi no atiende consultorio = pocas citas = poco dolor); colega 2 enfocada en su embarazo. Rama C descartada. Colega 1 = puerta pasiva.
- **P1: "estaria afectado... terminaria buscando otra app que haga lo mismo"** → bajo la rubrica pre-registrada = ALGO afectado, **rama A NO dispara**. Matiz registrado: la dependencia es del JOB (no volveria a mandar recordatorios a mano — problema must-solve), lo tibio es la DIFERENCIACION (sustituible). Para el ICP hondureño el sustituto es teorico (no usan nada), pero eso se discute con n≥2.
- **P2 (el pitch):** los recordatorios — "hasta 1 hora los fines de semana enviando los recordatorios de la semana". Cuadra con sus datos: viernes = dia pico (28 de 114 citas), sabado trabaja solo tarde → los recordatorios se comian su unico espacio libre. Señal extra: su esposa se siente "extraña" sin visibilidad de la clinica pero confian en la app.
- **P3 (targeting):** "medico que trabaja solo en su consultorio, igual que el" — y descalifico su propia silla-compartida como "atipica". Tension con regla 30 Jun (independiente FUERA) resuelta via filtro conductual: "¿quien manda los recordatorios?" — el requisito silla-compartida pierde soporte.
- **P4 (friccion):** no soporta numeros extranjeros (esos recordatorios los manda a mano) → libro de demanda, congelado durante experimento.
- **Veredicto del arbol: EN SUSPENSO hasta #99** (rama B exige tibio en AMBOS). NO se cambiaron umbrales post-hoc.

### 2. Decision — NO pivote; el experimento ES el test de pivote

Diego pregunto si pushear llamadas o buscar pivote (predice que Elena saldra tibia y se quejara del inbox). Respuesta COO: (a) la tibieza de Elena YA esta descontada (pre-registro: su 40% es yapa, ella ni elige ni paga); (b) el test real de esa cuenta = **si Yeni paga** (preferencia revelada > declarada; pre-registrado ANTES de la llamada: paga sin friccion = señal CVP positiva del gancho no-shows / se resiste = rama B con mas peso); (c) falsa dicotomia: un pivote hoy apuntaria a "solo-doctor + recordatorios" (P3 de Wilmer) — exactamente lo que el Experimento #1 prueba con el filtro nuevo. Jerarquia de evidencia a esta escala: paga > usa > refiere > contesta encuestas (el 40% con n=2 es entrevista de profundidad, no estadistica; el test estadistico real es el Experimento #1 porque mide comportamiento a n=20).

### 3. Consultorio Familiar — datos frescos + acceso + hoja de llamada Yeni

- **VIVA:** Elena (secretaria) entro HOY (5 de ultimos 9 dias); 12 citas futuras 15 Jul→9 Sep; ~9-10 citas/mes estable; auto-cancel historico 10/47 = 21% (el gancho); bache de mensajes 27 Jun-7 Jul reactivado el 8.
- **Flags operativos para la llamada:** (a) 3 citas madrugada agosto — Patricia Solorzano 10 Ago 02:30 (¡confirmacion YA enviada con hora absurda!), Thaily 11 Ago 01:00, Sarita 12 Ago 02:15; patron AM/PM repetido en 3 fechas de captura distintas → corregir CON Elena, no en silencio; plazo hasta ~9 Ago. (b) Sorayda Martinez 15 Jul 10:30 sin NINGUNA confirmacion enviada — vigilar que el r24h salga el 14 Jul. (c) Flag tecnico menor: 3 citas con confirmation_message_sent=false pero template entregado/leido en mayo (inconsistencia de flag, no de entrega) → deuda post-freeze.
- **Acceso y contacto (pregunta de Diego resuelta):** cuenta admin propia `admin@consultoriofamiliar.com` (ultimo login 29 Jun, del revival; password en Chrome PM; respaldo = super-admin). Secretaria = **Elena Pineda Carcamo, +504 9782-5738** (tabla secretaries, dato de marzo). Canal garantizado: WhatsApp a la linea de la clinica +504 9768-2454 cae en el inbox que Elena lee a diario.
- **Hoja de llamada Yeni (Yeni pidio que la llame pronto):** (1) recap de valor 30s con numeros (12 citas futuras, 1 de cada 5 rescatada); (2) precio SE DICE: $35/mes, SIN retroactivo (el hueco fue error nuestro), arrancar julio, concesion unica = agosto a cambio de algo; (3) logistica EN la llamada (metodo, recibo/CAI +impuesto, dia de pago, fecha del primer pago — sin fecha no se cerro); (4) discovery no-shows (que pasa cuando no llegan / como se enteraban antes — QUE pasa, nunca CUANTO pierde); (5) P2/P3 adaptadas; (6) avisar correccion citas madrugada como servicio; (7) confirmar Elena como contacto. NO ofrecer meses gratis; NO abrir tema inbox-vs-WhatsApp (si ella lo trae: "cuenteme mas", sin defender).

### 4. Assets del Experimento #1 construidos (Etapa 1 casi completa)

- **Scraping doctoresdehonduras.com** (directorio gratuito que Diego recordo como fuente original): `docs/ventas/leads/directorio-dhn-index.csv` = 973 medicos (id/nombre/especialidad — NUNCA volver al listado) + `directorio-dhn-detalles.csv` = 208 perfiles detalle (cluster dental COMPLETO 148 + dermatologia 21 + pediatria general 39; limpiados 3 falsos positivos ortopedia/capilar; agregados 5 pediatras con etiqueta distinta). **45 dental-TGU confirmados, 43 con celular** — cubre las ~40-50 marcaciones solo con dental. 35 solo-fijo MARCADOS no borrados (Diego decide mañana). Ciudad es piso no techo (131 sin ciudad declarada; `direccion_raw` ayuda). **Solo 4 de 208 con web propia** → universo invisible online = materia prima correcta.
- **Matiz "invisible online" corregido por Diego:** Wilmer TIENE web. El identificador no es "sin web" — es **el camino de contacto**: reserva online/PMS = descarte; "llamenos" a fijo/equipo = probable descarte; web-tarjeta con celular/wa.me directo = CONFIRMA perfil-Wilmer (el que contesta es el doctor). Wilmer = caso de calibracion.
- **`docs/ventas/guion-llamadas-experimento1.md` creado** (flujo completo, enlazado en index.md con advertencia de que los buyer personas viejos del index usan el pitch invalidado): regla madre = visita con fecha o descarte <3 min, demo SOLO presencial; apertura 20s; calificacion 60-90s; pitch 30s = frase de Wilmer + 2 opciones concretas de fecha; precio si preguntan: $40 + mes 1 gratis + Meta aparte, sin negociar; retiradas (mandeme-info = UNA contraoferta y NO perseguir — los leads mueren en el 2do toque; lo-pienso = "me dice con confianza" + una fecha tentativa; minuto 4 sin fecha = fin); registro obligatorio post-llamada.
- **3 correcciones de Diego al guion (las 3 mejoraron el diseño):**
  1. **"¿El planton existe?"** → casi NO en paciente fiel (Wilmer 3.1%, barberia "rara vez") — pero hay trampa de supervivencia: no hay plantones PORQUE alguien los previene a mano. **El recordatorio manual ES el ladrillo.** P2a corregida: "¿les recuerdan las citas o la gente llega solita?" → recuerda-a-mano = gancho TIEMPO (califica); llega-solita → sonda planton = gancho NO-SHOWS (califica) o censo. Con la pregunta vieja habriamos descartado a Wilmer.
  2. **Rama con-secretaria:** NO descalifica pero es 2do escalon (gancho sin preferencia revelada hasta que Yeni pague). Pitch al pagador: cita-rescatada + control/continuidad — NUNCA "libere el tiempo de su secretaria" (costo hundido, no vende) ni sonar a reemplazo (leccion Medilaser); en la visita ELLA presente y ganada primero.
  3. **¿Dentalink? ¿otras especialidades?** → PMS no se asume, se pregunta (registro "usa PMS S/N" por llamada = tasa real de penetracion); Experimento #1 = SOLO dental (prueba social del pitch es un dentista + una variable a la vez); derma/pediatria ya scrapeadas = **Experimento #2 en fila**, dispara solo si el censo dental muestra saturacion Dentalink.
- **Censo por llamada: 3 mundos** — (a) recuerda-a-mano, (b) no-recuerda-y-no-pasa-nada, (c) no-recuerda-y-hay-plantones. Si el mundo (b) domina, el TAM real es chico y ESO seria insumo de pivote con datos. Censo barberia de hoy: citas por WhatsApp, cero dolor, dolor real = mano de obra → NO ICP (conducta sola no basta).

### Datos Wilmer adicionales (para el caso de estudio y contacto)

- Cancelaciones: 12 manuales (9.2%) + 4 auto-cancel (3.1%) + 4 reagendar de 130 citas ≈ 15% total; dic-feb sin status usados (subestima historico).
- Dias: viernes pico (28), lunes-miercoles ~18-20, jueves flojo (15), sabado solo tarde (14), domingo cero. **Ventana para contactarlo: jueves por la tarde.**

### Tareas activas (post-9 Jul noche)

- [ ] **#99 (LA QUE DECIDE):** llamada a Yeni — cobro #95 + operativo (citas madrugada, Sorayda 14 Jul) + discovery. Yeni pidio a Diego que la llame pronto. Su resultado lee la rama B/B' del arbol Y congela la cola.
- [ ] **#100 (Diego):** pasar listas de IG + estado del G-Sheet para dedupe.
- [ ] **#101 (Claude, avanzada):** scraping HECHO; falta dedupe con IG/Excel + cola final ordenada (solo-doctor arriba, con-secretaria 2do escalon) → se congela post-#99.
- [ ] **Diego mañana:** revisar `directorio-dhn-detalles.csv` y decidir sobre los 35 solo-fijo.
- [ ] **#102 (Diego):** ¿quien marca las 20 llamadas — el, Warhol, o mixto? Sin cadencia sostenible el experimento no existe.
- [ ] **#97 (vigente):** post r/SaaS.
- [ ] **#92 (vigente):** Dental Roque sin decision.
- [ ] Libro de demanda: numeros extranjeros (P4 Wilmer) — mencionado 1 vez, no insistir.

### Para retomar proxima sesion

**Primera pregunta:** ¿se hizo la llamada a Yeni (#99)? → registrar textuales (precio, fecha de primer pago, discovery no-shows) y leer el arbol completo: Wilmer algo-afectado + Yeni paga = seguir con Experimento #1 sin pivote; Wilmer algo-afectado + Yeni NO paga + Elena tibia = rama B, conversacion de pivote con TODOS los datos. Segundo: ¿decision sobre los 35 solo-fijo del CSV? ¿Listas de IG (#100)? ¿Quien marca (#102)? Con eso congelo la cola y arrancan las llamadas.

---

## Sesion 11 Jul 2026 (VIERNES) — Arbol visual de la llamada fria (preparacion Experimento #1)

**Contexto entrante:** Diego limpiando la lista de llamadas. Pidio un arbol de decisiones visual para la llamada: ¿que pasa si el medico dice que tiene asistente? ¿que pasa si contesta la asistente?

### Entregable unico de la sesion

**Arbol de decision visual de la llamada** — `docs/ventas/arbol-llamadas-experimento1.html` (versionado en el repo junto al guion) + artifact publicado para verlo en el celular durante las llamadas o imprimirlo: https://claude.ai/code/artifact/f336fdc5-3452-4f4f-8d5c-ddbaaab37755

- **Cero reglas nuevas** — es el guion pre-registrado del 9 Jul (`guion-llamadas-experimento1.md`) convertido a formato escaneable: pasos 0-4, codigo de color por veredicto (verde CALIFICA / ambar BIFURCA-2do escalon / rojo DESCARTE-censo), frases que se DICEN en italica serif separadas de las decisiones.
- Las 2 preguntas de Diego ya estaban resueltas en el guion y quedaron como ramas explicitas: (1) "tengo asistente" NO descalifica — bifurca con "¿ella les escribe uno por uno?" → a-mano = CALIFICA 2do escalon (pitch al pagador: cita-rescatada + control/continuidad; NUNCA "libere su tiempo" ni sonar a reemplazo); (2) contesta la asistente → pedir al doctor UNA vez, si no esta seguir con ELLA (misma calificacion, puede ser champion).
- Si el guion cambia tras las llamadas de calibracion 1-5, se actualiza el HTML y se republica al mismo link.

### Sin cambios de estado

- **#99 (llamada Yeni) sigue SIN hacerse** — sigue siendo LA QUE DECIDE: veredicto del arbol 40% en suspenso, cola de llamadas sin congelar, fuga de ingreso #95 abierta. Hoy viernes: si no sale hoy, se pierde otra semana.
- #100 (listas IG), #102 (quien marca), #97 (post r/SaaS), #92 (Dental Roque) — sin novedad. Diego avanzando en la limpieza del CSV (decision 35 solo-fijo pendiente de confirmar).

### Para retomar proxima sesion

**Primera pregunta: ¿se hizo la llamada a Yeni (#99)?** (identica a la del 9 Jul — nada la desbloqueo esta sesion). Segundo: ¿como quedo la limpieza de la lista — decision sobre los 35 solo-fijo, listas IG (#100)? Con lista limpia + #99 leida, congelo la cola final (solo-doctor arriba, con-secretaria 2do escalon) y arrancan las llamadas con el arbol en mano.

---

## Sesion 13 Jul 2026 (LUNES) — Batch 1 del Experimento #1 registrado + reencuadre visita Karen

**Contexto entrante:** Diego ejecuto las llamadas el SABADO 11 Jul sin esperar #99. Correccion COO registrada: fue la decision correcta — "congelar la cola" era salvaguarda de pre-registro contra invertir 3-4 semanas a ciegas, no un bloqueo; Diego lo comprimio en un sabado. #99 ya NO desbloquea nada, pero sigue valiendo sola (fuga $35 + señal paga/no-paga del arbol).

### 1. Batch 1 — funnel y registro

- **28 marcaciones** (dental TGU, del CSV): 12 sin contacto (VN/no contesta/1 sin registro), 7 descarte "clinica grande", ~9 contactos reales → 6 descartes en llamada + **3 vivos**: **Karen Murillo (VISITA martes 14 Jul)**, Luis Molina (3ra llamada lun 13, ultima, meta = fecha), Anderson Palma (ex-Dentalink "engorroso", pidio info → se le envio la web = toque debil; queda UNA contraoferta de fecha y soltar).
- Registro completo lead-por-lead: **`docs/ventas/registro-llamadas-experimento1.md`** (incluye lecciones batch 1 y proximas acciones).
- **Vs umbral pre-registrado** (≥3 visitas + ≥1 cierre / n=20 calificadas): ~25-30% ejecutado; 1 visita con ~9 contactos = ritmo BUENO, dentro de rango para validar.
- **Lecciones batch 2:** (a) correr el filtro de escritorio ANTES de marcar (25% de marcaciones quemadas en clinicas grandes); (b) capturar censo 3 mundos + PMS S/N en cada llamada; (c) "mandeme info" = UNA contraoferta de visita, nunca enviar la web y esperar; (d) VN casi nunca devuelve — reintentos en horario distinto, max 3.
- Chinchilla (sin registro, probablemente saltada) → re-cola. Quedan ~15-17 dental-TGU con celular + reintentos + listas IG (#100 sigue pendiente).

### 2. Censo de campo — hallazgo estrategico

- **La mayoria de los medicos contactados manejan sus citas de forma MANUAL (sin software) y ELLOS MISMOS** (salvo los atendidos por asistente) → perfil-Wilmer es la conducta MAYORITARIA del universo; tesis "ICP invisible online / sin PMS" del 9 Jul confirmada en campo.
- PMS detectados: Dentalink activo ×1 (Florencia Andino), ex-Dentalink insatisfecho ×1 (Anderson Palma — municion de pitch), **Zendy ×1** (Octavio Zelaya — 2da aparicion de Zendy).
- **Lo que falta discriminar (batch 2):** de los que manejan a mano, ¿mandan RECORDATORIOS a mano (mundo a = gancho tiempo) o no mandan nada y no pasa nada (mundo b = sin dolor)? Esa pregunta separa mercado real de censo. Pre-registro vigente: si mundo (b) domina → TAM chico = insumo de pivote CON datos, pero NO concluir a mitad de experimento.

### 3. Karen Murillo — reencuadre de la visita (martes 14 Jul)

- Datos pre-visita: sola, sin software, **poco flujo** (autodeclarado), "no tardaba mucho" enviando recordatorios, pacientes confirman en 2-3h → **ambos ganchos lucen debiles** (tiempo: su ladrillo es barato y funciona; no-shows: pacientes obedientes). Probabilidad de cierre BAJA.
- **Reencuadre:** visita = discovery + censo + practica de demo (1ra visita del experimento); cierre SOLO si aparece gancho; **descarte digno pre-autorizado** (no comprar churn futuro por cerrar). Sonda abierta recomendada: "¿que es lo que mas tiempo le roba en el consultorio?" — que ELLA nombre el dolor; si nombra "conseguir pacientes" se registra pero NO se vende (pitch sin respaldo, 6 Jul). Observar sin preguntar: sala de espera, agenda fisica. Kit completo: **`docs/ventas/kit-visita-karen-murillo.md`**.
- Especulacion de genero (mujeres mas organizadas) DESCARTADA del analisis: n=1, infalsificable; el filtro es conducta, no demografia.

### 4. Umbral de volumen — 3ra pata del filtro ICP (formalizada)

Wilmer (15-20 pacientes/mes) = caso de calibracion del dolor-tiempo (1h de fin de semana). Debajo de ~10 citas/mes el gancho tiempo se evapora matematicamente. **Filtro ICP conductual completo: (1) agenda el mismo + (2) recuerda a mano + (3) volumen suficiente para que duela.** El volumen NUNCA se pregunta — se estima en voz alta y que corrija.

### 5. Predicciones de Diego PRE-registradas (antes de las llamadas de mañana)

- "Yeni no siente dolor" (poco volumen + asistente). Contrapunto COO registrado: el dolor de esa cuenta lo carga la OPERACION (21% citas rescatadas, Elena a diario, ciclo corre solo) — por eso el test es **si PAGA, no lo que declare**. Paga sin friccion = valor revelado; se resiste = rama B con todo su peso. La llamada va IGUAL (15 min, informacion decisiva en ambas direcciones).
- Antecedente: tambien predijo "Elena saldra tibia" (9 Jul). Ambas predicciones quedan congeladas pre-llamada.

### Tareas activas (post-13 Jul)

- [ ] **HOY lun 13:** Luis Molina 3ra llamada (ULTIMA; meta = fecha de visita; min 4 sin fecha = soltar) + Anderson Palma UNA contraoferta de fecha (si esquiva, soltar).
- [ ] **HOY/mañana:** vigilar que el r24h de Sorayda Martinez (cita 15 Jul 10:30) salga — flag del 9 Jul sin confirmacion enviada.
- [ ] **MAÑANA mar 14:** VISITA KAREN MURILLO (kit en mano, reencuadrada discovery+censo) + **#99 llamada Yeni** (si el dia satura → miercoles AM, no mas alla; hoja de llamada del 9 Jul vigente).
- [ ] **Batch 2:** filtro escritorio sobre ~15-17 restantes + reintentos (max 3) + Chinchilla + censo 3 mundos obligatorio. #100 (listas IG) y #102 (quien marca) siguen abiertas.
- [ ] **#97 (vigente):** post r/SaaS. **#92 (vigente):** Dental Roque sin decision.

### Para retomar proxima sesion

**Primera pregunta: ¿como salieron Karen (visita) y Yeni (#99)?** Registrar textuales de ambas en `registro-llamadas-experimento1.md` y `guion-40-test.md` respectivamente, y leer: (a) mundo censal de Karen + cierre/descarte; (b) Yeni paga → Experimento #1 sigue sin pivote / no paga → rama B con datos completos. Segundo: resultados Molina y Palma (hoy lunes). Tercero: avance batch 2 y si Warhol toma llamadas (#102). NO leer veredicto de pivote hasta completar n=20 calificadas.

---

## Sesion 13 Jul 2026 (cont., TARDE) — UNIMED: inbound cerrado en precio + arbol literal + AgendaPro

### 1. UNIMED — LEAD-007, cerrado en precio $230/mes (detalle completo en `docs/ventas/leads/LEAD-007-unimed.md`)

- **Origen:** INBOUND — contacto viejo de Diego; ELLOS llamaron para que presente al administrador general. Clinica grande, **20 medicos** con plan de crecer, sistema PROPIO (equipo dev interno) que cubre todo EXCEPTO recordatorios. Dato clave: ya habian evaluado construirlo y lo descartaron **"por costos"** → build-vs-buy resuelto, BATNA de ellos debil.
- **Negociacion (misma tarde):** Diego $20/medico → contraoferta $8 → $15 → $10 → $12 → $11 → **cierre $11.5 × primeros 20 = $230/mes, SIN mes gratis**. Seria la cuenta mas grande de la historia (> Skin Medic $150) y llevaria MRR a ~$300 (20% del hito paz mental). Leccion de proceso en [[pricing-costo-marginal]] (piso se escribe ANTES de la llamada; concesiones chicas; precio 21+ se amarra en el cierre). Defensa valida de Diego aceptada por el COO: solo recordatorios, sin bot, sin horas suyas post-setup → en dolares-por-hora-Diego probablemente el mejor cliente firmado.
- **Modelo operativo RESUELTO en discovery posterior (preguntas de Diego a Omar):** (a) usaran **OrionCare especificamente para AGENDAR** — su sistema queda para expedientes/registros = separacion limpia de dominios, NO doble captura, el mejor de los 3 escenarios; (b) integracion "interesante pero NO necesaria" → **CERO desarrollo** (regla: la API no se construye hasta necesidad real; estimado archivado: v0 ~8-12h — create-appointment/update-appointment ya hacen el 80%, faltaria api_keys + upsert paciente por celular + idempotencia + GET polling; v1 webhooks +4-6h); (c) **recepcion CENTRALIZADA** agenda → pocas personas a entrenar, dueño natural del inbox, un solo punto de contacto operativo (anti-Medilaser estructural).
- **Señal estrategica:** una institucion CON equipo dev compro exactamente UNA cosa: recordatorios. 3ra confirmacion independiente del CVP core (P2 Wilmer + ciclo Consultorio Familiar + voto con presupuesto de Unimed). Alimenta el pitch del Experimento #1.
- **PENDIENTE — llamada de amarre (sin esto NO es cliente):** fecha de arranque + primer pago; Meta aparte explicito; medico 21+ = mismo $11.5 (el descuento por volumen YA se dio); nombre de la lider de recepcion (champion operativa, ganarla PRIMERO en la instalacion); horarios de los 20 medicos en planilla; Business Verification (RTN, 5-15 dias) en el cronograma. Recomendacion COO: rollout por fases (3-5 medicos primero, facturando los 20 desde dia 1).

### 2. Arbol de llamadas rediseñado como arbol literal

- `docs/ventas/arbol-llamadas-experimento1.html` reescrito: tronco vertical con nodos-paso (0→1→2→3→A/B→registro) + ramas con lineas de codo reales coloreadas por veredicto + saltos entre nodos con mini-badges. Republicado al MISMO link del artifact. Contenido pre-registrado intacto.
- 2 adiciones acordadas: objecion **"hay apps mas baratas"** con la cuña (desde SU numero + slot liberado; $40 no se negocia) y registro PMS ampliado a "S/N + cual (Dentalink, Zendy, AgendaPro...)".

### 3. AgendaPro — analisis de amenaza (pregunta de Diego)

- Veredicto: **fantasma de pricing, no competidor real** — no aparecio en el censo batch 1 (el mercado tampoco compra a $20; el cuello es dolor, no precio). Relevante solo como sustituibilidad/objecion (P1 de Wilmer). Cuña concreta: numero propio + conversacion bidireccional + confirmacion-con-consecuencia + su tope de ~50 msgs/mes queda corto justo en el volumen donde empieza el dolor (Wilmer: 20-25 citas × 2-3 msgs = 40-75/mes). Si aparece 1 vez en n=20 → tratarlo como competidor; si no, cero tiempo adicional.
- Gancho al pagador-CON-asistente clarificado (razonamiento de Diego validado): tiempo NO vende (ya lo compro con el salario de ella = costo hundido); se vende **cita rescatada (plata) + control/continuidad** — dato: Consultorio Familiar TIENE secretaria y aun asi 21% no confirmaba. Doble audiencia: pagador compra, asistente veta.

### Tareas activas (post-13 Jul tarde)

- [ ] **Unimed — llamada de amarre** (lista completa arriba). Hasta entonces NO es cliente, NO actualizar dashboard.
- [ ] **MAÑANA mar 14:** VISITA KAREN MURILLO (kit: `kit-visita-karen-murillo.md`, reencuadrada discovery+censo) + **#99 Yeni** (fuga $35 + señal paga/no-paga; miercoles AM como maximo).
- [ ] **Hoy/pendiente confirmar:** resultados Molina (3ra llamada, ultima) y Palma (una contraoferta).
- [ ] Batch 2 Experimento #1: filtro escritorio antes de marcar + censo 3 mundos + PMS S/N+cual. #100 (listas IG), #102 (quien marca), #97 (r/SaaS), #92 (Dental Roque) sin novedad.

### Para retomar proxima sesion

**Primera pregunta: ¿como salieron Karen y Yeni?** (leen el experimento y el arbol del 40%). **Segunda: ¿hubo llamada de amarre con Unimed?** — si hay fecha + primer pago, Unimed pasa a cliente: actualizar dashboard (MRR ~$300), clientes-estado, y diseñar onboarding institucional (recepcion centralizada, rollout por fases, Business Verification). Tercera: Molina/Palma y avance batch 2. Guardia anti-distraccion: Unimed NO reemplaza el Experimento #1 — el experimento sigue hasta n=20 aunque Unimed firme.

---

## Sesion 14 Jul 2026 (MARTES) — Visita Karen ejecutada + referida Hanoy Medina

**Contexto entrante:** dia de la visita pre-registrada a Karen Murillo (visita #1 del Experimento #1, reencuadrada 13 Jul como discovery+censo+practica).

### 1. Karen Murillo — no-cierre digno → NURTURE con trigger

- **Su proyecto:** flujo nuevo en diseño — empresa de marketing le trae leads → ella los administra. Vio plataforma + bot, intereso, **pidio precio POR ESCRITO** para analizar costos e integracion.
- **Lectura COO:** NO es el clasico "lo analizare" — su dolor es FUTURO, aguas arriba del nuestro (aun no tiene leads que administrar; la agencia seria su PRIMER contacto con marketing). Peticion legitima de quien arma estructura de costos → **nurture con trigger = cuando contrate la agencia**, no muerto ni cierre fallido. La regla cerrar-en-primera-visita aplica cuando el dolor existe HOY.
- **Competencia:** otra empresa de software tambien la corteja; fuimos primeros → **precio escrito debe salir HOY** (3-4 lineas: $40/mes, Meta aparte, gancho "cuando arranques con la agencia, mes 1 gratis y yo te monto todo" = ancla en su flujo futuro sin regalar nada; NO bajar de $40).
- Censo: 114 seguidores IG, poco flujo confirmado en sala; invierte en redes justamente por falta de volumen. Si algun dia cierra = primer caso de uso real "administrar leads de ads" (el pitch sin respaldo del 6 Jul) — N=0, no mueve nada.
- Detalle completo en `docs/ventas/registro-llamadas-experimento1.md` (seccion Visita #1).

### 2. Hanoy Medina — LEAD-008, cita SABADO 18 JUL (fruto mayor de la visita)

- Referida por Karen. Dueña de clinica que **subarrienda cubiculo por hora** a otros medicos (tesis Airbnb-de-cubiculos del 30 Jun, lado DUEÑO). Arrendatarios **agendan directo self-service en TimeTree**; sus recordatorios propios a mano por WhatsApp; ~300 seguidores IG. Cobro ~L400/consulta general segun entendio Diego — **ambiguo hora-apartada vs consulta-realizada**.
- **Ejercicio de la sesion — 3 teorias muertas en 24h, cero datos de ella:** (a) malabareo 2-apps = tibio (40% test Wilmer ya lo probo — nadie paga $480/año por incomodidad); (b) horas-no-registradas = muerta (reservar ES anotar, el registro esta completo por diseño); (c) TimeTree le FUNCIONA → **no pitchear Free contra TimeTree** (peor posicion de venta: reemplazar algo gratis que funciona).
- **4 sondas pre-registradas para el sabado** (curiosidad, no pitch — detalle en `docs/ventas/leads/LEAD-008-medina.md`): (1) **¿cobra hora apartada o consulta REALIZADA?** — LA CLAVE: si es por consulta, el no-show del paciente del arrendatario le cuesta L400+ A ELLA = unico gancho $40 vivo (recordatorios + confirmacion-con-consecuencia); (2) choques/ediciones en TimeTree (calendario compartido ≠ motor de reservas: no bloquea, sin rastro); (3) recepcionista-invisible (¿los pacientes de los otros medicos le escriben a ELLA?); (4) facturacion-por-confianza (TimeTree registra reservas, no asistencia → factura sobre auto-reporte). Ocupacion del cubiculo = su lucro cesante real pero NO lo resolvemos — registrar, no prometer.
- Ramas: gancho dispara → cerrar EN LA SALA ($40 + mes gratis + fecha); nada dispara → descarte digno + censo + relacion viva (sus arrendatarios = puerta futura; semilla tier Free). Expectativa honesta: cierre BAJA.
- Hanoy NO cuenta para el umbral del Experimento #1 (referida, no llamada fria calificada); SI suma censo.

### 3. Flag metodologico registrado

Usamos seguidores de Instagram como proxy de volumen (Karen 114, Hanoy 300) y **nuestra propia tesis dice que el ICP es invisible online** (censo batch 1). Doctora de referidos = invisible en redes con flujo real posible. Regla: volumen se estima EN VOZ ALTA en la conversacion y que corrija — nunca descartar por redes.

### Tareas activas (post-14 Jul)

- [ ] **HOY:** mensaje a Karen con precio por escrito ($40 + Meta aparte + gancho mes-gratis-al-arrancar-agencia). 10 minutos.
- [ ] **UNIMED — llamada de amarre: SIGUE PENDIENTE = RIESGO #1** ($230/mes enfriandose; los deals mueren en el 2do toque). Lista completa en LEAD-007.
- [ ] **#99 Yeni: SIGUE sin hacerse** (fuga $35 + señal paga/no-paga; era "miercoles AM como maximo").
- [ ] **SABADO 18 Jul:** visita Hanoy Medina con las 4 sondas (LEAD-008 en mano).
- [ ] Batch 2 Experimento #1 + resultados Molina/Palma (sin confirmar) + #100/#102/#97/#92 sin novedad.

### Para retomar proxima sesion

**Primera: ¿salio el amarre de UNIMED?** (sigue siendo lo mas grande sobre la mesa). **Segunda: ¿se mando el precio a Karen y se hizo #99 Yeni?** **Tercera: ¿como salio Hanoy el sabado?** — leer contra las 4 sondas: cual disparo (si alguna), cobro hora-vs-consulta, y cerrar/descartar segun rama pre-registrada. Cuarta: Molina/Palma y batch 2. El experimento sigue hasta n=20 — ni UNIMED ni Hanoy lo reemplazan.

---

## Sesion 21 Jul 2026 (MARTES) — UNIMED se suelta + T-horas para instalacion Hanoy

**Contexto entrante:** dia de instalacion Hanoy (tarde/noche). UNIMED sin respuesta desde el lunes prometido.

### 1. UNIMED — Diego decide soltar, sin mas seguimiento

- Cero contacto desde "el lunes sera la respuesta" (18 Jul). Diego: seguir insistiendo se siente como hostigar, no tiene esperanzas de que cierre. Reencuadre propio (validado por COO): la relacion con UNIMED ya genero valor real sin necesidad de que cierren — Nov-Dic 2025 (feedback de deficiencias del producto) precedio a Wilmer dias despues; la negociacion de Jul 2026 (feedback de precio alto) precedio directamente al modelo hub $11.5-15/medico que cerro a Hanoy. Patron: UNIMED funciona como fuente de feedback de mercado gratuito, no solo como prospecto — ver [[unimed-feedback-sin-cierre]].
- **Pendiente de decidir (no cerrado en esta sesion):** enviar 1 mensaje unico de cierre digno ("para reservar los 20 cupos a $11.5 necesito arranque esta semana") vs silencio total. Diego se inclina a silencio total; COO registra que el mensaje unico no es hostigar, es cierre limpio — decision final de Diego.

### 2. Hanoy — instalacion de hoy en riesgo, solo 1 de 4 verificaciones lista

- **Landing:** en ajustes (unica de las 4 verificaciones criticas del 18 Jul con avance).
- **Sin hacer:** scoping de mensajes por doctor (`whatsapp_line_doctors` en crons/bot), visibilidad entre medicos independientes, org Hanoy en DB (1 cubiculo + 4 calendarios).
- **Decision tomada:** Diego entra a modo-dev AHORA (antes de la instalacion de esta tarde/noche) a verificar el scoping. Si no alcanza el tiempo, fallback pre-acordado: instalar SOLO Hanoy hoy (sin los 3 inquilinos Free), diferir el Free multi-medico hasta verificar.

### Tareas activas (post-21 Jul)

- [ ] Verificar scoping `whatsapp_line_doctors` en modo-dev (en curso, esta sesion)
- [ ] Decidir mensaje unico UNIMED vs silencio total
- [ ] Instalacion Hanoy esta tarde/noche — completa o fallback solo-Hanoy segun resultado del scoping
- [ ] Landing Hanoy — terminar ajustes antes de la instalacion

---

## Sesion 18 Jul 2026 (SABADO) — Hanoy cerrada $15 + tesis unidad-de-venta + test de precio pre-registrado

**Contexto entrante:** dia de la visita a Hanoy Medina (LEAD-008). UNIMED sin amarre desde el 13; Yeni sin contacto.

### 1. Hanoy Medina — CERRADA (3er cliente activo, primer caso dueña-hub)

- **Terminos:** $15/mes + ISV + mensajes Meta aparte. **Mes 1 gratis** (gancho aplicado cuando quiso diferir por gastos de cierre de mes). **Instalacion MARTES 21 Jul por la tarde/noche.** Pendiente: mandarle listado de configuracion (borrador entregado en sesion: nombre/logo, horarios+servicios, lista de inquilinos con dias/horas, confirmar WA Business App + quien maneja su pagina FB).
- **Sondas resueltas:** cobra por HORA al medico, cobro DIARIO (ella prefiere ese modelo — siente que el inquilino percibe menos carga que un monto mensual grande). → Gancho no-show MUERTO para ella; VIVO para inquilinos (pagan la hora aunque el paciente no llegue) = cuña del upsell, NO gastarla ahora. Administra su propia publicidad (paga ads y los maneja ella) → **primer caso real del uso "administrar leads de ads"**.
- **Valor mes 1 a demostrar (para que el $15 sobreviva al mes 2):** (a) recordatorios propios automatizados (hoy a mano), (b) leads de su publicidad administrados en la plataforma. Reporte con numeros al cierre del mes gratis.
- Pidio "que fuera un app" (→ PWA aprobado) y "bloquear fechas" (se resuelve en instalacion).

### 2. Debate de pricing — la pregunta de Diego: "¿no cerramos por el precio?"

- **Respuesta COO: no es la causa raiz.** El funnel muere en DOLOR, no en precio: de todos los muertos de 45 dias (CDA, Stacy, Grecia, Lumina, DKapilar, batch 1) solo UN prospecto objeto el precio. Hanoy dudo hasta con $15 → la barrera no era el delta $40→$15. Cuando el dolor existe, se paga (UNIMED $230, Wilmer 6+ meses, Skin Medic acepto $150).
- **La media verdad de Diego (importante): nadie del segmento medico-solo ha pagado $40 jamas.** Los 2 cierres de julio son $11.5-15/medico VIA INSTALACION multi-medico. → **Tesis emergente: la unidad de venta es la INSTALACION ($100-250), no el medico ($40).** El CAC founder-led (~15-20h por instalacion: playbook 2 visitas + calibracion) no financia venta fria a $15 (LTV ~$90 con churn historico). Precio bajo por medico SOLO donde CAC≈0 (dentro de un hub ya instalado).
- **Reglas que quedan:** $40 frio se mantiene hasta n=20 del Experimento #1 (no contaminar a mitad). Fallback pre-registrado: si calificados-EN-DOLOR objetan precio al cierre del experimento → batch a $25-30 (punto mas bajo donde el CAC frio cierra). $15 frio FUERA del menu. Dentalink/$60-con-odontograma NO es competencia (el mercado que los rechazo es nuestro mercado — 7/10 TimeTree); Confirmafy $12 = mencionado por Diego, no por leads → tratamiento AgendaPro (fantasma de pricing hasta aparecer en campo). Contrafactual Skin Medic ("un agente lo hubiera salvado") = infalsable, post-mortem dice Coexistence; no estrategizar sobre fantasmas.

### 3. Test de precio pre-registrado — inquilinos de Hanoy (N=3)

- **Diseño (correccion de Diego sobre propuesta COO):** Free = **app completa sin restricciones** — cada inquilino maneja SU agenda y SUS pacientes — EXCEPTO mensajes (recordatorios/bot). Pro $15/medico = mensajes **con LINEA PROPIA** (la linea de Hanoy es SOLO de ella; placeholder-sin-paciente DESCARTADO como absurdo — correcto, el producto completo en manos hace el test mas fuerte). Upsell Pro = una sesion de onboarding Coexistence por inquilino (adquisicion caliente CAC≈0, Meta por cuenta de ellos, cuña "tu numero" intacta).
- **Umbral (60 dias post-instalacion):** ≥1/3 toma Pro = señal viva del loop hub + reabre discusion de precio frio con datos. 0/3 = teoria "precio-barrera" MUERTA (usaron todo a diario, el no-show les cuesta la hora, y ni $15 los movio) → dolor confirmado como la barrera. Costo del test: $0 y cero horas.
- Techo honesto del piloto: $15 + 3×$15 = **$60/mes max** — es laboratorio, no negocio; el premio es el playbook dueña-hub replicable (tesis Airbnb-de-cubiculos) y el test de precio.

### 4. Verificaciones tecnicas criticas ANTES del martes (modo-dev, lunes)

1. **Scoping de mensajes por doctor** — si inquilinos cargan pacientes/citas reales en la org, ni el cron de recordatorios ni el bot pueden disparar por la linea de Hanoy para citas ajenas. Revisar como gatean `whatsapp_line_doctors` los crons y el bot. **Sin esto verificado NO se instala el Free multi-medico.**
2. **Visibilidad entre medicos independientes** — que ve un user doctor-role de pacientes/citas de otros (pacientes pertenecen a la org; Hanoy + inquilinos = negocios independientes compartiendo org).
3. **4 condiciones Coexistence** del numero de Hanoy + **website en Business Portfolio** (leccion Skin Medic: landing YA si no tiene — aprobacion Meta tarda dias).
4. **PWA scope minimo** (manifest + iconos + standalone; SIN push — eso es feature, libro de demanda): 2-4h lunes, para instalar el icono en su celular el martes.

### 5. UNIMED y resto

- Omar Diaz: "tuvieron un atraso, el lunes sera la respuesta". **Bandera: lenguaje paso de logistica a decision.** Plan 2 ramas lunes: SI → fecha de arranque + primer pago EN esa llamada (no un toque mas); evasiva → UN deadline digno ("para reservar los 20 cupos al precio acordado necesito arranque esta semana") y soltar. No convertir $230 en nurture eterno.
- #99 Yeni: intento fallido, sigue pendiente (fuga $35 + señal paga/no-paga).
- Karen: precio por escrito — estado sin reportar (mencionado 2 veces, no volver a insistir hasta que Diego lo traiga).

### 6. Censo pre-instalacion Hanoy (respuestas del sabado) + plan del fin de semana

- **WA Business App ✓** y "conectada a Meta" (ella hace su publicidad — probable click-to-WhatsApp desde su pagina) + **pagina FB ✓** → 2 de las 4 condiciones Coexistence listas; el numero tiene actividad real (7+ dias sobra) y ella **ya tiene SU Business Portfolio propio** (modelo correcto, [[business-portfolio-aislado]]). Martes: en Embedded Signup **seleccionar SU portfolio existente**, no crear uno nuevo; recordarle actualizar la app antes del martes.
- **SIN sitio web → LANDING = unico bloqueador real, corre contra reloj** (leccion Skin Medic: Meta tarda dias). Plan: apenas mande nombre+logo+direccion+servicios → Claude arma landing 1-pagina en subdominio orioncare.app (Vercel, $0, 1-2h) → DOMINGO llamada guiada de 10 min para que ELLA agregue la URL a su Business Info (Configuracion del negocio → Informacion) + verificar nombre/direccion/telefono completos.
- **1 solo cubiculo compartido entre TODOS los medicos** (incluida Hanoy) → config minima: **1 recurso (cubiculo) + 4 calendarios profesionales**; toda cita de cualquiera bloquea el cubiculo = el reemplazo de TimeTree ES el bloqueo cruzado (calendario, no mensajes → no toca la restriccion de linea). Su "bloquear fechas" = bloquear horas del recurso.
- **Bonus estrategico:** sus ads con boton a WhatsApp → al vincular el numero, los leads de su publicidad caen directo al inbox = el caso "administrar leads de ads" se demuestra solo desde semana 1; el reporte del mes gratis se escribe solo.
- Mensaje con el listado completo ENVIADO el sabado (10 preguntas + hora del martes + celular a mano + citas futuras para cargar).

### Tareas activas (post-18 Jul)

- [x] ✅ **PWA minimo — ENTREGADO Y EN PROD el mismo sabado 18** (PR #74 mergeado, QA aprobado Android + iPhone).
- [ ] **EN ESPERA de Hanoy (reloj de Meta):** landing apenas mande nombre+logo (mensaje con el listado YA enviado) → deploy subdominio → llamada guiada para meter URL en su Business Info. Si manda domingo, se arma domingo.
- [ ] **LUNES 20:** UNIMED — la respuesta (2 ramas pre-acordadas). Lo mas grande sobre la mesa.
- [ ] **LUNES 20:** modo-dev — scoping linea-por-doctor + visibilidad entre medicos + org en DB (1 cubiculo + 4 calendarios). Arrancar desde main actualizado (repo quedo en rama feat/pwa-minimo, ya mergeada).
- [ ] **LUNES 20:** reintento #99 Yeni.
- [ ] **MARTES 21 PM:** instalacion Hanoy — seleccionar SU portfolio en Embedded Signup, bot OFF + transcription OFF primera hora, cargar citas futuras, round-trip del echo antes de irse, mandato del canal de reserva como parte del trato, icono PWA instalado en su celular.
- [ ] Batch 2 Experimento #1 sigue en fila (a $40, con filtro volumen); Molina/Palma sin confirmar.

### Para retomar proxima sesion

**Primera: ¿que dijo UNIMED el lunes?** (rama si/evasiva — leer contra el plan pre-acordado). **Segunda: ¿pasaron las verificaciones tecnicas?** — en especial el scoping de linea por doctor; si no existe, decidir si es fix-habilitador minimo o se instala solo-Hanoy el martes y el Free de inquilinos espera. **Tercera: ¿como salio la instalacion de Hanoy?** (echo round-trip visto, mandato de canal negociado, PWA instalada). Cuarta: #99 Yeni y batch 2. El Experimento #1 sigue a $40 hasta n=20; el test de inquilinos corre en paralelo sin tocarlo.

---

## Sesion 21 Jul 2026 (MARTES, cont. NOCHE) — Acuerdo de servicio universal + hallazgo FOMO + instalacion Hanoy en curso

**Contexto entrante:** landing de Hanoy confirmada lista (`https://dra-hanoy-medina.vercel.app/`), UNIMED soltado sin mas seguimiento (decision de la sesion anterior, reafirmada hoy — Diego: "ellos se tienen que comunicar conmigo, ya saben que existo"). Diego arranca la instalacion de Hanoy en vivo.

### 1. Acuerdo de servicio — plantilla universal creada (activo de ventas nuevo)

Diego pidio un "contrato" para Hanoy; se convirtio, por correccion iterativa de Diego, en una **plantilla universal reusable para todo cliente futuro** — NO contrato legal, estilo "politicas de la empresa" en tono de **usted**. Archivos: `docs/ventas/plantilla-acuerdo-servicio.md` (fuente editable) + `.html`/`.pdf` (version final formateada, logo OrionCare, 1 pagina, cierre "Gracias por confiar en OrionCare. Gracias por confiar en nosotros. — Dican" en vez de pie de pagina).

**Reglas de contenido que quedaron fijas (aplican a cualquier documento cliente futuro):**
- **Sin precio ni desglose de features.** El precio se acuerda de palabra en el cierre; cada feature listada (calendario compartido, "seguimiento", bandeja de mensajes) invita a preguntar "¿y esto que es?" en vez de dar confianza — Diego lo verbalizo explicito: "eso causa preguntas". Ver [[client-doc-copywriting]].
- **Cero contexto interno del negocio** (por que existe Coexistence, que paso con Skin Medic/Medilaser) — el cliente no necesita ni debe saber esa historia.
- **Sin tamaño de equipo ni promesas de tiempo de respuesta** ("somos pocos", "24 horas") — resta seriedad.
- **Documento verdaderamente universal — cero campos que llenar por cliente.** El link de landing de cada quien se manda aparte en el chat, nunca dentro del documento. Orden final: datos seguros → numero de WhatsApp → ayuda → cancelacion → landing al final.

**Landing page como regalo — friccion deliberada:** Diego decidio que la landing se regala a TODO cliente que cierra (no antes del cierre — el experimento de Reddit ya probo que regalar pre-compromiso atrae freeloaders, no ICP). El parrafo de la landing en el documento nombra a proposito "codigo fuente", "alojar", "dominio", "mantenimiento tecnico" — palabras tecnicas que generan friccion real en un medico sin cultura web, para empujar hacia el paquete pagado de hosting+alojamiento (a precio aparte, no metido en la cuota base — mismo sesgo de siempre en [[pricing-costo-marginal]]). Diego fue explicito: "quiero causar fatiga ahi... que digan mejor hagalo usted".

### 2. Hallazgo estrategico: hipotesis FOMO vs dolor real (SIN VALIDAR, no rediseñar pitch todavia)

Diego, revisando todas sus reuniones de campo: **nadie le ha dicho que pierde tiempo o pacientes** — volumen bajo (~10 mensajes/dia "es mucho"), y quien contesta tarde son un par de mensajes en la noche, no una crisis. Hipotesis nueva de Diego: **la compra puede ser por FOMO/estatus** ("verse profesional", "no quedarse atras") en vez de dolor cuantificado — y que hay una señal visual real ("se nota" el medico que genera plata vs el que no).

**Encaja con datos ya existentes:** el 40% test de Wilmer dio resultado "tibio" (no hair-on-fire) — consistente con compra por status, no por dolor agudo. Wilmer agenda 94.5% de sus citas el mismo a mano y casi no usa la plataforma, pero esta feliz — mismo patron.

**Decision:** NO rediseñar el pitch a mitad del Experimento #1 (sigue a n=20). Accion barata acordada: en las proximas llamadas/visitas, anotar si el interes suena a dolor ("pierdo tiempo/pacientes") o a FOMO ("otros ya lo tienen", "quiero verme profesional") — data real antes de decidir si el mensaje cambia. Ver [[hipotesis-fomo-vs-dolor]].

### 3. Instalacion Hanoy — en curso, checklist ejecutandose en vivo

- ✅ Landing confirmada en produccion.
- ✅ Especialidad "Cirujano Dentista" YA EXISTIA en la tabla `specialties` (cubre a Hanoy sin cambios); subespecialidades dentales (Ortodoncia, Endodoncia, etc.) con SQL preparado, no urgente, para cuando dental crezca como vertical.
- ✅ Usuario admin+doctor de Hanoy creado (`hanoymedina@orioncare.app`) siguiendo el patron 1-fila-org_members ([[admin-doctor-role-pattern]]).
- 🔜 Verificando sitio web en Business Info de Meta (`business.facebook.com/settings/info`) antes de escanear el QR de Coexistence.
- 🔜 Pendiente: motor (recurso+calendario+servicios) si no esta cargado, bot OFF + transcripcion OFF, vinculacion Coexistence, round-trip del echo, cargar citas futuras, icono PWA, mandar PDF+link landing.
- **Recordatorio vigente de modo-dev (21 Jul):** instalar HOY solo la cuenta de Hanoy, SIN los 3 inquilinos — el gate `messaging_enabled` por doctor no existe aun.

### 4. Blocker tecnico nuevo (no bloqueante para hoy)

Intento de autenticar el MCP de Supabase fallo: `{"message":"Unrecognized client_id"}` en el OAuth de Supabase — problema de configuracion del plugin, no arreglable reintentando. Fallback usado toda la sesion: Diego corre el SQL directo en Supabase Studio. Documentado en estado-dev.md como deuda tecnica menor.

### Tareas activas (post-21 Jul noche)

- [ ] Terminar instalacion Hanoy esta noche (checklist arriba)
- [ ] Correr SQL de subespecialidades dentales cuando haya tiempo (no urgente)
- [ ] Arreglar auth del Supabase MCP (`Unrecognized client_id`) — no urgente, workaround vigente
- [ ] Empezar a anotar dolor-vs-FOMO en proximas llamadas/visitas (barato, sin tocar el experimento)
- [ ] Humanizacion del bot de Hanoy como plantilla reusable — pendiente, post-instalacion (idea de Diego, ligar a [[humanizacion-bot]])
- [ ] Testear paquete de hosting+mantenimiento de landing con los proximos 2-3 clientes que cierren, precio aparte

### Para retomar proxima sesion

**Primera: ¿como termino la instalacion de Hanoy?** (Coexistence vinculado, round-trip visto, citas futuras cargadas, PWA instalada, PDF+landing enviados). **Segunda:** ¿algun dato dolor-vs-FOMO de esta semana? **Tercera:** ¿se probo el paquete de hosting con algun cliente nuevo?

---

## Sesion 22 Jul 2026 (MIERCOLES) — Instalacion Hanoy confirmada + 3 focos tecnicos definidos

**Contexto entrante:** Diego confirma que la instalacion de Hanoy (anoche, 21 Jul) fue un exito total, sin problemas. Se pidio verificar uso real via SQL.

### 1. Uso real de Hanoy — verificado por SQL (Supabase MCP autentico esta vez)

Sesion nueva y espontanea hoy (sin que Diego la empujara) ademas de la noche de instalacion: 4 citas creadas, 3 pacientes cargados. Paginas mas usadas: agenda-semanal, citas/nueva, inbox, pacientes, agenda-secretaria. Bot sigue OFF (plan: activar en ~1 semana tras calibracion). Plantillas de WhatsApp en espera de aprobacion Meta.

### 2. Hallazgos de la instalacion (4 items nuevos)

1. **Advertencia "bot bueno" — Hanoy y su novio por separado.** Ambos dijeron, sin que se les preguntara, que "la mayoria de los bots son malos y se nota" — condicion implicita para que confien mas en el producto.
2. **Novio de Hanoy = bienes raices independiente**, pidio piloto de bot calificador de leads para su rubro, PERO el mismo puso la condicion de ver primero que el bot de Hanoy no se sienta "bot barato". Choca con [[icp-individual-fuera]] (independiente, no clinica) — decision: watch-item, NO perseguir ahora, candidato natural para [[diversificacion-2027]] (piloto Oct 2026), costo de esperar = $0.
3. **Hanoy lleva el plan de pago de sus inquilinos en Word.** Señal debil (N=2 informal, incluye anecdota de Grecia que ni es clienta) que refuerza el diseño ya listo de [[sistema-facturacion]] — no cruza el umbral de 3 clientes pagando, solo se anota.
4. **Wilmer llamo con un problema real:** pacientes agendan en horas donde el tiene compromisos personales, sin forma de bloquear esos horarios. Diego evaluo y descarto un "servicio especial" ad-hoc por insalubre para el producto (acertado — es el tipo de personalizacion que la regla 80/20 prohibe). Es el mismo gap generico "bloqueo de horario/excepciones" anotado como diferible desde Skin Medic (22 May 2026), ahora lo pide el cliente ancla.

### 3. Vista mensual — 2-3 señales convergentes

Hanoy y UNIMED (aunque UNIMED se solto como cliente, el feedback de campo sigue siendo valido) pidieron vista mensual tipo TimeTree; Diego cree que Wilmer tambien la querria. Es el mismo gap de "vista combinada multi-calendario" de mayo, ahora mas especifico. Agnostico al rubro, no aplica la regla de "3+ clientes para feature vertical".

### 4. Correccion al test de precio de inquilinos (30 dias, no 60)

Diego corrigio la ventana del test pre-registrado con los 3 inquilinos de Hanoy: **30 dias en vez de 60** (razon: van a hablar con cada medico individualmente antes de integrarlo a la plataforma, no es autoservicio pasivo puro — no hace falta esperar tanto para leer la señal). Estrategia declarada: hacer la experiencia de Hanoy "algo bello" para que ELLA empuje organicamente a sus inquilinos; peor caso, se quedan en Free hasta que les llegue su momento de querer el Pro $15. **Nota metodologica que se mantiene:** el resultado a 30 dias YA NO es señal organica pura — Diego confirmo que "hara fuerza" en la venta con cada medico, hay que leerlo como conversion-con-empuje, no espontanea. Detalle completo en [[tesis-unidad-venta-instalacion]] (actualizado).

### 5. Decision de foco tecnico

**Los 3 items priorizados para desarrollo, en este orden declarado por Diego:** (1) bloqueador de horario/excepciones (Wilmer, urgente por ser el ancla), (2) vista mensual (Hanoy + UNIMED + Wilmer probable), (3) calibracion del bot (compromiso ya existente a 1 semana, ahora con mas peso por las advertencias de Hanoy/novio). Sesion continua en `/modo-dev` para planificar el orden real de construccion.

### Tareas activas (post-22 Jul)

- [ ] Planificar en modo-dev: bloqueador de horario, vista mensual, calibracion bot — orden y alcance
- [ ] Calibracion del bot de Hanoy dentro de la semana comprometida (impacto ahora doble: ella + posible piloto novio)
- [ ] Seguir sin perseguir el piloto bienes raices — esperar a que el bot de Hanoy este calibrado
- [ ] Monitorear si Hanoy sube foto/logo pendientes y avanza con plantillas Meta

### Para retomar proxima sesion

**Primera:** ¿como salio la planificacion tecnica de modo-dev? **Segunda:** ¿algun avance en calibracion del bot? **Tercera:** ¿Hanoy o el novio volvieron a mencionar el piloto de bienes raices?

---
