# DutaOS Blueprint — The Operating System for Malaysian Businesses

**Project:** DutaOS  
**Author:** Qoder, Chief of Staff  
**Date:** 2026-10-31  
**Status:** Approved for implementation  
**Timeline:** MVP v1 in 4–6 weeks (solo founder)  
**Revenue model:** Hybrid subscription + transaction  
**Target market:** Malaysian micro, SME, and SMB businesses  
**Brand ambition:** Household-name recognition (Coke / Maggi / Panadol level) through daily-use utility

---

## 1. Executive Summary

Malaysian SMEs are struggling. PDPA compliance, SSM renewals, LHDN e-invoicing, digital payments, and AI tools are arriving all at once, and no single platform speaks their language or gives them one place to start. They are not lost because they are incapable — they are lost because no one is guiding them.

**DutaOS** becomes that guide. One platform where a business owner logs in daily to check compliance status, send invoices, manage cash flow, get AI-powered recommendations, and access verified vendors and financing. Daily use is what turns a tool into a household brand.

We build on an existing foundation: `web-new/` (React 19 + Vite + Tailwind, BM/EN i18n, shadcn/ui), `server/` (Node.js, zero runtime dependencies, Cloudflare Pages production), catalog enrichment via Ollama VLM, digital assessment, and lead capture. The first version is a **wedge product** — compliance dashboard + AI chatbar + assessment-to-proposal — that ships paying customers in 4–6 weeks.

---

## 2. Vision & North Star

> Every Malaysian business runs on DutaOS. One login. Daily use. Compliance, operations, growth — guided by AI.

**North Star metric:** Weekly active businesses (companies logging in at least once per week).

**Why this wins:** Coke, Maggi, and Panadol are household brands because they show up in daily routines, not because of advertising. DutaOS wins by becoming the daily login for business owners — the first thing they open in the morning to check "am I compliant today?" and "what should I do next?"

---

## 3. Revenue Model (Malaysian Market Fit)

| Component | Price (RM) | Rationale |
|-----------|-----------|-----------|
| **Core platform subscription** | RM49–RM99 / month per business | Fixed monthly cost for compliance (SSM, PDPA, e-invoicing). Mandatory spend = sticky, predictable revenue. Malaysian SMEs prefer predictable billing over surprise fees. |
| **Transaction fee** | 1.5–3% on invoicing, payments, financing | Captures a slice of money movement. Scales with customer growth without upfront price shock. |
| **Add-on modules** | RM19–RM49 / month | Compliance calendar, document vault, AI agent minutes. Sold à la carte so customers pay only for what they use. |

**Why not pure B2B2C:** Bank/telco reseller sales cycles run 6–18 months. You need revenue this quarter, not next year.

**Why not pure transaction:** Malaysian SMEs balk at surprise fees. They want predictable monthly billing.

**Why not high-ticket subscription:** RM500+/month is too high for the typical micro/SME without an established brand.

**3-year forecast logic:** LHDN e-invoicing is already mandating digital compliance in phases. PDPA enforcement is tightening. Government grants (SME Corp, myDigital) are pushing SMEs onto digital tools. Compliance software is becoming a tax on doing business — not optional. A RM49–RM99/month operations platform rides that regulatory wave.

---

## 4. Product Architecture — Four Layers

| Layer | Purpose | Daily Hook | v1 Scope |
|-------|---------|------------|----------|
| **Operate** | Company registry, compliance calendar, document vault, access control | "Am I compliant today?" | Company profile, compliance checklist, renewal reminders |
| **Automate** | Workflows, AI agents for invoicing, lead follow-up, reports | "What can I stop doing manually?" | AI chatbar (v1), full workflow builder (v2+) |
| **Grow** | Readiness assessment, proposals, lead pipeline, B2B marketplace | "Where's my next customer?" | Digital assessment → proposal (v1), marketplace (v3+) |
| **Connect** | Verified suppliers, telco/bank partners, embedded financing | "How do I scale?" | Payments stub (v1), partnerships (v3+) |

---

## 5. MVP v1 Scope (Weeks 1–6)

Ships paying customers in 4–6 weeks. Solo founder. Builds on existing codebase.

### Included in v1

1. **Auth + multi-tenant company**
   - Sign up, sign in, sign out
   - Register company (name, SSM number, industry, address)
   - BM/EN language toggle (existing pattern)
   - Session persistence via `portal_sessions`

2. **Compliance dashboard (Operate layer)**
   - Compliance checklist: SSM renewal, PDPA status, e-invoicing readiness, tax dates
   - Manual entries for v1 (no SSM API integration yet)
   - Renewal reminders and overdue flags

3. **AI chatbar (Automate layer)**
   - Single input: "What do I need to do this month?"
   - Answers from Ollama VLM + assessment logic (existing catalog enrichment foundation)
   - Context-aware: knows the user's company, industry, and compliance status

4. **Digital assessment → proposal (Grow layer)**
   - Existing `/digital-assessment` page, enhanced
   - Scored readiness report + 3 prioritized recommendations
   - "Request proposal" CTA creates a lead in CRM
   - Proposal template generation

5. **Payments stub**
   - Stripe integration for monthly subscription (cards + online banking)
   - FPX/DuitNow added after first revenue

### Explicitly cut from v1 (ship later)

- B2B marketplace / vendor directory
- Full workflow builder & automation engine
- Document vault + e-signature
- Embedded financing (invoice factoring)
- White-label B2B2C distribution
- Mobile apps (responsive web only)
- SSM API integration (manual entry in v1)

---

## 6. Technical Stack

Building on what exists — no rewrite.

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React 19 + Vite + Tailwind 4 | `web-new/` is canonical. shadcn/ui components. BM/EN i18n. |
| **Backend** | Node.js (ES modules), zero runtime dependencies | `server/` — native `fetch` only. Cloudflare Pages production. |
| **AI / VLM** | Ollama (self-hosted) | `llava` or `llama3.2-vision`. `OLLAMA_HOST`, `OLLAMA_VLM_MODEL` env vars. |
| **Storage** | Supabase (primary) / JSONL fallback | `server/store.mjs` resolution. `catalog_items`, `portal_sessions`, etc. |
| **Payments** | Stripe (v1), FPX/DuitNow (v2) | Stripe for speed to market. |
| **Deployment** | Cloudflare Pages (`public/`) | `npm run cf:deploy`. Production is Cloudflare, not Vercel. |
| **CI / Tests** | `node:test` (server), Vitest (web) | 195+ server tests. `npm run verify` is the gate. |

---

## 7. Data Model (v1)

**`companies`** (new table)
- `id` uuid PK
- `name` text
- `ssm_number` text
- `industry` text
- `address` text
- `email` text
- `phone` text
- `subscription_tier` text (default: "starter")
- `subscription_status` text (default: "active")
- `created_at`, `updated_at` timestamptz

**`company_members`** (new table)
- `id` uuid PK
- `company_id` uuid FK → companies
- `user_id` uuid FK → portal_sessions / auth.users
- `role` text (default: "owner")
- `created_at` timestamptz

**`compliance_items`** (new table)
- `id` uuid PK
- `company_id` uuid FK → companies
- `type` text (ssm, pdpa, einvoice, tax)
- `status` text (pending, compliant, overdue)
- `due_date` timestamptz
- `completed_at` timestamptz (nullable)
- `created_at`, `updated_at` timestamptz

**Existing tables reused:** `portal_sessions`, `leads`, `catalog_items`, `quiz_audits`, `health_probe`.

**Migration needed:** `supabase/migrations/YYYYMMDD0001_dutaos_core.sql` creating `companies`, `company_members`, `compliance_items` with RLS enabled, no public policies (service-role writes only).

---

## 8. API Routes (v1)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/signup` | POST | Create user + company |
| `/api/auth/login` | POST | Session cookie |
| `/api/auth/logout` | POST | Revoke session |
| `/api/auth/me` | GET | Current user + company |
| `/api/companies/:id` | GET/PATCH | Company profile |
| `/api/compliance` | GET | List compliance items for company |
| `/api/compliance/:id` | PATCH | Mark item complete / overdue |
| `/api/ai/chat` | POST | AI chatbar: question → answer |
| `/api/assessment` | POST | Submit digital assessment |
| `/api/proposal` | POST | Generate proposal from assessment |
| `/api/payments/checkout` | POST | Stripe checkout session |
| `/api/payments/webhook` | POST | Stripe webhook (subscription events) |

---

## 9. UI Routes (v1)

| Route | Purpose |
|-------|---------|
| `/` | Landing: Try → Build → Deploy narrative |
| `/login` / `/signup` | Auth |
| `/dashboard` | Company overview + compliance status |
| `/compliance` | Compliance checklist & calendar |
| `/ai-chat` | AI chatbar interface |
| `/assessment` | Digital readiness assessment (existing) |
| `/proposal` | Proposal generation from assessment |
| `/billing` | Subscription & payment management |

---

## 10. Milestones & Timeline

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 1 | Auth + company registration | Sign up/in, company profile, BM/EN |
| 2 | Compliance dashboard | Checklist, reminders, overdue flags |
| 3 | AI chatbar | Ollama integration, contextual answers |
| 4 | Assessment → proposal | Enhanced assessment, proposal generation |
| 5 | Payments | Stripe checkout, subscription management |
| 6 | Beta launch | First paying customers, feedback loop |

**Go/no-go criteria at week 6:** 10+ paying businesses at RM49–RM99/month. If not met, iterate on pricing and onboarding before building v2.

---

## 11. Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Solo founder bandwidth | Cut ruthlessly. v1 is a wedge, not a platform. Ship ugly but functional. |
| Ollama self-hosting reliability | Health check endpoint (`/api/health`). Fallback to rule-based responses if VLM down. |
| Malaysian payment fragmentation | Start with Stripe (cards + FPX via Stripe). Add DuitNow after revenue validates. |
| SSM / government API complexity | Manual entry in v1. API integration in v2 after product-market fit. |
| Competitors (existing accounting software) | Differentiate on compliance-first + AI guidance, not just bookkeeping. |

---

## 12. Success Metrics

| Metric | Target (Month 3) | Target (Month 6) |
|--------|-----------------|-----------------|
| Paying businesses | 10 | 50 |
| MRR | RM500–RM900 | RM2,500–RM5,000 |
| Weekly active businesses | 60% | 80% |
| Churn (monthly) | <10% | <5% |

---

## 13. Brand & Positioning

**Name:** DutaOS ("Duta" = envoy/guide in Malay; "OS" = operating system)

**Tagline:** *The operating system for Malaysian businesses.*

**Positioning:** Not another accounting tool. The daily login that guides a business owner through compliance, operations, and growth — in Bahasa Malaysia and English.

**Household-brand strategy:** Daily utility > advertising. If a business owner opens DutaOS every morning to check compliance and get AI guidance, the brand becomes as familiar as Maggi in a kitchen.

---

## 14. Sign-off

Prepared and approved by:

**Qoder — Chief of Staff, DutaOS**  
Date: 2026-10-31

This blueprint is the single source of truth for v1. Changes to scope, revenue model, or timeline require re-approval. Implementation begins immediately with `docs/superpowers/specs/` as the reference, followed by the implementation plan (writing-plans skill) and weekly build sprints.

**Next step:** Invoke the writing-plans skill to convert this blueprint into a week-by-week implementation plan with file-level tasks.
