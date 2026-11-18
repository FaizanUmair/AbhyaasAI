'use client';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { FaArrowLeft, FaRobot, FaMicrophone, FaStop, FaUpload, FaLink } from 'react-icons/fa';
import { LiveAvatarSession } from "@heygen/liveavatar-web-sdk";

export default function FreshAITutor() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [contextSet, setContextSet] = useState(false);
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showIframe, setShowIframe] = useState(false);
  const [embedUrl, setEmbedUrl] = useState("https://embed.liveavatar.com/v1/fb26a591-a69a-4094-8ce8-88731a8c5daa?orientation=horizontal");
  const [transcript, setTranscript] = useState('');
  const [tutorMessage, setTutorMessage] = useState("Tutor is Offline");
  
  const recognitionRef = useRef<any>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = async (event: any) => {
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        setIsListening(false);
        await handleUserMessage(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
    
    return () => {
      if (sessionRef.current) {
        sessionRef.current.stop();
      }
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const submitContext = async () => {
    if (!file) {
      toast.error('Please select a PDF file first.');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const extractRes = await fetch('http://localhost:8000/api/file', {
        method: 'POST', body: formData,
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok) throw new Error(extractData.detail || 'Failed to extract text');
      
      const saveRes = await fetch('http://localhost:8000/api/tutor/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: 'default_user', material_text: extractData.text }),
      });
      if (!saveRes.ok) throw new Error('Failed to save context');
      
      setContextSet(true);
      toast.success('Study material loaded successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setIsUploading(false);
    }
  };

  const fetchToken = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/heygen-token", { method: "POST" });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching token:", error);
      return null;
    }
  };

  const startAvatarSession = async () => {
    setIsConnecting(true);
    setTutorMessage("Connecting to LiveAvatar...");
    
    const data = await fetchToken();
    if (!data) {
      toast.error("Failed to connect to backend.");
      setIsConnecting(false);
      setTutorMessage("Tutor is Offline");
      return;
    }

    if (data.url) {
      setEmbedUrl(data.url);
      setShowIframe(true);
      setIsSessionActive(true);
      setIsConnecting(false);
      setTutorMessage("Tutor is Ready (Sandbox Mode)");
      toast.success("Tutor is live!");
      return;
    }

    const token = data.token;
    if (!token) {
      toast.error("Failed to get session token. Check your LiveAvatar API key.");
      setIsConnecting(false);
      setTutorMessage("Tutor is Offline");
      return;
    }

    try {
      const session = new LiveAvatarSession(token, { voiceChat: true });
      
      (session as any).on("stream_ready", (stream: any) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });

      (session as any).on("disconnected", () => {
        setIsSessionActive(false);
        setTutorMessage("Tutor Disconnected");
      });

      await session.start().catch((err: any) => {
        throw new Error(`Connection failed: ${err.message || 'Check microphone/internet'}`);
      });

      sessionRef.current = session;
      setIsSessionActive(true);
      setIsConnecting(false);
      
      const greeting = "Hello! I am your AI tutor. I am ready to help you learn.";
      setTutorMessage(greeting);
      toast.success('Tutor is live!');
      
      await session.repeat(greeting);
    } catch (err: any) {
      setShowIframe(true);
      setIsSessionActive(true);
      setIsConnecting(false);
      toast.success("Connected via Fallback Mode");
    }
  };

  const endAvatarSession = async () => {
    if (sessionRef.current) {
      await sessionRef.current.stop();
      sessionRef.current = null;
    }
    setIsSessionActive(false);
    setTutorMessage('Tutor is Offline');
  };

  const handleUserMessage = async (text: string) => {
    if (!isSessionActive || !sessionRef.current) {
      toast.error("Please connect the tutor first");
      return;
    }
    if (showIframe) return;
    if (!sessionRef.current) return;
    
    setTutorMessage("Thinking...");
    const toastId = toast.loading('Thinking...');
    try {
      const res = await fetch('http://localhost:8000/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: 'default_user', message: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      
      toast.dismiss(toastId);
      setTutorMessage(data.reply);
      
      setIsSpeaking(true);
      await sessionRef.current.repeat(data.reply);
      setIsSpeaking(false);
      
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Failed to get answer');
      const errorMsg = "Sorry, I couldn't understand that. Can you try again?";
      setTutorMessage(errorMsg);
      if (sessionRef.current) await sessionRef.current.repeat(errorMsg);
    }
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        toast.error("Speech recognition is not supported in this browser.");
        return;
      }
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-primary text-[9px]">LiveAvatar Engine v3.0</span>
            {isSessionActive && (
              <span className="badge bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-400 text-[9px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" /> Live
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Personal AI Tutor</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Real-time interactive tutor powered by LiveAvatar.</p>
        </div>
        
        <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:border-brand-300 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 transition-all shadow-sm">
          <FaArrowLeft className="text-xs" />
          Back to Dashboard
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Panel: Setup */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Knowledge Base */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-brand-50 dark:bg-brand-900/30 text-brand-600 flex items-center justify-center text-xs">
                <span className="font-bold">1</span>
              </div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Knowledge Base</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Upload study material to ground the AI's responses.</p>
            
            <div className="space-y-3">
              <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center hover:border-brand-300 dark:hover:border-brand-600 bg-slate-50 dark:bg-slate-800 transition-all cursor-pointer">
                <FaUpload className="text-slate-300 dark:text-slate-600 text-lg mx-auto mb-2" />
                <input
                  type="file" accept=".pdf" onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 dark:file:bg-brand-900/30 file:text-brand-600 dark:file:text-brand-400 hover:file:bg-brand-100 cursor-pointer"
                />
                {file && <p className="mt-2 text-xs font-semibold text-brand-600 dark:text-brand-400 truncate">{file.name}</p>}
              </div>
              
              <button
                onClick={submitContext} disabled={isUploading || !file}
                className={`w-full py-2 text-sm font-semibold rounded-lg transition-all active:scale-95 ${
                  contextSet
                    ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 border border-accent-200 dark:border-accent-800'
                    : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm disabled:opacity-50'
                }`}
              >
                {isUploading ? 'Extracting...' : contextSet ? '✅ Knowledge Loaded' : 'Inject Knowledge'}
              </button>
            </div>
          </div>

          {/* Connection */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-brand-50 dark:bg-brand-900/30 text-brand-600 flex items-center justify-center text-xs">
                <span className="font-bold">2</span>
              </div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Connection</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Initialize the live streaming avatar session.</p>
            
            {!isSessionActive ? (
              <button
                onClick={startAvatarSession}
                disabled={isConnecting}
                className="w-full py-2 bg-slate-900 dark:bg-brand-600 hover:bg-slate-800 dark:hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <><FaLink className="text-xs" /> Connect Tutor</>
                )}
              </button>
            ) : (
              <button
                onClick={endAvatarSession}
                className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
              >
                Disconnect Tutor
              </button>
            )}
          </div>

          {/* Tutor Message */}
          <div className="card p-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">AI Response</p>
            <p className={`text-sm font-medium leading-relaxed transition-all duration-500 ${isSessionActive ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
              {tutorMessage}
            </p>
          </div>
        </div>

        {/* Right Panel: Avatar & Voice */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Avatar Container */}
          <div className="card overflow-hidden relative flex-1 min-h-[400px] flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
            
            {/* Video/Avatar area */}
            <div className="relative w-full max-w-lg aspect-video mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg bg-slate-200 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              {!isSessionActive && !isConnecting ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3">
                    <FaRobot className="text-3xl text-slate-200 dark:text-slate-700" />
                  </div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Avatar Standby</span>
                </div>
              ) : isConnecting ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white">
                  <div className="w-10 h-10 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mb-3" />
                  <span className="text-xs text-brand-400 font-semibold uppercase tracking-widest">Initializing Tutor...</span>
                </div>
              ) : showIframe ? (
                <div className="absolute inset-0 w-full h-full bg-white">
                  <iframe 
                    src={embedUrl}
                    allow="microphone; camera" 
                    title="LiveAvatar Embed" 
                    className="w-full h-full border-none"
                    style={{ minHeight: '250px' }}
                  />
                </div>
              ) : (
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}

              {isSessionActive && (
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-accent-500 text-white text-[9px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-sm">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  Live Session
                </div>
              )}
            </div>
          </div>

          {/* Voice Control Bar */}
          <div className="card p-4 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={toggleListen}
              disabled={!isSessionActive}
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                !isSessionActive ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed' :
                isListening ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse' : 
                'bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-600/25'
              }`}
              title={isListening ? "Stop listening" : "Start speaking"}
            >
              {isListening ? <FaStop className="text-sm" /> : <FaMicrophone className="text-sm" />}
            </button>
            
            <div className="flex-1 w-full bg-slate-50 dark:bg-slate-800 rounded-lg p-3 min-h-[52px] border border-slate-100 dark:border-slate-700 flex items-center">
              <p className={`text-sm font-medium ${transcript || isListening ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                {isListening ? (transcript || 'Listening...') : (transcript || 'Tap the microphone to speak...')}
              </p>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
