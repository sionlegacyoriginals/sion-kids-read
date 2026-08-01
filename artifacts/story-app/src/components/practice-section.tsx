import { useState, useRef, useEffect, useCallback } from "react";
import { Eraser, ChevronLeft, ChevronRight, PenLine } from "lucide-react";

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

interface PracticeSectionProps {
  content: string;
  childName: string;
}

export function PracticeSection({ content, childName }: PracticeSectionProps) {
  const sentences = splitSentences(content);
  const [current, setCurrent] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const traceContainerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const sentence = sentences[current];

  // Keep canvas pixel dimensions in sync with its CSS display size
  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (canvas.width !== Math.round(width) || canvas.height !== Math.round(height)) {
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
    }
  }, []);

  // Resize observer keeps the canvas correctly sized as layout changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    syncCanvasSize();
    const ro = new ResizeObserver(syncCanvasSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [syncCanvasSize]);

  // Clear canvas whenever the sentence changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    syncCanvasSize();
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, [current, syncCanvasSize]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    // Paint a dot so a tap always leaves a mark
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, e.pointerType === "pen" ? 2 : 4, 0, Math.PI * 2);
      ctx.fillStyle = "#7c3aed";
      ctx.fill();
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !lastPos.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#7c3aed";
    ctx.lineWidth = e.pointerType === "pen" ? 2.5 : 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    isDrawing.current = false;
    lastPos.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (sentences.length === 0) return null;

  return (
    <div className="border-t border-border/50 bg-[#fdf9f4]">
      {/* Section header */}
      <div className="px-8 md:px-16 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <PenLine className="w-5 h-5 text-amber-600 shrink-0" />
          <h2 className="text-xl font-bold text-[#1c2a3a]">✏️ Practice Writing</h2>
          <span className="ml-auto text-sm text-muted-foreground font-medium tabular-nums">
            {current + 1} / {sentences.length}
          </span>
        </div>
        <p className="text-sm text-[#7c6a5a] mt-1">
          Trace each sentence with your finger or stylus, then try writing it yourself!
          Keep going, {childName} — you're doing great!
        </p>
      </div>

      {/* Card */}
      <div className="mx-8 md:mx-16 mb-6 bg-white rounded-3xl border border-[#e8dfd5] shadow-sm overflow-hidden">
        {/* READ IT */}
        <div className="px-6 pt-6 pb-5 border-b border-[#f0ebe5]">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#b0a090] uppercase mb-2">
            Read It
          </p>
          <p className="text-lg font-serif text-[#1c2a3a] leading-relaxed">{sentence}</p>
        </div>

        {/* TRACE IT */}
        <div className="px-6 pt-5 pb-6 border-b border-[#f0ebe5]">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#b0a090] uppercase mb-3">
            Trace It — draw over the letters below
          </p>

          {/* Trace area: cursive text underneath, drawing canvas on top */}
          <div
            ref={traceContainerRef}
            className="relative select-none"
            style={{ touchAction: "none" }}
          >
            {/* Cursive text — the child traces over this */}
            <p
              className="text-3xl text-[#cfc5b5] leading-relaxed py-2 px-1 pointer-events-none"
              style={{ fontFamily: "'Dancing Script', cursive", lineHeight: 2 }}
            >
              {sentence}
            </p>

            {/* Transparent canvas — captures all drawing input */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair"
              style={{ touchAction: "none" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>
        </div>

        {/* WRITE IT — ruled lines */}
        <div className="px-6 pt-5 pb-6">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#b0a090] uppercase mb-4">
            Write It
          </p>
          <div className="space-y-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="relative" style={{ height: "52px" }}>
                {/* Top ascender line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-[#c8c0b0]" />
                {/* Mid dashed x-height guide */}
                <div
                  className="absolute left-0 right-0 h-px"
                  style={{
                    top: "26px",
                    background:
                      "repeating-linear-gradient(to right, #ddd5c8 0px, #ddd5c8 5px, transparent 5px, transparent 9px)",
                  }}
                />
                {/* Baseline */}
                <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#c8c0b0]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="px-8 md:px-16 pb-10 flex items-center justify-between gap-4">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <button
          onClick={clearCanvas}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-all"
        >
          <Eraser className="w-4 h-4" /> Clear
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
