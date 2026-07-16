import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Hammer, Pencil, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import {
  useObrasStore,
  CATEGORIA_LABEL,
  FASES_SUGERIDAS,
  DIVISAO_LABEL,
  DIVISAO_ORDEM,
  divisaoDe,
  type ObraCategoria,
  type ObraEstado,
  type Divisao,
} from "@/store/useObrasStore";
import { DIVISAO_ICON } from "@/components/obras/Divisoes";
import { MoneyBox } from "@/components/ui/MoneyField";
import { useTechniciansStore, ESPECIALIDADE_LABEL } from "@/store/useTechniciansStore";
import { eur } from "@/lib/format";
import { useCollabStore } from "@/store/useCollabStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { cn } from "@/lib/utils";

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
  addFases: boolean;
  addTranches: boolean;
}

function emptyForm(initial: {
  projectId?: string | null;
  propertyId?: string | null;
}): FormState {
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
    addFases: false,
    addTranches: false,
  };
}

const CATEGORIAS = Object.entries(CATEGORIA_LABEL) as [ObraCategoria, string][];

export function NewObraModal() {
  const { obraForm, closeObraForm } = useModalStore();
  const { open, editingId, initialProjectId, initialPropertyId } = obraForm;
  const addObra = useObrasStore((s) => s.addObra);
  const updateObra = useObrasStore((s) => s.updateObra);
  const editingObra = useObrasStore((s) => (editingId ? s.obras.find((o) => o.id === editingId) : undefined));
  const addFase = useObrasStore((s) => s.addFase);
  const addMarco = useObrasStore((s) => s.addMarco);
  const projects = useCollabStore((s) => s.projects);
  const properties = usePropertiesStore((s) => s.properties);
  const technicians = useTechniciansStore((s) => s.technicians);

  const [form, setForm] = useState<FormState>(() =>
    emptyForm({ projectId: initialProjectId, propertyId: initialPropertyId })
  );
  // Erros inline (vermelho por baixo do campo) — mostrados ao tentar submeter.
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setErros({});
      if (editingId && editingObra) {
        // Pré-preencher o formulário com os dados da obra existente
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
          addFases: false,
          addTranches: false,
        });
      } else {
        setForm(emptyForm({ projectId: initialProjectId, propertyId: initialPropertyId }));
      }
    }
  }, [open, editingId, editingObra, initialProjectId, initialPropertyId]);

  if (!open) return null;

  const isEditing = !!editingId;

  const patch = (p: Partial<FormState>) => {
    setForm((s) => ({ ...s, ...p }));
    // Limpa o erro dos campos que o utilizador acabou de corrigir
    setErros((e) => {
      const n = { ...e };
      Object.keys(p).forEach((k) => delete n[k]);
      return n;
    });
  };

  const sugeridas = FASES_SUGERIDAS[form.categoria];
  const preSelected = !!(initialProjectId || initialPropertyId);

  const onSubmit = () => {
    // Valida e mostra os erros a vermelho por baixo de cada campo obrigatório
    const e: Record<string, string> = {};
    if (!form.titulo.trim()) e.titulo = "Indique o nome da obra";
    if (!isEditing && form.origin === "project" && !form.projectId) e.projectId = "Selecione um projeto";
    if (!isEditing && form.origin === "property" && !form.propertyId) e.propertyId = "Selecione um imóvel";
    if (form.orcamento <= 0) e.orcamento = "Indique o orçamento previsto";
    if (Object.keys(e).length > 0) {
      setErros(e);
      toast.error("Faltam campos obrigatórios");
      return;
    }

    if (isEditing && editingId) {
      updateObra(editingId, {
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
      toast.success("Obra atualizada", { description: form.titulo });
      closeObraForm();
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
      empreiteiro: form.empreiteiro.trim() || undefined,
      empreiteiroId: form.empreiteiroId || undefined,
      contactoEmpreiteiro: form.contactoEmpreiteiro.trim() || undefined,
      notas: form.descricao.trim(),
    });

    // Plano de pagamentos sugerido: 30% adjudicação · 40% a meio · 30% no fim
    if (form.addTranches && form.orcamento > 0) {
      const ini = form.dataInicio || new Date().toISOString().slice(0, 10);
      const fim = form.dataFimPrevista || ini;
      const meio = new Date((new Date(`${ini}T00:00:00`).getTime() + new Date(`${fim}T00:00:00`).getTime()) / 2)
        .toISOString()
        .slice(0, 10);
      const emp = form.empreiteiro.trim() || undefined;
      const t30 = Math.round(form.orcamento * 0.3);
      const t40 = Math.round(form.orcamento * 0.4);
      addMarco({ obraId, titulo: "Adjudicação (30%)", valor: t30, dataPrevista: ini, estado: "pendente", empreiteiro: emp });
      addMarco({ obraId, titulo: "A meio da obra (40%)", valor: t40, dataPrevista: meio, estado: "pendente", empreiteiro: emp });
      addMarco({ obraId, titulo: "Conclusão (30%)", valor: form.orcamento - t30 - t40, dataPrevista: fim, estado: "pendente", empreiteiro: emp });
    }

    if (form.addFases && sugeridas.length > 0) {
      const ini = form.dataInicio || new Date().toISOString().slice(0, 10);
      const fim = form.dataFimPrevista || ini;
      const total = Math.max(
        7,
        Math.round((new Date(fim).getTime() - new Date(ini).getTime()) / 86400000)
      );
      const step = Math.max(1, Math.floor(total / sugeridas.length));
      sugeridas.forEach((titulo, i) => {
        const start = new Date(`${ini}T00:00:00`);
        start.setDate(start.getDate() + i * step);
        const end = new Date(start);
        end.setDate(end.getDate() + step);
        const custoEstimado = Math.round(form.orcamento / sugeridas.length);
        addFase({
          obraId,
          titulo,
          dataInicio: start.toISOString().slice(0, 10),
          dataFim: end.toISOString().slice(0, 10),
          progresso: 0,
          custoEstimado,
          ordem: i + 1,
        });
      });
    }

    toast.success("Obra adicionada", { description: form.titulo });
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
              <p className="text-xs text-muted">
                {isEditing
                  ? "Corrija os campos e guarde"
                  : preSelected
                    ? "Projeto pré-selecionado"
                    : "Escolha onde criar a obra"}
              </p>
            </div>
          </div>
          <button onClick={closeObraForm} className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* PRIMEIRO passo: em que parte da casa? (uma pergunta por ecrã) */}
          {!isEditing && !form.divisao ? (
            <div>
              <h3 className="font-display text-xl font-semibold text-ink">Em que parte da casa?</h3>
              <p className="mt-1 text-sm text-muted">Escolha a divisão onde vai mexer.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {DIVISAO_ORDEM.map((d) => {
                  const Icon = DIVISAO_ICON[d];
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => patch({ divisao: d })}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-bg/40 p-4 transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold/5"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-secondary">
                        <Icon size={26} strokeWidth={1.8} />
                      </span>
                      <span className="text-sm font-medium text-ink">{DIVISAO_LABEL[d]}</span>
                      {d === "casa_toda" && (
                        <span className="text-center text-[10px] leading-tight text-muted">Obras gerais (canalização, eletricidade…)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
          <>
          {!isEditing && form.divisao && (
            <button
              type="button"
              onClick={() => patch({ divisao: "" })}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-medium text-gold-dark hover:bg-gold/15"
            >
              {(() => { const Icon = DIVISAO_ICON[form.divisao as Divisao]; return <Icon size={15} />; })()}
              {DIVISAO_LABEL[form.divisao as Divisao]} · alterar
            </button>
          )}
          {!preSelected && !isEditing && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Onde criar a obra
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => patch({ origin: "project" })}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    form.origin === "project"
                      ? "border-gold bg-gold/10"
                      : "border-line bg-bg/40 hover:bg-accent"
                  )}
                >
                  <p className="text-sm font-medium text-ink">Projeto colaborativo</p>
                  <p className="text-[11px] text-muted">Compra e revenda ou parceria</p>
                </button>
                <button
                  onClick={() => patch({ origin: "property" })}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    form.origin === "property"
                      ? "border-primary bg-accent"
                      : "border-line bg-bg/40 hover:bg-accent"
                  )}
                >
                  <p className="text-sm font-medium text-ink">Imóvel solo</p>
                  <p className="text-[11px] text-muted">Da minha carteira</p>
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {!preSelected && !isEditing && form.origin === "project" && (
              <Field label="Projeto" error={erros.projectId} className="sm:col-span-2">
                <select
                  value={form.projectId}
                  onChange={(e) => patch({ projectId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Selecione…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.number} · {p.title}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {!preSelected && !isEditing && form.origin === "property" && (
              <Field label="Imóvel" error={erros.propertyId} className="sm:col-span-2">
                <select
                  value={form.propertyId}
                  onChange={(e) => patch({ propertyId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Selecione…</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.city}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Nome da obra" error={erros.titulo} className="sm:col-span-2">
              <input
                value={form.titulo}
                onChange={(e) => patch({ titulo: e.target.value })}
                placeholder="Ex.: Remodelação cozinha"
                className={inputCls}
              />
            </Field>

            <Field label="Categoria">
              <select
                value={form.categoria}
                onChange={(e) => patch({ categoria: e.target.value as ObraCategoria })}
                className={inputCls}
              >
                {CATEGORIAS.map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>

            <Field label="Orçamento previsto" error={erros.orcamento}>
              <MoneyBox value={form.orcamento || undefined} onChange={(n) => patch({ orcamento: n ?? 0 })} />
            </Field>

            <Field label="Data de início">
              <input
                type="date"
                value={form.dataInicio}
                onChange={(e) => patch({ dataInicio: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Conclusão prevista">
              <input
                type="date"
                value={form.dataFimPrevista}
                onChange={(e) => patch({ dataFimPrevista: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Estado inicial">
              <select
                value={form.estado}
                onChange={(e) => patch({ estado: e.target.value as ObraEstado })}
                className={inputCls}
              >
                <option value="por_iniciar">Por iniciar</option>
                <option value="em_curso">Em curso</option>
              </select>
            </Field>

            <Field label="Empreiteiro (opcional)">
              <select
                value={form.empreiteiroId || (form.empreiteiro ? "__manual" : "")}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__manual") { patch({ empreiteiroId: "" }); return; }
                  const tec = technicians.find((t) => t.id === v);
                  patch({
                    empreiteiroId: v,
                    empreiteiro: tec?.nome ?? "",
                    contactoEmpreiteiro: tec ? [tec.email, tec.telefone].filter(Boolean).join(" · ") : form.contactoEmpreiteiro,
                  });
                }}
                className={inputCls}
              >
                <option value="">— Do diretório —</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}{t.especialidades[0] ? ` · ${ESPECIALIDADE_LABEL[t.especialidades[0]]}` : ""}</option>
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

            <Field label="Contacto (opcional)" className="sm:col-span-2">
              <input
                value={form.contactoEmpreiteiro}
                onChange={(e) => patch({ contactoEmpreiteiro: e.target.value })}
                placeholder="Email · telefone"
                className={inputCls}
              />
            </Field>

            <Field label="Descrição / notas" className="sm:col-span-2">
              <textarea
                value={form.descricao}
                onChange={(e) => patch({ descricao: e.target.value })}
                rows={2}
                placeholder="Detalhes da obra…"
                className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-secondary"
              />
            </Field>

            {/* Sugestão de fases iniciais — só na criação */}
            {!isEditing && <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => patch({ addFases: !form.addFases })}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  form.addFases
                    ? "border-gold bg-gold/10"
                    : "border-line bg-bg/40 hover:bg-accent"
                )}
              >
                <Sparkles
                  size={18}
                  className={form.addFases ? "text-gold-dark" : "text-muted"}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">
                    Adicionar fases iniciais sugeridas
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {CATEGORIA_LABEL[form.categoria]}: {sugeridas.join(" · ")}
                  </p>
                </div>
                <div
                  className={cn(
                    "h-5 w-9 rounded-full p-0.5 transition-colors",
                    form.addFases ? "bg-gold" : "bg-line"
                  )}
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                      form.addFases ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </div>
              </button>
            </div>}

            {/* Plano de pagamentos sugerido — só na criação */}
            {!isEditing && <div className="sm:col-span-2">
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
                  <p className="text-sm font-medium text-ink">Criar plano de pagamentos sugerido</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    30% adjudicação · 40% a meio · 30% no fim
                    {form.orcamento > 0 ? ` — ${eur(Math.round(form.orcamento * 0.3))} · ${eur(Math.round(form.orcamento * 0.4))} · ${eur(form.orcamento - Math.round(form.orcamento * 0.3) - Math.round(form.orcamento * 0.4))}` : ""}
                    {" "}· editável depois
                  </p>
                </div>
                <div className={cn("h-5 w-9 rounded-full p-0.5 transition-colors", form.addTranches ? "bg-gold" : "bg-line")}>
                  <div className={cn("h-4 w-4 rounded-full bg-white shadow-sm transition-transform", form.addTranches ? "translate-x-4" : "translate-x-0")} />
                </div>
              </button>
            </div>}
          </div>
          </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line px-5 py-4">
          <Button type="button" variant="ghost" onClick={closeObraForm}>
            Cancelar
          </Button>
          {(isEditing || form.divisao) && (
            <Button type="button" onClick={onSubmit}>
              <Check size={16} /> {isEditing ? "Guardar alterações" : "Adicionar obra"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────── Helpers ────────────

const inputCls =
  "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

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
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
