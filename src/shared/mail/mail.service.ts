import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { envs } from '../../config/envs';
import {
  buildPasswordResetEmailHtml,
  buildPasswordResetEmailSubject,
} from './password-reset-email.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter = nodemailer.createTransport({
    host: envs.mail.host,
    port: envs.mail.port,
    auth:
      envs.mail.user && envs.mail.pass
        ? { user: envs.mail.user, pass: envs.mail.pass }
        : undefined,
  });

  async sendPasswordResetCode(
    to: string,
    name: string,
    code: string,
    expiresInMinutes: number,
  ): Promise<void> {
    if (!envs.mail.host) {
      throw new Error(
        'El envío de correo no está configurado (falta MAIL_HOST)',
      );
    }

    await this.transporter.sendMail({
      from: envs.mail.from,
      to,
      subject: buildPasswordResetEmailSubject(),
      html: buildPasswordResetEmailHtml(name, code, expiresInMinutes),
    });

    this.logger.log(`Código de recuperación enviado a ${to}`);
  }
}
