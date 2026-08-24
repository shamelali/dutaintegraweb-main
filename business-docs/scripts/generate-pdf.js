/**
 * PDF Generator for Duta Integra Business Documents
 * Uses Puppeteer to generate print-ready PDFs from HTML sources
 *
 * Usage:
 *   node generate-pdf.js                    # Generate all PDFs
 *   node generate-pdf.js --category=letterhead  # Generate specific category
 *   node generate-pdf.js --lang=en            # Generate specific language
 *   node generate-pdf.js --help               # Show help
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_DIR = path.join(__dirname, '..');
const HTML_DIR = path.join(BASE_DIR, 'html');
const OUTPUT_DIR = path.join(BASE_DIR, 'pdf-output');

const CATEGORIES = [
  'letterhead',
  'business-card',
  'email-signature',
  'nda',
  'msa',
  'sow',
  'dpa',
  'proposal',
  'quote',
  'invoice',
  'project-acceptance',
  'meeting-notes',
  'incident-report',
  'offer-letter',
  'testimonial-request'
];

const LANGUAGES = ['en', 'bm'];

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  category: null,
  lang: null,
  help: false
};

args.forEach(arg => {
  if (arg === '--help' || arg === '-h') options.help = true;
  else if (arg.startsWith('--category=')) options.category = arg.split('=')[1];
  else if (arg.startsWith('--lang=')) options.lang = arg.split('=')[1];
  else if (arg.startsWith('-c=')) options.category = arg.split('=')[1];
  else if (arg.startsWith('-l=')) options.lang = arg.split('=')[1];
});

if (options.help) {
  console.log(`
PDF Generator for Duta Integra Business Documents

Usage:
  node generate-pdf.js [options]

Options:
  --category, -c    Generate specific category (e.g., letterhead, business-card)
  --lang, -l        Generate specific language (en, bm)
  --help, -h        Show this help

Examples:
  node generate-pdf.js
  node generate-pdf.js --category=letterhead
  node generate-pdf.js --lang=en
  node generate-pdf.js --category=letterhead --lang=en

Categories: ${CATEGORIES.join(', ')}
Languages: ${LANGUAGES.join(', ')}
  `);
  process.exit(0);
}

function checkDependencies() {
  try {
    execSync('npx puppeteer --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    console.error('❌ Puppeteer not found. Install with: npm install puppeteer');
    return false;
  }
}

function getFilesToProcess() {
  const files = [];

  const categories = options.category ? [options.category] : CATEGORIES;
  const languages = options.lang ? [options.lang] : LANGUAGES;

  categories.forEach(cat => {
    const catDir = path.join(HTML_DIR, cat);
    if (!fs.existsSync(catDir)) return;

    languages.forEach(lang => {
      const file = path.join(catDir, `${cat}-${lang}.html`);
      if (fs.existsSync(file)) {
        files.push({
          category: cat,
          lang,
          input: file,
          output: path.join(OUTPUT_DIR, cat, `${cat}-${lang}.pdf`)
        });
      }
    });
  });

  return files;
}

async function generatePDF(fileInfo) {
  const { category, lang, input, output } = fileInfo;

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const script = `
    const puppeteer = require('puppeteer');
    const fs = require('fs');
    const path = require('path');

    (async () => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

      // Load the HTML file
      const fileUrl = 'file://' + path.resolve('${input.replace(/\\/g, '/')}');
      await page.goto(fileUrl, { waitUntil: 'networkidle0' });

      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');

      // Generate PDF
      const pdf = await page.pdf({
        path: '${output.replace(/\\/g, '/')}',
        format: 'A4',
        printBackground: true,
        margin: { top: '25mm', right: '20mm', bottom: '25mm', left: '20mm' },
        preferCSSPageSize: true
      });

      await browser.close();
      console.log('✅ Generated: ${output}');
    })().catch(err => {
      console.error('❌ Error generating ${output}:', err.message);
      process.exit(1);
    });
  `;

  const tempScript = path.join(OUTPUT_DIR, `generate-${category}-${lang}.js`);
  fs.writeFileSync(tempScript, script);

  try {
    execSync(`node "${tempScript}"`, {
      cwd: BASE_DIR,
      stdio: 'inherit',
      timeout: 60000
    });
    return true;
  } catch (e) {
    console.error(`❌ Failed to generate ${output}`);
    return false;
  } finally {
    if (fs.existsSync(tempScript)) fs.unlinkSync(tempScript);
  }
}

async function main() {
  console.log('📄 Duta Integra — PDF Generator');
  console.log('=================================\n');

  if (!checkDependencies()) {
    process.exit(1);
  }

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = getFilesToProcess();

  if (files.length === 0) {
    console.log('⚠️  No files to process. Check category/lang options.');
    process.exit(0);
  }

  console.log(`Processing ${files.length} file(s)...\n`);

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const result = await generatePDF(file);
    if (result) success++;
    else failed++;
  }

  console.log('\n=================================');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});