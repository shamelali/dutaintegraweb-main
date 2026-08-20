# DUTA INTEGRA - COMPLETE HANDOVER
## Website Security & SEO Fix - Autonomous Audit

**Date:** 20 Aug 2026
**Repo:** https://github.com/shamelali/dutaintegraweb-main (81 commits, public)
**Site:** https://dutaintegra.my
**Location:** Hutan Melintang, Perak, Malaysia
**Auditor:** Meta AI
**Status:** FIXES GENERATED, READY TO DEPLOY
**Priority:** CRITICAL

---

## 1. EXECUTIVE SUMMARY

Your website deployment was exposing sensitive investor documents publicly. Anyone could download your investor deck at `dutaintegra.my/Duta_Integra_Solutions_Investor_Deck.pptx`.

**Root cause:** `vercel.json` had `outputDirectory: "."` which tells Vercel to deploy your entire repo root, including .pptx, .pdf, .py, .claude/ folder, Web/ duplicate, admin.html.

**Fix:** 22 files generated to block exposures, harden email API, add SEO, fix maintainability. Deployment time: 1 hour for critical, 2 hours total.

**No code changes to business logic. Only security + SEO hardening.**

---

## 2. WHAT WAS FOUND (Audit Results)

### CRITICAL 🔴
1. **Investor deck public** - `Duta_Integra_Solutions_Investor_Deck.pptx` at /pptx URL
2. **Financials public** - `financial-projection.pdf` at /pdf URL
3. **Dev scripts public** - `build-pdf.py`, `serve.py` downloadable
4. **Claude config public** - `.claude/` folder accessible
5. **Duplicate site** - `Web/` folder = full copy, SEO cannibalization
6. **Admin panel open** - `admin.html` world accessible
7. **Email API open** - No rate limit, no origin check, potential open relay, no bot protection

### MEDIUM 🟡
8. **No robots.txt** - Google indexing private paths
9. **No sitemap.xml** - No hreflang for EN/MS, bad SEO
10. **6x header/footer duplication** - index, about, services, cases, work, pricing, contact all duplicate code
11. **No security headers** - No HSTS, X-Frame-Options, etc
12. **No CI security** - Sensitive files can be committed again
13. **No .gitignore for sensitive** - pptx, pdf not ignored

### LOW 🟢
14. **No security.txt** - Best practice missing
15. **No Turnstile** - Contact form open to bot spam

---

## 3. WHAT WAS FIXED (Files Generated)

All in `dutaintegra-ultimate-bundle.zip` (22 files):

### Security Fixes (7 files)
| File | Fixes | Destination |
|------|-------|-------------|
| `vercel.json` | Blocks *.pptx, *.pdf, *.py, .claude/, Web/, admin.html -> 404, adds security headers (DENY, nosniff, HSTS, etc), cache for assets | root/vercel.json |
| `send-email.js` | Base hardened version: hardcoded TO, origin check, rate limit 5/min, honeypot, validation | api/send-email.js |
| `send-email.turnstile.js` | Same + Turnstile verification (RECOMMENDED) | api/send-email.js (use this one) |
| `.gitignore.fixed` | Blocks *.pptx, *.pdf, .env, .py, .claude/, Web/, private/ | .gitignore |
| `security.yml` | GitHub Actions: gitleaks, npm audit, blocks sensitive file commits | .github/workflows/security.yml |
| `cleanup.sh` | Removes sensitive files from git cache | root/cleanup.sh |
| `autofix.sh` | One-command autonomous fix script | root/autofix.sh |

### SEO Fixes (3 files)
| File | Fixes | Destination |
|------|-------|-------------|
| `robots.txt` | Blocks /api/, /admin.html, /Web/, *.py, *.pptx, points to sitemap | root/robots.txt |
| `sitemap.xml` | 7 URLs with hreflang en/ms alternates, fixes ms/ duplicate | root/sitemap.xml |
| `security.txt` | Security contact, best practice | .well-known/security.txt |

### Maintainability Fixes (3 files)
| File | Fixes | Destination |
|------|-------|-------------|
| `header.html` | Shared header component | components/header.html |
| `footer.html` | Shared footer component | components/footer.html |
| `components-loader.js` | Loads header/footer via fetch, fixes 6x duplication | components/components-loader.js |

### Contact Form Fixes (2 files)
| File | Fixes |
|------|-------|
| `contact-form.secured.html` | Secured form: honeypot + validation + fetch |
| `contact-form.turnstile.html` | Same + Turnstile widget (RECOMMENDED) |

### Documentation (7 files)
- `README_SECURE.md` - Setup guide
- `AUDIT_REPORT.md` - Audit findings
- `PR_DESCRIPTION.md` - PR description ready to paste
- `COMMIT_MESSAGE.txt` - Commit message
- `TURNSTILE_SETUP.md` - Turnstile 2-min setup
- `TEAM_SECURITY_GUIDE.md` - Team guide
- `GOOGLE_SEARCH_CONSOLE.md` - SEO launch
- `FINAL_CHECKLIST.md` - Launch checklist
- `DEVELOPER_HANDOFF.md` - Developer handoff (this is summary of that + more)
- `WHATSAPP_MESSAGE.txt` / `SLACK_MESSAGE.txt` - Messages for dev

---

## 4. DEPLOYMENT - How to Fix Directly

### Option A: One-Command (Recommended, 5 min)

```bash
cd dutaintegraweb-main

# Unzip bundle
unzip ~/Downloads/dutaintegra-ultimate-bundle.zip

# Copy files
cp vercel.json ./vercel.json
cp send-email.turnstile.js ./api/send-email.js
cp .gitignore.fixed ./.gitignore
cp robots.txt sitemap.xml ./
mkdir -p components .well-known .github/workflows private/docs
cp header.html footer.html components-loader.js components/
cp security.txt .well-known/security.txt
cp security.yml .github/workflows/security.yml

# Autonomous fix
bash autofix.sh

# Push
git add .
git commit -F COMMIT_MESSAGE.txt
git push origin main
```

### Option B: Manual Step-by-Step (See DEVELOPER_HANDOFF.md)

### After Push: Vercel Env Vars (5 min)
Vercel Dashboard > dutaintegraweb-main > Settings > Environment Variables:
- `RESEND_API_KEY` = re_xxx (from resend.com)
- `TURNSTILE_SECRET_KEY` = 0x... (from dash.cloudflare.com Turnstile, optional but recommended)

For Turnstile frontend: Replace `YOUR_TURNSTILE_SITE_KEY` in contact.html with real site key from Cloudflare.

---

## 5. VERIFICATION - After Deploy

### Automated
```bash
curl -I https://dutaintegra.my/Duta_Integra_Solutions_Investor_Deck.pptx # expect 404
curl -I https://dutaintegra.my/Web/ # expect 404
curl -I https://dutaintegra.my/build-pdf.py # expect 404
curl -I https://dutaintegra.my/sitemap.xml # expect 200
curl -I https://dutaintegra.my/robots.txt # expect 200
```

### Manual
- [ ] Contact form submit -> email received at hello@dutaintegra.my
- [ ] Fill hidden `website` field (honeypot) -> fake success, no email (blocks bots)
- [ ] Rapid 6 submits -> 6th returns 429 Too Many Requests (rate limit)
- [ ] GitHub Actions: Go to Actions tab -> Security Audit workflow passes

### SEO
- [ ] Submit sitemap to Google Search Console (see GOOGLE_SEARCH_CONSOLE.md)
- [ ] Request indexing for /, /services.html, /contact.html
- [ ] After 48h: Check Search Console -> 7 pages indexed, Web/ and pptx not indexed

---

## 6. IMPORTANT - Rotate Keys & Purge History

### Rotate Resend Key (Do Today)
Since repo was public, old key may be in git history:

1. Resend Dashboard -> API Keys -> Create new key
2. Delete old key
3. Update Vercel env var RESEND_API_KEY
4. Redeploy

### Purge Git History (Do When Team Free)
Investor deck still in git history even after `git rm --cached`:

```bash
brew install bfg
bfg --delete-files "*Investor_Deck.pptx" --delete-files "financial-projection.pdf" --delete-files "fabio-oyXis2kALVg-unsplash.jpg"
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push origin main --force
```

Warning: Force push rewrites history. Coordinate with team first.

---

## 7. NEXT STEPS (Optional, Future)

### This Week
- Update contact.html with Turnstile form
- Add shared header/footer to all pages (fixes duplication)
- Submit sitemap to Google + Bing

### Next Month
- Migrate to Astro for true templating (currently static HTML duplication)
- Add Upstash Redis for distributed rate limiting (currently in-memory)
- Add Vercel Analytics + Speed Insights
- Add Cloudflare Turnstile invisible mode sitewide

---

## 8. FILES - Download Links

**Ultimate Bundle (22 files):** dutaintegra-ultimate-bundle.zip
**Handoff Doc:** DEVELOPER_HANDOFF.md
**WhatsApp Message:** WHATSAPP_MESSAGE.txt
**Slack Message:** SLACK_MESSAGE.txt
**Commit Message:** COMMIT_MESSAGE.txt
**PR Description:** PR_DESCRIPTION.md

All files generated in this chat are downloadable via container links.

---

## 9. CONTACT & SUPPORT

- Turnstile setup: See TURNSTILE_SETUP.md (2 min)
- Team security: See TEAM_SECURITY_GUIDE.md
- SEO launch: See GOOGLE_SEARCH_CONSOLE.md
- Final checklist: See FINAL_CHECKLIST.md

---

## 10. TIMELINE

| Task | Time | Priority | When |
|------|------|----------|------|
| Critical fix (block exposures, harden email) | 1 hour | CRITICAL | TODAY |
| SEO + components | 1 hour | HIGH | This week |
| History purge | 30 min | MEDIUM | When team free |
| Astro migration | 1-2 days | LOW | Next month |

---

**Total effort to secure site: 1 hour today. All files ready.**

**Prepared:** 20 Aug 2026
**By:** Meta AI Autonomous Fix
**For:** Duta Integra Solutions, Hutan Melintang, Perak, Malaysia
