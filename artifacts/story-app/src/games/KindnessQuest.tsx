import { useState, useMemo } from "react";
import { GameShell, FeedbackBanner, LevelComplete } from "./GameShell";
import { GAMES, recordLevelComplete, loadProgress } from "./registry";
import { KINDNESS_QUEST_LEVELS } from "./data/kindness-quest";

const GAME = GAMES.find(g => g.id === "kindness-quest")!;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function KindnessQuest() {
  const saved = loadProgress(GAME.id);
  const [level, setLevel] = useState(Math.min(saved.currentLevel, GAME.totalLevels));
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [levelDone, setLevelDone] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const levelData = KINDNESS_QUEST_LEVELS[level - 1];
  const shuffledChoices = useMemo(() => shuffle(levelData.choices), [level]);

  function handleChoice(choice: string) {
    if (feedback) return;
    const ok = choice === levelData.choices[0];
    setSelected(choice);
    setFeedback({ ok, msg: levelData.explanation });

    setTimeout(() => {
      setFeedback(null);
      recordLevelComplete(GAME.id, level, ok ? 3 : 2);
      setLevelDone(true);
    }, ok ? 2000 : 2500);
  }

  function nextLevel() {
    const next = Math.min(level + 1, GAME.totalLevels);
    setLevel(next);
    setSelected(null);
    setFeedback(null);
    setLevelDone(false);
  }

  function retryLevel() {
    setSelected(null);
    setFeedback(null);
    setLevelDone(false);
  }

  return (
    <>
      <GameShell game={GAME} level={level} totalQuestions={1} correctCount={levelDone ? 1 : 0}
        onLevelComplete={() => {}} onNextLevel={nextLevel} onRetryLevel={retryLevel}>
        <div className="flex-1 flex flex-col gap-6">
          {/* Scenario */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="text-4xl mb-3 text-center">{levelData.emoji}</div>
            <p className="text-foreground font-medium leading-relaxed text-center text-sm">
              {levelData.scenario}
            </p>
          </div>

          {/* Choices */}
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide text-center">
            What would you do?
          </p>
          <div className="flex flex-col gap-3">
            {shuffledChoices.map((choice, i) => {
              const isSelected = selected === choice;
              const isCorrect = choice === levelData.choices[0];
              let cls = "w-full text-left px-5 py-4 rounded-2xl border-2 text-sm font-medium transition-all ";
              if (!feedback) {
                cls += "border-border bg-card hover:border-primary hover:bg-primary/5 active:scale-[0.98]";
              } else if (isSelected && isCorrect) {
                cls += "border-green-500 bg-green-50 text-green-800";
              } else if (isSelected && !isCorrect) {
                cls += "border-red-400 bg-red-50 text-red-800";
              } else if (isCorrect) {
                cls += "border-green-400 bg-green-50 text-green-800";
              } else {
                cls += "border-border bg-card opacity-50";
              }
              return (
                <button key={i} onClick={() => handleChoice(choice)} disabled={!!feedback} className={cls}>
                  {isSelected && feedback && (isCorrect ? "✅ " : "❌ ")}{choice}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {feedback && (
            <div className={`rounded-2xl p-4 text-sm font-medium ${feedback.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
              💡 {feedback.msg}
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
