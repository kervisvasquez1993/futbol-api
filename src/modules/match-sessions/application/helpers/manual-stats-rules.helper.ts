import { ConflictError } from '../../../../shared/errors/domain-errors';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';

// La carga manual (total de la jornada) solo se hace con la jornada
// finalizada: antes todavía puede tener rondas y la carga la trabaría. Vale
// también para quien jugó rondas: si se aprueba, reemplaza sus goles de las
// rondas en el ranking (no se suman).
export function assertCanLoadManualStats(session: MatchSession): void {
  if (session.status !== MatchSessionStatus.FINALIZADA) {
    throw new ConflictError(
      'Las estadísticas se cargan cuando la jornada termina',
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
