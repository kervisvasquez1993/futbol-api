import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../../../shared/enums/user-role.enum';
import { Player } from '../../../players/domain/entities/player.entity';
import {
  ConflictError,
  NotFoundError,
} from '../../../../shared/errors/domain-errors';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/ports/user.repository';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  count(): Promise<number> {
    return this.repository.count();
  }

  findAll(): Promise<User[]> {
    return this.repository.find();
  }

  findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  findByPlayerId(playerId: string): Promise<User | null> {
    return this.repository.findOne({ where: { playerId } });
  }

  findAdmins(): Promise<User[]> {
    return this.repository.find({ where: { role: UserRole.ADMIN } });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.repository.update(id, data);
    return (await this.findById(id)) as User;
  }

  createClaimingGuest(
    data: Partial<User>,
    guestPlayerId: string,
    playerName: string,
  ): Promise<User> {
    return this.repository.manager.transaction(async (manager) => {
      // FOR UPDATE: dos registros simultáneos no pueden reclamar al mismo
      // invitado; el segundo espera y ya ve al usuario del primero.
      const guest = await manager
        .getRepository(Player)
        .createQueryBuilder('player')
        .setLock('pessimistic_write')
        .where('player.id = :guestPlayerId', { guestPlayerId })
        .getOne();

      if (!guest?.isGuest) {
        throw new NotFoundError('El invitado no existe');
      }

      const alreadyClaimed = await manager.exists(User, {
        where: { playerId: guestPlayerId },
      });
      if (alreadyClaimed) {
        throw new ConflictError('Ese invitado ya fue vinculado a otra cuenta');
      }

      await manager.update(Player, guestPlayerId, {
        isGuest: false,
        name: playerName,
      });

      const user = manager.create(User, { ...data, playerId: guestPlayerId });
      return manager.save(user);
    });
  }
}
