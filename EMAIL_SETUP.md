# Email setup (contact form → Resend)

The contact form posts to `POST /api/send-email`, a Vercel serverless function powered by [Resend](https://resend.com).

## What you get

1. **Admin email** → `hello@dutaintegra.my` with the enquiry details  
2. **Visitor auto-reply** → confirmation to the person who submitted  
3. **WhatsApp fallback** → if the API is down or the key is missing, the browser opens WhatsApp with a pre-filled message  

## One-time setup (≈ 10 minutes)

### 1. Create a Resend account
1. Go to [https://resend.com](https://resend.com) and sign up  
2. Open **API Keys** → **Create API Key**  
3. Copy the key (`re_…`)

### 2. Verify your sending domain
1. In Resend → **Domains** → **Add Domain** → `dutaintegra.my`  
2. Add the DNS records Resend shows (SPF, DKIM, optionally DMARC) at your DNS host  
3. Wait until the domain status is **Verified**  

Until the domain is verified you can still test with:
```
EMAIL_FROM=Duta Integra Website <onboarding@resend.dev>
EMAIL_TO=your-personal-email@example.com
```
(Resend only delivers test mail to your own account email in that mode.)

### 3. Add the key on Vercel
```bash
# Production + Preview + Development
vercel env add RESEND_API_KEY
```
Or in the dashboard:  
**Project → Settings → Environment Variables → RESEND_API_KEY**

Optional:
| Variable | Default | Purpose |
|----------|---------|---------|
| `EMAIL_FROM` | `Duta Integra Website <noreply@dutaintegra.my>` | From header (must be on a verified domain) |
| `EMAIL_TO` | `hello@dutaintegra.my` | Inbox (comma-separate for multiple) |
| `EMAIL_AUTOREPLY` | `true` | Set `false` to disable visitor confirmation |

Redeploy after adding env vars:
```bash
vercel --prod
```

### 4. Local test (optional)
```bash
cp .env.example .env.local
# paste RESEND_API_KEY into .env.local
npm install
npx vercel dev
# open http://localhost:3000/contact and submit the form
```

## Flow diagram

```
Browser contact form
        │  POST /api/send-email  { name, email, service, … }
        ▼
api/send-email.js  ── Resend ──► hello@dutaintegra.my
                 └── (optional) ► visitor confirmation
        │
        └── on failure ──► WhatsApp deep-link fallback
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Toast says email unavailable / WhatsApp opens | `RESEND_API_KEY` missing on Vercel — add it and redeploy |
| Resend error “domain not verified” | Finish DNS verification for `dutaintegra.my` |
| Mail goes to spam | Ensure SPF + DKIM are green in Resend; add a DMARC record |
| 405 / 404 on `/api/send-email` | Confirm deploy includes the `api/` folder (root `vercel.json`) |

## Security notes

- Honeypot field (`website`) drops bot submissions silently  
- HTML is escaped before injection into email templates  
- Field length limits on both client and server  
- API key never ships to the browser — only on the server  
