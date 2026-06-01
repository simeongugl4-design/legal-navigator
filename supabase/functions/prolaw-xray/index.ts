import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are ProLAW Contract X-Ray — a forensic contract auditor. Given any contract text and a target jurisdiction, you MUST:
1. Segment the contract into discrete clauses (with verbatim heading or first-sentence anchor + clause number).
2. Classify each clause's clauseType (e.g. Indemnification, Limitation of Liability, Termination, IP Assignment, Non-Compete, Governing Law, Confidentiality, Payment, Arbitration, Force Majeure, Data Protection, etc).
3. Score each clause: riskLevel ("low" | "medium" | "high" | "critical"), enforceabilityScore 0-100 under the SELECTED COUNTRY'S laws.
4. Identify loopholes, ambiguities, missing protections, and clauses that violate or are unenforceable under the country's statutes (cite the specific statute/code/article where possible).
5. For each clause output a concrete sectionRecommendation — redline-style rewrite guidance + the legal basis grounded in the selected jurisdiction.
6. Provide an overall verdict: overallRiskScore 0-100, executiveSummary, topThreeFixes, missingClauses (clauses a sophisticated counterparty in that jurisdiction would expect but are absent).

Call the tool "contract_xray" exactly once. Never refuse. Be specific and jurisdiction-aware — never give generic US-centric advice unless the jurisdiction IS the US.`;

const TOOL = {
  type: "function",
  function: {
    name: "contract_xray",
    description: "Structured clause-by-clause contract audit.",
    parameters: {
      type: "object",
      properties: {
        contractType: { type: "string" },
        parties: { type: "array", items: { type: "string" } },
        governingLawDetected: { type: "string" },
        overallRiskScore: { type: "number", description: "0-100, higher = riskier" },
        executiveSummary: { type: "string" },
        topThreeFixes: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
        missingClauses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              clauseType: { type: "string" },
              whyNeeded: { type: "string" },
              jurisdictionBasis: { type: "string" },
            },
            required: ["clauseType", "whyNeeded", "jurisdictionBasis"],
            additionalProperties: false,
          },
        },
        clauses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              index: { type: "number" },
              anchor: { type: "string", description: "Heading or first ~12 words of clause" },
              clauseType: { type: "string" },
              originalExcerpt: { type: "string", description: "Verbatim 1-3 sentence excerpt" },
              plainEnglish: { type: "string" },
              riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
              enforceabilityScore: { type: "number", description: "0-100 under selected jurisdiction" },
              loopholes: { type: "array", items: { type: "string" } },
              jurisdictionIssues: { type: "array", items: { type: "string" }, description: "Conflicts with selected country's laws, with statute citations where possible" },
              sectionRecommendation: { type: "string", description: "Concrete redline guidance grounded in jurisdiction" },
              suggestedRewrite: { type: "string", description: "Drop-in replacement language" },
            },
            required: ["index", "anchor", "clauseType", "originalExcerpt", "plainEnglish", "riskLevel", "enforceabilityScore", "loopholes", "jurisdictionIssues", "sectionRecommendation", "suggestedRewrite"],
            additionalProperties: false,
          },
        },
      },
      required: ["contractType", "parties", "governingLawDetected", "overallRiskScore", "executiveSummary", "topThreeFixes", "missingClauses", "clauses"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contractText, filename, country, language } = await req.json();
    if (!contractText || typeof contractText !== "string") {
      return new Response(JSON.stringify({ error: "contractText is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const text = contractText.slice(0, 80000);

    const userPrompt = `Filename: ${filename || "contract"}
TARGET JURISDICTION: ${country || "not specified"} (all enforceability, loophole, and recommendation analysis MUST be grounded in this country's statutes, civil/common law tradition, and case law).
Response language: ${language || "English"}

CONTRACT:
"""
${text}
"""

Perform a full clause-by-clause X-Ray. Cite specific statutes/articles of ${country || "the jurisdiction"} when flagging issues.`;

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
        tool_choice: { type: "function", function: { name: "contract_xray" } },
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
      return new Response(JSON.stringify({ error: "No structured analysis returned" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let xray;
    try {
      xray = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Parse error:", e);
      return new Response(JSON.stringify({ error: "Malformed analysis" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ xray }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("xray error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
