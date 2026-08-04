import { useState, useEffect } from "react";
import { GameShell, LevelComplete } from "./GameShell";
import { GAMES, recordLevelComplete, loadProgress } from "./registry";
import { WORD_FAMILIES_LEVELS } from "./data/word-families";

const GAME = GAMES.find(g => g.id === "word-families")!;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type WordTile = { word: string; family: string; id: number; placed: string | null; wrong: boolean };

export default function WordFamilies() {
  const saved = loadProgress(GAME.id);
  const [level, setLevel] = useState(Math.min(saved.currentLevel, GAME.totalLevels));
  const [tiles, setTiles] = useState<WordTile[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [levelDone, setLevelDone] = useState(false);
  const [levelStars, setLevelStars] = useState(0);

  const levelData = WORD_FAMILIES_LEVELS[level - 1];

  function initLevel(l: number) {
    const data = WORD_FAMILIES_LEVELS[l - 1];
    const allWords: WordTile[] = shuffle([
      ...data.families[0].words.map((w, i) => ({ word: w, family: data.families[0].ending, id: i, placed: null, wrong: false })),
      ...data.families[1].words.map((w, i) => ({ word: w, family: data.families[1].ending, id: i + 100, placed: null, wrong: false })),
    ]);
    setTiles(allWords);
    setSelected(null);
    setMistakes(0);
    setLevelDone(false);
  }

  useEffect(() => { initLevel(level); }, [level]);

  function selectTile(id: number) {
    if (tiles.find(t => t.id === id)?.placed) return;
    setSelected(id === selected ? null : id);
  }

  function dropInBucket(familyEnding: string) {
    if (selected === null) return;
    const tile = tiles.find(t => t.id === selected);
    if (!tile || tile.placed) return;

    const ok = tile.family === familyEnding;
    if (ok) {
      const updated = tiles.map(t => t.id === selected ? { ...t, placed: familyEnding } : t);
      setTiles(updated);
      setSelected(null);
      if (updated.every(t => t.placed)) {
        const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
        setLevelStars(stars);
        recordLevelComplete(GAME.id, level, stars);
        setTimeout(() => setLevelDone(true), 400);
      }
    } else {
      setMistakes(m => m + 1);
      setTiles(prev => prev.map(t => t.id === selected ? { ...t, wrong: true } : t));
      setTimeout(() => {
        setTiles(prev => prev.map(t => t.id === selected ? { ...t, wrong: false } : t));
        setSelected(null);
      }, 600);
    }
  }

  function nextLevel() { setLevel(l => Math.min(l + 1, GAME.totalLevels)); }
  function retryLevel() { initLevel(level); }

  const placed = tiles.filter(t => t.placed).length;

  return (
    <>
      <GameShell game={GAME} level={level} totalQuestions={tiles.length} correctCount={placed}
        onLevelComplete={() => {}} onNextLevel={nextLevel} onRetryLevel={retryLevel}>
        <div className="flex-1 flex flex-col gap-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide text-center">
            {selected !== null ? "Now tap a bucket to sort it!" : "Tap a word, then tap its word family bucket"}
          </p>

          {/* Word tiles */}
          <div className="flex flex-wrap gap-2 justify-center min-h-[56px]">
            {tiles.filter(t => !t.placed).map(tile => (
              <button
                key={tile.id}
                onClick={() => selectTile(tile.id)}
                className={`px-4 py-2.5 rounded-2xl border-2 text-sm font-bold transition-all ${
                  tile.wrong
                    ? "border-red-400 bg-red-50 text-red-700"
                    : selected === tile.id
                    ? "border-primary bg-primary/10 text-primary scale-105"
                    : "border-border bg-card hover:border-primary hover:bg-primary/5 active:scale-95"
                }`}
              >
                {tile.word}
              </button>
            ))}
            {tiles.every(t => t.placed) && (
              <p className="text-green-600 font-bold text-sm">All sorted! 🎉</p>
            )}
          </div>

          {/* Family buckets */}
          <div className="grid grid-cols-2 gap-4 mt-2">
            {levelData.families.map(family => {
              const placedHere = tiles.filter(t => t.placed === family.ending);
              return (
                <div key={family.ending} className="flex flex-col gap-2">
                  <button
                    onClick={() => dropInBucket(family.ending)}
                    disabled={selected === null}
                    className={`w-full px-4 py-3 rounded-2xl border-2 text-center transition-all ${
                      selected !== null
                        ? "border-primary bg-primary/5 hover:bg-primary/10 cursor-pointer"
                        : "border-border bg-muted/20 cursor-default"
                    }`}
                  >
                    <div className="text-2xl mb-1">{family.emoji}</div>
                    <div className="font-bold text-sm text-foreground">{family.ending}</div>
                    {selected !== null && (
                      <div className="text-xs text-primary mt-0.5 font-semibold">↓ Drop here</div>
                    )}
                  </button>
                  {/* Placed words */}
                  <div className="flex flex-wrap gap-1.5 min-h-[32px] px-1">
                    {placedHere.map(t => (
                      <span key={t.id} className="px-2.5 py-1 bg-green-100 text-green-800 border border-green-300 rounded-xl text-xs font-bold">
                        {t.word}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GameShell>

      {levelDone && <LevelComplete level={level} stars={levelStars} totalLevels={GAME.totalLevels} onNext={nextLevel} onRetry={retryLevel} />}
    </>
  );
}
