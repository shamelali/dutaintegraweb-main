# Duta Integra - Secured Deploy

## Security Fixes Applied (Autonomous)

### Critical
- [x] Blocked public access to *.pptx, *.pdf, *.py, .claude/, Web/, admin.html via vercel.json
- [x] Hardened api/send-email.js: rate limit 5/min, origin check, honeypot, validation, hardcoded TO
- [x] Added Turnstile bot protection (optional, enable via env vars)
- [x] New .gitignore prevents future leaks

### SEO
- [x] robots.txt blocks private paths
- [x] sitemap.xml with hreflang en/ms
- [x] Security headers: X-Frame-Options, HSTS, nosniff

### Maintainability
- [x] Shared header/footer components
- [x] Contact form secured
- [x] GitHub Actions security workflow

## Setup

1. **Vercel Env Vars** (Vercel Dashboard > Settings > Environment Variables):
```
RESEND_API_KEY=re_xxx
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA  # optional, from Cloudflare
```

2. **Turnstile** (optional but recommended):
   - Go to https://dash.cloudflare.com/?to=/:account/turnstile
   - Add site: dutaintegra.my
   - Get Site Key and Secret Key
   - Replace YOUR_TURNSTILE_SITE_KEY in contact form
   - Add TURNSTILE_SECRET_KEY to Vercel env

3. **Deploy**:
```bash
bash cleanup.sh
git add .
git commit -m "security: full autonomous fix"
git push origin main
```

## Verification
- https://dutaintegra.my/Duta_Integra_Solutions_Investor_Deck.pptx -> 404
- https://dutaintegra.my/Web/ -> 404
- https://dutaintegra.my/sitemap.xml -> 200
- https://dutaintegra.my/robots.txt -> 200
- Contact form -> sends email, blocks spam

## Next (optional)
- Migrate to Astro for true templating
- Add Upstash Redis for distributed rate limiting
- Add Vercel Analytics
