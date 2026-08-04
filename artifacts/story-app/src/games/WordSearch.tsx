import { useState, useRef, useCallback, useEffect } from "react";
import { GameShell, LevelComplete } from "./GameShell";
import { GAMES, recordLevelComplete, loadProgress } from "./registry";
import {
  WORD_SEARCH_LEVELS,
  buildGrid,
  type CellCoord,
  type WSBuiltLevel,
} from "./data/word-search";

const GAME = GAMES.find(g => g.id === "word-search")!;

// Highlight colours cycling through found words
const COLORS = [
  "bg-yellow-300/80 text-yellow-900",
  "bg-green-300/80 text-green-900",
  "bg-blue-300/80 text-blue-900",
  "bg-pink-300/80 text-pink-900",
  "bg-orange-300/80 text-orange-900",
  "bg-purple-300/80 text-purple-900",
];

function key(r: number, c: number) { return `${r},${c}`; }

// Given two cells, return the full list of cells between them along a straight line
// (horizontal, vertical, or diagonal). Returns [] if not a valid line.
function cellsBetween(a: CellCoord, b: CellCoord): CellCoord[] {
  const dr = b[0] - a[0];
  const dc = b[1] - a[1];
  const len = Math.max(Math.abs(dr), Math.abs(dc));
  if (len === 0) return [a];
  // Must be perfectly horizontal, vertical, or 45° diagonal
  if (Math.abs(dr) !== 0 && Math.abs(dc) !== 0 && Math.abs(dr) !== Math.abs(dc)) return [];
  const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
  const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
  const cells: CellCoord[] = [];
  for (let i = 0; i <= len; i++) {
    cells.push([a[0] + stepR * i, a[1] + stepC * i]);
  }
  return cells;
}

export default function WordSearch() {
  const saved = loadProgress(GAME.id);
  const [level, setLevel] = useState(Math.min(saved.currentLevel, GAME.totalLevels));
  const [levelDone, setLevelDone] = useState(false);
  const [levelStars, setLevelStars] = useState(0);

  const levelDef = WORD_SEARCH_LEVELS[level - 1];

  // Build grid once per level (stable filler letters)
  const [built, setBuilt] = useState<WSBuiltLevel>(() => buildGrid(levelDef));

  // found: word → color class
  const [found, setFound] = useState<Record<string, string>>({});

  // drag state
  const [dragStart, setDragStart] = useState<CellCoord | null>(null);
  const [dragEnd,   setDragEnd]   = useState<CellCoord | null>(null);
  const isDragging = useRef(false);

  // Reset when level changes
  useEffect(() => {
    const def = WORD_SEARCH_LEVELS[level - 1];
    setBuilt(buildGrid(def));
    setFound({});
    setDragStart(null);
    setDragEnd(null);
    setLevelDone(false);
    isDragging.current = false;
  }, [level]);

  // Cells currently highlighted by the drag
  const dragCells: Set<string> = new Set();
  if (dragStart && dragEnd) {
    cellsBetween(dragStart, dragEnd).forEach(([r, c]) => dragCells.add(key(r, c)));
  } else if (dragStart) {
    dragCells.add(key(dragStart[0], dragStart[1]));
  }

  // Map each cell to its found-word colour (if any)
  const foundCellColors: Record<string, string> = {};
  Object.entries(found).forEach(([word, color]) => {
    (built.placements[word] ?? []).forEach(([r, c]) => {
      foundCellColors[key(r, c)] = color;
    });
  });

  function checkWord(cells: CellCoord[]) {
    if (cells.length < 2) return;
    const forward  = cells.map(([r, c]) => built.grid[r][c]).join("");
    const backward = [...forward].reverse().join("");

    for (const word of levelDef.words) {
      if (found[word]) continue;
      if (word === forward || word === backward) {
        const color = COLORS[Object.keys(found).length % COLORS.length];
        const newFound = { ...found, [word]: color };
        setFound(newFound);

        // Check level complete
        if (Object.keys(newFound).length === levelDef.words.length) {
          const stars = 3; // finding all words = 3 stars
          setLevelStars(stars);
          recordLevelComplete(GAME.id, level, stars);
          setTimeout(() => setLevelDone(true), 400);
        }
        break;
      }
    }
  }

  // ── Pointer events (works for both mouse and touch) ───────────────────────
  function getCellFromPoint(x: number, y: number): CellCoord | null {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const r = el.getAttribute("data-row");
    const c = el.getAttribute("data-col");
    if (r === null || c === null) return null;
    return [parseInt(r), parseInt(c)];
  }

  const onPointerDown = useCallback((r: number, c: number, e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    setDragStart([r, c]);
    setDragEnd([r, c]);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (cell) setDragEnd(cell);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const cell = getCellFromPoint(e.clientX, e.clientY);
    const end = cell ?? dragEnd;
    if (dragStart && end) {
      const cells = cellsBetween(dragStart, end);
      if (cells.length > 0) checkWord(cells);
    }
    setDragStart(null);
    setDragEnd(null);
  }, [dragStart, dragEnd, found, built, levelDef]);

  function nextLevel() {
    setLevel(l => Math.min(l + 1, GAME.totalLevels));
    setLevelDone(false);
  }
  function retryLevel() {
    const def = WORD_SEARCH_LEVELS[level - 1];
    setBuilt(buildGrid(def));
    setFound({});
    setDragStart(null);
    setDragEnd(null);
    setLevelDone(false);
  }

  const { size, theme, emoji, words } = levelDef;
  const foundCount = Object.keys(found).length;

  return (
    <>
      <GameShell
        game={GAME}
        level={level}
        totalQuestions={words.length}
        correctCount={foundCount}
        onLevelComplete={() => {}}
        onNextLevel={nextLevel}
        onRetryLevel={retryLevel}
      >
        {/* Theme header */}
        <div className="text-center mb-4">
          <p className="text-3xl mb-1">{emoji}</p>
          <h2 className="text-lg font-serif font-bold text-foreground">{theme}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Find {words.length - foundCount} more word{words.length - foundCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Grid */}
        <div
          className="touch-none select-none mx-auto"
          style={{ width: "fit-content" }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { isDragging.current = false; setDragStart(null); setDragEnd(null); }}
        >
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
          >
            {built.grid.map((row, r) =>
              row.map((letter, c) => {
                const k = key(r, c);
                const foundColor = foundCellColors[k];
                const isDrag = dragCells.has(k);

                return (
                  <div
                    key={k}
                    data-row={r}
                    data-col={c}
                    onPointerDown={e => onPointerDown(r, c, e)}
                    className={`
                      flex items-center justify-center font-mono font-bold rounded cursor-pointer
                      transition-colors duration-75
                      ${size <= 6 ? "w-11 h-11 text-xl" :
                        size <= 7 ? "w-10 h-10 text-lg" :
                        size <= 8 ? "w-9  h-9  text-base" :
                        size <= 9 ? "w-8  h-8  text-sm" :
                                    "w-7  h-7  text-xs"}
                      ${foundColor
                        ? foundColor
                        : isDrag
                        ? "bg-primary text-white scale-110"
                        : "bg-card border border-border/60 text-foreground hover:border-primary/40"}
                    `}
                  >
                    {letter}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Word list */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {words.map(word => {
            const color = found[word];
            return (
              <span
                key={word}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${
                  color
                    ? `${color} border-transparent line-through opacity-60`
                    : "bg-card border-border text-foreground"
                }`}
              >
                {word}
              </span>
            );
          })}
        </div>
      </GameShell>

      {levelDone && (
        <LevelComplete
          level={level}
          stars={levelStars}
          totalLevels={GAME.totalLevels}
          onNext={nextLevel}
          onRetry={retryLevel}
        />
      )}
    </>
  );
}
