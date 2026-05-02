import { Scale, FileText, Swords, ShieldCheck, Search, BookOpen, FilePlus, TrendingUp, BadgeCheck } from "lucide-react";

export interface AgentMode {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

export const agentModes: AgentMode[] = [
  { id: "legal-advisor", label: "Legal Advisor", icon: Scale, description: "General legal guidance & defense strategy", color: "text-primary" },
  { id: "contract-analyzer", label: "Contract Analyzer", icon: FileText, description: "Analyze contracts clause by clause", color: "text-emerald-400" },
  { id: "litigation-strategist", label: "Litigation Strategist", icon: Swords, description: "Win/loss probability & trial strategy", color: "text-amber-400" },
  { id: "compliance-officer", label: "Compliance Officer", icon: ShieldCheck, description: "Regulatory compliance checks", color: "text-cyan-400" },
  { id: "investigator", label: "Investigator", icon: Search, description: "Evidence analysis & fact patterns", color: "text-rose-400" },
  { id: "document-drafter", label: "Document Drafter", icon: FilePlus, description: "Generate legal documents & filings", color: "text-violet-400" },
  { id: "case-predictor", label: "Case Predictor", icon: TrendingUp, description: "Deep case outcome prediction & strategy", color: "text-orange-400" },
  { id: "citation-verifier", label: "Citation Verifier", icon: BadgeCheck, description: "Validate every law citation & evidence link", color: "text-teal-400" },
  { id: "constitution-browse", label: "Constitution", icon: BookOpen, description: "Browse constitutional articles", color: "text-sky-400" },
];

