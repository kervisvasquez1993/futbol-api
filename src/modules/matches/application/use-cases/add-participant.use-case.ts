import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { MatchSessionRepository } from '../../../match-sessions/domain/ports/match-session.repository';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/errors/domain-errors';
import { MatchRepository } from '../../domain/ports/match.repository';
import { assertHasNoManualStatsInSession } from '../helpers/assert-has-no-manual-stats-in-session';
import { AddParticipantDto } from '../dtos/add-participant.dto';

@Injectable()
export class AddParticipantUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly playerRepository: PlayerRepository,
    @Inject(forwardRef(() => MatchSessionRepository))
    private readonly matchSessionRepository: MatchSessionRepository,
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

    await assertHasNoManualStatsInSession(
      match,
      dto.playerId,
      this.matchSessionRepository,
    );

    return this.matchRepository.addParticipant(matchId, dto.playerId, dto.team);
  }
}
