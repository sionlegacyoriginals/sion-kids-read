// Alphabet Match — 20 levels
// Each level: show 4 uppercase letters, player taps their lowercase match.
// Level 1-5: A-E | 6-10: F-J | 11-15: K-O | 16-20: P-Z (plus review)

export type AMLevel = {
  level: number;
  pairs: Array<{ upper: string; lower: string }>;  // 4 pairs per level
};

export const ALPHABET_MATCH_LEVELS: AMLevel[] = [
  { level: 1,  pairs: [{ upper: "A", lower: "a" }, { upper: "B", lower: "b" }, { upper: "C", lower: "c" }, { upper: "D", lower: "d" }] },
  { level: 2,  pairs: [{ upper: "E", lower: "e" }, { upper: "F", lower: "f" }, { upper: "G", lower: "g" }, { upper: "H", lower: "h" }] },
  { level: 3,  pairs: [{ upper: "I", lower: "i" }, { upper: "J", lower: "j" }, { upper: "K", lower: "k" }, { upper: "L", lower: "l" }] },
  { level: 4,  pairs: [{ upper: "M", lower: "m" }, { upper: "N", lower: "n" }, { upper: "O", lower: "o" }, { upper: "P", lower: "p" }] },
  { level: 5,  pairs: [{ upper: "Q", lower: "q" }, { upper: "R", lower: "r" }, { upper: "S", lower: "s" }, { upper: "T", lower: "t" }] },
  { level: 6,  pairs: [{ upper: "U", lower: "u" }, { upper: "V", lower: "v" }, { upper: "W", lower: "w" }, { upper: "X", lower: "x" }] },
  { level: 7,  pairs: [{ upper: "Y", lower: "y" }, { upper: "Z", lower: "z" }, { upper: "A", lower: "a" }, { upper: "M", lower: "m" }] },
  // From level 8 onwards: 6 pairs for more challenge
  { level: 8,  pairs: [{ upper: "B", lower: "b" }, { upper: "D", lower: "d" }, { upper: "P", lower: "p" }, { upper: "Q", lower: "q" }] },
  { level: 9,  pairs: [{ upper: "G", lower: "g" }, { upper: "J", lower: "j" }, { upper: "I", lower: "i" }, { upper: "L", lower: "l" }] },
  { level: 10, pairs: [{ upper: "N", lower: "n" }, { upper: "H", lower: "h" }, { upper: "U", lower: "u" }, { upper: "W", lower: "w" }] },
  { level: 11, pairs: [{ upper: "F", lower: "f" }, { upper: "T", lower: "t" }, { upper: "K", lower: "k" }, { upper: "S", lower: "s" }] },
  { level: 12, pairs: [{ upper: "C", lower: "c" }, { upper: "E", lower: "e" }, { upper: "O", lower: "o" }, { upper: "R", lower: "r" }] },
  { level: 13, pairs: [{ upper: "V", lower: "v" }, { upper: "X", lower: "x" }, { upper: "Y", lower: "y" }, { upper: "Z", lower: "z" }] },
  // Level 14+ harder: mix of similar-looking letters
  { level: 14, pairs: [{ upper: "B", lower: "b" }, { upper: "D", lower: "d" }, { upper: "G", lower: "g" }, { upper: "Q", lower: "q" }] },
  { level: 15, pairs: [{ upper: "I", lower: "i" }, { upper: "J", lower: "j" }, { upper: "L", lower: "l" }, { upper: "T", lower: "t" }] },
  { level: 16, pairs: [{ upper: "M", lower: "m" }, { upper: "N", lower: "n" }, { upper: "W", lower: "w" }, { upper: "V", lower: "v" }] },
  { level: 17, pairs: [{ upper: "P", lower: "p" }, { upper: "R", lower: "r" }, { upper: "F", lower: "f" }, { upper: "E", lower: "e" }] },
  { level: 18, pairs: [{ upper: "C", lower: "c" }, { upper: "G", lower: "g" }, { upper: "O", lower: "o" }, { upper: "Q", lower: "q" }] },
  { level: 19, pairs: [{ upper: "S", lower: "s" }, { upper: "Z", lower: "z" }, { upper: "X", lower: "x" }, { upper: "K", lower: "k" }] },
  { level: 20, pairs: [{ upper: "A", lower: "a" }, { upper: "H", lower: "h" }, { upper: "U", lower: "u" }, { upper: "Y", lower: "y" }] },
];
