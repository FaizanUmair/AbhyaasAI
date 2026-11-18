"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  FaThLarge,
  FaMagic, 
  FaBookOpen, 
  FaChartBar,
  FaGraduationCap,
  FaRobot,
  FaCog,
} from "react-icons/fa";

import ThemeToggle from "./ThemeToggle";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: FaThLarge },
  { name: "Generate", href: "/flashcard", icon: FaMagic },
  { name: "Collections", href: "/collections", icon: FaBookOpen },
  { name: "Visualizer", href: "/visualizer", icon: FaChartBar },
  { name: "My Learning", href: "/my-learning", icon: FaGraduationCap },
  { name: "AI Tutor", href: "/ai-tutor", icon: FaRobot },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-white dark:bg-slate-900 flex flex-col border-r border-slate-100 dark:border-slate-800 z-50 transition-colors duration-300">
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shadow-sm shadow-brand-600/30 shrink-0">
          <FaGraduationCap className="text-white text-xs" />
        </div>
        <div className="leading-none">
          <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight block">
            ABHYAS AI
          </span>
          <span className="text-[9px] text-slate-400 font-medium tracking-widest uppercase">
            Smart Learning
          </span>
        </div>
      </div>

      {/* Nav label */}
      <div className="px-4 pt-4 pb-1">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Navigation</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 group ${
                isActive 
                  ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-semibold border-l-2 border-brand-600 pl-[10px]" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Icon className={`text-sm shrink-0 ${isActive ? "text-brand-600 dark:text-brand-400" : "text-slate-400 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-2 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
        <ThemeToggle variant="sidebar" />
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors group"
        >
          <FaCog className="text-sm text-slate-400 group-hover:text-brand-500 dark:group-hover:text-brand-400 shrink-0" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
