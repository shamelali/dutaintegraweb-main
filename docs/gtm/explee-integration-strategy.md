# Explee Integration Strategy — How Duta Integra Solutions Becomes the Market Leader

**Document ID:** DIS-GTM-EXPLEE-v1.0
**Date:** 2026-09-12
**Owner:** Founder & CEO / Head of Business Development
**Status:** Proposal — decision required
**Sources:** [explee.com](https://explee.com), [explee.com/auto-gtm](https://explee.com/auto-gtm), [explee.com/pricing](https://explee.com/pricing), `Web/*.html` (dutaintegra.my source in this repo)

---

## 0. TL;DR

Explee's **AutoGTM** is a pay-as-you-go AI outbound agent (≈$0.03/email, no subscription) that
researches a market, sharpens an ICP, finds decision-makers across 105M companies / 536M people,
writes personalised emails, handles replies and books meetings — with pre-warmed mailboxes, 97%
claimed deliverability, calendar + CRM integration and API access included.

Duta Integra Solutions today is a 3-person Cyberjaya shop with **2 happy clients**
(`Web/index.html:303`) and a website where **both lead-capture paths are dead**: the homepage form
`submitForm()` only shows a success toast and never transmits (`Web/index.html:1049`), and the
contact page POSTs to `/api/send-email` — **an endpoint that does not exist anywhere in this
repository** (the only occurrence of that string in the whole repo is the `fetch` call itself,
`Web/contact.html:185`). The bottleneck is not delivery capability; it is pipeline.

**The recommendation is a three-move play, in this order:**

| #     | Move                                                                                                                                                                                                                                                                                                      | Why it wins                                                                                                                                            |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1** | **Eat your own dog food.** Run AutoGTM on dutaintegra.my for 30 days to fill Duta Integra's own pipeline.                                                                                                                                                                                                 | Cheapest possible proof. $30–$150 of spend tests whether the channel works in Malaysia before a single ringgit of product is built.                    |
| **2** | **Package it as a 5th service pillar: "AI Growth Engine" (GTM-as-a-Service).** Explee infra + Malaysia data layer + WhatsApp handoff + PDPA-compliant wrapper, sold as a managed retainer.                                                                                                                | 70–85% gross margin at RM1,500–4,500/mo, funded partly by the RM5,000 MDEC/MSME Digital MADANI matching grant. Recurring revenue, not project revenue. |
| **3** | **Turn the engine into product.** The Malaysia layer you build (SSM registry, IG/FB business pages, WhatsApp, BM/BM-English copy, consent ledger) is the defensible asset — and it becomes flagship proof for the AI Software Development pillar and the "Business Intelligence (Launching Next)" pillar. | Explee can be copied by anyone with $30. A Malaysia-specific compliant B2B data + WhatsApp-native agent layer cannot. That is the moat.                |

### Implementation status — Gate G0 (2026-09-13)

The Week-1 "stop the leak" blocker is **built and verified**. It was first implemented inside the
(now removed) Leish Next.js application and has since been rebuilt as a standalone, dependency-free
Node server so it survives independently of any framework:

| Item | File | Status |
|---|---|---|
| `POST /api/send-email` endpoint (was missing entirely) | `server/handler.mjs` | ✅ implemented — validated, origin-checked, 5 req/min per IP |
| Enquiry persistence so a lead can never be lost | `server/enquiries.mjs` → append-only JSONL (`data/enquiries.jsonl`) | ✅ row is written **before** the email is attempted; `emailed_at` records notification state |
| Notification to the sales inbox | `notifyEnquiry()` — Resend, Brevo or Postmark, whichever key is set | ✅ `CONTACT_INBOX_EMAIL`, falling back to `ADMIN_EMAIL`; returns `delivered:false` rather than failing when neither is set |
| Homepage form that faked success | `Web/index.html` (`submitForm()`) | ✅ now POSTs for real, shows a WhatsApp fallback on error |
| Static site + API served together | `server/index.mjs` (`npm start`) | ✅ serves `Web/` at `/` and the API from one origin, so no CORS needed by default |
| Env documentation | `.env.example` | ✅ `CONTACT_INBOX_EMAIL`, `ALLOWED_ORIGINS`, `ADMIN_TOKEN` documented |
| Somewhere to actually see the leads | `GET /admin/enquiries` in `server/handler.mjs` | ✅ token-protected (constant-time compare, closed when `ADMIN_TOKEN` is unset); HTML table or JSON; output escaped |
| Regression coverage | `server/handler.test.mjs` — 21 tests against a real HTTP server | ✅ `npm test` → **21 passed / 0 failed** |

**Still required before this helps a live lead:** set `CONTACT_INBOX_EMAIL` and an email provider key
in the deployment, and confirm where dutaintegra.my is actually hosted — if the site is served from a
different origin than `server/`, add that origin to `ALLOWED_ORIGINS` or the form's POST is rejected
with 403.

**Hard truth up front:** integrating Explee alone will not make Duta Integra a market leader. It
removes the pipeline constraint in ~30 days, which is a necessary condition. Leadership in Malaysian
SME IT/AI is won on local data depth, WhatsApp-native execution, and PDPA credibility — none of
which Explee provides. Section 6 covers the moat; Section 8 covers what _not_ to do.

---

## 1. What Explee actually offers (verified 2026-09-12)

### 1.1 AutoGTM — the outbound agent

From the explee.com homepage and `/auto-gtm`:

- **Seven autonomous agents:** market research, ICP sharpening, prospect discovery, email writing,
  sequencing, follow-ups, reply handling / meeting booking.
- **Data:** 105M+ company profiles, 536M+ people profiles; proprietary contact data weighted to
  **business owners and C-suite**, not scraped generic lists.
- **Infrastructure included:** pre-warmed mailboxes (outreach from day one, no DNS setup),
  auto-sequences with follow-ups, 97% claimed deliverability.
- **Integrations included:** calendar, CRM, and **API access** ("AI-agent friendly").
- **Commercial model:** **pay-as-you-go, ≈$0.03 per email, no subscription.** $30 ≈ 1,000 emails ≈
  2–8 warm leads ≈ 1–2 meetings; cost per lead $1–$15 (site headline: $9 median CPL). $50 free
  credits for new accounts. Daily budget caps.
- **Positioning:** ~15× cheaper than ZoomInfo/Apollo; G2 5.0; VC-backed.

### 1.2 AI Search — the data layer

From explee.com/pricing:

| Plan    | Price   | Companies/mo | People/mo | Emails/mo    | AI enrichment rows |
| ------- | ------- | ------------ | --------- | ------------ | ------------------ |
| Free    | $0      | —            | —         | —            | 2,000              |
| Starter | $49/mo  | 10,000       | 5,000     | up to 3,333  | 5,000              |
| Growth  | $329/mo | 80,000       | 40,000    | up to 26,666 | 20,000             |
| Pro     | $490/mo | 150,000      | 75,000    | up to 50,000 | 50,000             |

Semantic search over the full corpus, plus **AI enrichment on any criteria you describe in plain
language** — this is the under-appreciated half of Explee and matters more than AutoGTM for
Duta Integra's product ambitions (see §6.1).

### 1.3 What is _not_ offered (checked, matters for the plan)

- **No public partner / reseller / white-label programme** found on the site. Treat Move 2 as
  "build a service on top of a vendor API", not "become an Explee reseller" — until Explee says
  otherwise. _Action: email Explee sales during the free-credit trial and ask directly._
- **No Malaysia/APAC data guarantee.** The corpus is global and LinkedIn/web-weighted. Malaysian
  coverage must be measured, not assumed — Gate G1 in §7.
- **No WhatsApp channel.** AutoGTM is email-native. In Malaysia that is a real gap (§6.2).
- **No PDPA posture published.** Explee is a foreign processor of Malaysian personal data. See §6.4.

---

## 2. Duta Integra's actual position (from this repo)

### 2.1 Current offer (`Web/services.html`, `Web/pricing.html`)

| Pillar                                        | Price                |
| --------------------------------------------- | -------------------- |
| Managed IT — Starter (≤10 staff, 5 devices)   | RM1,500/mo           |
| Managed IT — Growth (10–30 staff, 20 devices) | RM3,500/mo           |
| Managed IT — Enterprise (30+)                 | Custom               |
| Add-on: AI Implementation                     | from RM5,000         |
| Add-on: Cloud Migration                       | from RM8,000         |
| Add-on: PDPA Compliance                       | RM3,500              |
| Add-on: Staff Training                        | RM1,500/session      |
| **Business Intelligence**                     | **"Launching Next"** |

Positioning: _"Malaysia's AI-First IT Partner"_, _"Two Pillars. One Partner."_, local expertise in
**PDPA, SST, ePerolehan**, 100% Malaysian-owned, Cyberjaya. Portfolio: EastelPro, AGMX,
DutaConnect. Team: 3 (Founder & CEO — Strategy/Business Development; Tech Lead — AI/Architecture;
IT Support Specialist). Free initial IT audit "worth RM2,000"; proposal in 3 working days.

### 2.2 The five gaps Explee attacks

| #   | Gap                                                                                                                                                      | Evidence                                                                                                                                                                                                  | Explee lever                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| G1  | ~~No pipeline engine — and inbound is broken too.~~ **Fixed 2026-09-13.** The homepage form used to show "Message sent!" without sending anything, and the contact page called an endpoint that did not exist. Both forms now POST to a working `POST /api/send-email`. | See the G0 implementation table above | AutoGTM = outbound engine |
| G2  | **Sales capacity = 1 person.** BD is the founder's own hat.                                                                                              | `Web/index.html` team block                                                                                                                                                                               | 7 agents ≈ fractional SDR team                 |
| G3  | **Proof deficit.** "2 Happy Clients" is on the homepage.                                                                                                 | `Web/index.html:303`                                                                                                                                                                                      | Fast closed deals → 6–10 logos in 2 quarters   |
| G4  | **BI pillar unlaunched.** Sold as "Launching Next" with no product.                                                                                      | `Web/services.html`, `Web/index.html`                                                                                                                                                                     | AI Search + enrichment = instant BI data spine |
| G5  | **No recurring AI revenue.** AI is a one-off RM5,000 project add-on.                                                                                     | `Web/pricing.html`                                                                                                                                                                                        | GTM-as-a-Service converts AI to MRR            |

> **G1 is resolved.** Both forms were broken in different ways: the homepage `submitForm()` only
> showed a toast and never transmitted, and `Web/contact.html` posted to an `/api/send-email`
> endpoint that did not exist anywhere — so the 404 HTML broke `res.json()` and the browser told the
> prospect *"Network error. Please check your connection."*, a false diagnosis that lost the lead.
> Both now post to the working endpoint in `server/handler.mjs`, and `npm test` covers the round
> trip. What remains is operational, not code: set the inbox, and confirm where the live site is
> hosted.

---

## 3. Capability mapping — Explee function → Duta Integra business line

| Explee function                                       | Maps to                            | Concrete use                                                                                                                                                |
| ----------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market research agent                                 | BD / strategy                      | Map every SME in a chosen vertical + district; identify who already runs on cloud vs. on-prem; rank by likely pain                                          |
| ICP sharpening agent                                  | BD / marketing                     | Stop targeting "Malaysian SMEs". Sharpen to e.g. _"Selangor F&B chains, 3–12 outlets, no IT manager, using manual rostering"_                               |
| Prospect discovery (105M cos / 536M people)           | BD                                 | Owner/principal-level contacts, not info@ inboxes                                                                                                           |
| Personalised email writing                            | BD / marketing                     | First paragraph references the prospect's actual business — the single highest-leverage copy change vs. templated mass outreach |
| Auto-sequences + follow-ups                           | BD                                 | Removes the "follow up on day 2–3" step that manual kits never sustain                                                                                      |
| Reply handling + meeting booking                      | BD                                 | Reply → calendar link → booked slot, unattended                                                                                                             |
| Pre-warmed mailboxes                                  | Ops                                | No DNS/warm-up project; relevant to the Managed IT pillar (it _is_ email infra)                                                                             |
| Calendar + CRM integration                            | Ops / Managed IT                   | Leads land in a CRM Duta Integra can also sell and manage                                                                                                   |
| **API access**                                        | **AI Software Development pillar** | **The strategic one.** Lets Duta Integra build Explee into client systems instead of handing over a login                                                   |
| **AI Search + AI enrichment (describe any criteria)** | **BI pillar + product**            | **Build the Malaysia B2B intelligence layer** — enrich any list on custom criteria (outlet count, SSM status, hiring, tech stack)                           |
| Bulk B2B data export                                  | Data product                       | Seed a proprietary Malaysia dataset (see §6.1)                                                                                                              |

---

## 4. Unit economics (USD/MYR ≈ 4.07, mid-market 2026-09-12)

### 4.1 Move 1 — Duta Integra's own pipeline

Assume AutoGTM's published band: $30 ≈ 1,000 emails ≈ 2–8 warm leads ≈ 1–2 meetings.

| Spend | Emails  | Warm leads | Meetings | Cost    | Cost / meeting |
| ----- | ------- | ---------- | -------- | ------- | -------------- |
| $30   | 1,000   | 2–8        | 1–2      | RM122   | RM61–122       |
| $100  | ~3,300  | 7–27       | 3–7      | RM407   | RM58–136       |
| $300  | ~10,000 | 20–80      | 10–20    | RM1,221 | RM61–122       |

Duta Integra's blended deal value (Managed IT RM1,500–3,500/mo × 12 + AI project RM5,000 + PDPA
RM3,500) is realistically **RM12,000–40,000 first-year**. At even 10% meeting→close and
RM18,000 average first-year value, **one closed deal from $300 of spend returns ~15×**.

**This is the single highest-ROI RM1,200 available to the company.** Nothing else in the plan has
this ratio.

### 4.2 Move 2 — selling it as a service

Per-client monthly COGS (Explee spend passed through at cost):

| Tier     | Emails/mo | Explee cost    | + Duta infra/CRM | Total COGS  |
| -------- | --------- | -------------- | ---------------- | ----------- |
| Pilot    | 1,000     | $30 (RM122)    | RM100            | **RM222**   |
| Standard | 3,000     | $90 (RM366)    | RM150            | **RM516**   |
| Scale    | 10,000    | $300 (RM1,221) | RM250            | **RM1,471** |

Three packaging options — recommend **(b)** at launch:

| Option                         | Price                                                 | Margin                                      | Notes                                                    |
| ------------------------------ | ----------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------- |
| (a) Retainer                   | RM1,500/mo — 30 leads, weekly report, 1 strategy call | RM1,500 − ~RM700 COGS ≈ **53%**             | Simple, predictable, grant-fundable                      |
| **(b) Retainer + performance** | **RM1,200/mo + RM150/qualified meeting**              | ~RM200 COGS per meeting ⇒ **~85% marginal** | Aligns incentives; easiest sale to a sceptical SME owner |
| (c) Pure performance           | RM400/booked meeting                                  | ~RM200 COGS ⇒ 50%                           | Highest close rate, worst cash-flow predictability       |

At 5 clients on option (b) averaging 4 meetings/mo: **RM1,200×5 + RM150×20 = RM9,000 MRR** against
~RM3,000 COGS. At 20 clients: **RM36,000 MRR**. That is a larger, steadier revenue line than the
entire current Managed IT book implies — and it is _recurring_.

### 4.3 The grant multiplier (this is the unfair advantage)

The **MSME Digital Grant MADANI / SME Digitalisation Grant** gives Malaysian SMEs **50% matching up
to RM5,000**, administered by BSN and claimed through an **MDEC-registered Technology Solution
Provider**, with an approved category that includes _Digital Marketing / Sales_. Budget 2026 adds the
**Malaysia Digital Acceleration Grant (RM53m pool)** for genuine AI adoption.

- A RM10,000 "AI Growth Engine" implementation → client is subsidised RM5,000.
- Eligibility: SSM-registered, ≥60% Malaysian-owned, 6+ months trading, SME-classified, min turnover
  thresholds, no previous digitalisation matching grant.
- Approval typically 4–8 weeks.

**Action: become an MDEC-registered TSP / Digitalisation Partner.** This single registration converts
Duta Integra's price from "RM10,000" to "RM5,000 after grant" in every sales conversation — and
competitors who have not registered cannot match it. _Caveat: TSP registration criteria and current
grant windows must be verified with MDEC/BSN directly; the pool is quota-limited._

---

## 5. Packaging — where it lands on the existing site

New pillar on `Web/services.html` and `Web/index.html`, positioned as pillar 3 of "Two Pillars" →
**"Three Pillars. One Partner."**:

> ### AI Growth Engine _(new)_
>
> A 24/7 AI sales agent that finds your customers while you sleep. We research your market, build
> your ideal-customer profile, contact verified business owners, and book qualified meetings
> straight into your calendar — in English and Bahasa Melayu, PDPA-compliant, with a human from
> Duta Integra overseeing every campaign.
>
> - Market & ICP research on 105M+ companies
> - Verified owner/principal-level contacts
> - Personalised outreach + automated follow-ups
> - WhatsApp handoff for Malaysian buyers
> - PDPA-compliant consent & suppression ledger
> - Monthly pipeline report + strategy call
>
> **From RM1,200/month + RM150 per qualified meeting · 50% grant-eligible**

Knock-on edits:

- `Web/pricing.html` — add an "AI Growth Engine" pricing card next to Managed IT; move **AI
  Implementation from RM5,000 one-off** to _"from RM5,000, or RM1,200/mo as a managed service"_.
- **Business Intelligence ("Launching Next")** → rename/relaunch as **Revenue Intelligence**, powered
  by AI Search + enrichment. This turns a vapourware pillar into a launchable one with no new build.
- `Web/cases.html` — after 90 days, the Duta Integra pipeline itself becomes a case study with real
  numbers ("RM1,221 of spend → N booked meetings → M closed deals"). That is the most credible
  proof asset the company can produce, because it is self-audited.

---

## 6. The moat — what Explee does _not_ give you (and where leadership is actually won)

Anyone in Malaysia can buy Explee for $30. These four things cannot be bought, and together they are
the market-leader position.

### 6.1 Own the Malaysia B2B data layer

Explee's 105M-company corpus is global and web/LinkedIn-weighted. Malaysia's real business universe
is **9.34m registered businesses and 1.59m registered companies** (SSM, to 31 Dec 2024) and **1.34m
entities in the 2026 Economic Census**, of which micro businesses are 74.3%. Most have no meaningful
web presence and are invisible to LinkedIn-centric data.

Build **"DIS Business Graph"**: SSM registry ingest + Google Maps + IG/FB business pages + directory
scrapes, joined by registration number and domain, then **enriched through Explee's AI enrichment
API on criteria you define** (outlet count, whether they hire IT staff, whether they advertise,
whether they run an e-invoicing vendor). This is simultaneously:

- the data spine for the Revenue Intelligence pillar,
- a sellable dataset/API product,
- and the reason a competitor cannot replicate the offer by buying the same tool.

### 6.2 WhatsApp is the real channel; email is the opener

WhatsApp reaches **~90.7% of Malaysians aged 16–64** and is where SME commerce happens; Malaysian
SME enquiry splits skew roughly **58% WhatsApp / 18% phone / 11% web form / 9% social DM / 4% email**,
and ~63% of business conversations are bilingual English/BM. AutoGTM is email-native.

So: **use Explee for discovery, research and personalisation; hand off to a WhatsApp Business API
journey (BM + English) for the conversation.** Duta Integra already builds this class of
AI-driven conversational automation for clients — the same engineering, pointed at outbound
instead of inbound. _This hybrid is the product nobody in the Malaysian MSP market has._

### 6.3 Vertical wedges, not "SMEs"

Explee's ICP agent is only as good as the ICP. Pick three, in order of Duta Integra's existing
evidence:

1. **Cooperatives / Koperasi** — AGMX already handles AGM governance under Akta Koperasi 1993. There
   are tens of thousands; they are compliance-driven buyers with board budgets. Highest-fit wedge.
2. **F&B and retail chains (3–20 outlets)** — rostering, POS, cloud migration, PDPA on customer data.
   EastelPro's captive-portal + PDPA consent logging is directly reusable.
3. **Professional-services and clinic chains** (dental, aesthetic, veterinary, tuition) — multi-branch
   operators with booking-driven revenue, no in-house IT, and PDPA exposure on patient/student
   records. Same shape of buyer as wedge 2 but a higher willingness to pay for compliance help.

For each wedge: pre-built ICP, pre-built Malay+English sequences, pre-built objection handling, and a
named reference client.

### 6.4 Be the _compliant_ AI outbound vendor — this is the sharpest wedge available

Duta Integra sells **PDPA Compliance for RM3,500**. The Personal Data Protection (Amendment) Act 2024
came fully into force in 2025: **mandatory breach notification within 72 hours**, **mandatory DPO
appointment**, data portability, "data controller" terminology, data-processor liability for the
Security Principle, new cross-border transfer rules, and **maximum fines raised to RM1,000,000**
(with director/officer personal liability).

Most Malaysian SMEs adopting AI marketing tools in 2026 are doing so with **no idea they have taken on
a processor, a cross-border transfer and a consent obligation.** Duta Integra is one of very few
vendors who can credibly say: _"we run your AI growth engine, and we are also the people who keep it
legal."_ Bundle it: **AI Growth Engine + PDPA compliance ledger + DPO-as-a-service.**

Required engineering (non-negotiable, and it is the moat):

- Consent / lawful-basis record per contact, per purpose; suppression and do-not-contact list that
  survives across campaigns and clients.
- Data-processing agreement with Explee covering Security Principle obligations; documented
  cross-border transfer assessment.
- Retention schedule + automated purge (the repo already has `docs/PDPA_RETENTION_GUIDELINES.md`
  and `scripts/retain-purge.mjs` — reuse them).
- Breach register + 72-hour notification runbook (2-year record retention).
- Human-in-the-loop approval on copy and on send lists.

> ⚠️ **Get a legal opinion before the first campaign.** PDPA obligations for B2B direct marketing to
> business contacts, the scope of the consent requirement, and the treatment of publicly available
> business data are not settled questions and are not addressed here as legal advice. The
> reputational exposure is asymmetric: a company selling PDPA compliance cannot be the one that gets
> reported for spam.

---

## 7. 90-day execution plan

| Phase                        | Weeks      | Actions                                                                                                                                                                                                                                                                                                                                                                                                                   | Exit gate                                                                                                                                                                       |
| ---------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0. Stop the leak**         | Week 1     | Confirm where dutaintegra.my is actually hosted (the `Web/` prototype here is not deployed by any workflow). Implement the missing `/api/send-email` endpoint or repoint both forms to a working relay. Wire `Web/index.html:1049` to the same path — it currently sends nothing. Add analytics and a WhatsApp click-to-chat CTA above the fold. Stand up a CRM (even spreadsheet-backed) as the single system of record. | **G0:** a real submission from both forms arrives in the CRM, verified end to end                                                                                               |
| **1. Prove it on ourselves** | Weeks 1–4 | Sign up for Explee free credits ($50) and run **[`g1-campaign-pack.md`](./g1-campaign-pack.md)** — two campaigns (Selangor SMEs; koperasi), English + Bahasa Melayu sequences, objection handling and a decision rule. Log every number in [`g1-campaign-log.csv`](./g1-campaign-log.csv). | **G1:** ≥40% Malaysia data hit-rate, ≥1% positive reply rate, <RM150 per booked meeting. *If the hit-rate fails, pivot to the SSM layer (§6.1) before spending more.* |
| **2. Productise**            | Weeks 3–8  | Build the Malaysia layer v0 (SSM + Maps + IG). Build WhatsApp handoff. Build consent/suppression ledger. Draft the DPA with Explee. Take [`pdpa-outbound-brief.md`](./pdpa-outbound-brief.md) to counsel for the legal opinion. Register as MDEC TSP.                                                                                                                                                                                                                                          | **G2:** end-to-end demo — prospect in, meeting booked, consent recorded, WhatsApp follow-up sent                                                                                |
| **3. Launch the offer**      | Weeks 6–10 | Publish the AI Growth Engine pillar on the site. Launch to 5 design partners at founder pricing (RM1,200 + RM150/meeting, grant-assisted where eligible). Sell it into the existing Managed IT base first — warm, cheap, fast.                                                                                                                                                                                            | **G3:** 5 paying design partners, ≥3 of them grant-subsidised                                                                                                                   |
| **4. Compound**              | Weeks 9–13 | Publish the self-audited case study. Raise price to list. Launch Revenue Intelligence (BI pillar) on the same data spine. Start the vertical playbook #2.                                                                                                                                                                                                                                                                 | **G4:** RM15,000 MRR from AI Growth Engine; 2 reference clients per wedge                                                                                                       |

**Resource reality check:** this is a 3-person company. Move 1 needs ~5 hrs/week from the founder.
Moves 2–3 need the Tech Lead for ~3 weeks of build. If that capacity is not available, **do Move 1
only** — it pays for itself and funds the rest.

---

## 8. What NOT to do

| Temptation                                     | Why it fails                                                                                                                                                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Announce an "Explee partnership"               | No public partner/reseller programme exists. Claiming one is a credibility risk and gives Explee leverage. Say "built on" until there is paper.                                                                             |
| Resell raw Explee logins                       | Zero margin, zero moat, and the client learns to go direct. Sell the outcome, not the seat.                                                                                                                                 |
| Blast 10,000 emails/month at Malaysian SMEs    | Email is a minority channel here (~4% of SME enquiries). Volume without the WhatsApp handoff produces spam complaints, not pipeline — and burns the PDPA brand.                                                             |
| Promise "AI replaces your sales team"          | AutoGTM books meetings; a 3-person company cannot absorb 50 demos/week for 20 clients. Sell _pipeline_, staff the closing.                                                                                                  |
| Build a custom GTM platform from scratch first | Competes with a VC-funded vendor on their core. Build the Malaysia layer; let Explee do the commodity part.                                                                                                                 |
| Skip the legal opinion                         | Asymmetric downside. One PDPA complaint against the company that sells PDPA compliance is terminal for the positioning.                                                                                                     |
| Treat Explee as a permanent dependency         | Pay-as-you-go with API access makes switching cheap _if_ the data and consent ledger live in Duta Integra's own systems. Keep the ICP definitions, contact graph and consent records on your side of the wire from day one. |

---

## 9. Risk register

| Risk                                                    | L      | I          | Mitigation                                                                                                                       |
| ------------------------------------------------------- | ------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Malaysia/APAC data coverage too thin in Explee's corpus | High   | High       | Gate G1 measures it in week 2 for $0–$50. If thin, lead with the SSM/Maps layer and use Explee only for enrichment + email infra |
| Cold email underperforms with Malaysian SME owners      | Medium | High       | Hybrid WhatsApp handoff (§6.2); measure reply rate before scaling spend; daily budget caps                                       |
| PDPA / spam exposure                                    | Medium | **Severe** | §6.4 controls + legal opinion + human-in-the-loop. Never launch without                                                          |
| Vendor dependence / price change                        | Medium | Medium     | Own the data and consent ledger; API-based integration; document a fallback (self-hosted sending + own enrichment)               |
| No public partner programme / no white-label            | Medium | Medium     | Ask Explee directly during trial; if unavailable, position as independent service integrator                                     |
| Delivery capacity (3 people)                            | High   | Medium     | Cap design partners at 5; automate reporting; hire a BD/SVA only after G4                                                        |
| Grant rules change or quota exhausted                   | Medium | Low        | Treat grant as a bonus, never as the business case; price stands without it                                                      |
| Explee enters Malaysia directly                         | Low    | Medium     | Speed + local data + PDPA brand + client relationships are the defence; move in 90 days, not 9 months                            |

---

## 10. Metrics that decide this

| Metric                                                            | Target (day 90)      | Source of truth            |
| ----------------------------------------------------------------- | -------------------- | -------------------------- |
| Malaysia data hit-rate (prospects found with valid owner contact) | > 40% of target list | Explee export vs. SSM list |
| Email → positive reply rate                                       | ≥ 1.5%               | Explee analytics           |
| Cost per booked meeting                                           | < RM150              | spend ÷ meetings           |
| Meeting → closed deal                                             | ≥ 10%                | CRM                        |
| AI Growth Engine MRR                                              | RM15,000             | accounts                   |
| Design partners on grant                                          | ≥ 3 of 5             | BSN/MDEC approvals         |
| Pipeline coverage vs. quota                                       | ≥ 3×                 | CRM                        |
| "Happy Clients" counter on `Web/index.html:303`                   | 2 → **12+**          | the homepage               |

---

## 11. Repository note — Leish removal (2026-09-13)

This repository previously contained the **Leish! v2** beauty-booking marketplace application
alongside the Duta Integra site. Leish has been removed: `src/`, `e2e/`, `public/`, `scripts/`,
`private/`, the Leish specification set under `docs/`, the Leish marketplace legal templates, the MUA
outreach kit, the vendored `redis-js-main/` checkout, and the Next.js toolchain
(`package.json`/`next.config.ts`/`vitest`/`tsconfig.json`/`Dockerfile`/`vercel.json`).

What remains is Duta Integra only: the `Web/` static site, this GTM material, `docs/legal/` (NDA
template), `docs/PDPA_RETENTION_GUIDELINES.md`, `assets/`, and the standalone `server/`.

Two consequences worth recording:

1. **Two build defects documented in an earlier revision of this file are now moot.** The vendored
   `redis-js-main/` tree that broke `tsc`, and the `/design-mockup` `useSearchParams()` prerender
   failure, were both Leish-application problems and left with it. There is no build step now — the
   repo has no npm dependencies and `npm test` is the whole gate.
2. **The lead-capture endpoint was rebuilt, not lost.** It originally lived at
   `src/app/api/send-email/route.ts` with a database-backed `enquiries` table. The standalone version
   in `server/` keeps the same contract and the same persist-before-notify ordering, but stores to an
   append-only JSONL file instead of Postgres/SQLite. The full pre-removal state is preserved at
   commit `5136c14`.

## Appendix A — First-week action list

1. ~~Fix both lead forms~~ **DONE 2026-09-13** — `/api/send-email` implemented in `server/handler.mjs`, both `Web/` forms posting for real, 21 tests. Remaining: set `CONTACT_INBOX_EMAIL` + an email provider key, add the site origin to `ALLOWED_ORIGINS` if hosted separately, and confirm where dutaintegra.my is actually hosted.
2. Register Explee, claim the $50 free credits, read `/auto-gtm` and `/pricing` again with the plan in hand.
3. **Ask Explee sales the three questions** in §1 of [`g1-campaign-pack.md`](./g1-campaign-pack.md): Malaysia data coverage, partner/reseller terms, API documentation and rate limits.
4. ~~Write ICP v1 for the two wedges~~ **DONE** — plain-English ICPs, bilingual sequences and objection handling are in [`g1-campaign-pack.md`](./g1-campaign-pack.md).
5. Human-review the first 100 generated emails before anything sends. Set a daily budget cap.
6. Book the PDPA legal opinion — take [`pdpa-outbound-brief.md`](./pdpa-outbound-brief.md), which frames the 15 questions for counsel.
7. Start the MDEC TSP / Digitalisation Partner registration paperwork.
8. ~~Create a campaign log~~ **DONE** — [`g1-campaign-log.csv`](./g1-campaign-log.csv) exists; fill it in from the first send.

---

_Prepared from the dutaintegra.my source in this repository (`Web/*.html`), the GTM material in
`docs/gtm/`, and public Explee materials retrieved 2026-09-12. Currency conversions at USD/MYR 4.07.
All Explee performance figures are the vendor's own published claims and must be re-measured in Gate G1
before any commitment beyond the free credits. Nothing here is legal advice._
