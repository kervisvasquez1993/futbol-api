import { MatchTeamSide } from '../../../matches/domain/enums/match-team-side.enum';
import { nextLineup, RotationRound } from './bench-rotation';

const ids = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);

describe('nextLineup (Quem ganha fica + banco)', () => {
  // 13 jugadores, 5 por equipo, el local gana siempre: la tabla del pedido.
  it('reproduce la tabla del ejemplo', () => {
    const arrivalOrder = [...ids('a', 5), ...ids('b', 5), ...ids('c', 3)];
    const rounds: RotationRound[] = [{ home: ids('a', 5), away: ids('b', 5) }];
    let bench = ids('c', 3);

    for (let i = 0; i < 4; i++) {
      const next = nextLineup(
        { teamSize: 5, rounds, bench, arrivalOrder },
        MatchTeamSide.HOME,
      );
      rounds.push({ home: next.winners, away: next.challengers });
      bench = next.bench;
    }

    expect(rounds).toEqual([
      {
        home: ['a1', 'a2', 'a3', 'a4', 'a5'],
        away: ['b1', 'b2', 'b3', 'b4', 'b5'],
      },
      {
        home: ['a1', 'a2', 'a3', 'a4', 'a5'],
        away: ['c1', 'c2', 'c3', 'b1', 'b2'],
      },
      {
        home: ['c3', 'b1', 'b2', 'a1', 'a2'],
        away: ['b3', 'b4', 'b5', 'c1', 'c2'],
      },
      {
        home: ['b5', 'c1', 'c2', 'c3', 'a1'],
        away: ['a3', 'a4', 'a5', 'b3', 'b4'],
      },
      {
        home: ['a5', 'b3', 'b4', 'b5', 'c1'],
        away: ['a2', 'b1', 'b2', 'a3', 'a4'],
      },
    ]);
    expect(bench).toEqual(['c2', 'c3', 'a1']);
  });

  it('nadie se pierde ni se repite: todos juegan o quedan en el banco', () => {
    const arrivalOrder = [...ids('a', 5), ...ids('b', 5), ...ids('c', 3)];
    const rounds: RotationRound[] = [{ home: ids('a', 5), away: ids('b', 5) }];
    let bench = ids('c', 3);

    for (let i = 0; i < 10; i++) {
      const next = nextLineup(
        { teamSize: 5, rounds, bench, arrivalOrder },
        i % 3 === 0 ? MatchTeamSide.AWAY : MatchTeamSide.HOME,
      );
      expect(next.winners).toHaveLength(5);
      expect(next.challengers).toHaveLength(5);
      expect(
        [...next.winners, ...next.challengers, ...next.bench].sort(),
      ).toEqual([...arrivalOrder].sort());
      rounds.push({ home: next.winners, away: next.challengers });
      bench = next.bench;
    }
  });

  it('sin banco y con menos gente que lugares: juegan todos', () => {
    const next = nextLineup(
      {
        teamSize: 5,
        rounds: [{ home: ids('a', 4), away: ids('b', 4) }],
        bench: [],
        arrivalOrder: [],
      },
      MatchTeamSide.AWAY,
    );

    expect(next.winners).toEqual(ids('b', 4));
    expect(next.challengers).toHaveLength(4);
    expect(next.bench).toEqual([]);
  });

  it('el que llegó tarde (0 rondas) entra primero', () => {
    const next = nextLineup(
      {
        teamSize: 2,
        rounds: [{ home: ['a1', 'a2'], away: ['b1', 'b2'] }],
        bench: ['late'],
        arrivalOrder: ['a1', 'a2', 'b1', 'b2', 'late'],
      },
      MatchTeamSide.HOME,
    );

    expect(next.challengers).toEqual(['late', 'b1']);
    expect(next.bench).toEqual(['b2']);
  });
});
