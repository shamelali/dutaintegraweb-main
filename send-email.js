import { Resend } from 'resend';

// Simple in-memory rate limit (use Upstash for prod scale)
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 min
const MAX_REQ = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }
  if (now - entry.start > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count++;
  return entry.count > MAX_REQ;
}

const ALLOWED_ORIGINS = [
  'https://dutaintegra.my',
  'https://www.dutaintegra.my',
  'http://localhost:3000',
  'http://localhost:8000'
];

export default async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Origin check
  const origin = req.headers.origin || req.headers.referer || '';
  const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o)) || !origin;
  // Allow same-origin with no origin header (form POST), but block foreign
  if (origin && !isAllowed) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  // Rate limit by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait 1 minute.' });
  }

  try {
    const { name, email, company, message, website } = req.body;

    // Honeypot - if website field filled, it's a bot
    if (website) {
      return res.status(200).json({ ok: true }); // fake success
    }

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (!message || typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 5000) {
      return res.status(400).json({ error: 'Message must be 10-5000 chars' });
    }

    const sanitized = {
      name: name.trim().slice(0, 100),
      email: email.trim().toLowerCase().slice(0, 200),
      company: (company || '').toString().trim().slice(0, 200),
      message: message.trim().slice(0, 5000)
    };

    if (!process.env.RESEND_API_KEY) {
      console.error('Missing RESEND_API_KEY');
      return res.status(500).json({ error: 'Server config error' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // TO is hardcoded - never trust client
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

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
