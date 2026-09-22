import { IsEnum } from 'class-validator';
import { MatchTeamSide } from '../../domain/enums/match-team-side.enum';

export class JoinMatchDto {
  @IsEnum(MatchTeamSide, { message: 'El equipo debe ser "home" o "away"' })
  team: MatchTeamSide;
}
