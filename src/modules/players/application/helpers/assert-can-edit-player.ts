import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { ForbiddenError } from '../../../../shared/errors/domain-errors';
import { UserRole } from '../../../../shared/enums/user-role.enum';

export function assertCanEditPlayer(
  currentUser: CurrentUserPayload,
  playerId: string,
): void {
  const isOwner = currentUser.playerId === playerId;

  if (currentUser.role !== UserRole.ADMIN && !isOwner) {
    throw new ForbiddenError('No podés editar el perfil de otro jugador');
  }
}
