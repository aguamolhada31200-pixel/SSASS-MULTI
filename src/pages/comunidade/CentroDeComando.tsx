import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Hammer,
  ChevronRight,
  Building2,
  Users2,
  LayoutList,
  ChartGantt,
  CircleAlert,
  TriangleAlert,
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExampleDataToggle } from "@/components/ExampleDataToggle";
import { useExampleData } from "@/store/useExampleData";
import { useModalStore } from "@/store/useModalStore";
import {
  useObrasStore,
  CATEGORIA_LABEL,
  gastoReal,
  progressoReal,
  estadoRitmo,
  estaAtrasada,
  saudeObra,
  podeGerir,
  membrosDe,
  SAUDE_LABEL,
  SAUDE_HEX,
  gastoNaoComprovado,
  listaPorComprovar,
  estadoHumanoObras,
  ESTADO_HUMANO_CASA,
  ESTADO_HUMANO_HEX,
  custoObrasProjeto,
  type Obra,
  type Fase,
  type Marco,
  type Despesa,
  type ObraCategoria,
  type Saude,
} from "@/store/useObrasStore";
import { useCollabStore } from "@/store/useCollabStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { financasFlipProjeto } from "@/lib/calc/obraProjeto";
import { EmpreiteirosDirectory } from "@/components/obras/EmpreiteirosDirectory";
import { BlocoAguardarDecisao, BlocoPedirAosSocios } from "@/components/collab/PendingDecisions";
import { VerComoToggle } from "@/components/collab/VerComoToggle";
import { useViewAs } from "@/store/useViewAs";
import { eur, pct, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MemberStack, RoleAvatar, nomeProprio } from "@/components/obras/CoGestao";

// ───────────────────── Helpers de contexto ─────────────────────

interface ContextOwner {
  kind: "project" | "property";
  id: string;
  title: string;
  city: string;
  href: string;
}

function useOwners(): Record<string, ContextOwner> {
  const projects = useCollabStore((s) => s.projects);
  const properties = usePropertiesStore((s) => s.properties);
  const map: Record<string, ContextOwner> = {};
  projects.forEach((p) => {
    map[`proj:${p.id}`] = {
      kind: "project",
      id: p.id,
      title: `#${p.number} ${p.title}`,
      city: p.city,
      href: `/comunidade/colaborativa/${p.id}`,
    };
  });
  properties.forEach((p) => {
    map[`prop:${p.id}`] = { kind: "property", id: p.id, title: p.name, city: p.city, href: `/imoveis/${p.id}` };
  });
  return map;
}

function ownerKey(o: Obra): string {
  return o.projectId ? `proj:${o.projectId}` : `prop:${o.propertyId}`;
}

const CATEGORIA_ICON_COLOR: Record<ObraCategoria, string> = {
  cozinha: "#C17E2A",
  wc: "#5C7CB3",
  pintura: "#C8A664",
  eletricidade: "#E0A800",
  canalizacao: "#3E8FB0",
  estrutural: "#9B3A2A",
  mobiliario: "#8B5E3C",
  arquitetura: "#4A7C59",
  geral: "#5C3D2E",
};

const SAUDE_ORDEM: Record<Saude, number> = { risco: 0, parada: 1, atencao: 2, saudavel: 3 };

// ── Tabs por estado ──
type TabKey = "todas" | "iniciadas" | "quase" | "concluidas" | "partilhadas" | "solo";
const TAB_ORDER: TabKey[] = ["todas", "iniciadas", "quase", "concluidas", "partilhadas", "solo"];
const TAB_LABEL: Record<TabKey, string> = {
  todas: "Todas",
  iniciadas: "Iniciadas",
  quase: "Quase concluídas",
  concluidas: "Concluídas",
  partilhadas: "Partilhadas",
  solo: "Solo",
};

function obraEmTab(o: Obra, tab: TabKey, fases: Fase[]): boolean {
  const prog = progressoReal(o, fases);
  const partilhada = membrosDe(o).length > 1;
  switch (tab) {
    case "todas":
      return true;
    case "iniciadas":
      return o.estado === "em_curso" && prog >= 1 && prog < 70;
    case "quase":
      return prog >= 70 && prog < 100 && o.estado !== "concluida";
    case "concluidas":
      return prog >= 100 || o.estado === "concluida";
    case "partilhadas":
      return partilhada;
    case "solo":
      return !partilhada;
  }
}

// Decisão (despesa/marco) a aguardar/decidida
interface Decisao {
  tipo: "despesa" | "marco";
  itemId: string;
  obra: Obra;
  titulo: string;
  valor: number;
}

// ───────────────────── Page ─────────────────────

export default function CentroDeComando() {
  const { enabled } = useExampleData();
  const obras = useObrasStore((s) => s.obras);
  const despesas = useObrasStore((s) => s.despesas);
  const fases = useObrasStore((s) => s.fases);
  const marcos = useObrasStore((s) => s.marcos);
  const openMarcoPay = useModalStore((s) => s.openMarcoPay);
  const openObraForm = useModalStore((s) => s.openObraForm);
  const openPorComprovar = useModalStore((s) => s.openPorComprovar);
  useViewAs((s) => s.modo); // "Ver como" — re-renderiza os cartões críticos ao alternar o papel

  const todayISO = new Date().toISOString().slice(0, 10);

  const ativas = useMemo(
    () => (enabled ? obras.filter((o) => o.estado !== "concluida") : []),
    [obras, enabled]
  );
  const listaTodas = enabled ? obras : [];

  // Saúde por obra
  const saudeDe = useMemo(() => {
    const map = new Map<string, ReturnType<typeof saudeObra>>();
    ativas.forEach((o) => map.set(o.id, saudeObra(o, fases, despesas, marcos)));
    return map;
  }, [ativas, fases, despesas, marcos]);

  const emRisco = ativas.filter((o) => saudeDe.get(o.id)?.saude === "risco");
  const sociosCount = useMemo(() => {
    const set = new Set<string>();
    ativas.forEach((o) => membrosDe(o).forEach((m) => set.add(m.userId)));
    return set.size;
  }, [ativas]);

  // ───── Decisões pendentes (despesas/marcos a aguardar voto) ─────
  const decisoesPendentes = useMemo<Decisao[]>(() => {
    const out: Decisao[] = [];
    despesas.forEach((d) => {
      const o = ativas.find((x) => x.id === d.obraId);
      if (o && d.aprovacao?.estado === "pendente")
        out.push({ tipo: "despesa", itemId: d.id, obra: o, titulo: d.descricao, valor: d.valor });
    });
    marcos.forEach((m) => {
      const o = ativas.find((x) => x.id === m.obraId);
      if (o && m.aprovacao?.estado === "pendente")
        out.push({ tipo: "marco", itemId: m.id, obra: o, titulo: m.titulo, valor: m.valor });
    });
    return out;
  }, [despesas, marcos, ativas]);

  // ───── Vista principal: grelha de CASAS. Vista completa (cronograma/lista) é opcional. ─────
  const [vistaCompleta, setVistaCompleta] = useState(false);
  const [modo, setModo] = useState<"cronograma" | "lista">("lista");
  const [tab, setTab] = useState<TabKey>("todas");
  const [socioFiltro, setSocioFiltro] = useState<Set<string>>(new Set());
  const [projetoFiltro, setProjetoFiltro] = useState<Set<string>>(new Set());
  const ganttRef = useRef<HTMLDivElement>(null);

  // Projetos partilhados de que faço parte — alimentam os blocos de decisões por papel
  const collabProjects = useCollabStore((s) => s.projects);
  const meusProjetos = useMemo(
    () => (enabled ? collabProjects.filter((p) => p.partners.some((s) => s.id === CURRENT_USER_ID)) : []),
    [collabProjects, enabled]
  );

  // Atalhos de teclado: G cronograma · L lista · N nova obra
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "g") setModo("cronograma");
      else if (k === "l") setModo("lista");
      else if (k === "n") openObraForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openObraForm]);

  // Contagem por tab + lista visível (tab + filtros secundários)
  const tabCounts = useMemo(() => {
    const c = {} as Record<TabKey, number>;
    TAB_ORDER.forEach((t) => (c[t] = listaTodas.filter((o) => obraEmTab(o, t, fases)).length));
    return c;
  }, [listaTodas, fases]);

  const obrasVisiveis = useMemo(
    () =>
      listaTodas.filter((o) => {
        if (!obraEmTab(o, tab, fases)) return false;
        if (socioFiltro.size > 0 && !membrosDe(o).some((m) => socioFiltro.has(m.userId))) return false;
        if (projetoFiltro.size > 0 && !projetoFiltro.has(o.projectId ? `proj:${o.projectId}` : `prop:${o.propertyId}`)) return false;
        return true;
      }),
    [listaTodas, tab, fases, socioFiltro, projetoFiltro]
  );

  const focarObra = (obraId: string) => {
    setVistaCompleta(true);
    setModo("cronograma");
    setTab("todas");
    requestAnimationFrame(() => {
      const el = document.getElementById(`gantt-${obraId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.classList.add("ring-2", "ring-gold");
      setTimeout(() => el?.classList.remove("ring-2", "ring-gold"), 1600);
    });
  };

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      {/* Hero — uma pergunta respondida em 3 segundos */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2E1A0E] via-[#5C3D2E] to-[#3a2417] px-6 pb-16 pt-12 text-sidebar-text sm:px-10">
        <div className="azulejo absolute inset-0 opacity-[0.06]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 flex items-center gap-2 text-sm text-gold-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Gestão de Obras · Co-gestão
              </p>
              <h1 className="font-display text-3xl font-bold leading-tight sm:text-[2.6rem]">Obras</h1>
              <p className="mt-2 text-sm text-sidebar-text/70">
                Atualizado agora · {ativas.length} {ativas.length === 1 ? "obra em curso" : "obras em curso"} ·{" "}
                {sociosCount} {sociosCount === 1 ? "sócio" : "sócios"}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <VerComoToggle tomEscuro />
              <ExampleDataToggle />
              <Button variant="gold" onClick={() => openObraForm()}>
                <Plus size={15} /> Nova obra
              </Button>
            </div>
          </div>

          {/* Barra de saúde — só na vista completa (cronograma) */}
          {enabled && vistaCompleta && ativas.length > 0 && (
            <SaudeBar ativas={ativas} saudeDe={saudeDe} onPick={focarObra} />
          )}
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 pb-12 sm:px-6">
        {!enabled ? (
          <div className="rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center text-sm text-muted">
            Ative o toggle «Dados de exemplo» para explorar a Gestão de Obras.
          </div>
        ) : (
          <>
            {/* Decisões por papel: o investidor vota aqui; o gestor acompanha, lembra e aplica */}
            {(meusProjetos.length > 0) && (
              <div className="mt-6 space-y-3">
                <BlocoAguardarDecisao projects={meusProjetos} />
                <BlocoPedirAosSocios projects={meusProjetos} />
              </div>
            )}

            {/* 3 cartões críticos */}
            <CartoesCriticos
              ativas={ativas}
              saudeDe={saudeDe}
              despesas={despesas}
              marcos={marcos}
              todayISO={todayISO}
              onPagarMarco={(m) => openMarcoPay(m.id)}
              onFocar={focarObra}
            />

            {/* Alerta "por comprovar" — só aparece se houver pendências */}
            <AlertaPorComprovar obras={listaTodas} despesas={despesas} onAbrir={() => openPorComprovar()} />

            {!vistaCompleta ? (
              /* ─── Caminho principal: escolher a CASA ─── */
              <CasasGrid obras={listaTodas} saudeDe={saudeDe} onVerCronograma={() => setVistaCompleta(true)} />
            ) : (
              <>
                {/* Vista completa (gestor avançado): tabs + filtros + cronograma/lista */}
                <button
                  onClick={() => setVistaCompleta(false)}
                  className="mt-8 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
                >
                  ← Voltar às casas
                </button>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="-mx-1 flex flex-1 items-center gap-1 overflow-x-auto px-1 pb-1">
                    {TAB_ORDER.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={cn(
                          "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                          tab === t ? "bg-primary text-white" : "text-muted hover:bg-accent hover:text-ink"
                        )}
                      >
                        {TAB_LABEL[t]}
                        <span className={cn("num rounded-full px-1.5 text-[11px]", tab === t ? "bg-white/20" : "bg-accent text-muted")}>
                          {tabCounts[t]}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <FiltrarMenu
                      socioFiltro={socioFiltro}
                      setSocioFiltro={setSocioFiltro}
                      projetoFiltro={projetoFiltro}
                      setProjetoFiltro={setProjetoFiltro}
                      obras={listaTodas}
                    />
                    <div className="inline-flex rounded-full border border-line bg-card p-1 shadow-sm">
                      <ModoBtn ativo={modo === "lista"} onClick={() => setModo("lista")} icon={<LayoutList size={14} />} label="Lista" atalho="L" />
                      <ModoBtn ativo={modo === "cronograma"} onClick={() => setModo("cronograma")} icon={<ChartGantt size={14} />} label="Cronograma" atalho="G" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 animate-fade-in" ref={ganttRef} key={modo + tab}>
                  {modo === "cronograma" ? (
                    <CronogramaPanel obras={obrasVisiveis} saudeDe={saudeDe} decisoesPendentes={decisoesPendentes} />
                  ) : (
                    <ListaPanel obras={obrasVisiveis} saudeDe={saudeDe} />
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

    </div>
  );
}

function ModoBtn({ ativo, onClick, icon, label, atalho }: { ativo: boolean; onClick: () => void; icon: React.ReactNode; label: string; atalho: string }) {
  return (
    <button
      onClick={onClick}
      title={`Atalho: ${atalho}`}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        ativo ? "bg-primary text-white" : "text-muted hover:text-ink"
      )}
    >
      {icon} {label}
    </button>
  );
}

// ───────────────────── Barra de saúde ─────────────────────

function SaudeBar({
  ativas,
  saudeDe,
  onPick,
}: {
  ativas: Obra[];
  saudeDe: Map<string, ReturnType<typeof saudeObra>>;
  onPick: (id: string) => void;
}) {
  const ordenadas = [...ativas].sort((a, b) => {
    const sa = saudeDe.get(a.id)!.saude;
    const sb = saudeDe.get(b.id)!.saude;
    if (SAUDE_ORDEM[sa] !== SAUDE_ORDEM[sb]) return SAUDE_ORDEM[sa] - SAUDE_ORDEM[sb];
    return b.orcamento - a.orcamento;
  });
  const totalOrc = ordenadas.reduce((s, o) => s + o.orcamento, 0) || 1;

  const contagem = (["risco", "atencao", "saudavel", "parada"] as Saude[])
    .map((s) => ({ s, n: ativas.filter((o) => saudeDe.get(o.id)?.saude === s).length }))
    .filter((x) => x.n > 0);

  return (
    <div className="mt-6">
      <div className="flex h-7 w-full overflow-hidden rounded-full ring-1 ring-white/15">
        {ordenadas.map((o) => {
          const s = saudeDe.get(o.id)!;
          const w = (o.orcamento / totalOrc) * 100;
          return (
            <button
              key={o.id}
              onClick={() => onPick(o.id)}
              title={`${o.titulo} · ${SAUDE_LABEL[s.saude]}${s.problema ? ` · ${s.problema}` : ""}`}
              className="group relative h-full transition-opacity hover:opacity-90"
              style={{ width: `${Math.max(2, w)}%`, background: SAUDE_HEX[s.saude] }}
            >
              <span className="pointer-events-none absolute inset-0 border-r border-[#2E1A0E]/30" />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-sidebar-text/70">
        {contagem.map(({ s, n }) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: SAUDE_HEX[s] }} />
            {n} {SAUDE_LABEL[s].toLowerCase()}
          </span>
        ))}
        <span className="text-sidebar-text/50">· largura ∝ orçamento · clique para ver no cronograma</span>
      </div>
    </div>
  );
}

// ───────────────────── 3 cartões críticos ─────────────────────

interface Issue {
  key: string;
  peso: number;
  tone: "danger" | "warning";
  icon: React.ReactNode;
  badge: string;
  titulo: string;
  contexto: string;
  obra: Obra;
  cta: { label: string; onClick: () => void };
}

function CartoesCriticos({
  ativas,
  saudeDe,
  despesas,
  marcos,
  todayISO,
  onPagarMarco,
  onFocar,
}: {
  ativas: Obra[];
  saudeDe: Map<string, ReturnType<typeof saudeObra>>;
  despesas: Despesa[];
  marcos: Marco[];
  todayISO: string;
  onPagarMarco: (m: Marco) => void;
  onFocar: (id: string) => void;
}) {
  const issues: Issue[] = [];

  // 1) Marco vencido por pagar
  marcos.forEach((m) => {
    const o = ativas.find((x) => x.id === m.obraId);
    if (!o || m.estado === "pago" || m.dataPrevista >= todayISO) return;
    if (m.aprovacao?.estado === "pendente") return; // ainda em votação → entra na categoria decisão
    const euGestor = podeGerir(o, CURRENT_USER_ID);
    issues.push({
      key: `marco-${m.id}`,
      peso: 100,
      tone: "danger",
      icon: <CircleAlert size={16} />,
      badge: "Marco vencido",
      titulo: `Pagar "${m.titulo}" — ${o.titulo} está parado à espera`,
      contexto: `${eur(m.valor)} · previsto ${dataPT(m.dataPrevista)} · ${m.empreiteiro ?? "empreiteiro"}`,
      obra: o,
      cta: euGestor
        ? { label: "Pagar marco", onClick: () => onPagarMarco(m) }
        : { label: "Ver obra", onClick: () => onFocar(o.id) },
    });
  });

  // 2) Decisões a aguardar voto vivem agora nos blocos "A aguardar a tua decisão" / "A pedir aos sócios" (topo da página).

  // 3) Desvio orçamental > 15%
  ativas.forEach((o) => {
    if (o.estado !== "em_curso") return;
    const g = gastoReal(o, despesas);
    if (o.orcamento <= 0 || g <= o.orcamento * 1.15) return;
    const over = (g / o.orcamento - 1) * 100;
    issues.push({
      key: `over-${o.id}`,
      peso: 80 + Math.min(15, over / 5),
      tone: "danger",
      icon: <TriangleAlert size={16} />,
      badge: "Acima do orçamento",
      titulo: `${o.titulo} está ${pct(over, 0)} acima do orçamento`,
      contexto: `${eur(g)} gastos de ${eur(o.orcamento)}${o.notas ? ` · ${o.notas}` : ""}`,
      obra: o,
      cta: { label: "Ver obra", onClick: () => onFocar(o.id) },
    });
  });

  // 4) Transparência baixa — gasto sem comprovativo > 800 €
  ativas.forEach((o) => {
    const naoComp = gastoNaoComprovado(o, despesas);
    if (naoComp <= 800) return;
    const g = gastoReal(o, despesas);
    const pctComp = g > 0 ? Math.round(((g - naoComp) / g) * 100) : 100;
    issues.push({
      key: `provapt-${o.id}`,
      peso: 75 + Math.min(15, naoComp / 300),
      tone: "warning",
      icon: <ShieldAlert size={16} />,
      badge: "Comprovativos em falta",
      titulo: `${o.titulo} tem ${eur(naoComp)} de gastos sem comprovativo`,
      contexto: `${pctComp}% do gasto comprovado · exige-se fatura/recibo para os sócios confiarem`,
      obra: o,
      cta: { label: "Pedir comprovativos", onClick: () => onFocar(o.id) },
    });
  });

  // remover duplicados (mesma obra) mantendo o mais grave, e ficar com os 3 piores
  const top = issues
    .sort((a, b) => b.peso - a.peso)
    .filter((it, i, arr) => arr.findIndex((x) => x.key === it.key) === i)
    .slice(0, 3);

  if (top.length === 0) {
    const proximoMarco = marcos
      .filter((m) => m.estado !== "pago" && ativas.some((o) => o.id === m.obraId))
      .sort((a, b) => (a.dataPrevista < b.dataPrevista ? -1 : 1))[0];
    return (
      <div className="mt-6">
        <Card className="border-success/40 bg-success/5">
          <CardContent className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success/15 text-success">
              <CheckCircle2 size={22} />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-ink">Tudo no caminho.</p>
              <p className="text-sm text-muted">
                {proximoMarco ? `Próximo marco: ${dataPT(proximoMarco.dataPrevista)} · ${eur(proximoMarco.valor)}.` : "Sem pagamentos pendentes."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-ink">
        <Sparkles size={16} className="text-gold-dark" /> Precisa de atenção hoje
      </h2>
      <div className="grid gap-3 lg:grid-cols-3">
        {top.map((it) => (
          <CriticoCard key={it.key} issue={it} />
        ))}
      </div>
    </div>
  );
}

/** Alerta agregado "por comprovar" — a seguir a "Precisa de atenção hoje". */
function AlertaPorComprovar({ obras, despesas, onAbrir }: { obras: Obra[]; despesas: Despesa[]; onAbrir: () => void }) {
  const idsVisiveis = new Set(obras.map((o) => o.id));
  const lista = listaPorComprovar(despesas).filter((d) => idsVisiveis.has(d.obraId));
  if (lista.length === 0) return null;
  const total = lista.reduce((s, d) => s + d.valor, 0);
  const nObras = new Set(lista.map((d) => d.obraId)).size;
  return (
    <div className="mt-4">
      <Card className="border-warning/40 bg-warning/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warning/15 text-warning">
              <TriangleAlert size={22} />
            </span>
            <div>
              <p className="num font-display text-lg font-semibold text-ink">
                {eur(total)} por comprovar
              </p>
              <p className="text-sm text-muted">
                em {lista.length} {lista.length === 1 ? "despesa" : "despesas"} · {nObras} {nObras === 1 ? "obra" : "obras"}
              </p>
            </div>
          </div>
          <Button variant="gold" onClick={onAbrir}>
            Ver o que falta →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CriticoCard({ issue }: { issue: Issue }) {
  const toneBorder = issue.tone === "danger" ? "border-danger/40" : "border-warning/40";
  const toneText = issue.tone === "danger" ? "text-danger" : "text-warning";
  const toneBg = issue.tone === "danger" ? "bg-danger/10" : "bg-warning/10";
  return (
    <Card className={cn("animate-fade-in", toneBorder)}>
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-center justify-between">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", toneBg, toneText)}>
            {issue.icon} {issue.badge}
          </span>
          <MemberStack obra={issue.obra} max={3} size="xs" />
        </div>
        <p className="mt-2 text-sm font-semibold leading-snug text-ink">{issue.titulo}</p>
        <p className="num mt-1 text-xs text-muted">{issue.contexto}</p>
        <div className="mt-3 flex items-center justify-between">
          <Link to={`/obra/${issue.obra.id}`} className="text-xs text-secondary hover:underline">
            Abrir obra →
          </Link>
          <Button size="sm" variant={issue.tone === "danger" ? "gold" : "outline"} onClick={issue.cta.onClick}>
            {issue.cta.label}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ───────────────────── Grelha de CASAS (nível 1 · caminho principal) ─────────────────────

type CasaFiltro = "todas" | "decorrer" | "concluidas" | "empreiteiros";

interface CasaInfo {
  id: string;
  kind: "project" | "property";
  nome: string;
  cidade: string;
  foto?: string;
  obras: Obra[];
}

function CasasGrid({
  obras,
  onVerCronograma,
}: {
  obras: Obra[];
  saudeDe: Map<string, ReturnType<typeof saudeObra>>;
  onVerCronograma: () => void;
}) {
  const navigate = useNavigate();
  const fases = useObrasStore((s) => s.fases);
  const despesas = useObrasStore((s) => s.despesas);
  const marcos = useObrasStore((s) => s.marcos);
  const projects = useCollabStore((s) => s.projects);
  const properties = usePropertiesStore((s) => s.properties);
  const [filtro, setFiltro] = useState<CasaFiltro>("todas");

  // Só casas (projetos + imóveis solo) que TÊM pelo menos uma obra
  const casas = useMemo<CasaInfo[]>(() => {
    const out: CasaInfo[] = [];
    projects.forEach((p) => {
      const os = obras.filter((o) => o.projectId === p.id);
      if (os.length > 0) out.push({ id: p.id, kind: "project", nome: p.title, cidade: p.city, foto: p.coverImageUrl, obras: os });
    });
    properties.forEach((p) => {
      const os = obras.filter((o) => o.propertyId === p.id);
      if (os.length > 0) out.push({ id: p.id, kind: "property", nome: p.name, cidade: p.city, foto: p.photos?.[0]?.url, obras: os });
    });
    return out;
  }, [projects, properties, obras]);

  const visiveis = casas.filter((c) => {
    const estado = estadoHumanoObras(c.obras, fases, despesas, marcos);
    if (filtro === "decorrer") return estado !== "concluidas" && estado !== "nao_comecou";
    if (filtro === "concluidas") return estado === "concluidas";
    return true;
  });

  return (
    <div className="mt-8">
      {/* Filtro simples — nada mais */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {([
            ["todas", "Todas"],
            ["decorrer", "Com obras a decorrer"],
            ["concluidas", "Concluídas"],
            ["empreiteiros", "Empreiteiros"],
          ] as [CasaFiltro, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFiltro(k)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                filtro === k ? "bg-primary text-white" : "text-muted hover:bg-accent hover:text-ink"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={onVerCronograma} className="text-sm text-secondary hover:underline">
          Ver tudo em cronograma →
        </button>
      </div>

      {filtro === "empreiteiros" ? (
        <EmpreiteirosDirectory />
      ) : visiveis.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-card/50 px-6 py-14 text-center text-sm text-muted">
          Sem casas nesta vista.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((c) => {
            const estado = estadoHumanoObras(c.obras, fases, despesas, marcos);
            const hex = ESTADO_HUMANO_HEX[estado];
            const prog = Math.round(c.obras.reduce((s, o) => s + progressoReal(o, fases), 0) / c.obras.length);
            // Radar de rentabilidade: projeto flip mostra lucro/ROI afetados pelas obras
            const projFlip = c.kind === "project" ? projects.find((p) => p.id === c.id && p.type === "reabilitacao") : undefined;
            const fin = projFlip ? financasFlipProjeto(projFlip, custoObrasProjeto(projFlip.id, c.obras, despesas)) : undefined;
            const derrapagem = c.obras.reduce((s, o) => s + Math.max(0, gastoReal(o, despesas) - o.orcamento), 0);
            const finTone = !fin ? "" : fin.lucroEstimado <= 0 ? "text-danger" : derrapagem > 0 ? "text-warning" : "text-success";
            return (
              <button
                key={`${c.kind}:${c.id}`}
                onClick={() => navigate(`/comunidade/colaborativa/obras/${c.id}`)}
                className="overflow-hidden rounded-2xl border border-line bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative h-36 bg-accent">
                  {c.foto ? (
                    <img src={c.foto} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted">
                      {c.kind === "project" ? <Users2 size={26} /> : <Building2 size={26} />}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="truncate text-base font-semibold text-ink">{c.nome}</p>
                  <p className="text-xs text-muted">
                    {c.cidade} · {c.obras.length} {c.obras.length === 1 ? "obra" : "obras"}
                  </p>
                  <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium" style={{ color: hex }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: hex }} />
                    {ESTADO_HUMANO_CASA[estado]}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent">
                      <div className="h-full rounded-full transition-all" style={{ width: `${prog}%`, background: hex }} />
                    </div>
                    <span className="num text-xs text-muted">{prog}%</span>
                  </div>
                  {/* Obra → lucro: radar de rentabilidade do flip */}
                  {fin && (
                    <p className={cn("num mt-2 border-t border-line/60 pt-2 text-xs font-medium", finTone)}>
                      Lucro estimado: {eur(fin.lucroEstimado)} · ROI {pct(fin.roi)}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ───────────────────── Filtrar (sócio / projeto) ─────────────────────

function FiltrarMenu({
  socioFiltro,
  setSocioFiltro,
  projetoFiltro,
  setProjetoFiltro,
  obras,
}: {
  socioFiltro: Set<string>;
  setSocioFiltro: (s: Set<string>) => void;
  projetoFiltro: Set<string>;
  setProjetoFiltro: (s: Set<string>) => void;
  obras: Obra[];
}) {
  const profiles = useProfilesStore((s) => s.profiles);
  const owners = useOwners();
  const [open, setOpen] = useState(false);

  const socios = useMemo(() => {
    const set = new Set<string>();
    obras.forEach((o) => membrosDe(o).forEach((m) => set.add(m.userId)));
    return [...set];
  }, [obras]);
  const projetos = useMemo(() => {
    const set = new Set<string>();
    obras.forEach((o) => set.add(ownerKey(o)));
    return [...set];
  }, [obras]);

  const count = socioFiltro.size + projetoFiltro.size;
  const toggle = (set: Set<string>, setFn: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    n.has(v) ? n.delete(v) : n.add(v);
    setFn(n);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
          count > 0 ? "border-primary text-primary" : "border-line bg-card text-muted hover:text-ink"
        )}
      >
        <SlidersHorizontal size={14} /> Filtrar
        {count > 0 && <span className="num rounded-full bg-primary px-1.5 text-[11px] text-white">{count}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-line bg-card p-3 shadow-xl">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Sócio</p>
            <div className="flex flex-wrap gap-1.5">
              {socios.length === 0 && <span className="text-[11px] text-muted">Sem sócios</span>}
              {socios.map((id) => (
                <Chip key={id} active={socioFiltro.has(id)} onClick={() => toggle(socioFiltro, setSocioFiltro, id)}>
                  {nomeProprio(profiles.find((p) => p.id === id)?.fullName)}
                </Chip>
              ))}
            </div>
            <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Projeto / Imóvel</p>
            <div className="flex flex-wrap gap-1.5">
              {projetos.map((k) => (
                <Chip key={k} active={projetoFiltro.has(k)} onClick={() => toggle(projetoFiltro, setProjetoFiltro, k)}>
                  {owners[k]?.title.replace(/^#\d+\s/, "") ?? "—"}
                </Chip>
              ))}
            </div>
            {count > 0 && (
              <button
                onClick={() => {
                  setSocioFiltro(new Set());
                  setProjetoFiltro(new Set());
                }}
                className="mt-3 text-[11px] text-muted underline hover:text-ink"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active ? "border-primary bg-primary text-white" : "border-line bg-card text-muted hover:border-secondary/40 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

// ───────────────────── Mini donut de progresso ─────────────────────

function MiniDonut({ pct: p }: { pct: number }) {
  const size = 22;
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, p)) / 100) * c;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8D5BE" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#C8A664" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
      </svg>
      <span className="num absolute text-[8px] font-bold text-ink">{p}</span>
    </span>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-3 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

// ───────────────────── Cronograma (timeline px-based, estilo Linear) ─────────────────────

const ZOOM_DAY_PX = { semana: 22, mes: 7, trimestre: 2.6 } as const;
type Zoom = keyof typeof ZOOM_DAY_PX;
const LEFT_W = 280;

function diasEntre(aISO: string, bISO: string) {
  return Math.round((new Date(`${bISO}T00:00:00`).getTime() - new Date(`${aISO}T00:00:00`).getTime()) / 86400000);
}
function addDiasISO(iso: string, d: number) {
  const x = new Date(`${iso}T00:00:00`);
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
}
function corRitmoHex(o: Obra, fases: Fase[]) {
  if (o.estado === "pausada") return "#6B4C3B";
  const r = estadoRitmo(o, fases);
  return r === "atrasada" ? "#9B3A2A" : r === "a_abrandar" ? "#C17E2A" : "#4A7C59";
}

function CronogramaPanel({
  obras,
  decisoesPendentes,
}: {
  obras: Obra[];
  saudeDe: Map<string, ReturnType<typeof saudeObra>>;
  decisoesPendentes: Decisao[];
}) {
  const fases = useObrasStore((s) => s.fases);
  const despesas = useObrasStore((s) => s.despesas);
  const marcos = useObrasStore((s) => s.marcos);
  const updateObra = useObrasStore((s) => s.updateObra);
  const profiles = useProfilesStore((s) => s.profiles);
  const owners = useOwners();
  const navigate = useNavigate();
  const [zoom, setZoom] = useState<Zoom>("mes");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<{ id: string; dx: number } | null>(null);
  const dragStart = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const todayISO = new Date().toISOString().slice(0, 10);
  const dayPx = ZOOM_DAY_PX[zoom];

  // Para a escala, ignora obras concluídas há muito (não esticar a timeline para trás).
  const relevantes = obras.filter((o) => !(o.estado === "concluida" && o.dataFimPrevista < addDiasISO(todayISO, -75)));
  const baseRange = relevantes.length ? relevantes : obras;
  const allDates = baseRange.flatMap((o) => [o.dataInicio, o.dataFimPrevista]).filter(Boolean).sort();
  const min = addDiasISO(allDates[0] ?? todayISO, -10);
  const maxRaw = allDates[allDates.length - 1] ?? todayISO;
  const max = addDiasISO(maxRaw > todayISO ? maxRaw : todayISO, 14);
  const totalDays = Math.max(30, diasEntre(min, max));
  const chartW = Math.max(560, totalDays * dayPx);
  const xOf = (iso: string) => diasEntre(min, iso) * dayPx;
  const todayX = xOf(todayISO);

  const groups = obras.reduce<Record<string, Obra[]>>((acc, o) => {
    const k = ownerKey(o);
    (acc[k] = acc[k] ?? []).push(o);
    return acc;
  }, {});

  const months: { label: string; x: number; w: number; atual: boolean }[] = [];
  const cur = new Date(`${min}T00:00:00`);
  cur.setDate(1);
  const fimRange = new Date(`${max}T00:00:00`);
  const mesAtualKey = todayISO.slice(0, 7);
  while (cur <= fimRange) {
    const iso = cur.toISOString().slice(0, 10);
    const prox = new Date(cur);
    prox.setMonth(prox.getMonth() + 1);
    months.push({
      label: cur.toLocaleDateString("pt-PT", { month: "short", year: "2-digit" }),
      x: xOf(iso),
      w: diasEntre(iso, prox.toISOString().slice(0, 10)) * dayPx,
      atual: iso.slice(0, 7) === mesAtualKey,
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  // Auto-scroll para o período atual (no primeiro render e ao mudar de zoom)
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayX - 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  if (obras.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted">
          <Hammer size={28} className="mx-auto mb-2" />
          <p className="text-sm">Sem obras nesta vista.</p>
        </CardContent>
      </Card>
    );
  }

  const toggleRow = (id: string) =>
    setExpanded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const onPointerDown = (o: Obra, e: React.PointerEvent) => {
    if (!podeGerir(o, CURRENT_USER_ID)) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragStart.current = e.clientX;
    setDrag({ id: o.id, dx: 0 });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (drag) setDrag({ id: drag.id, dx: e.clientX - dragStart.current });
  };
  const onPointerUp = (o: Obra) => {
    if (!drag || drag.id !== o.id) return setDrag(null);
    const delta = Math.round(drag.dx / dayPx);
    setDrag(null);
    if (delta === 0) return;
    if (confirm(`Mover "${o.titulo}" ${delta > 0 ? "+" : ""}${delta} dias?`)) {
      updateObra(o.id, { dataInicio: addDiasISO(o.dataInicio, delta), dataFimPrevista: addDiasISO(o.dataFimPrevista, delta) });
      toast.success(`Datas atualizadas (${delta > 0 ? "+" : ""}${delta} dias) · sócios notificados`);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar de zoom */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-[11px] text-muted">Zoom</span>
        <div className="inline-flex rounded-full border border-line bg-card p-0.5 text-xs">
          {(["semana", "mes", "trimestre"] as Zoom[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={cn("rounded-full px-2.5 py-1 font-medium capitalize transition-colors", zoom === z ? "bg-primary text-white" : "text-muted hover:text-ink")}
            >
              {z === "mes" ? "Mês" : z}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div ref={scrollRef} className="max-h-[70vh] overflow-auto">
            <div style={{ width: LEFT_W + chartW }}>
              {/* Escala temporal (sticky topo) */}
              <div className="sticky top-0 z-20 flex border-b border-line bg-card/95 backdrop-blur-sm">
                <div className="sticky left-0 z-30 flex shrink-0 items-center border-r border-line bg-card px-4 text-[11px] font-semibold uppercase tracking-wider text-muted" style={{ width: LEFT_W, height: 40 }}>
                  Obra
                </div>
                <div className="relative" style={{ width: chartW, height: 40 }}>
                  {months.map((m, i) => (
                    <div key={i} className="absolute top-0 h-full border-l border-line/40" style={{ left: m.x, width: m.w }}>
                      {m.atual && <span className="absolute inset-0 bg-gold/10" />}
                      <span className={cn("absolute left-2 top-2.5 whitespace-nowrap text-[11px]", m.atual ? "font-semibold text-gold-dark" : "text-muted")}>{m.label}</span>
                    </div>
                  ))}
                  <span className="absolute top-1 z-10 -translate-x-1/2 rounded-full bg-danger px-1.5 py-0.5 text-[9px] font-semibold text-white" style={{ left: todayX }}>Hoje</span>
                </div>
              </div>

              {Object.entries(groups).map(([k, items]) => {
                const owner = owners[k];
                const progMedio = Math.round(items.reduce((s, o) => s + progressoReal(o, fases), 0) / items.length);
                return (
                  <div key={k}>
                    {/* Header de grupo */}
                    <div className="flex border-b border-line/60 bg-accent/30">
                      <div className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-line bg-accent/30 px-4 py-2" style={{ width: LEFT_W }}>
                        <MiniDonut pct={progMedio} />
                        {owner?.kind === "project" ? <Users2 size={13} className="text-gold-dark" /> : <Building2 size={13} className="text-secondary" />}
                        <Link to={owner?.href ?? "#"} className="truncate text-xs font-semibold text-ink hover:text-primary">{owner?.title ?? "—"}</Link>
                      </div>
                      <div className="relative" style={{ width: chartW }}>
                        <span className="absolute top-0 h-full w-px bg-danger/40" style={{ left: todayX }} />
                      </div>
                    </div>

                    {items.map((o) => {
                      const left = xOf(o.dataInicio);
                      const w = Math.max(8, xOf(o.dataFimPrevista) - left);
                      const prog = progressoReal(o, fases);
                      const g = gastoReal(o, despesas);
                      const cor = corRitmoHex(o, fases);
                      const fasesObra = fases.filter((f) => f.obraId === o.id).sort((a, b) => a.ordem - b.ordem);
                      const marcosObra = marcos.filter((m) => m.obraId === o.id);
                      const isOpen = expanded.has(o.id);
                      const voto = decisoesPendentes.some((d) => d.obra.id === o.id);
                      const gestorM = membrosDe(o).find((m) => m.role === "gestor");
                      const respId = gestorM?.userId ?? CURRENT_USER_ID;
                      const respNome = nomeProprio(profiles.find((p) => p.id === respId)?.fullName);
                      const proxMarco = marcosObra.filter((m) => m.estado !== "pago").sort((a, b) => (a.dataPrevista < b.dataPrevista ? -1 : 1))[0];
                      const souGestor = podeGerir(o, CURRENT_USER_ID);
                      const dxBar = drag?.id === o.id ? drag.dx : 0;
                      const hover = `${o.titulo}\nResponsável: ${respNome}\nGasto: ${eur(g)} / ${eur(o.orcamento)}\nProgresso: ${prog}%${proxMarco ? `\nPróximo marco: ${dataPT(proxMarco.dataPrevista)} · ${eur(proxMarco.valor)}` : ""}${souGestor ? "\n(arraste para ajustar datas)" : ""}`;
                      return (
                        <div key={o.id} id={`gantt-${o.id}`}>
                          <div className="flex rounded-md transition-colors hover:bg-bg/30">
                            <div className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-line/40 bg-card px-3" style={{ width: LEFT_W, height: 48 }}>
                              <button onClick={() => toggleRow(o.id)} disabled={fasesObra.length === 0} className={cn("text-muted disabled:opacity-30", isOpen && "rotate-90 transition-transform")}>
                                <ChevronRight size={14} />
                              </button>
                              <span className="h-4 w-1 shrink-0 rounded-full" style={{ background: CATEGORIA_ICON_COLOR[o.categoria] }} />
                              <Link to={`/obra/${o.id}`} className="min-w-0 flex-1 truncate text-xs font-medium text-ink hover:text-primary" title={o.titulo}>{o.titulo}</Link>
                              {voto && <span className="shrink-0 rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-semibold text-warning" title="A aguardar voto">voto</span>}
                              <RoleAvatar profile={profiles.find((p) => p.id === respId)} role={gestorM?.role ?? "gestor"} size="xs" />
                            </div>
                            <div className="relative" style={{ width: chartW, height: 48 }}>
                              <span className="absolute top-0 h-full w-px bg-danger/40" style={{ left: todayX }} />
                              {/* baseline prazo previsto */}
                              <span className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-line" style={{ left, width: w }} />
                              {/* barra com fill de progresso */}
                              <div
                                onPointerDown={(e) => onPointerDown(o, e)}
                                onPointerMove={onPointerMove}
                                onPointerUp={() => onPointerUp(o)}
                                title={hover}
                                className={cn("absolute top-1/2 h-7 -translate-y-1/2 overflow-hidden rounded-full ring-1 ring-inset ring-black/5", souGestor ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed", !drag && "transition-[left,width]")}
                                style={{ left: left + dxBar, width: w, background: `${cor}33` }}
                              >
                                <div className="h-full rounded-full" style={{ width: `${prog}%`, background: cor }} />
                              </div>
                              {/* marcos = diamantes ◆ */}
                              {marcosObra.map((m) => {
                                const pago = m.estado === "pago";
                                return (
                                  <button
                                    key={m.id}
                                    onClick={() => navigate(`/obra/${o.id}`)}
                                    title={`◆ ${m.titulo} · ${eur(m.valor)} · ${dataPT(m.dataPrevista)}${pago ? " · pago" : ""}`}
                                    className="absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ring-2 ring-card transition-transform hover:scale-125"
                                    style={{ left: xOf(m.dataPrevista), background: pago ? "#C8A66480" : "#C8A664" }}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          {/* Fases expandidas */}
                          {isOpen &&
                            fasesObra.map((f) => (
                              <div key={f.id} className="flex border-b border-line/30 bg-bg/20">
                                <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-line/30 bg-bg/40 py-1.5 pl-12 pr-3" style={{ width: LEFT_W }}>
                                  <span className="truncate text-[11px] text-muted">{f.titulo}</span>
                                </div>
                                <div className="relative" style={{ width: chartW, height: 28 }}>
                                  <span className="absolute top-0 h-full w-px bg-danger/30" style={{ left: todayX }} />
                                  <div className="absolute top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full" style={{ left: xOf(f.dataInicio), width: Math.max(6, xOf(f.dataFim) - xOf(f.dataInicio)), background: "#8B5E3C44" }}>
                                    <div className="h-full rounded-full bg-secondary" style={{ width: `${f.progresso}%` }} />
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 border-t border-line bg-bg/40 px-4 py-3 text-[11px] text-muted">
            <LegendDot color="#4A7C59" label="No prazo" />
            <LegendDot color="#C17E2A" label="A abrandar" />
            <LegendDot color="#9B3A2A" label="Atrasada" />
            <LegendDot color="#6B4C3B" label="Parada" />
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 rounded-[1px] bg-gold" /> Marco</span>
            <span className="flex items-center gap-1.5"><span className="h-[2px] w-4 rounded-full bg-line" /> Prazo previsto</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-danger/60" /> Hoje</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────────── Lista (estilo Linear, agrupada) ─────────────────────

const LISTA_GRID = "grid min-w-[860px] grid-cols-[minmax(190px,2.2fr)_104px_92px_120px_128px_104px_140px_36px] items-center gap-2";

function ListaPanel({ obras, saudeDe }: { obras: Obra[]; saudeDe: Map<string, ReturnType<typeof saudeObra>> }) {
  const fases = useObrasStore((s) => s.fases);
  const despesas = useObrasStore((s) => s.despesas);
  const marcos = useObrasStore((s) => s.marcos);
  const owners = useOwners();
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());

  if (obras.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted">
          <Hammer size={28} className="mx-auto mb-2" />
          <p className="text-sm">Sem obras nesta vista.</p>
        </CardContent>
      </Card>
    );
  }

  const groups = obras.reduce<Record<string, Obra[]>>((acc, o) => {
    const k = ownerKey(o);
    (acc[k] = acc[k] ?? []).push(o);
    return acc;
  }, {});

  const toggle = (k: string) =>
    setColapsados((p) => {
      const n = new Set(p);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            {/* Cabeçalho de colunas */}
            <div className={cn(LISTA_GRID, "border-b border-line bg-bg/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted")}>
              <span>Obra</span>
              <span>Saúde</span>
              <span>Equipa</span>
              <span>Progresso</span>
              <span className="text-right">Orçamento</span>
              <span>Prazo</span>
              <span>Próximo marco</span>
              <span />
            </div>

            {Object.entries(groups).map(([k, items]) => {
              const owner = owners[k];
              const progMedio = Math.round(items.reduce((s, o) => s + progressoReal(o, fases), 0) / items.length);
              const aberto = !colapsados.has(k);
              return (
                <div key={k}>
                  <button onClick={() => toggle(k)} className="flex w-full items-center gap-2 border-b border-line/60 bg-accent/30 px-4 py-2 text-left hover:bg-accent/50">
                    <ChevronRight size={14} className={cn("text-muted transition-transform", aberto && "rotate-90")} />
                    <MiniDonut pct={progMedio} />
                    {owner?.kind === "project" ? <Users2 size={13} className="text-gold-dark" /> : <Building2 size={13} className="text-secondary" />}
                    <span className="truncate text-xs font-semibold text-ink">{owner?.title ?? "—"}</span>
                    <span className="num rounded-full bg-card px-1.5 text-[10px] text-muted">{items.length}</span>
                  </button>
                  {aberto && items.map((o) => (
                    <ListaRow key={o.id} obra={o} saude={saudeDe.get(o.id) ?? saudeObra(o, fases, despesas, marcos)} fases={fases} despesas={despesas} marcos={marcos} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ListaRow({ obra: o, saude: s, fases, despesas, marcos }: { obra: Obra; saude: ReturnType<typeof saudeObra>; fases: Fase[]; despesas: Despesa[]; marcos: Marco[] }) {
  const navigate = useNavigate();
  const togglePausada = useObrasStore((st) => st.togglePausada);
  const [menu, setMenu] = useState(false);
  const g = gastoReal(o, despesas);
  const prog = progressoReal(o, fases);
  const desvio = g > o.orcamento;
  const todayISO = new Date().toISOString().slice(0, 10);
  const dias = diasEntre(todayISO, o.dataFimPrevista);
  const atrasada = o.estado !== "concluida" && dias < 0;
  const proxMarco = marcos.filter((m) => m.obraId === o.id && m.estado !== "pago").sort((a, b) => (a.dataPrevista < b.dataPrevista ? -1 : 1))[0];
  const souGestor = podeGerir(o, CURRENT_USER_ID);

  return (
    <div
      onClick={() => navigate(`/obra/${o.id}`)}
      className={cn(LISTA_GRID, "cursor-pointer border-b border-line/40 px-4 py-2.5 transition-colors hover:bg-bg/40")}
    >
      {/* Nome */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-4 w-1 shrink-0 rounded-full" style={{ background: CATEGORIA_ICON_COLOR[o.categoria] }} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{o.titulo}</p>
          <p className="text-[11px] text-muted">{CATEGORIA_LABEL[o.categoria]}</p>
        </div>
      </div>
      {/* Saúde */}
      <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: SAUDE_HEX[s.saude] }}>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SAUDE_HEX[s.saude] }} />
        {SAUDE_LABEL[s.saude]}
      </span>
      {/* Equipa */}
      <div>{membrosDe(o).length > 0 ? <MemberStack obra={o} max={3} size="xs" /> : <span className="text-[11px] text-muted">Solo</span>}</div>
      {/* Progresso */}
      <div>
        <div className="mb-0.5 text-[10px] text-muted">{prog}%</div>
        <div className="h-1.5 overflow-hidden rounded-full bg-accent">
          <div className="h-full rounded-full" style={{ width: `${prog}%`, background: SAUDE_HEX[s.saude] }} />
        </div>
      </div>
      {/* Orçamento */}
      <div className="text-right">
        <p className={cn("num text-sm font-medium", desvio ? "text-danger" : "text-ink")}>{eur(g)}</p>
        <p className="num text-[10px] text-muted">de {eur(o.orcamento)}</p>
      </div>
      {/* Prazo */}
      <span className={cn("num text-xs", atrasada ? "font-semibold text-danger" : "text-muted")}>
        {o.estado === "concluida" ? "concluída" : atrasada ? `atrasada ${Math.abs(dias)}d` : `${dias}d`}
      </span>
      {/* Próximo marco */}
      <span className="num flex items-center gap-1.5 text-[11px] text-muted">
        {proxMarco ? (
          <>
            <span className="h-2 w-2 shrink-0 rotate-45 rounded-[1px] bg-gold" />
            {dataPT(proxMarco.dataPrevista)} · {eur(proxMarco.valor)}
          </>
        ) : (
          "—"
        )}
      </span>
      {/* Ações */}
      <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setMenu((v) => !v)} className="rounded-lg p-1 text-muted hover:bg-accent hover:text-ink">
          <MoreHorizontal size={16} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-7 z-40 w-44 rounded-xl border border-line bg-card py-1 shadow-xl">
              <button onClick={() => navigate(`/obra/${o.id}`)} className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-accent">Abrir detalhe</button>
              {souGestor && o.estado !== "concluida" && (
                <button onClick={() => { togglePausada(o.id); setMenu(false); toast.success(o.estado === "pausada" ? "Obra retomada" : "Obra pausada"); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink hover:bg-accent">
                  {o.estado === "pausada" ? <><PlayCircle size={14} /> Retomar</> : <><PauseCircle size={14} /> Pausar</>}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
