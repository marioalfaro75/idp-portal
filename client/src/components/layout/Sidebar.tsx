import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { useUiStore } from '../../stores/ui-store';
import { PERMISSIONS } from '@idp/shared';
import {
  LayoutDashboard, Layers, Rocket, Cloud, GitBranch,
  Users, UsersRound, Shield, FileText, Settings, ChevronLeft, ChevronRight, Box, Terminal,
  GripVertical, Check, ChevronDown, ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  children?: NavItem[];
};

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/templates', label: 'Templates', icon: Layers, permission: PERMISSIONS.TEMPLATES_LIST },
  { to: '/services', label: 'Services', icon: Box, permission: PERMISSIONS.SERVICES_LIST },
  { to: '/deployments', label: 'Deployments', icon: Rocket, permission: PERMISSIONS.DEPLOYMENTS_LIST },
  { to: '/cloud-connections', label: 'Cloud Connections', icon: Cloud, permission: PERMISSIONS.CLOUD_CONNECTIONS_LIST },
  { to: '/github', label: 'GitHub', icon: GitBranch, permission: PERMISSIONS.GITHUB_MANAGE },
  { to: '/admin/audit-log', label: 'Audit Log', icon: FileText, permission: PERMISSIONS.AUDIT_LOGS_VIEW },
  {
    to: '/settings', label: 'User Settings', icon: Settings,
    children: [
      { to: '/admin/users', label: 'Users', icon: Users, permission: PERMISSIONS.USERS_LIST },
      { to: '/admin/roles', label: 'Roles', icon: Shield, permission: PERMISSIONS.ROLES_MANAGE },
      { to: '/admin/groups', label: 'Groups', icon: UsersRound, permission: PERMISSIONS.GROUPS_MANAGE },
      { to: '/admin/terraform', label: 'Terraform', icon: Terminal, permission: PERMISSIONS.SETTINGS_MANAGE },
      { to: '/admin/portal', label: 'Portal', icon: ShieldCheck, permission: PERMISSIONS.PORTAL_ADMIN },
    ],
  },
];

function filterNavItems(items: NavItem[], hasPermission: (p: string) => boolean): NavItem[] {
  return items.reduce<NavItem[]>((acc, item) => {
    if (item.children) {
      const visibleChildren = item.children.filter(
        (child) => !child.permission || hasPermission(child.permission),
      );
      if (!item.permission || hasPermission(item.permission)) {
        // Parent has no permission gate (or user has it): always show
        // If no visible children, show as plain link (no children)
        if (visibleChildren.length > 0) {
          acc.push({ ...item, children: visibleChildren });
        } else {
          acc.push({ ...item, children: undefined });
        }
      } else if (visibleChildren.length > 0) {
        acc.push({ ...item, children: visibleChildren });
      }
    } else if (!item.permission || hasPermission(item.permission)) {
      acc.push(item);
    }
    return acc;
  }, []);
}

function sortByMenuOrder(items: NavItem[], menuOrder: string[]): NavItem[] {
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
  const { sidebarCollapsed, toggleSidebar, menuOrder, menuEditMode, setMenuOrder, toggleMenuEditMode, settingsExpanded, toggleSettingsExpanded } = useUiStore();
  const location = useLocation();

  const filteredItems = filterNavItems(navItems, hasPermission);
  const sortedItems = sortByMenuOrder(filteredItems, menuOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedItems.findIndex((item) => item.to === active.id);
      const newIndex = sortedItems.findIndex((item) => item.to === over.id);
      const reordered = arrayMove(sortedItems.map((i) => i.to), oldIndex, newIndex);
      setMenuOrder(reordered);
    }
  };

  const renderNavItems = () =>
    sortedItems.map((item) => {
      if (item.children) {
        return (
          <SettingsGroup
            key={item.to}
            item={item}
            sidebarCollapsed={sidebarCollapsed}
            settingsExpanded={settingsExpanded}
            toggleSettingsExpanded={toggleSettingsExpanded}
            currentPath={location.pathname}
          />
        );
      }
      return (
        <div key={item.to} className="flex items-center">
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
        </div>
      );
    });

  const renderSortableNavItems = () =>
    sortedItems.map((item) => {
      if (item.children) {
        return (
          <SortableSettingsGroup
            key={item.to}
            item={item}
            settingsExpanded={settingsExpanded}
            toggleSettingsExpanded={toggleSettingsExpanded}
            currentPath={location.pathname}
          />
        );
      }
      return <SortableNavItem key={item.to} item={item} />;
    });

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
        {menuEditMode && !sidebarCollapsed ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortedItems.map((i) => i.to)} strategy={verticalListSortingStrategy}>
              {renderSortableNavItems()}
            </SortableContext>
          </DndContext>
        ) : (
          renderNavItems()
        )}
      </nav>
    </aside>
  );
}

function SortableNavItem({ item }: { item: NavItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.to });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center rounded-lg border border-dashed border-gray-700 ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1.5 ml-1 text-gray-400 hover:text-white cursor-grab active:cursor-grabbing"
        aria-label={`Drag to reorder ${item.label}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <NavLink
        to={item.to}
        end={item.to === '/'}
        className={({ isActive }) =>
          `flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 min-w-0 ${
            isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`
        }
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span className="truncate">{item.label}</span>
      </NavLink>
    </div>
  );
}

function SortableSettingsGroup({
  item,
  settingsExpanded,
  toggleSettingsExpanded,
  currentPath,
}: {
  item: NavItem;
  settingsExpanded: boolean;
  toggleSettingsExpanded: () => void;
  currentPath: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.to });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const children = item.children!;
  const childActive = children.some((child) => currentPath.startsWith(child.to));
  const parentActive = currentPath === item.to;
  const isOpen = settingsExpanded || childActive;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-dashed border-gray-700 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center">
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 ml-1 text-gray-400 hover:text-white cursor-grab active:cursor-grabbing"
          aria-label={`Drag to reorder ${item.label}`}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <NavLink
          to={item.to}
          end
          className={`flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 min-w-0 ${
            parentActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          <span className="truncate">{item.label}</span>
        </NavLink>
        <button
          onClick={toggleSettingsExpanded}
          className="p-1.5 mr-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title={isOpen ? 'Collapse' : 'Expand'}
        >
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
      {isOpen && (
        <div className="ml-8 pl-3 border-l border-gray-700 space-y-0.5 mt-0.5 mb-1">
          {children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <child.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsGroup({
  item,
  sidebarCollapsed,
  settingsExpanded,
  toggleSettingsExpanded,
  currentPath,
}: {
  item: NavItem;
  sidebarCollapsed: boolean;
  settingsExpanded: boolean;
  toggleSettingsExpanded: () => void;
  currentPath: string;
}) {
  const children = item.children!;
  const childActive = children.some((child) => currentPath.startsWith(child.to));
  const parentActive = currentPath === item.to;
  const isOpen = (settingsExpanded || childActive) && !sidebarCollapsed;

  // Collapsed sidebar: just render a simple NavLink
  if (sidebarCollapsed) {
    return (
      <NavLink
        to={item.to}
        end
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive || childActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`
        }
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
      </NavLink>
    );
  }

  return (
    <div>
      <div className="flex items-center">
        <NavLink
          to={item.to}
          end
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 min-w-0 ${
            parentActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          <span className="truncate">{item.label}</span>
        </NavLink>
        <button
          onClick={toggleSettingsExpanded}
          className="p-1.5 mr-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title={isOpen ? 'Collapse' : 'Expand'}
        >
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
      {isOpen && (
        <div className="ml-4 pl-3 border-l border-gray-700 space-y-0.5 mt-0.5 mb-1">
          {children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <child.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
