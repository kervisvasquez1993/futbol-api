import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [LoginUseCase, RegisterUseCase],
})
export class AuthModule {}
