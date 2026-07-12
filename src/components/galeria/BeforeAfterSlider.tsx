import { useRef, useState } from "react";
import { ChevronsLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Slider antes/depois — o herói da Galeria.
 * · Rato: o divisor segue o cursor em hover (sem clique).
 * · Toque: arrastar o divisor (touch-action: pan-y mantém o scroll vertical da página).
 * A foto DEPOIS fica por baixo; a ANTES é recortada com clip-path até à posição do divisor.
 */
export function BeforeAfterSlider({
  antes,
  depois,
  alt = "",
  className,
  rounded = true,
}: {
  antes: string;
  depois: string;
  alt?: string;
  className?: string;
  rounded?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [ativo, setAtivo] = useState(false);
  const dragging = useRef(false);

  const setFromClientX = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div
      ref={ref}
      className={cn(
        "group relative aspect-[4/3] w-full select-none overflow-hidden bg-accent",
        rounded && "rounded-xl",
        className
      )}
      style={{ touchAction: "pan-y" }}
      onPointerDown={(e) => {
        dragging.current = true;
        setAtivo(true);
        setFromClientX(e.clientX);
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        // rato: segue em hover; toque/caneta: só enquanto arrasta
        if (e.pointerType === "mouse" || dragging.current) setFromClientX(e.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
        setAtivo(false);
      }}
      onPointerCancel={() => {
        dragging.current = false;
        setAtivo(false);
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setAtivo(true);
      }}
      onPointerLeave={() => {
        if (!dragging.current) setAtivo(false);
      }}
    >
      {/* DEPOIS (fundo) */}
      <img src={depois} alt={alt} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      {/* ANTES (recortada até ao divisor) */}
      <img
        src={antes}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />

      {/* Etiquetas — subtis, reforçam ao interagir */}
      <span
        className={cn(
          "pointer-events-none absolute left-2 top-2 rounded-md bg-ink/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm transition-opacity",
          ativo ? "opacity-100" : "opacity-60 group-hover:opacity-100"
        )}
      >
        Antes
      </span>
      <span
        className={cn(
          "pointer-events-none absolute right-2 top-2 rounded-md bg-gold/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sidebar backdrop-blur-sm transition-opacity",
          ativo ? "opacity-100" : "opacity-60 group-hover:opacity-100"
        )}
      >
        Depois
      </span>

      {/* Divisor + pega */}
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -ml-px w-0.5 bg-white/90 shadow-[0_0_6px_rgba(0,0,0,0.35)]" />
        <div
          className={cn(
            "absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-gold text-sidebar shadow-md transition-transform",
            ativo && "scale-110"
          )}
        >
          <ChevronsLeftRight size={16} />
        </div>
      </div>
    </div>
  );
}
