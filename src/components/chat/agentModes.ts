import { Scale, FileText, Swords, ShieldCheck, Search } from "lucide-react";

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
];
