import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/errors/domain-errors';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { SessionEventsService } from '../services/session-events.service';
import { AddSessionGuestUseCase } from './add-session-guest.use-case';

const players: Record<string, object> = {
  pedro: { id: 'pedro', name: 'Pedro', isGuest: true },
  ana: { id: 'ana', name: 'Ana', isGuest: false },
};

function setup(claimed = false) {
  const session = {
    id: 's1',
    attendees: [{ playerId: 'x', player: { name: 'João' } }],
  } as unknown as MatchSession;
  const addAttendee = jest.fn(() => Promise.resolve());
  const create = jest.fn(() => Promise.resolve({ id: 'new' }));
  const useCase = new AddSessionGuestUseCase(
    {
      findById: () => Promise.resolve(session),
      addAttendee,
    } as unknown as MatchSessionRepository,
    {
      findById: (id: string) => Promise.resolve(players[id] ?? null),
      isClaimed: () => Promise.resolve(claimed),
      create,
    } as unknown as PlayerRepository,
    { emit: jest.fn() } as unknown as SessionEventsService,
  );
  return { useCase, addAttendee, create };
}

describe('AddSessionGuestUseCase', () => {
  it('con playerId reusa el convidado (sin crear otro)', async () => {
    const { useCase, addAttendee, create } = setup();

    await useCase.execute('s1', { playerId: 'pedro' });

    expect(addAttendee).toHaveBeenCalledWith('s1', 'pedro');
    expect(create).not.toHaveBeenCalled();
  });

  it('con name crea uno nuevo, como antes', async () => {
    const { useCase, addAttendee, create } = setup();

    await useCase.execute('s1', { name: ' Lucas ' });

    expect(create).toHaveBeenCalledWith({ name: 'Lucas', isGuest: true });
    expect(addAttendee).toHaveBeenCalledWith('s1', 'new');
  });

  it.each([{}, { name: 'Lucas', playerId: 'pedro' }])(
    'ni uno ni otro, o los dos: 400',
    async (dto) => {
      const { useCase } = setup();

      await expect(useCase.execute('s1', dto)).rejects.toThrow(
        new ValidationError('Indique el nombre o el convidado'),
      );
    },
  );

  it('playerId inexistente: 404', async () => {
    const { useCase } = setup();

    await expect(useCase.execute('s1', { playerId: 'nope' })).rejects.toThrow(
      new NotFoundError('Jugador no encontrado'),
    );
  });

  it('un jugador registrado o un convidado reclamado: 400', async () => {
    await expect(
      setup().useCase.execute('s1', { playerId: 'ana' }),
    ).rejects.toThrow(new ValidationError('Ese jugador no es un convidado'));
    await expect(
      setup(true).useCase.execute('s1', { playerId: 'pedro' }),
    ).rejects.toThrow('Ese jugador no es un convidado');
  });
});
