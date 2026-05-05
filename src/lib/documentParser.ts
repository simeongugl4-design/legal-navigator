// Client-side document parsing for PDF (with OCR fallback), DOCX, and plain text.
import * as pdfjsLib from "pdfjs-dist";
import { analyzeBilingual, type BilingualAnalysis } from "./bilingualOcr";
// Use a CDN worker URL to keep build simple
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export type ParseProgress = (info: {
  stage: "parsing" | "ocr" | "done" | "bilingual";
  page?: number;
  totalPages?: number;
  message?: string;
  bilingual?: BilingualAnalysis;
}) => void;

// Heuristic: if extracted text is shorter than this for a page, we treat it as scanned.
const OCR_MIN_CHARS_PER_PAGE = 40;

export interface OcrOptions {
  /** Tesseract language string, e.g. "eng", "fra+eng", "ara+eng". Defaults to "eng". */
  langs?: string;
}

async function ocrPage(page: any, pageNum: number, langs: string, scale = 2): Promise<string> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  await page.render({ canvasContext: ctx, viewport }).promise;

  // Lazy import so the OCR engine only loads when needed
  const Tesseract: any = await import("tesseract.js");
  const { data } = await Tesseract.recognize(canvas, langs);
  // Free canvas memory
  canvas.width = 0;
  canvas.height = 0;
  return (data?.text || "").trim();
}

export async function extractTextFromFile(
  file: File,
  onProgress?: ParseProgress,
  options: OcrOptions = {},
): Promise<string> {
  const name = file.name.toLowerCase();
  const langs = options.langs && options.langs.trim().length > 0 ? options.langs : "eng";

  if (name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = "";
    const maxPages = Math.min(pdf.numPages, 50);
    let scannedPagesCount = 0;

    for (let i = 1; i <= maxPages; i++) {
      onProgress?.({ stage: "parsing", page: i, totalPages: maxPages });
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ").trim();

      if (pageText.length >= OCR_MIN_CHARS_PER_PAGE) {
        text += `\n--- Page ${i} ---\n${pageText}\n`;
      } else {
        // Scanned / image-only page → OCR fallback
        scannedPagesCount++;
        onProgress?.({
          stage: "ocr",
          page: i,
          totalPages: maxPages,
          message: `Running OCR on page ${i} (scanned) [${langs}]…`,
        });
        try {
          const ocrText = await ocrPage(page, i, langs);
          text += `\n--- Page ${i} (OCR) ---\n${ocrText}\n`;
        } catch (err) {
          console.warn(`OCR failed on page ${i}`, err);
          text += `\n--- Page ${i} (OCR failed) ---\n`;
        }
      }
    }

    // Multilingual segmentation: detect & split by script for accurate extraction
    const bilingual = analyzeBilingual(text);
    if (bilingual.isMultilingual) {
      onProgress?.({
        stage: "bilingual",
        bilingual,
        message: `Detected ${bilingual.scripts.length} scripts: ${bilingual.segments.map(s => s.label).filter((v, i, a) => a.indexOf(v) === i).join(", ")}`,
      });
    }
    onProgress?.({
      stage: "done",
      totalPages: maxPages,
      message: scannedPagesCount > 0 ? `OCR applied to ${scannedPagesCount} scanned page(s).` : undefined,
      bilingual: bilingual.isMultilingual ? bilingual : undefined,
    });
    return bilingual.isMultilingual ? bilingual.annotated : text.trim();
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const buf = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    onProgress?.({ stage: "done" });
    return value || "";
  }

  // Image OCR (png/jpg/jpeg/webp) — useful for scanned receipts, evidence photos
  if (/\.(png|jpe?g|webp|bmp)$/i.test(name)) {
    onProgress?.({ stage: "ocr", message: `Running OCR on image [${langs}]…` });
    const Tesseract: any = await import("tesseract.js");
    const url = URL.createObjectURL(file);
    try {
      const { data } = await Tesseract.recognize(url, langs);
      onProgress?.({ stage: "done" });
      return (data?.text || "").trim();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Plain text fallback (txt, md, csv, etc.)
  onProgress?.({ stage: "done" });
  return await file.text();
}

export type IngestedFacts = {
  documentType: string;
  summary: string;
  parties: { name: string; role: string }[];
  keyDates: { date: string; event: string }[];
  monetaryAmounts: { amount: string; context: string }[];
  legalIssues: string[];
  keyClauses: { clause: string; risk: "low" | "medium" | "high"; note: string }[];
  evidenceItems: string[];
  redFlags: string[];
  simulationInputs: {
    evidenceStrength: number;
    witnessCredibility: number;
    documentationQuality: number;
    oppositionStrength: number;
    timelineUrgency: number;
    publicSentiment: number;
    suggestedVenue: string;
    suggestedStrategy: string;
    rationale: string;
  };
  recommendedQuestions: string[];
};
