import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  X,
  Check,
  TrendingUp,
  TrendingDown,
  Upload,
  Sparkles,
  QrCode,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import {
  useTransactionsStore,
  categoriasPara,
  CATEGORIAS_DESPESA,
  CATEGORIAS_RECEITA,
  type TipoMov,
  type Periodicidade,
} from "@/store/useTransactionsStore";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

const schema = z.object({
  tipo: z.enum(["receita", "despesa"]),
  propertyId: z.string().min(1, "Escolha um imóvel"),
  categoria: z.string().min(1, "Escolha uma categoria"),
  valor: z.coerce.number().positive("Valor inválido"),
  data: z.string().min(1, "Indique a data"),
  descricao: z.string().min(2, "Descreva o movimento"),
  reciboUrl: z.string().optional(),
  recorrente: z.boolean(),
  periodicidade: z.enum(["mensal", "trimestral", "anual"]).optional(),
  deduzivelIrs: z.boolean(),
  notas: z.string().optional(),
});

type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function ExpenseFormModal() {
  const { expenseForm, closeExpenseForm } = useModalStore();
  const { open, initialTipo, initialPropertyId, editingId } = expenseForm;
  const properties = usePropertiesStore((s) => s.properties);
  const add = useTransactionsStore((s) => s.add);
  const update = useTransactionsStore((s) => s.update);
  const getById = useTransactionsStore((s) => s.getById);
  const [scanning, setScanning] = useState(false);

  const defaults = useMemo<FormValues>(
    () => ({
      tipo: initialTipo,
      propertyId: initialPropertyId ?? properties[0]?.id ?? "",
      categoria: initialTipo === "despesa" ? "" : "Renda",
      valor: 0,
      data: new Date().toISOString().slice(0, 10),
      descricao: "",
      reciboUrl: "",
      recorrente: false,
      periodicidade: undefined,
      deduzivelIrs: initialTipo === "despesa",
      notas: "",
    }),
    [initialTipo, initialPropertyId, properties]
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: defaults,
    mode: "onTouched",
  });

  useEffect(() => {
    if (!open) return;
    if (editingId) {
      const t = getById(editingId);
      if (t) {
        reset({
          tipo: t.tipo,
          propertyId: t.propertyId,
          categoria: t.categoria,
          valor: t.valor,
          data: t.data,
          descricao: t.descricao,
          reciboUrl: t.reciboUrl ?? "",
          recorrente: t.recorrente,
          periodicidade: t.periodicidade,
          deduzivelIrs: t.deduzivelIrs ?? false, // pode vir "por classificar" (undefined)
          notas: t.notas ?? "",
        });
        return;
      }
    }
    reset(defaults);
  }, [open, editingId, getById, reset, defaults]);

  if (!open) return null;

  const tipo = watch("tipo");
  const recorrente = watch("recorrente");
  const reciboUrl = watch("reciboUrl");
  const categorias = categoriasPara(tipo);

  // Quando muda o tipo, repor categoria para um valor válido do novo conjunto
  const onChangeTipo = (next: TipoMov) => {
    setValue("tipo", next, { shouldDirty: true });
    const lista = categoriasPara(next);
    const atual = watch("categoria");
    if (!lista.includes(atual)) {
      setValue("categoria", next === "receita" ? "Renda" : "", { shouldValidate: false });
    }
    if (next === "receita") setValue("deduzivelIrs", false);
  };

  const simularScan = () => {
    setScanning(true);
    setTimeout(() => {
      // Mock plausível para demo
      const exemplos =
        tipo === "despesa"
          ? [
              { categoria: "Manutenção/Reparações", descricao: "Reparação canalização — fornecedor X", valor: 187.5 },
              { categoria: "Água/Luz/Gás", descricao: "Fatura EDP", valor: 64.2 },
              { categoria: "Seguro", descricao: "Prémio Fidelidade", valor: 198 },
            ]
          : [{ categoria: "Renda", descricao: "Recibo de renda", valor: 1100 }];
      const pick = exemplos[Math.floor(Math.random() * exemplos.length)];
      setValue("categoria", pick.categoria, { shouldValidate: true });
      setValue("descricao", pick.descricao, { shouldValidate: true });
      setValue("valor", pick.valor, { shouldValidate: true });
      setValue("data", new Date().toISOString().slice(0, 10));
      setScanning(false);
      toast.success("Recibo lido", { description: `${pick.categoria} · ${pick.valor.toLocaleString("pt-PT")} €` });
    }, 850);
  };

  const onFile = (file: File) => {
    const r = new FileReader();
    r.onload = () => setValue("reciboUrl", String(r.result), { shouldDirty: true });
    r.readAsDataURL(file);
  };

  const onValid = (values: FormOutput) => {
    const payload = {
      tipo: values.tipo,
      propertyId: values.propertyId,
      categoria: values.categoria,
      valor: values.valor,
      data: values.data,
      descricao: values.descricao,
      reciboUrl: values.reciboUrl?.trim() ? values.reciboUrl : undefined,
      recorrente: values.recorrente,
      periodicidade: values.recorrente ? values.periodicidade : undefined,
      deduzivelIrs: values.deduzivelIrs,
      notas: values.notas?.trim() || undefined,
    };
    if (editingId) {
      update(editingId, payload);
      toast.success("Movimento atualizado ✨");
    } else {
      add(payload);
      toast.success("Movimento registado ✨", {
        description: `${values.tipo === "receita" ? "Receita" : "Despesa"} · ${eur(values.valor)}`,
      });
    }
    closeExpenseForm();
  };

  // Validação falhou → além do realce nos campos, dizer PORQUÊ num toast
  const onInvalid = (errs: FieldErrors<FormValues>) => {
    const primeiro = Object.values(errs).find((e) => e?.message);
    toast.error("Não foi possível registar o movimento", {
      description: String(primeiro?.message ?? "Verifique os campos assinalados a vermelho."),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onMouseDown={closeExpenseForm}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              {editingId ? "Editar movimento" : "Novo movimento"}
            </h2>
            <p className="text-xs text-muted">Registe rendas, despesas e outras transações dos seus imóveis.</p>
          </div>
          <button onClick={closeExpenseForm} className="text-muted hover:text-ink" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onValid as (v: FormValues) => void, onInvalid)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {/* Toggle tipo */}
            <div className="grid grid-cols-2 gap-2">
              <TipoButton
                ativo={tipo === "despesa"}
                tone="despesa"
                onClick={() => onChangeTipo("despesa")}
                icon={TrendingDown}
                label="Despesa"
              />
              <TipoButton
                ativo={tipo === "receita"}
                tone="receita"
                onClick={() => onChangeTipo("receita")}
                icon={TrendingUp}
                label="Receita"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Imóvel */}
              <Field label="Imóvel" error={errors.propertyId?.message} className="sm:col-span-2">
                <select {...register("propertyId")} className={inputCls}>
                  <option value="">— Selecionar —</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.city}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Categoria */}
              <Field label="Categoria" error={errors.categoria?.message}>
                <select {...register("categoria")} className={inputCls}>
                  <option value="">— Selecionar —</option>
                  {(tipo === "despesa" ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Valor */}
              <Field label="Valor" error={errors.valor?.message}>
                <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
                  <input
                    type="number"
                    step="0.01"
                    {...register("valor")}
                    className="h-10 w-full bg-transparent px-3 text-sm outline-none"
                  />
                  <span className="px-3 text-sm text-muted">€</span>
                </div>
              </Field>

              {/* Data */}
              <Field label="Data" error={errors.data?.message}>
                <input type="date" {...register("data")} className={inputCls} />
              </Field>

              {/* Descrição */}
              <Field label="Descrição" error={errors.descricao?.message} className="sm:col-span-2">
                <input
                  {...register("descricao")}
                  placeholder="Ex.: Renda de junho · Inquilino"
                  className={inputCls}
                />
              </Field>

              {/* Recibo/Fatura */}
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-xs font-medium text-muted">Recibo / Fatura</p>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-card px-3 text-sm text-ink hover:bg-accent">
                    <Upload size={14} />
                    Carregar PDF / foto
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onFile(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={simularScan}
                    disabled={scanning}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-card px-3 text-sm text-secondary hover:bg-accent disabled:opacity-50"
                  >
                    {scanning ? <Sparkles className="animate-pulse" size={14} /> : <QrCode size={14} />}
                    {scanning ? "A ler…" : "Scan QR / extrair dados"}
                  </button>
                  {reciboUrl && (
                    <button
                      type="button"
                      onClick={() => setValue("reciboUrl", "")}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-danger/30 bg-danger/5 px-3 text-sm text-danger hover:bg-danger/10"
                    >
                      <Trash2 size={13} /> Remover
                    </button>
                  )}
                </div>
                {reciboUrl && (
                  <p className="mt-1.5 truncate text-[11px] text-muted">📎 Recibo anexado</p>
                )}
              </div>

              {/* Recorrente */}
              <Field label="Recorrente" className="sm:col-span-2">
                <div className="flex flex-wrap items-center gap-3">
                  <SwitchInline
                    checked={recorrente}
                    onChange={(v) => {
                      setValue("recorrente", v, { shouldDirty: true });
                      if (v && !watch("periodicidade")) setValue("periodicidade", "mensal");
                    }}
                  />
                  {recorrente && (
                    <select {...register("periodicidade")} className={cn(inputCls, "h-9 max-w-[160px]")}>
                      <option value="mensal">Mensal</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="anual">Anual</option>
                    </select>
                  )}
                </div>
              </Field>

              {/* Dedutível IRS */}
              {tipo === "despesa" && (
                <Field label="Dedutível em IRS (Categoria F)" className="sm:col-span-2">
                  <SwitchInline
                    checked={watch("deduzivelIrs")}
                    onChange={(v) => setValue("deduzivelIrs", v, { shouldDirty: true })}
                  />
                </Field>
              )}

              {/* Notas */}
              <Field label="Notas (opcional)" className="sm:col-span-2">
                <textarea {...register("notas")} rows={3} className={cn(inputCls, "h-auto py-2")} />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            <Button type="button" variant="ghost" onClick={closeExpenseForm}>
              Cancelar
            </Button>
            <Button type="submit" variant={tipo === "receita" ? "primary" : "primary"}>
              <Check size={16} />
              {editingId ? "Guardar alterações" : "Registar movimento"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

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

function TipoButton({
  ativo,
  tone,
  onClick,
  icon: Icon,
  label,
}: {
  ativo: boolean;
  tone: "receita" | "despesa";
  onClick: () => void;
  icon: typeof TrendingUp;
  label: string;
}) {
  const color = tone === "receita" ? "text-success" : "text-danger";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
        ativo
          ? tone === "receita"
            ? "border-success bg-success/8 text-success"
            : "border-danger bg-danger/8 text-danger"
          : "border-line bg-card text-muted hover:bg-accent"
      )}
    >
      <Icon size={16} className={ativo ? color : ""} />
      {label}
    </button>
  );
}

function SwitchInline({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",
        checked ? "bg-secondary" : "bg-line"
      )}
    >
      <span
        className={cn(
          "h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}
