import React, { useState, useCallback, forwardRef } from "react";
import { Volume2 } from "lucide-react";

const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:\s[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*/g;

interface Props {
  content: string;
}

const TajweedAudioText = forwardRef<HTMLSpanElement, Props>(({ content: rawContent }, ref) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  // Safely convert content to string
  const content = typeof rawContent === "string" ? rawContent :
    (rawContent && typeof rawContent === "object" && "props" in (rawContent as any))
      ? String((rawContent as any).props?.children ?? "")
      : String(rawContent ?? "");

  const handlePlay = useCallback((word: string, index: number) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setPlayingIndex(index);

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "ar-SA";
    utterance.rate = 0.7;
    utterance.onend = () => setPlayingIndex(null);
    utterance.onerror = () => setPlayingIndex(null);
    window.speechSynthesis.speak(utterance);
  }, []);

  // Split content into segments
  const parts: { type: "text" | "arabic"; value: string }[] = [];
  let lastIndex = 0;
  const matches = [...content.matchAll(ARABIC_REGEX)];

  for (const match of matches) {
    const idx = match.index!;
    if (idx > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, idx) });
    }
    parts.push({ type: "arabic", value: match[0] });
    lastIndex = idx + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  if (matches.length === 0) return <span ref={ref}>{content}</span>;

  let arabicCounter = 0;

  return (
    <span ref={ref}>
      {parts.map((part, i) => {
        if (part.type !== "arabic") return <span key={i}>{part.value}</span>;
        const currentIndex = arabicCounter++;
        const isPlaying = playingIndex === currentIndex;
        return (
          <span
            key={i}
            className={`inline-flex items-center gap-0.5 cursor-pointer rounded px-1 py-0.5 transition-all duration-300 hover:bg-accent ${
              isPlaying
                ? "bg-foreground/20 text-foreground ring-1 ring-foreground/30 scale-105"
                : ""
            }`}
            onClick={() => handlePlay(part.value, currentIndex)}
            title="Click to hear pronunciation"
          >
            <span className={`font-arabic text-base transition-all duration-300 ${isPlaying ? "text-foreground font-semibold" : ""}`}>
              {part.value}
            </span>
            <Volume2 className={`h-3 w-3 inline-block flex-shrink-0 transition-all duration-300 ${isPlaying ? "text-foreground animate-pulse" : "text-muted-foreground"}`} />
          </span>
        );
      })}
    </span>
  );
});

TajweedAudioText.displayName = "TajweedAudioText";
export default TajweedAudioText;
