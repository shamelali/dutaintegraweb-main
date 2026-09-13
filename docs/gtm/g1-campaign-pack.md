# Gate G1 Campaign Pack — Explee AutoGTM Trial

**Purpose:** run the cheapest possible experiment that decides whether the Explee strategy in
[`explee-integration-strategy.md`](./explee-integration-strategy.md) holds in Malaysia.
**Budget:** $50 in free credits (new accounts). No paid spend until Gate G1 passes.
**Owner:** Founder & CEO
**Duration:** 14 days
**Status:** not started

---

## 0. The single question this answers

> Does Explee find enough *real, contactable Malaysian business owners* for cold outbound to be a
> viable channel here — or is its corpus too US/LinkedIn-weighted for this market?

Everything else in the strategy depends on the answer. **Do not spend money or build the Malaysia
data layer until Gate G1 has a number.**

---

## 1. Setup (Day 1, ~1 hour)

1. Register at [explee.com/auto-gtm](https://explee.com/auto-gtm) and claim the free credits.
2. Enter `https://dutaintegra.my` as the website the agent should read.
3. Set a **daily budget cap** before any campaign starts. Pay-as-you-go means an uncapped agent keeps
   sending.
4. Turn on **human review** for generated emails if the option exists. If it does not, review the
   first 100 drafts manually before anything sends.
5. Log every number in [`g1-campaign-log.csv`](./g1-campaign-log.csv) from the first send. A campaign
   you did not measure cannot pass or fail a gate.

**Three questions to ask Explee sales on Day 1** (their answers change the plan):

| # | Question | Why it matters |
|---|----------|----------------|
| 1 | What share of your company/people corpus is Malaysia, and how is it sourced — SSM, LinkedIn, or web? | If Malaysia coverage is thin, the whole play moves to building the SSM layer first |
| 2 | Do you have a partner, reseller or white-label programme, and what are the commercial terms? | Decides whether Move 2 is "built on Explee" or an actual partnership |
| 3 | Where is the API documented, what are the rate limits, and is it available on the pay-as-you-go tier? | The API is what makes the Malaysia layer buildable at all |

---

## 2. Campaign A — Managed IT for Selangor SMEs

**Wedge:** businesses with 10–30 staff and no in-house IT. Sells the RM3,500/mo Growth retainer.

**Plain-English ICP to give the agent:**

> Owners and managing directors of companies in Selangor or Kuala Lumpur, Malaysia, with 10 to 30
> employees, in manufacturing, wholesale distribution, logistics, or professional services. Exclude
> companies that already advertise an in-house IT manager or IT department. Prefer companies
> incorporated more than 5 years ago.

**Follow-up enrichment criteria to test** (this is the AI Search half of Explee — worth measuring
separately, because it is the more valuable capability for the product play):

- does the company list an IT manager or IT department on LinkedIn?
- does the company mention cloud, AWS, Azure, or a system integrator anywhere public?
- is the company hiring for admin/operations roles (a proxy for growth)?

### Sequence — English

**Email 1 — day 0**

> Subject: your IT setup at {{company}}
>
> Hi {{firstName}},
>
> I looked at {{company}} — {{one_specific_observation}}.
>
> We're Duta Integra Solutions, a Cyberjaya-based IT firm. Most companies your size in Selangor run
> without an IT person: someone in admin handles it until something breaks, and then it's urgent and
> expensive.
>
> We do a free IT audit — network, backups, security, licensing — and you get a written report with
> what's at risk and what it'd cost to fix. No obligation, and we don't need access to anything to
> start.
>
> Worth 30 minutes?
>
> {{sender}}
> Duta Integra Solutions · Cyberjaya, Selangor · +60 11-5403 4051

**Email 2 — day 3**

> Subject: re: your IT setup at {{company}}
>
> Hi {{firstName}} — one concrete thing before I leave it: the PDPA amendment that came into force
> in 2025 means a data breach now has to be reported to the Commissioner within 72 hours, and the
> fine ceiling went up to RM1 million. Most SMEs I talk to have no idea where their customer data
> actually sits.
>
> The audit covers that specifically. Still happy to do it for free.
>
> {{sender}}

**Email 3 — day 7 (break-up)**

> Subject: closing the loop
>
> Hi {{firstName}} — I'll stop here so I'm not cluttering your inbox.
>
> If IT ever becomes a headache — or if PDPA comes up in a board meeting — the free audit stands.
> Reply here or WhatsApp +60 11-5403 4051.
>
> {{sender}}

### Sequence — Bahasa Melayu

**Email 1 — day 0**

> Tajuk: sistem IT di {{company}}
>
> Salam {{firstName}},
>
> Saya ada lihat {{company}} — {{one_specific_observation}}.
>
> Kami Duta Integra Solutions, syarikat IT di Cyberjaya. Kebanyakan syarikat sebesar anda di
> Selangor tiada staf IT sendiri — biasanya staf admin yang uruskan sampailah ada masalah, lepas tu
> jadi mendesak dan mahal.
>
> Kami buat audit IT percuma — rangkaian, backup, keselamatan, lesen — dan anda dapat laporan
> bertulis: apa yang berisiko dan berapa kos untuk baiki. Tiada komitmen, dan kami tak perlukan
> akses kepada apa-apa untuk mula.
>
> Boleh luang 30 minit?
>
> {{sender}}
> Duta Integra Solutions · Cyberjaya, Selangor · +60 11-5403 4051

**Email 2 — day 3**

> Tajuk: re: sistem IT di {{company}}
>
> Salam {{firstName}} — satu perkara penting: pindaan PDPA yang berkuat kuasa 2025 mewajibkan
> kebocoran data dilaporkan kepada Pesuruhjaya dalam 72 jam, dan denda maksimum naik ke RM1 juta.
> Ramai usahawan SME yang saya jumpa tak pasti di mana data pelanggan mereka sebenarnya disimpan.
>
> Audit kami cover bahagian ini. Masih percuma.
>
> {{sender}}

---

## 3. Campaign B — AI governance for cooperatives (Koperasi)

**Wedge:** the highest-fit segment on the site, because AGMX already does AGM governance under
Akta Koperasi 1993.

**Plain-English ICP:**

> Chairmen, secretaries and board members of registered cooperatives (koperasi) in Malaysia —
> employee cooperatives, credit cooperatives, and koperasi linked to government agencies, universities
> and schools. Prefer cooperatives that have held an annual general meeting in the last 18 months.

### Sequence — English

**Email 1 — day 0**

> Subject: AGM season at {{company}}
>
> Hi {{firstName}},
>
> Running an AGM under Akta Koperasi 1993 means resolutions, quorum, minutes, and filings — usually
> in a folder on someone's laptop.
>
> We built AGMX for exactly this: e-voting, automated compliance checks against the Act, and minutes
> that generate themselves. Sixteen AGMs have run on it.
>
> Can I show you what it'd look like for {{company}}? Twenty minutes.
>
> {{sender}}
> Duta Integra Solutions · Cyberjaya · +60 11-5403 4051

**Email 2 — day 4**

> Subject: re: AGM season at {{company}}
>
> Hi {{firstName}} — the part that surprises people: the compliance checks flag missing resolutions
> *before* the AGM, not after the submission is rejected.
>
> Twenty minutes, no commitment.
>
> {{sender}}

### Sequence — Bahasa Melayu

**Email 1 — day 0**

> Tajuk: musim AGM di {{company}}
>
> Salam {{firstName}},
>
> Menjalankan AGM di bawah Akta Koperasi 1993 bermaksud usul, korum, minit dan pemfailan — biasanya
> tersimpan dalam folder di komputer riba seseorang.
>
> Kami bina AGMX untuk perkara ini: undian elektronik, semakan pematuhan automatik terhadap Akta,
> dan minit yang dijana sendiri. Enam belas AGM telah dijalankan atasnya.
>
> Boleh saya tunjukkan bagaimana ia boleh digunakan untuk {{company}}? Dua puluh minit sahaja.
>
> {{sender}}
> Duta Integra Solutions · Cyberjaya · +60 11-5403 4051

---

## 4. Objection handling

| Objection | Response |
|---|---|
| "We already have an IT company." | Fine — the audit is a second opinion, free, and it's yours to keep. If they're doing a good job the report will say so. |
| "How much is this going to cost?" | The audit is RM0. If you act on it, managed IT starts at RM1,500/month for up to 10 staff and RM3,500/month for 10–30. Fixed, no per-incident charges. |
| "Is this AI spam?" | Fair question. I read your site before writing. If {{one_specific_observation}} isn't true, tell me and I'll stop. |
| "Send me a brochure." | Will do — but the audit tells you more in 30 minutes than a PDF will. Can we do both? |
| "We're a cooperative, we don't buy software." | AGMX isn't sold as software; it's the AGM, run properly. Sixteen cooperatives have used it. |
| "PDPA doesn't apply to us." | It applies to anyone processing personal data in a commercial transaction — that includes employee and member records. And since June 2025 the 72-hour breach rule and the DPO requirement are live. |
| "Call me." | Gladly — WhatsApp +60 11-5403 4051 works best, or pick a slot here: {{booking_link}} |

---

## 5. Gate G1 decision rule

Fill in [`g1-campaign-log.csv`](./g1-campaign-log.csv) as you go. At the end of 14 days:

| Metric | Pass | Fail → what to do |
|---|---|---|
| **Malaysia data hit-rate** — prospects found with a valid owner-level contact ÷ target list size | **≥ 40%** | Below 40%: stop the outbound plan. Pivot to building the SSM/Google Maps layer first and use Explee only for enrichment + sending infrastructure. |
| **Positive reply rate** | **≥ 1%** | Below 1% with a ≥40% hit-rate: the data is fine, the channel is wrong. Move to the WhatsApp handoff before spending more. |
| **Cost per booked meeting** | **< RM150** | Above RM150: renegotiate the service price in §4.2 of the strategy, or don't launch the offer. |
| **Meetings → closed** | **≥ 10%** | Below 10%: the problem is the offer or the sales call, not the channel. Fix that before scaling spend. |

**All four must pass before any paid Explee spend.** If the hit-rate fails, the whole strategy
re-sequences and the Malaysia data layer becomes the first build, not the second.

---

## 6. Compliance — do this before the first send

Duta Integra sells PDPA compliance for RM3,500. Being reported for spam would end that positioning.
See [`pdpa-outbound-brief.md`](./pdpa-outbound-brief.md) for the briefing to take to a lawyer.

Minimum before anything sends:

- [ ] Legal opinion obtained on B2B direct marketing to business contacts under PDPA 2010 as amended
- [ ] Every email has a working unsubscribe, and opt-outs are recorded and honoured across campaigns
- [ ] A suppression list exists and is applied before every send
- [ ] Data-processing terms with Explee cover the Security Principle and the cross-border transfer
- [ ] A human approves copy and the send list
- [ ] Retention schedule set for prospect data, and a purge routine actually runs

---

## 7. What to do with the results

- **Pass** → proceed to Phase 2 of the strategy: build the Malaysia layer, add the WhatsApp handoff,
  register as an MDEC TSP, launch the AI Growth Engine offer at founder pricing to 5 design partners.
- **Fail on hit-rate** → the Explee data is not the asset; the *sending infrastructure and the agent
  stack* still are. Build the SSM layer, keep Explee for enrichment and delivery.
- **Fail on reply rate** → the Malaysian buyer is on WhatsApp, not email. Same conclusion, different
  emphasis: the WhatsApp handoff becomes the product, not an add-on.
