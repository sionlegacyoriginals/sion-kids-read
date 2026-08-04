// Sentence Builder — 20 levels, 1 sentence per level
// Player taps shuffled word tiles in the correct order.
// correct: the words in order | words: shuffled display order

export type SBLevel = {
  level: number;
  words: string[];   // correct order
  emoji: string;
};

export const SENTENCE_BUILDER_LEVELS: SBLevel[] = [
  { level: 1,  emoji: "🐱", words: ["The", "cat", "is", "big."] },
  { level: 2,  emoji: "☀️", words: ["I", "can", "see", "the", "sun."] },
  { level: 3,  emoji: "🐶", words: ["My", "dog", "likes", "to", "run."] },
  { level: 4,  emoji: "📚", words: ["We", "read", "books", "every", "day."] },
  { level: 5,  emoji: "🍎", words: ["She", "ate", "a", "red", "apple."] },
  { level: 6,  emoji: "🌧️", words: ["It", "is", "raining", "outside", "today."] },
  { level: 7,  emoji: "🌸", words: ["The", "flowers", "are", "pink", "and", "soft."] },
  { level: 8,  emoji: "🏫", words: ["We", "learn", "many", "things", "at", "school."] },
  { level: 9,  emoji: "🌙", words: ["The", "moon", "shines", "bright", "at", "night."] },
  { level: 10, emoji: "🦋", words: ["A", "butterfly", "flew", "over", "the", "garden."] },
  { level: 11, emoji: "🎵", words: ["Music", "makes", "my", "heart", "feel", "happy."] },
  { level: 12, emoji: "🤝", words: ["Friends", "share", "and", "help", "each", "other."] },
  { level: 13, emoji: "🌿", words: ["We", "must", "take", "care", "of", "our", "earth."] },
  { level: 14, emoji: "⭐", words: ["Every", "person", "has", "something", "special", "to", "give."] },
  { level: 15, emoji: "🏔️", words: ["Hard", "work", "helps", "us", "reach", "our", "goals."] },
  { level: 16, emoji: "💛", words: ["Being", "kind", "makes", "the", "world", "a", "better", "place."] },
  { level: 17, emoji: "📖", words: ["Reading", "opens", "the", "door", "to", "many", "adventures."] },
  { level: 18, emoji: "🌍", words: ["We", "are", "all", "different", "and", "that", "is", "beautiful."] },
  { level: 19, emoji: "🦁", words: ["Courage", "means", "doing", "the", "right", "thing", "even", "when", "it", "is", "hard."] },
  { level: 20, emoji: "🌟", words: ["Perseverance", "and", "kindness", "will", "always", "light", "the", "way", "forward."] },
];
