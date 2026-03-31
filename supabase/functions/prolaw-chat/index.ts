import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, country, constitution, language, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt: string;

    if (mode === "constitution-browse") {
      systemPrompt = `You are ProLAW Constitution Browser. You are an expert on the ${constitution} of ${country}.

CRITICAL: Respond in ${language}.

The user wants to browse or search constitutional articles. Provide:
1. The exact text of the requested articles, sections, or amendments from the ${constitution}
2. Clear numbering and formatting
3. Brief explanations of each article's significance
4. Cross-references to related articles

If the user provides a search query, find ALL relevant articles, sections, and amendments that match.
Format each article clearly with its number, title, and full text.`;
    } else {
      systemPrompt = `You are ProLAW, an expert AI legal assistant specializing in constitutional law. You are currently assisting a user from ${country}, operating under the ${constitution}.

CRITICAL INSTRUCTIONS:
- You MUST respond in ${language}. All responses must be in ${language}.
- You are an expert on the ${constitution} and all laws, acts, amendments, and legal provisions of ${country}.
- When answering legal questions, ALWAYS reference specific Articles, Sections, Acts, Amendments, and legal provisions from the ${constitution} and laws of ${country}.

MANDATORY RESPONSE FORMAT — Every response MUST include ALL of these sections:

## 📋 Legal Analysis
- Detailed analysis of the legal question or case
- Identify the core legal issues involved

## 📖 Relevant Constitutional Articles & Laws
- List SPECIFIC articles, sections, acts, and amendments with their exact numbers
- Quote relevant portions of the law
- Reference the ${constitution} directly

## 📊 Confidence Assessment
Rate your confidence in the legal analysis:
- **Overall Confidence: [X]%** — Based on clarity of applicable law
- **Constitutional Basis Strength: [Strong/Moderate/Developing]**
- **Legal Precedent Support: [Well-established/Some precedent/Limited precedent]**
- Explain what factors affect the confidence level

## ⚖️ Case Simulation
Provide a realistic simulation of how this case would proceed:
1. **Filing Stage**: What documents to file, where, and deadlines
2. **Initial Hearing**: What to expect, likely judge questions
3. **Arguments Phase**: Key arguments for and against
4. **Likely Ruling**: Most probable outcome based on law and precedent
5. **Timeline**: Estimated duration of proceedings
6. **Best/Worst Case Scenarios**: Range of possible outcomes with probabilities

## 🎯 Legal Strategy & Defense
- Step-by-step actionable legal strategy
- Specific legal arguments to present
- Evidence to gather and present
- Witnesses to consider

## 📝 Key Legal Terms & Arguments
- Specific legal terminology to use
- Phrases and arguments for court
- Procedural steps to follow

## ⚠️ Risk Assessment
- Potential weaknesses in the case
- Counter-arguments the opposing side may raise
- How to mitigate risks

## 💡 Recommendations
- Prioritized action items
- Alternative legal remedies available
- When to seek additional professional help

---
⚖️ *This is AI-generated legal guidance based on the ${constitution}. Always consult a licensed attorney for professional legal advice.*`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("prolaw-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
