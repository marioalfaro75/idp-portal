# Internal Developer Portal (IDP)

A self-hosted web application that enables engineering teams to provision and manage cloud infrastructure through a curated catalog of Terraform templates. It abstracts away Terraform CLI complexity behind a guided UI — developers select a template, fill in variables, pick a cloud connection, and deploy.

## Why

Without a portal, each engineer must install Terraform locally, manage credentials on their machine, understand HCL syntax, and follow ad-hoc processes. This leads to inconsistent infrastructure, credential sprawl, no audit trail, and a high barrier to entry for less infrastructure-savvy developers.

## Features

- **Template Catalog** — Browse and search 61 pre-built Terraform templates across AWS, Azure, and GCP with filters for provider, category, and scaffoldable templates
- **Guided Deployments** — Select a template, fill in variables via a dynamic form, choose a cloud connection, and deploy
- **Dual Execution** — Deploy via local Terraform CLI with live SSE log streaming, or via GitHub Actions for auditable CI/CD workflows
- **Pre-Deploy Security Scanning** — Automated IaC scanning with Trivy, TFLint, and Conftest before deployment; configurable enforcement (blocking or advisory)
- **Service Scaffolding** — 17 templates support service scaffolding with quick-access from the catalog; create new repositories from templates via GitHub and track their lifecycle
- **Cloud Credential Management** — Centrally store and manage cloud provider credentials encrypted with AES-256-GCM
- **GitHub App Integration** — Centralized GitHub App for workflow dispatch, log fetching, and repo creation (no personal access tokens)
- **Role-Based Access Control** — 20 granular permissions with 4 system roles (Portal Admin, Admin, Editor, Viewer) and custom roles
- **Group-Based Access Control** — Assign templates to groups; members only see their group's templates
- **Multi-Provider SSO** — Federated authentication with Azure AD, Google Workspace, and Okta via OIDC or SAML 2.0
- **Federation Config Backup** — Export and import federation provider configurations for disaster recovery
- **Built-in Help** — Searchable help section with markdown articles covering setup and usage
- **Deployment Cleanup** — Admin-only bulk removal of stale deployments (failed, destroyed, pending, planned)
- **Audit Logging** — Every action recorded with user, IP address, and timestamp; configurable retention policy with automatic cleanup
- **Update Checker** — Portal Admins can check for available updates from the Settings page
- **Dark/Light Mode** — Toggle between dark, light, and system-preferred themes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State Management | Zustand (auth/UI), React Query (server state) |
| Backend | Express 4, TypeScript, Helmet (security headers) |
| Database | SQLite via Prisma ORM |
| Auth | JWT with session-based revocation; multi-provider SSO (OIDC + SAML) |
| SSO Libraries | `openid-client` (OIDC), `@node-saml/node-saml` (SAML 2.0) |
| Encryption | AES-256-GCM for credentials, federation config, Terraform state, and GitHub App keys |
| IaC Engine | Terraform CLI (local) or GitHub Actions (remote) |
| Security Scanning | Trivy (IaC misconfigs), TFLint (provider linting), Conftest (OPA/Rego policies) |
| GitHub | `@octokit/rest` + `@octokit/auth-app` (GitHub App authentication) |
| Containerization | Docker with multi-stage build |

## Project Structure

```
idp-portal/
├── client/          React SPA (Vite)
├── server/          Express API + Terraform runner
├── shared/          TypeScript types, validators, constants
├── templates/       Terraform templates organized by provider
│   ├── aws/         21 templates (S3, EKS, ALB, RDS, Lambda, etc.)
│   ├── azure/       20 templates (AKS, Blob Storage, App Service, etc.)
│   └── gcp/         20 templates (GKE, Cloud Storage, Cloud Run, etc.)
├── help/            Markdown help articles with YAML frontmatter
├── .github/         CI workflows (security audit)
├── Dockerfile       Multi-stage production build
├── docker-compose.yml
└── setup.sh         Interactive setup script
```

### Monorepo Workspaces

| Workspace | Purpose | Dev Port |
|-----------|---------|----------|
| `shared/` | Types, Zod validators, constants (permissions, providers) | — |
| `server/` | Express 4 API, Prisma ORM, Terraform execution, SSE streaming | 3001 |
| `client/` | React 18 SPA, Vite dev server, Tailwind CSS | 5173 |

The client dev server proxies `/api` requests to `http://localhost:3001`.

## Data Flow

```
Browser → Vite proxy (/api) → Express → Prisma → SQLite
                                  ↓
                    ┌─────────────┼─────────────┐
                    ↓                           ↓
          Terraform CLI               GitHub Actions
          (child process)             (workflow dispatch)
                    ↓                           ↓
          SSE log stream → Browser    Poll status → Fetch logs
```

## Getting Started

### Quick Start (Docker)

The setup script handles everything — generates secrets, builds the image, runs migrations, and starts the portal:

```bash
git clone <repo-url> && cd idp-portal
./setup.sh
```

Then visit `http://localhost:3001` and create your admin account.

### Quick Start (Native)

```bash
./setup.sh --native
```

Then start the server:

```bash
NODE_ENV=production node server/dist/index.js
```

### Manual Setup

#### Prerequisites

- Node.js 18+
- Terraform CLI (for local deployments)

#### Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example server/.env
   ```
   Edit `server/.env` and set:
   - `JWT_SECRET` — Random string, min 32 characters
   - `ENCRYPTION_KEY` — 64 hex characters (generate with `openssl rand -hex 32`)

3. **Initialize the database:**
   ```bash
   npm run db:setup
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```
   - Client: http://localhost:5173
   - Server: http://localhost:3001

5. **Create your admin account:**
   On first launch, you'll be redirected to the setup page to create the initial admin user.

6. **Sync templates:**
   Log in and click **Sync Templates** on the Template Catalog page, or call `POST /api/templates/sync`.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | — | Secret for signing JWTs (min 32 characters) |
| `ENCRYPTION_KEY` | Yes | — | AES-256 key for encrypting credentials (64 hex characters) |
| `PORT` | No | `3001` | Server port |
| `DATABASE_URL` | No | `file:./dev.db` | Prisma database connection string |
| `SERVER_URL` | No | `http://localhost:3001` | Public-facing server URL (used for SSO callback URLs) |
| `CLIENT_URL` | No | `http://localhost:5173` | CORS origin (not needed when server serves the SPA in production) |
| `TERRAFORM_BIN` | No | `terraform` | Custom path to Terraform binary |
| `NODE_ENV` | No | `development` | Set to `production` for production builds |

> **Note:** SSO providers (Azure AD, Google Workspace, Okta) and the GitHub App are configured through the Portal Admin UI, not via environment variables.

## Commands

```bash
# Development (runs client + server concurrently)
npm run dev

# Build all packages (shared → server → client)
npm run build

# Type checking
npm run typecheck -w client   # Client only
npm run typecheck -w server   # Server only

# Database
npm run db:setup              # Initialize + seed (first time)
npm run db:migrate            # Run Prisma migrations
npm run db:seed               # Seed system roles

# Security
npm run audit                 # Run npm audit (--audit-level=high)

# Docker
docker compose up -d          # Start in background
docker compose down           # Stop
docker compose logs -f        # View logs
docker compose build          # Rebuild image
```

## User Roles

| Role | Access |
|------|--------|
| **Portal Admin** | Full access — manage users, roles, credentials, templates, deployments, services, settings, federation providers, GitHub App, security scanning config |
| **Admin** | Full access except portal-level settings (federation, GitHub App, system config) |
| **Editor** | Manage cloud connections, deploy templates, scaffold services, dispatch GitHub workflows |
| **Viewer** | Browse template catalog, view deployments and services (read-only) |

Admins can create custom roles with any subset of the 20 available permissions.

## Security Scanning

The portal includes a pre-deploy security scanning gate that analyzes Terraform templates before execution:

| Tool | Purpose |
|------|---------|
| **Trivy** | IaC misconfiguration detection (AWS, Azure, GCP, Kubernetes) |
| **TFLint** | Provider-specific Terraform linting |
| **Conftest** | Custom OPA/Rego policy enforcement |

Scans evaluate the user's actual variable values (not just template defaults) by generating a temporary `terraform.tfvars.json`. Results are shown in a modal before deployment proceeds.

Configure in **Portal Admin > Security Scanning**:
- **Enable/disable** scanning globally
- **Enforcement mode** — `blocking` (prevents deployment on failure) or `advisory` (warns but allows deployment)
- **Severity threshold** — minimum severity to flag (CRITICAL, HIGH, MEDIUM, LOW)
- **OPA policies** — custom Rego rules for Conftest
- **Tool installation** — install Trivy, TFLint, and Conftest from GitHub releases via the UI

Missing tools are gracefully skipped. Scan results are stored on each deployment record for audit.

## Federation (SSO)

The portal supports federated authentication with multiple identity providers simultaneously:

| Provider | OIDC | SAML 2.0 |
|----------|:----:|:--------:|
| **Azure AD (Entra ID)** | Yes | Yes |
| **Google Workspace** | Yes | — |
| **Okta** | Yes | Yes |
| **Custom** | Yes | Yes |

Each provider is configured in **Portal Admin > Federation Providers** with:
- A URL-safe slug (used in callback URLs: `/api/federation/{slug}/callback`)
- Protocol-specific configuration (Issuer URL + Client ID/Secret for OIDC; Entry Point + Certificate for SAML)
- A default role assigned to auto-created users
- An enable/disable toggle

SAML providers also expose SP metadata at `/api/federation/{slug}/metadata`.

Portal Admins can **export** all federation provider configurations (decrypted) for backup and **import** them on another instance, enabling disaster recovery when the encryption key changes.

## GitHub App Integration

The portal uses a centralized GitHub App (instead of personal access tokens) for:

- **Deployments via GitHub Actions** — push template files, set repo secrets, dispatch workflows, poll for completion, fetch logs
- **Service scaffolding** — create repos in the org, push scaffold files, trigger setup workflows
- **Workflow auto-fixing** — automatically adds `workflow_dispatch` inputs, env vars, state persistence, and Terraform best practices to workflow YAML

Configure the GitHub App in **Portal Admin > GitHub App** with the App ID, Installation ID, and private key. A **test key** endpoint lets admins validate a new private key before saving it, enabling key rotation without downtime. See the built-in help articles for detailed setup instructions.

## Built-in Help

The portal includes a searchable help section at `/help` with articles covering:

- Getting started and onboarding
- Federation setup for all supported providers (Azure AD, Google, Okta — OIDC and SAML)
- GitHub App configuration
- Deploying infrastructure
- Cloud connection management
- Roles and permissions

Articles are markdown files with YAML frontmatter stored in the `help/` directory. They are read from disk at server startup — no external dependencies required. To add or update articles, edit the files in `help/` and redeploy.

## API Overview

All API routes are prefixed with `/api` and require JWT authentication (except auth and federation login endpoints).

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Login, setup, token refresh |
| `/api/federation` | SSO login/callback, admin CRUD, export/import |
| `/api/users` | User management |
| `/api/roles` | Role management |
| `/api/groups` | Group management |
| `/api/cloud-connections` | Cloud credential CRUD |
| `/api/templates` | Template catalog, sync, tags |
| `/api/deployments` | Create, list, detail, destroy, SSE logs |
| `/api/services` | Service scaffolding and catalog |
| `/api/github` | GitHub App config, key testing, repo listing, workflow dispatch |
| `/api/security` | Security scan config, tool installation, scan execution |
| `/api/audit-logs` | Audit log queries |
| `/api/settings` | System settings |
| `/api/updates` | Check for available updates (Portal Admin) |
| `/api/help` | Help articles |
| `/api/health` | Health check (no auth required) |

## Security

### Encryption and Authentication
- **Encryption at rest** — Cloud credentials, federation provider secrets, Terraform state, and the GitHub App private key are encrypted with AES-256-GCM before storage
- **JWT + session revocation** — Tokens include a JTI tracked in a `Session` table; logging out or revoking access invalidates the session server-side
- **CSRF protection** — OIDC federation uses a state parameter stored in an httpOnly cookie
- **SAML signature verification** — SAML assertions are verified against the IdP's public certificate
- **Password hashing** — bcrypt with 12 rounds

### HTTP Security
- **Security headers** — Helmet middleware provides CSP, HSTS, X-Frame-Options (deny), X-Content-Type-Options, and other standard headers
- **Rate limiting** — All `/api` routes are rate-limited (100 req/15min); auth endpoints have stricter limits (20 req/15min)
- **Input validation** — All inputs validated with Zod schemas; deployment names, service names, and variables have size and character constraints
- **Template path traversal protection** — Terraform runner validates template paths cannot escape the templates directory

### Data Protection
- **Log redaction** — Application logs automatically redact AWS access keys, JWT tokens, and values in sensitive fields (password, secret, token, credential, etc.)
- **Output sanitization** — Terraform plan/apply/destroy output is redacted for AWS keys, secrets, passwords, and tokens before database storage
- **No credential exposure** — Cloud credentials are never returned in API responses after creation
- **Credential age tracking** — Cloud connections show age since last update with rotation warnings after 90 days

### Audit and Compliance
- **Comprehensive audit logging** — Every action recorded with user, IP address, and timestamp
- **RBAC permission audit trail** — Role updates log before/after permission changes; role deletions log the removed permissions
- **Failed login tracking** — Failed login and SSO attempts are logged with IP and email for security monitoring
- **Configurable retention** — Audit logs support a retention policy (`audit.retentionDays` setting) with automatic daily cleanup
- **Session cleanup** — Expired sessions are automatically purged hourly

### CI/CD Security
- **Dependency auditing** — GitHub Actions workflow runs `npm audit --audit-level=high` on every push to main and weekly on Mondays
- **Pre-deploy scanning** — Trivy, TFLint, and Conftest scan templates before deployment with configurable enforcement
