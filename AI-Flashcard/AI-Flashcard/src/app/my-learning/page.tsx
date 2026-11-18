"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaGraduationCap, FaSync, FaDownload, FaCheck, FaTimes, FaLightbulb, FaLock, FaChevronDown, FaChevronUp, FaBookOpen } from "react-icons/fa";
import toast from "react-hot-toast";

export default function MyLearning() {
  const router = useRouter();
  
  // Roadmap State
  const [goal, setGoal] = useState("");
  const [roadmap, setRoadmap] = useState<any[]>([]);
  const [roadmapLoading, setRoadmapLoading] = useState(false);

  // Quick Notes State
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [notes, setNotes] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);

  // Archive System
  interface SavedNote {
    id: string;
    subject: string;
    level: string;
    content: string;
    timestamp: any;
  }
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [viewingArchive, setViewingArchive] = useState<SavedNote | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  // Daily Tasks State
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Library State
  const [searchQuery, setSearchQuery] = useState("");

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizScore, setQuizScore] = useState<{correct: number, total: number} | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [performance, setPerformance] = useState({ averageScore: 0, completedCount: 0 });
  const [activeTaskForQuiz, setActiveTaskForQuiz] = useState<any | null>(null);
  const [roadmapTaskIndex, setRoadmapTaskIndex] = useState(0);
  const [showRoadmapDetail, setShowRoadmapDetail] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  const fetchPerformance = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/learning/performance/default_user`);
      if (res.ok) {
        const data = await res.json();
        setPerformance(data);
      }
    } catch (e) { console.error("Performance fetch failed", e); }
  };

  const loadDailyMissions = async (activeGoal?: string, activeRoadmap?: any[], weekIndex?: number) => {
    setTasksLoading(true);
    const currentRoadmap = activeRoadmap || roadmap;
    const currentWeekIdx = weekIndex ?? roadmapTaskIndex;

    try {
      if (currentRoadmap && currentRoadmap.length > 0) {
        const currentWeek = currentRoadmap[Math.min(currentWeekIdx, currentRoadmap.length - 1)];
        const roadmapTasks = currentWeek.milestones.map((milestone: string, i: number) => ({
          id: `roadmap-${currentWeekIdx}-${i}`,
          task: milestone,
          completed: false,
          score: 0,
          source: 'roadmap',
          week: currentWeek.week,
          focus: currentWeek.focus,
        }));

        try {
          const savedRes = await fetch(`http://127.0.0.1:8000/api/learning/missions/default_user`);
          if (savedRes.ok) {
            const savedData = await savedRes.json();
            const savedMap = new Map((savedData.missions || []).map((m: any) => [m.task, m]));
            const merged = roadmapTasks.map((t: any) => {
              const saved = savedMap.get(t.task) as any;
              return saved ? { ...t, completed: saved.completed, score: saved.score, id: saved.id } : t;
            });
            setTasks(merged);
          } else {
            setTasks(roadmapTasks);
          }
        } catch {
          setTasks(roadmapTasks);
        }
      } else {
        const existingRes = await fetch(`http://127.0.0.1:8000/api/learning/missions/default_user`);
        const missionData = await existingRes.json();

        if (existingRes.ok && missionData.missions.length > 0) {
          setTasks(missionData.missions);
        } else {
          const genRes = await fetch("http://127.0.0.1:8000/api/learning/daily-mission", {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ uid: "default_user", topic: activeGoal || goal || null, roadmap: null })
          });
          if (genRes.ok) {
            const genData = await genRes.json();
            await fetch("http://127.0.0.1:8000/api/learning/missions/sync", {
              method: "POST", headers: {"Content-Type": "application/json"},
              body: JSON.stringify({ uid: "default_user", tasks: genData.tasks })
            });
            const finalRes = await fetch(`http://127.0.0.1:8000/api/learning/missions/default_user`);
            const finalData = await finalRes.json();
            setTasks(finalData.missions || []);
          }
        }
      }
      fetchPerformance();
    } catch {
      toast.error("Failed to load daily tasks.");
    }
    setTasksLoading(false);
  };

  useEffect(() => {
    loadDailyMissions();
    
    const fetchArchivedNotes = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/learning/notes/default_user`);
        if (res.ok) {
          const data = await res.json();
          setSavedNotes(data.notes || []);
        }
      } catch (error) {
        console.error("Failed to fetch notes:", error);
      }
    };
    fetchArchivedNotes();

    const fetchActiveRoadmap = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/learning/active-roadmap/default_user`);
        if (res.ok) {
          const data = await res.json();
          if (data.roadmap && data.roadmap.length > 0) {
            setRoadmap(data.roadmap);
            setGoal(data.goal);
            const savedWeekIdx = data.week_index ?? 0;
            setRoadmapTaskIndex(savedWeekIdx);
            loadDailyMissions(data.goal, data.roadmap, savedWeekIdx);
          }
        }
      } catch (error) {
        console.error("Failed to fetch roadmap:", error);
      }
    };
    fetchActiveRoadmap();
  }, []);

  const generateRoadmap = async () => {
    if (!goal.trim()) return;
    setRoadmapLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/learning/roadmap", {
        method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ goal, uid: "default_user" })
      });
      const data = await res.json();
      if (res.ok && data.roadmap) {
        setRoadmap(data.roadmap);
        setRoadmapTaskIndex(0);
        loadDailyMissions(goal, data.roadmap, 0);
        toast.success("Roadmap generated!");
      } else {
        toast.error("Failed to generate roadmap.");
      }
    } catch {
      toast.error("Roadmap generation failed.");
    }
    setRoadmapLoading(false);
  };

  const handleSearch = (platform: 'youtube' | 'mslearn', customQuery?: string) => {
    const activeQuery = customQuery || searchQuery;
    if (!activeQuery.trim()) return;
    if (platform === 'youtube') {
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(activeQuery)}`, '_blank');
    } else {
      window.open(`https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(activeQuery)}`, '_blank');
    }
  };

  const startRoadmapQuiz = async (step: any, idx: number) => {
    setQuizLoading(true);
    setQuizQuestions([]);
    setCurrentQuestionIdx(0);
    setQuizScore(null);
    setCorrectAnswers(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/learning/roadmap/quiz", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ uid: "default_user", week_index: idx, focus: step.focus, milestones: step.milestones })
      });
      if (res.ok) {
        const data = await res.json();
        setQuizQuestions(data.questions);
      } else {
        toast.error("Failed to generate quiz.");
      }
    } catch {
      toast.error("Quiz generation failed.");
    }
    setQuizLoading(false);
  };

  const checkAnswer = (option: string) => {
    if (selectedAnswer || quizScore) return;
    setSelectedAnswer(option);
    setShowExplanation(true);
    
    const current = quizQuestions[currentQuestionIdx];
    if (option === current.answer) {
      setCorrectAnswers(prev => prev + 1);
      toast.success("Correct!", { icon: '🎯' });
    } else {
      toast.error("Incorrect", { icon: '❌' });
    }
  };

  const nextQuestion = async () => {
    const isLast = currentQuestionIdx === quizQuestions.length - 1;
    if (isLast) {
      const finalScore = Math.round((correctAnswers / quizQuestions.length) * 100);
      
      if (activeTaskForQuiz) {
        try {
          await fetch("http://127.0.0.1:8000/api/learning/missions/complete", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ 
              uid: "default_user", 
              task_id: activeTaskForQuiz.id, 
              task_text: activeTaskForQuiz.task,
              score: finalScore 
            })
          });
          toast.success("Task Synchronized!");
          loadDailyMissions();
        } catch (e) { console.error("Sync failed", e); }
      }

      setQuizScore({ correct: correctAnswers, total: quizQuestions.length });
      toast.success("Checkup Complete!");
      setActiveTaskForQuiz(null);
    } else {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const startTaskTest = async (task: any) => {
    setActiveTaskForQuiz(task);
    setQuizLoading(true);
    setQuizQuestions([]);
    setCurrentQuestionIdx(0);
    setQuizScore(null);
    setCorrectAnswers(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/learning/roadmap/quiz", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ uid: "default_user", week_index: 0, focus: task.task, milestones: ["Immediate synthesis of daily task"] })
      });
      if (res.ok) {
        const data = await res.json();
        setQuizQuestions(data.questions);
      } else {
        toast.error("Failed to generate mission test.");
      }
    } catch {
      toast.error("Mission test failed.");
    }
    setQuizLoading(false);
  };

  const completedTasks = tasks.filter((t: any) => t.completed);
  const pendingTasks = tasks.filter((t: any) => !t.completed);
  const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
  const avgTaskScore = completedTasks.length > 0 ? completedTasks.reduce((s: number, t: any) => s + (t.score || 0), 0) / completedTasks.length : 0;
  const cognitiveScore = tasks.length > 0
    ? Math.round(completionRate * 0.6 + avgTaskScore * 0.4)
    : performance.averageScore;

  return (
    <>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-primary text-[9px]">Curriculum & Mastery</span>
              {roadmap.length > 0 && (
                <span className="badge badge-success text-[9px]">
                  Week {roadmap[Math.min(roadmapTaskIndex, roadmap.length - 1)]?.week} Active
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Structured Learning</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Track daily milestones and progress through your academic roadmap.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => loadDailyMissions(goal, roadmap)} 
              disabled={tasksLoading}
              className="btn btn-outline text-xs px-3 py-1.5"
            >
              <FaSync className={`text-xs ${tasksLoading ? "animate-spin" : ""}`} />
              Sync
            </button>
            <button 
              onClick={() => window.print()} 
              className="btn btn-primary text-xs px-3 py-1.5"
            >
              <FaDownload className="text-xs" />
              Report
            </button>
          </div>
        </header>

        {/* Top Grid: Today's Tasks & Cognitive Mastery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Daily Tasks / Missions */}
          <div className="lg:col-span-8 card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center text-sm">
                    <FaGraduationCap />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Today&apos;s Milestones</h2>
                    {roadmap.length > 0 && (
                      <p className="text-[10px] text-slate-400">
                        Week {roadmap[Math.min(roadmapTaskIndex, roadmap.length - 1)]?.week} Focus: {roadmap[Math.min(roadmapTaskIndex, roadmap.length - 1)]?.focus}
                      </p>
                    )}
                  </div>
                </div>

                {tasks.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="badge badge-success text-[10px]">
                      {completedTasks.length} Done
                    </span>
                    {pendingTasks.length > 0 && (
                      <span className="badge badge-warning text-[10px]">
                        {pendingTasks.length} Pending
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {tasks.length > 0 && !tasksLoading && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-1">
                    <span>{completedTasks.length} of {tasks.length} complete</span>
                    <span className="font-semibold text-brand-600 dark:text-brand-400">{Math.round(completionRate)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="h-full bg-accent-500 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
                  </div>
                </div>
              )}

              {/* Tasks List */}
              {tasksLoading ? (
                <div className="space-y-2 py-2">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-11 skeleton" />)}
                </div>
              ) : tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map((t: any, i: number) => (
                    <div 
                      key={t.id || i} 
                      className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                        t.completed 
                          ? "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800" 
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                          t.completed ? "bg-accent-500 text-white" : "border border-slate-300 dark:border-slate-600 text-transparent"
                        }`}>
                          <FaCheck />
                        </div>
                        <span className={`text-xs font-medium truncate ${t.completed ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>
                          {t.task}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {!t.completed ? (
                          <button
                            onClick={() => startTaskTest(t)}
                            className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-semibold rounded-md transition-all active:scale-95"
                          >
                            Test & Check
                          </button>
                        ) : (
                          <span className="badge badge-success text-[10px]">
                            {t.score}% Mastery
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400">
                  <p className="text-xs">No active daily tasks. Set a learning trajectory below to populate your roadmap.</p>
                </div>
              )}
            </div>

            {/* Week pagination */}
            {roadmap.length > 1 && (
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  disabled={roadmapTaskIndex === 0}
                  onClick={() => {
                    const newIdx = roadmapTaskIndex - 1;
                    setRoadmapTaskIndex(newIdx);
                    loadDailyMissions(goal, roadmap, newIdx);
                  }}
                  className="text-slate-500 hover:text-brand-600 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Previous Week
                </button>
                <span className="text-slate-400 font-medium">
                  Week {roadmapTaskIndex + 1} of {roadmap.length}
                </span>
                <button
                  disabled={roadmapTaskIndex >= roadmap.length - 1}
                  onClick={() => {
                    const newIdx = roadmapTaskIndex + 1;
                    setRoadmapTaskIndex(newIdx);
                    loadDailyMissions(goal, roadmap, newIdx);
                  }}
                  className="text-slate-500 hover:text-brand-600 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next Week →
                </button>
              </div>
            )}
          </div>

          {/* Cognitive Mastery Card */}
          <div className="lg:col-span-4 card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Cognitive Mastery</h3>
                <span className={`text-sm font-bold ${cognitiveScore >= 80 ? 'text-accent-600' : cognitiveScore >= 50 ? 'text-brand-600' : 'text-amber-500'}`}>
                  {cognitiveScore}%
                </span>
              </div>

              {/* Circular gauge */}
              <div className="flex items-center gap-4 mb-5">
                <div className="relative w-16 h-16 shrink-0">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" className="dark:stroke-slate-700" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={cognitiveScore >= 80 ? '#10b981' : cognitiveScore >= 50 ? '#6366f1' : '#f59e0b'}
                      strokeWidth="3"
                      strokeDasharray={`${cognitiveScore} ${100 - cognitiveScore}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800 dark:text-white">
                    {cognitiveScore}%
                  </span>
                </div>

                <div className="flex-1 space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>Task Completion</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{Math.round(completionRate)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="h-full bg-accent-500 rounded-full" style={{ width: `${completionRate}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>Avg Score</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{Math.round(avgTaskScore)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${avgTaskScore}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Milestones Completed</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{completedTasks.length}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Remaining in Week</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{pendingTasks.length}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full mt-4 py-2 bg-slate-900 dark:bg-brand-600 hover:bg-slate-800 dark:hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-all active:scale-95"
            >
              Academic Dashboard →
            </button>
          </div>
        </div>

        {/* Trajectory Generator Form */}
        <section className="card p-5">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FaBookOpen className="text-brand-500" />
              Architect Learning Trajectory
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Specify your syllabus or learning goal, and the AI will construct a milestone path.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              className="input flex-1" 
              placeholder="e.g. Master Organic Chemistry nomenclature in 3 weeks" 
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateRoadmap()}
            />
            <button 
              onClick={generateRoadmap}
              disabled={roadmapLoading || !goal.trim()}
              className="btn btn-primary text-xs shrink-0"
            >
              {roadmapLoading ? "Mapping..." : "Generate Roadmap"}
            </button>
          </div>
        </section>

        {/* Roadmap Timeline */}
        {roadmap.length > 0 && (
          <section className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Timeline Progression ({roadmap.length} Weeks)
                </span>
              </div>
              <button
                onClick={() => setShowRoadmapDetail(p => !p)}
                className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
              >
                {showRoadmapDetail ? <>Hide Details <FaChevronUp className="text-[10px]" /></> : <>Inspect All Milestones <FaChevronDown className="text-[10px]" /></>}
              </button>
            </div>

            {/* Stepper Rail */}
            <div className="p-4 flex items-center gap-1 overflow-x-auto">
              {roadmap.map((step, idx) => {
                const isPast = idx < roadmapTaskIndex;
                const isCurrent = idx === roadmapTaskIndex;
                return (
                  <div key={idx} className="flex items-center flex-1 min-w-[120px]">
                    <button
                      onClick={() => { setRoadmapTaskIndex(idx); loadDailyMissions(goal, roadmap, idx); }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all w-full text-left ${
                        isCurrent
                          ? "bg-brand-50 dark:bg-brand-900/40 border border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-300"
                          : isPast
                          ? "bg-accent-50/50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-400"
                          : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isPast ? "bg-accent-500 text-white" : isCurrent ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}>
                        {isPast ? <FaCheck className="text-[8px]" /> : idx + 1}
                      </div>
                      <div className="truncate">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">W{step.week}</span>
                        <span className="block truncate font-semibold">{step.focus}</span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Collapsible Details */}
            {showRoadmapDetail && (
              <div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
                {roadmap.map((step, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Week {step.week}</span>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">{step.focus}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {idx < roadmapTaskIndex ? (
                          <span className="badge badge-success text-[10px]">Completed</span>
                        ) : idx === roadmapTaskIndex ? (
                          <span className="badge badge-primary text-[10px]">Active</span>
                        ) : (
                          <span className="badge text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center gap-1">
                            <FaLock className="text-[8px]" /> Upcoming
                          </span>
                        )}
                        <button
                          onClick={() => startRoadmapQuiz(step, idx)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-md text-slate-700 dark:text-slate-200 hover:border-brand-400 hover:text-brand-600 transition-colors"
                        >
                          Check Knowledge
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Milestones</p>
                        <ul className="space-y-1">
                          {step.milestones.map((m: string, mi: number) => (
                            <li key={mi} className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                              <span className="text-accent-500 font-bold shrink-0 mt-0.5">•</span>
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {step.resources && step.resources.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Suggested Resources</p>
                          <div className="space-y-1">
                            {step.resources.map((res: any, ri: number) => (
                              <button
                                key={ri}
                                onClick={() => handleSearch(res.type === 'video' ? 'youtube' : 'mslearn', res.query)}
                                className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700/50 hover:border-brand-300 text-left"
                              >
                                <span className="truncate text-slate-700 dark:text-slate-300 font-medium">{res.title}</span>
                                <span className="text-[9px] font-semibold uppercase text-brand-600 shrink-0 ml-2">
                                  {res.type === 'video' ? 'Video' : 'Docs'} ↗
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Global Assessment Modal */}
      {(quizQuestions.length > 0 || quizLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="card p-6 w-full max-w-lg relative max-h-[85vh] overflow-y-auto shadow-2xl">
            <button 
              onClick={() => { setQuizQuestions([]); setQuizScore(null); }} 
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg text-sm"
            >
              ✕
            </button>

            {quizLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" style={{ borderWidth: 3 }} />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Generating Knowledge Check</h3>
                <p className="text-xs text-slate-400">Targeting current milestone objectives...</p>
              </div>
            ) : quizScore ? (
              <div className="py-8 text-center animate-in zoom-in-95">
                <div className="w-14 h-14 bg-accent-50 dark:bg-accent-900/30 text-accent-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaCheck className="text-xl" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Knowledge Synchronized!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                  Your milestone checkup is complete. Accuracy has been recorded in your performance profile.
                </p>
                <button 
                  onClick={() => { setQuizQuestions([]); setQuizScore(null); }}
                  className="btn btn-primary text-xs"
                >
                  Return to Learning Path
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="badge badge-primary text-[10px]">
                    Question {currentQuestionIdx + 1} of {quizQuestions.length}
                  </span>
                </div>
                
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white leading-snug">
                  {quizQuestions[currentQuestionIdx].question}
                </h3>

                <div className="space-y-2">
                  {quizQuestions[currentQuestionIdx].options.map((opt: string, i: number) => {
                    const isCorrect = opt === quizQuestions[currentQuestionIdx].answer;
                    const isSelected = opt === selectedAnswer;
                    
                    let btnStyle = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200";
                    if (showExplanation) {
                      if (isCorrect) btnStyle = "bg-accent-50 dark:bg-accent-900/30 border-accent-400 text-accent-800 dark:text-accent-300";
                      else if (isSelected) btnStyle = "bg-rose-50 dark:bg-rose-900/30 border-rose-400 text-rose-800 dark:text-rose-300";
                    } else {
                      btnStyle += " hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50/40 dark:hover:bg-brand-900/20";
                    }

                    return (
                      <button 
                        key={i} 
                        onClick={() => checkAnswer(opt)}
                        disabled={showExplanation}
                        className={`w-full p-3 rounded-lg border text-left text-xs font-medium transition-all flex items-center justify-between ${btnStyle}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-500 shrink-0">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {showExplanation && isCorrect && <FaCheck className="text-accent-500 text-xs shrink-0" />}
                        {showExplanation && isSelected && !isCorrect && <FaTimes className="text-rose-500 text-xs shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {showExplanation && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-brand-50/60 dark:bg-brand-900/20 rounded-lg border border-brand-100 dark:border-brand-800 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5 font-bold text-brand-700 dark:text-brand-400 mb-1">
                        <FaLightbulb className="text-[10px]" /> Insight
                      </div>
                      <p>{quizQuestions[currentQuestionIdx].explanation}</p>
                    </div>
                    <button 
                      onClick={nextQuestion}
                      className="btn btn-primary w-full text-xs"
                    >
                      {currentQuestionIdx === quizQuestions.length - 1 ? "Finish Check" : "Next Question →"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
