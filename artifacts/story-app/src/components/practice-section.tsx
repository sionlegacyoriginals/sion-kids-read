import { useState, useRef, useEffect, useCallback } from "react";
import { Eraser, Pen, ChevronLeft, ChevronRight, PenLine, Trash2 } from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function splitSentences(content: string): string[] {
  const paragraphs = content.split("\n").filter(Boolean);
  const sentences: string[] = [];
  for (const para of paragraphs) {
    const matches = para.match(/[^!?.]+[!?.]+\s*/g);
    if (matches) {
      sentences.push(...matches.map((s) => s.trim()).filter((s) => s.length > 4));
    } else if (para.trim().length > 4) {
      sentences.push(para.trim());
    }
    if (sentences.length >= 22) break;
  }
  return sentences.slice(0, 22);
}

// ─── per-canvas hook ─────────────────────────────────────────────────────────

type DrawMode = "draw" | "erase";

function useDrawCanvas(mode: DrawMode) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const syncSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (canvas.width !== w || canvas.height !== h) {
      // Preserve pixels when only width changes (e.g. sidebar opens)
      const tmp = document.createElement("canvas");
      tmp.width = canvas.width;
      tmp.height = canvas.height;
      tmp.getContext("2d")?.drawImage(canvas, 0, 0);
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")?.drawImage(tmp, 0, 0);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [syncSize]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function applyStroke(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    isPen: boolean,
    erasing: boolean,
  ) {
    const penWidth = isPen ? 2.5 : 5;
    const eraseRadius = isPen ? 18 : 28;

    if (erasing) {
      // Circular eraser — removes pixels from the canvas drawing
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      // Draw a thick line between the two points using circles to fill gaps
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.ceil(dist / (eraseRadius / 2)));
      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        const cx = from.x + dx * t;
        const cy = from.y + dy * t;
        ctx.beginPath();
        ctx.arc(cx, cy, eraseRadius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fill();
      }
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = "#7c3aed";
      ctx.lineWidth = penWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  }

  const handlers: React.HTMLAttributes<HTMLCanvasElement> & {
    onPointerDown: React.PointerEventHandler<HTMLCanvasElement>;
    onPointerMove: React.PointerEventHandler<HTMLCanvasElement>;
    onPointerUp: React.PointerEventHandler<HTMLCanvasElement>;
    onPointerLeave: React.PointerEventHandler<HTMLCanvasElement>;
    onPointerCancel: React.PointerEventHandler<HTMLCanvasElement>;
  } = {
    onPointerDown(e) {
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      isDrawing.current = true;
      const pos = getPos(e);
      lastPos.current = pos;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const erasing = mode === "erase";
      applyStroke(ctx, pos, pos, e.pointerType === "pen", erasing);
    },
    onPointerMove(e) {
      if (!isDrawing.current || !lastPos.current) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;
      const pos = getPos(e);
      applyStroke(ctx, lastPos.current, pos, e.pointerType === "pen", mode === "erase");
      lastPos.current = pos;
    },
    onPointerUp(e) {
      isDrawing.current = false;
      lastPos.current = null;
    },
    onPointerLeave(e) {
      isDrawing.current = false;
      lastPos.current = null;
    },
    onPointerCancel(e) {
      isDrawing.current = false;
      lastPos.current = null;
    },
  };

  return { canvasRef, clear, syncSize, handlers };
}

// ─── reusable drawing layer ──────────────────────────────────────────────────

function DrawLayer({
  mode,
  onMount,
}: {
  mode: DrawMode;
  onMount?: (clear: () => void) => void;
}) {
  const { canvasRef, clear, handlers } = useDrawCanvas(mode);

  // Expose clear() to parent
  useEffect(() => {
    onMount?.(clear);
  }, [clear, onMount]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{
        touchAction: "none",
        cursor: mode === "erase" ? "cell" : "crosshair",
      }}
      {...handlers}
    />
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface PracticeSectionProps {
  content: string;
  childName: string;
}

export function PracticeSection({ content, childName }: PracticeSectionProps) {
  const sentences = splitSentences(content);
  const [current, setCurrent] = useState(0);
  const [mode, setMode] = useState<DrawMode>("draw");

  // Each zone registers its clear function here
  const clearFns = useRef<Record<string, () => void>>({});

  function registerClear(zone: string) {
    return (fn: () => void) => {
      clearFns.current[zone] = fn;
    };
  }

  function clearAll() {
    Object.values(clearFns.current).forEach((fn) => fn());
  }

  // Clear all zones whenever the sentence changes
  useEffect(() => {
    clearAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const sentence = sentences[current];
  if (sentences.length === 0) return null;

  return (
    <div className="border-t border-border/50 bg-[#fdf9f4]">
      {/* Header */}
      <div className="px-8 md:px-16 pt-10 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <PenLine className="w-5 h-5 text-amber-600 shrink-0" />
          <h2 className="text-xl font-bold text-[#1c2a3a]">✏️ Practice Writing</h2>
          <span className="ml-auto text-sm text-muted-foreground font-medium tabular-nums">
            {current + 1} / {sentences.length}
          </span>
        </div>
        <p className="text-sm text-[#7c6a5a] mt-1">
          Write or trace each sentence — or just erase a mistake and keep going,{" "}
          {childName}!
        </p>
      </div>

      {/* Floating pen / eraser toolbar — fixed to viewport bottom while in this section */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/90 backdrop-blur-md border border-[#e8dfd5] shadow-xl">
        <button
          onClick={() => setMode("draw")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
            mode === "draw"
              ? "bg-violet-600 text-white border-violet-600 shadow-sm"
              : "bg-transparent text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          <Pen className="w-3.5 h-3.5" /> Pen
        </button>
        <button
          onClick={() => setMode("erase")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
            mode === "erase"
              ? "bg-orange-500 text-white border-orange-500 shadow-sm"
              : "bg-transparent text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          <Eraser className="w-3.5 h-3.5" /> Eraser
        </button>
        <div className="w-px h-5 bg-[#e0d8d0] mx-1" />
        <button
          onClick={clearAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border border-transparent text-muted-foreground hover:text-foreground transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear all
        </button>
      </div>

      {/* Card */}
      <div className="mx-8 md:mx-16 mb-6 bg-white rounded-3xl border border-[#e8dfd5] shadow-sm overflow-hidden">

        {/* ① PRINT IT — trace the printed letters */}
        <div className="px-6 pt-6 pb-5 border-b border-[#f0ebe5]">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#b0a090] uppercase mb-2">
            Trace It (Print)
          </p>
          <div
            className="relative select-none"
            style={{ touchAction: "none" }}
          >
            {/* Light-gray print text underneath */}
            <p
              className="text-2xl font-sans text-[#cfc5b5] leading-relaxed py-3 px-1 pointer-events-none"
              style={{ fontFamily: "Georgia, serif", fontWeight: 400, lineHeight: 2 }}
            >
              {sentence}
            </p>
            <DrawLayer mode={mode} onMount={registerClear("print")} />
          </div>
        </div>

        {/* ② CURSIVE IT — trace the cursive letters */}
        <div className="px-6 pt-5 pb-6 border-b border-[#f0ebe5]">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#b0a090] uppercase mb-2">
            Trace It (Cursive)
          </p>
          <div
            className="relative select-none"
            style={{ touchAction: "none" }}
          >
            {/* Light-gray cursive text underneath */}
            <p
              className="text-3xl text-[#cfc5b5] leading-relaxed py-2 px-1 pointer-events-none"
              style={{ fontFamily: "'Dancing Script', cursive", lineHeight: 2 }}
            >
              {sentence}
            </p>
            <DrawLayer mode={mode} onMount={registerClear("cursive")} />
          </div>
        </div>

        {/* ③ WRITE IT — ruled lines you can write on */}
        <div className="px-6 pt-5 pb-6">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#b0a090] uppercase mb-4">
            Write It (your own)
          </p>

          {/* Three ruled writing lines stacked, one shared canvas on top */}
          <div
            className="relative select-none"
            style={{ touchAction: "none" }}
          >
            {/* The visible ruled lines */}
            <div className="space-y-1 pointer-events-none">
              {[0, 1, 2].map((i) => (
                <div key={i} className="relative" style={{ height: "60px" }}>
                  {/* Ascender / top rule */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-[#c8c0b0]" />
                  {/* Dashed x-height midline */}
                  <div
                    className="absolute left-0 right-0 h-px"
                    style={{
                      top: "30px",
                      background:
                        "repeating-linear-gradient(to right, #ddd5c8 0px, #ddd5c8 5px, transparent 5px, transparent 9px)",
                    }}
                  />
                  {/* Baseline */}
                  <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#c8c0b0]" />
                </div>
              ))}
            </div>

            {/* One drawing canvas covers the entire ruled area */}
            <DrawLayer mode={mode} onMount={registerClear("write")} />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-8 md:px-16 pb-10 flex items-center justify-between gap-4">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <button
          onClick={() => setCurrent((c) => Math.min(sentences.length - 1, c + 1))}
          disabled={current === sentences.length - 1}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
