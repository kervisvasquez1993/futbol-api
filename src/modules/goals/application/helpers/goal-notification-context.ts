import { GoalContext } from '../../../notifications/application/services/notifications.service';
import { Match } from '../../../matches/domain/entities/match.entity';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { Goal } from '../../domain/entities/goal.entity';

// Datos de la notificación de un gol, desde el punto de vista de quien lo
// cargó (`loaderPlayerId`): es asistencia si cargó el gol como asistente.
export async function goalNotificationContext(
  goal: Pick<Goal, 'scorerId' | 'assistId'>,
  match: Match,
  loaderPlayerId: string,
  actorUserId: string,
  matchRepository: MatchRepository,
): Promise<GoalContext> {
  const round = match.sessionId
    ? await matchRepository.findRoundInfo(match.id)
    : null;
  const player = match.participants.find(
    (participant) => participant.playerId === loaderPlayerId,
  )?.player;

  return {
    matchId: match.id,
    matchName: match.name,
    sessionId: match.sessionId,
    ...(round && {
      sessionName: round.sessionName,
      roundNumber: round.roundNumber,
    }),
    playerId: loaderPlayerId,
    playerName: player?.name ?? '',
    isAssist: goal.assistId === loaderPlayerId,
    actorUserId,
  };
}
