# Product Requirements Document — Internal Developer Portal (IDP)

## 1. Overview

The Internal Developer Portal (IDP) is a self-hosted web application that enables engineering teams to provision and manage cloud infrastructure through a curated catalog of Terraform templates. It abstracts away Terraform CLI complexity behind a guided UI — developers select a template, fill in variables, pick a cloud connection, and deploy. Admins retain full control through role-based access, audit logging, and centralized credential management.

### 1.1 Problem Statement

Engineering teams need to provision cloud resources across AWS, GCP, and Azure. Without a portal, each engineer must install Terraform locally, manage credentials on their machine, understand HCL syntax, and follow ad-hoc processes. This leads to inconsistent infrastructure, credential sprawl, no audit trail, and a high barrier to entry for less infrastructure-savvy developers.

### 1.2 Solution

A web-based portal that:

- Provides a searchable catalog of pre-built, organization-approved Terraform templates
- Manages cloud credentials centrally with AES-256-GCM encryption
- Executes Terraform plan/apply server-side with live log streaming
- Enforces role-based access control (RBAC) so only authorized users can deploy
- Logs every action for compliance and auditability
- Integrates with GitHub for CI/CD workflow dispatch

### 1.3 Target Users

| Persona | Description |
|---------|-------------|
| **Platform Admin** | Manages users, roles, cloud connections, and system settings. Full access. |
| **Infrastructure Editor** | Creates deployments, manages cloud connections, dispatches GitHub workflows. |
| **Developer (Viewer)** | Browses the template catalog and views deployment status. Read-only. |

---

## 2. Architecture

### 2.1 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State Management | Zustand (auth/UI), React Query (server state) |
| Backend | Express 4, TypeScript, tsx (dev) |
| Database | SQLite via Prisma ORM |
| Auth | JWT with server-side session tracking; optional Azure AD OIDC |
| Encryption | AES-256-GCM for credentials at rest |
| IaC Engine | Terraform CLI (spawned as child process) |
| GitHub Integration | Octokit REST client |
| Monorepo | npm workspaces (`shared`, `server`, `client`) |

### 2.2 Project Structure

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

### 2.3 Data Flow

```
Browser → Vite proxy (/api) → Express → Prisma → SQLite
                                  ↓
                          Terraform CLI (child process)
                                  ↓
                          SSE log stream → Browser
```

---

## 3. Authentication & Authorization

### 3.1 Authentication

**Primary: Email & Password**

- Passwords hashed with bcrypt (12 rounds)
- Login returns a JWT containing `{ sub, email, role, permissions, jti }`
- JWT stored in `localStorage`; sent as `Authorization: Bearer <token>`
- Server creates a `Session` record per login; middleware validates the session exists on every request (enables revocation)
- Token expiry configurable via `JWT_EXPIRES_IN` (default 24h)

**Secondary: Azure AD OIDC (optional)**

- Configured via system settings (`oidc.tenantId`, `oidc.clientId`, `oidc.clientSecret`)
- Flow: `/api/auth/oidc/login` → Azure consent → `/api/auth/oidc/callback`
- Auto-creates user on first OIDC login with Viewer role
- OAuth tokens encrypted at rest

**Initial Setup**

- On first launch, `GET /api/auth/setup-status` returns `{ setupComplete: false }`
- The `AuthGuard` redirects all routes to `/setup`
- Admin creates the first account via `POST /api/auth/setup`
- System sets `setup.complete = true`; subsequent visits go to login

### 3.2 Authorization (RBAC)

**Permissions** (20 total):

| Domain | Permissions |
|--------|------------|
| Users | `users.list`, `users.create`, `users.update`, `users.delete` |
| Roles | `roles.manage` |
| Cloud Connections | `cloud_connections.list`, `cloud_connections.create`, `cloud_connections.update`, `cloud_connections.delete` |
| Templates | `templates.list`, `templates.sync` |
| Deployments | `deployments.list`, `deployments.create`, `deployments.destroy` |
| GitHub | `github.manage` |
| Audit | `audit_logs.view` |
| Settings | `settings.manage` |

**System Roles** (seeded, immutable):

| Role | Permissions |
|------|------------|
| Admin | All 20 permissions |
| Editor | Cloud connections (CRUD), templates (list), deployments (full), GitHub |
| Viewer | Cloud connections (list), templates (list), deployments (list) |

**Custom Roles**: Admins can create roles with any subset of permissions. Cannot modify or delete system roles.

**Enforcement**:
- Server: `authorize(...permissions)` middleware on every protected route
- Client: `<RoleGuard>` component conditionally renders UI elements; sidebar filters nav items by permission

---

## 4. Features

### 4.1 Dashboard

**Route**: `/`

Displays summary statistics and recent activity:
- Total templates, deployments, cloud connections
- Count of active (running) deployments
- List of the 5 most recent deployments with status badges

### 4.2 Template Catalog

**Routes**: `/templates`, `/templates/:slug`, `/templates/:slug/deploy`

**Catalog Page**
- Grid of template cards showing name, description, provider, category
- Search bar (filters by name/description)
- Provider filter (AWS / GCP / Azure)
- Category filter (networking, compute, serverless, databases, storage, security, monitoring, CI/CD, containers, messaging)
- "Sync Templates" button (admin-only) triggers filesystem scan

**Template Detail Page**
- Full description, provider badge, category badge, version, tags
- Variables table: name, type, description, default value, required indicator
- Outputs table: name, description
- "Deploy this template" button

**Template Sync**
- `POST /api/templates/sync` scans the `/templates/` directory tree
- Reads `metadata.json` per template for name, description, category, tags
- Parses `variables.tf` and `outputs.tf` via regex to extract variable/output definitions
- Upserts each template to the database; slug derived from directory name

**Template File Structure**:
```
templates/{provider}/{template-name}/
├── metadata.json      # { name, description, category, tags, version }
├── main.tf            # Terraform resources
├── variables.tf       # Input variable definitions
└── outputs.tf         # Output value definitions
```

### 4.3 Cloud Connections

**Route**: `/cloud-connections`

Centralized credential management for cloud providers.

**Supported Providers**:

| Provider | Credential Fields | Validation |
|----------|------------------|-----------|
| AWS | Access Key ID, Secret Access Key, Region | Key ID format (`AK...`) |
| GCP | Project ID, Service Account Key (JSON) | Valid JSON with required fields |
| Azure | Subscription ID, Tenant ID, Client ID, Client Secret | UUID format checks |

**Features**:
- Create connection with provider-specific credential form
- Edit connection name and credentials
- Delete connection
- Re-validate credentials on demand
- Status indicator: Connected / Error / Pending
- Account identifier extracted from credentials for display

**Security**: All credentials encrypted with AES-256-GCM before storage. Encryption key sourced from `ENCRYPTION_KEY` environment variable (256-bit / 64 hex characters).

### 4.4 Deployments

**Routes**: `/deployments`, `/deployments/:id`

**Create Deployment** (from template deploy page):
1. User enters a deployment name
2. Selects a cloud connection (filtered to match template provider)
3. Fills in template variables via dynamically generated form
4. Submits → `POST /api/deployments`

**Deployment Lifecycle**:
```
pending → planning → planned → applying → succeeded
                                        → failed

succeeded → destroying → destroyed
                       → failed
```

**Terraform Execution**:
1. Server creates a temporary working directory
2. Copies template files from disk
3. Writes `terraform.tfvars` with user-provided variable values
4. Sets provider credentials as environment variables
5. Runs `terraform init` → `terraform plan` → `terraform apply`
6. Captures outputs via `terraform output -json`
7. Stores `terraform.tfstate` in database for future destroy operations
8. Cleans up temporary directory

**Deployment Queue**: Deployments execute sequentially (one at a time) to prevent Terraform state conflicts.

**Live Logs**: Server-Sent Events (SSE) stream at `GET /api/deployments/:id/logs`. The client connects and receives real-time `{ type, message, timestamp }` events during plan/apply/destroy. Connection auto-closes on completion.

**Deployment Detail Page**:
- Status badge with auto-refresh (every 2s while active)
- Details card: template, cloud connection, created by, timestamp
- Live log viewer
- Outputs card (on success): displays Terraform outputs as key-value pairs
- Variables card: shows input values
- Error message display (on failure)
- Destroy button (if succeeded and user has `deployments.destroy` permission)

### 4.5 GitHub Integration

**Route**: `/github`

Allows users to connect their GitHub account and trigger CI/CD workflows.

**Features**:
- Connect GitHub via Personal Access Token (PAT)
- PAT encrypted at rest; username and scopes stored
- List user's repositories
- List GitHub Actions workflows per repository
- Dispatch a workflow run with custom inputs
- Disconnect GitHub (deletes stored token)

**Permissions**: Requires `github.manage` permission.

### 4.6 Admin — User Management

**Route**: `/admin/users`

**Features**:
- List all users with role, status, and creation date
- Create new user (display name, email, password, role)
- Edit user (display name, email, role, active status, optional password reset)
- Delete user (with confirmation dialog)
- Toggle active/disabled status

### 4.7 Admin — Role Management

**Route**: `/admin/roles`

**Features**:
- List all roles (system and custom)
- View permissions per role
- Create custom roles with selected permissions
- Edit custom role permissions
- Delete custom roles (blocked if users are assigned)
- System roles (Admin, Editor, Viewer) are read-only

### 4.8 Admin — Audit Log

**Route**: `/admin/audit-log`

**Features**:
- Paginated table of all audit events
- Columns: timestamp, action, resource, resource ID, user, IP address
- Filters: action type, resource type, user
- Detail expansion for event metadata

**Logged Actions**:
- User login (password and OIDC)
- Cloud connection create / update / delete
- Deployment create / destroy
- GitHub connect / disconnect / workflow dispatch
- Template sync

### 4.9 Admin — System Settings

**Route**: `/admin/settings`

**Features**:
- Key-value settings editor
- OIDC configuration (tenant ID, client ID, client secret, redirect URI)
- Settings persisted in `SystemSetting` table
- Requires `settings.manage` permission

---

## 5. API Reference

Base URL: `/api`

### 5.1 Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/auth/setup-status` | No | Check if initial setup is complete |
| POST | `/auth/setup` | No | Create initial admin account |
| POST | `/auth/login` | No | Email/password login → JWT |
| POST | `/auth/logout` | Yes | Revoke current session |
| GET | `/auth/me` | Yes | Get current user |
| GET | `/auth/oidc/login` | No | Get Azure AD authorization URL |
| GET | `/auth/oidc/callback` | No | Handle OIDC callback |

Rate limit: 20 requests / 15 minutes on auth endpoints.

### 5.2 Users

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | `/users` | `users.list` | List all users |
| GET | `/users/:id` | `users.list` | Get user by ID |
| POST | `/users` | `users.create` | Create user |
| PUT | `/users/:id` | `users.update` | Update user |
| DELETE | `/users/:id` | `users.delete` | Delete user |

### 5.3 Roles

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | `/roles` | Authenticated | List all roles |
| GET | `/roles/:id` | Authenticated | Get role by ID |
| POST | `/roles` | `roles.manage` | Create custom role |
| PUT | `/roles/:id` | `roles.manage` | Update custom role |
| DELETE | `/roles/:id` | `roles.manage` | Delete custom role |

### 5.4 Cloud Connections

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | `/cloud-connections` | `cloud_connections.list` | List connections |
| GET | `/cloud-connections/:id` | `cloud_connections.list` | Get connection |
| POST | `/cloud-connections` | `cloud_connections.create` | Create connection |
| PUT | `/cloud-connections/:id` | `cloud_connections.update` | Update connection |
| DELETE | `/cloud-connections/:id` | `cloud_connections.delete` | Delete connection |
| POST | `/cloud-connections/:id/validate` | `cloud_connections.list` | Re-validate credentials |

### 5.5 Templates

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | `/templates` | `templates.list` | List (filter by provider, category, search) |
| GET | `/templates/:id` | `templates.list` | Get by ID |
| GET | `/templates/slug/:slug` | `templates.list` | Get by slug |
| POST | `/templates/sync` | `templates.sync` | Sync from filesystem |

### 5.6 Deployments

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | `/deployments` | `deployments.list` | List all deployments |
| GET | `/deployments/:id` | `deployments.list` | Get deployment |
| POST | `/deployments` | `deployments.create` | Create & enqueue deployment |
| POST | `/deployments/:id/destroy` | `deployments.destroy` | Destroy deployment |
| GET | `/deployments/:id/logs` | Token in query | SSE log stream |

### 5.7 GitHub

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | `/github/connection` | `github.manage` | Get connection |
| POST | `/github/connection` | `github.manage` | Connect with PAT |
| DELETE | `/github/connection` | `github.manage` | Disconnect |
| GET | `/github/repos` | `github.manage` | List repositories |
| GET | `/github/repos/:owner/:repo/workflows` | `github.manage` | List workflows |
| POST | `/github/dispatch` | `github.manage` | Dispatch workflow |

### 5.8 Audit Logs

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | `/audit-logs` | `audit_logs.view` | List (paginated, filterable) |

### 5.9 Settings

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | `/settings` | `settings.manage` | Get all settings |
| PUT | `/settings/:key` | `settings.manage` | Set setting |
| DELETE | `/settings/:key` | `settings.manage` | Delete setting |

### 5.10 Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | `{ status: 'ok', timestamp }` |

General rate limit: 100 requests / 15 minutes on all `/api/*` endpoints.

---

## 6. Data Models

### User
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| email | string | Unique |
| displayName | string | |
| passwordHash | string? | Null for OIDC-only users |
| isActive | boolean | Default true |
| roleId | UUID | FK → Role |
| createdAt | datetime | |
| updatedAt | datetime | |

### Role
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | string | Unique |
| permissions | JSON string | Array of permission strings |
| isSystem | boolean | True for Admin/Editor/Viewer |
| createdAt | datetime | |

### Session
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| jti | string | Unique; matches JWT `jti` claim |
| userId | UUID | FK → User |
| expiresAt | datetime | |
| createdAt | datetime | |

### OAuthAccount
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| provider | string | e.g. `azure-ad` |
| providerAccountId | string | |
| accessToken | string? | AES-256-GCM encrypted |
| refreshToken | string? | AES-256-GCM encrypted |
| userId | UUID | FK → User |
| | | Unique constraint on (provider, providerAccountId) |

### CloudConnection
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | string | |
| provider | string | `aws`, `gcp`, `azure` |
| encryptedCredentials | string | AES-256-GCM encrypted JSON |
| status | string | `connected`, `error`, `pending` |
| accountIdentifier | string | Display-safe identifier |
| createdById | UUID | |

### GitHubConnection
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| encryptedToken | string | AES-256-GCM encrypted PAT |
| username | string | |
| scopes | JSON string | |
| userId | UUID | Unique; one per user |

### Template
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| slug | string | Unique; directory name |
| name | string | |
| description | string | |
| provider | string | `aws`, `gcp`, `azure` |
| category | string | See categories list |
| version | string | Default `1.0.0` |
| templatePath | string | Filesystem path |
| variables | JSON string | Array of `TemplateVariable` |
| outputs | JSON string | Array of `TemplateOutput` |
| tags | JSON string | |

### Deployment
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | string | |
| status | string | See lifecycle |
| templateId | UUID | FK → Template |
| cloudConnectionId | UUID | FK → CloudConnection |
| variables | JSON string | User-provided inputs |
| planOutput | text? | Terraform plan output |
| applyOutput | text? | Terraform apply output |
| destroyOutput | text? | Terraform destroy output |
| outputs | JSON string? | Terraform outputs |
| terraformState | text? | tfstate for destroy |
| errorMessage | string? | |
| createdById | UUID | FK → User |

### AuditLog
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| action | string | e.g. `user.login` |
| resource | string | e.g. `deployment` |
| resourceId | string? | |
| details | JSON string? | |
| userId | UUID? | FK → User |
| ipAddress | string? | |
| createdAt | datetime | |

### SystemSetting
| Field | Type | Notes |
|-------|------|-------|
| key | string | Primary key |
| value | string | |
| updatedAt | datetime | |

---

## 7. Security

| Concern | Implementation |
|---------|---------------|
| Password storage | bcrypt, 12 rounds |
| Credential encryption | AES-256-GCM with 256-bit key from env |
| Authentication | JWT with server-side session table for revocation |
| Authorization | Permission-based RBAC, checked server-side on every request |
| Rate limiting | 20 req/15min on auth; 100 req/15min globally |
| Session revocation | Deleting Session record invalidates JWT immediately |
| CORS | Configured via `CLIENT_URL` env variable |
| Input validation | Zod schemas on all request bodies |
| Error handling | Custom error classes; no stack traces in production |
| Auto 401 handling | Client interceptor clears token and redirects on 401 |

---

## 8. Environment Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default 3001) |
| `NODE_ENV` | No | `development` or `production` |
| `JWT_SECRET` | Yes | Minimum 32 characters |
| `JWT_EXPIRES_IN` | No | Token expiry (default `24h`) |
| `ENCRYPTION_KEY` | Yes | 64 hex characters (256-bit AES key) |
| `DATABASE_URL` | Yes | Prisma connection string (default `file:./dev.db`) |
| `CLIENT_URL` | No | CORS origin (default `http://localhost:5173`) |
| `AZURE_AD_TENANT_ID` | No | Azure AD OIDC tenant |
| `AZURE_AD_CLIENT_ID` | No | Azure AD OIDC client |
| `AZURE_AD_CLIENT_SECRET` | No | Azure AD OIDC secret |
| `AZURE_AD_REDIRECT_URI` | No | OIDC callback URL |

---

## 9. Templates

The portal ships with 60 pre-built Terraform templates:

### AWS (20 templates)
ALB, API Gateway, CloudFront, CloudWatch, CodePipeline, DynamoDB, EC2, ECR, ECS, EKS, ElastiCache, EventBridge, IAM, Kinesis, Lambda, RDS, Route 53, S3, SNS, SQS

### Azure (20 templates)
AKS, API Management, App Service, Application Gateway, Blob Storage, Cognitive Services, Container Instances, Cosmos DB, Event Hubs, Front Door, Functions, Key Vault, Monitor, NSG, Redis, Service Bus, SQL Database, Virtual Machine, Virtual Network, VPN Gateway

### GCP (20 templates)
BigQuery, Cloud Armor, Cloud CDN, Cloud DNS, Cloud Functions, Cloud Run, Cloud SQL, Cloud Storage, Composer, Dataflow, Firestore, GKE, IAM, KMS, Memorystore, Pub/Sub, Secret Manager, Spanner, VPC, Workflows

Each template includes `metadata.json`, `main.tf`, `variables.tf`, and `outputs.tf`.

---

## 10. Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example server/.env
# Edit server/.env with real JWT_SECRET and ENCRYPTION_KEY

# Initialize database
npm run db:setup

# Start development servers
npm run dev
# Client: http://localhost:5173
# Server: http://localhost:3001

# First visit: complete setup wizard to create admin account
```
