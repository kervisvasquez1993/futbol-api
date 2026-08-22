import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../../shared/decorators/current-user.decorator';
import { CreateUserDto } from '../application/dtos/create-user.dto';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case';
import { GetMeUseCase } from '../application/use-cases/get-me.use-case';
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case';

@Controller('users')
export class UsersController {
  constructor(
    private readonly getMeUseCase: GetMeUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.getMeUseCase.execute(user.id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  list() {
    return this.listUsersUseCase.execute();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.createUserUseCase.execute(dto);
  }
}
