import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Scale, Clock, Trash2, ArrowRight, Plus, BarChart3, Shield, TrendingUp, FileText, Sparkles, AlertOctagon, FileSearch } from "lucide-react";
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
      </div>
    </div>
  );
};

export default DashboardPage;
