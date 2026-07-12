import { useState } from "react";
import { toast } from "sonner";
import { X, Download, Link2, MessageCircle, Instagram, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { duracaoLabel, type Comparacao } from "@/store/useGaleriaStore";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

// ───────────────────── Export canvas ─────────────────────

type Formato = "quadrado" | "story" | "horizontal";

const FORMATOS: { key: Formato; label: string; sub: string; w: number; h: number }[] = [
  { key: "quadrado", label: "Quadrado", sub: "1:1 · Instagram", w: 1080, h: 1080 },
  { key: "story", label: "Story", sub: "9:16 · Stories/Reels", w: 1080, h: 1920 },
  { key: "horizontal", label: "Horizontal", sub: "16:9 · Facebook/site", w: 1600, h: 900 },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha a carregar imagem"));
    img.src = src;
  });
}

/** drawImage com recorte tipo object-fit: cover. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height;
  const r = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (ir > r) {
    sw = img.height * r;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / r;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function etiqueta(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, gold: boolean) {
  ctx.save();
  ctx.font = "700 26px 'DM Sans', sans-serif";
  const w = ctx.measureText(texto).width + 28;
  ctx.fillStyle = gold ? "rgba(200,166,100,0.92)" : "rgba(26,15,8,0.62)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, 44, 8);
  ctx.fill();
  ctx.fillStyle = gold ? "#2E1A0E" : "#FFFFFF";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, x + 14, y + 23);
  ctx.restore();
}

/** Gera a imagem composta (antes | depois + faixa de contexto) e devolve o blob PNG. */
async function gerarComposta(c: Comparacao, formato: Formato): Promise<Blob> {
  const f = FORMATOS.find((x) => x.key === formato)!;
  const [antes, depois] = await Promise.all([loadImage(c.fotoAntesUrl), loadImage(c.fotoDepoisUrl)]);

  const canvas = document.createElement("canvas");
  canvas.width = f.w;
  canvas.height = f.h;
  const ctx = canvas.getContext("2d")!;

  // Faixa inferior de contexto
  const faixaH = formato === "story" ? 300 : 210;
  const imgH = f.h - faixaH;

  if (formato === "story") {
    // vertical: antes em cima, depois em baixo
    const meia = imgH / 2;
    drawCover(ctx, antes, 0, 0, f.w, meia);
    drawCover(ctx, depois, 0, meia, f.w, imgH - meia);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(0, meia - 3, f.w, 6);
    etiqueta(ctx, "ANTES", 24, 24, false);
    etiqueta(ctx, "DEPOIS", 24, meia + 24, true);
  } else {
    // lado a lado
    const meia = f.w / 2;
    drawCover(ctx, antes, 0, 0, meia, imgH);
    drawCover(ctx, depois, meia, 0, f.w - meia, imgH);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(meia - 3, 0, 6, imgH);
    etiqueta(ctx, "ANTES", 24, 24, false);
    etiqueta(ctx, "DEPOIS", meia + 24, 24, true);
  }

  // Faixa: fundo madeira escura + título Playfair + números dourados + marca
  ctx.fillStyle = "#2E1A0E";
  ctx.fillRect(0, imgH, f.w, faixaH);
  ctx.fillStyle = "#C8A664";
  ctx.fillRect(0, imgH, f.w, 4);

  const pad = 44;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#F5ECD7";
  ctx.font = `700 ${formato === "story" ? 52 : 44}px 'Playfair Display', serif`;
  ctx.fillText(c.titulo, pad, imgH + (formato === "story" ? 92 : 82), f.w - pad * 2);

  const partes = [`💰 ${eur(c.custoReal)}`, `⏱ ${duracaoLabel(c.duracaoDias)}`];
  if (c.valorizacaoEstimada) partes.push(`📈 +${eur(c.valorizacaoEstimada)} valorização`);
  ctx.fillStyle = "#C8A664";
  ctx.font = `600 ${formato === "story" ? 40 : 34}px 'DM Sans', sans-serif`;
  ctx.fillText(partes.join("   ·   "), pad, imgH + (formato === "story" ? 168 : 146), f.w - pad * 2);

  // Marca d'água discreta
  ctx.fillStyle = "rgba(245,236,215,0.55)";
  ctx.font = "500 28px 'DM Sans', sans-serif";
  const marca = "redegest";
  const mw = ctx.measureText(marca).width;
  ctx.fillText(marca, f.w - mw - pad, f.h - 34);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha a gerar PNG"))), "image/png");
  });
}

function slug(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function descarregar(c: Comparacao, formato: Formato) {
  const blob = await gerarComposta(c, formato);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `antes-depois-${slug(c.titulo)}-${formato}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

export function linkComparacao(c: Comparacao): string {
  return `${window.location.origin}/comunidade/colaborativa/galeria?c=${c.id}`;
}

// ───────────────────── Modal ─────────────────────

export function ShareComparacaoModal({ comparacao, onClose }: { comparacao: Comparacao; onClose: () => void }) {
  const [formato, setFormato] = useState<Formato>("quadrado");
  const [busy, setBusy] = useState(false);
  const c = comparacao;

  const exportar = async () => {
    setBusy(true);
    try {
      await descarregar(c, formato);
      toast.success("Imagem exportada ✨", { description: "PNG pronto a publicar." });
    } catch {
      toast.error("Não foi possível gerar a imagem", { description: "Verifique a ligação e tente de novo." });
    } finally {
      setBusy(false);
    }
  };

  const copiarLink = async () => {
    await navigator.clipboard.writeText(linkComparacao(c));
    toast.success("Link copiado");
  };

  const copiarTexto = async () => {
    const partes = [`${c.titulo} — antes & depois`, `Investimento ${eur(c.custoReal)} · ${duracaoLabel(c.duracaoDias)}`];
    if (c.valorizacaoEstimada) partes.push(`Valorização estimada +${eur(c.valorizacaoEstimada)}`);
    partes.push(linkComparacao(c));
    await navigator.clipboard.writeText(partes.join("\n"));
    toast.success("Texto copiado");
  };

  const whatsapp = () => {
    const txt = `${c.titulo} — antes & depois · ${eur(c.custoReal)} em ${duracaoLabel(c.duracaoDias)}\n${linkComparacao(c)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank", "noopener");
  };

  const instagram = async () => {
    await exportar();
    toast.info("Imagem descarregada", { description: "Abra o Instagram e publique o PNG a partir da galeria." });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Partilhar</h2>
            <p className="max-w-[260px] truncate text-xs text-muted">{c.titulo}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>

        <div className="space-y-4 p-5">
          {/* Exportar imagem composta */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Exportar imagem</p>
            <div className="grid grid-cols-3 gap-2">
              {FORMATOS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFormato(f.key)}
                  className={cn(
                    "rounded-xl border p-2.5 text-center transition-colors",
                    formato === f.key ? "border-gold bg-gold/10" : "border-line hover:bg-accent"
                  )}
                >
                  <span
                    className={cn(
                      "mx-auto mb-1.5 block rounded-[3px] border-2",
                      formato === f.key ? "border-gold-dark" : "border-muted/60",
                      f.key === "quadrado" && "h-6 w-6",
                      f.key === "story" && "h-7 w-4",
                      f.key === "horizontal" && "h-4 w-7"
                    )}
                  />
                  <span className="block text-xs font-semibold text-ink">{f.label}</span>
                  <span className="block text-[10px] text-muted">{f.sub}</span>
                </button>
              ))}
            </div>
            <Button variant="gold" className="mt-3 w-full" onClick={exportar} disabled={busy}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Descarregar PNG
            </Button>
            <p className="mt-1.5 text-center text-[10px] text-muted">
              Antes | depois com custo, duração e valorização — pronto a publicar.
            </p>
          </div>

          {/* Link + rápidos */}
          <div className="border-t border-line pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Ou partilhar via</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={whatsapp}>
                <MessageCircle size={14} /> WhatsApp
              </Button>
              <Button variant="outline" size="sm" onClick={instagram}>
                <Instagram size={14} /> Instagram
              </Button>
              <Button variant="outline" size="sm" onClick={copiarLink} disabled={c.visibilidade !== "partilhavel_na_rede"}>
                <Link2 size={14} /> Copiar link
              </Button>
              <Button variant="outline" size="sm" onClick={copiarTexto}>
                <Copy size={14} /> Copiar texto
              </Button>
            </div>
            {c.visibilidade !== "partilhavel_na_rede" && (
              <p className="mt-1.5 text-[10px] text-muted">Comparação privada — torne-a partilhável para copiar o link público.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
