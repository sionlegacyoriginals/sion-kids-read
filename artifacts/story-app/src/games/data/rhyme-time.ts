// Rhyme Time — 20 levels, 3 questions per level
// Each question: show a word, pick the rhyme from 4 choices. choices[0] is always correct.

export type RTQuestion = {
  word: string;
  choices: [string, string, string, string];
};

export type RTLevel = {
  level: number;
  questions: RTQuestion[];
};

export const RHYME_TIME_LEVELS: RTLevel[] = [
  { level: 1,  questions: [{ word: "cat", choices: ["hat", "cup", "dog", "sun"] }, { word: "dog", choices: ["log", "cat", "box", "man"] }, { word: "sun", choices: ["fun", "dog", "cup", "hat"] }] },
  { level: 2,  questions: [{ word: "bed", choices: ["red", "cup", "sun", "big"] }, { word: "big", choices: ["pig", "bed", "sun", "map"] }, { word: "hop", choices: ["top", "big", "red", "sun"] }] },
  { level: 3,  questions: [{ word: "cake", choices: ["lake", "bed", "hop", "big"] }, { word: "ring", choices: ["sing", "cake", "red", "log"] }, { word: "fish", choices: ["dish", "ring", "cake", "red"] }] },
  { level: 4,  questions: [{ word: "tree", choices: ["bee", "fish", "ring", "cake"] }, { word: "ball", choices: ["fall", "tree", "dish", "ring"] }, { word: "rain", choices: ["train", "ball", "tree", "fish"] }] },
  { level: 5,  questions: [{ word: "night", choices: ["light", "rain", "ball", "tree"] }, { word: "mouse", choices: ["house", "night", "rain", "ball"] }, { word: "bear", choices: ["hair", "mouse", "night", "rain"] }] },
  { level: 6,  questions: [{ word: "fly", choices: ["sky", "bear", "mouse", "night"] }, { word: "star", choices: ["car", "fly", "bear", "house"] }, { word: "cold", choices: ["gold", "star", "fly", "bear"] }] },
  { level: 7,  questions: [{ word: "class", choices: ["grass", "cold", "star", "fly"] }, { word: "sleep", choices: ["deep", "class", "cold", "star"] }, { word: "book", choices: ["cook", "sleep", "class", "cold"] }] },
  { level: 8,  questions: [{ word: "cloud", choices: ["loud", "book", "sleep", "class"] }, { word: "float", choices: ["coat", "cloud", "book", "sleep"] }, { word: "bright", choices: ["right", "float", "cloud", "book"] }] },
  { level: 9,  questions: [{ word: "dream", choices: ["stream", "bright", "float", "cloud"] }, { word: "stone", choices: ["phone", "dream", "bright", "float"] }, { word: "dance", choices: ["chance", "stone", "dream", "bright"] }] },
  { level: 10, questions: [{ word: "strong", choices: ["long", "dance", "stone", "dream"] }, { word: "grace", choices: ["place", "strong", "dance", "stone"] }, { word: "kind", choices: ["find", "grace", "strong", "dance"] }] },
  { level: 11, questions: [{ word: "heart", choices: ["start", "kind", "grace", "strong"] }, { word: "share", choices: ["care", "heart", "kind", "grace"] }, { word: "light", choices: ["flight", "share", "heart", "kind"] }] },
  { level: 12, questions: [{ word: "peace", choices: ["fleece", "light", "share", "heart"] }, { word: "friend", choices: ["blend", "peace", "light", "share"] }, { word: "trust", choices: ["dust", "friend", "peace", "light"] }] },
  { level: 13, questions: [{ word: "brave", choices: ["wave", "trust", "friend", "peace"] }, { word: "smile", choices: ["mile", "brave", "trust", "friend"] }, { word: "proud", choices: ["cloud", "smile", "brave", "trust"] }] },
  { level: 14, questions: [{ word: "choice", choices: ["voice", "proud", "smile", "brave"] }, { word: "wonder", choices: ["thunder", "choice", "proud", "smile"] }, { word: "hope", choices: ["rope", "wonder", "choice", "proud"] }] },
  { level: 15, questions: [{ word: "shine", choices: ["vine", "hope", "wonder", "choice"] }, { word: "gold", choices: ["bold", "shine", "hope", "wonder"] }, { word: "grow", choices: ["flow", "gold", "shine", "hope"] }] },
  { level: 16, questions: [{ word: "flight", choices: ["starlight", "grow", "gold", "shine"] }, { word: "spring", choices: ["everything", "flight", "grow", "gold"] }, { word: "day", choices: ["holiday", "spring", "flight", "grow"] }] },
  { level: 17, questions: [{ word: "flower", choices: ["tower", "day", "spring", "night"] }, { word: "believe", choices: ["achieve", "flower", "day", "spring"] }, { word: "journey", choices: ["attorney", "believe", "flower", "day"] }] },
  { level: 18, questions: [{ word: "thunder", choices: ["wonder", "journey", "believe", "flower"] }, { word: "treasure", choices: ["pleasure", "thunder", "journey", "believe"] }, { word: "mountain", choices: ["fountain", "treasure", "thunder", "journey"] }] },
  { level: 19, questions: [{ word: "inspire", choices: ["admire", "mountain", "treasure", "thunder"] }, { word: "together", choices: ["whether", "inspire", "mountain", "treasure"] }, { word: "discovery", choices: ["recovery", "together", "inspire", "mountain"] }] },
  { level: 20, questions: [{ word: "persevere", choices: ["sincere", "discovery", "together", "inspire"] }, { word: "compassion", choices: ["fashion", "persevere", "discovery", "together"] }, { word: "celebrate", choices: ["communicate", "compassion", "persevere", "discovery"] }] },
];
