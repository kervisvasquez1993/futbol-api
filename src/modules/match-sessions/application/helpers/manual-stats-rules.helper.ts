import { ConflictError } from '../../../../shared/errors/domain-errors';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';

// Un jugador nunca tiene las dos fuentes de estadísticas en una jornada: o
// goles por ronda, o carga manual. Sin rondas carga cualquiera; en una jornada
// finalizada con rondas, solo quien no jugó ninguna ("Estive lá").
export async function assertCanLoadManualStats(
  session: MatchSession,
  playerId: string,
  matchRepository: MatchRepository,
  byAdmin: boolean,
): Promise<void> {
  if (session.allowsManualStats) return;

  if (!session.allowsLateManualStats) {
    throw new ConflictError(
      'Esta jornada tiene rodadas registradas: los gols se cargan en cada rodada',
    );
  }

  const matches = await matchRepository.findAllBySessionId(session.id);
  const playedRound = matches.some((match) =>
    match.participants.some((participant) => participant.playerId === playerId),
  );

  if (playedRound) {
    throw new ConflictError(
      byAdmin
        ? 'Este jugador jugó rondas en esta jornada: sus goles se cargan en cada ronda'
        : 'Ya jugaste rondas en esta jornada: carga tus goles en cada ronda',
    );
  }
}

export function assertHasNoManualStats(session: MatchSession): void {
  if (session.manualStats.length > 0) {
    throw new ConflictError(
      'Esta jornada tiene estadísticas cargadas a mano: bórralas antes de crear rodadas',
    );
  }
}
