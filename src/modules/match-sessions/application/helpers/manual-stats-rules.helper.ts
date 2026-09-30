import { ConflictError } from '../../../../shared/errors/domain-errors';
import { MatchSession } from '../../domain/entities/match-session.entity';

// Una jornada nunca tiene las dos fuentes de estadísticas a la vez: o goles
// por ronda, o carga manual.
export function assertAllowsManualStats(session: MatchSession): void {
  if (!session.allowsManualStats) {
    throw new ConflictError(
      'Esta jornada tiene rodadas registradas: los gols se cargan en cada rodada',
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
