import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { SessionTeam } from '../../domain/entities/session-team.entity';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { SessionRoundFactory } from '../services/session-round.factory';
import { AdvanceMatchSessionUseCase } from './advance-match-session.use-case';

const team = (id: string, queuePosition: number | null) =>
  ({
    id,
    name: id,
    queuePosition,
    players: [{ playerId: `${id}1` }],
  }) as SessionTeam;

function setup(teams: SessionTeam[]) {
  const session = {
    id: 's1',
    status: MatchSessionStatus.EN_CURSO,
    rotationMode: SessionRotationMode.WINNER_STAYS,
    durationMinutes: null,
    goalLimit: null,
    teams,
  } as unknown as MatchSession;
  const lastMatch = {
    status: MatchStatus.FINALIZADO,
    homeScore: 2,
    awayScore: 0,
    homeSessionTeamId: 'A',
    awaySessionTeamId: 'B',
  };
  const createRound = jest.fn();
  const useCase = new AdvanceMatchSessionUseCase(
    {
      findById: () => Promise.resolve(session),
      updateTeamQueuePosition: () => Promise.resolve(),
    } as unknown as MatchSessionRepository,
    {
      findAllBySessionId: () => Promise.resolve([lastMatch]),
    } as unknown as MatchRepository,
    { createRound } as unknown as SessionRoundFactory,
  );
  return { useCase, createRound, teams };
}

describe('AdvanceMatchSessionUseCase — refuerzos', () => {
  it('con 3 equipos el que perdió presta jugadores al que entra', async () => {
    const [A, B, C] = [team('A', null), team('B', null), team('C', 0)];
    const { useCase, createRound } = setup([A, B, C]);

    await useCase.execute('s1');

    const [, home, away, , , donor] = createRound.mock.calls[0];
    expect(home.id).toBe('A');
    expect(away.id).toBe('C');
    expect(donor.id).toBe('B');
  });

  it('con 2 equipos (revancha) no hay refuerzos', async () => {
    const [A, B] = [team('A', null), team('B', null)];
    const { useCase, createRound } = setup([A, B]);

    await useCase.execute('s1');

    const [, home, away, , , donor] = createRound.mock.calls[0];
    expect(home.id).toBe('A');
    expect(away.id).toBe('B');
    expect(donor).toBeNull();
  });
});
