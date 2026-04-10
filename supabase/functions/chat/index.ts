import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a wise, gentle, and accurate Quran AI Mentor. You help users understand and connect with the Quran.

RULES:
- Always ground your answers in actual Quran verses
- Always cite verse references in format [Surah:Ayah] e.g. [2:255]
- Never hallucinate or make up verses
- Be respectful, encouraging, and scholarly
- When discussing tafsir, mention the source
- Keep responses clear and well-formatted using markdown
- End every response with a citations section listing all referenced verses with links like [View on Quran.com](https://quran.com/2/255)
- When asked to analyze a verse, provide: Arabic text context, word-by-word meaning, tafsir summary, and lessons
- When asked about tajweed, explain pronunciation rules relevant to the verse
- When asked to read/recite, provide the Arabic text and transliteration`;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = SYSTEM_PROMPT;
    if (mode === "tajweed") {
      systemPrompt += "\n\nThe user is asking about tajweed rules. Focus on pronunciation, articulation points (makharij), and characteristics (sifaat) of letters. Provide practical tips.";
    } else if (mode === "analyze") {
      systemPrompt += "\n\nThe user wants a deep analysis. Provide: 1) Historical context (asbab al-nuzul), 2) Word-by-word breakdown, 3) Multiple tafsir perspectives, 4) Practical lessons.";
    } else if (mode === "read") {
      systemPrompt += "\n\nThe user wants to read/learn a verse. Provide: 1) Full Arabic text, 2) Transliteration, 3) Word-by-word translation, 4) Brief explanation.";
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});