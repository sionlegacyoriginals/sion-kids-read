import { useLocation } from "wouter";
import { Star, Lock, ArrowLeft } from "lucide-react";
import { GAMES, loadProgress } from "@/games/registry";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const CATEGORY_LABELS: Record<string, string> = {
  literacy: "📖 Literacy",
  values: "💛 Values",
};

export default function GamesHome() {
  const [, navigate] = useLocation();

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8 animate-in fade-in">
      {/* Back to Home */}
      <button
        onClick={() => navigate(`${basePath}/`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-4xl">
          🎮
        </div>
        <h1 className="text-4xl font-serif font-bold text-foreground">Mini Games</h1>
        <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
          Free literacy and values games for every reader. Tap any game to start — your progress is saved automatically.
        </p>
        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
          ✅ Free to play — no account needed
        </span>
      </div>

      {/* Game grid — group by category */}
      {(["literacy", "values"] as const).map(cat => (
        <section key={cat} className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            {CATEGORY_LABELS[cat]}
            <span className="text-xs font-normal text-muted-foreground">
              {GAMES.filter(g => g.category === cat).length} games
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GAMES.filter(g => g.category === cat).map(game => {
              const progress = loadProgress(game.id);
              const totalStars = progress.starsEarned.reduce((s, x) => s + (x ?? 0), 0);
              const maxStars = game.totalLevels * 3;
              const levelsPlayed = progress.starsEarned.filter(Boolean).length;
              const pct = Math.round((progress.currentLevel - 1) / game.totalLevels * 100);
              const completed = progress.currentLevel > game.totalLevels;

              return (
                <button
                  key={game.id}
                  onClick={() => navigate(`${basePath}/games/${game.id}`)}
                  className={`${game.color} border border-border rounded-3xl p-5 text-left hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all group`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-4xl leading-none">{game.emoji}</span>
                    {completed && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full border border-yellow-200">
                        🏆 Complete!
                      </span>
                    )}
                  </div>
                  <h3 className={`font-bold text-foreground text-base mb-1 group-hover:${game.accentColor} transition-colors`}>
                    {game.title}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed mb-3">
                    {game.description}
                  </p>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{completed ? "All 20 levels done!" : levelsPlayed > 0 ? `Level ${progress.currentLevel} / ${game.totalLevels}` : "Not started"}</span>
                      {totalStars > 0 && (
                        <span className="flex items-center gap-0.5 font-semibold text-yellow-600">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {totalStars} / {maxStars}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <p className="text-center text-xs text-muted-foreground pb-4">
        Progress is saved in your browser. More games coming soon!
      </p>
    </div>
  );
}
