import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  BadgeCheck,
  Star,
  Map as MapIcon,
  LayoutGrid,
  SlidersHorizontal,
  X,
  Heart,
  Hourglass,
  MessageCircle,
  Handshake,
  Hammer,
  KeyRound,
  ShieldCheck,
  Wallet,
  Users,
  TrendingUp,
  Building2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ListingCard } from "@/components/rede/ListingCard";
import { useExampleData } from "@/store/useExampleData";
import { useModalStore } from "@/store/useModalStore";
import {
  useListingsStore,
  TYPE_LABEL_SHORT,
  TIPO_CEDENCIA_LABEL_SHORT,
  type Listing,
  type ListingType,
  type EstadoAnuncio,
  type TipoCedencia,
  DISTRITOS,
  CIDADES,
} from "@/store/useListingsStore";
import { useProfilesStore, CURRENT_USER_ID, type Profile } from "@/store/useProfilesStore";
import { useSavedStore } from "@/store/useSavedStore";
import { useInterestsStore } from "@/store/useInterestsStore";
import { capitalDoAnuncio, roiDoAnuncio, yieldDoAnuncio, retornoEntradaCedencia } from "@/lib/calc/rede";
import { eur, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

type CapitalFiltro = "todos" | "ate25" | "25a50" | "50a100" | "mais100";

const CAPITAL_PILLS: { key: CapitalFiltro; label: string; test: (v: number) => boolean }[] = [
  { key: "todos", label: "Qualquer", test: () => true },
  { key: "ate25", label: "< 25.000 €", test: (v) => v < 25000 },
  { key: "25a50", label: "25–50.000 €", test: (v) => v >= 25000 && v <= 50000 },
  { key: "50a100", label: "50–100.000 €", test: (v) => v > 50000 && v <= 100000 },
  { key: "mais100", label: "> 100.000 €", test: (v) => v > 100000 },
];

type Ordenar = "recentes" | "roi" | "capital" | "fechar";

const ORDENAR_LABEL: Record<Ordenar, string> = {
  recentes: "Mais recentes",
  roi: "Maior ROI",
  capital: "Menor capital",
  fechar: "A fechar",
};

type RedeTab = "anuncios" | "investidores" | "guardados";

const UNSPLASH = (id: string, w = 1200, q = 72) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`;
const HERO_IMG = UNSPLASH("1505691938895-1758d7feb511", 1800, 68);
const CATEGORIA_IMG: Record<ListingType, string> = {
  reabilitacao: UNSPLASH("1503387762-592deb58ef4e", 800),
  cedencia: UNSPLASH("1560448204-e02f11c3d0e2", 800),
  arrendamento: UNSPLASH("1502672260266-1c1ef2d93688", 800),
};
const CATEGORIA_ICON: Record<ListingType, typeof Hammer> = {
  reabilitacao: Hammer,
  cedencia: Handshake,
  arrendamento: KeyRound,
};
const CATEGORIA_DESC: Record<ListingType, string> = {
  reabilitacao: "Capital para comprar, recuperar e revender com margem.",
  cedencia: "Entre num negócio antes da escritura, com desconto.",
  arrendamento: "Imóveis prontos a render — rendimento passivo.",
};

/** Dias até ao término do CPCV (null se não definido). */
function diasAteFecho(l: Listing): number | null {
  if (!l.terminoCpcv) return null;
  const t = new Date(`${l.terminoCpcv}T00:00:00`).getTime();
  if (!isFinite(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

/** Prazo (meses) do anúncio para o filtro "Prazo máximo". Sem prazo conhecido → null (passa). */
function prazoMesesDoAnuncio(l: Listing): number | null {
  if (l.type === "reabilitacao" && l.tempoAteVenda) {
    const m = l.tempoAteVenda.match(/(\d+)/);
    return m ? Number(m[1]) : null;
  }
  if (l.type === "cedencia") {
    const dias = diasAteFecho(l);
    return dias !== null && dias >= 0 ? Math.max(1, Math.round(dias / 30)) : null;
  }
  return null;
}

/** 4.200.000 → "4,2 M€"; abaixo de 1M usa o formato normal. */
function capitalCurto(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} M€`;
  return eur(v);
}

export default function RedeInvestidores() {
  const { enabled } = useExampleData();
  const listings = useListingsStore((s) => s.listings);
  const profiles = useProfilesStore((s) => s.profiles);
  const savedIds = useSavedStore((s) => s.savedIds);
  const interests = useInterestsStore((s) => s.interests);
  const openListingForm = useModalStore((s) => s.openListingForm);
  const [params, setParams] = useSearchParams();

  const tabParam = params.get("tab");
  const tab: RedeTab = tabParam === "guardados" || tabParam === "investidores" ? tabParam : "anuncios";

  const catParam = params.get("cat");
  const categoria: "todas" | ListingType =
    catParam === "reabilitacao" || catParam === "cedencia" || catParam === "arrendamento" ? catParam : "todas";

  // Guardar tab + categoria na URL para o filtro persistir ao voltar (seta do navegador).
  const patchParams = (patch: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const nextP = new URLSearchParams(prev);
        for (const [k, val] of Object.entries(patch)) {
          if (val == null || val === "") nextP.delete(k);
          else nextP.set(k, val);
        }
        return nextP;
      },
      { replace: true }
    );

  const setTab = (t: RedeTab) => patchParams({ tab: t === "anuncios" ? null : t });
  const setCategoria = (c: "todas" | ListingType) => patchParams({ cat: c === "todas" ? null : c });
  const [capital, setCapital] = useState<CapitalFiltro>("todos");
  const [distrito, setDistrito] = useState("todos");
  const [cidade, setCidade] = useState("todos");
  const [roiMin, setRoiMin] = useState(0);
  const [prazoMax, setPrazoMax] = useState(0); // meses · 0 = qualquer
  const [yieldMin, setYieldMin] = useState(0);
  const [retEntradaMin, setRetEntradaMin] = useState(0);
  const [tiposCedencia, setTiposCedencia] = useState<TipoCedencia[]>([]);
  const [estados, setEstados] = useState<EstadoAnuncio[]>([]);
  const [busca, setBusca] = useState("");
  const [ordenar, setOrdenar] = useState<Ordenar>("recentes");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visiveis, setVisiveis] = useState(9);

  const gridRef = useRef<HTMLDivElement>(null);

  // Sticky: sentinela logo após a faixa de estatísticas — quando sai de vista, a barra "colou".
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const baseListings = enabled ? listings.filter((l) => l.status !== "closed") : [];
  const savedGuardados = baseListings.filter((l) => savedIds.includes(l.id));

  // Estatísticas em tempo real dos anúncios ativos.
  const ativos = baseListings.filter((l) => l.estadoAnuncio === "ativo");
  const capitalAtivo = ativos.reduce((s, l) => s + capitalDoAnuncio(l), 0);
  const roiMedio = useMemo(() => {
    const vals = ativos.map(roiDoAnuncio).filter((v) => v > 0);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  }, [ativos]);
  const contagemPorTipo = (t: ListingType) => ativos.filter((l) => l.type === t).length;

  const interessesPorAnuncio = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of interests) m.set(i.listingId, (m.get(i.listingId) ?? 0) + 1);
    return m;
  }, [interests]);

  // "Fecham em breve": ativos com escritura <30 dias OU ≥2 interesses reais. Máx. 3.
  const fechamEmBreve = useMemo(() => {
    return ativos
      .map((l) => ({ l, dias: diasAteFecho(l), nInt: interessesPorAnuncio.get(l.id) ?? 0 }))
      .filter((x) => (x.dias !== null && x.dias >= 0 && x.dias < 30) || x.nInt >= 2)
      .sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999))
      .slice(0, 3);
  }, [ativos, interessesPorAnuncio]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const capTest = CAPITAL_PILLS.find((c) => c.key === capital)!.test;
    return baseListings
      .filter((l) => categoria === "todas" || l.type === categoria)
      .filter((l) => capTest(capitalDoAnuncio(l)))
      .filter((l) => distrito === "todos" || l.district === distrito)
      .filter((l) => cidade === "todos" || l.city === cidade)
      .filter((l) => roiMin === 0 || roiDoAnuncio(l) >= roiMin)
      .filter((l) => {
        if (prazoMax === 0) return true;
        const meses = prazoMesesDoAnuncio(l);
        return meses === null || meses <= prazoMax;
      })
      .filter((l) => yieldMin === 0 || (l.type === "arrendamento" && yieldDoAnuncio(l) >= yieldMin))
      .filter((l) => {
        if (retEntradaMin === 0) return true;
        if (l.type !== "cedencia") return true; // só aplica a cedências
        return retornoEntradaCedencia(l) >= retEntradaMin;
      })
      .filter((l) => {
        if (tiposCedencia.length === 0) return true;
        if (l.type !== "cedencia") return categoria === "cedencia" ? false : true;
        return l.tipoCedencia ? tiposCedencia.includes(l.tipoCedencia) : false;
      })
      .filter((l) => estados.length === 0 || estados.includes(l.estadoAnuncio))
      .filter((l) => {
        if (!q) return true;
        return (
          l.title.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.district.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (ordenar === "roi") return roiDoAnuncio(b) - roiDoAnuncio(a);
        if (ordenar === "capital") return capitalDoAnuncio(a) - capitalDoAnuncio(b);
        if (ordenar === "fechar") {
          const da = diasAteFecho(a);
          const db = diasAteFecho(b);
          return (da !== null && da >= 0 ? da : 9999) - (db !== null && db >= 0 ? db : 9999);
        }
        return a.createdAt < b.createdAt ? 1 : -1;
      });
  }, [baseListings, categoria, capital, distrito, cidade, roiMin, prazoMax, yieldMin, retEntradaMin, tiposCedencia, estados, busca, ordenar]);

  const activeFilters =
    (capital !== "todos" ? 1 : 0) +
    (distrito !== "todos" ? 1 : 0) +
    (cidade !== "todos" ? 1 : 0) +
    (roiMin > 0 ? 1 : 0) +
    (prazoMax > 0 ? 1 : 0) +
    (yieldMin > 0 ? 1 : 0) +
    (retEntradaMin > 0 ? 1 : 0) +
    (tiposCedencia.length > 0 ? 1 : 0) +
    (estados.length > 0 ? 1 : 0);

  const haFiltro = activeFilters > 0 || categoria !== "todas" || busca.trim().length > 0;
  // Modo descoberta: a home "de montra" (sem filtros) mostra as secções de marketing.
  const descoberta = tab === "anuncios" && !haFiltro;

  useEffect(() => {
    setVisiveis(9);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, capital, distrito, cidade, roiMin, prazoMax, yieldMin, retEntradaMin, tiposCedencia, estados, busca, ordenar, tab]);

  const resetFiltros = () => {
    setCapital("todos");
    setDistrito("todos");
    setCidade("todos");
    setRoiMin(0);
    setPrazoMax(0);
    setYieldMin(0);
    setRetEntradaMin(0);
    setTiposCedencia([]);
    setEstados([]);
  };

  const toggleTipoCedencia = (t: TipoCedencia) =>
    setTiposCedencia((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const toggleEstado = (e: EstadoAnuncio) =>
    setEstados((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));

  const irParaGrelha = () => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const escolherCategoria = (c: "todas" | ListingType) => {
    setTab("anuncios");
    setCategoria(c);
    setTimeout(irParaGrelha, 60);
  };

  const chipsAtivos: { label: string; clear: () => void }[] = [
    ...(capital !== "todos" ? [{ label: CAPITAL_PILLS.find((c) => c.key === capital)!.label, clear: () => setCapital("todos") }] : []),
    ...(distrito !== "todos" ? [{ label: distrito, clear: () => setDistrito("todos") }] : []),
    ...(cidade !== "todos" ? [{ label: cidade, clear: () => setCidade("todos") }] : []),
    ...(roiMin > 0 ? [{ label: `ROI ≥ ${roiMin}%`, clear: () => setRoiMin(0) }] : []),
    ...(prazoMax > 0 ? [{ label: `Prazo ≤ ${prazoMax} meses`, clear: () => setPrazoMax(0) }] : []),
    ...estados.map((e) => ({ label: e === "concluido" ? "Concluído" : e === "financiado" ? "Financiado" : "Ativo", clear: () => toggleEstado(e) })),
    ...tiposCedencia.map((t) => ({ label: TIPO_CEDENCIA_LABEL_SHORT[t], clear: () => toggleTipoCedencia(t) })),
    ...(yieldMin > 0 ? [{ label: `Yield ≥ ${yieldMin}%`, clear: () => setYieldMin(0) }] : []),
    ...(retEntradaMin > 0 ? [{ label: `Ret. entrada ≥ ${retEntradaMin}%`, clear: () => setRetEntradaMin(0) }] : []),
  ];

  const directoryProfiles = profiles.filter((p) => p.id !== CURRENT_USER_ID);
  const verificados = directoryProfiles.filter((p) => p.isVerified).length;
  const destaqueInvestidores = useMemo(
    () => [...directoryProfiles].sort((a, b) => b.rating * b.numAvaliacoes - a.rating * a.numAvaliacoes).slice(0, 8),
    [directoryProfiles]
  );

  const anunciosPorAutor = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of ativos) m.set(l.authorId, (m.get(l.authorId) ?? 0) + 1);
    return m;
  }, [ativos]);

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      {/* ───────── HERO fotográfico ───────── */}
      <div className="relative overflow-hidden text-sidebar-text">
        <img src={HERO_IMG} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#2E1A0E]/95 via-[#5C3D2E]/90 to-[#3a2417]/85" />
        <div className="azulejo absolute inset-0 opacity-[0.07]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-gold-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Marketplace de investimento imobiliário
          </span>
          <h1 className="mt-4 max-w-2xl text-[30px] font-semibold leading-[1.1] text-[#F9F1E2] sm:text-[40px]">
            Onde o capital encontra o negócio certo.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-sidebar-text/75 sm:text-[15px]">
            Parcerias, cedências de posição e imóveis a render — direto entre investidores, sem intermediários.
          </p>

          {/* Pesquisa */}
          <div className="mt-6 flex max-w-2xl flex-col gap-2 rounded-xl border border-white/15 bg-white/95 p-1.5 shadow-lg sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 px-3">
              <Search size={18} className="text-muted" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Cidade, distrito ou tipo de negócio"
                className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
              {busca && (
                <button onClick={() => setBusca("")} className="text-muted hover:text-ink">
                  <X size={15} />
                </button>
              )}
            </div>
            <Button variant="gold" className="sm:w-auto" onClick={() => { setTab("anuncios"); irParaGrelha(); }}>
              Explorar oportunidades
            </Button>
          </div>

          {/* Confiança */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-sidebar-text/70">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-gold-soft" /> <span className="num">{verificados}</span> investidores verificados
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={15} className="text-gold-soft" /> <span className="num">{ativos.length}</span> negócios ativos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wallet size={15} className="text-gold-soft" /> <span className="num">{capitalCurto(capitalAtivo)}</span> em procura
            </span>
          </div>
        </div>
      </div>

      {/* ───────── Faixa de estatísticas (sobrepõe o hero) ───────── */}
      {enabled && (
        <div className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-card p-4 shadow-md sm:grid-cols-4 sm:p-5">
            <EstatItem icon={Building2} label="Oportunidades ativas" value={String(ativos.length)} />
            <EstatItem icon={Wallet} label="Capital procurado" value={capitalCurto(capitalAtivo)} />
            <EstatItem icon={TrendingUp} label="ROI médio" value={pct(roiMedio, 0)} />
            <EstatItem icon={Users} label="Investidores" value={String(profiles.length)} />
          </div>
        </div>
      )}

      <div ref={sentinelRef} className="h-px" />

      {/* ───────── Barra sticky: tabs + categorias + ordenar + filtros ───────── */}
      <div className={cn("sticky top-0 z-30 mt-6 transition-colors", stuck && "border-b border-line bg-bg/95 shadow-sm backdrop-blur-sm")}>
        <div className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-line bg-card p-1 shadow-sm">
              {(["anuncios", "investidores", "guardados"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:px-5",
                    tab === t ? "bg-gold text-sidebar" : "text-muted hover:text-ink"
                  )}
                >
                  {t === "anuncios" ? (
                    "Anúncios"
                  ) : t === "investidores" ? (
                    "Investidores"
                  ) : (
                    <>
                      <Heart size={13} className={cn(tab === t && "fill-sidebar")} />
                      Guardados{savedGuardados.length > 0 ? ` (${savedGuardados.length})` : ""}
                    </>
                  )}
                </button>
              ))}
            </div>
            <Button variant="gold" size="sm" onClick={() => openListingForm()}>
              <Plus size={15} /> Publicar anúncio
            </Button>
          </div>

          {tab === "anuncios" && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex flex-1 gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
                <Chip ativo={categoria === "todas"} onClick={() => setCategoria("todas")}>
                  Todas
                </Chip>
                {(Object.keys(TYPE_LABEL_SHORT) as ListingType[]).map((t) => (
                  <Chip key={t} ativo={categoria === t} onClick={() => setCategoria(t)}>
                    {TYPE_LABEL_SHORT[t]}
                  </Chip>
                ))}
              </div>
              <select
                value={ordenar}
                onChange={(e) => setOrdenar(e.target.value as Ordenar)}
                className="h-9 shrink-0 rounded-md border border-line bg-card px-2 text-sm text-muted outline-none focus:border-secondary"
                title="Ordenar"
              >
                {(Object.keys(ORDENAR_LABEL) as Ordenar[]).map((o) => (
                  <option key={o} value={o}>{ORDENAR_LABEL[o]}</option>
                ))}
              </select>
              <button
                onClick={() => setDrawerOpen(true)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm",
                  activeFilters > 0 ? "border-gold/40 bg-gold/10 text-gold-dark" : "border-line bg-card text-muted hover:bg-accent"
                )}
              >
                <SlidersHorizontal size={14} /> Filtros{activeFilters > 0 ? ` · ${activeFilters}` : ""}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {tab === "anuncios" ? (
          <>
            {/* Categorias de entrada — só na montra */}
            {enabled && descoberta && (
              <div className="mb-8">
                <div className="grid gap-4 sm:grid-cols-3">
                  {(Object.keys(TYPE_LABEL_SHORT) as ListingType[]).map((t) => (
                    <CategoriaCard key={t} tipo={t} count={contagemPorTipo(t)} onClick={() => escolherCategoria(t)} />
                  ))}
                </div>
              </div>
            )}

            {/* Chips dos filtros ativos (removíveis) */}
            {chipsAtivos.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                {chipsAtivos.map((c) => (
                  <span key={c.label} className="inline-flex items-center gap-1 rounded bg-accent px-2 py-[3px] text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
                    {c.label}
                    <button onClick={c.clear} className="hover:text-ink" title="Remover filtro">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Fecham em breve */}
            {enabled && fechamEmBreve.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
                    <Hourglass size={14} className="text-warning" /> Fecham em breve
                  </h2>
                  <button onClick={() => { setOrdenar("fechar"); irParaGrelha(); }} className="text-xs font-medium text-secondary hover:underline">
                    ver todos →
                  </button>
                </div>
                <div className="flex gap-5 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
                  {fechamEmBreve.map(({ l, dias, nInt }) => (
                    <div key={l.id} className="relative w-[280px] shrink-0 sm:w-auto">
                      <span className="absolute -top-2.5 left-3 z-10 inline-flex items-center gap-1 rounded bg-[#F6E8D3] px-2 py-[3px] text-[11px] font-medium uppercase tracking-[0.04em] text-warning shadow-sm">
                        {dias !== null && dias >= 0 && dias < 30 ? (
                          <>
                            <Hourglass size={11} /> {dias} {dias === 1 ? "dia" : "dias"}
                          </>
                        ) : (
                          `${nInt} interessados`
                        )}
                      </span>
                      <ListingCard listing={l} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cabeçalho da grelha */}
            <div ref={gridRef} className="mb-4 flex items-center gap-2 text-[13px] text-muted">
              {enabled ? (
                haFiltro ? (
                  <>
                    {filtered.length} de {baseListings.length} oportunidades ·{" "}
                    <button onClick={resetFiltros} className="font-medium text-secondary hover:underline">
                      Limpar filtros
                    </button>
                  </>
                ) : (
                  <span className="text-[13px] font-semibold uppercase tracking-[0.06em]">
                    Todas as oportunidades <span className="font-normal normal-case text-muted">· {baseListings.length}</span>
                  </span>
                )
              ) : (
                "Sem dados de exemplo"
              )}
            </div>

            {/* Grelha */}
            {!enabled ? (
              <p className="rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center text-sm text-muted">
                Ative o toggle «Dados de exemplo» (no topo da app) para explorar a Rede, ou publique o primeiro anúncio.
              </p>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center">
                <p className="text-sm text-muted">Nenhum anúncio corresponde aos filtros.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={resetFiltros}>
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.slice(0, visiveis).map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
                </div>
                {filtered.length > visiveis && (
                  <div className="mt-6 flex justify-center">
                    <Button variant="outline" onClick={() => setVisiveis((v) => v + 9)}>
                      Carregar mais ({filtered.length - visiveis})
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Investidores em destaque — só na montra */}
            {enabled && descoberta && destaqueInvestidores.length > 0 && (
              <div className="mt-12">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">Investidores em destaque</h2>
                  <button onClick={() => setTab("investidores")} className="text-xs font-medium text-secondary hover:underline">
                    ver diretório →
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {destaqueInvestidores.map((p) => (
                    <InvestidorChip key={p.id} profile={p} anuncios={anunciosPorAutor.get(p.id) ?? 0} />
                  ))}
                </div>
              </div>
            )}

            {/* Porquê a REDEGEST — banda de confiança (montra) */}
            {descoberta && (
              <div className="mt-12 grid gap-6 rounded-2xl border border-line bg-card p-6 sm:grid-cols-3 sm:p-8">
                <ValorProp icon={ShieldCheck} titulo="Identidades verificadas" texto="Cada investidor com selo passou por verificação de identidade na plataforma." />
                <ValorProp icon={MessageCircle} titulo="Contacto direto" texto="Fale diretamente com o dono do negócio — a morada exata é partilhada após o interesse." />
                <ValorProp icon={Wallet} titulo="Sem comissões" texto="A REDEGEST liga capital a negócio. Sem intermediários, sem taxas de sucesso." />
              </div>
            )}

            {/* CTA publicar — montra */}
            {descoberta && (
              <div className="relative mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-[#2E1A0E] via-[#5C3D2E] to-[#3a2417] px-6 py-8 text-sidebar-text sm:px-10">
                <div className="azulejo absolute inset-0 opacity-[0.06]" />
                <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-xl font-semibold text-[#F9F1E2]">Tem um negócio imobiliário?</h3>
                    <p className="mt-1 text-sm text-sidebar-text/75">Publique e encontre o capital certo — em minutos, sem comissões.</p>
                  </div>
                  <Button variant="gold" onClick={() => openListingForm()}>
                    <Plus size={16} /> Publicar anúncio
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : tab === "investidores" ? (
          <InvestidoresTab profiles={directoryProfiles} />
        ) : (
          <GuardadosTab listings={savedGuardados} enabled={enabled} />
        )}
      </div>

      {/* Drawer de filtros */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50" onMouseDown={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl border-t border-line bg-card shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[400px] sm:rounded-none sm:border-l sm:border-t-0"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Filtros</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-muted hover:text-ink" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
              <div>
                <Label>Capital que posso investir</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CAPITAL_PILLS.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setCapital(c.key)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-sm transition-colors",
                        capital === c.key ? "border-primary bg-primary text-white" : "border-line text-muted hover:bg-accent"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Onde</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={distrito} onChange={setDistrito}>
                    <option value="todos">Distrito</option>
                    {DISTRITOS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </Select>
                  <Select value={cidade} onChange={setCidade}>
                    <option value="todos">Cidade</option>
                    {CIDADES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label>Retorno mínimo</Label>
                <div className="space-y-3 rounded-lg border border-line p-3">
                  <SliderRow label="ROI mínimo" value={roiMin} display={roiMin === 0 ? "Qualquer" : pct(roiMin, 0)} min={0} max={30} step={5} onChange={setRoiMin} />
                  <SliderRow label="Prazo máximo" value={prazoMax} display={prazoMax === 0 ? "Qualquer" : `${prazoMax} meses`} min={0} max={24} step={3} onChange={setPrazoMax} />
                </div>
              </div>

              <div>
                <Label>Estado</Label>
                <div className="space-y-1.5">
                  {(["ativo", "financiado", "concluido"] as EstadoAnuncio[]).map((e) => (
                    <label key={e} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 text-sm text-ink hover:bg-accent/50">
                      <input
                        type="checkbox"
                        checked={estados.includes(e)}
                        onChange={() => toggleEstado(e)}
                        className="h-4 w-4 rounded border-line"
                        style={{ accentColor: "#5C3D2E" }}
                      />
                      {e === "concluido" ? "Concluído" : e === "financiado" ? "Financiado" : "Ativo"}
                    </label>
                  ))}
                </div>
              </div>

              <details className="group">
                <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wide text-muted hover:text-ink">
                  Mais filtros
                </summary>
                <div className="mt-3 space-y-4">
                  <div>
                    <Label>Tipo de Cedência</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(TIPO_CEDENCIA_LABEL_SHORT) as TipoCedencia[]).map((t) => {
                        const ativo = tiposCedencia.includes(t);
                        return (
                          <button
                            key={t}
                            onClick={() => toggleTipoCedencia(t)}
                            className={cn(
                              "rounded-md border px-3 py-1.5 text-sm transition-colors",
                              ativo ? "border-gold bg-gold text-sidebar" : "border-line text-muted hover:bg-accent"
                            )}
                          >
                            {TIPO_CEDENCIA_LABEL_SHORT[t]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Yield mínima</Label>
                      <Select value={String(yieldMin)} onChange={(v) => setYieldMin(Number(v))}>
                        {[0, 3, 4, 5, 6].map((v) => (
                          <option key={v} value={v}>{v === 0 ? "Qualquer" : `≥ ${v}%`}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label>Retorno s/ entrada</Label>
                      <Select value={String(retEntradaMin)} onChange={(v) => setRetEntradaMin(Number(v))}>
                        {[0, 5, 10, 12, 15, 18, 20, 25].map((v) => (
                          <option key={v} value={v}>{v === 0 ? "Qualquer" : `≥ ${v}%`}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>
              </details>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
              <Button variant="ghost" onClick={resetFiltros}>
                Limpar tudo
              </Button>
              <Button onClick={() => setDrawerOpen(false)}>
                Aplicar ({filtered.length} {filtered.length === 1 ? "resultado" : "resultados"})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Peças da montra ─────────────────────────

function EstatItem({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-secondary">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="num text-xl font-semibold leading-tight text-ink">{value}</p>
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.04em] text-muted">{label}</p>
      </div>
    </div>
  );
}

function CategoriaCard({ tipo, count, onClick }: { tipo: ListingType; count: number; onClick: () => void }) {
  const Icon = CATEGORIA_ICON[tipo];
  return (
    <button onClick={onClick} className="group relative h-36 overflow-hidden rounded-2xl border border-line text-left">
      <img src={CATEGORIA_IMG[tipo]} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/45 to-ink/15" />
      <div className="relative flex h-full flex-col justify-between p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur-sm">
          <Icon size={18} />
        </span>
        <div>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white">{TYPE_LABEL_SHORT[tipo]}</p>
            <span className="num rounded-full bg-gold/90 px-2 py-0.5 text-[11px] font-bold text-sidebar">{count}</span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[12px] text-white/75">{CATEGORIA_DESC[tipo]}</p>
        </div>
      </div>
    </button>
  );
}

function InvestidorChip({ profile, anuncios }: { profile: Profile; anuncios: number }) {
  const initials = profile.fullName.split(" ").map((p) => p[0]).join("").slice(0, 2);
  return (
    <Link
      to={`/comunidade/rede/${profile.id}`}
      className="flex w-[220px] shrink-0 items-center gap-3 rounded-xl border border-line bg-card p-3 transition-shadow hover:shadow-md"
    >
      <div className={cn("h-11 w-11 shrink-0 overflow-hidden rounded-full", profile.isVerified && "ring-2 ring-gold ring-offset-1 ring-offset-card")}>
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-xs font-semibold text-white">{initials}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm font-medium text-ink">
          {profile.fullName}
          {profile.isVerified && <BadgeCheck size={13} className="shrink-0 text-gold-dark" />}
        </p>
        <p className="flex items-center gap-1 text-[11px] text-muted">
          {profile.numAvaliacoes > 0 ? (
            <>
              <Star size={10} className="fill-gold text-gold" /> {profile.rating.toFixed(1)} · {anuncios} {anuncios === 1 ? "anúncio" : "anúncios"}
            </>
          ) : (
            `${anuncios} ${anuncios === 1 ? "anúncio" : "anúncios"}`
          )}
        </p>
      </div>
      <ArrowRight size={15} className="shrink-0 text-muted" />
    </Link>
  );
}

function ValorProp({ icon: Icon, titulo, texto }: { icon: typeof ShieldCheck; titulo: string; texto: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold-dark">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">{titulo}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{texto}</p>
      </div>
    </div>
  );
}

// ───────────────────────── Guardados ─────────────────────────

function GuardadosTab({ listings, enabled }: { listings: ReturnType<typeof useListingsStore.getState>["listings"]; enabled: boolean }) {
  const [tipo, setTipo] = useState<"todas" | ListingType>("todas");
  const filtrados = listings.filter((l) => tipo === "todas" || l.type === tipo);

  if (!enabled) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center text-sm text-muted">
        Ative o toggle «Dados de exemplo» para explorar os guardados.
      </p>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gold/30 bg-card/50 px-6 py-16 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-gold-dark">
          <Heart size={22} />
        </span>
        <p className="font-display text-lg font-semibold text-ink">Ainda não guardou anúncios.</p>
        <p className="mt-1 text-sm text-muted">Toque no ♥ para criar a sua shortlist.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip ativo={tipo === "todas"} onClick={() => setTipo("todas")}>Todas</Chip>
        {(Object.keys(TYPE_LABEL_SHORT) as ListingType[]).map((t) => (
          <Chip key={t} ativo={tipo === t} onClick={() => setTipo(t)}>
            {TYPE_LABEL_SHORT[t]}
          </Chip>
        ))}
        <span className="ml-auto text-sm text-muted">
          {filtrados.length} {filtrados.length === 1 ? "guardado" : "guardados"} · privado, só você vê
        </span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        ativo ? "bg-primary text-white" : "border border-line bg-card text-muted hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{children}</p>;
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-line bg-card px-3 text-sm outline-none focus:border-secondary"
    >
      {children}
    </select>
  );
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="num font-semibold text-ink">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: "#5C3D2E" }}
      />
    </div>
  );
}

// ───────────────────────── Diretório de investidores ─────────────────────────
function InvestidoresTab({ profiles }: { profiles: Profile[] }) {
  const listings = useListingsStore((s) => s.listings);
  const [vista, setVista] = useState<"grid" | "mapa">("grid");

  const activosPorAutor = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of listings) if (l.status === "active") m.set(l.authorId, (m.get(l.authorId) ?? 0) + 1);
    return m;
  }, [listings]);

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted">{profiles.length} investidores na rede</p>
        <div className="inline-flex rounded-lg border border-line bg-card p-0.5">
          <button
            onClick={() => setVista("grid")}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", vista === "grid" ? "bg-primary text-white" : "text-muted")}
          >
            <LayoutGrid size={14} /> Grelha
          </button>
          <button
            onClick={() => setVista("mapa")}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", vista === "mapa" ? "bg-primary text-white" : "text-muted")}
          >
            <MapIcon size={14} /> Mapa
          </button>
        </div>
      </div>

      {vista === "grid" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <InvestidorCard key={p.id} profile={p} anunciosAtivos={activosPorAutor.get(p.id) ?? 0} />
          ))}
        </div>
      ) : (
        <MapaInvestidores profiles={profiles} activosPorAutor={activosPorAutor} />
      )}
    </>
  );
}

function InvestidorCard({ profile, anunciosAtivos }: { profile: Profile; anunciosAtivos: number }) {
  return (
    <Link
      to={`/comunidade/rede/${profile.id}`}
      className="group overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative h-24 bg-gradient-to-br from-[#8B5E3C] to-[#5C3D2E]">
        {profile.coverUrl && <img src={profile.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
        <div className="azulejo absolute inset-0 opacity-[0.08]" />
      </div>
      <div className="px-5 pb-5">
        <div className="-mt-7 mb-2 flex items-end justify-between">
          <div className={cn("h-14 w-14 overflow-hidden rounded-full border-4 border-card", profile.isVerified && "ring-2 ring-gold")}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary text-white">{profile.fullName[0]}</div>
            )}
          </div>
          {profile.availableForPartnership && (
            <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-medium text-success">Disponível</span>
          )}
        </div>
        <h3 className="flex items-center gap-1 font-display text-lg font-semibold text-ink">
          {profile.fullName}
          {profile.isVerified && <BadgeCheck size={15} className="text-gold-dark" />}
        </h3>
        <p className="line-clamp-1 text-xs text-muted">{profile.tagline}</p>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line/60 pt-3 text-center">
          <Stat label="Anúncios" value={String(anunciosAtivos)} />
          <Stat label="Projetos" value={String(profile.projetosConcluidos)} />
          <Stat
            label="Rating"
            value={
              profile.numAvaliacoes > 0 ? (
                <span className="inline-flex items-center gap-0.5">
                  <Star size={11} className="fill-gold text-gold" /> {profile.rating.toFixed(1)}
                </span>
              ) : (
                "—"
              )
            }
          />
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="num text-sm font-bold text-ink">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function MapaInvestidores({
  profiles,
  activosPorAutor,
}: {
  profiles: Profile[];
  activosPorAutor: Map<string, number>;
}) {
  const porDistrito = useMemo(() => {
    const m = new Map<string, Profile[]>();
    for (const p of profiles) {
      const arr = m.get(p.city) ?? [];
      arr.push(p);
      m.set(p.city, arr);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [profiles]);

  return (
    <div className="rounded-2xl border border-line bg-gradient-to-br from-[#FDF8F0] to-[#F5ECD7] p-6">
      <p className="mb-4 flex items-center gap-2 text-sm text-muted">
        <MapIcon size={15} /> Clusters por região · {profiles.length} investidores
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {porDistrito.map(([cidade, ps]) => (
          <div key={cidade} className="rounded-xl border border-line bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-display text-base font-semibold text-ink">{cidade}</h4>
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-gold/15 px-2 text-sm font-bold text-gold-dark">
                {ps.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {ps.map((p) => (
                <Link
                  key={p.id}
                  to={`/comunidade/rede/${p.id}`}
                  className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-bg"
                >
                  <div className={cn("h-7 w-7 overflow-hidden rounded-full", p.isVerified && "ring-1 ring-gold")}>
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary text-[11px] text-white">{p.fullName[0]}</div>
                    )}
                  </div>
                  <span className="flex-1 truncate text-sm text-ink">{p.fullName}</span>
                  <span className="text-xs text-muted">{activosPorAutor.get(p.id) ?? 0} an.</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
