import { useRef } from "react";
import { Send, Paperclip, Mic, MicOff } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  isLoading: boolean;
  isRecording: boolean;
  onSend: (text: string) => void;
  onToggleRecording: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ChatInput = ({ input, setInput, isLoading, isRecording, onSend, onToggleRecording, onFileUpload }: ChatInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(input);
    }
  };

  return (
    <div className="shrink-0 p-3 border-t border-border bg-card/80 backdrop-blur-xl">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx,.txt,.jpg,.png" onChange={onFileUpload} />
        <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0" title="Upload document">
          <Paperclip className="w-5 h-5" />
        </button>
        <div className="flex-1 glass-panel flex items-end gap-1 px-3 py-1.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your legal case or question..."
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
          onClick={onToggleRecording}
          className={`p-2.5 rounded-xl transition-colors shrink-0 ${isRecording ? "bg-destructive text-destructive-foreground animate-pulse" : "hover:bg-secondary text-muted-foreground hover:text-foreground"}`}
          title={isRecording ? "Stop recording" : "Voice input"}
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button
          onClick={() => onSend(input)}
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 shadow-lg shadow-primary/20"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        ⚖️ ProLAW provides AI-generated legal guidance with confidence ratings. Always consult a licensed attorney.
      </p>
    </div>
  );
};

export default ChatInput;
