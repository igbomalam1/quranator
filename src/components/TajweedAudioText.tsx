import { useState, useRef } from "react";
import { Volume2 } from "lucide-react";

// Detects Arabic words and wraps them with a clickable play button
// Uses browser SpeechSynthesis for Arabic pronunciation
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:\s[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*/g;

function speakArabic(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ar-SA";
  utterance.rate = 0.8;
  window.speechSynthesis.speak(utterance);
}

interface Props {
  content: string;
}

export default function TajweedAudioText({ content }: Props) {
  const [playing, setPlaying] = useState<string | null>(null);

  const handlePlay = (word: string) => {
    setPlaying(word);
    speakArabic(word);
    setTimeout(() => setPlaying(null), 2000);
  };

  // Split content into segments: Arabic words get play buttons, rest stays as-is
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

  if (matches.length === 0) return <span>{content}</span>;

  return (
    <span>
      {parts.map((part, i) =>
        part.type === "arabic" ? (
          <span
            key={i}
            className={`inline-flex items-center gap-0.5 cursor-pointer rounded px-1 py-0.5 transition-colors hover:bg-accent ${
              playing === part.value ? "bg-accent text-accent-foreground" : ""
            }`}
            onClick={() => handlePlay(part.value)}
            title="Click to hear pronunciation"
          >
            <span className="font-arabic text-base">{part.value}</span>
            <Volume2 className="h-3 w-3 text-muted-foreground inline-block flex-shrink-0" />
          </span>
        ) : (
          <span key={i}>{part.value}</span>
        )
      )}
    </span>
  );
}
