import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  Calendar, 
  AlertCircle, 
  Trash2, 
  HelpCircle, 
  Send, 
  MessageSquare, 
  Clock, 
  ArrowRight, 
  Search, 
  Sparkles, 
  Copy, 
  Download, 
  RefreshCw, 
  Layers, 
  ExternalLink, 
  ShieldAlert, 
  Lightbulb,
  Briefcase,
  TrendingUp,
  FileCheck,
  ChevronRight,
  Info
} from "lucide-react";
import { exportReportToDocx } from "./lib/docxExporter";

interface MarketAttribution {
  entreprise: string;
  marcheObtenu: string;
  client: string;
  montant: string;
  statut: string;
  page: string;
}

interface MarketOpportunity {
  client: string;
  objet: string;
  echeance: string;
  action: string;
  details: string;
  page: string;
}

interface StructuredReportData {
  dateRapport: string;
  analyseConcurrence: string;
  attributions: MarketAttribution[];
  opportunites: MarketOpportunity[];
  alertes: string[];
  recommandation: string;
}

interface SavedReport {
  id: string;
  dateRapport: string;
  rawData: StructuredReportData;
  markdown: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: Date;
}

const reportMarkdownComponents = {
  strong: ({ children, ...props }: any) => {
    const text = String(children || "");
    if (text === "COMPTE RENDU — VEILLE DES MARCHÉS PUBLICS") {
      return (
        <span className="block text-center text-lg font-extrabold text-[#1B365D] uppercase tracking-tight my-4" {...props}>
          {children}
        </span>
      );
    }
    if (text.startsWith("Date du")) {
      return (
        <span className="block text-center text-xs font-bold text-[#1B365D] tracking-wider mb-6" {...props}>
          {children}
        </span>
      );
    }
    if (
      text.startsWith("1.") ||
      text.startsWith("2.") ||
      text.startsWith("3.") ||
      text.startsWith("4.")
    ) {
      return (
        <span className="block w-full bg-[#1B365D] text-white font-bold text-[11px] uppercase tracking-wider px-4 py-2.5 my-5 shadow-xs rounded-xs" {...props}>
          {children}
        </span>
      );
    }
    if (text === "Recommandation") {
      return (
        <span className="block text-xs font-extrabold text-[#1B365D] uppercase tracking-wider mt-6 mb-2" {...props}>
          Recommandation
        </span>
      );
    }
    return <strong className="font-bold text-slate-900" {...props}>{children}</strong>;
  },
  p: ({ children, ...props }: any) => {
    return <p className="mb-4 text-slate-700 leading-relaxed text-xs" {...props}>{children}</p>;
  },
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto my-6 border border-slate-200 shadow-xs rounded-lg">
      <table className="min-w-full border-collapse" {...props}>{children}</table>
    </div>
  ),
  thead: ({ children, ...props }: any) => (
    <thead className="bg-[#1B365D] text-white uppercase text-[10px] font-bold tracking-wider" {...props}>{children}</thead>
  ),
  tbody: ({ children, ...props }: any) => (
    <tbody className="divide-y divide-slate-200 bg-white" {...props}>{children}</tbody>
  ),
  tr: ({ children, ...props }: any) => (
    <tr className="hover:bg-slate-50 transition-colors" {...props}>{children}</tr>
  ),
  th: ({ children, ...props }: any) => (
    <th className="px-4 py-2.5 text-left border border-slate-200 text-white font-bold text-[10px]" {...props}>{children}</th>
  ),
  td: ({ children, ...props }: any) => (
    <td className="px-4 py-2.5 border border-slate-200 text-xs text-slate-700 font-medium" {...props}>{children}</td>
  ),
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="border-l-4 border-[#0891b2] bg-[#E0F7FA]/40 text-cyan-950 p-4 my-4 font-medium rounded-r-lg shadow-2xs italic text-xs leading-relaxed" {...props}>
      {children}
    </blockquote>
  ),
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc pl-5 mb-4 text-slate-700 space-y-1.5" {...props}>{children}</ul>
  ),
  li: ({ children, ...props }: any) => (
    <li className="text-xs text-slate-600 leading-relaxed" {...props}>{children}</li>
  )
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"generation" | "historique">("generation");
  
  // Generation States
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<{
    data: StructuredReportData;
    markdown: string;
  } | null>(null);
  
  // History States
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Chat Q&A States
  const [chatQuestion, setChatQuestion] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      sender: "assistant",
      text: "Bonjour ! Je suis votre Assistant de Veille IA. Je peux répondre à vos questions sur l'historique de tous les marchés publics enregistrés (ex: 'Quels marchés PRODITEK a-t-il remportés ?', 'Quelles échéances d'appels d'offres approchent ?', 'Compare les attributions informatique de ce mois'). Je citerai systématiquement les dates des rapports sources.",
      timestamp: new Date()
    }
  ]);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const dragOverRef = useRef<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // Scroll chat to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch("/api/reports");
      if (response.ok) {
        const data = await response.json();
        setSavedReports(data);
        if (data.length > 0 && !selectedReport) {
          setSelectedReport(data[0]);
        }
      } else {
        console.error("Failed to load report history");
      }
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setGenerationError("Veuillez sélectionner uniquement un fichier PDF (Quotidien des Marchés Publics).");
      return;
    }
    
    setGenerationError(null);
    setUploadedFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(",")[1];
      setFileBase64(base64String);
    };
    reader.onerror = () => {
      setGenerationError("Erreur lors de la lecture du fichier.");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleGenerateReport = async () => {
    if (!fileBase64) {
      setGenerationError("Veuillez d'abord téléverser le document PDF du quotidien.");
      return;
    }

    setIsProcessing(true);
    setGenerationError(null);
    setGeneratedReport(null);
    
    // Animate processing steps for interactive premium feel
    const steps = [
      "Ouverture et déchiffrage du PDF par l'IA...",
      "Extraction des données textuelles...",
      "Filtrage des secteurs INFORMATIQUE & ÉNERGIE au Burkina Faso...",
      "Identification des attributions et opportunités d'appels d'offres...",
      "Validation structurée des données financières et échéances...",
      "Génération du compte rendu de veille final..."
    ];

    let currentStepIdx = 0;
    setProcessingStep(steps[currentStepIdx]);
    
    const stepInterval = setInterval(() => {
      if (currentStepIdx < steps.length - 1) {
        currentStepIdx++;
        setProcessingStep(steps[currentStepIdx]);
      }
    }, 4000);

    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: fileBase64,
          mimeType: "application/pdf",
          fileName: uploadedFile?.name || "quotidien.pdf"
        })
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || "Erreur lors de l'analyse.");
      }

      const reportResult = await response.json();
      
      setGeneratedReport({
        data: reportResult.data,
        markdown: reportResult.markdown
      });

      // Automatically save to database as requested
      setIsSaving(true);
      const saveResponse = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRapport: reportResult.data.dateRapport,
          rawData: reportResult.data,
          markdown: reportResult.markdown
        })
      });

      if (saveResponse.ok) {
        const saveResult = await saveResponse.json();
        // Refresh history to include this new report
        await fetchHistory();
      } else {
        console.error("Failed to auto-save report to history");
      }
      
    } catch (err: any) {
      clearInterval(stepInterval);
      setGenerationError(err.message || "Une erreur inconnue est survenue lors du traitement.");
    } finally {
      setIsProcessing(false);
      setIsSaving(false);
    }
  };

  const executeDeleteReport = async (id: string) => {
    try {
      // Optimistically update the local state first
      setSavedReports((prevReports) => {
        const remaining = prevReports.filter(r => r.id !== id);
        
        // Update selected report safely based on the latest state
        setSelectedReport((currentSelected) => {
          if (currentSelected?.id === id) {
            return remaining.length > 0 ? remaining[0] : null;
          }
          return currentSelected;
        });
        
        return remaining;
      });

      const response = await fetch(`/api/reports/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        console.error("Erreur lors de la suppression sur le serveur.");
        fetchHistory();
      }
    } catch (err) {
      console.error("Error deleting report:", err);
      fetchHistory();
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadDocx = (data: StructuredReportData) => {
    exportReportToDocx(data);
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text: chatQuestion,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMsg]);
    const currentQuestion = chatQuestion;
    setChatQuestion("");
    setIsAsking(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion })
      });

      if (response.ok) {
        const result = await response.json();
        const assistantMsg: ChatMessage = {
          id: Math.random().toString(),
          sender: "assistant",
          text: result.answer,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, assistantMsg]);
      } else {
        throw new Error("Impossible de joindre l'assistant.");
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: "assistant",
        text: `Désolé, une erreur s'est produite lors de la génération de la réponse : ${err.message || "Erreur de connexion"}.`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  const sendQuickPrompt = (prompt: string) => {
    setChatQuestion(prompt);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 font-sans text-slate-900 overflow-hidden" id="app_root">
      
      {/* Sidebar - Sleek Interface Theme */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0 border-r border-slate-800" id="app_sidebar">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Consulting Group</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Marché Scan</h1>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Veille des Marchés Publics</p>
        </div>
        
        {/* Navigation Sidebar Menus */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab("generation")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all cursor-pointer ${
              activeTab === "generation"
                ? "bg-blue-600/10 text-blue-400 rounded-lg border border-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-white transition-colors"
            }`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span className="text-sm font-medium">Nouveau Rapport</span>
          </button>
          
          <button
            onClick={() => setActiveTab("historique")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all cursor-pointer ${
              activeTab === "historique"
                ? "bg-blue-600/10 text-blue-400 rounded-lg border border-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-white transition-colors"
            }`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-sm font-medium flex-1">Historique & IA</span>
            {savedReports.length > 0 && (
              <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {savedReports.length}
              </span>
            )}
          </button>
        </nav>

        {/* Sidebar Monthly Stats Box */}
        <div className="p-4 mt-auto">
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-tight">Statistiques du mois</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-bold text-white">{savedReports.length}</p>
                <p className="text-[10px] text-slate-400">Marchés Archivés</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-yellow-500">Actif</p>
                <p className="text-[10px] text-slate-400">Gemini IA</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50" id="app_main">
        {/* Header bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0" id="app_header">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">PROCESSEUR PDF v2.4</span>
            <h2 className="text-sm font-medium text-slate-500 italic uppercase tracking-widest hidden md:inline-block">
              Veille des Marchés Publics Burkina Faso
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs">Serveur Gemini Connecté</span>
            </div>
            
            {(activeTab === "generation" ? generatedReport : selectedReport) && (
              <button
                onClick={() => {
                  const reportData = activeTab === "generation" ? generatedReport?.data : selectedReport?.rawData;
                  if (reportData) handleDownloadDocx(reportData);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                Télécharger format Word (.docx)
              </button>
            )}
          </div>
        </header>

        {/* Dynamic content scrollable area */}
        <div className="flex-1 overflow-y-auto p-8" id="working_area">
          
          {/* TAB 1: GENERATION WORKSPACE */}
          {activeTab === "generation" && (
            <div className="grid grid-cols-12 gap-8 items-start" id="generation_workspace">
              
              {/* Left column: Upload form & Context (col-span-4) */}
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                
                {/* Upload Zone Card */}
                <div
                  id="dropzone"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`bg-white rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center group hover:border-blue-400 transition-all duration-300 min-h-[300px] ${
                    isDragOver
                      ? "border-blue-500 bg-blue-50/20"
                      : "border-slate-300"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf"
                    className="hidden"
                  />
                  
                  {uploadedFile ? (
                    <div className="text-center space-y-4 w-full">
                      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2 mx-auto">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div className="px-2">
                        <h3 className="font-bold text-slate-800 text-sm truncate max-w-full">
                          {uploadedFile.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {(uploadedFile.size / (1024 * 1024)).toFixed(2)} Mo • PDF
                        </p>
                      </div>
                      
                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          onClick={handleGenerateReport}
                          disabled={isProcessing}
                          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Analyse...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-yellow-400" />
                              Lancer l'Analyse
                            </>
                          )}
                        </button>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFile(null);
                            setFileBase64("");
                            setGeneratedReport(null);
                          }}
                          className="text-xs text-red-500 hover:text-red-700 font-medium underline inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Changer de fichier
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full cursor-pointer" onClick={triggerFileSelect}>
                      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                      </div>
                      <h3 className="font-bold text-slate-800">Déposer le Quotidien</h3>
                      <p className="text-xs text-slate-500 mt-1">Format PDF uniquement (max 50Mo)</p>
                      <span className="mt-4 px-3 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        SÉLECTIONNER LE FICHIER
                      </span>
                    </div>
                  )}
                </div>

                {/* Criteria side card matching design layout */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
                  <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-widest">
                    Critères de Veille IA
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-xs font-bold text-blue-600 uppercase mb-1">💻 INFORMATIQUE & RÉSEAUX</p>
                      <p className="text-xs text-slate-600">Recherche de serveurs, maintenance d'applications, onduleurs, réseaux d'entreprises.</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-xs font-bold text-yellow-600 uppercase mb-1">⚡ ÉNERGIE & SOLAIRE</p>
                      <p className="text-xs text-slate-600">Recherche d'équipements solaires, câblage, et contrats d'énergie au Burkina Faso.</p>
                    </div>
                  </div>
                </div>

                {generationError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{generationError}</span>
                  </div>
                )}
              </div>

              {/* Right column: Generated output preview (col-span-8) */}
              <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                
                {isProcessing && (
                  <div className="bg-slate-900 text-white rounded-2xl p-8 shadow-xl text-center space-y-4">
                    <div className="relative w-12 h-12 mx-auto">
                      <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-t-yellow-500 animate-spin"></div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">Analyse intelligente en cours</h4>
                      <p className="text-xs text-slate-400 mt-1 font-mono">{processingStep}</p>
                    </div>
                  </div>
                )}

                {generatedReport ? (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col overflow-hidden">
                    {/* Report Header Block */}
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Document Généré</span>
                        <span className="text-sm font-bold text-slate-800 uppercase">Compte Rendu — Veille des Marchés Publics</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-slate-400">Date du {generatedReport.data.dateRapport}</span>
                        <button
                          onClick={() => handleDownloadDocx(generatedReport.data)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                        >
                          <Download className="w-3 h-3" />
                          Télécharger Word (.docx)
                        </button>
                      </div>
                    </div>

                    {/* Report Body */}
                    <div className="p-10 text-[13px] leading-relaxed text-slate-700 relative">
                      <p className="italic mb-6 text-slate-500 border-l-2 border-yellow-500 pl-4">
                        Secteurs Informatique & Énergie uniquement.
                      </p>

                      <div className="markdown-body">
                        <ReactMarkdown components={reportMarkdownComponents}>{generatedReport.markdown}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ) : (
                  !isProcessing && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-12 text-center flex flex-col items-center justify-center min-h-[450px]">
                      <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-4">
                        <FileText className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-base">Aucun Rapport Généré</h3>
                      <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                        Sélectionnez un document PDF à gauche et cliquez sur "Lancer l'Analyse" pour générer et stocker la veille du jour.
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HISTORY & CHAT ASSISTANT */}
          {activeTab === "historique" && (
            <div className="grid grid-cols-12 gap-8 items-start" id="history_workspace">
              
              {/* Left Column: Report List (col-span-4) */}
              <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col max-h-[750px]">
                <div className="mb-4">
                  <h3 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-widest">
                    Rapports Enregistrés
                  </h3>
                  <p className="text-xs text-slate-500">Sélectionnez un rapport pour l'afficher ou l'interroger.</p>
                </div>

                {isLoadingHistory ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span className="text-[10px] font-mono">Chargement...</span>
                  </div>
                ) : savedReports.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Aucun rapport enregistré dans l'historique.
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-[550px] pr-1">
                    {savedReports.map((report) => (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left space-y-2 ${
                          selectedReport?.id === report.id
                            ? "bg-slate-900 border-slate-800 text-white"
                            : "bg-slate-50 border-slate-100 text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {report.dateRapport}
                          </span>
                          
                          {deletingId === report.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  executeDeleteReport(report.id);
                                }}
                                className="px-2 py-0.5 text-[9px] font-extrabold bg-red-600 hover:bg-red-700 text-white rounded-md transition-all active:scale-95"
                              >
                                Oui
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(null);
                                }}
                                className="px-2 py-0.5 text-[9px] font-extrabold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition-all active:scale-95"
                              >
                                Non
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(report.id);
                              }}
                              className={`p-1 rounded transition-colors ${
                                selectedReport?.id === report.id
                                  ? "text-slate-400 hover:text-red-400 hover:bg-slate-800"
                                  : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                              }`}
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className={`text-[9px] font-medium px-2 py-0.5 rounded ${
                            selectedReport?.id === report.id
                              ? "bg-slate-800 text-slate-300"
                              : "bg-slate-200/70 text-slate-700"
                          }`}>
                            {report.rawData?.attributions?.length || 0} Attributions
                          </span>
                          <span className={`text-[9px] font-medium px-2 py-0.5 rounded ${
                            selectedReport?.id === report.id
                              ? "bg-blue-900/40 text-blue-300"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {report.rawData?.opportunites?.length || 0} Opportunités
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Active report content & Q&A Chat (col-span-8) */}
              <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                
                {selectedReport ? (
                  <>
                    {/* Active report visual viewer */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col overflow-hidden max-h-[450px]">
                      <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl shrink-0">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Rapport Archivé</span>
                          <span className="text-sm font-bold text-slate-800 uppercase">Compte Rendu — {selectedReport.dateRapport}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyToClipboard(selectedReport.markdown)}
                            className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            {isCopied ? "Copié !" : "Copier le texte"}
                          </button>
                          <button
                            onClick={() => handleDownloadDocx(selectedReport.rawData)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Télécharger Word (.docx)
                          </button>
                        </div>
                      </div>

                      <div className="p-8 overflow-y-auto text-[13px] leading-relaxed text-slate-700 markdown-body">
                        <ReactMarkdown components={reportMarkdownComponents}>{selectedReport.markdown}</ReactMarkdown>
                      </div>
                    </div>

                    {/* Chat assistant panel with exact Sleek Interface styles */}
                    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-lg h-[350px] flex flex-col overflow-hidden shrink-0">
                      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5">
                          <div className="bg-blue-500 text-white p-1 rounded-lg">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">Assistant de Veille IA</h4>
                            <p className="text-[10px] text-slate-400">Interrogation de l'historique des marchés</p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-slate-700 text-yellow-500 font-mono px-2 py-0.5 rounded">
                          {savedReports.length} rapports chargés
                        </span>
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                                msg.sender === "user"
                                  ? "bg-blue-600 text-white rounded-br-none"
                                  : "bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none"
                              }`}
                            >
                              {msg.sender === "assistant" ? (
                                <div className="markdown-body text-slate-200 text-xs leading-relaxed prose-invert">
                                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                                </div>
                              ) : (
                                <p>{msg.text}</p>
                              )}
                            </div>
                          </div>
                        ))}
                        {isAsking && (
                          <div className="flex justify-start">
                            <div className="bg-slate-800 border border-slate-700 rounded-xl rounded-bl-none p-3 max-w-[85%] text-xs text-slate-300 flex items-center gap-2">
                              <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={chatBottomRef} />
                      </div>

                      {/* Prompt Suggestions */}
                      {chatMessages.length === 1 && savedReports.length > 0 && (
                        <div className="px-4 py-2 bg-slate-800/40 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto shrink-0 whitespace-nowrap">
                          <span className="text-[9px] text-slate-400 font-bold shrink-0">Suggestions :</span>
                          <button
                            type="button"
                            onClick={() => sendQuickPrompt("Quels marchés PRODITEK a-t-il remportés ce mois-ci ?")}
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 py-1 px-2 rounded-md transition-all shrink-0 cursor-pointer"
                          >
                            Marchés PRODITEK ?
                          </button>
                          <button
                            type="button"
                            onClick={() => sendQuickPrompt("Quelles échéances d'appels d'offres approchent ?")}
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 py-1 px-2 rounded-md transition-all shrink-0 cursor-pointer"
                          >
                            Échéances ?
                          </button>
                        </div>
                      )}

                      {/* Chat Input form */}
                      <form onSubmit={handleAskQuestion} className="bg-slate-800 p-2.5 flex items-center gap-2 shrink-0 border-t border-slate-700">
                        <input
                          type="text"
                          value={chatQuestion}
                          onChange={(e) => setChatQuestion(e.target.value)}
                          placeholder="Posez votre question sur l'historique des marchés..."
                          disabled={isAsking}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={!chatQuestion.trim() || isAsking}
                          className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-12 text-center flex flex-col items-center justify-center min-h-[450px]">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-4">
                      <Layers className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">Aucun Rapport Sélectionné</h3>
                    <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                      Veuillez choisir l'un des rapports enregistrés dans l'historique de gauche pour consulter son résumé de veille et utiliser l'Assistant IA.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
