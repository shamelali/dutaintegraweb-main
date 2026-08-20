# Duta Integra - Team Security Guide

## For Developers

### Never commit:
- *.pptx, *.pdf (investor docs)
- .env, .env.local
- build-pdf.py, serve.py (dev scripts)
- .claude/ folder

They are now blocked by .gitignore AND by GitHub Actions CI. CI will fail PR if found.

### Contact Form Flow
```
User -> contact.html (Turnstile + honeypot) 
     -> POST /api/send-email.js 
     -> Origin check -> Rate limit -> Honeypot -> Turnstile verify -> Resend API -> hello@dutaintegra.my
```

### Local Dev
```bash
git clone https://github.com/shamelali/dutaintegraweb-main.git
cd dutaintegraweb-main
npm install
vercel env pull # pulls RESEND_API_KEY, TURNSTILE_SECRET_KEY
vercel dev
```

### Adding New Page
1. Copy template from index.html
2. Keep <div id="di-header"></div> and <div id="di-footer"></div>
3. Add URL to sitemap.xml with hreflang
4. No need to copy header/footer - loader handles it

## For Non-Developers (Business)

### Investor Deck
- Removed from GitHub (was public)
- Now in private/docs/ locally (not in git)
- Share via Google Drive with NDA link, not via website

### Emails
- All contact form emails go to hello@dutaintegra.my
- Reply-To is customer's email
- Rate limited: 5/min per IP, blocks spam

### SEO
- sitemap.xml auto-submitted to Google via robots.txt
- Submit manually: https://search.google.com/search-console -> Sitemaps -> https://dutaintegra.my/sitemap.xml
- Malay version: /ms/ with hreflang tags

## Incident Response

If investor deck leaked:
1. Rotate Resend API key immediately
2. BFG purge history: bfg --delete-files "*Investor_Deck*"
3. Force push: git push --force
4. Check Vercel deployment logs for downloads
