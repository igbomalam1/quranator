import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Sparkles } from "lucide-react";
import { getReflections, saveReflection } from "@/lib/storage";
import { streamChatMessage } from "@/lib/gemini";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Reflection } from "@/lib/storage";

export default function ReflectionsPage() {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [verseKey, setVerseKey] = useState("");
  const [text, setText] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    getReflections().then((data) => {
      setReflections(data);
    });
  }, []);

  const handleSave = async () => {
    if (!verseKey.trim() || !text.trim()) {
      toast.error("Please fill in both fields");
      return;
    }
    try {
      const r = await saveReflection({ verseKey: verseKey.trim(), text: text.trim() });
      setReflections([r, ...reflections]);
      setVerseKey("");
      setText("");
      setShowForm(false);
      toast.success("Reflection saved!");
    } catch (err: any) {
      toast.error(`Failed to save reflection: ${err.message || "Unknown DB error"}`);
    }
  };

  const generateAiReflection = async () => {
    setLoadingAi(true);
    try {
      let result = "";
      await streamChatMessage(
        "Pick a beautiful, lesser-known Quran verse and write a short, heartfelt personal reflection (3-4 sentences) on its meaning and how it applies to daily life. Start with the verse reference in format [Surah:Ayah] then the reflection. Keep it personal and inspiring.",
        [],
        (chunk) => { result += chunk; },
        () => {},
      );
      const verseMatch = result.match(/\[(\d+:\d+)\]/);
      const vk = verseMatch ? verseMatch[1] : "2:286";
      const reflectionText = result.replace(/\[\d+:\d+\]\s*/, "").trim();
      const r = await saveReflection({ verseKey: vk, text: reflectionText });
      setReflections([r, ...reflections]);
      toast.success("AI reflection generated! 🌟");
    } catch {
      toast.error("Failed to generate reflection");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reflections</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generateAiReflection} disabled={loadingAi} className="gap-1">
            {loadingAi ? (
              <div className="h-3.5 w-3.5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI Reflect
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <input
              value={verseKey}
              onChange={(e) => setVerseKey(e.target.value)}
              placeholder="Verse key (e.g. 2:255)"
              className="w-full bg-secondary border-none rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your reflection..."
              rows={4}
              className="w-full bg-secondary border-none rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {reflections.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground text-sm mb-4">No reflections yet. Start journaling your Quran journey!</p>
          <Button variant="outline" size="sm" onClick={generateAiReflection} disabled={loadingAi} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Generate AI Reflection
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {reflections.map((r) => (
            <Card key={r.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">[{r.verseKey}]</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-muted-foreground [&_p]:text-muted-foreground [&_strong]:text-foreground [&_a]:text-foreground [&_a]:underline">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{r.text}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
