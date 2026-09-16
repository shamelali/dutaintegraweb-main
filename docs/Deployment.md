---
title: Deployment
slug: deployment
status: draft
product: system
---

# Deployment Guide

## Overview

This guide covers deployment procedures for Duta Integra's AI platform and products.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Vercel CLI (for frontend deployment)
- Database access (Neon PostgreSQL)
- Environment variables configured

## Environment Setup

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...

# Authentication
SUPABASE_SERVICE_ROLE_KEY=...
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=...

# AI Services
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://dutaintegra.my
```

## Frontend Deployment

### Vercel (Production)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Or deploy preview
vercel
```

### Static HTML (Web/)

```bash
# The Web/ directory is served as static files
# Just commit and push to main
git add Web/
git commit -m "deploy: update brand pages"
git push origin main
```

## Backend Deployment

### API Server

```bash
# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Start server
npm start
```

### Database Migrations

```bash
# Create migration
npm run db:migrate:create -- --name add_new_table

# Run migrations
npm run db:migrate

# Rollback if needed
npm run db:migrate:rollback
```

## Product Deployment

### Brand Pages

All brand pages (Flowmail, Praxis, Ontrac, Sensai, Integrall, DutaConnect) are static HTML files in `Web/`.

```bash
# Deploy all brand pages
git add Web/flowmail.html Web/praxis.html Web/ontrac.html
git add Web/sensai.html Web/integrall.html Web/dutaconnect.html
git commit -m "feat: deploy 6 brand pages"
git push origin main
```

### React SPA (web-new/)

```bash
# Build for production
cd web-new
npm run build

# Deploy to Vercel
vercel --prod
```

## Post-Deployment

### Verification Checklist

- [ ] All pages load correctly
- [ ] Navigation links work
- [ ] Forms submit successfully
- [ ] Dark mode toggles properly
- [ ] Language toggle functions
- [ ] Mobile responsive
- [ ] SEO meta tags present
- [ ] Analytics tracking active

### Rollback Procedure

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or deploy specific version
vercel --prod [commit-sha]
```

## Monitoring

- **Vercel Dashboard** — Frontend performance
- **Server Logs** — Backend error tracking
- **Database Metrics** — Query performance
- **Uptime Monitoring** — Service availability

## Related Pages

- [Architecture](Architecture.md) — System architecture overview
- [Guardrails](Guardrails.md) — Safety & compliance framework
- [FAQ](FAQ.md) — Frequently asked questions
