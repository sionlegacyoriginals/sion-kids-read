import { useParams, useLocation } from "wouter";
import { GAMES } from "@/games/registry";
import { lazy, Suspense } from "react";
import { Loader2, ArrowLeft } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Lazy-load each game component
const gameComponents: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  "sight-word-blaster": lazy(() => import("@/games/SightWordBlaster")),
  "word-builder":       lazy(() => import("@/games/WordBuilder")),
  "rhyme-time":         lazy(() => import("@/games/RhymeTime")),
  "kindness-quest":     lazy(() => import("@/games/KindnessQuest")),
  "alphabet-match":     lazy(() => import("@/games/AlphabetMatch")),
  "sentence-builder":   lazy(() => import("@/games/SentenceBuilder")),
  "values-sort":        lazy(() => import("@/games/ValuesSort")),
  "missing-letter":     lazy(() => import("@/games/MissingLetter")),
  "story-ending":       lazy(() => import("@/games/StoryEnding")),
  "word-families":      lazy(() => import("@/games/WordFamilies")),
};

export default function GamePlay() {
  const { gameId } = useParams<{ gameId: string }>();
  const [, navigate] = useLocation();

  const meta = GAMES.find(g => g.id === gameId);
  const GameComponent = gameId ? gameComponents[gameId] : null;

  if (!meta || !GameComponent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <p className="text-5xl">🎮</p>
        <h2 className="text-2xl font-serif font-bold text-foreground">Game not found</h2>
        <button
          onClick={() => navigate(`${basePath}/games`)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to games
        </button>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <GameComponent />
    </Suspense>
  );
}
