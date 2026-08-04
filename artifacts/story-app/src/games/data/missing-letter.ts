// Missing Letter — 20 levels, 3 words per level
// Each word has one letter blanked out; player picks from 4 options.
// choices[0] is always correct.

export type MLQuestion = {
  word: string;          // complete word
  blankIndex: number;    // which letter is hidden
  choices: [string, string, string, string];
};

export type MLLevel = {
  level: number;
  questions: MLQuestion[];
};

export const MISSING_LETTER_LEVELS: MLLevel[] = [
  { level: 1,  questions: [{ word: "cat",   blankIndex: 0, choices: ["c","b","d","f"] }, { word: "dog",   blankIndex: 2, choices: ["g","b","t","p"] }, { word: "sun",   blankIndex: 1, choices: ["u","o","a","e"] }] },
  { level: 2,  questions: [{ word: "bed",   blankIndex: 1, choices: ["e","a","o","u"] }, { word: "hat",   blankIndex: 2, choices: ["t","n","p","s"] }, { word: "pin",   blankIndex: 0, choices: ["p","b","d","q"] }] },
  { level: 3,  questions: [{ word: "frog",  blankIndex: 2, choices: ["o","a","e","i"] }, { word: "jump",  blankIndex: 1, choices: ["u","a","o","e"] }, { word: "ship",  blankIndex: 0, choices: ["s","c","t","p"] }] },
  { level: 4,  questions: [{ word: "star",  blankIndex: 2, choices: ["a","e","i","o"] }, { word: "blue",  blankIndex: 1, choices: ["l","r","n","m"] }, { word: "clap",  blankIndex: 3, choices: ["p","t","b","d"] }] },
  { level: 5,  questions: [{ word: "brave", blankIndex: 1, choices: ["r","w","l","n"] }, { word: "cream", blankIndex: 2, choices: ["e","a","i","o"] }, { word: "glide", blankIndex: 4, choices: ["e","a","y","s"] }] },
  { level: 6,  questions: [{ word: "plant", blankIndex: 3, choices: ["n","m","r","l"] }, { word: "cloud", blankIndex: 2, choices: ["o","a","e","u"] }, { word: "twist", blankIndex: 4, choices: ["t","d","s","p"] }] },
  { level: 7,  questions: [{ word: "smile", blankIndex: 2, choices: ["i","e","a","o"] }, { word: "globe", blankIndex: 3, choices: ["b","p","d","t"] }, { word: "stork", blankIndex: 1, choices: ["t","h","r","l"] }] },
  { level: 8,  questions: [{ word: "fence", blankIndex: 4, choices: ["e","a","i","y"] }, { word: "prize", blankIndex: 3, choices: ["z","s","c","x"] }, { word: "storm", blankIndex: 2, choices: ["o","a","u","e"] }] },
  { level: 9,  questions: [{ word: "grape", blankIndex: 0, choices: ["g","c","k","q"] }, { word: "thumb", blankIndex: 4, choices: ["b","p","d","q"] }, { word: "flute", blankIndex: 2, choices: ["u","o","a","e"] }] },
  { level: 10, questions: [{ word: "badge", blankIndex: 2, choices: ["d","b","g","t"] }, { word: "kneel", blankIndex: 3, choices: ["e","a","i","o"] }, { word: "shrug", blankIndex: 4, choices: ["g","k","d","t"] }] },
  { level: 11, questions: [{ word: "bridge", blankIndex: 3, choices: ["d","b","g","p"] }, { word: "castle", blankIndex: 2, choices: ["s","c","t","z"] }, { word: "squash", blankIndex: 4, choices: ["s","z","c","x"] }] },
  { level: 12, questions: [{ word: "planet", blankIndex: 1, choices: ["l","r","n","m"] }, { word: "flight", blankIndex: 3, choices: ["g","k","c","q"] }, { word: "spring", blankIndex: 5, choices: ["n","m","r","l"] }] },
  { level: 13, questions: [{ word: "candle", blankIndex: 4, choices: ["l","r","d","n"] }, { word: "throne", blankIndex: 2, choices: ["r","l","n","w"] }, { word: "circle", blankIndex: 3, choices: ["c","s","k","x"] }] },
  { level: 14, questions: [{ word: "blanket", blankIndex: 3, choices: ["n","m","r","l"] }, { word: "shelter", blankIndex: 4, choices: ["t","d","s","p"] }, { word: "whisper", blankIndex: 2, choices: ["i","e","a","o"] }] },
  { level: 15, questions: [{ word: "cricket", blankIndex: 5, choices: ["e","a","i","o"] }, { word: "lantern", blankIndex: 3, choices: ["t","d","n","p"] }, { word: "compass", blankIndex: 4, choices: ["p","b","d","t"] }] },
  { level: 16, questions: [{ word: "dolphin", blankIndex: 3, choices: ["p","b","f","v"] }, { word: "ancient", blankIndex: 2, choices: ["c","s","t","x"] }, { word: "journey", blankIndex: 4, choices: ["n","m","r","l"] }] },
  { level: 17, questions: [{ word: "feather", blankIndex: 1, choices: ["e","a","i","o"] }, { word: "thunder", blankIndex: 3, choices: ["n","m","r","l"] }, { word: "courage", blankIndex: 5, choices: ["g","j","d","z"] }] },
  { level: 18, questions: [{ word: "pebble", blankIndex: 3, choices: ["b","p","d","q"] }, { word: "whistle", blankIndex: 3, choices: ["s","z","c","x"] }, { word: "tremble", blankIndex: 4, choices: ["b","p","d","q"] }] },
  { level: 19, questions: [{ word: "champion", blankIndex: 3, choices: ["m","n","r","l"] }, { word: "precious", blankIndex: 4, choices: ["i","e","o","a"] }, { word: "fraction", blankIndex: 5, choices: ["i","e","o","u"] }] },
  { level: 20, questions: [{ word: "telescope", blankIndex: 3, choices: ["e","a","i","o"] }, { word: "adventure", blankIndex: 6, choices: ["u","a","e","o"] }, { word: "celebrate", blankIndex: 5, choices: ["r","l","n","m"] }] },
];
