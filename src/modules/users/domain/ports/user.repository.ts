import { User } from '../entities/user.entity';

export abstract class UserRepository {
  abstract count(): Promise<number>;
  abstract findAll(): Promise<User[]>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByPlayerId(playerId: string): Promise<User | null>;
  abstract findAdmins(): Promise<User[]>;
  abstract create(data: Partial<User>): Promise<User>;
  // Crea el usuario vinculado a un Player invitado existente y lo convierte en
  // jugador registrado con `playerName`, todo en una transacción.
  abstract createClaimingGuest(
    data: Partial<User>,
    guestPlayerId: string,
    playerName: string,
  ): Promise<User>;
  abstract update(id: string, data: Partial<User>): Promise<User>;
}
