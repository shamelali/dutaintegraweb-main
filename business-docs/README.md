# Duta Integra Solutions - Business Communication Documents

A comprehensive suite of 15 professional business communication documents for Duta Integra Solutions Sdn Bhd, all bilingual (English + Bahasa Malaysia), dual format (HTML + Google Docs).

## 📁 Structure

```
business-docs/
├── html/
│   ├── shared/
│   │   ├── brand-variables.css      # Brand colors, fonts, spacing
│   │   ├── print-base.css           # Print styles for all docs
│   │   ├── legal-print.css          # Legal document print styles
│   │   └── assets/
│   │       ├── logo-primary.svg     # Primary logo
│   │       ├── logo-gold.svg        # Gold variant logo
│   │       └── watermark.svg        # Watermark for drafts
│   ├── letterhead/
│   ├── business-card/
│   ├── email-signature/
│   ├── nda/
│   ├── msa/
│   ├── sow/
│   ├── dpa/
│   ├── proposal/
│   ├── quote/
│   ├── invoice/
│   ├── project-acceptance/
│   ├── meeting-notes/
│   ├── incident-report/
│   ├── offer-letter/
│   └── testimonial-request/
├── google-docs/
│   ├── TEMPLATE_LINKS.md
│   └── PERMISSIONS.md
└── scripts/
    ├── generate-pdf.js
    └── validate-all.js
```

## 📋 Document Suite (15 Documents)

### Tier 1: Core Identity (3 docs)
1. **Letterhead** - Official correspondence header
2. **Business Card** - 90×54mm, double-sided, print-ready
3. **Email Signature** - HTML table-based, cross-client compatible

### Tier 2: Legal & Contracts (4 docs)
4. **Mutual NDA** - Malaysian law, KL jurisdiction, 2-year term
5. **Master Services Agreement (MSA)** - Core retainer contract
6. **Statement of Work (SoW)** - Project-based work orders
7. **Data Processing Addendum (DPA)** - PDPA/GDPR compliant

### Tier 3: Sales & Proposals (4 docs)
8. **Proposal Template** - Standardized client proposals
9. **Quote / Estimate** - 30-day validity, SST inclusive
10. **Invoice Template** - Net 30, SST 8%, bank details
11. **Project Acceptance / Sign-off** - Delivery confirmation

### Tier 4: Operations & HR (4 docs)
12. **Meeting Notes Template** - Standardized minutes
13. **Incident Report** - IT/security tracking
14. **Offer Letter** - Employment offers
15. **Testimonial Request** - Client feedback collection

## 🎨 Brand Identity

| Element | Specification |
|---------|--------------|
| **Company** | Duta Integra Solutions Sdn Bhd |
| **Location** | Cyberjaya, Malaysia |
| **Founded** | 2023 |
| **Email** | hello@dutaintegra.my |
| **Phone** | +60 11-5403 4051 |
| **Website** | https://dutaintegra.my |
| **Primary Navy** | #1E2D3D (main), #0F1822 (ink) |
| **Primary Gold** | #C9A227 |
| **Fonts** | Inter (body), Rajdhani (display) |

## 🌐 Bilingual Support

All 15 documents available in **English + Bahasa Malaysia** with terminology glossary.

| English | Bahasa Malaysia |
|---------|-----------------|
| AI & IT Partner | Rakan Kongsi AI & IT |
| Malaysian SMEs | PKS Malaysia |
| Managed IT Services | Perkhidmatan IT Terurus |
| Statement of Work | Pernyataan Kerja |
| Confidential Information | Maklumat Sulit |
| Intellectual Property | Harta Intelek |

## 🚀 Quick Start

### View Documents (HTML)
Open any `.html` file in a browser:
- `html/letterhead/letterhead-en.html`
- `html/business-card/business-card-en.html`
- `html/email-signature/email-signature-en.html`

### Print / Save as PDF
1. Open HTML file in browser
2. Click "Print / Save as PDF" button
3. Select "Save as PDF" or your printer
4. For business cards: prints front + back on separate pages

### Google Docs Templates
See `google-docs/TEMPLATE_LINKS.md` for links to editable templates.

## 🔧 Development

### Generate PDFs (requires Node.js + Puppeteer)
```bash
cd business-docs/scripts
npm install puppeteer
node generate-pdf.js
```

### Validate HTML
```bash
node validate-all.js
```

## 📋 Quality Checklist

- [ ] Brand colors/fonts applied correctly
- [ ] Logo placement correct (clear space maintained)
- [ ] Print CSS tested (A4, Letter, no cut-off)
- [ ] BM translation reviewed by native speaker
- [ ] Legal docs reviewed by counsel
- [ ] HTML validates (W3C)
- [ ] Print preview perfect (no overflow)
- [ ] Google Docs template created & shared
- [ ] Placeholder variables documented
- [ ] Version logged in CHANGELOG

## 📅 Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Core Identity | Week 1 | Letterhead, Business Card, Email Signature (EN+BM) ✅ |
| Phase 2: Legal Core | Week 2 | NDA, MSA, SoW, DPA (EN+BM) |
| Phase 3: Sales Suite | Week 3 | Proposal, Quote, Invoice, Project Acceptance (EN+BM) |
| Phase 4: Operations | Week 4 | Meeting Notes, Incident Report, Offer Letter, Testimonial (EN+BM) |
| Phase 5: Google Docs Sync | Week 5 | All templates in Google Drive |
| Phase 6: Review & QA | Week 6 | Legal review, BM review, print testing |

## 🔗 Google Docs Setup

1. Create folder: `Duta Integra / Business Documents / Templates`
2. Create master template per document type
3. Use placeholder variables: `{{COMPANY_NAME}}`, `{{CLIENT_NAME}}`, `{{DATE}}`, `{{PROJECT_NAME}}`, `{{AMOUNT}}`
4. Set permissions: Comment-only for reviewers, Edit for authorized team

## 📞 Support

For questions or issues:
- **Email**: hello@dutaintegra.my
- **Phone**: +60 11-5403 4051
- **Website**: https://dutaintegra.my

---

*Duta Integra Solutions Sdn Bhd — AI & IT Partner for Malaysian SMEs*
*Cyberjaya, Malaysia | Since 2023*