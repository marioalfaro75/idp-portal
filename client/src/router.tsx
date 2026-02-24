import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuthGuard } from './components/guards/AuthGuard';
import { LoginPage } from './pages/auth/LoginPage';
import { SetupPage } from './pages/auth/SetupPage';
import { OAuthCallbackPage } from './pages/auth/OAuthCallbackPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { TemplateCatalogPage } from './pages/templates/TemplateCatalogPage';
import { TemplateDetailPage } from './pages/templates/TemplateDetailPage';
import { DeployPage } from './pages/templates/DeployPage';
import { DeploymentListPage } from './pages/deployments/DeploymentListPage';
import { DeploymentDetailPage } from './pages/deployments/DeploymentDetailPage';
import { ScaffoldPage } from './pages/services/ScaffoldPage';
import { ServiceCatalogPage } from './pages/services/ServiceCatalogPage';
import { ServiceDetailPage } from './pages/services/ServiceDetailPage';
import { CloudConnectionsPage } from './pages/cloud-connections/CloudConnectionsPage';
import { GitHubPage } from './pages/github/GitHubPage';
import { UsersPage } from './pages/admin/UsersPage';
import { RolesPage } from './pages/admin/RolesPage';
import { GroupsPage } from './pages/admin/GroupsPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { TerraformPage } from './pages/admin/TerraformPage';
import { PortalAdminPage } from './pages/admin/PortalAdminPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/setup', element: <SetupPage /> },
  { path: '/auth/callback', element: <OAuthCallbackPage /> },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'templates', element: <TemplateCatalogPage /> },
      { path: 'templates/:slug', element: <TemplateDetailPage /> },
      { path: 'templates/:slug/deploy', element: <DeployPage /> },
      { path: 'templates/:slug/scaffold', element: <ScaffoldPage /> },
      { path: 'services', element: <ServiceCatalogPage /> },
      { path: 'services/:id', element: <ServiceDetailPage /> },
      { path: 'deployments', element: <DeploymentListPage /> },
      { path: 'deployments/:id', element: <DeploymentDetailPage /> },
      { path: 'cloud-connections', element: <CloudConnectionsPage /> },
      { path: 'github', element: <GitHubPage /> },
      { path: 'admin/users', element: <UsersPage /> },
      { path: 'admin/roles', element: <RolesPage /> },
      { path: 'admin/groups', element: <GroupsPage /> },
      { path: 'admin/audit-log', element: <AuditLogPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'admin/terraform', element: <TerraformPage /> },
      { path: 'admin/portal', element: <PortalAdminPage /> },
    ],
  },
]);
