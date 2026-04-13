import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Play, Pause, BookOpen, Target, Sparkles, AlertTriangle } from "lucide-react";
import { getStreakData, recordActivity, getReflections, createChatSession, addMessageToSession, setActiveSessionId } from "@/lib/storage";
import { fetchVerseByKey, getRandomVerseKey, getCachedAyah, cacheAyah } from "@/lib/quran-api";
import type { Verse } from "@/lib/quran-api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const stripMarkdown = (text: string) =>
  text.replace(/#{1,6}\s?/g, "").replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/^[-*]\s/gm, "• ");

interface ReciterOption {
  id: number;
  name: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [streak, setStreak] = useState(getStreakData());
  const [ayah, setAyah] = useState<Verse | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [showStreakPunishment, setShowStreakPunishment] = useState(false);
  const [missedDays, setMissedDays] = useState(0);
  const [reciters, setReciters] = useState<ReciterOption[]>([]);
  const [selectedReciter, setSelectedReciter] = useState(7);
  const reflections = getReflections().slice(0, 3);

  useEffect(() => {
    const updated = recordActivity();
    setStreak(updated);

    // Check for missed streak
    const streakData = getStreakData();
    if (streakData.lastActiveDate) {
      const lastActive = new Date(streakData.lastActiveDate);
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / 86400000);
      if (diffDays > 1) {
        setMissedDays(diffDays - 1);
        const dismissed = localStorage.getItem("streak_punishment_dismissed");
        const dismissedDate = dismissed ? new Date(dismissed).toISOString().split("T")[0] : "";
        if (dismissedDate !== today.toISOString().split("T")[0]) {
          setShowStreakPunishment(true);
        }
      }
    }

    // Fetch reciters
    fetchReciters();

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

  const fetchReciters = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.functions.invoke("quran-proxy", {
        body: { endpoint: "/resources/recitations" },
      });
      if (data?.recitations) {
        setReciters(data.recitations.map((r: any) => ({ id: r.id, name: r.reciter_name || r.translated_name?.name || `Reciter ${r.id}` })));
      }
    } catch {}
  };

  const changeReciterAudio = async (reciterId: number) => {
    if (!ayah) return;
    setSelectedReciter(reciterId);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const audioData = await supabase.functions.invoke("quran-proxy", {
        body: { endpoint: `/recitations/${reciterId}/by_ayah/${ayah.verse_key}` },
      });
      if (audioData.data?.audio_files?.[0]) {
        const url = `https://verses.quran.com/${audioData.data.audio_files[0].url}`;
        setAyah(prev => prev ? { ...prev, audio: { url } } : prev);
        toast.success("Reciter changed");
      }
    } catch {
      toast.error("Failed to change reciter");
    }
  };

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

  const handleDeepLearning = () => {
    if (!ayah) return;
    const prompt = `This is today's Ayah of the Day: [${ayah.verse_key}] "${ayah.text_uthmani}". Explain why this verse is significant, its historical context (asbab al-nuzul), deep tafsir, and practical lessons we can apply today.`;
    
    // Create a new session and pre-populate with user message
    const session = createChatSession(prompt);
    addMessageToSession(session.id, { role: "user", content: prompt });
    setActiveSessionId(session.id);
    
    // Navigate — the chat page will detect the pending message and auto-send
    navigate("/chat?autoSend=true");
  };

  const dismissStreakPunishment = () => {
    localStorage.setItem("streak_punishment_dismissed", new Date().toISOString());
    setShowStreakPunishment(false);
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
            <div className="flex items-center gap-2">
              {reciters.length > 0 && (
                <Select
                  value={String(selectedReciter)}
                  onValueChange={(val) => changeReciterAudio(parseInt(val))}
                >
                  <SelectTrigger className="w-36 h-7 text-xs">
                    <SelectValue placeholder="Reciter" />
                  </SelectTrigger>
                  <SelectContent>
                    {reciters.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {ayah && (
                <Button variant="ghost" size="icon" onClick={toggleAudio}>
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              )}
            </div>
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
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1.5"
                onClick={handleDeepLearning}
              >
                <Sparkles className="h-3.5 w-3.5" /> Deep Learning
              </Button>
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
                  <p className="text-muted-foreground mt-0.5">{stripMarkdown(r.text)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missed Streak Punishment Modal */}
      <Dialog open={showStreakPunishment} onOpenChange={setShowStreakPunishment}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" /> You Missed Your Streak! 😢
            </DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                You missed <strong className="text-foreground">{missedDays} day{missedDays > 1 ? "s" : ""}</strong> of your streak yesterday.
              </p>
              <p className="font-medium text-foreground">
                As per your Sadaqah pledge, kindly confirm to sincerely do a local Sadaqah in your area before proceeding.
              </p>
              <p className="text-xs text-muted-foreground">
                This is between you and Allah ﷻ. We do not collect any money. Please donate locally to those in need — fii sabilillah. 🤲
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={dismissStreakPunishment} className="w-full">
              I confirm to do Sadaqah sincerely, In Shaa Allah 🤲
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
