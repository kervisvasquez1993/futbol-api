function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPasswordResetEmailSubject(): string {
  return 'Código para redefinir sua senha - Futbol Tracker';
}

export function buildPasswordResetEmailHtml(
  name: string,
  code: string,
  expiresInMinutes: number,
): string {
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(code);

  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <h2 style="color: #111827; margin-bottom: 8px;">Redefinição de senha</h2>
    <p>Olá, ${safeName}.</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta no Futbol Tracker.</p>
    <p>Seu código de verificação é:</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
      ${safeCode}
    </p>
    <p>Este código expira em ${expiresInMinutes} minutos.</p>
    <p>Se você não solicitou essa alteração, pode ignorar este e-mail com segurança — sua senha continua a mesma.</p>
  </div>
  `;
}
