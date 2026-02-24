import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { useUiStore } from '../../stores/ui-store';
import { PERMISSIONS } from '@idp/shared';
import {
  LayoutDashboard, Layers, Rocket, Cloud, GitBranch,
  Users, UsersRound, Shield, FileText, Settings, ChevronLeft, ChevronRight, Box, Terminal,
  GripVertical, Check, ChevronUp, ChevronDown,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/templates', label: 'Templates', icon: Layers, permission: PERMISSIONS.TEMPLATES_LIST },
  { to: '/services', label: 'Services', icon: Box, permission: PERMISSIONS.SERVICES_LIST },
  { to: '/deployments', label: 'Deployments', icon: Rocket, permission: PERMISSIONS.DEPLOYMENTS_LIST },
  { to: '/cloud-connections', label: 'Cloud Connections', icon: Cloud, permission: PERMISSIONS.CLOUD_CONNECTIONS_LIST },
  { to: '/github', label: 'GitHub', icon: GitBranch, permission: PERMISSIONS.GITHUB_MANAGE },
  { to: '/admin/users', label: 'Users', icon: Users, permission: PERMISSIONS.USERS_LIST },
  { to: '/admin/roles', label: 'Roles', icon: Shield, permission: PERMISSIONS.ROLES_MANAGE },
  { to: '/admin/groups', label: 'Groups', icon: UsersRound, permission: PERMISSIONS.GROUPS_MANAGE },
  { to: '/admin/audit-log', label: 'Audit Log', icon: FileText, permission: PERMISSIONS.AUDIT_LOGS_VIEW },
  { to: '/admin/settings', label: 'Settings', icon: Settings, permission: PERMISSIONS.SETTINGS_MANAGE },
  { to: '/admin/terraform', label: 'Terraform', icon: Terminal, permission: PERMISSIONS.SETTINGS_MANAGE },
];

function sortByMenuOrder<T extends { to: string }>(items: T[], menuOrder: string[]): T[] {
  if (menuOrder.length === 0) return items;
  const orderMap = new Map(menuOrder.map((path, i) => [path, i]));
  return [...items].sort((a, b) => {
    const aIdx = orderMap.get(a.to);
    const bIdx = orderMap.get(b.to);
    if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
    if (aIdx !== undefined) return -1;
    if (bIdx !== undefined) return 1;
    return 0;
  });
}

export function Sidebar() {
  const { hasPermission } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, menuOrder, menuEditMode, setMenuOrder, toggleMenuEditMode } = useUiStore();

  const filteredItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );
  const sortedItems = sortByMenuOrder(filteredItems, menuOrder);

  const moveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sortedItems.length) return;
    const newOrder = sortedItems.map((item) => item.to);
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setMenuOrder(newOrder);
  };

  return (
    <aside className={`fixed top-0 left-0 h-full bg-gray-900 text-white transition-all duration-300 z-40 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {!sidebarCollapsed && <span className="text-lg font-bold">IDP Portal</span>}
        <div className="flex items-center gap-1">
          {!sidebarCollapsed && (
            <button
              onClick={toggleMenuEditMode}
              className={`p-1 rounded-lg transition-colors ${menuEditMode ? 'bg-primary-600 hover:bg-primary-700' : 'hover:bg-gray-800'}`}
              title={menuEditMode ? 'Done reordering' : 'Reorder menu'}
            >
              {menuEditMode ? <Check className="w-5 h-5" /> : <GripVertical className="w-5 h-5" />}
            </button>
          )}
          <button onClick={toggleSidebar} className="p-1 hover:bg-gray-800 rounded-lg">
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <nav className="mt-4 px-2 space-y-1">
        {sortedItems.map((item, index) => (
          <div
            key={item.to}
            className={`flex items-center ${menuEditMode ? 'rounded-lg border border-dashed border-gray-700' : ''}`}
          >
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 min-w-0 ${
                  isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
            {menuEditMode && !sidebarCollapsed && (
              <div className="flex flex-col mr-1">
                <button
                  onClick={() => moveItem(index, -1)}
                  className={`p-0.5 rounded transition-colors ${index === 0 ? 'text-gray-700 cursor-default' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                  disabled={index === 0}
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveItem(index, 1)}
                  className={`p-0.5 rounded transition-colors ${index === sortedItems.length - 1 ? 'text-gray-700 cursor-default' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                  disabled={index === sortedItems.length - 1}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
