import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { ForbiddenError } from '../../../../shared/errors/domain-errors';

// Mismo mensaje que POST /matches/:id/join.
export function assertHasLinkedPlayer(currentUser: CurrentUserPayload): string {
  if (!currentUser.playerId) {
    throw new ForbiddenError(
      'Tu cuenta no tiene un jugador vinculado. Pide a un administrador que la vincule.',
    );
  }

  return currentUser.playerId;
}
