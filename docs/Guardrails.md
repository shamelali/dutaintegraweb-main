---
title: Guardrails
slug: guardrails
status: draft
product: system
---

# Safety & Compliance Framework

## Overview

All Duta Integra AI products operate within strict guardrails to ensure safety, compliance, and human oversight. These principles apply across Flowmail, Praxis, Ontrac, Sensai, Integrall, and DutaConnect.

## Core Principles

### 1. Human-in-the-Loop
- Critical actions require human approval before execution
- AI recommends, humans decide
- No automated actions on high-risk operations

### 2. Scope Limits
- Each AI agent can only access explicitly granted systems
- Permission boundaries are enforced at the platform level
- Scope changes require administrator approval

### 3. Full Audit Trail
- Every action logged with timestamp, reasoning, and outcome
- Logs are immutable and retained for compliance
- Available for review anytime via dashboard

### 4. Escalation Rules
- If confidence is below threshold, AI escalates to humans
- Complex or ambiguous situations always escalated
- Escalation paths configurable per organization

### 5. Time Windows
- Non-urgent actions only run during approved maintenance windows
- Urgent actions can run anytime but require immediate review
- Time-based policies configurable per product

### 6. Kill Switch
- Disable any AI agent instantly from dashboard
- Full manual control restored in seconds
- Granular control per agent or per product

## Compliance

### PDPA (Malaysia)
- Full compliance with Malaysian Personal Data Protection Act
- Data processing consent collected and managed
- Data retention policies enforced automatically
- Right to access and deletion supported

### International Standards
- GDPR-ready architecture (for EU clients)
- SOC 2 Type II roadmap
- ISO 27001 alignment

## Data Protection

### Encryption
- TLS 1.3 for data in transit
- AES-256 for data at rest
- Database-level encryption
- Key rotation policies

### Access Control
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- Session management and timeout
- IP whitelisting for admin access

### Data Residency
- All data stored in马来西亚 (Malaysia) region
- No cross-border data transfers without consent
- Backup and disaster recovery in-region

## Monitoring

### Real-time Monitoring
- Agent performance dashboards
- Anomaly detection and alerting
- Cost tracking and budget controls
- SLA compliance monitoring

### Reporting
- Weekly health summaries
- Monthly compliance reports
- Custom analytics available
- Export for audit purposes

## Related Pages

- [Architecture](Architecture.md) — System architecture overview
- [Deployment](Deployment.md) — Deployment guide
- [FAQ](FAQ.md) — Frequently asked questions
