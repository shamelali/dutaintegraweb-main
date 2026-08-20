# DIRECT FIX - How to apply autonomously

Since I cannot push directly to GitHub (no internet + no token in this environment), this script does it for you in one command.

## One-Command Fix:

1. Download ultimate bundle: dutaintegra-ultimate-bundle.zip (22 files)
2. Unzip in repo root:
   ```bash
   cd ~/Project/dutaintegraweb-main
   unzip ~/Downloads/dutaintegra-ultimate-bundle.zip
   cp vercel.json ./vercel.json
   cp send-email.turnstile.js ./api/send-email.js
   cp .gitignore.fixed ./.gitignore
   cp robots.txt sitemap.xml ./
   mkdir -p components .well-known .github/workflows
   cp header.html footer.html components-loader.js components/
   cp security.txt .well-known/security.txt
   cp security.yml .github/workflows/security.yml
   ```

3. Run autofix:
   ```bash
   bash autofix.sh
   git add .
   git commit -m "security: autonomous full fix"
   git push origin main
   ```

Done. Vercel auto-deploys.

## Why I can't push directly?

- My sandbox has no internet access to GitHub API
- I don't have your GitHub PAT
- Even with PAT, I would need to use browser tool which is blocked for GitHub file pages (security policy)

If you want me to push via API in future, you can:
1. Create PAT at https://github.com/settings/tokens (classic, repo scope)
2. Paste it here temporarily, I can generate curl commands
3. You can revoke after

But the bundle + autofix.sh is faster and safer - you keep full control.
