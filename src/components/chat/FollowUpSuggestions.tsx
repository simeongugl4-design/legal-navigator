import { Lightbulb } from "lucide-react";

interface FollowUpSuggestionsProps {
  agentMode: string;
  onSelect: (text: string) => void;
}

const suggestionsByMode: Record<string, string[]> = {
  "legal-advisor": [
    "What are the strongest defenses?",
    "Draft a legal notice for this",
    "What precedents support my case?",
    "Calculate potential damages",
  ],
  "contract-analyzer": [
    "Rewrite the risky clauses",
    "Add missing protection clauses",
    "Compare with standard template",
    "Generate an improved version",
  ],
  "litigation-strategist": [
    "Build a cross-examination strategy",
    "What evidence do I need?",
    "Predict the judge's ruling",
    "Draft opening statement",
  ],
  "compliance-officer": [
    "Generate compliance checklist",
    "What penalties could apply?",
    "Create an audit report",
    "List all regulatory requirements",
  ],
  "investigator": [
    "Analyze the evidence chain",
    "Find inconsistencies",
    "What witnesses are needed?",
    "Generate investigation report",
  ],
  "document-drafter": [
    "Draft a court filing",
    "Create a legal notice",
    "Write a demand letter",
    "Generate an affidavit",
  ],
  "case-predictor": [
    "What factors affect the outcome?",
    "Compare with similar cases",
    "Predict settlement range",
    "Analyze judge tendencies",
  ],
  "constitution-browse": [
    "Show fundamental rights",
    "Explain amendment process",
    "List judicial powers",
    "Show emergency provisions",
  ],
};

const FollowUpSuggestions = ({ agentMode, onSelect }: FollowUpSuggestionsProps) => {
  const suggestions = suggestionsByMode[agentMode] || suggestionsByMode["legal-advisor"];

  return (
    <div className="flex flex-wrap gap-1.5 mt-3 px-1">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-secondary/60 text-secondary-foreground hover:bg-primary/20 hover:text-primary transition-colors border border-border/30"
        >
          <Lightbulb className="w-3 h-3" />
          {s}
        </button>
      ))}
    </div>
  );
};

export default FollowUpSuggestions;
