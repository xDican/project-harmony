# Diccionario de hondureñismos — bot OrionCare

> Fuente: 2,357 mensajes reales de pacientes en `bot_conversation_logs` (25 Feb 2026 → 4 May 2026, 263 pacientes únicos, 272 sesiones).
> Vivo. Diego itera con cada análisis nuevo de bot.

## Cómo se usa

Este diccionario alimenta `_shared/honduras-intents.ts` — capa que se aplica ANTES de los handlers numerados de cada estado. Cuando el paciente escribe texto natural (no número), buscamos:
1. Un intent claro → ejecutar acción asociada
2. Un preámbulo → extraer la info útil que viene después
3. Un typo conocido → normalizar y reintentar
4. Nada → fallback al handler numerado actual

## Reglas culturales (importantes)

- **"siempre" = "igual/todavía"**, NO "always". "Siempre voy" = "voy igual". "Siempre el lunes" = "ese mismo lunes".
- **"yo aviso" = NO suave**, no es promesa real. Es la forma cortés hondureña de decir "no me interesa" o "no estoy seguro y prefiero no comprometerme".
- **"primero Dios" = sí blando con humildad**, cuenta como confirmación.
- **"ahí" puede ser "ahí" (lugar) o "ahí" (entonces/luego)** — depende de contexto. "Ahí estaré" = confirmación. "Ahí veré" = procrastinar = soft no.
- **"fíjese que..." / "mire que..." / "vea que..."** son **preámbulos** universales. Nunca los proceses solos — extrae lo que viene después.
- **"que pena" / "mil disculpas"** preceden mala noticia (cancelación o reagendamiento).
- **"poco" como respuesta ≠ poca cantidad**, en Honduras es minimización ("poco de tiempo" = "no tengo tiempo").

---

## 1. CONFIRM — confirma asistencia

### Directos (patrones core)
```
confirmo
confirmo mi asistencia
confirmo la cita
confirmado
confirmado, gracias
confirmado desde la mañana
ahí estaré
ahí estaremos
ahí estaré mañana
ahí estaré mañana a esa hora
ahí estaré en la mañana
ahí este
allí estaré
gracias allí estaré
estaré
si, ahí estaré
si allí estaré en la mañana
buenas tardes si ahí estaré el lunes
ok ahí estaré
ok ay estaré
hola. allí estaré
gracias primero dios ahí estaré
buen día, confirmo
```

### Hondureñismos
```
sale pues
va pues
dale pues
vaya pues
ahí vamos
ahí mero
asi mero
asimero
de una
sin falta
todo bien
listo
listo, gracias
listo, muchas gracias
está bien
esta bien
bueno
recibido
anotado
ya quedó
quedó
entendido
excelente
perfecto
claro
seguro
por supuesto
primero dios
si dios quiere
diosito mediante
```

### Acks/cierres conversacionales (terminan sesión, no abren nueva)
```
ok
okey
okay
o ke
oki
ok gracias
ok...
gracias
muchas gracias
gracias feliz día
mil gracias
de acuerdo
👍 / 🙏 / ✅
```

### Casos confusos (matchear con cuidado)
```
"de 9 en adelante voy a llegar"   → CONFIRM con horario implícito
"si allí estaré en la mañana"     → CONFIRM
"ahí estaré mañana .con la doctora marleni verdad ??"  → CONFIRM + pregunta (no rechazar, confirmar Y responder)
"buenas tardes si ahí estare el lunes"  → CONFIRM (no reprogramar a lunes — "siempre voy ese lunes")
"siempre el lunes 20 de abril"    → CONFIRM (mantiene la fecha original)
"solo cambie la ora nada mas ire siempre el lunes" → RESCHEDULE pero MANTIENE el día
```

---

## 2. RESCHEDULE — quiere mover la cita

### Directos
```
reagendar
reagendar cita
reagendar mi cita
reajendar
reajendar sita
quiero reagendar
quiero reprogramar la cita
reprograme
reprogramelo para el 2 de abril
cambiar
cambiar fecha
cambiar día
cambiar hora
cambiar cita
mover
mover la cita
moverla
moverlo
posponer
aplazar
para otro día
para otra fecha
otro horario
para la próxima
para la próxima semana
prox semana
para la siguiente
```

### Imposibilidad de asistir (= reschedule en Honduras, casi nunca cancelar definitivo)
```
no puedo asistir       (60 veces — la más común)
no puedo a esa hora
no puedo ir
no podre
no podré
no podré asistir
no voy a poder
no voy a poder ir
no me será posible
no me dará tiempo
no podia
mañana no puedo
buen día! no podre asistir
```

### Razones humanas (extraer y reagendar)
```
estaré fuera de tegus
estoy fuera de ciudad
estoy fuera del país
no estoy en el país
no estoy en el pais
estaré fuera
ando mal de migraña
ando enfermo
ando mal
me siento mal
tengo gripe
tengo fiebre
tengo emergencia
tengo una emergencia
emergencia
imprevisto
inconveniente
asuntos pendientes
tengo clases
tengo compromiso
tengo otro compromiso
mi mamá está delicada
no pude viajar
se me presentó algo
me surgió algo
tuve una situación
tuvimos una situación de último momento
hola buenos días, mil disculpas... no podré...
```

### Frases "anuncio de reagendamiento" (con fecha objetivo)
```
hola, podemos reagendar para el viernes
hola será que puedo moverla para el 30 de marzo
hola muy buenos días, quería saber si podría pasar mi cita para la próxima semana
fíjese que todavía no me encuentro en el país puedo pasar la cita para el 1 de mayo
puedo asistir hasta el 30 de este mes
para el 14 de mayo preferiblemente
me gustaría dejar la cita para el 24 de abril
si me la puede dejar para el lunes 27
hola ya reagende cita para el lunes 13 de abril 10:00am
reagendar cita para el sábado 2 de mayo
reagendar cita para el martes 07 de abril 2026
reagendar cita para el jueves a las 11:30am
buenas tardes ... posponemos la cita para otra fecha, mil disculpas y muchas gracias
```

---

## 3. SOFT_NO — no decisivo / "yo aviso"

> En Honduras estos NUNCA son cierres reales. Son "no" suaves o procrastinación. Tratamiento recomendado: NO marcar como confirmada, NO reagendar automático — escalar a humano o liberar el slot.

```
yo aviso
yo le aviso
yo les aviso
yo te aviso
yo ahí le aviso
yo le hablo
yo le digo
le aviso
les aviso
aviso después
aviso luego
yo llamaré cuando pueda
yo llamaré después
llamo después
llamaré
yo escribiré
yo le escribiré
le escribiré
me comunico
me comunicaré
me comunico después
yo le escribiré para que agende una cita
no estoy seguro de poder asistir yo aviso con tiempo
cuando me decida le llamo
cuando pueda
cuando sepa
lo pienso
lo voy a pensar
déjeme pensar
déjeme verlo
tengo que ver
voy a ver
ahí veo
ahí veré
ahí veremos
verifico
consulto
tengo que consultar
tengo que confirmar con mi esposo/a
por ahora no
por el momento no
por los momentos no
más adelante
otro día
después vemos
estamos en contacto
hablamos después
en otro momento
cancelar le aviso nuevamente
hola, estoy en su sitio web... después vemos otros tratamientos
```

---

## 4. CANCEL — cancelar definitivamente (raro en Honduras)

```
cancelar
cancelar cita
cancelar la cita
canselar
al final cancelar
quiero cancelar
ya no quiero
ya no
ya no la necesito
prefiero cancelar
mejor cancelar
```

> **Importante:** muchos pacientes que escriben "cancelar" en realidad quieren reagendar. Antes de ejecutar cancelación, ofrecer reagendar como opción 1 con confirmación explícita ("¿seguro que cancelar definitivamente, o prefiere mover a otra fecha?").

---

## 5. GREETING — saludo

```
hola                    (114 veces)
hola!
hola.
hola buenas
hola buen día
hola buen dia
hola buenos días
hola buenas tardes
hola buenas noches
buenos días               (7)
buenos dias
buen día                  (7)
buen dia
buenas                    (3)
buenas tardes             (6)
buenas noches
buenas tarde
buenas días
buenas graciaa            (typo común)
holi
holis
holi buenas
hola guapos
hola dr
hola doctor
hola doctora
saludos
hola saludos
qué tal / que tal
hi
hello
hellow
```

> Los saludos casi siempre vienen acompañados de info útil. Si después del saludo viene texto, procesar el texto. Si NO viene nada más, mostrar menú.

---

## 6. PREAMBLE — frases que preceden info crítica

> Estas son señales de que viene info importante. NUNCA las proceses solas — extrae lo que sigue.

```
fíjese que...
fijese que...
fíjese...
mire que...
mire no que...                    (variante con muletilla)
vea que...
vea pues que...
disculpe...
disculpa...
disculpen...
mil disculpas...
perdone...
perdón...
le saluda [nombre]
le habla [nombre]
soy [nombre]
soy [nombre] de [lugar]
me llamo [nombre]
hola soy...
hola le saluda...
buenas tardes estimada...
buen día doctor/a
hola feliz noche dlctor (errata común)
escuche...
escúcheme...
```

### Ejemplos reales del dataset
```
"fíjese que todavía no me encuentro el en país puedo pasar la cita para el 1 de mayo"
   → preámbulo + RESCHEDULE + fecha objetivo "1 de mayo"

"hola buenos días, mire que no podre llevar a jonathan el día de mañana. mil disculpas yo le escribiré para que agende una cita"
   → preámbulo + RESCHEDULE + tercero (paciente es Jonathan) + SOFT_NO ("yo le escribiré")

"soy yami de puerto cortes"
   → preámbulo + identidad
   
"buenas tardes estimada, a escribir iba; tuvimos una situación de último momento, por lo que posponemos la cita para otra fecha"
   → preámbulo + RESCHEDULE
```

---

## 7. FAQ — preguntas frecuentes

### Precio
```
precio
precios
presio                  (typo común)
presios
costo
costos
cuanto cuesta
cuánto cuesta
cuanto vale
cuánto vale
cuanto sale
cuanto cobran
cuanto debo (pagar)
tarifa
valor
qué precio tiene
qué precio tienen
me gustaría saber el precio
quiero precio
quiero saber precios
costo de una limpieza
precio de blanqueamiento
precio de la consulta
costo del láser en queloide
qué costo tienen sus servicios
quiero precio de los tratamientos
```

### Ubicación
```
ubicación
ubicacion
ubicasion               (typo)
dirección
direccion
direcion                (typo)
dónde están
dónde están ubicados
donde queda
donde se encuentra
en qué zona
cómo llego
me puede enviar la ubicación
están en santa rosa? (etc)
```

### Horario
```
qué horario
qué horarios
horario de atención
orario de atension      (typo)
a qué hora abren
hasta qué hora atienden
qué hora cierran
```

### Servicios / qué hacen
```
hacen tratamiento de [X]
atienden [X]
atienden niños
atienden niñas
atienden adultos
atienden tatuajes
atienden borrados de tatuajes
qué servicios tienen
para qué sirve [X]
```

### Mi cita / cuándo es / qué hora
```
cuándo es mi cita
cuando es mi cita
cuándo será mi cita
me confirma cuando es mi cita
me puede confirmar cuando es mi proxima cita
cual es mi cita
me recuerda cuando
para qué procedimiento tengo cita
mi cita la tengo programada para el 15 de este mes
no es a las 10:30 entonces?
sería a las 12?
buenos días, me habían dicho a las 10 am, a las 2 no puedo
```

### Pagos / seguros
```
aceptan seguro
aceptan tarjeta
aceptan efectivo
método de pago
métodos de pago
```

---

## 8. OUT_OF_SCOPE — pedidos que el bot no puede atender

> El bot debe responder claramente "esto requiere atención humana" y escalar.

```
video llamada / videollamada
consulta online
consulta virtual
me gustaría hacer una cita virtual
en línea
por zoom
telemedicina
pensé que la cita era por video llamada
me puede mandar foto del [suero/receta/orden]
me puede enviar foto
me puede enviar la receta
mandar receta
copia de la receta
enviarme imagen
enviarme la orden
mandarme la orden de exámenes
es normal que [síntoma médico]?
es normal de que yo me esté como descascarando
ayer fui a la cita... es normal?
quería consultar si esto es normal
si me sometiera al tratamiento cada cuánto
con cuántos días antes debo reservar
```

---

## 9. WRONG_NUMBER

```
se equivocó de número
se equivoco de numero
no es el número de [nombre]
no soy [nombre]
esto no es [lugar]
estaba mal el número
se equivocaron
```

---

## 10. SPAM / BOT EXTERNO (escalar/ignorar)

> Mensajes auto-generados de otros negocios que rebotan al WhatsApp del consultorio.

```
"Gracias por comunicarte con [Empresa]..."
"Le saluda [nombre] de Banco Ficohsa..."
"Le saluda [nombre] de [Banco/Aseguradora]..."
"Soy creadora de contenido para redes sociales..." (spam de prospectores freelance)
```

---

## 11. HANDOFF — quiere humano explícitamente

```
secretaria
sekretari               (typo)
hablar con secretaria
hablar con la secretaria
hablar con el doctor
hablar con la doctora
hablar con el dr
quiero hablar con el dr
hablar
hablame
llamar
llamame
contacto
contactar
humano
persona
alguien
atención
atension                (typo)
ayuda
necesito ayuda
nesesito ayuda          (typo)
comunicarme
komunicarme             (typo)
```

---

## 12. TYPOS comunes (normalizar antes de matchear)

| Escrito | Normalizado |
|---|---|
| sita | cita |
| sitita | cita |
| sitas | citas |
| sitología / sitologia | citología |
| ajendar | agendar |
| reajendar | reagendar |
| canselar | cancelar |
| consejal | (probable autocomplete) |
| presio | precio |
| presios | precios |
| ubicasion | ubicación |
| orario | horario |
| sirugia | cirugía |
| konsulta | consulta |
| nesesito / nesecito | necesito |
| nesesita | necesita |
| sekretari | secretaria |
| atension | atención |
| dlctor (errata frecuente) | doctor |
| ay yegare / ay estaré | ahí estaré |
| ahi | ahí |
| que pena (sin acento) | qué pena |
| diq / dia | día |
| q / k / ke | que / qué |
| pq | porque |
| xq | por qué |

---

## 13. PARSING DE FECHA Y HORA en lenguaje natural

> Estos casos hoy rompen el flujo de booking_select_day/hour. Idealmente parsear y mapear al slot correcto.

### Fechas absolutas
```
17 de abril
26 de abril
5 de abril
9 de abril
26 de marzo
05 de abril (con cero)
17 de marzo
25 de marzo
para el 14 de mayo
para el día 9 de mayo
hasta el 30 de junio
podría hasta el 15 de junio
para el día 20 de mayo
sería para el 9 de mayo
mi agenda es para el 9 de abril
quiero programar para el día 20 de mayo
me gustaría dejar la cita para el 24 de abril
reagendar cita para el martes 07 de abril 2026
reprogramelo para el 2 de abril
del 30 al 5 de abril
semana del 6 de abril
semana del 13 de abril al 17
semana del 30 de marzo
```

### Días de la semana
```
el lunes
el martes
el miércoles / miercoles
el jueves
el viernes
el sábado / sabado
el domingo
para el [día]
sería el [día]
el día viernes 17 de abril
martes 21 de abril
sábado 28
mañana
mañana viernes
manana                  (sin tilde)
ata mañana              (typo)
pasado mañana
hoy
hoy mismo
hoy por la tarde
esta tarde
esta noche
tienen cita disponible para hoy por la tarde?
```

### Horas
```
a las 9
a las 10
a las 9:30
a las 10:30
a las 11:30am
a las 3 de la tarde
a las 3:00 pm
9 de la mañana
mañana 3 pm
mañana a las 9:30
de la mañana
de la tarde
de la noche
por la mañana
por la tarde
por la noche
en la mañana
temprano
tardecito
al medio día / al mediodía
en la mañana de 9 en adelante
después de las 12
me atienda a las 3 en punto
pero ya le dije a la doctora marleny que necesito que me atienda a las 3 en punto
quiero la cita para el sábado, después de las 12, de ser posible
tiene espacio más temprano?
```

---

## 14. INFO sobre la persona / contexto extraíble

> Datos útiles para captura, NO se procesan como intent solo.

```
"para niña de 5 años"
"para mi hijo Jonathan"
"para mi mamá"
"soy [nombre]"
"vengo de parte de [Dr. X]"
"me atendió la dra [X]"
"me recetó la dra [X]"
"tengo cita con la dra [X]"
```

---

## Próxima iteración

Este diccionario crece con cada análisis del bot. Cuándo expandirlo:
- Nuevo análisis quincenal (`/modo-estrategia`) detecta frase nueva no manejada
- Cliente nuevo trae especialidad nueva (vocabulario propio)
- Diego lee logs y nota patrón perdido

Para agregar al diccionario:
1. Decidir el bucket (intent)
2. Agregar la frase + variantes
3. Agregar nota cultural si aplica
4. Si requiere parser nuevo (fecha, hora), notar como TODO

## Archivos relacionados

- `_shared/honduras-intents.ts` — implementación (pendiente)
- `bot-handler/index.ts:636-674` — `detectMenuIntent` actual (a reemplazar gradualmente)
- `meta-webhook/index.ts:80-144` — `detectIntent` simple (refactor planificado)
- `docs/analisis-bot-detalle-pacientes-14abr-28abr.md` — sesiones reales que motivaron este diccionario
