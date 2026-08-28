import { Injectable } from '@nestjs/common';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchTeamSide } from '../../../matches/domain/enums/match-team-side.enum';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { GoalRepository } from '../../domain/ports/goal.repository';

@Injectable()
export class GetMatchSummaryUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly goalRepository: GoalRepository,
  ) {}

  async execute(matchId: string) {
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    const goals = await this.goalRepository.findByMatchId(matchId);
    const teamByPlayerId = new Map(
      match.participants.map((participant) => [
        participant.playerId,
        participant.team,
      ]),
    );

    const goalsWithTeam = goals.map((goal) => ({
      ...goal,
      team: teamByPlayerId.get(goal.scorerId) ?? null,
    }));

    const goalsByTeam = goalsWithTeam.reduce(
      (tally, goal) => {
        if (goal.team === MatchTeamSide.HOME) tally.home += 1;
        if (goal.team === MatchTeamSide.AWAY) tally.away += 1;
        return tally;
      },
      { home: 0, away: 0 },
    );

    return {
      match: {
        id: match.id,
        name: match.name,
        date: match.date,
        status: match.status,
        homeTeamName: match.homeTeamName,
        awayTeamName: match.awayTeamName,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
      participants: {
        home: match.participants
          .filter((participant) => participant.team === MatchTeamSide.HOME)
          .map((participant) => participant.player),
        away: match.participants
          .filter((participant) => participant.team === MatchTeamSide.AWAY)
          .map((participant) => participant.player),
      },
      goals: goalsWithTeam,
      goalsByTeam,
    };
  }
}
