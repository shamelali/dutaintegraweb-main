# Changelog

**Duta Integra Solutions — Business Communication Documents**

All notable changes to this document suite will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Initial project structure and plan
- Brand variables and print CSS
- Phase 1: Core Identity documents (EN + BM)
  - Letterhead (EN + BM)
  - Business Card (EN + BM)
  - Email Signature (EN + BM)
- Shared assets (logos, watermark)
- Print base styles and legal print styles
- Terminology glossary (EN ↔ BM)
- Google Docs template links structure
- Permissions and access control policy

---

## [1.0.0] - 2025-01-15

### Added
- **Phase 1: Core Identity** (Complete)
  - Letterhead (EN + BM) — A4, watermark, print-ready
  - Business Card (EN + BM) — 90×54mm, double-sided, QR code placeholder
  - Email Signature (EN + BM) — HTML table-based, cross-client compatible
- **Shared Infrastructure**
  - Brand variables CSS (colors, fonts, spacing, typography)
  - Print base CSS (A4, margins, page breaks)
  - Legal print CSS (legal document formatting)
  - Brand assets (SVG logos, watermark)
- **Documentation**
  - README.md with full project overview
  - TERMINOLOGY_GLOSSARY.md (EN ↔ BM glossary)
  - Google Docs TEMPLATE_LINKS.md
  - Google Docs PERMISSIONS.md
  - This CHANGELOG.md

### Technical
- Print-optimized CSS with `@media print` rules
- CSS custom properties for brand theming
- Cross-client compatible email signature (table-based)
- Print-optimized business cards (90×54mm, 3mm bleed)
- Watermark support for drafts
- SEO-friendly HTML structure
- Responsive preview modes with print-only content

---

## [1.1.0] - Planned (Phase 2: Legal Core)

### To Be Added
- Mutual NDA (EN + BM)
- Master Services Agreement - MSA (EN + BM)
- Statement of Work Template (EN + BM)
- Data Processing Addendum - DPA (EN + BM)

### Legal Review Required
- Malaysian contract law compliance
- PDPA 2010 compliance
- KL jurisdiction clauses
- Company chop fields for signatures

---

## [1.2.0] - Planned (Phase 3: Sales Suite)

### To Be Added
- Proposal Template
- Quote / Estimate Template
- Invoice Template
- Project Acceptance / Sign-off

---

## [1.3.0] - Planned (Phase 4: Operations & HR)

### To Be Added
- Meeting Notes Template
- Incident Report
- Offer Letter
- Testimonial Request

---

## [1.4.0] - Planned (Phase 5: Google Docs Sync)

### To Be Added
- Google Docs master templates for all 15 documents
- Placeholder variable system
- Permission structure implementation
- Template links documentation

---

## [1.5.0] - Planned (Phase 6: Review & QA)

### To Be Added
- Legal counsel review sign-off
- BM native speaker review
- Print testing (Chrome, Firefox, Safari)
- PDF generation validation
- Cross-browser email signature testing
- Final delivery package

---

## Version History Summary

| Version | Date | Phase | Status |
|---------|------|-------|--------|
| 0.1.0 | 2025-01-15 | Phase 1: Core Identity | ✅ Complete |
| 1.1.0 | TBD | Phase 2: Legal Core | 📋 Planned |
| 1.2.0 | TBD | Phase 3: Sales Suite | 📋 Planned |
| 1.3.0 | TBD | Phase 4: Operations | 📋 Planned |
| 1.4.0 | TBD | Phase 5: Google Docs | 📋 Planned |
| 1.5.0 | TBD | Phase 6: QA & Delivery | 📋 Planned |

---

## Contributing

### Adding New Documents
1. Create HTML in appropriate `html/{category}/` folder
2. Create EN and BM versions
3. Use shared CSS variables and print styles
4. Add to README.md document table
5. Add placeholder variables to Google Docs TEMPLATE_LINKS.md
5. Update CHANGELOG.md
6. Request review (Legal for legal docs, BM reviewer for translations)

### Updating Existing Documents
1. Make changes to HTML files
2. Update BM version if content changed
5. Update CHANGELOG.md with version bump
6. Regenerate PDFs if needed
6. Sync Google Docs templates

### Version Bumping
- **Patch** (1.0.x): Typos, minor style fixes, CSS tweaks
- **Minor** (1.x.0): New documents, new features, significant content changes
- **Major** (x.0.0): Structural changes, breaking changes to templates

---

*Changelog maintained per [Keep a Changelog](https://keepachangelog.com/)*