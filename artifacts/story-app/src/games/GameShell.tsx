import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Star, ArrowLeft, Trophy, ChevronRight, RotateCcw } from "lucide-react";
import type { GameMeta } from "./registry";
import { recordLevelComplete, loadProgress } from "./registry";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Stars display ─────────────────────────────────────────────────────────────
function Stars({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${i < count ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

// ── Level complete overlay ────────────────────────────────────────────────────
function LevelComplete({
  level,
  stars,
  totalLevels,
  onNext,
  onRetry,
}: {
  level: number;
  stars: number;
  totalLevels: number;
  onNext: () => void;
  onRetry: () => void;
}) {
  const isLast = level >= totalLevels;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-card border border-border rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center space-y-5 animate-in zoom-in-95">
        {isLast ? (
          <>
            <div className="text-6xl">🏆</div>
            <h2 className="text-2xl font-serif font-bold text-foreground">You finished!</h2>
            <p className="text-muted-foreground text-sm">You completed all 20 levels. Amazing!</p>
          </>
        ) : (
          <>
            <div className="text-5xl">{stars === 3 ? "🌟" : stars === 2 ? "⭐" : "✨"}</div>
            <h2 className="text-2xl font-serif font-bold text-foreground">Level {level} done!</h2>
          </>
        )}
        <Stars count={stars} />
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-border rounded-2xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
          {!isLast ? (
            <button
              onClick={onNext}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <Link href={`${basePath}/games`}>
              <button className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all">
                <Trophy className="w-4 h-4" /> Games
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main GameShell ─────────────────────────────────────────────────────────────
export type GameShellProps = {
  game: GameMeta;
  level: number;
  totalQuestions: number;           // questions per level
  correctCount: number;             // correct answers so far this level
  onLevelComplete: (stars: number) => void;
  onNextLevel: () => void;
  onRetryLevel: () => void;
  children: React.ReactNode;
};

export function GameShell({
  game,
  level,
  totalQuestions,
  correctCount,
  onLevelComplete,
  onNextLevel,
  onRetryLevel,
  children,
}: GameShellProps) {
  const [, navigate] = useLocation();
  const progress = loadProgress(game.id);
  const pct = Math.round((correctCount / totalQuestions) * 100);
  const stars = correctCount === totalQuestions ? 3 : correctCount >= Math.ceil(totalQuestions * 0.7) ? 2 : 1;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(`${basePath}/games`)}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                {game.emoji} {game.title}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                Level {level} / {game.totalLevels}
              </span>
            </div>
            {/* Level progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((level - 1) / game.totalLevels) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Stars count={progress.starsEarned[level - 1] ?? 0} />
          </div>
        </div>
        {/* Question progress bar */}
        <div className="max-w-lg mx-auto mt-2">
          <div className="h-1 bg-muted/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Game content */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">
        {children}
      </div>
    </div>
  );
}

// ── Feedback flash ────────────────────────────────────────────────────────────
export function FeedbackBanner({ correct, message }: { correct: boolean; message?: string }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-6 py-3 rounded-2xl font-bold text-white shadow-lg text-sm animate-in slide-in-from-bottom-4 ${
        correct ? "bg-green-500" : "bg-red-400"
      }`}
    >
      {correct ? "✅ " : "❌ "}
      {message ?? (correct ? "Correct!" : "Not quite — try again!")}
    </div>
  );
}

// ── Re-export for convenience ─────────────────────────────────────────────────
export { Stars, LevelComplete };
