"use client";

import { useState } from "react";
import Typewriter from "typewriter-effect";
import { FaGraduationCap, FaMagic, FaBrain, FaMobileAlt, FaArrowRight, FaBolt } from "react-icons/fa";
import ThemeToggle from "./components/ThemeToggle";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (typeof window !== "undefined") {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    }
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-brand-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-brand-950/20 flex flex-col items-center justify-center px-4 sm:px-8 transition-colors"
      onMouseMove={handleMouseMove}
    >
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Subtle Background Blobs */}
      <div 
        className="absolute top-[-8%] left-[-5%] w-[35%] h-[35%] bg-brand-200/20 dark:bg-brand-600/10 rounded-full blur-[80px] pointer-events-none" 
        style={{ transform: `translate(${mousePos.x * -0.5}px, ${mousePos.y * -0.5}px)` }}
      />
      <div 
        className="absolute bottom-[-8%] right-[-5%] w-[35%] h-[35%] bg-accent-200/15 dark:bg-accent-700/10 rounded-full blur-[80px] pointer-events-none" 
        style={{ transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)` }}
      />

      <div className="w-full max-w-4xl z-10">
        <div className="text-center mb-10 space-y-5">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 dark:bg-brand-900/30 rounded-full border border-brand-100 dark:border-brand-800 mb-2">
            <FaBolt className="text-brand-500 text-xs" />
            <span className="text-xs font-semibold text-brand-700 dark:text-brand-300 uppercase tracking-wider">AI-Powered Learning</span>
          </div>
          
          {/* Hero title */}
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            Elevate Your Study with <br/>
            <span className="text-gradient">
              <Typewriter
                options={{
                  strings: [
                    "ABHYAS AI ⚡",
                    "Smart Cards 🧠",
                    "Instant Learning ✨",
                  ],
                  autoStart: true,
                  loop: true,
                  delay: 70,
                }}
              />
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Turn any document, image, or raw text into structured interactive flashcards in seconds using advanced AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="group px-6 py-2.5 bg-brand-600 text-white rounded-lg font-semibold text-sm shadow-sm shadow-brand-600/25 hover:bg-brand-700 hover:-translate-y-0.5 hover:shadow-brand-600/35 transition-all flex items-center gap-2 active:scale-95"
            >
              Get Started
              <FaArrowRight className="text-xs group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-sm hover:border-brand-300 hover:text-brand-600 dark:hover:border-brand-600 dark:hover:text-brand-400 transition-all">
              Watch Demo
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-2">
          {[
            { icon: FaMagic, title: "AI Magic", desc: "Instant generation from any source", color: "text-brand-600 bg-brand-50 dark:bg-brand-900/30" },
            { icon: FaBrain, title: "Smart Recall", desc: "Spaced repetition learning", color: "text-accent-600 bg-accent-50 dark:bg-accent-900/30" },
            { icon: FaMobileAlt, title: "Multi-Device", desc: "Study anywhere, anytime", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30" },
            { icon: FaBolt, title: "OCR Power", desc: "Convert images to text", color: "text-rose-600 bg-rose-50 dark:bg-rose-900/30" }
          ].map((feature, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 hover:border-brand-200 dark:hover:border-brand-700 hover:shadow-card-hover group transition-all duration-200">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${feature.color}`}>
                <feature.icon className="text-sm" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">{feature.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-8 flex items-center justify-center gap-8">
          {[
            { label: "Students", value: "10K+" },
            { label: "Flashcards Created", value: "500K+" },
            { label: "Avg. Score Boost", value: "+32%" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-bold text-brand-600 dark:text-brand-400">{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="absolute bottom-5 text-slate-400 font-medium text-xs">
        © 2026 ABHYAS AI — Built for students who want to excel.
      </footer>
    </div>
  );
}
