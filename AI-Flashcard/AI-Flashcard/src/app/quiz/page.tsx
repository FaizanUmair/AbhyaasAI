"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FaArrowLeft, FaCheck, FaTimes, FaTrophy, FaStar } from "react-icons/fa";
import Confetti from "react-confetti";
import { ModernButton } from "../components/ModernUI";

function QuizContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const collectionId = searchParams.get("collectionId");

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xpEarned, setXpEarned] = useState(0);

  useEffect(() => {
    if (!collectionId) return;

    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const cardsResponse = await fetch(`http://127.0.0.1:8000/api/collections/${collectionId}/flashcards?uid=default_user`);
        if (!cardsResponse.ok) throw new Error("Failed to load cards");
        const cardsData = await cardsResponse.json();
        
        const contextText = cardsData.flashcards.map((c: any) => `${c.question}: ${c.answer}`).join("\n");

        const quizResponse = await fetch("http://127.0.0.1:8000/api/quiz/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: contextText, count: 5 }),
        });

        if (!quizResponse.ok) throw new Error("Failed to generate quiz");
        const quizData = await quizResponse.json();
        setQuestions(quizData.questions);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [collectionId]);

  const handleOptionSelect = (option: string) => {
    if (selectedOption) return;
    setSelectedOption(option);
    if (option === questions[currentIndex].answer) {
      setScore(score + 1);
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
    } else {
      const finalXp = score * 20;
      setXpEarned(finalXp);
      setShowResult(true);

      fetch("http://127.0.0.1:8000/api/quiz/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: "default_user",
          topic: collectionId || "General",
          score: score,
          total: questions.length
        }),
      }).catch(e => console.error("Error saving quiz result:", e));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" style={{ borderWidth: 3 }} />
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium animate-pulse">AI is crafting your quiz...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="card p-8 text-center max-w-sm w-full">
        <p className="text-sm text-rose-500 mb-5">Error: {error}</p>
        <ModernButton onClick={() => router.back()} size="sm">Go Back</ModernButton>
      </div>
    </div>
  );

  if (showResult) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <Confetti recycle={false} numberOfPieces={200} />
      <div className="card p-8 text-center max-w-sm w-full animate-in zoom-in duration-300 shadow-premium">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <FaTrophy className="text-3xl text-amber-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Quiz Complete!</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">You scored {score}/{questions.length}</p>
        
        <div className="bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800 rounded-xl p-4 mb-6 flex items-center justify-center gap-3">
          <FaStar className="text-xl text-brand-500" />
          <div className="text-left">
            <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">XP Earned</p>
            <p className="text-lg font-bold text-brand-700 dark:text-brand-300">+{xpEarned} XP</p>
          </div>
        </div>

        <div className="flex gap-3">
          <ModernButton onClick={() => router.push("/dashboard")} className="flex-1" size="sm">Dashboard</ModernButton>
          <button onClick={() => window.location.reload()} className="flex-1 py-2 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">Retry</button>
        </div>
      </div>
    </div>
  );

  const currentQ = questions[currentIndex];
  const percentage = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
      {/* Header */}
      <header className="max-w-2xl mx-auto flex items-center justify-between mb-8">
        <button onClick={() => router.back()} className="w-9 h-9 card flex items-center justify-center text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-sm">
          <FaArrowLeft />
        </button>
        <div className="flex-1 text-center mx-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span className="text-brand-600 dark:text-brand-400 font-semibold">{percentage}%</span>
          </div>
          <div className="progress-bar max-w-xs mx-auto">
            <div className="progress-fill" style={{ width: `${percentage}%` }} />
          </div>
        </div>
        <div className="w-9" />
      </header>

      <main className="max-w-xl mx-auto space-y-5 animate-in slide-in-from-bottom-4 duration-300">
        {/* Question */}
        <div className="card p-6 text-center">
          <span className="badge badge-primary mb-3 text-[10px]">Question {currentIndex + 1}</span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">{currentQ.question}</h2>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {currentQ.options.map((option: string) => {
            const isSelected = selectedOption === option;
            const isCorrect = option === currentQ.answer;
            const showFeedback = selectedOption !== null;

            let styles = "w-full p-3.5 rounded-xl border-2 text-left text-sm font-medium transition-all duration-200 ";
            if (!showFeedback) {
              styles += "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50/50 dark:hover:bg-brand-900/20 cursor-pointer";
            } else {
              if (isSelected && isCorrect) styles += "bg-accent-50 dark:bg-accent-900/30 border-accent-400 text-accent-800 dark:text-accent-300";
              else if (isSelected && !isCorrect) styles += "bg-rose-50 dark:bg-rose-900/30 border-rose-400 text-rose-800 dark:text-rose-300";
              else if (isCorrect) styles += "bg-accent-50/50 dark:bg-accent-900/20 border-accent-200 dark:border-accent-800 text-accent-700 dark:text-accent-400 opacity-70";
              else styles += "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-40";
            }

            return (
              <button 
                key={option} 
                onClick={() => handleOptionSelect(option)}
                disabled={!!showFeedback}
                className={styles}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{option}</span>
                  {showFeedback && isCorrect && <FaCheck className="text-accent-500 shrink-0 text-sm" />}
                  {showFeedback && isSelected && !isCorrect && <FaTimes className="text-rose-500 shrink-0 text-sm" />}
                </div>
              </button>
            );
          })}
        </div>

        {selectedOption && (
          <div className="animate-in fade-in duration-300 space-y-4">
            {currentQ.explanation && (
              <div className="p-4 bg-brand-50/50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <strong className="text-brand-700 dark:text-brand-300">Explanation: </strong>{currentQ.explanation}
              </div>
            )}
            <ModernButton onClick={handleNext} className="w-full">
              {currentIndex === questions.length - 1 ? "Finish Quiz" : "Next Question →"}
            </ModernButton>
          </div>
        )}
      </main>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <QuizContent />
    </Suspense>
  );
}
