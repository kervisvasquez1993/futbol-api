import { Player } from '../entities/player.entity';

export abstract class PlayerRepository {
  abstract findAll(): Promise<Player[]>;
  abstract findById(id: string): Promise<Player | null>;
  abstract findByIds(ids: string[]): Promise<Player[]>;
  abstract create(data: Partial<Player>): Promise<Player>;
  abstract update(id: string, data: Partial<Player>): Promise<Player>;
  abstract delete(id: string): Promise<void>;
}
