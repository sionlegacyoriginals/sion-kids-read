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

// ─── Sentence splitting ───────────────────────────────────────────────────────

interface Sentence {
  text: string;
  start: number;
  end: number;
}

function splitSentences(text: string): Sentence[] {
  const results: Sentence[] = [];
  // Match runs of text ending in sentence-closing punctuation + optional whitespace
  const re = /[^!?.]+[!?.]+\s*/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const raw = match[0];
    if (raw.trim()) {
      results.push({ text: raw, start: match.index, end: match.index + raw.length });
    }
  }
  // Capture any trailing text that has no sentence-ending punctuation
  const lastEnd = results.length > 0 ? results[results.length - 1].end : 0;
  if (lastEnd < text.length) {
    const trailing = text.slice(lastEnd);
    if (trailing.trim()) results.push({ text: trailing, start: lastEnd, end: text.length });
  }
  // If nothing matched (very short text), treat the whole thing as one sentence
  if (results.length === 0 && text.trim()) {
    results.push({ text, start: 0, end: text.length });
  }
  return results;
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

export function groupByRegion(voices: SpeechSynthesisVoice[]) {
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

type PitchPreset = "normal" | "deeper" | "higher";
const PITCH_MAP: Record<PitchPreset, number> = { normal: 1, deeper: 0.6, higher: 1.4 };

// activeRange: [startCharInclusive, endCharExclusive] of the sentence currently being read
export type ActiveRange = [number, number] | null;

export function useReadAlong(paragraphs: string[]) {
  const [visible, setVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [pitch, setPitch] = useState<PitchPreset>("normal");
  const [activeRange, setActiveRange] = useState<ActiveRange>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const speedRef = useRef(speed);
  speedRef.current = speed;
  const pitchRef = useRef(pitch);
  pitchRef.current = pitch;
  const voiceRef = useRef<SpeechSynthesisVoice | null>(selectedVoice);
  voiceRef.current = selectedVoice;

  // Which sentence is currently active (for restarting from the right place on speed/voice change)
  const currentSentenceIdxRef = useRef(0);
  // Flag to ignore onend fired after a manual cancel()
  const stoppedRef = useRef(true);

  const { fullText, paragraphData } = buildReadAlongData(paragraphs);
  const fullTextRef = useRef(fullText);
  fullTextRef.current = fullText;
  const sentencesRef = useRef<Sentence[]>([]);

  // Rebuild sentences whenever the story changes
  useEffect(() => {
    sentencesRef.current = splitSentences(fullText);
  }, [fullText]);

  // Load voices (Chrome resolves them async after voiceschanged)
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

  /** Build a configured utterance for a sentence */
  const makeUtt = useCallback(
    (text: string, rate: number, pitchPreset: PitchPreset, voice: SpeechSynthesisVoice | null) => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = rate;
      utt.pitch = PITCH_MAP[pitchPreset];
      const liveVoice = voice
        ? window.speechSynthesis.getVoices().find((v) => v.name === voice.name) ?? null
        : null;
      if (liveVoice) { utt.voice = liveVoice; utt.lang = liveVoice.lang; }
      else { utt.lang = "en-US"; }
      return utt;
    },
    []
  );

  /**
   * Queue all sentences from `fromIdx` onward as separate utterances.
   * Each utterance's onstart fires at exactly the right moment → perfect sync.
   */
  const queueFrom = useCallback(
    (fromIdx: number, rate: number, pitchPreset: PitchPreset, voice: SpeechSynthesisVoice | null) => {
      window.speechSynthesis.cancel();
      stoppedRef.current = false;
      const sentences = sentencesRef.current;
      if (fromIdx >= sentences.length) return;

      sentences.slice(fromIdx).forEach((s, relIdx) => {
        const absIdx = fromIdx + relIdx;
        const utt = makeUtt(s.text, rate, pitchPreset, voice);

        utt.onstart = () => {
          if (stoppedRef.current) return;
          currentSentenceIdxRef.current = absIdx;
          setActiveRange([s.start, s.end]);
          if (absIdx === fromIdx) setIsPlaying(true);
        };

        // Only the last sentence needs an onend to clean up
        if (absIdx === sentences.length - 1) {
          utt.onend = () => {
            if (stoppedRef.current) return;
            stoppedRef.current = true;
            setIsPlaying(false);
            setActiveRange(null);
            currentSentenceIdxRef.current = 0;
          };
        }

        utt.onerror = () => { /* ignore — browser fires this on cancel() too */ };
        window.speechSynthesis.speak(utt);
      });
    },
    [makeUtt]
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    } else {
      queueFrom(currentSentenceIdxRef.current, speedRef.current, pitchRef.current, voiceRef.current);
    }
  }, [isPlaying, queueFrom]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setActiveRange(null);
    currentSentenceIdxRef.current = 0;
  }, []);

  const changeSpeed = useCallback(
    (s: Speed) => {
      setSpeed(s);
      if (isPlaying) queueFrom(currentSentenceIdxRef.current, s, pitchRef.current, voiceRef.current);
    },
    [isPlaying, queueFrom]
  );

  const changePitch = useCallback(
    (p: PitchPreset) => {
      setPitch(p);
      if (isPlaying) queueFrom(currentSentenceIdxRef.current, speedRef.current, p, voiceRef.current);
    },
    [isPlaying, queueFrom]
  );

  const changeVoice = useCallback(
    (v: SpeechSynthesisVoice) => {
      setSelectedVoice(v);
      if (isPlaying) queueFrom(currentSentenceIdxRef.current, speedRef.current, pitchRef.current, v);
    },
    [isPlaying, queueFrom]
  );

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => { stop(); setVisible(false); }, [stop]);

  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  return {
    visible, open, close,
    isPlaying, togglePlay, stop,
    speed, changeSpeed,
    pitch, changePitch,
    voices, selectedVoice, changeVoice,
    activeRange,
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
                {isPlaying ? "Each sentence lights up as it's read" : "Tap ▶ to begin"}
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
  tokens,
  activeRange,
}: {
  tokens: ReadAlongToken[];
  activeRange: ActiveRange;
}) {
  return (
    <p>
      {tokens.map((token, i) => {
        if (!token.isWord) return <span key={i}>{token.text}</span>;
        const isActive =
          activeRange !== null &&
          token.start >= activeRange[0] &&
          token.start < activeRange[1];
        return (
          <span
            key={i}
            className={
              isActive
                ? "bg-yellow-300 text-gray-900 rounded px-[2px] -mx-[2px] underline underline-offset-2 decoration-2 decoration-yellow-500 font-bold transition-colors duration-100"
                : "transition-colors duration-100"
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
