import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Copy, Trash2, Sparkles, BookOpen, Languages, Search } from "lucide-react";
import remarkGfm from "remark-gfm";
import { getChatHistory, saveChatMessage, clearChatHistory } from "@/lib/storage";
import { streamChatMessage } from "@/lib/gemini";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/lib/storage";

const SUGGESTIONS = [
  "What does Ayatul Kursi teach us?",
  "How can I build a daily Quran habit?",
  "Explain the meaning of Surah Al-Fatiha",
  "What does the Quran say about patience?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(getChatHistory());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string, mode?: "tajweed" | "analyze" | "read") => {
    if (!text.trim() || loading) return;
    setInput("");

    const userMsg = saveChatMessage({ role: "user", content: text.trim() });
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    let assistantContent = "";

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      await streamChatMessage(
        text.trim(),
        history,
        (chunk) => {
          assistantContent += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && !last.timestamp) {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: assistantContent } : m
              );
            }
            return [...prev, { id: "streaming", role: "assistant", content: assistantContent, timestamp: "" }];
          });
        },
        () => {
          const aiMsg = saveChatMessage({ role: "assistant", content: assistantContent });
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== "streaming");
            return [...filtered, aiMsg];
          });
        },
        mode
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to get response");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleAction = (action: "read" | "tajweed" | "analyze") => {
    const lastVerse = messages
      .slice()
      .reverse()
      .find((m) => m.content.match(/\[\d+:\d+\]/));
    const verseMatch = lastVerse?.content.match(/\[(\d+:\d+)\]/);
    const verse = verseMatch ? verseMatch[1] : "";

    const prompts = {
      read: verse
        ? `Read and teach me verse [${verse}] — provide Arabic text, transliteration, word-by-word translation, and a brief explanation.`
        : "Suggest a beautiful verse for me to read today and teach me how to recite it with transliteration.",
      tajweed: verse
        ? `Explain the tajweed rules in verse [${verse}] — cover makharij (articulation points), sifaat (characteristics), and any special rules like idgham, ikhfa, etc.`
        : "Teach me the most important tajweed rules for beginners with examples from the Quran.",
      analyze: verse
        ? `Deeply analyze verse [${verse}] — cover historical context (asbab al-nuzul), word-by-word breakdown, multiple tafsir perspectives, and practical lessons.`
        : "Analyze a powerful verse about patience and provide its full tafsir breakdown.",
    };

    send(prompts[action], action);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleClear = () => {
    clearChatHistory();
    setMessages([]);
    toast.success("Chat cleared");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">AI Mentor</span>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-xs text-muted-foreground">
            <Trash2 className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-8 w-8 mb-4 text-muted-foreground" />
            <h2 className="text-lg font-medium mb-2">Quran AI Mentor</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-sm">
              Ask me anything about the Quran — I'll always ground my answers in real verses.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm px-4 py-3 rounded-lg border border-border hover:bg-secondary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-6">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleAction("read")}>
                <BookOpen className="h-3.5 w-3.5" /> Read
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleAction("tajweed")}>
                <Languages className="h-3.5 w-3.5" /> Tajweed
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleAction("analyze")}>
                <Search className="h-3.5 w-3.5" /> Analyze
              </Button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[70%] rounded-lg px-4 py-3 relative group ${
                msg.role === "user"
                  ? "bg-foreground text-background"
                  : "bg-card border border-border"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none [&_a]:text-foreground [&_a]:underline">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
              <button
                onClick={() => copyText(msg.content)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-lg px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse-gentle" />
                <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse-gentle [animation-delay:0.2s]" />
                <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse-gentle [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border space-y-2">
        {/* Action buttons when chat has messages */}
        {messages.length > 0 && !loading && (
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleAction("read")}>
              <BookOpen className="h-3 w-3" /> Read
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleAction("tajweed")}>
              <Languages className="h-3 w-3" /> Tajweed
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleAction("analyze")}>
              <Search className="h-3 w-3" /> Analyze
            </Button>
          </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2 max-w-3xl mx-auto"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the Quran..."
            className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
