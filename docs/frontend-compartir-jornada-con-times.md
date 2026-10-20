# Compartir la jornada con los times y el banco (WhatsApp)

Cambio **solo del front**: el backend ya manda todo lo necesario en el `MatchSessionDto`
(`teams`, `attendees`, `queue`, `rotationMode`, `durationMinutes`, `goalLimit`, `goldenGoal`).

> Ya está aplicado en `futbol-frotend` (sin commitear) en los 2 archivos de abajo. Este doc sirve
> para revisarlo o aplicarlo en otra copia.

## Qué cambia

Hoy, con la jornada **en curso**, "Compartilhar" manda solo el nombre y el link. Ahora manda los
times armados y quién espera:

```
⚽ *Pelada de sábado*
📅 sábado, 24/10, 19:00
⏱️ 10 min · ⭐ gol de ouro

*Time A*
• Kervis
• João
• Pedro
• Lucas
• Mateus

*Time B*
• Tiago
• André
• Paulo
• Marcos
• Felipe

🪑 *Banco* (3)
• Davi
• Samuel
• Elias

Acompanhe o placar ao vivo:
https://…/sessions/…
```

Según el modo:

| `rotationMode` | Times | Quién espera |
|---|---|---|
| `bench_rotation` | los 2 times | `🪑 *Banco* (N)` con los attendees sin time |
| `winner_stays` | los que juegan con `· em campo`, los de `queue` con `· 1º na fila`, `· 2º na fila`… | — |
| `manual` | todos los times | `🪑 *Sem time* (N)` si hay attendees sin time |

- La línea de reglas sale solo con lo configurado: `⏱️ N min`, `🎯 N gols`, `⭐ gol de ouro`.
- Times sin jugadores (vaciados al reorganizar) no salen (`activeTeams()`).
- El banco sale en **orden de llegada** (el orden de `attendees`), no en el orden de entrada de la
  rotación (eso necesita las rondas; ver "Pendiente").
- **Convocatoria**: sin cambios (fecha, confirmados y link para confirmar).

Botón en la **compu** (sin share nativo): con la jornada en curso copia el **mensaje completo** (antes
solo el link, que al pegarlo en WhatsApp Web no mostraba los times) y muestra "Times copiados". En
convocatoria sigue copiando el link. En el **celular** abre el menú nativo con este texto, como antes.

## 1. `src/presentation/utils/format-session-share.ts`

Reemplazar el archivo por:

```ts
import { MatchSessionEntity } from '@/domain/match-sessions/entities/match-session.entity';
import { SessionTeamEntity } from '@/domain/match-sessions/entities/session-team.entity';

export const sessionShareUrl = (session: MatchSessionEntity) => `${window.location.origin}/sessions/${session.id}`;

const teamBlock = (team: SessionTeamEntity, label?: string): string[] => [
  `*${team.name.trim()}*${label ? ` · ${label}` : ''}`,
  ...team.players.map((player) => `• ${player.name}`),
];

/** Times armados y quién espera: en `winner_stays` la fila de times, si no el banco (orden de llegada). */
const lineupLines = (session: MatchSessionEntity): string[] => {
  const teams = session.activeTeams();
  if (teams.length === 0) return [];

  const blocks: string[][] = [];
  if (session.hasTeamQueue()) {
    const waiting = new Set(session.queue);
    teams.filter((team) => !waiting.has(team.id)).forEach((team) => blocks.push(teamBlock(team, 'em campo')));
    session.queue
      .map((id) => session.teamById(id))
      .filter((team): team is SessionTeamEntity => !!team && team.players.length > 0)
      .forEach((team, index) => blocks.push(teamBlock(team, `${index + 1}º na fila`)));
  } else {
    teams.forEach((team) => blocks.push(teamBlock(team)));
  }

  const bench = session.attendeesWithoutTeam();
  if (bench.length > 0) {
    blocks.push([
      `🪑 *${session.hasBenchRotation() ? 'Banco' : 'Sem time'}* (${bench.length})`,
      ...bench.map((attendee) => `• ${attendee.player.name}`),
    ]);
  }

  return blocks.flatMap((block) => ['', ...block]);
};

const rulesLine = (session: MatchSessionEntity): string | null => {
  const rules = [
    session.durationMinutes ? `⏱️ ${session.durationMinutes} min` : null,
    session.goalLimit ? `🎯 ${session.goalLimit} gols` : null,
    session.goldenGoal ? '⭐ gol de ouro' : null,
  ].filter(Boolean);
  return rules.length > 0 ? rules.join(' · ') : null;
};

export const formatSessionShareText = (session: MatchSessionEntity): string => {
  const when = session.date.toLocaleString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const url = sessionShareUrl(session);

  if (session.isOpenForAttendance()) {
    return [
      `⚽ *${session.name.trim()}*`,
      `📅 ${when}`,
      `✅ ${session.attendees.length} confirmados`,
      '',
      'Confirme sua presença:',
      url,
    ].join('\n');
  }

  const rules = rulesLine(session);
  return [
    `⚽ *${session.name.trim()}*`,
    `📅 ${when}`,
    ...(rules ? [rules] : []),
    ...lineupLines(session),
    '',
    'Acompanhe o placar ao vivo:',
    url,
  ].join('\n');
};
```

## 2. `src/presentation/components/match-sessions/share-session-button.tsx`

Dentro de `handleShare`, en el `try` del portapapeles:

```diff
     try {
-      await navigator.clipboard.writeText(sessionShareUrl(session));
+      // En curso se copia el mensaje con los times, para pegarlo en WhatsApp Web.
+      await navigator.clipboard.writeText(
+        session.isInProgress() ? formatSessionShareText(session) : sessionShareUrl(session),
+      );
       setCopied(true);
```

Y el texto del botón:

```diff
-      {copied ? 'Link copiado' : session.isOpenForAttendance() ? 'Convidar' : 'Compartilhar'}
+      {copied
+        ? session.isInProgress() ? 'Times copiados' : 'Link copiado'
+        : session.isOpenForAttendance() ? 'Convidar' : 'Compartilhar'}
```

## Verificado

- `tsc -b` y `eslint` del front sin errores.
- El ejemplo de arriba se generó con las entidades reales del front (`MatchSessionEntity`,
  `SessionTeamEntity`, `PlayerEntity`) en `bench_rotation` y `winner_stays`.

## Pendiente (opcional)

- **Banco en orden de entrada** (`bench_rotation`): pasarle al botón también las rondas
  (`MatchSessionDetail`) y ordenar con `benchOrder(rotationInput(detail))`, como el panel "Banco".
