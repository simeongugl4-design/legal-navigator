import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Gavel, FileText, BookOpen, Lightbulb, BookMarked, AlertTriangle, FilePlus, Save } from "lucide-react";
import CaseSimulationVisuals from "@/components/chat/CaseSimulationVisuals";
import MessageActions from "@/components/chat/MessageActions";
import FollowUpSuggestions from "@/components/chat/FollowUpSuggestions";
import IngestedFactsCard from "@/components/chat/IngestedFactsCard";
import { extractTextFromFile, type IngestedFacts } from "@/lib/documentParser";
import { buildOcrLangs } from "@/lib/ocrLanguages";
import { useAppStore } from "@/store/appStore";
import { useNavigate, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

import { supabase } from "@/integrations/supabase/client";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import AgentModeSelector from "@/components/chat/AgentModeSelector";
import { agentModes } from "@/components/chat/agentModes";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  ingestedFacts?: IngestedFacts;
  ingestedFilename?: string;
}

const suggestedPrompts = [
  { icon: Gavel, text: "I was wrongfully terminated after reporting safety violations — build me a complete legal strategy to win" },
  { icon: FileText, text: "Analyze this employment contract clause by clause and rewrite all unfair terms" },
  { icon: Lightbulb, text: "My landlord is illegally evicting me — what are ALL my legal options including emergency relief?" },
  { icon: BookMarked, text: "I'm being sued for $500K breach of contract — build my defense with 3 different strategies" },
  { icon: AlertTriangle, text: "My business partner embezzled company funds — what legal actions can I take immediately?" },
  { icon: FilePlus, text: "Draft a cease and desist letter for intellectual property infringement" },
  { icon: Scale, text: "Predict outcome of my discrimination case and tell me when to settle vs fight" },
  { icon: BookOpen, text: "I was injured at work and my employer denies responsibility — solve this case for me" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prolaw-chat`;

const ChatPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const { selectedCountry, selectedLanguage, reset } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [agentMode, setAgentMode] = useState("legal-advisor");
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Load existing consultation if ID provided
  useEffect(() => {
    const id = searchParams.get("consultation");
    if (id) {
      loadConsultation(id);
    }
  }, [searchParams]);

  const loadConsultation = async (id: string) => {
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setConsultationId(id);
      setAgentMode(data.agent_mode);
      const msgs = Array.isArray(data.messages) ? data.messages : [];
      setMessages(msgs.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })));
    }
  };

  useEffect(() => {
    if (!selectedCountry || !selectedLanguage) {
      if (!searchParams.get("consultation")) navigate("/");
    }
  }, [selectedCountry, selectedLanguage, navigate, searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pending simulation inputs from Dashboard "Re-apply"
  useEffect(() => {
    const raw = sessionStorage.getItem("prolaw:pendingSimInputs");
    const source = sessionStorage.getItem("prolaw:pendingSimSource");
    if (!raw) return;
    try {
      const inputs = JSON.parse(raw);
      // Wait for SimulationLab to mount, then dispatch
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("prolaw:applySimInputs", { detail: inputs }));
        toast({
          title: "Simulation pre-loaded",
          description: source ? `Inputs from ${source} applied to the lab.` : "Saved inputs applied.",
        });
      }, 600);
    } catch (e) {
      console.warn("Bad pending sim inputs", e);
    } finally {
      sessionStorage.removeItem("prolaw:pendingSimInputs");
      sessionStorage.removeItem("prolaw:pendingSimSource");
    }
  }, [toast]);

  // Auto-save consultation
  const saveConsultation = useCallback(async () => {
    if (messages.length === 0 || !selectedCountry || !selectedLanguage) return;
    setIsSaving(true);

    // Extract title from first user message
    const firstUserMsg = messages.find(m => m.role === "user");
    const title = firstUserMsg ? firstUserMsg.content.slice(0, 80) : "Untitled";

    // Extract risk/confidence from last assistant message
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
    const riskMatch = lastAssistant?.content.match(/RISK_SCORE:\s*(\d+)/);
    const confMatch = lastAssistant?.content.match(/CONFIDENCE:\s*(\d+)/);

    const record = {
      user_id: "anonymous",
      title,
      country: selectedCountry.name,
      language: selectedLanguage.name,
      constitution: selectedCountry.constitutionName,
      agent_mode: agentMode,
      messages: messages.map(m => ({ id: m.id, role: m.role, content: m.content, timestamp: m.timestamp.toISOString() })),
      risk_score: riskMatch ? parseInt(riskMatch[1]) : null,
      confidence: confMatch ? parseInt(confMatch[1]) : null,
      summary: lastAssistant?.content.slice(0, 200) || null,
    };

    if (consultationId) {
      await supabase.from("consultations").update(record).eq("id", consultationId);
    } else {
      const { data } = await supabase.from("consultations").insert(record).select("id").single();
      if (data) setConsultationId(data.id);
    }

    setIsSaving(false);
    toast({ title: "Saved", description: "Consultation saved to your case history." });
  }, [messages, selectedCountry, selectedLanguage, agentMode, consultationId, toast]);

  const streamChat = useCallback(async (allMessages: { role: string; content: string }[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: allMessages,
        country: selectedCountry?.name,
        constitution: selectedCountry?.constitutionName,
        language: selectedLanguage?.name,
        mode: agentMode,
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      if (resp.status === 429) toast({ title: "Rate Limited", description: "Too many requests. Please wait a moment.", variant: "destructive" });
      else if (resp.status === 402) toast({ title: "Credits Exhausted", description: "Please add AI credits in Settings > Workspace > Usage.", variant: "destructive" });
      throw new Error(errorData.error || "Failed to get response");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantContent = "";
    const assistantId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIdx);
        buffer = buffer.slice(newlineIdx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            const finalContent = assistantContent;
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: finalContent } : m));
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    if (buffer.trim()) {
      for (let raw of buffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            const finalContent = assistantContent;
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: finalContent } : m));
          }
        } catch { /* ignore */ }
      }
    }
  }, [selectedCountry, selectedLanguage, agentMode, toast]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    const chatHistory = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
    try {
      await streamChat(chatHistory);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to get response", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const retryLastMessage = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (!lastUserMsg) return;
    setMessages(prev => {
      const idx = prev.length - 1;
      if (prev[idx]?.role === "assistant") return prev.slice(0, idx);
      return prev;
    });
    sendMessage(lastUserMsg.content);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        toast({ title: "Voice Input", description: "Voice recording captured." });
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      toast({ title: "Recording", description: "Listening... Click mic again to stop." });
    } catch {
      toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload files smaller than 20MB.", variant: "destructive" });
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `📎 Uploaded **${file.name}** (${(file.size / 1024).toFixed(0)} KB) — running ProLAW Document Intelligence...`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      let ocrUsed = false;
      let bilingualInfo: { scripts: string[]; segments: number; blocks?: { label: string; charCount: number }[] } | null = null;
      const ocrLangs = buildOcrLangs({
        selectedLanguageCode: selectedLanguage?.code,
        countryLanguageCodes: selectedCountry?.languages.map(l => l.code),
      });
      const text = await extractTextFromFile(file, (info) => {
        if (info.stage === "ocr") {
          ocrUsed = true;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            const ocrLine = info.page
              ? `🔍 OCR running on scanned page ${info.page}${info.totalPages ? ` of ${info.totalPages}` : ""} — languages: \`${ocrLangs}\`…`
              : `🔍 Running OCR on image — languages: \`${ocrLangs}\`…`;
            const newContent = `📎 Uploaded **${file.name}** (${(file.size / 1024).toFixed(0)} KB)\n\n${ocrLine}`;
            return [...prev.slice(0, -1), { ...last, content: newContent }];
          });
        }
        if (info.stage === "bilingual" && info.bilingual) {
          const labels = Array.from(new Set(info.bilingual.segments.map(s => s.label)));
          bilingualInfo = {
            scripts: labels,
            segments: info.bilingual.segments.length,
            blocks: info.bilingual.segments.map(s => ({ label: s.label, charCount: s.charCount })),
          };
          setMessages(prev => {
            const last = prev[prev.length - 1];
            const line = `🌐 **Multilingual document detected** — split into ${info.bilingual!.segments.length} blocks across scripts: ${labels.join(", ")}. Each language block will be analyzed independently for higher accuracy.`;
            const newContent = `📎 Uploaded **${file.name}** (${(file.size / 1024).toFixed(0)} KB)\n\n${line}`;
            return [...prev.slice(0, -1), { ...last, content: newContent }];
          });
        }
      }, { langs: ocrLangs });
      if (!text || text.trim().length < 20) {
        throw new Error("Could not extract readable text from this document, even with OCR. The scan may be too low-quality.");
      }
      if (ocrUsed) {
        toast({ title: "OCR applied", description: `Scanned content converted using languages: ${ocrLangs}` });
      }
      if (bilingualInfo) {
        toast({ title: "Bilingual split", description: `Detected ${(bilingualInfo as any).scripts.length} scripts — segmented for accurate extraction.` });
      }

      const { data, error } = await supabase.functions.invoke("prolaw-extract", {
        body: {
          documentText: text,
          filename: file.name,
          country: selectedCountry?.name,
          language: selectedLanguage?.name,
          bilingual: bilingualInfo,
        },
      });
      if (error) throw error;
      if (!data?.facts) throw new Error("No facts extracted");

      const facts = data.facts as IngestedFacts;
      // Attach bilingual segmentation info so it persists & renders in PDF exports
      if (bilingualInfo) {
        (facts as any).bilingual = bilingualInfo;
      }
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `**📄 Document ingested:** ${facts.documentType}\n\n${facts.summary}\n\nThe ProLAW Intelligence panel below has extracted parties, dates, monetary amounts, clauses, red flags, and AI-suggested simulation inputs. Click **Apply to Simulation** to autofill the lab, or ask a follow-up question.`,
        timestamp: new Date(),
        ingestedFacts: facts,
        ingestedFilename: file.name,
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Persist to case_documents if signed in (so user can revisit & re-apply)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: saveErr } = await supabase.from("case_documents").insert({
            user_id: user.id,
            filename: file.name,
            file_size_kb: Math.round(file.size / 1024),
            document_type: facts.documentType,
            summary: facts.summary,
            extracted_text: text.slice(0, 200_000),
            facts: facts as any,
            simulation_inputs: facts.simulationInputs as any,
            ocr_used: ocrUsed,
          });
          if (saveErr) console.warn("Failed to save case document", saveErr);
          else toast({ title: "Saved to your case library", description: "Revisit it any time from the Dashboard." });
        }
      } catch (e) {
        console.warn("Save skipped", e);
      }

      toast({ title: "Document ingested", description: `${facts.legalIssues.length} legal issues, ${facts.redFlags.length} red flags, ${facts.keyClauses.length} clauses extracted.` });
    } catch (err) {
      console.error(err);
      toast({ title: "Ingestion failed", description: err instanceof Error ? err.message : "Could not process document.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const exportChat = () => {
    const text = messages.map(m => `[${m.role.toUpperCase()}] ${m.timestamp.toLocaleString()}\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ProLAW_${selectedCountry?.name}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: "ProLAW Chat", text: messages.map(m => m.content).join("\n") });
  };

  const filteredMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  if (!selectedCountry || !selectedLanguage) return null;

  const currentMode = agentModes.find(m => m.id === agentMode);

  return (
    <div className="h-screen flex flex-col">
      <ChatHeader
        countryFlag={selectedCountry.flag}
        countryName={selectedCountry.name}
        languageName={selectedLanguage.name}
        constitutionName={selectedCountry.constitutionName}
        showSearch={showSearch}
        onToggleSearch={() => setShowSearch(!showSearch)}
        onExport={exportChat}
        onShare={handleShare}
        onReset={() => { setMessages([]); setConsultationId(null); }}
        onBack={() => { reset(); navigate("/"); }}
      />

      {/* Agent mode + save button row */}
      <div className="flex items-center gap-2 px-2">
        <div className="flex-1 overflow-x-auto">
          <AgentModeSelector activeMode={agentMode} onSelect={setAgentMode} />
        </div>
        <div className="flex items-center gap-1 shrink-0 pr-2">
          <button
            onClick={saveConsultation}
            disabled={isSaving || messages.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-40 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            History
          </button>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-border">
            <div className="px-4 py-2">
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search conversation..." className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" autoFocus />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-full gap-6 py-6">
            <div className="text-center max-w-2xl">
              <Scale className="w-10 h-10 text-primary mx-auto mb-3 animate-pulse-glow" />
              <h3 className="text-xl font-serif font-bold text-foreground">ProLAW — The Operating System of Law</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed px-2">
                A next-generation legal intelligence platform that fuses multi-jurisdiction reasoning, autonomous AI agents, and predictive analytics into one billion-dollar legal brain — researcher, litigator, forensic investigator, and managing partner working in parallel.
              </p>
              <p className="text-[11px] text-muted-foreground mt-3">
                <span className="text-primary font-semibold">{currentMode?.label}</span> mode • <span className="text-primary">{selectedCountry.constitutionName}</span> • {selectedLanguage.name}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {["🧠 6-Agent Council", "📊 Risk Scoring", "⚖️ Outcome Prediction", "💰 Settlement Math", "🌍 Jurisdiction Compare", "🔥 Leverage Stack", "⏱️ Timeline", "📄 Document Drafting"].map(c => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/60 text-secondary-foreground border border-border/40">{c}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {suggestedPrompts.map((prompt, i) => (
                <button key={i} onClick={() => sendMessage(prompt.text)} className="glass-panel p-3 text-left hover:bg-secondary/80 transition-colors group">
                  <prompt.icon className="w-4 h-4 text-primary mb-1.5 group-hover:scale-110 transition-transform" />
                  <p className="text-xs text-secondary-foreground">{prompt.text}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {filteredMessages.map((msg, idx) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "glass-panel rounded-bl-md"}`}>
                  {msg.role === "assistant" ? (
                    <>
                      <div className="prose prose-sm prose-invert max-w-none text-sm [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_li]:text-secondary-foreground [&_p]:text-secondary-foreground [&_hr]:border-border [&_code]:text-primary [&_a]:text-primary">
                        <ReactMarkdown>{msg.content
                          .replace(/RISK_SCORE:.*\n?/g, "")
                          .replace(/CONFIDENCE:.*\n?/g, "")
                          .replace(/OUTCOME_PREDICTIONS:\n([\s\S]*?)(?=\n\n|CASE_TIMELINE:|STRENGTH_ANALYSIS:|COST_ESTIMATE:|SETTLEMENT_RANGE:|JUDGE_FACTORS:|MULTI_AGENT_COUNCIL:|LEVERAGE_STACK:|JURISDICTION_COMPARISON:|$)/g, "")
                          .replace(/CASE_TIMELINE:\n([\s\S]*?)(?=\n\n##|STRENGTH_ANALYSIS:|COST_ESTIMATE:|SETTLEMENT_RANGE:|JUDGE_FACTORS:|MULTI_AGENT_COUNCIL:|LEVERAGE_STACK:|JURISDICTION_COMPARISON:|$)/g, "")
                          .replace(/STRENGTH_ANALYSIS:\n([\s\S]*?)(?=\n\n|COST_ESTIMATE:|SETTLEMENT_RANGE:|JUDGE_FACTORS:|MULTI_AGENT_COUNCIL:|LEVERAGE_STACK:|JURISDICTION_COMPARISON:|$)/g, "")
                          .replace(/COST_ESTIMATE:\n([\s\S]*?)(?=\n\n|SETTLEMENT_RANGE:|JUDGE_FACTORS:|MULTI_AGENT_COUNCIL:|LEVERAGE_STACK:|JURISDICTION_COMPARISON:|$)/g, "")
                          .replace(/SETTLEMENT_RANGE:\n([\s\S]*?)(?=\n\n|JUDGE_FACTORS:|MULTI_AGENT_COUNCIL:|LEVERAGE_STACK:|JURISDICTION_COMPARISON:|$)/g, "")
                          .replace(/JUDGE_FACTORS:\n([\s\S]*?)(?=\n\n|MULTI_AGENT_COUNCIL:|LEVERAGE_STACK:|JURISDICTION_COMPARISON:|$)/g, "")
                          .replace(/MULTI_AGENT_COUNCIL:\n([\s\S]*?)(?=\n\n|LEVERAGE_STACK:|JURISDICTION_COMPARISON:|CITATION_AUDIT:|$)/g, "")
                          .replace(/LEVERAGE_STACK:\n([\s\S]*?)(?=\n\n|JURISDICTION_COMPARISON:|CITATION_AUDIT:|$)/g, "")
                          .replace(/JURISDICTION_COMPARISON:\n([\s\S]*?)(?=\n\n|CITATION_AUDIT:|$)/g, "")
                          .replace(/CITATION_AUDIT:\n([\s\S]*?)(?=\n\n##|\n\nEnd with|$)/g, "")
                        }</ReactMarkdown>
                      </div>
                      <CaseSimulationVisuals content={msg.content} />
                      {msg.ingestedFacts && (
                        <div className="mt-3">
                          <IngestedFactsCard
                            facts={msg.ingestedFacts}
                            filename={msg.ingestedFilename || "document"}
                            onApplyToSimulation={() => {
                              window.dispatchEvent(new CustomEvent("prolaw:applySimInputs", { detail: msg.ingestedFacts!.simulationInputs }));
                              toast({ title: "Applied", description: "Simulation Lab updated with extracted inputs. Scroll up to adjust." });
                            }}
                            onAskQuestion={(q) => sendMessage(q)}
                          />
                        </div>
                      )}
                      <MessageActions
                        content={msg.content}
                        onRetry={idx === filteredMessages.length - 1 ? retryLastMessage : undefined}
                      />
                    </>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                  <p className={`text-[10px] mt-2 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            ))}

            {!isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && (
              <FollowUpSuggestions agentMode={agentMode} onSelect={sendMessage} />
            )}
          </>
        )}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="glass-panel rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-muted-foreground">{currentMode?.label} • 6-agent council deliberating...</span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        isRecording={isRecording}
        onSend={sendMessage}
        onToggleRecording={toggleRecording}
        onFileUpload={handleFileUpload}
      />
    </div>
  );
};

export default ChatPage;
