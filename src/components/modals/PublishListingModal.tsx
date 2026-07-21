import { useEffect, useState } from "react";
import { useForm, type Control, type Resolver, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Check, ImagePlus, Trash2, Hammer, Handshake, KeyRound, Plus, Info, Calculator } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MoneyInput, RHFMoney } from "@/components/ui/MoneyField";
import { useModalStore } from "@/store/useModalStore";
import {
  useListingsStore,
  ENERGY_SCALE,
  TIPO_CEDENCIA_LABEL,
  TIPO_IMOVEL_LABEL,
  type Listing,
  type ListingType,
  type Tipologia,
  type EstadoImovel,
  type TipoCedencia,
  type TipoImovel,
} from "@/store/useListingsStore";
import { CURRENT_USER_ID } from "@/store/useProfilesStore";
import { notificarAlertasComNovoAnuncio } from "@/store/useAlertsStore";
import {
  ctaReab,
  investimentoTotalReab,
  lucroReab,
  roiReab,
  lucroParceiroReab,
  retornoEntradaReab,
  margemSegurancaReab,
  nivelSegurancaReab,
  NIVEL_SEGURANCA_LABEL,
  type NivelSeguranca,
  arrendamentoAuto,
  ctaCedencia,
  lucroCedencia,
  roiCedencia,
  retornoEntradaCedencia,
  restanteAoPromitenteVendedor,
  margemSegurancaCedencia,
  folgaCedencia,
} from "@/lib/calc/rede";
import { calcularIMT, calcularIS } from "@/lib/calc/imt";
import { DISTRITOS_PT, concelhosDe } from "@/lib/concelhos";
import { eur, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

// Modal de publicação de anúncios da Rede (3 tipos) — fotos obrigatórias,
// margem de segurança, sub-página de fórmulas e valores com separador de milhares.
const schema = z
  .object({
    type: z.enum(["reabilitacao", "cedencia", "arrendamento"]),
    title: z.string().min(3, "Título demasiado curto"),
    description: z.string().min(10, "Descreva melhor a oportunidade"),
    district: z.string().min(2, "Indique o distrito"),
    city: z.string().min(2, "Indique a cidade"),
    exactAddress: z.string().optional().default(""),
    tipologia: z.enum(["T0", "T1", "T2", "T3", "T4", "T5+"]),
    // `.or(z.literal(""))`: a opção "— Selecionar —" do <select> envia "" e
    // z.enum().optional() só aceita undefined — sem isto o form bloqueava sem erro visível.
    tipoImovel: z.enum(["apartamento", "moradia", "predio", "quinta", "loja", "casa", "casa_ferias"]).or(z.literal("")).optional(),
    anoConstrucao: z.coerce.number().min(0).max(new Date().getFullYear() + 5).optional(),
    areaUtil: z.coerce.number().optional(),
    estado: z.enum(["a recuperar", "bom", "renovado", "novo"]),
    galleryUrls: z.array(z.object({ url: z.string(), legenda: z.string().optional() })).default([]),
    floorPlanUrl: z.string().optional(),
    energyCertificate: z.enum(["A+", "A", "B", "B-", "C", "D", "E", "F"]),
    contactPreference: z.enum(["mensagem", "email", "telefone"]),
    visibility: z.enum(["public", "verified"]),
    // reabilitacao
    valorImovel: z.coerce.number().optional(),
    orcamentoObras: z.coerce.number().optional(),
    imt: z.coerce.number().optional(),
    escritura: z.coerce.number().optional(),
    outrosCustos: z.coerce.number().optional(),
    valorMercadoAtual: z.coerce.number().optional(),
    valorVendaPrevisto: z.coerce.number().optional(),
    capitalProcurado: z.coerce.number().optional(),
    split: z.string().optional(),
    tempoAteVenda: z.string().optional(),
    // cedencia (v3)
    valorNegociado: z.coerce.number().optional(),
    valorCedencia: z.coerce.number().optional(),
    sinalPagoCedente: z.coerce.number().optional(),
    tipoCedencia: z.enum(["cpcv", "projeto_aprovado", "licenca", "obra_iniciada"]).or(z.literal("")).optional(),
    impostos: z.coerce.number().optional(),
    obra: z.coerce.number().optional(),
    valorMercadoPosObras: z.coerce.number().optional(),
    prazoObras: z.string().optional(),
    capitalNecessario: z.coerce.number().optional(),
    terminoCpcv: z.string().optional(),
    temObra: z.boolean().optional(),
    obras: z.coerce.number().optional(),
    comissaoImobiliaria: z.coerce.number().optional(),
    lucroEstimado: z.coerce.number().optional(),
    prazoAteEscritura: z.string().optional(),
    margemSeguranca: z.string().optional(),
    motivoCedencia: z.enum(["falta_capital", "falta_tempo", "mudanca_estrategia", "outro"]).or(z.literal("")).optional(),
    // arrendamento
    precoImovel: z.coerce.number().optional(),
    rendaMensal: z.coerce.number().optional(),
  })
  .superRefine((v, ctx) => {
    // "Valor primeiro": só o mínimo viável é obrigatório — preço + capital + 1 indicador de retorno.
    // Foto, morada exata, custos detalhados, planta e certificado são opcionais.
    const req = (cond: boolean, path: string, message: string) => {
      if (!cond) ctx.addIssue({ code: "custom", path: [path], message });
    };
    // Foto obrigatória em todos os tipos — pelo menos a capa.
    req((v.galleryUrls?.length ?? 0) > 0, "galleryUrls", "Adicione pelo menos uma foto (a 1.ª é a capa)");
    if (v.type === "reabilitacao") {
      req(!!v.valorImovel && v.valorImovel > 0, "valorImovel", "Obrigatório");
      req(!!v.capitalProcurado && v.capitalProcurado > 0, "capitalProcurado", "Obrigatório");
      req(!!v.valorMercadoPosObras && v.valorMercadoPosObras > 0, "valorMercadoPosObras", "Obrigatório");
      req(!!v.tempoAteVenda && v.tempoAteVenda.trim().length > 0, "tempoAteVenda", "Obrigatório");
    } else if (v.type === "cedencia") {
      req(!!v.valorCedencia && v.valorCedencia > 0, "valorCedencia", "Obrigatório");
      req(!!v.tipoCedencia, "tipoCedencia", "Obrigatório");
      req(!!v.motivoCedencia, "motivoCedencia", "Obrigatório");
      // O ESTADO DO IMÓVEL decide o cenário: "a recuperar" ⇒ com obras (exige o
      // valor de mercado pós-obras); qualquer outro estado ⇒ sem obras (exige o
      // valor de mercado atual).
      const cedComObras = v.estado === "a recuperar" || (Number(v.obra) || 0) > 0;
      if (cedComObras) {
        req(!!v.valorMercadoPosObras && v.valorMercadoPosObras > 0, "valorMercadoPosObras", "Obrigatório");
      } else {
        req(!!v.valorVendaPrevisto && v.valorVendaPrevisto > 0, "valorVendaPrevisto", "Obrigatório");
      }
    } else {
      req(!!v.precoImovel && v.precoImovel > 0, "precoImovel", "Obrigatório");
      req(!!v.capitalNecessario && v.capitalNecessario > 0, "capitalNecessario", "Obrigatório");
      req(!!v.rendaMensal && v.rendaMensal > 0, "rendaMensal", "Obrigatório");
    }
  });

type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const EMPTY: FormValues = {
  type: "reabilitacao",
  title: "",
  description: "",
  district: "",
  city: "",
  exactAddress: "",
  tipologia: "T2",
  tipoImovel: undefined,
  areaUtil: 0,
  estado: "a recuperar",
  galleryUrls: [],
  floorPlanUrl: "",
  energyCertificate: "D",
  contactPreference: "mensagem",
  visibility: "public",
  temObra: false,
  split: "50 / 50",
};

const TYPE_CARDS: { type: ListingType; label: string; desc: string; icon: typeof Hammer }[] = [
  { type: "reabilitacao", label: "Parceiros para Compra e Revenda", desc: "Procuro capital para comprar, recuperar e revender com margem.", icon: Hammer },
  { type: "cedencia", label: "Parceiros para Cedência de Posição", desc: "Cedo uma posição de CPCV antes da escritura.", icon: Handshake },
  { type: "arrendamento", label: "Oportunidades para Arrendamento (Buy e Hold)", desc: "Imóvel pronto a arrendar, para rendimento passivo.", icon: KeyRound },
];

export function PublishListingModal() {
  const { listingForm, closeListingForm } = useModalStore();
  const { open, editingId } = listingForm;
  const add = useListingsStore((s) => s.add);
  const update = useListingsStore((s) => s.update);
  const getById = useListingsStore((s) => s.getById);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [showFormulas, setShowFormulas] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    reset,
    watch,
    setValue,
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
    setShowFormulas(false);
    if (editingId) {
      const l = getById(editingId);
      if (l) {
        reset({ ...EMPTY, ...l });
        setStep(1);
      }
    } else {
      reset(EMPTY);
    }
  }, [open, editingId, getById, reset]);

  const type = watch("type");
  const gallery = watch("galleryUrls") ?? [];
  const floorPlan = watch("floorPlanUrl");
  const distrito = watch("district");
  const anoConstrucao = watch("anoConstrucao");

  // watch() sem argumentos subscreve todas as mudanças — valores sempre live no resumo.
  const valoresLive = watch();

  if (!open) return null;

  const onValid = (values: FormOutput) => {
    const coverImageUrl = values.galleryUrls[0]?.url;
    const base = {
      authorId: CURRENT_USER_ID,
      type: values.type,
      title: values.title,
      description: values.description,
      district: values.district,
      city: values.city,
      exactAddress: values.exactAddress,
      tipologia: values.tipologia as Tipologia,
      tipoImovel: values.tipoImovel || undefined,
      anoConstrucao: values.anoConstrucao || undefined,
      areaUtil: values.areaUtil,
      estado: values.estado as EstadoImovel,
      coverImageUrl,
      galleryUrls: values.galleryUrls,
      floorPlanUrl: values.floorPlanUrl?.trim() || undefined,
      energyCertificate: values.energyCertificate,
      estadoAnuncio: "ativo" as const,
      status: "active" as const,
      contactPreference: values.contactPreference,
      visibility: values.visibility,
    };

    let typed: Record<string, unknown> = {};
    if (values.type === "reabilitacao") {
      typed = {
        valorImovel: values.valorImovel,
        orcamentoObras: values.orcamentoObras,
        impostos: values.impostos ?? 0,
        outrosCustos: values.outrosCustos ?? 0,
        valorMercadoAtual: values.valorMercadoAtual || undefined,
        valorMercadoPosObras: values.valorMercadoPosObras,
        valorNegociado: values.valorNegociado || undefined,
        prazoObras: values.prazoObras || undefined,
        capitalProcurado: values.capitalProcurado,
        split: values.split || "—",
        tempoAteVenda: values.tempoAteVenda || "—",
        rentabilidadePrevista: roiReab({ ...base, ...values } as never),
      };
    } else if (values.type === "cedencia") {
      const cedAuto = computeCedencia(values);
      typed = {
        tipoCedencia: values.tipoCedencia,
        valorImovel: values.valorImovel,
        valorNegociado: values.valorNegociado,
        sinalPagoCedente: values.sinalPagoCedente ?? 0,
        valorCedencia: values.valorCedencia,
        impostos: values.impostos ?? 0,
        obra: values.obra ?? 0,
        valorMercadoPosObras: values.valorMercadoPosObras ?? 0,
        prazoObras: values.prazoObras || undefined,
        capitalNecessario: cedAuto.capitalNecessario,
        valorVendaPrevisto: values.valorVendaPrevisto,
        lucroEstimado: cedAuto.lucro,
        terminoCpcv: values.terminoCpcv || undefined,
        margemSeguranca: values.margemSeguranca || "Média",
        motivoCedencia: values.motivoCedencia,
      };
    } else {
      const auto = arrendamentoAuto(values.precoImovel ?? 0, values.capitalNecessario ?? 0, values.rendaMensal ?? 0);
      typed = {
        precoImovel: values.precoImovel,
        capitalNecessario: values.capitalNecessario,
        rendaMensal: values.rendaMensal,
        yieldLiquido: Number(auto.yieldLiquido.toFixed(1)),
        rentabilidadeCapital: Number(auto.rentabilidadeCapital.toFixed(1)),
        roi: Number(auto.roi.toFixed(1)),
      };
    }

    const payload = { ...base, ...typed } as never;
    if (editingId) {
      update(editingId, payload);
      toastSuccess("Anúncio atualizado");
      closeListingForm();
    } else {
      const id = add(payload);
      // Alertas de oportunidade: notifica quem tem critérios que este anúncio cumpre.
      const novo = getById(id);
      if (novo) notificarAlertasComNovoAnuncio(novo);
      toastSuccess("Anúncio publicado", { description: values.title });
      closeListingForm();
      navigate(`/comunidade/rede/anuncio/${id}`);
    }
  };

  const addPhoto = (url: string) => {
    if (!url.trim()) return;
    setValue("galleryUrls", [...gallery, { url: url.trim(), legenda: undefined }], { shouldValidate: true });
  };
  const onFile = (file: File, target: "gallery" | "floor") => {
    const r = new FileReader();
    r.onload = () => {
      if (target === "gallery") setValue("galleryUrls", [...gallery, { url: String(r.result), legenda: undefined }], { shouldValidate: true });
      else setValue("floorPlanUrl", String(r.result), { shouldDirty: true });
    };
    r.readAsDataURL(file);
  };
  const setLegenda = (i: number, legenda: string) =>
    setValue("galleryUrls", gallery.map((p, idx) => (idx === i ? { ...p, legenda } : p)), { shouldDirty: true });
  const moveCover = (i: number) => {
    if (i === 0) return;
    const next = [...gallery];
    const [moved] = next.splice(i, 1);
    next.unshift(moved);
    setValue("galleryUrls", next, { shouldValidate: true });
  };

  const next = async () => {
    if (step === 1) {
      const ok = await trigger();
      if (!ok) {
        toastError("Preencha os campos obrigatórios");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  // Se o Publicar disparar com o form inválido, leva o utilizador ao passo Detalhes
  // e diz porquê — o botão nunca fica "morto" sem feedback.
  const onInvalidSubmit = () => {
    toastError("Faltam campos obrigatórios", { description: "Volte ao passo Detalhes e preencha os campos assinalados a vermelho." });
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={closeListingForm}>
      <div
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">{editingId ? "Editar anúncio" : "Publicar anúncio"}</h2>
            <p className="text-xs text-muted">Passo {step + 1} de 4 · {["Categoria", "Detalhes", "Visibilidade", "Resumo e confirmação"][step]}</p>
          </div>
          <button onClick={closeListingForm} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>

        <div className="flex gap-1.5 px-5 pt-4">
          {["Categoria", "Detalhes", "Visibilidade", "Resumo"].map((s, i) => (
            <div key={s} className="flex-1">
              <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-gold" : "bg-line")} />
              <p className={cn("mt-1 text-[10px]", i === step ? "font-medium text-gold-dark" : "text-muted")}>{s}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onValid as (v: FormValues) => void, onInvalidSubmit)} className="flex min-h-0 flex-1 flex-col">
          {showFormulas ? (
            <FormulasPanel type={type} onBack={() => setShowFormulas(false)} />
          ) : (
          <div className="flex-1 overflow-y-auto p-5">
            {/* STEP 0 — categoria */}
            {step === 0 && (
              <div className="space-y-3">
                {TYPE_CARDS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.type}
                      type="button"
                      onClick={() => {
                        setValue("type", c.type);
                        setValue("estado", c.type === "arrendamento" ? "renovado" : "a recuperar");
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all",
                        type === c.type ? "border-gold bg-gold/8" : "border-line hover:bg-accent"
                      )}
                    >
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", type === c.type ? "bg-gold text-sidebar" : "bg-accent text-secondary")}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="font-display text-base font-semibold text-ink">{c.label}</p>
                        <p className="text-sm text-muted">{c.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* STEP 1 — detalhes */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Comuns */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Título" error={errors.title?.message} className="sm:col-span-2">
                    <input {...register("title")} placeholder="Ex.: Compra e Revenda Baixa do Porto" className={inputCls} />
                  </Field>
                  <Field label="Descrição" error={errors.description?.message} className="sm:col-span-2">
                    <textarea {...register("description")} rows={3} className={cn(inputCls, "h-auto py-2")} />
                  </Field>
                  <Field label="Distrito" error={errors.district?.message}>
                    <select {...register("district", { onChange: () => setValue("city", "") })} className={inputCls}>
                      <option value="">— Selecionar —</option>
                      {DISTRITOS_PT.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Concelho" error={errors.city?.message}>
                    <select {...register("city")} className={inputCls} disabled={!distrito}>
                      <option value="">{distrito ? "— Selecionar —" : "Escolha o distrito primeiro"}</option>
                      {concelhosDe(distrito ?? "").map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Morada exata (opcional · só partilhada após contacto)" error={errors.exactAddress?.message} className="sm:col-span-2">
                    <input {...register("exactAddress")} className={inputCls} placeholder="Rua, número, andar" />
                  </Field>
                  <Field label="Tipo de imóvel">
                    <select {...register("tipoImovel")} className={inputCls}>
                      <option value="">— Selecionar —</option>
                      {(Object.keys(TIPO_IMOVEL_LABEL) as TipoImovel[]).map((k) => (
                        <option key={k} value={k}>{TIPO_IMOVEL_LABEL[k]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ano de construção" error={errors.anoConstrucao?.message}>
                    <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Ex.: 1998"
                        {...register("anoConstrucao")}
                        className="h-10 w-full bg-transparent px-3 text-sm outline-none"
                      />
                      <span className="whitespace-nowrap px-3 text-xs text-muted">
                        {Number(anoConstrucao) > 1500 ? `${Math.max(0, new Date().getFullYear() - Number(anoConstrucao))} anos` : "opcional"}
                      </span>
                    </div>
                  </Field>
                  <Field label="Tipologia">
                    <select {...register("tipologia")} className={inputCls}>
                      {(["T0", "T1", "T2", "T3", "T4", "T5+"] as Tipologia[]).map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Num label="Área útil (opcional)" reg={register("areaUtil")} suffix="m²" error={errors.areaUtil?.message} />
                  <Field label="Estado do imóvel">
                    <select {...register("estado")} className={inputCls}>
                      {(["a recuperar", "bom", "renovado", "novo"] as EstadoImovel[]).map((e) => <option key={e}>{e}</option>)}
                    </select>
                  </Field>
                  <Field label="Certificado energético (opcional)">
                    <select {...register("energyCertificate")} className={inputCls}>
                      {ENERGY_SCALE.map((e) => <option key={e}>{e}</option>)}
                    </select>
                  </Field>
                </div>

                {/* Fotos */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted">
                    Fotos <span className="text-danger">*</span> <span className="font-normal">· a 1.ª é a capa</span>
                  </p>
                  <PhotoRow
                    fotos={gallery}
                    onAddUrl={addPhoto}
                    onFile={(f) => onFile(f, "gallery")}
                    onRemove={(i) => setValue("galleryUrls", gallery.filter((_, idx) => idx !== i), { shouldValidate: true })}
                    onLegenda={setLegenda}
                    onCapa={moveCover}
                  />
                  {errors.galleryUrls?.message && <p className="mt-1 text-xs text-danger">{errors.galleryUrls.message}</p>}
                </div>

                {/* Planta — mesma estrutura das fotos do imóvel */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted">Planta (opcional)</p>
                  <PlantaUploader
                    url={floorPlan}
                    onAddUrl={(u) => setValue("floorPlanUrl", u.trim(), { shouldDirty: true })}
                    onFile={(f) => onFile(f, "floor")}
                    onRemove={() => setValue("floorPlanUrl", "", { shouldDirty: true })}
                  />
                </div>

                {/* Campos type-aware */}
                <div className="rounded-xl border border-line bg-bg p-4">
                  {type === "reabilitacao" && (
                    <CamposReab register={register} errors={errors} values={valoresLive} setValue={setValue} control={control} />
                  )}
                  {type === "cedencia" && (
                    <CamposCedencia
                      register={register}
                      errors={errors}
                      values={valoresLive}
                      setValue={setValue}
                      control={control}
                    />
                  )}
                  {type === "arrendamento" && <CamposArrendamento register={register} errors={errors} control={control} />}

                  {/* Live computed */}
                  <LiveComputed type={type} v={valoresLive} />
                </div>
              </div>
            )}

            {/* STEP 2 — visibilidade */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Quem pode ver o anúncio?</p>
                  <Field label="Visibilidade">
                    <select {...register("visibility")} className={inputCls}>
                      <option value="public">Público (todos)</option>
                      <option value="verified">Só investidores verificados</option>
                    </select>
                  </Field>
                </div>

                <div className="rounded-xl border border-line bg-bg/60 p-4 text-xs text-muted">
                  <p className="font-medium text-ink">O passo seguinte é um resumo para confirmar tudo antes de publicar.</p>
                  <p className="mt-1">A morada exata só é partilhada depois do investidor manifestar interesse.</p>
                </div>
              </div>
            )}

            {/* STEP 3 — RESUMO E CONFIRMAÇÃO */}
            {step === 3 && (
              <SummaryStep v={valoresLive} />
            )}

            {/* Bolha informativa — abre a sub-página de fórmulas e definições */}
            {step > 0 && (
              <button
                type="button"
                onClick={() => setShowFormulas(true)}
                className="mt-5 flex w-full items-center gap-2.5 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-left transition-colors hover:bg-gold/10"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-dark">
                  <Info size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">Como calculamos estes números?</span>
                  <span className="block text-[11px] text-muted">Fórmulas e definições usadas neste tipo de anúncio</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-muted" />
              </button>
            )}
          </div>
          )}

          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            {showFormulas ? (
              <Button type="button" variant="ghost" onClick={() => setShowFormulas(false)}>
                <ChevronLeft size={16} /> Voltar ao formulário
              </Button>
            ) : (
              <>
                <Button type="button" variant="ghost" onClick={() => (step === 0 ? closeListingForm() : setStep((s) => s - 1))}>
                  <ChevronLeft size={16} /> {step === 0 ? "Cancelar" : "Voltar"}
                </Button>
                {step < 3 ? (
                  <Button type="button" variant="gold" onClick={next}>
                    Próximo <ChevronRight size={16} />
                  </Button>
                ) : (
                  <Button type="submit" variant="gold" size="lg">
                    <Check size={16} /> {editingId ? "Guardar alterações" : "Publicar anúncio"}
                  </Button>
                )}
              </>
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

function Num({ label, reg, error, suffix, className }: { label: string; reg: UseFormRegisterReturn; error?: string; suffix?: string; className?: string }) {
  return (
    <Field label={label} error={error} className={className}>
      <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
        <input type="number" step="any" {...reg} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
        {suffix && <span className="px-3 text-sm text-muted">{suffix}</span>}
      </div>
    </Field>
  );
}

/** Lê a parte do investidor (1.º número do split "60 / 40" → 60). Default 50. */
function parseInvestidorPct(s?: string): number {
  if (!s) return 50;
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  const v = m ? parseFloat(m[1].replace(",", ".")) : 50;
  return isFinite(v) && v >= 0 && v <= 100 ? Math.round(v) : 50;
}

/**
 * Constrói um Listing a partir dos valores do formulário (reabilitação) para
 * reutilizar os mesmos helpers de cálculo da página do anúncio — garante que os
 * indicadores do modal (CTA, Lucro, ROI, Retorno) batem certo com o que o
 * investidor vê depois de publicado.
 */
function reabDraft(v: FormValues): Listing {
  return {
    valorImovel: Number(v.valorImovel) || 0,
    impostos: Number(v.impostos) || 0,
    orcamentoObras: Number(v.orcamentoObras) || 0,
    outrosCustos: Number(v.outrosCustos) || 0,
    valorMercadoAtual: Number(v.valorMercadoAtual) || 0,
    valorMercadoPosObras: Number(v.valorMercadoPosObras) || 0,
    capitalProcurado: Number(v.capitalProcurado) || 0,
    split: v.split,
  } as Listing;
}

/** Tile só-de-leitura para indicadores calculados no modal (mesmo look da página do anúncio). */
function CalcTile({ label, value, tone, hint }: { label: string; value: string; tone?: "gold" | "success" | "danger"; hint?: string }) {
  const color = tone === "gold" ? "text-gold-dark" : tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink";
  return (
    <div className="rounded-lg border border-line/60 bg-card p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={cn("num mt-0.5 text-sm font-bold", color)}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] font-medium text-muted">{hint}</p>}
    </div>
  );
}

const SEG_UI: Record<NivelSeguranca, { dot: string; text: string; chipBg: string; chipBorder: string }> = {
  muito_segura: { dot: "bg-success", text: "text-success", chipBg: "bg-success/10", chipBorder: "border-success/30" },
  boa: { dot: "bg-gold", text: "text-gold-dark", chipBg: "bg-gold/10", chipBorder: "border-gold/40" },
  atencao: { dot: "bg-warning", text: "text-warning", chipBg: "bg-warning/10", chipBorder: "border-warning/30" },
  risco: { dot: "bg-danger", text: "text-danger", chipBg: "bg-danger/10", chipBorder: "border-danger/30" },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function CamposReab({
  register,
  errors,
  values,
  setValue,
  control,
}: {
  register: any;
  errors: any;
  values: FormValues;
  setValue: any;
  control: Control<FormValues>;
}) {
  const invPct = parseInvestidorPct(values.split);
  const setInv = (x: number) => {
    const inv = Math.max(0, Math.min(100, Math.round(x || 0)));
    setValue("split", `${inv} / ${100 - inv}`, { shouldDirty: true, shouldValidate: true });
  };

  const valorImovel = Number(values.valorImovel) || 0;
  const valorNegociado = Number(values.valorNegociado) || 0; // desconto conseguido
  const precoAcordado = Math.max(0, valorImovel - valorNegociado);
  const capital = Number(values.capitalProcurado) || 0;
  const posObras = Number(values.valorMercadoPosObras) || 0;

  // Indicadores calculados com os MESMOS helpers da página do anúncio (paridade garantida).
  const draft = reabDraft(values);
  const cta = ctaReab(draft);
  const investimentoTotal = investimentoTotalReab(draft);
  const lucro = lucroReab(draft);
  const roi = roiReab(draft);
  const lucroParceiro = lucroParceiroReab(draft);
  const retorno = retornoEntradaReab(draft);
  const margem = margemSegurancaReab(draft);
  const nivelSeg = nivelSegurancaReab(margem);
  const segUi = SEG_UI[nivelSeg];

  const calcularImpostosAuto = () => {
    if (precoAcordado <= 0) return;
    const imt = calcularIMT(precoAcordado, "HS");
    const is = calcularIS(precoAcordado);
    setValue("impostos", Math.round(imt + is + 250), { shouldValidate: true });
  };

  return (
    <div className="space-y-5">
      <CamposSecao title="Aquisição">
        <MoneyInput label="Valor do imóvel (CPCV)" control={control} name="valorImovel" error={errors.valorImovel?.message} hint="Preço no contrato-promessa de compra e venda" />
        <Field label="Desconto obtido (opcional)">
          <RHFMoney control={control} name="valorNegociado" />
          <p className="mt-1 text-[10px] text-muted">
            = quanto baixou ao valor do imóvel {precoAcordado > 0 ? `· preço acordado ${eur(precoAcordado)}` : ""}
          </p>
        </Field>

        <Field label="Impostos (IMT + IS + Registos)" className="sm:col-span-2">
          <RHFMoney control={control} name="impostos" />
          <button type="button" onClick={calcularImpostosAuto} className="mt-1 text-[11px] text-secondary hover:underline">
            Calcular automaticamente (IMT HS + IS 0,8% + Registo)
          </button>
        </Field>

        <MoneyInput label="Outros custos (opcional)" control={control} name="outrosCustos" className="sm:col-span-2" hint="Comissões, projetos, licenças e outros gastos do negócio" />
      </CamposSecao>

      <CamposSecao title="Obra">
        <MoneyInput label="Orçamento de obras" control={control} name="orcamentoObras" error={errors.orcamentoObras?.message} className="sm:col-span-2" />
        <Field label="Prazo estimado das obras — em meses (opcional)" className="sm:col-span-2">
          <input {...register("prazoObras")} className={inputCls} placeholder="Ex.: 10 meses" />
        </Field>
      </CamposSecao>

      <CamposSecao title="Resultado esperado">
        <MoneyInput label="Valor de mercado atual (opcional, sem obras)" control={control} name="valorMercadoAtual" hint="Quanto valeria hoje, sem obras" />
        <MoneyInput label="Valor de mercado pós-obras" control={control} name="valorMercadoPosObras" error={errors.valorMercadoPosObras?.message} hint="Valor de venda estimado depois de recuperado" />

        <Field label="Venda prevista — em meses" error={errors.tempoAteVenda?.message} className="sm:col-span-2">
          <input {...register("tempoAteVenda")} className={inputCls} placeholder="Ex.: 6 meses (tempo até vender)" />
        </Field>
      </CamposSecao>

      <CamposSecao title="Parceria">
        <MoneyInput label="Capital procurado" control={control} name="capitalProcurado" error={errors.capitalProcurado?.message} className="sm:col-span-2" hint="Dinheiro que procura no investidor para entrar no negócio" />

        {/* Divisão do lucro — deixa claro quanto o INVESTIDOR recebe */}
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Divisão do lucro — quanto oferece ao investidor?</span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={invPct}
              onChange={(e) => setInv(Number(e.target.value))}
              className="flex-1 accent-[#C8A664]"
            />
            <div className="flex items-center rounded-lg border border-line bg-card">
              <input
                type="number"
                min={0}
                max={100}
                value={invPct}
                onChange={(e) => setInv(Number(e.target.value))}
                className="h-9 w-14 bg-transparent px-2 text-center text-sm outline-none"
              />
              <span className="px-2 text-sm text-muted">%</span>
            </div>
          </div>
          <p className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-gold-dark">Investidor recebe {invPct}%</span>
            <span className="text-muted">Você (promotor) fica com {100 - invPct}%</span>
          </p>
        </div>
      </CamposSecao>

      {/* Indicadores automáticos — os mesmos números que o investidor vê na página do anúncio */}
      <div className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/[0.04] to-card p-3">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
          <p className="font-display text-xs font-bold uppercase tracking-[0.14em] text-gold-dark">Indicadores automáticos</p>
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <CalcTile label="CTA · Custo Total da Aquisição" value={valorImovel > 0 ? eur(cta) : "—"} />
          <CalcTile label="Investimento Total" value={investimentoTotal > 0 ? eur(investimentoTotal) : "—"} tone="gold" />
          <CalcTile label="Lucro estimado pós-obras" value={posObras > 0 ? eur(lucro) : "—"} tone={posObras > 0 ? (lucro >= 0 ? "success" : "danger") : undefined} />
          <CalcTile label="ROI da operação prevista" value={posObras > 0 && investimentoTotal > 0 ? pct(roi) : "—"} tone="gold" />
          <CalcTile label={`Lucro do investidor (${invPct}%)`} value={posObras > 0 ? eur(lucroParceiro) : "—"} tone={posObras > 0 ? (lucroParceiro >= 0 ? "success" : "danger") : undefined} />
          <CalcTile label="Retorno sobre a entrada" value={posObras > 0 && capital > 0 ? pct(retorno) : "—"} tone="gold" hint={posObras > 0 && capital > 0 && values.tempoAteVenda ? `(em ${values.tempoAteVenda})` : undefined} />
        </div>
        {posObras > 0 && (
          <div className={cn("mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2", segUi.chipBg, segUi.chipBorder)}>
            <span className="flex items-center gap-2">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", segUi.dot)} />
              <span className={cn("text-sm font-semibold", segUi.text)}>{NIVEL_SEGURANCA_LABEL[nivelSeg]}</span>
              <span className="text-[11px] text-muted">Margem de segurança</span>
            </span>
            <span className={cn("num text-sm font-bold", segUi.text)}>{pct(margem)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Cabeçalho de agrupamento visual dos campos do formulário — título + linha separadora. */
function CamposSecao({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{title}</p>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function CamposCedencia({
  register,
  errors,
  values,
  setValue,
  control,
}: {
  register: any;
  errors: any;
  values: FormValues;
  setValue: (k: any, v: any, opts?: any) => void;
  control: Control<FormValues>;
}) {
  const valorImovel = Number(values.valorImovel) || 0;
  const valorNegociado = Number(values.valorNegociado) || 0; // desconto conseguido
  const precoAcordado = Math.max(0, valorImovel - valorNegociado);
  const sinalDefault = Math.round(precoAcordado * 0.1);
  const valorCedencia = Number(values.valorCedencia) || 0;
  const impostos = Number(values.impostos) || 0;
  const sinal = Number(values.sinalPagoCedente) || 0;
  const restante = Math.max(0, valorImovel - sinal);
  const obra = Number(values.obra) || 0;
  // O ESTADO DO IMÓVEL manda: "a recuperar" ⇒ com obras (mesma regra de lib/calc/rede).
  const comObras = values.estado === "a recuperar" || obra > 0;
  const capitalNecessario = valorCedencia + impostos + (comObras ? obra : 0);
  const cta = valorCedencia + restante + impostos;

  const calcularImpostosAuto = () => {
    if (precoAcordado <= 0) return;
    const imt = calcularIMT(precoAcordado, "HS");
    const is = calcularIS(precoAcordado);
    // IMT + IS + Registo (Registo ≈ 250€ standard Casa Pronta)
    setValue("impostos", Math.round(imt + is + 250), { shouldValidate: true });
  };

  const usarSinalDefault = () => {
    if (sinalDefault > 0) setValue("sinalPagoCedente", sinalDefault, { shouldValidate: true });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Tipo de Cedência (obrigatório)" error={errors.tipoCedencia?.message} className="sm:col-span-2">
        <select {...register("tipoCedencia")} className={inputCls} defaultValue="">
          <option value="">— Selecionar —</option>
          {(Object.keys(TIPO_CEDENCIA_LABEL) as TipoCedencia[]).map((k) => (
            <option key={k} value={k}>{TIPO_CEDENCIA_LABEL[k]}</option>
          ))}
        </select>
      </Field>

      <p className="sm:col-span-2 -mt-1 text-[11px] text-muted">
        O <strong>estado do imóvel</strong> (em cima) define o cenário: <strong>«a recuperar»</strong> mostra os campos de obras; qualquer outro estado calcula sem obras.
      </p>

      <MoneyInput label="Valor do Imóvel (CPCV)" control={control} name="valorImovel" hint="Preço acordado no contrato-promessa com o vendedor" />
      <Field label="Desconto Obtido" error={errors.valorNegociado?.message}>
        <RHFMoney control={control} name="valorNegociado" />
        <p className="mt-1 text-[10px] text-muted">
          = quanto baixou ao valor do imóvel {precoAcordado > 0 ? `· preço acordado ${eur(precoAcordado)}` : ""}
        </p>
      </Field>

      <MoneyInput label="Valor da cedência" control={control} name="valorCedencia" error={errors.valorCedencia?.message} hint="Quanto cobra ao investidor para lhe ceder a sua posição" />
      <Field label="Impostos (IMT + IS + Registo)">
        <RHFMoney control={control} name="impostos" />
        <button
          type="button"
          onClick={calcularImpostosAuto}
          className="mt-1 text-[11px] text-secondary hover:underline"
        >
          Calcular automaticamente (IMT HS + IS 0,8% + Registo)
        </button>
      </Field>

      {/* Campos conforme o ESTADO DO IMÓVEL: "a recuperar" ⇒ obras; senão ⇒ valor atual */}
      {comObras ? (
        <>
          <MoneyInput label="Valor previsto das obras" control={control} name="obra" hint="Orçamento estimado da reabilitação" />
          <MoneyInput label="Valor de mercado pós-obras" control={control} name="valorMercadoPosObras" error={errors.valorMercadoPosObras?.message} hint="Valor de venda estimado depois das obras" />
          <Field label="Prazo estimado das obras — em meses (opcional)" className="sm:col-span-2">
            <input {...register("prazoObras")} className={inputCls} placeholder="Ex.: 4 meses" />
          </Field>
        </>
      ) : (
        <MoneyInput label="Valor de mercado atual" control={control} name="valorVendaPrevisto" error={errors.valorVendaPrevisto?.message} className="sm:col-span-2" hint="Quanto o imóvel vale hoje, no estado atual" />
      )}

      <Field label="Capital Necessário (auto)">
        <div className="flex items-center rounded-lg border border-gold/40 bg-gold/5">
          <input
            readOnly
            value={capitalNecessario ? eur(capitalNecessario) : "—"}
            className="num h-10 w-full bg-transparent px-3 text-sm font-semibold text-gold-dark outline-none"
          />
        </div>
        <p className="mt-1 text-[10px] text-muted">= Valor da Cedência + Impostos{comObras ? " + Valor previsto das obras" : ""}</p>
      </Field>
      <Field label="Sinal já pago pelo cedente">
        <RHFMoney control={control} name="sinalPagoCedente" />
        <button
          type="button"
          onClick={usarSinalDefault}
          className="mt-1 text-[11px] text-secondary hover:underline"
        >
          Usar 10% do preço acordado {sinalDefault > 0 ? `(${eur(sinalDefault)})` : ""}
        </button>
      </Field>

      <Field label="Custo Total da Aquisição — CTA (auto)" className="sm:col-span-2">
        <div className="flex items-center rounded-lg border border-gold/40 bg-gold/5">
          <input
            readOnly
            value={cta ? eur(cta) : "—"}
            className="num h-10 w-full bg-transparent px-3 text-sm font-semibold text-gold-dark outline-none"
          />
        </div>
        <p className="mt-1 text-[10px] text-muted">= Valor da Cedência + Restante ao Promitente Vendedor + Impostos</p>
      </Field>

      <Field label="Motivo da cedência (obrigatório)" error={errors.motivoCedencia?.message}>
        <select {...register("motivoCedencia")} className={inputCls} defaultValue="">
          <option value="">— Selecionar —</option>
          <option value="falta_capital">Falta de capital</option>
          <option value="falta_tempo">Falta de tempo</option>
          <option value="mudanca_estrategia">Mudança de estratégia</option>
          <option value="outro">Outro</option>
        </select>
      </Field>
      <Field label="Término do CPCV">
        <input type="date" {...register("terminoCpcv")} className={inputCls} />
      </Field>
    </div>
  );
}

function CamposArrendamento({ register, errors, control }: { register: any; errors: any; control: Control<FormValues> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <MoneyInput label="Preço do imóvel" control={control} name="precoImovel" error={errors.precoImovel?.message} hint="Valor de compra do imóvel pronto a arrendar" />
      <MoneyInput label="Capital necessário" control={control} name="capitalNecessario" error={errors.capitalNecessario?.message} hint="Dinheiro que procura no investidor (entrada + custos)" />
      <MoneyInput label="Renda mensal total" control={control} name="rendaMensal" error={errors.rendaMensal?.message} />
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Constrói um Listing de cedência a partir do formulário para reutilizar os
 * helpers de margem de segurança da página do anúncio (paridade garantida).
 */
function cedenciaDraft(v: FormValues): Listing {
  return {
    type: "cedencia",
    tipoCedencia: (v.tipoCedencia || undefined) as Listing["tipoCedencia"],
    valorImovel: Number(v.valorImovel) || 0,
    sinalPagoCedente: Number(v.sinalPagoCedente) || 0,
    valorCedencia: Number(v.valorCedencia) || 0,
    valorNegociado: Number(v.valorNegociado) || 0,
    impostos: Number(v.impostos) || 0,
    obra: Number(v.obra) || 0,
    outrosCustos: Number(v.outrosCustos) || 0,
    valorVendaPrevisto: Number(v.valorVendaPrevisto) || 0,
    valorMercadoPosObras: Number(v.valorMercadoPosObras) || 0,
    estado: v.estado as EstadoImovel,
  } as Listing;
}

function computeCedencia(v: FormValues) {
  const valorImovel = Number(v.valorImovel) || 0;
  const valorNegociado = Number(v.valorNegociado) || 0; // desconto conseguido
  const sinal = Number(v.sinalPagoCedente) || 0;
  const valorCedencia = Number(v.valorCedencia) || 0;
  const impostos = Number(v.impostos) || 0;
  const obra = Number(v.obra) || 0;
  const venda = Number(v.valorVendaPrevisto) || 0; // valor de mercado atual
  const posObras = Number(v.valorMercadoPosObras) || 0;
  // Mesma regra de lib/calc/rede: o estado do imóvel manda ("a recuperar" ⇒ obras).
  const comObras = v.estado === "a recuperar" || obra > 0;

  const precoAcordado = Math.max(0, valorImovel - valorNegociado);
  const restante = Math.max(0, valorImovel - sinal);
  const cta = valorCedencia + restante + impostos;
  const capitalNecessario = valorCedencia + impostos + (comObras ? obra : 0);
  const lucro = comObras ? posObras - (cta + obra) : venda - cta;
  const denomRoi = comObras ? cta + obra : cta;
  const roi = denomRoi > 0 ? (lucro / denomRoi) * 100 : 0;
  const retEntrada = capitalNecessario > 0 ? (lucro / capitalNecessario) * 100 : 0;
  return { precoAcordado, restante, cta, capitalNecessario, lucro, roi, retEntrada, valorCedencia, impostos, obra, venda, posObras, comObras };
}

function LiveComputed({ type, v }: { type: ListingType; v: FormValues }) {
  if (type === "reabilitacao") {
    // watch() devolve os valores em bruto (strings) — coagir antes de somar,
    // senão "200000" + 0 concatena em vez de somar (e eur() rebenta a seguir).
    const rv = {
      valorImovel: Number(v.valorImovel) || 0,
      impostos: Number(v.impostos) || 0,
      orcamentoObras: Number(v.orcamentoObras) || 0,
      outrosCustos: Number(v.outrosCustos) || 0,
      valorMercadoPosObras: Number(v.valorMercadoPosObras) || 0,
      valorVendaPrevisto: Number(v.valorVendaPrevisto) || 0,
    };
    const inv = investimentoTotalReab(rv);
    return (
      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        <Chip label="Investimento total" value={eur(inv)} />
        <Chip label="ROI esperado" value={pct(roiReab(rv as never))} />
      </div>
    );
  }
  if (type === "arrendamento") {
    const auto = arrendamentoAuto(Number(v.precoImovel) || 0, Number(v.capitalNecessario) || 0, Number(v.rendaMensal) || 0);
    return (
      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        <Chip label="Yield líquido" value={pct(auto.yieldLiquido)} />
        <Chip label="Rentab. s/ capital" value={pct(auto.rentabilidadeCapital)} />
        <Chip label="ROI" value={pct(auto.roi)} />
      </div>
    );
  }

  // Cedência — decomposição do CTA + margem de segurança
  const c = computeCedencia(v);
  const draft = cedenciaDraft(v);
  const margem = margemSegurancaCedencia(draft);
  const folga = folgaCedencia(draft);
  const baseMargem = c.comObras ? c.posObras : c.venda;
  const nivelSeg = nivelSegurancaReab(margem);
  const segUi = SEG_UI[nivelSeg];
  return (
    <div className="mt-4 rounded-2xl border border-gold/30 bg-gold/5 p-4">
      <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gold-dark">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        Decomposição do CTA (Custo Total da Aquisição)
      </p>
      <div className="space-y-1">
        <DecRow label="Valor da Cedência" value={c.valorCedencia} />
        <DecRow label="Restante a Pagar ao Promitente Vendedor" value={c.restante} />
        <DecRow label="Impostos (IMT + IS + Registo)" value={c.impostos} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-gold/30 pt-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">CTA</span>
        <span className="num font-display text-2xl font-bold text-gold-dark">{eur(c.cta)}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiMini label="Lucro estimado" value={eur(c.lucro)} tone={c.lucro >= 0 ? "success" : "danger"} />
        <KpiMini label={c.comObras ? "ROI pós-obras" : "ROI da operação"} value={pct(c.roi)} tone="gold" />
        <KpiMini label="Retorno s/ Entrada" value={pct(c.retEntrada)} tone="gold" />
        <KpiMini label="Capital Necessário" value={eur(c.capitalNecessario)} tone="gold" />
      </div>
      {c.comObras ? (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gold/30 pt-3 text-[11px]">
          <div className="text-muted">Valor previsto das obras: <strong className="num text-ink">{eur(c.obra)}</strong></div>
          <div className="text-muted">Valor de mercado pós-obras: <strong className="num text-ink">{eur(c.posObras)}</strong></div>
        </div>
      ) : null}

      {/* Margem de Segurança — mesma estrutura de bolhas do Compra e Revenda */}
      {baseMargem > 0 && (
        <div className={cn("mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2", segUi.chipBg, segUi.chipBorder)}>
          <span className="flex items-center gap-2">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", segUi.dot)} />
            <span className={cn("text-sm font-semibold", segUi.text)}>{NIVEL_SEGURANCA_LABEL[nivelSeg]}</span>
            <span className="text-[11px] text-muted">Margem de segurança · folga {eur(folga)}</span>
          </span>
          <span className={cn("num text-sm font-bold", segUi.text)}>{pct(margem)}</span>
        </div>
      )}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/12 px-3 py-1 text-sm">
      <span className="text-muted">{label}:</span>
      <span className="num font-bold text-gold-dark">{value}</span>
    </span>
  );
}

function DecRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted">{label}</span>
      <span className="num text-sm font-semibold text-ink">{eur(value)}</span>
    </div>
  );
}

function KpiMini({ label, value, tone }: { label: string; value: string; tone?: "success" | "gold" | "danger" }) {
  const color =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "gold" ? "text-gold-dark" : "text-ink";
  return (
    <div className="rounded-lg border border-line/60 bg-card p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={cn("num mt-0.5 text-sm font-bold", color)}>{value}</p>
    </div>
  );
}

function PreviewCard({ v }: { v: FormValues }) {
  const cover = v.galleryUrls?.[0]?.url;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="relative h-36 bg-accent">
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted">Sem foto</div>}
        <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-xs font-medium text-secondary backdrop-blur">
          {v.type === "reabilitacao" ? "Compra e Revenda" : v.type === "cedencia" ? "Cedência de Posição" : "Arrendamento (Buy e Hold)"}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-display text-base font-semibold text-ink">{v.title || "Título do anúncio"}</h3>
        <p className="text-xs text-muted">{v.city || "Cidade"} · {v.tipoImovel ? TIPO_IMOVEL_LABEL[v.tipoImovel as TipoImovel] + " · " : ""}{v.tipologia} · {Number(v.areaUtil) || 0} m² · {v.estado}{Number(v.anoConstrucao) > 1500 ? ` · ${v.anoConstrucao}` : ""}</p>
      </div>
    </div>
  );
}

/**
 * Passo 4 — Resumo antes de publicar. Mostra ao autor todos os campos que
 * preencheu, agrupados por secção, para uma última confirmação antes de o
 * anúncio ir para a Rede. É intencionalmente longo — melhor confirmar aqui
 * do que corrigir depois de publicado.
 */
function SummaryStep({ v }: { v: FormValues }) {
  const tipoLabel =
    v.type === "reabilitacao"
      ? "Compra e Revenda"
      : v.type === "cedencia"
        ? "Cedência de Posição"
        : "Arrendamento (Buy e Hold)";

  const fotosCount = (v.galleryUrls ?? []).length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-card p-4">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-gold-dark">Pronto a publicar?</p>
        <p className="text-sm text-muted">Reveja todos os campos abaixo. Depois de publicar, o anúncio aparece imediatamente na Rede — pode sempre editá-lo mais tarde na sua área.</p>
      </div>

      <SummarySection title="Anúncio">
        <SummaryRow k="Categoria" v={tipoLabel} />
        <SummaryRow k="Título" v={v.title || "—"} />
        {v.description && <SummaryRow k="Descrição" v={v.description} multiline />}
      </SummarySection>

      <SummarySection title="Localização e imóvel">
        <SummaryRow k="Distrito" v={v.district || "—"} />
        <SummaryRow k="Concelho" v={v.city || "—"} />
        {v.exactAddress && <SummaryRow k="Morada exata (privada)" v={v.exactAddress} />}
        {v.tipoImovel && <SummaryRow k="Tipo de imóvel" v={TIPO_IMOVEL_LABEL[v.tipoImovel as TipoImovel]} />}
        {Number(v.anoConstrucao) > 1500 && <SummaryRow k="Ano de construção" v={String(v.anoConstrucao)} />}
        <SummaryRow k="Tipologia" v={v.tipologia} />
        {(Number(v.areaUtil) || 0) > 0 && <SummaryRow k="Área útil" v={`${Number(v.areaUtil)} m²`} />}
        <SummaryRow k="Estado" v={v.estado} />
        <SummaryRow k="Certificado energético" v={v.energyCertificate ?? "—"} />
      </SummarySection>

      {v.type === "reabilitacao" && (
        <SummaryFinanceReab v={v} />
      )}
      {v.type === "cedencia" && (
        <SummaryFinanceCedencia v={v} />
      )}
      {v.type === "arrendamento" && (
        <SummaryFinanceArrendamento v={v} />
      )}

      <SummarySection title="Visibilidade">
        <SummaryRow
          k="Quem pode ver"
          v={v.visibility === "public" ? "Público (todos)" : "Só investidores verificados"}
        />
      </SummarySection>

      <SummarySection title="Multimédia">
        <SummaryRow k="Fotos" v={fotosCount > 0 ? `${fotosCount} carregada${fotosCount === 1 ? "" : "s"} · a 1.ª é a capa` : "Sem fotos (recomenda-se pelo menos 1)"} />
        {v.floorPlanUrl && <SummaryRow k="Planta" v="Anexada" />}
      </SummarySection>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">Pré-visualização do card</p>
        <PreviewCard v={v} />
      </div>
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card overflow-hidden">
      <div className="border-b border-line bg-bg/60 px-4 py-2.5">
        <p className="font-display text-[11px] font-semibold uppercase tracking-widest text-gold-dark">{title}</p>
      </div>
      <div className="divide-y divide-line/60">{children}</div>
    </div>
  );
}

function SummaryRow({ k, v, multiline }: { k: string; v: string | number; multiline?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <span className="text-xs text-muted">{k}</span>
      <span className={cn("text-sm font-medium text-ink text-right", multiline ? "max-w-md whitespace-pre-line" : "truncate")}>{v}</span>
    </div>
  );
}

function SummaryFinanceReab({ v }: { v: FormValues }) {
  const draft = reabDraft(v);
  const valorImovel = Number(v.valorImovel) || 0;
  const impostos = Number(v.impostos) || 0;
  const orcamento = Number(v.orcamentoObras) || 0;
  const outros = Number(v.outrosCustos) || 0;
  const mercadoAtual = Number(v.valorMercadoAtual) || 0;
  const posObras = Number(v.valorMercadoPosObras) || 0;
  const desconto = Number(v.valorNegociado) || 0;
  const capital = Number(v.capitalProcurado) || 0;
  const cta = ctaReab(draft);
  const investimentoTotal = investimentoTotalReab(draft);
  const lucro = lucroReab(draft);
  const roi = roiReab(draft);
  const retorno = retornoEntradaReab(draft);
  const margem = margemSegurancaReab(draft);
  return (
    <SummarySection title="Números da operação — Compra e Revenda">
      {valorImovel > 0 && <SummaryRow k="Valor do imóvel (CPCV)" v={eur(valorImovel)} />}
      {desconto > 0 && <SummaryRow k="Desconto obtido" v={eur(desconto)} />}
      {impostos > 0 && <SummaryRow k="Impostos (IMT + IS + Registos)" v={eur(impostos)} />}
      {cta > 0 && <SummaryRow k="CTA · Custo Total da Aquisição" v={eur(cta)} />}
      {orcamento > 0 && <SummaryRow k="Orçamento das obras" v={eur(orcamento)} />}
      {outros > 0 && <SummaryRow k="Outros custos" v={eur(outros)} />}
      {investimentoTotal > 0 && <SummaryRow k="Investimento Total" v={eur(investimentoTotal)} />}
      {mercadoAtual > 0 && <SummaryRow k="Valor de mercado atual" v={eur(mercadoAtual)} />}
      {posObras > 0 && <SummaryRow k="Valor de mercado pós-obras" v={eur(posObras)} />}
      {posObras > 0 && <SummaryRow k="Lucro estimado pós-obras" v={eur(lucro)} />}
      {posObras > 0 && investimentoTotal > 0 && <SummaryRow k="ROI da operação prevista" v={pct(roi)} />}
      {posObras > 0 && (
        <SummaryRow k="Margem de segurança" v={`${pct(margem)} · ${NIVEL_SEGURANCA_LABEL[nivelSegurancaReab(margem)]}`} />
      )}
      {capital > 0 && <SummaryRow k="Capital procurado" v={eur(capital)} />}
      {v.split && <SummaryRow k="Divisão do lucro" v={`Investidor ${parseInvestidorPct(v.split)}% · Promotor ${100 - parseInvestidorPct(v.split)}%`} />}
      {posObras > 0 && (
        <SummaryRow k={`Lucro do investidor (${parseInvestidorPct(v.split ?? "")}%)`} v={eur(lucroParceiroReab(draft))} />
      )}
      {capital > 0 && posObras > 0 && (
        <SummaryRow k="Retorno sobre a entrada" v={`${pct(retorno)}${v.tempoAteVenda ? ` (em ${v.tempoAteVenda})` : ""}`} />
      )}
      {v.prazoObras && <SummaryRow k="Prazo das obras" v={v.prazoObras} />}
      {v.tempoAteVenda && <SummaryRow k="Venda prevista" v={v.tempoAteVenda} />}
    </SummarySection>
  );
}

function SummaryFinanceCedencia({ v }: { v: FormValues }) {
  const valorImovel = Number(v.valorImovel) || 0;
  const valorCedencia = Number(v.valorCedencia) || 0;
  const impostos = Number(v.impostos) || 0;
  const obra = Number(v.obra) || 0;
  const mercadoAtual = Number(v.valorVendaPrevisto) || 0;
  const posObras = Number(v.valorMercadoPosObras) || 0;
  const c = computeCedencia(v);
  const draft = cedenciaDraft(v);
  const margem = margemSegurancaCedencia(draft);
  const baseMargem = c.comObras ? posObras : mercadoAtual;
  return (
    <SummarySection title="Números da operação — Cedência de Posição">
      {v.tipoCedencia && <SummaryRow k="Tipo de cedência" v={TIPO_CEDENCIA_LABEL[v.tipoCedencia]} />}
      {valorImovel > 0 && <SummaryRow k="Valor do imóvel (CPCV)" v={eur(valorImovel)} />}
      {valorCedencia > 0 && <SummaryRow k="Valor da cedência" v={eur(valorCedencia)} />}
      {impostos > 0 && <SummaryRow k="Impostos (IMT + IS + Registo)" v={eur(impostos)} />}
      {c.cta > 0 && <SummaryRow k="CTA · Custo Total da Aquisição" v={eur(c.cta)} />}
      {obra > 0 && <SummaryRow k="Valor previsto das obras" v={eur(obra)} />}
      {mercadoAtual > 0 && <SummaryRow k="Valor de mercado atual" v={eur(mercadoAtual)} />}
      {posObras > 0 && <SummaryRow k="Valor de mercado pós-obras" v={eur(posObras)} />}
      {baseMargem > 0 && <SummaryRow k="Lucro estimado" v={eur(c.lucro)} />}
      {baseMargem > 0 && <SummaryRow k={c.comObras ? "ROI pós-obras" : "ROI da operação"} v={pct(c.roi)} />}
      {c.capitalNecessario > 0 && <SummaryRow k="Capital necessário" v={eur(c.capitalNecessario)} />}
      {baseMargem > 0 && (
        <SummaryRow k="Margem de segurança" v={`${pct(margem)} · ${NIVEL_SEGURANCA_LABEL[nivelSegurancaReab(margem)]}`} />
      )}
      {v.motivoCedencia && <SummaryRow k="Motivo" v={v.motivoCedencia.replace("_", " ")} />}
      {v.terminoCpcv && <SummaryRow k="Término do CPCV" v={v.terminoCpcv} />}
    </SummarySection>
  );
}

function SummaryFinanceArrendamento({ v }: { v: FormValues }) {
  const preco = Number(v.precoImovel) || 0;
  const capital = Number(v.capitalNecessario) || 0;
  const renda = Number(v.rendaMensal) || 0;
  return (
    <SummarySection title="Números da operação — Arrendamento (Buy e Hold)">
      {preco > 0 && <SummaryRow k="Preço do imóvel" v={eur(preco)} />}
      {capital > 0 && <SummaryRow k="Capital necessário" v={eur(capital)} />}
      {renda > 0 && <SummaryRow k="Renda mensal" v={eur(renda)} />}
    </SummarySection>
  );
}

/* ═══════════════════════ Sub-página de fórmulas e definições ═══════════════════════ */

interface Formula {
  nome: string;
  expr: string;
  nota?: string;
}

const FORMULAS: Record<ListingType, { intro: string; itens: Formula[]; classificacao: boolean }> = {
  reabilitacao: {
    intro: "Comprar, recuperar e revender com margem. Estes são os cálculos que o investidor vê no anúncio.",
    itens: [
      { nome: "CTA · Custo Total da Aquisição", expr: "Valor do imóvel (CPCV) + Impostos (IMT + IS + Registos)" },
      { nome: "Investimento Total", expr: "CTA + Orçamento das obras + Outros custos" },
      { nome: "Lucro estimado pós-obras", expr: "Valor de mercado pós-obras − Investimento Total" },
      { nome: "ROI da operação", expr: "Lucro ÷ Investimento Total × 100" },
      { nome: "Lucro do investidor", expr: "Lucro × (% da divisão do lucro ÷ 100)", nota: "A divisão do lucro define quanto do lucro fica para o investidor." },
      { nome: "Retorno sobre a entrada", expr: "Lucro do investidor ÷ Capital procurado × 100" },
      { nome: "Margem de segurança", expr: "(Valor pós-obras − Investimento Total) ÷ Valor pós-obras × 100", nota: "Quanto o preço de venda pode descer antes de o negócio deixar de dar lucro." },
    ],
    classificacao: true,
  },
  cedencia: {
    intro: "Ceder uma posição de contrato-promessa antes da escritura. O cálculo muda consoante haja ou não obras.",
    itens: [
      { nome: "Restante ao Promitente Vendedor", expr: "Valor do imóvel − Sinal já pago pelo cedente" },
      { nome: "CTA · Custo Total da Aquisição", expr: "Valor da cedência + Restante ao Promitente Vendedor + Impostos" },
      { nome: "Capital necessário", expr: "Valor da cedência + Impostos (+ Obras, se houver)" },
      { nome: "Lucro — sem obras", expr: "Valor de mercado atual − CTA" },
      { nome: "Lucro — com obras", expr: "Valor pós-obras − (CTA + Obras + Outros custos)" },
      { nome: "ROI", expr: "Lucro ÷ Custo total × 100" },
      { nome: "Retorno sobre a entrada", expr: "Lucro ÷ Capital necessário × 100" },
      { nome: "Margem de segurança — sem obras", expr: "(Valor de mercado atual − CTA) ÷ Valor de mercado atual × 100" },
      { nome: "Margem de segurança — com obras", expr: "(Valor pós-obras − Investimento Total) ÷ Valor pós-obras × 100", nota: "Investimento Total = CTA + Obras + Outros custos." },
    ],
    classificacao: true,
  },
  arrendamento: {
    intro: "Imóvel pronto a arrendar, para rendimento passivo. Indicadores de rentabilidade recorrente.",
    itens: [
      { nome: "Renda anual", expr: "Renda mensal × 12" },
      { nome: "Yield bruto", expr: "Renda anual ÷ Preço do imóvel × 100" },
      { nome: "Yield líquido", expr: "Yield bruto × 0,75", nota: "O fator 0,75 estima o líquido após despesas correntes (IMI, condomínio, seguros…)." },
      { nome: "Rentabilidade sobre o capital", expr: "(Renda anual × 0,75) ÷ Capital necessário × 100" },
    ],
    classificacao: false,
  },
};

function FBlock({ f }: { f: Formula }) {
  return (
    <div className="rounded-xl border border-line bg-bg/40 p-3">
      <p className="text-xs font-semibold text-ink">{f.nome}</p>
      <p className="num mt-1 text-[13px] font-medium text-gold-dark">{f.expr}</p>
      {f.nota && <p className="mt-1 text-[11px] text-muted">{f.nota}</p>}
    </div>
  );
}

function FormulasPanel({ type, onBack }: { type: ListingType; onBack: () => void }) {
  const data = FORMULAS[type];
  const tipoLabel = type === "reabilitacao" ? "Compra e Revenda" : type === "cedencia" ? "Cedência de Posição" : "Arrendamento (Buy e Hold)";
  return (
    <div className="flex-1 overflow-y-auto p-5">
      <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ChevronLeft size={15} /> Voltar ao formulário
      </button>
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-gold-dark"><Calculator size={15} /></span>
        <h3 className="font-display text-base font-semibold text-ink">Fórmulas e definições · {tipoLabel}</h3>
      </div>
      <p className="mb-4 text-sm text-muted">{data.intro}</p>

      <div className="space-y-2">
        {data.itens.map((f) => <FBlock key={f.nome} f={f} />)}
      </div>

      {data.classificacao && (
        <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-4">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gold-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Classificação da margem de segurança
          </p>
          <div className="space-y-1.5">
            <ClassRow dot="bg-success" text="text-success" label="Excelente" faixa="acima de 20%" />
            <ClassRow dot="bg-gold" text="text-gold-dark" label="Boa" faixa="15% a 20%" />
            <ClassRow dot="bg-warning" text="text-warning" label="Atenção" faixa="10% a 15%" />
            <ClassRow dot="bg-danger" text="text-danger" label="Elevado risco" faixa="abaixo de 10%" />
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] text-muted">
        Estes valores são estimativas com base nos dados que preencher — não substituem aconselhamento fiscal ou jurídico.
      </p>
    </div>
  );
}

function ClassRow({ dot, text, label, faixa }: { dot: string; text: string; label: string; faixa: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        <span className={cn("font-semibold", text)}>{label}</span>
      </span>
      <span className="num text-muted">{faixa}</span>
    </div>
  );
}

/** Uploader da planta — mesma linguagem visual das fotos (thumbnail + remover). */
function PlantaUploader({
  url,
  onAddUrl,
  onFile,
  onRemove,
}: {
  url?: string;
  onAddUrl: (u: string) => void;
  onFile: (f: File) => void;
  onRemove: () => void;
}) {
  const [val, setVal] = useState("");
  const add = () => { if (val.trim()) { onAddUrl(val); setVal(""); } };
  if (url)
    return (
      <div className="flex items-start gap-3 rounded-xl border border-line bg-card p-2">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-line">
          <img src={url} alt="Planta" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">Planta anexada</p>
          <p className="text-[11px] text-muted">Aparece no separador «Planta» do anúncio.</p>
          <button type="button" onClick={onRemove} className="mt-1.5 inline-flex items-center gap-1 rounded p-1 text-[11px] text-muted hover:bg-danger/10 hover:text-danger" title="Remover planta">
            <Trash2 size={14} /> Remover
          </button>
        </div>
      </div>
    );
  return (
    <div className="flex gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Colar URL da planta…"
        className={inputCls}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
      />
      <Button type="button" variant="outline" onClick={add}><Plus size={15} /></Button>
      <label className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg border border-line bg-card px-3 text-sm text-muted hover:bg-accent">
        <ImagePlus size={14} />
        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      </label>
    </div>
  );
}

function PhotoRow({
  fotos,
  onAddUrl,
  onFile,
  onRemove,
  onLegenda,
  onCapa,
}: {
  fotos: { url: string; legenda?: string }[];
  onAddUrl: (u: string) => void;
  onFile: (f: File) => void;
  onRemove: (i: number) => void;
  onLegenda: (i: number, legenda: string) => void;
  onCapa: (i: number) => void;
}) {
  const [url, setUrl] = useState("");
  return (
    <div>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Colar URL da imagem…"
          className={inputCls}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAddUrl(url); setUrl(""); } }}
        />
        <Button type="button" variant="outline" onClick={() => { onAddUrl(url); setUrl(""); }}><Plus size={15} /></Button>
        <label className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg border border-line bg-card px-3 text-sm text-muted hover:bg-accent">
          <ImagePlus size={14} />
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </label>
      </div>
      {fotos.length > 0 && (
        <div className="mt-2 space-y-2">
          {fotos.map((p, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-line bg-card p-2">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-line">
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-gold px-1 text-[9px] font-bold text-sidebar">Capa</span>}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  value={p.legenda ?? ""}
                  onChange={(e) => onLegenda(i, e.target.value)}
                  placeholder="Título da foto (opcional) — Sala, Cozinha, Quarto…"
                  className="h-9 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-secondary"
                />
                <div className="mt-1.5 flex items-center gap-1">
                  {i !== 0 && (
                    <button type="button" onClick={() => onCapa(i)} className="rounded px-2 py-0.5 text-[11px] text-secondary hover:bg-accent" title="Definir como capa">
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
    </div>
  );
}
