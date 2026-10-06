# Jornadas — catálogo de funcionalidades para replicar en Day Use

Inventario de todo lo que hoy hace la **jornada** (`/match-sessions`) en `futbol-tracker-api`,
pensado para llevar ideas al sistema de Day Use (`day-use-metch/backend-day-use`).

Este doc **no reemplaza** el spec del Day Use (`backend-day-use/docs/api-contract-mvp.md`, del
2026-08-29). Lo complementa con lo que se agregó a las jornadas de fútbol después de esa fecha, y
compara las dos cosas.

Fuentes (verificadas contra el código al 2026-10-02):

- `docs/frontend-registro-abierto-criterios-jornadas.md` (jornadas v1)
- `docs/frontend-jornadas-v2-rotacion-tiempo-real.md` (N equipos, rondas a mano, SSE)
- `docs/frontend-estadisticas-manuales-y-eliminar-jornada.md`
- `docs/frontend-llegadas-tarde-y-refuerzos.md`
- `docs/frontend-notificaciones.md`
- `src/modules/match-sessions/**` y `src/modules/matches/**`, para lo que **no** está en ningún doc
  (marcado con 📄 abajo).

> 📄 = funcionalidad que existe en el código pero no tiene doc de frontend propio. Hoy solo se la
> menciona de pasada en otros docs: convocatoria, `POST /start`, `PUT /teams`, invitados, reclamo de
> invitado y `PATCH /matches/:id/criteria`. Acá quedan descritas.

---

## 1. Mapa de conceptos fútbol → Day Use

| Fútbol (`futbol-tracker-api`) | Day Use (`backend-day-use`) | Comentario |
|---|---|---|
| `MatchSession` (jornada) | `DayUseSession` (`day_uses`) | Las dos son el evento del día. La jornada tiene ciclo de vida real; el day use nunca pasa de `scheduled` solo |
| `SessionAttendee` (asistente) | `DayUseParticipant` | Day Use ya tiene `confirmed`/`waitlist` y `checkedInAt`. Fútbol no tiene cupo ni lista de espera |
| `SessionTeam` + `SessionTeamPlayer` (plantilla) | `Team` + `members` | En Day Use no se pueden sacar ni mover miembros, solo agregar |
| `Match` con `sessionId` (ronda) | `Match` con `dayUseId` | En fútbol la ronda es un partido en vivo (marcador, goles, auto-cierre); en Day Use solo se carga el resultado al final |
| `Player` (con `isGuest`) | `User` | En Day Use todo participante es un `User`. No existen invitados sin cuenta |
| `SessionPlayerStat` (carga manual) | — | No existe |
| `Notification` + SSE | `Notification` (solo persistencia) | Day Use no tiene tiempo real |
| `GET /stats/leaderboard` | `points_ledger` + `user_sport_levels` | Day Use suma puntos y sube de nivel. Fútbol cuenta goles y asistencias |

---

## 2. Ciclo de vida de la jornada

```
                 POST /match-sessions (sin teams)
                              │
                              ▼
                       ┌──────────────┐  POST /:id/attendance  (confirmar)
                       │ convocatoria │  DELETE /:id/attendance (bajarse)
                       └──────┬───────┘  POST /:id/guests      (admin suma invitado)
                              │ POST /:id/start  (admin arma equipos)
POST /match-sessions          ▼
  (con teams) ───────► ┌──────────────┐  rondas, rotación, refuerzos, "Cheguei",
                       │   en_curso   │  PUT /:id/teams, POST /:id/matches...
                       └──────┬───────┘
                              │ PATCH /:id/finish
                              ▼
                       ┌──────────────┐  "Estive lá" + carga manual tardía
                       │  finalizada  │
                       └──────────────┘
DELETE /:id (admin) → se borra en cualquier estado
```

`MatchSessionStatus` = `convocatoria | en_curso | finalizada`.

**Para Day Use:** el enum `scheduled | ongoing | finished | cancelled` ya existe, pero nada lo hace
avanzar. Se puede copiar el patrón de transiciones explícitas: `start` (admin/creador arma equipos)
→ `ongoing`, y `finish` → `finished`. Ojo: `GET /day-use-sessions` filtra por `scheduled`, así que
hay que ajustar ese listado al mismo tiempo (está anotado en "Pendiente" del spec del Day Use).

---

## 3. Catálogo de funcionalidades

### 3.1. Crear jornada: con equipos o como convocatoria 📄

`POST /match-sessions` (admin)

```json
{
  "name": "Pichanga del sábado",
  "date": "2026-10-04T20:00:00.000Z",
  "rotationMode": "winner_stays",
  "durationMinutes": 10,
  "goalLimit": 2,
  "playersPerTeam": 5,
  "teams": [ { "name": "A", "playerIds": ["..."] }, { "name": "B", "playerIds": ["..."] } ]
}
```

- **Sin `teams` (o vacío)** → nace en `convocatoria`: la gente confirma asistencia y el admin arma
  los equipos después con `start`.
- **Con `teams`** (mínimo 2, sin máximo) → nace `en_curso`. Si `rotationMode` es `winner_stays`, se
  crea sola la ronda 1 (`teams[0]` vs `teams[1]`) y el resto queda en la fila.
- `date` es opcional (default `now()`), `rotationMode` default `manual`.
- `durationMinutes` / `goalLimit` son la **plantilla** que se copia a las rondas que arma el
  backend.
- `playersPerTeam` (1–20) es el tamaño de equipo que usan los refuerzos (3.8).
- Validaciones: cada equipo con ≥1 jugador, jugador no repetido entre equipos, nombres de equipo
  únicos, jugadores existentes (todas `400`).
- Responde `{ session, currentMatch }` (`currentMatch` puede ser `null`).

**Para Day Use:** el day use hoy ya es una "convocatoria" (la gente hace `join`). Lo que falta es el
paso "armar equipos y arrancar" de forma atómica (3.3).

### 3.2. Asistencia en cualquier estado

`POST /match-sessions/:id/attendance` (JWT, usa el `playerId` del token). Es idempotente.

| Estado | Botón en la UI | Efecto |
|---|---|---|
| `convocatoria` | Confirmar | queda en `attendees` |
| `en_curso` | **"Cheguei"** | queda en `attendees` **sin equipo**. El admin lo ubica con `PUT /teams` y juega desde la próxima ronda |
| `finalizada` | **"Estive lá"** | queda registrado que fue. Habilita la carga manual tardía (3.10) |

`DELETE /match-sessions/:id/attendance`:

- En `convocatoria` sale sin más.
- Fuera de `convocatoria`, solo si no está en ningún equipo y no jugó ninguna ronda. Si no, `409`
  `"Ya estás en un equipo de la jornada: pide al administrador que te saque"`.

`DELETE /match-sessions/:id/attendees/:playerId` (admin) aplica la misma regla. Si el jugador es un
invitado sin nada más, se borra el `Player`.

**Para Day Use:** `join` / `leave` / `check-in` ya existen, pero `join` responde `409` si el day use
no está `scheduled`. Se puede copiar la idea de "llegué tarde" (`ongoing`) y "estuve" (`finished`),
y la regla de que no te podés bajar si ya estás en un equipo o jugaste un partido.

### 3.3. Arrancar la jornada: `POST /match-sessions/:id/start` 📄

Admin. Solo vale en `convocatoria`.

```json
{
  "rotationMode": "winner_stays",
  "durationMinutes": 8,
  "goalLimit": 2,
  "playersPerTeam": 5,
  "teams": [ { "name": "A", "playerIds": ["..."] }, { "name": "B", "playerIds": ["..."] } ]
}
```

- `teams` es obligatorio (mínimo 2). Los demás campos son opcionales; si faltan, se mantiene lo que
  tenía la jornada.
- Los jugadores **no** tienen que estar en `attendees`: el admin puede sumar a alguien que vino sin
  confirmar. Todo jugador que queda en un equipo pasa a `attendees` solo.
- Pasa a `en_curso` y, en `winner_stays`, crea la ronda 1.
- Errores: `404`, `409 "La jornada ya está finalizada"`, `409 "La jornada ya empezó"`, `409` si hay
  estadísticas manuales cargadas (3.10).
- Responde `{ session, currentMatch }`.

**Para Day Use:** equivale a `POST /day-use-sessions/:id/start` con el armado de todos los equipos
en una sola llamada, en vez de `POST /teams` + `POST /teams/:id/members` uno por uno.

### 3.4. Editar equipos en vivo: `PUT /match-sessions/:id/teams` 📄

Admin. Reemplaza **todas** las plantillas de una vez. Vale en `en_curso` y `finalizada`; en
`convocatoria` responde `409 "La jornada todavía no empezó"`.

```json
{
  "playersPerTeam": 6,
  "teams": [
    { "id": "st1", "name": "A", "playerIds": ["p1", "p2"], "queuePosition": null },
    { "id": "st2", "name": "B", "playerIds": ["p3", "p4"], "queuePosition": 0 },
    { "name": "C", "playerIds": ["p5", "p6"], "queuePosition": 1 }
  ]
}
```

- Con `id` actualiza ese equipo. Sin `id` crea uno nuevo (o reusa uno que no vino en el body y tiene
  el mismo nombre).
- Un equipo que **no** viene en el body:
  - si ya jugó alguna ronda, queda **vacío** (se conserva para el historial y se le renombra si
    hace falta liberar el nombre);
  - si nunca jugó, se **borra**.
- `queuePosition` (solo en `winner_stays` + `en_curso`) permite **reordenar la fila**. Las posiciones
  tienen que ser 0..n-1 sin huecos, y un equipo que está jugando no puede estar en la fila.
- `playersPerTeam`: ausente = no cambia, `null` = lo borra, número = lo cambia.
- El partido en curso **conserva** sus participantes. Los cambios valen desde la próxima ronda.
- Los jugadores nuevos pasan a `attendees` solos.

**Para Day Use:** hoy no se puede sacar a nadie de un equipo ni borrar un equipo. Este endpoint
"reemplazar todo" es más simple para el front que un CRUD fino (agregar/sacar/mover).

### 3.5. Agregar un equipo suelto: `POST /match-sessions/:id/teams`

Admin. `{ name, playerIds }`. En `winner_stays` entra al **final** de la fila. `409` si la jornada
está finalizada.

### 3.6. Rondas (partidos dentro de la jornada)

Cada ronda es un `Match` normal con `sessionId`, `homeSessionTeamId` y `awaySessionTeamId`. Usa los
mismos endpoints de siempre: goles, marcador, finish, result, join, participants.

**Ronda a mano**: `POST /match-sessions/:id/matches` (admin)

```json
{
  "homeSessionTeamId": "st1",
  "awaySessionTeamId": "st3",
  "durationMinutes": 8,
  "goalLimit": 2,
  "fillFromSessionTeamId": "st2"
}
```

- Solo **una ronda activa** por jornada (`409 "Ya hay una ronda en curso en esta jornada"`).
- Los criterios son **independientes** de la plantilla de la jornada: si no los mandás, la ronda
  no tiene criterio.
- En `winner_stays` los dos equipos elegidos salen de la fila.
- `fillFromSessionTeamId` completa los dos equipos con refuerzos de un tercer equipo (3.8).
- Es la única forma de jugar en modo `manual`, y la forma de destrabar un empate en
  `winner_stays`.

### 3.7. Rotación automática "el que gana se queda" (`winner_stays`)

Se dispara cuando la ronda actual pasa a `finalizado`, ya sea por criterio o con
`PATCH /matches/:id/finish`.

- **Hay ganador**: el ganador se queda (pasa a `home`), el perdedor va al **final** de la fila y
  entra como `away` el primero de la fila. Con 2 equipos esto da la revancha.
- **Empate**: no se genera nada. Para seguir: corregir con `PATCH /matches/:id/result` (dispara la
  rotación con el nuevo resultado) o crear la ronda a mano.
- En `manual` nunca se genera nada solo.
- `session.queue` (array de `sessionTeamId`, el `0` es el próximo) ya viene calculado; el front no
  tiene que deducir nada.

Implementación: `AdvanceMatchSessionUseCase` + `SessionRoundFactory` (los dos tienen tests).

**Para Day Use:** es la funcionalidad más valiosa para llevar. Un day use de vóley o fútbol con 3+
equipos es exactamente "el que gana se queda". En vóley el "criterio de fin" sería por puntos/sets
en vez de goles.

### 3.8. Refuerzos (completar equipos incompletos)

Al armar la siguiente ronda en `winner_stays`, si el equipo que **entra** tiene menos jugadores que
`playersPerTeam`, el backend lo completa **solo para esa ronda** con jugadores del equipo que
**acaba de perder**:

1. Se completa primero el que entra y después el ganador (por si alguien se fue).
2. Primero eligen a los que **menos veces fueron refuerzo** en la jornada; entre empatados, al
   **azar**.
3. Si no alcanzan, se completa lo que se pueda y la ronda se crea igual.
4. Con 2 equipos (revancha) no hay refuerzos.
5. Las plantillas no cambian: el refuerzo aparece en `participants` con `isFillIn: true`, pero
   sigue en su equipo en `session.teams`. Sus goles suman para el lado en que jugó.
6. `playersPerTeam: null` = se toma como tamaño el equipo más grande.

Implementación: `pick-fill-ins.ts` (función pura con el azar inyectado, tiene tests).

**Para Day Use:** `sport.teamSize` ya existe pero no se usa en ningún lado. Podría alimentar esta
misma lógica (tamaño por defecto) y además validar el tamaño al agregar miembros.

### 3.9. Criterios de fin de ronda y cierre automático

- `durationMinutes` y/o `goalLimit` por partido. Si vienen los dos, gana el que se cumpla primero.
- `PATCH /matches/:id/criteria` 📄 (admin) los cambia en un partido ya creado. El body lleva los dos
  campos siempre; `null` quita ese criterio.
- **Cierre activo**: `MatchExpiryWatcherService` revisa cada **12 s** y cierra los partidos
  vencidos por tiempo. Eso dispara la rotación.
- También se chequea al leer o modificar el partido (`GET`, cargar gol, ajustar marcador).
- Cargar un gol (`POST /matches/:matchId/goals`) mueve el marcador solo; borrarlo resta.
  `PATCH /matches/:id/score` (`delta: ±1`) sigue para "gol rápido sin autor".

**Para Day Use:** hoy un `Match` de Day Use se crea en `scheduled` y solo se cierra con `result` o
`walkover`, sin marcador en vivo. Si se quiere un partido en vivo, hay que copiar marcador +
criterios + watcher.

### 3.10. Estadísticas manuales con aprobación

Para jornadas que se jugaron sin cargar rondas en la app, o para quien no quedó registrado en
ninguna.

- `PUT /match-sessions/:id/my-stats` `{ goals, assists }` (0–50). Queda `pendiente` y suma a
  `attendees`.
- `DELETE /match-sessions/:id/my-stats` = "No participé".
- Admin: `PUT|DELETE /match-sessions/:id/players/:playerId/stats` (queda `aprobada` / rechazo) y
  `PATCH .../approve`.
- Solo las `aprobada` suman al ranking.
- Exclusión mutua: un jugador tiene goles de rondas **o** carga manual, nunca las dos. Si hay
  cargas, no se pueden crear rondas (`409`), y al revés.
- El backend calcula `allowsManualStats` y `allowsLateManualStats` para que el front no deduzca la
  regla.

**Para Day Use:** el equivalente sería "registrar resultado sin haber armado el match en la app",
o reclamar puntos de participación con aprobación del creador. El patrón de **flags calculados en
el backend** (`allowsX`) conviene copiarlo aunque no se copie la feature.

### 3.11. Invitados sin cuenta y reclamo al registrarse 📄

- `POST /match-sessions/:id/guests` (admin) `{ name }`, en cualquier estado. Crea un `Player` con
  `isGuest: true` y lo agrega a `attendees`. El nombre debe tener al menos 2 caracteres y no puede
  repetirse en la jornada (`400`).
- El invitado juega, hace goles y aparece en el historial como cualquiera.
- `GET /players/guests` lista los invitados.
- `POST /auth/register` con `guestPlayerId` **reclama** al invitado: la cuenta nueva queda vinculada
  a ese `Player` y conserva goles, partidos y cargas manuales sin migrar nada. Errores: `404 "El
  invitado no existe"`, `409 "Ese invitado ya fue vinculado a otra cuenta"`.
- Al eliminar una jornada se borran los invitados que no quedaron en ninguna otra.

**Para Day Use:** hoy todo participante tiene que ser `User`, así que en la cancha no se puede
sumar al amigo que vino sin app. Copiar esto implica separar "persona que juega" de "cuenta". En
fútbol eso es `Player` vs `User`; en Day Use el ledger de puntos y el nivel cuelgan de `userId`, lo
que es un cambio de modelo grande. Ver decisión D2 en la sección 5.

### 3.12. Finalizar y eliminar

- `PATCH /match-sessions/:id/finish` (admin): pasa a `finalizada` y cierra la ronda en curso sin
  generar otra. `409` si ya estaba finalizada.
- `DELETE /match-sessions/:id` (admin, `204`): borra rondas, goles, participantes, equipos,
  asistentes, cargas manuales, notificaciones e invitados huérfanos. Los jugadores registrados no
  se borran. El ranking se recalcula solo porque se calcula al leer. Emite `session.deleted` por SSE.

**Para Day Use:** solo existe `cancel`. Si se agrega borrar, hay que revertir el `points_ledger` y
el nivel. En fútbol esto es gratis porque el ranking no se guarda; en Day Use los puntos sí se
guardan.

### 3.13. Tiempo real (SSE)

| Endpoint | Auth | Eventos |
|---|---|---|
| `GET /matches/:id/events` | pública | `match.updated` (MatchDto), `ping`, `error` |
| `GET /match-sessions/:id/events` | pública | `session.updated` (`{ session, matches }`), `session.deleted` (`{ id }`), `ping`, `error` |
| `GET /notifications/events?token=<jwt>` | JWT por query | `notifications.count`, `notification.created`, `ping` |

- Al conectar llega el estado actual (no hace falta un `GET` antes).
- Cada evento trae el **estado completo**, no un diff, así que el front repinta sin mergear.
- `ping` cada 25 s para que los proxies no corten la conexión.
- Después de `session.deleted` o `error` el server cierra el stream; el front tiene que cerrar el
  `EventSource` para que no reconecte.

Implementación: `SessionEventsService.emit(sessionId)` se llama al final de cada caso de uso que
cambia algo, y `SessionEventStreamService` arma el payload.

**Para Day Use:** el spec del Day Use lista "tiempo real" como pendiente. Este patrón (SSE con estado
completo + `emit(id)` al final de cada caso de uso) es directo de copiar y no necesita WebSocket.

### 3.14. Notificaciones in-app

- Tipos actuales: `manual_stats_submitted` (a todos los admins), `manual_stats_approved`,
  `manual_stats_set_by_admin` y `manual_stats_rejected` (al jugador).
- `data` guarda una **foto** del momento (`sessionName`, `playerName`, `goals`, `assists`) y el
  front arma el texto en su idioma.
- Reglas del backend: nadie se notifica a sí mismo; al editar no se duplica (el aviso viejo queda
  leído); cuando un admin resuelve, el aviso queda leído **para todos los admins**.
- Paginación por cursor (`before` / `nextCursor`), `unreadCount` total, `PATCH /:id/read`,
  `PATCH /read-all`.

**Para Day Use:** ya tiene `Notification` con `payload` y `GET` + `PATCH /:id/read`. Le faltan
`unreadCount`, `read-all`, paginación por cursor, SSE y las reglas de dedupe.

### 3.15. Ranking

`GET /stats/leaderboard` y `GET /players/:id/stats` devuelven `matchesPlayed`, `goals`, `assists`
y `sessionsPlayed` (jornadas con alguna ronda o carga manual aprobada). Se calcula al leer, no se
guarda.

---

## 4. Qué tiene Day Use hoy y qué le falta (comparado con la jornada)

| Funcionalidad | Fútbol | Day Use | Prioridad sugerida |
|---|---|---|---|
| Ciclo de vida con transiciones (`start` / `finish`) | ✅ | ❌ (enum sin uso) | **Alta** |
| Armar equipos en un paso al arrancar | ✅ `POST /start` | ❌ (uno por uno) | **Alta** |
| Editar equipos (sacar / mover / borrar) | ✅ `PUT /teams` | ❌ (solo agregar) | **Alta** |
| Rotación "el que gana se queda" + fila | ✅ | ❌ | **Alta** |
| Tiempo real SSE | ✅ | ❌ | Media-alta |
| Marcador en vivo + criterios de fin + watcher | ✅ | ❌ (solo resultado final) | Media |
| Refuerzos automáticos con `playersPerTeam` | ✅ | ❌ (`teamSize` sin uso) | Media |
| Llegada tarde / "estuve" | ✅ | ❌ (`join` solo en `scheduled`) | Media |
| Notificaciones con contador, cursor, read-all, SSE | ✅ | parcial | Media |
| Invitados sin cuenta + reclamo | ✅ | ❌ | Baja (cambio de modelo) |
| Estadísticas manuales con aprobación | ✅ | ❌ | Baja |
| Eliminar evento con cascada | ✅ | ❌ (solo cancelar) | Baja (hay que revertir puntos) |
| Cupo + lista de espera | ❌ | ✅ | — (Day Use ya lo tiene) |
| Check-in | ❌ | ✅ | — (equivale a "Cheguei") |
| Series recurrentes | ❌ | ✅ | — |
| Puntos y nivel por deporte | ❌ | ✅ | — |

### Orden sugerido para implementar en Day Use

1. **Transiciones de estado**: `POST /day-use-sessions/:id/start` y `.../finish`, y arreglar el
   filtro del listado para que no desaparezcan los `ongoing`.
2. **Equipos**: armado atómico en `start` + `PUT /day-use-sessions/:id/teams` con la semántica de
   3.4 (vaciar si jugó, borrar si no).
3. **Rondas dentro del day use** con `rotationMode` (`manual` / `winner_stays`), fila (`queue`) y
   ronda a mano. Copiar `SessionRoundFactory` + `AdvanceMatchSessionUseCase` con sus tests.
4. **SSE** del day use (`day-use.updated`) con estado completo.
5. **Marcador en vivo + criterios + watcher**, adaptado al deporte (ver D3).
6. **Refuerzos** usando `playersPerTeam` (default `sport.teamSize`).
7. Llegada tarde, notificaciones mejoradas, y lo demás según haga falta.

---

## 5. Decisiones a tomar antes de copiar

- **D1. ¿Quién administra?** En fútbol todo lo de jornada es `admin` global. En Day Use el dueño
  natural es el **creador** del day use (como ya pasa en `cancel`). Conviene un guard tipo
  "creador o admin" en vez de `AdminGuard`.
- **D2. Invitados.** En fútbol funciona porque estadística y cuenta están separadas (`Player` /
  `User`). En Day Use los puntos y el nivel cuelgan de `userId`. Opciones: (a) no soportar
  invitados; (b) agregar una entidad "jugador del day use" con `userId` nullable y que los puntos
  solo se acrediten a quien tenga cuenta; (c) crear un `User` "fantasma" reclamable. La (b) es la
  más parecida a lo de fútbol.
- **D3. Criterio de fin según el deporte.** `goalLimit` es de fútbol. Para vóley serían puntos por
  set + sets para ganar (ver `project-blueprint-sports-tracker.md` 3.5 y 9). Se puede generalizar
  como `scoreLimit` + `durationMinutes`, y dejar sets para una segunda etapa.
- **D4. Puntos por ronda o por day use.** En Day Use cada `PATCH /matches/:id/result` acredita +3/+1.
  Con rotación hay **muchas rondas por día**: definir si cada ronda da puntos (riesgo de inflar el
  nivel) o si se acredita una vez al finalizar el day use (por ejemplo, rondas ganadas → bonus).
- **D5. Cupo vs plantillas.** Day Use tiene `maxParticipants` + `waitlist`. Definir si quien está en
  `waitlist` puede ser refuerzo o entrar con "llegué tarde" (en fútbol cualquiera de `attendees`
  puede).
- **D6. Corrección de resultado.** En Day Use `result` es de una sola vez (`409`). La rotación de
  fútbol depende de poder corregir con `PATCH /matches/:id/result` para destrabar empates. Hay que
  permitir corrección (y revertir puntos) o resolver los empates solo con ronda a mano.

---

## 6. Patrones de implementación que vale la pena copiar tal cual

- **Estado derivado calculado en el backend** (`queue`, `allowsManualStats`,
  `allowsLateManualStats`): el front nunca deduce reglas de negocio.
- **Respuesta = estado completo** en cada mutación de la jornada, y el mismo shape en SSE.
- **`emit(id)` al final de cada caso de uso** que cambia algo, en vez de emitir desde el
  repositorio.
- **Funciones puras con el azar inyectado** (`pickFillIns(randomInt)`) para poder testear sorteos.
- **Idempotencia** en "confirmar asistencia" y "aprobar": llamar dos veces no falla ni duplica.
- **Mensajes de error en español y específicos**, pensados para mostrarse tal cual en la UI.
- **`joinOrder` explícito** para no depender del orden en que Postgres devuelve una relación.
- **Vaciar en vez de borrar** lo que ya tiene historial (equipos que jugaron rondas).

---

## 7. Endpoints de jornada (referencia rápida)

```
GET    /match-sessions                                  pública
GET    /match-sessions/:id                              pública  -> { session, matches }
SSE    /match-sessions/:id/events                       pública
POST   /match-sessions                                  admin    -> { session, currentMatch }
DELETE /match-sessions/:id                              admin    -> 204
POST   /match-sessions/:id/start                        admin    -> { session, currentMatch }   📄
POST   /match-sessions/:id/teams                        admin    -> session
PUT    /match-sessions/:id/teams                        admin    -> session                     📄
POST   /match-sessions/:id/matches                      admin    -> MatchDto
PATCH  /match-sessions/:id/finish                       admin    -> session
POST   /match-sessions/:id/attendance                   JWT      -> session
DELETE /match-sessions/:id/attendance                   JWT      -> session
POST   /match-sessions/:id/guests                       admin    -> session                     📄
DELETE /match-sessions/:id/attendees/:playerId          admin    -> session
PUT    /match-sessions/:id/my-stats                     JWT      -> session
DELETE /match-sessions/:id/my-stats                     JWT      -> session
PUT    /match-sessions/:id/players/:playerId/stats      admin    -> session
PATCH  /match-sessions/:id/players/:playerId/stats/approve admin -> session
DELETE /match-sessions/:id/players/:playerId/stats      admin    -> session

# Partido / ronda
GET    /matches/:id          SSE /matches/:id/events
PATCH  /matches/:id/finish | /result | /score | /criteria 📄
POST   /matches/:id/join | /participants
GET    /matches/:matchId/goals | /summary     POST /matches/:matchId/goals     DELETE /goals/:id

# Relacionados
GET    /players/guests  📄      POST /auth/register { guestPlayerId? } 📄
GET    /stats/leaderboard        GET /players/:id/stats
GET    /notifications   PATCH /notifications/:id/read   PATCH /notifications/read-all   SSE /notifications/events
```
