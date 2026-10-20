import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { UserRole } from '../../../../shared/enums/user-role.enum';
import { MatchLifecycleService } from '../../../matches/application/services/match-lifecycle.service';
import { Match } from '../../../matches/domain/entities/match.entity';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { MatchTeamSide } from '../../../matches/domain/enums/match-team-side.enum';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { UserRepository } from '../../../users/domain/ports/user.repository';
import { Goal } from '../../domain/entities/goal.entity';
import { GoalStatus } from '../../domain/enums/goal-status.enum';
import { GoalRepository } from '../../domain/ports/goal.repository';
import { AddGoalUseCase } from './add-goal.use-case';
import { ApproveGoalUseCase } from './approve-goal.use-case';
import { DeleteGoalUseCase } from './delete-goal.use-case';

const admin = {
  id: 'u-admin',
  role: UserRole.ADMIN,
  playerId: null,
} as CurrentUserPayload;
const member = {
  id: 'u-member',
  role: UserRole.MEMBER,
  playerId: 'p1',
} as CurrentUserPayload;

const buildMatch = (status: MatchStatus) =>
  ({
    id: 'm1',
    name: 'Pelada de sábado',
    status,
    sessionId: 's1',
    homeScore: 2,
    awayScore: 0,
    participants: [
      { playerId: 'p1', team: MatchTeamSide.HOME, player: { name: 'Messi' } },
      { playerId: 'p2', team: MatchTeamSide.HOME, player: { name: 'Neymar' } },
    ],
  }) as unknown as Match;

function setup(match: Match, existingGoal?: Partial<Goal>) {
  const goalRepository = {
    create: jest.fn((data: Partial<Goal>) =>
      Promise.resolve({ id: 'g1', ...data }),
    ),
    findById: jest.fn(() =>
      Promise.resolve(existingGoal ? { id: 'g1', ...existingGoal } : null),
    ),
    findByMatchId: jest.fn(() => Promise.resolve([])),
    save: jest.fn((goal: Goal) => Promise.resolve(goal)),
    delete: jest.fn(() => Promise.resolve()),
  };
  const matchRepository = {
    findById: jest.fn(() => Promise.resolve(match)),
    findRoundInfo: jest.fn(() =>
      Promise.resolve({ sessionName: 'Pelada de sábado', roundNumber: 2 }),
    ),
    adjustScore: jest.fn(() => Promise.resolve(match)),
  };
  const lifecycle = {
    checkCriteria: jest.fn((checked: Match) => Promise.resolve(checked)),
    notifyChanged: jest.fn(),
  };
  const notifications = {
    goalSubmitted: jest.fn(() => Promise.resolve()),
    goalApproved: jest.fn(() => Promise.resolve()),
    goalRejected: jest.fn(() => Promise.resolve()),
  };
  const userRepository = {
    findById: jest.fn(() =>
      Promise.resolve({ id: 'u-member', playerId: 'p1' }),
    ),
  };

  const deps = [
    goalRepository as unknown as GoalRepository,
    matchRepository as unknown as MatchRepository,
    lifecycle as unknown as MatchLifecycleService,
  ] as const;
  return {
    add: new AddGoalUseCase(
      ...deps,
      notifications as unknown as NotificationsService,
    ),
    approve: new ApproveGoalUseCase(
      ...deps,
      userRepository as unknown as UserRepository,
      notifications as unknown as NotificationsService,
    ),
    remove: new DeleteGoalUseCase(
      ...deps,
      userRepository as unknown as UserRepository,
      notifications as unknown as NotificationsService,
    ),
    goalRepository,
    notifications,
  };
}

describe('Goles con aprobación', () => {
  it('member con el partido terminado: queda pendiente y avisa a los admins', async () => {
    const { add, goalRepository, notifications } = setup(
      buildMatch(MatchStatus.FINALIZADO),
    );

    await add.execute(
      'm1',
      { scorerId: 'p2', assistId: 'p1', addToScore: false },
      member,
    );

    expect(goalRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: GoalStatus.PENDIENTE,
        createdByUserId: 'u-member',
      }),
    );
    expect(notifications.goalSubmitted).toHaveBeenCalledWith({
      matchId: 'm1',
      matchName: 'Pelada de sábado',
      sessionId: 's1',
      sessionName: 'Pelada de sábado',
      roundNumber: 2,
      playerId: 'p1',
      playerName: 'Messi',
      isAssist: true,
      actorUserId: 'u-member',
    });
  });

  it('member con el partido en curso: aprobado, sin aviso', async () => {
    const { add, goalRepository, notifications } = setup(
      buildMatch(MatchStatus.EN_CURSO),
    );

    await add.execute('m1', { scorerId: 'p1' }, member);

    expect(goalRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: GoalStatus.APROBADO }),
    );
    expect(notifications.goalSubmitted).not.toHaveBeenCalled();
  });

  it('admin con el partido terminado: aprobado, sin aviso', async () => {
    const { add, goalRepository, notifications } = setup(
      buildMatch(MatchStatus.FINALIZADO),
    );

    await add.execute('m1', { scorerId: 'p1', addToScore: false }, admin);

    expect(goalRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: GoalStatus.APROBADO,
        createdByUserId: 'u-admin',
      }),
    );
    expect(notifications.goalSubmitted).not.toHaveBeenCalled();
  });

  it('aprobar: pasa a aprobado y avisa a quien lo cargó', async () => {
    const { approve, goalRepository, notifications } = setup(
      buildMatch(MatchStatus.FINALIZADO),
      {
        matchId: 'm1',
        scorerId: 'p1',
        assistId: null,
        status: GoalStatus.PENDIENTE,
        createdByUserId: 'u-member',
      },
    );

    const result = await approve.execute('g1', admin);

    expect(result.status).toBe(GoalStatus.APROBADO);
    expect(goalRepository.save).toHaveBeenCalled();
    expect(notifications.goalApproved).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: 'p1', isAssist: false }),
      'u-member',
    );
  });

  it('aprobar uno ya aprobado: no cambia nada', async () => {
    const { approve, goalRepository, notifications } = setup(
      buildMatch(MatchStatus.FINALIZADO),
      { matchId: 'm1', scorerId: 'p1', status: GoalStatus.APROBADO },
    );

    await approve.execute('g1', admin);

    expect(goalRepository.save).not.toHaveBeenCalled();
    expect(notifications.goalApproved).not.toHaveBeenCalled();
  });

  it('admin borra un pendiente de otro: rechazo a quien lo cargó', async () => {
    const { remove, notifications } = setup(
      buildMatch(MatchStatus.FINALIZADO),
      {
        matchId: 'm1',
        scorerId: 'p1',
        assistId: null,
        status: GoalStatus.PENDIENTE,
        createdByUserId: 'u-member',
      },
    );

    await remove.execute('g1', admin);

    expect(notifications.goalRejected).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: 'p1', actorUserId: 'u-admin' }),
      'u-member',
    );
  });

  it('el member borra su propio pendiente: sin rechazo', async () => {
    const { remove, notifications } = setup(
      buildMatch(MatchStatus.FINALIZADO),
      {
        matchId: 'm1',
        scorerId: 'p1',
        status: GoalStatus.PENDIENTE,
        createdByUserId: 'u-member',
      },
    );

    await remove.execute('g1', member);

    expect(notifications.goalRejected).not.toHaveBeenCalled();
  });
});
