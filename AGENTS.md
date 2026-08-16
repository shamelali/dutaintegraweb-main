# Duta Integra Solutions Website

## Project Overview

Static HTML website for Duta Integra Solutions (Malaysian IT services company). Hosted on Vercel as a static site with one serverless API route.

**Root pages**: `index.html`, `about.html`, `services.html`, `cases.html`, `pricing.html`, `contact.html`
**Secondary pages**: `Web/` subdirectory (legacy/alternative version with its own copies of all pages)
**API**: `api/send-email.js` (serverless function using `resend` for contact form emails)

## Deploy

```bash
vercel                    # deploy to preview
vercel --prod             # deploy to production
```

Vercel CLI is already linked to `shamelalis-projects/dutaintegraweb-main`. No re-link needed.

The `vercel.json` at root sets `outputDirectory: "."` — deploys everything in root, NOT the `Web/` subdirectory.

## Build / Dev

No build step. This is a pure static HTML site.

```bash
npm install               # installs resend for api/send-email.js
```

## Important Patterns

- `.page-hero` styling: always use `background: linear-gradient(...)` + image URL together (never set `background` twice — last assignment wins). See commits `18fcd4c` and `7083caa` for examples of what breaks and what fixes it.
- Contact form submits to `api/send-email.js` via POST
- Dark mode is CSS-class based (`.dark` on `<body>`), toggled by `.dark-toggle` button
- Client logo links in `index.html` point to live client sites

## OpenCode Agents

`opencode.json` defines four delivery agents (ai-services, managed-it-services, cloud-migration, it-security-pdpa). The default is `ai-services`. These are client-facing service descriptions, not technical agents.

## Env / Secrets

See **`EMAIL_SETUP.md`** for the full Resend walkthrough.

`.env.example` documents:
- `RESEND_API_KEY` (required)
- `EMAIL_FROM` / `EMAIL_TO` / `EMAIL_AUTOREPLY` (optional)

Add on Vercel:
```bash
vercel env add RESEND_API_KEY
vercel --prod
```

Contact form: `contact.html` → `POST /api/send-email` → Resend → `hello@dutaintegra.my` (+ visitor auto-reply). Falls back to WhatsApp if the API is unavailable.