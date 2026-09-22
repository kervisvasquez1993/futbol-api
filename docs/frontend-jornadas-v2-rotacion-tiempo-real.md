# Jornadas v2 — N equipos, partidos a mano y tiempo real

Este doc es un **delta** sobre `frontend-registro-abierto-criterios-jornadas.md` (sección 4,
"jornadas con rotación de equipos"). Esa sección queda desactualizada en varios puntos — acá está
lo que cambió y lo nuevo. Sigue todo envuelto en `{ success, data }` / `{ success: false, message, errors? }`
salvo los endpoints de SSE (ver sección 4).

## 1. `POST /match-sessions` — cambios

```json
{
  "name": "Pichanga del sábado",
  "rotationMode": "winner_stays",
  "durationMinutes": 10,
  "goalLimit": 2,
  "teams": [
    { "name": "Equipo A", "playerIds": ["p1", "p2"] },
    { "name": "Equipo B", "playerIds": ["p3", "p4"] },
    { "name": "Equipo C", "playerIds": ["p5", "p6"] },
    { "name": "Equipo D", "playerIds": ["p7", "p8"] }
  ]
}
```

| Campo | Antes | Ahora |
|---|---|---|
| `teams` | mínimo 2, máximo 3 | mínimo 2, **sin máximo** — probado con 4 |
| `date` | requerido | **opcional**; si no viene, el backend usa `now()` |
| `rotationMode` | no existía | **nuevo**, `"manual" \| "winner_stays"`, default `"manual"` si no se manda |
| `durationMinutes` / `goalLimit` | criterio de la única ronda que se creaba | siguen igual, pero ahora son la **plantilla por defecto** que se copia solo a las rondas que arma el backend automáticamente (creación + rotación en `winner_stays`). Una ronda creada a mano (sección 3) **no** los hereda. |

Validaciones que se mantienen: cada equipo con al menos 1 jugador, un jugador no puede estar en dos
equipos de la misma jornada, nombres de equipo no repetidos (todas `400`).

**Qué se crea según `rotationMode`:**

- `"manual"`: **no** se crea ninguna ronda. `currentMatch` viene `null`. La primera ronda hay que
  crearla a mano con el endpoint de la sección 3.
- `"winner_stays"` (default): igual que antes, se crea la ronda 1 (`teams[0]` vs `teams[1]`) y el
  resto entra a la fila de espera en el orden en que vinieron.

`MatchSessionDto` tiene dos campos nuevos:

```ts
type SessionRotationMode = 'manual' | 'winner_stays';

interface MatchSessionDto {
  // ...los campos que ya conocías (id, name, date, status, durationMinutes, goalLimit, teams, createdAt)...
  rotationMode: SessionRotationMode; // NUEVO, siempre viene
  queue?: string[]; // NUEVO, sessionTeamIds en espera en orden — SOLO si rotationMode === 'winner_stays'
}

interface SessionTeamDto {
  id: string;
  sessionId: string;
  name: string;
  joinOrder: number;        // NUEVO — orden de alta del equipo (0, 1, 2...). El array `teams` ya viene ordenado por esto, no hace falta ordenarlo en el front.
  queuePosition: number | null; // NUEVO — dato interno; para pintar "quién sigue" usá `session.queue`, no este campo directo.
  players: SessionTeamPlayerDto[];
  createdAt: string;
}
```

## 2. `POST /match-sessions/:id/teams` — agregar un equipo (JWT)

```json
{ "name": "Equipo E", "playerIds": ["p9", "p10"] }
```

Responde el `MatchSessionDto` completo actualizado (con `queue` recalculada).

- `400` — nombre de equipo repetido en la jornada, jugador repetido en el body, jugador que ya está
  en otro equipo de esta jornada, o algún jugador que no existe.
- `404` — la jornada no existe.
- `409` `"La jornada ya está finalizada"`.

En `winner_stays` el equipo nuevo entra al **final** de la cola (no juega hasta que le toque). En
`manual` no importa el orden, ahí no hay cola.

## 3. `POST /match-sessions/:id/matches` — crear una ronda a mano (JWT)

```json
{
  "homeSessionTeamId": "st1-uuid",
  "awaySessionTeamId": "st3-uuid",
  "durationMinutes": 8,
  "goalLimit": 2
}
```

- `durationMinutes` / `goalLimit` son opcionales e **independientes de los de la jornada** — si no
  los mandás, esa ronda puntual no tiene ese criterio (aunque la jornada sí tenga uno configurado).
- Es el **único** modo de arrancar una ronda cuando `rotationMode` es `"manual"`.
- En `"winner_stays"` sirve para **destrabar un empate** (nadie se genera solo cuando la última
  ronda terminó empatada) o para armar cualquier cruce fuera de la rotación automática.
- Solo puede haber **una ronda activa a la vez** por jornada.

Responde el `MatchDto` creado (mismo shape de siempre, con `sessionId`/`homeSessionTeamId`/`awaySessionTeamId` seteados).

Errores:

| Código | Mensaje / causa |
|---|---|
| `404` | la jornada no existe |
| `409` | `"La jornada ya está finalizada"` |
| `409` | `"Ya hay una ronda en curso en esta jornada"` — hay que esperar a que la actual termine (o finalizarla) |
| `400` | `"Los equipos deben ser distintos"` — mandaste el mismo id en `home` y `away` |
| `400` | `"Los equipos indicados no pertenecen a esta jornada"` |

Efecto sobre la cola (solo en `winner_stays`): los dos equipos elegidos salen de la fila (se
remueven de `queue`) sin importar si estaban en ella o no; el resto conserva su orden relativo.

## 4. Reglas de rotación con N equipos (generaliza la de 2/3 equipos de antes)

Se dispara sola cuando la ronda **actual** de la jornada pasa a `finalizado` (por criterio
automático o por `PATCH /matches/:id/finish`) y `rotationMode === "winner_stays"`:

- **Hay ganador** (no empataron): el ganador se queda y pasa a jugar de `home` en la ronda
  siguiente. El perdedor va al **final** de la fila. Sale de la fila el que estaba **primero
  esperando** y entra como `away`. Con exactamente 2 equipos la fila está vacía en ese momento, así
  que "el primero de la fila" termina siendo el mismo perdedor recién agregado — o sea, la revancha
  de toda la vida.
- **Empate**: no se genera nada solo. La jornada queda `en_curso` sin ronda activa. Para seguir:
  - `PATCH /matches/:id/result` con un marcador no empatado sobre esa misma ronda (ya finalizada) —
    dispara la rotación con el resultado corregido, igual que antes.
  - o `POST /match-sessions/:id/matches` (sección 3) eligiendo vos quién juega la próxima.
- En `rotationMode === "manual"` **nunca** se genera una ronda sola, ni con ganador ni con empate —
  siempre hay que crearla con la sección 3.

Para pintar "quién sigue": `session.queue` (array de `sessionTeamId`, en orden — el índice `0` es
el próximo en entrar). No hace falta recalcular nada del lado del front.

## 5. Tiempo real — ya no hace falta pollear

### 5.1. El cierre por tiempo ahora es activo

Antes, un partido con `durationMinutes` solo pasaba a `finalizado` cuando algo pegaba un `GET`
(ver el doc anterior, sección 3). **Eso cambió**: el backend corre un chequeo interno cada ~12
segundos y cierra solo los partidos vencidos, sin que nadie tenga que pedirlo. Esto también dispara
la rotación de la jornada si correspondía.

### 5.2. SSE — `GET /matches/:id/events` y `GET /match-sessions/:id/events`

Ambos son **públicos** (sin JWT), `Content-Type: text/event-stream`. Usalos con `EventSource`,
escuchando los eventos **nombrados** (no el genérico `message`):

```js
const es = new EventSource(`${API_URL}/match-sessions/${sessionId}/events`);

es.addEventListener('session.updated', (e) => {
  const { session, matches } = JSON.parse(e.data); // mismo shape que GET /match-sessions/:id
  // repintar todo con este estado, no hace falta mergear nada
});

es.addEventListener('error', (e) => {
  const { message } = JSON.parse(e.data); // ej: "Jornada no encontrada"
});
// 'ping' llega cada ~25s con data: {} — anti-timeout de proxies, se puede ignorar
```

| Evento | En qué endpoint | `data` |
|---|---|---|
| `match.updated` | `/matches/:id/events` | el `MatchDto` completo |
| `session.updated` | `/match-sessions/:id/events` | `{ session, matches }`, igual que `GET /match-sessions/:id` |
| `ping` | ambos | `{}` cada ~25s |
| `error` | ambos | `{ message }` — el id no existe; el stream corta después |

Al conectar ya llega un primer evento con el estado actual (no hace falta pedirlo con `GET` antes).
De ahí en más, cualquier cambio real (gol cargado o borrado, marcador ajustado, ronda finalizada o
creada —automática o a mano—, equipo agregado, jornada finalizada, o el cierre activo por tiempo de
5.1) empuja un evento nuevo solo. El polling que se recomendaba en el doc anterior (sección de
"flujo recomendado") ya no es necesario — dejalo nada más como respaldo si el navegador no
reconecta el `EventSource` solo (por defecto sí reconecta).

## Resumen para tipar (TS) — solo lo nuevo/cambiado de esta entrega

```ts
type SessionRotationMode = 'manual' | 'winner_stays';

interface CreateMatchSessionBody {
  name: string;
  date?: string;                      // ahora opcional
  rotationMode?: SessionRotationMode;  // nuevo, default 'manual'
  durationMinutes?: number;
  goalLimit?: number;
  teams: { name: string; playerIds: string[] }[]; // mínimo 2, SIN máximo
}
// POST /match-sessions -> ApiEnvelope<{ session: MatchSessionDto; currentMatch: MatchDto | null }>

interface AddSessionTeamBody { name: string; playerIds: string[] }
// POST /match-sessions/:id/teams -> ApiEnvelope<MatchSessionDto>

interface CreateSessionRoundBody {
  homeSessionTeamId: string;
  awaySessionTeamId: string;
  durationMinutes?: number; // independiente del de la jornada
  goalLimit?: number;       // independiente del de la jornada
}
// POST /match-sessions/:id/matches -> ApiEnvelope<MatchDto>

// MatchSessionDto — campos nuevos: rotationMode, queue?: string[]
// SessionTeamDto — campos nuevos: joinOrder: number, queuePosition: number | null

// GET /matches/:id/events         -> SSE público, evento 'match.updated' con MatchDto
// GET /match-sessions/:id/events  -> SSE público, evento 'session.updated' con { session, matches }
```
