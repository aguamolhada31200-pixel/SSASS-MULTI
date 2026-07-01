import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Building2 } from "lucide-react";
import { type Property } from "@/store/usePropertiesStore";
import { Lightbox } from "@/components/Lightbox";
import { cn } from "@/lib/utils";

export function PropertyGallery({ property }: { property: Property }) {
  const fotos = property.photos;
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchX = useRef<number | null>(null);

  const total = fotos.length;
  const safeIdx = total > 0 ? idx % total : 0;
  const atual = fotos[safeIdx];

  const go = (d: number) => {
    if (total === 0) return;
    setIdx((i) => (i + d + total) % total);
  };

  const onTouchStart = (e: React.TouchEvent) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx > 40) go(-1);
    else if (dx < -40) go(1);
    touchX.current = null;
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        {/* Carrossel principal — full-width, ~500px no desktop */}
        <div
          className="relative h-[280px] w-full bg-gradient-to-br from-[#8B5E3C] to-[#5C3D2E] sm:h-[440px] lg:h-[500px]"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {atual ? (
            <img
              src={atual.url}
              alt={atual.legenda ?? property.name}
              className="absolute inset-0 h-full w-full cursor-zoom-in object-cover"
              onClick={() => setLightbox(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/40">
              <Building2 size={48} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />

          {/* Botão ampliar (canto superior direito, discreto) */}
          {atual && (
            <button
              onClick={() => setLightbox(true)}
              className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-ink/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-ink/75"
            >
              <Maximize2 size={13} /> Ampliar
            </button>
          )}

          {/* Setas */}
          {total > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-card/85 p-2 text-ink shadow transition-colors hover:bg-card"
                aria-label="Foto anterior"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => go(1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-card/85 p-2 text-ink shadow transition-colors hover:bg-card"
                aria-label="Foto seguinte"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Inferior esquerda: legenda da foto */}
          {atual?.legenda && (
            <span className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
              {atual.legenda}
            </span>
          )}

          {/* Inferior direita: contador 1/N */}
          {total > 0 && (
            <span className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-ink/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              <span className="num">{safeIdx + 1}</span>
              <span className="text-white/50">/ {total}</span>
            </span>
          )}
        </div>

        {/* Tira de miniaturas — centrada, largura da galeria */}
        {total > 1 && (
          <div className="flex flex-wrap justify-center gap-2 p-3">
            {fotos.map((f, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={cn(
                  "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                  i === safeIdx ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                <img src={f.url} alt={f.legenda ?? ""} className="h-full w-full object-cover" />
                {f.legenda && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-ink/55 px-1 py-0.5 text-[9px] text-white">
                    {f.legenda}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && atual && (
        <Lightbox fotos={fotos} startIndex={safeIdx} onClose={() => setLightbox(false)} />
      )}
    </>
  );
}
