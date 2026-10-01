import { MatchSessionRepository } from '../../../match-sessions/domain/ports/match-session.repository';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { MatchTeamSide } from '../../domain/enums/match-team-side.enum';
import { MatchRepository } from '../../domain/ports/match.repository';
import { AddParticipantUseCase } from './add-participant.use-case';

describe('AddParticipantUseCase — carga manual en la jornada', () => {
  const addParticipant = jest.fn(() => Promise.resolve({}));
  const build = (match: object, hasPlayerStats: boolean) =>
    new AddParticipantUseCase(
      {
        findById: () => Promise.resolve({ participants: [], ...match }),
        addParticipant,
      } as unknown as MatchRepository,
      {
        findById: () => Promise.resolve({ id: 'p1' }),
      } as unknown as PlayerRepository,
      {
        hasPlayerStats: () => Promise.resolve(hasPlayerStats),
      } as unknown as MatchSessionRepository,
    );

  beforeEach(() => addParticipant.mockClear());

  it('409 si el jugador tiene carga manual en la jornada de la ronda', async () => {
    await expect(
      build({ sessionId: 's1' }, true).execute('m1', {
        playerId: 'p1',
        team: MatchTeamSide.HOME,
      }),
    ).rejects.toThrow(
      'Este jugador tiene estadísticas cargadas a mano en la jornada: bórralas antes de sumarlo a una ronda',
    );
    expect(addParticipant).not.toHaveBeenCalled();
  });

  it('sin carga manual lo suma', async () => {
    await build({ sessionId: 's1' }, false).execute('m1', {
      playerId: 'p1',
      team: MatchTeamSide.HOME,
    });
    expect(addParticipant).toHaveBeenCalledWith('m1', 'p1', MatchTeamSide.HOME);
  });

  it('un partido suelto (sin jornada) no se ve afectado', async () => {
    await build({ sessionId: null }, true).execute('m1', {
      playerId: 'p1',
      team: MatchTeamSide.AWAY,
    });
    expect(addParticipant).toHaveBeenCalled();
  });
});
