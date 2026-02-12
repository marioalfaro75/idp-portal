# Agent Guide — Internal Developer Portal (IDP)

## Project Overview

This is a full-stack Internal Developer Portal for provisioning cloud infrastructure via Terraform templates. It is a TypeScript monorepo with three workspaces: `client` (React SPA), `server` (Express API), and `shared` (types, validators, constants).

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 18+ |
| Language | TypeScript | 5.x (strict mode) |
| Frontend | React | 18.3 |
| Build Tool | Vite | 5.1 |
| CSS | Tailwind CSS | 3.4 |
| State (client) | Zustand | 4.5 |
| Server State | React Query | 5.20 |
| HTTP Client | Axios | 1.6 |
| Icons | Lucide React | 0.344 |
| Notifications | react-hot-toast | 2.4 |
| Routing | react-router-dom | 6.22 |
| Backend | Express | 4.18 |
| ORM | Prisma | 5.10 |
| Database | SQLite | (via Prisma) |
| Auth | jsonwebtoken + bcryptjs | |
| Validation | Zod | 3.22 |
| GitHub API | Octokit REST | 20.0 |
| Azure OIDC | @azure/msal-node | 2.6 |
| IaC | Terraform CLI | (spawned as child process) |

---

## Repository Structure

```
idp-portal/
├── package.json              # Root workspace config, top-level scripts
├── tsconfig.base.json        # Shared TypeScript config
│
├── client/                   # React frontend (@idp/client)
│   ├── src/
│   │   ├── main.tsx          # App entry point (React Query + Router providers)
│   │   ├── router.tsx        # All route definitions
│   │   ├── index.css         # Tailwind imports
│   │   ├── api/              # Axios API client modules
│   │   │   ├── client.ts     # Axios instance, interceptors
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── roles.ts
│   │   │   ├── cloud-connections.ts
│   │   │   ├── templates.ts
│   │   │   ├── deployments.ts
│   │   │   ├── github.ts
│   │   │   ├── audit.ts
│   │   │   └── settings.ts
│   │   ├── components/
│   │   │   ├── ui/           # Reusable primitives (Button, Input, Select, Card, Badge, Modal, Table)
│   │   │   ├── forms/        # DynamicForm (renders template variables)
│   │   │   ├── guards/       # AuthGuard, RoleGuard
│   │   │   └── layout/       # AppLayout, Sidebar, TopBar
│   │   ├── hooks/            # useAuth, useTemplates, useDeployments
│   │   ├── stores/           # Zustand stores (auth-store, ui-store)
│   │   └── pages/
│   │       ├── auth/         # LoginPage, SetupPage, OAuthCallbackPage
│   │       ├── dashboard/    # DashboardPage
│   │       ├── templates/    # TemplateCatalogPage, TemplateDetailPage, DeployPage
│   │       ├── deployments/  # DeploymentListPage, DeploymentDetailPage
│   │       ├── cloud-connections/  # CloudConnectionsPage
│   │       ├── github/       # GitHubPage
│   │       └── admin/        # UsersPage, RolesPage, AuditLogPage, SettingsPage
│   ├── index.html
│   ├── vite.config.ts        # Vite config with /api proxy to :3001
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── server/                   # Express backend (@idp/server)
│   ├── src/
│   │   ├── index.ts          # Server entry (Express app setup, middleware, routes)
│   │   ├── prisma.ts         # Prisma client singleton
│   │   ├── middleware/
│   │   │   ├── authenticate.ts   # JWT verification + session check
│   │   │   ├── authorize.ts      # Permission-based access control
│   │   │   ├── validate.ts       # Zod request body validation
│   │   │   ├── error-handler.ts  # Global error handler
│   │   │   └── rate-limiter.ts   # Rate limiting (100/15min general, 20/15min auth)
│   │   ├── modules/
│   │   │   ├── auth/             # Login, setup, logout, OIDC, JWT
│   │   │   ├── users/            # User CRUD
│   │   │   ├── roles/            # Role CRUD
│   │   │   ├── cloud-connections/ # Connection CRUD, credential validation, encryption
│   │   │   ├── templates/        # Template listing, sync, filesystem parsing
│   │   │   ├── deployments/      # Deployment CRUD, terraform-runner, queue, SSE logs
│   │   │   ├── github/           # GitHub connection, repos, workflows, dispatch
│   │   │   ├── audit/            # Audit log service + routes
│   │   │   └── settings/         # System settings CRUD
│   │   └── utils/
│   │       ├── errors.ts         # AppError, NotFoundError, UnauthorizedError, etc.
│   │       ├── async-handler.ts  # Wraps async route handlers
│   │       ├── crypto.ts         # AES-256-GCM encrypt/decrypt
│   │       └── logger.ts         # Console logger with levels
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema (9 models)
│   │   ├── seed.ts           # Seeds system roles (Admin, Editor, Viewer)
│   │   ├── migrations/       # Prisma migration files
│   │   └── dev.db            # SQLite database file (gitignored)
│   ├── .env                  # Environment variables (gitignored)
│   └── tsconfig.json
│
├── shared/                   # Shared package (@idp/shared)
│   ├── src/
│   │   ├── index.ts          # Barrel export
│   │   ├── types/            # TypeScript interfaces (User, Role, Template, Deployment, etc.)
│   │   ├── validators/       # Zod schemas for request validation
│   │   └── constants/        # Permissions enum, system role definitions
│   └── tsconfig.json
│
└── templates/                # Terraform template library (60 templates)
    ├── aws/                  # 20 AWS templates
    ├── azure/                # 20 Azure templates
    └── gcp/                  # 20 GCP templates
```

---

## Key Commands

```bash
# Install all workspace dependencies
npm install

# Start both client and server in development mode
npm run dev

# Build all packages
npm run build

# Database operations
npm run db:migrate          # Run Prisma migrations
npm run db:seed             # Seed system roles
npm run db:setup            # Migrate + seed

# Type checking (client only, since Vite doesn't typecheck)
cd client && npx tsc --noEmit

# Prisma utilities
cd server && npx prisma studio    # Visual DB browser
cd server && npx prisma generate  # Regenerate client after schema changes
```

---

## Database

**ORM**: Prisma with SQLite (`server/prisma/dev.db`)

**Schema file**: `server/prisma/schema.prisma`

**Models** (9 total):
- `User` — portal users; FK to Role
- `Role` — permission groups; permissions stored as JSON string array
- `Session` — JWT session tracking (jti-based revocation)
- `OAuthAccount` — Azure AD OIDC linked accounts
- `CloudConnection` — encrypted cloud provider credentials
- `GitHubConnection` — encrypted GitHub PAT per user
- `Template` — synced from filesystem; variables/outputs as JSON
- `Deployment` — terraform deployment records with state
- `AuditLog` — immutable action log
- `SystemSetting` — key-value config store

**Conventions**:
- All primary keys are UUIDs (`@id @default(uuid())`)
- Timestamps: `createdAt` (auto), `updatedAt` (auto)
- JSON data stored as strings (SQLite limitation), parsed in application layer
- Encrypted fields use format: `base64(iv):base64(tag):base64(ciphertext)`

---

## Authentication & Authorization

**Auth flow**: JWT with server-side session validation.

- JWT payload: `{ sub, email, role, permissions, jti, iat, exp }`
- Session record created per login; `jti` links JWT to session
- Middleware checks session exists on every authenticated request
- Logout = delete session record → JWT immediately invalid

**RBAC**: 20 permissions across 8 domains. Three system roles (Admin, Editor, Viewer) seeded on setup. Custom roles supported.

**Server enforcement**:
```typescript
router.get('/', authenticate, authorize(PERMISSIONS.USERS_LIST), handler);
```

**Client enforcement** (UI-only, not security boundary):
```tsx
<RoleGuard permission={PERMISSIONS.USERS_CREATE}>
  <Button>Add User</Button>
</RoleGuard>
```

---

## Coding Patterns

### Server Module Structure

Each feature in `server/src/modules/{feature}/` follows this layout:
- `{feature}.routes.ts` — Express router with middleware chain
- `{feature}.service.ts` — Business logic (Prisma queries, encryption, etc.)
- `{feature}.validators.ts` — Zod schemas (imported from shared or local)

**Route pattern**:
```typescript
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

router.post('/',
  authenticate,
  authorize(PERMISSIONS.RESOURCE_CREATE),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const result = await service.create(req.body, req.user!.sub);
    res.status(201).json(result);
  })
);
```

### Client API Pattern

Each API module in `client/src/api/` exports an object:
```typescript
export const resourceApi = {
  list: () => api.get<Resource[]>('/resource').then(r => r.data),
  get: (id: string) => api.get<Resource>(`/resource/${id}`).then(r => r.data),
  create: (data: CreateInput) => api.post<Resource>('/resource', data).then(r => r.data),
  update: (id: string, data: UpdateInput) => api.put<Resource>(`/resource/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/resource/${id}`).then(r => r.data),
};
```

### Client Page Pattern

Pages use React Query for data fetching and `react-hot-toast` for feedback:
```typescript
const { data, isLoading } = useQuery({ queryKey: ['resource'], queryFn: resourceApi.list });
const queryClient = useQueryClient();

const handleAction = async () => {
  try {
    await resourceApi.doSomething();
    toast.success('Done');
    queryClient.invalidateQueries({ queryKey: ['resource'] });
  } catch (err: any) {
    toast.error(err.response?.data?.error?.message || 'Failed');
  }
};
```

### UI Component Usage

All reusable UI primitives are in `client/src/components/ui/`:

```tsx
<Card title="Section Title" actions={<Button>Action</Button>}>
  <Table columns={columns} data={data} />
</Card>

<Modal open={isOpen} onClose={() => setIsOpen(false)} title="Dialog Title">
  <form onSubmit={handleSubmit} className="space-y-4">
    <Input label="Name" value={val} onChange={...} required />
    <Select label="Type" options={options} value={val} onChange={...} />
    <Button type="submit" loading={isLoading}>Save</Button>
  </form>
</Modal>
```

### Error Handling

Server errors use custom classes from `server/src/utils/errors.ts`:
```typescript
throw new NotFoundError('User');       // 404: "User not found"
throw new ConflictError('Email taken'); // 409
throw new ForbiddenError();            // 403
throw new ValidationError('Bad input'); // 400
```

All caught by `error-handler.ts` middleware → JSON response `{ error: { message, code } }`.

---

## Environment Variables

Required in `server/.env`:

| Variable | Example | Notes |
|----------|---------|-------|
| `PORT` | `3001` | Server listen port |
| `JWT_SECRET` | `your-random-secret-at-least-32-chars` | Sign/verify JWTs |
| `JWT_EXPIRES_IN` | `24h` | Token lifetime |
| `ENCRYPTION_KEY` | `0123456789abcdef...` (64 hex chars) | AES-256-GCM key |
| `DATABASE_URL` | `file:./dev.db` | Prisma connection string |
| `CLIENT_URL` | `http://localhost:5173` | CORS allowed origin |

Optional:
- `AZURE_AD_TENANT_ID`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_REDIRECT_URI` — for OIDC
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — for GitHub OAuth

---

## API Endpoints

All endpoints prefixed with `/api`. Auth endpoints rate-limited to 20 req/15min. All others 100 req/15min.

### Public
- `GET /api/health` — Health check
- `GET /api/auth/setup-status` — Check setup state
- `POST /api/auth/setup` — Initial admin creation
- `POST /api/auth/login` — Password login
- `GET /api/auth/oidc/login` — Start OIDC flow
- `GET /api/auth/oidc/callback` — OIDC callback

### Authenticated (no specific permission)
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/roles`, `GET /api/roles/:id`

### Permission-gated
- `/api/users` — CRUD (`users.list/create/update/delete`)
- `/api/roles` — Create/Update/Delete (`roles.manage`)
- `/api/cloud-connections` — CRUD + validate (`cloud_connections.*`)
- `/api/templates` — List/Get (`templates.list`), Sync (`templates.sync`)
- `/api/deployments` — List/Get (`deployments.list`), Create (`deployments.create`), Destroy (`deployments.destroy`)
- `/api/deployments/:id/logs` — SSE stream (token in query param)
- `/api/github/*` — All (`github.manage`)
- `/api/audit-logs` — List (`audit_logs.view`)
- `/api/settings` — CRUD (`settings.manage`)

---

## Terraform Integration

**Templates**: 60 pre-built templates in `/templates/{aws,azure,gcp}/{name}/`. Each contains `metadata.json`, `main.tf`, `variables.tf`, `outputs.tf`.

**Sync**: `POST /api/templates/sync` scans the filesystem, parses `.tf` files with regex, upserts to database.

**Execution** (`server/src/modules/deployments/terraform-runner.ts`):
1. Creates temp directory, copies template files
2. Writes `terraform.tfvars` from user inputs
3. Sets cloud credentials as environment variables
4. Runs: `init` → `plan` → `apply` (or `destroy`)
5. Streams stdout/stderr to SSE via EventEmitter
6. Captures terraform outputs and state
7. Cleans up temp directory

**Queue** (`deployment-queue.ts`): Single-threaded — one deployment runs at a time.

**Live logs**: SSE at `GET /api/deployments/:id/logs?token=...`. Events: `log`, `status`, `error`, `complete`.

---

## Client Routing

Defined in `client/src/router.tsx`:

| Path | Component | Auth | Notes |
|------|-----------|------|-------|
| `/login` | LoginPage | No | |
| `/setup` | SetupPage | No | Only before setup complete |
| `/auth/callback` | OAuthCallbackPage | No | OIDC redirect target |
| `/` | DashboardPage | Yes | Stats + recent deployments |
| `/templates` | TemplateCatalogPage | Yes | Search + filter grid |
| `/templates/:slug` | TemplateDetailPage | Yes | Variables, outputs, deploy button |
| `/templates/:slug/deploy` | DeployPage | Yes | Deploy form |
| `/deployments` | DeploymentListPage | Yes | Table of all deployments |
| `/deployments/:id` | DeploymentDetailPage | Yes | Logs, outputs, destroy |
| `/cloud-connections` | CloudConnectionsPage | Yes | CRUD connections |
| `/github` | GitHubPage | Yes | PAT connect, repos, workflows |
| `/admin/users` | UsersPage | Yes | User management |
| `/admin/roles` | RolesPage | Yes | Role management |
| `/admin/audit-log` | AuditLogPage | Yes | Audit log viewer |
| `/admin/settings` | SettingsPage | Yes | System settings |

All authenticated routes wrapped in `<AuthGuard>` → `<AppLayout>`.

---

## Testing Guidance

Currently no test framework is configured. When adding tests:

- **Server unit tests**: Test service functions with mocked Prisma client
- **Server integration tests**: Test routes with supertest against a test database
- **Client tests**: Test components with React Testing Library + Vitest
- **E2E tests**: Playwright or Cypress against running dev servers

---

## Common Tasks

### Adding a New API Endpoint

1. Create/update service in `server/src/modules/{feature}/{feature}.service.ts`
2. Add Zod validator in `shared/src/validators/` or locally
3. Add route in `server/src/modules/{feature}/{feature}.routes.ts` with auth + validation middleware
4. Add permission constant in `shared/src/constants/permissions.ts` if needed
5. Register route in `server/src/index.ts` if it's a new module
6. Add API client method in `client/src/api/{feature}.ts`
7. Add audit logging call if the action should be tracked

### Adding a New Page

1. Create page component in `client/src/pages/{section}/`
2. Add route in `client/src/router.tsx` under the authenticated layout
3. Add sidebar nav item in `client/src/components/layout/Sidebar.tsx` with required permission
4. Use existing UI components from `client/src/components/ui/`

### Adding a New Terraform Template

1. Create directory: `templates/{provider}/{template-name}/`
2. Add `metadata.json`: `{ "name": "...", "description": "...", "category": "...", "tags": [...], "version": "1.0.0" }`
3. Add `main.tf`, `variables.tf`, `outputs.tf`
4. Run template sync from the UI or call `POST /api/templates/sync`

### Adding a New Permission

1. Add to `PERMISSIONS` in `shared/src/constants/permissions.ts`
2. Add to relevant system role in `SYSTEM_ROLES`
3. Use in `authorize()` middleware on routes
4. Re-run `npm run db:seed` to update system roles
5. Use in `<RoleGuard>` on client if needed

### Modifying the Database Schema

1. Edit `server/prisma/schema.prisma`
2. Run `cd server && npx prisma migrate dev --name description-of-change`
3. Run `npx prisma generate` (auto-runs with migrate)
4. Update corresponding types in `shared/src/types/`
