import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import {
  CalendarClock,
  CalendarRange,
  Plus,
  Search as SearchIcon,
  List as ListIcon,
  Building2,
  Hourglass,
  Wallet,
  Flag,
  TriangleAlert,
  X,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useExampleData } from "@/store/useExampleData";
import {
  useProjectStagesStore,
  STAGE_COUNT,
  etapaAtual,
  diasNaEtapa,
  projetoParado,
  prazoUltrapassado,
  type InvestmentProject,
  type Stage,
  type InvestMode,
} from "@/store/useProjectStagesStore";
import { usePropertiesStore, PROP_TYPE_LABEL, type Property } from "@/store/usePropertiesStore";
import { custoEsperaMes, custoEsperaDia } from "@/lib/calc/espera";
import { eur, dataPTShort, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

type Vista = "progresso" | "cronograma";

// As 11 etapas agrupadas em 4 fases legíveis.
const FASES = [
  { nome: "Preparar", de: 1, ate: 3 },
  { nome: "Comprar", de: 4, ate: 7 },
  { nome: "Transformar", de: 8, ate: 9 },
  { nome: "Rentabilizar", de: 10, ate: 11 },
] as const;

interface Row {
  project: InvestmentProject;
  stages: Stage[];
  atual: Stage | undefined;
  property?: Property;
  concluido: boolean;
  paradoDias: number | null;
  atrasado: boolean;
  esperaMes: number;
  esperaDia: number;
  acumulado: number;
  mesesRestantes: number;
  atencao: boolean;
}

export default function CalendarioInvestimento() {
  const { enabled } = useExampleData();
  const projects = useProjectStagesStore((s) => s.projects);
  const allStages = useProjectStagesStore((s) => s.stages);
  const addProject = useProjectStagesStore((s) => s.addProject);
  const properties = usePropertiesStore((s) => s.properties);
  const navigate = useNavigate();

  const [vista, setVista] = useState<Vista>("progresso");
  const [q, setQ] = useState("");
  const [soAtencao, setSoAtencao] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const stagesByProject = useMemo(() => {
    const map = new Map<string, Stage[]>();
    for (const s of allStages) {
      const arr = map.get(s.projectId) ?? [];
      arr.push(s);
      map.set(s.projectId, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.stageNumber - b.stageNumber);
    return map;
  }, [allStages]);

  const propMap = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);

  const lista = enabled ? projects : [];

  // Todas as derivações financeiras por projeto (uma vez, aqui).
  const rows = useMemo<Row[]>(() => {
    return lista.map((project) => {
      const stages = stagesByProject.get(project.id) ?? [];
      const atual = etapaAtual(stages);
      const property = project.propertyId ? propMap.get(project.propertyId) : undefined;
      const concluido = stages.length > 0 && stages.every((s) => s.status === "concluida");
      const paradoDias = projetoParado(stages);
      const atrasado = prazoUltrapassado(stages);
      const esperaMes = concluido ? 0 : custoEsperaMes(property);
      const esperaDia = concluido ? 0 : custoEsperaDia(property);
      const dias = diasNaEtapa(atual) ?? 0;
      const acumulado = paradoDias !== null ? esperaDia * dias : 0;
      const mesesRestantes = stages.filter((s) => s.status !== "concluida").length; // ~1 mês por etapa
      const atencao = paradoDias !== null || atrasado || atual?.status === "bloqueada";
      return { project, stages, atual, property, concluido, paradoDias, atrasado, esperaMes, esperaDia, acumulado, mesesRestantes, atencao };
    });
  }, [lista, stagesByProject, propMap]);

  const filtradas = useMemo(
    () =>
      rows.filter((r) => {
        if (q && !r.project.nome.toLowerCase().includes(q.toLowerCase())) return false;
        if (soAtencao && !r.atencao) return false;
        return true;
      }),
    [rows, q, soAtencao]
  );

  // Topo: frase + 3 cards
  const parados = rows.filter((r) => r.paradoDias !== null);
  const custoParadosMes = parados.reduce((s, r) => s + r.esperaMes, 0);
  const semRetorno = rows.filter((r) => !r.concluido);
  const capitalEmpatado = semRetorno.reduce(
    (s, r) => s + (r.property?.entrada ?? 0) + r.stages.reduce((c, st) => c + (st.custoReal ?? 0), 0),
    0
  );
  const esperaMesTotal = semRetorno.reduce((s, r) => s + r.esperaMes, 0);
  const esperaDiaTotal = semRetorno.reduce((s, r) => s + r.esperaDia, 0);
  const nAtencao = rows.filter((r) => r.atencao).length;

  const proximoMarco = useMemo(() => {
    let best: { nome: string; projeto: string; dias: number } | null = null;
    for (const r of rows) {
      if (r.concluido || !r.atual?.dataFimPrevista) continue;
      const dias = Math.round((new Date(`${r.atual.dataFimPrevista}T00:00:00`).getTime() - Date.now()) / 86400000);
      if (!best || dias < best.dias) best = { nome: r.atual.stageName, projeto: r.project.nome, dias };
    }
    return best;
  }, [rows]);

  const onCreate = (nome: string, modo: InvestMode, propertyId?: string) => {
    const id = addProject({ nome, modo, propertyId });
    setShowNew(false);
    toastSuccess("Investimento iniciado", { description: nome });
    navigate(`/financas/calendario-investimento/${id}`);
  };

  return (
    <>
      <PageHeader
        title="Calendário do Investimento"
        subtitle={enabled ? `${lista.length} projetos em carteira` : "Da simulação ao primeiro inquilino"}
        showExampleToggle
        actions={
          <Button onClick={() => setShowNew(true)}>
            <Plus size={16} /> Iniciar novo investimento
          </Button>
        }
      />

      {!enabled ? (
        <EmptyState
          icon={CalendarClock}
          title="Acompanhe cada investimento etapa a etapa"
          description="Ative o toggle «Dados de exemplo» para explorar, ou inicie o seu primeiro investimento e siga as 11 etapas do ciclo."
          ctaLabel="+ Iniciar primeiro investimento"
          onCta={() => setShowNew(true)}
        />
      ) : (
        <>
          {/* Frase do topo — o estado da carteira em linguagem humana */}
          <p className="mb-5 max-w-3xl font-display text-2xl font-bold leading-snug text-ink sm:text-[28px]">
            {parados.length > 0 ? (
              <>
                {parados.length === 1 ? "1 projeto parado está" : `${parados.length} projetos parados estão`} a
                custar-lhe <span className="num text-danger">{eur(custoParadosMes)}</span> por mês.
              </>
            ) : (
              <>{lista.length === 1 ? "1 projeto" : `${lista.length} projetos`} no caminho certo.</>
            )}
          </p>

          {/* 3 cards */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="Capital empatado"
              value={eur(capitalEmpatado)}
              hint={semRetorno.length > 0 ? plural(semRetorno.length, "projeto sem retorno", "projetos sem retorno") : "todos a render"}
              hintTone={semRetorno.length > 0 ? "default" : "success"}
              icon={Wallet}
            />
            <StatCard
              label="Custo de espera mensal"
              value={eur(esperaMesTotal)}
              hint={esperaMesTotal > 0 ? `${eur(esperaDiaTotal)}/dia` : "sem custos de espera"}
              hintTone={esperaMesTotal > 0 ? "danger" : "success"}
              icon={Hourglass}
              iconTone={esperaMesTotal > 0 ? "danger" : "success"}
            />
            <StatCard
              label="Próximo marco"
              value={proximoMarco?.nome ?? "—"}
              hint={
                proximoMarco
                  ? `${proximoMarco.projeto} · ${proximoMarco.dias >= 0 ? `em ${proximoMarco.dias} dias` : `atrasado ${-proximoMarco.dias}d`}`
                  : "sem marcos pendentes"
              }
              hintTone={proximoMarco && proximoMarco.dias < 0 ? "danger" : "default"}
              icon={Flag}
              iconTone="gold"
            />
          </div>

          {/* Barra de controlo: pesquisa + 2 chips + vista */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3">
              <SearchIcon size={15} className="text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar projeto…"
                className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted sm:w-44"
              />
            </div>
            <FiltroChip active={!soAtencao} onClick={() => setSoAtencao(false)}>
              Todos
            </FiltroChip>
            <FiltroChip active={soAtencao} tone="danger" onClick={() => setSoAtencao(true)}>
              <TriangleAlert size={13} /> Precisa de atenção{nAtencao > 0 && <span className="num">({nAtencao})</span>}
            </FiltroChip>

            <div className="ml-auto inline-flex rounded-lg border border-line bg-card p-0.5">
              <VistaBtn icon={ListIcon} label="Progresso" active={vista === "progresso"} onClick={() => setVista("progresso")} />
              <VistaBtn icon={CalendarRange} label="Cronograma" active={vista === "cronograma"} onClick={() => setVista("cronograma")} />
            </div>
          </div>

          {filtradas.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center text-sm text-muted">
              {soAtencao ? "Nenhum projeto precisa de atenção." : "Nenhum projeto corresponde à pesquisa."}
            </p>
          ) : vista === "progresso" ? (
            <ProgressoView rows={filtradas} propMap={propMap} />
          ) : (
            <CronogramaView rows={filtradas} />
          )}
        </>
      )}

      {showNew && <NovoInvestimento properties={properties} onClose={() => setShowNew(false)} onCreate={onCreate} />}
    </>
  );
}

// ───────────────────── Helpers visuais ─────────────────────

type PropMap = Map<string, Property>;

function resolveCover(project: InvestmentProject, propMap: PropMap) {
  if (project.propertyId) {
    const p = propMap.get(project.propertyId);
    if (p) return { foto: p.photos[0]?.url, cidade: p.city, tipo: PROP_TYPE_LABEL[p.type], nome: p.name };
  }
  return { foto: project.fotoUrl, cidade: "Sem imóvel (em procura)", tipo: project.modo === "flip" ? "Flip" : "Arrendamento", nome: project.nome };
}

function VistaBtn({ icon: Icon, label, active, onClick }: { icon: typeof ListIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", active ? "bg-primary text-white" : "text-muted")}>
      <Icon size={14} /> <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function FiltroChip({ active, tone, onClick, children }: { active: boolean; tone?: "danger"; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
        active
          ? tone === "danger"
            ? "border-danger/40 bg-danger/10 text-danger"
            : "border-primary bg-primary text-white"
          : "border-line bg-card text-muted hover:bg-accent hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

// ───────────────────── Vista Progresso ─────────────────────

function ProgressoView({ rows, propMap }: { rows: Row[]; propMap: PropMap }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const info = resolveCover(r.project, propMap);
        const critico = r.paradoDias !== null;
        return (
          <Card key={r.project.id} className={cn("cursor-pointer transition-shadow hover:shadow-md", critico && "border-l-4 border-l-danger")}>
            <CardContent className="p-4 sm:p-5" onClick={() => navigate(`/financas/calendario-investimento/${r.project.id}`)}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                {/* Esquerda: identidade */}
                <div className="flex w-full items-center gap-3 lg:w-60 lg:shrink-0">
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-accent">
                    {info.foto ? (
                      <img src={info.foto} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted"><Building2 size={18} /></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold text-ink">{info.nome}</p>
                    <p className="truncate text-xs text-muted">{info.cidade}</p>
                    <span className="mt-1 inline-flex rounded-full border border-line bg-bg/50 px-2 py-0.5 text-[10px] font-medium text-muted">
                      {r.project.modo === "flip" ? "Flip" : "Arrendamento"}
                    </span>
                  </div>
                </div>

                {/* Centro: fases */}
                <div className="min-w-0 flex-1">
                  <FaseBar stages={r.stages} atualNum={r.atual?.stageNumber} />
                  <p className="mt-1.5 text-xs text-muted">
                    {r.atual ? `Etapa ${r.atual.stageNumber} de ${STAGE_COUNT} · ${r.atual.stageName}` : "Ciclo completo"}
                  </p>
                </div>

                {/* Direita: veredito financeiro */}
                <div className="shrink-0 lg:w-56 lg:border-l lg:border-line/60 lg:pl-5 lg:text-right">
                  <Veredito r={r} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function FaseBar({ stages, atualNum }: { stages: Stage[]; atualNum?: number }) {
  return (
    <div className="flex gap-1.5">
      {FASES.map((f) => {
        const grupo = stages.filter((s) => s.stageNumber >= f.de && s.stageNumber <= f.ate);
        const done = grupo.length > 0 && grupo.every((s) => s.status === "concluida");
        const atual = atualNum !== undefined && atualNum >= f.de && atualNum <= f.ate;
        // preenchimento parcial dentro da fase atual (½ crédito pela etapa em curso)
        const fill = grupo.length > 0
          ? (grupo.filter((s) => s.status === "concluida").length + grupo.filter((s) => s.status === "em_curso").length * 0.5) / grupo.length
          : 0;
        return (
          <div key={f.nome} style={{ width: `${((f.ate - f.de + 1) / STAGE_COUNT) * 100}%` }}>
            <div className={cn("relative h-2.5 overflow-hidden rounded-full", done ? "bg-primary" : atual ? "bg-gold/20" : "bg-accent")}>
              {atual && <div className="absolute inset-y-0 left-0 animate-pulse rounded-full bg-gold" style={{ width: `${Math.max(fill * 100, 12)}%` }} />}
            </div>
            <p className={cn("mt-1 hidden truncate text-[10px] sm:block", atual ? "font-semibold text-gold-dark" : done ? "text-muted" : "text-muted/60")}>
              {f.nome}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function Veredito({ r }: { r: Row }) {
  if (r.concluido) {
    const renda = r.property?.rendaMensal ?? 0;
    if (renda > 0)
      return (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-success">A render</p>
          <p className="font-display text-2xl font-bold text-success">
            <span className="num">{eur(renda)}</span>
            <span className="text-sm font-medium">/mês</span>
          </p>
        </div>
      );
    return (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-success">Concluído</p>
        <p className="font-display text-xl font-bold text-ink">Ciclo completo</p>
      </div>
    );
  }
  if (r.paradoDias !== null)
    return (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-danger">Parado há {r.paradoDias} dias</p>
        <p className="font-display text-2xl font-bold text-danger">
          <span className="text-sm font-medium">já custou </span>
          <span className="num">{eur(r.acumulado)}</span>
        </p>
        {r.esperaDia > 0 && <p className="num text-xs text-muted">custa-lhe {eur(r.esperaDia)}/dia</p>}
      </div>
    );
  return (
    <div>
      <p className={cn("text-[10px] font-semibold uppercase tracking-wider", r.atrasado ? "text-warning" : "text-muted")}>
        {r.atrasado ? "Prazo ultrapassado" : "Em curso"}
      </p>
      <p className="font-display text-2xl font-bold text-ink">
        Faltam ~<span className="num">{r.mesesRestantes}</span> {r.mesesRestantes === 1 ? "mês" : "meses"}
      </p>
      <p className="num text-xs text-muted">
        {r.project.modo === "flip" ? "até à venda" : "até render"}
        {r.esperaDia > 0 && ` · ${eur(r.esperaDia)}/dia`}
      </p>
    </div>
  );
}

// ───────────────────── Vista Cronograma ─────────────────────

const MARCOS = new Set([6, 7, 8, 10, 11]); // CPCV · Escritura · Obras · Mercado · Inquilino/Venda

interface Evento {
  date: string;
  feito: boolean;
  atrasado: boolean;
  nome: string;
  projeto: string;
  projectId: string;
  stageNumber: number;
}

function CronogramaView({ rows }: { rows: Row[] }) {
  const navigate = useNavigate();
  const hoje = new Date().toISOString().slice(0, 10);

  const eventos = useMemo<Evento[]>(() => {
    const out: Evento[] = [];
    for (const r of rows) {
      for (const s of r.stages) {
        if (!MARCOS.has(s.stageNumber)) continue;
        const feito = s.status === "concluida";
        const date = feito ? s.dataFimReal ?? s.dataFimPrevista : s.dataFimPrevista;
        if (!date) continue;
        out.push({ date, feito, atrasado: !feito && date < hoje, nome: s.stageName, projeto: r.project.nome, projectId: r.project.id, stageNumber: s.stageNumber });
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [rows, hoje]);

  // Feitos primeiro, depois «Hoje», depois os que faltam — legível mesmo com datas fora de ordem.
  const ordenados = [...eventos.filter((e) => e.feito), ...eventos.filter((e) => !e.feito)];
  const primeiroFuturo = ordenados.findIndex((e) => !e.feito);
  const proxIdx = ordenados.findIndex((e) => !e.feito && e.date >= hoje);

  if (ordenados.length === 0)
    return <p className="rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center text-sm text-muted">Sem marcos com datas definidas.</p>;

  const items: React.ReactNode[] = [];
  ordenados.forEach((e, i) => {
    if (i === primeiroFuturo) items.push(<HojeDivider key="hoje" />);
    items.push(
      <li
        key={`${e.projectId}-${e.stageNumber}`}
        className="group relative cursor-pointer pb-5"
        onClick={() => navigate(`/financas/calendario-investimento/${e.projectId}?etapa=${e.stageNumber}`)}
      >
        <span
          className={cn(
            "absolute -left-[30px] top-1 h-3 w-3 rounded-full border-2",
            e.feito ? "border-success bg-success" : e.atrasado ? "border-danger bg-danger" : i === proxIdx ? "border-gold bg-gold" : "border-line bg-card"
          )}
        />
        <p className="num text-[11px] text-muted">
          {dataPTShort(e.date)}
          <span className={cn("ml-1.5", e.feito ? "text-success" : e.atrasado ? "font-medium text-danger" : i === proxIdx ? "font-medium text-gold-dark" : "")}>
            {e.feito ? "· concluído" : e.atrasado ? "· atrasado" : "· previsto"}
          </span>
        </p>
        <p className="text-sm font-medium text-ink group-hover:text-primary">
          {e.nome} <span className="font-normal text-muted">· {e.projeto}</span>
        </p>
      </li>
    );
  });
  if (primeiroFuturo === -1) items.push(<HojeDivider key="hoje" />);

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <ol className="relative ml-2 border-l-2 border-line pl-6">{items}</ol>
      </CardContent>
    </Card>
  );
}

function HojeDivider() {
  return (
    <li className="relative pb-5">
      <span className="absolute -left-[33px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-gold bg-gold/20">
        <span className="h-1.5 w-1.5 rounded-full bg-gold-dark" />
      </span>
      <span className="inline-flex rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold-dark">
        Hoje · <span className="num ml-1">{dataPTShort(new Date())}</span>
      </span>
    </li>
  );
}

// ───────────────────── Novo investimento ─────────────────────

function NovoInvestimento({
  properties,
  onClose,
  onCreate,
}: {
  properties: Property[];
  onClose: () => void;
  onCreate: (nome: string, modo: InvestMode, propertyId?: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [modo, setModo] = useState<InvestMode>("arrendamento");
  const [propertyId, setPropertyId] = useState("");

  const submit = () => {
    const prop = properties.find((p) => p.id === propertyId);
    const finalNome = nome.trim() || prop?.name || "Novo investimento";
    onCreate(finalNome, modo, propertyId || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Iniciar novo investimento</h2>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>
        <div className="space-y-3 p-5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Nome do projeto</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Apartamento Príncipe Real" className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Modo</span>
            <select value={modo} onChange={(e) => setModo(e.target.value as InvestMode)} className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary">
              <option value="arrendamento">Arrendamento</option>
              <option value="flip">Flip (compra-recupera-vende)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Imóvel (opcional)</span>
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary">
              <option value="">— Ainda sem imóvel (em procura) —</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-muted">Serão criadas automaticamente as 11 etapas do ciclo de investimento.</p>
        </div>
        <div className="flex items-center justify-between border-t border-line px-5 py-4">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}><ArrowRight size={16} /> Criar e abrir</Button>
        </div>
      </div>
    </div>
  );
}
