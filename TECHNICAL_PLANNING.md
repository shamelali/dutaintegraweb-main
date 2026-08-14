# Duta Integra Solutions — Technical Planning Session Summary

## 1. Pricing & Service Structure

### Website / Profile Tiers (Priority Order)
| Tier | Price | Key Features |
|---|---|---|
| **Basic / Template** | RM 500 – RM 2,000 | 3–5 pages, existing templates, landing pages |
| **Basic Custom / SME Standard** | RM 2,500 – RM 5,000 | Custom UI/UX, 5–10 pages, SEO, WhatsApp/Maps |
| **Professional Corporate** | RM 5,000 – RM 12,000+ | Exclusive design, multi-language, copywriting |
| **Advanced / Custom Web App** | RM 12,000 – RM 25,000+ | Booking systems, portals, CRM integration |

**Key Changes Applied:**
- Service titles capitalized
- Individual services reordered by priority
- Website / Profile set as #1 priority service

---

## 2. Tech Stack Defined

### By Project Type
| Layer | WordPress Builds | Next.js / Custom Builds |
|---|---|---|
| **Frontend** | Elementor / WPBakery | React.js / Next.js |
| **Styling** | Bootstrap / Themes | Tailwind CSS |
| **Backend** | PHP / WooCommerce | Node.js / Laravel |
| **Database** | MySQL | PostgreSQL (Neon) |
| **CMS** | WordPress + ACF Pro | Custom Dashboard |
| **Hosting** | Exabytes / Shinjiru | Vercel (ap-southeast-1) |

---

## 3. Admin Dashboard Architecture

### Core Strategy
```
Traditional Web Agency ──► Software / Solutions Vendor
         by bundling Admin Dashboard with EVERY project tier
```

### Two Dashboard Modes
| Mode | For | Tools |
|---|---|---|
| **White-Label** | WordPress clients | White Label CMS + ACF Pro |
| **Custom Premium** | Next.js clients | Vercel + Neon + Drizzle ORM |

---

## 4. Infrastructure Blueprint

### Zero-Cost Setup (Free Tier)
- **Vercel Hobby Tier:** Global Edge CDN, Serverless API, Edge Middleware
- **Neon Free Tier:** Serverless PostgreSQL, WebSocket Pooling, Git-like Branching
- **Region:** `ap-southeast-1` (Singapore — sub-40ms Malaysia latency)
- **Monthly Cost:** RM 0

---

## 5. Database Schema (Drizzle ORM)

### 3 Core Tables
- `users`: `id`, `name`, `email`, `role` (RBAC), `created_at`
- `leads`: `id`, `client_name`, `phone_number`, `status` (`new` → `contacted` → `closed`), `created_at`
- `ai_logs`: `id`, `user_id` (FK → users), `prompt_tokens`, `completion_tokens`, `model_name`, `created_at`

### RBAC Roles
- `admin` ──► Full access
- `staff` ──► Operational access
- `client` ──► Limited portal access

### Lead Pipeline
`[ new ] ──► [ contacted ] ──► [ closed ]`

---

## 6. Security Architecture

### Auth Flow (No Clerk — Zero Cost)
1. Request to `/admin/*`
2. Edge Middleware (`src/middleware.ts`) checks for `di_admin_session` cookie.
3. If no cookie, redirect to `/admin/login`.
4. If cookie found, crypto helper (`src/lib/auth.ts`) runs `getVerifiedAdmin()` cross-referencing Neon DB.
5. Access granted ✅.

### Security Features
- HttpOnly Cookie (`di_admin_session`) — XSS proof
- Edge-level blocking — protects Neon DB limits
- base64/buffer encryption — lightweight crypto
- Zero third-party auth cost

---

## 7. Complete Stack at a Glance

| Component | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Deployment | Vercel — `ap-southeast-1` |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Custom Edge Middleware |
| Session | `di_admin_session` (HttpOnly) |
| RBAC | admin / staff / client |
| WordPress CMS | White Label CMS + ACF Pro |
| E-Commerce | WooCommerce |
| SEO Tools | GA4, GSC, Meta Pixel, GTM |
| Monthly Cost | RM 0 (Free Tier) |
