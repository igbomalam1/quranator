import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface Goal {
  id: string;
  title: string;
  targetPerDay: number;
  completedToday: number;
  lastUpdated: string;
  createdAt: string;
  pledgeAccepted: boolean;
}

function getGoals(): Goal[] {
  return JSON.parse(localStorage.getItem("goals") || "[]");
}

// Parse surah/ayah references from goal title
function parseGoalReference(title: string): { surah: number; ayah?: number } | null {
  // Match patterns like "Surah 2", "surah Al-Baqarah", "2:255", "ayah 2:10"
  const keyMatch = title.match(/(\d+):(\d+)/);
  if (keyMatch) return { surah: parseInt(keyMatch[1]), ayah: parseInt(keyMatch[2]) };
  
  const surahMatch = title.match(/surah\s+(\d+)/i);
  if (surahMatch) return { surah: parseInt(surahMatch[1]) };
  
  return null;
}

interface VerseData {
  verse_key: string;
  text_uthmani: string;
  translation?: string;
  audio_url?: string;
}

export default function QuranatorPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0);
  const [verses, setVerses] = useState<VerseData[]>([]);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [goalStarted, setGoalStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const allGoals = getGoals();
    // Filter to today's incomplete goals
    const todayGoals = allGoals.filter(
      (g) => g.lastUpdated === today && g.completedToday < g.targetPerDay
    );
    // If no incomplete today goals, show all goals
    setGoals(todayGoals.length > 0 ? todayGoals : allGoals);
  }, []);

  const currentGoal = goals[currentGoalIndex];

  const fetchVersesForGoal = async (goal: Goal) => {
    setLoading(true);
    setVerses([]);
    setCurrentVerseIndex(0);
    setGoalStarted(true);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const ref = parseGoalReference(goal.title);
      
      // Determine which verses to fetch
      let endpoint: string;
      if (ref?.ayah) {
        endpoint = `/verses/by_key/${ref.surah}:${ref.ayah}?translations=20&language=en&fields=text_uthmani`;
      } else if (ref?.surah) {
        endpoint = `/verses/by_chapter/${ref.surah}?translations=20&language=en&per_page=20&fields=text_uthmani`;
      } else {
        // Generic goal - fetch a few verses from Al-Fatiha or a random surah
        const surah = Math.floor(Math.random() * 10) + 1;
        endpoint = `/verses/by_chapter/${surah}?translations=20&language=en&per_page=10&fields=text_uthmani`;
      }

      const { data } = await supabase.functions.invoke("quran-proxy", {
        body: { endpoint },
      });

      const rawVerses = data?.verse ? [data.verse] : data?.verses || [];
      
      // Fetch audio for these verses
      const verseList: VerseData[] = [];
      for (const v of rawVerses) {
        const key = v.verse_key;
        let audioUrl = "";
        try {
          const audioRes = await supabase.functions.invoke("quran-proxy", {
            body: { endpoint: `/recitations/7/by_ayah/${key}` },
          });
          if (audioRes.data?.audio_files?.[0]) {
            audioUrl = `https://verses.quran.com/${audioRes.data.audio_files[0].url}`;
          }
        } catch {}

        verseList.push({
          verse_key: key,
          text_uthmani: v.text_uthmani,
          translation: v.translations?.[0]?.text || "",
          audio_url: audioUrl,
        });
      }

      setVerses(verseList);
    } catch (err) {
      console.error("Failed to fetch verses for goal:", err);
      toast.error("Failed to load verses");
    } finally {
      setLoading(false);
    }
  };

  const currentVerse = verses[currentVerseIndex];
  const arabicWords = currentVerse?.text_uthmani?.split(/\s+/) || [];

  const playAudio = () => {
    if (!currentVerse?.audio_url) {
      toast.error("No audio available for this verse");
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
      setHighlightedWordIndex(-1);
      return;
    }

    const audio = new Audio(currentVerse.audio_url);
    audioRef.current = audio;
    setPlaying(true);

    // Simulate word-by-word highlighting based on audio duration
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      const wordCount = arabicWords.length;
      if (wordCount === 0) return;
      const interval = (duration * 1000) / wordCount;

      let idx = 0;
      const timer = setInterval(() => {
        if (idx < wordCount) {
          setHighlightedWordIndex(idx);
          idx++;
        } else {
          clearInterval(timer);
        }
      }, interval);

      audio.onended = () => {
        clearInterval(timer);
        setPlaying(false);
        setHighlightedWordIndex(-1);
        audioRef.current = null;
      };
      audio.onerror = () => {
        clearInterval(timer);
        setPlaying(false);
        setHighlightedWordIndex(-1);
        audioRef.current = null;
      };
    };

    audio.play().catch(() => {
      setPlaying(false);
      audioRef.current = null;
      toast.error("Audio playback failed");
    });
  };

  const toggleRecording = () => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      
      // Highlight matching words
      const spokenWords = transcript.split(/\s+/);
      const matchIndex = Math.min(spokenWords.length - 1, arabicWords.length - 1);
      setHighlightedWordIndex(matchIndex);
    };

    recognition.onerror = () => {
      setRecording(false);
      toast.error("Speech recognition error");
    };

    recognition.onend = () => {
      setRecording(false);
      setHighlightedWordIndex(-1);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    toast.success("🎤 Start reading the verse aloud");
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      recognitionRef.current?.stop();
    };
  }, []);

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.completedToday >= g.targetPerDay).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6" /> Quranator
        </h1>
        {totalGoals > 0 && (
          <span className="text-sm text-muted-foreground">
            {completedGoals}/{totalGoals} goals done
          </span>
        )}
      </div>

      {/* No goals state */}
      {goals.length === 0 && (
        <div className="text-center py-16">
          <GraduationCap className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground text-sm mb-4">
            No goals set yet. Create goals first, then Quranator will teach you!
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = "/goals")}
          >
            Go to Goals
          </Button>
        </div>
      )}

      {/* Goals overview */}
      {goals.length > 0 && !goalStarted && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-4">
            <h2 className="text-sm font-medium">Today's Learning Plan</h2>
            <div className="space-y-2">
              {goals.map((goal, idx) => {
                const done = goal.completedToday >= goal.targetPerDay;
                return (
                  <button
                    key={goal.id}
                    onClick={() => {
                      setCurrentGoalIndex(idx);
                      fetchVersesForGoal(goal);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center justify-between ${
                      done
                        ? "border-border bg-secondary/30 text-muted-foreground"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                      )}
                      <div>
                        <p className={`text-sm font-medium ${done ? "line-through" : ""}`}>
                          {goal.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {goal.completedToday}/{goal.targetPerDay} completed
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active learning session */}
      {goalStarted && currentGoal && (
        <div className="space-y-4">
          {/* Goal header */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium">{currentGoal.title}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setGoalStarted(false);
                    audioRef.current?.pause();
                    setPlaying(false);
                    setHighlightedWordIndex(-1);
                  }}
                >
                  Back to Goals
                </Button>
              </div>
              {verses.length > 1 && (
                <div className="flex items-center gap-2">
                  <Progress
                    value={((currentVerseIndex + 1) / verses.length) * 100}
                    className="h-1.5 flex-1"
                  />
                  <span className="text-xs text-muted-foreground">
                    {currentVerseIndex + 1}/{verses.length}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verse display */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
          ) : currentVerse ? (
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-6">
                {/* Verse key */}
                <div className="text-center">
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                    {currentVerse.verse_key}
                  </span>
                </div>

                {/* Arabic text with word highlighting */}
                <div
                  className="text-center leading-[3rem] px-2"
                  dir="rtl"
                  lang="ar"
                >
                  {arabicWords.map((word, idx) => (
                    <span
                      key={idx}
                      className={`inline-block text-2xl md:text-3xl font-arabic mx-1 px-1 py-0.5 rounded transition-all duration-200 ${
                        highlightedWordIndex === idx
                          ? "bg-primary/20 text-primary scale-110 ring-1 ring-primary/30"
                          : "text-foreground"
                      }`}
                    >
                      {word}
                    </span>
                  ))}
                </div>

                {/* Translation */}
                {currentVerse.translation && (
                  <p className="text-sm text-muted-foreground text-center italic">
                    {currentVerse.translation.replace(/<[^>]*>/g, "")}
                  </p>
                )}

                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                  {/* Previous */}
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentVerseIndex === 0}
                    onClick={() => {
                      audioRef.current?.pause();
                      setPlaying(false);
                      setHighlightedWordIndex(-1);
                      setCurrentVerseIndex((i) => i - 1);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Read (mic) */}
                  <Button
                    variant={recording ? "destructive" : "outline"}
                    className="gap-2"
                    onClick={toggleRecording}
                  >
                    {recording ? (
                      <>
                        <MicOff className="h-4 w-4" /> Stop
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4" /> Read
                      </>
                    )}
                  </Button>

                  {/* Listen */}
                  <Button
                    variant={playing ? "secondary" : "default"}
                    className="gap-2"
                    onClick={playAudio}
                  >
                    {playing ? (
                      <>
                        <Pause className="h-4 w-4" /> Pause
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4" /> Listen
                      </>
                    )}
                  </Button>

                  {/* Next */}
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentVerseIndex === verses.length - 1}
                    onClick={() => {
                      audioRef.current?.pause();
                      setPlaying(false);
                      setHighlightedWordIndex(-1);
                      setCurrentVerseIndex((i) => i + 1);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No verses found for this goal. Try a goal with a surah or ayah reference (e.g. "Read Surah 2" or "Memorize 2:255").
            </div>
          )}
        </div>
      )}
    </div>
  );
}
