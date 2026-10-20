import { Match } from '../../domain/entities/match.entity';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { MatchRepository } from '../../domain/ports/match.repository';
import { MatchEventsService } from './match-events.service';
import { MatchLifecycleService } from './match-lifecycle.service';
import { AdvanceMatchSessionUseCase } from '../../../match-sessions/application/use-cases/advance-match-session.use-case';
import { SessionEventsService } from '../../../match-sessions/application/services/session-events.service';

// Arrancó hace 11 minutos y dura 10: el tiempo ya venció.
const expiredMatch = (overrides: Partial<Match>) =>
  ({
    id: 'm1',
    status: MatchStatus.EN_CURSO,
    sessionId: null,
    durationMinutes: 10,
    goalLimit: null,
    startedAt: new Date(Date.now() - 11 * 60_000),
    pausedAt: null,
    pausedSeconds: 0,
    goldenGoal: true,
    homeScore: 1,
    awayScore: 1,
    ...overrides,
  }) as Match;

function setup() {
  const save = jest.fn((match: Match) => Promise.resolve(match));
  const service = new MatchLifecycleService(
    { save } as unknown as MatchRepository,
    { emit: jest.fn() } as unknown as MatchEventsService,
    { execute: jest.fn() } as unknown as AdvanceMatchSessionUseCase,
    { emit: jest.fn() } as unknown as SessionEventsService,
  );
  return { service };
}

describe('MatchLifecycleService — gol de ouro', () => {
  it('tiempo vencido y empatados: sigue en juego', async () => {
    const { service } = setup();
    const result = await service.checkCriteria(expiredMatch({}));
    expect(result.status).toBe(MatchStatus.EN_CURSO);
  });

  it('entra el gol de ouro (deja de estar empatado): se cierra', async () => {
    const { service } = setup();
    const result = await service.checkCriteria(
      expiredMatch({ homeScore: 2, awayScore: 1 }),
    );
    expect(result.status).toBe(MatchStatus.FINALIZADO);
  });

  it('sin gol de ouro, empatados con el tiempo vencido: se cierra', async () => {
    const { service } = setup();
    const result = await service.checkCriteria(
      expiredMatch({ goldenGoal: false }),
    );
    expect(result.status).toBe(MatchStatus.FINALIZADO);
  });

  it('el límite de goles cierra igual', async () => {
    const { service } = setup();
    const result = await service.checkCriteria(
      expiredMatch({
        startedAt: new Date(),
        goalLimit: 3,
        homeScore: 3,
        awayScore: 0,
      }),
    );
    expect(result.status).toBe(MatchStatus.FINALIZADO);
  });

  it('empatados con tiempo por jugar: sigue (como siempre)', async () => {
    const { service } = setup();
    const result = await service.checkCriteria(
      expiredMatch({ startedAt: new Date(), goldenGoal: false }),
    );
    expect(result.status).toBe(MatchStatus.EN_CURSO);
  });
});
