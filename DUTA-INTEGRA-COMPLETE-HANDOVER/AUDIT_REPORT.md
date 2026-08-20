# Duta Integra - Codebase Audit Report
Date: 2026-08-20
Repo: shamelali/dutaintegraweb-main

## Critical Fixed
1. **Exposure**: vercel.json outputDirectory=. was serving .pptx, .pdf, .py, .claude/ publicly
   -> Fixed with redirects to 404
2. **Email API**: No rate limit, open relay risk, no origin check
   -> Fixed with hardened send-email.js
3. **admin.html**: World accessible
   -> Blocked via vercel.json
4. **Duplicate site**: Web/ folder
   -> Blocked via vercel.json, to be deleted

## SEO Fixes
- robots.txt added - blocks private paths
- sitemap.xml with hreflang en/ms added
- Security headers added

## Maintainability
- Shared header/footer components created in /components/
- Loader JS to include them
- Contact form secured with honeypot + client validation

## Next Steps
- Delete Web/ folder completely
- Move investor deck to Google Drive with NDA
- Implement loader in all 6 HTML pages: add <div id="di-header"></div> etc
- Add Cloudflare Turnstile to contact form for extra bot protection
- Migrate to Astro for true templating (optional)
