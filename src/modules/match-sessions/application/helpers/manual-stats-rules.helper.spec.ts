import { ConflictError } from '../../../../shared/errors/domain-errors';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { assertCanLoadManualStats } from './manual-stats-rules.helper';

const session = (flags: Partial<MatchSession>) =>
  ({
    id: 's1',
    status: MatchSessionStatus.FINALIZADA,
    ...flags,
  }) as MatchSession;

const matchRepository = {
  findAllBySessionId: jest.fn(() =>
    Promise.resolve([{ participants: [{ playerId: 'played' }] }]),
  ),
} as unknown as MatchRepository;

describe('assertCanLoadManualStats', () => {
  it.each([MatchSessionStatus.CONVOCATORIA, MatchSessionStatus.EN_CURSO])(
    '%s sin rondas: 409 (todavía puede tener rondas)',
    async (status) => {
      await expect(
        assertCanLoadManualStats(
          session({
            status,
            allowsManualStats: false,
            allowsLateManualStats: false,
          }),
          'late',
          matchRepository,
          false,
        ),
      ).rejects.toThrow(
        new ConflictError(
          'Las estadísticas se cargan cuando la jornada termina',
        ),
      );
    },
  );

  it('en curso con rondas: 409', async () => {
    await expect(
      assertCanLoadManualStats(
        session({
          status: MatchSessionStatus.EN_CURSO,
          allowsManualStats: false,
          allowsLateManualStats: false,
        }),
        'late',
        matchRepository,
        true,
      ),
    ).rejects.toThrow('Las estadísticas se cargan cuando la jornada termina');
  });

  it('finalizada sin rondas: carga cualquiera', async () => {
    await expect(
      assertCanLoadManualStats(
        session({ allowsManualStats: true, allowsLateManualStats: false }),
        'played',
        matchRepository,
        false,
      ),
    ).resolves.toBeUndefined();
  });

  it('finalizada con rondas: carga quien no jugó ninguna', async () => {
    await expect(
      assertCanLoadManualStats(
        session({ allowsManualStats: false, allowsLateManualStats: true }),
        'late',
        matchRepository,
        false,
      ),
    ).resolves.toBeUndefined();
  });

  it('finalizada con rondas: 409 a quien jugó alguna (mensaje del jugador)', async () => {
    await expect(
      assertCanLoadManualStats(
        session({ allowsManualStats: false, allowsLateManualStats: true }),
        'played',
        matchRepository,
        false,
      ),
    ).rejects.toThrow(
      new ConflictError(
        'Ya jugaste rondas en esta jornada: carga tus goles en cada ronda',
      ),
    );
  });

  it('finalizada con rondas: 409 a quien jugó alguna (mensaje del admin)', async () => {
    await expect(
      assertCanLoadManualStats(
        session({ allowsManualStats: false, allowsLateManualStats: true }),
        'played',
        matchRepository,
        true,
      ),
    ).rejects.toThrow(
      'Este jugador jugó rondas en esta jornada: sus goles se cargan en cada ronda',
    );
  });
});
