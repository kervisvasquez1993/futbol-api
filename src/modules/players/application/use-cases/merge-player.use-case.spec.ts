import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/errors/domain-errors';
import { Player } from '../../domain/entities/player.entity';
import { PlayerRepository } from '../../domain/ports/player.repository';
import { MergePlayerUseCase } from './merge-player.use-case';

const players: Record<string, Partial<Player>> = {
  guest: { id: 'guest', name: 'Pedro', isGuest: true },
  other: { id: 'other', name: 'Pedro', isGuest: true },
  member: { id: 'member', name: 'Pedro Silva', isGuest: false },
};

function setup(claimed = false) {
  const mergeInto = jest.fn(() => Promise.resolve());
  const useCase = new MergePlayerUseCase({
    findById: (id: string) => Promise.resolve(players[id] ?? null),
    isClaimed: () => Promise.resolve(claimed),
    mergeInto,
  } as unknown as PlayerRepository);
  return { useCase, mergeInto };
}

describe('MergePlayerUseCase', () => {
  it('une el convidado con el otro y devuelve el que queda', async () => {
    const { useCase, mergeInto } = setup();

    await expect(useCase.execute('guest', 'other')).resolves.toBe(
      players.other,
    );
    expect(mergeInto).toHaveBeenCalledWith('guest', 'other');
  });

  it('el destino puede ser un jugador registrado', async () => {
    const { useCase, mergeInto } = setup();

    await useCase.execute('guest', 'member');

    expect(mergeInto).toHaveBeenCalledWith('guest', 'member');
  });

  it('consigo mismo: 400', async () => {
    const { useCase } = setup();

    await expect(useCase.execute('guest', 'guest')).rejects.toThrow(
      new ValidationError('No se puede unir un jugador consigo mismo'),
    );
  });

  it('un jugador registrado no se une: 400', async () => {
    const { useCase, mergeInto } = setup();

    await expect(useCase.execute('member', 'guest')).rejects.toThrow(
      new ValidationError('Solo se puede unir un convidado'),
    );
    expect(mergeInto).not.toHaveBeenCalled();
  });

  it('un convidado ya reclamado no se une: 400', async () => {
    const { useCase } = setup(true);

    await expect(useCase.execute('guest', 'other')).rejects.toThrow(
      'Solo se puede unir un convidado',
    );
  });

  it('jugadores inexistentes: 404', async () => {
    const { useCase } = setup();

    await expect(useCase.execute('nope', 'other')).rejects.toThrow(
      new NotFoundError('Jugador no encontrado'),
    );
    await expect(useCase.execute('guest', 'nope')).rejects.toThrow(
      new NotFoundError('Jugador destino no encontrado'),
    );
  });
});
