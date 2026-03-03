# Security TODO — Medium/Low Priority Items

Items 14-33 from the full security review. These are lower-priority improvements to address after the HIGH/CRITICAL fixes (items 1-13) are complete.

## Medium Priority (DONE)

### 14. ~~Rate limiting on auth endpoints~~ DONE
Added `authLimiter` (20 req/15min) to federation `/:slug/login`, `GET /:slug/callback`, and `POST /:slug/callback` routes.

### 15. ~~CSRF protection for state-changing endpoints~~ DONE (N/A)
SPA uses JWT Bearer tokens (CSRF-immune). Federation cookie-based CSRF already handled via `federation_state` httpOnly cookie.

### 16. ~~Input sanitization for deployment names~~ DONE
Added `.max(100)` and `.regex(/^[\w\s\-_.()]+$/)` to deployment name validator. Added `.max(100)` to service name validator.

### 17. ~~Audit log for failed login attempts~~ DONE
Added `login_failed` audit entry (with email, IP) on auth login failure. Added `federation_login_failed` audit entry (with provider, protocol, error) on OIDC/SAML callback failure.

### 18. ~~Session cleanup cron job~~ DONE
Added periodic cleanup of expired sessions: runs on startup and every hour via `setInterval`. Logs count when sessions are cleaned.

### 19. ~~Terraform state encryption at rest~~ DONE
Added `encryptState()`/`decryptState()` helpers using AES-256-GCM. Encrypted on all writes, decrypted on all reads. Backwards-compatible with unencrypted state.

### 20. ~~Cloud connection credential rotation reminder~~ DONE
Added `credentialAge` (days since last update) to `formatConnection()` output and `CloudConnection` type. Client shows "Rotate" warning badge when age > 90 days.

### 21. ~~Template path traversal hardening~~ DONE
Added `validateTemplatePath()` check at start of `plan()`, `apply()`, `destroy()` in `terraform-runner.ts`. Same check in `security.service.ts` `scanTemplate()`.

### 22. ~~Deployment variable size limits~~ DONE
Constrained `variables` record: keys `.max(100)`, values `.max(10_000)`, max 100 keys via `.refine()`.

### 23. ~~SSE connection limits~~ DONE
Added per-user SSE connection tracking with `MAX_SSE_PER_USER = 10`. Returns 429 at limit. Decrements on connection close.

## Low Priority (DONE)

### 24. ~~Content Security Policy headers~~ DONE
### 25. ~~Security headers (HSTS, X-Frame-Options, etc.)~~ DONE
Added `helmet` middleware with CSP (self + unsafe-inline for styles), frameguard deny, HSTS, and other standard headers. `crossOriginEmbedderPolicy: false` for dev compatibility.

### 26. ~~API response filtering~~ WON'T FIX
Low value for internal portal. Existing `formatXxx()` functions already shape responses. React app needs IDs/timestamps to function.

### 27. ~~Dependency audit automation~~ DONE
Added `npm audit --audit-level=high` script to root `package.json`. Created `.github/workflows/security-audit.yml` running on push to main + weekly Monday schedule.

### 28. ~~Log redaction~~ DONE
Added `redactString()`/`redactMeta()` to `server/src/utils/logger.ts`. Redacts AWS access keys (`AKIA...`), JWT tokens (`eyJ...`), and values in keys matching `password|secret|token|private.?key|credential|authorization`.

### 29. ~~Deployment output sanitization~~ DONE
Created `server/src/utils/redact.ts` with `redactOutput()`. Applied to all `planOutput`/`applyOutput`/`destroyOutput` writes in `deployments.service.ts` and `github-executor.ts`. Redacts AWS keys, temp keys, and secret/password/token values in Terraform output.

### 30. ~~GitHub App private key rotation~~ DONE
Added `testPrivateKey()` in `github-app.ts` and `POST /api/github/app/test-key` endpoint (Portal Admin only). Admins can test a new key before saving it via the existing update endpoint.

### 31. ~~Federation provider config backup~~ DONE
Added `exportAll()`/`importProviders()` to federation service. `GET /admin/providers/export` returns decrypted configs. `POST /admin/providers/import` accepts JSON array and upserts by slug. Both Portal Admin only with audit logging.

### 32. ~~Audit log retention policy~~ DONE
Added `cleanupOldLogs()` to `audit.service.ts`. Reads `audit.retentionDays` from SystemSettings (default 0 = keep forever). Runs on startup + daily via `setInterval`. Portal Admin can configure via Settings page.

### 33. ~~RBAC permission audit trail~~ DONE
Role update now logs `permissionsBefore`/`permissionsAfter` in audit details. Role delete logs the deleted role's name and permissions.
