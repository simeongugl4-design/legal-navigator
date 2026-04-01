import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Shield, TrendingUp, Clock } from "lucide-react";

interface CaseVisualsProps {
  content: string;
}

const COLORS = ["hsl(142, 76%, 36%)", "hsl(47, 96%, 53%)", "hsl(0, 84%, 60%)", "hsl(221, 83%, 53%)"];

function parseRiskScore(text: string): number | null {
  const match = text.match(/RISK_SCORE:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parseConfidence(text: string): number | null {
  const match = text.match(/CONFIDENCE:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parseOutcomePredictions(text: string): { name: string; probability: number; description: string }[] {
  const section = text.match(/OUTCOME_PREDICTIONS:\n([\s\S]*?)(?=\n\n|CASE_TIMELINE:|$)/);
  if (!section) return [];
  return section[1]
    .split("\n")
    .filter((l) => l.includes("|"))
    .map((line) => {
      const [name, prob, desc] = line.split("|").map((s) => s.trim());
      return { name: name || "", probability: parseInt(prob, 10) || 0, description: desc || "" };
    })
    .filter((p) => p.name && p.probability > 0);
}

function parseTimeline(text: string): { phase: string; duration: string; description: string }[] {
  const section = text.match(/CASE_TIMELINE:\n([\s\S]*?)(?=\n\n##|$)/);
  if (!section) return [];
  return section[1]
    .split("\n")
    .filter((l) => l.includes("|"))
    .map((line) => {
      const [phase, duration, desc] = line.split("|").map((s) => s.trim());
      return { phase: phase || "", duration: duration || "", description: desc || "" };
    })
    .filter((t) => t.phase);
}

const RiskGauge = ({ score }: { score: number }) => {
  const color = score <= 30 ? "text-green-400" : score <= 60 ? "text-yellow-400" : "text-red-400";
  const bg = score <= 30 ? "bg-green-400" : score <= 60 ? "bg-yellow-400" : "bg-red-400";
  const label = score <= 30 ? "Low Risk" : score <= 60 ? "Medium Risk" : "High Risk";

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className={`w-5 h-5 ${color}`} />
        <h4 className="text-sm font-semibold text-foreground">Legal Risk Score</h4>
      </div>
      <div className="flex items-end gap-3">
        <span className={`text-4xl font-bold ${color}`}>{score}</span>
        <span className="text-sm text-muted-foreground mb-1">/100 — {label}</span>
      </div>
      <Progress value={score} className={`mt-3 h-2.5 [&>div]:${bg}`} />
    </motion.div>
  );
};

const ConfidenceGauge = ({ confidence }: { confidence: number }) => {
  const color = confidence >= 70 ? "text-green-400" : confidence >= 40 ? "text-yellow-400" : "text-red-400";

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Shield className={`w-5 h-5 ${color}`} />
        <h4 className="text-sm font-semibold text-foreground">Analysis Confidence</h4>
      </div>
      <div className="flex items-end gap-3">
        <span className={`text-4xl font-bold ${color}`}>{confidence}%</span>
        <span className="text-sm text-muted-foreground mb-1">{confidence >= 70 ? "High Confidence" : confidence >= 40 ? "Moderate" : "Low Confidence"}</span>
      </div>
      <Progress value={confidence} className="mt-3 h-2.5" />
    </motion.div>
  );
};

const OutcomePredictionChart = ({ data }: { data: { name: string; probability: number; description: string }[] }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
    <div className="flex items-center gap-2 mb-3">
      <TrendingUp className="w-5 h-5 text-primary" />
      <h4 className="text-sm font-semibold text-foreground">Outcome Predictions</h4>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="probability" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, probability }) => `${probability}%`} labelLine={false}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(value: number) => `${value}%`} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <div>
              <p className="text-xs font-medium text-foreground">{d.name} ({d.probability}%)</p>
              <p className="text-xs text-muted-foreground">{d.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

const TimelineChart = ({ data }: { data: { phase: string; duration: string; description: string }[] }) => {
  const barData = data.map((d) => {
    const weeks = parseInt(d.duration, 10) || 1;
    return { name: d.phase, weeks, description: d.description };
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Case Timeline</h4>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} label={{ value: "Weeks", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }} width={100} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
            <Bar dataKey="weeks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="font-medium text-foreground w-1/4 truncate">{d.phase}</span>
            <span className="text-primary font-mono">{d.duration}</span>
            <span className="text-muted-foreground truncate flex-1">{d.description}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const CaseSimulationVisuals = ({ content }: CaseVisualsProps) => {
  const riskScore = useMemo(() => parseRiskScore(content), [content]);
  const confidence = useMemo(() => parseConfidence(content), [content]);
  const outcomes = useMemo(() => parseOutcomePredictions(content), [content]);
  const timeline = useMemo(() => parseTimeline(content), [content]);

  const hasVisuals = riskScore !== null || confidence !== null || outcomes.length > 0 || timeline.length > 0;
  if (!hasVisuals) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {riskScore !== null && <RiskGauge score={riskScore} />}
        {confidence !== null && <ConfidenceGauge confidence={confidence} />}
      </div>
      {outcomes.length > 0 && <OutcomePredictionChart data={outcomes} />}
      {timeline.length > 0 && <TimelineChart data={timeline} />}
    </div>
  );
};

export default CaseSimulationVisuals;
