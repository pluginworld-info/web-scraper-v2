import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Hostinger SSL fix
  },
  connectionTimeout: 20000,
});

export async function sendPriceAlertEmail(email: string, title: string, currentPrice: number, targetPrice: number, url: string) {
  const mail = {
    from: `"PluginWorld Alerts" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Price Alert Triggered: ${title}`,
    text: `
Good news!

Your price alert has been triggered.

Product:
${title}

Current price:
$${currentPrice}

Your target price:
$${targetPrice}

View product:
${url}

— PluginWorld
`.trim(),
  };

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await transporter.sendMail(mail);
      console.log(`✅ Email sent to ${email}`);
      return true;
    } catch (err: any) {
      console.error(`❌ Attempt ${attempt} failed: ${err.message}`);
      if (attempt === MAX_RETRIES) throw err;
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
}