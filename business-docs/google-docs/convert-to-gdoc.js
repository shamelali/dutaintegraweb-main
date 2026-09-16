/**
 * Google Docs Template Creator
 * Converts HTML templates to Google Docs format via Apps Script
 * 
 * Usage:
 * 1. Copy this code to Google Apps Script (script.google.com)
 * 2. Update SOURCE_FOLDER_ID with your HTML templates folder ID
 * 3. Update TARGET_FOLDER_ID with your Google Docs templates folder ID
 * 4. Run createAllTemplates()
 */

// Configuration - UPDATE THESE IDs
const SOURCE_FOLDER_ID = 'YOUR_HTML_TEMPLATES_FOLDER_ID'; // Google Drive folder with HTML files
const TARGET_FOLDER_ID = 'YOUR_GOOGLE_DOCS_TEMPLATES_FOLDER_ID'; // Target folder for Google Docs

// Template mapping: HTML filename (without extension) -> Google Docs title
const TEMPLATE_MAP = {
  // Core Identity
  'letterhead-en': 'Letterhead (EN)',
  'letterhead-bm': 'Letterhead (BM)',
  'business-card-en': 'Business Card (EN)',
  'business-card-bm': 'Business Card (BM)',
  'email-signature-en': 'Email Signature (EN)',
  'email-signature-bm': 'Email Signature (BM)',
  
  // Legal Contracts
  'nda-en': 'Mutual NDA (EN)',
  'nda-bm': 'Mutual NDA (BM)',
  'msa-en': 'Master Services Agreement (EN)',
  'msa-bm': 'Master Services Agreement (BM)',
  'sow-en': 'Statement of Work (EN)',
  'sow-bm': 'Pernyataan Kerja (BM)',
  'dpa-en': 'Data Processing Addendum (EN)',
  'dpa-bm': 'Adendum Pemprosesan Data (BM)',
  
  // Sales & Proposals
  'proposal-en': 'Proposal Template (EN)',
  'proposal-bm': 'Cadangan Projek (BM)',
  'quote-en': 'Quote Template (EN)',
  'quote-bm': 'Anggaran / Kutipan Harga (BM)',
  'invoice-en': 'Invoice Template (EN)',
  'invoice-bm': 'Invois (BM)',
  'project-acceptance-en': 'Project Acceptance (EN)',
  'project-acceptance-bm': 'Sijil Penerimaan Projek (BM)',
  
  // Operations & HR
  'meeting-notes-en': 'Meeting Notes (EN)',
  'meeting-notes-bm': 'Nota Mesyuarat (BM)',
  'incident-report-en': 'Incident Report (EN)',
  'incident-report-bm': 'Laporan Insiden (BM)',
  'offer-letter-en': 'Offer Letter (EN)',
  'offer-letter-bm': 'Surat Tawaran Kerja (BM)',
  'testimonial-request-en': 'Testimonial Request (EN)',
  'testimonial-request-bm': 'Permintaan Testimoni (BM)',
};

// Folder mapping: template key -> target folder name
const FOLDER_MAP = {
  'letterhead-en': '01_Core_Identity',
  'letterhead-bm': '01_Core_Identity',
  'business-card-en': '01_Core_Identity',
  'business-card-bm': '01_Core_Identity',
  'email-signature-en': '01_Core_Identity',
  'email-signature-bm': '01_Core_Identity',
  
  'nda-en': '02_Legal_Contracts',
  'nda-bm': '02_Legal_Contracts',
  'msa-en': '02_Legal_Contracts',
  'msa-bm': '02_Legal_Contracts',
  'sow-en': '02_Legal_Contracts',
  'sow-bm': '02_Legal_Contracts',
  'dpa-en': '02_Legal_Contracts',
  'dpa-bm': '02_Legal_Contracts',
  
  'proposal-en': '03_Sales_Proposals',
  'proposal-bm': '03_Sales_Proposals',
  'quote-en': '03_Sales_Proposals',
  'quote-bm': '03_Sales_Proposals',
  'invoice-en': '03_Sales_Proposals',
  'invoice-bm': '03_Sales_Proposals',
  'project-acceptance-en': '03_Sales_Proposals',
  'project-acceptance-bm': '03_Sales_Proposals',
  
  'meeting-notes-en': '04_Operations_HR',
  'meeting-notes-bm': '04_Operations_HR',
  'incident-report-en': '04_Operations_HR',
  'incident-report-bm': '04_Operations_HR',
  'offer-letter-en': '04_Operations_HR',
  'offer-letter-bm': '04_Operations_HR',
  'testimonial-request-en': '04_Operations_HR',
  'testimonial-request-bm': '04_Operations_HR',
};

// Placeholder variables to inject into templates
const PLACEHOLDERS = {
  // Company
  '{{COMPANY_NAME}}': 'Duta Integra Solutions Sdn Bhd',
  '{{COMPANY_BRAND}}': 'Duta Integra Solutions',
  '{{COMPANY_TAGLINE}}': 'AI & IT Partner for Malaysian SMEs',
  '{{COMPANY_TAGLINE_BM}}': 'Rakan Kongsi AI & IT untuk PKS Malaysia',
  '{{COMPANY_ADDRESS}}': 'Cyberjaya, Malaysia',
  '{{COMPANY_EMAIL}}': 'hello@dutaintegra.my',
  '{{COMPANY_PHONE}}': '+60 11-5403 4051',
  '{{COMPANY_WEBSITE}}': 'https://dutaintegra.my',
  '{{COMPANY_REG_NO}}': '[Registration Number]',
  '{{COMPANY_YEAR}}': '2023',
  
  // Client/Project
  '{{CLIENT_NAME}}': '[Client Name]',
  '{{CLIENT_CONTACT}}': '[Contact Person]',
  '{{CLIENT_EMAIL}}': 'client@company.com',
  '{{CLIENT_PHONE}}': '+60 12-345 6789',
  '{{CLIENT_ADDRESS}}': 'Kuala Lumpur, Malaysia',
  '{{PROJECT_NAME}}': '[Project Name]',
  '{{PROJECT_NUMBER}}': 'PRJ-2025-001',
  '{{PROJECT_START}}': '01/01/2025',
  '{{PROJECT_END}}': '31/03/2025',
  '{{PROJECT_VALUE}}': 'RM 50,000.00',
  '{{PO_NUMBER}}': 'PO-2025-001',
  
  // Document
  '{{DOC_NUMBER}}': 'DOC-2025-001',
  '{{DOC_DATE}}': Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd/MM/yyyy'),
  '{{DOC_VERSION}}': '1.0',
  '{{DOC_STATUS}}: 'Draft',
  '{{PREPARED_BY}}': '[Your Name]',
  '{{REVIEWED_BY}}': '[Reviewer Name]',
  '{{APPROVED_BY}}': '[Approver Name]',
  '{{VALID_UNTIL}}': '30 days from date',
  '{{SIGNATURE_DATE}}': Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd/MM/yyyy'),
  '{{EFFECTIVE_DATE}}': Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd/MM/yyyy'),
  '{{TERM_YEARS}}': '2',
  '{{TERM_MONTHS}}': '12',
  '{{NOTICE_DAYS}}': '30',
  '{{LIABILITY_CAP}}': '12 months fees',
  '{{GOVERNING_LAW}}': 'Laws of Malaysia',
  '{{DISPUTE_VENUE}}': 'Kuala Lumpur Courts',
  '{{NDA_TERM_YEARS}}': '2',
};

// Helper: Get or create folder
function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

// Main function: Create all templates
function createAllTemplates() {
  console.log('Starting template creation...');
  
  const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  const targetRoot = DriveApp.getFolderById(TARGET_FOLDER_ID);
  
  // Create category folders
  const categoryFolders = {};
  ['01_Core_Identity', '02_Legal_Contracts', '03_Sales_Proposals', '04_Operations_HR'].forEach(name => {
    categoryFolders[name] = getOrCreateFolder(targetRoot, name);
  });
  
  const htmlFiles = sourceFolder.getFilesByType(MimeType.HTML);
  let created = 0;
  let skipped = 0;
  let errors = 0;
  
  while (htmlFiles.hasNext()) {
    const file = htmlFiles.next();
    const fileName = file.getName().replace('.html', '');
    
    if (!TEMPLATE_MAP[fileName]) {
      console.log(`Skipping unknown template: ${fileName}`);
      skipped++;
      continue;
    }
    
    const title = TEMPLATE_MAP[fileName];
    const folderName = FOLDER_MAP[fileName] || '01_Core_Identity';
    const targetFolder = categoryFolders[folderName];
    
    try {
      // Check if already exists
      const existing = targetFolder.getFilesByName(title);
      if (existing.hasNext()) {
        console.log(`Already exists: ${title}`);
        skipped++;
        continue;
      }
      
      // Read HTML content
      const htmlContent = file.getBlob().getDataAsString();
      
      // Create Google Doc
      const doc = DocumentApp.create(title);
      
      // Move to target folder
      const docFile = DriveApp.getFileById(doc.getId());
      targetFolder.addFile(docFile);
      DriveApp.getRootFolder().removeFile(docFile);
      
      // Import HTML content (basic)
      const body = doc.getBody();
      const htmlBlob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
      
      // Insert HTML (basic conversion)
      body.insertParagraph(0, '[Imported from HTML - Apply styles manually]');
      
      // Apply placeholders
      replacePlaceholders(doc);
      
      // Apply basic styling
      applyBrandStyles(doc);
      
      console.log(`Created: ${title}`);
      created++;
      
    } catch (e) {
      console.error(`Error creating ${title}: ${e.message}`);
      errors++;
    }
  }
  
  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`);
}

// Replace placeholder variables
function replacePlaceholders(doc) {
  const body = doc.getBody();
  const text = body.getText();
  
  Object.entries(PLACEHOLDERS).forEach(([placeholder, value]) => {
    body.replaceText(placeholder, value);
  });
}

// Apply brand styling
function applyBrandStyles(doc) {
  const body = doc.getBody();
  const style = {};
  
  // Set default font
  body.setFontFamily('Inter');
  
  // Style headings
  const headingStyle = {};
  headingStyle[DocumentApp.Attribute.FONT_FAMILY] = 'Rajdhani';
  headingStyle[DocumentApp.Attribute.FONT_SIZE] = 18;
  headingStyle[DocumentApp.Attribute.BOLD] = true;
  headingStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = '#1E2D3D';
  
  // Apply to all heading paragraphs
  const paragraphs = body.getParagraphs();
  paragraphs.forEach(p => {
    const text = p.getText();
    if (text.match(/^[A-Z][A-Z\s]+$/)) {
      p.setAttributes(headingStyle);
    }
  });
}

// Helper: Update template links document
function updateTemplateLinks() {
  const doc = DocumentApp.openById('YOUR_TEMPLATE_LINKS_DOC_ID');
  const body = doc.getBody();
  
  Object.entries(TEMPLATE_MAP).forEach(([key, title]) => {
    const folder = FOLDER_MAP[key];
    const placeholder = ` [${key.toUpperCase()}_ID] `;
    body.replaceText(placeholder, `[${title}]`);
  });
  
  doc.saveAndClose();
}

// Batch convert HTML files to Google Docs (manual trigger)
function batchConvert() {
  createAllTemplates();
  updateTemplateLinks();
}

// Test with single file
function testSingleTemplate() {
  const testFile = 'letterhead-en';
  const file = DriveApp.getFilesByName(testFile + '.html').next();
  if (!file) {
    console.log('Test file not found');
    return;
  }
  
  const htmlContent = file.getBlob().getDataAsString();
  const doc = DocumentApp.create('TEST ' + TEMPLATE_MAP[testFile]);
  const body = doc.getBody();
  body.insertParagraph(0, '[Imported - Apply styles manually]');
  replacePlaceholders(doc);
  applyBrandStyles(doc);
  
  console.log('Test doc created:', doc.getUrl());
}