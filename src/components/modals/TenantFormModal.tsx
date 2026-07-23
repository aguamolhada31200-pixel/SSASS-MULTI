import { useEffect, useState } from "react";
import { useForm, type Resolver, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Check, User, GraduationCap, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import {
  useTenantsStore,
  type DocTipo,
  type StatusInquilino,
  type TipoInquilino,
} from "@/store/useTenantsStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { cn } from "@/lib/utils";

const schema = z.object({
  // 1
  tipoInquilino: z.enum(["regular", "estudante"]),
  // 2 — obrigatório só o nome
  nomeCompleto: z.string().min(2, "Indique o nome completo"),
  nif: z.string().optional(),
  email: z.union([z.literal(""), z.string().email("Email inválido")]).optional(),
  telefone: z.string().optional(),
  nacionalidade: z.string().optional(),
  fotoUrl: z.string().optional(),
  // 3 — documento opcional
  docTipo: z.enum(["CC", "Passaporte", "Outro"]),
  docNumero: z.string().optional(),
  docValidade: z.string().optional(),
  // 4 — Regular
  entidadePatronal: z.string().optional(),
  rendimentoMensal: z.coerce.number().min(0).optional(),
  // 4 — Estudante
  universidade: z.string().optional(),
  curso: z.string().optional(),
  anoLetivo: z.string().optional(),
  // 5
  propertyId: z.string().optional(),
  contractId: z.string().optional(),
  rendaMensal: z.coerce.number().min(0).optional(),
  dataInicioContrato: z.string().optional(),
  dataFimContrato: z.string().optional(),
  status: z.enum(["ativo", "expirado", "sem_contrato"]),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  tipoInquilino: "regular",
  nomeCompleto: "",
  nif: "",
  email: "",
  telefone: "",
  nacionalidade: "Portuguesa",
  fotoUrl: "",
  docTipo: "CC",
  docNumero: "",
  docValidade: "",
  entidadePatronal: "",
  rendimentoMensal: 0,
  universidade: "",
  curso: "",
  anoLetivo: "",
  propertyId: "",
  contractId: "",
  rendaMensal: 0,
  dataInicioContrato: "",
  dataFimContrato: "",
  status: "sem_contrato",
  notas: "",
};

const STEPS = ["Tipo", "Dados pessoais", "Documento", "Situação", "Associação"];

const STEP_FIELDS: (keyof FormValues)[][] = [
  ["tipoInquilino"],
  ["nomeCompleto", "nif", "email", "telefone", "nacionalidade"],
  ["docTipo", "docNumero", "docValidade"],
  [],
  ["status"],
];

export function TenantFormModal() {
  const { tenantForm, closeTenantForm } = useModalStore();
  const { open, editingId, initialPropertyId } = tenantForm;
  const add = useTenantsStore((s) => s.add);
  const update = useTenantsStore((s) => s.update);
  const getById = useTenantsStore((s) => s.getById);
  const properties = usePropertiesStore((s) => s.properties);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const {
    register,
    handleSubmit,
    trigger,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: EMPTY,
    mode: "onTouched",
  });

  useEffect(() => {
    if (!open) return;
    setStep(0);
    if (editingId) {
      const existing = getById(editingId);
      if (existing) {
        reset({
          ...EMPTY,
          ...existing,
          docTipo: existing.docIdentificacao.tipo,
          docNumero: existing.docIdentificacao.numero,
          docValidade: existing.docIdentificacao.validade,
        });
      }
    } else {
      reset({ ...EMPTY, propertyId: initialPropertyId ?? "" });
    }
  }, [open, editingId, initialPropertyId, getById, reset]);

  if (!open) return null;

  const tipoInquilino = watch("tipoInquilino");
  const fotoUrl = watch("fotoUrl");

  const next = async () => {
    const ok = await trigger(STEP_FIELDS[step]);
    if (!ok) {
      toastError("Faltam campos obrigatórios", { description: "Reveja os campos assinalados a vermelho." });
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  // Submeteu mas há campos inválidos (podem estar num passo anterior) — avisa e
  // leva ao primeiro passo com erro, para nunca "não acontecer nada".
  const onInvalid = (errs: Record<string, unknown>) => {
    const comErro = Object.keys(errs);
    const passo = STEP_FIELDS.findIndex((fields) => fields.some((f) => comErro.includes(f as string)));
    if (passo >= 0 && passo !== step) setStep(passo);
    toastError("Faltam campos obrigatórios", { description: "Reveja os campos assinalados a vermelho." });
  };

  const onValid = (values: FormValues) => {
    const payload = {
      nomeCompleto: values.nomeCompleto.trim(),
      nif: (values.nif ?? "").trim(),
      email: (values.email ?? "").trim(),
      telefone: (values.telefone ?? "").trim(),
      nacionalidade: (values.nacionalidade ?? "").trim() || "Portuguesa",
      docIdentificacao: {
        tipo: values.docTipo as DocTipo,
        numero: (values.docNumero ?? "").trim(),
        validade: values.docValidade ?? "",
      },
      entidadePatronal: values.tipoInquilino === "regular" ? (values.entidadePatronal ?? "").trim() : "—",
      rendimentoMensal: values.tipoInquilino === "regular" ? Number(values.rendimentoMensal ?? 0) : 0,
      tipoInquilino: values.tipoInquilino as TipoInquilino,
      universidade: values.tipoInquilino === "estudante" ? values.universidade?.trim() : undefined,
      curso: values.tipoInquilino === "estudante" ? values.curso?.trim() : undefined,
      anoLetivo: values.tipoInquilino === "estudante" ? values.anoLetivo?.trim() : undefined,
      propertyId: values.propertyId || undefined,
      contractId: values.contractId?.trim() || undefined,
      status: values.status as StatusInquilino,
      rendaMensal: Number(values.rendaMensal ?? 0) || undefined,
      dataInicioContrato: values.dataInicioContrato || undefined,
      dataFimContrato: values.dataFimContrato || undefined,
      fotoUrl: values.fotoUrl?.trim() || undefined,
      notas: values.notas?.trim() ?? "",
    };

    if (editingId) {
      update(editingId, payload);
      toastSuccess("Inquilino atualizado", { description: payload.nomeCompleto });
      closeTenantForm();
    } else {
      const id = add(payload);
      toastSuccess("Inquilino registado", { description: payload.nomeCompleto });
      closeTenantForm();
      navigate(`/pessoas/inquilinos/${id}`);
    }
  };

  const onFile = (file: File) => {
    const r = new FileReader();
    r.onload = () => setValue("fotoUrl", String(r.result), { shouldDirty: true });
    r.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onMouseDown={closeTenantForm}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              {editingId ? "Editar inquilino" : "Novo inquilino"}
            </h2>
            <p className="text-xs text-muted">
              Passo {step + 1} de {STEPS.length} · {STEPS[step]}
            </p>
          </div>
          <button onClick={closeTenantForm} className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex gap-1.5 px-5 pt-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-line")} />
              <p className={cn("mt-1 text-[10px]", i === step ? "font-medium text-primary" : "text-muted")}>{s}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onValid, onInvalid)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-5">
            {/* 1 — Tipo */}
            {step === 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  { v: "regular", label: "Regular", desc: "Inquilino com contrato de habitação tradicional.", icon: User },
                  { v: "estudante", label: "Estudante", desc: "Quartos académicos por ano letivo.", icon: GraduationCap },
                ] as const).map((opt) => {
                  const Icon = opt.icon;
                  const ativo = tipoInquilino === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setValue("tipoInquilino", opt.v)}
                      className={cn(
                        "flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                        ativo ? "border-primary bg-accent" : "border-line hover:bg-accent"
                      )}
                    >
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", ativo ? "bg-primary text-white" : "bg-accent text-secondary")}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="font-display text-base font-semibold text-ink">{opt.label}</p>
                        <p className="text-xs text-muted">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2 — Dados pessoais */}
            {step === 1 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome completo" error={errors.nomeCompleto?.message} className="sm:col-span-2">
                  <input {...register("nomeCompleto")} placeholder="Ex.: Ana Martins" className={inputCls} />
                </Field>
                <Field label="NIF (opcional)" error={errors.nif?.message}>
                  <input {...register("nif")} placeholder="9 dígitos" className={inputCls} />
                </Field>
                <Field label="Nacionalidade (opcional)" error={errors.nacionalidade?.message}>
                  <input {...register("nacionalidade")} placeholder="Portuguesa" className={inputCls} />
                </Field>
                <Field label="Email (opcional)" error={errors.email?.message}>
                  <input type="email" {...register("email")} placeholder="ana@email.pt" className={inputCls} />
                </Field>
                <Field label="Telefone (opcional)" error={errors.telefone?.message}>
                  <input {...register("telefone")} placeholder="912 345 678" className={inputCls} />
                </Field>
                <Field label="Foto (opcional)" className="sm:col-span-2">
                  <div className="flex items-center gap-3">
                    {fotoUrl && (
                      <img src={fotoUrl} alt="" className="h-12 w-12 rounded-full border border-line object-cover" />
                    )}
                    <input {...register("fotoUrl")} placeholder="URL da imagem" className={inputCls} />
                    <label className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg border border-line bg-card px-3 text-sm text-muted hover:bg-accent">
                      <ImagePlus size={14} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
                    </label>
                  </div>
                </Field>
              </div>
            )}

            {/* 3 — Documento */}
            {step === 2 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tipo de documento">
                  <select {...register("docTipo")} className={inputCls}>
                    <option value="CC">Cartão de Cidadão</option>
                    <option value="Passaporte">Passaporte</option>
                    <option value="Outro">Outro</option>
                  </select>
                </Field>
                <Field label="Número (opcional)" error={errors.docNumero?.message}>
                  <input {...register("docNumero")} placeholder="Ex.: 12345678" className={inputCls} />
                </Field>
                <Field label="Validade (opcional)" error={errors.docValidade?.message} className="sm:col-span-2">
                  <input type="date" {...register("docValidade")} className={inputCls} />
                </Field>
              </div>
            )}

            {/* 4 — Situação */}
            {step === 3 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {tipoInquilino === "regular" ? (
                  <>
                    <Field label="Entidade patronal (opcional)" className="sm:col-span-2">
                      <input {...register("entidadePatronal")} placeholder="Ex.: Tech SA" className={inputCls} />
                    </Field>
                    <Num label="Rendimento mensal (opcional)" reg={register("rendimentoMensal")} suffix="€" />
                  </>
                ) : (
                  <>
                    <Field label="Universidade (opcional)" className="sm:col-span-2">
                      <input {...register("universidade")} placeholder="Ex.: Universidade de Coimbra" className={inputCls} />
                    </Field>
                    <Field label="Curso (opcional)">
                      <input {...register("curso")} placeholder="Ex.: Engenharia Informática" className={inputCls} />
                    </Field>
                    <Field label="Ano letivo (opcional)">
                      <input {...register("anoLetivo")} placeholder="Ex.: 3.º ano" className={inputCls} />
                    </Field>
                  </>
                )}
              </div>
            )}

            {/* 5 — Associação */}
            {step === 4 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Associar a imóvel (opcional)" className="sm:col-span-2">
                  <select {...register("propertyId")} className={inputCls}>
                    <option value="">Não associar agora</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[11px] text-muted">Pode associar mais tarde, sem problema.</span>
                </Field>
                <Field label="Referência do contrato (opcional)">
                  <input {...register("contractId")} placeholder="Ex.: contrato-arroios" className={inputCls} />
                </Field>
                <Num label="Renda mensal" reg={register("rendaMensal")} suffix="€" />
                <Field label="Início do contrato">
                  <input type="date" {...register("dataInicioContrato")} className={inputCls} />
                </Field>
                <Field label="Fim do contrato">
                  <input type="date" {...register("dataFimContrato")} className={inputCls} />
                </Field>
                <Field label="Status" error={errors.status?.message} className="sm:col-span-2">
                  <select {...register("status")} className={inputCls}>
                    <option value="ativo">Ativo</option>
                    <option value="expirado">Expirado</option>
                    <option value="sem_contrato">Sem contrato</option>
                  </select>
                </Field>
                <Field label="Notas" className="sm:col-span-2">
                  <textarea
                    {...register("notas")}
                    rows={3}
                    placeholder="Notas sobre o inquilino…"
                    className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-secondary"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            <Button type="button" variant="ghost" onClick={() => (step === 0 ? closeTenantForm() : setStep((s) => s - 1))}>
              <ChevronLeft size={16} /> {step === 0 ? "Cancelar" : "Voltar"}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next}>
                Próximo <ChevronRight size={16} />
              </Button>
            ) : (
              <Button type="submit">
                <Check size={16} /> {editingId ? "Guardar alterações" : "Registar inquilino"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

function Num({ label, reg, suffix }: { label: string; reg: UseFormRegisterReturn; suffix?: string }) {
  return (
    <Field label={label}>
      <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
        <input type="number" step="any" {...reg} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
        {suffix && <span className="px-3 text-sm text-muted">{suffix}</span>}
      </div>
    </Field>
  );
}
