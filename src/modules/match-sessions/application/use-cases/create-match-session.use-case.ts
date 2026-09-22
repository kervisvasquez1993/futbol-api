import { Injectable } from '@nestjs/common';
import { ValidationError } from '../../../../shared/errors/domain-errors';
import { Match } from '../../../matches/domain/entities/match.entity';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { CreateMatchSessionDto } from '../dtos/create-match-session.dto';
import { withQueue } from '../helpers/session-response.helper';
import { SessionRoundFactory } from '../services/session-round.factory';

@Injectable()
export class CreateMatchSessionUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly sessionRoundFactory: SessionRoundFactory,
  ) {}

  async execute(dto: CreateMatchSessionDto) {
    const teamNames = dto.teams.map((team) => team.name.trim().toLowerCase());
    if (new Set(teamNames).size !== teamNames.length) {
      throw new ValidationError(
        'Los nombres de los equipos deben ser distintos',
      );
    }

    const allPlayerIds = dto.teams.flatMap((team) => team.playerIds);
    const uniquePlayerIds = Array.from(new Set(allPlayerIds));

    if (uniquePlayerIds.length !== allPlayerIds.length) {
      throw new ValidationError(
        'Un jugador no puede estar en más de un equipo de la jornada',
      );
    }

    const players = await this.playerRepository.findByIds(uniquePlayerIds);

    if (players.length !== uniquePlayerIds.length) {
      throw new ValidationError('Alguno de los jugadores indicados no existe');
    }

    const rotationMode = dto.rotationMode ?? SessionRotationMode.MANUAL;
    const isWinnerStays = rotationMode === SessionRotationMode.WINNER_STAYS;

    const session = await this.matchSessionRepository.create({
      name: dto.name,
      date: dto.date ? new Date(dto.date) : new Date(),
      status: MatchSessionStatus.EN_CURSO,
      rotationMode,
      durationMinutes: dto.durationMinutes ?? null,
      goalLimit: dto.goalLimit ?? null,
      teams: dto.teams.map((team, index) => ({
        name: team.name,
        joinOrder: index,
        // Los dos primeros equipos arrancan jugando (fuera de la cola); el
        // resto entra a la fila de espera en el orden en que vinieron.
        queuePosition: isWinnerStays && index >= 2 ? index - 2 : null,
        players: team.playerIds.map((playerId) => ({ playerId })),
      })),
    });

    let currentMatch: Match | null = null;

    if (isWinnerStays) {
      const [firstTeam, secondTeam] = [...session.teams].sort(
        (a, b) => a.joinOrder - b.joinOrder,
      );
      currentMatch = await this.sessionRoundFactory.createRound(
        session,
        firstTeam,
        secondTeam,
        session.durationMinutes,
        session.goalLimit,
      );
    }

    return { session: withQueue(session), currentMatch };
  }
}
