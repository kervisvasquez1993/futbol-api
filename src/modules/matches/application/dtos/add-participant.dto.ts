import { IsEnum, IsUUID } from 'class-validator';
import { MatchTeamSide } from '../../domain/enums/match-team-side.enum';

export class AddParticipantDto {
  @IsUUID('all', { message: 'El jugador debe ser un id válido' })
  playerId: string;

  @IsEnum(MatchTeamSide, { message: 'El equipo debe ser "home" o "away"' })
  team: MatchTeamSide;
}
