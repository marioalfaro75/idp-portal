export const PERMISSIONS = {
  USERS_LIST: 'users.list',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  ROLES_MANAGE: 'roles.manage',
  CLOUD_CONNECTIONS_LIST: 'cloud_connections.list',
  CLOUD_CONNECTIONS_CREATE: 'cloud_connections.create',
  CLOUD_CONNECTIONS_UPDATE: 'cloud_connections.update',
  CLOUD_CONNECTIONS_DELETE: 'cloud_connections.delete',
  TEMPLATES_LIST: 'templates.list',
  TEMPLATES_SYNC: 'templates.sync',
  DEPLOYMENTS_LIST: 'deployments.list',
  DEPLOYMENTS_CREATE: 'deployments.create',
  DEPLOYMENTS_DESTROY: 'deployments.destroy',
  GITHUB_MANAGE: 'github.manage',
  AUDIT_LOGS_VIEW: 'audit_logs.view',
  SETTINGS_MANAGE: 'settings.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SYSTEM_ROLES = {
  ADMIN: {
    name: 'Admin',
    permissions: Object.values(PERMISSIONS),
  },
  EDITOR: {
    name: 'Editor',
    permissions: [
      PERMISSIONS.CLOUD_CONNECTIONS_LIST,
      PERMISSIONS.CLOUD_CONNECTIONS_CREATE,
      PERMISSIONS.CLOUD_CONNECTIONS_UPDATE,
      PERMISSIONS.TEMPLATES_LIST,
      PERMISSIONS.DEPLOYMENTS_LIST,
      PERMISSIONS.DEPLOYMENTS_CREATE,
      PERMISSIONS.DEPLOYMENTS_DESTROY,
      PERMISSIONS.GITHUB_MANAGE,
    ],
  },
  VIEWER: {
    name: 'Viewer',
    permissions: [
      PERMISSIONS.CLOUD_CONNECTIONS_LIST,
      PERMISSIONS.TEMPLATES_LIST,
      PERMISSIONS.DEPLOYMENTS_LIST,
    ],
  },
} as const;
