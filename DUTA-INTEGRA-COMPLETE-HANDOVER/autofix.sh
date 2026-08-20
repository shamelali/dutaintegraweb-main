#!/bin/bash
set -e
echo "=== Duta Integra Autonomous Fix - Starting ==="

# Check we're in git repo
if [ ! -d ".git" ]; then
  echo "Error: Not in git repo root. cd to dutaintegraweb-main first"
  exit 1
fi

echo "[1/7] Removing sensitive files from git cache..."
git rm --cached Duta_Integra_Solutions_Investor_Deck.pptx 2>/dev/null || echo " - pptx not in index"
git rm --cached financial-projection.pdf 2>/dev/null || echo " - pdf not in index"
git rm --cached fabio-oyXis2kALVg-unsplash.jpg 2>/dev/null || true
git rm --cached build-pdf.py serve.py 2>/dev/null || true
git rm -r --cached Web/ 2>/dev/null || echo " - Web/ not in index"
git rm -r --cached .claude/ 2>/dev/null || true
git rm -r --cached ms/backup/ 2>/dev/null || true

echo "[2/7] Creating directories..."
mkdir -p components api .well-known .github/workflows private/docs

echo "[3/7] Moving sensitive docs to private/ (not in git)..."
mv Duta_Integra_Solutions_Investor_Deck.pptx private/docs/ 2>/dev/null || true
mv financial-projection.pdf private/docs/ 2>/dev/null || true
mv fabio-oyXis2kALVg-unsplash.jpg private/docs/ 2>/dev/null || true

echo "[4/7] Note: Secured files should already be copied from bundle"
echo "      Expected files: vercel.json, api/send-email.js, robots.txt, sitemap.xml, components/*"
if [ ! -f "vercel.json" ]; then echo "WARNING: vercel.json not found - unzip bundle first!"; fi
if [ ! -f "api/send-email.js" ]; then echo "WARNING: api/send-email.js not found"; fi

echo "[5/7] Verifying .gitignore..."
if ! grep -q "*.pptx" .gitignore 2>/dev/null; then
  echo "Appending security rules to .gitignore..."
  cat >> .gitignore << 'EOF'

# Security - Duta Integra Fix
*.pptx
*.pdf
*.key
*.pem
.env
.env.local
build-pdf.py
serve.py
.claude/
Web/
private/
.vercel/
EOF
fi

echo "[6/7] Git status:"
git status --short

echo "[7/7] Ready to commit and push"
echo ""
echo "Run these to push:"
echo "  git add ."
echo "  git commit -m 'security: autonomous full fix - block exposures, harden email API, SEO, components'"
echo "  git push origin main"
echo ""
echo "Then in Vercel Dashboard:"
echo "  - Add env var RESEND_API_KEY"
echo "  - Add env var TURNSTILE_SECRET_KEY (optional)"
echo "  - Redeploy will happen automatically"
echo ""
echo "Verify after deploy:"
echo "  curl -I https://dutaintegra.my/Duta_Integra_Solutions_Investor_Deck.pptx # should be 404"
echo "  curl -I https://dutaintegra.my/sitemap.xml # should be 200"
echo ""
echo "=== Autonomous fix script done ==="
