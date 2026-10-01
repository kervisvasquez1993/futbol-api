import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../../shared/decorators/current-user.decorator';
import { UnauthorizedError } from '../../../shared/errors/domain-errors';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { ListNotificationsQuery } from '../application/dtos/list-notifications.query';
import { NotificationStreamService } from '../application/services/notification-stream.service';
import { ListNotificationsUseCase } from '../application/use-cases/list-notifications.use-case';
import { MarkAllNotificationsReadUseCase } from '../application/use-cases/mark-all-notifications-read.use-case';
import { MarkNotificationReadUseCase } from '../application/use-cases/mark-notification-read.use-case';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
    private readonly notificationStreamService: NotificationStreamService,
    private readonly jwtService: JwtService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListNotificationsQuery,
  ) {
    return this.listNotificationsUseCase.execute(user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('read-all')
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.markAllNotificationsReadUseCase.execute(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  markRead(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.markNotificationReadUseCase.execute(user.id, id);
  }

  // EventSource no puede mandar headers: el JWT viaja en ?token=.
  @Sse('events')
  async events(@Query('token') token?: string) {
    if (!token) {
      throw new UnauthorizedError('Token de autenticación no proporcionado');
    }

    let userId: string;
    try {
      ({ sub: userId } = await this.jwtService.verifyAsync<{ sub: string }>(
        token,
      ));
    } catch {
      throw new UnauthorizedError('Token de autenticación inválido o expirado');
    }

    return this.notificationStreamService.stream(userId);
  }
}
