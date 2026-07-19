import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, CalendarClock, CheckCircle2, Pencil, Trash2, History, ShieldCheck, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  useMaintenancePlanStore,
  estadoPlano,
  diasParaExecucao,
  CATEGORIA_PLANO_LABEL,
  PERIODICIDADE_LABEL,
  ESTADO_PLANO_LABEL,
  somarPeriodicidade,
  type PlanTask,
  type CategoriaPlano,
  type PeriodicidadePlano,
  type EstadoPlano,
} from "@/store/useMaintenancePlanStore";
import { useMaintenanceStore, type CategoriaPedido } from "@/store/useMaintenanceStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useTechniciansStore } from "@/store/useTechniciansStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import { CURRENT_USER_ID } from "@/store/useProfilesStore";
import { CATEGORIA_PLANO_ICON, inputCls } from "./shared";
import { MoneyBox } from "@/components/ui/MoneyField";
import { eur, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

const ESTADO_PLANO_TONE: Record<EstadoPlano, string> = {
  em_dia: "bg-success/12 text-success",
  a_vencer: "bg-warning/15 text-warning",
  vencida: "bg-danger/12 text-danger",
};

const DOT: Record<EstadoPlano, string> = {
  em_dia: "bg-success",
  a_vencer: "bg-warning",
  vencida: "bg-danger",
};

/** Categoria do plano → categoria do pedido criado ao [Agendar]. */
const PLANO_PARA_PEDIDO: Record<CategoriaPlano, CategoriaPedido> = {
  caldeira: "aquecimento",
  ac: "climatizacao",
  extintor: "outros",
  detetor_co: "outros",
  certificado_energetico: "outros",
  chamine: "outros",
  inspecao_gas: "aquecimento",
  inspecao_eletrica: "eletricidade",
  vistoria_al: "outros",
  limpeza_condutas: "outros",
  outros: "outros",
};

export function PrevencaoSection({ propertyId }: { propertyId?: string }) {
  const tasks = useMaintenancePlanStore((s) => s.tasks);
  const criarPlano = useMaintenancePlanStore((s) => s.criarPlanoRecomendado);
  const removeTask = useMaintenancePlanStore((s) => s.remove);
  const properties = usePropertiesStore((s) => s.properties);

  const [formTask, setFormTask] = useState<PlanTask | "nova" | null>(null);
  const [feitaTask, setFeitaTask] = useState<PlanTask | null>(null);
  const [histTask, setHistTask] = useState<PlanTask | null>(null);

  const minhas = useMemo(
    () => (propertyId ? tasks.filter((t) => t.propertyId === propertyId) : tasks),
    [tasks, propertyId]
  );
  const vencidas = minhas.filter((t) => estadoPlano(t) === "vencida");
  const aVencer = minhas.filter((t) => estadoPlano(t) === "a_vencer");

  // Agrupar por imóvel (na página); no tab do imóvel é um grupo único
  const grupos = useMemo(() => {
    const por = new Map<string, PlanTask[]>();
    for (const t of minhas) {
      por.set(t.propertyId, [...(por.get(t.propertyId) ?? []), t]);
    }
    return [...por.entries()].map(([pid, ts]) => ({
      pid,
      nome: properties.find((p) => p.id === pid)?.name ?? "Imóvel",
      tarefas: ts.sort((a, b) => (a.proximaExecucao < b.proximaExecucao ? -1 : 1)),
    }));
  }, [minhas, properties]);

  const imovelSemPlano = propertyId && minhas.length === 0;

  return (
    <div className="space-y-4">
      {/* Banner de urgência */}
      {(vencidas.length > 0 || aVencer.length > 0) && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium",
            vencidas.length > 0 ? "border-danger/40 bg-danger/8 text-danger" : "border-warning/40 bg-warning/8 text-warning"
          )}
        >
          <ShieldCheck size={16} className="shrink-0" />
          {vencidas.length > 0 && (
            <span>
              {vencidas.length} {vencidas.length === 1 ? "revisão obrigatória vencida" : "revisões vencidas"}
            </span>
          )}
          {vencidas.length > 0 && aVencer.length > 0 && <span>·</span>}
          {aVencer.length > 0 && (
            <span className={vencidas.length > 0 ? "text-warning" : ""}>
              {aVencer.length} a vencer nos próximos 14 dias
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Obrigações legais e revisões periódicas — a app avisa antes de vencerem.
        </p>
        <Button size="sm" variant="outline" onClick={() => setFormTask("nova")}>
          <Plus size={14} /> Nova tarefa preventiva
        </Button>
      </div>

      {imovelSemPlano ? (
        <Card>
          <CardContent className="py-10 text-center">
            <ShieldCheck size={28} className="mx-auto mb-2 text-muted" />
            <p className="text-sm text-muted">Este imóvel ainda não tem plano de manutenção preventiva.</p>
            <Button
              size="sm"
              variant="gold"
              className="mt-3"
              onClick={() => {
                const p = properties.find((x) => x.id === propertyId);
                if (!p) return;
                const n = criarPlano(p);
                toast.success(n > 0 ? `Plano criado · ${n} tarefas recomendadas` : "O plano já estava completo");
              }}
            >
              <Sparkles size={14} /> Criar plano de manutenção recomendado
            </Button>
          </CardContent>
        </Card>
      ) : minhas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted">
            <ShieldCheck size={28} className="mx-auto mb-2" />
            <p className="text-sm">Sem tarefas preventivas. Crie o plano recomendado num imóvel (tab Manutenção) ou adicione uma tarefa.</p>
          </CardContent>
        </Card>
      ) : (
        grupos.map((g) => (
          <div key={g.pid}>
            {!propertyId && (
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.nome}</p>
            )}
            <div className="space-y-2">
              {g.tarefas.map((t) => (
                <TarefaRow
                  key={t.id}
                  t={t}
                  onAgendar={() => {}}
                  onFeita={() => setFeitaTask(t)}
                  onEditar={() => setFormTask(t)}
                  onHistorico={() => setHistTask(t)}
                  onEliminar={() => {
                    if (confirm(`Eliminar a tarefa "${t.titulo}"?`)) {
                      removeTask(t.id);
                      toast.success("Tarefa eliminada");
                    }
                  }}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {formTask && (
        <TarefaFormDialog
          tarefa={formTask === "nova" ? null : formTask}
          propertyIdFixo={propertyId}
          onClose={() => setFormTask(null)}
        />
      )}
      {feitaTask && <MarcarFeitaDialog tarefa={feitaTask} onClose={() => setFeitaTask(null)} />}
      {histTask && <HistoricoDialog tarefa={histTask} onClose={() => setHistTask(null)} />}
    </div>
  );
}

/* ═════════════════ Linha de tarefa ═════════════════ */

function TarefaRow({
  t,
  onFeita,
  onEditar,
  onHistorico,
  onEliminar,
}: {
  t: PlanTask;
  onAgendar: () => void;
  onFeita: () => void;
  onEditar: () => void;
  onHistorico: () => void;
  onEliminar: () => void;
}) {
  const addPedido = useMaintenanceStore((s) => s.add);
  const technicians = useTechniciansStore((s) => s.technicians);
  const estado = estadoPlano(t);
  const dias = diasParaExecucao(t);
  const Icon = CATEGORIA_PLANO_ICON[t.categoria];

  const agendar = () => {
    const id = addPedido({
      propertyId: t.propertyId,
      titulo: t.titulo,
      descricao: `Tarefa do plano preventivo (${PERIODICIDADE_LABEL[t.periodicidade].toLowerCase()}).${t.notaLegal ? ` ${t.notaLegal}` : ""}`,
      categoria: PLANO_PARA_PEDIDO[t.categoria],
      prioridade: estado === "vencida" ? "alta" : "normal",
      estado: "agendado",
      responsabilidade: "senhorio",
      tecnicoId: t.tecnicoId,
      dataAgendada: t.proximaExecucao,
      custoEstimado: t.custoTipico,
      origem: "preventivo",
      planTaskId: t.id,
    });
    void id;
    toast.success("Pedido agendado criado ✓", { description: "Aparece no kanban de pedidos." });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-card px-4 py-3 shadow-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-secondary">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
          {t.titulo}
          {t.obrigatoriaLegal && (
            <span
              title={t.notaLegal ?? "Obrigação legal"}
              className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary"
            >
              <ShieldCheck size={10} /> Obrigatória por lei
            </span>
          )}
        </p>
        <p className="num text-[11px] text-muted">
          {PERIODICIDADE_LABEL[t.periodicidade]} · próxima: {dataPT(t.proximaExecucao)}
          {t.custoTipico ? ` · ~${eur(t.custoTipico)}` : ""}
        </p>
      </div>
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", ESTADO_PLANO_TONE[estado])}>
        <span className={cn("h-1.5 w-1.5 rounded-full", DOT[estado])} />
        {estado === "vencida"
          ? `Vencida há ${Math.abs(dias)}d`
          : estado === "a_vencer"
            ? `Vence em ${dias}d`
            : ESTADO_PLANO_LABEL[estado]}
      </span>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={agendar} title="Cria um pedido agendado ligado a esta tarefa">
          <CalendarClock size={13} /> Agendar
        </Button>
        <Button size="sm" variant="gold" onClick={onFeita}>
          <CheckCircle2 size={13} /> Marcar como feita
        </Button>
        <button onClick={onEditar} className="rounded p-1.5 text-muted hover:bg-accent hover:text-ink" title="Editar">
          <Pencil size={14} />
        </button>
        <button onClick={onHistorico} className="rounded p-1.5 text-muted hover:bg-accent hover:text-ink" title="Ver histórico">
          <History size={14} />
        </button>
        <button onClick={onEliminar} className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger" title="Eliminar">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

/* ═════════════════ Dialog: marcar como feita ═════════════════ */

function MarcarFeitaDialog({ tarefa, onClose }: { tarefa: PlanTask; onClose: () => void }) {
  const marcarFeita = useMaintenancePlanStore((s) => s.marcarFeita);
  const technicians = useTechniciansStore((s) => s.technicians);
  const addDoc = useDocumentsStore((s) => s.add);

  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [custo, setCusto] = useState(tarefa.custoTipico ?? 0);
  const [tecnico, setTecnico] = useState(
    technicians.find((t) => t.id === tarefa.tecnicoId)?.nome ?? ""
  );
  const [obs, setObs] = useState("");
  const [ficheiro, setFicheiro] = useState<{ name: string; dataUrl: string; mime: string; size: number } | null>(null);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const dataUrl = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsDataURL(f);
    });
    setFicheiro({ name: f.name, dataUrl, mime: f.type || "application/octet-stream", size: f.size });
  };

  const guardar = () => {
    if (!data) {
      toast.error("Indique a data da execução");
      return;
    }
    let documentId: string | undefined;
    if (ficheiro) {
      documentId = addDoc({
        nome: ficheiro.name,
        ficheiroUrl: ficheiro.dataUrl,
        mimeType: ficheiro.mime,
        uploadedAt: data,
        categoria: "Manutenção",
        propertyId: tarefa.propertyId,
        tamanho: ficheiro.size,
        notas: `Comprovativo — ${tarefa.titulo} (${dataPT(data)}).`,
        uploadedBy: CURRENT_USER_ID,
      });
    }
    marcarFeita(tarefa.id, {
      data,
      custo: custo || undefined,
      tecnicoNome: tecnico.trim() || undefined,
      observacoes: obs.trim() || undefined,
      documentId,
    });
    toast.success("Execução registada ✓", {
      description: `Próxima: ${dataPT(somarPeriodicidade(data, tarefa.periodicidade))}.`,
    });
    onClose();
  };

  return (
    <Dialogo titulo={`Marcar como feita · ${tarefa.titulo}`} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Data da execução</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Custo</span>
          <MoneyBox value={custo} onChange={(v) => setCusto(v ?? 0)} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Técnico</span>
          <input list="tecnicos-plano" value={tecnico} onChange={(e) => setTecnico(e.target.value)} placeholder="Nome do técnico/empresa" className={inputCls} />
          <datalist id="tecnicos-plano">
            {technicians.map((t) => (
              <option key={t.id} value={t.nome} />
            ))}
          </datalist>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Observações</span>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-secondary" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Comprovativo (PDF/foto — vai para a Pasta Digital)</span>
          <input type="file" accept="application/pdf,image/*" onChange={(e) => onFile(e.target.files?.[0])} className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-card file:px-3 file:py-2 file:text-sm file:text-ink" />
          {ficheiro && (
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-success/8 px-2 py-1 text-[11px] text-success">
              <FileText size={12} /> {ficheiro.name}
            </span>
          )}
        </label>
      </div>
      <p className="mt-3 rounded-lg bg-accent px-3 py-2 text-[11px] text-muted">
        A próxima execução é recalculada automaticamente: {dataPT(somarPeriodicidade(data || new Date().toISOString().slice(0, 10), tarefa.periodicidade))}.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar}><CheckCircle2 size={14} /> Registar execução</Button>
      </div>
    </Dialogo>
  );
}

/* ═════════════════ Dialog: nova/editar tarefa ═════════════════ */

function TarefaFormDialog({
  tarefa,
  propertyIdFixo,
  onClose,
}: {
  tarefa: PlanTask | null;
  propertyIdFixo?: string;
  onClose: () => void;
}) {
  const add = useMaintenancePlanStore((s) => s.add);
  const update = useMaintenancePlanStore((s) => s.update);
  const properties = usePropertiesStore((s) => s.properties);
  const technicians = useTechniciansStore((s) => s.technicians);

  const [propertyId, setPropertyId] = useState(tarefa?.propertyId ?? propertyIdFixo ?? "");
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "");
  const [categoria, setCategoria] = useState<CategoriaPlano>(tarefa?.categoria ?? "caldeira");
  const [periodicidade, setPeriodicidade] = useState<PeriodicidadePlano>(tarefa?.periodicidade ?? "anual");
  const [proxima, setProxima] = useState(tarefa?.proximaExecucao ?? "");
  const [obrigatoria, setObrigatoria] = useState(tarefa?.obrigatoriaLegal ?? false);
  const [notaLegal, setNotaLegal] = useState(tarefa?.notaLegal ?? "");
  const [tecnicoId, setTecnicoId] = useState(tarefa?.tecnicoId ?? "");
  const [custoTipico, setCustoTipico] = useState(tarefa?.custoTipico ?? 0);
  const [antecedencia, setAntecedencia] = useState(tarefa?.lembreteAntecedenciaDias ?? 14);

  const guardar = () => {
    if (!propertyId || !titulo.trim() || !proxima) {
      toast.error("Preencha imóvel, título e próxima execução");
      return;
    }
    if (tarefa) {
      update(tarefa.id, {
        propertyId,
        titulo: titulo.trim(),
        categoria,
        periodicidade,
        proximaExecucao: proxima,
        obrigatoriaLegal: obrigatoria,
        notaLegal: notaLegal.trim() || undefined,
        tecnicoId: tecnicoId || undefined,
        custoTipico: custoTipico || undefined,
        lembreteAntecedenciaDias: antecedencia,
      });
      toast.success("Tarefa atualizada ✓");
    } else {
      add({
        propertyId,
        titulo: titulo.trim(),
        categoria,
        periodicidade,
        proximaExecucao: proxima,
        obrigatoriaLegal: obrigatoria,
        notaLegal: notaLegal.trim() || undefined,
        tecnicoId: tecnicoId || undefined,
        custoTipico: custoTipico || undefined,
        lembreteAntecedenciaDias: antecedencia,
      });
      toast.success("Tarefa preventiva criada ✓");
    }
    onClose();
  };

  return (
    <Dialogo titulo={tarefa ? "Editar tarefa preventiva" : "Nova tarefa preventiva"} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Imóvel</span>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            disabled={!!propertyIdFixo}
            className={cn(inputCls, propertyIdFixo && "opacity-60")}
          >
            <option value="">Escolher imóvel…</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Título</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Revisão da caldeira" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Categoria</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaPlano)} className={inputCls}>
            {(Object.keys(CATEGORIA_PLANO_LABEL) as CategoriaPlano[]).map((c) => (
              <option key={c} value={c}>{CATEGORIA_PLANO_LABEL[c]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Periodicidade</span>
          <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value as PeriodicidadePlano)} className={inputCls}>
            {(Object.keys(PERIODICIDADE_LABEL) as PeriodicidadePlano[]).map((p) => (
              <option key={p} value={p}>{PERIODICIDADE_LABEL[p]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Próxima execução</span>
          <input type="date" value={proxima} onChange={(e) => setProxima(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Custo típico</span>
          <MoneyBox value={custoTipico} onChange={(v) => setCustoTipico(v ?? 0)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Técnico habitual</span>
          <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className={inputCls}>
            <option value="">— Nenhum —</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Avisar com antecedência (dias)</span>
          <input type="number" value={antecedencia || ""} onChange={(e) => setAntecedencia(Number(e.target.value) || 14)} className={inputCls} />
        </label>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" checked={obrigatoria} onChange={(e) => setObrigatoria(e.target.checked)} className="h-4 w-4 accent-[#5C3D2E]" />
          <span className="text-sm text-ink">Obrigatória por lei</span>
        </label>
        {obrigatoria && (
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-muted">Nota legal (aparece no tooltip do selo)</span>
            <input value={notaLegal} onChange={(e) => setNotaLegal(e.target.value)} placeholder="Ex.: Inspeção obrigatória da instalação de gás" className={inputCls} />
          </label>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar}><Plus size={14} /> {tarefa ? "Guardar" : "Criar tarefa"}</Button>
      </div>
    </Dialogo>
  );
}

/* ═════════════════ Dialog: histórico ═════════════════ */

function HistoricoDialog({ tarefa, onClose }: { tarefa: PlanTask; onClose: () => void }) {
  const docs = useDocumentsStore((s) => s.documents);
  return (
    <Dialogo titulo={`Histórico · ${tarefa.titulo}`} onClose={onClose}>
      {tarefa.historico.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Ainda sem execuções registadas.</p>
      ) : (
        <ul className="space-y-2">
          {tarefa.historico.map((h, i) => {
            const doc = h.documentId ? docs.find((d) => d.id === h.documentId) : undefined;
            return (
              <li key={i} className="rounded-xl border border-line bg-bg/40 px-3 py-2.5 text-sm">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="num font-medium text-ink">{dataPT(h.data)}</span>
                  {h.custo != null && h.custo > 0 && <span className="num text-muted">{eur(h.custo)}</span>}
                  {h.tecnicoNome && <span className="text-muted">{h.tecnicoNome}</span>}
                  {doc && (
                    <button
                      onClick={() => {
                        if (doc.ficheiroUrl && doc.ficheiroUrl !== "#") window.open(doc.ficheiroUrl, "_blank");
                        else toast.message("Comprovativo", { description: doc.nome });
                      }}
                      className="inline-flex items-center gap-1 text-secondary hover:underline"
                    >
                      <FileText size={12} /> {doc.nome}
                    </button>
                  )}
                </p>
                {h.observacoes && <p className="mt-0.5 text-xs text-muted">{h.observacoes}</p>}
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
      </div>
    </Dialogo>
  );
}

/* ═════════════════ Shell de diálogo ═════════════════ */

function Dialogo({ titulo, children, onClose }: { titulo: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-semibold text-ink">{titulo}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
