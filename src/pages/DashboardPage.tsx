import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Scale, Clock, Trash2, ArrowRight, Plus, BarChart3, Shield, TrendingUp, FileText, Sparkles, AlertOctagon, FileSearch, Download, Printer, Settings2, X } from "lucide-react";
import { exportCaseLibraryPDF, type PageScale, type ExportSettings } from "@/lib/caseLibraryExport";
import { supabase } from "@/integrations/supabase/client";

import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import prolawLogo from "@/assets/prolaw-logo.jpeg";
import type { IngestedFacts } from "@/lib/documentParser";

interface Consultation {
  id: string;
  title: string;
  country: string;
  language: string;
  constitution: string;
  agent_mode: string;
  risk_score: number | null;
  confidence: number | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  messages: unknown[];
}

interface CaseDocument {
  id: string;
  filename: string;
  document_type: string | null;
  summary: string | null;
  facts: IngestedFacts;
  simulation_inputs: IngestedFacts["simulationInputs"] | null;
  ocr_used: boolean;
  file_size_kb: number | null;
  created_at: string;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showExportSettings, setShowExportSettings] = useState<null | "all" | "selected">(null);
  const [exportSettings, setExportSettings] = useState<{
    pageScale: PageScale;
    includeOcrNotes: boolean;
    includeRedFlags: boolean;
    redactRedFlags: boolean;
  }>({
    pageScale: "a4",
    includeOcrNotes: true,
    includeRedFlags: true,
    redactRedFlags: false,
  });

  const runExport = (mode: "all" | "selected") => {
    const docs = mode === "selected" ? documents.filter(d => selectedDocs.has(d.id)) : documents;
    if (!docs.length) return;
    exportCaseLibraryPDF(docs, {
      ...exportSettings,
      title: mode === "selected"
        ? `Selected ${docs.length} document${docs.length === 1 ? "" : "s"}`
        : "Full Case Library",
    });
    setShowExportSettings(null);
    toast({ title: "Export started", description: `PDF (${exportSettings.pageScale.toUpperCase()}) is downloading.` });
  };

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [consultsRes, docsRes] = await Promise.all([
      supabase.from("consultations").select("*").order("updated_at", { ascending: false }),
      supabase.from("case_documents").select("*").order("created_at", { ascending: false }),
    ]);

    if (consultsRes.error) {
      toast({ title: "Error", description: "Failed to load consultations", variant: "destructive" });
    } else {
      setConsultations((consultsRes.data || []).map(d => ({ ...d, messages: Array.isArray(d.messages) ? d.messages : [] })));
    }
    if (!docsRes.error && docsRes.data) {
      setDocuments(docsRes.data as unknown as CaseDocument[]);
    }
    setLoading(false);
  };

  const deleteConsultation = async (id: string) => {
    const { error } = await supabase.from("consultations").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } else {
      setConsultations(prev => prev.filter(c => c.id !== id));
      toast({ title: "Deleted", description: "Consultation removed." });
    }
  };

  const deleteDocument = async (id: string) => {
    const { error } = await supabase.from("case_documents").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    } else {
      setDocuments(prev => prev.filter(d => d.id !== id));
      setSelectedDocs(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast({ title: "Deleted", description: "Document removed." });
    }
  };

  const reapplyDocument = (doc: CaseDocument) => {
    if (!doc.simulation_inputs) {
      toast({ title: "No simulation inputs saved", description: "This document has no simulation profile.", variant: "destructive" });
      return;
    }
    sessionStorage.setItem("prolaw:pendingSimInputs", JSON.stringify(doc.simulation_inputs));
    sessionStorage.setItem("prolaw:pendingSimSource", doc.filename);
    toast({ title: "Loaded into chat", description: `${doc.filename} simulation inputs ready to apply.` });
    navigate("/chat");
  };

  const toggleDocSelect = (id: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      else toast({ title: "Compare up to 3 documents", description: "Deselect one first.", variant: "destructive" });
      return next;
    });
  };

  const compareSelected = documents.filter(d => selectedDocs.has(d.id));
  const getRiskColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score <= 30) return "text-green-400";
    if (score <= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const stats = {
    total: consultations.length,
    avgRisk: consultations.filter(c => c.risk_score !== null).reduce((s, c) => s + (c.risk_score || 0), 0) / (consultations.filter(c => c.risk_score !== null).length || 1),
    avgConfidence: consultations.filter(c => c.confidence !== null).reduce((s, c) => s + (c.confidence || 0), 0) / (consultations.filter(c => c.confidence !== null).length || 1),
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-panel rounded-none border-x-0 border-t-0 px-4 py-3 flex items-center gap-3">
        <img src={prolawLogo} alt="ProLAW" className="w-8 h-8 rounded-lg" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">ProLAW Dashboard</h2>
          <p className="text-[11px] text-muted-foreground">Case History</p>
        </div>
        <button onClick={() => navigate("/")} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1">
          <Plus className="w-3 h-3" /> New Chat
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Cases</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{stats.total}</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-muted-foreground">Avg Risk Score</span>
            </div>
            <span className={`text-2xl font-bold ${getRiskColor(Math.round(stats.avgRisk))}`}>{stats.total > 0 ? Math.round(stats.avgRisk) : "—"}</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Avg Confidence</span>
            </div>
            <span className="text-2xl font-bold text-green-400">{stats.total > 0 ? `${Math.round(stats.avgConfidence)}%` : "—"}</span>
          </motion.div>
        </div>

        {/* Consultations list */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Case History</h3>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-16">
              <Scale className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No consultations yet</p>
              <button onClick={() => navigate("/")} className="mt-3 text-primary text-sm hover:underline flex items-center gap-1 mx-auto">
                Start your first consultation <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {consultations.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-panel p-4 hover:bg-secondary/30 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/chat?consultation=${c.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground truncate">{c.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.country} • {c.agent_mode.replace(/-/g, " ")} • {(c.messages as any[]).length} messages
                      </p>
                      {c.summary && <p className="text-xs text-secondary-foreground mt-1 line-clamp-2">{c.summary}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {c.risk_score !== null && (
                        <span className={`text-xs font-mono font-bold ${getRiskColor(c.risk_score)}`}>
                          Risk: {c.risk_score}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(c.updated_at).toLocaleDateString()}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteConsultation(c.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Case Library — saved ingested documents */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-primary" /> Case Document Library
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saved ingested documents — revisit, compare side-by-side, and re-apply to new simulations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedDocs.size >= 2 && (
                <span className="text-[11px] px-2 py-1 rounded-md bg-primary/15 text-primary">
                  {selectedDocs.size} selected for compare
                </span>
              )}
              {documents.length > 0 && (
                <>
                  {selectedDocs.size > 0 && (
                    <button
                      onClick={() => exportCaseLibraryPDF(
                        documents.filter(d => selectedDocs.has(d.id)),
                        { title: `Selected ${selectedDocs.size} document${selectedDocs.size === 1 ? "" : "s"}` }
                      )}
                      className="text-[11px] px-2.5 py-1.5 rounded-md bg-primary/15 hover:bg-primary/25 text-primary flex items-center gap-1.5 transition-colors"
                      title="Export selected documents to PDF"
                    >
                      <Download className="w-3 h-3" /> Export Selected
                    </button>
                  )}
                  <button
                    onClick={() => exportCaseLibraryPDF(documents, { title: "Full Case Library" })}
                    className="text-[11px] px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 transition-colors shadow-lg shadow-primary/20"
                    title="Export entire library as printable PDF report"
                  >
                    <Printer className="w-3 h-3" /> Export Library PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="glass-panel p-6 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No saved documents yet</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Upload a PDF, DOCX, or scanned image in chat — facts and simulation inputs are saved here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((d, i) => {
                const isSelected = selectedDocs.has(d.id);
                return (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`glass-panel p-4 transition-all ${isSelected ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                          <h4 className="text-sm font-medium text-foreground truncate">{d.filename}</h4>
                          {d.ocr_used && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 shrink-0">OCR</span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {d.document_type || "Document"} • {d.file_size_kb ? `${d.file_size_kb} KB` : ""} • {new Date(d.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteDocument(d.id)}
                        className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {d.summary && (
                      <p className="text-xs text-secondary-foreground line-clamp-2 mb-2">{d.summary}</p>
                    )}

                    <div className="flex flex-wrap gap-1.5 mb-3 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground">
                        {d.facts?.parties?.length || 0} parties
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground">
                        {d.facts?.keyDates?.length || 0} dates
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground">
                        {d.facts?.monetaryAmounts?.length || 0} amounts
                      </span>
                      {(d.facts?.redFlags?.length || 0) > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 flex items-center gap-1">
                          <AlertOctagon className="w-2.5 h-2.5" /> {d.facts.redFlags.length} red flags
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => reapplyDocument(d)}
                        className="flex-1 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary flex items-center justify-center gap-1 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" /> Re-apply to Sim
                      </button>
                      <button
                        onClick={() => toggleDocSelect(d.id)}
                        className={`text-[11px] font-medium px-2 py-1.5 rounded-lg transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/50 hover:bg-secondary text-foreground"
                        }`}
                      >
                        {isSelected ? "Selected" : "Compare"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Comparison panel */}
          {compareSelected.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-4 mt-4"
            >
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Side-by-Side Comparison
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Metric</th>
                      {compareSelected.map(d => (
                        <th key={d.id} className="text-left py-2 pr-3 font-medium text-foreground truncate max-w-[180px]">
                          {d.filename}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-foreground">
                    {[
                      ["Document type", (d: CaseDocument) => d.document_type || "—"],
                      ["Parties", (d: CaseDocument) => String(d.facts?.parties?.length || 0)],
                      ["Key dates", (d: CaseDocument) => String(d.facts?.keyDates?.length || 0)],
                      ["Monetary amounts", (d: CaseDocument) => String(d.facts?.monetaryAmounts?.length || 0)],
                      ["Legal issues", (d: CaseDocument) => String(d.facts?.legalIssues?.length || 0)],
                      ["Red flags", (d: CaseDocument) => String(d.facts?.redFlags?.length || 0)],
                      ["Evidence strength", (d: CaseDocument) => d.simulation_inputs?.evidenceStrength?.toString() ?? "—"],
                      ["Documentation quality", (d: CaseDocument) => d.simulation_inputs?.documentationQuality?.toString() ?? "—"],
                      ["Opposition strength", (d: CaseDocument) => d.simulation_inputs?.oppositionStrength?.toString() ?? "—"],
                      ["Suggested venue", (d: CaseDocument) => d.simulation_inputs?.suggestedVenue ?? "—"],
                      ["Suggested strategy", (d: CaseDocument) => d.simulation_inputs?.suggestedStrategy ?? "—"],
                    ].map(([label, fn]) => (
                      <tr key={label as string} className="border-b border-border/50">
                        <td className="py-1.5 pr-3 text-muted-foreground">{label as string}</td>
                        {compareSelected.map(d => (
                          <td key={d.id} className="py-1.5 pr-3">{(fn as (d: CaseDocument) => string)(d)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => setSelectedDocs(new Set())}
                className="mt-3 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
