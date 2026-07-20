import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  X,
  Hammer,
  Home,
  Users2,
  Check,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Building2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import { retomarObraPendente } from "@/components/modals/NewObraModal";
import {
  useCollabStore,
  SOCIO_COLORS,
  SOCIO_ROLE_LABEL,
  type CollabType,
  type CollabProject,
  type SocioRole,
  type Partner,
} from "@/store/useCollabStore";
import { usePropertiesStore, type PropertyPhoto } from "@/store/usePropertiesStore";
import { useProfilesStore, CURRENT_USER_ID, useCurrentUser } from "@/store/useProfilesStore";
import { PhotoStep } from "@/components/modals/PropertyFormModal";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

type ImovelMode = "existente" | "novo";

interface SocioDraft {
  id: string;
  name: string;
  email: string;
  pct: string;
  role: SocioRole;
  capital: string;
}

interface WizardState {
  tipo: CollabType;
  imovelMode: ImovelMode;
  propertyId: string;
  nome: string;
  cidade: string;
  distrito: string;
  cover: string;
  photos: PropertyPhoto[];
  // arrendamento
  preco: string;
  entrada: string;
  renda: string;
  despesas: string;
  irs: string;
  // reabilitação
  investimento: string;
  orcamentoObras: string;
  valorVenda: string;
  prazo: string;
  socios: SocioDraft[];
}

const COVER_DEFAULT = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1100&q=70";

function meuSocio(nome: string): SocioDraft {
  return { id: CURRENT_USER_ID, name: nome, email: "", pct: "100", role: "gestor", capital: "", };
}

function emptyState(nome: string): WizardState {
  return {
    tipo: "arrendamento",
    imovelMode: "novo",
    propertyId: "",
    nome: "",
    cidade: "",
    distrito: "",
    cover: "",
    photos: [],
    preco: "",
    entrada: "",
    renda: "",
    despesas: "",
    irs: "28",
    investimento: "",
    orcamentoObras: "",
    valorVenda: "",
    prazo: "",
    socios: [meuSocio(nome)],
  };
}

const num = (s: string) => {
  const n = Number(String(s).replace(/[^\d.-]/g, ""));
  return isFinite(n) ? n : 0;
};

export function CollabFormModal() {
  const { collabForm, closeCollabForm, openObraForm } = useModalStore();
  const { open, editingId } = collabForm;
  const navigate = useNavigate();

  const me = useCurrentUser();
  const profiles = useProfilesStore((s) => s.profiles);
  const properties = usePropertiesStore((s) => s.properties);
  const addProperty = usePropertiesStore((s) => s.add);
  const projects = useCollabStore((s) => s.projects);
  const addProject = useCollabStore((s) => s.add);
  const updateProject = useCollabStore((s) => s.update);
  const editing = editingId ? projects.find((p) => p.id === editingId) : undefined;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardState>(() => emptyState(me?.fullName ?? "Eu"));

  const nomeMe = me?.fullName ?? "Eu";

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm(fromProject(editing, nomeMe));
    } else {
      setForm(emptyState(nomeMe));
    }
    setStep(1);
    setMostrarErros(false);
  }, [open, editingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof WizardState>(k: K, v: WizardState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const soma = useMemo(() => somaDraft(form.socios), [form.socios]);
  const somaOk = soma === 100;
  // Mostra os erros a vermelho por baixo dos campos quando se tenta avançar
  const [mostrarErros, setMostrarErros] = useState(false);

  if (!open) return null;

  const isEditing = !!editingId;
  const isReab = form.tipo === "reabilitacao";

  // ── Validação por passo ──
  const podeAvancar = (): boolean => {
    if (step === 2) {
      if (form.imovelMode === "existente") return !!form.propertyId;
      return form.nome.trim().length > 1 && form.cidade.trim().length > 1;
    }
    if (step === 3) return somaOk && form.socios.every((s) => s.name.trim().length > 0);
    return true;
  };

  const next = () => {
    if (!podeAvancar()) {
      setMostrarErros(true);
      if (step === 3 && !somaOk) toast.error(`As percentagens somam ${soma}% — devem somar 100%.`);
      else toast.error("Preencha os campos obrigatórios.");
      return;
    }
    setMostrarErros(false);
    setStep((s) => Math.min(4, s + 1));
  };
  const back = () => { setMostrarErros(false); setStep((s) => Math.max(1, s - 1)); };

  const addSocio = () =>
    setForm((f) => ({
      ...f,
      socios: [
        ...f.socios,
        { id: `s-${Date.now()}`, name: "", email: "", pct: "", role: "investidor", capital: "" },
      ],
    }));
  const removeSocio = (id: string) =>
    setForm((f) => ({ ...f, socios: f.socios.filter((s) => s.id !== id || s.id === CURRENT_USER_ID) }));
  const setSocio = (id: string, patch: Partial<SocioDraft>) =>
    setForm((f) => ({ ...f, socios: f.socios.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const buildPartners = (): Partner[] =>
    form.socios.map((s, i) => ({
      id: s.id,
      name: s.name.trim(),
      email: s.email.trim() || undefined,
      pct: num(s.pct),
      color: SOCIO_COLORS[i % SOCIO_COLORS.length],
      role: s.role,
      status: "ativo",
      capitalInvestido: num(s.capital),
      convidadoEm: new Date().toISOString().slice(0, 10),
      avatarUrl: profiles.find((p) => p.id === s.id)?.avatarUrl,
    }));

  const resolvePropertyId = (): string | undefined => {
    if (form.imovelMode === "existente") return form.propertyId || undefined;
    // Criar novo imóvel subjacente reutilizando usePropertiesStore.
    const renda = isReab ? 0 : num(form.renda);
    const valorCompra = isReab ? num(form.investimento) : num(form.preco);
    const entrada = isReab ? 0 : num(form.entrada);
    const id = addProperty({
      ownerId: CURRENT_USER_ID,
      name: form.nome.trim(),
      address: `${form.cidade.trim()}`,
      city: form.cidade.trim(),
      type: "tradicional",
      dataCompra: new Date().toISOString().slice(0, 10),
      valorCompra,
      entrada,
      financiado: Math.max(0, valorCompra - entrada),
      prazoAnos: 35,
      prestacaoMensal: 0,
      rendaMensal: renda,
      irsPct: num(form.irs) || 28,
      imiAnual: 0,
      seguroAnual: 0,
      condominioMensal: 0,
      outrasMensais: num(form.despesas),
      photos: form.photos.length > 0 ? form.photos : form.cover.trim() ? [{ url: form.cover.trim() }] : [],
      status: isReab ? "em_obras" : renda > 0 ? "ocupado" : "disponivel",
    });
    return id;
  };

  const nextNumber = (): string => {
    const max = projects.reduce((m, p) => Math.max(m, parseInt(p.number, 10) || 0), 0);
    return String(max + 1).padStart(3, "0");
  };

  const coverFinal = (): string => {
    if (form.photos[0]?.url) return form.photos[0].url;
    if (form.cover.trim()) return form.cover.trim();
    if (form.imovelMode === "existente") {
      const p = properties.find((x) => x.id === form.propertyId);
      if (p?.photos[0]?.url) return p.photos[0].url;
    }
    return COVER_DEFAULT;
  };

  const financeFields = (): Partial<CollabProject> => {
    if (isReab) {
      const inv = num(form.investimento);
      return {
        precoAquisicao: inv,
        custosAquisicao: 0,
        orcamentoObras: num(form.orcamentoObras),
        gastoObras: 0,
        valorVendaPrevisto: num(form.valorVenda),
        taxaImpostos: 19,
        tempoDeObra: form.prazo.trim() || undefined,
      };
    }
    const preco = num(form.preco);
    const renda = num(form.renda);
    const desp = num(form.despesas);
    const yieldBruto = preco > 0 ? (renda * 12 / preco) * 100 : 0;
    const yieldLiquido = preco > 0 ? ((renda - desp) * 12 / preco) * 100 : 0;
    return {
      precoImovel: preco,
      capitalInvestido: num(form.entrada),
      rendaMensal: renda,
      despesasMensais: desp,
      taxaOcupacao: 100,
      yieldBruto: Number(yieldBruto.toFixed(1)),
      yieldLiquido: Number(yieldLiquido.toFixed(1)),
    };
  };

  const onSubmit = () => {
    if (!somaOk) {
      setStep(3);
      toast.error(`As percentagens somam ${soma}% — devem somar 100%.`);
      return;
    }
    const partners = buildPartners();

    if (isEditing && editing) {
      updateProject(editing.id, {
        type: form.tipo,
        title: form.nome.trim() || editing.title,
        city: form.cidade.trim() || editing.city,
        district: form.distrito.trim() || editing.district,
        coverImageUrl: coverFinal(),
        partners,
        propertyId: form.imovelMode === "existente" ? form.propertyId || editing.propertyId : editing.propertyId,
        ...financeFields(),
      });
      toast.success("Projeto atualizado", { description: form.nome });
      closeCollabForm();
      return;
    }

    const propertyId = resolvePropertyId();
    const status: CollabProject["status"] = isReab
      ? "planeamento"
      : num(form.renda) > 0
        ? "arrendado"
        : "planeamento";

    const id = addProject({
      type: form.tipo,
      number: nextNumber(),
      title: form.nome.trim(),
      city: form.cidade.trim(),
      district: form.distrito.trim() || form.cidade.trim(),
      coverImageUrl: coverFinal(),
      status,
      partners,
      propertyId,
      ...financeFields(),
    });

    toast.success("Projeto criado", { description: form.nome });
    closeCollabForm();
    // Retorno ao fluxo: se o utilizador veio da "Nova obra" sem projetos,
    // reabre o modal da obra com este projeto já selecionado.
    if (retomarObraPendente({ projectId: id }, () => openObraForm())) return;
    navigate(`/comunidade/colaborativa/${id}`);
  };

  const STEPS = ["Tipo", "Imóvel", "Sócios", "Revisão"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onMouseDown={closeCollabForm}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15">
              <Users2 size={18} className="text-gold-dark" />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-ink">
                {isEditing ? "Editar projeto" : "Novo projeto colaborativo"}
              </h3>
              <p className="text-xs text-muted">Passo {step} de 4 · {STEPS[step - 1]}</p>
            </div>
          </div>
          <button onClick={closeCollabForm} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1.5 border-b border-line bg-bg/40 px-5 py-3">
          {STEPS.map((s, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <div key={s} className="flex flex-1 items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    done ? "bg-success text-white" : active ? "bg-gold text-sidebar" : "bg-accent text-muted"
                  )}
                >
                  {done ? <Check size={12} /> : n}
                </span>
                <span className={cn("hidden text-xs font-medium sm:block", active ? "text-ink" : "text-muted")}>{s}</span>
                {n < 4 && <span className={cn("h-0.5 flex-1 rounded", done ? "bg-success" : "bg-line")} />}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {step === 1 && <StepTipo tipo={form.tipo} onPick={(t) => set("tipo", t)} disabled={isEditing} />}
          {step === 2 && (
            <StepImovel
              form={form}
              set={set}
              isReab={isReab}
              properties={properties}
              mostrarErros={mostrarErros}
            />
          )}
          {step === 3 && (
            <StepSocios
              socios={form.socios}
              soma={soma}
              onAdd={addSocio}
              onRemove={removeSocio}
              onChange={setSocio}
              mostrarErros={mostrarErros}
            />
          )}
          {step === 4 && <StepRevisao form={form} soma={soma} properties={properties} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-4">
          {step > 1 ? (
            <Button variant="ghost" onClick={back}><ArrowLeft size={15} /> Anterior</Button>
          ) : (
            <Button variant="ghost" onClick={closeCollabForm}>Cancelar</Button>
          )}
          {step < 4 ? (
            <Button variant="gold" onClick={next}>Continuar <ArrowRight size={15} /></Button>
          ) : (
            <Button variant="gold" onClick={onSubmit}>
              <Check size={15} /> {isEditing ? "Guardar alterações" : "Criar projeto"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Passo 1 · Tipo ─────────────────────────

function StepTipo({ tipo, onPick, disabled }: { tipo: CollabType; onPick: (t: CollabType) => void; disabled: boolean }) {
  const cards: { key: CollabType; icon: typeof Hammer; title: string; desc: string }[] = [
    { key: "reabilitacao", icon: Hammer, title: "Compra e Revenda", desc: "Comprar, reabilitar e vender com margem. Foco em obra, orçamento e lucro estimado." },
    { key: "arrendamento", icon: Home, title: "Arrendamento (rendimento)", desc: "Rendimento recorrente distribuído entre sócios. Foco em renda, yield e cashflow." },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Que tipo de projeto vão gerir em conjunto?</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const active = tipo === c.key;
          return (
            <button
              key={c.key}
              disabled={disabled}
              onClick={() => onPick(c.key)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all",
                active ? "border-gold bg-gradient-to-br from-accent to-card shadow-md" : "border-line bg-bg/40 hover:border-gold/50",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", active ? "bg-gold text-sidebar" : "bg-accent text-secondary")}>
                <c.icon size={20} />
              </span>
              <p className="font-display text-base font-semibold text-ink">{c.title}</p>
              <p className="text-xs leading-relaxed text-muted">{c.desc}</p>
              {active && <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-gold-dark"><Check size={12} /> Selecionado</span>}
            </button>
          );
        })}
      </div>
      {disabled && <p className="text-[11px] text-muted">O tipo de projeto não pode ser alterado depois de criado.</p>}
    </div>
  );
}

// ───────────────────────── Passo 2 · Imóvel ─────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

const inputCls = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

function StepImovel({
  form,
  set,
  isReab,
  properties,
  mostrarErros,
}: {
  form: WizardState;
  set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  isReab: boolean;
  properties: ReturnType<typeof usePropertiesStore.getState>["properties"];
  mostrarErros: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Modo */}
      <div className="grid grid-cols-2 gap-2">
        {(["novo", "existente"] as ImovelMode[]).map((m) => (
          <button
            key={m}
            onClick={() => set("imovelMode", m)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-colors",
              form.imovelMode === m ? "border-gold bg-accent text-gold-dark" : "border-line text-muted hover:border-gold/40"
            )}
          >
            {m === "novo" ? <><Plus size={14} /> Criar novo imóvel</> : <><Building2 size={14} /> Usar imóvel que já tenho</>}
          </button>
        ))}
      </div>

      {form.imovelMode === "existente" ? (
        <Field label="Imóvel" error={mostrarErros && !form.propertyId ? "Selecione um imóvel" : undefined}>
          <select value={form.propertyId} onChange={(e) => set("propertyId", e.target.value)} className={inputCls}>
            <option value="">— Selecionar imóvel —</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.city}</option>
            ))}
          </select>
        </Field>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do imóvel *" error={mostrarErros && form.nome.trim().length < 2 ? "Indique o nome do imóvel" : undefined}><input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: T2 Príncipe Real" className={inputCls} /></Field>
            <Field label="Cidade *" error={mostrarErros && form.cidade.trim().length < 2 ? "Indique a cidade" : undefined}><input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} placeholder="Lisboa" className={inputCls} /></Field>
            <Field label="Distrito"><input value={form.distrito} onChange={(e) => set("distrito", e.target.value)} placeholder="Lisboa" className={inputCls} /></Field>
          </div>

          {/* Fotos — mesmo gestor de fotografias dos imóveis (a 1.ª é a capa) */}
          <div className="rounded-xl border border-line/60 bg-bg/40 p-4">
            <PhotoStep
              photos={form.photos}
              onAddUrl={(url) => {
                if (!url.trim()) return;
                set("photos", [...form.photos, { url: url.trim(), legenda: undefined }]);
              }}
              onFile={(f) => {
                const r = new FileReader();
                r.onload = () => set("photos", [...form.photos, { url: String(r.result), legenda: undefined }]);
                r.readAsDataURL(f);
              }}
              onRemove={(i) => set("photos", form.photos.filter((_, idx) => idx !== i))}
              onLegenda={(i, legenda) => set("photos", form.photos.map((p, idx) => (idx === i ? { ...p, legenda } : p)))}
              onMove={(from, to) => {
                if (to < 0 || to >= form.photos.length) return;
                const next = [...form.photos];
                const [moved] = next.splice(from, 1);
                next.splice(to, 0, moved);
                set("photos", next);
              }}
              onCapa={(i) => {
                const next = [...form.photos];
                const [moved] = next.splice(i, 1);
                next.unshift(moved);
                set("photos", next);
              }}
            />
          </div>
        </>
      )}

      {/* Nome do projeto quando usa imóvel existente */}
      {form.imovelMode === "existente" && (
        <Field label="Nome do projeto *"><input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: T2 Príncipe Real partilhado" className={inputCls} /></Field>
      )}

      {/* Dados financeiros */}
      <div className="rounded-xl border border-line/60 bg-bg/40 p-4">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-secondary">
          <Sparkles size={12} className="text-gold" /> Dados financeiros — {isReab ? "compra e revenda" : "arrendamento"}
        </p>
        {isReab ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Investimento (aquisição) €"><input value={form.investimento} onChange={(e) => set("investimento", e.target.value)} inputMode="numeric" placeholder="280000" className={inputCls} /></Field>
            <Field label="Orçamento da obra €"><input value={form.orcamentoObras} onChange={(e) => set("orcamentoObras", e.target.value)} inputMode="numeric" placeholder="60000" className={inputCls} /></Field>
            <Field label="Valor de venda previsto €"><input value={form.valorVenda} onChange={(e) => set("valorVenda", e.target.value)} inputMode="numeric" placeholder="420000" className={inputCls} /></Field>
            <Field label="Prazo até venda"><input value={form.prazo} onChange={(e) => set("prazo", e.target.value)} placeholder="8 meses" className={inputCls} /></Field>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Preço do imóvel €"><input value={form.preco} onChange={(e) => set("preco", e.target.value)} inputMode="numeric" placeholder="380000" className={inputCls} /></Field>
            <Field label="Capital investido (entrada) €"><input value={form.entrada} onChange={(e) => set("entrada", e.target.value)} inputMode="numeric" placeholder="114000" className={inputCls} /></Field>
            <Field label="Renda mensal €"><input value={form.renda} onChange={(e) => set("renda", e.target.value)} inputMode="numeric" placeholder="1850" className={inputCls} /></Field>
            <Field label="Despesas mensais €"><input value={form.despesas} onChange={(e) => set("despesas", e.target.value)} inputMode="numeric" placeholder="740" className={inputCls} /></Field>
            <Field label="IRS (%)"><input value={form.irs} onChange={(e) => set("irs", e.target.value)} inputMode="numeric" placeholder="28" className={inputCls} /></Field>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Passo 3 · Sócios ─────────────────────────

function somaDraft(socios: SocioDraft[]): number {
  return socios.reduce((acc, s) => acc + num(s.pct), 0);
}

function StepSocios({
  socios,
  soma,
  onAdd,
  onRemove,
  onChange,
  mostrarErros,
}: {
  socios: SocioDraft[];
  soma: number;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<SocioDraft>) => void;
  mostrarErros: boolean;
}) {
  const somaOk = soma === 100;
  return (
    <div className="space-y-3">
      {mostrarErros && !somaOk && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
          As percentagens têm de somar 100% (estão em {soma}%).
        </p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Quem participa e com que percentagem?</p>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", somaOk ? "bg-success/12 text-success" : "bg-danger/12 text-danger")}>
          Soma: {soma}%
        </span>
      </div>

      <div className="space-y-2">
        {socios.map((s) => {
          const isMe = s.id === CURRENT_USER_ID;
          return (
            <div key={s.id} className="rounded-xl border border-line bg-bg/40 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {isMe ? "Você (criador)" : "Sócio"}
                </p>
                {!isMe && (
                  <button onClick={() => onRemove(s.id)} className="text-muted hover:text-danger" title="Remover">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <input
                    value={s.name}
                    onChange={(e) => onChange(s.id, { name: e.target.value })}
                    placeholder="Nome"
                    disabled={isMe}
                    className={cn(inputCls, isMe && "opacity-70", mostrarErros && !s.name.trim() && "border-danger")}
                  />
                  {mostrarErros && !s.name.trim() && <span className="mt-1 block text-xs text-danger">Indique o nome do sócio</span>}
                </div>
                <input
                  value={s.email}
                  onChange={(e) => onChange(s.id, { email: e.target.value })}
                  placeholder="Email (convite)"
                  className={inputCls}
                />
                <div className="grid grid-cols-3 gap-2">
                  <label className="col-span-1">
                    <input value={s.pct} onChange={(e) => onChange(s.id, { pct: e.target.value })} inputMode="numeric" placeholder="%" className={cn(inputCls, "text-center")} />
                  </label>
                  <select
                    value={s.role}
                    onChange={(e) => onChange(s.id, { role: e.target.value as SocioRole })}
                    disabled={isMe}
                    className={cn(inputCls, "col-span-2", isMe && "opacity-70")}
                  >
                    {(Object.keys(SOCIO_ROLE_LABEL) as SocioRole[]).map((r) => (
                      <option key={r} value={r}>{SOCIO_ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </div>
                <input value={s.capital} onChange={(e) => onChange(s.id, { capital: e.target.value })} inputMode="numeric" placeholder="Capital investido €" className={inputCls} />
              </div>
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="sm" onClick={onAdd}><Plus size={14} /> Adicionar sócio</Button>

      {!somaOk && (
        <p className="rounded-lg bg-danger/8 px-3 py-2 text-xs text-danger">
          As percentagens dos sócios têm de somar exatamente 100%. Atualmente somam {soma}%.
        </p>
      )}
      <p className="text-[11px] text-muted">O criador entra automaticamente como <strong>gestor</strong>. Os convites por email são registados como sócios ativos (envio real fica para a fase de backend).</p>
    </div>
  );
}

// ───────────────────────── Passo 4 · Revisão ─────────────────────────

function StepRevisao({
  form,
  soma,
  properties,
}: {
  form: WizardState;
  soma: number;
  properties: ReturnType<typeof usePropertiesStore.getState>["properties"];
}) {
  const isReab = form.tipo === "reabilitacao";
  const imovelNome =
    form.imovelMode === "existente"
      ? properties.find((p) => p.id === form.propertyId)?.name ?? "—"
      : form.nome || "—";
  return (
    <div className="space-y-4">
      <Linha k="Tipo" v={isReab ? "Compra e Revenda" : "Arrendamento (rendimento)"} />
      <Linha k="Projeto" v={form.nome || "—"} />
      <Linha k="Imóvel" v={`${imovelNome}${form.imovelMode === "novo" ? " (novo)" : ""}`} />
      <Linha k="Localização" v={[form.cidade, form.distrito].filter(Boolean).join(" · ") || "—"} />
      {isReab ? (
        <>
          <Linha k="Investimento" v={eur(num(form.investimento))} />
          <Linha k="Orçamento obra" v={eur(num(form.orcamentoObras))} />
          <Linha k="Venda prevista" v={eur(num(form.valorVenda))} />
          <Linha k="Prazo" v={form.prazo || "—"} />
        </>
      ) : (
        <>
          <Linha k="Preço do imóvel" v={eur(num(form.preco))} />
          <Linha k="Capital investido" v={eur(num(form.entrada))} />
          <Linha k="Renda mensal" v={eur(num(form.renda))} />
          <Linha k="Despesas mensais" v={eur(num(form.despesas))} />
        </>
      )}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Sócios · soma {soma}%</p>
        <div className="space-y-1.5">
          {form.socios.map((s, i) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-line/60 bg-bg/40 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 text-ink">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: SOCIO_COLORS[i % SOCIO_COLORS.length] }} />
                {s.name || "—"} <span className="text-xs text-muted">· {SOCIO_ROLE_LABEL[s.role]}</span>
              </span>
              <span className="num font-semibold text-ink">{num(s.pct)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 py-1.5 text-sm last:border-0">
      <span className="text-muted">{k}</span>
      <span className="font-medium text-ink">{v}</span>
    </div>
  );
}

// ───────────────────────── Prefill (edição) ─────────────────────────

function fromProject(p: CollabProject, nomeMe: string): WizardState {
  const base = emptyState(nomeMe);
  return {
    ...base,
    tipo: p.type,
    imovelMode: p.propertyId ? "existente" : "novo",
    propertyId: p.propertyId ?? "",
    nome: p.title,
    cidade: p.city,
    distrito: p.district,
    cover: p.coverImageUrl ?? "",
    preco: p.precoImovel != null ? String(p.precoImovel) : "",
    entrada: p.capitalInvestido != null ? String(p.capitalInvestido) : "",
    renda: p.rendaMensal != null ? String(p.rendaMensal) : "",
    despesas: p.despesasMensais != null ? String(p.despesasMensais) : "",
    irs: "28",
    investimento: p.precoAquisicao != null ? String(p.precoAquisicao) : "",
    orcamentoObras: p.orcamentoObras != null ? String(p.orcamentoObras) : "",
    valorVenda: p.valorVendaPrevisto != null ? String(p.valorVendaPrevisto) : "",
    prazo: p.tempoDeObra ?? "",
    socios: p.partners.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email ?? "",
      pct: String(s.pct),
      role: s.role ?? (s.id === CURRENT_USER_ID ? "gestor" : "investidor"),
      capital: s.capitalInvestido != null ? String(s.capitalInvestido) : "",
    })),
  };
}
