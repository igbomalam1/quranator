import { searchQuran, getQuranComLink } from "./quran-api";

const GEMINI_API_KEY = "AIzaSyDCHB0KjIPxd8Tgij0dkhmYpcxlUWHT6Zc";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are a wise, gentle, and accurate Quran AI Mentor. You help users understand and connect with the Quran.

RULES:
- Always ground your answers in actual Quran verses
- Always cite verse references in format [Surah:Ayah] e.g. [2:255]
- Never hallucinate or make up verses
- Be respectful, encouraging, and scholarly
- When discussing tafsir, mention the source
- Keep responses clear and well-formatted using markdown
- End every response with citations section`;

interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function sendChatMessage(
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  // Search Quran for context
  let quranContext = "";
  const keywords = userMessage.split(" ").filter((w) => w.length > 3).slice(0, 3).join(" ");
  if (keywords) {
    const results = await searchQuran(keywords);
    if (results.length > 0) {
      quranContext = "\n\nRelevant Quran verses found:\n" +
        results.slice(0, 5).map((v) =>
          `- ${v.verse_key}: ${v.translations?.[0]?.text || v.text_uthmani}`
        ).join("\n");
    }
  }

  const geminiHistory: GeminiMessage[] = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const contents: GeminiMessage[] = [
    ...geminiHistory,
    {
      role: "user",
      parts: [{ text: userMessage + quranContext }],
    },
  ];

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini error:", err);
      return "I apologize, I'm having trouble connecting right now. Please try again in a moment.";
    }

    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";

    // Add quran.com links to citations
    const verseRefs = text.match(/\[(\d+:\d+)\]/g) || [];
    if (verseRefs.length > 0) {
      const uniqueRefs = [...new Set(verseRefs)];
      const citations = uniqueRefs.map((ref) => {
        const key = ref.replace(/[\[\]]/g, "");
        return `- ${ref} — [View on Quran.com](${getQuranComLink(key)})`;
      });
      if (!text.includes("📖") && !text.includes("Citation")) {
        text += "\n\n---\n📖 **Citations:**\n" + citations.join("\n");
      }
    }

    return text;
  } catch (err) {
    console.error("Chat error:", err);
    return "I apologize, something went wrong. Please try again.";
  }
}
