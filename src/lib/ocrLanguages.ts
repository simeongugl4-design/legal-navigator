// Maps ISO-639-1 (and a few common 3-letter) language codes used by the app
// to Tesseract.js trained-data language codes.
// See: https://github.com/tesseract-ocr/tessdata
export const ISO_TO_TESSERACT: Record<string, string> = {
  en: "eng", fr: "fra", es: "spa", pt: "por", de: "deu", it: "ita", nl: "nld",
  ar: "ara", he: "heb", fa: "fas", ur: "urd",
  ru: "rus", uk: "ukr", be: "bel", bg: "bul", sr: "srp", mk: "mkd",
  pl: "pol", cs: "ces", sk: "slk", sl: "slv", hr: "hrv", bs: "bos",
  ro: "ron", hu: "hun", el: "ell", tr: "tur", az: "aze", kk: "kaz", uz: "uzb",
  zh: "chi_sim", "zh-cn": "chi_sim", "zh-tw": "chi_tra",
  ja: "jpn", ko: "kor", vi: "vie", th: "tha", lo: "lao", km: "khm", my: "mya",
  hi: "hin", bn: "ben", pa: "pan", gu: "guj", ta: "tam", te: "tel",
  kn: "kan", ml: "mal", mr: "mar", or: "ori", si: "sin", ne: "nep",
  am: "amh", ti: "tir", om: "orm", sw: "swa", so: "som", yo: "yor", ig: "ibo", ha: "hau",
  af: "afr", sq: "sqi", eu: "eus", ca: "cat", cy: "cym", ga: "gle",
  is: "isl", lv: "lav", lt: "lit", et: "est", fi: "fin", sv: "swe", no: "nor", da: "dan",
  id: "ind", ms: "msa", tl: "tgl",
  ka: "kat", hy: "hye",
  mg: "mlg", st: "sot", tn: "tsn", ss: "ssw", zu: "zul", xh: "xho",
  ber: "ber",
};

// Build a "+" joined Tesseract language string from app-side languages.
// Always include English as a fallback for legal documents that may be bilingual.
export function buildOcrLangs(opts: {
  selectedLanguageCode?: string | null;
  countryLanguageCodes?: string[]; // all official languages of the selected country
}): string {
  const set = new Set<string>();
  const add = (code?: string | null) => {
    if (!code) return;
    const key = code.toLowerCase();
    const tess = ISO_TO_TESSERACT[key];
    if (tess) set.add(tess);
  };
  add(opts.selectedLanguageCode);
  (opts.countryLanguageCodes || []).forEach(add);
  // Always include English as a safety net (legal docs are frequently bilingual).
  set.add("eng");
  // Tesseract supports concatenated languages with "+", up to a reasonable count.
  // Cap at 4 to avoid model-load latency blowups.
  return Array.from(set).slice(0, 4).join("+");
}
