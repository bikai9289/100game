import * as React from 'react';
import { ScriptOnce } from '@tanstack/react-router';
import { websiteConfig } from '@/config/website';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  systemTheme?: 'light' | 'dark';
};

const initialState: ThemeProviderState = {
  theme: 'light',
  setTheme: () => null,
  resolvedTheme: 'light',
  systemTheme: undefined,
};

const ThemeProviderContext =
  React.createContext<ThemeProviderState>(initialState);

const FORCED_THEME: Extract<Theme, 'light'> = 'light';
const isThemeSwitchEnabled = websiteConfig.ui?.mode?.enableSwitch ?? false;

const themeScript = `(function() {
  try {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.style.colorScheme = 'light';
    localStorage.setItem('theme', 'light');
  } catch (e) {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.style.colorScheme = 'light';
  }
})();`;

/**
 * Single theme provider: SSR-safe, prevents FOUC via inline script, configurable.
 * Default theme from websiteConfig.ui?.mode?.defaultMode when not passed.
 */
export function ThemeProvider({
  children,
  defaultTheme = FORCED_THEME,
  storageKey = 'theme',
  attribute = 'class',
  enableSystem = false,
  disableTransitionOnChange = false,
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (!isThemeSwitchEnabled) {
      return FORCED_THEME;
    }

    // During SSR, always return the default theme to avoid hydration mismatch
    if (typeof window === 'undefined') {
      return defaultTheme;
    }

    // Client-side: try to get theme from localStorage
    try {
      const stored = localStorage.getItem(storageKey) as Theme;
      return stored || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  const [systemTheme, setSystemTheme] = React.useState<
    'light' | 'dark' | undefined
  >(() => {
    if (!isThemeSwitchEnabled || !enableSystem) {
      return FORCED_THEME;
    }

    // During SSR, return undefined
    if (typeof window === 'undefined') {
      return undefined;
    }

    // Client-side: detect system theme
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  const [isMounted, setIsMounted] = React.useState(false);

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  const setTheme = React.useCallback(
    (newTheme: Theme) => {
      const nextTheme = isThemeSwitchEnabled ? newTheme : FORCED_THEME;
      try {
        localStorage.setItem(storageKey, nextTheme);
      } catch {
        // Ignore localStorage errors
      }
      setThemeState(nextTheme);
    },
    [storageKey]
  );

  const applyTheme = React.useCallback(
    (targetTheme: 'light' | 'dark' | undefined) => {
      if (!targetTheme || typeof document === 'undefined') return;

      const root = document.documentElement;

      if (disableTransitionOnChange) {
        const css = document.createElement('style');
        css.appendChild(
          document.createTextNode(
            `*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}`
          )
        );
        document.head.appendChild(css);

        // Force reflow
        (() => window.getComputedStyle(document.body))();

        setTimeout(() => {
          document.head.removeChild(css);
        }, 1);
      }

      if (attribute === 'class') {
        root.classList.remove('light', 'dark');
        root.classList.add(isThemeSwitchEnabled ? targetTheme : FORCED_THEME);
      } else {
        root.setAttribute(
          attribute,
          isThemeSwitchEnabled ? targetTheme : FORCED_THEME
        );
      }
      root.style.colorScheme = FORCED_THEME;
    },
    [attribute, disableTransitionOnChange]
  );

  // Apply theme on mount and when resolvedTheme changes
  React.useEffect(() => {
    if (isMounted) {
      applyTheme(resolvedTheme);
    }
  }, [resolvedTheme, applyTheme, isMounted]);

  // Handle system theme changes
  React.useEffect(() => {
    if (!isThemeSwitchEnabled || !enableSystem || typeof window === 'undefined')
      return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [enableSystem]);

  // Hydration effect - apply theme immediately on client
  React.useEffect(() => {
    setIsMounted(true);

    // Immediately apply the correct theme on hydration
    const currentTheme = !isThemeSwitchEnabled
      ? FORCED_THEME
      : theme === 'system'
        ? systemTheme
        : theme;
    applyTheme(currentTheme);
  }, [theme, systemTheme, applyTheme]);

  const value = React.useMemo(
    () => ({
      theme: isThemeSwitchEnabled ? theme : FORCED_THEME,
      setTheme,
      resolvedTheme: isThemeSwitchEnabled
        ? isMounted && resolvedTheme
          ? resolvedTheme
          : systemTheme || FORCED_THEME
        : FORCED_THEME,
      systemTheme: isThemeSwitchEnabled && isMounted ? systemTheme : undefined,
    }),
    [theme, setTheme, resolvedTheme, systemTheme, isMounted]
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      <ScriptOnce>{themeScript}</ScriptOnce>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
