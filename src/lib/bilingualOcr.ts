// Script-based language segmentation for OCR output.
// Detects Unicode script ranges per paragraph and labels them so the
// downstream LLM extractor can process bilingual / multilingual documents
// accurately (e.g. Arabic + French contracts, Chinese + English filings).

export type ScriptCode =
  | "latin"
  | "arabic"
  | "hebrew"
  | "cyrillic"
  | "greek"
  | "devanagari"
  | "bengali"
  | "tamil"
  | "thai"
  | "cjk"
  | "hangul"
  | "kana"
  | "ethiopic"
  | "other";

const SCRIPT_RANGES: { code: Exclude<ScriptCode, "other">; test: (cp: number) => boolean }[] = [
  { code: "latin",      test: cp => (cp >= 0x0041 && cp <= 0x024F) || (cp >= 0x1E00 && cp <= 0x1EFF) },
  { code: "arabic",     test: cp => (cp >= 0x0600 && cp <= 0x06FF) || (cp >= 0x0750 && cp <= 0x077F) || (cp >= 0xFB50 && cp <= 0xFDFF) || (cp >= 0xFE70 && cp <= 0xFEFF) },
  { code: "hebrew",     test: cp => cp >= 0x0590 && cp <= 0x05FF },
  { code: "cyrillic",   test: cp => cp >= 0x0400 && cp <= 0x04FF },
  { code: "greek",      test: cp => cp >= 0x0370 && cp <= 0x03FF },
  { code: "devanagari", test: cp => cp >= 0x0900 && cp <= 0x097F },
  { code: "bengali",    test: cp => cp >= 0x0980 && cp <= 0x09FF },
  { code: "tamil",      test: cp => cp >= 0x0B80 && cp <= 0x0BFF },
  { code: "thai",       test: cp => cp >= 0x0E00 && cp <= 0x0E7F },
  { code: "cjk",        test: cp => (cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF) || (cp >= 0xF900 && cp <= 0xFAFF) },
  { code: "hangul",     test: cp => (cp >= 0xAC00 && cp <= 0xD7AF) || (cp >= 0x1100 && cp <= 0x11FF) },
  { code: "kana",       test: cp => (cp >= 0x3040 && cp <= 0x30FF) || (cp >= 0x31F0 && cp <= 0x31FF) },
  { code: "ethiopic",   test: cp => cp >= 0x1200 && cp <= 0x137F },
];

const SCRIPT_LABEL: Record<ScriptCode, string> = {
  latin: "Latin", arabic: "Arabic", hebrew: "Hebrew", cyrillic: "Cyrillic",
  greek: "Greek", devanagari: "Devanagari", bengali: "Bengali", tamil: "Tamil",
  thai: "Thai", cjk: "CJK (Chinese/Japanese)", hangul: "Korean",
  kana: "Japanese Kana", ethiopic: "Ethiopic", other: "Other",
};

export function detectScriptCounts(text: string): Record<ScriptCode, number> {
  const counts: Record<ScriptCode, number> = {
    latin: 0, arabic: 0, hebrew: 0, cyrillic: 0, greek: 0, devanagari: 0,
    bengali: 0, tamil: 0, thai: 0, cjk: 0, hangul: 0, kana: 0, ethiopic: 0, other: 0,
  };
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp == null) continue;
    // Skip whitespace, punctuation, digits — they're script-neutral
    if (cp < 0x0030 || (cp >= 0x0030 && cp <= 0x0040 && !(cp >= 0x0030 && cp <= 0x0039))) continue;
    if (cp >= 0x0030 && cp <= 0x0039) continue;
    let matched: ScriptCode = "other";
    for (const r of SCRIPT_RANGES) {
      if (r.test(cp)) { matched = r.code; break; }
    }
    counts[matched]++;
  }
  return counts;
}

/** Returns the dominant script code for a chunk of text. */
export function dominantScript(text: string): ScriptCode {
  const counts = detectScriptCounts(text);
  let best: ScriptCode = "latin";
  let bestN = -1;
  (Object.keys(counts) as ScriptCode[]).forEach(k => {
    if (k === "other") return;
    if (counts[k] > bestN) { bestN = counts[k]; best = k; }
  });
  return bestN <= 0 ? "other" : best;
}

export interface LanguageSegment {
  script: ScriptCode;
  label: string;
  text: string;
  charCount: number;
}

/**
 * Split raw text into paragraph-level segments, each labelled with its
 * dominant Unicode script. Adjacent paragraphs that share a script are merged
 * to produce clean bilingual blocks.
 */
export function splitByScript(rawText: string, minSegmentChars = 20): LanguageSegment[] {
  const paragraphs = rawText
    .split(/\n{2,}|\r\n{2,}|(?:\n\s*---[^\n]*---\s*\n)/g)
    .map(p => p.trim())
    .filter(Boolean);

  const segments: LanguageSegment[] = [];
  for (const p of paragraphs) {
    const script = dominantScript(p);
    if (segments.length && segments[segments.length - 1].script === script) {
      const last = segments[segments.length - 1];
      last.text += "\n\n" + p;
      last.charCount = last.text.length;
    } else {
      segments.push({ script, label: SCRIPT_LABEL[script], text: p, charCount: p.length });
    }
  }
  // Drop tiny noise segments (e.g. a stray punctuation block)
  return segments.filter(s => s.charCount >= minSegmentChars || segments.length === 1);
}

export interface BilingualAnalysis {
  segments: LanguageSegment[];
  scripts: ScriptCode[];
  isMultilingual: boolean;
  /** Markdown-formatted text with each language block clearly labelled. */
  annotated: string;
}

export function analyzeBilingual(rawText: string): BilingualAnalysis {
  const segments = splitByScript(rawText);
  const scripts = Array.from(new Set(segments.map(s => s.script))).filter(s => s !== "other");
  const isMultilingual = scripts.length >= 2;

  const annotated = isMultilingual
    ? segments
        .map((s, i) => `### [Block ${i + 1} — ${s.label} script, ${s.charCount} chars]\n${s.text}`)
        .join("\n\n")
    : rawText;

  return { segments, scripts, isMultilingual, annotated };
}
