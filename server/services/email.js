/**
 * Email service with swappable drivers.
 *
 * EMAIL_DRIVER=console → emails printed to the terminal (default, no setup)
 * EMAIL_DRIVER=smtp    → real emails via Nodemailer (requires SMTP_* env vars)
 */
import nodemailer from 'nodemailer';

const consoleDriver = {
  async send({ to, subject, text, html }) {
    console.log('\n┌── 📧 EMAIL (console driver) ─────────────────');
    console.log(`│ To:      ${to}`);
    console.log(`│ Subject: ${subject}`);
    console.log(`│ Body:    ${text || html}`);
    console.log('└──────────────────────────────────────────────\n');
    return { messageId: `console-${Date.now()}` };
  },
};

const smtpDriver = {
  transporter: null,
  getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    }
    return this.transporter;
  },
  async send({ to, subject, text, html }) {
    return this.getTransporter().sendMail({
      from: process.env.EMAIL_FROM || 'TeamSync AI <no-reply@teamsync.ai>',
      to,
      subject,
      text,
      html,
    });
  },
};

const driver = process.env.EMAIL_DRIVER === 'smtp' ? smtpDriver : consoleDriver;

export const sendEmail = (options) => driver.send(options);

export const sendOtpEmail = (to, otp) =>
  sendEmail({
    to,
    subject: 'TeamSync AI — Your verification code',
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    html: `<h2>TeamSync AI</h2><p>Your verification code is <b style="font-size:20px">${otp}</b>. It expires in 10 minutes.</p>`,
  });

export const sendResetEmail = (to, resetUrl) =>
  sendEmail({
    to,
    subject: 'TeamSync AI — Reset your password',
    text: `Reset your password: ${resetUrl} (valid for 30 minutes)`,
    html: `<h2>TeamSync AI</h2><p><a href="${resetUrl}">Click here to reset your password</a>. Link is valid for 30 minutes.</p>`,
  });
