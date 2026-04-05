"use client";

import { useEffect, useState, useTransition } from "react";

import { setThemeCookie } from "@/app/actions/theme";

type Theme = "light" | "dark";

const STORAGE_KEY = "notes-theme";

const getPreferredTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "light";
  }

  const rootTheme = document.documentElement.dataset.theme;
  if (rootTheme === "light" || rootTheme === "dark") {
    return rootTheme;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
};

const persistThemeLocally = (theme: Theme) => {
  window.localStorage.setItem(STORAGE_KEY, theme);
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [, startTransition] = useTransition();

  useEffect(() => {
    const nextTheme = getPreferredTheme();
    setTheme(nextTheme);
    applyTheme(nextTheme);
    persistThemeLocally(nextTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    persistThemeLocally(nextTheme);

    startTransition(() => {
      void setThemeCookie(nextTheme);
    });
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-200/70 dark:border-zinc-700 dark:hover:bg-zinc-800"
      aria-label="Toggle light or dark theme"
    >
      <span>Theme</span>
      <span>{theme === "light" ? "Light" : "Dark"}</span>
    </button>
  );
}
