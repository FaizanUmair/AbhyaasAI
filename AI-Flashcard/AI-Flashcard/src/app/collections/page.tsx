"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaBookOpen, FaPlay, FaTrash, FaArrowLeft, FaPlus, FaLayerGroup } from "react-icons/fa";
import { ModernButton } from "../components/ModernUI";
import Flashcard from "../components/Flashcard";

export default function CollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<any | null>(null);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [view, setView] = useState<"list" | "study">("list");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/collections?uid=default_user`);
        if (response.ok) {
          const data = await response.json();
          setCollections(data.collections);
        }
      } catch (error) {
        console.error("Error fetching collections:", error);
      }
    };
    fetchCollections();
  }, []);

  const studyCollection = async (col: any) => {
    setSelectedCollection(col);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/collections/${col.id}/flashcards?uid=default_user`);
      if (!response.ok) throw new Error("Failed to fetch flashcards");
      const data = await response.json();
      
      if (data.flashcards && data.flashcards.length > 0) {
        const todayStr = new Date().toISOString();
        const dueCards = data.flashcards.filter((c: any) => !c.next_review_date || c.next_review_date <= todayStr);
        if (dueCards.length > 0) {
          setFlashcards(dueCards);
          setView("study");
          setCurrentIndex(0);
        } else {
          alert("You are all caught up! No cards are due for review today.");
        }
      } else {
        alert("No flashcards found in this collection.");
      }
    } catch (error) {
      console.error("Error fetching cards:", error);
      alert("Could not load flashcards via backend.");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen">
      {view === "list" ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Collections</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage and study your saved flashcard sets.</p>
            </div>
            <ModernButton icon={<FaPlus className="text-xs" />} size="sm" onClick={() => router.push("/flashcard")}>
              Generate New
            </ModernButton>
          </header>

          {collections.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((col) => (
                <div key={col.id} className="card-hover p-4 group relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-500 flex items-center justify-center transition-all group-hover:bg-brand-500 group-hover:text-white">
                      <FaLayerGroup className="text-sm" />
                    </div>
                    <button
                      className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete collection"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                  
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5 truncate pr-2">{col.name || "Untitled"}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                    {col.cardCount || "0"} flashcards
                  </p>

                  <ModernButton 
                    size="sm"
                    className="w-full"
                    onClick={() => studyCollection(col)}
                    icon={<FaPlay className="text-[10px]" />}
                  >
                    Study Now
                  </ModernButton>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FaBookOpen className="text-2xl text-slate-200 dark:text-slate-700" />
              </div>
              <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">No collections yet</h2>
              <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">Start by generating some flashcards from your study materials.</p>
              <ModernButton onClick={() => router.push("/flashcard")} size="sm">
                Create My First Collection
              </ModernButton>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
          <header className="flex items-center justify-between">
            <button 
              onClick={() => setView("list")}
              className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              <FaArrowLeft className="text-xs" /> Back to Collections
            </button>
            <div className="text-center">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedCollection?.name}</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Study Session</p>
            </div>
            <div className="w-28" />
          </header>

          <div className="flex flex-col items-center space-y-6">
            {/* Progress */}
            <div className="w-full max-w-md">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                <span>Card {currentIndex + 1} of {flashcards.length}</span>
                <span>{Math.round(((currentIndex + 1) / flashcards.length) * 100)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }} />
              </div>
            </div>

            <Flashcard 
              question={flashcards[currentIndex].question} 
              answer={flashcards[currentIndex].answer}
              onReviewCard={async (quality) => {
                const card = flashcards[currentIndex];
                try {
                  const response = await fetch("http://127.0.0.1:8000/api/flashcards/review", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      uid: "default_user",
                      collection_id: selectedCollection.id,
                      set_id: card.set_id,
                      card_id: card.id,
                      quality
                    })
                  });
                  if (response.ok) {
                    if (currentIndex < flashcards.length - 1) {
                      setCurrentIndex(p => p + 1);
                    } else {
                      alert("Session complete! You finished all due cards.");
                      setView("list");
                    }
                  }
                } catch (error) {
                  console.error("Failed to review card", error);
                }
              }} 
            />

            <div className="flex items-center gap-6">
              <button 
                onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
                disabled={currentIndex === 0}
                className="w-10 h-10 card flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-30 transition-all active:scale-90 text-sm"
              >
                <FaArrowLeft />
              </button>
              
              <div className="text-center">
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{currentIndex + 1}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">of {flashcards.length}</p>
              </div>

              <button 
                onClick={() => setCurrentIndex(p => Math.min(flashcards.length - 1, p + 1))}
                disabled={currentIndex === flashcards.length - 1}
                className="w-10 h-10 card flex items-center justify-center text-brand-500 hover:text-brand-700 dark:hover:text-brand-400 disabled:opacity-30 transition-all active:scale-90 text-sm"
              >
                <FaPlay />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
