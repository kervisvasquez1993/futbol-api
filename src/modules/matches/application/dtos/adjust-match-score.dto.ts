import { IsEnum, IsIn } from 'class-validator';
import { MatchTeamSide } from '../../domain/enums/match-team-side.enum';

export class AdjustMatchScoreDto {
  @IsEnum(MatchTeamSide, { message: 'El equipo debe ser "home" o "away"' })
  team: MatchTeamSide;

  @IsIn([1, -1], { message: 'El ajuste debe ser 1 (sumar) o -1 (restar)' })
  delta: 1 | -1;
}
