"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaPlus, FaBookOpen, FaLightbulb, FaFire, FaStar, FaChartLine, FaHistory } from "react-icons/fa";
import { ModernButton } from "../components/ModernUI";
import toast from "react-hot-toast";

interface Achievement { id: string; title: string; description: string; icon: string; color: string; unlocked: boolean; }
interface TestResult { id: string; topic: string; score: number; total: number; accuracy: number; timestamp: string | null; source: string; }
interface Highlights {
  missions: { completed: number; total: number; averageScore: number; recent: { task: string; score: number; date: string }[] };
  quizzes: { totalAttempts: number; avgAccuracy: number; topicBreakdown: { topic: string; attempts: number; avgAccuracy: number }[] };
  user: { xp: number; level: number; streak: number };
  overallScore: number;
}

const COLOR_MAP: Record<string, string> = {
  emerald: "text-accent-600 bg-accent-50 dark:bg-accent-900/20",
  blue: "text-brand-600 bg-brand-50 dark:bg-brand-900/20",
  purple: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
  amber: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
  indigo: "text-brand-600 bg-brand-50 dark:bg-brand-900/20",
  orange: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
  yellow: "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
  teal: "text-teal-500 bg-teal-50 dark:bg-teal-900/20",
  violet: "text-violet-500 bg-violet-50 dark:bg-violet-900/20",
  green: "text-accent-600 bg-accent-50 dark:bg-accent-900/20",
  cyan: "text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20",
  rose: "text-rose-500 bg-rose-50 dark:bg-rose-900/20",
};

function getAccuracyColor(acc: number) {
  if (acc >= 80) return "text-accent-700 bg-accent-50 dark:bg-accent-900/20 dark:text-accent-400";
  if (acc >= 60) return "text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400";
  return "text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400";
}

function getAccuracyBarColor(acc: number) {
  if (acc >= 80) return "bg-accent-500";
  if (acc >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

export default function Dashboard() {
  const router = useRouter();
  const [collections, setCollections] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalCollections: 0, totalCards: 0 });
  const [userStats, setUserStats] = useState({ xp: 0, level: 1, streak: 0, lastActive: null });

  const [highlights, setHighlights] = useState<Highlights | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementStats, setAchievementStats] = useState({ totalUnlocked: 0, totalAchievements: 0 });
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [showAllTests, setShowAllTests] = useState(false);
  const [activeTab, setActiveTab] = useState<"quiz" | "mission">("quiz");
  const [perfLoading, setPerfLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const colRes = await fetch(`http://127.0.0.1:8000/api/collections?uid=default_user`);
        if (colRes.ok) {
          const data = await colRes.json();
          setCollections(data.collections);
          setStats({ totalCollections: data.collections.length, totalCards: data.collections.reduce((a: number, c: any) => a + (c.cardCount || 0), 0) });
        }
      } catch (e) { console.error(e); }

      setPerfLoading(true);
      try {
        const [hlRes, achRes, trRes] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/student/default_user/highlights`),
          fetch(`http://127.0.0.1:8000/api/student/default_user/achievements`),
          fetch(`http://127.0.0.1:8000/api/student/default_user/test-results`),
        ]);
        if (hlRes.ok) setHighlights(await hlRes.json());
        if (achRes.ok) {
          const achData = await achRes.json();
          setAchievements(achData.achievements);
          setAchievementStats({ totalUnlocked: achData.totalUnlocked, totalAchievements: achData.totalAchievements });
        }
        if (trRes.ok) {
          const trData = await trRes.json();
          const combined = [...trData.results, ...trData.missionResults]
            .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
          setTestResults(combined);
        }
      } catch (e) { console.error("Performance fetch error:", e); }
      setPerfLoading(false);
    };
    fetchAll();
  }, []);

  const displayedResults = showAllTests ? testResults : testResults.slice(0, 6);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back, <span className="text-brand-600 dark:text-brand-400">Scholar</span> 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Here's your academic picture today.</p>
        </div>
        
        {/* XP Progress */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 min-w-[220px] shadow-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center text-white text-[9px] font-bold">Lv{userStats.level}</div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Scholar Progress</span>
            </div>
            <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">{userStats.xp % 100}/100 XP</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${userStats.xp % 100}%` }} />
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-3 gap-4">
          <StatCard icon={<FaBookOpen className="text-brand-500" />} label="Collections" value={stats.totalCollections} color="bg-brand-50 dark:bg-brand-900/30" />
          <StatCard icon={<FaStar className="text-amber-500" />} label="Total XP" value={userStats.xp} color="bg-amber-50 dark:bg-amber-900/30" />
          <StatCard icon={<FaFire className="text-rose-500" />} label="Streak" value={`${userStats.streak}d`} color="bg-rose-50 dark:bg-rose-900/30" />
        </div>
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 dark:from-brand-700 dark:to-brand-900 rounded-xl p-4 flex flex-col justify-between text-white relative overflow-hidden shadow-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12" />
          <div className="z-10">
            <p className="text-xs font-semibold text-white/70 mb-1">Ready for a challenge?</p>
            <p className="text-sm text-white/80 mb-4">Generate new flashcards from your documents.</p>
          </div>
          <button
            onClick={() => router.push("/flashcard")}
            className="flex items-center justify-center gap-2 py-2 px-4 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-all active:scale-95"
          >
            <FaPlus className="text-xs" /> Create New Set
          </button>
        </div>
      </div>

      {/* Student Highlights */}
      <section>
        <div className="section-header">
          <h2 className="section-title">
            <FaChartLine className="text-brand-500" />
            Student Highlights
          </h2>
          {highlights && (
            <span className={`badge text-xs font-semibold ${getAccuracyColor(highlights.overallScore)}`}>
              Overall: {highlights.overallScore}%
            </span>
          )}
        </div>

        {perfLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton" />)}
          </div>
        ) : highlights ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Overall Score */}
            <div className="card p-4 flex flex-col items-center text-center">
              <div className="relative w-14 h-14 mb-2">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" className="dark:stroke-slate-700" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#4f46e5" strokeWidth="3"
                    strokeDasharray={`${highlights.overallScore} ${100 - highlights.overallScore}`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800 dark:text-white">{highlights.overallScore}%</span>
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Overall</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Missions + Quizzes</p>
            </div>

            {/* Missions */}
            <div className="card p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="material-symbols-outlined text-accent-500 text-base">task_alt</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Missions</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {highlights.missions.completed}<span className="text-sm font-medium text-slate-400">/{highlights.missions.total}</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 mb-2">Avg: <span className="text-accent-600 font-semibold">{highlights.missions.averageScore}%</span></p>
              <div className="progress-bar">
                <div className="h-full bg-accent-500 rounded-full" style={{ width: `${highlights.missions.total > 0 ? (highlights.missions.completed / highlights.missions.total) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Quizzes */}
            <div className="card p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="material-symbols-outlined text-brand-500 text-base">quiz</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Quiz Score</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{highlights.quizzes.avgAccuracy}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5 mb-2">{highlights.quizzes.totalAttempts} quiz{highlights.quizzes.totalAttempts !== 1 ? "zes" : ""}</p>
              <div className="progress-bar">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${highlights.quizzes.avgAccuracy}%` }} />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <FaHistory className="text-amber-500 text-sm" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Recent</span>
              </div>
              <div className="space-y-1.5">
                {highlights.missions.recent.length > 0 ? highlights.missions.recent.slice(0, 3).map((m, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate">{m.task}</span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${getAccuracyColor(m.score)}`}>{m.score}%</span>
                  </div>
                )) : <p className="text-[10px] text-slate-400 italic">No missions yet</p>}
              </div>
            </div>
          </div>
        ) : null}

        {/* Topic Breakdown */}
        {highlights && highlights.quizzes.topicBreakdown.length > 0 && (
          <div className="mt-3 card p-4">
            <h3 className="section-title mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Quiz Topic Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {highlights.quizzes.topicBreakdown.map((tb, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <p className="text-[9px] font-bold text-slate-500 uppercase truncate mb-1">{tb.topic}</p>
                  <p className={`text-base font-bold ${tb.avgAccuracy >= 80 ? 'text-accent-600' : tb.avgAccuracy >= 60 ? 'text-amber-600' : 'text-rose-500'}`}>{tb.avgAccuracy}%</p>
                  <p className="text-[9px] text-slate-400">{tb.attempts} attempt{tb.attempts !== 1 ? "s" : ""}</p>
                  <div className="progress-bar mt-1.5">
                    <div className={`h-full rounded-full ${getAccuracyBarColor(tb.avgAccuracy)}`} style={{ width: `${tb.avgAccuracy}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Achievements */}
      <section>
        <div className="section-header">
          <h2 className="section-title">
            <span className="material-symbols-outlined text-amber-500 text-base">emoji_events</span>
            Achievements
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {achievementStats.totalUnlocked} / {achievementStats.totalAchievements} unlocked
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`relative p-3 rounded-xl border transition-all flex flex-col items-center text-center ${
                ach.unlocked
                  ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-card hover:shadow-card-hover hover:-translate-y-0.5"
                  : "bg-slate-50 dark:bg-slate-900/50 border-dashed border-slate-200 dark:border-slate-800 opacity-40"
              }`}
            >
              {ach.unlocked && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[8px]">check</span>
                </span>
              )}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${ach.unlocked ? (COLOR_MAP[ach.color] || "text-slate-500 bg-slate-100") : "text-slate-300 bg-slate-100 dark:bg-slate-800"}`}>
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{ach.icon}</span>
              </div>
              <p className={`text-[10px] font-semibold leading-tight mb-0.5 ${ach.unlocked ? "text-slate-800 dark:text-white" : "text-slate-400"}`}>{ach.title}</p>
              <p className="text-[9px] text-slate-400 leading-tight">{ach.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Test Results */}
      <section>
        <div className="section-header">
          <h2 className="section-title">
            <span className="material-symbols-outlined text-brand-500 text-base">checklist</span>
            Test Results
          </h2>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setActiveTab("quiz")} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${activeTab === "quiz" ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>Quizzes</button>
            <button onClick={() => setActiveTab("mission")} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${activeTab === "mission" ? "bg-accent-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>Missions</button>
          </div>
        </div>

        {perfLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 skeleton" />)}
          </div>
        ) : (() => {
          const filtered = displayedResults.filter(r => activeTab === "quiz" ? r.source === "quiz" : r.source === "mission");
          return filtered.length > 0 ? (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Topic</th>
                      <th className="text-center px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Score</th>
                      <th className="text-center px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Accuracy</th>
                      <th className="text-center px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Bar</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={r.id} className={`border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors`}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.source === "quiz" ? "bg-brand-500" : "bg-accent-500"}`} />
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{r.topic}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="font-bold text-slate-800 dark:text-white">{r.score}</span>
                          <span className="text-slate-400">/{r.total}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`badge text-[10px] font-semibold ${getAccuracyColor(r.accuracy)}`}>{r.accuracy}%</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="progress-bar max-w-[80px] mx-auto">
                            <div className={`h-full rounded-full transition-all duration-700 ${getAccuracyBarColor(r.accuracy)}`} style={{ width: `${r.accuracy}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-400">
                          {r.timestamp ? new Date(r.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {testResults.filter(r => activeTab === "quiz" ? r.source === "quiz" : r.source === "mission").length > 6 && (
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <button onClick={() => setShowAllTests(p => !p)} className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 uppercase tracking-wider">
                    {showAllTests ? "Show Less" : `View All ${testResults.length} Results`}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-6 text-center">
              <span className="material-symbols-outlined text-2xl text-slate-200 dark:text-slate-700 mb-2 block">assignment</span>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No {activeTab === "quiz" ? "quiz" : "mission"} results yet.</p>
              <p className="text-xs text-slate-400 mt-1">Complete a {activeTab === "quiz" ? "quiz" : "daily mission"} to see your results here.</p>
            </div>
          );
        })()}
      </section>

      {/* Recent Collections */}
      <section>
        <div className="section-header mb-4">
          <h2 className="section-title">
            <FaBookOpen className="text-brand-500" /> Recent Collections
          </h2>
          <button onClick={() => router.push("/collections")} className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors">View All</button>
        </div>
        {collections.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {collections.slice(0, 3).map((col) => (
              <div key={col.id} className="card-hover p-4 group">
                <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-500 flex items-center justify-center mb-3 transition-colors group-hover:bg-brand-500 group-hover:text-white">
                  <FaLightbulb className="text-sm" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5 truncate">{col.name || "Untitled Collection"}</h3>
                <p className="text-xs text-slate-400">{col.cardCount || 0} Cards</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center">
            <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FaBookOpen className="text-2xl text-slate-200 dark:text-slate-700" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">No collections yet</h3>
            <p className="text-xs text-slate-400 mb-5">Your saved flashcards will appear here.</p>
            <ModernButton onClick={() => router.push("/flashcard")} size="sm">Generate Your First Set</ModernButton>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="card p-4 flex flex-col items-center text-center">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${color}`}>{icon}</div>
      <p className="text-xl font-bold text-slate-800 dark:text-white">{value}</p>
      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}
