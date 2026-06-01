import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Upload, FileSearch, ArrowLeft, AlertOctagon, ShieldCheck, ShieldAlert, Sparkles, FileWarning, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/appStore";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromFile } from "@/lib/documentParser";
import { ocrLangsFor } from "@/lib/ocrLanguages";
import prolawLogo from "@/assets/prolaw-logo.jpeg";

interface Clause {
  index: number;
  anchor: string;
  clauseType: string;
  originalExcerpt: string;
  plainEnglish: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  enforceabilityScore: number;
  loopholes: string[];
  jurisdictionIssues: string[];
  sectionRecommendation: string;
  suggestedRewrite: string;
}

interface XRayResult {
  contractType: string;
  parties: string[];
  governingLawDetected: string;
  overallRiskScore: number;
  executiveSummary: string;
  topThreeFixes: string[];
  missingClauses: { clauseType: string; whyNeeded: string; jurisdictionBasis: string }[];
  clauses: Clause[];
}

const RISK_STYLES: Record<Clause["riskLevel"], string> = {
  low: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  high: "bg-orange-500/10 text-orange-300 border-orange-500/30",
  critical: "bg-rose-500/15 text-rose-300 border-rose-500/40",
};

const ContractXRayPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedCountry, selectedLanguage } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult] = useState<XRayResult | null>(null);
  const [filename, setFilename] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (!selectedCountry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="text-center space-y-4 max-w-md">
          <FileSearch className="w-12 h-12 mx-auto text-primary" />
          <h1 className="font-serif text-3xl">Select a Jurisdiction</h1>
          <p className="text-muted-foreground">Contract X-Ray analysis must be grounded in a specific country's laws.</p>
          <button onClick={() => navigate("/")} className="px-5 py-2 rounded-md bg-primary text-primary-foreground">Choose Country</button>
        </div>
      </div>
    );
  }

  const handleFile = async (file: File) => {
    setFilename(file.name);
    setResult(null);
    setParsing(true);
    setProgressMsg("Extracting text…");
    try {
      const text = await extractTextFromFile(
        file,
        (info) => {
          if (info.stage === "ocr") setProgressMsg(info.message || `OCR page ${info.page}`);
          else if (info.stage === "parsing") setProgressMsg(`Parsing page ${info.page}/${info.totalPages}`);
          else if (info.stage === "bilingual") setProgressMsg(info.message || "Bilingual segmentation");
        },
        { langs: ocrLangsFor(selectedCountry.code, selectedLanguage?.code) },
      );
      setParsing(false);
      setAnalyzing(true);
      setProgressMsg("Running X-Ray clause analysis…");
      const { data, error } = await supabase.functions.invoke("prolaw-xray", {
        body: {
          contractText: text,
          filename: file.name,
          country: selectedCountry.name,
          language: selectedLanguage?.name || "English",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.xray);
      toast({ title: "X-Ray complete", description: `${data.xray.clauses.length} clauses analyzed under ${selectedCountry.name} law.` });
    } catch (e) {
      toast({ title: "Analysis failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setParsing(false);
      setAnalyzing(false);
      setProgressMsg("");
    }
  };

  const busy = parsing || analyzing;
  const toggleClause = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 bg-card/30 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-muted rounded-md">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <img src={prolawLogo} alt="ProLAW" className="w-9 h-9 rounded" />
            <div>
              <h1 className="font-serif text-xl flex items-center gap-2"><FileSearch className="w-5 h-5 text-primary" /> Contract X-Ray</h1>
              <p className="text-xs text-muted-foreground">{selectedCountry.name} · {selectedLanguage?.name || "English"}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-dashed border-border rounded-2xl p-12 text-center bg-card/40"
          >
            <FileSearch className="w-14 h-14 mx-auto mb-4 text-primary" />
            <h2 className="font-serif text-2xl mb-2">Upload a contract to X-Ray</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              ProLAW will segment every clause, score risk &amp; enforceability under <strong>{selectedCountry.name}</strong> law,
              flag loopholes, and generate redline-ready rewrites.
            </p>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {busy ? progressMsg || "Working…" : "Select contract"}
            </button>
            <p className="text-xs text-muted-foreground mt-4">PDF, DOCX, images (OCR), or plain text. Up to 50 pages.</p>
          </motion.div>
        )}

        {busy && result === null && filename && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> {progressMsg} — {filename}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Verdict */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card/60 p-6"
            >
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Verdict</div>
                  <h2 className="font-serif text-2xl mt-1">{result.contractType}</h2>
                  <p className="text-sm text-muted-foreground">
                    Parties: {result.parties.join(" · ") || "—"} · Governing law detected: {result.governingLawDetected || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Overall Risk</div>
                  <div className={`text-4xl font-serif ${result.overallRiskScore >= 70 ? "text-rose-400" : result.overallRiskScore >= 40 ? "text-amber-300" : "text-emerald-400"}`}>
                    {result.overallRiskScore}
                    <span className="text-base text-muted-foreground">/100</span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed">{result.executiveSummary}</p>

              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="rounded-lg border border-border/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2"><Sparkles className="w-4 h-4 text-primary" /> Top fixes</div>
                  <ul className="space-y-1.5 text-sm">
                    {result.topThreeFixes.map((f, i) => (
                      <li key={i} className="flex gap-2"><span className="text-primary">{i + 1}.</span><span>{f}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2"><FileWarning className="w-4 h-4 text-amber-400" /> Missing clauses ({selectedCountry.name})</div>
                  {result.missingClauses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No critical omissions detected.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {result.missingClauses.map((m, i) => (
                        <li key={i}>
                          <div className="font-medium">{m.clauseType}</div>
                          <div className="text-xs text-muted-foreground">{m.whyNeeded} <span className="italic">— {m.jurisdictionBasis}</span></div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </motion.section>

            {/* Clauses */}
            <section className="space-y-3">
              <h3 className="font-serif text-xl flex items-center gap-2"><AlertOctagon className="w-5 h-5 text-primary" /> Clause-by-clause X-Ray ({result.clauses.length})</h3>
              {result.clauses.map((c) => {
                const open = expanded.has(c.index);
                return (
                  <motion.article
                    key={c.index}
                    layout
                    className={`rounded-xl border ${RISK_STYLES[c.riskLevel]} bg-card/40`}
                  >
                    <button onClick={() => toggleClause(c.index)} className="w-full text-left p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider">
                          <span className="font-semibold">§{c.index}</span>
                          <span className="opacity-80">{c.clauseType}</span>
                          <span className={`px-2 py-0.5 rounded border text-[10px] ${RISK_STYLES[c.riskLevel]}`}>{c.riskLevel}</span>
                          <span className="opacity-70 text-[10px]">Enforceability: {c.enforceabilityScore}/100</span>
                        </div>
                        <div className="font-medium mt-1 truncate text-foreground">{c.anchor}</div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">{open ? "▾" : "▸"}</div>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 space-y-3 text-sm">
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Original excerpt</div>
                          <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground">{c.originalExcerpt}</blockquote>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Plain English</div>
                          <p>{c.plainEnglish}</p>
                        </div>
                        {c.loopholes.length > 0 && (
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Loopholes</div>
                            <ul className="list-disc list-inside space-y-1">{c.loopholes.map((l, i) => <li key={i}>{l}</li>)}</ul>
                          </div>
                        )}
                        {c.jurisdictionIssues.length > 0 && (
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Conflicts under {selectedCountry.name} law</div>
                            <ul className="list-disc list-inside space-y-1">{c.jurisdictionIssues.map((l, i) => <li key={i}>{l}</li>)}</ul>
                          </div>
                        )}
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400" /> Recommendation</div>
                          <p>{c.sectionRecommendation}</p>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Suggested rewrite</div>
                          <pre className="whitespace-pre-wrap rounded-md bg-muted/40 border border-border/60 p-3 text-xs leading-relaxed">{c.suggestedRewrite}</pre>
                        </div>
                      </div>
                    )}
                  </motion.article>
                );
              })}
            </section>

            <div className="flex justify-end">
              <button
                onClick={() => { setResult(null); setExpanded(new Set()); setFilename(""); }}
                className="px-4 py-2 rounded-md border border-border hover:bg-muted text-sm"
              >
                Analyze another contract
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ContractXRayPage;
