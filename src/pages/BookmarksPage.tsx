import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, Plus, Trash2, MessageSquare, Sparkles } from "lucide-react";
import { getBookmarks, saveBookmark, removeBookmark, saveChatMessage } from "@/lib/storage";
import { streamChatMessage } from "@/lib/gemini";
import { toast } from "sonner";
import type { Bookmark as BookmarkType } from "@/lib/storage";

export default function BookmarksPage() {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [verseKey, setVerseKey] = useState("");
  const [note, setNote] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    getBookmarks().then((data) => {
      setBookmarks(data);
    });
  }, []);

  const handleSave = async () => {
    if (!verseKey.trim()) {
      toast.error("Please enter a verse key");
      return;
    }
    try {
      const b = await saveBookmark({ verseKey: verseKey.trim(), note: note.trim() || undefined });
      setBookmarks([b, ...bookmarks]);
      setVerseKey("");
      setNote("");
      setShowForm(false);
      toast.success("Bookmark saved!");
    } catch (err: any) {
      toast.error(`Failed to save bookmark: ${err.message || "Unknown DB error"}`);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeBookmark(id);
      setBookmarks(bookmarks.filter((b) => b.id !== id));
      toast.success("Bookmark removed");
    } catch {
      toast.error("Failed to remove bookmark");
    }
  };

  const suggestBookmark = async () => {
    setLoadingAi(true);
    try {
      let result = "";
      await streamChatMessage(
        "Suggest one powerful Quran verse that everyone should bookmark for daily remembrance. Return ONLY in this exact format: VERSE_KEY|note. Example: 2:255|Ayatul Kursi - the greatest verse for protection. No extra text.",
        [],
        (chunk) => { result += chunk; },
        () => {},
      );
      const parts = result.trim().split("|");
      if (parts.length >= 2) {
        const b = await saveBookmark({ verseKey: parts[0].trim(), note: parts.slice(1).join("|").trim() });
        setBookmarks([b, ...bookmarks]);
        toast.success("AI bookmark added! 📌");
      } else {
        toast.error("Could not parse AI suggestion");
      }
    } catch {
      toast.error("Failed to get AI suggestion");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookmarks</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={suggestBookmark} disabled={loadingAi} className="gap-1">
            {loadingAi ? (
              <div className="h-3.5 w-3.5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI Suggest
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <input
              value={verseKey}
              onChange={(e) => setVerseKey(e.target.value)}
              placeholder="Verse key (e.g. 36:1)"
              className="w-full bg-secondary border-none rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full bg-secondary border-none rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {bookmarks.length === 0 ? (
        <div className="text-center py-20">
          <Bookmark className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground text-sm mb-4">No bookmarks yet. Save your favorite verses!</p>
          <Button variant="outline" size="sm" onClick={suggestBookmark} disabled={loadingAi} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Get AI Bookmark Suggestion
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((b) => (
            <Card key={b.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">[{b.verseKey}]</span>
                    {b.note && <p className="text-xs text-muted-foreground mt-1">{b.note}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={async () => {
                        const prompt = `Tell me about verse [${b.verseKey}]${b.note ? ` — "${b.note}"` : ""}. Provide the Arabic text, transliteration, full translation, tafsir, and why this verse is important for daily life.`;
                        await saveChatMessage({ role: "user", content: prompt });
                        navigate("/chat");
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemove(b.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
