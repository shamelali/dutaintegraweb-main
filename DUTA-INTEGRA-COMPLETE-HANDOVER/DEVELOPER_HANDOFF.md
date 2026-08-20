# DEVELOPER HANDOFF - Duta Integra Website Security Fix
**Repo:** shamelali/dutaintegraweb-main (public, 81 commits)
**Site:** https://dutaintegra.my
**Date:** 2026-08-20
**Priority:** CRITICAL - Investor docs publicly exposed
**Prepared by:** Meta AI Autonomous Audit

---

## 🚨 CRITICAL - Why This Is Urgent

`vercel.json` has `outputDirectory: "."` which deploys ENTIRE repo root. Currently public:

- `https://dutaintegra.my/Duta_Integra_Solutions_Investor_Deck.pptx` - Investor deck downloadable
- `https://dutaintegra.my/financial-projection.pdf` - Financials public
- `https://dutaintegra.my/build-pdf.py`, `serve.py` - Dev scripts public
- `https://dutaintegra.my/.claude/` - Claude config public
- `https://dutaintegra.my/Web/` - Duplicate site
- `https://dutaintegra.my/admin.html` - Open admin page

**Impact:** Anyone can download investor deck. Must fix today.

---

## 📦 Deliverables Provided

All fixed files in `dutaintegra-ultimate-bundle.zip` (22 files):

| File | Action | Destination |
|------|--------|-------------|
| vercel.json | REPLACE | root/vercel.json |
| send-email.turnstile.js | REPLACE | api/send-email.js |
| .gitignore.fixed | REPLACE | .gitignore |
| robots.txt | ADD | root/robots.txt |
| sitemap.xml | ADD | root/sitemap.xml |
| header.html, footer.html, components-loader.js | ADD | components/ |
| security.txt | ADD | .well-known/security.txt |
| security.yml | ADD | .github/workflows/security.yml |
| contact-form.turnstile.html | REFERENCE | update contact.html |
| cleanup.sh, autofix.sh | RUN | root/ |

Plus docs: PR_DESCRIPTION.md, COMMIT_MESSAGE.txt, TURNSTILE_SETUP.md, etc.

---

## ✅ Tasks - In Order

### Task 1: Secure Deploy (30 min)
1. Unzip bundle in repo root
2. Copy:
   ```bash
   cp vercel.json ./vercel.json
   cp send-email.turnstile.js ./api/send-email.js
   cp .gitignore.fixed ./.gitignore
   cp robots.txt sitemap.xml ./
   mkdir -p components .well-known .github/workflows private/docs
   cp header.html footer.html components-loader.js components/
   cp security.txt .well-known/security.txt
   cp security.yml .github/workflows/security.yml
   ```
3. Run:
   ```bash
   bash cleanup.sh  # removes sensitive files from git cache
   ```
4. Move sensitive docs:
   ```bash
   mv Duta_Integra_Solutions_Investor_Deck.pptx private/docs/
   mv financial-projection.pdf private/docs/
   ```
   `private/` is gitignored, stays local only. Share investor deck via Google Drive + NDA.

### Task 2: Fix Email API (already done via file replace)
New `api/send-email.js` includes:
- Hardcoded TO = hello@dutaintegra.my (no open relay)
- Origin check: only dutaintegra.my allowed
- Rate limit: 5/min per IP
- Honeypot field: website
- Validation + sanitization
- Turnstile verification (if env var set)
- Proper error handling

No further code needed. Just ensure env vars set in Vercel.

### Task 3: Update Contact Form (15 min)
In `contact.html`, replace `<form>` with contents of `contact-form.turnstile.html`:
- Adds honeypot input
- Adds Turnstile widget div
- Adds JS fetch logic with Turnstile token
- Replace `YOUR_TURNSTILE_SITE_KEY` with real site key

### Task 4: Fix Duplicate Header/Footer (30 min) - Optional but recommended
For each page (index.html, about.html, services.html, cases.html, work.html, pricing.html, contact.html):

Replace:
```html
<header>...</header>
```
With:
```html
<div id="di-header"></div>
```

Replace:
```html
<footer>...</footer>
```
With:
```html
<div id="di-footer"></div>
<script src="/components/components-loader.js"></script>
```

Actually path: `/components-loader.js` or `/components/components-loader.js` depending where you placed. Use `/components/components-loader.js` if in components folder, or move loader to root.

### Task 5: Env Vars in Vercel (5 min)
Vercel Dashboard > dutaintegraweb-main > Settings > Environment Variables:

- `RESEND_API_KEY` = `re_...` (from resend.com dashboard)
- `TURNSTILE_SECRET_KEY` = `0x...` (from dash.cloudflare.com Turnstile, optional)

For Turnstile frontend, also need Site Key in contact form.

### Task 6: Commit & Push (5 min)
```bash
git add .
git commit -F COMMIT_MESSAGE.txt
git push origin main
```

Vercel auto-deploys.

### Task 7: Verify (10 min)
```bash
curl -I https://dutaintegra.my/Duta_Integra_Solutions_Investor_Deck.pptx # expect 404
curl -I https://dutaintegra.my/Web/ # expect 404
curl -I https://dutaintegra.my/sitemap.xml # expect 200
curl -I https://dutaintegra.my/robots.txt # expect 200
```

Manual:
- Contact form submit -> check hello@dutaintegra.my inbox
- Try spam: fill hidden website field -> should fake success, no email
- Try rapid 6 submits -> 6th should 429 Too Many Requests

### Task 8: SEO (15 min)
1. Google Search Console: https://search.google.com/search-console
   - Add property dutaintegra.my
   - Verify via DNS TXT
   - Submit sitemap.xml
   - Request indexing for /, /services.html, /contact.html
2. Bing Webmaster: same sitemap

See GOOGLE_SEARCH_CONSOLE.md for detailed steps.

### Task 9: Rotate Keys (5 min) - Important
Since repo was public, old Resend key may be in git history.

- Resend Dashboard -> API Keys -> Create new -> Delete old
- Update Vercel env var with new key
- Redeploy

### Task 10 (Optional): Purge Git History
Investor deck still in git history even after rm.

```bash
# Install BFG
brew install bfg  # or pip install bfg-repo-cleaner

# Purge
bfg --delete-files "*Investor_Deck.pptx" --delete-files "financial-projection.pdf" --delete-files "fabio-oyXis2kALVg-unsplash.jpg"
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push origin main --force
```

Warning: Force push rewrites history. Coordinate with team.

---

## 🔧 Technical Details

### vercel.json Changes
- Added redirects: *.pptx, *.pdf, *.py, .claude/*, Web/*, admin.html, .env* -> 404
- Added security headers: DENY, nosniff, HSTS, etc
- Added cache header for /assets/*
- Functions maxDuration 10s

### Email API Changes
Old: No protection, client could control TO, no rate limit
New: Hardened, see Task 2

### SEO Changes
- robots.txt blocks private paths
- sitemap.xml with 7 URLs + hreflang en/ms
- security.txt in .well-known/

---

## 📋 Acceptance Criteria

- [ ] https://dutaintegra.my/Duta_Integra_Solutions_Investor_Deck.pptx returns 404
- [ ] https://dutaintegra.my/Web/ returns 404
- [ ] https://dutaintegra.my/build-pdf.py returns 404
- [ ] https://dutaintegra.my/sitemap.xml returns 200 with 7 URLs
- [ ] https://dutaintegra.my/robots.txt returns 200
- [ ] Contact form sends email
- [ ] Contact form blocks honeypot
- [ ] Contact form rate limits after 5 rapid submits
- [ ] GitHub Actions security.yml passes
- [ ] No *.pptx, *.pdf in git ls-files

---

## 📞 Questions?

- Turnstile setup: See TURNSTILE_SETUP.md
- Security: See TEAM_SECURITY_GUIDE.md
- Deploy: See FINAL_CHECKLIST.md
- PR description: See PR_DESCRIPTION.md

---

## ⏱️ Estimated Time

Total: ~2 hours
- Critical fix (Tasks 1-3, 5-7, 9): 1 hour - DO TODAY
- SEO + components (Tasks 4, 8): 1 hour - This week
- History purge (Task 10): 30 min - When team available

---

**Bundle:** dutaintegra-ultimate-bundle.zip (22 files)
**Commit message:** COMMIT_MESSAGE.txt
