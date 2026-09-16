import nodemailer from 'nodemailer';

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
  });
}

export async function sendReminderEmail(
  toEmail: string,
  userName: string,
  inactiveDays: number,
) {
  const subject =
    process.env.REMINDER_SUBJECT || 'We miss you at Twenty CRM';
  const bodyTemplate =
    process.env.REMINDER_BODY ||
    '<p>Hi {{userName}},</p><p>You haven\'t logged in for {{inactiveDays}} days. We\'d love to see you back!</p>';

  const html = bodyTemplate
    .replace(/\{\{userName\}\}/g, userName)
    .replace(/\{\{inactiveDays\}\}/g, String(inactiveDays));

  const driver = process.env.MAIL_DRIVER || 'log';

  if (driver === 'log') {
    console.log(`[Mailer] [LOG MODE] To: ${toEmail}`);
    console.log(`[Mailer] Subject: ${subject}`);
    console.log(`[Mailer] Body: ${html}`);
    return true;
  }

  const from = process.env.SMTP_SENDER || process.env.SMTP_FROM || 'noreply@twenty-inactivity.local';

  console.log(`[Mailer] Sending reminder to ${toEmail}...`);

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      html,
    });

    console.log(`[Mailer] Reminder sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error(`[Mailer] Failed to send to ${toEmail}:`, err);
    return false;
  }
}
