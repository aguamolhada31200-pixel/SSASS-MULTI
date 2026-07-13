import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Plus,
  Hammer,
  ImagePlus,
  Receipt,
  Banknote,
  FileText,
  CalendarClock,
  Building2,
  Users2,
  ArrowUp,
  ArrowDown,
  X,
  ChevronRight,
  Lock,
  Star,
  ShieldCheck,
  TriangleAlert,
  AlertTriangle,
  Vote,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  useObrasStore,
  CATEGORIA_LABEL,
  ESTADO_LABEL,
  MARCO_ESTADO_LABEL,
  REGRA_LABEL,
  PROVA_TIPO_LABEL,
  gastoReal,
  progressoReal,
  custoRealFase,
  gastoPrevistoAteHoje,
  diasRestantes,
  estaAtrasada,
  estadoOrcamento,
  saudeObra,
  podeGerir,
  roleDe,
  membrosDe,
  thresholdDe,
  requerAprovacao,
  relativaTempo,
  estadoProvaDe,
  gastoComprovado,
  gastoNaoComprovado,
  pctTransparencia,
  toneTransparencia,
  confirmacoesDespesa,
  TRANSP_HEX,
  TRANSP_LABEL,
  SAUDE_LABEL,
  SAUDE_HEX,
  ROLE_LABEL,
  type Obra,
  type ObraEstado,
  type MarcoEstado,
} from "@/store/useObrasStore";
import { useCollabStore } from "@/store/useCollabStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import { useModalStore } from "@/store/useModalStore";
import { eur, pct, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SaudeRing, MemberStack, RoleAvatar, VotacaoPanel, EstadoAprovacaoBadge, nomeProprio } from "@/components/obras/CoGestao";

const TABS = ["Fases", "Despesas", "Marcos", "Fotos", "Notas"] as const;
type TabKey = (typeof TABS)[number];

export default function ObraDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const obra = useObrasStore((s) => s.obras.find((o) => o.id === id));
  const despesas = useObrasStore((s) => s.despesas);
  const fases = useObrasStore((s) => s.fases);
  const removeObra = useObrasStore((s) => s.removeObra);
  const togglePausada = useObrasStore((s) => s.togglePausada);
  const marcarConcluida = useObrasStore((s) => s.marcarConcluida);

  const projects = useCollabStore((s) => s.projects);
  const properties = usePropertiesStore((s) => s.properties);
  const profiles = useProfilesStore((s) => s.profiles);
  const openObraForm = useModalStore((s) => s.openObraForm);
  const openGaleriaForm = useModalStore((s) => s.openGaleriaForm);

  const [tab, setTab] = useState<TabKey>("Fases");

  if (!obra) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Obra não encontrada.</p>
        <Link to="/comunidade/colaborativa/obras" className="mt-2 inline-block text-secondary hover:underline">
          ← Voltar ao Centro de Comando
        </Link>
      </div>
    );
  }

  const project = obra.projectId ? projects.find((p) => p.id === obra.projectId) : undefined;
  const property = obra.propertyId ? properties.find((p) => p.id === obra.propertyId) : undefined;

  const g = gastoReal(obra, despesas);
  const prog = progressoReal(obra, fases);
  const desv = g - obra.orcamento;
  const previsto = gastoPrevistoAteHoje(obra);
  const dias = diasRestantes(obra);
  const atrasada = estaAtrasada(obra);
  const estOrc = estadoOrcamento(obra, despesas);
  const marcosAll = useObrasStore((s) => s.marcos);
  const marcosPend = useObrasStore((s) => s.marcosDe(obra.id)).filter((m) => m.estado !== "pago");
  const proxMarco = marcosPend[0];

  // Co-gestão + saúde
  const saude = saudeObra(obra, fases, despesas, marcosAll);
  const temCoGestao = membrosDe(obra).length > 0;
  const souGestor = podeGerir(obra, CURRENT_USER_ID);
  const meuRole = roleDe(obra, CURRENT_USER_ID);

  // Transparência (prova das despesas)
  const pctComp = pctTransparencia(obra, despesas);
  const naoComp = gastoNaoComprovado(obra, despesas);
  const compVal = gastoComprovado(obra, despesas);
  const transpTone = toneTransparencia(pctComp);

  // Barras paralelas orçamento vs prazo (obras sem datas mostram "—", nunca NaN)
  const temDatas = !!obra.dataInicio && !!obra.dataFimPrevista;
  const totalDias = temDatas
    ? Math.max(0, Math.round((new Date(`${obra.dataFimPrevista}T00:00:00`).getTime() - new Date(`${obra.dataInicio}T00:00:00`).getTime()) / 86400000))
    : 0;
  const decorridos = totalDias > 0 ? Math.max(0, Math.min(totalDias, Math.round((Date.now() - new Date(`${obra.dataInicio}T00:00:00`).getTime()) / 86400000))) : 0;
  const prazoPct = totalDias > 0 ? Math.round((decorridos / totalDias) * 100) : 0;
  const gastoPct = obra.orcamento > 0 ? Math.round((g / obra.orcamento) * 100) : 0;
  const gastoAFrente = temDatas && gastoPct > prazoPct + 5; // gasta-se mais depressa do que o tempo passa

  const ownerHref = project
    ? `/comunidade/colaborativa/${project.id}`
    : property
      ? `/imoveis/${property.id}`
      : "/comunidade/colaborativa/obras";
  const ownerTitle = project
    ? `#${project.number} ${project.title}`
    : property
      ? property.name
      : "—";
  const ownerIcon = project ? <Users2 size={14} className="text-gold-dark" /> : <Building2 size={14} className="text-secondary" />;

  const onDelete = () => {
    if (!confirm(`Eliminar a obra "${obra.titulo}"?`)) return;
    removeObra(obra.id);
    toast.success("Obra eliminada");
    navigate("/comunidade/colaborativa/obras");
  };

  return (
    <>
      <Link
        to={ownerHref}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> {ownerTitle}
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-accent px-2 py-0.5 text-muted">
                  {CATEGORIA_LABEL[obra.categoria]}
                </span>
                <Link
                  to={ownerHref}
                  className="flex items-center gap-1 text-muted hover:text-primary"
                >
                  {ownerIcon} {ownerTitle}
                </Link>
                <ObraEstadoBadge estado={obra.estado} />
                {obra.empreiteiro && (
                  <span className="text-muted">· {obra.empreiteiro}</span>
                )}
                {obra.estado === "concluida" && obra.avaliacaoTecnico ? (
                  <Estrelas n={obra.avaliacaoTecnico} />
                ) : null}
              </div>
              <h1 className="font-display text-2xl font-bold text-ink">{obra.titulo}</h1>
              {obra.notas && (
                <p className="mt-1 max-w-2xl text-sm text-muted">{obra.notas}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {souGestor ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => openObraForm({ editingId: obra.id })}>
                    <Pencil size={14} /> Editar
                  </Button>
                  {obra.estado !== "concluida" && (
                    <Button size="sm" variant="outline" onClick={() => togglePausada(obra.id)}>
                      {obra.estado === "pausada" ? (
                        <>
                          <PlayCircle size={14} /> Retomar
                        </>
                      ) : (
                        <>
                          <PauseCircle size={14} /> Pausar
                        </>
                      )}
                    </Button>
                  )}
                  {obra.estado !== "concluida" && (
                    <Button
                      size="sm"
                      variant="gold"
                      onClick={() => {
                        marcarConcluida(obra.id);
                        toast.success("Obra concluída", {
                          description: "Quer criar um antes/depois com as fotos desta obra?",
                          action: { label: "Criar", onClick: () => openGaleriaForm({ initialObraId: obra.id }) },
                        });
                      }}
                    >
                      <CheckCircle2 size={14} /> Marcar concluída
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={onDelete}>
                    <Trash2 size={14} /> Eliminar
                  </Button>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg/40 px-3 py-1.5 text-xs text-muted">
                  <Lock size={12} /> {meuRole ? ROLE_LABEL[meuRole] : "Observador"} · só leitura
                </span>
              )}
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiMini label="Orçamento" value={eur(obra.orcamento)} tone="gold" />
            <KpiMini
              label="Gasto"
              value={eur(g)}
              tone={estOrc === "vermelho" ? "danger" : estOrc === "ambar" ? "warning" : "success"}
            />
            <KpiMini
              label="Desvio"
              value={desv === 0 ? "—" : `${desv > 0 ? "+" : ""}${eur(desv)}`}
              tone={desv > 0 ? "danger" : desv < 0 ? "success" : "neutral"}
            />
            <KpiMini label="Progresso" value={`${prog}%`} tone="info" />
            <KpiMini
              label={atrasada ? "Atrasada" : "Restantes"}
              value={!temDatas || !Number.isFinite(dias) ? "—" : atrasada ? `${Math.abs(dias)}d` : `${dias}d`}
              tone={atrasada ? "danger" : "info"}
              sub={temDatas ? `${dataPT(obra.dataInicio)} → ${dataPT(obra.dataFimPrevista)}` : "Sem datas definidas"}
            />
            <KpiMini
              label="Próximo marco"
              value={proxMarco ? eur(proxMarco.valor) : "—"}
              tone="warning"
              sub={proxMarco ? dataPT(proxMarco.dataPrevista) : "Sem pendentes"}
            />
          </div>

          {/* Saúde + barras paralelas (orçamento vs prazo) */}
          <div className="mt-5 grid gap-3 lg:grid-cols-[auto_1fr]">
            <div className="flex items-center gap-3 rounded-xl border border-line/60 bg-bg/40 p-3">
              <SaudeRing score={saude.score} saude={saude.saude} size={62} />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Índice de saúde</p>
                <p className="font-display text-base font-bold" style={{ color: SAUDE_HEX[saude.saude] }}>
                  {SAUDE_LABEL[saude.saude]}
                </p>
                {saude.problema && <p className="text-[11px] text-muted">{saude.problema}</p>}
              </div>
            </div>
            <div className="rounded-xl border border-line/60 bg-bg/40 p-3">
              <ParallelBar
                label="Orçamento"
                value={`${eur(g)} de ${eur(obra.orcamento)} (${gastoPct}%)`}
                pct={gastoPct}
                color={estOrc === "vermelho" ? "#9B3A2A" : estOrc === "ambar" ? "#C17E2A" : "#4A7C59"}
              />
              <ParallelBar
                label="Prazo"
                value={temDatas ? `${decorridos} de ${totalDias} dias (${prazoPct}%)` : "Sem datas definidas"}
                pct={prazoPct}
                color="#8B5E3C"
                className="mt-2.5"
              />
              {gastoAFrente && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-danger">
                  <TriangleAlert size={12} /> O dinheiro está a sair mais depressa do que o tempo passa.
                </p>
              )}
            </div>
          </div>

          {/* Co-gestão — membros + regras de aprovação */}
          {temCoGestao && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-line/60 bg-bg/40 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Co-gestão</span>
                {membrosDe(obra).map((m) => (
                  <span key={m.userId} className="flex items-center gap-1.5">
                    <RoleAvatar profile={profiles.find((p) => p.id === m.userId)} role={m.role} size="xs" />
                    <span className="text-xs text-ink">{nomeProprio(profiles.find((p) => p.id === m.userId)?.fullName)}</span>
                    <span className="text-[10px] text-muted">{ROLE_LABEL[m.role]}</span>
                  </span>
                ))}
              </div>
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <ShieldCheck size={12} className="text-gold-dark" />
                Threshold: {eur(thresholdDe(obra))} (5%) · {REGRA_LABEL[obra.regraVotacao ?? "maioria_simples"]}
                {souGestor && <button onClick={() => toast.message("Edição de regras em breve.")} className="ml-1 underline hover:text-ink">Editar</button>}
              </span>
            </div>
          )}

          {/* Transparência — % do gasto comprovado */}
          {g > 0 && (
            <div className="mt-3 rounded-xl border border-line/60 bg-bg/40 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  <ShieldCheck size={12} className="text-gold-dark" /> Transparência da obra
                </p>
                <p className="num text-xs font-semibold" style={{ color: TRANSP_HEX[transpTone] }}>
                  {pctComp}% comprovado · {TRANSP_LABEL[transpTone]}
                </p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-accent">
                <div className="h-full origin-left rounded-full animate-grow-x" style={{ width: `${pctComp}%`, background: TRANSP_HEX[transpTone] }} />
              </div>
              <p className="num mt-1.5 text-[11px] text-muted">
                {eur(compVal)} comprovado
                {naoComp > 0 && (
                  <>
                    {" "}· <span className="font-medium text-warning">{eur(naoComp)} por comprovar</span>
                  </>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
              tab === t
                ? "border-primary font-medium text-primary"
                : "border-transparent text-muted hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "Fases" && <FasesTab obraId={obra.id} souGestor={souGestor} />}
        {tab === "Despesas" && <DespesasTab obra={obra} souGestor={souGestor} />}
        {tab === "Marcos" && <MarcosTab obra={obra} souGestor={souGestor} />}
        {tab === "Fotos" && <FotosTab obraId={obra.id} />}
        {tab === "Notas" && <NotasTab obraId={obra.id} />}
      </div>
    </>
  );
}

// ───────────────────── KPI mini ─────────────────────

function KpiMini({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone: "gold" | "success" | "danger" | "info" | "warning" | "neutral";
  sub?: string;
}) {
  const colorMap = {
    gold: "text-gold-dark",
    success: "text-success",
    danger: "text-danger",
    info: "text-secondary",
    warning: "text-warning",
    neutral: "text-ink",
  } as const;
  return (
    <div className="rounded-xl border border-line/60 bg-bg/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className={cn("num mt-1 font-display text-lg font-bold", colorMap[tone])}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-muted">{sub}</p>}
    </div>
  );
}

// ───────────────────── Barra paralela (orçamento / prazo) ─────────────────────

function ParallelBar({
  label,
  value,
  pct,
  color,
  className,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-muted">{label}</span>
        <span className="num text-muted">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-accent">
        <div
          className="h-full origin-left rounded-full animate-grow-x"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Estrelas({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${n}/5 ao técnico`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12} className={i <= n ? "fill-gold text-gold" : "text-line"} />
      ))}
    </span>
  );
}

// ───────────────────── Fases tab ─────────────────────

function FasesTab({ obraId, souGestor }: { obraId: string; souGestor: boolean }) {
  const fasesAll = useObrasStore((s) => s.fases);
  const despesas = useObrasStore((s) => s.despesas);
  const addFase = useObrasStore((s) => s.addFase);
  const updateFase = useObrasStore((s) => s.updateFase);
  const removeFase = useObrasStore((s) => s.removeFase);
  const reorderFases = useObrasStore((s) => s.reorderFases);

  const fases = fasesAll
    .filter((f) => f.obraId === obraId)
    .sort((a, b) => a.ordem - b.ordem);

  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [custoEst, setCustoEst] = useState(0);

  const onAdd = () => {
    if (!titulo.trim()) {
      toast.error("Indique o nome da fase");
      return;
    }
    addFase({
      obraId,
      titulo: titulo.trim(),
      dataInicio,
      dataFim,
      progresso: 0,
      custoEstimado: custoEst,
      ordem: fases.length + 1,
    });
    setTitulo("");
    setDataInicio("");
    setDataFim("");
    setCustoEst(0);
    setShowForm(false);
    toast.success("Fase adicionada");
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const ids = fases.map((f) => f.id);
    [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    reorderFases(obraId, ids);
  };
  const moveDown = (idx: number) => {
    if (idx >= fases.length - 1) return;
    const ids = fases.map((f) => f.id);
    [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    reorderFases(obraId, ids);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {souGestor ? (
          <Button size="sm" variant={showForm ? "ghost" : "outline"} onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancelar" : <><Plus size={14} /> Nova fase</>}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => toast.success("Pedido enviado ao gestor")}>
            <Lock size={13} /> Solicitar fase
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome">
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex.: Demolição cozinha"
                  className={inputCls}
                />
              </Field>
              <Field label="Custo estimado">
                <div className="flex items-center rounded-lg border border-line bg-card">
                  <input
                    type="number"
                    value={custoEst || ""}
                    onChange={(e) => setCustoEst(Number(e.target.value) || 0)}
                    className="h-10 w-full bg-transparent px-3 text-sm outline-none"
                  />
                  <span className="px-3 text-sm text-muted">€</span>
                </div>
              </Field>
              <Field label="Data de início">
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Data de fim">
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={onAdd}>
                <Plus size={14} /> Adicionar fase
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {fases.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted">
            <Hammer size={26} className="mx-auto mb-2" />
            <p className="text-sm">Esta obra ainda não tem fases.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {fases.map((f, idx) => {
            const real = custoRealFase(f.id, despesas);
            const desv = real - f.custoEstimado;
            return (
              <Card key={f.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="text-muted hover:text-ink disabled:opacity-30"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === fases.length - 1}
                        className="text-muted hover:text-ink disabled:opacity-30"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-ink">
                          <span className="num mr-2 text-muted">#{idx + 1}</span>
                          {f.titulo}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="num text-xs text-muted">
                            {dataPT(f.dataInicio)} → {dataPT(f.dataFim)}
                          </span>
                          <button
                            onClick={() => removeFase(f.id)}
                            className="text-muted hover:text-danger"
                            title="Eliminar fase"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted">
                        <span className="num">
                          Custo: {eur(real)} / {eur(f.custoEstimado)}
                          {desv !== 0 && (
                            <span
                              className={cn(
                                "ml-1 font-semibold",
                                desv > 0 ? "text-danger" : "text-success"
                              )}
                            >
                              {desv > 0 ? "+" : ""}{eur(desv)}
                            </span>
                          )}
                        </span>
                        <span>
                          Progresso:{" "}
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={f.progresso}
                            onChange={(e) =>
                              updateFase(f.id, {
                                progresso: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                              })
                            }
                            className="num w-14 rounded border border-line bg-card px-1 text-xs"
                          />
                          %
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            f.progresso === 100 ? "bg-success" : "bg-warning"
                          )}
                          style={{ width: `${f.progresso}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ───────────────────── Despesas tab ─────────────────────

function DespesasTab({ obra, souGestor }: { obra: Obra; souGestor: boolean }) {
  const obraId = obra.id;
  const despesasAll = useObrasStore((s) => s.despesas);
  const fasesAll = useObrasStore((s) => s.fases);
  const removeDespesa = useObrasStore((s) => s.removeDespesa);
  const confirmarDespesa = useObrasStore((s) => s.confirmarDespesa);
  const removerConfirmacaoDespesa = useObrasStore((s) => s.removerConfirmacaoDespesa);
  const profiles = useProfilesStore((s) => s.profiles);
  const docs = useDocumentsStore((s) => s.documents);
  const openObraExpense = useModalStore((s) => s.openObraExpense);

  const fases = fasesAll.filter((f) => f.obraId === obraId);
  const despesasObra = despesasAll
    .filter((d) => d.obraId === obraId)
    .sort((a, b) => (a.data < b.data ? 1 : -1));

  const [votandoId, setVotandoId] = useState<string | null>(null);
  const [soPorComprovar, setSoPorComprovar] = useState(false);

  const lista = soPorComprovar ? despesasObra.filter((d) => estadoProvaDe(d) === "por_comprovar") : despesasObra;

  const totalGasto = despesasObra.reduce((s, d) => s + d.valor, 0);
  const comprovado = gastoComprovado(obra, despesasObra);
  const naoComprovado = gastoNaoComprovado(obra, despesasObra);
  const pctComp = pctTransparencia(obra, despesasObra);
  const meuRole = roleDe(obra, CURRENT_USER_ID);
  const souInvestidor = meuRole === "investidor";

  return (
    <div className="space-y-3">
      {/* Sumário de prova + filtro */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span>
            Total: <strong className="num font-semibold text-ink">{eur(totalGasto)}</strong> em {despesasObra.length} despesas
          </span>
          <span className="flex items-center gap-1 text-success">
            <ShieldCheck size={13} /> {eur(comprovado)} comprovado ({pctComp}%)
          </span>
          {naoComprovado > 0 && (
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle size={13} /> {eur(naoComprovado)} por comprovar
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {despesasObra.some((d) => estadoProvaDe(d) === "por_comprovar") && (
            <button
              onClick={() => setSoPorComprovar((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                soPorComprovar ? "border-warning bg-warning/10 text-warning" : "border-line bg-card text-muted hover:text-ink"
              )}
            >
              <AlertTriangle size={13} /> Só por comprovar
            </button>
          )}
          {souGestor ? (
            <Button size="sm" variant="outline" onClick={() => openObraExpense(obraId)}>
              <Plus size={14} /> Nova despesa
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => toast.success("Pedido enviado ao gestor")}>
              <Lock size={13} /> Solicitar despesa
            </Button>
          )}
        </div>
      </div>

      {lista.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted">
            <Receipt size={26} className="mx-auto mb-2" />
            <p className="text-sm">{soPorComprovar ? "Tudo comprovado" : "Nenhuma despesa registada."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {lista.map((d) => {
            const fase = fases.find((f) => f.id === d.faseId);
            const autor = profiles.find((p) => p.id === d.registadoPor);
            const pendente = d.aprovacao?.estado === "pendente";
            const estProva = estadoProvaDe(d);
            const provas = d.comprovativos ?? [];
            const fotosD = d.fotos ?? [];
            const conf = confirmacoesDespesa(obra, d);
            const meuVotoConfirma = (d.confirmacoes ?? []).find((c) => c.userId === CURRENT_USER_ID);
            return (
              <Card
                key={d.id}
                className={cn(
                  pendente && "border-warning/40 bg-warning/5",
                  !pendente && estProva === "por_comprovar" && "border-warning/30 bg-warning/[0.03]"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeloProva estado={estProva} />
                        <p className="text-sm font-medium text-ink">{d.descricao}</p>
                      </div>
                      <p className="num mt-0.5 text-[11px] text-muted">
                        {dataPT(d.data)}
                        {fase && ` · ${fase.titulo}`}
                        {d.fornecedor && ` · ${d.fornecedor}`}
                        {d.nif && ` · NIF ${d.nif}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.aprovacao && <EstadoAprovacaoBadge estado={d.aprovacao.estado} />}
                      <span className="num text-sm font-semibold text-ink">{eur(d.valor)}</span>
                      {souGestor && (
                        <button onClick={() => removeDespesa(d.id)} className="text-muted hover:text-danger" title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comprovativos + fotos */}
                  {(provas.length > 0 || fotosD.length > 0) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {provas.map((cp) => {
                        const doc = docs.find((x) => x.id === cp.documentId);
                        return (
                          <button
                            key={cp.id}
                            onClick={() => {
                              if (doc?.ficheiroUrl && doc.ficheiroUrl !== "#") window.open(doc.ficheiroUrl, "_blank");
                              else toast.message("Pré-visualização do comprovativo", { description: cp.nomeFicheiro });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/5 px-2 py-1 text-[11px] text-success hover:bg-success/10"
                            title={`${PROVA_TIPO_LABEL[cp.tipo]} — ${cp.nomeFicheiro}`}
                          >
                            <FileText size={12} /> {cp.nomeFicheiro}
                          </button>
                        );
                      })}
                      {fotosD.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="relative h-10 w-10 overflow-hidden rounded-md border border-line">
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Quem registou + aprovação + confirmações */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    {autor && (
                      <span className="flex items-center gap-1.5">
                        <RoleAvatar profile={autor} role={roleDe(obra, autor.id)} size="xs" />
                        Registada por {nomeProprio(autor.fullName)} {relativaTempo(d.registadoEm ?? `${d.data}T09:00:00`)}
                      </span>
                    )}
                    {d.aprovacao?.estado === "aplicado" && d.aprovacao.votos.length > 0 && (
                      <span className="text-success">
                        Aprovada por {d.aprovacao.votos.filter((v) => v.valor === "a_favor").map((v) => nomeProprio(profiles.find((p) => p.id === v.userId)?.fullName)).join(", ")}
                      </span>
                    )}
                    {pendente && (
                      <button onClick={() => setVotandoId(votandoId === d.id ? null : d.id)} className="font-medium text-warning underline hover:text-ink">
                        {votandoId === d.id ? "Fechar" : "Ver / votar decisão"}
                      </button>
                    )}
                    {conf.totalInvestidores > 0 && estProva === "comprovada" && (
                      <span className="flex items-center gap-1 text-success/90">
                        <CheckCircle2 size={11} /> Confirmada por {conf.confirmadosBy.length}/{conf.totalInvestidores} sócios
                      </span>
                    )}
                  </div>

                  {/* Botões de confirmação (só para sócios investidores em despesas comprovadas) */}
                  {souInvestidor && estProva === "comprovada" && !pendente && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          if (meuVotoConfirma?.valor === "confirma") {
                            removerConfirmacaoDespesa(d.id, CURRENT_USER_ID);
                            toast.message("Confirmação removida");
                          } else {
                            confirmarDespesa(d.id, CURRENT_USER_ID, "confirma");
                            toast.success("Despesa confirmada ✓");
                          }
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                          meuVotoConfirma?.valor === "confirma" ? "border-success bg-success text-white" : "border-success/40 text-success hover:bg-success/10"
                        )}
                      >
                        <CheckCircle2 size={12} /> Confirmar
                      </button>
                      <button
                        onClick={() => {
                          const c = prompt("Porque contesta esta despesa? (opcional)") ?? "";
                          confirmarDespesa(d.id, CURRENT_USER_ID, "contesta", c || undefined);
                          toast.message("Contestação enviada aos sócios");
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                          meuVotoConfirma?.valor === "contesta" ? "border-danger bg-danger text-white" : "border-danger/40 text-danger hover:bg-danger/10"
                        )}
                      >
                        <AlertTriangle size={12} /> Contestar
                      </button>
                    </div>
                  )}

                  {pendente && votandoId === d.id && d.aprovacao && (
                    <div className="mt-3">
                      <VotacaoPanel obra={obra} tipo="despesa" itemId={d.id} aprovacao={d.aprovacao} titulo={d.descricao} valor={d.valor} onResolved={() => setVotandoId(null)} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SeloProva({ estado }: { estado: "comprovada" | "por_comprovar" }) {
  if (estado === "comprovada") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-semibold text-success">
        <ShieldCheck size={11} /> Comprovada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
      <AlertTriangle size={11} /> Por comprovar
    </span>
  );
}

// ───────────────────── Marcos tab ─────────────────────

function MarcosTab({ obra, souGestor }: { obra: Obra; souGestor: boolean }) {
  const obraId = obra.id;
  const marcosAll = useObrasStore((s) => s.marcos);
  const registarMarco = useObrasStore((s) => s.registarMarco);
  const removeMarco = useObrasStore((s) => s.removeMarco);
  const profiles = useProfilesStore((s) => s.profiles);
  const docs = useDocumentsStore((s) => s.documents);
  const openMarcoPay = useModalStore((s) => s.openMarcoPay);

  const todayISO = new Date().toISOString().slice(0, 10);
  const marcos = marcosAll
    .filter((m) => m.obraId === obraId)
    .map((m) => ({
      ...m,
      estado:
        m.estado === "pago"
          ? m.estado
          : m.dataPrevista < todayISO
            ? ("atrasado" as MarcoEstado)
            : m.estado,
    }))
    .sort((a, b) => (a.dataPrevista < b.dataPrevista ? -1 : 1));

  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState(0);
  const [dataPrev, setDataPrev] = useState("");
  const [empreiteiro, setEmpreiteiro] = useState("");
  const [votandoId, setVotandoId] = useState<string | null>(null);

  const totalPrev = marcos.reduce((s, m) => s + m.valor, 0);
  const pagosVal = marcos.filter((m) => m.estado === "pago").reduce((s, m) => s + m.valor, 0);
  const precisaVoto = requerAprovacao(obra, valor);

  const onAdd = () => {
    if (!titulo.trim() || valor <= 0 || !dataPrev) {
      toast.error("Preencha título, valor e data");
      return;
    }
    registarMarco(
      { obraId, titulo: titulo.trim(), valor, dataPrevista: dataPrev, estado: "pendente", empreiteiro: empreiteiro.trim() || undefined },
      CURRENT_USER_ID
    );
    setTitulo("");
    setValor(0);
    setDataPrev("");
    setEmpreiteiro("");
    setShowForm(false);
    toast.success(precisaVoto ? "Marco submetido a votação dos sócios" : "Marco criado");
  };

  const onPagar = (id: string) => {
    openMarcoPay(id);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Pago: <strong className="num font-semibold text-success">{eur(pagosVal)}</strong>{" "}
          de <strong className="num font-semibold text-ink">{eur(totalPrev)}</strong>
        </p>
        {souGestor ? (
          <Button size="sm" variant={showForm ? "ghost" : "outline"} onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancelar" : <><Plus size={14} /> Novo marco</>}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => toast.success("Pedido enviado ao gestor")}>
            <Lock size={13} /> Solicitar marco
          </Button>
        )}
      </div>

      {showForm && souGestor && (
        <Card>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Título" className="sm:col-span-2">
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: A meio da obra 40%" className={inputCls} />
              </Field>
              <Field label="Valor">
                <div className="flex items-center rounded-lg border border-line bg-card">
                  <input type="number" value={valor || ""} onChange={(e) => setValor(Number(e.target.value) || 0)} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
                  <span className="px-3 text-sm text-muted">€</span>
                </div>
              </Field>
              <Field label="Data prevista">
                <input type="date" value={dataPrev} onChange={(e) => setDataPrev(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Empreiteiro (opcional)" className="sm:col-span-2">
                <input value={empreiteiro} onChange={(e) => setEmpreiteiro(e.target.value)} className={inputCls} />
              </Field>
            </div>
            {precisaVoto && (
              <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-warning/8 px-3 py-2 text-[11px] text-warning">
                <Vote size={13} /> Acima de {eur(thresholdDe(obra))} → precisa do voto dos sócios antes de poder ser pago.
              </p>
            )}
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={onAdd}>
                {precisaVoto ? <><Vote size={14} /> Submeter a votação</> : <><Plus size={14} /> Adicionar marco</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {marcos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted">
            <Banknote size={26} className="mx-auto mb-2" />
            <p className="text-sm">Sem marcos de pagamento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {marcos.map((m) => {
            const pendenteVoto = m.aprovacao?.estado === "pendente";
            const toneCls = m.estado === "pago"
              ? "border-success/40 bg-success/5"
              : pendenteVoto
                ? "border-warning/40 bg-warning/5"
                : m.estado === "atrasado"
                  ? "border-danger/40 bg-danger/5"
                  : "border-line";
            const autor = profiles.find((p) => p.id === m.registadoPor);
            const pagador = profiles.find((p) => p.id === m.pagoPor);
            return (
              <Card key={m.id} className={cn(toneCls)}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{m.titulo}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        Previsto: {dataPT(m.dataPrevista)}
                        {m.dataPago && ` · Pago: ${dataPT(m.dataPago)}`}
                        {m.empreiteiro && ` · ${m.empreiteiro}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="num font-display text-lg font-bold text-ink">{eur(m.valor)}</p>
                      {m.aprovacao ? (
                        <EstadoAprovacaoBadge estado={m.aprovacao.estado} />
                      ) : m.estado === "pago" ? (
                        m.comprovativoPagamento ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-semibold text-success">
                            <ShieldCheck size={11} /> Pago · comprovado
                          </span>
                        ) : (
                          <MarcoBadge estado={m.estado} />
                        )
                      ) : (
                        <MarcoBadge estado={m.estado} />
                      )}
                      {m.estado !== "pago" && !pendenteVoto && souGestor && (
                        <Button size="sm" variant="gold" onClick={() => onPagar(m.id)}>
                          <CheckCircle2 size={13} /> Marcar pago
                        </Button>
                      )}
                      {souGestor && (
                        <button onClick={() => removeMarco(m.id)} className="text-muted hover:text-danger">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comprovativo de pagamento (se pago) */}
                  {m.estado === "pago" && m.comprovativoPagamento && (() => {
                    const cp = m.comprovativoPagamento;
                    const doc = docs.find((x) => x.id === cp.documentId);
                    return (
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            if (doc?.ficheiroUrl && doc.ficheiroUrl !== "#") window.open(doc.ficheiroUrl, "_blank");
                            else toast.message("Pré-visualização do comprovativo", { description: cp.nomeFicheiro });
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/5 px-2 py-1 text-[11px] text-success hover:bg-success/10"
                          title={PROVA_TIPO_LABEL[cp.tipo]}
                        >
                          <FileText size={12} /> {cp.nomeFicheiro}
                        </button>
                      </div>
                    );
                  })()}

                  {/* Quem registou / pagou + votação */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    {autor && (
                      <span className="flex items-center gap-1.5">
                        <RoleAvatar profile={autor} role={roleDe(obra, autor.id)} size="xs" /> Criado por {nomeProprio(autor.fullName)}
                      </span>
                    )}
                    {pagador && m.estado === "pago" && (
                      <span className="flex items-center gap-1.5 text-success">
                        <RoleAvatar profile={pagador} role={roleDe(obra, pagador.id)} size="xs" /> Pago por {nomeProprio(pagador.fullName)}
                      </span>
                    )}
                    {pendenteVoto && (
                      <button onClick={() => setVotandoId(votandoId === m.id ? null : m.id)} className="font-medium text-warning underline hover:text-ink">
                        {votandoId === m.id ? "Fechar" : "Ver / votar decisão"}
                      </button>
                    )}
                  </div>

                  {pendenteVoto && votandoId === m.id && m.aprovacao && (
                    <div className="mt-3">
                      <VotacaoPanel obra={obra} tipo="marco" itemId={m.id} aprovacao={m.aprovacao} titulo={m.titulo} valor={m.valor} onResolved={() => setVotandoId(null)} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ───────────────────── Fotos tab ─────────────────────

function FotosTab({ obraId }: { obraId: string }) {
  const obra = useObrasStore((s) => s.obras.find((o) => o.id === obraId));
  const addFoto = useObrasStore((s) => s.addFoto);
  const removeFoto = useObrasStore((s) => s.removeFoto);
  const despesas = useObrasStore((s) => s.despesas);
  const openGaleriaForm = useModalStore((s) => s.openGaleriaForm);
  const [url, setUrl] = useState("");

  if (!obra) return null;

  const totalFotos = obra.fotos.length + despesas.filter((d) => d.obraId === obraId).reduce((a, d) => a + (d.fotos?.length ?? 0), 0);

  const onAdd = () => {
    if (!url.trim()) return;
    addFoto(obraId, url.trim());
    setUrl("");
    toast.success("Foto adicionada");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Colar URL da imagem…"
          className={cn(inputCls, "max-w-md flex-1")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <Button size="sm" variant="outline" onClick={onAdd}>
          <ImagePlus size={14} /> Adicionar foto
        </Button>
        {totalFotos > 0 && (
          <Button size="sm" variant="gold" onClick={() => openGaleriaForm({ initialObraId: obraId })}>
            <Star size={14} /> Criar antes/depois com estas fotos
          </Button>
        )}
      </div>

      {obra.fotos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted">
            <ImagePlus size={26} className="mx-auto mb-2" />
            <p className="text-sm">Sem fotos. Adicione antes/durante/depois.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {obra.fotos.map((src, i) => (
            <div
              key={i}
              className="group relative aspect-video overflow-hidden rounded-xl border border-line"
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => removeFoto(obraId, i)}
                className="absolute right-1 top-1 rounded-md bg-ink/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────── Notas tab ─────────────────────

function NotasTab({ obraId }: { obraId: string }) {
  const obra = useObrasStore((s) => s.obras.find((o) => o.id === obraId));
  const setNotas = useObrasStore((s) => s.setNotas);
  const logsAll = useObrasStore((s) => s.logs);
  const [text, setText] = useState(obra?.notas ?? "");

  const logs = logsAll
    .filter((l) => l.obraId === obraId)
    .sort((a, b) => (a.ts < b.ts ? 1 : -1));

  if (!obra) return null;

  const save = () => {
    setNotas(obraId, text);
    toast.success("Notas guardadas");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Notas livres
          </p>
          <textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-lg border border-line bg-card p-3 text-sm outline-none focus:border-secondary"
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={save}>Guardar</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Log de alterações
          </p>
          {logs.length === 0 ? (
            <p className="text-sm text-muted">Sem registos.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="flex items-start gap-2 text-sm">
                  <span className="num shrink-0 text-xs text-muted">{dataPT(l.ts)}</span>
                  <span className="text-ink">{l.texto}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────────── Comuns ─────────────────────

const inputCls =
  "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function ObraEstadoBadge({ estado }: { estado: ObraEstado }) {
  const map: Record<ObraEstado, "neutral" | "info" | "warning" | "success" | "danger"> = {
    por_iniciar: "neutral",
    em_curso: "info",
    pausada: "warning",
    concluida: "success",
    atrasada: "danger",
  };
  return <Badge tone={map[estado]}>{ESTADO_LABEL[estado]}</Badge>;
}

function MarcoBadge({ estado }: { estado: MarcoEstado }) {
  const map: Record<MarcoEstado, "neutral" | "warning" | "danger" | "success"> = {
    pendente: "warning",
    pago: "success",
    atrasado: "danger",
  };
  return <Badge tone={map[estado]}>{MARCO_ESTADO_LABEL[estado]}</Badge>;
}
