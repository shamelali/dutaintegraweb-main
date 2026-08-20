# Cloudflare Turnstile Setup Guide - Duta Integra

## Why Turnstile?
Free, privacy-friendly CAPTCHA alternative. Blocks 99% of bot spam on contact form without annoying users.

## Step 1: Create Turnstile Site (2 min)

1. Go to https://dash.cloudflare.com/ -> Log in -> Turnstile (left sidebar)
   Or direct: https://dash.cloudflare.com/?to=/:account/turnstile

2. Click "Add site"
   - Site name: dutaintegra.my
   - Domain: dutaintegra.my
   - Widget Mode: Managed (recommended)
   - Click Create

3. You get:
   - SITE KEY: 0x4AAAAAA... (public, goes in frontend)
   - SECRET KEY: 0x4AAAAAA... (private, goes in backend)

## Step 2: Frontend (contact.html)

Replace YOUR_TURNSTILE_SITE_KEY in contact-form.turnstile.html:

```html
<div class="cf-turnstile" data-sitekey="0x4AAAAAAAYOUR_SITE_KEY_HERE" data-theme="light"></div>
```

Add script (already in file):
```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

## Step 3: Backend (Vercel)

1. Vercel Dashboard -> Your Project (dutaintegraweb-main) -> Settings -> Environment Variables
2. Add:
   - Name: TURNSTILE_SECRET_KEY
   - Value: your secret key from step 1
   - Environment: Production, Preview, Development
3. Save -> Redeploy (Vercel will auto-redeploy)

Also ensure:
```
RESEND_API_KEY=re_xxx
```

## Step 4: Test

1. Local test:
```bash
vercel env pull
npm install
# set keys in .env.local
vercel dev
# Open http://localhost:3000/contact.html
# Submit form - should show Turnstile widget
```

2. Production test:
- Go to https://dutaintegra.my/contact.html
- You should see Turnstile widget
- Fill form -> submit -> should get success message
- Check hello@dutaintegra.my inbox

3. Bot test:
- Fill hidden website field (inspect, remove display:none, fill it) -> should get fake success, no email

## Step 5: (Optional) - Turnstile in invisible mode

If you want invisible Turnstile (no widget, auto):

```html
<div class="cf-turnstile" data-sitekey="YOUR_KEY" data-size="invisible" data-callback="onTurnstileSuccess"></div>
```

## Troubleshooting

- Error "Security check required" -> Turnstile token missing, check sitekey
- Error "Security check failed" -> Secret key wrong or token expired (tokens valid 5 min)
- Widget not showing -> Check sitekey, domain must match exactly (dutaintegra.my)
- Localhost not working -> Add localhost to Turnstile allowed domains in Cloudflare dashboard

## Costs

- Free: Unlimited requests, 1M/month included
- No credit card needed

## Security Note

- SITE KEY is public - safe to commit to GitHub
- SECRET KEY is private - NEVER commit, only in Vercel env vars
- This setup already blocks if secret key not set (works without Turnstile too via honeypot + rate limit)
