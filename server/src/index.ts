import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limiter';
import { logger } from './utils/logger';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import rolesRoutes from './modules/roles/roles.routes';
import cloudConnectionsRoutes from './modules/cloud-connections/cloud-connections.routes';
import templatesRoutes from './modules/templates/templates.routes';
import deploymentsRoutes from './modules/deployments/deployments.routes';
import githubRoutes from './modules/github/github.routes';
import auditRoutes from './modules/audit/audit.routes';
import settingsRoutes from './modules/settings/settings.routes';
import { checkTerraformAvailable } from './modules/deployments/terraform-runner';
import { pollGitHubDeployments } from './modules/deployments/github-executor';
import servicesRoutes from './modules/services/services.routes';
import groupsRoutes from './modules/groups/groups.routes';
import federationRoutes from './modules/federation/federation.routes';
import { pollWorkflowRuns } from './modules/services/workflow-poller';
import { migrateLegacyOidc } from './modules/federation/federation.service';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/cloud-connections', cloudConnectionsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/deployments', deploymentsRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/federation', federationRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);

  checkTerraformAvailable().then(({ available, version }) => {
    if (available) logger.info(`Terraform available: v${version}`);
    else logger.warn('Terraform not found. Local deployments will fail. Install terraform or set TERRAFORM_BIN.');
  });

  // Migrate legacy OIDC settings to federation providers
  migrateLegacyOidc().catch((err) => logger.error('Legacy OIDC migration failed', { error: (err as Error).message }));

  // Start GitHub deployment poller
  setInterval(pollGitHubDeployments, 30_000);

  // Start workflow run poller
  setInterval(pollWorkflowRuns, 30_000);
});

export default app;
