// Word Builder — 20 levels, 1 word per level
// Player taps scrambled letter tiles in the correct order to spell the word.
// Levels 1-5: 3-letter CVC words | 6-10: 4-letter | 11-15: 5-letter | 16-20: 6+ letters

export type WBLevel = {
  level: number;
  word: string;
  hint: string;   // short clue shown above the tiles
  emoji: string;
};

export const WORD_BUILDER_LEVELS: WBLevel[] = [
  { level: 1,  word: "cat",      hint: "A furry pet that meows",           emoji: "🐱" },
  { level: 2,  word: "dog",      hint: "A loyal pet that barks",           emoji: "🐶" },
  { level: 3,  word: "sun",      hint: "It lights up the sky",             emoji: "☀️" },
  { level: 4,  word: "hat",      hint: "You wear it on your head",         emoji: "🎩" },
  { level: 5,  word: "bug",      hint: "A tiny crawling creature",         emoji: "🐛" },
  { level: 6,  word: "frog",     hint: "It jumps and says ribbit",         emoji: "🐸" },
  { level: 7,  word: "ship",     hint: "It sails on the ocean",            emoji: "🚢" },
  { level: 8,  word: "drum",     hint: "You hit it to make music",         emoji: "🥁" },
  { level: 9,  word: "kite",     hint: "You fly it in the wind",           emoji: "🪁" },
  { level: 10, word: "snow",     hint: "White and falls in winter",        emoji: "❄️" },
  { level: 11, word: "plant",    hint: "It grows in soil and needs water", emoji: "🌱" },
  { level: 12, word: "smile",    hint: "What your face does when happy",   emoji: "😊" },
  { level: 13, word: "brave",    hint: "Not scared — full of courage",     emoji: "🦁" },
  { level: 14, word: "clock",    hint: "It tells you the time",            emoji: "🕐" },
  { level: 15, word: "grape",    hint: "A small round purple fruit",       emoji: "🍇" },
  { level: 16, word: "bridge",   hint: "Crosses over a river",             emoji: "🌉" },
  { level: 17, word: "spring",   hint: "The season after winter",          emoji: "🌸" },
  { level: 18, word: "castle",   hint: "Where a king or queen lives",      emoji: "🏰" },
  { level: 19, word: "planet",   hint: "Earth is one of these",            emoji: "🪐" },
  { level: 20, word: "lantern",  hint: "A light you can carry",            emoji: "🏮" },
];
