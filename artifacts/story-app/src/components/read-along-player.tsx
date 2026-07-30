import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Square, Headphones, ChevronDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReadAlongToken {
  text: string;
  /** char index in the full utterance string */
  start: number;
  isWord: boolean;
}

export interface ReadAlongParagraphData {
  tokens: ReadAlongToken[];
}

// ─── Build token data from paragraphs ─────────────────────────────────────────

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
      tokens.push({
        text: m[0],
        start: offset + m.index,
        isWord: /\S/.test(m[0]),
      });
    }
    paragraphData.push({ tokens });
    offset += para.length + (pi < paragraphs.length - 1 ? SEPARATOR.length : 0);
  }

  return { fullText: paragraphs.join(SEPARATOR), paragraphData };
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

  const resumeCharRef = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const { fullText, paragraphData } = buildReadAlongData(paragraphs);
  const fullTextRef = useRef(fullText);
  fullTextRef.current = fullText;

  const startSpeaking = useCallback((fromChar: number, rate: number) => {
    window.speechSynthesis.cancel();
    const text = fullTextRef.current.slice(fromChar);
    if (!text.trim()) return;

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = rate;
    utt.lang = "en-US";

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
      startSpeaking(resumeCharRef.current, speedRef.current);
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
    if (isPlaying) {
      const fromChar = resumeCharRef.current;
      startSpeaking(fromChar, s);
    }
  }, [isPlaying, startSpeaking]);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => { stop(); setVisible(false); }, [stop]);

  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  return {
    visible, open, close,
    isPlaying, togglePlay, stop,
    speed, changeSpeed, SPEEDS,
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
  boundarySupported: boolean;
}

export function ReadAlongBar({
  childName, isPlaying, togglePlay, stop, close, speed, changeSpeed, boundarySupported,
}: PlayerBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl mx-4 mb-4 bg-primary rounded-2xl shadow-2xl shadow-primary/30 px-5 py-3 flex items-center gap-3">
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
            {!boundarySupported
              ? "Tap play to hear the story"
              : isPlaying
                ? "Words highlight as you follow along"
                : "Tap ▶ to start"}
          </p>
        </div>

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
