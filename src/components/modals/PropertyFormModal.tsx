import { useEffect, useState } from "react";
import { useForm, type Resolver, type UseFormRegisterReturn, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Check, Trash2, Plus, Hammer, Upload, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Lightbox } from "@/components/Lightbox";
import { MoneyInput, MoneyBox } from "@/components/ui/MoneyField";
import { useModalStore } from "@/store/useModalStore";
import { retomarObraPendente } from "@/components/modals/NewObraModal";
import {
  usePropertiesStore,
  CLASSE_ENERGETICA,
  TIPO_RENDA_LABEL,
  FREQ_PAGAMENTO_LABEL,
  type PropType,
  type PropertyPhoto,
  type ClasseEnergetica,
  type TipoImovel,
  type TipoRendaProposto,
  type FrequenciaPagamento,
} from "@/store/usePropertiesStore";
import { useObrasStore, CATEGORIA_LABEL, type ObraCategoria, type ObraEstado } from "@/store/useObrasStore";
import { useMaintenancePlanStore } from "@/store/useMaintenancePlanStore";
import { pmt } from "@/lib/calc/imt";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

const schema = z.object({
  // A. Aquisição — obrigatórios: nome, cidade, tipo, valor de compra
  name: z.string().min(2, "Indique o nome do imóvel"),
  type: z.enum([
    "apartamento",
    "moradia",
    "predio",
    "quinta",
    "loja",
    "casa",
    "casa_ferias",
    "tradicional",
    "estudantes",
    "comercial",
    "al",
  ]),
  dataCompra: z.string().optional().default(""),
  valorCompra: z.coerce.number().positive("Valor de compra inválido"),
  entrada: z.coerce.number().min(0),
  financiado: z.coerce.number().min(0),
  prazoAnos: z.coerce.number().min(0).max(60),
  taxaJuro: z.coerce.number().min(0).max(30).optional(),
  prestacaoMensal: z.coerce.number().min(0),
  // A.2 Morada detalhada — apenas cidade é obrigatória
  address: z.string().optional().default(""),
  morada2: z.string().optional().default(""),
  codigoPostal: z.string().optional().default(""),
  freguesia: z.string().optional().default(""),
  concelho: z.string().optional().default(""),
  city: z.string().min(2, "Indique a cidade"),
  distrito: z.string().optional().default(""),
  pais: z.string().optional().default("Portugal"),
  // A.3 Descrição física — todos opcionais
  // O <select> usa value="" para "— Selecionar —"; tratamos "" como não-preenchido.
  tipoImovel: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["apartamento", "moradia", "predio", "quinta", "loja", "casa", "casa_ferias"]).optional()),
  anoConstrucao: z.coerce.number().min(0).max(new Date().getFullYear() + 5).optional(),
  areaUtil: z.coerce.number().min(0).optional(),
  numDivisoes: z.coerce.number().min(0).optional(),
  numQuartos: z.coerce.number().min(0).optional(),
  numCasasBanho: z.coerce.number().min(0).optional(),
  classeEnergetica: z.enum(["A+", "A", "B", "B-", "C", "D", "E", "F"]).optional(),
  descricao: z.string().optional().default(""),
  notaPrivada: z.string().optional().default(""),
  // B. Rendimentos
  rendaMensal: z.coerce.number().min(0),
  dataInicioArrendamento: z.string().optional(),
  caucao: z.coerce.number().min(0).optional(),
  tipoRendaProposto: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["arrendamento", "al", "estudantes", "curta_duracao"]).optional()),
  frequenciaPagamento: z.enum(["mensal", "trimestral", "semestral", "anual"]).optional(),
  estadiaMinimaMeses: z.coerce.number().min(0).optional(),
  estadiaMaximaMeses: z.coerce.number().min(0).optional(),
  // C. Impostos
  irsPct: z.coerce.number().min(0).max(100),
  // D. Despesas
  imiAnual: z.coerce.number().min(0),
  seguroAnual: z.coerce.number().min(0),
  condominioMensal: z.coerce.number().min(0),
  outrasMensais: z.coerce.number().min(0),
  // E. Fotos
  photos: z.array(z.object({ url: z.string(), legenda: z.string().optional() })).default([]),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  name: "",
  type: "apartamento",
  dataCompra: "",
  valorCompra: 0,
  entrada: 0,
  financiado: 0,
  prazoAnos: 30,
  taxaJuro: undefined,
  prestacaoMensal: 0,
  address: "",
  morada2: "",
  codigoPostal: "",
  freguesia: "",
  concelho: "",
  city: "",
  distrito: "",
  pais: "Portugal",
  tipoImovel: undefined,
  anoConstrucao: undefined,
  areaUtil: undefined,
  numDivisoes: undefined,
  numQuartos: undefined,
  numCasasBanho: undefined,
  classeEnergetica: undefined,
  descricao: "",
  notaPrivada: "",
  rendaMensal: 0,
  dataInicioArrendamento: "",
  caucao: undefined,
  tipoRendaProposto: undefined,
  frequenciaPagamento: "mensal",
  estadiaMinimaMeses: undefined,
  estadiaMaximaMeses: undefined,
  irsPct: 25,
  imiAnual: 0,
  seguroAnual: 0,
  condominioMensal: 0,
  outrasMensais: 0,
  photos: [],
};

interface ObraFormData {
  enabled: boolean;
  titulo: string;
  categoria: ObraCategoria;
  orcamento: number;
  dataInicio: string;
  dataFimPrevista: string;
  estado: ObraEstado;
}

const EMPTY_OBRA: ObraFormData = {
  enabled: false,
  titulo: "",
  categoria: "geral",
  orcamento: 0,
  dataInicio: "",
  dataFimPrevista: "",
  estado: "por_iniciar",
};

// Categoria física do imóvel (padrão dos portais imobiliários) — o que o
// utilizador espera ver ao classificar o imóvel. Alojamento Local continua
// fora deste dropdown por ser uma modalidade de exploração (fica em Rendimentos
// → "Tipo de renda proposto"). "al" no PropType existe só por retro-compat.
const TYPES_FISICOS: { value: PropType; label: string }[] = [
  { value: "apartamento", label: "Apartamento" },
  { value: "moradia", label: "Moradia" },
  { value: "predio", label: "Prédio" },
  { value: "quinta", label: "Quinta / Herdade" },
  { value: "loja", label: "Loja" },
  { value: "casa", label: "Casa" },
  { value: "casa_ferias", label: "Casa de férias" },
];

const TYPES_EXPLORACAO: { value: PropType; label: string }[] = [
  { value: "tradicional", label: "Tradicional" },
  { value: "estudantes", label: "Estudantes" },
  { value: "comercial", label: "Comercial" },
];

// Tipos físicos que também são um TipoImovel válido — usados para derivar
// `tipoImovel` a partir do `type` da Aquisição (evita pedir o mesmo duas vezes).
const TIPOS_FISICOS_SET = new Set<PropType>(["apartamento", "moradia", "predio", "quinta", "loja", "casa", "casa_ferias"]);
function tipoImovelDeType(type: PropType, atual?: TipoImovel): TipoImovel | undefined {
  return TIPOS_FISICOS_SET.has(type) ? (type as TipoImovel) : atual;
}

const STEPS = ["Aquisição", "Morada", "Descrição", "Rendimentos", "Encargos", "Fotos", "Obras"];

const STEP_FIELDS: (keyof FormValues)[][] = [
  // 0 · Aquisição — identidade + valores
  ["name", "type", "dataCompra", "valorCompra", "entrada", "financiado", "prazoAnos", "taxaJuro", "prestacaoMensal"],
  // 1 · Morada — cidade obrigatória
  ["address", "morada2", "codigoPostal", "freguesia", "concelho", "city", "distrito", "pais"],
  // 2 · Descrição física + notas (o tipo físico já vem da Aquisição)
  ["anoConstrucao", "areaUtil", "numDivisoes", "numQuartos", "numCasasBanho", "classeEnergetica", "descricao", "notaPrivada"],
  // 3 · Rendimentos
  ["rendaMensal", "dataInicioArrendamento", "caucao", "tipoRendaProposto", "frequenciaPagamento", "estadiaMinimaMeses", "estadiaMaximaMeses"],
  // 4 · Encargos (IRS + despesas fixas)
  ["irsPct", "imiAnual", "seguroAnual", "condominioMensal", "outrasMensais"],
  // 5 · Fotos
  ["photos"],
  // 6 · Obras — nada a validar
  [],
];

const CATEGORIAS = Object.entries(CATEGORIA_LABEL) as [ObraCategoria, string][];

export function PropertyFormModal() {
  const { propertyForm, closePropertyForm, openObraForm } = useModalStore();
  const { open, editingId } = propertyForm;
  const add = usePropertiesStore((s) => s.add);
  const update = usePropertiesStore((s) => s.update);
  const getById = usePropertiesStore((s) => s.getById);
  const addObra = useObrasStore((s) => s.addObra);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [obraData, setObraData] = useState<ObraFormData>(EMPTY_OBRA);

  const {
    register,
    handleSubmit,
    trigger,
    reset,
    watch,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: EMPTY,
    mode: "onTouched",
  });

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setObraData(EMPTY_OBRA);
    if (editingId) {
      const existing = getById(editingId);
      if (existing) reset({ ...EMPTY, ...existing });
    } else {
      reset(EMPTY);
    }
  }, [open, editingId, getById, reset]);

  if (!open) return null;

  const photos = watch("photos") ?? [];
  const irsPct = watch("irsPct");
  const classeEnergetica = watch("classeEnergetica");
  const anoConstrucao = watch("anoConstrucao");
  const tipoRendaProposto = watch("tipoRendaProposto");

  const next = async () => {
    const ok = await trigger(STEP_FIELDS[step]);
    if (!ok) return;
    // Ao sair da Aquisição: derivar o financiado (compra − entrada) se ficou em branco
    if (step === 0) {
      const compra = Number(getValues("valorCompra")) || 0;
      const entrada = Number(getValues("entrada")) || 0;
      const financiado = Number(getValues("financiado")) || 0;
      if (!financiado && entrada > 0 && compra > entrada) {
        const derivado = compra - entrada;
        setValue("financiado", derivado, { shouldDirty: true });
        toastInfo("Valor financiado preenchido automaticamente", {
          description: `Compra − entrada = ${eur(derivado)}. Ajuste se não for financiado.`,
        });
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const sugerirPrestacao = () => {
    const compra = Number(getValues("valorCompra")) || 0;
    const entrada = Number(getValues("entrada")) || 0;
    let financiado = Number(getValues("financiado")) || 0;
    if (!financiado && entrada > 0 && compra > entrada) financiado = compra - entrada;
    if (financiado <= 0) {
      toastError("Indique o valor financiado (ou compra e entrada) primeiro.");
      return;
    }
    const prazo = Number(getValues("prazoAnos")) || 30;
    const taxa = Number(getValues("taxaJuro")) || 4;
    const prestacao = Math.round(pmt(taxa / 100, prazo, financiado));
    setValue("financiado", financiado, { shouldDirty: true });
    setValue("prestacaoMensal", prestacao, { shouldDirty: true });
    toastInfo("Prestação estimada", {
      description: `${eur(financiado)} a ${prazo} anos · TAN ${taxa}% → ${eur(prestacao)}/mês. Ajuste ao valor real do banco.`,
    });
  };

  const onValid = (values: FormValues) => {
    // O tipo físico é escolhido na Aquisição (`type`); replicamo-lo em `tipoImovel`
    // para o plano de manutenção e o publish de anúncios continuarem a lê-lo.
    const dados = { ...values, tipoImovel: tipoImovelDeType(values.type, values.tipoImovel) };
    if (editingId) {
      update(editingId, dados);
      toastSuccess("Imóvel atualizado", { description: dados.name });
      closePropertyForm();
    } else {
      const status = obraData.enabled ? "em_obras" as const : undefined;
      const id = add({ ...dados, status });
      if (obraData.enabled && obraData.titulo.trim()) {
        addObra({
          propertyId: id,
          titulo: obraData.titulo.trim(),
          categoria: obraData.categoria,
          orcamento: obraData.orcamento,
          gasto: 0,
          dataInicio: obraData.dataInicio,
          dataFimPrevista: obraData.dataFimPrevista,
          estado: obraData.estado,
          progresso: 0,
        });
      }
      toastSuccess("Imóvel adicionado", { description: values.name });
      // Plano preventivo recomendado (caldeira, gás, extintor AL…) em 1 toque
      const criado = usePropertiesStore.getState().properties.find((p) => p.id === id);
      if (criado) {
        toastInfo("Quer criar o plano de manutenção recomendado?", {
          description: "Caldeira, inspeção de gás, certificado energético… ajustado ao tipo do imóvel.",
          duration: 10000,
          action: {
            label: "Criar plano",
            onClick: () => {
              const n = useMaintenancePlanStore.getState().criarPlanoRecomendado(criado);
              toastSuccess(n > 0 ? `Plano criado · ${n} tarefas` : "O plano já estava completo");
            },
          },
        });
      }
      closePropertyForm();
      // Retorno ao fluxo: se o utilizador veio da "Nova obra" sem imóveis,
      // reabre o modal da obra com este imóvel já selecionado.
      if (retomarObraPendente({ propertyId: id }, () => openObraForm())) return;
      navigate(`/imoveis/${id}`);
    }
  };

  // Submeteu mas há campos inválidos (podem estar num passo anterior) — avisa e
  // leva o utilizador ao primeiro passo com erro, para nunca "não acontecer nada".
  const onInvalid = (errs: FieldErrors<FormValues>) => {
    const comErro = Object.keys(errs) as (keyof FormValues)[];
    const passo = STEP_FIELDS.findIndex((fields) => fields.some((f) => comErro.includes(f)));
    if (passo >= 0 && passo !== step) setStep(passo);
    toastError("Faltam dados obrigatórios", { description: "Reveja os campos assinalados a vermelho." });
  };

  const addPhotoUrl = (url: string) => {
    if (!url.trim()) return;
    setValue("photos", [...photos, { url: url.trim(), legenda: undefined }], { shouldDirty: true });
  };

  const onFiles = (files: File[]) => {
    const imagens = files.filter((f) => f.type.startsWith("image/"));
    if (imagens.length === 0) return;
    Promise.all(
      imagens.map(
        (f) =>
          new Promise<PropertyPhoto>((res) => {
            const r = new FileReader();
            r.onload = () => res({ url: String(r.result), legenda: undefined });
            r.readAsDataURL(f);
          })
      )
    ).then((novas) => setValue("photos", [...(getValues("photos") ?? []), ...novas], { shouldDirty: true }));
  };

  const setLegenda = (i: number, legenda: string) =>
    setValue("photos", photos.map((p, idx) => (idx === i ? { ...p, legenda } : p)), { shouldDirty: true });

  const movePhoto = (from: number, to: number) => {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setValue("photos", next, { shouldDirty: true });
  };

  const setCapa = (i: number) => movePhoto(i, 0);

  const patchObra = (patch: Partial<ObraFormData>) =>
    setObraData((prev) => ({ ...prev, ...patch }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onMouseDown={closePropertyForm}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              {editingId ? "Editar imóvel" : "Adicionar imóvel"}
            </h2>
            <p className="text-xs text-muted">
              Passo {step + 1} de {STEPS.length} · {STEPS[step]}
            </p>
          </div>
          <button onClick={closePropertyForm} className="text-muted hover:text-ink">
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

        {/* Body */}
        <form onSubmit={handleSubmit(onValid, onInvalid)} className="flex min-h-0 flex-1 flex-col">
          <div className="grid flex-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
            {/* ───────── 0 · Aquisição ───────── */}
            {step === 0 && (
              <>
                <SectionTitle>Identificação e valores</SectionTitle>
                <Field label="Nome do imóvel" error={errors.name?.message} className="sm:col-span-2">
                  <input {...register("name")} placeholder="Ex.: T2 Arroios" className={inputCls} />
                </Field>
                <Field label="Tipo">
                  <select {...register("type")} className={inputCls}>
                    <optgroup label="Categoria do imóvel">
                      {TYPES_FISICOS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Modo de exploração">
                      {TYPES_EXPLORACAO.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </Field>
                <Field label="Data de compra (opcional)" error={errors.dataCompra?.message}>
                  <input type="date" {...register("dataCompra")} className={inputCls} />
                </Field>
                <MoneyInput label="Valor de compra" control={control} name="valorCompra" error={errors.valorCompra?.message} />
                <MoneyInput label="Valor da entrada (opcional)" control={control} name="entrada" />
                <MoneyInput label="Valor financiado (opcional)" control={control} name="financiado" />
                <Num label="Prazo do financiamento (opcional)" reg={register("prazoAnos")} suffix="anos" />
                <Num label="Taxa de juro (opcional)" reg={register("taxaJuro")} suffix="%" />
                <MoneyInput label="Prestação mensal (opcional)" control={control} name="prestacaoMensal" />
                <div className="sm:col-span-2 -mt-1 space-y-1">
                  <button type="button" onClick={sugerirPrestacao} className="text-xs font-medium text-secondary hover:underline">
                    ⚡ Sugerir prestação a partir do financiado (prazo/taxa acima; defaults 30 anos · 4%)
                  </button>
                  <p className="text-[11px] text-muted">
                    Se deixar o financiado em branco, calculamos compra − entrada ao avançar.
                  </p>
                </div>
              </>
            )}

            {/* ───────── 1 · Morada ───────── */}
            {step === 1 && (
              <>
                <SectionTitle>Morada do imóvel</SectionTitle>
                <Field label="Morada" error={errors.address?.message} className="sm:col-span-2">
                  <input {...register("address")} placeholder="Rua, avenida, número" className={inputCls} />
                </Field>
                <Field label="Morada 2 (opcional)" className="sm:col-span-2">
                  <input {...register("morada2")} placeholder="Andar, porta, apartamento" className={inputCls} />
                </Field>
                <Field label="Código postal (opcional)">
                  <input {...register("codigoPostal")} placeholder="1250-100" className={inputCls} />
                </Field>
                <Field label="Cidade" error={errors.city?.message}>
                  <input {...register("city")} placeholder="Lisboa" className={inputCls} />
                </Field>
                <Field label="Freguesia (opcional)">
                  <input {...register("freguesia")} placeholder="Ex.: Santo António" className={inputCls} />
                </Field>
                <Field label="Concelho (opcional)">
                  <input {...register("concelho")} placeholder="Ex.: Lisboa" className={inputCls} />
                </Field>
                <Field label="Distrito (opcional)">
                  <input {...register("distrito")} placeholder="Ex.: Lisboa" className={inputCls} />
                </Field>
                <Field label="País">
                  <input {...register("pais")} placeholder="Portugal" className={inputCls} />
                </Field>
                <p className="text-[11px] text-muted sm:col-span-2">
                  Estes dados são usados no cabeçalho de contratos PDF e para associar o imóvel a uma zona/mercado.
                </p>
              </>
            )}

            {/* ───────── 2 · Descrição ───────── */}
            {step === 2 && (
              <>
                <SectionTitle>Características físicas</SectionTitle>
                {/* Ano de construção — dado importante, em destaque no topo da caracterização */}
                <Field label="Ano de construção" error={errors.anoConstrucao?.message} className="sm:col-span-2">
                  <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Ex.: 1998"
                      {...register("anoConstrucao")}
                      className="h-10 w-full bg-transparent px-3 text-sm outline-none"
                    />
                    <span className="px-3 text-xs text-muted">
                      {anoConstrucao && Number(anoConstrucao) > 1500 ? `${Math.max(0, new Date().getFullYear() - Number(anoConstrucao))} anos` : "opcional"}
                    </span>
                  </div>
                </Field>
                <Num label="Área útil (m² · opcional)" reg={register("areaUtil")} suffix="m²" />
                <Num label="Nº de divisões (opcional)" reg={register("numDivisoes")} suffix="" />
                <Num label="Nº de quartos (opcional)" reg={register("numQuartos")} suffix="" />
                <Num label="Casas de banho (opcional)" reg={register("numCasasBanho")} suffix="" />
                <Field label="Classe energética (opcional)" className="sm:col-span-2">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setValue("classeEnergetica", undefined, { shouldDirty: true })}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm",
                        !classeEnergetica ? "border-primary bg-accent text-primary" : "border-line text-muted hover:bg-accent"
                      )}
                    >
                      —
                    </button>
                    {CLASSE_ENERGETICA.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setValue("classeEnergetica", c, { shouldDirty: true })}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-sm font-medium",
                          classeEnergetica === c ? "border-primary bg-accent text-primary" : "border-line text-muted hover:bg-accent"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </Field>

                <SectionTitle className="mt-2">Descrição</SectionTitle>
                <Field label="Descrição do imóvel (opcional)" className="sm:col-span-2">
                  <textarea
                    {...register("descricao")}
                    rows={3}
                    placeholder="Tipo, disposição, conforto, características específicas — usado no contrato de arrendamento."
                    className={cn(inputCls, "h-auto min-h-[80px] py-2 leading-relaxed")}
                  />
                </Field>
                <Field label="Nota privada (opcional)" className="sm:col-span-2">
                  <textarea
                    {...register("notaPrivada")}
                    rows={2}
                    placeholder="Anotações internas: pontos de atenção, contactos úteis, código do porteiro…"
                    className={cn(inputCls, "h-auto min-h-[64px] py-2 leading-relaxed")}
                  />
                </Field>
              </>
            )}

            {/* ───────── 3 · Rendimentos ───────── */}
            {step === 3 && (
              <>
                <SectionTitle>Proposta de renda</SectionTitle>
                <Field label="Tipo de renda proposto (opcional)" className="sm:col-span-2">
                  <select {...register("tipoRendaProposto")} className={inputCls}>
                    <option value="">— Selecionar —</option>
                    {(Object.keys(TIPO_RENDA_LABEL) as TipoRendaProposto[]).map((k) => (
                      <option key={k} value={k}>{TIPO_RENDA_LABEL[k]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Frequência de pagamento">
                  <select {...register("frequenciaPagamento")} className={inputCls}>
                    {(Object.keys(FREQ_PAGAMENTO_LABEL) as FrequenciaPagamento[]).map((k) => (
                      <option key={k} value={k}>{FREQ_PAGAMENTO_LABEL[k]}</option>
                    ))}
                  </select>
                </Field>

                {(tipoRendaProposto === "al" || tipoRendaProposto === "curta_duracao") && (
                  <>
                    <SectionTitle className="mt-2">Duração da estadia</SectionTitle>
                    <Num label="Estadia mínima (opcional)" reg={register("estadiaMinimaMeses")} suffix="meses" />
                    <Num label="Estadia máxima (opcional)" reg={register("estadiaMaximaMeses")} suffix="meses" />
                  </>
                )}
              </>
            )}

            {/* ───────── 4 · Encargos (IRS + despesas) ───────── */}
            {step === 4 && (
              <>
                <SectionTitle>IRS sobre o arrendamento</SectionTitle>
                <div className="sm:col-span-2">
                  <Field label="Percentagem de IRS (opcional · default 25% — taxa especial cat. F; 15/10/5% para contratos longos)" error={errors.irsPct?.message}>
                    <div className="flex flex-wrap items-center gap-2">
                      {[5, 10, 15, 25, 28].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setValue("irsPct", v, { shouldValidate: true })}
                          className={cn(
                            "rounded-lg border px-4 py-2 text-sm",
                            Number(irsPct) === v ? "border-primary bg-accent text-primary" : "border-line text-muted hover:bg-accent"
                          )}
                        >
                          {v}%
                        </button>
                      ))}
                      <div className="flex items-center rounded-lg border border-line bg-card">
                        <span className="px-2 text-xs text-muted">Outro</span>
                        <input type="number" step="1" {...register("irsPct")} className="h-9 w-16 bg-transparent px-2 text-sm outline-none" />
                        <span className="px-2 text-sm text-muted">%</span>
                      </div>
                    </div>
                  </Field>
                </div>

                <SectionTitle className="mt-2">Despesas fixas do imóvel</SectionTitle>
                <MoneyInput label="IMI anual (opcional)" control={control} name="imiAnual" />
                <MoneyInput label="Seguro anual (opcional)" control={control} name="seguroAnual" />
                <MoneyInput label="Condomínio mensal (opcional)" control={control} name="condominioMensal" />
                <MoneyInput label="Outras despesas mensais (opcional)" control={control} name="outrasMensais" />
              </>
            )}

            {/* ───────── 5 · Fotos ───────── */}
            {step === 5 && (
              <div className="sm:col-span-2">
                <PhotoStep
                  photos={photos}
                  onAddUrl={addPhotoUrl}
                  onFiles={onFiles}
                  onRemove={(i) => setValue("photos", photos.filter((_, idx) => idx !== i), { shouldDirty: true })}
                  onLegenda={setLegenda}
                  onMove={movePhoto}
                  onCapa={setCapa}
                />
              </div>
            )}

            {/* ───────── 6 · Obras ───────── */}
            {step === 6 && (
              <div className="sm:col-span-2 space-y-4">
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => patchObra({ enabled: !obraData.enabled })}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                    obraData.enabled
                      ? "border-warning bg-warning/5"
                      : "border-line bg-bg/40 hover:bg-accent"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    obraData.enabled ? "bg-warning/15" : "bg-accent"
                  )}>
                    <Hammer size={20} className={obraData.enabled ? "text-warning" : "text-muted"} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">Este imóvel tem obras / foi comprado para remodelar?</p>
                    <p className="text-xs text-muted">O status passará a «Em obras» e pode acompanhar o orçamento.</p>
                  </div>
                  <div className={cn(
                    "h-6 w-11 rounded-full p-0.5 transition-colors",
                    obraData.enabled ? "bg-warning" : "bg-line"
                  )}>
                    <div className={cn(
                      "h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                      obraData.enabled ? "translate-x-5" : "translate-x-0"
                    )} />
                  </div>
                </button>

                {obraData.enabled && (
                  <div className="space-y-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-warning">Obra inicial</p>
                    <Field label="Nome / descrição da obra">
                      <input
                        value={obraData.titulo}
                        onChange={(e) => patchObra({ titulo: e.target.value })}
                        placeholder="Ex.: Remodelação total"
                        className={inputCls}
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Categoria">
                        <select
                          value={obraData.categoria}
                          onChange={(e) => patchObra({ categoria: e.target.value as ObraCategoria })}
                          className={inputCls}
                        >
                          {CATEGORIAS.map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Orçamento previsto">
                        <MoneyBox
                          value={obraData.orcamento || undefined}
                          onChange={(n) => patchObra({ orcamento: n ?? 0 })}
                        />
                      </Field>
                      <Field label="Data de início">
                        <input
                          type="date"
                          value={obraData.dataInicio}
                          onChange={(e) => patchObra({ dataInicio: e.target.value })}
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Conclusão prevista">
                        <input
                          type="date"
                          value={obraData.dataFimPrevista}
                          onChange={(e) => patchObra({ dataFimPrevista: e.target.value })}
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Estado">
                        <select
                          value={obraData.estado}
                          onChange={(e) => patchObra({ estado: e.target.value as ObraEstado })}
                          className={inputCls}
                        >
                          <option value="por_iniciar">Por iniciar</option>
                          <option value="em_curso">Em curso</option>
                        </select>
                      </Field>
                    </div>
                  </div>
                )}

                {!editingId && !obraData.enabled && (
                  <p className="text-xs text-muted">
                    Pode sempre adicionar obras mais tarde na tab «Obras» do detalhe do imóvel.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => (step === 0 ? closePropertyForm() : setStep((s) => s - 1))}
            >
              <ChevronLeft size={16} /> {step === 0 ? "Cancelar" : "Voltar"}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next}>
                Próximo <ChevronRight size={16} />
              </Button>
            ) : (
              <Button type="submit">
                <Check size={16} /> {editingId ? "Guardar alterações" : "Adicionar imóvel"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

/** Título discreto de secção dentro de um passo — separa blocos temáticos sem quebrar o grid. */
function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("sm:col-span-2 flex items-center gap-2 pt-1", className)}>
      <span className="h-1 w-1 rounded-full bg-gold" />
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
        {children}
      </p>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

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

function Num({
  label,
  reg,
  error,
  suffix,
}: {
  label: string;
  reg: UseFormRegisterReturn;
  error?: string;
  suffix?: string;
}) {
  return (
    <Field label={label} error={error}>
      <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
        <input type="number" step="any" {...reg} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
        {suffix && <span className="px-3 text-sm text-muted">{suffix}</span>}
      </div>
    </Field>
  );
}

/** Gestor de fotografias (URL + upload múltiplo + legenda + preview + ordenação + capa) — partilhado com o wizard colaborativo. */
export function PhotoStep({
  photos,
  onAddUrl,
  onFiles,
  onRemove,
  onLegenda,
  onMove,
  onCapa,
}: {
  photos: PropertyPhoto[];
  onAddUrl: (url: string) => void;
  onFiles: (files: File[]) => void;
  onRemove: (i: number) => void;
  onLegenda: (i: number, legenda: string) => void;
  onMove: (from: number, to: number) => void;
  onCapa: (i: number) => void;
}) {
  const [url, setUrl] = useState("");
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted">Fotografias</p>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Colar URL da imagem…"
          className={inputCls}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddUrl(url);
              setUrl("");
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onAddUrl(url);
            setUrl("");
          }}
        >
          <Plus size={15} /> Adicionar
        </Button>
      </div>

      {/* Zona de upload — arrastar OU escolher várias fotos de uma vez */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const fs = Array.from(e.dataTransfer.files ?? []);
          if (fs.length) onFiles(fs);
        }}
        className={cn(
          "mt-3 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-6 text-sm transition-colors",
          drag ? "border-primary bg-accent text-primary" : "border-line bg-bg text-muted hover:bg-accent"
        )}
      >
        <Upload size={20} className={drag ? "text-primary" : "text-secondary"} />
        <span>Arrastar fotos para aqui ou <span className="font-medium text-primary">escolher do dispositivo</span></span>
        <span className="text-[11px] text-muted">Pode selecionar várias ao mesmo tempo · JPG, PNG…</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const fs = Array.from(e.target.files ?? []);
            if (fs.length) onFiles(fs);
            e.target.value = "";
          }}
        />
      </label>

      {photos.length > 0 && (
        <div className="mt-3 space-y-2">
          {photos.map((p, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-line bg-card p-2">
              <button
                type="button"
                onClick={() => setPreview(i)}
                className="group relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-line"
                title="Ver em grande"
              >
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-gold px-1 text-[9px] font-bold text-sidebar">Capa</span>
                )}
                <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 transition-opacity group-hover:bg-ink/40 group-hover:opacity-100">
                  <Maximize2 size={16} />
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <input
                  value={p.legenda ?? ""}
                  onChange={(e) => onLegenda(i, e.target.value)}
                  placeholder="Legenda (opcional) — Sala, Cozinha, Quarto…"
                  className="h-9 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-secondary"
                />
                <div className="mt-1.5 flex items-center gap-1">
                  <button type="button" onClick={() => onMove(i, i - 1)} disabled={i === 0} className="rounded p-1 text-muted hover:bg-accent disabled:opacity-30" title="Mover para trás">
                    <ChevronLeft size={14} />
                  </button>
                  <button type="button" onClick={() => onMove(i, i + 1)} disabled={i === photos.length - 1} className="rounded p-1 text-muted hover:bg-accent disabled:opacity-30" title="Mover para a frente">
                    <ChevronRight size={14} />
                  </button>
                  {i !== 0 && (
                    <button type="button" onClick={() => onCapa(i)} className="ml-1 rounded px-2 py-0.5 text-[11px] text-secondary hover:bg-accent" title="Definir como capa">
                      Definir capa
                    </button>
                  )}
                  <button type="button" onClick={() => onRemove(i)} className="ml-auto rounded p-1 text-muted hover:bg-danger/10 hover:text-danger" title="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview !== null && (
        <Lightbox
          fotos={photos.map((p) => ({ url: p.url, legenda: p.legenda }))}
          startIndex={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
