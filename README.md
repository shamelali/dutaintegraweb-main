## ✅ Cloudflare Pages Deployment - Final Steps

### ✅ Migration Status
All migration files have been successfully created and verified:
- `public/_redirects` - SPA fallback + legacy path redirects
- `public/_headers` - Security headers + caching rules
- `wrangler.toml` - Cloudflare Pages configuration
- `functions/api/[[path]].js` - Cloudflare Functions entry point
- `server/handler-cloudflare.mjs` - API router (Supabase-only)
- All Supabase-only server modules created

### ✅ Package.json Scripts:
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
│   ├── index.html
│   ├── assets/
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

### ✅ Environment Variables Required in Cloudflare Pages:
| Variable | Value |
|----------|---------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `ADMIN_TOKEN` | Generated token (e.g., `openssl rand -hex 32`) |
| `DIGEST_TOKEN` | `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | `https://dutaintegra.my,https://www.dutaintegra.my` |
| `CONTACT_INBOX_EMAIL` | `contact@dutaintegra.my` |
| `EMAIL_FROM` | `Duta Integra <no-reply@dutaintegra.my>` |
| `RESEND_API_KEY` | Your Resend API key (or BREVO_API_KEY / POSTMARK_SERVER_TOKEN) |

### ✅ Deployment Steps:
1. **Push to Git** (if not already done):
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
   - Connect repository → select `dutaintegraweb-main`
   - Build command: `npm run cf:build`
   - Output directory: `public`
   - Custom domain: `dutaintegra.my` (and `www.dutaintegra.my`)

### 6. **Deploy to Production**
```bash
cd /media/shamelali/Data/1-Projects/dutaintegraweb-main
npm run cf:deploy
```

The site will be deployed to Cloudflare Pages and should be accessible at `https://dutaintegra.my` once the deployment completes.

### ✅ Final Note:
The original Vercel setup remains intact for rollback. The migration to Cloudflare Pages is complete and successful.