# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Internal Developer Portal (IDP) — a full-stack TypeScript monorepo for self-service cloud infrastructure provisioning. Users browse Terraform templates, deploy infrastructure, scaffold services via GitHub Actions, and manage cloud credentials, all behind RBAC.

## Commands

```bash
# Development (runs client + server concurrently)
npm run dev

# Build all packages (shared → server → client)
npm run build

# Database
npm run db:setup          # Initialize + seed (first time)
npm run db:migrate        # Run Prisma migrations (cd server && npx prisma migrate dev)
npm run db:seed           # Seed system roles (cd server && npx prisma db seed)
npx prisma studio         # Visual DB browser (run from server/)

# Type checking
npm run typecheck -w client   # Client only
npm run typecheck -w server   # Server only
```

No test framework is configured yet. Agent guide (`agent.md`) recommends Vitest + React Testing Library for client, Vitest + supertest for server.

## Architecture

**Monorepo with 3 npm workspaces:**

| Workspace | Purpose | Port |
|-----------|---------|------|
| `shared/` | Types, Zod validators, constants (permissions, providers) | — |
| `server/` | Express 4 API, Prisma ORM, SQLite | 3001 |
| `client/` | React 18 SPA, Vite, Tailwind CSS | 5173 |

Client dev server proxies `/api` → `http://localhost:3001`.

### Server Module Pattern

Each feature follows this structure in `server/src/modules/{feature}/`:
- `{feature}.routes.ts` — Express router with middleware chain: `authenticate → authorize(permission) → validate(schema) → handler`
- `{feature}.service.ts` — Business logic
- `{feature}.validators.ts` — Zod schemas (or re-exports from shared)

Modules: auth, users, roles, cloud-connections, templates, deployments, github, audit, services, settings.

### Client Structure

- `client/src/api/` — Axios-based API modules (one per feature). Axios interceptor auto-attaches JWT and redirects on 401.
- `client/src/pages/` — Route-level page components organized by feature
- `client/src/components/ui/` — Reusable primitives (Button, Input, Select, Card, Badge, Modal, Table). Table component supports resizable columns, sticky headers, custom scrollbars, and responsive mobile card layout.
- `client/src/components/guards/` — AuthGuard, RoleGuard for access control
- `client/src/stores/` — Zustand stores (auth-store, ui-store)
- `client/src/hooks/` — Custom hooks wrapping React Query for data fetching

Path alias: `@/*` maps to `client/src/*`.

### Key Subsystems

**Auth**: Email/password (bcrypt 12 rounds) + optional Azure AD OIDC. JWT with session-based revocation via `Session` table tracking JTI. Initial setup creates first admin at `/api/auth/setup`.

**RBAC**: 20 permissions, 3 system roles (Admin, Editor, Viewer), custom roles supported. Server enforces via `authorize()` middleware; client uses `<RoleGuard>` for UI only.

**Terraform**: 60 pre-built templates in `templates/` (AWS, Azure, GCP). Template sync parses `.tf` files. Execution: temp dir → copy files → write tfvars → set env creds → init → plan → apply. Single-threaded deployment queue. Live logs via SSE.

**GitHub Integration**: Encrypted PAT storage. Workflow dispatch for deployments and service scaffolding. Polling every 30s for workflow run status.

**Encryption**: AES-256-GCM for cloud credentials and tokens. Format: `base64(iv):base64(tag):base64(ciphertext)`. Key from `ENCRYPTION_KEY` env var (64 hex chars).

### Database

SQLite via Prisma. Schema at `server/prisma/schema.prisma`. All PKs are UUIDs. JSON fields stored as strings. Key models: User, Role, Session, CloudConnection, GitHubConnection, Template, Deployment, Service, WorkflowRun, AuditLog, SystemSetting.

### Error Handling

Server uses custom error classes extending `AppError` in `server/src/utils/errors.ts` (NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, ValidationError). All route handlers wrapped with `asyncHandler`. Global error handler returns structured JSON.

## Environment Setup

Copy `.env.example` to `server/.env`. Required vars: `JWT_SECRET` (min 32 chars), `ENCRYPTION_KEY` (64 hex chars). Optional: Azure AD, GitHub OAuth, custom Terraform binary path.
