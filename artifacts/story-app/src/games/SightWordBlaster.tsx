import { useState, useEffect, useCallback } from "react";
import { GameShell, FeedbackBanner, LevelComplete } from "./GameShell";
import { GAMES, recordLevelComplete, loadProgress } from "./registry";
import { SIGHT_WORD_LEVELS } from "./data/sight-word-blaster";

const GAME = GAMES.find(g => g.id === "sight-word-blaster")!;
const QUESTIONS_PER_LEVEL = 5;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SightWordBlaster() {
  const saved = loadProgress(GAME.id);
  const [level, setLevel] = useState(Math.min(saved.currentLevel, GAME.totalLevels));
  const [qIndex, setQIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [levelDone, setLevelDone] = useState(false);
  const [levelStars, setLevelStars] = useState(0);

  const levelData = SIGHT_WORD_LEVELS[level - 1];
  const question = levelData?.questions[qIndex];

  const reshuffleChoices = useCallback(() => {
    if (!question) return;
    setShuffledChoices(shuffle(question.choices));
  }, [question]);

  useEffect(() => { reshuffleChoices(); }, [reshuffleChoices]);

  function handleChoice(choice: string) {
    if (feedback) return;
    const ok = choice === question.target;
    const newCorrect = ok ? correct + 1 : correct;
    setFeedback({ ok, msg: ok ? "Correct! 🎉" : `It was "${question.target}"` });

    setTimeout(() => {
      setFeedback(null);
      if (qIndex + 1 >= QUESTIONS_PER_LEVEL) {
        // Level complete
        const stars = newCorrect === QUESTIONS_PER_LEVEL ? 3 : newCorrect >= 3 ? 2 : 1;
        setLevelStars(stars);
        recordLevelComplete(GAME.id, level, stars);
        setLevelDone(true);
      } else {
        setQIndex(q => q + 1);
        if (ok) setCorrect(newCorrect);
      }
    }, ok ? 900 : 1400);

    if (ok) setCorrect(newCorrect);
  }

  function nextLevel() {
    const next = Math.min(level + 1, GAME.totalLevels);
    setLevel(next);
    setQIndex(0);
    setCorrect(0);
    setLevelDone(false);
  }

  function retryLevel() {
    setQIndex(0);
    setCorrect(0);
    setLevelDone(false);
  }

  if (!question) return null;

  return (
    <>
      <GameShell
        game={GAME}
        level={level}
        totalQuestions={QUESTIONS_PER_LEVEL}
        correctCount={correct}
        onLevelComplete={() => {}}
        onNextLevel={nextLevel}
        onRetryLevel={retryLevel}
      >
        {/* Question counter */}
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide text-center mb-6">
          Question {qIndex + 1} of {QUESTIONS_PER_LEVEL}
        </p>

        {/* Target sentence */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="bg-card border border-border rounded-3xl p-8 w-full text-center shadow-sm">
            <p className="text-muted-foreground text-sm mb-3">Find the word:</p>
            <p className="text-5xl font-serif font-bold text-primary tracking-wide">
              {question.target}
            </p>
            <p className="text-sm text-muted-foreground mt-4 italic">{question.sentence}</p>
          </div>

          {/* Choice cards */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {shuffledChoices.map((choice, i) => (
              <button
                key={`${qIndex}-${i}`}
                onClick={() => handleChoice(choice)}
                disabled={!!feedback}
                className="py-5 px-4 bg-card border-2 border-border rounded-2xl text-2xl font-bold text-foreground hover:border-primary hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-60"
              >
                {choice}
              </button>
            ))}
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
