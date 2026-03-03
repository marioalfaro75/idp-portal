# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Internal Developer Portal (IDP) — a full-stack TypeScript monorepo for self-service cloud infrastructure provisioning. Users browse Terraform templates, deploy infrastructure, scaffold services via GitHub Actions, and manage cloud credentials, all behind RBAC.

## Commands

```bash
npm run dev                       # Development (client + server concurrently)
npm run build                     # Build all (shared → server → client)
npm run typecheck -w client       # Client type check
npm run typecheck -w server       # Server type check
npm run db:setup                  # Initialize + seed (first time)
npm run db:migrate                # Run Prisma migrations
npm run db:seed                   # Seed system roles
npm run audit                     # npm audit --audit-level=high
npx prisma studio                 # Visual DB browser (run from server/)
```

No test framework is configured yet.

## Architecture

**Monorepo with 3 npm workspaces:**

| Workspace | Purpose | Port |
|-----------|---------|------|
| `shared/` | Types, Zod validators, constants (permissions, providers) | — |
| `server/` | Express 4 API, Prisma ORM, SQLite | 3001 |
| `client/` | React 18 SPA, Vite, Tailwind CSS | 5173 |

Client dev server proxies `/api` → `http://localhost:3001`.

### Server Module Pattern

Each feature in `server/src/modules/{feature}/`:
- `{feature}.routes.ts` — Express router: `authenticate → authorize(permission) → validate(schema) → handler`
- `{feature}.service.ts` — Business logic
- `{feature}.validators.ts` — Zod schemas (or re-exports from shared)

Modules: auth, users, roles, cloud-connections, templates, deployments, github, audit, services, settings, federation, groups, help, security, updates.

### Client Structure

- `client/src/api/` — Axios-based API modules. Interceptor auto-attaches JWT, redirects on 401.
- `client/src/pages/` — Route-level page components by feature
- `client/src/components/ui/` — Reusable primitives (Button, Input, Select, Card, Badge, Modal, Table)
- `client/src/components/guards/` — AuthGuard, RoleGuard
- `client/src/stores/` — Zustand stores (auth-store, ui-store)
- `client/src/hooks/` — React Query hooks for data fetching

Path alias: `@/*` maps to `client/src/*`.

### Key Subsystems

**Auth**: Email/password (bcrypt 12 rounds) + multi-provider SSO via OIDC/SAML. JWT with session-based revocation via `Session` table (JTI tracking). `auth.service.ts` exports `generateToken()` and `issueSessionToken()` for reuse by other modules.

**Federation**: Multi-provider identity federation (`server/src/modules/federation/`). `FederationProvider` Prisma model with encrypted config (AES-256-GCM). Dynamic routes at `/api/federation/:slug/login` and `/:slug/callback`. OIDC via `openid-client`, SAML via `@node-saml/node-saml`. State CSRF via `federation_state` httpOnly cookie. Admin CRUD at `/api/federation/admin/providers`. Export/import endpoints for config backup.

**RBAC**: 20 permissions, 4 system roles (Portal Admin, Admin, Editor, Viewer), custom roles supported. Server enforces via `authorize()` middleware; client uses `<RoleGuard>`.

**Deployments**: Local (Terraform CLI with SSE streaming) or GitHub Actions (workflow dispatch + polling). Output stored in `planOutput`/`applyOutput`/`destroyOutput` fields. Deployment outputs are redacted for sensitive values before DB storage.

**GitHub Integration**: Centralized GitHub App auth via `@octokit/auth-app`. Config in SystemSettings (encrypted). `github-app.ts` provides `getAppOctokit()` with 55-min caching and `testPrivateKey()` for key validation.

**Security Scanning**: Pre-deploy gate using Trivy, TFLint, Conftest. Config in SystemSettings. Scans evaluate actual deployment variables. Results shown in modal before deploy.

**Security Hardening**: `helmet` middleware (CSP, HSTS, frameguard), log redaction (AWS keys, JWTs, sensitive meta), deployment output sanitization, audit log retention policy, RBAC permission audit trail, `npm audit` CI workflow.

**Encryption**: AES-256-GCM for cloud credentials, federation config, GitHub App private key, Terraform state. Format: `base64(iv):base64(tag):base64(ciphertext)`. Key from `ENCRYPTION_KEY` env var (64 hex chars).

### Database

SQLite via Prisma. Schema at `server/prisma/schema.prisma`. All PKs are UUIDs. JSON fields stored as strings. Key models: User, Role, Session, CloudConnection, Template, Deployment, Service, WorkflowRun, AuditLog, SystemSetting, Group, FederationProvider.

### Error Handling

Custom error classes extending `AppError` in `server/src/utils/errors.ts` (NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, ValidationError). All route handlers wrapped with `asyncHandler`. Global error handler returns structured JSON.

## Environment Setup

Copy `.env.example` to `server/.env`. Required vars: `JWT_SECRET` (min 32 chars), `ENCRYPTION_KEY` (64 hex chars). Optional: `SERVER_URL`, `CLIENT_URL`, custom Terraform binary path. SSO providers configured via Portal Admin UI, not env vars.

## Docker

Multi-stage Dockerfile: build stage compiles all workspaces, production stage copies built artifacts + Prisma schema + templates + help articles. Includes Terraform CLI, Trivy, TFLint, Conftest. `docker-compose.yml` mounts a named volume for SQLite persistence. `setup.sh` supports Docker and native modes.
