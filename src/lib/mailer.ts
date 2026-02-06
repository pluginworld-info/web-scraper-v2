import nodemailer from 'nodemailer';
import { prisma } from '@/lib/db/prisma';

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, 
  },
  connectionTimeout: 20000,
});

export async function sendPriceAlertEmail(
  email: string, 
  title: string, 
  currentPrice: number, 
  targetPrice: number, 
  url: string
) {
  // 1. FETCH DYNAMIC TEMPLATE FROM DATABASE
  const template = await prisma.emailTemplate.findFirst();
  
  // Fallback content in case the DB is empty (failsafe)
  const defaultSubject = `Price Alert: ${title} is now $${currentPrice.toFixed(2)}`;
  const defaultBody = `<p>Good news! Your price alert for <strong>${title}</strong> has been triggered.</p>`;

  const rawSubject = template?.subject || defaultSubject;
  const rawBody = template?.bodyHtml || defaultBody;

  // 2. VARIABLE INJECTION LOGIC
  // Replaces {{tag}} with actual product data
  const replaceVars = (str: string) => {
    return str
      .replace(/{{product_name}}/g, title)
      .replace(/{{current_price}}/g, `$${currentPrice.toFixed(2)}`)
      .replace(/{{target_price}}/g, `$${targetPrice.toFixed(2)}`)
      .replace(/{{url}}/g, url);
  };

  const finalSubject = replaceVars(rawSubject);
  const finalBody = replaceVars(rawBody);

  // 3. CONSTRUCT RESPONSIVE HTML STRUCTURE
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .content-body { padding: 30px; }
          .cta-button { 
            display: inline-block; 
            background-color: #ffa600; 
            color: #ffffff !important; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 50px; 
            font-weight: 900; 
            text-transform: uppercase; 
            letter-spacing: 1px;
            font-size: 14px;
            margin: 20px 0;
          }
          img { max-width: 100%; height: auto; display: block; }
          .footer { font-size: 12px; color: #888888; text-align: center; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          ${template?.headerImageUrl ? `<img src="${template.headerImageUrl}" alt="Header" />` : ''}
          
          <div class="content-body">
            ${finalBody}
            
            <div style="text-align: center;">
              <a href="${url}" class="cta-button">View Deal Now</a>
            </div>
          </div>

          ${template?.footerImageUrl ? `<img src="${template.footerImageUrl}" alt="Footer" />` : ''}
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} PluginWorld. All rights reserved.</p>
            <p>You received this because you set a price alert for ${title}.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const mail = {
    from: `"PluginWorld Alerts" <${process.env.SMTP_USER}>`,
    to: email,
    subject: finalSubject,
    html: htmlContent, // Switched to HTML
    // Keep text fallback for accessibility
    text: `Good news! Your price alert for ${title} was triggered. Current Price: $${currentPrice}. View here: ${url}`
  };

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await transporter.sendMail(mail);
      console.log(`✅ Dynamic Email sent to ${email}`);
      return true;
    } catch (err: any) {
      console.error(`❌ Attempt ${attempt} failed: ${err.message}`);
      if (attempt === MAX_RETRIES) throw err;
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
}