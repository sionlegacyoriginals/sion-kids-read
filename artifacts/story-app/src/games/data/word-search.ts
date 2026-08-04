// Word Search — 20 levels, easy → hard
// allowedDirs controls which directions words can be placed:
//   easy:   E, S           (right + down only)
//   medium: E, S, W, N     (all 4 cardinal)
//   hard:   all 8

export type WSDir = "E" | "W" | "S" | "N" | "SE" | "SW" | "NE" | "NW";

export const DIR_DELTAS: Record<WSDir, [number, number]> = {
  E:  [0,  1],
  W:  [0, -1],
  S:  [1,  0],
  N:  [-1, 0],
  SE: [1,  1],
  SW: [1, -1],
  NE: [-1, 1],
  NW: [-1,-1],
};

export type WSLevelDef = {
  level: number;
  theme: string;
  emoji: string;
  size: number;
  words: string[];
  allowedDirs: WSDir[];
};

const EASY:   WSDir[] = ["E", "S"];
const MED:    WSDir[] = ["E", "S", "W", "N"];
const HARD:   WSDir[] = ["E", "W", "S", "N", "SE", "SW", "NE", "NW"];

export const WORD_SEARCH_LEVELS: WSLevelDef[] = [
  { level:  1, theme: "Animals",   emoji: "🐾", size:  6, words: ["CAT",  "DOG",   "HEN"],                         allowedDirs: EASY },
  { level:  2, theme: "Colors",    emoji: "🎨", size:  6, words: ["RED",  "BLUE",  "TAN"],                         allowedDirs: EASY },
  { level:  3, theme: "Food",      emoji: "🍎", size:  6, words: ["EGG",  "MILK",  "PIE"],                         allowedDirs: EASY },
  { level:  4, theme: "Family",    emoji: "👨‍👩‍👧", size:  6, words: ["MOM",  "DAD",   "KID",  "SON"],                allowedDirs: EASY },
  { level:  5, theme: "Nature",    emoji: "🌿", size:  7, words: ["RAIN", "LEAF",  "TREE", "SUN"],                 allowedDirs: ["E","S","W"] },
  { level:  6, theme: "School",    emoji: "🏫", size:  7, words: ["PEN",  "BOOK",  "DESK", "READ"],                allowedDirs: ["E","S","W"] },
  { level:  7, theme: "Ocean",     emoji: "🌊", size:  7, words: ["FISH", "CRAB",  "WAVE", "SEAL"],                allowedDirs: MED },
  { level:  8, theme: "Fruit",     emoji: "🍇", size:  7, words: ["PLUM", "PEAR",  "LIME", "FIG"],                 allowedDirs: MED },
  { level:  9, theme: "Sports",    emoji: "⚽", size:  8, words: ["BALL", "SWIM",  "RUN",  "RACE",  "TEAM"],       allowedDirs: MED },
  { level: 10, theme: "Weather",   emoji: "⛈️", size:  8, words: ["WIND", "SNOW",  "HAIL", "CLOUD", "STORM"],      allowedDirs: MED },
  { level: 11, theme: "Space",     emoji: "🚀", size:  8, words: ["STAR", "MOON",  "MARS", "COMET", "ORBIT"],      allowedDirs: [...MED, "SE"] },
  { level: 12, theme: "Body",      emoji: "💪", size:  8, words: ["HAND", "FOOT",  "NOSE", "EARS",  "HEART"],      allowedDirs: [...MED, "SE"] },
  { level: 13, theme: "Clothes",   emoji: "👗", size:  9, words: ["HAT",  "SHOE",  "COAT", "DRESS", "GLOVE"],      allowedDirs: HARD },
  { level: 14, theme: "Transport", emoji: "🚂", size:  9, words: ["BUS",  "TRAIN", "PLANE","BOAT",  "BIKE"],       allowedDirs: HARD },
  { level: 15, theme: "Feelings",  emoji: "😊", size:  9, words: ["HAPPY","SAD",   "BRAVE","CALM",  "PROUD"],      allowedDirs: HARD },
  { level: 16, theme: "Garden",    emoji: "🌸", size:  9, words: ["ROSE", "TULIP", "SEED", "WEED",  "SOIL", "BUD"],allowedDirs: HARD },
  { level: 17, theme: "Holidays",  emoji: "🎁", size: 10, words: ["GIFT", "STAR",  "SNOW", "JOY",   "BELL","FEAST"],allowedDirs: HARD },
  { level: 18, theme: "Music",     emoji: "🎵", size: 10, words: ["SONG", "DRUM",  "FLUTE","PIANO", "CHOIR","BEAT"],allowedDirs: HARD },
  { level: 19, theme: "Science",   emoji: "🔬", size: 10, words: ["LAB",  "ATOM",  "LIGHT","FORCE", "ENERGY","TEST"],allowedDirs: HARD },
  { level: 20, theme: "Adventure", emoji: "⚔️", size: 10, words: ["HERO", "QUEST", "BRAVE","MAGIC", "DRAGON","CASTLE"],allowedDirs: HARD },
];

// ── Grid builder ──────────────────────────────────────────────────────────────
// Returns a stable grid + placement map (word → cells) given a level definition.
// Call once on mount and store in state so filler letters don't re-randomise.

export type CellCoord = [number, number]; // [row, col]

export type WSBuiltLevel = {
  grid: string[][];                              // size×size uppercase letters
  placements: Record<string, CellCoord[]>;       // word → ordered cell coords
};

const VOWELS     = "AEIOU";
const CONSONANTS = "BCDFGHJKLMNPQRSTVWXYZ";

function rnd(n: number) { return Math.floor(Math.random() * n); }

export function buildGrid(def: WSLevelDef): WSBuiltLevel {
  const { size, words, allowedDirs } = def;
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const placements: Record<string, CellCoord[]> = {};

  // Sort words longest-first (easier to place long words first)
  const sorted = [...words].sort((a, b) => b.length - a.length);

  for (const word of sorted) {
    let placed = false;
    const letters = word.split("");

    // Try up to 200 random positions
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const dir = allowedDirs[rnd(allowedDirs.length)];
      const [dr, dc] = DIR_DELTAS[dir];
      // Clamp start so word fits in grid
      const rMin = dr < 0 ? (word.length - 1) : 0;
      const rMax = dr > 0 ? size - word.length  : size - 1;
      const cMin = dc < 0 ? (word.length - 1) : 0;
      const cMax = dc > 0 ? size - word.length  : size - 1;
      if (rMin > rMax || cMin > cMax) continue;

      const startR = rMin + rnd(rMax - rMin + 1);
      const startC = cMin + rnd(cMax - cMin + 1);

      // Check for conflicts
      const cells: CellCoord[] = [];
      let ok = true;
      for (let i = 0; i < letters.length; i++) {
        const r = startR + dr * i;
        const c = startC + dc * i;
        const existing = grid[r][c];
        if (existing !== null && existing !== letters[i]) { ok = false; break; }
        cells.push([r, c]);
      }

      if (ok) {
        cells.forEach(([r, c], i) => { grid[r][c] = letters[i]; });
        placements[word] = cells;
        placed = true;
      }
    }

    // Fallback: force-place horizontally if still not placed
    if (!placed) {
      const rowIdx = words.indexOf(word) % size;
      const cells: CellCoord[] = [];
      for (let i = 0; i < word.length && i < size; i++) {
        grid[rowIdx][i] = word[i];
        cells.push([rowIdx, i]);
      }
      placements[word] = cells;
    }
  }

  // Fill remaining nulls with random letters (biased toward consonants)
  const finalGrid: string[][] = grid.map(row =>
    row.map(cell => {
      if (cell !== null) return cell;
      return rnd(3) === 0
        ? VOWELS[rnd(VOWELS.length)]
        : CONSONANTS[rnd(CONSONANTS.length)];
    })
  );

  return { grid: finalGrid, placements };
}
