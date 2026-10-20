import { ConflictError } from '../../../../shared/errors/domain-errors';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { assertCanLoadManualStats } from './manual-stats-rules.helper';

const session = (status: MatchSessionStatus) =>
  ({ id: 's1', status }) as MatchSession;

describe('assertCanLoadManualStats', () => {
  it.each([MatchSessionStatus.CONVOCATORIA, MatchSessionStatus.EN_CURSO])(
    '%s: 409 (todavía puede tener rondas)',
    (status) => {
      expect(() => assertCanLoadManualStats(session(status))).toThrow(
        new ConflictError(
          'Las estadísticas se cargan cuando la jornada termina',
        ),
      );
    },
  );

  // Con rondas o sin rondas, y aunque el jugador haya jugado alguna: el
  // total aprobado reemplaza sus goles de las rondas en el ranking.
  it('finalizada: carga cualquiera', () => {
    expect(() =>
      assertCanLoadManualStats(session(MatchSessionStatus.FINALIZADA)),
    ).not.toThrow();
  });
});
