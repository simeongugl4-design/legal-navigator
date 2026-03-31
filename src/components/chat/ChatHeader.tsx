import { ArrowLeft, Search, Download, Share2, RotateCcw } from "lucide-react";
import prolawLogo from "@/assets/prolaw-logo.jpeg";
import ConstitutionBrowser from "./ConstitutionBrowser";

interface ChatHeaderProps {
  countryFlag: string;
  countryName: string;
  languageName: string;
  constitutionName: string;
  showSearch: boolean;
  onToggleSearch: () => void;
  onExport: () => void;
  onShare: () => void;
  onReset: () => void;
  onBack: () => void;
}

const ChatHeader = ({
  countryFlag, countryName, languageName, constitutionName,
  showSearch, onToggleSearch, onExport, onShare, onReset, onBack,
}: ChatHeaderProps) => (
  <header className="glass-panel rounded-none border-x-0 border-t-0 px-4 py-3 flex items-center gap-3 shrink-0">
    <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
      <ArrowLeft className="w-5 h-5" />
    </button>
    <img src={prolawLogo} alt="ProLAW" className="w-8 h-8 rounded-lg" />
    <div className="flex-1 min-w-0">
      <h2 className="text-sm font-semibold text-foreground truncate">ProLAW</h2>
      <p className="text-[11px] text-muted-foreground truncate">
        {countryFlag} {countryName} • {languageName} • {constitutionName}
      </p>
    </div>
    <div className="flex gap-1">
      <ConstitutionBrowser />
      <button onClick={onToggleSearch} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Search">
        <Search className="w-4 h-4" />
      </button>
      <button onClick={onExport} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Export chat">
        <Download className="w-4 h-4" />
      </button>
      <button onClick={onShare} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Share">
        <Share2 className="w-4 h-4" />
      </button>
      <button onClick={onReset} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="New chat">
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  </header>
);

export default ChatHeader;
