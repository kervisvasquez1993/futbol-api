import { Injectable } from '@nestjs/common';
import { GoalRepository } from '../../domain/ports/goal.repository';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import {
  ConflictError,
  ValidationError,
} from '../../../../shared/errors/domain-errors';
import { CreateGoalDto } from '../dtos/create-goal.dto';

@Injectable()
export class AddGoalUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly matchRepository: MatchRepository,
  ) {}

  async execute(matchId: string, dto: CreateGoalDto) {
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new ConflictError('El partido no existe');
    }

    const participantIds = new Set(
      match.participants.map((participant) => participant.playerId),
    );

    if (!participantIds.has(dto.scorerId)) {
      throw new ValidationError(
        'El goleador debe ser un participante del partido',
      );
    }

    if (dto.assistId) {
      if (dto.assistId === dto.scorerId) {
        throw new ValidationError(
          'El asistente no puede ser el mismo jugador que anotó el gol',
        );
      }

      if (!participantIds.has(dto.assistId)) {
        throw new ValidationError(
          'El asistente debe ser un participante del partido',
        );
      }
    }

    return this.goalRepository.create({
      matchId,
      scorerId: dto.scorerId,
      assistId: dto.assistId ?? null,
      minute: dto.minute ?? null,
    });
  }
}
