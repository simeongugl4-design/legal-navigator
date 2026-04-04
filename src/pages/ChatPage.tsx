import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Gavel, FileText, BookOpen, Lightbulb, BookMarked, AlertTriangle, FilePlus, Save } from "lucide-react";
import CaseSimulationVisuals from "@/components/chat/CaseSimulationVisuals";
import MessageActions from "@/components/chat/MessageActions";
import FollowUpSuggestions from "@/components/chat/FollowUpSuggestions";
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
}

const suggestedPrompts = [
  { icon: Gavel, text: "What are my fundamental rights under the constitution?" },
  { icon: FileText, text: "Analyze this employment contract for risks and loopholes" },
  { icon: BookOpen, text: "What amendments protect property rights?" },
  { icon: Lightbulb, text: "I have a court case - help me build a defense strategy" },
  { icon: BookMarked, text: "Simulate a court case about wrongful termination" },
  { icon: AlertTriangle, text: "What are my rights if I am arrested by police?" },
  { icon: FilePlus, text: "Draft a legal demand letter for breach of contract" },
  { icon: Scale, text: "Predict the outcome of my employment dispute case" },
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload files smaller than 10MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      sendMessage(`[Uploaded file: ${file.name}]\n\nAnalyze this document under ${selectedCountry?.constitutionName}. Provide clause-by-clause analysis, risk assessment, and recommendations:\n\n${content.slice(0, 5000)}`);
    };
    reader.readAsText(file);
    e.target.value = "";
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
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center">
              <Scale className="w-10 h-10 text-primary mx-auto mb-3 animate-pulse-glow" />
              <h3 className="text-lg font-serif font-bold text-foreground">ProLAW Ready</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                <span className="text-primary">{currentMode?.label}</span> mode • Connected to <span className="text-primary">{selectedCountry.constitutionName}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {selectedLanguage.name} • 📊 Risk Scoring • ⚖️ Case Simulation • 🔮 Predictions • ⏱️ Timeline • 📄 Document Drafting
              </p>
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
                        <ReactMarkdown>{msg.content.replace(/RISK_SCORE:.*\n?/g, "").replace(/CONFIDENCE:.*\n?/g, "").replace(/OUTCOME_PREDICTIONS:\n([\s\S]*?)(?=\n\n|CASE_TIMELINE:|STRENGTH_ANALYSIS:|COST_ESTIMATE:|SETTLEMENT_RANGE:|JUDGE_FACTORS:|$)/g, "").replace(/CASE_TIMELINE:\n([\s\S]*?)(?=\n\n##|STRENGTH_ANALYSIS:|COST_ESTIMATE:|SETTLEMENT_RANGE:|JUDGE_FACTORS:|$)/g, "").replace(/STRENGTH_ANALYSIS:\n([\s\S]*?)(?=\n\n|COST_ESTIMATE:|SETTLEMENT_RANGE:|JUDGE_FACTORS:|$)/g, "").replace(/COST_ESTIMATE:\n([\s\S]*?)(?=\n\n|SETTLEMENT_RANGE:|JUDGE_FACTORS:|$)/g, "").replace(/SETTLEMENT_RANGE:\n([\s\S]*?)(?=\n\n|JUDGE_FACTORS:|$)/g, "").replace(/JUDGE_FACTORS:\n([\s\S]*?)(?=\n\n|$)/g, "")}</ReactMarkdown>
                      </div>
                      <CaseSimulationVisuals content={msg.content} />
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
                <span className="text-xs text-muted-foreground">{currentMode?.label} analyzing...</span>
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
