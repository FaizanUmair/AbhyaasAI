"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { FaSun, FaMoon } from "react-icons/fa";

export default function ThemeToggle({ className = "", variant = "icon" }: { className?: string, variant?: "icon" | "sidebar" }) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    if (variant === "sidebar") {
      return <div className={`w-full h-9 rounded-lg bg-slate-50 dark:bg-slate-800 animate-pulse mb-1 ${className}`} />;
    }
    return <div className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`} />;
  }

  if (variant === "sidebar") {
    return (
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors group mb-0.5 ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
            <FaSun className="absolute w-4 h-4 transition-all scale-100 rotate-0 dark:scale-0 dark:-rotate-90 text-slate-400 group-hover:text-amber-500" />
            <FaMoon className="absolute w-4 h-4 transition-all scale-0 rotate-90 dark:scale-100 dark:rotate-0 text-slate-400 dark:group-hover:text-brand-400" />
          </div>
          <span>Theme</span>
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={`relative flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors outline-none ${className}`}
      aria-label="Toggle Dark Mode"
    >
      <FaSun className="absolute w-4 h-4 transition-all scale-100 rotate-0 dark:scale-0 dark:-rotate-90" />
      <FaMoon className="absolute w-4 h-4 transition-all scale-0 rotate-90 dark:scale-100 dark:rotate-0" />
    </button>
  );
}
