import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, LineChart, Line, CartesianGrid,
  ComposedChart, Scatter
} from "recharts";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle, Shield, TrendingUp, Clock, ChevronDown, ChevronUp,
  Zap, Target, Scale, Gavel, Users, DollarSign, BarChart3, Brain, Crown, Globe2, Flame
} from "lucide-react";

interface CaseVisualsProps {
  content: string;
}

const COLORS = ["hsl(142, 76%, 36%)", "hsl(47, 96%, 53%)", "hsl(0, 84%, 60%)", "hsl(221, 83%, 53%)", "hsl(280, 67%, 55%)", "hsl(190, 80%, 45%)"];

function parseRiskScore(text: string): number | null {
  const match = text.match(/RISK_SCORE:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parseConfidence(text: string): number | null {
  const match = text.match(/CONFIDENCE:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parseOutcomePredictions(text: string): { name: string; probability: number; description: string }[] {
  const section = text.match(/OUTCOME_PREDICTIONS:\n([\s\S]*?)(?=\n\n|CASE_TIMELINE:|STRENGTH_ANALYSIS:|COST_ESTIMATE:|SETTLEMENT_RANGE:|JUDGE_FACTORS:|$)/);
  if (!section) return [];
  return section[1].split("\n").filter(l => l.includes("|")).map(line => {
    const [name, prob, desc] = line.split("|").map(s => s.trim());
    return { name: name || "", probability: parseInt(prob, 10) || 0, description: desc || "" };
  }).filter(p => p.name && p.probability > 0);
}

function parseTimeline(text: string): { phase: string; duration: string; description: string }[] {
  const section = text.match(/CASE_TIMELINE:\n([\s\S]*?)(?=\n\n##|STRENGTH_ANALYSIS:|COST_ESTIMATE:|SETTLEMENT_RANGE:|JUDGE_FACTORS:|$)/);
  if (!section) return [];
  return section[1].split("\n").filter(l => l.includes("|")).map(line => {
    const [phase, duration, desc] = line.split("|").map(s => s.trim());
    return { phase: phase || "", duration: duration || "", description: desc || "" };
  }).filter(t => t.phase);
}

function parseStrengthWeakness(text: string): { factor: string; score: number }[] {
  const section = text.match(/STRENGTH_ANALYSIS:\n([\s\S]*?)(?=\n\n|COST_ESTIMATE:|SETTLEMENT_RANGE:|JUDGE_FACTORS:|$)/);
  if (!section) return [];
  return section[1].split("\n").filter(l => l.includes("|")).map(line => {
    const [factor, score] = line.split("|").map(s => s.trim());
    return { factor: factor || "", score: parseInt(score, 10) || 0 };
  }).filter(s => s.factor && s.score > 0);
}

function parseCostEstimate(text: string): { phase: string; min: number; max: number }[] {
  const section = text.match(/COST_ESTIMATE:\n([\s\S]*?)(?=\n\n|SETTLEMENT_RANGE:|JUDGE_FACTORS:|$)/);
  if (!section) return [];
  return section[1].split("\n").filter(l => l.includes("|")).map(line => {
    const [phase, min, max] = line.split("|").map(s => s.trim());
    return { phase: phase || "", min: parseInt(min, 10) || 0, max: parseInt(max, 10) || 0 };
  }).filter(c => c.phase && (c.min > 0 || c.max > 0));
}

function parseSettlementRange(text: string): { scenario: string; low: number; high: number; likely: number }[] {
  const section = text.match(/SETTLEMENT_RANGE:\n([\s\S]*?)(?=\n\n|JUDGE_FACTORS:|$)/);
  if (!section) return [];
  return section[1].split("\n").filter(l => l.includes("|")).map(line => {
    const [scenario, low, high, likely] = line.split("|").map(s => s.trim());
    return { scenario: scenario || "", low: parseInt(low, 10) || 0, high: parseInt(high, 10) || 0, likely: parseInt(likely, 10) || 0 };
  }).filter(s => s.scenario && s.high > 0);
}

function parseJudgeFactors(text: string): { factor: string; impact: number; direction: string }[] {
  const section = text.match(/JUDGE_FACTORS:\n([\s\S]*?)(?=\n\n|$)/);
  if (!section) return [];
  return section[1].split("\n").filter(l => l.includes("|")).map(line => {
    const [factor, impact, direction] = line.split("|").map(s => s.trim());
    return { factor: factor || "", impact: parseInt(impact, 10) || 0, direction: direction || "neutral" };
  }).filter(j => j.factor && j.impact > 0);
}

const tooltipStyle = {
  backgroundColor: "hsl(216, 45%, 12%)",
  border: "1px solid hsl(216, 25%, 20%)",
  borderRadius: "8px",
  color: "hsl(210, 20%, 92%)",
};

// Risk Gauge with animated circular progress
const RiskGauge = ({ score }: { score: number }) => {
  const color = score <= 30 ? "text-green-400" : score <= 60 ? "text-yellow-400" : "text-red-400";
  const strokeColor = score <= 30 ? "hsl(142, 76%, 36%)" : score <= 60 ? "hsl(47, 96%, 53%)" : "hsl(0, 84%, 60%)";
  const label = score <= 30 ? "Low Risk" : score <= 60 ? "Medium Risk" : "High Risk";
  const advice = score <= 30 ? "Strong position — proceed with confidence"
    : score <= 60 ? "Moderate risk — consider strengthening your case"
    : "High risk — seek professional legal counsel immediately";

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className={`w-5 h-5 ${color}`} />
        <h4 className="text-sm font-semibold text-foreground">Legal Risk Score</h4>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(216, 25%, 20%)" strokeWidth="8" />
            <motion.circle
              cx="50" cy="50" r="40" fill="none" stroke={strokeColor} strokeWidth="8"
              strokeDasharray={`${score * 2.51} 251`} strokeLinecap="round"
              initial={{ strokeDasharray: "0 251" }}
              animate={{ strokeDasharray: `${score * 2.51} 251` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span className={`text-2xl font-bold ${color}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{score}</motion.span>
            <span className="text-[9px] text-muted-foreground">/100</span>
          </div>
        </div>
        <div>
          <p className={`text-sm font-semibold ${color}`}>{label}</p>
          <p className="text-xs text-muted-foreground mt-1">{advice}</p>
        </div>
      </div>
    </motion.div>
  );
};

const ConfidenceGauge = ({ confidence }: { confidence: number }) => {
  const color = confidence >= 70 ? "text-green-400" : confidence >= 40 ? "text-yellow-400" : "text-red-400";
  const strokeColor = confidence >= 70 ? "hsl(142, 76%, 36%)" : confidence >= 40 ? "hsl(47, 96%, 53%)" : "hsl(0, 84%, 60%)";

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Shield className={`w-5 h-5 ${color}`} />
        <h4 className="text-sm font-semibold text-foreground">Analysis Confidence</h4>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(216, 25%, 20%)" strokeWidth="8" />
            <motion.circle
              cx="50" cy="50" r="40" fill="none" stroke={strokeColor} strokeWidth="8"
              strokeDasharray={`${confidence * 2.51} 251`} strokeLinecap="round"
              initial={{ strokeDasharray: "0 251" }}
              animate={{ strokeDasharray: `${confidence * 2.51} 251` }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span className={`text-2xl font-bold ${color}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{confidence}%</motion.span>
          </div>
        </div>
        <div>
          <p className={`text-sm font-semibold ${color}`}>{confidence >= 70 ? "High Confidence" : confidence >= 40 ? "Moderate" : "Low Confidence"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {confidence >= 70 ? "Analysis based on strong precedent data" : confidence >= 40 ? "Some uncertainty — more context may help" : "Limited data — consider providing more details"}
          </p>
        </div>
      </div>
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
              <Pie data={data} dataKey="probability" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35}
                label={({ probability }) => `${probability}%`} labelLine={false}
                onMouseEnter={(_, i) => setActiveIndex(i)} onMouseLeave={() => setActiveIndex(null)}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]}
                    opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                    stroke={activeIndex === i ? "#fff" : "none"} strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value}%`} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {data.map((d, i) => (
            <motion.div key={i}
              className={`flex items-start gap-2 p-2 rounded-lg transition-colors cursor-pointer ${activeIndex === i ? "bg-secondary/50" : "hover:bg-secondary/30"}`}
              onMouseEnter={() => setActiveIndex(i)} onMouseLeave={() => setActiveIndex(null)} whileHover={{ x: 4 }}>
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

const WinProbabilityMeter = ({ outcomes }: { outcomes: { name: string; probability: number }[] }) => {
  const winOutcome = outcomes.find(o =>
    o.name.toLowerCase().includes("win") || o.name.toLowerCase().includes("victory") ||
    o.name.toLowerCase().includes("favor") || o.name.toLowerCase().includes("success") ||
    o.name.toLowerCase().includes("best case")
  );
  const winProb = winOutcome?.probability || 0;
  const color = winProb >= 60 ? "text-green-400" : winProb >= 40 ? "text-yellow-400" : "text-red-400";
  const strokeColor = winProb >= 60 ? "hsl(142, 76%, 36%)" : winProb >= 40 ? "hsl(47, 96%, 53%)" : "hsl(0, 84%, 60%)";

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
            <motion.circle cx="50" cy="50" r="40" fill="none" stroke={strokeColor} strokeWidth="8"
              strokeDasharray={`${winProb * 2.51} 251`} strokeLinecap="round"
              initial={{ strokeDasharray: "0 251" }}
              animate={{ strokeDasharray: `${winProb * 2.51} 251` }}
              transition={{ duration: 1.5, ease: "easeOut" }} />
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

const TimelineChart = ({ data }: { data: { phase: string; duration: string; description: string }[] }) => {
  const barData = data.map(d => ({ name: d.phase, weeks: parseInt(d.duration, 10) || 1, description: d.description }));
  const [activePhase, setActivePhase] = useState<number | null>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Case Timeline</h4>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: "hsl(210, 20%, 92%)", fontSize: 10 }} width={100} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="weeks" fill="hsl(210, 60%, 50%)" radius={[0, 4, 4, 0]}
              onMouseEnter={(_, i) => setActivePhase(i)} onMouseLeave={() => setActivePhase(null)} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-1">
        {data.map((d, i) => (
          <motion.div key={i}
            className={`flex items-center gap-2 text-xs p-1.5 rounded transition-colors cursor-default ${activePhase === i ? "bg-secondary/50" : "hover:bg-secondary/30"}`}
            whileHover={{ x: 3 }}
            onMouseEnter={() => setActivePhase(i)} onMouseLeave={() => setActivePhase(null)}>
            <div className={`w-2 h-2 rounded-full shrink-0 ${activePhase === i ? "bg-primary scale-125" : "bg-primary"}`} />
            <span className="font-medium text-foreground w-1/4 truncate">{d.phase}</span>
            <span className="text-primary font-mono">{d.duration}</span>
            <span className="text-muted-foreground truncate flex-1">{d.description}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const StrengthRadar = ({ data }: { data: { factor: string; score: number }[] }) => {
  const avgScore = Math.round(data.reduce((sum, d) => sum + d.score, 0) / data.length);
  const color = avgScore >= 70 ? "text-green-400" : avgScore >= 40 ? "text-yellow-400" : "text-red-400";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Case Strength Analysis</h4>
        </div>
        <span className={`text-xs font-bold ${color}`}>Avg: {avgScore}/100</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="hsl(216, 25%, 20%)" />
            <PolarAngleAxis dataKey="factor" tick={{ fill: "hsl(210, 20%, 92%)", fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 9 }} />
            <Radar name="Score" dataKey="score" stroke="hsl(210, 60%, 50%)" fill="hsl(210, 60%, 50%)" fillOpacity={0.3} />
            <Tooltip contentStyle={tooltipStyle} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-full bg-secondary/50 rounded-full h-1.5">
              <motion.div className="h-1.5 rounded-full" style={{ backgroundColor: d.score >= 70 ? "hsl(142, 76%, 36%)" : d.score >= 40 ? "hsl(47, 96%, 53%)" : "hsl(0, 84%, 60%)" }}
                initial={{ width: 0 }} animate={{ width: `${d.score}%` }} transition={{ duration: 1, delay: i * 0.1 }} />
            </div>
            <span className="text-muted-foreground shrink-0 w-16 truncate">{d.factor}</span>
            <span className="font-mono text-foreground shrink-0">{d.score}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const CostEstimateChart = ({ data }: { data: { phase: string; min: number; max: number }[] }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
    <div className="flex items-center gap-2 mb-3">
      <DollarSign className="w-5 h-5 text-yellow-400" />
      <h4 className="text-sm font-semibold text-foreground">Estimated Legal Costs</h4>
    </div>
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 25%, 18%)" />
          <XAxis dataKey="phase" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} />
          <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} tickFormatter={v => `$${v / 1000}k`} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `$${v.toLocaleString()}`} />
          <Area type="monotone" dataKey="max" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.15} name="High Estimate" />
          <Area type="monotone" dataKey="min" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%)" fillOpacity={0.15} name="Low Estimate" />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
      <span>Total Low: ${data.reduce((s, d) => s + d.min, 0).toLocaleString()}</span>
      <span>Total High: ${data.reduce((s, d) => s + d.max, 0).toLocaleString()}</span>
    </div>
  </motion.div>
);

// NEW: Settlement Range Chart
const SettlementRangeChart = ({ data }: { data: { scenario: string; low: number; high: number; likely: number }[] }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
    <div className="flex items-center gap-2 mb-3">
      <Gavel className="w-5 h-5 text-amber-400" />
      <h4 className="text-sm font-semibold text-foreground">Settlement Range Analysis</h4>
    </div>
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 25%, 18%)" />
          <XAxis dataKey="scenario" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} />
          <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} tickFormatter={v => `$${v / 1000}k`} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `$${v.toLocaleString()}`} />
          <Bar dataKey="low" fill="hsl(142, 76%, 36%)" fillOpacity={0.6} name="Low Estimate" radius={[2, 2, 0, 0]} />
          <Bar dataKey="high" fill="hsl(0, 84%, 60%)" fillOpacity={0.6} name="High Estimate" radius={[2, 2, 0, 0]} />
          <Scatter dataKey="likely" fill="hsl(47, 96%, 53%)" name="Most Likely" />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
);

// NEW: Judge Decision Factors
const JudgeFactorsChart = ({ data }: { data: { factor: string; impact: number; direction: string }[] }) => {
  const chartData = data.map(d => ({
    factor: d.factor,
    positive: d.direction.toLowerCase().includes("favor") || d.direction.toLowerCase().includes("positive") ? d.impact : 0,
    negative: d.direction.toLowerCase().includes("against") || d.direction.toLowerCase().includes("negative") ? -d.impact : 0,
    neutral: d.direction.toLowerCase().includes("neutral") ? d.impact : 0,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-violet-400" />
        <h4 className="text-sm font-semibold text-foreground">Judge Decision Factors</h4>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 25%, 18%)" />
            <XAxis type="number" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} domain={[-100, 100]} />
            <YAxis dataKey="factor" type="category" tick={{ fill: "hsl(210, 20%, 92%)", fontSize: 10 }} width={100} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="positive" fill="hsl(142, 76%, 36%)" name="In Your Favor" stackId="stack" radius={[0, 4, 4, 0]} />
            <Bar dataKey="negative" fill="hsl(0, 84%, 60%)" name="Against You" stackId="stack" radius={[4, 0, 0, 4]} />
            <Bar dataKey="neutral" fill="hsl(215, 15%, 55%)" name="Neutral" stackId="stack" radius={[0, 4, 4, 0]} />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 space-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${d.direction.toLowerCase().includes("favor") || d.direction.toLowerCase().includes("positive") ? "bg-green-400" : d.direction.toLowerCase().includes("against") || d.direction.toLowerCase().includes("negative") ? "bg-red-400" : "bg-muted-foreground"}`} />
            <span className="text-foreground flex-1">{d.factor}</span>
            <span className="text-muted-foreground capitalize">{d.direction}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Summary Statistics Bar
const SummaryStats = ({ risk, confidence, outcomes }: { risk: number | null; confidence: number | null; outcomes: { name: string; probability: number }[] }) => {
  const winOutcome = outcomes.find(o =>
    o.name.toLowerCase().includes("win") || o.name.toLowerCase().includes("victory") ||
    o.name.toLowerCase().includes("best") || o.name.toLowerCase().includes("favor")
  );

  return (
    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 flex-wrap mb-3">
      {risk !== null && (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${risk <= 30 ? "bg-green-400/15 text-green-400" : risk <= 60 ? "bg-yellow-400/15 text-yellow-400" : "bg-red-400/15 text-red-400"}`}>
          <AlertTriangle className="w-3 h-3" /> Risk: {risk}/100
        </div>
      )}
      {confidence !== null && (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${confidence >= 70 ? "bg-green-400/15 text-green-400" : confidence >= 40 ? "bg-yellow-400/15 text-yellow-400" : "bg-red-400/15 text-red-400"}`}>
          <Shield className="w-3 h-3" /> Confidence: {confidence}%
        </div>
      )}
      {winOutcome && (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${winOutcome.probability >= 60 ? "bg-green-400/15 text-green-400" : winOutcome.probability >= 40 ? "bg-yellow-400/15 text-yellow-400" : "bg-red-400/15 text-red-400"}`}>
          <Scale className="w-3 h-3" /> Win: {winOutcome.probability}%
        </div>
      )}
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
  const settlements = useMemo(() => parseSettlementRange(content), [content]);
  const judgeFactors = useMemo(() => parseJudgeFactors(content), [content]);

  const hasVisuals = riskScore !== null || confidence !== null || outcomes.length > 0 || timeline.length > 0;
  if (!hasVisuals) return null;

  return (
    <div className="mt-4">
      <SummaryStats risk={riskScore} confidence={confidence} outcomes={outcomes} />

      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 mb-2 transition-colors">
        <BarChart3 className="w-3.5 h-3.5" />
        <span className="font-medium">Interactive Case Simulation Dashboard</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
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
            {settlements.length > 0 && <SettlementRangeChart data={settlements} />}
            {judgeFactors.length > 0 && <JudgeFactorsChart data={judgeFactors} />}
            {costs.length > 0 && <CostEstimateChart data={costs} />}
            {timeline.length > 0 && <TimelineChart data={timeline} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CaseSimulationVisuals;
