# dutaintegra.my — Duta Integra Solutions

Marketing site and lead-capture backend for **Duta Integra Solutions Sdn Bhd**, a
Malaysian AI-first IT partner based in Cyberjaya, Selangor.

> This repository previously also contained the **Leish! v2** beauty-booking
> marketplace application. That project has been removed. A full snapshot of the
> repository as it stood immediately before the removal is preserved in git
> history at commit `5136c14` ("Snapshot: enquiry endpoint, Explee strategy and
> build fixes (pre-Leish-removal)").

---

## What's here

| Path | Purpose |
| --- | --- |
| `Web/` | The dutaintegra.my static site — `index`, `services`, `about`, `cases`, `pricing`, `contact` |
| `server/` | Dependency-free Node HTTP server: serves `Web/` and implements `POST /api/send-email` |
| `docs/gtm/` | Go-to-market material, including the Explee integration strategy |
| `docs/legal/` | NDA template (Duta Integra) |
| `docs/PDPA_RETENTION_GUIDELINES.md` | Malaysia PDPA data-retention guidance |
| `assets/` | Client-facing collateral (sample IT audit scorecard) |

---

## Requirements

Node.js **22 or newer**. There are **no npm dependencies** — the server and its
tests use only the standard library.

## Run it

```bash
cp .env.example .env   # then set CONTACT_INBOX_EMAIL
npm start              # serves http://0.0.0.0:3000
npm run dev            # same, with --watch
```

The server serves `Web/` at `/` and exposes:

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/send-email` | `POST` | Capture a contact-form enquiry |
| `/api/send-email` | `OPTIONS` | CORS preflight |
| `/admin/enquiries` | `GET` | View stored enquiries — HTML table, or JSON with `Accept: application/json`. Requires `ADMIN_TOKEN` |
| `/api/health` | `GET` | Liveness + whether an inbox is configured |

## Test

```bash
npm test               # node --test, 59 tests against a real HTTP server
```

## How lead capture works

Both `Web/index.html` and `Web/contact.html` POST the same JSON shape to
`/api/send-email`:

```json
{ "name": "", "company": "", "email": "", "phone": "", "service": "", "message": "" }
```

The handler then:

1. Checks the request origin against `ALLOWED_ORIGINS` (403 if not allowlisted).
2. Applies a 5-requests-per-minute limit per client IP (429 with `Retry-After`).
3. Validates the payload (`name`, `email` and `service` are required).
4. **Appends the enquiry to `ENQUIRY_STORE` before anything else**, so a lead
   survives a crash, a restart, or a mail-provider outage.
5. Emails a copy to `CONTACT_INBOX_EMAIL` via Resend, Brevo or Postmark —
   whichever key is configured. With no provider configured the enquiry is still
   stored and the response reports `{ "success": true, "delivered": false }`.

Response: `200 { "success": true, "delivered": true|false }`.

Stored records are newline-delimited JSON, one enquiry per line, in
`data/enquiries.jsonl` (git-ignored).

### Viewing leads

`GET /admin/enquiries` renders the stored enquiries as an HTML table (or JSON
with `Accept: application/json`). It is protected by `ADMIN_TOKEN` and compared
in constant time:

```bash
curl -H "x-admin-token: $ADMIN_TOKEN" localhost:3000/admin/enquiries
# or in a browser:
#   https://your-host/admin/enquiries?token=...
```

Without `ADMIN_TOKEN` set, the route always returns 401 — it cannot be opened by
accident.

## Configuration

See [`.env.example`](.env.example). The two settings that matter in production:

- **`CONTACT_INBOX_EMAIL`** — where enquiries are emailed. Falls back to
  `ADMIN_EMAIL`; a blank value falls through rather than disabling delivery.
- **`ALLOWED_ORIGINS`** — comma-separated origins permitted to POST. Required
  when the static site and the API are served from different origins.
- **`ADMIN_TOKEN`** — protects `GET /admin/enquiries`. Generate one with
  `openssl rand -base64 32`. If unset, the route stays closed.

## Deploying

The site is plain static HTML, so `Web/` can be hosted anywhere. If you host it
separately from `server/`, set `ALLOWED_ORIGINS` to the site's origin — otherwise
the contact form's cross-origin POST is rejected with 403.

A `Dockerfile` is not included; a minimal `FROM node:22-alpine` image running
`npm start` is sufficient.
