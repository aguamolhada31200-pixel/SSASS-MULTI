import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  Building2,
  Calculator,
  Hammer,
  Megaphone,
  FileSignature,
  FileText,
  Upload,
  X,
  Trash2,
  Clock,
  CalendarClock,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import {
  useProjectStagesStore,
  STAGE_TEMPLATES,
  STATUS_LABEL,
  progressoProjeto,
  etapaAtual,
  diasNaEtapa,
  checklistProgresso,
  type Stage,
  type StageStatus,
} from "@/store/useProjectStagesStore";
import { usePropertiesStore, PROP_TYPE_LABEL, type Property } from "@/store/usePropertiesStore";
import { useDocumentsStore, DOC_CATEGORIAS, type DocCategoria } from "@/store/useDocumentsStore";
import { useModalStore } from "@/store/useModalStore";
import { custoEsperaMes, custoEsperaDia } from "@/lib/calc/espera";
import { eur, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ProjetoCalendario() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const project = useProjectStagesStore((s) => s.projects.find((p) => p.id === projectId));
  const stages = useProjectStagesStore((s) => s.stages.filter((st) => st.projectId === projectId).sort((a, b) => a.stageNumber - b.stageNumber));
  const advanceStage = useProjectStagesStore((s) => s.advanceStage);
  const property = usePropertiesStore((s) => (project?.propertyId ? s.properties.find((p) => p.id === project.propertyId) : undefined));

  if (!project) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Projeto não encontrado.</p>
        <Link to="/financas/calendario-investimento" className="mt-2 inline-block text-secondary hover:underline">← Voltar ao calendário</Link>
      </div>
    );
  }

  const atual = etapaAtual(stages);
  const etapaParam = Number(params.get("etapa")) || atual?.stageNumber || 1;
  const selecionada = stages.find((s) => s.stageNumber === etapaParam) ?? stages[0];

  const prog = progressoProjeto(stages);
  const concl = stages.filter((s) => s.status === "concluida").length;
  const diasDecorridos = Math.max(0, Math.round((Date.now() - new Date(`${project.createdAt}T00:00:00`).getTime()) / 86400000));
  const custoAcumulado = stages.reduce((sum, s) => sum + (s.custoReal ?? 0), 0);

  const foto = property?.photos[0]?.url ?? project.fotoUrl;
  const tipo = property ? PROP_TYPE_LABEL[property.type] : project.modo === "flip" ? "Flip" : "Arrendamento";
  const localizacao = property ? `${property.address}, ${property.city}` : "Sem imóvel associado (em procura)";

  const selecionarEtapa = (n: number) => setParams({ etapa: String(n) }, { replace: true });

  return (
    <>
      <Link to="/financas/calendario-investimento" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Calendário do Investimento
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-accent">
              {foto ? <img src={foto} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-muted"><Building2 size={24} /></div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="gold">{tipo}</Badge>
                {atual ? <Badge tone="info">{atual.stageNumber}. {atual.stageName}</Badge> : <Badge tone="success">Concluído</Badge>}
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold text-ink">{project.nome}</h1>
              <p className="text-sm text-muted">{localizacao}</p>
              {/* Barra de progresso */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{concl}/{stages.length} etapas</span>
                  <span className="num font-semibold text-ink">{prog}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-accent">
                  <div className="h-full rounded-full bg-success transition-all" style={{ width: `${prog}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <KpiMini icon={<CalendarClock size={15} />} label="Dias decorridos" value={`${diasDecorridos}d`} />
            <KpiMini icon={<Clock size={15} />} label="Dias na etapa atual" value={atual && diasNaEtapa(atual) !== null ? `${diasNaEtapa(atual)}d` : "—"} />
            <KpiMini icon={<Wallet size={15} />} label="Custo acumulado" value={eur(custoAcumulado)} />
          </div>
        </CardContent>
      </Card>

      {/* Custo de espera */}
      {property && <CustoEsperaPanel property={property} modo={project.modo} concluido={prog === 100} />}

      {/* Conteúdo: stepper + detalhe */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* Stepper vertical */}
        <Card className="h-max">
          <CardContent className="p-3">
            <ol className="space-y-1">
              {stages.map((s) => {
                const ativo = s.stageNumber === selecionada?.stageNumber;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => selecionarEtapa(s.stageNumber)}
                      className={cn("flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors", ativo ? "bg-accent" : "hover:bg-bg")}
                    >
                      <StageIcon stage={s} />
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm font-medium", ativo ? "text-primary" : "text-ink")}>{s.stageNumber}. {s.stageName}</p>
                        <p className="text-[11px] text-muted">{STATUS_LABEL[s.status]} · {checklistProgresso(s)}%</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {/* Detalhe da etapa */}
        {selecionada && (
          <EtapaDetalhe
            stage={selecionada}
            projectId={project.id}
            propertyId={project.propertyId}
            isLast={selecionada.stageNumber === stages.length}
            onAdvance={() => { advanceStage(project.id); toast.success("Etapa concluída — avançou para a seguinte"); }}
            onNavigate={navigate}
          />
        )}
      </div>
    </>
  );
}

function CustoEsperaPanel({ property, modo, concluido }: { property: Property; modo: "arrendamento" | "flip"; concluido: boolean }) {
  if (concluido) {
    if (property.rendaMensal <= 0) return null;
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-success/30 bg-success/8 px-5 py-4">
        <p className="font-display text-lg font-bold text-success">✓ A render</p>
        <p className="font-display text-lg font-bold text-success">
          <span className="num">{eur(property.rendaMensal)}</span>/mês
        </p>
      </div>
    );
  }
  const mes = custoEsperaMes(property);
  const dia = custoEsperaDia(property);
  if (mes <= 0) return null;
  return (
    <div className="mt-5 rounded-2xl border border-danger/25 bg-danger/5 px-5 py-4">
      <p className="font-display text-lg font-bold text-ink">
        Este projeto custa-lhe <span className="num text-danger">{eur(dia)}</span>/dia enquanto não{" "}
        {modo === "flip" ? "vender" : "render"}.
      </p>
      <p className="num mt-1.5 text-xs text-muted">
        prestação {eur(property.prestacaoMensal)} · IMI {eur(property.imiAnual / 12)} · condomínio {eur(property.condominioMensal)} · seguro {eur(property.seguroAnual / 12)}
        {property.outrasMensais > 0 && <> · outras {eur(property.outrasMensais)}</>}
        {" → "}
        <span className="font-semibold text-danger">{eur(mes)}/mês</span>
      </p>
    </div>
  );
}

function KpiMini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/60 bg-bg/40 p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{icon} {label}</p>
      <p className="num mt-1 text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

function StageIcon({ stage }: { stage: Stage }) {
  const cls =
    stage.status === "concluida" ? "border-success bg-success text-white"
      : stage.status === "em_curso" ? "border-primary bg-primary text-white"
        : stage.status === "bloqueada" ? "border-danger bg-danger text-white"
          : "border-line bg-card text-muted";
  return (
    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold", cls)}>
      {stage.status === "concluida" ? <Check size={14} /> : stage.status === "bloqueada" ? <Lock size={12} /> : stage.stageNumber}
    </span>
  );
}

// ───────────────────── Detalhe da etapa ─────────────────────

function EtapaDetalhe({
  stage,
  projectId,
  propertyId,
  isLast,
  onAdvance,
  onNavigate,
}: {
  stage: Stage;
  projectId: string;
  propertyId?: string;
  isLast: boolean;
  onAdvance: () => void;
  onNavigate: (to: string) => void;
}) {
  const updateStage = useProjectStagesStore((s) => s.updateStage);
  const setStageStatus = useProjectStagesStore((s) => s.setStageStatus);
  const toggleChecklist = useProjectStagesStore((s) => s.toggleChecklist);
  const openListingForm = useModalStore((s) => s.openListingForm);
  const tmpl = STAGE_TEMPLATES[stage.stageNumber - 1];

  return (
    <Card>
      <CardContent className="space-y-5">
        {/* Cabeçalho da etapa */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Etapa {stage.stageNumber} de 11</p>
            <h2 className="font-display text-xl font-bold text-ink">{stage.stageName}</h2>
            <p className="text-sm text-muted">{tmpl.descricao}</p>
          </div>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Estado</span>
            <select
              value={stage.status}
              onChange={(e) => setStageStatus(stage.id, e.target.value as StageStatus)}
              className="h-9 rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary"
            >
              <option value="pendente">Pendente</option>
              <option value="em_curso">Em curso</option>
              <option value="concluida">Concluída</option>
              <option value="bloqueada">Bloqueada</option>
            </select>
          </label>
        </div>

        {/* Atalhos contextuais */}
        <ContextualShortcuts stageNumber={stage.stageNumber} propertyId={propertyId} onNavigate={onNavigate} openListingForm={openListingForm} />

        {/* Datas */}
        <div>
          <SecLabel>Datas</SecLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DateField label="Início previsto" value={stage.dataInicioPrevista} onChange={(v) => updateStage(stage.id, { dataInicioPrevista: v })} />
            <DateField label="Fim previsto" value={stage.dataFimPrevista} onChange={(v) => updateStage(stage.id, { dataFimPrevista: v })} />
            <DateField label="Início real" value={stage.dataInicioReal} onChange={(v) => updateStage(stage.id, { dataInicioReal: v })} />
            <DateField label="Fim real" value={stage.dataFimReal} onChange={(v) => updateStage(stage.id, { dataFimReal: v })} />
          </div>
        </div>

        {/* Checklist */}
        <div>
          <SecLabel>Checklist · {checklistProgresso(stage)}%</SecLabel>
          <div className="space-y-1.5">
            {stage.checklist.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleChecklist(stage.id, c.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-line/60 bg-bg/40 px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2", c.feito ? "border-success bg-success text-white" : "border-line bg-card")}>
                  {c.feito && <Check size={12} />}
                </span>
                <span className={cn("flex-1 text-sm", c.feito ? "text-muted line-through" : "text-ink")}>{c.texto}</span>
                {c.feito && c.dataFeito && <span className="num text-[10px] text-muted">{dataPT(c.dataFeito)}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Custos + responsável */}
        <div>
          <SecLabel>Custos & responsável</SecLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <NumField label="Custo estimado" value={stage.custoEstimado} onChange={(v) => updateStage(stage.id, { custoEstimado: v })} />
            <NumField label="Custo real" value={stage.custoReal} onChange={(v) => updateStage(stage.id, { custoReal: v })} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Responsável</span>
              <input
                value={stage.responsavel ?? ""}
                onChange={(e) => updateStage(stage.id, { responsavel: e.target.value })}
                placeholder="Ex.: Eu, Banco, Advogado…"
                className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary"
              />
            </label>
          </div>
        </div>

        {/* Notas */}
        <div>
          <SecLabel>Notas</SecLabel>
          <textarea
            value={stage.notas}
            onChange={(e) => updateStage(stage.id, { notas: e.target.value })}
            rows={3}
            placeholder="Notas sobre esta etapa…"
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-secondary"
          />
        </div>

        {/* Documentos */}
        <DocumentosEtapa stage={stage} propertyId={propertyId} />

        {/* Avançar */}
        {!isLast && stage.status !== "concluida" && (
          <div className="flex justify-end border-t border-line pt-4">
            <Button onClick={onAdvance}><ArrowRight size={16} /> Ir para a próxima etapa</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContextualShortcuts({
  stageNumber,
  propertyId,
  onNavigate,
  openListingForm,
}: {
  stageNumber: number;
  propertyId?: string;
  onNavigate: (to: string) => void;
  openListingForm: (editingId?: string | null) => void;
}) {
  const atalhos: React.ReactNode[] = [];
  if (stageNumber === 1)
    atalhos.push(<Button key="calc" variant="outline" size="sm" onClick={() => onNavigate("/financas/calculadora-rentabilidade")}><Calculator size={14} /> Abrir Calculadora de Rentabilidade</Button>);
  if (stageNumber === 8 && propertyId)
    atalhos.push(<Button key="obras" variant="outline" size="sm" onClick={() => onNavigate(`/imoveis/${propertyId}`)}><Hammer size={14} /> Ver Obras</Button>);
  if (stageNumber === 10)
    atalhos.push(<Button key="pub" variant="outline" size="sm" onClick={() => openListingForm()}><Megaphone size={14} /> Publicar na Rede</Button>);
  if (stageNumber === 11 && propertyId)
    atalhos.push(<Button key="contr" variant="outline" size="sm" onClick={() => onNavigate("/pessoas/inquilinos")}><FileSignature size={14} /> Ver Contrato</Button>);
  if (atalhos.length === 0) return null;
  return <div className="flex flex-wrap gap-2 rounded-xl border border-gold/20 bg-gold/5 p-3">{atalhos}</div>;
}

function DocumentosEtapa({ stage, propertyId }: { stage: Stage; propertyId?: string }) {
  const allDocs = useDocumentsStore((s) => s.documents);
  const addDoc = useDocumentsStore((s) => s.add);
  const associarDoc = useProjectStagesStore((s) => s.associarDoc);
  const desassociarDoc = useProjectStagesStore((s) => s.desassociarDoc);
  const [picker, setPicker] = useState(false);

  const associados = useMemo(
    () => stage.documentosAssociados.map((id) => allDocs.find((d) => d.id === id)).filter(Boolean),
    [stage.documentosAssociados, allDocs]
  );
  const disponiveis = useMemo(
    () => allDocs.filter((d) => (propertyId ? d.propertyId === propertyId : true) && !stage.documentosAssociados.includes(d.id)),
    [allDocs, propertyId, stage.documentosAssociados]
  );

  const onFile = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      const id = addDoc({ propertyId, categoria: "Outros" as DocCategoria, nome: file.name, ficheiroUrl: String(r.result), mimeType: file.type || "application/octet-stream", uploadedAt: new Date().toISOString().slice(0, 10) });
      associarDoc(stage.id, id);
      toast.success("Documento carregado e associado");
    };
    r.readAsDataURL(file);
  };

  return (
    <div>
      <SecLabel>Documentos associados</SecLabel>
      {associados.length === 0 ? (
        <p className="text-sm text-muted">Sem documentos nesta etapa.</p>
      ) : (
        <ul className="space-y-2">
          {associados.map((d) => d && (
            <li key={d.id} className="flex items-center justify-between rounded-lg border border-line/60 bg-bg/40 p-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <FileText size={15} className="shrink-0 text-secondary" />
                <span className="truncate text-sm text-ink">{d.nome}</span>
                <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted">{d.categoria}</span>
              </div>
              <button onClick={() => desassociarDoc(stage.id, d.id)} className="text-muted hover:text-danger" title="Desassociar"><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setPicker((v) => !v)}><FileText size={14} /> Associar documento</Button>
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-card px-3 text-sm text-muted hover:bg-accent">
          <Upload size={14} /> Carregar novo
          <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </label>
      </div>

      {picker && (
        <div className="mt-2 rounded-xl border border-line bg-bg/40 p-2">
          {disponiveis.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted">Sem documentos disponíveis para associar.</p>
          ) : (
            <ul className="space-y-1">
              {disponiveis.map((d) => (
                <li key={d.id}>
                  <button onClick={() => { associarDoc(stage.id, d.id); setPicker(false); toast.success("Documento associado"); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent">
                    <FileText size={14} className="text-secondary" /> <span className="flex-1 truncate">{d.nome}</span>
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted">{d.categoria}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────── Campos ─────────────────────

function SecLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-secondary">{children}</p>;
}

function DateField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-line bg-card px-2 text-sm outline-none focus:border-secondary" />
    </label>
  );
}

function NumField({ label, value, onChange }: { label: string; value?: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
        <input type="number" step="any" value={value ?? ""} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
        <span className="px-3 text-sm text-muted">€</span>
      </div>
    </label>
  );
}
