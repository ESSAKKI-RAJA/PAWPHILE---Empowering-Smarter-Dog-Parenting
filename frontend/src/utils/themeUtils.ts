/**
 * themeUtils.ts
 * Manages PAWPHILE app-wide light / dark / system theme.
 * Theme class is applied to document.documentElement so Tailwind `dark:` variants work globally.
 */

export type ThemeOption = 'light' | 'dark' | 'system';

const THEME_KEY = 'pawphile_theme';

/** Read persisted theme preference */
export function loadTheme(): ThemeOption {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* no-op */
  }
  return 'system';
}

/** Save and apply theme. Call on every toggle. */
export function applyTheme(theme: ThemeOption): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* no-op */
  }
  _applyToDOM(theme);
}

/** Apply theme to DOM (called on initial load too) */
function _applyToDOM(theme: ThemeOption): void {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (theme === 'dark' || (theme === 'system' && prefersDark)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/** Call this once at app startup to restore saved preference */
export function initTheme(): void {
  const theme = loadTheme();
  _applyToDOM(theme);

  // Listen for system preference changes when theme === 'system'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (loadTheme() === 'system') _applyToDOM('system');
  });
}
