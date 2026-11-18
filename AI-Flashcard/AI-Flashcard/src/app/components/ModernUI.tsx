"use client";

import React from "react";
import { FaSpinner } from "react-icons/fa";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "glass";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const ModernButton = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className = "",
  disabled,
  ...props
}: ButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed select-none";
  
  const variants = {
    primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-brand-600/25",
    secondary: "bg-accent-500 text-white shadow-sm hover:bg-accent-600 hover:shadow-accent-500/25",
    outline: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 dark:hover:text-brand-400",
    ghost: "bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100",
    danger: "bg-rose-500 text-white shadow-sm hover:bg-rose-600",
    glass: "bg-white/60 backdrop-blur-sm dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? <FaSpinner className="animate-spin text-sm" /> : icon}
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const ModernInput = ({
  label,
  error,
  icon,
  className = "",
  ...props
}: InputProps) => {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors text-sm">
            {icon}
          </div>
        )}
        <input
          className={`w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
            icon ? "pl-9" : ""
          } ${error ? "border-rose-400 focus:ring-rose-400/15" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
};
