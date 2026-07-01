import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CalendarClock,
  Plus,
  Search as SearchIcon,
  LayoutGrid,
  List as ListIcon,
  GitBranch,
  Check,
  Lock,
  TriangleAlert,
  Building2,
  X,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { useExampleData } from "@/store/useExampleData";
import {
  useProjectStagesStore,
  STAGE_TEMPLATES,
  STAGE_COUNT,
  STATUS_LABEL,
  progressoProjeto,
  etapaAtual,
  diasNaEtapa,
  projetoParado,
  prazoUltrapassado,
  type InvestmentProject,
  type Stage,
  type StageStatus,
  type InvestMode,
} from "@/store/useProjectStagesStore";
import { usePropertiesStore, PROP_TYPE_LABEL } from "@/store/usePropertiesStore";
import { cn } from "@/lib/utils";

type Vista = "timeline" | "kanban" | "lista";

export default function CalendarioInvestimento() {
  const { enabled } = useExampleData();
  const projects = useProjectStagesStore((s) => s.projects);
  const allStages = useProjectStagesStore((s) => s.stages);
  const addProject = useProjectStagesStore((s) => s.addProject);
  const properties = usePropertiesStore((s) => s.properties);

  const [vista, setVista] = useState<Vista>("timeline");
  const [q, setQ] = useState("");
  const [fEtapa, setFEtapa] = useState<"todas" | number>("todas");
  const [fStatus, setFStatus] = useState<"todos" | StageStatus>("todos");
  const [fModo, setFModo] = useState<"todos" | InvestMode>("todos");
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

  const rows = useMemo(() => {
    return lista
      .map((p) => {
        const stages = stagesByProject.get(p.id) ?? [];
        const atual = etapaAtual(stages);
        return { project: p, stages, atual };
      })
      .filter(({ project, atual }) => {
        if (q && !project.nome.toLowerCase().includes(q.toLowerCase())) return false;
        if (fModo !== "todos" && project.modo !== fModo) return false;
        if (fEtapa !== "todas" && atual?.stageNumber !== fEtapa) return false;
        if (fStatus !== "todos" && atual?.status !== fStatus) return false;
        return true;
      });
  }, [lista, stagesByProject, q, fModo, fEtapa, fStatus]);

  // KPIs
  const kpis = useMemo(() => {
    let procura = 0, obras = 0, render = 0, bloqueados = 0;
    for (const p of lista) {
      const stages = stagesByProject.get(p.id) ?? [];
      const atual = etapaAtual(stages);
      if (stages.some((s) => s.status === "bloqueada")) bloqueados++;
      if (!atual) continue;
      if (atual.stageNumber === 3) procura++;
      if (atual.stageNumber === 8) obras++;
      if (atual.stageNumber >= 10) render++;
    }
    return { ativos: lista.length, procura, obras, render, bloqueados };
  }, [lista, stagesByProject]);

  const onCreate = (nome: string, modo: InvestMode, propertyId?: string) => {
    const id = addProject({ nome, modo, propertyId });
    setShowNew(false);
    toast.success("Investimento iniciado ✨", { description: nome });
    navigate(`/financas/calendario-investimento/${id}`);
  };

  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        title="Calendário do Investimento"
        subtitle={enabled ? `${lista.length} projetos · 11 etapas do ciclo de investimento` : "Da simulação ao primeiro inquilino"}
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
          {/* KPIs */}
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Projetos ativos" value={String(kpis.ativos)} icon={CalendarClock} />
            <StatCard label="Em procura" value={String(kpis.procura)} icon={SearchIcon} iconTone="warning" />
            <StatCard label="Em obras" value={String(kpis.obras)} icon={Building2} iconTone="warning" />
            <StatCard label="A render" value={String(kpis.render)} icon={Check} iconTone="success" />
            <StatCard label="Bloqueados" value={String(kpis.bloqueados)} hint={kpis.bloqueados > 0 ? "Requerem atenção" : "Tudo a fluir"} hintTone={kpis.bloqueados > 0 ? "danger" : "success"} icon={TriangleAlert} iconTone={kpis.bloqueados > 0 ? "danger" : "default"} />
          </div>

          {/* Barra de controlo */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3">
              <SearchIcon size={15} className="text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar projeto…" className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted sm:w-48" />
            </div>
            <select value={String(fEtapa)} onChange={(e) => setFEtapa(e.target.value === "todas" ? "todas" : Number(e.target.value))} className={selectCls}>
              <option value="todas">Etapa: Todas</option>
              {STAGE_TEMPLATES.map((t, i) => (
                <option key={i} value={i + 1}>{i + 1}. {t.nome}</option>
              ))}
            </select>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value as typeof fStatus)} className={selectCls}>
              <option value="todos">Status: Todos</option>
              <option value="em_curso">Em curso</option>
              <option value="pendente">Pendente</option>
              <option value="concluida">Concluída</option>
              <option value="bloqueada">Bloqueada</option>
            </select>
            <select value={fModo} onChange={(e) => setFModo(e.target.value as typeof fModo)} className={selectCls}>
              <option value="todos">Modo: Todos</option>
              <option value="arrendamento">Arrendamento</option>
              <option value="flip">Flip</option>
            </select>

            <div className="sm:ml-auto inline-flex rounded-lg border border-line bg-card p-0.5">
              <VistaBtn icon={GitBranch} label="Timeline" active={vista === "timeline"} onClick={() => setVista("timeline")} />
              <VistaBtn icon={LayoutGrid} label="Kanban" active={vista === "kanban"} onClick={() => setVista("kanban")} />
              <VistaBtn icon={ListIcon} label="Lista" active={vista === "lista"} onClick={() => setVista("lista")} />
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center text-sm text-muted">
              Nenhum projeto corresponde aos filtros.
            </p>
          ) : vista === "timeline" ? (
            <TimelineView rows={rows} propMap={propMap} />
          ) : vista === "kanban" ? (
            <KanbanView rows={rows} propMap={propMap} />
          ) : (
            <ListaView rows={rows} propMap={propMap} />
          )}
        </>
      )}

      {showNew && (
        <NovoInvestimento
          properties={properties}
          onClose={() => setShowNew(false)}
          onCreate={onCreate}
        />
      )}
    </>
  );
}

const selectCls = "h-9 rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

// ───────────────────── Helpers visuais ─────────────────────

function resolveCover(project: InvestmentProject, propMap: Map<string, ReturnType<typeof usePropertiesStore.getState>["properties"][number]>) {
  if (project.propertyId) {
    const p = propMap.get(project.propertyId);
    if (p) return { foto: p.photos[0]?.url, cidade: p.city, tipo: PROP_TYPE_LABEL[p.type], nome: p.name };
  }
  return { foto: project.fotoUrl, cidade: "Sem imóvel (em procura)", tipo: project.modo === "flip" ? "Flip" : "Arrendamento", nome: project.nome };
}

function VistaBtn({ icon: Icon, label, active, onClick }: { icon: typeof GitBranch; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", active ? "bg-primary text-white" : "text-muted")}>
      <Icon size={14} /> <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function StageDot({ stage, onClick }: { stage: Stage; onClick: () => void }) {
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-transform hover:scale-110";
  const cls =
    stage.status === "concluida" ? "border-success bg-success text-white"
      : stage.status === "em_curso" ? "border-primary bg-primary text-white animate-pulse"
        : stage.status === "bloqueada" ? "border-danger bg-danger text-white"
          : "border-line bg-card text-muted";
  return (
    <button onClick={onClick} className={cn(base, cls)} title={`${stage.stageNumber}. ${stage.stageName} · ${STATUS_LABEL[stage.status]}`}>
      {stage.status === "concluida" ? <Check size={14} /> : stage.status === "bloqueada" ? <Lock size={12} /> : stage.stageNumber}
    </button>
  );
}

type Row = { project: InvestmentProject; stages: Stage[]; atual: Stage | undefined };
type PropMap = Map<string, ReturnType<typeof usePropertiesStore.getState>["properties"][number]>;

// ───────────────────── Timeline ─────────────────────

function TimelineView({ rows, propMap }: { rows: Row[]; propMap: PropMap }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      {rows.map(({ project, stages, atual }) => {
        const info = resolveCover(project, propMap);
        const prog = progressoProjeto(stages);
        const parado = projetoParado(stages);
        const atrasado = prazoUltrapassado(stages);
        const dias = diasNaEtapa(atual);
        return (
          <Card key={project.id}>
            <CardContent>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                {/* Info */}
                <Link to={`/financas/calendario-investimento/${project.id}`} className="flex w-full items-center gap-3 lg:w-64 lg:shrink-0">
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-accent">
                    {info.foto ? <img src={info.foto} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-muted"><Building2 size={18} /></div>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold text-ink">{info.nome}</p>
                    <p className="truncate text-xs text-muted">{info.cidade}</p>
                  </div>
                </Link>

                {/* Stepper horizontal */}
                <div className="min-w-0 flex-1 overflow-x-auto">
                  <div className="flex items-center gap-0 pb-1">
                    {stages.map((s, i) => (
                      <div key={s.id} className="flex items-center">
                        <StageDot stage={s} onClick={() => navigate(`/financas/calendario-investimento/${project.id}?etapa=${s.stageNumber}`)} />
                        {i < stages.length - 1 && (
                          <span className={cn("h-0.5 w-6 sm:w-8", s.status === "concluida" ? "bg-success" : "bg-line")} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Estado */}
                <div className="flex shrink-0 items-center gap-4 lg:w-56 lg:flex-col lg:items-end">
                  <div className="text-right">
                    <p className="text-sm font-medium text-ink">{atual ? `${atual.stageNumber}. ${atual.stageName}` : "Concluído 🎉"}</p>
                    <p className="num text-xs text-muted">
                      {prog}% concluído{dias !== null ? ` · ${dias}d na etapa` : ""}
                    </p>
                  </div>
                  {(parado || atrasado) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-danger/12 px-2 py-0.5 text-[11px] font-medium text-danger">
                      <TriangleAlert size={11} /> {parado ? `Parado ${parado}d` : "Prazo ultrapassado"}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ───────────────────── Kanban ─────────────────────

function KanbanView({ rows, propMap }: { rows: Row[]; propMap: PropMap }) {
  const navigate = useNavigate();
  const setStageStatus = useProjectStagesStore((s) => s.setStageStatus);
  const stagesOf = useProjectStagesStore((s) => s.stagesOf);

  const moverPara = (projectId: string, etapaDestino: number) => {
    const stages = stagesOf(projectId);
    for (const s of stages) {
      if (s.stageNumber < etapaDestino && s.status !== "concluida") setStageStatus(s.id, "concluida");
      else if (s.stageNumber === etapaDestino) setStageStatus(s.id, "em_curso");
      else if (s.stageNumber > etapaDestino && s.status !== "pendente") setStageStatus(s.id, "pendente");
    }
    toast.success(`Movido para etapa ${etapaDestino}`);
  };

  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3" style={{ minWidth: STAGE_COUNT * 220 }}>
        {STAGE_TEMPLATES.map((t, i) => {
          const n = i + 1;
          const cards = rows.filter((r) => r.atual?.stageNumber === n);
          return (
            <div
              key={n}
              className="w-[210px] shrink-0 rounded-2xl border border-line bg-bg/50 p-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const pid = e.dataTransfer.getData("text/plain");
                if (pid) moverPara(pid, n);
              }}
            >
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {n}. {t.nome} <span className="text-muted/60">· {cards.length}</span>
              </p>
              <div className="space-y-2">
                {cards.map(({ project, atual, stages }) => {
                  const info = resolveCover(project, propMap);
                  return (
                    <div
                      key={project.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", project.id)}
                      onClick={() => navigate(`/financas/calendario-investimento/${project.id}`)}
                      className="cursor-pointer rounded-xl border border-line bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-10 shrink-0 overflow-hidden rounded bg-accent">
                          {info.foto ? <img src={info.foto} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-muted"><Building2 size={12} /></div>}
                        </div>
                        <p className="min-w-0 flex-1 truncate text-xs font-medium text-ink">{info.nome}</p>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <StatusBadge status={atual?.status ?? "pendente"} />
                        <span className="num text-[10px] text-muted">{progressoProjeto(stages)}%</span>
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && <p className="py-3 text-center text-[11px] text-muted/60">—</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────── Lista ─────────────────────

function ListaView({ rows, propMap }: { rows: Row[]; propMap: PropMap }) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-bg/40 text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Projeto</th>
                <th className="px-4 py-2.5 text-left font-semibold">Etapa atual</th>
                <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold">Dias na etapa</th>
                <th className="px-4 py-2.5 text-left font-semibold">Próxima ação</th>
                <th className="px-4 py-2.5 text-left font-semibold">Prazo previsto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ project, stages, atual }) => {
                const info = resolveCover(project, propMap);
                const dias = diasNaEtapa(atual);
                const proxima = atual?.checklist.find((c) => !c.feito)?.texto ?? (atual ? "Concluir etapa" : "—");
                return (
                  <tr key={project.id} onClick={() => navigate(`/financas/calendario-investimento/${project.id}`)} className="cursor-pointer border-t border-line/40 hover:bg-bg/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{info.nome}</p>
                      <p className="text-[11px] text-muted">{info.cidade}</p>
                    </td>
                    <td className="px-4 py-3">{atual ? `${atual.stageNumber}. ${atual.stageName}` : "Concluído"}</td>
                    <td className="px-4 py-3"><StatusBadge status={atual?.status ?? "concluida"} /></td>
                    <td className="num px-4 py-3 text-right">{dias !== null ? `${dias}d` : "—"}</td>
                    <td className="px-4 py-3 text-muted">{proxima}</td>
                    <td className="num px-4 py-3 text-xs text-muted">{atual?.dataFimPrevista ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: StageStatus }) {
  const map: Record<StageStatus, "success" | "info" | "warning" | "danger" | "neutral"> = {
    concluida: "success",
    em_curso: "info",
    pendente: "neutral",
    bloqueada: "danger",
  };
  return <Badge tone={map[status]}>{STATUS_LABEL[status]}</Badge>;
}

// ───────────────────── Novo investimento ─────────────────────

function NovoInvestimento({
  properties,
  onClose,
  onCreate,
}: {
  properties: ReturnType<typeof usePropertiesStore.getState>["properties"];
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
