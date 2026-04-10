import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Play, Pause, BookOpen, Target } from "lucide-react";
import { getStreakData, recordActivity, getReflections } from "@/lib/storage";
import { fetchVerseByKey, getRandomVerseKey, getCachedAyah, cacheAyah } from "@/lib/quran-api";
import type { Verse } from "@/lib/quran-api";
import { toast } from "sonner";

export default function DashboardPage() {
  const [streak, setStreak] = useState(getStreakData());
  const [ayah, setAyah] = useState<Verse | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const reflections = getReflections().slice(0, 3);

  useEffect(() => {
    const updated = recordActivity();
    setStreak(updated);

    // Check cache first for daily ayah
    const cached = getCachedAyah();
    if (cached) {
      setAyah(cached);
      return;
    }

    const verseKey = getRandomVerseKey();
    fetchVerseByKey(verseKey).then((v) => {
      if (v) {
        setAyah(v);
        cacheAyah(v);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
      }
    };
  }, [audio]);

  const toggleAudio = () => {
    if (!ayah?.audio?.url) {
      toast.error("No audio available for this verse");
      return;
    }
    if (playing && audio) {
      audio.pause();
      setPlaying(false);
    } else {
      if (audio) {
        audio.pause();
      }
      const a = new Audio(ayah.audio.url);
      a.onended = () => setPlaying(false);
      a.onerror = () => {
        toast.error("Audio failed to load");
        setPlaying(false);
      };
      a.play().catch(() => toast.error("Audio playback failed"));
      setAudio(a);
      setPlaying(true);
    }
  };

  // Calendar heatmap - last 30 days
  const today = new Date();
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Streak */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <Flame className="h-5 w-5" />
            <div>
              <p className="text-2xl font-bold">{streak.currentStreak}</p>
              <p className="text-xs text-muted-foreground">Current Streak</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-5 w-5" />
            <div>
              <p className="text-2xl font-bold">{streak.longestStreak}</p>
              <p className="text-xs text-muted-foreground">Best Streak</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-5 w-5" />
            <div>
              <p className="text-2xl font-bold">{reflections.length}</p>
              <p className="text-xs text-muted-foreground">Reflections</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-5 w-5 flex items-center justify-center text-xs font-bold">📅</div>
            <div>
              <p className="text-2xl font-bold">{streak.activeDates.length}</p>
              <p className="text-xs text-muted-foreground">Active Days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Heatmap */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-3">Activity (Last 30 days)</h3>
          <div className="flex gap-1 flex-wrap">
            {last30.map((date) => {
              const active = streak.activeDates.includes(date);
              return (
                <div
                  key={date}
                  className={`w-4 h-4 rounded-sm ${active ? "bg-foreground" : "bg-secondary"}`}
                  title={date}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ayah of the Day */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Ayah of the Day</h3>
            {ayah && (
              <Button variant="ghost" size="icon" onClick={toggleAudio}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            )}
          </div>
          {ayah ? (
            <div>
              <p className="text-right text-xl leading-loose mb-3 font-serif">{ayah.text_uthmani}</p>
              {ayah.translations?.[0] && (
                <p className="text-sm text-muted-foreground italic">
                  {ayah.translations[0].text.replace(/<[^>]*>/g, "")}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">— {ayah.verse_key}</p>
            </div>
          ) : (
            <div className="h-20 flex items-center justify-center">
              <div className="h-5 w-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Reflections */}
      {reflections.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3">Recent Reflections</h3>
            <div className="space-y-3">
              {reflections.map((r) => (
                <div key={r.id} className="text-sm">
                  <span className="text-muted-foreground text-xs">[{r.verseKey}]</span>
                  <p className="text-muted-foreground mt-0.5">{r.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
