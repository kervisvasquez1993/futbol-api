import { Match } from '../../domain/entities/match.entity';

type MatchClock = Pick<
  Match,
  'startedAt' | 'pausedAt' | 'pausedSeconds' | 'durationMinutes'
>;

// Tiempo jugado sin contar las pausas. Pausado se congela en `pausedAt`.
export function playedMs(match: MatchClock, now: Date): number {
  if (!match.startedAt) return 0;
  const until = match.pausedAt ?? now;
  return (
    until.getTime() - match.startedAt.getTime() - match.pausedSeconds * 1000
  );
}

// Sin arrancar o pausado no vence nunca.
export function isTimeExpired(match: MatchClock, now: Date): boolean {
  return (
    match.durationMinutes != null &&
    match.startedAt != null &&
    match.pausedAt == null &&
    playedMs(match, now) >= match.durationMinutes * 60_000
  );
}
