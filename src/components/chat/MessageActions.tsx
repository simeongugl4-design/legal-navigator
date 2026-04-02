import { Copy, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MessageActionsProps {
  content: string;
  onRetry?: () => void;
}

const MessageActions = ({ content, onRetry }: MessageActionsProps) => {
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied", description: "Response copied to clipboard." });
  };

  return (
    <div className="flex items-center gap-1 mt-2 pt-1 border-t border-border/30">
      <button onClick={copyToClipboard} className="p-1 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors" title="Copy">
        <Copy className="w-3 h-3" />
      </button>
      <button className="p-1 rounded hover:bg-secondary/80 text-muted-foreground hover:text-emerald-400 transition-colors" title="Good response">
        <ThumbsUp className="w-3 h-3" />
      </button>
      <button className="p-1 rounded hover:bg-secondary/80 text-muted-foreground hover:text-rose-400 transition-colors" title="Bad response">
        <ThumbsDown className="w-3 h-3" />
      </button>
      {onRetry && (
        <button onClick={onRetry} className="p-1 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors" title="Regenerate">
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export default MessageActions;
