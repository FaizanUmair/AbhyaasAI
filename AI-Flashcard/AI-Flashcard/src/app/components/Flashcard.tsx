"use client";

import { useState } from "react";
import { FaVolumeUp, FaLightbulb } from "react-icons/fa";

interface FlashcardProps {
  question: string;
  answer: string;
  onSpeak?: (text: string) => void;
  onReviewCard?: (quality: number) => void;
}

export default function Flashcard({ question, answer, onSpeak, onReviewCard }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="group perspective-1000 w-full max-w-md h-72 cursor-pointer select-none"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div 
        className={`relative w-full h-full text-center transition-all duration-500 preserve-3d rounded-2xl ${
          isFlipped ? "rotate-y-180" : ""
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        {/* Front Face — Question */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center shadow-card">
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 dark:bg-brand-900/30 rounded-full border border-brand-100 dark:border-brand-800">
            <FaLightbulb className="text-brand-500 text-[10px]" />
            <span className="text-[9px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider leading-none">Question</span>
          </div>
          
          <h3 className="text-base font-semibold text-slate-800 dark:text-white leading-snug px-4">
            {question}
          </h3>

          <div className="mt-5 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSpeak?.(question);
              }}
              className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-500 transition-all border border-slate-100 dark:border-slate-700 text-xs relative z-10"
              title="Speak Question"
            >
              <FaVolumeUp />
            </button>
          </div>
          
          <p className="absolute bottom-4 text-slate-400 dark:text-slate-500 text-xs font-medium animate-pulse">
            Tap to reveal answer
          </p>
        </div>

        {/* Back Face — Answer */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-brand-600 to-brand-700 dark:from-brand-700 dark:to-brand-900 rounded-2xl p-6 flex flex-col items-center justify-center rotate-y-180 shadow-card">
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
            <span className="text-[9px] font-semibold text-white/90 uppercase tracking-wider leading-none">Answer</span>
          </div>

          <p className="text-sm text-white/95 leading-relaxed font-medium px-4 text-center">
            {answer}
          </p>

          <div className="mt-5 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSpeak?.(answer);
              }}
              className="p-2 bg-white/15 text-white/80 rounded-lg hover:bg-white/25 hover:text-white transition-all text-xs relative z-10"
              title="Speak Answer"
            >
              <FaVolumeUp />
            </button>
          </div>
          
          {onReviewCard && (
            <div className="mt-4 flex gap-2 z-20">
              {[
                { label: "Again", q: 0, cls: "bg-rose-500/80 hover:bg-rose-500 text-white" },
                { label: "Hard", q: 1, cls: "bg-amber-500/80 hover:bg-amber-500 text-white" },
                { label: "Good", q: 2, cls: "bg-accent-500/80 hover:bg-accent-500 text-white" },
                { label: "Easy", q: 3, cls: "bg-white/20 hover:bg-white/30 text-white" },
              ].map(({ label, q, cls }) => (
                <button
                  key={label}
                  onClick={(e) => { e.stopPropagation(); onReviewCard(q); setIsFlipped(false); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${cls}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <p className="absolute bottom-4 text-white/50 text-xs font-medium">
            Tap to go back
          </p>
        </div>
      </div>
    </div>
  );
}
