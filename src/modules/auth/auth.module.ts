import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PlayersModule } from '../players/players.module';
import { MailModule } from '../../shared/mail/mail.module';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { VerifyResetCodeUseCase } from './application/use-cases/verify-reset-code.use-case';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [UsersModule, PlayersModule, MailModule],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RegisterUseCase,
    ForgotPasswordUseCase,
    VerifyResetCodeUseCase,
    ResetPasswordUseCase,
  ],
})
export class AuthModule {}
