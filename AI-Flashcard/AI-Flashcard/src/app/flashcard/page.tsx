"use client";
import { useEffect, useRef, useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaSave,
  FaSpinner,
  FaVolumeUp,
  FaProjectDiagram,
  FaGamepad,
  FaPlus,
} from "react-icons/fa";
import Confetti from "react-confetti";
import Tesseract from "tesseract.js";
import { Inter } from "@next/font/google";
import { useRouter } from "next/navigation";
import { ModernButton } from "../components/ModernUI";
import Flashcard from "../components/Flashcard";
import MermaidRenderer from "../components/MermaidRenderer";
import toast from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });



// Enhanced prompt for more consistent flashcard generation
const generateFlashcards = async (text: string) => {
  try {
    // Calling the Python backend to avoid CORS and handle the correct Gemini model names
    const response = await fetch("http://127.0.0.1:8000/api/flashcards/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || `Generator Error (${response.status})`);
    }

    const data = await response.json();
    if (!data.text) throw new Error("No text returned from generator");
    
    return data.text;

  } catch (error: any) {
    console.error("Generator failed:", error);
    // Explicitly mention the backend dependency to help the user debug
    if (error.message.includes("Failed to fetch")) {
        throw new Error("Could not connect to the Python backend. Please ensure 'python main.py' is running in the backend folder.");
    }
    throw error;
  }
};

export default function FlashcardsGenerator() {
  const [inputText, setInputText] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [flashcards, setFlashcards] = useState<
    { question: string; answer: string }[]
  >([]);
  const [selectedTheme, setSelectedTheme] = useState("dark"); // State for theme
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const [showAnswer, setShowAnswer] = useState<{ [key: number]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [diagramLoading, setDiagramLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(0); // New state for current page

  const [collections, setCollections] = useState<
    { id: string; [key: string]: any }[]
  >([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [isStudying, setIsStudying] = useState(false);

  const router = useRouter();

  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);

  // Summary state
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Infograph state
  const [infoData, setInfoData] = useState<any | null>(null);
  const [infographLoading, setInfographLoading] = useState(false);
  const [showInfograph, setShowInfograph] = useState(false);

  useEffect(() => {
    const createDefaultCollection = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/collections/default", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: "default_user" }),
        });
        if (response.ok) {
          console.log("✅ Default collection created");
        }
      } catch (error) {
        console.error("❌ Error creating collection:", error);
      }
    };

    createDefaultCollection();
  }, []);

  const studyCollection = async (collectionID: string) => {
    try {
      setLoading(true);
      setLoadingMessage("Loading collection...");
      const response = await fetch(`http://127.0.0.1:8000/api/collections/${collectionID}/flashcards?uid=default_user`);
      if (!response.ok) throw new Error("Failed to fetch flashcards");
      const data = await response.json();
      
      setFlashcards(data.flashcards);
      setIsStudying(true);
      setSelectedCollection(collectionID);
      setCurrentPage(0);
      setShowAnswer({});
    } catch (error) {
      console.error("❌ Error fetching cards:", error);
      setError("Failed to load cards for this collection.");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/collections?uid=default_user`);
        if (!response.ok) throw new Error("Failed to fetch collections");
        const data = await response.json();
        setCollections(data.collections);
      } catch (error) {
        console.error("❌ Error fetching collections:", error);
      }
    };

    fetchCollections();
  }, []);

  const handleCreateNewCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      setIsCreatingLoading(true);
      const response = await fetch("http://127.0.0.1:8000/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: "default_user",
          name: newCollectionName.trim(),
        }),
      });

      if (!response.ok) throw new Error("Failed to create collection");

      const data = await response.json();
      toast.success(`Collection '${newCollectionName}' created!`);
      
      // Refresh collections list
      const colRes = await fetch(`http://127.0.0.1:8000/api/collections?uid=default_user`);
      if (colRes.ok) {
        const colData = await colRes.json();
        setCollections(colData.collections);
      }

      setSelectedCollection(data.id);
      setNewCollectionName("");
      setIsCreatingCollection(false);
    } catch (error) {
      console.error("Error creating collection:", error);
      toast.error("Failed to create collection");
    } finally {
      setIsCreatingLoading(false);
    }
  };

  const handleSaveFlashcards = async () => {
    if (!selectedCollection) {
      toast.error("Please select a collection");
      return;
    }

    if (!flashcards || flashcards.length === 0) {
      toast.error("No flashcards to save.");
      return;
    }

    try {
      const validCards = flashcards.filter(
        (card) => card.question && card.answer
      );

      const response = await fetch("http://127.0.0.1:8000/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: "default_user",
          collection_id: selectedCollection,
          collection_name: selectedCollection, // Using ID as name since we don't have the collection name string directly here
          flashcards: validCards
        }),
      });

      if (!response.ok) throw new Error("Failed to save via backend");

      console.log("✅ Your data is saved successfully");
      toast.success("Flashcard set saved!");

    } catch (error) {
      console.error(error);
      toast.error("Error saving flashcards");
    }
  };

  useEffect(() => {
    // Show confetti when the user reaches the last flashcard
    if (currentPage === flashcards.length - 1 && flashcards.length > 0) {
      setShowConfetti(true);
    } else {
      setShowConfetti(false);
    }
  }, [currentPage, flashcards.length]);
  // ... (handleFileUpload, generateFlashcardsFromGemini, toggleAnswer functions)
  useEffect(() => {
    // Initialize the SpeechSynthesis object when the component mounts
    if ("speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const handleSpeak = (textToSpeak: string) => {
    if (synthRef.current && textToSpeak) {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      synthRef.current.speak(utterance);
    }
  };

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTheme(event.target.value);
  };

  const handlePrevClick = () => {
    setCurrentPage((prevPage) => Math.max(0, prevPage - 1));
  };

  const handleNextClick = () => {
    setCurrentPage((prevPage) => Math.min(flashcards.length - 1, prevPage + 1));
  };

  // Handle PDF file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // 🧠 IMAGE → OCR
    if (selectedFile.type.startsWith("image/")) {
      setLoading(true);
      setError(null);

      try {
        const result = await Tesseract.recognize(
          selectedFile,
          "eng",
          {
            logger: (m) => console.log(m), // progress log
          }
        );

        const extractedText = result.data.text;
        console.log("OCR Text:", extractedText);

        // 👉 put text into textarea
        setInputText(extractedText);
      } catch (error) {
        console.error("OCR Error:", error);
        setError("Error reading image.");
      } finally {
        setLoading(false);
      }
    } else {
      setFile(selectedFile);
    }
  };

  const generateFlashcardsFromGemini = async (text: string) => {
    setLoading(true);
    setError(null);

    const messages = [
      "Consulting AI... Generating flashcards ⚡",
      "Reading your text carefully 📖...",
      "Thinking of the best questions 🧠...",
      "Assembling the perfect answers 📝...",
      "Almost done! Adding some magic ✨...",
    ];

    let messageIndex = 0;
    setLoadingMessage(messages[0]);

    // Cycle the message every 2.5 seconds, but stop at the last one
    const intervalId = setInterval(() => {
      messageIndex += 1;
      if (messageIndex >= messages.length) {
        clearInterval(intervalId);
      } else {
        setLoadingMessage(messages[messageIndex]);
      }
    }, 2500);

    try {
      const flashcardsText = await generateFlashcards(text);
      console.log(flashcardsText);

      // Split by double newlines to separate flashcards
      //const flashcardBlocks = flashcardsText.split("\n\n");
      const cleanedText = flashcardsText
        .replace(/```[a-z]*\n/gi, "")
        .replace(/```/g, "")
        .replace(/---/g, "")
        .replace(/Feel free to ask[\s\S]*/gi, "")
        .replace(/Here are flashcards[\s\S]*?:/gi, "");

      const flashcardBlocks = cleanedText.split("\n\n");

      const flashcardPairs = flashcardBlocks
        .map((block: string) => {
          const questionMatch =
            block.match(/\*\*Q:\*\*\s*(.+)/i) ||
            block.match(/Q:\s*(.+)/i) ||
            block.match(/\* Question:\s*(.+)/i);

          const answerMatch =
            block.match(/\*\*A:\*\*\s*(.+)/i) ||
            block.match(/A:\s*(.+)/i) ||
            block.match(/\* Answer:\s*(.+)/i);

          if (!questionMatch || !answerMatch) {
            return null; // ❌ silently skip instead of warning spam
          }

          return {
            question: questionMatch[1].trim(),
            answer: answerMatch[1].trim(),
          };
        })
        .filter((card: any) => card !== null);

      setFlashcards(flashcardPairs as { question: string; answer: string }[]); // Type assertion for extra safety
    } catch (error: any) {
      console.error("Error generating flashcards:", error);
      setError("Error generating flashcards: " + error.message);
    } finally {
      clearInterval(intervalId);
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // Prevent both file and text at the same time
    // if (file && inputText) {
    //   setError("Please select either a file or provide text input, not both.");
    //   return;
    // }

    try {
      setLoading(true);
      setLoadingMessage("Initializing...");

      // 📄 File handling (PDFs)
      if (file) {
        // Only process if it's a PDF
        if (file.type === "application/pdf") {
          setLoadingMessage("Extracting text from PDF via Python server ⏳...");

          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("http://127.0.0.1:8000/api/file", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error("Backend error: " + errText);
          }

          const result = await response.json();

          if (result.text) {
            setInputText(result.text); // ✅ Fill the text field so Diagram button enables
            await generateFlashcardsFromGemini(result.text);
          } else {
            console.error("Failed to extract text from file:", result);
            setError("Failed to extract text from the file.");
          }
        } else {
          // Non-PDF files (like images) should already have populated inputText
          if (inputText) {
            await generateFlashcardsFromGemini(inputText);
          } else {
            setError("Unsupported file type.");
          }
        }
      }
      // 📝 Text input handling
      else if (inputText) {
        await generateFlashcardsFromGemini(inputText);
      }
      // ❌ No input provided
      else {
        setError("Please provide either text input or a file.");
      }
    } catch (err: any) {
      console.error("Flashcard generation failed:", err);
      setError("Error: " + (err.message || String(err)));
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  // Toggle the visibility of the answer for a specific flashcard
  const toggleAnswer = (index: number) => {
    setShowAnswer((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleGenerateSummary = async () => {
    if (flashcards.length === 0 && !inputText.trim()) {
      toast.error("Please provide text or generate flashcards first.");
      return;
    }
    
    // UI feedback
    const toastId = toast.loading("Analyzing content for summary...");
    setSummaryLoading(true);
    setShowSummary(true);
    setShowInfograph(false);
    setSummary(null);
    try {
      // Use the most up-to-date content
      const contentToSummarize = flashcards.length > 0 
        ? flashcards 
        : [{ question: "Content Overview", answer: inputText }];

      const res = await fetch("http://127.0.0.1:8000/api/flashcards/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flashcards: contentToSummarize }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Server failed to generate summary");
      }
      
      const data = await res.json();
      setSummary(data.summary);
      toast.success("Summary ready!", { id: toastId });
    } catch (err: any) {
      console.error("Summary error:", err);
      toast.error("Summary failed: " + err.message, { id: toastId });
      setShowSummary(false);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleGenerateInfograph = async () => {
    if (!inputText.trim()) {
      toast.error("Please enter some text or upload a file first.");
      return;
    }

    setInfographLoading(true);
    setShowInfograph(true);
    setShowSummary(false); // Hide summary panel
    setInfoData(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/generate-infograph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      if (!res.ok) throw new Error("Infograph generation failed");
      const data = await res.json();
      setInfoData(data);
      toast.success("Infograph generated!");
    } catch (error: any) {
      toast.error("Failed to generate infograph: " + error.message);
      setShowInfograph(false);
    } finally {
      setInfographLoading(false);
    }
  };

  const generateMermaidCode = () => {
    if (!infoData) return "";
    
    const nodes = infoData.nodes || [];
    const links = infoData.links || [];

    let code = `flowchart TD\n`;
    code += `classDef default fill:#f8fafc,stroke:#e2e8f0,stroke-width:2px,color:#1e293b,rx:8px,ry:8px;\n`;
    code += `classDef title fill:#4f46e5,stroke:#4338ca,stroke-width:0px,color:#ffffff,font-weight:bold;\n`;
    
    if (infoData.title) {
        code += `TITLE["**\${infoData.title.toUpperCase()}**"]:::title\n`;
        if (nodes.length > 0) {
            code += `TITLE ==> \${nodes[0].id}\n`;
        }
    }

    nodes.forEach((node: any) => {
      const safeLabel = (node.label || "").replace(/"/g, "'");
      const safeDesc = (node.description || "").replace(/"/g, "'");
      code += `\${node.id}["**\${safeLabel}**<br/><br/><small>\${safeDesc}</small>"]\n`;
    });

    links.forEach((link: any) => {
      const safeRelation = (link.relation || "").replace(/"/g, "'");
      code += `\${link.source} -- "\${safeRelation}" --> \${link.target}\n`;
    });

    return code;
  };

  const handleGenerateDiagram = async () => {
    setError(null);
    let textForDiagram = inputText;

    if (!textForDiagram && !file) {
      setError("Please provide text or upload a file first to generate a diagram.");
      return;
    }

    setDiagramLoading(true);

    try {
      if (file && file.type === "application/pdf" && !textForDiagram) {
        const formData = new FormData();
        formData.append("file", file);

        const fileResponse = await fetch("http://127.0.0.1:8000/api/file", {
          method: "POST",
          body: formData,
        });

        if (!fileResponse.ok) {
          throw new Error("Failed to extract text from PDF");
        }

        const result = await fileResponse.json();
        if (result.text) {
          textForDiagram = result.text;
          setInputText(result.text);
        } else {
          throw new Error("No text found in PDF");
        }
      }

      if (!textForDiagram) {
        throw new Error("Could not extract any text.");
      }

      const response = await fetch("http://127.0.0.1:8000/api/generate-diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textForDiagram }),
      });

      if (!response.ok) throw new Error("Failed to generate diagram");
      
      const data = await response.json();
      
      // Store in localStorage or use a state manager/URL param
      localStorage.setItem("pending_diagram", data.code);
      router.push("/visualizer");
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Diagram generation failed. Check your connection.");
    } finally {
      setDiagramLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen py-6 flex flex-col items-center justify-start ${inter.className}`}
    >
      <div className="w-full max-w-2xl px-4 mx-auto relative z-10">
        {/* Page header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            Flashcard Generator <span className="text-brand-600">⚡</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Turn any text or image into interactive flashcards instantly.</p>
        </div>

        <div className="card p-5">
          {error && <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg mb-4 text-sm border border-rose-100 dark:border-rose-800">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* TEXT INPUT */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Source Text</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your text here, or upload a document below..."
                className="input textarea min-h-[90px]"
              />
            </div>

            {/* FILE INPUT (PDF + IMAGE) */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Upload Context File (.pdf, image)</label>
              <input
                type="file"
                accept=".pdf, image/*"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-500 dark:text-slate-400
              file:mr-3 file:py-1.5 file:px-3
              file:rounded-lg file:border-0
              file:text-xs file:font-semibold
              file:bg-brand-50 file:text-brand-600 dark:file:bg-brand-900/30 dark:file:text-brand-400
              hover:file:bg-brand-100 dark:hover:file:bg-brand-900/50 cursor-pointer transition-all"
              />
            </div>

            {/* BUTTONS */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <ModernButton
                type="submit"
                loading={loading}
                size="sm"
                icon={!loading ? <FaPlus className="text-xs" /> : undefined}
              >
                {loading ? loadingMessage || "Generating..." : "Flashcards"}
              </ModernButton>

              <ModernButton
                type="button"
                variant="outline"
                size="sm"
                loading={infographLoading}
                onClick={handleGenerateInfograph}
                disabled={!inputText && !file}
                icon={!infographLoading ? <FaProjectDiagram className="text-xs" /> : undefined}
              >
                {infographLoading ? "Mapping..." : "Infograph"}
              </ModernButton>

              <ModernButton
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateDiagram}
                disabled={diagramLoading || (!inputText && !file)}
                icon={diagramLoading ? <FaSpinner className="animate-spin text-xs" /> : <FaProjectDiagram className="text-xs" />}
              >
                {diagramLoading ? "Visualizing..." : "Diagram"}
              </ModernButton>

              <ModernButton
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateSummary}
                disabled={summaryLoading || loading || (!inputText && !file)}
              >
                {summaryLoading ? <><FaSpinner className="animate-spin text-xs" /> Summarising...</> : <>📋 Summary</>}
              </ModernButton>

              {flashcards.length > 0 && (
                <ModernButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveFlashcards}
                  icon={<FaSave className="text-xs" />}
                >
                  Save
                </ModernButton>
              )}
            </div>

            {/* COLLECTION SELECTOR */}
            <div className="pt-1 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Save To Collection
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedCollection || ""}
                      onChange={(e) => setSelectedCollection(e.target.value)}
                      className="select flex-1"
                    >
                      <option value="">-- Select Collection --</option>
                      {collections.map((col) => (
                        <option key={col.id} value={col.id}>{col.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsCreatingCollection(!isCreatingCollection)}
                      className="px-3 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors shadow-sm text-sm"
                      title="Create New Collection"
                    >
                      <FaPlus className="text-xs" />
                    </button>
                  </div>
                </div>
                
                {/* Start Quiz */}
                {selectedCollection && (
                  <ModernButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/quiz?collectionId=${selectedCollection}`)}
                    icon={<FaGamepad className="text-xs" />}
                  >
                    AI Quiz
                  </ModernButton>
                )}
              </div>

              {isCreatingCollection && (
                <div className="flex gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg animate-in slide-in-from-top-2 duration-200">
                  <input
                    type="text"
                    placeholder="New collection name..."
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="input flex-1 py-1.5 text-xs"
                  />
                  <ModernButton
                    type="button"
                    size="sm"
                    loading={isCreatingLoading}
                    onClick={handleCreateNewCollection}
                  >
                    Create
                  </ModernButton>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCollection(false)}
                    className="px-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* FLASHCARDS SECTION */}
        <div className="mt-6 flex flex-col items-center relative min-h-[300px]">
          {flashcards.length > 0 && 
            <div className="w-full max-w-md mb-5">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
                <span>Card {currentPage + 1} of {flashcards.length}</span>
                <span>{Math.round(((currentPage + 1) / flashcards.length) * 100)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${((currentPage + 1) / flashcards.length) * 100}%`,
                  }}
              />
            </div>
            </div>}

          {flashcards.length > 0 && (
            <Flashcard 
                key={currentPage}
                question={flashcards[currentPage].question}
                answer={flashcards[currentPage].answer}
                onSpeak={handleSpeak}
            />
          )}

          {/* CONTROLS */}
          {flashcards.length > 0 && (
            <div className="flex items-center justify-between w-full max-w-md mt-5">
              <ModernButton
                variant="outline"
                size="sm"
                onClick={handlePrevClick}
                disabled={currentPage === 0}
                icon={<FaChevronLeft className="text-xs" />}
              >
                Prev
              </ModernButton>

              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                {currentPage + 1} / {flashcards.length}
              </span>

              <ModernButton
                variant="outline"
                size="sm"
                onClick={handleNextClick}
                disabled={currentPage === flashcards.length - 1}
              >
                Next <FaChevronRight className="text-xs" />
              </ModernButton>
            </div>
          )}

          {/* CONFETTI */}
          {showConfetti && (
            <div className="fixed inset-0 pointer-events-none z-50">
                <Confetti
                  width={typeof window !== "undefined" ? window.innerWidth : 1000}
                  height={typeof window !== "undefined" ? window.innerHeight : 1000}
                  recycle={false}
                />
            </div>
          )}

          {/* EMPTY STATE */}
          {flashcards.length === 0 && (
            <div className="flex flex-col items-center justify-center absolute inset-0 text-slate-400 mt-10">
               <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <FaProjectDiagram className="text-3xl text-brand-400 dark:text-indigo-400" />
               </div>
               <p className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-2">Ready to convert knowledge to cards</p>
               <p className="text-slate-500 dark:text-slate-400 font-medium text-sm text-center">Paste your notes or extract text from a document<br/> to get started.</p>
            </div>
          )}
        </div>

        {/* ── SUMMARY PANEL ── */}
        {showSummary && (
          <div className="w-full mt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="card p-5 relative overflow-hidden">
              {/* Close */}
              <button
                onClick={() => { setShowSummary(false); setSummary(null); }}
                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <span className="text-sm">✕</span>
              </button>

              {summaryLoading ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <FaSpinner className="animate-spin text-2xl text-brand-500" />
                  <p className="text-slate-500 text-sm font-medium">Analysing your flashcards...</p>
                </div>
              ) : summary ? (
                <>
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-brand-600 mb-0.5">AI-Generated Summary</p>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{summary.topic}</h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                        summary.difficulty === 'Beginner' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' :
                        summary.difficulty === 'Advanced' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' :
                        'bg-amber-50 text-amber-600 dark:bg-amber-900/20'
                      }`}>{summary.difficulty}</span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {summary.totalCards} cards · {summary.estimatedStudyTime}
                      </span>
                    </div>
                  </div>

                  {/* Overview */}
                  <div className="p-3 bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-500/10 rounded-lg mb-4">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{summary.overview}</p>
                  </div>

                  {/* Key Concepts */}
                  {summary.keyConceptsSummary?.length > 0 && (
                    <div className="mb-4">
                      <h3 className="section-title mb-2 flex items-center gap-2">
                        <span className="w-2 h-0.5 bg-brand-500 inline-block" /> Key Concepts
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {summary.keyConceptsSummary.map((kc: any, i: number) => (
                          <div key={i} className="p-3 bg-white dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mb-0.5">{kc.concept}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{kc.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Study Tips */}
                  {summary.studyTips?.length > 0 && (
                    <div>
                      <h3 className="section-title mb-2 flex items-center gap-2">
                        <span className="w-2 h-0.5 bg-emerald-500 inline-block" /> Study Tips
                      </h3>
                      <ul className="space-y-1.5">
                        {summary.studyTips.map((tip: string, i: number) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                            <span className="w-4 h-4 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* ── INFOGRAPH PANEL ── */}
        {showInfograph && (
          <div className="w-full mt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="card p-5 relative overflow-hidden min-h-[400px] flex flex-col">
              {/* Close */}
              <button
                onClick={() => { setShowInfograph(false); setInfoData(null); }}
                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all z-20"
              >
                <span className="text-sm">✕</span>
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                 <div className="p-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-lg">
                    <FaProjectDiagram className="text-sm" />
                 </div>
                 <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Structured Infograph</h3>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Visual Cognitive Mapping</p>
                 </div>
              </div>

              {infographLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 gap-3">
                  <FaSpinner className="animate-spin text-2xl text-brand-500" />
                  <p className="text-slate-500 text-sm font-medium">Architecting visual trajectory...</p>
                </div>
              ) : infoData ? (
                <div className="flex-1 flex flex-col">
                   <div className="flex-1 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-inner relative min-h-[320px]">
                      <MermaidRenderer code={generateMermaidCode()} />
                   </div>
                   
                   <div className="mt-4 flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex gap-4">
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-slate-800 dark:text-white">{(infoData.nodes || []).length}</span>
                           <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Concepts</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-slate-800 dark:text-white">{(infoData.links || []).length}</span>
                           <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Relations</span>
                        </div>
                      </div>
                      <ModernButton variant="outline" size="sm" onClick={() => window.print()}>
                         <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">download</span> Save as PDF</span>
                      </ModernButton>
                   </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
