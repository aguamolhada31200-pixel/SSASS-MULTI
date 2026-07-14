import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
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
  ChevronLeft,
  ChevronRight,
  Bell,
  BellPlus,
  Pause,
  Play,
  Pencil,
  Trash2,
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
import { useAlertsStore, alertaMatch, ALERT_CAPITAL_LABEL, type Alerta, type AlertCriterios, type AlertCapital } from "@/store/useAlertsStore";
import { capitalDoAnuncio, roiDoAnuncio, yieldDoAnuncio, retornoEntradaCedencia } from "@/lib/calc/rede";
import { eur, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

type CapitalFiltro = AlertCapital;

const CAPITAL_PILLS: { key: CapitalFiltro; label: string; test: (v: number) => boolean }[] = [
  { key: "todos", label: "Qualquer", test: () => true },
  { key: "ate25", label: "< 25.000 €", test: (v) => v < 25000 },
  { key: "25a50", label: "25 – 50.000 €", test: (v) => v >= 25000 && v <= 50000 },
  { key: "50a100", label: "50 – 100.000 €", test: (v) => v > 50000 && v <= 100000 },
  { key: "mais100", label: "> 100.000 €", test: (v) => v > 100000 },
];

type Ordenar = "recentes" | "roi" | "capital" | "fechar" | "procurados";

const ORDENAR_LABEL: Record<Ordenar, string> = {
  recentes: "Mais recentes",
  roi: "Maior ROI",
  capital: "Menor capital",
  fechar: "A fechar primeiro",
  procurados: "Mais procurados",
};

type RedeTab = "anuncios" | "investidores" | "guardados";

function diasAteFecho(l: Listing): number | null {
  if (!l.terminoCpcv) return null;
  const t = new Date(`${l.terminoCpcv}T00:00:00`).getTime();
  if (!isFinite(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

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

function diasDesde(iso: string): number {
  const t = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso).getTime();
  return isFinite(t) ? (Date.now() - t) / 86400000 : 9999;
}

function capitalCurto(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} M€`;
  return eur(v);
}

function bandFromValue(v: number): CapitalFiltro {
  return (CAPITAL_PILLS.find((c) => c.key !== "todos" && c.test(v))?.key ?? "todos") as CapitalFiltro;
}

export default function RedeInvestidores() {
  const { enabled } = useExampleData();
  const listings = useListingsStore((s) => s.listings);
  const profiles = useProfilesStore((s) => s.profiles);
  const savedIds = useSavedStore((s) => s.savedIds);
  const interests = useInterestsStore((s) => s.interests);
  const alertas = useAlertsStore((s) => s.alertas);
  const openListingForm = useModalStore((s) => s.openListingForm);
  const [params, setParams] = useSearchParams();

  const tabParam = params.get("tab");
  const tab: RedeTab = tabParam === "guardados" || tabParam === "investidores" ? tabParam : "anuncios";

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

  // Tipo de negócio (multi). Sincroniza `cat` na URL quando é seleção única.
  const [tiposFiltro, setTiposFiltro] = useState<ListingType[]>(() => {
    const c = params.get("cat");
    return c === "reabilitacao" || c === "cedencia" || c === "arrendamento" ? [c] : [];
  });
  useEffect(() => {
    patchParams({ cat: tiposFiltro.length === 1 ? tiposFiltro[0] : null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiposFiltro]);

  const [capital, setCapital] = useState<CapitalFiltro>("todos");
  const [distrito, setDistrito] = useState("todos");
  const [cidade, setCidade] = useState("todos");
  const [roiMin, setRoiMin] = useState(0);
  const [prazoMax, setPrazoMax] = useState(0);
  const [yieldMin, setYieldMin] = useState(0);
  const [retEntradaMin, setRetEntradaMin] = useState(0);
  const [tiposCedencia, setTiposCedencia] = useState<TipoCedencia[]>([]);
  const [estados, setEstados] = useState<EstadoAnuncio[]>([]);
  const [apenasVerificados, setApenasVerificados] = useState(false);
  const [busca, setBusca] = useState("");
  const [ordenar, setOrdenar] = useState<Ordenar>("recentes");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visiveis, setVisiveis] = useState(9);
  const [alertaModal, setAlertaModal] = useState<null | "criar" | "lista">(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const irParaGrelha = () => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const verificadoDe = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const p of profiles) m.set(p.id, p.isVerified);
    return m;
  }, [profiles]);

  const baseListings = enabled ? listings.filter((l) => l.status !== "closed") : [];
  const savedGuardados = baseListings.filter((l) => savedIds.includes(l.id));

  const ativos = baseListings.filter((l) => l.estadoAnuncio === "ativo");
  const capitalAtivo = ativos.reduce((s, l) => s + capitalDoAnuncio(l), 0);
  const novasSemana = ativos.filter((l) => diasDesde(l.createdAt) <= 7).length;

  const interessesPorAnuncio = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of interests) m.set(i.listingId, (m.get(i.listingId) ?? 0) + 1);
    return m;
  }, [interests]);

  const fechamEmBreve = useMemo(() => {
    return ativos
      .map((l) => ({ l, dias: diasAteFecho(l), nInt: interessesPorAnuncio.get(l.id) ?? 0 }))
      .filter((x) => (x.dias !== null && x.dias >= 0 && x.dias < 30) || x.nInt >= 2)
      .sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999))
      .slice(0, 8);
  }, [ativos, interessesPorAnuncio]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const capTest = CAPITAL_PILLS.find((c) => c.key === capital)!.test;
    return baseListings
      .filter((l) => tiposFiltro.length === 0 || tiposFiltro.includes(l.type))
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
        if (l.type !== "cedencia") return true;
        return retornoEntradaCedencia(l) >= retEntradaMin;
      })
      .filter((l) => {
        if (tiposCedencia.length === 0) return true;
        if (l.type !== "cedencia") return tiposFiltro.includes("cedencia") ? false : true;
        return l.tipoCedencia ? tiposCedencia.includes(l.tipoCedencia) : false;
      })
      .filter((l) => estados.length === 0 || estados.includes(l.estadoAnuncio))
      .filter((l) => !apenasVerificados || verificadoDe.get(l.authorId))
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
        if (ordenar === "procurados") return (interessesPorAnuncio.get(b.id) ?? 0) - (interessesPorAnuncio.get(a.id) ?? 0);
        if (ordenar === "fechar") {
          const da = diasAteFecho(a);
          const db = diasAteFecho(b);
          return (da !== null && da >= 0 ? da : 9999) - (db !== null && db >= 0 ? db : 9999);
        }
        return a.createdAt < b.createdAt ? 1 : -1;
      });
  }, [baseListings, tiposFiltro, capital, distrito, cidade, roiMin, prazoMax, yieldMin, retEntradaMin, tiposCedencia, estados, apenasVerificados, verificadoDe, busca, ordenar, interessesPorAnuncio]);

  const activeFilters =
    (capital !== "todos" ? 1 : 0) +
    (distrito !== "todos" ? 1 : 0) +
    (cidade !== "todos" ? 1 : 0) +
    (roiMin > 0 ? 1 : 0) +
    (prazoMax > 0 ? 1 : 0) +
    (yieldMin > 0 ? 1 : 0) +
    (retEntradaMin > 0 ? 1 : 0) +
    (tiposCedencia.length > 0 ? 1 : 0) +
    (estados.length > 0 ? 1 : 0) +
    (apenasVerificados ? 1 : 0);

  const haFiltro = activeFilters > 0 || tiposFiltro.length > 0 || busca.trim().length > 0;
  const descoberta = tab === "anuncios" && !haFiltro;

  useEffect(() => {
    setVisiveis(9);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiposFiltro, capital, distrito, cidade, roiMin, prazoMax, yieldMin, retEntradaMin, tiposCedencia, estados, apenasVerificados, busca, ordenar, tab]);

  const resetFiltros = () => {
    setTiposFiltro([]);
    setCapital("todos");
    setDistrito("todos");
    setCidade("todos");
    setRoiMin(0);
    setPrazoMax(0);
    setYieldMin(0);
    setRetEntradaMin(0);
    setTiposCedencia([]);
    setEstados([]);
    setApenasVerificados(false);
  };

  const toggleTipoNegocio = (t: ListingType) =>
    setTiposFiltro((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const toggleTipoCedencia = (t: TipoCedencia) =>
    setTiposCedencia((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const toggleEstado = (e: EstadoAnuncio) =>
    setEstados((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));

  const chipsAtivos: { label: string; clear: () => void }[] = [
    ...tiposFiltro.map((t) => ({ label: TYPE_LABEL_SHORT[t], clear: () => toggleTipoNegocio(t) })),
    ...(capital !== "todos" ? [{ label: CAPITAL_PILLS.find((c) => c.key === capital)!.label, clear: () => setCapital("todos") }] : []),
    ...(distrito !== "todos" ? [{ label: distrito, clear: () => setDistrito("todos") }] : []),
    ...(cidade !== "todos" ? [{ label: cidade, clear: () => setCidade("todos") }] : []),
    ...(roiMin > 0 ? [{ label: `ROI ≥ ${roiMin}%`, clear: () => setRoiMin(0) }] : []),
    ...(prazoMax > 0 ? [{ label: `Prazo ≤ ${prazoMax} meses`, clear: () => setPrazoMax(0) }] : []),
    ...estados.map((e) => ({ label: e === "concluido" ? "Concluído" : e === "financiado" ? "Financiado" : "Ativo", clear: () => toggleEstado(e) })),
    ...tiposCedencia.map((t) => ({ label: TIPO_CEDENCIA_LABEL_SHORT[t], clear: () => toggleTipoCedencia(t) })),
    ...(apenasVerificados ? [{ label: "Verificados", clear: () => setApenasVerificados(false) }] : []),
    ...(yieldMin > 0 ? [{ label: `Yield ≥ ${yieldMin}%`, clear: () => setYieldMin(0) }] : []),
    ...(retEntradaMin > 0 ? [{ label: `Ret. entrada ≥ ${retEntradaMin}%`, clear: () => setRetEntradaMin(0) }] : []),
  ];

  // "Para o seu capital" — banda inferida do filtro ou dos guardados/interesses.
  const bandaCapital = useMemo<CapitalFiltro | null>(() => {
    if (capital !== "todos") return capital;
    const sinais = baseListings.filter(
      (l) => savedIds.includes(l.id) || interests.some((i) => i.userId === CURRENT_USER_ID && i.listingId === l.id)
    );
    if (sinais.length === 0) return null;
    const media = sinais.reduce((s, l) => s + capitalDoAnuncio(l), 0) / sinais.length;
    return bandFromValue(media);
  }, [capital, baseListings, savedIds, interests]);

  const paraOSeuCapital = useMemo(() => {
    if (!bandaCapital || bandaCapital === "todos") return [];
    const test = CAPITAL_PILLS.find((c) => c.key === bandaCapital)!.test;
    return ativos.filter((l) => test(capitalDoAnuncio(l))).slice(0, 8);
  }, [ativos, bandaCapital]);

  const directoryProfiles = profiles.filter((p) => p.id !== CURRENT_USER_ID);
  const anunciosPorAutor = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of ativos) m.set(l.authorId, (m.get(l.authorId) ?? 0) + 1);
    return m;
  }, [ativos]);
  const investidoresAtivos = useMemo(
    () =>
      directoryProfiles
        .filter((p) => p.isVerified && (anunciosPorAutor.get(p.id) ?? 0) > 0)
        .sort((a, b) => (anunciosPorAutor.get(b.id) ?? 0) - (anunciosPorAutor.get(a.id) ?? 0) || b.rating - a.rating)
        .slice(0, 8),
    [directoryProfiles, anunciosPorAutor]
  );

  const meusAlertas = alertas.filter((a) => a.userId === CURRENT_USER_ID);
  const utilizadorNovo = savedIds.length === 0 && !interests.some((i) => i.userId === CURRENT_USER_ID);

  const criteriosAtuais: AlertCriterios = {
    capital,
    distrito,
    cidade,
    tipos: tiposFiltro,
    roiMin,
  };

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      {/* ───────── HERO comprimido ───────── */}
      <div className="relative overflow-hidden bg-[#2E1A0E] px-4 py-8 text-sidebar-text sm:px-6">
        <div className="azulejo absolute inset-0 opacity-[0.06]" />
        <div className="relative mx-auto max-w-[1280px]">
          <h1 className="text-[28px] font-semibold leading-tight text-[#F5ECD7]">Capital encontra negócio.</h1>
          <p className="mt-1.5 text-[13px] text-[#E8D5A4]">
            <span className="num">{ativos.length}</span> oportunidades ativas · <span className="num">{capitalCurto(capitalAtivo)}</span> em capital procurado
            {novasSemana > 0 && <> · <span className="num">{novasSemana}</span> novas esta semana</>}
          </p>

          <div className="mt-4 flex max-w-xl gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-md border border-white/15 bg-white/95 px-3">
              <Search size={16} className="text-muted" />
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
            <Button variant="gold" onClick={() => { setTab("anuncios"); irParaGrelha(); }}>
              Procurar
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">
        {/* ───────── Navegação (no fluxo, sem sticky) ───────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(["anuncios", "investidores", "guardados"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  tab === t ? "bg-primary text-white" : "text-muted hover:text-ink"
                )}
              >
                {t === "anuncios" ? (
                  "Anúncios"
                ) : t === "investidores" ? (
                  "Investidores"
                ) : (
                  <>
                    <Heart size={13} className={cn(tab === t && "fill-white")} />
                    Guardados{savedGuardados.length > 0 ? ` (${savedGuardados.length})` : ""}
                  </>
                )}
              </button>
            ))}
          </div>
          <Button onClick={() => openListingForm()}>
            <Plus size={15} /> Publicar anúncio
          </Button>
        </div>

        {tab === "anuncios" && (
          <>
            {/* Categorias + filtros + ordenar */}
            <div className="mt-6 flex items-center gap-2">
              <div className="flex flex-1 gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
                <CatPill ativo={tiposFiltro.length === 0} onClick={() => setTiposFiltro([])}>Todas</CatPill>
                {(Object.keys(TYPE_LABEL_SHORT) as ListingType[]).map((t) => (
                  <CatPill key={t} ativo={tiposFiltro.length === 1 && tiposFiltro[0] === t} onClick={() => setTiposFiltro([t])}>
                    {TYPE_LABEL_SHORT[t]}
                  </CatPill>
                ))}
              </div>
              <button
                onClick={() => setDrawerOpen(true)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm",
                  activeFilters > 0 ? "border-gold/40 bg-gold/10 text-gold-dark" : "border-line bg-card text-muted hover:bg-accent"
                )}
              >
                <SlidersHorizontal size={14} /> Filtros{activeFilters > 0 ? ` · ${activeFilters}` : ""}
              </button>
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
            </div>

            {/* Contexto de resultados + chips */}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted">
              {enabled ? (
                haFiltro ? (
                  <>
                    <span>{filtered.length} de {baseListings.length}</span>
                    <button onClick={resetFiltros} className="font-medium text-primary hover:text-secondary">Limpar filtros</button>
                  </>
                ) : (
                  <span>{baseListings.length} oportunidades</span>
                )
              ) : (
                <span>Sem dados de exemplo</span>
              )}
              {chipsAtivos.map((c) => (
                <span key={c.label} className="inline-flex items-center gap-1 rounded bg-accent px-2 py-[3px] text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
                  {c.label}
                  <button onClick={c.clear} className="hover:text-ink" title="Remover filtro"><X size={11} /></button>
                </span>
              ))}
            </div>

            {!enabled ? (
              <p className="mt-8 rounded-lg border border-dashed border-line bg-card/50 px-6 py-16 text-center text-sm text-muted">
                Ative o toggle «Dados de exemplo» (no topo da app) para explorar a Rede, ou publique o primeiro anúncio.
              </p>
            ) : (
              <div className="mt-14 space-y-14">
                {/* Fecham em breve */}
                {descoberta && fechamEmBreve.length > 0 && (
                  <section>
                    <SectionHeader title="Fecham em breve" acao={{ label: "ver todos →", onClick: () => { setOrdenar("fechar"); irParaGrelha(); } }} />
                    <Faixa>
                      {fechamEmBreve.map(({ l, dias, nInt }) => (
                        <div key={l.id} className="relative w-[300px] shrink-0 snap-start">
                          <span className="absolute -top-2.5 left-3 z-10 inline-flex items-center gap-1 rounded bg-[#F6E8D3] px-2 py-[3px] text-[11px] font-medium uppercase tracking-[0.04em] text-warning">
                            {dias !== null && dias >= 0 && dias < 30 ? (
                              <>{dias} {dias === 1 ? "dia" : "dias"}</>
                            ) : (
                              `${nInt} interessados`
                            )}
                          </span>
                          <ListingCard listing={l} />
                        </div>
                      ))}
                    </Faixa>
                  </section>
                )}

                {/* Para o seu capital */}
                {descoberta && paraOSeuCapital.length > 0 && bandaCapital && (
                  <section>
                    <SectionHeader
                      title={`Para o seu capital · ${ALERT_CAPITAL_LABEL[bandaCapital]}`}
                      acao={{ label: "ajustar →", onClick: () => setDrawerOpen(true) }}
                    />
                    <Faixa>
                      {paraOSeuCapital.map((l) => (
                        <div key={l.id} className="w-[300px] shrink-0 snap-start">
                          <ListingCard listing={l} />
                        </div>
                      ))}
                    </Faixa>
                  </section>
                )}

                {/* Todas as oportunidades */}
                <section ref={gridRef}>
                  {descoberta && <SectionHeader title="Todas as oportunidades" />}
                  {filtered.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-line bg-card/50 px-6 py-16 text-center">
                      <Search size={20} className="mx-auto text-muted" />
                      <p className="mt-3 text-sm text-ink">Nenhuma oportunidade com estes critérios.</p>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={resetFiltros}>Limpar filtros</Button>
                        <Button size="sm" onClick={() => setAlertaModal("criar")}>Criar alerta para estes critérios</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.slice(0, visiveis).map((l) => (
                          <ListingCard key={l.id} listing={l} />
                        ))}
                      </div>
                      {filtered.length > visiveis && (
                        <div className="mt-12 flex justify-center">
                          <Button variant="outline" onClick={() => setVisiveis((v) => v + 9)}>
                            Carregar mais ({filtered.length - visiveis})
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </section>

                {/* Investidores ativos */}
                {descoberta && investidoresAtivos.length > 0 && (
                  <section>
                    <SectionHeader title="Investidores ativos" acao={{ label: "ver todos →", onClick: () => setTab("investidores") }} />
                    <Faixa>
                      {investidoresAtivos.map((p) => (
                        <InvestidorMini key={p.id} profile={p} anuncios={anunciosPorAutor.get(p.id) ?? 0} />
                      ))}
                    </Faixa>
                  </section>
                )}

                {/* Alertas de oportunidade */}
                {descoberta && (
                  <section>
                    <div className="rounded-lg bg-accent px-6 py-8 text-center">
                      <p className="text-lg font-semibold text-ink">Ainda não encontrou o negócio certo?</p>
                      <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                        Guarde os seus critérios e avisamos quando aparecer uma oportunidade que encaixa.
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-4">
                        <Button onClick={() => setAlertaModal("criar")}><BellPlus size={16} /> Criar alerta</Button>
                        <button onClick={() => setAlertaModal("lista")} className="text-sm font-medium text-primary hover:text-secondary">
                          Os meus alertas ({meusAlertas.length})
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* Como funciona — só utilizador novo */}
                {descoberta && utilizadorNovo && (
                  <section>
                    <div className="grid gap-6 border-t border-line pt-8 sm:grid-cols-3">
                      <ComoFunciona icon={<Search size={16} className="text-muted" />} titulo="Encontre" texto="Filtre por capital disponível e zona." />
                      <ComoFunciona icon={<MessageCircle size={16} className="text-muted" />} titulo="Contacte" texto="Fale diretamente com o dono do negócio." />
                      <ComoFunciona icon={<Handshake size={16} className="text-muted" />} titulo="Negoceie" texto="Sem intermediários, sem comissões." />
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}

        {tab === "investidores" && <div className="mt-8"><InvestidoresTab profiles={directoryProfiles} /></div>}
        {tab === "guardados" && <div className="mt-8"><GuardadosTab listings={savedGuardados} enabled={enabled} /></div>}
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
              <button onClick={() => setDrawerOpen(false)} className="text-muted hover:text-ink" aria-label="Fechar"><X size={20} /></button>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
              <div>
                <DrawerLabel>Capital que posso investir</DrawerLabel>
                <div className="flex flex-wrap gap-1.5">
                  {CAPITAL_PILLS.filter((c) => c.key !== "todos").map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setCapital(capital === c.key ? "todos" : c.key)}
                      className={cn("rounded-md border px-3 py-1.5 text-sm transition-colors", capital === c.key ? "border-primary bg-primary text-white" : "border-line text-muted hover:bg-accent")}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <DrawerLabel>Onde</DrawerLabel>
                <div className="grid grid-cols-2 gap-2">
                  <DrawerSelect value={distrito} onChange={setDistrito}>
                    <option value="todos">Distrito</option>
                    {DISTRITOS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </DrawerSelect>
                  <DrawerSelect value={cidade} onChange={setCidade}>
                    <option value="todos">Cidade</option>
                    {CIDADES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </DrawerSelect>
                </div>
              </div>

              <div>
                <DrawerLabel>Retorno</DrawerLabel>
                <div className="space-y-3 rounded-lg border border-line p-3">
                  <SliderRow label="ROI mínimo" value={roiMin} display={roiMin === 0 ? "Qualquer" : pct(roiMin, 0)} min={0} max={30} step={5} onChange={setRoiMin} />
                  <SliderRow label="Prazo máximo" value={prazoMax} display={prazoMax === 0 ? "Qualquer" : `${prazoMax} meses`} min={0} max={24} step={3} onChange={setPrazoMax} />
                </div>
              </div>

              <div>
                <DrawerLabel>Tipo de negócio</DrawerLabel>
                <div className="space-y-1.5">
                  {(Object.keys(TYPE_LABEL_SHORT) as ListingType[]).map((t) => (
                    <Check key={t} checked={tiposFiltro.includes(t)} onChange={() => toggleTipoNegocio(t)}>{TYPE_LABEL_SHORT[t]}</Check>
                  ))}
                </div>
              </div>

              {tiposFiltro.includes("cedencia") && (
                <div>
                  <DrawerLabel>Tipo de cedência</DrawerLabel>
                  <div className="space-y-1.5">
                    {(Object.keys(TIPO_CEDENCIA_LABEL_SHORT) as TipoCedencia[]).map((t) => (
                      <Check key={t} checked={tiposCedencia.includes(t)} onChange={() => toggleTipoCedencia(t)}>{TIPO_CEDENCIA_LABEL_SHORT[t]}</Check>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <DrawerLabel>Estado</DrawerLabel>
                <div className="space-y-1.5">
                  {(["ativo", "financiado", "concluido"] as EstadoAnuncio[]).map((e) => (
                    <Check key={e} checked={estados.includes(e)} onChange={() => toggleEstado(e)}>
                      {e === "concluido" ? "Concluído" : e === "financiado" ? "Financiado" : "Ativo"}
                    </Check>
                  ))}
                </div>
              </div>

              <div>
                <DrawerLabel>Anunciante</DrawerLabel>
                <Check checked={apenasVerificados} onChange={() => setApenasVerificados((v) => !v)}>Apenas investidores verificados</Check>
              </div>

              <details className="group">
                <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wide text-muted hover:text-ink">Mais filtros</summary>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <DrawerLabel>Yield mínima</DrawerLabel>
                    <DrawerSelect value={String(yieldMin)} onChange={(v) => setYieldMin(Number(v))}>
                      {[0, 3, 4, 5, 6].map((v) => <option key={v} value={v}>{v === 0 ? "Qualquer" : `≥ ${v}%`}</option>)}
                    </DrawerSelect>
                  </div>
                  <div>
                    <DrawerLabel>Retorno s/ entrada</DrawerLabel>
                    <DrawerSelect value={String(retEntradaMin)} onChange={(v) => setRetEntradaMin(Number(v))}>
                      {[0, 5, 10, 12, 15, 18, 20, 25].map((v) => <option key={v} value={v}>{v === 0 ? "Qualquer" : `≥ ${v}%`}</option>)}
                    </DrawerSelect>
                  </div>
                </div>
              </details>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
              <Button variant="ghost" onClick={resetFiltros}>Limpar tudo</Button>
              <Button onClick={() => setDrawerOpen(false)}>
                Ver {filtered.length} {filtered.length === 1 ? "oportunidade" : "oportunidades"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alertas de oportunidade */}
      {alertaModal && (
        <AlertasModal
          modo={alertaModal}
          criteriosAtuais={criteriosAtuais}
          nomeSugerido={sugerirNomeAlerta(criteriosAtuais)}
          listings={baseListings}
          onClose={() => setAlertaModal(null)}
          onTrocarModo={setAlertaModal}
        />
      )}
    </div>
  );
}

// ───────────────────────── Peças de layout ─────────────────────────

function SectionHeader({ title, acao }: { title: string; acao?: { label: string; onClick: () => void } }) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{title}</h2>
        {acao && (
          <button onClick={acao.onClick} className="shrink-0 text-[13px] text-primary transition-colors hover:text-secondary">
            {acao.label}
          </button>
        )}
      </div>
      <div className="mt-2 border-b border-line" />
    </div>
  );
}

/** Faixa horizontal com scroll suave, snap e setas discretas (só desktop, no hover). */
function Faixa({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  return (
    <div className="group relative">
      <div
        ref={ref}
        className="flex snap-x gap-5 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        onClick={() => scroll(-1)}
        className="absolute -left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-card text-muted opacity-0 shadow-sm transition-opacity hover:text-ink group-hover:opacity-100 lg:flex"
        aria-label="Anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => scroll(1)}
        className="absolute -right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-card text-muted opacity-0 shadow-sm transition-opacity hover:text-ink group-hover:opacity-100 lg:flex"
        aria-label="Seguinte"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function CatPill({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors",
        ativo ? "border-primary bg-primary text-white" : "border-line bg-card text-muted hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

function InvestidorMini({ profile, anuncios }: { profile: Profile; anuncios: number }) {
  const initials = profile.fullName.split(" ").map((p) => p[0]).join("").slice(0, 2);
  return (
    <div className="flex w-[200px] shrink-0 snap-start flex-col items-center rounded-lg border border-line bg-card p-4 text-center">
      <div className={cn("h-12 w-12 overflow-hidden rounded-full", profile.isVerified && "ring-2 ring-gold ring-offset-1 ring-offset-card")}>
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-sm font-semibold text-white">{initials}</div>
        )}
      </div>
      <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-ink">
        {profile.fullName}
        {profile.isVerified && <BadgeCheck size={13} className="text-gold-dark" />}
      </p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
        {profile.projetosConcluidos} projetos{profile.numAvaliacoes > 0 && <> · <Star size={10} className="fill-gold text-gold" /> {profile.rating.toFixed(1)}</>}
      </p>
      <p className="text-xs text-muted">{anuncios} {anuncios === 1 ? "anúncio ativo" : "anúncios ativos"}</p>
      <Link to={`/comunidade/rede/${profile.id}`} className="mt-3 w-full rounded-md border border-line bg-card py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-accent">
        Ver perfil
      </Link>
    </div>
  );
}

function ComoFunciona({ icon, titulo, texto }: { icon: React.ReactNode; titulo: string; texto: string }) {
  return (
    <div>
      <span className="mb-1.5 block">{icon}</span>
      <p className="text-sm font-semibold text-ink">{titulo}</p>
      <p className="mt-0.5 text-[13px] text-muted">{texto}</p>
    </div>
  );
}

// ───────────────────────── Alertas ─────────────────────────

function sugerirNomeAlerta(c: AlertCriterios): string {
  const partes: string[] = [];
  if (c.tipos.length === 1) partes.push(TYPE_LABEL_SHORT[c.tipos[0]]);
  else partes.push("Oportunidades");
  if (c.capital !== "todos") partes.push(ALERT_CAPITAL_LABEL[c.capital].toLowerCase());
  if (c.distrito !== "todos") partes.push(`em ${c.distrito}`);
  if (c.roiMin > 0) partes.push(`ROI ≥ ${c.roiMin}%`);
  return partes.join(" · ");
}

function resumoCriterios(c: AlertCriterios): string[] {
  const out: string[] = [];
  out.push(c.tipos.length === 0 ? "Qualquer tipo" : c.tipos.map((t) => TYPE_LABEL_SHORT[t]).join(", "));
  if (c.capital !== "todos") out.push(ALERT_CAPITAL_LABEL[c.capital]);
  if (c.distrito !== "todos") out.push(c.distrito);
  if (c.cidade !== "todos") out.push(c.cidade);
  if (c.roiMin > 0) out.push(`ROI ≥ ${c.roiMin}%`);
  return out;
}

function AlertasModal({
  modo,
  criteriosAtuais,
  nomeSugerido,
  listings,
  onClose,
  onTrocarModo,
}: {
  modo: "criar" | "lista";
  criteriosAtuais: AlertCriterios;
  nomeSugerido: string;
  listings: Listing[];
  onClose: () => void;
  onTrocarModo: (m: "criar" | "lista") => void;
}) {
  const add = useAlertsStore((s) => s.add);
  const update = useAlertsStore((s) => s.update);
  const toggle = useAlertsStore((s) => s.toggle);
  const remove = useAlertsStore((s) => s.remove);
  const meus = useAlertsStore((s) => s.alertas.filter((a) => a.userId === CURRENT_USER_ID));

  const [editando, setEditando] = useState<Alerta | null>(null);
  const criteriosBase = editando ? editando.criterios : criteriosAtuais;
  const [nome, setNome] = useState(editando ? editando.nome : nomeSugerido);
  const [crit, setCrit] = useState<AlertCriterios>(criteriosBase);

  const contar = (c: AlertCriterios) => listings.filter((l) => alertaMatch(l, c)).length;

  const abrirEdicao = (a: Alerta) => {
    setEditando(a);
    setNome(a.nome);
    setCrit(a.criterios);
    onTrocarModo("criar");
  };

  const guardar = () => {
    if (editando) {
      update(editando.id, { nome, criterios: crit });
      toast.success("Alerta atualizado");
    } else {
      add(nome, crit);
      toast.success("Alerta criado", { description: `${contar(crit)} anúncios cumprem agora os critérios.` });
    }
    onTrocarModo("lista");
    setEditando(null);
  };

  const toggleTipo = (t: ListingType) =>
    setCrit((c) => ({ ...c, tipos: c.tipos.includes(t) ? c.tipos.filter((x) => x !== t) : [...c.tipos, t] }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{modo === "criar" ? (editando ? "Editar alerta" : "Criar alerta") : "Os meus alertas"}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>

        {modo === "criar" ? (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Nome do alerta</span>
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Cedência até 50k no Porto" className="h-10 w-full rounded-md border border-line bg-card px-3 text-sm outline-none focus:border-secondary" />
              </label>

              <div>
                <DrawerLabel>Tipo de negócio</DrawerLabel>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(TYPE_LABEL_SHORT) as ListingType[]).map((t) => (
                    <button key={t} onClick={() => toggleTipo(t)} className={cn("rounded-md border px-3 py-1.5 text-sm transition-colors", crit.tipos.includes(t) ? "border-primary bg-primary text-white" : "border-line text-muted hover:bg-accent")}>
                      {TYPE_LABEL_SHORT[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <DrawerLabel>Capital</DrawerLabel>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(ALERT_CAPITAL_LABEL) as AlertCapital[]).map((k) => (
                    <button key={k} onClick={() => setCrit((c) => ({ ...c, capital: k }))} className={cn("rounded-md border px-3 py-1.5 text-sm transition-colors", crit.capital === k ? "border-primary bg-primary text-white" : "border-line text-muted hover:bg-accent")}>
                      {k === "todos" ? "Qualquer" : ALERT_CAPITAL_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <DrawerLabel>Zona</DrawerLabel>
                <div className="grid grid-cols-2 gap-2">
                  <DrawerSelect value={crit.distrito} onChange={(v) => setCrit((c) => ({ ...c, distrito: v }))}>
                    <option value="todos">Distrito</option>
                    {DISTRITOS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </DrawerSelect>
                  <DrawerSelect value={crit.cidade} onChange={(v) => setCrit((c) => ({ ...c, cidade: v }))}>
                    <option value="todos">Cidade</option>
                    {CIDADES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </DrawerSelect>
                </div>
              </div>

              <div>
                <DrawerLabel>ROI mínimo</DrawerLabel>
                <DrawerSelect value={String(crit.roiMin)} onChange={(v) => setCrit((c) => ({ ...c, roiMin: Number(v) }))}>
                  {[0, 5, 10, 15, 20, 25, 30].map((v) => <option key={v} value={v}>{v === 0 ? "Qualquer" : `≥ ${v}%`}</option>)}
                </DrawerSelect>
              </div>

              <p className="rounded-md bg-accent px-3 py-2 text-[13px] text-muted">
                <span className="num font-semibold text-ink">{contar(crit)}</span> anúncios cumprem agora estes critérios.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
              <Button variant="ghost" onClick={() => (meus.length > 0 ? onTrocarModo("lista") : onClose())}>
                {meus.length > 0 ? "Ver alertas" : "Cancelar"}
              </Button>
              <Button onClick={guardar}>{editando ? "Guardar alterações" : "Criar alerta"}</Button>
            </div>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-5">
              {meus.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={22} className="mx-auto text-muted" />
                  <p className="mt-2 text-sm text-ink">Ainda não tem alertas.</p>
                </div>
              ) : (
                meus.map((a) => (
                  <div key={a.id} className={cn("rounded-lg border border-line p-3", !a.ativo && "opacity-60")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                          {a.nome}
                          {!a.ativo && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted">Em pausa</span>}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {resumoCriterios(a.criterios).map((r) => (
                            <span key={r} className="rounded bg-accent px-1.5 py-0.5 text-[11px] text-muted">{r}</span>
                          ))}
                        </div>
                        <p className="mt-1.5 text-[11px] text-muted">
                          <span className="num font-medium text-ink">{contar(a.criterios)}</span> anúncios cumprem
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => toggle(a.id)} className="rounded-md p-1.5 text-muted hover:bg-accent hover:text-ink" title={a.ativo ? "Pausar" : "Retomar"}>
                          {a.ativo ? <Pause size={15} /> : <Play size={15} />}
                        </button>
                        <button onClick={() => abrirEdicao(a)} className="rounded-md p-1.5 text-muted hover:bg-accent hover:text-ink" title="Editar"><Pencil size={15} /></button>
                        <button onClick={() => { remove(a.id); toast.success("Alerta eliminado"); }} className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger" title="Eliminar"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
              <Button variant="ghost" onClick={onClose}>Fechar</Button>
              <Button onClick={() => { setEditando(null); setNome(nomeSugerido); setCrit(criteriosAtuais); onTrocarModo("criar"); }}>
                <BellPlus size={16} /> Novo alerta
              </Button>
            </div>
          </>
        )}
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
      <p className="rounded-lg border border-dashed border-line bg-card/50 px-6 py-16 text-center text-sm text-muted">
        Ative o toggle «Dados de exemplo» para explorar os guardados.
      </p>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-card/50 px-6 py-16 text-center">
        <Heart size={22} className="mx-auto text-muted" />
        <p className="mt-2 font-semibold text-ink">Ainda não guardou anúncios.</p>
        <p className="mt-1 text-sm text-muted">Toque no coração de um anúncio para criar a sua shortlist.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <CatPill ativo={tipo === "todas"} onClick={() => setTipo("todas")}>Todas</CatPill>
        {(Object.keys(TYPE_LABEL_SHORT) as ListingType[]).map((t) => (
          <CatPill key={t} ativo={tipo === t} onClick={() => setTipo(t)}>{TYPE_LABEL_SHORT[t]}</CatPill>
        ))}
        <span className="ml-auto text-sm text-muted">
          {filtrados.length} {filtrados.length === 1 ? "guardado" : "guardados"} · privado, só você vê
        </span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
    </>
  );
}

// ───────────────────────── Drawer helpers ─────────────────────────

function DrawerLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{children}</p>;
}

function DrawerSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-md border border-line bg-card px-3 text-sm outline-none focus:border-secondary">
      {children}
    </select>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 text-sm text-ink hover:bg-accent/50">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-line" style={{ accentColor: "#5C3D2E" }} />
      {children}
    </label>
  );
}

function SliderRow({ label, value, display, min, max, step, onChange }: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="num font-semibold text-ink">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" style={{ accentColor: "#5C3D2E" }} />
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
          <button onClick={() => setVista("grid")} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", vista === "grid" ? "bg-primary text-white" : "text-muted")}>
            <LayoutGrid size={14} /> Grelha
          </button>
          <button onClick={() => setVista("mapa")} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", vista === "mapa" ? "bg-primary text-white" : "text-muted")}>
            <MapIcon size={14} /> Mapa
          </button>
        </div>
      </div>

      {vista === "grid" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => <InvestidorCard key={p.id} profile={p} anunciosAtivos={activosPorAutor.get(p.id) ?? 0} />)}
        </div>
      ) : (
        <MapaInvestidores profiles={profiles} activosPorAutor={activosPorAutor} />
      )}
    </>
  );
}

function InvestidorCard({ profile, anunciosAtivos }: { profile: Profile; anunciosAtivos: number }) {
  return (
    <Link to={`/comunidade/rede/${profile.id}`} className="group overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
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
          <Stat label="Rating" value={profile.numAvaliacoes > 0 ? <span className="inline-flex items-center gap-0.5"><Star size={11} className="fill-gold text-gold" /> {profile.rating.toFixed(1)}</span> : "—"} />
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

function MapaInvestidores({ profiles, activosPorAutor }: { profiles: Profile[]; activosPorAutor: Map<string, number> }) {
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
    <div className="rounded-2xl border border-line bg-card p-6">
      <p className="mb-4 flex items-center gap-2 text-sm text-muted">
        <MapIcon size={15} /> Clusters por região · {profiles.length} investidores
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {porDistrito.map(([cidade, ps]) => (
          <div key={cidade} className="rounded-xl border border-line bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-display text-base font-semibold text-ink">{cidade}</h4>
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-gold/15 px-2 text-sm font-bold text-gold-dark">{ps.length}</span>
            </div>
            <div className="space-y-1.5">
              {ps.map((p) => (
                <Link key={p.id} to={`/comunidade/rede/${p.id}`} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-bg">
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
