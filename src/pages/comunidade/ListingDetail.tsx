import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Eye,
  BadgeCheck,
  Heart,
  Share2,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Pause,
  Play,
  Trash2,
  Lock,
  ShieldCheck,
  Maximize2,
  Handshake,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Lightbox } from "@/components/Lightbox";
import { Stars } from "@/components/rede/Stars";
import { useListingsStore, ENERGY_SCALE, TYPE_LABEL_SHORT, MOTIVO_LABEL, ESTADO_ANUNCIO_LABEL, TIPO_CEDENCIA_LABEL, TIPO_IMOVEL_LABEL } from "@/store/useListingsStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { useSavedStore } from "@/store/useSavedStore";
import { useInterestsStore } from "@/store/useInterestsStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useModalStore } from "@/store/useModalStore";
import { useGaleriaStore } from "@/store/useGaleriaStore";
import { ComparacaoCard } from "@/components/galeria/ComparacaoCard";
import {
  investimentoTotalReab,
  roiReab,
  lucroReab,
  lucroParceiroReab,
  splitParceiroPct,
  splitPromotorPct,
  ctaReab,
  impostosReab,
  valorMercadoAtualReab,
  valorMercadoPosObrasReab,
  retornoEntradaReab,
  margemSegurancaReab,
  nivelSegurancaReab,
  NIVEL_SEGURANCA_LABEL,
  type NivelSeguranca,
  ctaCedencia,
  lucroCedencia,
  roiCedencia,
  retornoEntradaCedencia,
  restanteAoPromitenteVendedor,
  capitalNecessarioCedencia,
  comObrasCedencia,
  investimentoTotalCedencia,
  margemSegurancaCedencia,
} from "@/lib/calc/rede";
import { metricasHero } from "@/components/rede/metrics";
import { eur, pct, dataPT, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

type Vista = "publica" | "autor";
type L = ReturnType<typeof useListingsStore.getState>["listings"][number];

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const listing = useListingsStore((s) => s.listings.find((l) => l.id === id));
  const incrementViews = useListingsStore((s) => s.incrementViews);
  const viewedRef = useRef<string | null>(null);

  useEffect(() => {
    if (id && viewedRef.current !== id) {
      viewedRef.current = id;
      incrementViews(id);
    }
    // Garantir que o anúncio abre no topo (mobile e desktop)
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [id, incrementViews]);

  const author = useProfilesStore((s) => s.profiles.find((p) => p.id === listing?.authorId));
  const isOwner = listing?.authorId === CURRENT_USER_ID;
  const [vista, setVista] = useState<Vista>("publica");
  const showExact = vista === "autor";

  if (!listing)
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Anúncio não encontrado.</p>
        <Link to="/comunidade/rede" className="mt-2 inline-block text-secondary hover:underline">← Voltar à Rede</Link>
      </div>
    );

  const heroMetrics = metricasHero(listing);

  return (
    <div className="-mx-4 -my-6 pb-24 sm:-mx-6 lg:-mx-8 lg:pb-6">
      {/* Topbar */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-4 sm:px-6">
        <Link to="/comunidade/rede" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> Voltar à rede
        </Link>
        <div className="inline-flex rounded-lg border border-line bg-card p-0.5 text-sm">
          {(["publica", "autor"] as Vista[]).map((v) => (
            <button key={v} onClick={() => setVista(v)} className={cn("rounded-md px-3 py-1.5 font-medium", vista === v ? "bg-primary text-white" : "text-muted")}>
              {v === "publica" ? "Pública" : "Autor"}
            </button>
          ))}
        </div>
      </div>

      {/* Hero full-bleed */}
      <div className="relative mt-4 h-72 overflow-hidden sm:h-80 lg:h-96">
        <img src={listing.coverImageUrl} alt={listing.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="azulejo absolute inset-0 opacity-[0.05]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-semibold text-sidebar">{TYPE_LABEL_SHORT[listing.type]}</span>
              <span className="rounded-full bg-card/80 px-2 py-1 text-[11px] font-medium text-ink">{ESTADO_ANUNCIO_LABEL[listing.estadoAnuncio]}</span>
              {listing.anoConstrucao ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold/90 px-2 py-1 text-[11px] font-semibold text-sidebar backdrop-blur-sm">
                  <CalendarClock size={11} /> {listing.anoConstrucao}
                </span>
              ) : null}
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl lg:text-5xl">{listing.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
              <span className="flex items-center gap-1"><MapPin size={14} /> {showExact ? listing.exactAddress : `${listing.city} · ${listing.district} (zona aprox.)`}</span>
              <span className="flex items-center gap-1"><Eye size={13} /> {plural(listing.viewsCount, "visualização", "visualizações")}</span>
            </div>
            {!showExact && <p className="mt-1.5 text-xs text-white/50">Morada exata partilhada após contacto</p>}
          </div>
        </div>
      </div>

      {/* Hero metrics strip */}
      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {heroMetrics.map((m) => (
            <div key={m.k} className="rounded-2xl border border-gold/15 bg-gradient-to-br from-accent to-card p-4 shadow-sm">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-secondary/70">
                <span className={cn("h-1.5 w-1.5 rounded-full", m.hero ? "bg-gold" : "bg-secondary")} />
                {m.k}
              </p>
              <p className={cn("mt-1 num text-xl font-bold", m.hero ? "text-gold-dark" : "text-ink")}>{m.v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-6">
          <Galeria listing={listing} showExact={showExact} />

          <Card>
            <CardContent>
              <SectionHeader title="Descrição" />
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{listing.description}</p>
            </CardContent>
          </Card>

          {listing.type === "reabilitacao" && <CorpoReab listing={listing} />}
          {listing.type === "cedencia" && <CorpoCedencia listing={listing} author={author} />}
          {listing.type === "arrendamento" && <CorpoArrendamento listing={listing} />}

          {/* Trabalhos anteriores — prova visual, dá confiança a quem vai pôr capital */}
          {listing.type === "reabilitacao" && <TrabalhosAnteriores authorId={listing.authorId} />}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {author && (
            <Card>
              <CardContent>
                <SectionHeader title="Publicado por" />
                <Link to={`/comunidade/rede/${author.id}`} className="flex items-center gap-3">
                  <div className={cn("h-12 w-12 overflow-hidden rounded-full", author.isVerified && "ring-2 ring-gold")}>
                    {author.avatarUrl ? <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-secondary text-white">{author.fullName[0]}</div>}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-medium text-ink">{author.fullName}{author.isVerified && <BadgeCheck size={14} className="text-gold-dark" />}</p>
                    <div className="flex items-center gap-1 text-xs text-muted">
                      {author.projetosConcluidos > 0 ? (
                        <>
                          {author.projetosConcluidos} projetos · <Stars value={author.rating} size={11} /> {author.rating.toFixed(1)}
                        </>
                      ) : "novo na rede"}
                    </div>
                  </div>
                </Link>
                {author.taxaResposta && (
                  <p className="mt-2 text-[11px] text-muted">Responde em ~{author.respostaHoras}h · {author.taxaResposta}% de resposta</p>
                )}
                <Link to={`/comunidade/rede/${author.id}`} className="mt-3 flex w-full items-center justify-center rounded-lg border border-line py-2 text-sm font-medium text-ink transition-colors hover:bg-accent">
                  Ver perfil →
                </Link>
              </CardContent>
            </Card>
          )}

          {vista === "autor" || isOwner ? (
            <AcoesAutor listing={listing} />
          ) : (
            <AcoesPublicas listing={listing} />
          )}
        </div>
      </div>

      {vista === "publica" && !isOwner && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 p-3 backdrop-blur lg:hidden">
          <AcoesPublicasInline listing={listing} />
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Helpers ─────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">{title}</h3>
  );
}

/* Formato antigo (tile) · regras de cor novas: verde=ganho real, vermelho=perda; o resto é texto normal. */
function MetricCard({ label, value, tone, highlighted, hint }: { label: string; value: string; tone?: "gold" | "success" | "danger"; highlighted?: boolean; hint?: string }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink";
  const dot = tone === "gold" ? "bg-gold" : tone === "success" ? "bg-success" : tone === "danger" ? "bg-danger" : "bg-secondary";
  return (
    <div className={cn("rounded-xl border border-line/60 p-3", highlighted ? "bg-gradient-to-br from-accent to-card" : "bg-bg/40")}>
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
        <span className={cn("inline-block h-1.5 w-1.5 rounded-full", dot)} />
        {label}
      </p>
      <p className={cn("mt-1 num text-base font-bold", color)}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] font-medium text-muted">{hint}</p>}
    </div>
  );
}

/**
 * Grelha "Dados do imóvel" partilhada pelos 3 tipos de anúncio. O ano de
 * construção é um dado de destaque — vem à frente, a dourado e com a idade.
 */
function DadosImovelGrid({ listing }: { listing: L }) {
  const itens: { label: string; value: string; tone?: "gold"; hint?: string }[] = [];
  if (listing.anoConstrucao) {
    const idade = Math.max(0, new Date().getFullYear() - listing.anoConstrucao);
    itens.push({ label: "Ano de construção", value: String(listing.anoConstrucao), tone: "gold", hint: `${idade} ${idade === 1 ? "ano" : "anos"}` });
  }
  if (listing.tipoImovel) itens.push({ label: "Tipo de imóvel", value: TIPO_IMOVEL_LABEL[listing.tipoImovel], tone: "gold" });
  itens.push({ label: "Tipologia", value: listing.tipologia });
  itens.push({ label: "Área útil", value: `${listing.areaUtil} m²` });
  itens.push({ label: "Estado", value: listing.estado });
  const cols = itens.length >= 5 ? "sm:grid-cols-5" : itens.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3";
  return (
    <div className={cn("grid grid-cols-2 gap-3", cols)}>
      {itens.map((it) => (
        <MetricCard key={it.label} label={it.label} value={it.value} tone={it.tone} hint={it.hint} />
      ))}
    </div>
  );
}

function certColor(cert: string): string {
  if (cert === "A+" || cert === "A") return "bg-[#2E7D32]";
  if (cert === "B" || cert === "B-") return "bg-[#7CB342]";
  if (cert === "C" || cert === "D") return "bg-[#C17E2A]";
  return "bg-[#9B3A2A]";
}

// ───────────────────────── Gallery ─────────────────────────

function Galeria({ listing, showExact }: { listing: L; showExact: boolean }) {
  const [aba, setAba] = useState<"fotos" | "planta" | "mapa" | "energia">("fotos");
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchX = useRef<number | null>(null);
  const fotos = listing.galleryUrls.length > 0 ? listing.galleryUrls : [{ url: listing.coverImageUrl }];

  const abas: { key: typeof aba; label: string; badge?: string }[] = [
    { key: "fotos", label: "Fotos", badge: String(fotos.length) },
    ...(listing.floorPlanUrl ? [{ key: "planta" as const, label: "Planta" }] : []),
    { key: "mapa", label: "Mapa" },
    { key: "energia", label: "Certificado", badge: listing.energyCertificate },
  ];

  const go = (d: number) => setIdx((i) => (i + d + fotos.length) % fotos.length);

  return (
    <>
    <Card>
      <CardContent className="p-0">
        <div className="px-4 pt-4">
          <SectionHeader title="Galeria" />
        </div>
        <div className="flex gap-1 border-b border-line px-3">
          {abas.map((a) => (
            <button
              key={a.key}
              onClick={() => setAba(a.key)}
              className={cn("flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors", aba === a.key ? "border-gold font-medium text-gold-dark" : "border-transparent text-muted hover:text-ink")}
            >
              {a.label}
              {a.badge && (
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", aba === a.key ? "bg-gold/15 text-gold-dark" : "bg-accent text-muted")}>
                  {a.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {aba === "fotos" && (
          <div
            className="relative aspect-[3/2] max-h-[460px] bg-ink/5"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (dx > 40) go(-1);
              else if (dx < -40) go(1);
              touchX.current = null;
            }}
          >
            <img
              src={fotos[idx].url}
              alt={fotos[idx].legenda ?? ""}
              className="h-full w-full cursor-zoom-in object-cover"
              onClick={() => setLightbox(true)}
            />

            {/* Contador */}
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-ink/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              <span className="num">{idx + 1}</span>
              <span className="text-white/50">/ {fotos.length}</span>
            </span>

            {/* Botão ampliar */}
            <button
              onClick={() => setLightbox(true)}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-ink/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-ink/75"
            >
              <Maximize2 size={13} /> Ampliar
            </button>

            {/* Legenda da foto atual */}
            {fotos[idx].legenda && (
              <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                {fotos[idx].legenda}
              </span>
            )}

            {fotos.length > 1 && (
              <>
                <button onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 text-ink shadow hover:bg-card"><ChevronLeft size={18} /></button>
                <button onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 text-ink shadow hover:bg-card"><ChevronRight size={18} /></button>
                <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
                  {fotos.map((_, i) => (
                    <button key={i} onClick={() => setIdx(i)} className={cn("h-1.5 rounded-full transition-all", i === idx ? "w-5 bg-gold" : "w-1.5 bg-white/60")} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {aba === "planta" && listing.floorPlanUrl && (
          <div className="aspect-video bg-ink/5"><img src={listing.floorPlanUrl} alt="Planta" className="h-full w-full object-contain" /></div>
        )}

        {aba === "mapa" && (() => {
          // Sem morada exata (vista pública) → centra na cidade/distrito (zona aproximada).
          // Com morada exata (autor) → centra na morada. Embed do Google Maps sem API key.
          const morada = showExact && listing.exactAddress?.trim();
          const query = morada
            ? `${listing.exactAddress}, ${listing.city}, Portugal`
            : `${listing.city}, ${listing.district}, Portugal`;
          const zoom = morada ? 16 : 12;
          return (
            <div className="relative aspect-video bg-ink/5">
              <iframe
                title={`Mapa · ${listing.city}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              {!morada && (
                <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-ink/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  <MapPin size={12} /> Zona aproximada · {listing.district}
                </div>
              )}
            </div>
          );
        })()}

        {aba === "energia" && (
          <div className="p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center gap-2">
                <div className={cn("flex h-28 w-28 flex-col items-center justify-center rounded-2xl text-white shadow-lg", certColor(listing.energyCertificate))}>
                  <span className="text-4xl font-black leading-none">{listing.energyCertificate}</span>
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Classe energética</p>
              </div>
              <div className="flex-1 space-y-1">
                {ENERGY_SCALE.map((c, i) => {
                  const active = c === listing.energyCertificate;
                  const width = 45 + (ENERGY_SCALE.length - i) * 7;
                  const bg = i <= 1 ? "#2E7D32" : i <= 3 ? "#7CB342" : i <= 5 ? "#C17E2A" : "#9B3A2A";
                  return (
                    <div key={c} className="flex items-center gap-2">
                      <div
                        className={cn("flex h-7 items-center rounded-r-md px-3 text-sm font-bold text-white transition-all", active && "ring-2 ring-ink ring-offset-1")}
                        style={{ width: `${width}%`, background: bg, opacity: active ? 1 : 0.3 }}
                      >
                        {c}
                      </div>
                      {active && <span className="text-xs font-semibold text-ink">←</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-5 rounded-lg border border-line bg-bg/60 px-4 py-3 text-[12px] leading-relaxed text-muted">
              Certificado emitido segundo o <strong className="text-ink">SCE</strong> — escala oficial de eficiência energética em Portugal.
              Classe <strong className="text-ink">{listing.energyCertificate}</strong> atribuída a este imóvel.
            </p>
          </div>
        )}
      </CardContent>
    </Card>

    {lightbox && aba === "fotos" && (
      <Lightbox fotos={fotos} startIndex={idx} onClose={() => setLightbox(false)} />
    )}
    </>
  );
}

// ───────────────────────── Type-aware bodies ─────────────────────────

function Secao({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent>
        <SectionHeader title={title} />
        {children}
      </CardContent>
    </Card>
  );
}

function CorpoReab({ listing }: { listing: L }) {
  const cta = ctaReab(listing);
  const inv = investimentoTotalReab(listing);
  const impostos = impostosReab(listing);
  const mercadoAtual = valorMercadoAtualReab(listing);
  const mercadoPos = valorMercadoPosObrasReab(listing);
  const lucro = lucroReab(listing);
  const roi = roiReab(listing);
  const lucroParceiro = lucroParceiroReab(listing);
  const retEntrada = retornoEntradaReab(listing);
  const capitalProcurado = listing.capitalProcurado ?? 0;
  const invPct = splitParceiroPct(listing);
  const promPct = splitPromotorPct(listing);

  return (
    <>
      <Secao title="Dados do imóvel">
        <DadosImovelGrid listing={listing} />
      </Secao>

      {/* ─────── BLOCO 1 — Composição do investimento (rentabilidade do PROJETO) ─────── */}
      <Card>
        <CardContent>
          <SectionHeader title="Composição do investimento" />

          {/* Decomposição linha a linha */}
          <div className="space-y-1 rounded-2xl border border-line bg-bg/40 p-4">
            <CtaRow label="Valor do imóvel (CPCV)" value={listing.valorImovel ?? 0} />
            <CtaRow label="Impostos (IMT + IS + Registos)" value={impostos} />
            <div className="my-2 flex items-center justify-between border-t border-line pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                CTA · Custo Total da Aquisição
              </span>
              <span className="num font-display text-lg font-bold text-gold-dark">{eur(cta)}</span>
            </div>
            <CtaRow label="Orçamento das obras previstas" value={listing.orcamentoObras ?? 0} />
            {(listing.outrosCustos ?? 0) > 0 && (
              <CtaRow label="Outros custos do projeto" value={listing.outrosCustos ?? 0} />
            )}
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Investimento Total
              </span>
              <span className="num font-display text-2xl font-bold text-gold-dark">{eur(inv)}</span>
            </div>
          </div>

          {/* Mercado, ROI e prazo — indicadores do PROJETO */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard label="Valor de mercado pós-obras" value={eur(mercadoPos)} tone="success" highlighted />
            <MetricCard label="Lucro estimado pós-obras" value={eur(lucro)} tone={lucro >= 0 ? "success" : "danger"} />
            <MetricCard label="ROI da operação prevista" value={pct(roi)} tone="gold" highlighted />
            <MetricCard label="Prazo estimado das obras" value={listing.prazoObras ?? "—"} />
            <MetricCard label="Venda prevista" value={listing.tempoAteVenda ?? "—"} />
            <MetricCard label="Valor de mercado atual" value={eur(mercadoAtual)} />
            <MetricCard label="Desconto obtido" value={eur(listing.valorNegociado ?? 0)} tone={listing.valorNegociado ? "success" : undefined} />
          </div>
        </CardContent>
      </Card>

      {/* ─────── Margem de Segurança — folga da operação sobre o preço de venda ─────── */}
      {valorMercadoPosObrasReab(listing) > 0 && <MargemSeguranca margem={margemSegurancaReab(listing)} />}

      {/* ─────── BLOCO 2 — Rentabilidade do INVESTIDOR ─────── */}
      <Card className="border-gold/30 bg-gradient-to-br from-gold/[0.04] to-card">
        <CardContent>
          <SectionHeader title="Rentabilidade do investidor" />

          {/* Divisão do lucro — deixa claro QUAL a percentagem do investidor */}
          <SplitParceria invPct={invPct} promPct={promPct} capital={capitalProcurado} lucroParceiro={lucroParceiro} />

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricCard label="Capital procurado" value={eur(capitalProcurado)} tone="gold" highlighted />
            <MetricCard label={`A sua parte do lucro (${invPct}%)`} value={eur(lucroParceiro)} tone={lucroParceiro >= 0 ? "success" : "danger"} highlighted />
            <MetricCard label="Retorno sobre a entrada" value={pct(retEntrada)} tone="gold" highlighted hint={listing.tempoAteVenda ? `(em ${listing.tempoAteVenda})` : undefined} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/**
 * Barra de divisão do lucro da parceria — mostra sem ambiguidade a fatia do
 * INVESTIDOR (dourado) vs a do promotor. Responde a "qual é a minha percentagem?".
 */
function SplitParceria({ invPct, promPct, capital, lucroParceiro }: { invPct: number; promPct: number; capital: number; lucroParceiro: number }) {
  return (
    <div className="rounded-2xl border border-gold/30 bg-bg/40 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
        <Handshake size={13} className="text-gold-dark" /> Divisão do lucro da parceria
      </p>
      <div className="flex h-10 overflow-hidden rounded-lg border border-line">
        <div
          className="flex items-center justify-center bg-gold text-xs font-bold text-sidebar"
          style={{ width: `${Math.max(invPct, 6)}%` }}
        >
          {invPct >= 16 ? `${invPct}%` : ""}
        </div>
        <div
          className="flex items-center justify-center bg-accent text-xs font-semibold text-muted"
          style={{ width: `${Math.max(promPct, 6)}%` }}
        >
          {promPct >= 16 ? `${promPct}%` : ""}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-gold-dark">
          <span className="h-2.5 w-2.5 rounded-full bg-gold" /> Você · investidor <span className="num">{invPct}%</span>
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <span className="h-2.5 w-2.5 rounded-full border border-line bg-accent" /> Promotor · dono do negócio <span className="num">{promPct}%</span>
        </span>
      </div>
      <p className="mt-2.5 border-t border-line/60 pt-2.5 text-[13px] text-ink">
        Entra com <span className="num font-semibold">{eur(capital)}</span> e fica com <span className="font-semibold text-gold-dark">{invPct}%</span> do lucro →{" "}
        <span className="num font-bold text-success">{eur(lucroParceiro)}</span> para si.
      </p>
    </div>
  );
}

const SEG_UI: Record<NivelSeguranca, { dot: string; text: string; bar: string; chipBg: string; chipBorder: string }> = {
  muito_segura: { dot: "bg-success", text: "text-success", bar: "bg-success", chipBg: "bg-success/10", chipBorder: "border-success/30" },
  boa: { dot: "bg-gold", text: "text-gold-dark", bar: "bg-gold", chipBg: "bg-gold/10", chipBorder: "border-gold/40" },
  atencao: { dot: "bg-warning", text: "text-warning", bar: "bg-warning", chipBg: "bg-warning/10", chipBorder: "border-warning/30" },
  risco: { dot: "bg-danger", text: "text-danger", bar: "bg-danger", chipBg: "bg-danger/10", chipBorder: "border-danger/30" },
};

/**
 * Margem de Segurança — folga da operação sobre o valor de venda de referência.
 * Reutilizável: recebe a margem já calculada (Compra e Revenda ou Cedência).
 * A barra usa uma escala 0–30% (acima disso enche); o chip classifica o nível.
 */
function MargemSeguranca({ margem }: { margem: number }) {
  const nivel = nivelSegurancaReab(margem);
  const ui = SEG_UI[nivel];
  const fill = Math.max(0, Math.min(100, (margem / 30) * 100));
  return (
    <Card>
      <CardContent>
        <SectionHeader title="Margem de Segurança" />
        <div className="rounded-2xl border border-line bg-bg/40 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Margem de segurança</p>
              <p className={cn("num font-display text-3xl font-bold", ui.text)}>{pct(margem)}</p>
            </div>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold", ui.chipBg, ui.chipBorder, ui.text)}>
              <span className={cn("h-2 w-2 shrink-0 rounded-full", ui.dot)} /> {NIVEL_SEGURANCA_LABEL[nivel]}
            </span>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-line/60">
            <div className={cn("h-full rounded-full transition-all", ui.bar)} style={{ width: `${fill}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CorpoCedencia({ listing, author }: { listing: L; author?: { isVerified: boolean; fullName: string } }) {
  const restante = restanteAoPromitenteVendedor(listing);
  const cta = ctaCedencia(listing);
  const capitalNecessario = capitalNecessarioCedencia(listing);
  const lucro = lucroCedencia(listing);
  const roi = roiCedencia(listing);
  const retEntrada = retornoEntradaCedencia(listing);
  const obra = listing.obra ?? 0;
  // Mostra o cenário "com obras" só quando o imóvel está a recuperar E há dados de obra.
  const comObras = comObrasCedencia(listing) && (obra > 0 || (listing.valorMercadoPosObras ?? 0) > 0);
  const posObras = listing.valorMercadoPosObras || listing.valorVendaPrevisto || 0;

  return (
    <>
      <Secao title="Dados do imóvel">
        <DadosImovelGrid listing={listing} />
        {listing.tipoCedencia && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1.5 text-sm font-semibold text-gold-dark">
            {TIPO_CEDENCIA_LABEL[listing.tipoCedencia]}
          </div>
        )}
      </Secao>

      <Card>
        <CardContent>
          <SectionHeader title="Viabilidade do negócio" />
          <p className="mb-4 text-sm text-muted">Decomposição do Custo Total da Aquisição (CTA)</p>

          {/* Decomposição linha a linha */}
          <div className="space-y-1 rounded-2xl border border-line bg-bg/40 p-4">
            <CtaRow label="Valor da Cedência" value={listing.valorCedencia ?? 0} />
            <CtaRow label="Restante a Pagar ao Promitente Vendedor" value={restante} />
            <CtaRow label="Impostos (IMT + IS + Registo)" value={listing.impostos ?? 0} />
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                CTA · Custo Total da Aquisição
              </span>
              <span className="num font-display text-2xl font-bold text-gold-dark">{eur(cta)}</span>
            </div>
          </div>

          {comObras && obra > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-line/60 bg-bg/40 px-4 py-3">
              <span className="text-sm text-muted">Valor previsto das obras</span>
              <span className="num text-sm font-semibold text-ink">{eur(obra)}</span>
            </div>
          )}

          {/* Indicadores principais — adaptam-se ao cenário (com/sem obras) */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Capital Necessário" value={eur(capitalNecessario)} tone="gold" highlighted />
            {!comObras && (
              <>
                <MetricCard label="Lucro Estimado" value={eur(lucro)} tone={lucro >= 0 ? "success" : "danger"} highlighted />
                <MetricCard label="Retorno s/ Entrada" value={pct(retEntrada)} tone="gold" highlighted />
                <MetricCard label="ROI da operação" value={pct(roi)} tone="gold" highlighted />
              </>
            )}
          </div>

          {/* Detalhes */}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {!comObras && (
              <MetricCard label="Valor de mercado atual" value={eur(listing.valorVendaPrevisto ?? 0)} tone="success" />
            )}
            <MetricCard label="Desconto Obtido" value={eur(listing.valorNegociado ?? 0)} />
            {listing.valorImovel ? (
              <MetricCard label="Valor do Imóvel (CPCV)" value={eur(listing.valorImovel)} />
            ) : null}
            <MetricCard label="Sinal pago pelo cedente" value={eur(listing.sinalPagoCedente ?? 0)} />
            <MetricCard
              label="Término do CPCV"
              value={listing.terminoCpcv ? dataPT(listing.terminoCpcv) : (listing.prazoAteEscritura ?? "—")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Margem de Segurança — folga sobre o valor de venda (atual sem obras / pós-obras com obras) */}
      <MargemSeguranca margem={margemSegurancaCedencia(listing)} />

      {comObras && (
        <Card>
          <CardContent>
            <SectionHeader title="Situação Após Revenda" />

            {/* Decomposição do Investimento Total */}
            <div className="space-y-1 rounded-2xl border border-line bg-bg/40 p-4">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted">CTA · Custo Total da Aquisição</span>
                <span className="num text-sm font-semibold text-ink">{eur(cta)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted">Valor previsto das obras</span>
                <span className="num text-sm font-semibold text-ink">{eur(obra)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Investimento Total
                </span>
                <span className="num font-display text-2xl font-bold text-gold-dark">
                  {eur(investimentoTotalCedencia(listing))}
                </span>
              </div>
            </div>

            {/* Indicadores pós-obras */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Valor de mercado pós-obras" value={eur(posObras)} tone="success" highlighted />
              <MetricCard label="Lucro estimado pós-obras" value={eur(lucro)} tone={lucro >= 0 ? "success" : "danger"} highlighted />
              <MetricCard label="ROI pós-obras" value={pct(roi)} tone="gold" highlighted />
              <MetricCard label="Retorno s/ Entrada" value={pct(retEntrada)} tone="gold" highlighted />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MetricCard label="Valor de mercado atual" value={eur(listing.valorVendaPrevisto ?? 0)} />
              {listing.prazoObras ? <MetricCard label="Prazo estimado das obras" value={listing.prazoObras} /> : null}
            </div>
          </CardContent>
        </Card>
      )}

      <Secao title="Motivo da cedência">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-secondary">
            {listing.motivoCedencia ? MOTIVO_LABEL[listing.motivoCedencia] : "—"}
          </span>
          {author && (
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm", author.isVerified ? "bg-gold/15 text-gold-dark" : "bg-accent text-muted")}>
              <ShieldCheck size={14} /> {author.isVerified ? "Identidade verificada" : "Identidade por verificar"}
            </span>
          )}
        </div>
      </Secao>
    </>
  );
}

/**
 * Trabalhos anteriores do autor do anúncio — até 3 comparações antes/depois
 * partilháveis (destaques primeiro). Prova visual de execução.
 */
function TrabalhosAnteriores({ authorId }: { authorId?: string }) {
  const comparacoes = useGaleriaStore((s) => s.comparacoes);
  if (!authorId) return null;
  const trabalhos = comparacoes
    .filter((c) => c.criadoPor === authorId && c.visibilidade === "partilhavel_na_rede")
    .sort((a, b) => Number(b.destaque) - Number(a.destaque) || (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 3);
  if (trabalhos.length === 0) return null;
  return (
    <Card>
      <CardContent>
        <SectionHeader title="Trabalhos anteriores deste investidor" />
        <div className={cn("grid gap-4", trabalhos.length > 1 && "sm:grid-cols-2", trabalhos.length > 2 && "xl:grid-cols-3")}>
          {trabalhos.map((c) => (
            <ComparacaoCard key={c.id} c={c} readOnly />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CtaRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted">{label}</span>
      <span className="num text-sm font-semibold text-ink">{eur(value)}</span>
    </div>
  );
}

function CorpoArrendamento({ listing }: { listing: L }) {
  return (
    <>
      <Secao title="Dados do imóvel">
        <DadosImovelGrid listing={listing} />
      </Secao>

      <Card>
        <CardContent>
          <SectionHeader title="Viabilidade do negócio" />
          <p className="mb-4 text-sm text-muted">Indicadores financeiros</p>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Preço do imóvel" value={eur(listing.precoImovel ?? 0)} />
            <MetricCard label="Capital necessário" value={eur(listing.capitalNecessario ?? 0)} tone="gold" highlighted />
            <MetricCard label="Receita mensal" value={eur(listing.rendaMensal ?? 0)} tone="success" />
            <MetricCard label="Yield líquido" value={pct(listing.yieldLiquido ?? 0)} tone="gold" highlighted />
            <MetricCard label="Rentab. s/ capital" value={pct(listing.rentabilidadeCapital ?? 0)} highlighted />
            <MetricCard label="ROI" value={pct(listing.roi ?? 0)} tone="gold" highlighted />
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ───────────────────────── Actions ─────────────────────────

function useListingActions(listing: L) {
  const navigate = useNavigate();
  const isSaved = useSavedStore((s) => s.savedIds.includes(listing.id));
  const toggleSaved = useSavedStore((s) => s.toggle);
  const hasInterest = useInterestsStore((s) =>
    s.interests.some((i) => i.listingId === listing.id && i.userId === CURRENT_USER_ID)
  );
  const conversa = useConversationsStore((s) =>
    s.conversations.find(
      (c) =>
        c.contextType === "listing" &&
        c.contextId === listing.id &&
        c.participantIds.includes(CURRENT_USER_ID) &&
        c.participantIds.includes(listing.authorId)
    )
  );
  const getOrCreate = useConversationsStore((s) => s.getOrCreate);
  const incrementContacts = useListingsStore((s) => s.incrementContacts);
  const openInterest = useModalStore((s) => s.openInterest);

  const contactar = () => {
    const convId = getOrCreate(listing.authorId, "listing", listing.id);
    incrementContacts(listing.id);
    navigate(`/mensagens?c=${convId}`);
  };
  const guardar = () => {
    const now = toggleSaved(listing.id);
    if (now) {
      toast.success("Guardado nos favoritos ♥", {
        action: { label: "Ver guardados", onClick: () => navigate("/comunidade/rede?tab=guardados") },
      });
    } else {
      toast.message("Removido dos guardados");
    }
  };
  const partilhar = async () => {
    const url = `${window.location.origin}/comunidade/rede/anuncio/${listing.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado", { description: url });
    } catch {
      toast.info(url);
    }
  };
  const interesse = () => openInterest(listing.id);
  const verConversa = () => {
    if (conversa) navigate(`/mensagens?c=${conversa.id}`);
    else contactar();
  };
  return { isSaved, hasInterest, temConversa: !!conversa, contactar, guardar, partilhar, interesse, verConversa };
}

function AcoesPublicas({ listing }: { listing: L }) {
  const a = useListingActions(listing);
  return (
    <Card>
      <CardContent className="space-y-2">
        <Button variant="gold" className="w-full" onClick={a.contactar}><MessageCircle size={16} /> Contactar</Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={a.guardar}>
            <Heart key={a.isSaved ? "on" : "off"} size={15} className={cn(a.isSaved && "animate-pop-in fill-gold text-gold")} />
            {a.isSaved ? "Guardado" : "Guardar"}
          </Button>
          <Button variant="outline" onClick={a.partilhar}><Share2 size={15} /> Partilhar</Button>
        </div>
        {a.hasInterest ? (
          <>
            <Button variant="ghost" className="w-full" disabled>
              <ShieldCheck size={15} className="text-success" /> Interesse manifestado
            </Button>
            <button onClick={a.verConversa} className="block w-full text-center text-xs font-medium text-gold-dark hover:underline">
              Ver conversa →
            </button>
          </>
        ) : a.temConversa ? (
          <Button variant="primary" className="w-full" onClick={a.verConversa}>
            <MessageCircle size={15} /> Ver conversa →
          </Button>
        ) : (
          <Button variant="primary" className="w-full" onClick={a.interesse}>
            Tenho interesse
          </Button>
        )}
        <p className="flex items-center gap-1.5 pt-1 text-[11px] text-muted"><Lock size={12} /> Morada exata partilhada após contacto.</p>
      </CardContent>
    </Card>
  );
}

function AcoesPublicasInline({ listing }: { listing: L }) {
  const a = useListingActions(listing);
  return (
    <div className="mx-auto flex max-w-6xl items-center gap-2">
      <Button variant="outline" size="md" onClick={a.guardar}>
        <Heart key={a.isSaved ? "on" : "off"} size={16} className={cn(a.isSaved && "animate-pop-in fill-gold text-gold")} />
      </Button>
      <Button variant="outline" size="md" onClick={a.partilhar}><Share2 size={16} /></Button>
      {a.hasInterest || a.temConversa ? (
        <Button variant="gold" className="flex-1" onClick={a.verConversa}><MessageCircle size={16} /> Ver conversa</Button>
      ) : (
        <Button variant="gold" className="flex-1" onClick={a.interesse}>Tenho interesse</Button>
      )}
    </div>
  );
}

function AcoesAutor({ listing }: { listing: L }) {
  const navigate = useNavigate();
  const setStatus = useListingsStore((s) => s.setStatus);
  const remove = useListingsStore((s) => s.remove);
  const openForm = useModalStore((s) => s.openListingForm);

  const pausar = () => {
    const next = listing.status === "paused" ? "active" : "paused";
    setStatus(listing.id, next);
    toast.success(next === "paused" ? "Anúncio pausado" : "Anúncio reativado");
  };
  const eliminar = () => {
    if (!confirm(`Eliminar "${listing.title}"?`)) return;
    remove(listing.id);
    toast.success("Anúncio eliminado");
    navigate("/comunidade/rede");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3">
          <SectionHeader title="Gestão do anúncio" />
          <Button variant="gold" className="w-full" onClick={() => openForm(listing.id)}><Pencil size={15} /> Editar</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={pausar}>
              {listing.status === "paused" ? <><Play size={15} /> Reativar</> : <><Pause size={15} /> Pausar</>}
            </Button>
            <Button variant="danger" onClick={eliminar}><Trash2 size={15} /> Eliminar</Button>
          </div>
        </CardContent>
      </Card>
      <AtividadeAnuncio listing={listing} />
    </div>
  );
}

/** Vista do autor: quem guardou (agregado) e quem manifestou interesse. */
function AtividadeAnuncio({ listing }: { listing: L }) {
  const navigate = useNavigate();
  const interesses = useInterestsStore((s) =>
    s.interests.filter((i) => i.listingId === listing.id && i.userId !== CURRENT_USER_ID)
  );
  const profiles = useProfilesStore((s) => s.profiles);
  const getOrCreate = useConversationsStore((s) => s.getOrCreate);

  const responder = (userId: string) => {
    const convId = getOrCreate(userId, "listing", listing.id);
    navigate(`/mensagens?c=${convId}`);
  };

  const ordenados = [...interesses].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <Card>
      <CardContent className="space-y-3">
        <SectionHeader title="Atividade do anúncio" />
        <div className="grid grid-cols-3 gap-2 text-center">
          <Mini label="Views" value={listing.viewsCount} />
          <Mini label="Guardados" value={listing.savedCount} />
          <Mini label="Interesses" value={ordenados.length} />
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted">
          <Heart size={12} className="fill-gold text-gold" /> {listing.savedCount} investidores guardaram este anúncio. Os guardados são privados — só os interesses revelam quem é.
        </p>

        {ordenados.length > 0 && (
          <div className="space-y-2 border-t border-line/60 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Interessados</p>
            {ordenados.map((i) => {
              const p = profiles.find((x) => x.id === i.userId);
              return (
                <div key={i.id} className="rounded-xl border border-line bg-bg/40 p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                      {p?.avatarUrl ? (
                        <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-secondary text-xs font-semibold text-white">
                          {(p?.fullName ?? "?")[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-[13px] font-medium text-ink">
                        {p?.fullName ?? "Investidor"}
                        {p?.isVerified && <BadgeCheck size={12} className="text-gold-dark" />}
                      </p>
                      <p className="text-[11px] text-muted">
                        {p && p.projetosConcluidos > 0
                          ? `${p.projetosConcluidos} projetos · ★ ${p.rating.toFixed(1)}`
                          : "novo na rede"}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => responder(i.userId)}>
                      <MessageCircle size={13} /> Responder
                    </Button>
                  </div>
                  {i.message && (
                    <p className="mt-2 line-clamp-2 rounded-lg bg-accent/50 px-2.5 py-1.5 text-[12px] italic text-secondary">
                      "{i.message}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-bg p-2">
      <p className="num text-base font-bold text-ink">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
