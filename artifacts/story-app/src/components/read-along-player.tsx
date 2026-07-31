import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Square, Headphones, ChevronDown, ChevronUp } from "lucide-react";

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

const MALE_HINTS = [
  "male", "alex", "daniel", "tom ", "david", "mark", "james",
  "fred", "ralph", "junior", "aaron", "arthur", "gordon", "lee ",
  "oliver", "rishi", "rocko", "samson", "bob", "bruce", "charlie",
  "eric", "george", "henry", "jake", " joe", "john", "kevin",
  "michael", " mike", "paul", "peter", "ryan", "scott", "steve",
  "thomas", "william",
];
const FEMALE_HINTS = [
  "female", "samantha", "victoria", "karen", "moira", "fiona", "susan",
  "alice", "alva", "amelie", "anna", "ellen", "joana", "kanya", "laura",
  "lekha", "luciana", "mariska", "milena", "monica", "paulina", "petra",
  "sara", "satu", "tessa", "veena", "serena", "ava ", "jessica", "kate",
  "zuzana", "zosia", "yuna", "soledad",
];

export function guessGender(voice: SpeechSynthesisVoice): "male" | "female" | "unknown" {
  const lower = " " + voice.name.toLowerCase() + " ";
  if (FEMALE_HINTS.some((h) => lower.includes(h))) return "female";
  if (MALE_HINTS.some((h) => lower.includes(h))) return "male";
  return "unknown";
}

/** Region label from a BCP-47 lang tag */
function regionLabel(lang: string): string {
  const map: Record<string, string> = {
    "en-US": "United States",
    "en-GB": "United Kingdom",
    "en-AU": "Australia",
    "en-IN": "India",
    "en-IE": "Ireland",
    "en-ZA": "South Africa",
    "en-NZ": "New Zealand",
    "en-CA": "Canada",
    "en-PH": "Philippines",
    "en-NG": "Nigeria",
  };
  return map[lang] ?? lang;
}

export function shortName(voice: SpeechSynthesisVoice): string {
  // Strip "(en-US)" style suffixes and vendor noise
  return voice.name
    .replace(/\s*\([^)]*\)\s*/g, "")
    .replace(/google/gi, "")
    .replace(/online/gi, "")
    .replace(/natural/gi, "")
    .replace(/english/gi, "")
    .replace(/united states/gi, "")
    .replace(/united kingdom/gi, "UK")
    .replace(/australia/gi, "AU")
    .replace(/\s+/g, " ")
    .trim() || voice.name;
}

function loadEnglishVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
}

interface VoiceGroup {
  region: string;
  lang: string;
  voices: SpeechSynthesisVoice[];
}

function groupByRegion(voices: SpeechSynthesisVoice[]): VoiceGroup[] {
  const map = new Map<string, SpeechSynthesisVoice[]>();
  for (const v of voices) {
    const key = v.lang || "en";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  return Array.from(map.entries())
    .map(([lang, vs]) => ({ lang, region: regionLabel(lang), voices: vs }))
    .sort((a, b) => a.region.localeCompare(b.region));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

type Speed = 0.75 | 1 | 1.25 | 1.5;
const SPEEDS: Speed[] = [0.75, 1, 1.25, 1.5];

// Pitch presets: normal female, deeper / more masculine, higher / more childlike
type PitchPreset = "normal" | "deeper" | "higher";
const PITCH_MAP: Record<PitchPreset, number> = { normal: 1, deeper: 0.6, higher: 1.4 };

// ms per character at rate=1 — calibrated to ~150 words/min (~5 chars/word)
const MS_PER_CHAR_BASE = 80;

export function useReadAlong(paragraphs: string[]) {
  const [visible, setVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [pitch, setPitch] = useState<PitchPreset>("normal");
  const [activeCharIndex, setActiveCharIndex] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const resumeCharRef = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const pitchRef = useRef(pitch);
  pitchRef.current = pitch;
  const voiceRef = useRef<SpeechSynthesisVoice | null>(selectedVoice);
  voiceRef.current = selectedVoice;
  const rafRef = useRef<number | null>(null);
  const speechStartMsRef = useRef(0);
  const usingBoundaryRef = useRef(false);

  const { fullText, paragraphData } = buildReadAlongData(paragraphs);
  const fullTextRef = useRef(fullText);
  fullTextRef.current = fullText;
  const paragraphDataRef = useRef(paragraphData);
  paragraphDataRef.current = paragraphData;

  // All word tokens in order — used by the timer fallback
  const allTokensRef = useRef<ReadAlongToken[]>([]);
  allTokensRef.current = paragraphData.flatMap((p) => p.tokens.filter((t) => t.isWord));

  const stopTimer = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Timer-based word advancement (fallback when onboundary doesn't fire)
  const startTimer = useCallback((fromChar: number, rate: number) => {
    stopTimer();
    const msPerChar = MS_PER_CHAR_BASE / rate;
    speechStartMsRef.current = performance.now();

    function tick() {
      const elapsed = performance.now() - speechStartMsRef.current;
      const estimatedChar = fromChar + elapsed / msPerChar;
      const tokens = allTokensRef.current;

      // Find the last word token whose start is <= estimatedChar
      let active: ReadAlongToken | null = null;
      for (const t of tokens) {
        if (t.start <= estimatedChar) active = t;
        else break;
      }
      if (active) setActiveCharIndex(active.start);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [stopTimer]);

  // Load voices (async on Chrome)
  useEffect(() => {
    const update = () => {
      const v = loadEnglishVoices();
      if (v.length > 0) {
        setVoices(v);
        setSelectedVoice((prev) => prev ?? v[0]);
      }
    };
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);

  const startSpeaking = useCallback(
    (fromChar: number, rate: number, pitchPreset: PitchPreset, voice: SpeechSynthesisVoice | null) => {
      window.speechSynthesis.cancel();
      stopTimer();
      const text = fullTextRef.current.slice(fromChar);
      if (!text.trim()) return;

      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = rate;
      utt.pitch = PITCH_MAP[pitchPreset];

      // Always re-resolve voice from live list — stale refs are silently ignored
      const liveVoice = voice
        ? window.speechSynthesis.getVoices().find((v) => v.name === voice.name) ?? null
        : null;
      if (liveVoice) {
        utt.voice = liveVoice;
        utt.lang = liveVoice.lang;
      } else {
        utt.lang = "en-US";
      }

      usingBoundaryRef.current = false;

      utt.onboundary = (e) => {
        if (e.name !== "word") return;
        // Boundary events work — use them and stop the timer fallback
        if (!usingBoundaryRef.current) {
          usingBoundaryRef.current = true;
          stopTimer();
        }
        setActiveCharIndex(fromChar + e.charIndex);
      };

      utt.onstart = () => {
        setIsPlaying(true);
        // Start timer immediately; if boundary events fire we'll cancel it
        startTimer(fromChar, rate);
        // After 600ms with no boundary event, keep the timer running
        setTimeout(() => {
          if (!usingBoundaryRef.current) {
            // Timer stays active — boundary events not supported
          }
        }, 600);
      };
      utt.onend = () => {
        stopTimer();
        setIsPlaying(false);
        setActiveCharIndex(null);
        resumeCharRef.current = 0;
      };
      utt.onerror = () => {
        stopTimer();
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
      startSpeaking(resumeCharRef.current, speedRef.current, pitchRef.current, voiceRef.current);
    }
  }, [isPlaying, startSpeaking]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    stopTimer();
    setIsPlaying(false);
    setActiveCharIndex(null);
    resumeCharRef.current = 0;
  }, [stopTimer]);

  const changeSpeed = useCallback((s: Speed) => {
    setSpeed(s);
    if (isPlaying) startSpeaking(resumeCharRef.current, s, pitchRef.current, voiceRef.current);
  }, [isPlaying, startSpeaking]);

  const changePitch = useCallback((p: PitchPreset) => {
    setPitch(p);
    if (isPlaying) startSpeaking(resumeCharRef.current, speedRef.current, p, voiceRef.current);
  }, [isPlaying, startSpeaking]);

  const changeVoice = useCallback((v: SpeechSynthesisVoice) => {
    setSelectedVoice(v);
    if (isPlaying) startSpeaking(resumeCharRef.current, speedRef.current, pitchRef.current, v);
  }, [isPlaying, startSpeaking]);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => { stop(); setVisible(false); }, [stop]);

  useEffect(() => () => { window.speechSynthesis.cancel(); stopTimer(); }, [stopTimer]);

  return {
    visible, open, close,
    isPlaying, togglePlay, stop,
    speed, changeSpeed,
    pitch, changePitch,
    voices, selectedVoice, changeVoice,
    activeCharIndex,
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
  pitch: PitchPreset;
  changePitch: (p: PitchPreset) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  changeVoice: (v: SpeechSynthesisVoice) => void;
}

export function ReadAlongBar({
  childName, isPlaying, togglePlay, stop, close,
  speed, changeSpeed,
  pitch, changePitch,
  voices, selectedVoice, changeVoice,
}: PlayerBarProps) {
  const [showVoices, setShowVoices] = useState(false);
  const groups = groupByRegion(voices);

  const genderIcon = (v: SpeechSynthesisVoice) => {
    const g = guessGender(v);
    return g === "male" ? "👨" : g === "female" ? "👩" : "🎙️";
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl mx-4 mb-4 flex flex-col gap-2">

        {/* ── Voice picker panel ── */}
        {showVoices && (
          <div className="bg-white border border-border/60 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-foreground text-base">Choose a reading voice</p>
              <button onClick={() => setShowVoices(false)} className="text-muted-foreground hover:text-foreground">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Pitch / gender feel row */}
            <div className="mb-4 p-3 bg-muted/40 rounded-xl">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Voice tone</p>
              <div className="flex gap-2">
                {(["deeper", "normal", "higher"] as PitchPreset[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => changePitch(p)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                      pitch === p
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {p === "deeper" ? "👨 Deeper" : p === "normal" ? "🎙️ Normal" : "🧒 Higher"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                "Deeper" gives any voice a fuller, more masculine sound.
              </p>
            </div>

            {/* Region groups */}
            {groups.length === 0 && (
              <p className="text-sm text-muted-foreground">No voices loaded yet. Tap play to trigger loading.</p>
            )}
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.lang}>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                    {group.region}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.voices.map((v) => {
                      const isSelected = selectedVoice?.name === v.name;
                      return (
                        <button
                          key={v.name}
                          onClick={() => { changeVoice(v); setShowVoices(false); }}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                            isSelected
                              ? "bg-primary text-white border-primary"
                              : "bg-muted/50 text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                          }`}
                        >
                          <span className="text-base leading-none">{genderIcon(v)}</span>
                          {shortName(v)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Main player card ── */}
        <div className="bg-primary rounded-2xl shadow-2xl shadow-primary/30 p-4 flex flex-col gap-3">

          {/* Row 1 — playback */}
          <div className="flex items-center gap-3">
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

            <button onClick={stop} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all shrink-0" aria-label="Stop">
              <Square className="w-5 h-5 text-white fill-white" />
            </button>
            <button onClick={close} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all shrink-0" aria-label="Close player">
              <ChevronDown className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Row 2 — voice + speed */}
          <div className="flex items-center gap-2 pt-1 border-t border-white/20">
            {/* Voice selector */}
            <button
              onClick={() => setShowVoices((v) => !v)}
              className="flex-1 flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2 transition-all text-left min-w-0"
            >
              <span className="text-xl leading-none shrink-0">
                {pitch === "deeper" ? "👨" : pitch === "higher" ? "🧒" : (selectedVoice ? genderIcon(selectedVoice) : "🎙️")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wide leading-none mb-0.5">Voice</p>
                <p className="text-white font-semibold text-sm truncate leading-tight">
                  {selectedVoice ? shortName(selectedVoice) : "Choose a voice"}
                  {pitch !== "normal" ? (pitch === "deeper" ? " · Deeper" : " · Higher") : ""}
                </p>
              </div>
              {showVoices ? <ChevronUp className="w-4 h-4 text-white/60 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/60 shrink-0" />}
            </button>

            {/* Speed */}
            <div className="flex items-center gap-0.5 shrink-0 bg-white/10 rounded-xl px-2 py-2">
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

// ─── Highlighted paragraph ────────────────────────────────────────────────────

export function ReadAlongParagraph({
  tokens, activeCharIndex,
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
                ? "bg-yellow-300 text-gray-900 rounded-sm px-[2px] -mx-[2px] underline underline-offset-2 decoration-2 decoration-yellow-500 transition-colors duration-75 font-bold"
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
