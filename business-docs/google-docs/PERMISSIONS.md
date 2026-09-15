# Google Docs Permissions & Access Control

**Duta Integra Solutions** — Access control policy for business document templates

---

## Folder Structure & Permissions

```
Google Drive / Duta Integra / Business Documents /
├── Templates/ (Master templates — restricted)
│   ├── 01_Core_Identity/
│   ├── 02_Legal_Contracts/
│   ├── 03_Sales_Proposals/
│   └── 04_Operations_HR/
├── Working/ (Active documents — team access)
│   ├── Proposals/
│   ├── Contracts/
│   ├── Invoices/
│   └── HR/
└── Archive/ (Read-only)
```

---

## Role Definitions

| Role | Description | Who |
|------|-------------|-----|
| **Owner** | Full control, can delete, transfer ownership | Founder/CEO |
| **Admin** | Manage permissions, create folders, approve access | Operations Lead |
| **Editor (Legal)** | Edit legal templates, create contracts | Legal Counsel, Founder |
| **Editor (Sales)** | Edit proposals, quotes, invoices | Sales Team, Founder |
| **Editor (HR)** | Edit offer letters, meeting templates | HR Lead, Founder |
| **Commenter** | Review, suggest changes, cannot edit | All team members, external reviewers |
| **Viewer** | Read-only access | External partners, auditors |

---

## Permission Matrix

| Folder / Document | Owner | Admin | Legal Editor | Sales Editor | HR Editor | Commenter | Viewer |
|-------------------|-------|-------|--------------|--------------|-----------|-----------|--------|
| **Templates/** | ✅ | ✅ | ✅ | ✅ | ✅ | 💬 | 👁️ |
| Templates/01_Core_Identity | ✅ | ✅ | | ✅ | | 💬 | 👁️ |
| Templates/02_Legal_Contracts | ✅ | ✅ | ✅ | | | 💬 | 👁️ |
| Templates/03_Sales_Proposals | ✅ | ✅ | | ✅ | | 💬 | 👁️ |
| Templates/04_Operations_HR | ✅ | ✅ | | | ✅ | 💬 | 👁️ |
| **Working/** | ✅ | ✅ | ✅ | ✅ | ✅ | 💬 | 👁️ |
| Working/Proposals | ✅ | ✅ | | ✅ | | 💬 | 👁️ |
| Working/Contracts | ✅ | ✅ | ✅ | | | 💬 | 👁️ |
| Working/Invoices | ✅ | ✅ | | ✅ | | 💬 | 👁️ |
| Working/HR | ✅ | ✅ | | | ✅ | 💬 | 👁️ |
| **Archive/** | ✅ | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ |

---

## Access Request Process

### For New Team Members
1. **Manager submits request** via internal form/email to Admin
2. **Admin assigns role** based on function:
   - Sales → Editor (Sales) + Commenter on Legal
   - Legal → Editor (Legal) + Commenter on Sales
   - HR → Editor (HR) + Commenter on Operations
   - Developers/Engineers → Commenter on all
3. **Admin grants access** within 1 business day
4. **Welcome email** sent with folder links and guidelines

### For External Parties
1. **Requestor submits** purpose and duration
2. **Admin reviews** and sets expiration date
3. **Access granted** as Viewer or Commenter only
4. **Auto-expiry** set (default: 30 days)
5. **Audit log** maintained

### For Former Employees
1. **Offboarding checklist** includes access removal
2. **Admin revokes** all access on last day
3. **Transfer ownership** of any owned docs to Admin
4. **Audit log** reviewed monthly

---

## Document Lifecycle Permissions

### Template Creation (Master)
1. **Author** creates in Templates/ folder
2. **Legal/Sales/HR Editor** reviews
3. **Admin** locks template (View-only for all except Owner/Admin)
3. **Version** recorded in CHANGELOG.md

### Document Creation (Working)
1. **Team member** copies template to Working/ folder
2. **Fills in** client/project details
4. **Shares with client** as Viewer/Commenter (with expiry)
5. **Finalizes** → moves to Archive/ or client folder

### Client Sharing
- **Default**: Viewer access, 30-day expiry
- **Negotiation**: Commenter access, 60-day expiry
- **Signed contracts**: Viewer, no expiry (Archive)
- **Invoices**: Viewer, 90-day expiry

---

## Security Settings

### Required for All Templates
- [ ] **Version history** enabled
- [ ] **Download/print/copy** restricted for Commenters/Viewers
- [ ] **Editors can change permissions** = OFF (except Owner/Admin)
- [ ] **Link sharing** = Restricted (only added people)
- [ ] **Expiration dates** set for external access

### For Legal Documents (NDA, MSA, DPA)
- [ ] **Additional restriction**: No download/print for Commenters
- [ ] **Watermark**: "CONFIDENTIAL — DRAFT" until signed
- [ ] **Access log** reviewed quarterly

---

## Audit & Compliance

### Monthly Review (Admin)
- [ ] Review access list for all folders
- [ ] Remove expired external access
- [ ] Verify no unauthorized editors on Templates/
- [ ] Check for orphaned documents in Working/

### Quarterly Review (Owner + Admin)
- [ ] Full permission audit
- [ ] Review external access logs
- [ ] Update role assignments for role changes
- [ ] Archive old versions

### Annual Compliance
- [ ] Data retention policy review
- [ ] Access control policy update
- [ ] Team training on document handling

---

## Tools & Automation

### Recommended Google Workspace Settings
- **Drive API**: Enable for audit logs
- **Alert Center**: Configure for permission changes
- **Security Dashboard**: Monitor external sharing
- **Data Loss Prevention (DLP)**: Rules for confidential keywords

### Helpful Scripts (Apps Script)
- **Auto-expire external access** after 30 days
- **Monthly permission report** emailed to Admin
- **Template lock** on version publish
- **Naming convention enforcer** on file create

---

## Quick Reference Commands

```bash
# List all files in Templates folder (requires Drive API)
gdrive list --query "'TEMPLATES_FOLDER_ID' in parents"

# Check permissions for a file
gdrive info FILE_ID

# Remove user from file
gdrive revoke FILE_ID USER_EMAIL

# Add user as commenter
gdrive share FILE_ID --role commenter --type user --email USER_EMAIL

# Set expiration on permission
gdrive modify FILE_ID --expiration "2025-12-31T23:59:59"
```

---

## Emergency Contacts

| Role | Name | Contact | Backup |
|------|------|---------|--------|
| Owner | [Founder Name] | [Email/Phone] | [Admin Name] |
| Admin | [Admin Name] | [Email/Phone] | [Legal Counsel] |
| Legal Counsel | [Lawyer Name] | [Email/Phone] | [External Firm] |

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-01-15 | Initial permissions policy | Duta Integra Team |

---

*Confidential — Internal Use Only*
*Duta Integra Solutions Sdn Bhd*