import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, country, constitution, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are ProLAW, an expert AI legal assistant specializing in constitutional law. You are currently assisting a user from ${country}, operating under the ${constitution}.

CRITICAL INSTRUCTIONS:
- You MUST respond in ${language}. All responses must be in ${language}.
- You are an expert on the ${constitution} and all laws, acts, amendments, and legal provisions of ${country}.
- When answering legal questions, ALWAYS reference specific Articles, Sections, Acts, Amendments, and legal provisions from the ${constitution} and laws of ${country}.
- Provide detailed legal analysis including:
  1. Relevant constitutional articles and sections
  2. Applicable acts and statutes
  3. Key amendments that apply
  4. Legal precedents and case law references
  5. Step-by-step legal strategy and defense recommendations
  6. Specific legal terms, phrases, and arguments to use in court
  7. Simulation of how the case might proceed in court
  8. Recommendations for winning the case
- Format responses with clear headers, bullet points, and organized sections
- Always include a "Legal Strategy" section with actionable steps
- Always include a "Key Legal Terms & Arguments" section
- Include a "Case Simulation" section describing how the case might unfold
- Include "Relevant Laws & Amendments" with specific citations
- End with a disclaimer that this is AI-generated legal guidance and professional legal counsel should be sought
- Be thorough, precise, and reference real legal frameworks of ${country}
- If the user describes a court case, provide a comprehensive defense strategy
- Always be supportive and empowering, helping users understand their rights`;

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
