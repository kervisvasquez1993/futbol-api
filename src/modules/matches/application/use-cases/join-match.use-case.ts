import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../../users/domain/ports/user.repository';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/errors/domain-errors';
import { MatchRepository } from '../../domain/ports/match.repository';
import { JoinMatchDto } from '../dtos/join-match.dto';

@Injectable()
export class JoinMatchUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(matchId: string, userId: string, dto: JoinMatchDto) {
    const user = await this.userRepository.findById(userId);

    if (!user?.playerId) {
      throw new ForbiddenError(
        'Tu cuenta no tiene un jugador vinculado. Pide a un administrador que la vincule.',
      );
    }

    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    const alreadyParticipant = match.participants.some(
      (participant) => participant.playerId === user.playerId,
    );

    if (alreadyParticipant) {
      throw new ConflictError('Ya estás inscrito en este partido');
    }

    return this.matchRepository.addParticipant(
      matchId,
      user.playerId,
      dto.team,
    );
  }
}
