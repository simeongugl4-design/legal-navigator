import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are ProLAW Document Intelligence — a forensic legal analyst that extracts structured case facts from any uploaded document (contract, complaint, email, police report, financial statement, evidence file).

You MUST call the tool "ingest_case_facts" exactly once with your best-effort extraction. Be aggressive about identifying facts even when implicit. Estimate numeric simulation inputs (0-100) by reading evidence quality, witness reliability, documentation completeness, and adversary sophistication signals. Never refuse — partial extraction is always better than nothing.`;

const TOOL = {
  type: "function",
  function: {
    name: "ingest_case_facts",
    description: "Return structured facts and simulation inputs extracted from the document.",
    parameters: {
      type: "object",
      properties: {
        documentType: { type: "string", description: "e.g. Employment Contract, Complaint, Email Thread, Bank Statement" },
        summary: { type: "string", description: "1-2 sentence neutral summary of the document" },
        parties: { type: "array", items: { type: "object", properties: { name: { type: "string" }, role: { type: "string" } }, required: ["name", "role"], additionalProperties: false } },
        keyDates: { type: "array", items: { type: "object", properties: { date: { type: "string" }, event: { type: "string" } }, required: ["date", "event"], additionalProperties: false } },
        monetaryAmounts: { type: "array", items: { type: "object", properties: { amount: { type: "string" }, context: { type: "string" } }, required: ["amount", "context"], additionalProperties: false } },
        legalIssues: { type: "array", items: { type: "string" }, description: "Legal causes of action or risks spotted" },
        keyClauses: { type: "array", items: { type: "object", properties: { clause: { type: "string" }, risk: { type: "string", enum: ["low", "medium", "high"] }, note: { type: "string" } }, required: ["clause", "risk", "note"], additionalProperties: false } },
        evidenceItems: { type: "array", items: { type: "string" }, description: "Concrete evidence the document provides or references" },
        redFlags: { type: "array", items: { type: "string" }, description: "Suspicious patterns, missing signatures, unusual terms" },
        simulationInputs: {
          type: "object",
          description: "Best-estimate sliders (0-100) for the Simulation Lab",
          properties: {
            evidenceStrength: { type: "number" },
            witnessCredibility: { type: "number" },
            documentationQuality: { type: "number" },
            oppositionStrength: { type: "number" },
            timelineUrgency: { type: "number" },
            publicSentiment: { type: "number" },
            suggestedVenue: { type: "string", enum: ["federal", "state", "smallclaims", "arbitration", "mediation", "appellate"] },
            suggestedStrategy: { type: "string", enum: ["aggressive", "balanced", "settlement"] },
            rationale: { type: "string", description: "Why these inputs were chosen" },
          },
          required: ["evidenceStrength", "witnessCredibility", "documentationQuality", "oppositionStrength", "timelineUrgency", "publicSentiment", "suggestedVenue", "suggestedStrategy", "rationale"],
          additionalProperties: false,
        },
        recommendedQuestions: { type: "array", items: { type: "string" }, description: "3-5 strategic follow-up questions the user should ask ProLAW about this document" },
      },
      required: ["documentType", "summary", "parties", "keyDates", "monetaryAmounts", "legalIssues", "keyClauses", "evidenceItems", "redFlags", "simulationInputs", "recommendedQuestions"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentText, filename, country, language, bilingual } = await req.json();
    if (!documentText || typeof documentText !== "string") {
      return new Response(JSON.stringify({ error: "documentText is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Cap text size to keep latency reasonable
    const text = documentText.slice(0, 60000);

    const bilingualNote = bilingual && bilingual.scripts?.length
      ? `\n\nMULTILINGUAL DOCUMENT: This document was auto-detected as containing ${bilingual.scripts.length} scripts (${bilingual.scripts.join(", ")}) and was pre-segmented into ${bilingual.segments} blocks marked with "### [Block N — Script, chars]" headers below. For each block:\n- Translate non-English content internally before extraction\n- Cross-reference parties/dates/amounts that appear in multiple language blocks (they often refer to the same entities) and DEDUPLICATE them in your output\n- Note in the summary which languages are present and which version is authoritative if discernible (e.g. "the French version controls per clause X")\n- If clauses differ between language versions, flag this as a redFlag.`
      : "";

    const userPrompt = `Filename: ${filename || "unknown"}
Jurisdiction: ${country || "not specified"}
Response language: ${language || "English"}${bilingualNote}

DOCUMENT CONTENT:
"""
${text}
"""

Extract every actionable fact. Estimate the simulationInputs based on what you observe in the document.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "ingest_case_facts" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited, please wait." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("Gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "No structured extraction returned" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let facts;
    try {
      facts = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Parse error:", e);
      return new Response(JSON.stringify({ error: "Malformed extraction" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ facts }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("extract error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
