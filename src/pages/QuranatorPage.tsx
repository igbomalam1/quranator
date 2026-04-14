import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { toast } from "sonner";
import { saveScore } from "@/lib/quranator-scores";
import { awardSadaqahPoints, getSadaqahData, getSadaqahDollars } from "@/lib/sadaqah-points";
import { useNavigate } from "react-router-dom";
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

export default function QuranatorPage() {
  const navigate = useNavigate();
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
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [hasListened, setHasListened] = useState(false);
  const [hasRead, setHasRead] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [finalScore, setFinalScore] = useState<ScoreResult | null>(null);
  const [sdqAwarded, setSdqAwarded] = useState(0);
  const [reciters, setReciters] = useState<ReciterOption[]>([]);
  const [selectedReciter, setSelectedReciter] = useState(7); // Default: Mishary Rashid Alafasy
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const allGoals = getGoals();
    const todayGoals = allGoals.filter(
      (g) => g.lastUpdated === today && g.completedToday < g.targetPerDay
    );
    setGoals(todayGoals.length > 0 ? todayGoals : allGoals);
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

  const fetchVersesForGoal = async (goal: Goal) => {
    setLoading(true);
    setVerses([]);
    setCurrentVerseIndex(0);
    setGoalStarted(true);
    setScoreResult(null);
    setTranscript("");
    setHasListened(false);
    setHasRead(false);
    setShowCompletion(false);
    setFinalScore(null);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const ref = parseGoalReference(goal.title);

      let endpoint: string;
      if (ref?.ayah) {
        endpoint = `/verses/by_key/${ref.surah}:${ref.ayah}?translations=20&language=en&fields=text_uthmani`;
      } else if (ref?.surah) {
        endpoint = `/verses/by_chapter/${ref.surah}?translations=20&language=en&per_page=20&fields=text_uthmani`;
      } else {
        const surah = Math.floor(Math.random() * 10) + 1;
        endpoint = `/verses/by_chapter/${surah}?translations=20&language=en&per_page=10&fields=text_uthmani`;
      }

      const { data } = await supabase.functions.invoke("quran-proxy", {
        body: { endpoint },
      });

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
        setHasListened(true);
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
      const finalTranscript = transcriptRef.current;
      setTranscript(finalTranscript);
      setHasRead(true);
      if (finalTranscript.trim() && currentVerse) {
        scoreRecitation(finalTranscript);
      } else {
        toast("No speech detected. Try reading the verse aloud again.", { icon: "🎤" });
      }
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser. Try Chrome.");
      return;
    }

    setTranscript("");
    setScoreResult(null);
    transcriptRef.current = "";

    const recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interimText += result[0].transcript;
        }
      }

      const fullTranscript = (finalText + interimText).trim();
      transcriptRef.current = fullTranscript;
      setTranscript(fullTranscript);

      const spokenWords = fullTranscript.split(/\s+/).filter(Boolean);
      const matchIndex = Math.min(spokenWords.length - 1, arabicWords.length - 1);
      setHighlightedWordIndex(matchIndex >= 0 ? matchIndex : -1);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setRecording(false);
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Please allow mic access.");
      } else if (event.error === "no-speech") {
        toast("No speech detected. Try again.", { icon: "🎤" });
      } else {
        toast.error(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (recording) {
        setRecording(false);
        setHasRead(true);
        const finalTranscript = transcriptRef.current;
        if (finalTranscript.trim() && currentVerse) {
          scoreRecitation(finalTranscript);
        }
      }
      setHighlightedWordIndex(-1);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    toast.success("🎤 Start reading the verse aloud. Press Stop when done.");
  };

  const scoreRecitation = async (userTranscript: string) => {
    if (!currentVerse || !currentGoal) return;
    setScoring(true);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("score-recitation", {
        body: {
          arabicText: currentVerse.text_uthmani,
          userTranscript,
          verseKey: currentVerse.verse_key,
        },
      });

      if (error) throw error;

      const result: ScoreResult = data;
      setScoreResult(result);

      saveScore({
        goalTitle: currentGoal.title,
        verseKey: currentVerse.verse_key,
        arabicText: currentVerse.text_uthmani,
        userTranscript,
        accuracy: result.accuracy,
        tajweedScore: result.tajweedScore,
        fluencyScore: result.fluencyScore,
        overallScore: result.overallScore,
        feedback: result.feedback,
        improvements: result.improvements,
      });

      // Award SDQ points
      const pts = awardSadaqahPoints(result.overallScore, currentVerse.verse_key);
      if (pts > 0) {
        setSdqAwarded(pts);
      }

      if (result.overallScore >= 70) {
        toast.success(`Great recitation! Score: ${result.overallScore}/100 🌟`);
      } else {
        toast(`Score: ${result.overallScore}/100. Keep practicing! 💪`, { icon: "📖" });
      }

      // If last verse and both listened+read, show completion after scoring
      if (isLastVerse) {
        setFinalScore(result);
        setTimeout(() => setShowCompletion(true), 1500);
      }
    } catch (err) {
      console.error("Scoring failed:", err);
      toast.error("Failed to score recitation. Try again.");
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
    setScoreResult(null);
    setTranscript("");
    setHasListened(false);
    setHasRead(false);
    setSdqAwarded(0);
    setCurrentVerseIndex((i) => i + 1);
  };

  const handlePrev = () => {
    audioRef.current?.pause();
    recognitionRef.current?.stop();
    setPlaying(false);
    setRecording(false);
    setHighlightedWordIndex(-1);
    setScoreResult(null);
    setTranscript("");
    setHasListened(false);
    setHasRead(false);
    setSdqAwarded(0);
    setCurrentVerseIndex((i) => i - 1);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      recognitionRef.current?.stop();
    };
  }, []);

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.completedToday >= g.targetPerDay).length;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-400";
  };

  const canAdvance = hasListened && hasRead;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6" /> Quranator
        </h1>
        <div className="flex items-center gap-3">
          {totalGoals > 0 && (
            <span className="text-sm text-muted-foreground">
              {completedGoals}/{totalGoals} goals done
            </span>
          )}
        </div>
      </div>

      {/* Reciter selector */}
      {goalStarted && reciters.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Reciter:</span>
          <Select
            value={String(selectedReciter)}
            onValueChange={(val) => setSelectedReciter(parseInt(val))}
          >
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reciters.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* No goals state */}
      {goals.length === 0 && (
        <div className="text-center py-16">
          <GraduationCap className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground text-sm mb-4">
            No goals set yet. Create goals first, then Quranator will teach you!
          </p>
          <Button variant="outline" size="sm" onClick={() => (window.location.href = "/goals")}>
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
                    recognitionRef.current?.stop();
                    setPlaying(false);
                    setRecording(false);
                    setHighlightedWordIndex(-1);
                    setScoreResult(null);
                    setTranscript("");
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
              {/* Checklist */}
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
            <>
              <Card className="bg-card border-border">
                <CardContent className="p-6 space-y-6">
                  <div className="text-center">
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                      {currentVerse.verse_key}
                    </span>
                  </div>

                  {/* Arabic text with word highlighting */}
                  <div className="text-center leading-[3rem] px-2" dir="rtl" lang="ar">
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

                  {/* Live transcript display */}
                  {(recording || transcript) && (
                    <div className="bg-secondary/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Your recitation:</p>
                      <p className="text-sm" dir="rtl" lang="ar">
                        {transcript || (recording ? "Listening..." : "")}
                      </p>
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
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentVerseIndex === 0}
                      onClick={handlePrev}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Button
                      variant={recording ? "destructive" : "outline"}
                      className="gap-2"
                      onClick={toggleRecording}
                      disabled={scoring}
                    >
                      {recording ? (
                        <>
                          <MicOff className="h-4 w-4" /> Stop
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4" /> Read {hasRead && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        </>
                      )}
                    </Button>

                    <Button
                      variant={playing ? "secondary" : "default"}
                      className="gap-2"
                      onClick={playAudio}
                      disabled={scoring}
                    >
                      {playing ? (
                        <>
                          <Pause className="h-4 w-4" /> Pause
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-4 w-4" /> Listen {hasListened && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        </>
                      )}
                    </Button>

                    {isLastVerse ? (
                      <Button
                        variant="default"
                        className="gap-2"
                        disabled={!canAdvance || scoring}
                        onClick={async () => {
                          if (scoring) return;
                          // If we already have a score, show completion
                          if (scoreResult) {
                            setFinalScore(scoreResult);
                            setShowCompletion(true);
                            return;
                          }
                          // If read but no score yet, trigger scoring now
                          if (hasRead && transcript.trim() && currentVerse) {
                            setScoring(true);
                            try {
                              const { supabase } = await import("@/integrations/supabase/client");
                              const { data, error } = await supabase.functions.invoke("score-recitation", {
                                body: {
                                  arabicText: currentVerse.text_uthmani,
                                  userTranscript: transcript,
                                  verseKey: currentVerse.verse_key,
                                },
                              });
                              if (error) throw error;
                              const result: ScoreResult = data;
                              setScoreResult(result);
                              saveScore({
                                goalTitle: currentGoal!.title,
                                verseKey: currentVerse.verse_key,
                                arabicText: currentVerse.text_uthmani,
                                userTranscript: transcript,
                                accuracy: result.accuracy,
                                tajweedScore: result.tajweedScore,
                                fluencyScore: result.fluencyScore,
                                overallScore: result.overallScore,
                                feedback: result.feedback,
                                improvements: result.improvements,
                              });
                              const pts = awardSadaqahPoints(result.overallScore, currentVerse.verse_key);
                              if (pts > 0) setSdqAwarded(pts);
                              setFinalScore(result);
                              setShowCompletion(true);
                            } catch (err) {
                              console.error("Scoring failed:", err);
                              toast.error("Failed to score recitation. Try again.");
                            } finally {
                              setScoring(false);
                            }
                          } else {
                            toast.error("Please read the verse aloud first.");
                          }
                        }}
                      >
                        {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />} Finish
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={!canAdvance}
                        onClick={handleNext}
                        title={!canAdvance ? "Listen and Read first" : "Next verse"}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {!canAdvance && (
                    <p className="text-xs text-center text-muted-foreground">
                      Complete both Listen and Read to continue
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* AI Scoring */}
              {scoring && (
                <Card className="bg-card border-border">
                  <CardContent className="p-6 flex items-center justify-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      AI is analyzing your recitation...
                    </span>
                  </CardContent>
                </Card>
              )}

              {scoreResult && !scoring && (
                <Card className="bg-card border-border">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" /> Recitation Score
                    </h3>

                    <div className="grid grid-cols-4 gap-3 text-center">
                      {[
                        { label: "Overall", value: scoreResult.overallScore },
                        { label: "Accuracy", value: scoreResult.accuracy },
                        { label: "Tajweed", value: scoreResult.tajweedScore },
                        { label: "Fluency", value: scoreResult.fluencyScore },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className={`text-2xl font-bold ${getScoreColor(item.value)}`}>
                            {item.value}
                          </div>
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                        </div>
                      ))}
                    </div>

                    {sdqAwarded > 0 && (
                      <div className="flex items-center justify-center gap-2 bg-secondary/50 rounded-lg py-2">
                        <Heart className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">+{sdqAwarded} SDQ Points earned!</span>
                      </div>
                    )}

                    <p className="text-sm text-foreground">{scoreResult.feedback}</p>

                    {scoreResult.improvements.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Areas to improve:
                        </p>
                        <ul className="text-sm space-y-1">
                          {scoreResult.improvements.map((imp, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary mt-0.5">•</span>
                              <span className="text-muted-foreground">{imp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setScoreResult(null);
                        setTranscript("");
                        setHasRead(false);
                        setSdqAwarded(0);
                      }}
                    >
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No verses found for this goal. Try a goal with a surah or ayah reference (e.g. "Read Surah 2" or "Memorize 2:255").
            </div>
          )}
        </div>
      )}

      {/* Completion Dialog */}
      <Dialog open={showCompletion} onOpenChange={setShowCompletion}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center justify-center">
              <Award className="h-6 w-6 text-green-500" /> Lesson Complete! 🎉
            </DialogTitle>
            <DialogDescription className="text-center space-y-3 pt-4">
              <p className="text-foreground font-medium">
                You completed all {verses.length} verse{verses.length > 1 ? "s" : ""} for "{currentGoal?.title}"
              </p>
              {finalScore && (
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className={`text-4xl font-bold ${getScoreColor(finalScore.overallScore)}`}>
                    {finalScore.overallScore}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Final Score</p>
                </div>
              )}
              <div className="bg-secondary/50 rounded-lg p-3 flex items-center justify-center gap-2">
                <Heart className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  Total SDQ Points: <strong>{getSadaqahData().totalPoints}</strong> (${getSadaqahDollars()} sadaqah value)
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
              setScoreResult(null);
              setTranscript("");
              setHasListened(false);
              setHasRead(false);
              setSdqAwarded(0);
            }}>
              <RefreshCw className="h-4 w-4" /> Start New Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
