# Handoff: Brand Pages & Documentation Project

**Date:** 2026-09-15
**Status:** 🟢 Completed — Implementation Done

---

## Objective

Create 6 new brand/product pages from the `Web/autonomous-ops.html` template and 10 Obsidian-compatible markdown documentation files. All pages must integrate seamlessly with the existing site navigation and maintain design consistency.

---

## Pages to Create

| # | Brand | File | Purpose |
|---|-------|------|---------|
| 1 | Flowmail | `Web/flowmail.html` | AI email automation |
| 2 | Praxis | `Web/praxis.html` | Business process automation |
| 3 | Ontrac | `Web/ontrac.html` | Operational workflow management |
| 4 | Sensai | `Web/sensai.html` | Intelligent learning systems |
| 5 | Integrall | `Web/integrall.html` | Autonomous AI agent operations |
| 6 | DutaConnect | `Web/dutaconnect.html` | Client flow & sales automation |

### Template Source
- **File:** `Web/autonomous-ops.html` (657 lines)
- **Structure:** Hero → Features → Use Cases → Guardrails → Pricing → Contact Form → Tech Stack → Footer
- **Shared Elements:** Navigation, breadcrumbs, social links, copyright, pricing cards, contact form

### Per-Page Customizations
Each page requires unique:
- Hero text, tagline, and CTAs
- Feature grid (6 items with icons)
- Use case cards (3 scenarios)
- Guardrails section (compliance/safety points)
- Social links and copyright referencing the specific brand
- Breadcrumb navigation

---

## Documentation to Create

Create `docs/` folder with 10 Obsidian-compatible markdown files:

| File | Product |
|------|---------|
| `docs/Flowmail.md` | Flowmail |
| `docs/Praxis.md` | Praxis |
| `docs/Ontrac.md` | Ontrac |
| `docs/Sensai.md` | Sensai |
| `docs/Integrall.md` | Integrall |
| `docs/DutaConnect.md` | DutaConnect |
| `docs/Architecture.md` | System architecture overview |
| `docs/Guardrails.md` | Safety & compliance framework |
| `docs/Deployment.md` | Deployment guide |
| `docs/FAQ.md` | Frequently asked questions |

### Markdown Format
```yaml
---
title: Brand Name
slug: brand-name
status: draft
product: brand-name
---

# Brand Name

## Overview
...
```

---

## Navigation Updates

**Files:** All Web/*.html files

Add all 7 pages (including original `autonomous-ops.html`) to main navigation:

```html
<!-- Brand links added after Autonomous Ops -->
<li><a href="flowmail.html">Flowmail</a></li>
<li><a href="praxis.html">Praxis</a></li>
<li><a href="ontrac.html">Ontrac</a></li>
<li><a href="sensai.html">Sensai</a></li>
<li><a href="integrall.html">Integrall</a></li>
<li><a href="dutaconnect.html">DutaConnect</a></li>
```

---

## Reference File Analysis

**`Web/autonomous-ops.html`** key sections:
- Lines 1-50: Head, meta tags, CSS links
- Lines 50-150: Hero section with gradient background
- Lines 150-300: Features grid (6 cards with SVG icons)
- Lines 300-400: Use cases (3 scenario cards)
- Lines 400-450: Guardrails section
- Lines 450-550: Pricing (3 tiers)
- Lines 550-600: Contact form
- Lines 600-650: Tech stack, footer, scripts

### CSS Classes to Preserve
- `.hero-gradient` — gradient background
- `.feature-card` — feature grid items
- `.use-case-card` — scenario cards
- `.guardrails` — compliance section
- `.pricing-card` — pricing tiers
- `.contact-form` — form styling

---

## Important Constraints

1. **Design Consistency** — All pages must match existing visual language
2. **Responsive** — Mobile-first, works on all screen sizes
3. **Performance** — No heavy assets, lazy load images
4. **Accessibility** — Semantic HTML, ARIA labels, keyboard nav
5. **SEO** — Unique meta titles/descriptions per page
6. **Internal Only** — DutaConnect references eplee.com (keep internal)

---

## Next Steps

1. ✅ Read `Web/autonomous-ops.html` fully (657 lines)
2. ✅ Create 6 new HTML pages with brand-specific content
3. ✅ Create 10 markdown docs in `docs/` folder
4. ✅ Update navigation with all brand links
5. ✅ Test all pages locally
6. ⏳ Commit and push to main
7. ⏳ Deploy to Vercel

---

## Deployment

```bash
# Commit changes
git add .
git commit -m "feat: add 6 brand pages and 10 obsidian docs"

# Push to main
git push origin main

# Deploy to Vercel
vercel --prod
```

---

## Questions to Resolve

- [ ] Confirm brand names match existing trademarks
- [ ] Verify pricing tiers are correct per product
- [ ] Check social links are accurate per brand
- [ ] Ensure contact form backend supports all pages

---

**Handoff prepared by:** opencode
**Ready for implementation:** Yes
