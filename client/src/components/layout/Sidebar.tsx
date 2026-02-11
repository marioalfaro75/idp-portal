import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { useUiStore } from '../../stores/ui-store';
import { PERMISSIONS } from '@idp/shared';
import {
  LayoutDashboard, Layers, Rocket, Cloud, GitBranch,
  Users, Shield, FileText, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/templates', label: 'Templates', icon: Layers, permission: PERMISSIONS.TEMPLATES_LIST },
  { to: '/deployments', label: 'Deployments', icon: Rocket, permission: PERMISSIONS.DEPLOYMENTS_LIST },
  { to: '/cloud-connections', label: 'Cloud Connections', icon: Cloud, permission: PERMISSIONS.CLOUD_CONNECTIONS_LIST },
  { to: '/github', label: 'GitHub', icon: GitBranch, permission: PERMISSIONS.GITHUB_MANAGE },
  { to: '/admin/users', label: 'Users', icon: Users, permission: PERMISSIONS.USERS_LIST },
  { to: '/admin/roles', label: 'Roles', icon: Shield, permission: PERMISSIONS.ROLES_MANAGE },
  { to: '/admin/audit-log', label: 'Audit Log', icon: FileText, permission: PERMISSIONS.AUDIT_LOGS_VIEW },
  { to: '/admin/settings', label: 'Settings', icon: Settings, permission: PERMISSIONS.SETTINGS_MANAGE },
];

export function Sidebar() {
  const { hasPermission } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  const filteredItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <aside className={`fixed top-0 left-0 h-full bg-gray-900 text-white transition-all duration-300 z-40 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {!sidebarCollapsed && <span className="text-lg font-bold">IDP Portal</span>}
        <button onClick={toggleSidebar} className="p-1 hover:bg-gray-800 rounded-lg">
          {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
      <nav className="mt-4 px-2 space-y-1">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
