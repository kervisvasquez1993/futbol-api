import { Match } from '../../../matches/domain/entities/match.entity';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { MatchTeamSide } from '../../../matches/domain/enums/match-team-side.enum';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { SessionTeam } from '../../domain/entities/session-team.entity';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { SessionRoundFactory } from '../services/session-round.factory';
import { AdvanceMatchSessionUseCase } from './advance-match-session.use-case';

const ids = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);

const team = (id: string, playerIds: string[]) =>
  ({
    id,
    name: `Time ${id}`,
    queuePosition: null,
    players: playerIds.map((playerId) => ({ playerId })),
  }) as SessionTeam;

const round = (
  home: string[],
  away: string[],
  homeScore: number,
  awayScore: number,
) =>
  ({
    status: MatchStatus.FINALIZADO,
    homeScore,
    awayScore,
    homeSessionTeamId: 'A',
    awaySessionTeamId: 'B',
    participants: [
      ...home.map((playerId) => ({ playerId, team: MatchTeamSide.HOME })),
      ...away.map((playerId) => ({ playerId, team: MatchTeamSide.AWAY })),
    ],
  }) as unknown as Match;

function setup(matches: Match[], retired: string[] = []) {
  // 13 jugadores, 5 por equipo; c1..c3 en el banco.
  const session = {
    id: 's1',
    status: MatchSessionStatus.EN_CURSO,
    rotationMode: SessionRotationMode.BENCH_ROTATION,
    durationMinutes: 8,
    goalLimit: null,
    playersPerTeam: 5,
    teams: [team('A', ids('a', 5)), team('B', ids('b', 5))],
    attendees: [...ids('a', 5), ...ids('b', 5), ...ids('c', 3)]
      .filter((playerId) => !retired.includes(playerId))
      .map((playerId) => ({ playerId })),
  } as unknown as MatchSession;
  const setTeamLineups = jest.fn(() => Promise.resolve());
  const createRound = jest.fn();
  const useCase = new AdvanceMatchSessionUseCase(
    {
      findById: () => Promise.resolve(session),
      findRetiredPlayerIds: () => Promise.resolve(retired),
      setTeamLineups,
    } as unknown as MatchSessionRepository,
    {
      findAllBySessionId: () => Promise.resolve(matches),
    } as unknown as MatchRepository,
    { createRound } as unknown as SessionRoundFactory,
  );
  return { useCase, setTeamLineups, createRound };
}

describe('AdvanceMatchSessionUseCase — bench_rotation', () => {
  it('gana el local: entra el banco y se completa con el perdedor (ronda 2 del ejemplo)', async () => {
    const { useCase, setTeamLineups, createRound } = setup([
      round(ids('a', 5), ids('b', 5), 1, 0),
    ]);

    await useCase.execute('s1');

    expect(setTeamLineups).toHaveBeenCalledWith([
      { teamId: 'A', playerIds: ['a1', 'a2', 'a3', 'a4', 'a5'] },
      { teamId: 'B', playerIds: ['c1', 'c2', 'c3', 'b1', 'b2'] },
    ]);
    const [, home, away, duration, , donor, startClock] = createRound.mock
      .calls[0] as [
      unknown,
      SessionTeam,
      SessionTeam,
      number,
      unknown,
      unknown,
      boolean,
    ];
    expect(home.id).toBe('A');
    expect(away.players.map((player) => player.playerId)).toEqual([
      'c1',
      'c2',
      'c3',
      'b1',
      'b2',
    ]);
    expect([duration, donor, startClock]).toEqual([8, null, true]);
  });

  it('gana el visitante: el equipo B sigue y el A pasa a ser el que entra', async () => {
    const { useCase, setTeamLineups } = setup([
      round(ids('a', 5), ids('b', 5), 0, 2),
    ]);

    await useCase.execute('s1');

    expect(setTeamLineups).toHaveBeenCalledWith([
      { teamId: 'B', playerIds: ['b1', 'b2', 'b3', 'b4', 'b5'] },
      { teamId: 'A', playerIds: ['c1', 'c2', 'c3', 'a1', 'a2'] },
    ]);
  });

  it('quien se fue durante la ronda no vuelve a entrar', async () => {
    const { useCase, setTeamLineups } = setup(
      [round(ids('a', 5), ids('b', 5), 1, 0)],
      ['a3'],
    );

    await useCase.execute('s1');

    const lineups = (
      setTeamLineups.mock.calls[0] as unknown as [{ playerIds: string[] }[]]
    )[0];
    expect(lineups.flatMap((lineup) => lineup.playerIds)).not.toContain('a3');
    expect(lineups[0].playerIds).toEqual(['a1', 'a2', 'a4', 'a5', 'b3']);
  });

  it('empate: no arma la ronda sola', async () => {
    const { useCase, setTeamLineups, createRound } = setup([
      round(ids('a', 5), ids('b', 5), 1, 1),
    ]);

    await expect(useCase.execute('s1')).resolves.toBeNull();
    expect(setTeamLineups).not.toHaveBeenCalled();
    expect(createRound).not.toHaveBeenCalled();
  });
});
