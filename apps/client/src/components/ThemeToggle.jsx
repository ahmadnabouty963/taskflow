import { useLayoutEffect, useState } from "react";

const THEME_STORAGE_KEY = "ordanly.theme.v1";

function readInitialTheme() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }
  } catch {
    // Storage can be unavailable in private browser modes.
  }

  return "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(readInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The visual theme still works when storage is unavailable.
    }
  }, [theme]);

  const nextTheme = theme === "light" ? "dark" : "light";
  const accessibleLabel = `Switch to ${nextTheme} mode`;

  return (
    <button
      aria-label={accessibleLabel}
      className="theme-toggle"
      onClick={() => {
        setTheme((currentTheme) =>
          currentTheme === "light" ? "dark" : "light",
        );
      }}
      title={accessibleLabel}
      type="button"
    >
      {theme === "light" ? (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M20.2 15.2A8.4 8.4 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}

      <span>{theme === "light" ? "Dark" : "Light"}</span>
    </button>
  );
}
