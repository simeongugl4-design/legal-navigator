import { motion } from "framer-motion";
import { FileText, AlertTriangle, Calendar, DollarSign, Users, Scale, Sparkles, Wand2, Lightbulb } from "lucide-react";
import type { IngestedFacts } from "@/lib/documentParser";

interface Props {
  facts: IngestedFacts;
  filename: string;
  onApplyToSimulation: () => void;
  onAskQuestion: (q: string) => void;
}

const riskColor = (r: string) =>
  r === "high" ? "text-red-400 border-red-400/30 bg-red-400/10"
    : r === "medium" ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
    : "text-green-400 border-green-400/30 bg-green-400/10";

const IngestedFactsCard = ({ facts, filename, onApplyToSimulation, onAskQuestion }: Props) => {
  const sim = facts.simulationInputs;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl border border-primary/30 space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">Document Ingested</h4>
            <p className="text-[10px] text-muted-foreground">{filename} · {facts.documentType}</p>
          </div>
        </div>
        <button onClick={onApplyToSimulation}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
          <Wand2 className="w-3 h-3" /> Apply to Simulation
        </button>
      </div>

      <p className="text-xs text-secondary-foreground leading-relaxed">{facts.summary}</p>

      {/* Suggested simulation inputs preview */}
      <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-[11px] font-semibold text-primary">AI-Suggested Simulation Inputs</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
          <Stat label="Evidence" value={sim.evidenceStrength} />
          <Stat label="Witness" value={sim.witnessCredibility} />
          <Stat label="Docs" value={sim.documentationQuality} />
          <Stat label="Opposition" value={sim.oppositionStrength} />
          <Stat label="Urgency" value={sim.timelineUrgency} />
          <Stat label="Sentiment" value={sim.publicSentiment} />
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">Venue: {sim.suggestedVenue}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">Strategy: {sim.suggestedStrategy}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 italic">{sim.rationale}</p>
      </div>

      {/* Two-column facts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {facts.parties.length > 0 && (
          <Section icon={Users} title="Parties">
            {facts.parties.map((p, i) => (
              <li key={i}><span className="text-foreground font-medium">{p.name}</span> <span className="text-muted-foreground">— {p.role}</span></li>
            ))}
          </Section>
        )}
        {facts.keyDates.length > 0 && (
          <Section icon={Calendar} title="Key Dates">
            {facts.keyDates.map((d, i) => (
              <li key={i}><span className="text-primary font-mono">{d.date}</span> <span className="text-muted-foreground">— {d.event}</span></li>
            ))}
          </Section>
        )}
        {facts.monetaryAmounts.length > 0 && (
          <Section icon={DollarSign} title="Monetary Amounts">
            {facts.monetaryAmounts.map((m, i) => (
              <li key={i}><span className="text-green-400 font-semibold">{m.amount}</span> <span className="text-muted-foreground">— {m.context}</span></li>
            ))}
          </Section>
        )}
        {facts.legalIssues.length > 0 && (
          <Section icon={Scale} title="Legal Issues">
            {facts.legalIssues.map((l, i) => <li key={i} className="text-secondary-foreground">{l}</li>)}
          </Section>
        )}
      </div>

      {facts.keyClauses.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText className="w-3 h-3 text-primary" />
            <span className="text-[11px] font-semibold text-foreground">Key Clauses</span>
          </div>
          <div className="space-y-1.5">
            {facts.keyClauses.map((c, i) => (
              <div key={i} className={`p-2 rounded border text-[11px] ${riskColor(c.risk)}`}>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-semibold">{c.clause}</span>
                  <span className="text-[9px] uppercase tracking-wide">{c.risk} risk</span>
                </div>
                <p className="text-muted-foreground">{c.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {facts.redFlags.length > 0 && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-[11px] font-semibold text-red-400">Red Flags</span>
          </div>
          <ul className="text-[11px] text-red-300 space-y-0.5 list-disc list-inside">
            {facts.redFlags.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {facts.recommendedQuestions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb className="w-3 h-3 text-primary" />
            <span className="text-[11px] font-semibold text-foreground">Recommended Next Questions</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {facts.recommendedQuestions.map((q, i) => (
              <button key={i} onClick={() => onAskQuestion(q)}
                className="text-[10px] px-2 py-1 rounded-full bg-secondary/60 text-secondary-foreground hover:bg-primary/20 hover:text-primary border border-border/40 transition-colors text-left">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div>
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className="w-3 h-3 text-primary" />
      <span className="text-[11px] font-semibold text-foreground">{title}</span>
    </div>
    <ul className="text-[11px] space-y-0.5">{children}</ul>
  </div>
);

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="bg-background/40 rounded p-1.5 text-center">
    <p className="text-muted-foreground">{label}</p>
    <p className="font-mono font-bold text-foreground">{value}</p>
  </div>
);

export default IngestedFactsCard;
