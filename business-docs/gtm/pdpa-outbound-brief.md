# Briefing for Legal Advice — AI-Assisted Outbound Marketing under the PDPA

**To:** external counsel (Malaysia, data protection)
**From:** Duta Integra Solutions Sdn Bhd
**Purpose:** obtain a written opinion before the company operates a cold-outbound email channel
**Status:** draft — not legal advice. The regulatory facts below are summarised from public sources
and **must be verified by counsel**.

---

## 1. What we intend to do

1. Use a third-party SaaS platform (**Explee AutoGTM**, explee.com, non-Malaysian operator) to
   identify Malaysian business prospects and their owner-level contacts.
2. The platform sources contacts from public web, LinkedIn and map data. We do not yet know whether
   it uses the SSM register, and we have asked.
3. The platform sends personalised cold emails **from its own pre-warmed mailboxes on our behalf**,
   handles replies, and books meetings into our calendar.
4. Later, we intend to offer this as a managed service **to clients**, meaning we would process
   prospect data on a client's behalf rather than our own.

We are the vendor of a PDPA compliance service. The reputational exposure of getting this wrong is
disproportionate to the revenue.

---

## 2. The regulatory context as we understand it (please verify)

The **Personal Data Protection (Amendment) Act 2024** came into force in phases during 2025:

| Date | Change |
|---|---|
| Jan 2025 | Administrative and procedural changes |
| Apr 2025 | "Data user" replaced by **"data controller"**; biometric data classified as sensitive; new cross-border transfer rules; **maximum fine for a principle breach raised to RM1,000,000** (from RM300,000), with imprisonment up to 3 years |
| Jun 2025 | **Mandatory data breach notification within 72 hours** of discovery (individuals within 7 days where significant harm is likely); **mandatory DPO appointment**; data portability; data-processor liability for the Security Principle |

Related obligations we believe apply: breach register retained ≥ 2 years; PDPC registration for
certain sectors; privacy notices in English **and** Malay; documented consent records; data-processor
contracts.

---

## 3. Questions we need answered

### A. Lawful basis for B2B cold email

1. Does the PDPA apply to processing the personal data of an individual **in their business capacity**
   (e.g. a company director's work email), or only to consumer personal data?
2. If it applies, what is the lawful basis for unsolicited B2B direct marketing — consent, or is there
   a legitimate-interests equivalent? Does the answer differ for a sole proprietor versus a Sdn Bhd
   director?
3. What opt-out mechanics satisfy the law, and must opt-outs be honoured across campaigns and clients?
4. Does the source of the data matter — i.e. is scraping a company website treated differently from
   buying a list, or from using the SSM public register?
5. Is there any Malaysian anti-spam rule under the **Communications and Multimedia Act 1998** or MCMC
   codes that applies to email specifically, separately from the PDPA?

### B. Roles and contracts

6. When Explee processes Malaysian personal data on our behalf, are we the **data controller** and
   Explee the **data processor**? What must the contract contain to satisfy the Security Principle
   now that processors carry direct liability?
7. Explee is outside Malaysia. What does the amended **cross-border transfer** provision require —
   an adequacy assessment, contractual safeguards, consent, or something else? Is there a published
   list of adequate jurisdictions?
8. When we run campaigns **for a client**, who is the controller — the client, us, or both? What
   flow-down terms do we need in our client agreement?

### C. Our own obligations

9. Do we meet the **DPO** threshold (we understand it to involve >20,000 data subjects, or >10,000
   sensitive-data subjects, or regular and systematic monitoring)? Would operating continuous
   automated prospect monitoring itself trigger it?
10. Does our **PDPC registration** need updating for a new processing purpose?
11. What retention period is defensible for prospect records that never become customers, and does it
    differ for records that produced an opt-out?
12. If a prospect's data were exposed through the vendor, does the **72-hour clock** start for us, for
    the vendor, or both — and what do we need contractually to be able to meet it?

### D. Practical controls

13. Is a documented **consent/lawful-basis record per contact** required, or is a per-campaign record
    sufficient?
14. Do the automated profiling performed by the AI agents (ICP scoring, enrichment) constitute
    "processing" that needs its own notice or assessment?
15. What must our privacy notice say, in English and Malay, to cover this activity?

---

## 4. Controls we are prepared to implement

We would rather over-implement than argue later. Counsel should tell us which of these are required,
which are merely prudent, and which are unnecessary:

- Consent/lawful-basis record per contact, per purpose
- A single suppression list that persists across campaigns and across clients
- Working unsubscribe in every message, honoured immediately
- A data-processing agreement with the vendor covering the Security Principle and breach notification
- A documented cross-border transfer assessment
- Human approval of copy and of the send list before each campaign
- Retention schedule with an automated purge
- A breach register and a tested 72-hour notification runbook
- Daily spend caps and volume limits on the sending agent

---

## 5. Deliverable requested

A written opinion covering §3, plus:

- redlines to our client-facing agreement for the "we run outbound for you" service
- a privacy-notice extract (English and Malay) for the outbound activity
- a one-page retention schedule for prospect data

**Timing:** we need this before the first paid campaign. The free-trial test campaign described in
[`g1-campaign-pack.md`](./g1-campaign-pack.md) is intended to be small and measured, but we would
like counsel's view on whether even that requires the controls in §4 to be in place first.

---

*Prepared 2026-09-13. Regulatory facts summarised from public commentary on the Personal Data
Protection (Amendment) Act 2024 and the JPDP's February 2025 guidelines; they have not been verified
against the primary legislation and are provided only to frame the questions.*
