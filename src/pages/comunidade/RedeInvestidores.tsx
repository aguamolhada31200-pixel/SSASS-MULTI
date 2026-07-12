import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Plus, BadgeCheck, Star, Map as MapIcon, LayoutGrid, SlidersHorizontal, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ListingCard } from "@/components/rede/ListingCard";
import { useExampleData } from "@/store/useExampleData";
import { useModalStore } from "@/store/useModalStore";
import {
  useListingsStore,
  TYPE_LABEL_SHORT,
  TIPO_CEDENCIA_LABEL_SHORT,
  type ListingType,
  type EstadoAnuncio,
  type TipoCedencia,
  DISTRITOS,
  CIDADES,
} from "@/store/useListingsStore";
import { useProfilesStore, CURRENT_USER_ID, type Profile } from "@/store/useProfilesStore";
import { useSavedStore } from "@/store/useSavedStore";
import { capitalDoAnuncio, roiDoAnuncio, yieldDoAnuncio, retornoEntradaCedencia } from "@/lib/calc/rede";
import { eur, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

type CapitalFiltro = "todos" | "ate10" | "10a25" | "25a50" | "mais50";

const CAPITAL_PILLS: { key: CapitalFiltro; label: string; test: (v: number) => boolean }[] = [
  { key: "todos", label: "Qualquer", test: () => true },
  { key: "ate10", label: "Até 10.000€", test: (v) => v <= 10000 },
  { key: "10a25", label: "10–25.000€", test: (v) => v > 10000 && v <= 25000 },
  { key: "25a50", label: "25–50.000€", test: (v) => v > 25000 && v <= 50000 },
  { key: "mais50", label: ">50.000€", test: (v) => v > 50000 },
];

type RedeTab = "anuncios" | "investidores" | "guardados";

export default function RedeInvestidores() {
  const { enabled } = useExampleData();
  const listings = useListingsStore((s) => s.listings);
  const profiles = useProfilesStore((s) => s.profiles);
  const savedIds = useSavedStore((s) => s.savedIds);
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
  const [yieldMin, setYieldMin] = useState(0);
  const [retEntradaMin, setRetEntradaMin] = useState(0);
  const [tiposCedencia, setTiposCedencia] = useState<TipoCedencia[]>([]);
  const [estado, setEstado] = useState<"todos" | EstadoAnuncio>("todos");
  const [busca, setBusca] = useState("");
  const [filtrosOpen, setFiltrosOpen] = useState(false);

  const baseListings = enabled ? listings.filter((l) => l.status !== "closed") : [];
  const savedGuardados = baseListings.filter((l) => savedIds.includes(l.id));

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const capTest = CAPITAL_PILLS.find((c) => c.key === capital)!.test;
    return baseListings
      .filter((l) => categoria === "todas" || l.type === categoria)
      .filter((l) => capTest(capitalDoAnuncio(l)))
      .filter((l) => distrito === "todos" || l.district === distrito)
      .filter((l) => cidade === "todos" || l.city === cidade)
      .filter((l) => roiMin === 0 || roiDoAnuncio(l) >= roiMin)
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
      .filter((l) => estado === "todos" || l.estadoAnuncio === estado)
      .filter((l) => {
        if (!q) return true;
        return (
          l.title.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.district.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [baseListings, categoria, capital, distrito, cidade, roiMin, yieldMin, retEntradaMin, tiposCedencia, estado, busca]);

  const activeFilters =
    (categoria !== "todas" ? 1 : 0) +
    (capital !== "todos" ? 1 : 0) +
    (distrito !== "todos" ? 1 : 0) +
    (cidade !== "todos" ? 1 : 0) +
    (roiMin > 0 ? 1 : 0) +
    (yieldMin > 0 ? 1 : 0) +
    (retEntradaMin > 0 ? 1 : 0) +
    (tiposCedencia.length > 0 ? 1 : 0) +
    (estado !== "todos" ? 1 : 0);

  const resetFiltros = () => {
    setCategoria("todas");
    setCapital("todos");
    setDistrito("todos");
    setCidade("todos");
    setRoiMin(0);
    setYieldMin(0);
    setRetEntradaMin(0);
    setTiposCedencia([]);
    setEstado("todos");
  };

  const toggleTipoCedencia = (t: TipoCedencia) => {
    setTiposCedencia((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  };

  const directoryProfiles = profiles.filter((p) => p.id !== CURRENT_USER_ID);

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      {/* Hero imersivo */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2E1A0E] via-[#5C3D2E] to-[#3a2417] px-6 pb-20 pt-12 text-sidebar-text sm:px-10">
        <div className="azulejo absolute inset-0 opacity-[0.06]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="mb-2 flex items-center gap-2 text-sm text-gold-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Comunidade
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            A rede onde <span className="italic text-gold">capital</span> encontra{" "}
            <span className="italic text-gold">negócio</span>.
          </h1>
          <p className="mt-3 max-w-xl text-sidebar-text/70">
            Encontre parceiros, oportunidades e cedências de posição. Networking imobiliário profissional, com track record real.
          </p>

          <div className="glass mt-6 flex flex-col gap-2 rounded-2xl border border-white/15 p-2 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 px-3">
              <Search size={18} className="text-sidebar-text/60" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Onde quer investir? (cidade, distrito, palavra-chave)"
                className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
              {busca && (
                <button onClick={() => setBusca("")} className="text-muted hover:text-ink">
                  <X size={15} />
                </button>
              )}
            </div>
            <Button variant="gold" className="sm:w-auto" onClick={() => setTab("anuncios")}>
              Procurar
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs (pill) */}
      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-line bg-card p-1 shadow-md">
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
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {tab === "anuncios" ? (
          <>
            {/* Chips de categoria */}
            <div className="mb-4 flex flex-wrap gap-2">
              <Chip ativo={categoria === "todas"} onClick={() => setCategoria("todas")}>
                Todas
              </Chip>
              {(Object.keys(TYPE_LABEL_SHORT) as ListingType[]).map((t) => (
                <Chip key={t} ativo={categoria === t} onClick={() => setCategoria(t)}>
                  {TYPE_LABEL_SHORT[t]}
                </Chip>
              ))}
            </div>

            {/* Barra de filtros */}
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-muted">
                {enabled ? `${filtered.length} de ${baseListings.length} anúncios` : "Sem dados de exemplo"}
              </p>
              <button
                onClick={() => setFiltrosOpen((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm",
                  activeFilters > 0 ? "border-gold/40 bg-gold/10 text-gold-dark" : "border-line bg-card text-muted hover:bg-accent"
                )}
              >
                <SlidersHorizontal size={14} /> Filtros{activeFilters > 0 ? ` · ${activeFilters}` : ""}
              </button>
            </div>

            {filtrosOpen && (
              <FiltrosBar
                capital={capital}
                setCapital={setCapital}
                distrito={distrito}
                setDistrito={setDistrito}
                cidade={cidade}
                setCidade={setCidade}
                roiMin={roiMin}
                setRoiMin={setRoiMin}
                yieldMin={yieldMin}
                setYieldMin={setYieldMin}
                retEntradaMin={retEntradaMin}
                setRetEntradaMin={setRetEntradaMin}
                tiposCedencia={tiposCedencia}
                toggleTipoCedencia={toggleTipoCedencia}
                estado={estado}
                setEstado={setEstado}
                onReset={resetFiltros}
              />
            )}

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
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            )}
          </>
        ) : tab === "investidores" ? (
          <InvestidoresTab profiles={directoryProfiles} />
        ) : (
          <GuardadosTab listings={savedGuardados} enabled={enabled} />
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
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        ativo ? "bg-primary text-white" : "border border-line bg-card text-muted hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

interface FiltrosBarProps {
  capital: CapitalFiltro;
  setCapital: (v: CapitalFiltro) => void;
  distrito: string;
  setDistrito: (v: string) => void;
  cidade: string;
  setCidade: (v: string) => void;
  roiMin: number;
  setRoiMin: (v: number) => void;
  yieldMin: number;
  setYieldMin: (v: number) => void;
  retEntradaMin: number;
  setRetEntradaMin: (v: number) => void;
  tiposCedencia: TipoCedencia[];
  toggleTipoCedencia: (t: TipoCedencia) => void;
  estado: "todos" | EstadoAnuncio;
  setEstado: (v: "todos" | EstadoAnuncio) => void;
  onReset: () => void;
}

function FiltrosBar(p: FiltrosBarProps) {
  return (
    <div className="mb-5 grid gap-4 rounded-2xl border border-line bg-card p-5 sm:grid-cols-2">
      {/* Tipo de Cedência (multi-select) */}
      <div className="sm:col-span-2">
        <Label>Tipo de Cedência (multi-select)</Label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(TIPO_CEDENCIA_LABEL_SHORT) as TipoCedencia[]).map((t) => {
            const ativo = p.tiposCedencia.includes(t);
            return (
              <button
                key={t}
                onClick={() => p.toggleTipoCedencia(t)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition-colors",
                  ativo ? "bg-gold text-sidebar" : "border border-line text-muted hover:bg-accent"
                )}
              >
                {TIPO_CEDENCIA_LABEL_SHORT[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Capital */}
      <div className="sm:col-span-2">
        <Label>Capital necessário</Label>
        <div className="flex flex-wrap gap-1.5">
          {CAPITAL_PILLS.map((c) => (
            <button
              key={c.key}
              onClick={() => p.setCapital(c.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                p.capital === c.key ? "bg-primary text-white" : "border border-line text-muted hover:bg-accent"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Localização */}
      <div>
        <Label>Distrito</Label>
        <Select value={p.distrito} onChange={p.setDistrito}>
          <option value="todos">Todos os distritos</option>
          {DISTRITOS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Cidade</Label>
        <Select value={p.cidade} onChange={p.setCidade}>
          <option value="todos">Todas as cidades</option>
          {CIDADES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>

      {/* Rentabilidade */}
      <div>
        <Label>ROI mínimo</Label>
        <Select value={String(p.roiMin)} onChange={(v) => p.setRoiMin(Number(v))}>
          {[0, 5, 10, 15, 20, 25, 30].map((v) => (
            <option key={v} value={v}>{v === 0 ? "Qualquer" : `≥ ${v}%`}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Yield mínima (arrendamento)</Label>
        <Select value={String(p.yieldMin)} onChange={(v) => p.setYieldMin(Number(v))}>
          {[0, 3, 4, 5, 6].map((v) => (
            <option key={v} value={v}>{v === 0 ? "Qualquer" : `≥ ${v}%`}</option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label>Retorno sobre a Entrada mínimo (cedência)</Label>
        <Select value={String(p.retEntradaMin)} onChange={(v) => p.setRetEntradaMin(Number(v))}>
          {[0, 5, 10, 12, 15, 18, 20, 25].map((v) => (
            <option key={v} value={v}>{v === 0 ? "Qualquer" : `≥ ${v}%`}</option>
          ))}
        </Select>
      </div>

      {/* Estado */}
      <div className="sm:col-span-2">
        <Label>Estado</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["todos", "ativo", "financiado", "concluido"] as const).map((e) => (
            <button
              key={e}
              onClick={() => p.setEstado(e)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm capitalize transition-colors",
                p.estado === e ? "bg-primary text-white" : "border border-line text-muted hover:bg-accent"
              )}
            >
              {e === "todos" ? "Todos" : e === "concluido" ? "Concluído" : e}
            </button>
          ))}
          <button onClick={p.onReset} className="ml-auto text-xs text-muted hover:text-ink">
            Limpar tudo
          </button>
        </div>
      </div>
    </div>
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
      className="h-9 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary"
    >
      {children}
    </select>
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
