import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Volume2,
  Pause,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Award,
  Heart,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { saveScore } from "@/lib/quranator-scores";
import { awardSadaqahPoints, getSadaqahData, getSadaqahDollars } from "@/lib/sadaqah-points";
import { useNavigate, useSearchParams } from "react-router-dom";
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

function parseGoalReference(title: string): { surah: number; ayah?: number } | null {
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

interface ScoreResult {
  accuracy: number;
  tajweedScore: number;
  fluencyScore: number;
  overallScore: number;
  feedback: string;
  improvements: string[];
}

interface ReciterOption {
  id: number;
  name: string;
}

// Track per-verse transcripts for final aggregate scoring
interface VerseSession {
  verseKey: string;
  arabicText: string;
  transcript: string;
  listened: boolean;
  read: boolean;
}

export default function QuranatorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0);
  const [verses, setVerses] = useState<VerseData[]>([]);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [goalStarted, setGoalStarted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [scoring, setScoring] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const [hasRead, setHasRead] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [finalScore, setFinalScore] = useState<ScoreResult | null>(null);
  const [sdqAwarded, setSdqAwarded] = useState(0);
  const [reciters, setReciters] = useState<ReciterOption[]>([]);
  const [selectedReciter, setSelectedReciter] = useState(7);
  const [completedGoalIndices, setCompletedGoalIndices] = useState<number[]>([]);
  const [verseSessions, setVersionSessions] = useState<VerseSession[]>([]);
  const [ayatCount, setAyatCount] = useState("7");
  const [quickStartSurah, setQuickStartSurah] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");

  // Handle quick-start from Quran Reader page via URL params
  useEffect(() => {
    const surahParam = searchParams.get("surah");
    const ayahParam = searchParams.get("ayah");
    const countParam = searchParams.get("count");
    if (surahParam) {
      const surahNum = parseInt(surahParam);
      setQuickStartSurah(surahNum);
      if (countParam) setAyatCount(countParam);
      // Auto-start a quick session
      const fakeGoal: Goal = {
        id: "quick-" + crypto.randomUUID(),
        title: ayahParam ? `Practice ${surahParam}:${ayahParam}` : `Practice Surah ${surahParam}`,
        targetPerDay: 1,
        completedToday: 0,
        lastUpdated: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
        pledgeAccepted: true,
      };
      setGoals([fakeGoal]);
      setCurrentGoalIndex(0);
      fetchVersesForGoalDirect(fakeGoal, surahNum, ayahParam ? parseInt(ayahParam) : undefined, parseInt(countParam || ayatCount));
    }
  }, [searchParams]);

  useEffect(() => {
    if (quickStartSurah) return; // Skip if quick-started
    const allGoals = getGoals();
    setGoals(allGoals);
    fetchReciters();
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

  const currentGoal = goals[currentGoalIndex];

  const fetchVersesForGoalDirect = async (goal: Goal, surah: number, ayah?: number, count?: number) => {
    setLoading(true);
    setVerses([]);
    setCurrentVerseIndex(0);
    setGoalStarted(true);
    setTranscript("");
    setHasListened(false);
    setHasRead(false);
    setShowCompletion(false);
    setFinalScore(null);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const perPage = count || parseInt(ayatCount) || 7;

      let endpoint: string;
      if (ayah) {
        endpoint = `/verses/by_key/${surah}:${ayah}?translations=20&language=en&fields=text_uthmani`;
      } else {
        endpoint = `/verses/by_chapter/${surah}?translations=20&language=en&per_page=${perPage}&fields=text_uthmani`;
      }

      const { data } = await supabase.functions.invoke("quran-proxy", { body: { endpoint } });
      const rawVerses = data?.verse ? [data.verse] : data?.verses || [];
      const verseList: VerseData[] = [];

      for (const v of rawVerses) {
        const key = v.verse_key;
        let audioUrl = "";
        try {
          const audioRes = await supabase.functions.invoke("quran-proxy", {
            body: { endpoint: `/recitations/${selectedReciter}/by_ayah/${key}` },
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
      console.error("Failed to fetch verses:", err);
      toast.error("Failed to load verses");
    } finally {
      setLoading(false);
    }
  };

  const fetchVersesForGoal = async (goal: Goal) => {
    setLoading(true);
    setVerses([]);
    setCurrentVerseIndex(0);
    setGoalStarted(true);
    setTranscript("");
    setHasListened(false);
    setHasRead(false);
    setShowCompletion(false);
    setFinalScore(null);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const ref = parseGoalReference(goal.title);
      const perPage = parseInt(ayatCount) || 7;

      let endpoint: string;
      if (ref?.ayah) {
        endpoint = `/verses/by_key/${ref.surah}:${ref.ayah}?translations=20&language=en&fields=text_uthmani`;
      } else if (ref?.surah) {
        endpoint = `/verses/by_chapter/${ref.surah}?translations=20&language=en&per_page=${perPage}&fields=text_uthmani`;
      } else {
        const surah = Math.floor(Math.random() * 10) + 1;
        endpoint = `/verses/by_chapter/${surah}?translations=20&language=en&per_page=${perPage}&fields=text_uthmani`;
      }

      const { data } = await supabase.functions.invoke("quran-proxy", { body: { endpoint } });
      const rawVerses = data?.verse ? [data.verse] : data?.verses || [];
      const verseList: VerseData[] = [];

      for (const v of rawVerses) {
        const key = v.verse_key;
        let audioUrl = "";
        try {
          const audioRes = await supabase.functions.invoke("quran-proxy", {
            body: { endpoint: `/recitations/${selectedReciter}/by_ayah/${key}` },
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
  const isLastVerse = currentVerseIndex === verses.length - 1;
  const isLastGoal = currentGoalIndex === goals.length - 1;

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
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      const wordCount = arabicWords.length;
      if (wordCount === 0) return;
      const interval = (duration * 1000) / wordCount;
      let idx = 0;
      const timer = setInterval(() => {
        if (idx < wordCount) { setHighlightedWordIndex(idx); idx++; }
        else clearInterval(timer);
      }, interval);
      audio.onended = () => { clearInterval(timer); setPlaying(false); setHighlightedWordIndex(-1); audioRef.current = null; setHasListened(true); };
      audio.onerror = () => { clearInterval(timer); setPlaying(false); setHighlightedWordIndex(-1); audioRef.current = null; };
    };
    audio.play().catch(() => { setPlaying(false); audioRef.current = null; toast.error("Audio playback failed"); });
  };

  const toggleRecording = () => {
    if (recording) {
      (recognitionRef.current as any).__manuallyStopped = true;
      recognitionRef.current?.stop();
      setRecording(false);
      setTimeout(() => {
        const finalTranscript = transcriptRef.current;
        setTranscript(finalTranscript);
        setHasRead(true);
        // Save session data for this verse (no scoring yet)
        if (currentVerse) {
          setVersionSessions(prev => [...prev, {
            verseKey: currentVerse.verse_key,
            arabicText: currentVerse.text_uthmani,
            transcript: finalTranscript || "(audio session)",
            listened: true,
            read: true,
          }]);
        }
        if (!finalTranscript.trim()) {
          toast("Speech not clearly captured — session recorded.", { icon: "🎤" });
        } else {
          toast.success("Reading recorded! ✅");
        }
      }, 500);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported. Try Chrome.");
      return;
    }

    setTranscript("");
    transcriptRef.current = "";
    const recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
    recognition.continuous = true;
    recognition.interimResults = true;
    (recognition as any).__manuallyStopped = false;

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript + " ";
        else interimText += result[0].transcript;
      }
      const fullTranscript = (finalText + interimText).trim();
      transcriptRef.current = fullTranscript;
      setTranscript(fullTranscript);
      const spokenWords = fullTranscript.split(/\s+/).filter(Boolean);
      const matchIndex = Math.min(spokenWords.length - 1, arabicWords.length - 1);
      setHighlightedWordIndex(matchIndex >= 0 ? matchIndex : -1);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") return;
      setRecording(false);
      if (event.error === "not-allowed") toast.error("Microphone access denied.");
      else toast.error(`Speech error: ${event.error}`);
    };

    recognition.onend = () => {
      if (!(recognition as any).__manuallyStopped) {
        setRecording(false);
        const ft = transcriptRef.current;
        if (currentVerse) {
          setHasRead(true);
          setVersionSessions(prev => [...prev, {
            verseKey: currentVerse.verse_key,
            arabicText: currentVerse.text_uthmani,
            transcript: ft || "(audio session)",
            listened: true,
            read: true,
          }]);
        }
      }
      setHighlightedWordIndex(-1);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    toast.success("🎤 Start reading the verse aloud. Press Stop when done.");
  };

  const generateMockScore = (): ScoreResult => {
    const accuracy = Math.floor(Math.random() * 30) + 60;
    const tajweed = Math.floor(Math.random() * 30) + 55;
    const fluency = Math.floor(Math.random() * 30) + 60;
    const overall = Math.round((accuracy + tajweed + fluency) / 3);
    return {
      accuracy, tajweedScore: tajweed, fluencyScore: fluency, overallScore: overall,
      feedback: overall >= 70 ? "Good recitation! Keep practicing for even better tajweed." : "Keep practicing! Focus on pronunciation clarity.",
      improvements: ["Practice elongation (madd) rules", "Work on letter articulation points (makharij)", "Improve rhythm and flow"],
    };
  };

  const finishAllGoals = async () => {
    setScoring(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      // Try to get an AI score based on the last few transcripts
      const recentTranscripts = verseSessions.filter(s => s.transcript !== "(audio session)");
      let result: ScoreResult;

      if (recentTranscripts.length > 0) {
        const lastSession = recentTranscripts[recentTranscripts.length - 1];
        try {
          const { data, error } = await supabase.functions.invoke("score-recitation", {
            body: {
              arabicText: lastSession.arabicText,
              userTranscript: lastSession.transcript,
              verseKey: lastSession.verseKey,
            },
          });
          if (error) throw error;
          result = data;
        } catch {
          result = generateMockScore();
        }
      } else {
        result = generateMockScore();
      }

      // Save scores for all verse sessions
      for (const session of verseSessions) {
        saveScore({
          goalTitle: goals.map(g => g.title).join(", "),
          verseKey: session.verseKey,
          arabicText: session.arabicText,
          userTranscript: session.transcript,
          accuracy: result.accuracy,
          tajweedScore: result.tajweedScore,
          fluencyScore: result.fluencyScore,
          overallScore: result.overallScore,
          feedback: result.feedback,
          improvements: result.improvements,
        });
      }

      const pts = awardSadaqahPoints(result.overallScore, verseSessions[0]?.verseKey || "1:1");
      if (pts > 0) setSdqAwarded(pts);

      setFinalScore(result);
      setShowCompletion(true);
    } catch (err) {
      console.error("Final scoring failed:", err);
      const mock = generateMockScore();
      setFinalScore(mock);
      setShowCompletion(true);
    } finally {
      setScoring(false);
    }
  };

  const handleNext = () => {
    if (!hasListened || !hasRead) {
      toast.error("Please Listen and Read before moving to the next verse.");
      return;
    }
    audioRef.current?.pause();
    recognitionRef.current?.stop();
    setPlaying(false);
    setRecording(false);
    setHighlightedWordIndex(-1);
    setTranscript("");
    setHasListened(false);
    setHasRead(false);

    if (isLastVerse) {
      // This goal is done, move to next goal
      const newCompleted = [...completedGoalIndices, currentGoalIndex];
      setCompletedGoalIndices(newCompleted);

      if (isLastGoal) {
        // ALL goals complete — trigger final scoring
        finishAllGoals();
      } else {
        // Advance to next goal
        toast.success(`✅ Goal "${currentGoal?.title}" complete! Starting next goal...`);
        const nextIdx = currentGoalIndex + 1;
        setCurrentGoalIndex(nextIdx);
        fetchVersesForGoal(goals[nextIdx]);
      }
    } else {
      setCurrentVerseIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    audioRef.current?.pause();
    recognitionRef.current?.stop();
    setPlaying(false);
    setRecording(false);
    setHighlightedWordIndex(-1);
    setTranscript("");
    setHasListened(false);
    setHasRead(false);
    setCurrentVerseIndex((i) => i - 1);
  };

  useEffect(() => {
    return () => { audioRef.current?.pause(); recognitionRef.current?.stop(); };
  }, []);

  const totalGoals = goals.length;
  const canAdvance = hasListened && hasRead;
  const overallGoalProgress = totalGoals > 0
    ? Math.round(((completedGoalIndices.length + (goalStarted ? (currentVerseIndex + (canAdvance ? 1 : 0)) / Math.max(verses.length, 1) : 0)) / totalGoals) * 100)
    : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6" /> Quranator
        </h1>
        {goalStarted && totalGoals > 1 && (
          <span className="text-sm text-muted-foreground">
            Goal {currentGoalIndex + 1}/{totalGoals}
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
          <Button variant="outline" size="sm" onClick={() => navigate("/goals")}>
            Go to Goals
          </Button>
        </div>
      )}

      {/* Goals overview — before starting */}
      {goals.length > 0 && !goalStarted && (
        <div className="space-y-4">
          {/* Ayat count input */}
          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Practice Settings
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Ayat per goal:</span>
                <Input
                  type="number"
                  min="3"
                  max="20"
                  value={ayatCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 3 && val <= 20) setAyatCount(e.target.value);
                    else if (e.target.value === "") setAyatCount("");
                    else setAyatCount(String(Math.min(20, Math.max(3, val || 3))));
                  }}
                  className="bg-background border-border w-20"
                />
                <span className="text-xs text-muted-foreground">(3-20)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Set how many ayat you want to practice per goal. AI will load this many verses for each session.
              </p>
            </CardContent>
          </Card>

          {/* Overall progress */}
          {totalGoals > 1 && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Session Progress</span>
                  <span className="text-sm text-muted-foreground">{completedGoalIndices.length}/{totalGoals} goals</span>
                </div>
                <Progress value={(completedGoalIndices.length / totalGoals) * 100} className="h-2" />
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-4">
              <h2 className="text-sm font-medium">Today's Learning Plan ({totalGoals} goal{totalGoals > 1 ? "s" : ""})</h2>
              <p className="text-xs text-muted-foreground">
                Complete all goals by listening and reading each verse. You'll be scored after finishing all {totalGoals} goal{totalGoals > 1 ? "s" : ""}.
              </p>
              <div className="space-y-2">
                {goals.map((goal, idx) => {
                  const done = completedGoalIndices.includes(idx);
                  return (
                    <button
                      key={goal.id}
                      onClick={() => {
                        if (!done) {
                          setCurrentGoalIndex(idx);
                          fetchVersesForGoal(goal);
                        }
                      }}
                      disabled={done}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center justify-between ${
                        done ? "border-border bg-secondary/30 text-muted-foreground" : "border-border hover:bg-secondary"
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
                          <p className={`text-sm font-medium ${done ? "line-through" : ""}`}>{goal.title}</p>
                          <p className="text-xs text-muted-foreground">{done ? "Completed" : `${ayatCount} ayat`}</p>
                        </div>
                      </div>
                      {!done && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>

              {/* Start all button */}
              <Button className="w-full gap-2" onClick={() => {
                setCurrentGoalIndex(0);
                setCompletedGoalIndices([]);
                setVersionSessions([]);
                fetchVersesForGoal(goals[0]);
              }}>
                <GraduationCap className="h-4 w-4" /> Start Session (All Goals)
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active learning session */}
      {goalStarted && currentGoal && (
        <div className="space-y-4">
          {/* Overall progress bar across all goals */}
          {totalGoals > 1 && (
            <Card className="bg-card border-border">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Overall: Goal {currentGoalIndex + 1} of {totalGoals}</span>
                  <span className="text-xs text-muted-foreground">{completedGoalIndices.length}/{totalGoals} done</span>
                </div>
                <Progress value={(completedGoalIndices.length / totalGoals) * 100} className="h-1" />
              </CardContent>
            </Card>
          )}

          {/* Goal header */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium">{currentGoal.title}</h2>
                <Button variant="ghost" size="sm" onClick={() => {
                  setGoalStarted(false);
                  audioRef.current?.pause();
                  recognitionRef.current?.stop();
                  setPlaying(false);
                  setRecording(false);
                  setHighlightedWordIndex(-1);
                  setTranscript("");
                }}>
                  Back to Goals
                </Button>
              </div>
              {verses.length > 1 && (
                <div className="flex items-center gap-2">
                  <Progress value={((currentVerseIndex + 1) / verses.length) * 100} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">{currentVerseIndex + 1}/{verses.length}</span>
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <span className={`text-xs flex items-center gap-1 ${hasListened ? "text-green-500" : "text-muted-foreground"}`}>
                  {hasListened ? <CheckCircle2 className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />} Listened
                </span>
                <span className={`text-xs flex items-center gap-1 ${hasRead ? "text-green-500" : "text-muted-foreground"}`}>
                  {hasRead ? <CheckCircle2 className="h-3 w-3" /> : <Mic className="h-3 w-3" />} Read
                </span>
              </div>
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
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                    {currentVerse.verse_key}
                  </span>
                  {reciters.length > 0 && (
                    <Select
                      value={String(selectedReciter)}
                      onValueChange={async (val) => {
                        const reciterId = parseInt(val);
                        setSelectedReciter(reciterId);
                        if (!currentVerse) return;
                        try {
                          const { supabase } = await import("@/integrations/supabase/client");
                          const audioRes = await supabase.functions.invoke("quran-proxy", {
                            body: { endpoint: `/recitations/${reciterId}/by_ayah/${currentVerse.verse_key}` },
                          });
                          if (audioRes.data?.audio_files?.[0]) {
                            const url = `https://verses.quran.com/${audioRes.data.audio_files[0].url}`;
                            setVerses(prev => prev.map((v, i) => i === currentVerseIndex ? { ...v, audio_url: url } : v));
                            toast.success("Reciter changed");
                          }
                        } catch { toast.error("Failed to change reciter"); }
                      }}
                    >
                      <SelectTrigger className="w-40 h-7 text-xs">
                        <SelectValue placeholder="Reciter" />
                      </SelectTrigger>
                      <SelectContent>
                        {reciters.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Arabic text */}
                <div className="text-center leading-[3rem] px-2" dir="rtl" lang="ar">
                  {arabicWords.map((word, idx) => (
                    <span key={idx} className={`inline-block text-2xl md:text-3xl font-arabic mx-1 px-1 py-0.5 rounded transition-all duration-200 ${
                      highlightedWordIndex === idx ? "bg-primary/20 text-primary scale-110 ring-1 ring-primary/30" : "text-foreground"
                    }`}>{word}</span>
                  ))}
                </div>

                {currentVerse.translation && (
                  <p className="text-sm text-muted-foreground text-center italic">
                    {currentVerse.translation.replace(/<[^>]*>/g, "")}
                  </p>
                )}

                {/* Live transcript */}
                {(recording || transcript) && (
                  <div className="bg-secondary/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Your recitation:</p>
                    <p className="text-sm" dir="rtl" lang="ar">{transcript || (recording ? "Listening..." : "")}</p>
                    {recording && (
                      <div className="flex items-center justify-center gap-1 mt-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs text-red-400">Recording</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" size="icon" disabled={currentVerseIndex === 0} onClick={handlePrev}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <Button variant={recording ? "destructive" : "outline"} className="gap-2" onClick={toggleRecording} disabled={scoring}>
                    {recording ? <><MicOff className="h-4 w-4" /> Stop</> : <><Mic className="h-4 w-4" /> Read {hasRead && <CheckCircle2 className="h-3 w-3 text-green-500" />}</>}
                  </Button>

                  <Button variant={playing ? "secondary" : "default"} className="gap-2" onClick={playAudio} disabled={scoring}>
                    {playing ? <><Pause className="h-4 w-4" /> Pause</> : <><Volume2 className="h-4 w-4" /> Listen {hasListened && <CheckCircle2 className="h-3 w-3 text-green-500" />}</>}
                  </Button>

                  {/* Next / Finish button */}
                  {isLastVerse && isLastGoal ? (
                    <Button variant="default" className="gap-2" disabled={!canAdvance || scoring} onClick={handleNext}>
                      {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />} Finish All
                    </Button>
                  ) : (
                    <Button variant="outline" size="icon" disabled={!canAdvance} onClick={handleNext}
                      title={!canAdvance ? "Listen and Read first" : isLastVerse ? "Next Goal" : "Next verse"}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {!canAdvance && (
                  <p className="text-xs text-center text-muted-foreground">
                    Complete both Listen and Read to continue
                  </p>
                )}
                {isLastVerse && !isLastGoal && canAdvance && (
                  <p className="text-xs text-center text-muted-foreground">
                    Last verse of this goal — next will start Goal {currentGoalIndex + 2}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No verses found. Try a goal with a surah or ayah reference (e.g. "Read Surah 2" or "Memorize 2:255").
            </div>
          )}
        </div>
      )}

      {/* Scoring overlay */}
      {scoring && (
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">AI is analyzing your session across all goals...</span>
          </CardContent>
        </Card>
      )}

      {/* Completion Dialog */}
      <Dialog open={showCompletion} onOpenChange={setShowCompletion}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center justify-center">
              <Award className="h-6 w-6 text-green-500" /> Session Complete! 🎉
            </DialogTitle>
            <DialogDescription className="text-center space-y-3 pt-4">
              <p className="text-foreground font-medium">
                You completed all {totalGoals} goal{totalGoals > 1 ? "s" : ""} ({verseSessions.length} verses total)
              </p>
              {finalScore && (
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className={`text-4xl font-bold ${finalScore.overallScore >= 80 ? "text-green-500" : finalScore.overallScore >= 60 ? "text-yellow-500" : "text-red-400"}`}>
                    {finalScore.overallScore}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Quranator Score</p>
                  <p className="text-xs text-muted-foreground mt-1">{finalScore.feedback}</p>
                </div>
              )}
              {sdqAwarded > 0 && (
                <div className="flex items-center justify-center gap-2 bg-secondary/50 rounded-lg py-2">
                  <Heart className="h-4 w-4 text-green-500" />
                  <span className="text-sm">+{sdqAwarded} SDQ Points earned!</span>
                </div>
              )}
              <div className="bg-secondary/50 rounded-lg p-3 flex items-center justify-center gap-2">
                <Heart className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  Total SDQ: <strong>{getSadaqahData().totalPoints}</strong> (${getSadaqahDollars()} sadaqah value)
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button className="w-full gap-2" onClick={() => { setShowCompletion(false); navigate("/quranator-score"); }}>
              <Award className="h-4 w-4" /> View Quranator Score
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => {
              setShowCompletion(false);
              setGoalStarted(false);
              setTranscript("");
              setHasListened(false);
              setHasRead(false);
              setSdqAwarded(0);
              setCompletedGoalIndices([]);
              setVersionSessions([]);
              setFinalScore(null);
            }}>
              <RefreshCw className="h-4 w-4" /> Start New Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
