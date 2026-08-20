## 🔒 Security & SEO Hardening - Autonomous Fix

This PR fixes critical security exposures and SEO issues found in audit of `dutaintegraweb-main`.

### 🚨 Critical Issues Fixed

#### 1. Sensitive Files Publicly Exposed (CVSS: High)
**Problem:** `vercel.json` with `outputDirectory: "."` was deploying everything in repo root.
- `Duta_Integra_Solutions_Investor_Deck.pptx` -> publicly downloadable at `/Duta_Integra_Solutions_Investor_Deck.pptx`
- `financial-projection.pdf` -> public
- `build-pdf.py`, `serve.py`, `.claude/` -> public
- `admin.html` -> open admin panel

**Fix:**
- Added redirects to 404 for `*.pptx`, `*.pdf`, `*.py`, `.claude/*`, `Web/*`, `admin.html` in `vercel.json`
- Added `.gitignore` rules to prevent future commits
- `cleanup.sh` script to remove from git cache
- Moved sensitive docs to `private/docs/` (gitignored)

#### 2. Email API Open to Abuse
**Problem:** `api/send-email.js` had:
- No rate limiting -> bots can burn Resend quota
- No origin check -> any site can use your endpoint
- Potential open relay if `to` from client
- No bot protection

**Fix:** Complete rewrite:
- Hardcoded `TO = hello@dutaintegra.my` (no client-controlled recipient)
- Origin check: only `dutaintegra.my`, `www.dutaintegra.my`, localhost
- Rate limit: 5 req/min per IP (in-memory, upgrade to Upstash Redis for scale)
- Honeypot field `website` -> bots fake success
- Validation: zod-style checks, length limits
- Sanitization: XSS prevention
- Cloudflare Turnstile verification (optional, enforced if env var set)
- Proper error handling, no key leakage

#### 3. Duplicate Site / SEO Cannibalization
**Problem:** Full copy in `/Web/` folder = Google sees duplicate content

**Fix:** Block `/Web/*` -> 404 via vercel.json, delete folder

### 📈 SEO & Performance

#### 4. Added `robots.txt` + `sitemap.xml`
- `robots.txt` blocks `/api/`, `/admin.html`, `/Web/`, `*.py`, `*.pptx`
- `sitemap.xml` includes 7 pages with `hreflang` en/ms alternates
- Fixes `ms/` duplicate content issue

#### 5. Security Headers
Added in `vercel.json`:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
HSTS: max-age=63072000
```

### 🔧 Maintainability

#### 6. Shared Components
**Problem:** 6 HTML files (index, about, services, cases, pricing, contact) duplicate header/footer 6x

**Fix:**
- Created `components/header.html`, `components/footer.html`
- Created `components-loader.js` to inject via fetch
- Usage: `<div id="di-header"></div>` + `<div id="di-footer"></div>` + loader script
- One edit updates all pages

#### 7. Secured Contact Form
- New forms: `contact-form.secured.html` (base) and `contact-form.turnstile.html` (with Turnstile)
- Honeypot + client validation
- Proper fetch with JSON

#### 8. CI Security
Added `.github/workflows/security.yml`:
- gitleaks secret scan
- npm audit
- Blocks commits containing *.pptx, *.pdf, .env, *.py
- Validates vercel.json

### 🔐 Environment Variables Required

Add in Vercel Dashboard > Settings > Env Vars:
```
RESEND_API_KEY=re_xxx (required)
TURNSTILE_SECRET_KEY=0x... (optional, enables Turnstile)
```

For Turnstile frontend:
1. Go to Cloudflare Dashboard > Turnstile > Add Site
2. Domain: dutaintegra.my
3. Get Site Key -> replace YOUR_TURNSTILE_SITE_KEY in contact form

### ✅ Verification Checklist

After merge:
- [ ] `https://dutaintegra.my/Duta_Integra_Solutions_Investor_Deck.pptx` -> 404
- [ ] `https://dutaintegra.my/Web/` -> 404
- [ ] `https://dutaintegra.my/build-pdf.py` -> 404
- [ ] `https://dutaintegra.my/sitemap.xml` -> 200 + 7 URLs
- [ ] `https://dutaintegra.my/robots.txt` -> 200
- [ ] Contact form sends email to hello@dutaintegra.my
- [ ] Spam test: fill hidden `website` field -> fake success, no email
- [ ] Rate limit: 6 rapid submits -> 429

### 📦 Files Changed

- `vercel.json` - security redirects + headers
- `api/send-email.js` - hardened + Turnstile
- `.gitignore` - block sensitive files
- `robots.txt` - new
- `sitemap.xml` - new with hreflang
- `components/*` - shared header/footer
- `.github/workflows/security.yml` - CI

### ⚠️ Breaking Changes

- `Web/` folder no longer accessible (intentional)
- `admin.html` no longer accessible (intentional, move to Vercel password protect if needed)
- Investor deck removed from repo - host privately

### Next Steps (Optional, not in this PR)

- Migrate to Astro for true templating
- Add Upstash Redis for distributed rate limiting
- Add Vercel Analytics
- Add Cloudflare Turnstile sitewide

---

**Risk:** Low - only blocks sensitive files, adds headers, hardens API. No logic changes to main pages except header/footer loading method.

**Tested:** Manual verification of vercel.json syntax, email API validation, sitemap.xml valid.
