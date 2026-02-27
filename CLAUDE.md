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

Modules: auth, users, roles, cloud-connections, templates, deployments, github, audit, services, settings, federation, groups.

### Client Structure

- `client/src/api/` — Axios-based API modules (one per feature). Axios interceptor auto-attaches JWT and redirects on 401.
- `client/src/pages/` — Route-level page components organized by feature
- `client/src/components/ui/` — Reusable primitives (Button, Input, Select, Card, Badge, Modal, Table). Table component supports resizable columns, sticky headers, custom scrollbars, and responsive mobile card layout.
- `client/src/components/guards/` — AuthGuard, RoleGuard for access control
- `client/src/stores/` — Zustand stores (auth-store, ui-store)
- `client/src/hooks/` — Custom hooks wrapping React Query for data fetching

Path alias: `@/*` maps to `client/src/*`.

### Key Subsystems

**Auth**: Email/password (bcrypt 12 rounds) + multi-provider SSO federation (Azure AD, Google Workspace, Okta) via OIDC and SAML. JWT with session-based revocation via `Session` table tracking JTI. Initial setup creates first admin at `/api/auth/setup`. `auth.service.ts` exports `generateToken()` and `issueSessionToken()` for reuse by other modules.

**Federation**: Multi-provider identity federation in `server/src/modules/federation/`. `FederationProvider` Prisma model stores per-provider encrypted config (AES-256-GCM). Dynamic routes at `/api/federation/:slug/login` and `/api/federation/:slug/callback`. Uses `openid-client` for OIDC and `@node-saml/node-saml` for SAML 2.0. OIDC state CSRF protection via `federation_state` httpOnly cookie (requires `cookie-parser` middleware). All callbacks redirect to `{CLIENT_URL}/auth/callback?token=...&user=...` (same format as `OAuthCallbackPage.tsx` expects). Admin CRUD at `/api/federation/admin/providers` (PORTAL_ADMIN permission). Legacy `oidc.*` SystemSettings auto-migrate to FederationProvider on startup.

**RBAC**: 20 permissions, 3 system roles (Admin, Editor, Viewer), custom roles supported. Server enforces via `authorize()` middleware; client uses `<RoleGuard>` for UI only.

**Terraform**: 60 pre-built templates in `templates/` (AWS, Azure, GCP). Template sync parses `.tf` files. Templates support admin-editable tags that persist across syncs. Templates can be assigned to groups for access control.

**Deployments**: Two execution methods:
- *Local*: temp dir → copy files → write tfvars → set env creds → init → plan → apply. Single-threaded queue. Live stdout/stderr via SSE. Logs stored in `planOutput`/`applyOutput`/`destroyOutput`.
- *GitHub Actions*: push template files → set repo secrets → validate/fix workflow YAML → dispatch `workflow_dispatch` event → poll for run ID → poll for completion. On completion (success or failure), per-job logs are fetched via Octokit and stored in the same output fields. Error summaries are extracted from logs (Terraform `Error:` lines, cloud auth errors). Dispatched deployments with no run ID after 10 minutes are auto-failed. Pre-dispatch setup logs (credential pushes, workflow validation) are persisted in `planOutput`.
- Key files: `server/src/modules/deployments/deployments.service.ts` (business logic, SSE emitter), `github-executor.ts` (GitHub Actions dispatch/polling/log fetching), `local-executor.ts` (Terraform CLI execution).

**GitHub Integration**: Centralized GitHub App authentication via `@octokit/auth-app` (replaces per-user PATs). App config (App ID, Installation ID, encrypted private key) stored in SystemSettings. `server/src/modules/github/github-app.ts` provides `getAppOctokit()` factory with 55-min caching. Portal Admin configures the App in Portal Administration page. Workflow dispatch for deployments and service scaffolding. Polling every 30s for workflow run status. Workflow YAML is auto-validated and fixed before dispatch (adds `workflow_dispatch` trigger, sets `terraform_wrapper: false`, injects credential env vars, adds destroy step, fixes working directory). Service scaffolding pushes template repos via GitHub API. Repos created in the App's installation org via `repos.createInOrg()`.

**Encryption**: AES-256-GCM for cloud credentials, federation config, and GitHub App private key. Format: `base64(iv):base64(tag):base64(ciphertext)`. Key from `ENCRYPTION_KEY` env var (64 hex chars).

### Database

SQLite via Prisma. Schema at `server/prisma/schema.prisma`. All PKs are UUIDs. JSON fields stored as strings. Key models: User, Role, Session, CloudConnection, Template, Deployment, Service, WorkflowRun, AuditLog, SystemSetting, Group, FederationProvider. Deployment output fields (`planOutput`, `applyOutput`, `destroyOutput`, `errorMessage`) are nullable text — no migration needed to store additional data in them.

### Error Handling

Server uses custom error classes extending `AppError` in `server/src/utils/errors.ts` (NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, ValidationError). All route handlers wrapped with `asyncHandler`. Global error handler returns structured JSON.

### Deployment Detail Page

`client/src/pages/deployments/DeploymentDetailPage.tsx` — Shows deployment status, error card, logs, outputs, and variables. Error card extracts a summary line from error messages (Terraform errors, auth errors) and shows it prominently with a collapsible full-details section. Log section headers are contextual: "SETUP"/"WORKFLOW RUN" for GitHub deployments, "PLAN"/"APPLY" for local. SSE is only connected for local deployments (GitHub deployments get logs via polling on completion).

### Portal Admin Page

`client/src/pages/admin/PortalAdminPage.tsx` — Four cards: (1) Federation Providers — full CRUD with add/edit modal, enable/disable toggle, protocol-specific config fields, auto-computed callback/metadata URLs; (2) GitHub App — configure/test/remove GitHub App (App ID, Installation ID, private key); (3) GitHub Actions Defaults — default repo, workflow, branch; (4) System Info — remaining SystemSettings. Protected by `PORTAL_ADMIN` permission via `<RoleGuard>`.

## Environment Setup

Copy `.env.example` to `server/.env`. Required vars: `JWT_SECRET` (min 32 chars), `ENCRYPTION_KEY` (64 hex chars). Optional: `SERVER_URL` (for federation callback URLs, defaults to `http://localhost:3001`), `CLIENT_URL` (defaults to `http://localhost:5173`), GitHub OAuth, custom Terraform binary path. SSO providers (Azure AD, Google, Okta) are configured via the Portal Admin UI (Federation Providers), not env vars.
