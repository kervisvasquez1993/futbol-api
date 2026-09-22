import { Injectable } from '@nestjs/common';
import { ValidationError } from '../../../../shared/errors/domain-errors';
import { MatchTeamSide } from '../../../matches/domain/enums/match-team-side.enum';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { CreateMatchSessionDto } from '../dtos/create-match-session.dto';

@Injectable()
export class CreateMatchSessionUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly matchRepository: MatchRepository,
    private readonly playerRepository: PlayerRepository,
  ) {}

  async execute(dto: CreateMatchSessionDto) {
    const teamNames = dto.teams.map((team) => team.name.trim().toLowerCase());
    if (new Set(teamNames).size !== teamNames.length) {
      throw new ValidationError('Los nombres de los equipos deben ser distintos');
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

    const session = await this.matchSessionRepository.create({
      name: dto.name,
      date: new Date(dto.date),
      status: MatchSessionStatus.EN_CURSO,
      durationMinutes: dto.durationMinutes ?? null,
      goalLimit: dto.goalLimit ?? null,
      teams: dto.teams.map((team) => ({
        name: team.name,
        players: team.playerIds.map((playerId) => ({ playerId })),
      })),
    });

    const [firstTeam, secondTeam] = session.teams;

    const currentMatch = await this.matchRepository.create({
      name: session.name,
      date: session.date,
      status: MatchStatus.EN_CURSO,
      homeTeamName: firstTeam.name,
      awayTeamName: secondTeam.name,
      sessionId: session.id,
      homeSessionTeamId: firstTeam.id,
      awaySessionTeamId: secondTeam.id,
      durationMinutes: session.durationMinutes,
      goalLimit: session.goalLimit,
      participants: [
        ...firstTeam.players.map((player) => ({
          playerId: player.playerId,
          team: MatchTeamSide.HOME,
        })),
        ...secondTeam.players.map((player) => ({
          playerId: player.playerId,
          team: MatchTeamSide.AWAY,
        })),
      ],
    });

    return { session, currentMatch };
  }
}
