#!/bin/bash
# Duta Integra - Security Cleanup Script
echo "=== Duta Integra Security Cleanup ==="
echo "Removing sensitive files from git..."

git rm --cached Duta_Integra_Solutions_Investor_Deck.pptx 2>/dev/null || true
git rm --cached financial-projection.pdf 2>/dev/null || true
git rm --cached fabio-oyXis2kALVg-unsplash.jpg 2>/dev/null || true
git rm --cached build-pdf.py serve.py 2>/dev/null || true
git rm -r --cached Web/ 2>/dev/null || true
git rm -r --cached .claude/ 2>/dev/null || true
git rm -r --cached ms/backup/ 2>/dev/null || true

echo "Creating secured directories..."
mkdir -p components private/docs

echo "Done. Now:"
echo "1. Copy secured files: cp vercel.json . && cp send-email.js api/send-email.js"
echo "2. Move sensitive docs to private/docs/ locally (not in git)"
echo "3. git add . && git commit -m 'security: harden deploy, fix exposures' && git push"
echo ""
echo "To purge history (optional, destroys history):"
echo "  pip install bfg or brew install bfg"
echo "  bfg --delete-files '*Investor_Deck.pptx' --delete-files 'financial-projection.pdf'"
