# Google Docs Template Setup Guide

**Duta Integra Solutions** — Step-by-step guide to create master templates in Google Docs

---

## Prerequisites

1. **Google Workspace account** with Drive access
2. **Editor permissions** on the shared folder
3. **Google Fonts** added: Inter, Rajdhani (via Google Fonts add-on or Extensis Fonts)

---

## Folder Structure Setup

```
Google Drive / Duta Integra / Business Documents /
├── Templates/ (Master templates — restricted)
│   ├── 01_Core_Identity/
│   │   ├── Letterhead (EN)
│   │   ├── Letterhead (BM)
│   │   ├── Business Card (EN)
│   │   ├── Business Card (BM)
│   │   ├── Email Signature (EN)
│   │   └── Email Signature (BM)
│   ├── 02_Legal_Contracts/
│   │   ├── Mutual NDA (EN)
│   │   ├── Mutual NDA (BM)
│   │   ├── Master Services Agreement (EN)
│   │   ├── Master Services Agreement (BM)
│   │   ├── Statement of Work (EN)
│   │   ├── Statement of Work (BM)
│   │   ├── Data Processing Addendum (EN)
│   │   └── Data Processing Addendum (BM)
│   ├── 03_Sales_Proposals/
│   │   ├── Proposal Template (EN)
│   │   ├── Proposal Template (BM)
│   │   ├── Quote Template (EN)
│   │   ├── Quote Template (BM)
│   │   ├── Invoice Template (EN)
│   │   ├── Invoice Template (BM)
│   │   ├── Project Acceptance (EN)
│   │   └── Project Acceptance (BM)
│   └── 04_Operations_HR/
│       ├── Meeting Notes (EN)
│       ├── Meeting Notes (BM)
│       ├── Incident Report (EN)
│       ├── Incident Report (BM)
│       ├── Offer Letter (EN)
│       ├── Offer Letter (BM)
│       ├── Testimonial Request (EN)
│       └── Testimonial Request (BM)
├── Working/ (Active documents — team access)
│   ├── Proposals/
│   ├── Contracts/
│   ├── Invoices/
│   └── HR/
└── Archive/ (Read-only)
```

---

## Creating a Master Template

### Step 1: Copy HTML to Google Docs

1. Open the source HTML file in browser (e.g., `business-docs/html/letterhead/letterhead-en.html`)
2. Select all content (Ctrl+A) → Copy (Ctrl+C)
3. In Google Drive → New → Google Docs → Blank document
4. Paste (Ctrl+V) — formatting should transfer

### Step 2: Apply Brand Styles

**Fonts** (Add via Extensis Fonts add-on or Google Fonts):
- **Display/Headings**: Rajdhani (weights 600, 700)
- **Body**: Inter (weights 400, 500, 600, 700)

**Colors** (Custom colors in Format → Text → Color → Custom):
- Navy: `#1E2D3D`
- Navy Ink: `#0F1822`
- Gold: `#C9A227`
- Gold Light: `#D4B03A`
- Gold Dark: `#A8851B`
- Gold Soft: `rgba(201, 162, 39, 0.14)`

### Step 3: Page Setup

**File → Page setup:**
- Paper size: A4 (210 × 297 mm)
- Margins: Top 25mm, Bottom 25mm, Left 20mm, Right 20mm
- Orientation: Portrait

### Step 4: Replace Static Content with Placeholders

Replace all static content with placeholder variables:

| Variable | Example | Description |
|----------|---------|-------------|
| `{{COMPANY_NAME}}` | Duta Integra Solutions Sdn Bhd | Legal company name |
| `{{COMPANY_BRAND}}` | Duta Integra Solutions | Brand name |
| `{{COMPANY_TAGLINE}}` | AI & IT Partner for Malaysian SMEs | EN tagline |
| `{{COMPANY_TAGLINE_BM}}` | Rakan Kongsi AI & IT untuk PKS Malaysia | BM tagline |
| `{{COMPANY_ADDRESS}}` | Cyberjaya, Malaysia | Location |
| `{{COMPANY_EMAIL}}` | hello@dutaintegra.my | Contact email |
| `{{COMPANY_PHONE}}` | +60 11-5403 4051 | Phone/WhatsApp |
| `{{COMPANY_WEBSITE}}` | https://dutaintegra.my | Website |
| `{{COMPANY_REG_NO}}` | [Registration Number] | SSM registration |
| `{{COMPANY_YEAR}}` | 2023 | Founded year |
| `{{CLIENT_NAME}}` | ABC Sdn Bhd | Client company name |
| `{{CLIENT_CONTACT}}` | Encik Ahmad | Contact person |
| `{{CLIENT_EMAIL}}` | ahmad@client.com | Client email |
| `{{CLIENT_PHONE}}` | +60 12-345 6789 | Client phone |
| `{{CLIENT_ADDRESS}}` | Kuala Lumpur, Malaysia | Client address |
| `{{PROJECT_NAME}}` | Website Redesign | Project name |
| `{{PROJECT_NUMBER}}` | PRJ-2025-001 | Internal project code |
| `{{PROJECT_START}}` | 01/01/2025 | Start date |
| `{{PROJECT_END}}` | 31/03/2025 | End date |
| `{{PROJECT_VALUE}}` | RM 50,000.00 | Project value |
| `{{PO_NUMBER}}` | PO-2025-001 | Purchase order number |
| `{{DOC_NUMBER}}` | PROP-2025-001 | Document reference |
| `{{DOC_DATE}}` | 15/01/2025 | Document date |
| `{{DOC_VERSION}}` | 1.0 | Version number |
| `{{DOC_STATUS}}` | Draft / Final | Document status |
| `{{PREPARED_BY}}` | [Your Name] | Author |
| `{{REVIEWED_BY}}` | [Reviewer Name] | Reviewer |
| `{{APPROVED_BY}}` | [Approver Name] | Approver |
| `{{VALID_UNTIL}}` | 30 days from date | Quote validity |
| `{{SIGNATURE_DATE}}` | 15/01/2025 | Signature date |
| `{{EFFECTIVE_DATE}}` | 01/01/2025 | Contract effective date |
| `{{TERM_YEARS}}` | 2 | Contract term in years |
| `{{TERM_MONTHS}}` | 12 | Contract term in months |
| `{{NOTICE_DAYS}}` | 30 | Notice period in days |
| `{{LIABILITY_CAP}}` | 12 months fees | Liability limitation |
| `{{GOVERNING_LAW}}` | Laws of Malaysia | Jurisdiction |
| `{{DISPUTE_VENUE}}` | Kuala Lumpur Courts | Dispute resolution |
| `{{NDA_TERM_YEARS}}` | 2 | NDA term |

---

## Document-Specific Instructions

### Letterhead
- Header: Logo + Company name + Tagline
- Footer: Address, phone, email, website, registration number
- Watermark: Logo at 3% opacity, centered
- Margins: 25mm top/bottom, 20mm sides

### Business Card (90×54mm)
- Front: Logo, Name, Title, Contact info
- Back: QR code placeholder, Tagline, Website
- Print: 3mm bleed, crop marks
- Double-sided printing

### Email Signature
- Table-based layout for Outlook/Gmail compatibility
- Max width: 600px
- Logo: 48×48px
- Gold divider line
- Social links: LinkedIn, GitHub

### Legal Documents (NDA, MSA, SoW, DPA)
- Use `legal-print.css` styles
- Page numbers on each page
- Signature blocks with company chop fields
- Page breaks for annexes
- Malaysian law, KL jurisdiction

### Proposal / Quote / Invoice
- Numbered line items with qty, unit price, total
- Subtotal, SST (8%), Total
- Payment terms: Net 30
- Bank details section

### Project Acceptance
- Deliverables checklist table
- Acceptance criteria verification table
- Known issues/exceptions section
- Warranty period specification
- Dual signature blocks with company chop

### Meeting Notes
- Attendees table with checkboxes
- Agenda with checkboxes
- Discussion points table
- Decisions table
- Action items table (Owner, Due, Status)
- Risks/Issues table
- Next meeting info

### Incident Report
- Incident metadata table
- Timeline table
- Root cause analysis
- Impact assessment table
- Preventive measures list
- Follow-up actions table
- Communication log
- Three-level approval (Prepared/Reviewed/Approved)

### Offer Letter
- Position details table
- Compensation breakdown table
- Benefits list
- Probation & termination clauses
- Background check contingency
- Dual signature with company chop

### Testimonial Request
- Guiding questions (6 questions)
- 5-star rating table
- Permission checkboxes
- Multiple submission methods

---

## Converting HTML to Google Docs (Automated)

### Option 1: Manual Copy-Paste (Recommended)
Best fidelity for complex layouts

### Option 2: Apps Script Import
```javascript
function importHtmlToDoc(htmlFileId, docTitle) {
  const htmlContent = DriveApp.getFileById(htmlFileId).getBlob().getDataAsString();
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();
  body.insertParagraph(0, htmlContent); // Basic import
  // Manual styling required after import
}
```

---

## Permissions Setup

### Master Templates Folder
- **Owner**: Founder/CEO
- **Admin**: Operations Lead
- **Legal Editor**: Edit legal templates only
- **Sales Editor**: Edit proposals/quotes/invoices
- **HR Editor**: Edit offer letters, meeting templates
- **Commenter**: All team members (can suggest)
- **Viewer**: External partners

### Sharing Settings
- Link sharing: **Restricted** (only added people)
- Editors cannot change permissions
- Commenters/Viewers cannot download/print/copy
- External access: Expiration dates (30 days default)

---

## Maintenance

### Monthly
- Review access permissions
- Remove expired external access
- Sync HTML updates to Google Docs

### Quarterly
- Full permission audit
- Template version review
- Sync HTML ↔ Google Docs

### Version Control
- Update `TEMPLATE_LINKS.md` with Google Docs file IDs
- Log changes in `CHANGELOG.md`
- Tag releases: `v1.0.0`, `v1.1.0`, etc.

---

## Quick Reference: Template Links

> Update these with actual Google Docs file IDs after creation:

| Document | EN Template ID | BM Template ID |
|----------|----------------|----------------|
| Letterhead | `1abc...` | `1def...` |
| Business Card | `1ghi...` | `1jkl...` |
| Email Signature | `1mno...` | `1pqr...` |
| NDA | `1stu...` | `1vwx...` |
| MSA | `1yz...` | `1abc...` |
| SoW | `1def...` | `1ghi...` |
| DPA | `1jkl...` | `1mno...` |
| Proposal | `1pqr...` | `1stu...` |
| Quote | `1vwx...` | `1yz...` |
| Invoice | `1abc...` | `1def...` |
| Project Acceptance | `1ghi...` | `1jkl...` |
| Meeting Notes | `1mno...` | `1pqr...` |
| Incident Report | `1pqr...` | `1stu...` |
| Offer Letter | `1stu...` | `1vwx...` |
| Testimonial Request | `1vwx...` | `1yz...` |

---

## Support

- **Google Docs Help**: https://support.google.com/docs
- **Apps Script Reference**: https://developers.google.com/apps-script/reference/document
- **Drive API**: https://developers.google.com/drive/api

---

*Last updated: 2025 | Duta Integra Solutions Sdn Bhd*