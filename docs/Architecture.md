---
title: Architecture
slug: architecture
status: draft
product: system
---

# System Architecture

## Overview

Duta Integra's AI platform is built on a modern, scalable architecture designed for reliability, security, and performance across all product lines.

## Core Components

### Frontend
- **Web Application** — Static HTML + Tailwind CSS (production)
- **React SPA** — Vite + React + Tailwind v4 (development)
- **i18n** — English and Bahasa Malaysia support
- **Dark Mode** — System-aware theme switching

### Backend
- **API Server** — Node.js + Express
- **Database** — PostgreSQL (Neon serverless)
- **Authentication** — Supabase Auth (OAuth: Google, Facebook)
- **File Storage** — Supabase Storage

### AI Layer
- **Agent Framework** — Custom orchestration engine
- **LLM Integration** — Multiple provider support
- **Vector Store** — Semantic search and retrieval
- **Monitoring** — Real-time performance tracking

## Data Flow

```
User Request → API Gateway → AI Agent → LLM Provider
                                    ↓
                              Vector Store
                                    ↓
                              Database
                                    ↓
                              Response
```

## Security

- **PDPA Compliance** — Full Malaysian data protection compliance
- **Encryption** — TLS 1.3 in transit, AES-256 at rest
- **Authentication** — OAuth 2.0 with multi-provider support
- **Authorization** — Role-based access control (RBAC)
- **Audit Logging** — Complete action trail for all operations

## Deployment

- **Hosting** — Vercel (frontend), Railway/Fly.io (backend)
- **CDN** — Vercel Edge Network
- **DNS** — Cloudflare
- **Monitoring** — Vercel Analytics + custom dashboards

## Scalability

- **Horizontal** — Stateless API design, auto-scaling
- **Database** — Serverless PostgreSQL with connection pooling
- **Caching** — Redis for session and query caching
- **Queue** — Background job processing for async tasks

## Related Pages

- [Deployment](Deployment.md) — Deployment guide
- [Guardrails](Guardrails.md) — Safety & compliance framework
- [FAQ](FAQ.md) — Frequently asked questions
