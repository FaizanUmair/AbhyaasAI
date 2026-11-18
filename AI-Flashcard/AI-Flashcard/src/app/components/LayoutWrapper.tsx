"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { useEffect, useState } from "react";
import { FaRobot, FaTimes, FaGraduationCap } from "react-icons/fa";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;

  const isLanding = pathname === "/";
  const showSidebar = !isLanding;

  return (
    <div className="flex min-h-screen overflow-x-hidden relative bg-slate-50 dark:bg-slate-950">
      {showSidebar && <Sidebar />}
      <main className={`flex-1 transition-all duration-300 ${showSidebar ? "pl-56" : ""}`}>
        {children}
      </main>

      {/* AI Tutor FAB */}
      {showSidebar && (
        <button 
          onClick={() => setShowChatModal(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-brand-600 text-white rounded-full shadow-lg shadow-brand-600/30 flex items-center justify-center hover:bg-brand-700 hover:scale-105 hover:shadow-brand-600/40 transition-all z-40 group"
          title="AI Tutor"
        >
          <FaRobot className="text-base group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={() => setShowChatModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl animate-in fade-in zoom-in duration-200 border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowChatModal(false)}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs"
            >
              <FaTimes />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-xl flex items-center justify-center">
                <FaGraduationCap className="text-lg" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Abhyas AI Tutor</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your personal learning assistant</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              AI Tutor is under development. Stay tuned for personalized 1-on-1 coaching powered by live avatar!
            </p>
            
            <button 
              onClick={() => setShowChatModal(false)} 
              className="w-full bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-sm font-semibold py-2.5 rounded-lg transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
