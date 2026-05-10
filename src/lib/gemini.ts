import { supabase } from "@/integrations/supabase/client";

/**
 * TECHNICAL SPECIFICATION REVERSION
 * ---------------------------------
 * This file strictly conforms to the "Quranator AI Integration — Technical Recreation Guide".
 * It strictly utilizes the Supabase Edge Function "chat" which proxies requests securely
 * through the Lovable AI Gateway, resolving local client-side API key limitation errors.
 */

function mapToOpenAiFormat(history: { role: string; content: string }[], userMessage: string) {
  const msgs = history.map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content
  }));
  msgs.push({
    role: "user",
    content: userMessage
  });
  return msgs;
}

/**
 * Standard full-text resolution (One-Shot)
 * Utilized by AI Reflection and Bookmark deep-dives.
 */
export async function sendChatMessage(
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[],
  mode?: "tajweed" | "analyze" | "read"
): Promise<string> {
  let text = "";
  
  // Reuse the streaming infrastructure and aggregate response to final string.
  await streamChatMessage(
    userMessage,
    history,
    (chunk) => { text += chunk; },
    () => {},
    mode
  );
  
  return text || "AI failed to generate a response. Please check Supabase Edge Function logs.";
}

/**
 * Live real-time SSE Stream engine 
 * Proxies secure request directly to the custom Supabase 'chat' function
 * and unwraps the OpenAI-compatible payload delivery stack.
 */
export async function streamChatMessage(
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[],
  onDelta: (text: string) => void,
  onDone: () => void,
  mode?: "tajweed" | "analyze" | "read"
) {
  try {
    // 1. Authenticate via project-scoped metadata context
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Connection keys (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY) missing in environment.");
    }

    const functionUrl = `${supabaseUrl}/functions/v1/chat`;

    // 2. Secure POST directly targeting edge-layer stream passthrough
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        messages: mapToOpenAiFormat(history, userMessage),
        mode: mode || "default"
      })
    });

    // Handle direct operational edge failures
    if (!response.ok) {
      if (response.status === 429) throw new Error("AI rate limit exceeded. Try again in a few seconds.");
      if (response.status === 402) throw new Error("Lovable AI credits exhausted. Please top up dashboard.");
      
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Edge server error (${response.status})`);
    }

    if (!response.body) {
      throw new Error("Remote function yielded no streaming response body.");
    }

    // 3. Standard SSE Reader Loop
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        
        if (line === "data: [DONE]") {
          break; 
        }
        
        if (line.startsWith("data:")) {
          const jsonStr = line.slice(5).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            // Lovable / OpenAI format stores streaming string in choices[0].delta.content
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (chunk) {
              onDelta(chunk);
            }
          } catch (err) {
            // Buffer fragment split mitigation
          }
        }
      }
    }
    
    onDone();
  } catch (err: any) {
    console.error("Quranator Stream Failure:", err);
    throw new Error(err.message || "Failed to load secure real-time stream from Supabase.");
  }
}
