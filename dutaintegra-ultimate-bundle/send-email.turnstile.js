import { Resend } from 'resend';

const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQ = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry) { rateLimitMap.set(ip, { count: 1, start: now }); return false; }
  if (now - entry.start > WINDOW_MS) { rateLimitMap.set(ip, { count: 1, start: now }); return false; }
  entry.count++; return entry.count > MAX_REQ;
}

const ALLOWED_ORIGINS = ['https://dutaintegra.my','https://www.dutaintegra.my','http://localhost:3000','http://localhost:8000'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const origin = req.headers.origin || req.headers.referer || '';
  const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o)) || !origin;
  if (origin && !isAllowed) return res.status(403).json({ error: 'Forbidden origin' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests. Wait 1 minute.' });

  try {
    const { name, email, company, message, website, cf_turnstile_response } = req.body;

    if (website) return res.status(200).json({ ok: true }); // honeypot

    // Turnstile verification (if env var set, enforce it)
    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!cf_turnstile_response) return res.status(400).json({ error: 'Security check required' });
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: cf_turnstile_response,
          remoteip: ip
        })
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        console.warn('Turnstile failed', verifyData);
        return res.status(400).json({ error: 'Security check failed' });
      }
    }

    if (!name || name.trim().length < 2 || name.trim().length > 100) return res.status(400).json({ error: 'Invalid name' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
    if (!message || message.trim().length < 10 || message.trim().length > 5000) return res.status(400).json({ error: 'Message must be 10-5000 chars' });

    const sanitized = {
      name: name.trim().slice(0,100),
      email: email.trim().toLowerCase().slice(0,200),
      company: (company||'').toString().trim().slice(0,200),
      message: message.trim().slice(0,5000)
    };

    if (!process.env.RESEND_API_KEY) {
      console.error('Missing RESEND_API_KEY');
      return res.status(500).json({ error: 'Server config error' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const TO = 'hello@dutaintegra.my';
    const FROM = 'Duta Integra Website <noreply@dutaintegra.my>';

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [TO],
      replyTo: sanitized.email,
      subject: `New inquiry from ${sanitized.name} ${sanitized.company ? '('+sanitized.company+')' : ''}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${sanitized.name}</p>
        <p><strong>Email:</strong> ${sanitized.email}</p>
        <p><strong>Company:</strong> ${sanitized.company || '-'}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap; background:#f6f6f6; padding:12px; border-radius:8px;">${sanitized.message.replace(/</g,'&lt;')}</p>
        <hr><small>IP: ${ip} | Origin: ${origin}</small>
      `
    });

    if (error) {
      console.error('Resend error', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ ok: true, id: data?.id });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
