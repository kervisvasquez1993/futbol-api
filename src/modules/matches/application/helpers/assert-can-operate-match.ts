import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { ForbiddenError } from '../../../../shared/errors/domain-errors';
import { UserRole } from '../../../../shared/enums/user-role.enum';
import { Match } from '../../domain/entities/match.entity';

// Admin puede operar cualquier partido; un member solo aquellos en los que
// juega (existe un match_participant con su playerId).
export function assertCanOperateMatch(
  currentUser: CurrentUserPayload,
  match: Match,
  message: string,
): void {
  if (currentUser.role === UserRole.ADMIN) return;

  const isParticipant =
    currentUser.playerId != null &&
    match.participants.some(
      (participant) => participant.playerId === currentUser.playerId,
    );

  if (!isParticipant) {
    throw new ForbiddenError(message);
  }
}
