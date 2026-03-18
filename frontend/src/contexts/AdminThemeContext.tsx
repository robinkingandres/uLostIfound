import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type AdminThemeContextValue = {
  isDark: boolean;
  toggleDarkMode: () => void;
  setIsDark: (value: boolean) => void;
  enabled: boolean;
};

const AdminThemeContext = createContext<AdminThemeContextValue>({
  isDark: false,
  toggleDarkMode: () => {},
  setIsDark: () => {},
  enabled: false,
});

const STORAGE_KEY = 'admin_dark_mode';

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === '1') return true;
    if (saved === '0') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, isDark ? '1' : '0');
  }, [isDark]);

  const value = useMemo(
    () => ({
      isDark,
      setIsDark,
      toggleDarkMode: () => setIsDark((prev) => !prev),
      enabled: true,
    }),
    [isDark]
  );

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>;
}

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}
