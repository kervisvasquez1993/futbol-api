import { ConflictError } from '../../../../shared/errors/domain-errors';
import { MatchSessionRepository } from '../../../match-sessions/domain/ports/match-session.repository';
import { Match } from '../../domain/entities/match.entity';

// Quien cargó sus números a mano en la jornada no puede además jugar una de
// sus rondas: se contaría dos veces.
export async function assertHasNoManualStatsInSession(
  match: Match,
  playerId: string,
  matchSessionRepository: MatchSessionRepository,
): Promise<void> {
  if (!match.sessionId) return;

  if (await matchSessionRepository.hasPlayerStats(match.sessionId, playerId)) {
    throw new ConflictError(
      'Este jugador tiene estadísticas cargadas a mano en la jornada: bórralas antes de sumarlo a una ronda',
    );
  }
}
