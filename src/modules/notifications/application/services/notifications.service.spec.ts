import { UserRepository } from '../../../users/domain/ports/user.repository';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationRepository } from '../../domain/ports/notification.repository';
import { NotificationEventsService } from './notification-events.service';
import { NotificationsService } from './notifications.service';

const context = {
  sessionId: 's1',
  sessionName: 'Pelada de sábado',
  playerId: 'p1',
  playerName: 'Messi',
  goals: 2,
  assists: 1,
  actorUserId: 'u-member',
};

function setup(overrides: Partial<Record<string, jest.Mock>> = {}) {
  const repository = {
    createMany: jest.fn((rows) =>
      Promise.resolve(rows.map((row, i) => ({ id: `n${i}`, ...row }))),
    ),
    resolve: jest.fn(() => Promise.resolve(['u-admin1'])),
    ...overrides,
  };
  const users = {
    findAdmins: jest.fn(() =>
      Promise.resolve([{ id: 'u-admin1' }, { id: 'u-admin2' }]),
    ),
    findByPlayerId: jest.fn<Promise<{ id: string } | null>, []>(() =>
      Promise.resolve({ id: 'u-member' }),
    ),
  };
  const events = { emit: jest.fn() };
  const service = new NotificationsService(
    repository as unknown as NotificationRepository,
    users as unknown as UserRepository,
    events as unknown as NotificationEventsService,
  );
  return { service, repository, users, events };
}

describe('NotificationsService', () => {
  it('carga del jugador: avisa a todos los admins y reemplaza el aviso anterior', async () => {
    const { service, repository, events } = setup();

    await service.manualStatsSubmitted(context);

    expect(repository.resolve).toHaveBeenCalledWith(
      NotificationType.MANUAL_STATS_SUBMITTED,
      's1',
      'p1',
    );
    const rows = repository.createMany.mock.calls[0][0];
    expect(rows.map((row) => row.userId)).toEqual(['u-admin1', 'u-admin2']);
    expect(rows[0]).toMatchObject({
      type: NotificationType.MANUAL_STATS_SUBMITTED,
      sessionId: 's1',
      playerId: 'p1',
      data: {
        sessionName: 'Pelada de sábado',
        playerName: 'Messi',
        goals: 2,
        assists: 1,
      },
    });
    // contador del admin cuyo aviso viejo se resolvió + las dos nuevas
    expect(events.emit).toHaveBeenCalledTimes(3);
  });

  it('un admin que carga sus propios números no se avisa a sí mismo', async () => {
    const { service, repository } = setup();

    await service.manualStatsSubmitted({ ...context, actorUserId: 'u-admin1' });

    const rows = repository.createMany.mock.calls[0][0];
    expect(rows.map((row) => row.userId)).toEqual(['u-admin2']);
  });

  it('aprobación: le llega al jugador y se resuelve el aviso de los admins', async () => {
    const { service, repository } = setup();

    await service.manualStatsApproved({ ...context, actorUserId: 'u-admin1' });

    expect(repository.resolve).toHaveBeenCalled();
    const rows = repository.createMany.mock.calls[0][0];
    expect(rows).toEqual([
      expect.objectContaining({
        userId: 'u-member',
        type: NotificationType.MANUAL_STATS_APPROVED,
      }),
    ]);
  });

  it('un invitado sin cuenta no recibe nada', async () => {
    const { service, repository, users } = setup();
    users.findByPlayerId.mockResolvedValueOnce(null);

    await service.manualStatsRejected({ ...context, actorUserId: 'u-admin1' });

    expect(repository.createMany).not.toHaveBeenCalled();
  });

  it('"No participé" solo resuelve el aviso, sin crear nada', async () => {
    const { service, repository } = setup();

    await service.manualStatsWithdrawn(context);

    expect(repository.resolve).toHaveBeenCalled();
    expect(repository.createMany).not.toHaveBeenCalled();
  });

  it('si falla la notificación no rompe la acción que la disparó', async () => {
    const { service } = setup({
      resolve: jest.fn(() => Promise.reject(new Error('db caída'))),
    });
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    await expect(
      service.manualStatsSubmitted(context),
    ).resolves.toBeUndefined();
  });
});
