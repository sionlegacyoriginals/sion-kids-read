import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Square, Headphones, ChevronDown, ChevronUp, User, Users } from "lucide-react";

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

// Names/substrings strongly associated with male voices
const MALE_HINTS = [
  "male", " al ", "alex", "daniel", "tom", "david", "mark", "james",
  "fred", "ralph", "junior", "aaron", "arthur", "gordon", "lee", "oliver",
  "rishi", "rocko", "samson", "bob", "bruce", "charlie", "eric", "george",
  "henry", "jake", "joe", "john", "kevin", "michael", " mike", "paul",
  "peter", "ryan", "scott", "steve", "thomas", "william",
];

const FEMALE_HINTS = [
  "female", "samantha", "victoria", "karen", "moira", "fiona", "susan",
  "alice", "alva", "amelie", "anna", "ellen", "joana", "kanya", "laura",
  "lekha", "luciana", "mariska", "milena", "monica", "paulina", "petra",
  "sara", "satu", "sin-ji", "soledad", "ting-ting", "yuna", "zosia",
  "zuzana", "tessa", "veena", "serena", "ava", "jessica", "kate",
];

export function guessGender(voice: SpeechSynthesisVoice): "male" | "female" | "unknown" {
  const lower = " " + voice.name.toLowerCase() + " ";
  if (FEMALE_HINTS.some((h) => lower.includes(h))) return "female";
  if (MALE_HINTS.some((h) => lower.includes(h))) return "male";
  return "unknown";
}

export function shortName(voice: SpeechSynthesisVoice): string {
  return voice.name
    .replace(/\s*\([^)]*\)\s*/g, "")
    .replace(/online/gi, "")
    .replace(/natural/gi, "")
    .replace(/english/gi, "")
    .replace(/united states/gi, "US")
    .replace(/united kingdom/gi, "UK")
    .replace(/\s+/g, " ")
    .trim() || voice.name;
}

function loadEnglishVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
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
        setSelectedVoice((prev) => {
          if (prev) return prev; // keep existing selection
          // Default to a female voice
          return v.find((x) => guessGender(x) === "female") ?? v[0];
        });
      }
    };
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);

  const startSpeaking = useCallback(
    (fromChar: number, rate: number, voice: SpeechSynthesisVoice | null) => {
      window.speechSynthesis.cancel();
      const text = fullTextRef.current.slice(fromChar);
      if (!text.trim()) return;

      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = rate;

      // Always re-resolve voice from live list — stale references are silently ignored
      const liveVoice = voice
        ? window.speechSynthesis.getVoices().find((v) => v.name === voice.name) ?? null
        : null;

      if (liveVoice) {
        utt.voice = liveVoice;
        utt.lang = liveVoice.lang;
      } else {
        utt.lang = "en-US";
      }

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
    },
    []
  );

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

  const changeSpeed = useCallback(
    (s: Speed) => {
      setSpeed(s);
      if (isPlaying) startSpeaking(resumeCharRef.current, s, voiceRef.current);
    },
    [isPlaying, startSpeaking]
  );

  const changeVoice = useCallback(
    (v: SpeechSynthesisVoice) => {
      setSelectedVoice(v);
      if (isPlaying) startSpeaking(resumeCharRef.current, speedRef.current, v);
    },
    [isPlaying, startSpeaking]
  );

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
}: PlayerBarProps) {
  const [showVoices, setShowVoices] = useState(false);

  const maleVoices   = voices.filter((v) => guessGender(v) === "male");
  const femaleVoices = voices.filter((v) => guessGender(v) === "female");
  const otherVoices  = voices.filter((v) => guessGender(v) === "unknown");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl mx-4 mb-4 flex flex-col gap-2">

        {/* ── Voice picker panel ── */}
        {showVoices && (
          <div className="bg-white border border-border/60 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-foreground">Choose a reading voice</p>
              <button
                onClick={() => setShowVoices(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {voices.length === 0 && (
              <p className="text-sm text-muted-foreground">No voices available on this device.</p>
            )}

            {maleVoices.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Men's voices
                </p>
                <div className="flex flex-wrap gap-2">
                  {maleVoices.map((v) => (
                    <VoiceChip key={v.name} voice={v} selected={selectedVoice?.name === v.name} onSelect={() => { changeVoice(v); setShowVoices(false); }} />
                  ))}
                </div>
              </div>
            )}

            {femaleVoices.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Women's voices
                </p>
                <div className="flex flex-wrap gap-2">
                  {femaleVoices.map((v) => (
                    <VoiceChip key={v.name} voice={v} selected={selectedVoice?.name === v.name} onSelect={() => { changeVoice(v); setShowVoices(false); }} />
                  ))}
                </div>
              </div>
            )}

            {otherVoices.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Other voices
                </p>
                <div className="flex flex-wrap gap-2">
                  {otherVoices.map((v) => (
                    <VoiceChip key={v.name} voice={v} selected={selectedVoice?.name === v.name} onSelect={() => { changeVoice(v); setShowVoices(false); }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Main player card ── */}
        <div className="bg-primary rounded-2xl shadow-2xl shadow-primary/30 p-4 flex flex-col gap-3">

          {/* Row 1 — play controls + close */}
          <div className="flex items-center gap-3">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all shrink-0"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying
                ? <Pause className="w-7 h-7 text-white fill-white" />
                : <Play  className="w-7 h-7 text-white fill-white" />}
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base leading-tight truncate">
                {isPlaying ? `Reading for ${childName}…` : "Read Along"}
              </p>
              <p className="text-white/70 text-sm leading-tight mt-0.5">
                {isPlaying ? "Words highlight as you follow along" : "Tap ▶ to begin"}
              </p>
            </div>

            {/* Stop */}
            <button
              onClick={stop}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all shrink-0"
              aria-label="Stop"
            >
              <Square className="w-5 h-5 text-white fill-white" />
            </button>

            {/* Close */}
            <button
              onClick={close}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all shrink-0"
              aria-label="Close player"
            >
              <ChevronDown className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Row 2 — voice + speed */}
          <div className="flex items-center gap-2 pt-1 border-t border-white/20">

            {/* Voice selector — full width label, always visible */}
            <button
              onClick={() => setShowVoices((v) => !v)}
              className="flex-1 flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2 transition-all text-left min-w-0"
            >
              <span className="text-lg leading-none shrink-0">
                {selectedVoice
                  ? guessGender(selectedVoice) === "male" ? "👨" : guessGender(selectedVoice) === "female" ? "👩" : "🎙️"
                  : "🎙️"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wide leading-none mb-0.5">Voice</p>
                <p className="text-white font-semibold text-sm truncate leading-tight">
                  {selectedVoice ? shortName(selectedVoice) : "Choose a voice"}
                </p>
              </div>
              {showVoices
                ? <ChevronUp className="w-4 h-4 text-white/60 shrink-0" />
                : <ChevronDown className="w-4 h-4 text-white/60 shrink-0" />}
            </button>

            {/* Speed selector */}
            <div className="flex items-center gap-0.5 shrink-0 bg-white/10 rounded-xl px-2 py-2">
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-wide mr-1 hidden sm:block">Speed</p>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  className={`text-xs font-bold px-2 py-1 rounded-lg transition-all ${
                    speed === s ? "bg-white text-primary" : "text-white/70 hover:text-white"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceChip({
  voice, selected, onSelect,
}: {
  voice: SpeechSynthesisVoice;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
        selected
          ? "bg-primary text-white border-primary"
          : "bg-muted/60 text-foreground border-border hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      {shortName(voice)}
    </button>
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
