import { Body, Controller, Post } from '@nestjs/common';
import { ForgotPasswordDto } from '../application/dtos/forgot-password.dto';
import { LoginDto } from '../application/dtos/login.dto';
import { RegisterDto } from '../application/dtos/register.dto';
import { ResetPasswordDto } from '../application/dtos/reset-password.dto';
import { VerifyResetCodeDto } from '../application/dtos/verify-reset-code.dto';
import { ForgotPasswordUseCase } from '../application/use-cases/forgot-password.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { RegisterUseCase } from '../application/use-cases/register.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { VerifyResetCodeUseCase } from '../application/use-cases/verify-reset-code.use-case';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly verifyResetCodeUseCase: VerifyResetCodeUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.forgotPasswordUseCase.execute(dto);
  }

  @Post('reset-password/verify-code')
  verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.verifyResetCodeUseCase.execute(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(dto);
  }
}
