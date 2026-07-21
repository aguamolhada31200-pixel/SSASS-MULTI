import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { X, Hammer, Pencil, Check, ChevronLeft, Sparkles, Users2, Building2 } from "lucide-react";
import { EmptyPicker } from "@/components/ui/EmptyPicker";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import {
  useObrasStore,
  CATEGORIA_LABEL,
  DIVISAO_LABEL,
  DIVISAO_ORDEM,
  divisaoDe,
  type ObraCategoria,
  type ObraEstado,
  type Divisao,
} from "@/store/useObrasStore";
import { DIVISAO_ICON } from "@/components/obras/Divisoes";
import { useMaintenanceStore } from "@/store/useMaintenanceStore";
import { MoneyBox } from "@/components/ui/MoneyField";
import { useTechniciansStore, ESPECIALIDADE_LABEL } from "@/store/useTechniciansStore";
import { eur } from "@/lib/format";
import { useCollabStore } from "@/store/useCollabStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useExampleData } from "@/store/useExampleData";
import { cn } from "@/lib/utils";

// CRIAR OBRA — simples por fora, completa por dentro (Parte 2 do blueprint):
// camada rápida com 3 perguntas (divisão · o quê · quanto/quando) e nada mais.
// O detalhe (mão de obra, materiais, IVA, licenças…) vive DENTRO da obra,
// no ecrã Dinheiro → "Ver orçamento detalhado".

type Origin = "project" | "property";

interface FormState {
  origin: Origin;
  projectId: string;
  propertyId: string;
  divisao: Divisao | "";
  titulo: string;
  categoria: ObraCategoria;
  orcamento: number;
  dataInicio: string;
  dataFimPrevista: string;
  estado: ObraEstado;
  empreiteiro: string;
  empreiteiroId: string;
  contactoEmpreiteiro: string;
  descricao: string;
  addTranches: boolean;
}

function emptyForm(initial: { projectId?: string | null; propertyId?: string | null }): FormState {
  return {
    origin: initial.propertyId ? "property" : "project",
    projectId: initial.projectId ?? "",
    propertyId: initial.propertyId ?? "",
    divisao: "",
    titulo: "",
    categoria: "geral",
    orcamento: 0,
    dataInicio: "",
    dataFimPrevista: "",
    estado: "por_iniciar",
    empreiteiro: "",
    empreiteiroId: "",
    contactoEmpreiteiro: "",
    descricao: "",
    addTranches: false,
  };
}

const CATEGORIAS = Object.entries(CATEGORIA_LABEL) as [ObraCategoria, string][];

// ── Retorno ao fluxo: guarda a obra a meio enquanto o utilizador cria o
// projeto/imóvel em falta; ao criar, o modal reabre com tudo como estava. ──
const OBRA_PENDENTE_KEY = "obraPendente";

export interface ObraPendente {
  form: FormState;
  passo: number;
  /** Preenchido pelo modal que criou a entidade em falta. */
  novoProjectId?: string;
  novoPropertyId?: string;
}

export function guardarObraPendente(p: ObraPendente): void {
  try { sessionStorage.setItem(OBRA_PENDENTE_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

export function lerObraPendente(): ObraPendente | null {
  try {
    const raw = sessionStorage.getItem(OBRA_PENDENTE_KEY);
    return raw ? (JSON.parse(raw) as ObraPendente) : null;
  } catch {
    return null;
  }
}

export function limparObraPendente(): void {
  try { sessionStorage.removeItem(OBRA_PENDENTE_KEY); } catch { /* noop */ }
}

/** Chamado pelos modais de criação (imóvel/projeto): se havia uma obra a meio, retoma-a. */
export function retomarObraPendente(novo: { propertyId?: string; projectId?: string }, openObraForm: () => void): boolean {
  const p = lerObraPendente();
  if (!p) return false;
  guardarObraPendente({ ...p, novoPropertyId: novo.propertyId ?? p.novoPropertyId, novoProjectId: novo.projectId ?? p.novoProjectId });
  openObraForm();
  return true;
}

export function NewObraModal() {
  const { obraForm, closeObraForm, openPropertyForm, openCollabForm } = useModalStore();
  const { open, editingId, initialProjectId, initialPropertyId, prefill } = obraForm;
  const navigate = useNavigate();
  void navigate;
  const converterEmObra = useMaintenanceStore((s) => s.converterEmObra);
  const addObra = useObrasStore((s) => s.addObra);
  const updateObra = useObrasStore((s) => s.updateObra);
  const editingObra = useObrasStore((s) => (editingId ? s.obras.find((o) => o.id === editingId) : undefined));
  const addMarco = useObrasStore((s) => s.addMarco);
  const { enabled: exemplosOn } = useExampleData();
  const projectsAll = useCollabStore((s) => s.projects);
  const propertiesAll = usePropertiesStore((s) => s.properties);
  // Com «Dados de exemplo» desligado, as listas ficam vazias → estados vazios testáveis.
  const projects = exemplosOn ? projectsAll : [];
  const properties = exemplosOn ? propertiesAll : [];
  const technicians = useTechniciansStore((s) => s.technicians);

  // Passos da camada rápida: 1 divisão · 2 o quê · 3 quanto/quando
  const [passo, setPasso] = useState(1);
  const [form, setForm] = useState<FormState>(() =>
    emptyForm({ projectId: initialProjectId, propertyId: initialPropertyId })
  );
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setErros({});
      setPasso(1);
      if (editingId && editingObra) {
        setForm({
          origin: editingObra.propertyId ? "property" : "project",
          projectId: editingObra.projectId ?? "",
          propertyId: editingObra.propertyId ?? "",
          divisao: divisaoDe(editingObra),
          titulo: editingObra.titulo,
          categoria: editingObra.categoria,
          orcamento: editingObra.orcamento,
          dataInicio: editingObra.dataInicio,
          dataFimPrevista: editingObra.dataFimPrevista,
          estado: editingObra.estado,
          empreiteiro: editingObra.empreiteiro ?? "",
          empreiteiroId: editingObra.empreiteiroId ?? "",
          contactoEmpreiteiro: editingObra.contactoEmpreiteiro ?? "",
          descricao: editingObra.notas ?? "",
          addTranches: false,
        });
      } else if (lerObraPendente()) {
        // RETORNO AO FLUXO: o utilizador foi criar o projeto/imóvel em falta — retoma onde ia.
        const p = lerObraPendente()!;
        limparObraPendente();
        const form: FormState = {
          ...p.form,
          projectId: p.novoProjectId ?? p.form.projectId,
          propertyId: p.novoPropertyId ?? p.form.propertyId,
          origin: p.novoProjectId ? "project" : p.novoPropertyId ? "property" : p.form.origin,
        };
        setForm(form);
        setPasso(p.passo);
        toastSuccess(p.novoProjectId ? "Projeto criado" : "Imóvel criado", {
          description: "Continue a criar a obra — já está selecionado.",
        });
      } else {
        const base = emptyForm({ projectId: initialProjectId, propertyId: initialPropertyId });
        if (prefill) {
          const categoriasValidas = Object.keys(CATEGORIA_LABEL);
          setForm({
            ...base,
            titulo: prefill.titulo ?? base.titulo,
            categoria: (prefill.categoria && categoriasValidas.includes(prefill.categoria)
              ? prefill.categoria
              : base.categoria) as ObraCategoria,
            orcamento: prefill.orcamento ?? base.orcamento,
            descricao: prefill.descricao ?? base.descricao,
          });
        } else {
          setForm(base);
        }
      }
    }
  }, [open, editingId, editingObra, initialProjectId, initialPropertyId, prefill]);

  if (!open) return null;

  const isEditing = !!editingId;
  const preSelected = !!(initialProjectId || initialPropertyId);

  const patch = (p: Partial<FormState>) => {
    setForm((s) => ({ ...s, ...p }));
    setErros((e) => {
      const n = { ...e };
      Object.keys(p).forEach((k) => delete n[k]);
      return n;
    });
  };

  const validarPasso2 = () => {
    const e: Record<string, string> = {};
    if (!form.titulo.trim()) e.titulo = "Diga o que vai fazer";
    if (form.origin === "project" && !form.projectId) e.projectId = "Selecione um projeto";
    if (form.origin === "property" && !form.propertyId) e.propertyId = "Selecione um imóvel";
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const criar = () => {
    const e: Record<string, string> = {};
    if (form.orcamento <= 0) e.orcamento = "Indique o orçamento previsto";
    if (Object.keys(e).length > 0) {
      setErros(e);
      toastError("Indique quanto pensa gastar");
      return;
    }

    const obraId = addObra({
      projectId: form.origin === "project" ? form.projectId : undefined,
      propertyId: form.origin === "property" ? form.propertyId : undefined,
      titulo: form.titulo.trim(),
      divisao: form.divisao || undefined,
      categoria: form.categoria,
      orcamento: form.orcamento,
      gasto: 0,
      dataInicio: form.dataInicio,
      dataFimPrevista: form.dataFimPrevista,
      estado: form.estado,
      progresso: 0,
      notas: form.descricao.trim(),
      fotos: prefill?.fotos,
    });

    // Ponte manutenção → obra: fecha o pedido e deixa o link cruzado
    if (prefill?.maintenanceId) {
      converterEmObra(prefill.maintenanceId, obraId, form.titulo.trim());
    }

    // Plano de pagamentos sugerido: 30% adjudicação · 40% a meio · 30% no fim
    if (form.addTranches && form.orcamento > 0) {
      const ini = form.dataInicio || new Date().toISOString().slice(0, 10);
      const fim = form.dataFimPrevista || ini;
      const meio = new Date((new Date(`${ini}T00:00:00`).getTime() + new Date(`${fim}T00:00:00`).getTime()) / 2)
        .toISOString()
        .slice(0, 10);
      const t30 = Math.round(form.orcamento * 0.3);
      const t40 = Math.round(form.orcamento * 0.4);
      addMarco({ obraId, titulo: "Adjudicação (30%)", valor: t30, dataPrevista: ini, estado: "pendente" });
      addMarco({ obraId, titulo: "A meio da obra (40%)", valor: t40, dataPrevista: meio, estado: "pendente" });
      addMarco({ obraId, titulo: "Conclusão (30%)", valor: form.orcamento - t30 - t40, dataPrevista: fim, estado: "pendente" });
    }

    toastSuccess("Obra criada", { description: "Pode detalhar o orçamento dentro da obra, quando quiser." });
    closeObraForm();
  };

  const guardarEdicao = () => {
    if (!form.titulo.trim() || form.orcamento <= 0) {
      setErros({
        ...(form.titulo.trim() ? {} : { titulo: "Indique o nome da obra" }),
        ...(form.orcamento > 0 ? {} : { orcamento: "Indique o orçamento" }),
      });
      toastError("Faltam campos obrigatórios");
      return;
    }
    updateObra(editingId!, {
      titulo: form.titulo.trim(),
      divisao: form.divisao || undefined,
      categoria: form.categoria,
      orcamento: form.orcamento,
      dataInicio: form.dataInicio,
      dataFimPrevista: form.dataFimPrevista,
      estado: form.estado,
      empreiteiro: form.empreiteiro.trim() || undefined,
      empreiteiroId: form.empreiteiroId || undefined,
      contactoEmpreiteiro: form.contactoEmpreiteiro.trim() || undefined,
      notas: form.descricao.trim(),
    });
    toastSuccess("Obra atualizada", { description: form.titulo });
    closeObraForm();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onMouseDown={closeObraForm}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/15">
              {isEditing ? <Pencil size={18} className="text-warning" /> : <Hammer size={18} className="text-warning" />}
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                {isEditing ? "Editar obra" : "Nova obra"}
              </h2>
              {!isEditing && <p className="text-sm text-muted">Pergunta {passo} de 3 — o resto é opcional, dentro da obra</p>}
            </div>
          </div>
          <button onClick={closeObraForm} className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {isEditing ? (
            <EdicaoForm form={form} patch={patch} erros={erros} technicians={technicians} />
          ) : passo === 1 ? (
            /* ── PERGUNTA 1: em que parte da casa? ── */
            <div>
              <h3 className="font-display text-[22px] font-semibold text-ink">Em que parte da casa?</h3>
              <p className="mt-1 text-base text-muted">Escolha a divisão onde vai mexer.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {DIVISAO_ORDEM.map((d) => {
                  const Icon = DIVISAO_ICON[d];
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        patch({ divisao: d });
                        setPasso(2);
                      }}
                      className="flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-bg/40 p-4 transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold/5"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-secondary">
                        <Icon size={26} strokeWidth={1.8} />
                      </span>
                      <span className="text-base font-medium text-ink">{DIVISAO_LABEL[d]}</span>
                      {d === "casa_toda" && (
                        <span className="text-center text-xs leading-tight text-muted">Obras gerais</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : passo === 2 ? (
            /* ── PERGUNTA 2: o que vai fazer? ── */
            <div className="space-y-4">
              <DivisaoChip divisao={form.divisao as Divisao} onBack={() => setPasso(1)} />
              <h3 className="font-display text-[22px] font-semibold text-ink">O que vai fazer?</h3>

              {!preSelected && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => patch({ origin: "project" })}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      form.origin === "project" ? "border-gold bg-gold/10" : "border-line bg-bg/40 hover:bg-accent"
                    )}
                  >
                    <p className="text-base font-medium text-ink">Projeto colaborativo</p>
                    <p className="text-xs text-muted">Compra e revenda ou parceria</p>
                  </button>
                  <button
                    onClick={() => patch({ origin: "property" })}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      form.origin === "property" ? "border-primary bg-accent" : "border-line bg-bg/40 hover:bg-accent"
                    )}
                  >
                    <p className="text-base font-medium text-ink">Imóvel solo</p>
                    <p className="text-xs text-muted">Da minha carteira</p>
                  </button>
                </div>
              )}

              {!preSelected && form.origin === "project" && (
                projects.length === 0 ? (
                  <EmptyPicker
                    icon={Users2}
                    titulo="Ainda não tem projetos colaborativos."
                    linha="Crie o projeto primeiro — a obra fica guardada e continua a seguir."
                    ctaLabel="Criar projeto colaborativo →"
                    onCta={() => {
                      guardarObraPendente({ form, passo: 2 });
                      closeObraForm();
                      openCollabForm();
                    }}
                    secundario={{ label: "Ou criar esta obra num imóvel meu", onClick: () => patch({ origin: "property" }) }}
                  />
                ) : (
                  <Field label="Projeto" error={erros.projectId}>
                    <select value={form.projectId} onChange={(e) => patch({ projectId: e.target.value })} className={inputCls}>
                      <option value="">Selecione…</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>#{p.number} · {p.title}</option>
                      ))}
                    </select>
                  </Field>
                )
              )}
              {!preSelected && form.origin === "property" && (
                properties.length === 0 ? (
                  <EmptyPicker
                    icon={Building2}
                    titulo="Ainda não tem imóveis registados."
                    linha="Adicione o imóvel primeiro — a obra fica guardada e continua a seguir."
                    ctaLabel="Adicionar imóvel →"
                    onCta={() => {
                      guardarObraPendente({ form, passo: 2 });
                      closeObraForm();
                      openPropertyForm();
                    }}
                  />
                ) : (
                  <Field label="Imóvel" error={erros.propertyId}>
                    <select value={form.propertyId} onChange={(e) => patch({ propertyId: e.target.value })} className={inputCls}>
                      <option value="">Selecione…</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                      ))}
                    </select>
                  </Field>
                )
              )}

              <Field label="Nome da obra" error={erros.titulo}>
                <input
                  value={form.titulo}
                  onChange={(e) => patch({ titulo: e.target.value })}
                  placeholder="Ex.: Cozinha nova"
                  autoFocus
                  className={inputCls}
                />
              </Field>

              <div>
                <span className="mb-2 block text-sm font-medium text-muted">Tipo de obra</span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS.map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => patch({ categoria: k })}
                      className={cn(
                        "rounded-full border px-4 py-2.5 text-base font-medium transition-colors",
                        form.categoria === k
                          ? "border-gold bg-gold text-sidebar"
                          : "border-line bg-card text-ink hover:bg-accent"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── PERGUNTA 3: quanto pensa gastar? ── */
            <div className="space-y-4">
              <DivisaoChip divisao={form.divisao as Divisao} onBack={() => setPasso(1)} extra={form.titulo} />
              <h3 className="font-display text-[22px] font-semibold text-ink">Quanto pensa gastar?</h3>
              <Field label="Orçamento previsto" error={erros.orcamento}>
                <MoneyBox value={form.orcamento || undefined} onChange={(n) => patch({ orcamento: n ?? 0 })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data de início">
                  <input type="date" value={form.dataInicio} onChange={(e) => patch({ dataInicio: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Conclusão prevista">
                  <input type="date" value={form.dataFimPrevista} onChange={(e) => patch({ dataFimPrevista: e.target.value })} className={inputCls} />
                </Field>
              </div>

              {/* Opcional: plano de pagamentos 30/40/30 (poupa trabalho, zero escrita) */}
              <button
                type="button"
                onClick={() => patch({ addTranches: !form.addTranches })}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  form.addTranches ? "border-gold bg-gold/10" : "border-line bg-bg/40 hover:bg-accent"
                )}
              >
                <Sparkles size={18} className={form.addTranches ? "text-gold-dark" : "text-muted"} />
                <div className="flex-1">
                  <p className="text-base font-medium text-ink">Criar plano de pagamentos sugerido</p>
                  <p className="mt-0.5 text-xs text-muted">
                    30% adjudicação · 40% a meio · 30% no fim
                    {form.orcamento > 0 ? ` — ${eur(Math.round(form.orcamento * 0.3))} · ${eur(Math.round(form.orcamento * 0.4))} · ${eur(form.orcamento - Math.round(form.orcamento * 0.3) - Math.round(form.orcamento * 0.4))}` : ""}
                  </p>
                </div>
                <div className={cn("h-5 w-9 rounded-full p-0.5 transition-colors", form.addTranches ? "bg-gold" : "bg-line")}>
                  <div className={cn("h-4 w-4 rounded-full bg-white shadow-sm transition-transform", form.addTranches ? "translate-x-4" : "translate-x-0")} />
                </div>
              </button>

              <p className="rounded-xl border border-line/60 bg-bg/40 px-3 py-2.5 text-sm text-muted">
                Só isto. Depois, dentro da obra, pode detalhar o orçamento (mão de obra, materiais, licenças, IVA…) — e o total recalcula-se sozinho.
              </p>
            </div>
          )}
        </div>

        {/* Footer — botões grandes */}
        <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-4">
          {isEditing ? (
            <>
              <Button type="button" variant="ghost" onClick={closeObraForm}>Cancelar</Button>
              <Button type="button" size="lg" onClick={guardarEdicao}>
                <Check size={16} /> Guardar alterações
              </Button>
            </>
          ) : passo === 1 ? (
            <Button type="button" variant="ghost" onClick={closeObraForm}>Cancelar</Button>
          ) : passo === 2 ? (
            <>
              <Button type="button" variant="ghost" onClick={() => setPasso(1)}>
                <ChevronLeft size={16} /> Voltar
              </Button>
              <Button
                type="button"
                size="lg"
                variant="gold"
                className="min-h-12 flex-1 sm:flex-none sm:px-10"
                onClick={() => {
                  if (validarPasso2()) setPasso(3);
                }}
              >
                Próximo
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => setPasso(2)}>
                <ChevronLeft size={16} /> Voltar
              </Button>
              <Button type="button" size="lg" variant="gold" className="min-h-12 flex-1 sm:flex-none sm:px-10" onClick={criar}>
                <Check size={16} /> Criar obra
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Chip com a divisão escolhida (+ título) — toca para voltar ao passo 1. */
function DivisaoChip({ divisao, onBack, extra }: { divisao: Divisao; onBack: () => void; extra?: string }) {
  const Icon = DIVISAO_ICON[divisao];
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-medium text-gold-dark hover:bg-gold/15"
    >
      <Icon size={15} />
      {DIVISAO_LABEL[divisao]}
      {extra ? ` · ${extra}` : ""} · alterar
    </button>
  );
}

/** Modo edição — formulário compacto (os campos essenciais da obra). */
/* eslint-disable @typescript-eslint/no-explicit-any */
function EdicaoForm({
  form,
  patch,
  erros,
  technicians,
}: {
  form: FormState;
  patch: (p: Partial<FormState>) => void;
  erros: Record<string, string>;
  technicians: { id: string; nome: string; especialidades: string[] }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nome da obra" error={erros.titulo} className="sm:col-span-2">
        <input value={form.titulo} onChange={(e) => patch({ titulo: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Divisão">
        <select value={form.divisao} onChange={(e) => patch({ divisao: e.target.value as Divisao })} className={inputCls}>
          {DIVISAO_ORDEM.map((d) => (
            <option key={d} value={d}>{DIVISAO_LABEL[d]}</option>
          ))}
        </select>
      </Field>
      <Field label="Categoria">
        <select value={form.categoria} onChange={(e) => patch({ categoria: e.target.value as ObraCategoria })} className={inputCls}>
          {CATEGORIAS.map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>
      <Field label="Orçamento previsto" error={erros.orcamento}>
        <MoneyBox value={form.orcamento || undefined} onChange={(n) => patch({ orcamento: n ?? 0 })} />
      </Field>
      <Field label="Estado">
        <select value={form.estado} onChange={(e) => patch({ estado: e.target.value as ObraEstado })} className={inputCls}>
          <option value="por_iniciar">Por iniciar</option>
          <option value="em_curso">Em curso</option>
          <option value="pausada">Pausada</option>
          <option value="concluida">Concluída</option>
        </select>
      </Field>
      <Field label="Data de início">
        <input type="date" value={form.dataInicio} onChange={(e) => patch({ dataInicio: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Conclusão prevista">
        <input type="date" value={form.dataFimPrevista} onChange={(e) => patch({ dataFimPrevista: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Empreiteiro (opcional)">
        <select
          value={form.empreiteiroId || (form.empreiteiro ? "__manual" : "")}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__manual") {
              patch({ empreiteiroId: "" });
              return;
            }
            const tec = technicians.find((t) => t.id === v);
            patch({ empreiteiroId: v, empreiteiro: tec?.nome ?? "" });
          }}
          className={inputCls}
        >
          <option value="">— Do diretório —</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
              {t.especialidades[0] ? ` · ${(ESPECIALIDADE_LABEL as any)[t.especialidades[0]] ?? ""}` : ""}
            </option>
          ))}
          <option value="__manual">Outro (escrever abaixo)</option>
        </select>
        <input
          value={form.empreiteiro}
          onChange={(e) => patch({ empreiteiro: e.target.value, empreiteiroId: "" })}
          placeholder="Nome da empresa"
          className={cn(inputCls, "mt-1.5")}
        />
      </Field>
      <Field label="Contacto (opcional)">
        <input value={form.contactoEmpreiteiro} onChange={(e) => patch({ contactoEmpreiteiro: e.target.value })} placeholder="Email · telefone" className={inputCls} />
      </Field>
      <Field label="Descrição / notas" className="sm:col-span-2">
        <textarea
          value={form.descricao}
          onChange={(e) => patch({ descricao: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-line bg-card px-3 py-2 text-base outline-none focus:border-secondary"
        />
      </Field>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ──────────── Helpers ────────────

const inputCls =
  "h-12 w-full rounded-lg border border-line bg-card px-3 text-base outline-none focus:border-secondary";

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-sm font-medium text-muted">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
    </label>
  );
}
