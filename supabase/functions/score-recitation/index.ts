import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { arabicText, userTranscript, verseKey } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert Quran recitation evaluator. You will be given the original Arabic verse text and the user's spoken transcript (captured via speech recognition in Arabic).

Analyze the recitation and provide a JSON response with these exact fields:
- accuracy: number 0-100 (how closely the words match the original)
- tajweedScore: number 0-100 (estimated tajweed quality based on word accuracy)
- fluencyScore: number 0-100 (flow and completeness of recitation)
- overallScore: number 0-100 (weighted average)
- feedback: string (2-3 sentences of encouraging feedback)
- improvements: string[] (2-4 specific improvement suggestions)

Be encouraging but honest. If the transcript is empty or very short, give low scores but still be kind.`;

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
            {
              role: "user",
              content: `Verse (${verseKey}):\nOriginal Arabic: ${arabicText}\n\nUser's recitation transcript: ${userTranscript || "(empty - user did not speak or mic didn't capture)"}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_score",
                description: "Submit the recitation evaluation score",
                parameters: {
                  type: "object",
                  properties: {
                    accuracy: { type: "number" },
                    tajweedScore: { type: "number" },
                    fluencyScore: { type: "number" },
                    overallScore: { type: "number" },
                    feedback: { type: "string" },
                    improvements: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: ["accuracy", "tajweedScore", "fluencyScore", "overallScore", "feedback", "improvements"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "submit_score" } },
        }),
      }
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI scoring failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "No score returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const score = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(score), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("score error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
