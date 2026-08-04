import { useState, useEffect } from "react";
import { GameShell, LevelComplete } from "./GameShell";
import { GAMES, recordLevelComplete, loadProgress } from "./registry";
import { ALPHABET_MATCH_LEVELS } from "./data/alphabet-match";

const GAME = GAMES.find(g => g.id === "alphabet-match")!;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type MatchState = {
  upper: string;
  lower: string;
  matched: boolean;
  shake: boolean;
};

export default function AlphabetMatch() {
  const saved = loadProgress(GAME.id);
  const [level, setLevel] = useState(Math.min(saved.currentLevel, GAME.totalLevels));
  const [selectedUpper, setSelectedUpper] = useState<string | null>(null);
  const [selectedLower, setSelectedLower] = useState<string | null>(null);
  const [pairs, setPairs] = useState<MatchState[]>([]);
  const [shuffledLowers, setShuffledLowers] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [levelDone, setLevelDone] = useState(false);
  const [levelStars, setLevelStars] = useState(0);
  const [flashWrong, setFlashWrong] = useState(false);

  function initLevel(l: number) {
    const data = ALPHABET_MATCH_LEVELS[l - 1];
    setPairs(data.pairs.map(p => ({ ...p, matched: false, shake: false })));
    setShuffledLowers(shuffle(data.pairs.map(p => p.lower)));
    setSelectedUpper(null);
    setSelectedLower(null);
    setMistakes(0);
    setLevelDone(false);
  }

  useEffect(() => { initLevel(level); }, [level]);

  function handleUpper(letter: string) {
    if (pairs.find(p => p.upper === letter)?.matched) return;
    setSelectedUpper(letter === selectedUpper ? null : letter);
    setSelectedLower(null);
  }

  function handleLower(letter: string) {
    const pair = pairs.find(p => p.lower === letter);
    if (!pair || pair.matched) return;
    if (!selectedUpper) { setSelectedLower(letter); return; }

    const correctPair = pairs.find(p => p.upper === selectedUpper);
    if (correctPair?.lower === letter) {
      // Match!
      const newPairs = pairs.map(p => p.upper === selectedUpper ? { ...p, matched: true } : p);
      setPairs(newPairs);
      setSelectedUpper(null);
      setSelectedLower(null);
      // Check level complete
      if (newPairs.every(p => p.matched)) {
        const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
        setLevelStars(stars);
        recordLevelComplete(GAME.id, level, stars);
        setTimeout(() => setLevelDone(true), 400);
      }
    } else {
      // Wrong
      setMistakes(m => m + 1);
      setFlashWrong(true);
      setTimeout(() => { setFlashWrong(false); setSelectedUpper(null); setSelectedLower(null); }, 600);
    }
  }

  function nextLevel() { const next = Math.min(level + 1, GAME.totalLevels); setLevel(next); }
  function retryLevel() { initLevel(level); }

  const matched = pairs.filter(p => p.matched).length;

  return (
    <>
      <GameShell game={GAME} level={level} totalQuestions={pairs.length} correctCount={matched}
        onLevelComplete={() => {}} onNextLevel={nextLevel} onRetryLevel={retryLevel}>
        <div className="flex-1 flex flex-col items-center gap-8">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">Match each uppercase letter to its lowercase partner</p>
            <p className="text-xs text-muted-foreground mt-1">{matched} / {pairs.length} matched</p>
          </div>

          {/* Uppercase row */}
          <div className="flex gap-3 justify-center flex-wrap">
            {pairs.map(p => (
              <button
                key={p.upper}
                onClick={() => handleUpper(p.upper)}
                disabled={p.matched}
                className={`w-16 h-16 rounded-2xl border-2 text-3xl font-bold transition-all ${
                  p.matched
                    ? "border-green-400 bg-green-50 text-green-600 opacity-60"
                    : selectedUpper === p.upper
                    ? "border-primary bg-primary/10 text-primary scale-105"
                    : flashWrong && selectedUpper === p.upper
                    ? "border-red-400 bg-red-50 animate-shake"
                    : "border-border bg-card hover:border-primary hover:bg-primary/5"
                }`}
              >
                {p.matched ? "✓" : p.upper}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-full border-t border-dashed border-border" />

          {/* Lowercase row */}
          <div className="flex gap-3 justify-center flex-wrap">
            {shuffledLowers.map(lower => {
              const pair = pairs.find(p => p.lower === lower);
              return (
                <button
                  key={lower}
                  onClick={() => handleLower(lower)}
                  disabled={pair?.matched}
                  className={`w-16 h-16 rounded-2xl border-2 text-3xl font-bold transition-all ${
                    pair?.matched
                      ? "border-green-400 bg-green-50 text-green-600 opacity-60"
                      : flashWrong && selectedLower === lower
                      ? "border-red-400 bg-red-50"
                      : "border-border bg-card hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  {pair?.matched ? "✓" : lower}
                </button>
              );
            })}
          </div>

          {flashWrong && (
            <p className="text-red-500 text-sm font-semibold animate-pulse">Try again!</p>
          )}
        </div>
      </GameShell>

      {levelDone && <LevelComplete level={level} stars={levelStars} totalLevels={GAME.totalLevels} onNext={nextLevel} onRetry={retryLevel} />}
    </>
  );
}
