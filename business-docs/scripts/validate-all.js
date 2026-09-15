/**
 * HTML Validator for Duta Integra Business Documents
 * Validates HTML structure, checks for required elements, validates against schema
 *
 * Usage:
 *   node validate-all.js                    # Validate all HTML files
 *   node validate-all.js --category=letterhead  # Validate specific category
 *   node validate-all.js --fix              # Auto-fix minor issues
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');
const HTML_DIR = path.join(BASE_DIR, 'html');

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

const REQUIRED_META = [
  'charset',
  'viewport'
];

const REQUIRED_LINKS = [
  'fonts.googleapis.com',
  'brand-variables.css',
  'print-base.css'
];

const args = process.argv.slice(2);
const options = {
  category: null,
  fix: false,
  help: false
};

args.forEach(arg => {
  if (arg === '--help' || arg === '-h') options.help = true;
  else if (arg === '--fix') options.fix = true;
  else if (arg.startsWith('--category=')) options.category = arg.split('=')[1];
  else if (arg.startsWith('-c=')) options.category = arg.split('=')[1];
});

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
HTML Validator for Duta Integra Business Documents

Usage:
  node validate-all.js [options]

Options:
  --category, -c    Validate specific category
  --fix             Auto-fix minor issues (indentation, missing alt tags)
  --help, -h        Show this help

Examples:
  node validate-all.js
  node validate-all.js --category=letterhead
  node validate-all.js --fix
  `);
  process.exit(0);
}

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function log(category, file, type, message) {
  const entry = { category, file, type, message };
  results.details.push(entry);

  const prefix = type === 'PASS' ? '✅' : type === 'FAIL' ? '❌' : '⚠️';
  console.log(`${prefix} [${category}] ${file}: ${message}`);

  if (type === 'PASS') results.passed++;
  else if (type === 'FAIL') results.failed++;
  else results.warnings++;
}

function validateFile(category, file, content) {
  const fileName = path.basename(file);

  // Check doctype
  if (!content.trim().startsWith('<!DOCTYPE html>')) {
    log(category, fileName, 'FAIL', 'Missing or incorrect DOCTYPE declaration');
  } else {
    log(category, fileName, 'PASS', 'Valid DOCTYPE');
  }

  // Check html lang attribute
  const langMatch = content.match(/<html\s+lang=["']([^"']+)["']/);
  if (!langMatch) {
    log(category, fileName, 'FAIL', 'Missing lang attribute on <html>');
  } else {
    const lang = langMatch[1];
    const expectedLang = path.basename(file).endsWith('-bm.html') ? 'ms' : 'en';
    if (lang !== expectedLang && lang !== 'en' && lang !== 'ms') {
      log(category, fileName, 'WARN', `Unexpected lang="${lang}", expected "${expectedLang}"`);
    } else {
      log(category, fileName, 'PASS', `Correct lang="${lang}"`);
    }
  }

  // Check required meta tags
  REQUIRED_META.forEach(meta => {
    const pattern = meta === 'charset'
      ? /<meta\s+charset=["'][^"']+["']/
      : new RegExp(`<meta\\s+name=["']${meta}["']`);
    if (!pattern.test(content)) {
      log(category, fileName, 'FAIL', `Missing required meta: ${meta}`);
    } else {
      log(category, fileName, 'PASS', `Has required meta: ${meta}`);
    }
  });

  // Check required CSS links
  REQUIRED_LINKS.forEach(link => {
    const pattern = new RegExp(`href=["'][^"']*${link.replace('.', '\\.')}[^"']*`);
    if (!pattern.test(content)) {
      log(category, fileName, 'WARN', `Missing recommended CSS link: ${link}`);
    } else {
      log(category, fileName, 'PASS', `Has CSS link: ${link}`);
    }
  });

  // Check for Google Fonts preconnect
  if (!content.includes('fonts.googleapis.com') || !content.includes('fonts.gstatic.com')) {
    log(category, fileName, 'WARN', 'Missing Google Fonts preconnect links');
  }

  // Check for brand variables
  if (!content.includes('brand-variables.css') && !content.includes('--color-navy')) {
    log(category, fileName, 'WARN', 'Missing brand variables reference');
  }

  // Check for print-base.css (except email signatures)
  const isEmailSig = path.basename(file).includes('email-signature');
  if (!isEmailSig && !content.includes('print-base.css')) {
    log(category, fileName, 'WARN', 'Missing print-base.css');
  }

  // Check for print styles
  if (!content.includes('@media print')) {
    log(category, fileName, 'WARN', 'No print media styles found');
  }

  // Check for logo reference
  if (!content.includes('logo-primary.svg') && !content.includes('logo-gold.svg')) {
    log(category, fileName, 'WARN', 'No logo reference found');
  }

  // Check for no-print class usage (should have print-only content)
  if (!content.includes('no-print') && !isEmailSig) {
    log(category, fileName, 'WARN', 'No .no-print class found (print-only content)');
  }

  // Check for alt attributes on images
  const imgTags = content.match(/<img[^>]*>/g) || [];
  imgTags.forEach((img, i) => {
    if (!img.includes('alt=')) {
      log(category, fileName, 'WARN', `Image #${i + 1} missing alt attribute`);
    }
  });

  // Check HTML structure
  const hasHead = content.includes('<head>') && content.includes('</head>');
  const hasBody = content.includes('<body>') && content.includes('</body>');
  if (!hasHead) log(category, fileName, 'FAIL', 'Missing <head> section');
  else log(category, fileName, 'PASS', 'Has <head> section');
  if (!hasBody) log(category, fileName, 'FAIL', 'Missing <body> section');
  else log(category, fileName, 'PASS', 'Has <body> section');

  // Check for title
  const titleMatch = content.match(/<title>([^<]+)<\/title>/);
  if (!titleMatch) {
    log(category, fileName, 'FAIL', 'Missing <title> tag');
  } else if (titleMatch[1].trim().length < 5) {
    log(category, fileName, 'WARN', 'Title seems too short');
  } else {
    log(category, fileName, 'PASS', `Has title: "${titleMatch[1].trim()}"`);
  }

  // Check for viewport meta
  if (!content.includes('viewport')) {
    log(category, fileName, 'FAIL', 'Missing viewport meta tag');
  } else {
    log(category, fileName, 'PASS', 'Has viewport meta');
  }

  // Check for favicon or icon link
  if (!content.includes('favicon') && !content.includes('rel="icon"') && !content.includes("rel='icon'")) {
    log(category, fileName, 'WARN', 'No favicon reference');
  }

  // Validate HTML structure (basic)
  const openTags = content.match(/<([a-z][a-z0-9]*)[^>]*>/gi) || [];
  const closeTags = content.match(/<\/([a-z][a-z0-9]*)>/gi) || [];
  const selfClosing = content.match(/<[a-z][a-z0-9]*[^>]*\/>/gi) || [];

  // Count unclosed tags (rough check)
  const tagCounts = {};
  openTags.forEach(tag => {
    const name = tag.match(/<([a-z][a-z0-9]*)/)[1];
    if (!['br', 'hr', 'img', 'meta', 'link', 'input'].includes(name)) {
      tagCounts[name] = (tagCounts[name] || 0) + 1;
    }
  });
  closeTags.forEach(tag => {
    const name = tag.match(/<\/([a-z][a-z0-9]*)/)[1];
    tagCounts[name] = (tagCounts[name] || 0) - 1;
  });
  selfClosing.forEach(tag => {
    const name = tag.match(/<([a-z][a-z0-9]*)/)[1];
    tagCounts[name] = (tagCounts[name] || 0) + 1;
    tagCounts[name] = (tagCounts[name] || 0) - 1;
  });

  Object.entries(tagCounts).forEach(([tag, count]) => {
    if (count > 0) {
      log(category, fileName, 'WARN', `Possible unclosed <${tag}> tags (count: ${count})`);
    } else if (count < 0) {
      log(category, fileName, 'WARN', `Possible extra closing </${tag}> tags (count: ${Math.abs(count)})`);
    }
  });

  // File size check
  const sizeKB = Buffer.byteLength(content, 'utf8') / 1024;
  if (sizeKB > 500) {
    log(category, fileName, 'WARN', `File size large: ${sizeKB.toFixed(1)}KB`);
  }
}

function findFiles(category = null) {
  const files = [];
  const categories = category ? [category] : CATEGORIES;

  categories.forEach(cat => {
    const catDir = path.join(HTML_DIR, cat);
    if (!fs.existsSync(catDir)) return;

    const files_in_cat = fs.readdirSync(catDir)
      .filter(f => f.endsWith('.html'))
      .map(f => ({ category: cat, file: path.join(catDir, f) }));

    files.push(...files_in_cat);
  });

  return files;
}

function printSummary() {
  console.log('\n=================================');
  console.log('VALIDATION SUMMARY');
  console.log('=================================');
  console.log(`✅ Passed:  ${results.passed}`);
  console.log(`❌ Failed:  ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log(`📄 Total checks: ${results.passed + results.failed + results.warnings}`);

  if (results.failed > 0) {
    console.log('\n❌ FAILURES:');
    results.details
      .filter(d => d.type === 'FAIL')
      .forEach(d => console.log(`  - [${d.category}] ${d.file}: ${d.message}`));
  }

  if (results.warnings > 0) {
    console.log('\n⚠️  WARNINGS (first 20):');
    results.details
      .filter(d => d.type === 'WARN')
      .slice(0, 20)
      .forEach(d => console.log(`  - [${d.category}] ${d.file}: ${d.message}`));
    if (results.warnings > 20) {
      console.log(`  ... and ${results.warnings - 20} more warnings`);
    }
  }
}

function main() {
  console.log('🔍 Duta Integra — HTML Validator');
  console.log('=================================\n');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
HTML Validator for Duta Integra Business Documents

Usage:
  node validate-all.js [options]

Options:
  --category, -c    Validate specific category
  --fix             Auto-fix minor issues (not yet implemented)
  --help, -h        Show this help

Examples:
  node validate-all.js
  node validate-all.js --category=letterhead
  node validate-all.js --fix
  `);
    process.exit(0);
  }

  const files = findFiles(options.category);

  if (files.length === 0) {
    console.log('⚠️  No HTML files found to validate.');
    process.exit(0);
  }

  console.log(`Found ${files.length} HTML file(s) to validate\n`);

  files.forEach(({ category, file }) => {
    const content = fs.readFileSync(file, 'utf8');
    validateFile(category, file, content);
  });

  printSummary();

  if (results.failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});