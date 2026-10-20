# Convidados: renombrar, unir repetidos y reusar

## Por qué

Antes cada vez que venía un convidado se creaba un jugador nuevo, aunque ya existiera: hay muchos
"Pedro", "Pedro", "pedro"… cada uno con una parte de sus goles. Ahora que `GET /players/guests` los
lista a todos, aparecen juntos.

Tres cosas, todas para el **admin**:

1. **Renombrar** a un jugador (ya existía en el backend; falta el botón).
2. **Unir** un convidado repetido con el que queda: el historial pasa al que queda y el repetido se
   borra. **Esto es lo que limpia los repetidos.**
3. **Reusar** un convidado al sumarlo a la jornada (`{ playerId }`): así no se crean más repetidos.
   El front ya lo manda; antes daba `400`, ahora funciona.

Todo sigue envuelto en `{ success, data }` / `{ success: false, message, errors? }`.

> Requiere reiniciar el backend. No hay migración nueva.

---

## 1. Renombrar — `PATCH /players/:id` (ya existía)

```json
{ "name": "Pedro Henrique" }
```

- Admin edita a cualquier jugador (convidados incluidos); un member solo a sí mismo.
- Responde el `PlayerDto` actualizado.
- Errores: `400` (nombre vacío), `403 "No podés editar el perfil de otro jugador"`, `404 "Jugador no encontrado"`.
- El front ya tiene `useUpdatePlayerMutation(playerId)`. Al terminar, invalidar también
  `['match-sessions']` y `['players', 'guests']` (hoy invalida `['players']` y `['leaderboard']`).

## 2. Unir un repetido — NUEVO `POST /players/:id/merge` (admin)

`:id` es el **repetido** (se borra). El body dice con quién se une (el que **queda**):

```json
{ "intoPlayerId": "uuid-del-que-queda" }
```

- `:id` tiene que ser un **convidado sin cuenta**. El que queda puede ser otro convidado o un jugador
  registrado (útil si "Pedro" convidado en realidad es el Pedro que después se registró).
- Responde `201` con el `PlayerDto` del que queda.

Qué pasa con el historial (todo en una transacción, o se une todo o no cambia nada):

| Del repetido | Pasa al que queda | Si los dos ya estaban ahí |
|---|---|---|
| Goles y asistencias | sí | un gol entre los dos (uno goleador y el otro asistente) queda sin asistencia |
| Rondas jugadas | sí | queda una sola vez en la ronda |
| Equipos de la jornada | sí | queda en el equipo donde ya estaba el que queda |
| Asistencia a jornadas | sí | una sola, con la llegada más temprana; activo si alguno lo estaba |
| Total de la jornada ("Participei") | sí | el **mayor** de cada uno (no se suman: es la misma persona); `pendiente` si alguno lo estaba |
| Notificaciones | sí | — |

El ranking y los perfiles se recalculan solos.

Errores:

| Código | Cuándo | `message` |
|---|---|---|
| `400` | `intoPlayerId` falta o no es un uuid | en `errors` |
| `400` | `:id` igual a `intoPlayerId` | `"No se puede unir un jugador consigo mismo"` |
| `400` | `:id` es un jugador registrado o un convidado ya reclamado | `"Solo se puede unir un convidado"` |
| `403` | no es admin | `"Esta acción requiere permisos de administrador"` |
| `404` | `:id` no existe | `"Jugador no encontrado"` |
| `404` | `intoPlayerId` no existe | `"Jugador destino no encontrado"` |

Al terminar, invalidar: `['players']` (incluye `['players', 'guests']`), `['match-sessions']` y
`['leaderboard']`. No llega SSE: las otras pantallas lo ven al refrescar.

## 3. Reusar un convidado — `POST /match-sessions/:id/guests`

El body ahora es `{ "name": "..." }` **o** `{ "playerId": "..." }` (el front ya manda los dos tipos,
`AddSessionGuestPayload`):

- Con `playerId`: tiene que ser un convidado sin cuenta. Si ya estaba en la jornada responde `200` sin
  cambios; si se había retirado (`bench_rotation`), vuelve.
- Con `name`: igual que antes, crea uno nuevo.
- Errores nuevos: `400 "Indique el nombre o el convidado"` (los dos o ninguno),
  `404 "Jugador no encontrado"`, `400 "Ese jugador no es un convidado"`.

---

## Front: qué armar

Siguiendo las capas de siempre (action → repository → use case → mutation).

### Action

`src/infrastructure/actions/players/merge-player.action.ts`

```ts
import { authApi } from '@/infrastructure/api/api';
import { type ApiResponse } from '@/infrastructure/interfaces/api-response.interface';
import { type PlayerResponse } from '@/infrastructure/interfaces/players/player.interface';

export const mergePlayerAction = async (id: string, intoPlayerId: string): Promise<PlayerResponse> => {
  const response = await authApi.post<ApiResponse<PlayerResponse>>(`/players/${id}/merge`, { intoPlayerId });
  return response.data;
};
```

### Repository

En `IPlayerRepository` y `player.repository.impl.ts`:

```ts
async merge(id: string, intoPlayerId: string): Promise<PlayerEntity> {
  try {
    return PlayerMapper.toEntity(await mergePlayerAction(id, intoPlayerId));
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 400) throw new InvalidPlayerDataError(translatedBackendMessage(error));
    if (status === 403) throw new PlayerEditForbiddenError();
    if (status === 404) throw new PlayerNotFoundError();
    throw error;
  }
}
```

### Use case y mutation

```ts
// src/aplication/use-cases/players/merge-player.use-case.ts
export const mergePlayerUseCase = (id: string, intoPlayerId: string) => playerRepository.merge(id, intoPlayerId);

// src/aplication/services/mutation/players/use-merge-player.mutation.ts
export const useMergePlayerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, intoPlayerId }: { id: string; intoPlayerId: string }) => mergePlayerUseCase(id, intoPlayerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['match-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
};
```

### UI (solo admin, en la jornada)

**En cada jugador de "Quem vai"** (`session-attendance-panel.tsx`) y de la lista de convidados del
**Editar times** (`session-teams-editor.tsx` / `session-teams-builder.tsx`): un botón lápiz que abre un
diálogo con:

- **Nome**: input con el nombre actual → `PATCH /players/:id`.
- **Unir com…** (solo si `player.isGuest`): lista de jugadores para elegir con quién se une.
  - Arriba, los **parecidos**: mismo nombre normalizado (sin acentos ni mayúsculas, con el `normalize`
    que ya usa `AddGuestForm`), sacando al propio jugador. Fuente: `useAvailableGuestsQuery()` +
    jugadores registrados (`usePlayersQuery` o lo que ya usa el editor de times).
  - Abajo, un buscador por nombre para el resto.
  - Confirmación: *"Unir 'Pedro' com 'Pedro'? Os gols, rodadas e jornadas passam para o que fica e o
    repetido é apagado. Não dá para desfazer."*
  - Mostrar el `message` del backend si responde error.

**Limpieza rápida de los repetidos que ya existen** (recomendado, por la cantidad acumulada): en
"Editar times", un aviso cuando en la lista de convidados hay nombres repetidos:

> ⚠️ 5 convidados repetidos · **Revisar**

Que abra una lista agrupada por nombre normalizado. En cada grupo, el admin elige cuál queda y
"Unir" llama a `POST /players/:id/merge` por cada uno de los otros (uno detrás de otro, no en
paralelo). Sugerencia de cuál dejar por defecto: el registrado si hay uno; si no, el convidado más
viejo (`createdAt`).

```ts
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const duplicateGroups = (players: PlayerEntity[]) =>
  [...Map.groupBy(players, (p) => normalize(p.name)).values()].filter((group) => group.length > 1);
```

(Si `Map.groupBy` no está en el target de TS, armarlo con un `reduce`.)

---

## Para encontrar los repetidos en producción (referencia)

```sql
SELECT lower(trim(name)) AS nombre, COUNT(*) AS repetidos, array_agg(id ORDER BY created_at) AS ids
FROM players p
WHERE is_guest = true
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.player_id = p.id)
GROUP BY lower(trim(name))
HAVING COUNT(*) > 1
ORDER BY repetidos DESC;
```

## Verificado en el backend

- Tests unitarios de la unión y del reuso (69 en total, todos pasan).
- Unión probada contra una base real con dos "Pedro" que coinciden en todo (misma jornada, equipo,
  ronda, un gol entre ellos, total de la jornada en los dos) y otras jornadas donde solo estaba el
  repetido: no quedan filas del repetido, nada se duplica y las estadísticas del que queda suman lo de
  los dos.
