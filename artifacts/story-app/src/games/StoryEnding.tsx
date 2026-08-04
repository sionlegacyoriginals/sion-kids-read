import { useState, useMemo } from "react";
import { GameShell, LevelComplete } from "./GameShell";
import { GAMES, recordLevelComplete, loadProgress } from "./registry";
import { STORY_ENDING_LEVELS } from "./data/story-ending";

const GAME = GAMES.find(g => g.id === "story-ending")!;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function StoryEnding() {
  const saved = loadProgress(GAME.id);
  const [level, setLevel] = useState(Math.min(saved.currentLevel, GAME.totalLevels));
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [levelDone, setLevelDone] = useState(false);

  const levelData = STORY_ENDING_LEVELS[level - 1];
  const shuffledChoices = useMemo(() => shuffle([...levelData.choices]), [level]);

  function handleChoice(choice: string) {
    if (revealed) return;
    setSelected(choice);
    setRevealed(true);
    const ok = choice === levelData.choices[0];
    recordLevelComplete(GAME.id, level, ok ? 3 : 2);
    setTimeout(() => setLevelDone(true), 2200);
  }

  function nextLevel() {
    const next = Math.min(level + 1, GAME.totalLevels);
    setLevel(next);
    setSelected(null);
    setRevealed(false);
    setLevelDone(false);
  }

  function retryLevel() {
    setSelected(null);
    setRevealed(false);
    setLevelDone(false);
  }

  return (
    <>
      <GameShell game={GAME} level={level} totalQuestions={1} correctCount={levelDone ? 1 : 0}
        onLevelComplete={() => {}} onNextLevel={nextLevel} onRetryLevel={retryLevel}>
        <div className="flex-1 flex flex-col gap-5">
          {/* Story */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-3">
            <p className="text-xs font-bold text-primary uppercase tracking-wide">{levelData.title}</p>
            <p className="text-foreground text-sm leading-relaxed">{levelData.story}</p>
            <p className="font-bold text-foreground text-sm mt-2">🤔 {levelData.prompt}</p>
          </div>

          {/* Choices */}
          <div className="flex flex-col gap-3">
            {shuffledChoices.map((choice, i) => {
              const isSelected = selected === choice;
              const isCorrect = choice === levelData.choices[0];
              let cls = "w-full text-left px-5 py-4 rounded-2xl border-2 text-sm leading-snug transition-all ";
              if (!revealed) {
                cls += "border-border bg-card hover:border-primary hover:bg-primary/5 active:scale-[0.98] font-medium";
              } else if (isCorrect) {
                cls += "border-green-500 bg-green-50 text-green-800 font-semibold";
              } else if (isSelected) {
                cls += "border-red-400 bg-red-50 text-red-800 font-medium";
              } else {
                cls += "border-border bg-card opacity-40 font-medium";
              }
              return (
                <button key={i} onClick={() => handleChoice(choice)} disabled={revealed} className={cls}>
                  {revealed && isCorrect && "✅ "}
                  {revealed && isSelected && !isCorrect && "❌ "}
                  {choice}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {revealed && (
            <div className={`rounded-2xl p-4 text-sm ${selected === levelData.choices[0] ? "bg-green-50 border border-green-200 text-green-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
              💡 {levelData.explanation}
            </div>
          )}
        </div>
      </GameShell>

      {levelDone && (
        <LevelComplete level={level} stars={selected === levelData.choices[0] ? 3 : 2}
          totalLevels={GAME.totalLevels} onNext={nextLevel} onRetry={retryLevel} />
      )}
    </>
  );
}
