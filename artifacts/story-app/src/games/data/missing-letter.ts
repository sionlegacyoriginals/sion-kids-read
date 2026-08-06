// Missing Letter — 20 levels, 3 words per level
// Each word has one letter blanked out; player picks from 4 options.
// choices[0] is always correct.
// hint gives a sentence clue so the child knows exactly which word is intended —
// prevents ambiguity when multiple letters could make a real word.

export type MLQuestion = {
  word: string;          // complete word
  blankIndex: number;    // which letter is hidden
  choices: [string, string, string, string];
  hint: string;          // short sentence + emoji so the word is unambiguous
};

export type MLLevel = {
  level: number;
  questions: MLQuestion[];
};

export const MISSING_LETTER_LEVELS: MLLevel[] = [
  { level: 1, questions: [
    { word: "cat",   blankIndex: 0, choices: ["c","b","d","f"],   hint: "It purrs and says meow 🐱" },
    { word: "dog",   blankIndex: 2, choices: ["g","b","t","p"],   hint: "It barks and wags its tail 🐶" },
    { word: "sun",   blankIndex: 1, choices: ["u","o","a","e"],   hint: "It shines bright in the sky ☀️" },
  ]},
  { level: 2, questions: [
    { word: "bed",   blankIndex: 1, choices: ["e","a","o","u"],   hint: "You sleep in it at night 🛏️" },
    { word: "hat",   blankIndex: 2, choices: ["t","n","p","s"],   hint: "You wear it on your head 🎩" },
    { word: "pin",   blankIndex: 0, choices: ["p","b","d","q"],   hint: "A tiny sharp thing used to hold paper 📌" },
  ]},
  { level: 3, questions: [
    { word: "frog",  blankIndex: 2, choices: ["o","a","e","i"],   hint: "It hops and lives near a pond 🐸" },
    { word: "jump",  blankIndex: 1, choices: ["u","a","o","e"],   hint: "What you do on a trampoline 🤸" },
    { word: "ship",  blankIndex: 0, choices: ["s","c","t","p"],   hint: "A big boat that sails the ocean 🚢" },
  ]},
  { level: 4, questions: [
    { word: "star",  blankIndex: 2, choices: ["a","e","i","o"],   hint: "It twinkles in the night sky ⭐" },
    { word: "blue",  blankIndex: 1, choices: ["l","r","n","m"],   hint: "The color of the sky and ocean 🔵" },
    { word: "clap",  blankIndex: 3, choices: ["p","t","b","d"],   hint: "What you do with your hands when you cheer 👏" },
  ]},
  { level: 5, questions: [
    { word: "brave", blankIndex: 1, choices: ["r","w","l","n"],   hint: "Not afraid — feeling strong and bold 💪" },
    { word: "cream", blankIndex: 2, choices: ["e","a","i","o"],   hint: "Ice ___ is a yummy cold treat 🍦" },
    { word: "glide", blankIndex: 4, choices: ["e","a","y","s"],   hint: "To slide smoothly through the air 🛩️" },
  ]},
  { level: 6, questions: [
    { word: "plant", blankIndex: 3, choices: ["n","m","r","l"],   hint: "A flower or tree growing in soil 🌱" },
    { word: "cloud", blankIndex: 2, choices: ["o","a","e","u"],   hint: "A fluffy white shape in the sky ☁️" },
    { word: "twist", blankIndex: 4, choices: ["t","d","s","p"],   hint: "To turn and spin around 🌀" },
  ]},
  { level: 7, questions: [
    { word: "smile", blankIndex: 2, choices: ["i","e","a","o"],   hint: "What your face does when you are happy 😊" },
    { word: "globe", blankIndex: 3, choices: ["b","p","d","t"],   hint: "A round model of the Earth 🌍" },
    { word: "stork", blankIndex: 1, choices: ["t","h","r","l"],   hint: "A tall white bird with long legs 🦢" },
  ]},
  { level: 8, questions: [
    { word: "fence", blankIndex: 4, choices: ["e","a","i","y"],   hint: "A wooden or metal barrier around a yard 🏡" },
    { word: "prize", blankIndex: 3, choices: ["z","s","c","x"],   hint: "What you win in a contest 🏆" },
    { word: "storm", blankIndex: 2, choices: ["o","a","u","e"],   hint: "Rain, thunder, and lightning together ⛈️" },
  ]},
  { level: 9, questions: [
    { word: "grape", blankIndex: 0, choices: ["g","c","k","q"],   hint: "A small purple or green fruit 🍇" },
    { word: "thumb", blankIndex: 4, choices: ["b","p","d","q"],   hint: "The short, wide finger on your hand 👍" },
    { word: "flute", blankIndex: 2, choices: ["u","o","a","e"],   hint: "A long musical instrument you blow 🎵" },
  ]},
  { level: 10, questions: [
    { word: "badge", blankIndex: 2, choices: ["d","b","g","t"],   hint: "A patch or pin worn to show who you are 🏅" },
    { word: "kneel", blankIndex: 3, choices: ["e","a","i","o"],   hint: "To go down on one knee 🙏" },
    { word: "shrug", blankIndex: 4, choices: ["g","k","d","t"],   hint: "To lift your shoulders when you don't know 🤷" },
  ]},
  { level: 11, questions: [
    { word: "bridge", blankIndex: 3, choices: ["d","b","g","p"],  hint: "A path built over a river 🌉" },
    { word: "castle", blankIndex: 2, choices: ["s","c","t","z"],  hint: "A big stone palace where kings lived 🏰" },
    { word: "squash", blankIndex: 4, choices: ["s","z","c","x"],  hint: "To press something flat 💥" },
  ]},
  { level: 12, questions: [
    { word: "planet", blankIndex: 1, choices: ["l","r","n","m"],  hint: "Earth is one — it travels around the sun 🌍" },
    { word: "flight", blankIndex: 3, choices: ["g","k","c","q"],  hint: "A trip on an airplane ✈️" },
    { word: "spring", blankIndex: 4, choices: ["n","m","r","l"],  hint: "The season after winter when flowers bloom 🌸" },
  ]},
  { level: 13, questions: [
    { word: "candle", blankIndex: 4, choices: ["l","r","d","n"],  hint: "A wax stick with a flame on top 🕯️" },
    { word: "throne", blankIndex: 2, choices: ["r","l","n","w"],  hint: "The fancy chair a king or queen sits on 👑" },
    { word: "circle", blankIndex: 3, choices: ["c","s","k","x"],  hint: "A perfectly round shape ⭕" },
  ]},
  { level: 14, questions: [
    { word: "blanket", blankIndex: 3, choices: ["n","m","r","l"], hint: "A soft cover that keeps you warm in bed 🛌" },
    { word: "shelter", blankIndex: 4, choices: ["t","d","s","p"], hint: "A safe place to stay out of the weather 🏠" },
    { word: "whisper", blankIndex: 2, choices: ["i","e","a","o"], hint: "To speak very quietly so only one person hears 🤫" },
  ]},
  { level: 15, questions: [
    { word: "cricket", blankIndex: 5, choices: ["e","a","i","o"], hint: "A small insect that chirps at night 🦗" },
    { word: "lantern", blankIndex: 3, choices: ["t","d","n","p"], hint: "A light in a glass case you carry 🏮" },
    { word: "compass", blankIndex: 3, choices: ["p","b","d","t"], hint: "A tool that always points north 🧭" },
  ]},
  { level: 16, questions: [
    { word: "dolphin", blankIndex: 3, choices: ["p","b","f","v"], hint: "A smart ocean animal that leaps and plays 🐬" },
    { word: "ancient", blankIndex: 2, choices: ["c","s","t","x"], hint: "Very, very old — from long ago 🏛️" },
    { word: "journey", blankIndex: 4, choices: ["n","m","r","l"], hint: "A long trip or adventure 🗺️" },
  ]},
  { level: 17, questions: [
    { word: "feather", blankIndex: 1, choices: ["e","a","i","o"], hint: "A light, soft part of a bird's coat 🪶" },
    { word: "thunder", blankIndex: 3, choices: ["n","m","r","l"], hint: "The loud boom you hear in a storm 🌩️" },
    { word: "courage", blankIndex: 5, choices: ["g","j","d","z"], hint: "Bravery — facing something scary 🦁" },
  ]},
  { level: 18, questions: [
    { word: "pebble", blankIndex: 3, choices: ["b","p","d","q"],  hint: "A small, smooth stone 🪨" },
    { word: "whistle", blankIndex: 3, choices: ["s","z","c","x"], hint: "A small instrument you blow to make a high sound 🎵" },
    { word: "tremble", blankIndex: 4, choices: ["b","p","d","q"], hint: "To shake because you are cold or scared 🥶" },
  ]},
  { level: 19, questions: [
    { word: "champion", blankIndex: 3, choices: ["m","n","r","l"],hint: "The winner of a contest or sport 🥇" },
    { word: "precious", blankIndex: 4, choices: ["i","e","o","a"],hint: "Very valuable and special 💎" },
    { word: "fraction", blankIndex: 5, choices: ["i","e","o","u"],hint: "A part of a whole number, like ½ 🔢" },
  ]},
  { level: 20, questions: [
    { word: "telescope", blankIndex: 3, choices: ["e","a","i","o"],hint: "A tube that makes faraway things look close 🔭" },
    { word: "adventure", blankIndex: 6, choices: ["u","a","e","o"],hint: "An exciting journey full of surprises 🗺️" },
    { word: "celebrate", blankIndex: 5, choices: ["r","l","n","m"],hint: "To have a party for something special 🎉" },
  ]},
];
