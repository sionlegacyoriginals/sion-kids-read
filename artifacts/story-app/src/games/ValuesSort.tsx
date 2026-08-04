import { useState, useEffect } from "react";
import { GameShell, LevelComplete } from "./GameShell";
import { GAMES, recordLevelComplete, loadProgress } from "./registry";
import { VALUES_SORT_LEVELS } from "./data/values-sort";

const GAME = GAMES.find(g => g.id === "values-sort")!;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ValuesSort() {
  const saved = loadProgress(GAME.id);
  const [level, setLevel] = useState(Math.min(saved.currentLevel, GAME.totalLevels));
  const [actions, setActions] = useState<Array<{ text: string; bucket: string; id: number; placed: boolean; wrong: boolean }>>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [levelDone, setLevelDone] = useState(false);
  const [levelStars, setLevelStars] = useState(0);
  const [flash, setFlash] = useState<{ bucket: string; ok: boolean } | null>(null);

  const levelData = VALUES_SORT_LEVELS[level - 1];

  function initLevel(l: number) {
    const data = VALUES_SORT_LEVELS[l - 1];
    setActions(shuffle(data.actions).map((a, i) => ({ ...a, id: i, placed: false, wrong: false })));
    setCurrentIdx(0);
    setMistakes(0);
    setLevelDone(false);
    setFlash(null);
  }

  useEffect(() => { initLevel(level); }, [level]);

  const currentAction = actions[currentIdx];

  function handleBucket(bucketName: string) {
    if (!currentAction || flash) return;
    const ok = currentAction.bucket === bucketName;
    setFlash({ bucket: bucketName, ok });

    setTimeout(() => {
      setFlash(null);
      if (ok) {
        const updated = actions.map((a, i) => i === currentIdx ? { ...a, placed: true } : a);
        setActions(updated);
        const nextIdx = currentIdx + 1;
        if (nextIdx >= actions.length) {
          const stars = mistakes === 0 ? 3 : mistakes <= 1 ? 2 : 1;
          setLevelStars(stars);
          recordLevelComplete(GAME.id, level, stars);
          setLevelDone(true);
        } else {
          setCurrentIdx(nextIdx);
        }
      } else {
        setMistakes(m => m + 1);
      }
    }, 700);
  }

  function nextLevel() { const next = Math.min(level + 1, GAME.totalLevels); setLevel(next); }
  function retryLevel() { initLevel(level); }

  const placed = actions.filter(a => a.placed).length;

  return (
    <>
      <GameShell game={GAME} level={level} totalQuestions={actions.length} correctCount={placed}
        onLevelComplete={() => {}} onNextLevel={nextLevel} onRetryLevel={retryLevel}>
        <div className="flex-1 flex flex-col gap-6">
          {/* Progress */}
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide text-center">
            Action {currentIdx + 1} of {actions.length}
          </p>

          {/* Current action card */}
          {currentAction && (
            <div className="bg-card border-2 border-border rounded-3xl p-6 text-center shadow-sm">
              <p className="font-medium text-foreground text-sm leading-relaxed">{currentAction.text}</p>
              <p className="text-xs text-muted-foreground mt-2">Which value is this?</p>
            </div>
          )}

          {/* Bucket buttons */}
          <div className="flex flex-col gap-3">
            {levelData.buckets.map(bucket => {
              const isFlash = flash?.bucket === bucket.name;
              return (
                <button
                  key={bucket.name}
                  onClick={() => handleBucket(bucket.name)}
                  disabled={!!flash}
                  className={`w-full px-5 py-4 rounded-2xl border-2 text-left transition-all ${
                    isFlash
                      ? flash.ok
                        ? "border-green-500 bg-green-50"
                        : "border-red-400 bg-red-50"
                      : "border-border bg-card hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{bucket.emoji}</span>
                    <div>
                      <p className="font-bold text-foreground text-sm">{bucket.name}</p>
                      <p className="text-xs text-muted-foreground">{bucket.description}</p>
                    </div>
                    {isFlash && (
                      <span className="ml-auto text-lg">{flash.ok ? "✅" : "❌"}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Placed so far */}
          {placed > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              ✅ {placed} sorted correctly
            </p>
          )}
        </div>
      </GameShell>

      {levelDone && <LevelComplete level={level} stars={levelStars} totalLevels={GAME.totalLevels} onNext={nextLevel} onRetry={retryLevel} />}
    </>
  );
}
