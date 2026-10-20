import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { SessionEventsService } from '../services/session-events.service';
import { RemoveSessionPlayerStatsUseCase } from './remove-session-player-stats.use-case';

describe('RemoveSessionPlayerStatsUseCase', () => {
  // Las jornadas trabadas por cargas hechas antes de terminar se destraban
  // borrándolas: el DELETE no valida el estado.
  it('en curso con carga existente: la borra', async () => {
    const session = {
      id: 's1',
      name: 'Jornada',
      status: MatchSessionStatus.EN_CURSO,
      manualStats: [
        { playerId: 'p1', goals: 2, assists: 1, player: { name: 'Ana' } },
      ],
      queue: [],
    } as unknown as MatchSession;
    const removePlayerStats = jest.fn(() => Promise.resolve());
    const manualStatsRejected = jest.fn();
    const matchSessionRepository = {
      findById: jest.fn(() => Promise.resolve(session)),
      removePlayerStats,
    } as unknown as MatchSessionRepository;
    const notificationsService = {
      manualStatsRejected,
      manualStatsWithdrawn: jest.fn(),
    } as unknown as NotificationsService;
    const useCase = new RemoveSessionPlayerStatsUseCase(
      matchSessionRepository,
      { emit: jest.fn() } as unknown as SessionEventsService,
      notificationsService,
    );

    await useCase.execute('s1', 'p1', { userId: 'u1', byAdmin: true });

    expect(removePlayerStats).toHaveBeenCalledWith('s1', 'p1');
    expect(manualStatsRejected).toHaveBeenCalled();
  });
});
