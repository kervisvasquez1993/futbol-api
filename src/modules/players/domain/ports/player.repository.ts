import { Player } from '../entities/player.entity';

export abstract class PlayerRepository {
  abstract findAll(): Promise<Player[]>;
  abstract findUnclaimedGuests(): Promise<Player[]>;
  abstract hasHistory(id: string): Promise<boolean>;
  abstract findById(id: string): Promise<Player | null>;
  abstract findByIds(ids: string[]): Promise<Player[]>;
  abstract create(data: Partial<Player>): Promise<Player>;
  abstract update(id: string, data: Partial<Player>): Promise<Player>;
  abstract delete(id: string): Promise<void>;
  // Algún usuario lo reclamó (ya no es un convidado libre).
  abstract isClaimed(id: string): Promise<boolean>;
  // Pasa todo el historial de `sourceId` a `targetId` y borra `sourceId`, en
  // una transacción.
  abstract mergeInto(sourceId: string, targetId: string): Promise<void>;
}
