import { MatchSession } from '../../domain/entities/match-session.entity';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';

export function withQueue(session: MatchSession) {
  if (session.rotationMode !== SessionRotationMode.WINNER_STAYS) {
    return session;
  }

  const queue = session.teams
    .filter((team) => team.queuePosition != null)
    .sort((a, b) => (a.queuePosition as number) - (b.queuePosition as number))
    .map((team) => team.id);

  return { ...session, queue };
}
