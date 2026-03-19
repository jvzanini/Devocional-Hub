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

export async function sendInviteEmail(params: {
  to: string;
  name: string;
  inviteUrl: string;
}) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Devocional Hub" <${process.env.SMTP_USER}>`,
    to: params.to,
    subject: "Convite para o Devocional Hub",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #d97706, #b45309); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <span style="font-size: 24px; color: white;">📖</span>
          </div>
          <h1 style="font-size: 20px; color: #1c1917; margin: 0;">Devocional Hub</h1>
        </div>

        <p style="color: #57534e; font-size: 15px; line-height: 1.6;">
          Olá <strong>${params.name}</strong>,
        </p>
        <p style="color: #57534e; font-size: 15px; line-height: 1.6;">
          Você foi convidado(a) para acessar o <strong>Devocional Hub</strong>, a plataforma de devocionais diários.
        </p>
        <p style="color: #57534e; font-size: 15px; line-height: 1.6;">
          Clique no botão abaixo para criar sua senha e acessar a plataforma:
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${params.inviteUrl}" style="display: inline-block; background-color: #d97706; color: white; font-weight: 600; font-size: 15px; padding: 12px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 12px rgba(217,119,6,0.25);">
            Aceitar Convite
          </a>
        </div>

        <p style="color: #a8a29e; font-size: 13px; line-height: 1.5;">
          Este convite expira em 7 dias. Se você não solicitou este convite, pode ignorar este email.
        </p>
      </div>
    `,
  });
}
