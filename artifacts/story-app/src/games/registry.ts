export type GameMeta = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: "literacy" | "values";
  color: string;        // Tailwind bg class (card background)
  accentColor: string;  // Tailwind text/border class
  totalLevels: number;
};

export const GAMES: GameMeta[] = [
  {
    id: "sight-word-blaster",
    title: "Sight Word Blaster",
    description: "Spot the right sight word before time runs out!",
    emoji: "🚀",
    category: "literacy",
    color: "bg-blue-50",
    accentColor: "text-blue-600",
    totalLevels: 20,
  },
  {
    id: "word-builder",
    title: "Word Builder",
    description: "Tap the scrambled letters in the right order to spell the word.",
    emoji: "🧩",
    category: "literacy",
    color: "bg-violet-50",
    accentColor: "text-violet-600",
    totalLevels: 20,
  },
  {
    id: "rhyme-time",
    title: "Rhyme Time",
    description: "Pick the word that rhymes!",
    emoji: "🎵",
    category: "literacy",
    color: "bg-pink-50",
    accentColor: "text-pink-600",
    totalLevels: 20,
  },
  {
    id: "kindness-quest",
    title: "Kindness Quest",
    description: "Choose the kindest thing to do in each situation.",
    emoji: "💛",
    category: "values",
    color: "bg-yellow-50",
    accentColor: "text-yellow-600",
    totalLevels: 20,
  },
  {
    id: "alphabet-match",
    title: "Alphabet Match",
    description: "Match each uppercase letter to its lowercase partner.",
    emoji: "🔤",
    category: "literacy",
    color: "bg-green-50",
    accentColor: "text-green-600",
    totalLevels: 20,
  },
  {
    id: "sentence-builder",
    title: "Sentence Builder",
    description: "Tap the words in the right order to make a sentence.",
    emoji: "📖",
    category: "literacy",
    color: "bg-orange-50",
    accentColor: "text-orange-600",
    totalLevels: 20,
  },
  {
    id: "values-sort",
    title: "Values Sort",
    description: "Sort each action into the right character value.",
    emoji: "🌟",
    category: "values",
    color: "bg-teal-50",
    accentColor: "text-teal-600",
    totalLevels: 20,
  },
  {
    id: "missing-letter",
    title: "Missing Letter",
    description: "Fill in the blank to complete the word.",
    emoji: "✏️",
    category: "literacy",
    color: "bg-indigo-50",
    accentColor: "text-indigo-600",
    totalLevels: 20,
  },
  {
    id: "story-ending",
    title: "Story Ending",
    description: "Read the story and choose the best ending.",
    emoji: "📚",
    category: "values",
    color: "bg-rose-50",
    accentColor: "text-rose-600",
    totalLevels: 20,
  },
  {
    id: "word-families",
    title: "Word Families",
    description: "Group words that share the same ending sound.",
    emoji: "👨‍👩‍👧",
    category: "literacy",
    color: "bg-lime-50",
    accentColor: "text-lime-600",
    totalLevels: 20,
  },
  {
    id: "word-search",
    title: "Word Search",
    description: "Drag to find hidden words in the grid!",
    emoji: "🔍",
    category: "literacy",
    color: "bg-cyan-50",
    accentColor: "text-cyan-600",
    totalLevels: 20,
  },
];

// ── localStorage helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = "skr_game_progress";

export type GameProgress = {
  currentLevel: number;   // 1-based; 21 means completed all
  starsEarned: number[];  // index = level - 1, value = 1..3 (0 = not yet played)
};

function loadAll(): Record<string, GameProgress> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function loadProgress(gameId: string): GameProgress {
  const all = loadAll();
  return all[gameId] ?? { currentLevel: 1, starsEarned: [] };
}

export function saveProgress(gameId: string, progress: GameProgress) {
  const all = loadAll();
  all[gameId] = progress;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function recordLevelComplete(gameId: string, level: number, stars: number) {
  const p = loadProgress(gameId);
  const arr = [...p.starsEarned];
  arr[level - 1] = Math.max(arr[level - 1] ?? 0, stars);
  const next = Math.max(p.currentLevel, level + 1);
  saveProgress(gameId, { currentLevel: next, starsEarned: arr });
}
