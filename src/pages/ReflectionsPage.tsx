import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen } from "lucide-react";
import { getReflections, saveReflection } from "@/lib/storage";
import { toast } from "sonner";
import type { Reflection } from "@/lib/storage";

export default function ReflectionsPage() {
  const [reflections, setReflections] = useState<Reflection[]>(getReflections());
  const [showForm, setShowForm] = useState(false);
  const [verseKey, setVerseKey] = useState("");
  const [text, setText] = useState("");

  const handleSave = () => {
    if (!verseKey.trim() || !text.trim()) {
      toast.error("Please fill in both fields");
      return;
    }
    const r = saveReflection({ verseKey: verseKey.trim(), text: text.trim() });
    setReflections([r, ...reflections]);
    setVerseKey("");
    setText("");
    setShowForm(false);
    toast.success("Reflection saved!");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reflections</h1>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> New
        </Button>
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
          <p className="text-muted-foreground text-sm">No reflections yet. Start journaling your Quran journey!</p>
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
                <p className="text-sm text-muted-foreground">{r.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
