async send({ to, subject, text, html }) {
  try {
    console.log("📧 Sending email to:", to);

    const info = await this.getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });

    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ EMAIL SEND FAILED");
    console.error(err);
    throw err;
  }
}
