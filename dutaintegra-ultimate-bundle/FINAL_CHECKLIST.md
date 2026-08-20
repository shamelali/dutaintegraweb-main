# Duta Integra - Final Launch Checklist

## Security - DONE
- [x] vercel.json blocks *.pptx, *.pdf, *.py, .claude/, Web/, admin.html
- [x] .gitignore blocks sensitive files
- [x] api/send-email.js hardened: rate limit, origin check, honeypot, validation, hardcoded TO
- [x] Turnstile ready (optional env var)
- [x] cleanup.sh removes files from git cache
- [x] security.yml CI blocks future leaks

## SEO - DONE
- [x] robots.txt
- [x] sitemap.xml with hreflang en/ms
- [x] Security headers in vercel.json
- [x] Shared header/footer components

## TO DO - You (5 min each)

### 1. Deploy Fixed Files
```bash
unzip dutaintegra-final-bundle.zip
# copy files as per README_SECURE.md
git add .
git commit -F COMMIT_MESSAGE.txt
git push origin main
```

### 2. Vercel Env Vars
- RESEND_API_KEY=re_...
- TURNSTILE_SECRET_KEY=... (optional)

### 3. Rotate Keys (since repo was public)
- Resend dashboard -> API Keys -> Create new -> Delete old
- Update Vercel env with new key

### 4. Purge History (optional but recommended)
```bash
bfg --delete-files "*Investor_Deck*" --delete-files "financial-projection.pdf"
git push --force
```

### 5. Google Search Console
- Verify ownership (see GOOGLE_SEARCH_CONSOLE.md)
- Submit sitemap.xml
- Request indexing

### 6. Test
- https://dutaintegra.my/Duta_Integra_Solutions_Investor_Deck.pptx -> 404
- https://dutaintegra.my/Web/ -> 404
- https://dutaintegra.my/sitemap.xml -> 200
- https://dutaintegra.my/robots.txt -> 200
- Contact form -> email received

## Done!
Your site is now secure, SEO-ready, and maintainable.

Next improvements (when ready):
- Astro migration for true templating
- Upstash Redis for distributed rate limiting
- Vercel Analytics + Speed Insights
