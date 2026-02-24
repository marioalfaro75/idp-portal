# Internal Developer Portal (IDP)

A self-hosted web application that enables engineering teams to provision and manage cloud infrastructure through a curated catalog of Terraform templates. It abstracts away Terraform CLI complexity behind a guided UI — developers select a template, fill in variables, pick a cloud connection, and deploy.

## Why

Without a portal, each engineer must install Terraform locally, manage credentials on their machine, understand HCL syntax, and follow ad-hoc processes. This leads to inconsistent infrastructure, credential sprawl, no audit trail, and a high barrier to entry for less infrastructure-savvy developers.

## Features

- **Template Catalog** — Browse and search 60 pre-built Terraform templates across AWS, Azure, and GCP
- **Guided Deployments** — Select a template, fill in variables via a dynamic form, choose a cloud connection, and deploy
- **Live Logs** — Real-time Terraform output streamed to the browser via Server-Sent Events
- **Software Catalog** — Scaffold new services via GitHub Actions and track their lifecycle
- **Cloud Credential Management** — Centrally store and manage cloud provider credentials encrypted with AES-256-GCM
- **GitHub Integration** — Connect GitHub accounts, dispatch workflows, and track workflow runs
- **Role-Based Access Control** — 20 granular permissions with 3 system roles (Admin, Editor, Viewer) and support for custom roles
- **Group-Based Access Control** — Assign templates to groups; members only see their group's templates
- **Multi-Provider SSO** — Federated authentication with Azure AD, Google Workspace, and Okta via OIDC or SAML 2.0
- **Deployment Cleanup** — Admin-only bulk removal of stale deployments (failed, destroyed, pending, planned)
- **Dark/Light Mode** — Toggle between dark, light, and system-preferred themes
- **Audit Logging** — Every action recorded with user, IP address, and timestamp
- **Responsive Tables** — Resizable columns, sticky headers, custom scrollbars, and mobile card layout

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State Management | Zustand (auth/UI), React Query (server state) |
| Backend | Express 4, TypeScript |
| Database | SQLite via Prisma ORM |
| Auth | JWT with session-based revocation; multi-provider SSO (OIDC + SAML) |
| SSO Libraries | `openid-client` (OIDC), `@node-saml/node-saml` (SAML 2.0) |
| Encryption | AES-256-GCM for credentials at rest |
| IaC Engine | Terraform CLI (spawned as child process) |
| GitHub | Octokit REST client |

## Project Structure

```
idp-portal/
├── client/          React SPA (Vite)
├── server/          Express API + Terraform runner
├── shared/          TypeScript types, validators, constants
└── templates/       Terraform templates organized by provider
    ├── aws/         20 templates (S3, EKS, ALB, RDS, Lambda, etc.)
    ├── azure/       20 templates (AKS, Blob Storage, App Service, etc.)
    └── gcp/         20 templates (GKE, Cloud Storage, Cloud Run, etc.)
```

## Data Flow

```
Browser → Vite proxy (/api) → Express → Prisma → SQLite
                                  ↓
                          Terraform CLI (child process)
                                  ↓
                          SSE log stream → Browser
```

## Getting Started

### Prerequisites

- Node.js 18+
- Terraform CLI (for deployments)

### Setup

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
   - `ENCRYPTION_KEY` — 64 hex characters (256-bit key)

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

### Optional Configuration

| Variable | Purpose |
|----------|---------|
| `SERVER_URL` | Base URL for federation callback URLs (default: `http://localhost:3001`) |
| `CLIENT_URL` | CORS origin and redirect target (default: `http://localhost:5173`) |
| `TERRAFORM_BIN` | Custom Terraform binary path (default: `terraform` on PATH) |

> **SSO Configuration:** Identity providers (Azure AD, Google Workspace, Okta) are configured through the Portal Admin UI under **Federation Providers**, not via environment variables. Each provider stores its OIDC or SAML configuration encrypted in the database.

## User Roles

| Role | Access |
|------|--------|
| **Portal Admin** | Full access — manage users, roles, credentials, templates, deployments, services, settings, federation providers |
| **Admin** | Full access except portal-level settings (federation, system config) |
| **Editor** | Manage cloud connections, deploy templates, scaffold services, dispatch GitHub workflows |
| **Viewer** | Browse template catalog, view deployments and services (read-only) |

Admins can also create custom roles with any subset of the 20 available permissions.

## Federation (SSO)

The portal supports federated authentication with multiple identity providers simultaneously:

| Provider | Protocols | Notes |
|----------|-----------|-------|
| **Azure AD** | OIDC | Issuer: `https://login.microsoftonline.com/{tenantId}/v2.0` |
| **Google Workspace** | OIDC | Issuer: `https://accounts.google.com` |
| **Okta** | OIDC, SAML | Issuer: `https://{domain}.okta.com` |
| **Custom** | OIDC, SAML | Any standards-compliant identity provider |

Each provider is configured in **Portal Admin > Federation Providers** with:
- A URL-safe slug (used in callback URLs: `/api/federation/{slug}/callback`)
- Protocol-specific configuration (Issuer URL + Client ID/Secret for OIDC, Entry Point + Certificate for SAML)
- A default role assigned to auto-created users
- An enable/disable toggle

SAML providers also expose SP metadata at `/api/federation/{slug}/metadata`.

Legacy Azure AD configurations (stored as `oidc.*` system settings) are automatically migrated to federation providers on server startup.
