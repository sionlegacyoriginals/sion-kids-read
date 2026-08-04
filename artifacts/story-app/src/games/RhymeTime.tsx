import { useState, useCallback } from "react";
import { GameShell, FeedbackBanner, LevelComplete } from "./GameShell";
import { GAMES, recordLevelComplete, loadProgress } from "./registry";
import { RHYME_TIME_LEVELS } from "./data/rhyme-time";

const GAME = GAMES.find(g => g.id === "rhyme-time")!;
const QUESTIONS_PER_LEVEL = 3;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function RhymeTime() {
  const saved = loadProgress(GAME.id);
  const [level, setLevel] = useState(Math.min(saved.currentLevel, GAME.totalLevels));
  const [qIndex, setQIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [levelDone, setLevelDone] = useState(false);
  const [levelStars, setLevelStars] = useState(0);

  const levelData = RHYME_TIME_LEVELS[level - 1];
  const question = levelData?.questions[qIndex];
  const shuffled = question ? shuffle(question.choices) : [];

  function handleChoice(choice: string) {
    if (feedback) return;
    const ok = choice === question.choices[0];
    const newCorrect = ok ? correct + 1 : correct;
    setFeedback({ ok, msg: ok ? "Great rhyme! 🎵" : `"${question.choices[0]}" rhymes with "${question.word}"` });

    setTimeout(() => {
      setFeedback(null);
      if (qIndex + 1 >= QUESTIONS_PER_LEVEL) {
        const stars = newCorrect === QUESTIONS_PER_LEVEL ? 3 : newCorrect >= 2 ? 2 : 1;
        setLevelStars(stars);
        recordLevelComplete(GAME.id, level, stars);
        setLevelDone(true);
      } else {
        setQIndex(q => q + 1);
        if (ok) setCorrect(newCorrect);
      }
    }, ok ? 900 : 1500);

    if (ok) setCorrect(newCorrect);
  }

  function nextLevel() { setLevel(l => Math.min(l + 1, GAME.totalLevels)); setQIndex(0); setCorrect(0); setLevelDone(false); }
  function retryLevel() { setQIndex(0); setCorrect(0); setLevelDone(false); }

  if (!question) return null;

  return (
    <>
      <GameShell game={GAME} level={level} totalQuestions={QUESTIONS_PER_LEVEL} correctCount={correct}
        onLevelComplete={() => {}} onNextLevel={nextLevel} onRetryLevel={retryLevel}>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide text-center mb-6">
          Question {qIndex + 1} of {QUESTIONS_PER_LEVEL}
        </p>
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          {/* Target word */}
          <div className="bg-card border border-border rounded-3xl p-8 w-full text-center shadow-sm">
            <p className="text-muted-foreground text-sm mb-3">What rhymes with…</p>
            <p className="text-5xl font-serif font-bold text-primary">{question.word}</p>
          </div>
          {/* Choices */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {shuffled.map((choice, i) => (
              <button key={`${qIndex}-${i}`} onClick={() => handleChoice(choice)}
                disabled={!!feedback}
                className="py-5 bg-card border-2 border-border rounded-2xl text-2xl font-bold text-foreground hover:border-primary hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-60">
                {choice}
              </button>
            ))}
          </div>
        </div>
      </GameShell>
      {feedback && <FeedbackBanner correct={feedback.ok} message={feedback.msg} />}
      {levelDone && <LevelComplete level={level} stars={levelStars} totalLevels={GAME.totalLevels} onNext={nextLevel} onRetry={retryLevel} />}
    </>
  );
}
