import { DeepPartial } from 'typeorm';
import { ValidationError } from '../../../../shared/errors/domain-errors';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { SessionTeam } from '../../domain/entities/session-team.entity';
import { SessionTeamInputDto } from '../dtos/create-match-session.dto';

export async function assertValidSessionTeams(
  teams: SessionTeamInputDto[],
  playerRepository: PlayerRepository,
): Promise<void> {
  if (teams.length < 2) {
    throw new ValidationError('La jornada debe tener al menos 2 equipos');
  }

  const teamNames = teams.map((team) => team.name.trim().toLowerCase());
  if (new Set(teamNames).size !== teamNames.length) {
    throw new ValidationError('Los nombres de los equipos deben ser distintos');
  }

  const allPlayerIds = teams.flatMap((team) => team.playerIds);
  const uniquePlayerIds = Array.from(new Set(allPlayerIds));

  if (uniquePlayerIds.length !== allPlayerIds.length) {
    throw new ValidationError(
      'Un jugador no puede estar en más de un equipo de la jornada',
    );
  }

  const players = await playerRepository.findByIds(uniquePlayerIds);

  if (players.length !== uniquePlayerIds.length) {
    throw new ValidationError('Alguno de los jugadores indicados no existe');
  }
}

export function buildSessionTeams(
  teams: SessionTeamInputDto[],
  isWinnerStays: boolean,
): DeepPartial<SessionTeam>[] {
  return teams.map((team, index) => ({
    name: team.name,
    joinOrder: index,
    // Los dos primeros equipos arrancan jugando (fuera de la cola); el
    // resto entra a la fila de espera en el orden en que vinieron.
    queuePosition: isWinnerStays && index >= 2 ? index - 2 : null,
    players: team.playerIds.map((playerId) => ({ playerId })),
  }));
}
