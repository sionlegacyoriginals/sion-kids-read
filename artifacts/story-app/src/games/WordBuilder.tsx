import { useState, useEffect } from "react";
import { GameShell, FeedbackBanner, LevelComplete } from "./GameShell";
import { GAMES, recordLevelComplete, loadProgress } from "./registry";
import { WORD_BUILDER_LEVELS } from "./data/word-builder";
import { RotateCcw } from "lucide-react";

const GAME = GAMES.find(g => g.id === "word-builder")!;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle but guarantee it's not already in correct order
function safeShuffleLetters(word: string): string[] {
  const letters = word.split("");
  let attempt = shuffle(letters);
  // Re-shuffle if accidentally in order
  for (let i = 0; i < 10 && attempt.join("") === word; i++) {
    attempt = shuffle(letters);
  }
  return attempt;
}

type TileState = { letter: string; id: number; used: boolean };

export default function WordBuilder() {
  const saved = loadProgress(GAME.id);
  const [level, setLevel] = useState(Math.min(saved.currentLevel, GAME.totalLevels));
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [answer, setAnswer] = useState<number[]>([]); // ids of selected tiles in order
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [levelDone, setLevelDone] = useState(false);
  const [levelStars, setLevelStars] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const levelData = WORD_BUILDER_LEVELS[level - 1];

  function initLevel(l: number) {
    const data = WORD_BUILDER_LEVELS[l - 1];
    const shuffled = safeShuffleLetters(data.word);
    setTiles(shuffled.map((letter, i) => ({ letter, id: i, used: false })));
    setAnswer([]);
    setFeedback(null);
    setAttempts(0);
    setLevelDone(false);
  }

  useEffect(() => { initLevel(level); }, [level]);

  function tapTile(tile: TileState) {
    if (tile.used || feedback) return;
    setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, used: true } : t));
    const newAnswer = [...answer, tile.id];
    setAnswer(newAnswer);

    // Check when all letters are placed
    if (newAnswer.length === levelData.word.length) {
      const typed = newAnswer.map(id => tiles.find(t => t.id === id)!.letter).join("");
      const ok = typed === levelData.word;
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setFeedback({ ok, msg: ok ? `✨ You spelled "${levelData.word}"!` : `Not quite — that spells "${typed}"` });

      if (ok) {
        const stars = newAttempts === 1 ? 3 : newAttempts === 2 ? 2 : 1;
        setTimeout(() => {
          setLevelStars(stars);
          recordLevelComplete(GAME.id, level, stars);
          setLevelDone(true);
          setFeedback(null);
        }, 1000);
      } else {
        // Reset after wrong
        setTimeout(() => {
          setFeedback(null);
          setTiles(prev => prev.map(t => ({ ...t, used: false })));
          setAnswer([]);
        }, 1500);
      }
    }
  }

  function removeLast() {
    if (!answer.length || feedback) return;
    const lastId = answer[answer.length - 1];
    setTiles(prev => prev.map(t => t.id === lastId ? { ...t, used: false } : t));
    setAnswer(prev => prev.slice(0, -1));
  }

  function nextLevel() {
    const next = Math.min(level + 1, GAME.totalLevels);
    setLevel(next);
  }

  function retryLevel() {
    initLevel(level);
  }

  const typedSoFar = answer.map(id => tiles.find(t => t.id === id)!?.letter ?? "").join("");
  const availableTiles = tiles.filter(t => !t.used);

  return (
    <>
      <GameShell
        game={GAME}
        level={level}
        totalQuestions={1}
        correctCount={levelDone ? 1 : 0}
        onLevelComplete={() => {}}
        onNextLevel={nextLevel}
        onRetryLevel={retryLevel}
      >
        <div className="flex-1 flex flex-col items-center justify-between gap-6">
          {/* Hint card */}
          <div className="w-full bg-card border border-border rounded-3xl p-6 text-center shadow-sm">
            <div className="text-5xl mb-3">{levelData.emoji}</div>
            <p className="text-muted-foreground text-sm">{levelData.hint}</p>
            <p className="text-xs text-muted-foreground mt-2 font-semibold">
              {levelData.word.length} letters
            </p>
          </div>

          {/* Answer display — blank boxes */}
          <div className="flex gap-2 justify-center flex-wrap">
            {levelData.word.split("").map((_, i) => {
              const letter = typedSoFar[i];
              return (
                <div
                  key={i}
                  className={`w-12 h-14 flex items-center justify-center rounded-xl border-2 text-2xl font-bold uppercase transition-all ${
                    letter
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {letter || "_"}
                </div>
              );
            })}
          </div>

          {/* Letter tiles */}
          <div className="flex gap-3 flex-wrap justify-center">
            {tiles.map(tile => (
              <button
                key={tile.id}
                onClick={() => tapTile(tile)}
                disabled={tile.used || !!feedback}
                className={`w-14 h-14 rounded-2xl border-2 text-2xl font-bold uppercase transition-all ${
                  tile.used
                    ? "border-border/30 bg-muted/20 text-muted-foreground/30"
                    : "border-primary/40 bg-card hover:bg-primary/10 hover:border-primary active:scale-95 text-foreground shadow-sm"
                }`}
              >
                {tile.letter}
              </button>
            ))}
          </div>

          {/* Backspace + reset */}
          <div className="flex gap-3">
            <button
              onClick={removeLast}
              disabled={!answer.length || !!feedback}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all disabled:opacity-40"
            >
              ← Remove
            </button>
            <button
              onClick={retryLevel}
              disabled={!!feedback}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>
      </GameShell>

      {feedback && <FeedbackBanner correct={feedback.ok} message={feedback.msg} />}

      {levelDone && (
        <LevelComplete
          level={level}
          stars={levelStars}
          totalLevels={GAME.totalLevels}
          onNext={nextLevel}
          onRetry={retryLevel}
        />
      )}
    </>
  );
}
