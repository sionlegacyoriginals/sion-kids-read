import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Square, Headphones, ChevronDown, Mic } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReadAlongToken {
  text: string;
  start: number;
  isWord: boolean;
}

export interface ReadAlongParagraphData {
  tokens: ReadAlongToken[];
}

// ─── Build token data ─────────────────────────────────────────────────────────

const SEPARATOR = "\n\n";

export function buildReadAlongData(paragraphs: string[]): {
  fullText: string;
  paragraphData: ReadAlongParagraphData[];
} {
  const paragraphData: ReadAlongParagraphData[] = [];
  let offset = 0;
  for (let pi = 0; pi < paragraphs.length; pi++) {
    const para = paragraphs[pi];
    const tokens: ReadAlongToken[] = [];
    const re = /(\S+|\s+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(para)) !== null) {
      tokens.push({ text: m[0], start: offset + m.index, isWord: /\S/.test(m[0]) });
    }
    paragraphData.push({ tokens });
    offset += para.length + (pi < paragraphs.length - 1 ? SEPARATOR.length : 0);
  }
  return { fullText: paragraphs.join(SEPARATOR), paragraphData };
}

// ─── Voice helpers ────────────────────────────────────────────────────────────

const KNOWN_MALE_HINTS = [
  "male", "alex", "daniel", "tom", "david", "mark", "james", "fred", "ralph",
  "junior", "aaron", "arthur", "gordon", "lee", "oliver", "rishi", "rocko",
  "samson", "sandy", "bob", "bruce", "charlie", "eric", "george", "henry",
  "jake", "joe", "john", "kevin", "michael", "mike", "paul", "peter", "ryan",
  "scott", "steve", "thomas", "william", "zach",
];

export function guessGender(voice: SpeechSynthesisVoice): "male" | "female" | "unknown" {
  const lower = voice.name.toLowerCase();
  if (lower.includes("female")) return "female";
  if (KNOWN_MALE_HINTS.some((h) => lower.includes(h))) return "male";
  if (lower.includes("male")) return "male";
  return "unknown";
}

function shortName(voice: SpeechSynthesisVoice): string {
  // Strip common suffixes like "(en-US)" or "Online (Natural) - English (United States)"
  let name = voice.name
    .replace(/\s*\(.*?\)\s*/g, "")            // remove parenthetical
    .replace(/online\s*/i, "")
    .replace(/natural\s*/i, "")
    .replace(/english\s*/i, "")
    .replace(/united states/i, "")
    .replace(/united kingdom/i, "UK")
    .replace(/australia/i, "AU")
    .replace(/\s+/g, " ")
    .trim();
  return name || voice.name;
}

function loadEnglishVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.startsWith("en"));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

type Speed = 0.75 | 1 | 1.25 | 1.5;
const SPEEDS: Speed[] = [0.75, 1, 1.25, 1.5];

export function useReadAlong(paragraphs: string[]) {
  const [visible, setVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [activeCharIndex, setActiveCharIndex] = useState<number | null>(null);
  const [boundarySupported, setBoundarySupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const resumeCharRef = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const voiceRef = useRef<SpeechSynthesisVoice | null>(selectedVoice);
  voiceRef.current = selectedVoice;

  const { fullText, paragraphData } = buildReadAlongData(paragraphs);
  const fullTextRef = useRef(fullText);
  fullTextRef.current = fullText;

  // Load voices (async on Chrome, sync on some others)
  useEffect(() => {
    const update = () => {
      const v = loadEnglishVoices();
      if (v.length > 0) {
        setVoices(v);
        // Default to first voice so there's always something selected
        setSelectedVoice((prev) => prev ?? v[0]);
      }
    };
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);

  const startSpeaking = useCallback((fromChar: number, rate: number, voice: SpeechSynthesisVoice | null) => {
    window.speechSynthesis.cancel();
    const text = fullTextRef.current.slice(fromChar);
    if (!text.trim()) return;

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = rate;
    utt.lang = "en-US";
    if (voice) utt.voice = voice;

    let fired = false;
    utt.onboundary = (e) => {
      if (e.name !== "word") return;
      fired = true;
      setActiveCharIndex(fromChar + e.charIndex);
    };
    utt.onstart = () => {
      setIsPlaying(true);
      setTimeout(() => { if (!fired) setBoundarySupported(false); }, 700);
    };
    utt.onend = () => {
      setIsPlaying(false);
      setActiveCharIndex(null);
      resumeCharRef.current = 0;
    };
    utt.onerror = () => {
      setIsPlaying(false);
      setActiveCharIndex(null);
    };

    resumeCharRef.current = fromChar;
    window.speechSynthesis.speak(utt);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    } else {
      startSpeaking(resumeCharRef.current, speedRef.current, voiceRef.current);
    }
  }, [isPlaying, startSpeaking]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setActiveCharIndex(null);
    resumeCharRef.current = 0;
  }, []);

  const changeSpeed = useCallback((s: Speed) => {
    setSpeed(s);
    if (isPlaying) startSpeaking(resumeCharRef.current, s, voiceRef.current);
  }, [isPlaying, startSpeaking]);

  const changeVoice = useCallback((v: SpeechSynthesisVoice) => {
    setSelectedVoice(v);
    if (isPlaying) startSpeaking(resumeCharRef.current, speedRef.current, v);
  }, [isPlaying, startSpeaking]);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => { stop(); setVisible(false); }, [stop]);

  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  return {
    visible, open, close,
    isPlaying, togglePlay, stop,
    speed, changeSpeed, SPEEDS,
    voices, selectedVoice, changeVoice,
    activeCharIndex,
    boundarySupported,
    paragraphData,
  };
}

// ─── Player bar ───────────────────────────────────────────────────────────────

interface PlayerBarProps {
  childName: string;
  isPlaying: boolean;
  togglePlay: () => void;
  stop: () => void;
  close: () => void;
  speed: number;
  changeSpeed: (s: Speed) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  changeVoice: (v: SpeechSynthesisVoice) => void;
  boundarySupported: boolean;
}

export function ReadAlongBar({
  childName, isPlaying, togglePlay, stop, close,
  speed, changeSpeed,
  voices, selectedVoice, changeVoice,
  boundarySupported,
}: PlayerBarProps) {
  const [showVoices, setShowVoices] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl mx-4 mb-4 flex flex-col gap-2">

        {/* Voice picker panel */}
        {showVoices && voices.length > 0 && (
          <div className="bg-white/95 backdrop-blur-sm border border-border/60 rounded-2xl shadow-xl p-3 animate-in slide-in-from-bottom-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">Choose a voice</p>
            <div className="flex flex-wrap gap-2">
              {voices.map((v) => {
                const gender = guessGender(v);
                const isSelected = selectedVoice?.name === v.name;
                return (
                  <button
                    key={v.name}
                    onClick={() => { changeVoice(v); setShowVoices(false); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                      isSelected
                        ? "bg-primary text-white border-primary"
                        : "bg-muted/60 text-foreground border-border hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <span className="text-base leading-none">
                      {gender === "male" ? "👨" : gender === "female" ? "👩" : "🎙️"}
                    </span>
                    {shortName(v)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main bar */}
        <div className="bg-primary rounded-2xl shadow-2xl shadow-primary/30 px-4 py-3 flex items-center gap-3">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all shrink-0"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying
              ? <Pause className="w-6 h-6 text-white fill-white" />
              : <Play  className="w-6 h-6 text-white fill-white" />}
          </button>

          {/* Label */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate leading-tight">
              {isPlaying ? `Reading for ${childName}…` : "Read Along"}
            </p>
            <p className="text-white/60 text-xs leading-tight mt-0.5">
              {selectedVoice ? shortName(selectedVoice) : "Tap ▶ to start"}
            </p>
          </div>

          {/* Voice picker toggle */}
          <button
            onClick={() => setShowVoices((v) => !v)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              showVoices ? "bg-white text-primary" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            aria-label="Choose voice"
            title="Choose voice"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Speed */}
          <div className="flex items-center gap-0.5 shrink-0">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => changeSpeed(s)}
                className={`text-xs font-bold px-2 py-1 rounded-lg transition-all ${
                  speed === s ? "bg-white text-primary" : "text-white/60 hover:text-white"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Stop */}
          <button
            onClick={stop}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all shrink-0"
            aria-label="Stop"
          >
            <Square className="w-4 h-4 text-white fill-white" />
          </button>

          {/* Close */}
          <button
            onClick={close}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all shrink-0"
            aria-label="Close"
          >
            <ChevronDown className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Highlighted paragraph ────────────────────────────────────────────────────

export function ReadAlongParagraph({
  tokens,
  activeCharIndex,
}: {
  tokens: ReadAlongToken[];
  activeCharIndex: number | null;
}) {
  return (
    <p>
      {tokens.map((token, i) => {
        if (!token.isWord) return <span key={i}>{token.text}</span>;
        const isActive =
          activeCharIndex !== null &&
          activeCharIndex >= token.start &&
          activeCharIndex < token.start + token.text.length;
        return (
          <span
            key={i}
            className={
              isActive
                ? "bg-accent/50 rounded px-[1px] -mx-[1px] transition-colors duration-75"
                : "transition-colors duration-75"
            }
          >
            {token.text}
          </span>
        );
      })}
    </p>
  );
}

// ─── Trigger button ───────────────────────────────────────────────────────────

export function ReadAloudButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/40 bg-primary/5 text-primary text-sm font-bold hover:bg-primary/10 transition-all"
    >
      <Headphones className="w-4 h-4" />
      Read aloud
    </button>
  );
}
