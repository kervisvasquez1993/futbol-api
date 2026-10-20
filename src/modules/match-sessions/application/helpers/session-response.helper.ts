import { MatchSession } from '../../domain/entities/match-session.entity';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';

export function withQueue(session: MatchSession) {
  // Con banco la rotación es por jugador: no hay fila de equipos.
  if (session.rotationMode === SessionRotationMode.BENCH_ROTATION) {
    return { ...session, queue: [] };
  }

  if (session.rotationMode !== SessionRotationMode.WINNER_STAYS) {
    return session;
  }

  const queue = session.teams
    .filter((team) => team.queuePosition != null)
    .sort((a, b) => (a.queuePosition as number) - (b.queuePosition as number))
    .map((team) => team.id);

  return { ...session, queue };
}
