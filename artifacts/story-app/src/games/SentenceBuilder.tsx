import { useState, useEffect } from "react";
import { GameShell, FeedbackBanner, LevelComplete } from "./GameShell";
import { GAMES, recordLevelComplete, loadProgress } from "./registry";
import { SENTENCE_BUILDER_LEVELS } from "./data/sentence-builder";
import { RotateCcw } from "lucide-react";

const GAME = GAMES.find(g => g.id === "sentence-builder")!;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  // Re-shuffle if accidentally correct
  let tries = 0;
  while (a.join(" ") === arr.join(" ") && tries++ < 10) shuffle(arr);
  return a;
}

export default function SentenceBuilder() {
  const saved = loadProgress(GAME.id);
  const [level, setLevel] = useState(Math.min(saved.currentLevel, GAME.totalLevels));
  const [tilePool, setTilePool] = useState<Array<{ word: string; id: number; used: boolean }>>([]);
  const [answer, setAnswer] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [levelDone, setLevelDone] = useState(false);
  const [levelStars, setLevelStars] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const levelData = SENTENCE_BUILDER_LEVELS[level - 1];

  function initLevel(l: number) {
    const data = SENTENCE_BUILDER_LEVELS[l - 1];
    const shuffled = shuffle(data.words);
    setTilePool(shuffled.map((word, i) => ({ word, id: i, used: false })));
    setAnswer([]);
    setFeedback(null);
    setAttempts(0);
    setLevelDone(false);
  }

  useEffect(() => { initLevel(level); }, [level]);

  function tapWord(tile: { word: string; id: number; used: boolean }) {
    if (tile.used || feedback) return;
    setTilePool(prev => prev.map(t => t.id === tile.id ? { ...t, used: true } : t));
    const newAnswer = [...answer, tile.id];
    setAnswer(newAnswer);

    if (newAnswer.length === levelData.words.length) {
      const typed = newAnswer.map(id => tilePool.find(t => t.id === id)!.word).join(" ");
      const correct = typed === levelData.words.join(" ");
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setFeedback({ ok: correct, msg: correct ? "Perfect sentence! 📖" : `The right order is: "${levelData.words.join(" ")}"` });

      if (correct) {
        const stars = newAttempts === 1 ? 3 : newAttempts === 2 ? 2 : 1;
        setTimeout(() => {
          setLevelStars(stars);
          recordLevelComplete(GAME.id, level, stars);
          setLevelDone(true);
          setFeedback(null);
        }, 1200);
      } else {
        setTimeout(() => {
          setFeedback(null);
          setTilePool(prev => prev.map(t => ({ ...t, used: false })));
          setAnswer([]);
        }, 2000);
      }
    }
  }

  function removeLast() {
    if (!answer.length || feedback) return;
    const lastId = answer[answer.length - 1];
    setTilePool(prev => prev.map(t => t.id === lastId ? { ...t, used: false } : t));
    setAnswer(prev => prev.slice(0, -1));
  }

  function nextLevel() { const next = Math.min(level + 1, GAME.totalLevels); setLevel(next); }
  function retryLevel() { initLevel(level); }

  const builtSentence = answer.map(id => tilePool.find(t => t.id === id)?.word ?? "").join(" ");

  return (
    <>
      <GameShell game={GAME} level={level} totalQuestions={1} correctCount={levelDone ? 1 : 0}
        onLevelComplete={() => {}} onNextLevel={nextLevel} onRetryLevel={retryLevel}>
        <div className="flex-1 flex flex-col gap-6">
          {/* Emoji hint */}
          <div className="text-center text-5xl">{levelData.emoji}</div>

          {/* Answer zone */}
          <div className="min-h-[72px] bg-muted/30 border-2 border-dashed border-border rounded-2xl p-4 flex flex-wrap gap-2 items-center">
            {answer.length === 0
              ? <span className="text-muted-foreground text-sm w-full text-center">Tap words below to build the sentence</span>
              : answer.map((id, i) => {
                  const tile = tilePool.find(t => t.id === id);
                  return tile ? (
                    <span key={i} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/30 rounded-xl text-sm font-bold">
                      {tile.word}
                    </span>
                  ) : null;
                })}
          </div>

          {/* Word tiles */}
          <div className="flex flex-wrap gap-2 justify-center">
            {tilePool.map(tile => (
              <button
                key={tile.id}
                onClick={() => tapWord(tile)}
                disabled={tile.used || !!feedback}
                className={`px-4 py-2.5 rounded-2xl border-2 text-sm font-bold transition-all ${
                  tile.used
                    ? "border-border/20 bg-muted/10 text-muted-foreground/30"
                    : "border-border bg-card hover:border-primary hover:bg-primary/5 active:scale-95 shadow-sm"
                }`}
              >
                {tile.word}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-3 justify-center">
            <button onClick={removeLast} disabled={!answer.length || !!feedback}
              className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-all disabled:opacity-40">
              ← Remove
            </button>
            <button onClick={retryLevel} disabled={!!feedback}
              className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-all disabled:opacity-40">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>
      </GameShell>

      {feedback && <FeedbackBanner correct={feedback.ok} message={feedback.msg} />}
      {levelDone && <LevelComplete level={level} stars={levelStars} totalLevels={GAME.totalLevels} onNext={nextLevel} onRetry={retryLevel} />}
    </>
  );
}
