/**
 * Envio de emails via Gmail SMTP (nodemailer)
 */

import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const EMAIL_WRAPPER = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0c0c0e; font-family: system-ui, -apple-system, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; padding: 40px 24px;">
    <!-- Header com Logo -->
    <div style="text-align: center; margin-bottom: 36px;">
      <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #f5a623, #d97706); border-radius: 14px; display: inline-block; line-height: 56px; margin-bottom: 14px;">
        <span style="font-size: 28px;">📖</span>
      </div>
      <h1 style="font-size: 22px; color: #f0f0f0; margin: 0; font-weight: 700;">Devocional Hub</h1>
    </div>

    <!-- Card principal -->
    <div style="background-color: #141416; border-radius: 16px; padding: 32px 28px; border: 1px solid #2a2a2e;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 28px;">
      <p style="color: #57534e; font-size: 12px; margin: 0;">
        Devocional Hub &mdash; Plataforma de Devocionais
      </p>
    </div>
  </div>
</body>
</html>
`;

export async function sendInviteEmail(params: {
  to: string;
  name: string;
  inviteUrl: string;
}) {
  const transporter = getTransporter();

  const content = `
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
      Olá <strong style="color: #f0f0f0;">${params.name}</strong>,
    </p>
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
      Você foi convidado(a) para acessar o <strong style="color: #f5a623;">Devocional Hub</strong>, a plataforma de devocionais diários do nosso grupo.
    </p>
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.7; margin: 0 0 28px;">
      Clique no botão abaixo para criar sua senha e começar a usar:
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${params.inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #f5a623, #d97706); color: #0c0c0e; font-weight: 700; font-size: 15px; padding: 14px 36px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 16px rgba(245,166,35,0.3);">
        Aceitar Convite
      </a>
    </div>

    <p style="color: #78716c; font-size: 13px; line-height: 1.5; margin: 24px 0 0; text-align: center;">
      Este convite expira em <strong>7 dias</strong>.<br>
      Se você não solicitou este convite, pode ignorar este email.
    </p>
  `;

  await transporter.sendMail({
    from: `"Devocional Hub" <${process.env.SMTP_USER}>`,
    to: params.to,
    subject: "Convite para o Devocional Hub",
    html: EMAIL_WRAPPER(content),
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const transporter = getTransporter();

  const content = `
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
      Olá <strong style="color: #f0f0f0;">${params.name}</strong>,
    </p>
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
      Recebemos uma solicitação para redefinir a senha da sua conta no <strong style="color: #f5a623;">Devocional Hub</strong>.
    </p>
    <p style="color: #d4d4d4; font-size: 15px; line-height: 1.7; margin: 0 0 28px;">
      Clique no botão abaixo para criar uma nova senha:
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${params.resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #f5a623, #d97706); color: #0c0c0e; font-weight: 700; font-size: 15px; padding: 14px 36px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 16px rgba(245,166,35,0.3);">
        Redefinir Senha
      </a>
    </div>

    <p style="color: #78716c; font-size: 13px; line-height: 1.5; margin: 24px 0 0; text-align: center;">
      Este link expira em <strong>1 hora</strong>.<br>
      Se você não solicitou a redefinição, pode ignorar este email.
    </p>
  `;

  await transporter.sendMail({
    from: `"Devocional Hub" <${process.env.SMTP_USER}>`,
    to: params.to,
    subject: "Redefinição de Senha — Devocional Hub",
    html: EMAIL_WRAPPER(content),
  });
}
