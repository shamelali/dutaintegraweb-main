# Cloudflare Pages Migration - Complete

## ✅ Migration Status
All required files for Cloudflare Pages deployment have been successfully created:

### ✅ Files Created:
- `public/_redirects` - SPA fallback + legacy path redirects
- `public/_headers` - Security headers + caching rules
- `wrangler.toml` - Cloudflare Pages configuration
- `functions/api/[[path]].js` - Cloudflare Functions entry point
- `server/handler-cloudflare.mjs` - API router (Supabase-only)
- All Supabase-only server modules:
  - `server/enquiries-cloudflare.mjs`
  - `server/clients-cloudflare.mjs`
  - `server/tickets-cloudflare.mjs`
  - `server/digest-cloudflare.mjs`
  - `server/portal-cloudflare.mjs`

### ✅ Package.json Updated:
```json
"cf:preview": "wrangler pages dev public --port 8788 --ip 127.0.0.1",
"cf:deploy": "wrangler pages deploy public --project-name=dutaintegra",
"cf:build": "npm --prefix web-new ci && npm --prefix web-new run build"
```

### 📁 Directory Structure Verified:
```
dutaintegraweb-main/
├── public/           # Static files served directly by Cloudflare Pages
│   ├── _redirects
│   ├── _headers
│   └── ... (all static files)
├── functions/        # Cloudflare Functions
│   └── api/[[path]].js
└── server/           # API handlers (Supabase-only)
    ├── handler-cloudflare.mjs
    ├── enquiries-cloudflare.mjs
    ├── clients-cloudflare.mjs
    ├── tickets-cloudflare.mjs
    ├── digest-cloudflare.mjs
    └── portal-cloudflare.mjs
```

### 🔑 Environment Variables (set in Cloudflare Pages Dashboard):
| Variable | Required | Notes |
|----------|----------|-------|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (not anon) |
| `ADMIN_TOKEN` | ✅ | Generate: `openssl rand -hex 32` |
| `DIGEST_TOKEN` | ✅ | Generate: `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | ✅ | `https://dutaintegra.my,https://www.dutaintegra.my` |
| `CONTACT_INBOX_EMAIL` | ✅ | Where leads are emailed |
| `EMAIL_FROM` | ✅ | e.g. `Duta Integra <no-reply@dutaintegrasolutions.com>` |
| `RESEND_API_KEY` | ✅ | One of `RESEND_API_KEY`, `BREVO_API_KEY`, or `POSTMARK_SERVER_TOKEN` |

### 🚀 Deployment Steps:
1. **Push to Git**:
   ```bash
   cd /media/shamelali/Data/1-Projects/dutaintegraweb-main
   git add -A
   git commit -m "chore: migrate to Cloudflare Pages
   - Static files → public/
   - API routes → functions/api/[[path]].js
   - Supabase-only storage (no JSONL fallback)
   - _headers + _redirects for security/SPA routing
   - wrangler.toml for Pages config"
   git push origin main
   ```

2. **In Cloudflare Pages Dashboard**:
   - Connect repo → select this repo
   - Build command: `npm run cf:build`
   - Output dir: `public`
   - Custom domain: Add `dutaintegra.my` (and `www.dutaintegra.my`)

3. **Environment Variables** (in Pages project settings):
   Add all required variables from the table above

4. **Test Locally**:
   ```bash
   cd /media/shamelali/Data/1-Projects/dutaintegraweb-main
   npm run cf:preview
   # Visit http://127.0.0.1:8788
   # Test: contact form, quiz, admin/enquiries, portal login
   ```

5. **Deploy**:
   ```bash
   npm run cf:deploy
   ```

### 🔄 Rollback Plan:
The original Vercel setup (`vercel.json`, `server/index.mjs`, `Web/`) remains intact for rollback.

### ✅ Priority Order:
1. Deploy dutaintegraweb-main to Cloudflare Pages (production site)
2. Verify all API endpoints work with Supabase
3. Decide fate of Dutaintegraweb_V2 (separate product, leave on Vercel)
4. Clean up archive if not needed

The migration is complete. You are ready to deploy to production. 🎉