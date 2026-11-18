"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaDownload, FaExpand, FaSync, FaLightbulb } from "react-icons/fa";
import MermaidRenderer from "../components/MermaidRenderer";
import { ModernButton } from "../components/ModernUI";

export default function VisualizerPage() {
  const router = useRouter();
  const [diagramCode, setDiagramCode] = useState<string | null>(null);
  const [showDiagram, setShowDiagram] = useState(false);

  useEffect(() => {
    const savedCode = localStorage.getItem("pending_diagram");
    if (savedCode) {
      setDiagramCode(savedCode);
    } else {
      router.push("/flashcard");
    }
  }, [router]);

  const handleDownload = () => {
    const svgElement = document.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = "abhyas-diagram.png";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!diagramCode) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors mb-2"
          >
            <FaArrowLeft className="text-[10px]" /> Back to Generator
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Knowledge <span className="text-brand-600 dark:text-brand-400">Visualizer</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Structured cognitive diagram for spatial comprehension.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ModernButton 
            variant="outline" 
            size="sm"
            icon={<FaSync className="text-xs" />}
            onClick={() => router.push("/flashcard")}
          >
            Regenerate
          </ModernButton>
          <ModernButton 
            size="sm"
            icon={<FaDownload className="text-xs" />}
            onClick={handleDownload}
            disabled={!showDiagram}
          >
            Export PNG
          </ModernButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="card overflow-hidden">
        {!showDiagram ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/30 rounded-xl flex items-center justify-center mb-4">
              <FaExpand className="text-xl text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Your Concept Diagram is Ready</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
              We&apos;ve distilled your notes into a hierarchical conceptual flowchart. Click below to inspect.
            </p>
            <ModernButton 
              size="sm"
              onClick={() => setShowDiagram(true)}
            >
              Reveal Diagram
            </ModernButton>
          </div>
        ) : (
          <div className="relative animate-in fade-in duration-300">
            <div className="absolute top-3 right-3 flex gap-2 z-10">
              <button 
                className="p-1.5 bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 transition-all text-xs"
                title="Fullscreen"
                onClick={() => document.querySelector(".mermaid-container")?.requestFullscreen()}
              >
                <FaExpand />
              </button>
            </div>
            <div className="mermaid-container bg-white dark:bg-slate-900 p-6 flex justify-center items-center min-h-[350px]">
              <MermaidRenderer code={diagramCode} />
            </div>
          </div>
        )}
      </div>

      {/* Educational Study Tip */}
      <div className="p-4 bg-brand-50/60 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-xl flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0 mt-0.5">
          <FaLightbulb className="text-xs" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider">Teacher Tip: Spatial Encoding</h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
            Visual diagrams stimulate dual-coding memory retention. Trace concepts top-to-bottom and link them with your flashcard flash reviews.
          </p>
        </div>
      </div>
    </div>
  );
}
