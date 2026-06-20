import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, company, email, phone, service, message } = req.body;

  // Validate required fields
  if (!name || !email || !service) {
    return res.status(400).json({ error: 'Name, email, and service are required.' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Duta Integra Website <noreply@dutaintegra.my>',
      to: ['hello@dutaintegra.my'],
      replyTo: email,
      subject: `New Contact Form Submission - ${service}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0B1D3A, #1565C0); color: white; padding: 24px; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 20px; }
            .header p { margin: 4px 0 0; opacity: 0.8; font-size: 13px; }
            .content { background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 16px; }
            .field-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; margin-bottom: 4px; }
            .field-value { font-size: 15px; color: #1e293b; background: white; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; }
            .field-value.highlight { border-left: 3px solid #00B4FF; font-weight: 600; }
            .message-box { background: white; padding: 16px; border-radius: 6px; border: 1px solid #e2e8f0; white-space: pre-wrap; }
            .footer { text-align: center; padding: 16px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📬 New Contact Form Submission</h1>
            <p>Submitted via dutaintegra.my</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="field-label">Name</div>
              <div class="field-value highlight">${name}</div>
            </div>
            ${company ? `
            <div class="field">
              <div class="field-label">Company</div>
              <div class="field-value">${company}</div>
            </div>` : ''}
            <div class="field">
              <div class="field-label">Email</div>
              <div class="field-value"><a href="mailto:${email}">${email}</a></div>
            </div>
            ${phone ? `
            <div class="field">
              <div class="field-label">Phone / WhatsApp</div>
              <div class="field-value">${phone}</div>
            </div>` : ''}
            <div class="field">
              <div class="field-label">Service Interested In</div>
              <div class="field-value highlight">${service}</div>
            </div>
            ${message ? `
            <div class="field">
              <div class="field-label">Message</div>
              <div class="message-box">${message}</div>
            </div>` : ''}
          </div>
          <div class="footer">
            This message was sent from the Duta Integra Solutions contact form.
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: error.message || 'Failed to send email.' });
    }

    return res.status(200).json({ success: true, id: data?.id });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}
