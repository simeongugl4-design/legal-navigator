import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Search, Mic, MicOff, Scale, Globe, ArrowLeft, RotateCcw, BookOpen, Gavel, FileText, Lightbulb } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import prolawLogo from "@/assets/prolaw-logo.jpeg";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestedPrompts = [
  { icon: Gavel, text: "What are my rights if arrested?" },
  { icon: FileText, text: "Explain freedom of speech in my constitution" },
  { icon: BookOpen, text: "What amendments protect property rights?" },
  { icon: Lightbulb, text: "How to file a constitutional complaint?" },
];

const ChatPage = () => {
  const navigate = useNavigate();
  const { selectedCountry, selectedLanguage, reset } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedCountry || !selectedLanguage) {
      navigate("/");
    }
  }, [selectedCountry, selectedLanguage, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateResponse = (userMessage: string): string => {
    const country = selectedCountry?.name || "your country";
    const constitution = selectedCountry?.constitutionName || "your constitution";
    const lang = selectedLanguage?.name || "your language";

    // Simulated legal AI response
    return `## Legal Analysis — ${constitution}

Based on your query regarding: **"${userMessage}"**

### Constitutional Framework
Under the ${constitution}, the following provisions are relevant to your case:

**Applicable Sections & Articles:**
- **Article/Section [Relevant Number]**: This provision establishes the fundamental right related to your query under ${country}'s legal framework.
- **Amendment [Number]**: Provides additional protections and clarifications.

### Legal Strategy & Recommendations

1. **Primary Defense**: Invoke the constitutional guarantee under the relevant article that protects your rights in this matter.
2. **Supporting Acts**: Reference the specific legislative acts that implement this constitutional provision.
3. **Precedent Cases**: Courts in ${country} have historically ruled in favor of citizens on similar matters.

### Key Legal Terms to Use
- **Constitutional Right**: The fundamental right guaranteed by ${constitution}
- **Due Process**: Your right to fair legal proceedings
- **Legal Standing**: Your qualification to bring this case before a court

### Action Steps
1. Document all evidence related to your case
2. File your complaint with the appropriate court
3. Reference the specific constitutional articles mentioned above
4. Consider engaging a licensed attorney in ${country}

---
*⚖️ This analysis is based on ${constitution} and provided in ${lang}. Always consult a licensed legal professional for official legal advice.*`;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response delay
    await new Promise((r) => setTimeout(r, 1500));
    const response = generateResponse(text.trim());
    setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: response, timestamp: new Date() }]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const toggleRecording = () => setIsRecording(!isRecording);

  const filteredMessages = searchQuery
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  if (!selectedCountry || !selectedLanguage) return null;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="glass-panel rounded-none border-x-0 border-t-0 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => { reset(); navigate("/"); }} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <img src={prolawLogo} alt="ProLAW" className="w-8 h-8 rounded-lg" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">ProLAW</h2>
          <p className="text-[11px] text-muted-foreground truncate">
            {selectedCountry.flag} {selectedCountry.name} • {selectedLanguage.name} • {selectedCountry.constitutionName}
          </p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <Search className="w-4 h-4" />
          </button>
          <button onClick={() => { setMessages([]); }} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-border">
            <div className="px-4 py-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversation..."
                className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
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
              <h3 className="text-lg font-serif font-bold text-foreground">Legal AI Ready</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Connected to {selectedCountry.constitutionName}. Ask about your rights, laws, or describe your case.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt.text)}
                  className="glass-panel p-3 text-left hover:bg-secondary/80 transition-colors group"
                >
                  <prompt.icon className="w-4 h-4 text-primary mb-1.5 group-hover:scale-110 transition-transform" />
                  <p className="text-xs text-secondary-foreground">{prompt.text}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "glass-panel rounded-bl-md"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none text-sm [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_li]:text-secondary-foreground [&_p]:text-secondary-foreground [&_hr]:border-border">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
                <p className={`text-[10px] mt-2 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          ))
        )}

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="glass-panel rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx,.txt,.jpg,.png" />
          <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0">
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 glass-panel flex items-end gap-1 px-3 py-1.5">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Describe your legal case or question...`}
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none py-1.5 max-h-32"
              style={{ minHeight: "36px" }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "36px";
                t.style.height = t.scrollHeight + "px";
              }}
            />
          </div>
          <button
            onClick={toggleRecording}
            className={`p-2.5 rounded-xl transition-colors shrink-0 ${
              isRecording ? "bg-destructive text-destructive-foreground" : "hover:bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 shadow-lg shadow-primary/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
