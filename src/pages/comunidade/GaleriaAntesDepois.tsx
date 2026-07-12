import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  Images,
  X,
  ChevronLeft,
  ChevronRight,
  Star,
  Share2,
  Hammer,
  Coins,
  Clock3,
  TrendingUp,
  User2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExampleDataToggle } from "@/components/ExampleDataToggle";
import { useExampleData } from "@/store/useExampleData";
import { useModalStore } from "@/store/useModalStore";
import { useGaleriaStore, DIVISAO_LABEL, duracaoLabel, type Comparacao, type Divisao } from "@/store/useGaleriaStore";
import { useObrasStore } from "@/store/useObrasStore";
import { useCollabStore } from "@/store/useCollabStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useProfilesStore } from "@/store/useProfilesStore";
import { BeforeAfterSlider } from "@/components/galeria/BeforeAfterSlider";
import { ComparacaoCard, ContextoReal, DIVISAO_ICON } from "@/components/galeria/ComparacaoCard";
import { ShareComparacaoModal } from "@/components/galeria/ShareComparacaoModal";
import { eur, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

type TipoFiltro = "todos" | "reabilitacao" | "arrendamento";

export default function GaleriaAntesDepois() {
  const { enabled } = useExampleData();
  const comparacoes = useGaleriaStore((s) => s.comparacoes);
  const openGaleriaForm = useModalStore((s) => s.openGaleriaForm);
  const projects = useCollabStore((s) => s.projects);
  const properties = usePropertiesStore((s) => s.properties);
  const [params, setParams] = useSearchParams();

  const [origem, setOrigem] = useState("todos"); // "todos" | proj:id | prop:id
  const [divisao, setDivisao] = useState<"todas" | Divisao>("todas");
  const [tipo, setTipo] = useState<TipoFiltro>("todos");
  const [soDestaques, setSoDestaques] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null); // lightbox
  const [partilhar, setPartilhar] = useState<Comparacao | null>(null);

  const base = enabled ? comparacoes : [];

  // Deep-link ?c=<id> abre diretamente o lightbox dessa comparação
  useEffect(() => {
    const c = params.get("c");
    if (c && base.some((x) => x.id === c)) {
      setAberta(c);
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, base.length]);

  const tipoDe = (c: Comparacao): TipoFiltro => {
    if (c.projectId) {
      const p = projects.find((x) => x.id === c.projectId);
      if (p) return p.type;
    }
    return "arrendamento"; // imóvel solo = carteira de rendimento
  };

  const filtradas = useMemo(() => {
    return base
      .filter((c) => {
        if (origem !== "todos") {
          if (origem.startsWith("proj:") && c.projectId !== origem.slice(5)) return false;
          if (origem.startsWith("prop:") && c.propertyId !== origem.slice(5)) return false;
        }
        if (divisao !== "todas" && c.divisao !== divisao) return false;
        if (tipo !== "todos" && tipoDe(c) !== tipo) return false;
        if (soDestaques && !c.destaque) return false;
        return true;
      })
      .sort((a, b) => Number(b.destaque) - Number(a.destaque) || (a.createdAt < b.createdAt ? 1 : -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, origem, divisao, tipo, soDestaques, projects]);

  // Faixa de impacto — números que impressionam, calculados das comparações
  const impacto = useMemo(() => {
    const n = base.length;
    const investimento = base.reduce((a, c) => a + c.custoReal, 0);
    const valorizacao = base.reduce((a, c) => a + (c.valorizacaoEstimada ?? 0), 0);
    const tempoMedio = n > 0 ? Math.round(base.reduce((a, c) => a + c.duracaoDias, 0) / n) : 0;
    return { n, investimento, valorizacao, tempoMedio };
  }, [base]);

  // Origens presentes nas comparações (para o filtro)
  const origens = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    base.forEach((c) => {
      if (c.projectId) {
        const key = `proj:${c.projectId}`;
        if (!list.some((o) => o.key === key)) {
          const p = projects.find((x) => x.id === c.projectId);
          list.push({ key, label: p ? p.title : c.projectId! });
        }
      } else if (c.propertyId) {
        const key = `prop:${c.propertyId}`;
        if (!list.some((o) => o.key === key)) {
          const p = properties.find((x) => x.id === c.propertyId);
          list.push({ key, label: p ? p.name : c.propertyId! });
        }
      }
    });
    return list;
  }, [base, projects, properties]);

  const divisoesPresentes = useMemo(
    () => (Object.keys(DIVISAO_LABEL) as Divisao[]).filter((d) => base.some((c) => c.divisao === d)),
    [base]
  );

  const idxAberta = filtradas.findIndex((c) => c.id === aberta);
  const comparacaoAberta = idxAberta >= 0 ? filtradas[idxAberta] : base.find((c) => c.id === aberta) ?? null;

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      {/* Hero Comunidade */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2E1A0E] via-[#5C3D2E] to-[#3a2417] px-6 pb-20 pt-12 text-sidebar-text sm:px-10">
        <div className="azulejo absolute inset-0 opacity-[0.06]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="mb-2 flex items-center gap-2 text-sm text-gold-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Comunidade
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
                Antes <span className="italic text-gold">&</span> Depois
              </h1>
              <p className="mt-2 max-w-xl text-sidebar-text/70">A prova visual do seu trabalho.</p>
            </div>
            <div className="flex items-center gap-3">
              <ExampleDataToggle />
              <Button variant="gold" onClick={() => openGaleriaForm()}>
                <Plus size={16} /> Nova comparação
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        {/* Faixa de impacto */}
        <div className="-mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Impacto icone={Images} label="Transformações" valor={String(impacto.n)} />
          <Impacto icone={Coins} label="Investimento em obras" valor={eur(impacto.investimento)} />
          <Impacto icone={TrendingUp} label="Valorização estimada" valor={impacto.valorizacao > 0 ? `+${eur(impacto.valorizacao)}` : "—"} verde />
          <Impacto icone={Clock3} label="Tempo médio por obra" valor={impacto.tempoMedio > 0 ? duracaoLabel(impacto.tempoMedio) : "—"} />
        </div>

        {/* Filtros */}
        {base.length > 0 && (
          <div className="mt-6 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip ativo={origem === "todos"} onClick={() => setOrigem("todos")}>Todos os projetos</Chip>
              {origens.map((o) => (
                <Chip key={o.key} ativo={origem === o.key} onClick={() => setOrigem(o.key)}>{o.label}</Chip>
              ))}
              <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
              <Chip ativo={tipo === "todos"} onClick={() => setTipo("todos")}>Todas</Chip>
              <Chip ativo={tipo === "reabilitacao"} onClick={() => setTipo("reabilitacao")}>Reabilitação</Chip>
              <Chip ativo={tipo === "arrendamento"} onClick={() => setTipo("arrendamento")}>Arrendamento</Chip>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip ativo={divisao === "todas"} onClick={() => setDivisao("todas")}>Todas as divisões</Chip>
              {divisoesPresentes.map((d) => {
                const Icon = DIVISAO_ICON[d];
                return (
                  <Chip key={d} ativo={divisao === d} onClick={() => setDivisao(d)}>
                    <Icon size={12} className="mr-1 inline" />{DIVISAO_LABEL[d]}
                  </Chip>
                );
              })}
              <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
              <Chip ativo={soDestaques} onClick={() => setSoDestaques((v) => !v)}>
                <Star size={12} className={cn("mr-1 inline", soDestaques && "fill-current")} /> Só destaques
              </Chip>
            </div>
          </div>
        )}

        {/* Grelha */}
        {base.length === 0 ? (
          <Vazio onCriar={() => openGaleriaForm()} exemploOff={!enabled} />
        ) : filtradas.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-line bg-card/50 px-6 py-12 text-center text-sm text-muted">
            Nenhuma comparação com estes filtros.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtradas.map((c) => (
              <ComparacaoCard
                key={c.id}
                c={c}
                onAmpliar={() => setAberta(c.id)}
                onPartilhar={() => setPartilhar(c)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {comparacaoAberta && (
        <Lightbox
          c={comparacaoAberta}
          onClose={() => setAberta(null)}
          onPrev={idxAberta > 0 ? () => setAberta(filtradas[idxAberta - 1].id) : undefined}
          onNext={idxAberta >= 0 && idxAberta < filtradas.length - 1 ? () => setAberta(filtradas[idxAberta + 1].id) : undefined}
          onPartilhar={() => setPartilhar(comparacaoAberta)}
        />
      )}

      {partilhar && <ShareComparacaoModal comparacao={partilhar} onClose={() => setPartilhar(null)} />}
    </div>
  );
}

// ───────────────────── Peças ─────────────────────

function Impacto({ icone: Icon, label, valor, verde }: { icone: typeof Images; label: string; valor: string; verde?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
        <Icon size={13} className="text-gold-dark" /> {label}
      </p>
      <p className={cn("num mt-1 font-display text-2xl font-bold", verde ? "text-success" : "text-ink")}>{valor}</p>
    </div>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        ativo ? "bg-primary text-white" : "border border-line bg-card text-muted hover:bg-accent hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

function Vazio({ onCriar, exemploOff }: { onCriar: () => void; exemploOff: boolean }) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center">
      <Images size={32} className="mx-auto mb-3 text-gold-dark" />
      <h3 className="font-display text-lg font-semibold text-ink">Ainda sem comparações</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">
        {exemploOff
          ? "Ative os dados de exemplo ou crie a primeira comparação a partir das fotos de uma obra."
          : "Crie a primeira comparação a partir das fotos que já tem nas obras."}
      </p>
      <Button variant="gold" className="mt-4" onClick={onCriar}>
        <Plus size={15} /> Nova comparação
      </Button>
    </div>
  );
}

// ───────────────────── Lightbox ─────────────────────

function Lightbox({
  c,
  onClose,
  onPrev,
  onNext,
  onPartilhar,
}: {
  c: Comparacao;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onPartilhar: () => void;
}) {
  const obra = useObrasStore((s) => s.obras.find((o) => o.id === c.obraId));
  const fases = useObrasStore((s) => s.fases.filter((f) => f.obraId === c.obraId));
  const despesas = useObrasStore((s) => s.despesas.filter((d) => d.obraId === c.obraId));
  const projects = useCollabStore((s) => s.projects);
  const properties = usePropertiesStore((s) => s.properties);
  const autor = useProfilesStore((s) => s.profiles.find((p) => p.id === c.criadoPor));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  const origem = c.projectId
    ? (() => { const p = projects.find((x) => x.id === c.projectId); return p ? { label: `#${p.number} ${p.title}`, href: `/comunidade/colaborativa/${p.id}` } : null; })()
    : c.propertyId
      ? (() => { const p = properties.find((x) => x.id === c.propertyId); return p ? { label: p.name, href: `/imoveis/${p.id}` } : null; })()
      : null;

  const durante = [
    ...(obra?.fotos ?? []),
    ...despesas.flatMap((d) => d.fotos ?? []),
  ].filter((u) => u !== c.fotoAntesUrl && u !== c.fotoDepoisUrl);

  const duracaoPrevista = obra ? Math.max(1, Math.round((new Date(obra.dataFimPrevista).getTime() - new Date(obra.dataInicio).getTime()) / 86400000)) : null;
  const Icon = DIVISAO_ICON[c.divisao];

  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-ink/95 lg:flex-row" onClick={onClose}>
      {/* Slider grande */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="w-full max-w-4xl">
          <BeforeAfterSlider antes={c.fotoAntesUrl} depois={c.fotoDepoisUrl} alt={c.titulo} className="aspect-[4/3] sm:aspect-video" />
        </div>
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20">
          <X size={20} />
        </button>
        {onPrev && (
          <button onClick={onPrev} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20">
            <ChevronLeft size={22} />
          </button>
        )}
        {onNext && (
          <button onClick={onNext} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 lg:right-3">
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Painel lateral */}
      <div
        className="max-h-[45vh] w-full shrink-0 overflow-y-auto border-t border-white/10 bg-card lg:max-h-none lg:w-[360px] lg:border-l lg:border-t-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4 p-5">
          <div>
            <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-secondary">
              <Icon size={11} /> {DIVISAO_LABEL[c.divisao]}
            </span>
            <h2 className="font-display text-xl font-bold text-ink">{c.titulo}</h2>
            {autor && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted"><User2 size={12} /> {autor.fullName} · {dataPT(c.createdAt)}</p>
            )}
          </div>

          <ContextoReal c={c} />

          {c.descricao && <p className="text-sm leading-relaxed text-muted">{c.descricao}</p>}

          {/* Obra de origem */}
          {obra && (
            <div className="rounded-xl border border-line bg-bg/40 p-3.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Obra de origem</p>
              <Link to={`/obra/${obra.id}`} className="flex items-center gap-2 text-sm font-semibold text-ink hover:text-gold-dark hover:underline">
                <Hammer size={14} className="text-gold-dark" /> {obra.titulo}
              </Link>
              {origem && (
                <Link to={origem.href} className="mt-0.5 block text-xs text-muted hover:underline">{origem.label}</Link>
              )}
              {obra.empreiteiro && <p className="mt-1.5 text-xs text-muted">Técnico: <span className="font-medium text-ink">{obra.empreiteiro}</span></p>}
              {duracaoPrevista && (
                <p className="mt-0.5 text-xs text-muted">
                  Duração real <span className="num font-medium text-ink">{duracaoLabel(c.duracaoDias)}</span> · prevista{" "}
                  <span className={cn("num font-medium", c.duracaoDias > duracaoPrevista ? "text-danger" : "text-success")}>{duracaoLabel(duracaoPrevista)}</span>
                </p>
              )}
              {fases.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {fases.map((f) => (
                    <span key={f.id} className="rounded-full border border-line bg-card px-2 py-0.5 text-[10px] text-muted">{f.titulo}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custo detalhado — breakdown das despesas reais */}
          {despesas.length > 0 && (
            <div className="rounded-xl border border-line bg-bg/40 p-3.5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Custo detalhado</p>
              <div className="space-y-1">
                {despesas.map((d) => (
                  <div key={d.id} className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="truncate text-muted">{d.descricao}</span>
                    <span className="num shrink-0 font-medium text-ink">{eur(d.valor)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm">
                <span className="font-semibold text-ink">Total registado</span>
                <span className="num font-bold text-gold-dark">{eur(despesas.reduce((a, d) => a + d.valor, 0))}</span>
              </div>
            </div>
          )}

          {/* Fotos "durante" */}
          {durante.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Durante a obra</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {durante.map((u, i) => (
                  <img key={i} src={u} alt="" className="h-16 w-24 shrink-0 rounded-lg border border-line object-cover" />
                ))}
              </div>
            </div>
          )}

          <Button variant="gold" className="w-full" onClick={onPartilhar}>
            <Share2 size={15} /> Partilhar esta transformação
          </Button>
        </div>
      </div>
    </div>
  );
}
