import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyTheme(theme: Theme) {
  const effective = getEffectiveTheme(theme);
  document.documentElement.classList.toggle('dark', effective === 'dark');
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('theme') as Theme | null;
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function getInitialSettingsExpanded(): boolean {
  const stored = localStorage.getItem('settingsExpanded');
  if (stored === 'false') return false;
  return true; // default open
}

function getInitialMenuOrder(): string[] {
  try {
    const stored = localStorage.getItem('menuOrder');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

interface UiState {
  sidebarCollapsed: boolean;
  theme: Theme;
  menuOrder: string[];
  menuEditMode: boolean;
  settingsExpanded: boolean;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setMenuOrder: (order: string[]) => void;
  toggleMenuEditMode: () => void;
  toggleSettingsExpanded: () => void;
}

export const useUiStore = create<UiState>((set, get) => {
  // Listen for system preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (get().theme === 'system') {
      applyTheme('system');
    }
  });

  const initialTheme = getInitialTheme();
  applyTheme(initialTheme);

  return {
    sidebarCollapsed: false,
    theme: initialTheme,
    menuOrder: getInitialMenuOrder(),
    menuEditMode: false,
    settingsExpanded: getInitialSettingsExpanded(),
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    setTheme: (theme: Theme) => {
      localStorage.setItem('theme', theme);
      applyTheme(theme);
      set({ theme });
    },
    setMenuOrder: (order: string[]) => {
      localStorage.setItem('menuOrder', JSON.stringify(order));
      set({ menuOrder: order });
    },
    toggleMenuEditMode: () => set((s) => ({ menuEditMode: !s.menuEditMode })),
    toggleSettingsExpanded: () => set((s) => {
      const next = !s.settingsExpanded;
      localStorage.setItem('settingsExpanded', String(next));
      return { settingsExpanded: next };
    }),
  };
});
