import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import {
  Maximize2,
  Share2,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  Globe,
  Lock,
  CookingPot,
  Bath,
  Sofa,
  BedDouble,
  DoorOpen,
  Fence,
  Home,
  LayoutGrid,
  Coins,
  Clock3,
  TrendingUp,
} from "lucide-react";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { useGaleriaStore, DIVISAO_LABEL, duracaoLabel, type Comparacao, type Divisao } from "@/store/useGaleriaStore";
import { useModalStore } from "@/store/useModalStore";
import { useCollabStore } from "@/store/useCollabStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

export const DIVISAO_ICON: Record<Divisao, typeof CookingPot> = {
  cozinha: CookingPot,
  wc: Bath,
  sala: Sofa,
  quarto: BedDouble,
  hall: DoorOpen,
  varanda: Fence,
  exterior: Home,
  geral: LayoutGrid,
};

/** Nome do projeto/imóvel de origem da comparação. */
export function useOrigemLabel(c: Comparacao): { label: string; href?: string } {
  const projects = useCollabStore((s) => s.projects);
  const properties = usePropertiesStore((s) => s.properties);
  if (c.projectId) {
    const p = projects.find((x) => x.id === c.projectId);
    if (p) return { label: `#${p.number} ${p.title}`, href: `/comunidade/colaborativa/${p.id}` };
  }
  if (c.propertyId) {
    const p = properties.find((x) => x.id === c.propertyId);
    if (p) return { label: p.name, href: `/imoveis/${p.id}` };
  }
  return { label: "—" };
}

/** Faixa de contexto real — custo · tempo · valorização (o diferenciador). */
export function ContextoReal({ c, compact }: { c: Comparacao; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center rounded-lg border border-gold/25 bg-gradient-to-r from-gold/[0.08] to-transparent",
        compact ? "gap-x-3 gap-y-0.5 px-2.5 py-1.5" : "gap-x-4 gap-y-1 px-3 py-2"
      )}
    >
      <span className={cn("num inline-flex items-center gap-1 font-semibold text-ink", compact ? "text-xs" : "text-sm")}>
        <Coins size={compact ? 12 : 14} className="text-gold-dark" /> {eur(c.custoReal)}
      </span>
      <span className={cn("num inline-flex items-center gap-1 font-semibold text-ink", compact ? "text-xs" : "text-sm")}>
        <Clock3 size={compact ? 12 : 14} className="text-gold-dark" /> {duracaoLabel(c.duracaoDias)}
      </span>
      {c.valorizacaoEstimada ? (
        <span className={cn("num inline-flex items-center gap-1 font-bold text-success", compact ? "text-xs" : "text-sm")}>
          <TrendingUp size={compact ? 12 : 14} /> +{eur(c.valorizacaoEstimada)}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Card de comparação — slider interativo + contexto real + ações.
 * `readOnly` (perfil/anúncios): sem menu ⋯ nem selo de visibilidade.
 */
export function ComparacaoCard({
  c,
  onAmpliar,
  onPartilhar,
  readOnly = false,
}: {
  c: Comparacao;
  onAmpliar?: () => void;
  onPartilhar?: () => void;
  readOnly?: boolean;
}) {
  const origem = useOrigemLabel(c);
  const Icon = DIVISAO_ICON[c.divisao];
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const remove = useGaleriaStore((s) => s.remove);
  const toggleDestaque = useGaleriaStore((s) => s.toggleDestaque);
  const setVisibilidade = useGaleriaStore((s) => s.setVisibilidade);
  const openGaleriaForm = useModalStore((s) => s.openGaleriaForm);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  const partilhavel = c.visibilidade === "partilhavel_na_rede";

  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md", c.destaque && !readOnly ? "border-gold/50" : "border-line")}>
      <div className="relative">
        <BeforeAfterSlider antes={c.fotoAntesUrl} depois={c.fotoDepoisUrl} alt={c.titulo} rounded={false} />
        {c.destaque && (
          <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sidebar shadow">
            <Star size={10} className="fill-sidebar" /> Destaque
          </span>
        )}
      </div>

      <div className="space-y-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold text-ink">{c.titulo}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-medium text-secondary">
                <Icon size={11} /> {DIVISAO_LABEL[c.divisao]}
              </span>
              {origem.href ? (
                <Link to={origem.href} className="truncate hover:text-ink hover:underline">{origem.label}</Link>
              ) : (
                <span className="truncate">{origem.label}</span>
              )}
            </div>
          </div>
          {!readOnly && partilhavel && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success" title="Aparece no seu perfil público">
              <Globe size={10} /> Visível na Rede
            </span>
          )}
        </div>

        <ContextoReal c={c} />

        {(onAmpliar || onPartilhar || !readOnly) && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {onAmpliar && (
              <button onClick={onAmpliar} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-accent">
                <Maximize2 size={13} /> Ampliar
              </button>
            )}
            {onPartilhar && (
              <button onClick={onPartilhar} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-accent">
                <Share2 size={13} /> Partilhar
              </button>
            )}
            {!readOnly && (
              <div className="relative ml-auto" ref={menuRef}>
                <button onClick={() => setMenu((m) => !m)} className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:bg-accent hover:text-ink">
                  <MoreHorizontal size={15} />
                </button>
                {menu && (
                  <div className="absolute bottom-full right-0 z-20 mb-1 w-52 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-lg">
                    <MenuItem icon={Pencil} label="Editar" onClick={() => { setMenu(false); openGaleriaForm({ editingId: c.id }); }} />
                    <MenuItem
                      icon={Star}
                      label={c.destaque ? "Remover destaque" : "Destacar no perfil"}
                      onClick={() => { setMenu(false); toggleDestaque(c.id); toastSuccess(c.destaque ? "Destaque removido" : "Em destaque"); }}
                    />
                    <MenuItem
                      icon={partilhavel ? Lock : Globe}
                      label={partilhavel ? "Tornar privada" : "Partilhar na Rede"}
                      onClick={() => {
                        setMenu(false);
                        setVisibilidade(c.id, partilhavel ? "privada" : "partilhavel_na_rede");
                        toastSuccess(partilhavel ? "Agora privada" : "Visível na Rede", {
                          description: partilhavel ? undefined : "Aparece no seu perfil público como prova de track record.",
                        });
                      }}
                    />
                    <div className="my-1 border-t border-line/60" />
                    <MenuItem
                      icon={Trash2}
                      label="Eliminar"
                      danger
                      onClick={() => {
                        setMenu(false);
                        if (window.confirm(`Eliminar a comparação "${c.titulo}"? As fotos originais mantêm-se na obra.`)) {
                          remove(c.id);
                          toastSuccess("Comparação eliminada");
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Pencil; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent", danger ? "text-danger" : "text-ink")}
    >
      <Icon size={14} /> {label}
    </button>
  );
}
