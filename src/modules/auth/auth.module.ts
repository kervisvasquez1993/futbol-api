import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PlayersModule } from '../players/players.module';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [UsersModule, PlayersModule],
  controllers: [AuthController],
  providers: [LoginUseCase, RegisterUseCase],
})
export class AuthModule {}
