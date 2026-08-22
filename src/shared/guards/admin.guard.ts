import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ForbiddenError } from '../errors/domain-errors';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Esta acción requiere permisos de administrador');
    }

    return true;
  }
}
