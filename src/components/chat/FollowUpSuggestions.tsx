import { Lightbulb } from "lucide-react";

interface FollowUpSuggestionsProps {
  agentMode: string;
  onSelect: (text: string) => void;
}

const suggestionsByMode: Record<string, string[]> = {
  "legal-advisor": [
    "Activate all parallel tracks (civil + criminal + regulatory)",
    "Build the asset recovery & freeze roadmap",
    "Draft the 72-hour war room checklist",
    "Calculate maximum recovery (treble + punitive + fees)",
    "Identify the silver bullet kill-shot argument",
    "Generate the pre-suit demand letter",
  ],
  "contract-analyzer": [
    "Rewrite all risky clauses",
    "Add missing protection clauses",
    "Create a negotiation script",
    "Generate an improved version",
    "What are my walk-away triggers?",
  ],
  "litigation-strategist": [
    "Build a cross-examination strategy",
    "Design the jury selection approach",
    "Draft the opening statement",
    "Predict opposing counsel's playbook",
    "Give me the top 10 winning moves",
  ],
  "compliance-officer": [
    "Generate a full compliance checklist",
    "Create remediation action plan",
    "Draft compliance policies",
    "What are the maximum penalties?",
    "Identify whistleblower risks",
  ],
  "investigator": [
    "Analyze the evidence chain",
    "Find inconsistencies in testimony",
    "Design a witness interview strategy",
    "Map the complete fact pattern",
    "What digital forensics are needed?",
  ],
  "document-drafter": [
    "Draft a court filing",
    "Create a demand letter",
    "Write a settlement agreement",
    "Generate an affidavit",
    "Draft a motion for injunction",
  ],
  "case-predictor": [
    "Run a decision tree analysis",
    "Predict the settlement range",
    "When should I settle vs fight?",
    "Identify wild card factors",
    "Compare with similar case outcomes",
  ],
  "citation-verifier": [
    "Verify every citation in the previous answer",
    "Flag any citations that look hallucinated",
    "Pin each legal claim to its source",
    "Find counter-authority that weakens the case",
    "Show me the verified authority stack only",
    "Check if any cited case has been overturned",
  ],
  "constitution-browse": [
    "Show fundamental rights",
    "Explain due process protections",
    "List judicial powers",
    "How does this apply to my case?",
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
