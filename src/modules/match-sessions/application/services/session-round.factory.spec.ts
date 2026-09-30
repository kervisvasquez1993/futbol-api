import { MatchTeamSide } from '../../../matches/domain/enums/match-team-side.enum';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { SessionTeam } from '../../domain/entities/session-team.entity';
import { RandomService } from './random.service';
import { SessionRoundFactory } from './session-round.factory';

const team = (id: string, playerIds: string[]) =>
  ({
    id,
    name: id,
    players: playerIds.map((playerId) => ({ playerId })),
  }) as SessionTeam;

describe('SessionRoundFactory.createRound', () => {
  const A = team('A', ['a1', 'a2', 'a3']);
  const B = team('B', ['b1', 'b2', 'b3']);
  const C = team('C', ['c1', 'c2']);
  const session = {
    id: 's1',
    name: 'Jornada',
    date: new Date(),
    playersPerTeam: null,
    teams: [A, B, C],
  } as unknown as MatchSession;

  let matchRepository: { create: jest.Mock; findAllBySessionId: jest.Mock };
  let factory: SessionRoundFactory;

  beforeEach(() => {
    matchRepository = {
      create: jest.fn((data) => Promise.resolve(data)),
      findAllBySessionId: jest.fn(() =>
        Promise.resolve([
          // b1 y b2 ya fueron refuerzo: le toca a b3.
          {
            participants: [
              { playerId: 'b1', isFillIn: true },
              { playerId: 'b2', isFillIn: true },
              { playerId: 'a1', isFillIn: false },
            ],
          },
        ]),
      ),
    };
    factory = new SessionRoundFactory(
      matchRepository as unknown as MatchRepository,
      { int: () => 0 } as RandomService,
    );
  });

  it('sin tamaño configurado completa hasta el equipo más grande, con el que menos veces fue refuerzo', async () => {
    await factory.createRound(session, A, C, null, null, B);

    const { participants } = matchRepository.create.mock.calls[0][0];
    expect(participants).toContainEqual({
      playerId: 'b3',
      team: MatchTeamSide.AWAY,
      isFillIn: true,
    });
    expect(participants.filter((p) => p.isFillIn)).toHaveLength(1);
    expect(participants.filter((p) => !p.isFillIn)).toHaveLength(5);
  });

  it('sin equipo donante no agrega refuerzos ni consulta las rondas', async () => {
    await factory.createRound(session, A, C, null, null);

    const { participants } = matchRepository.create.mock.calls[0][0];
    expect(participants.some((p) => p.isFillIn)).toBe(false);
    expect(matchRepository.findAllBySessionId).not.toHaveBeenCalled();
  });
});
