import {
  ConflictError,
  NotFoundError,
} from '../../../../shared/errors/domain-errors';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';

export async function findOpenConvocatoria(
  matchSessionRepository: MatchSessionRepository,
  sessionId: string,
): Promise<MatchSession> {
  const session = await matchSessionRepository.findById(sessionId);

  if (!session) {
    throw new NotFoundError('Jornada no encontrada');
  }

  if (session.status !== MatchSessionStatus.CONVOCATORIA) {
    throw new ConflictError('La convocatoria ya está cerrada');
  }

  return session;
}
