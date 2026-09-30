import { ConflictError } from '../../../../shared/errors/domain-errors';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';

// En convocatoria cualquiera sale de la lista. Con la jornada empezada solo
// quien no está en ningún equipo y no jugó ninguna ronda (típico: marcó
// "Cheguei" por error).
export async function assertCanLeaveSession(
  session: MatchSession,
  playerId: string,
  matchRepository: MatchRepository,
  message: string,
): Promise<void> {
  if (session.status === MatchSessionStatus.CONVOCATORIA) return;

  const inTeam = session.teams.some((team) =>
    team.players.some((player) => player.playerId === playerId),
  );
  if (inTeam) throw new ConflictError(message);

  const matches = await matchRepository.findAllBySessionId(session.id);
  const playedRound = matches.some((match) =>
    match.participants.some((participant) => participant.playerId === playerId),
  );
  if (playedRound) throw new ConflictError(message);
}
