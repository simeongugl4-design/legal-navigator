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
  Zap, Target, Scale, Gavel, Users, DollarSign, BarChart3, Brain, Crown, Globe2, Flame,
  BadgeCheck, BookMarked, AlertOctagon, HelpCircle, XCircle, History, ExternalLink
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
  const section = text.match(/JUDGE_FACTORS:\n([\s\S]*?)(?=\n\n|MULTI_AGENT_COUNCIL:|LEVERAGE_STACK:|JURISDICTION_COMPARISON:|$)/);
  if (!section) return [];
  return section[1].split("\n").filter(l => l.includes("|")).map(line => {
    const [factor, impact, direction] = line.split("|").map(s => s.trim());
    return { factor: factor || "", impact: parseInt(impact, 10) || 0, direction: direction || "neutral" };
  }).filter(j => j.factor && j.impact > 0);
}

function parseMultiAgent(text: string): { role: string; verdict: string; confidence: number; insight: string }[] {
  const section = text.match(/MULTI_AGENT_COUNCIL:\n([\s\S]*?)(?=\n\n|LEVERAGE_STACK:|JURISDICTION_COMPARISON:|$)/);
  if (!section) return [];
  return section[1].split("\n").filter(l => l.includes("|")).map(line => {
    const [role, verdict, conf, insight] = line.split("|").map(s => s.trim());
    return { role: role || "", verdict: verdict || "", confidence: parseInt(conf, 10) || 0, insight: insight || "" };
  }).filter(a => a.role);
}

function parseLeverageStack(text: string): { point: string; power: number; category: string }[] {
  const section = text.match(/LEVERAGE_STACK:\n([\s\S]*?)(?=\n\n|JURISDICTION_COMPARISON:|$)/);
  if (!section) return [];
  return section[1].split("\n").filter(l => l.includes("|")).map(line => {
    const [point, power, category] = line.split("|").map(s => s.trim());
    return { point: point || "", power: parseInt(power, 10) || 0, category: category || "Legal" };
  }).filter(l => l.point && l.power > 0).sort((a, b) => b.power - a.power);
}

function parseJurisdictionComparison(text: string): { jurisdiction: string; score: number; advantage: string }[] {
  const section = text.match(/JURISDICTION_COMPARISON:\n([\s\S]*?)(?=\n\n|CITATION_AUDIT:|$)/);
  if (!section) return [];
  return section[1].split("\n").filter(l => l.includes("|")).map(line => {
    const [j, score, adv] = line.split("|").map(s => s.trim());
    return { jurisdiction: j || "", score: parseInt(score, 10) || 0, advantage: adv || "" };
  }).filter(j => j.jurisdiction && j.score > 0);
}

export interface CitationAuditEntry {
  citation: string;
  claim: string;
  status: string;
  confidence: number;
  evidenceType: string;
  source: string;
}

function parseCitationAudit(text: string): CitationAuditEntry[] {
  const section = text.match(/CITATION_AUDIT:\n([\s\S]*?)(?=\n\n##|\n\nEnd with|$)/);
  if (!section) return [];
  return section[1].split("\n").filter(l => l.includes("|")).map(line => {
    const parts = line.split("|").map(s => s.trim());
    const [citation, claim, status, conf, evidenceType, source] = parts;
    return {
      citation: citation || "",
      claim: claim || "",
      status: status || "Unverified",
      confidence: parseInt(conf, 10) || 0,
      evidenceType: evidenceType || "Statute",
      source: source || "",
    };
  }).filter(c => c.citation && !c.citation.startsWith("[") && !c.citation.toLowerCase().startsWith("citation"));
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

// Multi-Agent Council — shows internal AI law-firm deliberation
const verdictStyle = (v: string) => {
  const s = v.toLowerCase();
  if (s.includes("proceed with caution")) return "bg-yellow-400/15 text-yellow-400 border-yellow-400/30";
  if (s.includes("proceed")) return "bg-green-400/15 text-green-400 border-green-400/30";
  if (s.includes("settle")) return "bg-blue-400/15 text-blue-400 border-blue-400/30";
  if (s.includes("hold")) return "bg-muted text-muted-foreground border-border";
  if (s.includes("escalate")) return "bg-red-400/15 text-red-400 border-red-400/30";
  return "bg-secondary text-secondary-foreground border-border";
};
const roleIcon = (role: string) => {
  const r = role.toLowerCase();
  if (r.includes("research")) return BookMarkedIcon;
  if (r.includes("litig")) return Gavel;
  if (r.includes("compliance")) return Shield;
  if (r.includes("forensic") || r.includes("invest")) return Target;
  if (r.includes("settle") || r.includes("strateg")) return Scale;
  if (r.includes("partner")) return Crown;
  return Brain;
};
function BookMarkedIcon(props: React.SVGProps<SVGSVGElement>) {
  return <Brain {...props} />;
}

const MultiAgentCouncil = ({ data }: { data: { role: string; verdict: string; confidence: number; insight: string }[] }) => {
  const partner = data.find(d => d.role.toLowerCase().includes("partner"));
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">AI Law-Firm Council</h4>
          <span className="text-[10px] text-muted-foreground">{data.length} agents deliberated</span>
        </div>
        {partner && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${verdictStyle(partner.verdict)}`}>
            <Crown className="w-3 h-3 inline mr-1" />Partner: {partner.verdict}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {data.map((agent, i) => {
          const Icon = roleIcon(agent.role);
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border/40 hover:border-primary/40 transition-colors">
              <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground truncate">{agent.role}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${verdictStyle(agent.verdict)}`}>{agent.verdict}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{agent.insight}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="flex-1 h-1 bg-secondary/60 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${agent.confidence}%` }}
                      transition={{ duration: 1, delay: i * 0.08 }} />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground">{agent.confidence}%</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Leverage Stack — ranked negotiation power
const categoryColor: Record<string, string> = {
  Legal: "hsl(210, 60%, 50%)",
  Financial: "hsl(47, 96%, 53%)",
  Reputational: "hsl(280, 67%, 55%)",
  Regulatory: "hsl(190, 80%, 45%)",
  Evidentiary: "hsl(142, 76%, 36%)",
  Procedural: "hsl(0, 84%, 60%)",
};

const LeverageStack = ({ data }: { data: { point: string; power: number; category: string }[] }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
    <div className="flex items-center gap-2 mb-3">
      <Flame className="w-5 h-5 text-orange-400" />
      <h4 className="text-sm font-semibold text-foreground">Negotiation Leverage Stack</h4>
      <span className="text-[10px] text-muted-foreground">ranked by power</span>
    </div>
    <div className="space-y-2">
      {data.map((item, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
          className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 w-5 shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground font-mono">#{i + 1}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-xs text-foreground truncate">{item.point}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border/50"
                  style={{ color: categoryColor[item.category] || "hsl(210, 60%, 50%)" }}>{item.category}</span>
                <span className="text-[10px] font-mono font-bold text-foreground w-7 text-right">{item.power}</span>
              </div>
            </div>
            <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full"
                style={{ backgroundColor: categoryColor[item.category] || "hsl(210, 60%, 50%)" }}
                initial={{ width: 0 }} animate={{ width: `${item.power}%` }}
                transition={{ duration: 1, delay: i * 0.07, ease: "easeOut" }} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// Jurisdiction Comparison
const JurisdictionComparison = ({ data }: { data: { jurisdiction: string; score: number; advantage: string }[] }) => {
  const best = [...data].sort((a, b) => b.score - a.score)[0];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-cyan-400" />
          <h4 className="text-sm font-semibold text-foreground">Forum / Jurisdiction Comparison</h4>
        </div>
        {best && <span className="text-[10px] text-cyan-400">Optimal: {best.jurisdiction}</span>}
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 25%, 18%)" />
            <XAxis dataKey="jurisdiction" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}/100 favorability`} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.jurisdiction === best?.jurisdiction ? "hsl(190, 80%, 45%)" : "hsl(210, 60%, 50%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 space-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${d.jurisdiction === best?.jurisdiction ? "bg-cyan-400" : "bg-primary"}`} />
            <span className="font-medium text-foreground shrink-0">{d.jurisdiction}</span>
            <span className="text-muted-foreground flex-1">{d.advantage}</span>
            <span className="font-mono text-foreground">{d.score}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Citation Audit — verifies every legal citation
const statusMeta = (status: string): { color: string; bg: string; border: string; Icon: React.ElementType; label: string } => {
  const s = status.toLowerCase();
  if (s.includes("verified") && !s.includes("un")) return { color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/40", Icon: BadgeCheck, label: "Verified" };
  if (s.includes("likely")) return { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/40", Icon: BadgeCheck, label: "Likely Valid" };
  if (s.includes("hallucin")) return { color: "text-red-500", bg: "bg-red-500/15", border: "border-red-500/50", Icon: AlertOctagon, label: "Hallucination Risk" };
  if (s.includes("disput")) return { color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/40", Icon: XCircle, label: "Disputed" };
  if (s.includes("outdat")) return { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/40", Icon: History, label: "Outdated" };
  return { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/40", Icon: HelpCircle, label: "Unverified" };
};

const evidenceTypeColor: Record<string, string> = {
  "Case Law": "hsl(280, 67%, 55%)",
  "Statute": "hsl(210, 60%, 50%)",
  "Regulation": "hsl(190, 80%, 45%)",
  "Constitutional": "hsl(47, 96%, 53%)",
  "Treaty": "hsl(142, 76%, 36%)",
  "Secondary": "hsl(215, 15%, 55%)",
  "Procedural Rule": "hsl(0, 84%, 60%)",
};

const verificationLink = (citation: string, source: string): string => {
  const q = encodeURIComponent(`${citation} ${source}`.trim());
  return `https://scholar.google.com/scholar?q=${q}`;
};

const CitationAudit = ({ data }: { data: CitationAuditEntry[] }) => {
  const [filter, setFilter] = useState<string>("all");
  const counts = useMemo(() => {
    const c = { verified: 0, likely: 0, unverified: 0, disputed: 0, outdated: 0, hallucination: 0 };
    data.forEach(d => {
      const s = d.status.toLowerCase();
      if (s.includes("hallucin")) c.hallucination++;
      else if (s.includes("disput")) c.disputed++;
      else if (s.includes("outdat")) c.outdated++;
      else if (s.includes("likely")) c.likely++;
      else if (s.includes("verified")) c.verified++;
      else c.unverified++;
    });
    return c;
  }, [data]);

  const trustScore = useMemo(() => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, d) => {
      const s = d.status.toLowerCase();
      const weight = s.includes("hallucin") ? 0 : s.includes("disput") ? 0.2 : s.includes("outdat") ? 0.4 : s.includes("unverified") ? 0.5 : s.includes("likely") ? 0.85 : 1;
      return acc + (d.confidence * weight);
    }, 0);
    return Math.round(sum / data.length);
  }, [data]);

  const filtered = useMemo(() => {
    if (filter === "all") return data;
    return data.filter(d => {
      const s = d.status.toLowerCase();
      if (filter === "flagged") return s.includes("hallucin") || s.includes("disput") || s.includes("outdat") || s.includes("unverified");
      if (filter === "verified") return s.includes("verified") || s.includes("likely");
      return true;
    });
  }, [data, filter]);

  const trustColor = trustScore >= 75 ? "text-green-400" : trustScore >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-teal-400" />
          <h4 className="text-sm font-semibold text-foreground">Citation Audit</h4>
          <span className="text-[10px] text-muted-foreground">{data.length} authorities checked</span>
        </div>
        <div className={`text-xs font-bold ${trustColor}`}>Trust Score: {trustScore}/100</div>
      </div>

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {counts.verified > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/30 flex items-center gap-1"><BadgeCheck className="w-3 h-3" />{counts.verified} verified</span>}
        {counts.likely > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">{counts.likely} likely</span>}
        {counts.unverified > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 flex items-center gap-1"><HelpCircle className="w-3 h-3" />{counts.unverified} unverified</span>}
        {counts.outdated > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30 flex items-center gap-1"><History className="w-3 h-3" />{counts.outdated} outdated</span>}
        {counts.disputed > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-400 border border-orange-400/30 flex items-center gap-1"><XCircle className="w-3 h-3" />{counts.disputed} disputed</span>}
        {counts.hallucination > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/40 flex items-center gap-1 animate-pulse"><AlertOctagon className="w-3 h-3" />{counts.hallucination} hallucination risk</span>}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 border-b border-border/40">
        {[
          { id: "all", label: `All (${data.length})` },
          { id: "verified", label: `✓ Trusted (${counts.verified + counts.likely})` },
          { id: "flagged", label: `⚠ Flagged (${counts.unverified + counts.outdated + counts.disputed + counts.hallucination})` },
        ].map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={`text-[10px] px-2.5 py-1 rounded-t-md transition-colors ${filter === t.id ? "bg-secondary/60 text-foreground border-b-2 border-teal-400" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Citation cards */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
        {filtered.map((c, i) => {
          const meta = statusMeta(c.status);
          const evidenceColor = evidenceTypeColor[c.evidenceType] || "hsl(210, 60%, 50%)";
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={`p-2.5 rounded-lg border ${meta.border} ${meta.bg}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-start gap-1.5 flex-1 min-w-0">
                  <meta.Icon className={`w-3.5 h-3.5 ${meta.color} mt-0.5 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-semibold text-foreground break-words">{c.citation}</p>
                    {c.claim && <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">Supports: <span className="text-secondary-foreground">{c.claim}</span></p>}
                  </div>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${meta.color} ${meta.bg} border ${meta.border} shrink-0 whitespace-nowrap`}>
                  {meta.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border/50" style={{ color: evidenceColor }}>
                    {c.evidenceType}
                  </span>
                  {c.source && <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">📖 {c.source}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1 bg-secondary/60 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: evidenceColor }}
                        initial={{ width: 0 }} animate={{ width: `${c.confidence}%` }} transition={{ duration: 0.8, delay: i * 0.04 }} />
                    </div>
                    <span className="text-[9px] font-mono text-foreground">{c.confidence}%</span>
                  </div>
                  <a href={verificationLink(c.citation, c.source)} target="_blank" rel="noopener noreferrer"
                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-secondary-foreground hover:bg-primary/20 hover:text-primary transition-colors flex items-center gap-1"
                    title="Verify on Google Scholar">
                    Verify <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No citations match this filter.</p>
        )}
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
  const council = useMemo(() => parseMultiAgent(content), [content]);
  const leverage = useMemo(() => parseLeverageStack(content), [content]);
  const jurisdictions = useMemo(() => parseJurisdictionComparison(content), [content]);
  const citations = useMemo(() => parseCitationAudit(content), [content]);

  const hasVisuals = riskScore !== null || confidence !== null || outcomes.length > 0 || timeline.length > 0 || council.length > 0 || citations.length > 0;
  if (!hasVisuals) return null;

  return (
    <div className="mt-4">
      <SummaryStats risk={riskScore} confidence={confidence} outcomes={outcomes} />

      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 mb-2 transition-colors">
        <BarChart3 className="w-3.5 h-3.5" />
        <span className="font-medium">ProLAW Intelligence Dashboard</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
            {council.length > 0 && <MultiAgentCouncil data={council} />}
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
            {leverage.length > 0 && <LeverageStack data={leverage} />}
            {strengths.length > 0 && <StrengthRadar data={strengths} />}
            {jurisdictions.length > 0 && <JurisdictionComparison data={jurisdictions} />}
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
