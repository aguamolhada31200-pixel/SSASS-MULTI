import { Link } from "react-router-dom";
import { MapPin, BadgeCheck, Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type Listing,
  type ListingType,
  TYPE_LABEL_SHORT,
  ESTADO_ANUNCIO_LABEL,
  TIPO_CEDENCIA_LABEL_SHORT,
} from "@/store/useListingsStore";
import { useProfilesStore } from "@/store/useProfilesStore";
import { useSavedStore } from "@/store/useSavedStore";
import { Stars } from "./Stars";
import { eur, pct } from "@/lib/format";
import {
  investimentoTotalReab,
  roiReab,
  ctaCedencia,
  lucroCedencia,
  roiCedencia,
  retornoEntradaCedencia,
  capitalNecessarioCedencia,
} from "@/lib/calc/rede";

const typeBadge: Record<ListingType, string> = {
  reabilitacao: "bg-secondary/15 text-secondary",
  cedencia: "bg-gold/20 text-[#854F0B]",
  arrendamento: "bg-success/15 text-success",
};

const estadoTone: Record<string, string> = {
  ativo: "bg-success/12 text-success",
  financiado: "bg-gold/15 text-gold-dark",
  concluido: "bg-accent text-muted",
};

export function ListingCard({ listing }: { listing: Listing }) {
  const author = useProfilesStore((s) => s.profiles.find((p) => p.id === listing.authorId));
  const isSaved = useSavedStore((s) => s.savedIds.includes(listing.id));
  const toggleSaved = useSavedStore((s) => s.toggle);

  const onSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const now = toggleSaved(listing.id);
    toast.success(now ? "Anúncio guardado" : "Removido dos guardados");
  };

  const metrics = buildCardMetrics(listing);
  const banner = buildBanner(listing);

  return (
    <Link
      to={`/comunidade/rede/anuncio/${listing.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        listing.status === "paused" && "opacity-60"
      )}
    >
      {/* Cover */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={listing.coverImageUrl}
          alt={listing.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          loading="lazy"
        />
        <div className="azulejo absolute inset-0 opacity-[0.06]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-ink/10 to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm", typeBadge[listing.type])}>
              {TYPE_LABEL_SHORT[listing.type]}
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm", estadoTone[listing.estadoAnuncio])}>
              {ESTADO_ANUNCIO_LABEL[listing.estadoAnuncio]}
            </span>
            {listing.type === "cedencia" && listing.tipoCedencia && (
              <span className="rounded-full bg-gold/85 px-2 py-0.5 text-[10px] font-semibold text-sidebar backdrop-blur-sm">
                {TIPO_CEDENCIA_LABEL_SHORT[listing.tipoCedencia]}
              </span>
            )}
          </div>
          <button
            onClick={onSave}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card/80 text-muted backdrop-blur-sm transition-colors hover:bg-card hover:text-danger"
            title={isSaved ? "Remover" : "Guardar"}
          >
            <Heart size={15} className={cn(isSaved && "fill-danger text-danger")} />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
          <p className="flex items-center gap-1 text-[12px] font-medium text-white/90 drop-shadow">
            <MapPin size={12} /> {listing.city} · {listing.tipologia} · {listing.areaUtil} m²
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-[15px] font-bold leading-snug text-ink transition-colors group-hover:text-secondary">
          {listing.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
          {listing.description}
        </p>

        {/* Author */}
        <div className="mt-auto flex items-center gap-2.5 pt-3">
          <Avatar profile={author} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[13px] font-medium text-ink">
              {author?.fullName ?? "Investidor"}
              {author?.isVerified && <BadgeCheck size={13} className="text-gold-dark" />}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-muted">
              {author && author.projetosConcluidos > 0 ? (
                <>
                  {author.projetosConcluidos} projetos · <Stars value={author.rating} size={10} /> {author.rating.toFixed(1)}
                </>
              ) : (
                "novo na rede"
              )}
            </div>
          </div>
        </div>

        {/* Banner metric */}
        {banner && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-gold/15 bg-gradient-to-r from-accent to-accent/50 px-3.5 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-secondary/80">{banner.label}</span>
            <span className="num text-base font-bold text-ink">{banner.value}</span>
          </div>
        )}

        {/* Metrics */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line/40 pt-3">
          {metrics.map((m) => (
            <div key={m.k}>
              <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted">
                <span className={cn("inline-block h-1.5 w-1.5 rounded-full", m.dot)} />
                {m.k}
              </p>
              <p className={cn("num text-[13px] font-bold", m.color)}>{m.v}</p>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

function Avatar({ profile }: { profile?: { fullName: string; avatarUrl?: string; isVerified: boolean } }) {
  const initials = (profile?.fullName ?? "?").split(" ").map((p) => p[0]).join("").slice(0, 2);
  return (
    <div className={cn("relative h-9 w-9 shrink-0 overflow-hidden rounded-full", profile?.isVerified && "ring-2 ring-gold ring-offset-1 ring-offset-card")}>
      {profile?.avatarUrl ? (
        <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-secondary text-xs font-semibold text-white">{initials}</div>
      )}
    </div>
  );
}

interface CMetric {
  k: string;
  v: string;
  dot: string;
  color: string;
}

function buildBanner(l: Listing): { label: string; value: string } | null {
  if (l.type === "arrendamento") return { label: "Preço do imóvel", value: eur(l.precoImovel ?? 0) };
  if (l.type === "cedencia") return { label: "CTA · Custo total da aquisição", value: eur(ctaCedencia(l)) };
  if (l.type === "reabilitacao") return { label: "Investimento total", value: eur(investimentoTotalReab(l)) };
  return null;
}

function buildCardMetrics(l: Listing): CMetric[] {
  if (l.type === "reabilitacao") {
    return [
      { k: "Capital procurado", v: eur(l.capitalProcurado ?? 0), dot: "bg-gold", color: "text-gold-dark" },
      { k: "ROI esperado", v: pct(roiReab(l)), dot: "bg-success", color: "text-success" },
      { k: "Split", v: l.split ?? "—", dot: "bg-secondary", color: "text-ink" },
      { k: "Até venda", v: l.tempoAteVenda ?? "—", dot: "bg-muted", color: "text-ink" },
    ];
  }
  if (l.type === "cedencia") {
    const lucro = lucroCedencia(l);
    return [
      { k: "Capital necessário", v: eur(capitalNecessarioCedencia(l)), dot: "bg-gold", color: "text-gold-dark" },
      { k: "Valor do imóvel", v: eur(l.valorImovel ?? 0), dot: "bg-secondary", color: "text-ink" },
      { k: "Valor da cedência", v: eur(l.valorCedencia ?? 0), dot: "bg-secondary", color: "text-ink" },
      { k: "Lucro estimado", v: eur(lucro), dot: "bg-success", color: lucro >= 0 ? "text-success" : "text-danger" },
      { k: "ROI", v: pct(roiCedencia(l)), dot: "bg-gold", color: "text-gold-dark" },
      { k: "Retorno s/ entrada", v: pct(retornoEntradaCedencia(l)), dot: "bg-gold", color: "text-gold-dark" },
    ];
  }
  return [
    { k: "Capital necessário", v: eur(l.capitalNecessario ?? 0), dot: "bg-gold", color: "text-gold-dark" },
    { k: "Yield líquido", v: pct(l.yieldLiquido ?? 0), dot: "bg-success", color: "text-success" },
    { k: "Rentab. s/ capital", v: pct(l.rentabilidadeCapital ?? 0), dot: "bg-secondary", color: "text-ink" },
    { k: "Renda mensal", v: eur(l.rendaMensal ?? 0), dot: "bg-gold", color: "text-gold-dark" },
  ];
}
