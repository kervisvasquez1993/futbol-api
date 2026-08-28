import { Injectable } from '@nestjs/common';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/errors/domain-errors';
import { MatchRepository } from '../../domain/ports/match.repository';
import { AddParticipantDto } from '../dtos/add-participant.dto';

@Injectable()
export class AddParticipantUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly playerRepository: PlayerRepository,
  ) {}

  async execute(matchId: string, dto: AddParticipantDto) {
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    const player = await this.playerRepository.findById(dto.playerId);

    if (!player) {
      throw new ValidationError('El jugador indicado no existe');
    }

    const alreadyParticipant = match.participants.some(
      (participant) => participant.playerId === dto.playerId,
    );

    if (alreadyParticipant) {
      throw new ConflictError('El jugador ya forma parte de este partido');
    }

    return this.matchRepository.addParticipant(matchId, dto.playerId, dto.team);
  }
}
