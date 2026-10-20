import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import {
  ConflictError,
  ForbiddenError,
} from '../../../../shared/errors/domain-errors';
import { UserRole } from '../../../../shared/enums/user-role.enum';
import { Match } from '../../domain/entities/match.entity';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { MatchRepository } from '../../domain/ports/match.repository';
import { MatchLifecycleService } from '../services/match-lifecycle.service';
import { SetMatchClockUseCase } from './set-match-clock.use-case';

const NOW = new Date('2026-10-20T12:00:00Z');
const secondsAgo = (seconds: number) =>
  new Date(NOW.getTime() - seconds * 1000);

const admin = { role: UserRole.ADMIN } as CurrentUserPayload;

function setup(overrides: Partial<Match> = {}) {
  const match = {
    id: 'm1',
    status: MatchStatus.EN_CURSO,
    durationMinutes: 10,
    goalLimit: null,
    startedAt: null,
    pausedAt: null,
    pausedSeconds: 0,
    participants: [{ playerId: 'p1' }],
    ...overrides,
  } as Match;
  const save = jest.fn((saved: Match) => Promise.resolve(saved));
  const notifyChanged = jest.fn();
  const useCase = new SetMatchClockUseCase(
    {
      findById: jest.fn(() => Promise.resolve(match)),
      save,
    } as unknown as MatchRepository,
    {
      checkCriteria: jest.fn((checked: Match) => Promise.resolve(checked)),
      notifyChanged,
    } as unknown as MatchLifecycleService,
  );
  return { useCase, match, save, notifyChanged };
}

describe('SetMatchClockUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('start arranca el reloj y reemplaza los criterios', async () => {
    const { useCase, notifyChanged } = setup({ durationMinutes: null });

    const result = await useCase.execute(
      'm1',
      { action: 'start', durationMinutes: 8, goalLimit: 3 },
      admin,
    );

    expect(result).toMatchObject({
      startedAt: NOW,
      pausedAt: null,
      pausedSeconds: 0,
      durationMinutes: 8,
      goalLimit: 3,
    });
    expect(notifyChanged).toHaveBeenCalled();
  });

  it('start de nuevo reinicia el reloj (y quita la pausa)', async () => {
    const { useCase } = setup({
      startedAt: secondsAgo(500),
      pausedAt: secondsAgo(60),
      pausedSeconds: 40,
    });

    const result = await useCase.execute('m1', { action: 'start' }, admin);

    expect(result).toMatchObject({
      startedAt: NOW,
      pausedAt: null,
      pausedSeconds: 0,
      durationMinutes: 10,
    });
  });

  it('pause congela el reloj; pausar de nuevo no cambia nada', async () => {
    const { useCase, match } = setup({ startedAt: secondsAgo(100) });

    await useCase.execute('m1', { action: 'pause' }, admin);
    expect(match.pausedAt).toEqual(NOW);

    jest.setSystemTime(new Date(NOW.getTime() + 30_000));
    await useCase.execute('m1', { action: 'pause' }, admin);
    expect(match.pausedAt).toEqual(NOW);
  });

  it('resume suma la pausa; retomar de nuevo no cambia nada', async () => {
    const { useCase, match } = setup({
      startedAt: secondsAgo(300),
      pausedAt: secondsAgo(45),
      pausedSeconds: 10,
    });

    await useCase.execute('m1', { action: 'resume' }, admin);
    expect(match).toMatchObject({ pausedAt: null, pausedSeconds: 55 });

    await useCase.execute('m1', { action: 'resume' }, admin);
    expect(match).toMatchObject({ pausedAt: null, pausedSeconds: 55 });
  });

  it('pause/resume sin arrancar: 409', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute('m1', { action: 'pause' }, admin),
    ).rejects.toThrow(new ConflictError('El reloj todavía no arrancó'));
  });

  it('partido finalizado: 409', async () => {
    const { useCase } = setup({ status: MatchStatus.FINALIZADO });

    await expect(
      useCase.execute('m1', { action: 'start' }, admin),
    ).rejects.toThrow(new ConflictError('El partido ya está finalizado'));
  });

  it('member que no juega el partido: 403', async () => {
    const { useCase } = setup();
    const outsider = {
      role: UserRole.MEMBER,
      playerId: 'p2',
    } as CurrentUserPayload;

    await expect(
      useCase.execute('m1', { action: 'start' }, outsider),
    ).rejects.toThrow(
      new ForbiddenError('Solo quien juega el partido puede manejar el reloj'),
    );
  });
});
