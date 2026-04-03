import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area } from "recharts";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Shield, TrendingUp, Clock, ChevronDown, ChevronUp, Zap, Target, Scale } from "lucide-react";

interface CaseVisualsProps {
  content: string;
}

const COLORS = ["hsl(142, 76%, 36%)", "hsl(47, 96%, 53%)", "hsl(0, 84%, 60%)", "hsl(221, 83%, 53%)", "hsl(280, 67%, 55%)"];

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

function parseStrengthWeakness(text: string): { factor: string; score: number }[] {
  const section = text.match(/STRENGTH_ANALYSIS:\n([\s\S]*?)(?=\n\n|WEAKNESS_|$)/);
  if (!section) return [];
  return section[1]
    .split("\n")
    .filter((l) => l.includes("|"))
    .map((line) => {
      const [factor, score] = line.split("|").map((s) => s.trim());
      return { factor: factor || "", score: parseInt(score, 10) || 0 };
    })
    .filter((s) => s.factor && s.score > 0);
}

function parseCostEstimate(text: string): { phase: string; min: number; max: number }[] {
  const section = text.match(/COST_ESTIMATE:\n([\s\S]*?)(?=\n\n|$)/);
  if (!section) return [];
  return section[1]
    .split("\n")
    .filter((l) => l.includes("|"))
    .map((line) => {
      const [phase, min, max] = line.split("|").map((s) => s.trim());
      return { phase: phase || "", min: parseInt(min, 10) || 0, max: parseInt(max, 10) || 0 };
    })
    .filter((c) => c.phase);
}

// Interactive Risk Gauge with animation
const RiskGauge = ({ score }: { score: number }) => {
  const color = score <= 30 ? "text-green-400" : score <= 60 ? "text-yellow-400" : "text-red-400";
  const label = score <= 30 ? "Low Risk" : score <= 60 ? "Medium Risk" : "High Risk";
  const bgClass = score <= 30 ? "[&>div]:bg-green-400" : score <= 60 ? "[&>div]:bg-yellow-400" : "[&>div]:bg-red-400";
  const advice = score <= 30
    ? "Strong position — proceed with confidence"
    : score <= 60
      ? "Moderate risk — consider strengthening your case"
      : "High risk — seek professional legal counsel immediately";

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className={`w-5 h-5 ${color}`} />
        <h4 className="text-sm font-semibold text-foreground">Legal Risk Score</h4>
      </div>
      <div className="flex items-end gap-3">
        <motion.span
          className={`text-4xl font-bold ${color}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          {score}
        </motion.span>
        <span className="text-sm text-muted-foreground mb-1">/100 — {label}</span>
      </div>
      <Progress value={score} className={`mt-3 h-2.5 ${bgClass}`} />
      <p className="text-xs text-muted-foreground mt-2 italic">💡 {advice}</p>
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
        <motion.span className={`text-4xl font-bold ${color}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{confidence}%</motion.span>
        <span className="text-sm text-muted-foreground mb-1">{confidence >= 70 ? "High Confidence" : confidence >= 40 ? "Moderate" : "Low Confidence"}</span>
      </div>
      <Progress value={confidence} className="mt-3 h-2.5" />
    </motion.div>
  );
};

const OutcomePredictionChart = ({ data }: { data: { name: string; probability: number; description: string }[] }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Outcome Predictions</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="probability"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={35}
                label={({ probability }) => `${probability}%`}
                labelLine={false}
                onMouseEnter={(_, i) => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i % COLORS.length]}
                    opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                    stroke={activeIndex === i ? "#fff" : "none"}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value}%`} contentStyle={{ backgroundColor: "hsl(216, 45%, 12%)", border: "1px solid hsl(216, 25%, 20%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {data.map((d, i) => (
            <motion.div
              key={i}
              className={`flex items-start gap-2 p-2 rounded-lg transition-colors cursor-pointer ${activeIndex === i ? "bg-secondary/50" : "hover:bg-secondary/30"}`}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              whileHover={{ x: 4 }}
            >
              <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <div>
                <p className="text-xs font-medium text-foreground">{d.name} ({d.probability}%)</p>
                <p className="text-xs text-muted-foreground">{d.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const TimelineChart = ({ data }: { data: { phase: string; duration: string; description: string }[] }) => {
  const barData = data.map((d) => ({ name: d.phase, weeks: parseInt(d.duration, 10) || 1, description: d.description }));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Case Timeline</h4>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} label={{ value: "Weeks", position: "insideBottom", offset: -5, fill: "hsl(215, 15%, 55%)", fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: "hsl(210, 20%, 92%)", fontSize: 10 }} width={100} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(216, 45%, 12%)", border: "1px solid hsl(216, 25%, 20%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }} />
            <Bar dataKey="weeks" fill="hsl(210, 60%, 50%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Interactive timeline steps */}
      <div className="mt-3 space-y-1">
        {data.map((d, i) => (
          <motion.div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-secondary/30 cursor-default" whileHover={{ x: 3 }}>
            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <span className="font-medium text-foreground w-1/4 truncate">{d.phase}</span>
            <span className="text-primary font-mono">{d.duration}</span>
            <span className="text-muted-foreground truncate flex-1">{d.description}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// NEW: Strength radar chart
const StrengthRadar = ({ data }: { data: { factor: string; score: number }[] }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
    <div className="flex items-center gap-2 mb-3">
      <Target className="w-5 h-5 text-primary" />
      <h4 className="text-sm font-semibold text-foreground">Case Strength Analysis</h4>
    </div>
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="hsl(216, 25%, 20%)" />
          <PolarAngleAxis dataKey="factor" tick={{ fill: "hsl(210, 20%, 92%)", fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 9 }} />
          <Radar name="Score" dataKey="score" stroke="hsl(210, 60%, 50%)" fill="hsl(210, 60%, 50%)" fillOpacity={0.3} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(216, 45%, 12%)", border: "1px solid hsl(216, 25%, 20%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
);

// NEW: Cost estimate area chart
const CostEstimateChart = ({ data }: { data: { phase: string; min: number; max: number }[] }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
    <div className="flex items-center gap-2 mb-3">
      <Zap className="w-5 h-5 text-yellow-400" />
      <h4 className="text-sm font-semibold text-foreground">Estimated Legal Costs</h4>
    </div>
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 10, right: 10 }}>
          <XAxis dataKey="phase" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} />
          <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} tickFormatter={(v) => `$${v / 1000}k`} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(216, 45%, 12%)", border: "1px solid hsl(216, 25%, 20%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }} formatter={(v: number) => `$${v.toLocaleString()}`} />
          <Area type="monotone" dataKey="max" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.15} name="High Estimate" />
          <Area type="monotone" dataKey="min" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%)" fillOpacity={0.15} name="Low Estimate" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
);

// Win probability simulator
const WinProbabilityMeter = ({ outcomes }: { outcomes: { name: string; probability: number }[] }) => {
  const winOutcome = outcomes.find(o => o.name.toLowerCase().includes("win") || o.name.toLowerCase().includes("favor") || o.name.toLowerCase().includes("success"));
  const winProb = winOutcome?.probability || 0;
  const color = winProb >= 60 ? "text-green-400" : winProb >= 40 ? "text-yellow-400" : "text-red-400";

  if (!winOutcome) return null;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Scale className="w-5 h-5 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Win Probability</h4>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(216, 25%, 20%)" strokeWidth="8" />
            <motion.circle
              cx="50" cy="50" r="40" fill="none"
              stroke={winProb >= 60 ? "hsl(142, 76%, 36%)" : winProb >= 40 ? "hsl(47, 96%, 53%)" : "hsl(0, 84%, 60%)"}
              strokeWidth="8"
              strokeDasharray={`${winProb * 2.51} 251`}
              strokeLinecap="round"
              initial={{ strokeDasharray: "0 251" }}
              animate={{ strokeDasharray: `${winProb * 2.51} 251` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${color}`}>{winProb}%</span>
            <span className="text-[10px] text-muted-foreground">Win Rate</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-center text-muted-foreground mt-2">
        {winProb >= 60 ? "🟢 Favorable odds — strong case position" : winProb >= 40 ? "🟡 Even odds — case could go either way" : "🔴 Unfavorable — consider settlement options"}
      </p>
    </motion.div>
  );
};

const CaseSimulationVisuals = ({ content }: CaseVisualsProps) => {
  const [expanded, setExpanded] = useState(true);
  const riskScore = useMemo(() => parseRiskScore(content), [content]);
  const confidence = useMemo(() => parseConfidence(content), [content]);
  const outcomes = useMemo(() => parseOutcomePredictions(content), [content]);
  const timeline = useMemo(() => parseTimeline(content), [content]);
  const strengths = useMemo(() => parseStrengthWeakness(content), [content]);
  const costs = useMemo(() => parseCostEstimate(content), [content]);

  const hasVisuals = riskScore !== null || confidence !== null || outcomes.length > 0 || timeline.length > 0;
  if (!hasVisuals) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 mb-2 transition-colors"
      >
        <BarChart className="w-3.5 h-3.5" />
        <span className="font-medium">Case Simulation Dashboard</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {riskScore !== null && <RiskGauge score={riskScore} />}
              {confidence !== null && <ConfidenceGauge confidence={confidence} />}
            </div>
            {outcomes.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <OutcomePredictionChart data={outcomes} />
                <WinProbabilityMeter outcomes={outcomes} />
              </div>
            )}
            {strengths.length > 0 && <StrengthRadar data={strengths} />}
            {costs.length > 0 && <CostEstimateChart data={costs} />}
            {timeline.length > 0 && <TimelineChart data={timeline} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CaseSimulationVisuals;
