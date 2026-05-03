// Client-side document parsing for PDF, DOCX, and plain text.
import * as pdfjsLib from "pdfjs-dist";
// Use a CDN worker URL to keep build simple
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = "";
    const maxPages = Math.min(pdf.numPages, 50);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
      text += `\n--- Page ${i} ---\n${pageText}\n`;
    }
    return text.trim();
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const buf = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return value || "";
  }

  // Plain text fallback (txt, md, csv, etc.)
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
