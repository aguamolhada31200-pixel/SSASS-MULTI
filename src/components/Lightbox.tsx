import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LightboxPhoto {
  url: string;
  legenda?: string;
}

/**
 * Lightbox fullscreen estilo idealista: imagem grande, setas, contador,
 * título da foto, tira de miniaturas, navegação por teclado e swipe.
 */
export function Lightbox({
  fotos,
  startIndex = 0,
  onClose,
}: {
  fotos: LightboxPhoto[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const touchX = useRef<number | null>(null);
  const total = fotos.length;
  const atual = fotos[idx];

  const go = (d: number) => setIdx((i) => (i + d + total) % total);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    // bloquear scroll do body enquanto aberto
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, total]);

  if (!atual) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink/95">
      {/* Topbar */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3 text-white">
        <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm backdrop-blur-sm">
          <ImageIcon size={14} className="text-gold" />
          <span className="num font-medium">{idx + 1}</span>
          <span className="text-white/50">/ {total}</span>
        </span>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Palco */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4"
        onClick={onClose}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (dx > 40) go(-1);
          else if (dx < -40) go(1);
          touchX.current = null;
        }}
      >
        {total > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
            aria-label="Anterior"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <img
          src={atual.url}
          alt={atual.legenda ?? ""}
          className="max-h-full max-w-5xl rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />

        {total > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); go(1); }}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
            aria-label="Seguinte"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {/* Título da foto */}
      {atual.legenda && (
        <div className="shrink-0 px-4 pb-1 text-center">
          <span className="font-display text-lg text-white">{atual.legenda}</span>
        </div>
      )}

      {/* Tira de miniaturas */}
      {total > 1 && (
        <div className="shrink-0 overflow-x-auto px-4 py-3">
          <div className="mx-auto flex w-max gap-2">
            {fotos.map((f, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={cn(
                  "relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all",
                  i === idx ? "border-gold opacity-100" : "border-transparent opacity-50 hover:opacity-90"
                )}
              >
                <img src={f.url} alt={f.legenda ?? ""} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
