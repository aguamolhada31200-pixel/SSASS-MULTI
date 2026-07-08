import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Check, ImagePlus, Trash2, Hammer, Handshake, KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import {
  useListingsStore,
  ENERGY_SCALE,
  TIPO_CEDENCIA_LABEL,
  type ListingType,
  type Tipologia,
  type EstadoImovel,
  type TipoCedencia,
} from "@/store/useListingsStore";
import { CURRENT_USER_ID } from "@/store/useProfilesStore";
import {
  investimentoTotalReab,
  roiReab,
  arrendamentoAuto,
  ctaCedencia,
  lucroCedencia,
  roiCedencia,
  retornoEntradaCedencia,
  restanteAoPromitenteVendedor,
} from "@/lib/calc/rede";
import { calcularIMT, calcularIS } from "@/lib/calc/imt";
import { DISTRITOS_PT, concelhosDe } from "@/lib/concelhos";
import { eur, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    type: z.enum(["reabilitacao", "cedencia", "arrendamento"]),
    title: z.string().min(3, "Título demasiado curto"),
    description: z.string().min(10, "Descreva melhor a oportunidade"),
    district: z.string().min(2, "Indique o distrito"),
    city: z.string().min(2, "Indique a cidade"),
    exactAddress: z.string().optional().default(""),
    tipologia: z.enum(["T0", "T1", "T2", "T3", "T4", "T5+"]),
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
    valorVendaPrevisto: z.coerce.number().optional(),
    capitalProcurado: z.coerce.number().optional(),
    split: z.string().optional(),
    tempoAteVenda: z.string().optional(),
    // cedencia (v3)
    valorNegociado: z.coerce.number().optional(),
    valorCedencia: z.coerce.number().optional(),
    sinalPagoCedente: z.coerce.number().optional(),
    tipoCedencia: z.enum(["cpcv", "projeto_aprovado", "licenca", "obra_iniciada"]).optional(),
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
    motivoCedencia: z.enum(["falta_capital", "falta_tempo", "mudanca_estrategia", "outro"]).optional(),
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
    if (v.type === "reabilitacao") {
      req(!!v.valorImovel && v.valorImovel > 0, "valorImovel", "Obrigatório");
      req(!!v.capitalProcurado && v.capitalProcurado > 0, "capitalProcurado", "Obrigatório");
      req(!!v.valorVendaPrevisto && v.valorVendaPrevisto > 0, "valorVendaPrevisto", "Obrigatório");
    } else if (v.type === "cedencia") {
      req(!!v.valorCedencia && v.valorCedencia > 0, "valorCedencia", "Obrigatório");
      req(!!v.tipoCedencia, "tipoCedencia", "Obrigatório");
      req(!!v.motivoCedencia, "motivoCedencia", "Obrigatório");
      // Com obras = obra prevista > 0 OU tipo ≠ "apenas CPCV" (projeto/licença/
      // reabilitação implicam obras à frente). "Apenas CPCV" sem obras avalia-se
      // pelo valor de mercado ATUAL — o pós-obras não é exigido.
      const cedComObras =
        (Number(v.obra) || 0) > 0 ||
        (v.tipoCedencia ? v.tipoCedencia !== "cpcv" : v.estado === "a recuperar");
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
  areaUtil: 0,
  estado: "a recuperar",
  galleryUrls: [],
  floorPlanUrl: "",
  energyCertificate: "D",
  contactPreference: "mensagem",
  visibility: "public",
  temObra: false,
};

const TYPE_CARDS: { type: ListingType; label: string; desc: string; icon: typeof Hammer }[] = [
  { type: "reabilitacao", label: "Parceiros para Reabilitação", desc: "Procuro capital para comprar, recuperar e revender com margem.", icon: Hammer },
  { type: "cedencia", label: "Parceiros para Cedência de Posição", desc: "Cedo uma posição de CPCV antes da escritura.", icon: Handshake },
  { type: "arrendamento", label: "Oportunidades para Arrendamento", desc: "Imóvel pronto a arrendar, para rendimento passivo.", icon: KeyRound },
];

export function PublishListingModal() {
  const { listingForm, closeListingForm } = useModalStore();
  const { open, editingId } = listingForm;
  const add = useListingsStore((s) => s.add);
  const update = useListingsStore((s) => s.update);
  const getById = useListingsStore((s) => s.getById);
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

  const valoresLive = useMemo(() => {
    const v = watch();
    return v;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch()]);

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
        imt: values.imt ?? 0,
        escritura: values.escritura ?? 0,
        outrosCustos: values.outrosCustos ?? 0,
        valorVendaPrevisto: values.valorVendaPrevisto,
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
      toast.success("Anúncio atualizado ✨");
      closeListingForm();
    } else {
      const id = add(payload);
      toast.success("Anúncio publicado ✨", { description: values.title });
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
        toast.error("Preencha os campos obrigatórios");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 2));
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
            <p className="text-xs text-muted">Passo {step + 1} de 3 · {["Categoria", "Detalhes", "Contacto e pré-visualização"][step]}</p>
          </div>
          <button onClick={closeListingForm} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>

        <div className="flex gap-1.5 px-5 pt-4">
          {["Categoria", "Detalhes", "Publicar"].map((s, i) => (
            <div key={s} className="flex-1">
              <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-gold" : "bg-line")} />
              <p className={cn("mt-1 text-[10px]", i === step ? "font-medium text-gold-dark" : "text-muted")}>{s}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onValid as (v: FormValues) => void)} className="flex min-h-0 flex-1 flex-col">
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
                    <input {...register("title")} placeholder="Ex.: Reabilitação Baixa do Porto" className={inputCls} />
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
                  <p className="mb-1.5 text-xs font-medium text-muted">Fotos (opcional · a 1.ª é a capa)</p>
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

                {/* Planta */}
                <Field label="Planta (opcional)">
                  <div className="flex items-center gap-2">
                    <input {...register("floorPlanUrl")} className={inputCls} placeholder="URL da planta…" />
                    <label className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg border border-line bg-card px-3 text-sm text-muted hover:bg-accent">
                      <ImagePlus size={14} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f, "floor"); e.target.value = ""; }} />
                    </label>
                  </div>
                  {floorPlan && <p className="mt-1 text-[11px] text-muted">📐 Planta anexada</p>}
                </Field>

                {/* Campos type-aware */}
                <div className="rounded-xl border border-line bg-bg p-4">
                  {type === "reabilitacao" && <CamposReab register={register} errors={errors} />}
                  {type === "cedencia" && (
                    <CamposCedencia
                      register={register}
                      errors={errors}
                      values={valoresLive}
                      setValue={setValue}
                    />
                  )}
                  {type === "arrendamento" && <CamposArrendamento register={register} errors={errors} />}

                  {/* Live computed */}
                  <LiveComputed type={type} v={valoresLive} />
                </div>
              </div>
            )}

            {/* STEP 2 — contacto + preview */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Preferência de contacto">
                    <select {...register("contactPreference")} className={inputCls}>
                      <option value="mensagem">Mensagem na plataforma</option>
                      <option value="email">Email</option>
                      <option value="telefone">Telefone</option>
                    </select>
                  </Field>
                  <Field label="Visibilidade">
                    <select {...register("visibility")} className={inputCls}>
                      <option value="public">Público (todos)</option>
                      <option value="verified">Só investidores verificados</option>
                    </select>
                  </Field>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Pré-visualização do anúncio</p>
                  <PreviewCard v={valoresLive} />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            <Button type="button" variant="ghost" onClick={() => (step === 0 ? closeListingForm() : setStep((s) => s - 1))}>
              <ChevronLeft size={16} /> {step === 0 ? "Cancelar" : "Voltar"}
            </Button>
            {step < 2 ? (
              <Button type="button" variant="gold" onClick={next}>
                Próximo <ChevronRight size={16} />
              </Button>
            ) : (
              <Button type="submit" variant="gold">
                <Check size={16} /> {editingId ? "Guardar alterações" : "Publicar anúncio"}
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

function Num({ label, reg, error, suffix }: { label: string; reg: UseFormRegisterReturn; error?: string; suffix?: string }) {
  return (
    <Field label={label} error={error}>
      <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
        <input type="number" step="any" {...reg} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
        {suffix && <span className="px-3 text-sm text-muted">{suffix}</span>}
      </div>
    </Field>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CamposReab({ register, errors }: { register: any; errors: any }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Num label="Valor do imóvel" reg={register("valorImovel")} suffix="€" error={errors.valorImovel?.message} />
      <Num label="Orçamento de obras" reg={register("orcamentoObras")} suffix="€" error={errors.orcamentoObras?.message} />
      <Num label="IMT" reg={register("imt")} suffix="€" />
      <Num label="Escritura" reg={register("escritura")} suffix="€" />
      <Num label="Outros custos (opcional)" reg={register("outrosCustos")} suffix="€" />
      <Num label="Valor de venda previsto" reg={register("valorVendaPrevisto")} suffix="€" error={errors.valorVendaPrevisto?.message} />
      <Num label="Capital procurado" reg={register("capitalProcurado")} suffix="€" error={errors.capitalProcurado?.message} />
      <Field label="Split (ex.: 50 / 50)"><input {...register("split")} className={inputCls} placeholder="50 / 50" /></Field>
      <Field label="Tempo estimado até venda"><input {...register("tempoAteVenda")} className={inputCls} placeholder="14 meses" /></Field>
    </div>
  );
}

function CamposCedencia({
  register,
  errors,
  values,
  setValue,
}: {
  register: any;
  errors: any;
  values: FormValues;
  setValue: (k: any, v: any, opts?: any) => void;
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
  // Com obras = obra prevista > 0 OU tipo ≠ "apenas CPCV" (mesma regra de lib/calc/rede)
  const comObras = obra > 0 || (values.tipoCedencia ? values.tipoCedencia !== "cpcv" : values.estado === "a recuperar");
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

      <Num label="Valor do Imóvel (CPCV)" reg={register("valorImovel")} suffix="€" />
      <Field label="Desconto Obtido" error={errors.valorNegociado?.message}>
        <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
          <input type="number" step="any" {...register("valorNegociado")} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
          <span className="px-3 text-sm text-muted">€</span>
        </div>
        <p className="mt-1 text-[10px] text-muted">
          = quanto baixou ao valor do imóvel {precoAcordado > 0 ? `· preço acordado ${eur(precoAcordado)}` : ""}
        </p>
      </Field>

      <Num label="Valor da cedência" reg={register("valorCedencia")} suffix="€" error={errors.valorCedencia?.message} />
      <Field label="Impostos (IMT + IS + Registo)">
        <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
          <input type="number" step="any" {...register("impostos")} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
          <span className="px-3 text-sm text-muted">€</span>
        </div>
        <button
          type="button"
          onClick={calcularImpostosAuto}
          className="mt-1 text-[11px] text-secondary hover:underline"
        >
          ⚡ Calcular automaticamente (IMT HS + IS 0,8% + Registo)
        </button>
      </Field>

      <Num label="Valor previsto das obras (opcional — se o negócio envolve reabilitação)" reg={register("obra")} suffix="€" />
      {comObras ? (
        <>
          <Num label="Valor de mercado pós-obras" reg={register("valorMercadoPosObras")} suffix="€" error={errors.valorMercadoPosObras?.message} />
          <Field label="Prazo estimado das obras (opcional)" className="sm:col-span-2">
            <input {...register("prazoObras")} className={inputCls} placeholder="Ex.: 4 meses" />
          </Field>
        </>
      ) : (
        <Field label=" ">
          <p className="rounded-lg border border-line bg-bg px-3 py-2.5 text-[11px] text-muted">
            Cedência sem obras — o lucro calcula-se pelo <strong>valor de mercado atual</strong> − CTA.
          </p>
        </Field>
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
        <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
          <input type="number" step="any" {...register("sinalPagoCedente")} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
          <span className="px-3 text-sm text-muted">€</span>
        </div>
        <button
          type="button"
          onClick={usarSinalDefault}
          className="mt-1 text-[11px] text-secondary hover:underline"
        >
          Usar 10% do preço acordado {sinalDefault > 0 ? `(${eur(sinalDefault)})` : ""}
        </button>
      </Field>

      <Num label="Valor de mercado atual" reg={register("valorVendaPrevisto")} suffix="€" error={errors.valorVendaPrevisto?.message} />

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
      <Field label="Margem de segurança" className="sm:col-span-2">
        <input {...register("margemSeguranca")} className={inputCls} placeholder="Alta / Média / Baixa" />
      </Field>
    </div>
  );
}

function CamposArrendamento({ register, errors }: { register: any; errors: any }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Num label="Preço do imóvel" reg={register("precoImovel")} suffix="€" error={errors.precoImovel?.message} />
      <Num label="Capital necessário" reg={register("capitalNecessario")} suffix="€" error={errors.capitalNecessario?.message} />
      <Num label="Renda mensal total" reg={register("rendaMensal")} suffix="€" error={errors.rendaMensal?.message} />
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function computeCedencia(v: FormValues) {
  const valorImovel = Number(v.valorImovel) || 0;
  const valorNegociado = Number(v.valorNegociado) || 0; // desconto conseguido
  const sinal = Number(v.sinalPagoCedente) || 0;
  const valorCedencia = Number(v.valorCedencia) || 0;
  const impostos = Number(v.impostos) || 0;
  const obra = Number(v.obra) || 0;
  const venda = Number(v.valorVendaPrevisto) || 0; // valor de mercado atual
  const posObras = Number(v.valorMercadoPosObras) || 0;
  // Mesma regra de lib/calc/rede: obra prevista > 0 OU tipo ≠ "apenas CPCV"
  const comObras = obra > 0 || (v.tipoCedencia ? v.tipoCedencia !== "cpcv" : v.estado === "a recuperar");

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
    const inv = investimentoTotalReab(v as never);
    return (
      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        <Chip label="Investimento total" value={eur(inv)} />
        <Chip label="ROI esperado" value={pct(roiReab(v as never))} />
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

  // Cedência — decomposição do CTA
  const c = computeCedencia(v);
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
          {v.type === "reabilitacao" ? "Reabilitação" : v.type === "cedencia" ? "Cedência de Posição" : "Arrendamento"}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-display text-base font-semibold text-ink">{v.title || "Título do anúncio"}</h3>
        <p className="text-xs text-muted">{v.city || "Cidade"} · {v.tipologia} · {Number(v.areaUtil) || 0} m² · {v.estado}</p>
      </div>
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
