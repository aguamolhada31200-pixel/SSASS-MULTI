import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toastSuccess, toastError, toastInfo } from "@/lib/toast";
import {
  ArrowLeft, Check, Save, Plus, Trash2, X, Upload, UserPlus, Info, Calculator,
  KeyRound, Users2, ShieldCheck, FileText, BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useTenantsStore, TIPO_LABEL as TENANT_TIPO_LABEL, type Tenant, type TenantInput } from "@/store/useTenantsStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import {
  useArrendamentosStore,
  rendaRecorrente,
  duracaoMeses,
  sugerirIdentificador,
  TIPO_OPCOES,
  TIPO_LABEL,
  PERIODICIDADE_LABEL,
  MEIO_PAGAMENTO_LABEL,
  CAUCAO_TIPO_LABEL,
  ATUALIZACAO_TIPO_LABEL,
  ALERTAS_DEFAULT,
  type ArrendamentoInput,
  type ArrendamentoTipo,
  type DuracaoTipo,
  type Periodicidade,
  type MomentoPagamento,
  type MeioPagamento,
  type TipoDespesas,
  type CaucaoTipo,
  type AtualizacaoTipo,
  type AtualizacaoData,
  type OutroPagamento,
  type Fiador,
  type SeguroArrendamento,
  type AlertasArrendamento,
} from "@/store/useArrendamentosStore";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

// ───────────────────────── Estado do formulário ─────────────────────────

interface FormState {
  propertyId: string;
  identificador: string;
  tipo: ArrendamentoTipo;
  duracaoTipo: DuracaoTipo;
  dataInicio: string;
  dataFim: string;
  renovacaoAutomatica: boolean;
  periodoRenovacaoMeses: number;
  periodicidade: Periodicidade;
  momentoPagamento: MomentoPagamento;
  meioPagamentoAcordado: MeioPagamento;
  diaPagamento: number;
  rendaBase: number;
  despesasArrendamento: number;
  tipoDespesas: TipoDespesas;
  outrosPagamentos: OutroPagamento[];
  primeiraRendaProRata: boolean;
  dataFimPrimeiroPeriodo: string;
  valorPrimeiraRenda: number;
  caucao: number;
  caucaoTipo: CaucaoTipo;
  caucaoDataRecebimento: string;
  atualizacaoTipo: AtualizacaoTipo;
  indiceReferencia: string;
  valorIndice: number;
  percentagemAcordada: number;
  atualizacaoPeriodoAnos: number;
  atualizacaoData: AtualizacaoData;
  dataAtualizacaoEspecifica: string;
  inquilinos: string[];
  fiadores: Fiador[];
  seguro: SeguroArrendamento;
  alertas: AlertasArrendamento;
}

interface Anexo {
  localId: string;
  nome: string;
  ficheiroUrl: string;
  mimeType: string;
  existingId?: string; // se já existe na Pasta Digital
}

const EMPTY: FormState = {
  propertyId: "",
  identificador: "",
  tipo: "habitacional",
  duracaoTipo: "fixa",
  dataInicio: "",
  dataFim: "",
  renovacaoAutomatica: true,
  periodoRenovacaoMeses: 12,
  periodicidade: "mensal",
  momentoPagamento: "adiantado",
  meioPagamentoAcordado: "transferencia",
  diaPagamento: 1,
  rendaBase: 0,
  despesasArrendamento: 0,
  tipoDespesas: "taxas_fixas",
  outrosPagamentos: [],
  primeiraRendaProRata: false,
  dataFimPrimeiroPeriodo: "",
  valorPrimeiraRenda: 0,
  caucao: 0,
  caucaoTipo: "posse_senhorio",
  caucaoDataRecebimento: "",
  atualizacaoTipo: "indice_referencia",
  indiceReferencia: "Coeficiente anual INE",
  valorIndice: 0,
  percentagemAcordada: 0,
  atualizacaoPeriodoAnos: 1,
  atualizacaoData: "aniversario",
  dataAtualizacaoEspecifica: "",
  inquilinos: [],
  fiadores: [],
  seguro: { temSeguro: false },
  alertas: { ...ALERTAS_DEFAULT },
};

const TABS = [
  { key: "gerais", label: "Informações gerais", icon: KeyRound },
  { key: "fiadores", label: "Fiadores", icon: Users2 },
  { key: "seguro", label: "Seguro", icon: ShieldCheck },
  { key: "documentos", label: "Documentos", icon: FileText },
  { key: "alertas", label: "Alertas", icon: BellRing },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function localId() {
  return `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function NovoArrendamento() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const properties = usePropertiesStore((s) => s.properties);
  const tenants = useTenantsStore((s) => s.tenants);
  const addTenant = useTenantsStore((s) => s.add);
  const addTransaction = useTransactionsStore((s) => s.add);
  const addDoc = useDocumentsStore((s) => s.add);
  const docsStore = useDocumentsStore((s) => s.documents);

  const arrStore = useArrendamentosStore();
  const editing = id ? arrStore.getById(id) : undefined;

  const [tab, setTab] = useState<TabKey>("gerais");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const initedRef = useRef(false);

  // ── Inicialização (novo / editar) ──
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    if (editing) {
      setForm({
        propertyId: editing.propertyId,
        identificador: editing.identificador,
        tipo: editing.tipo,
        duracaoTipo: editing.duracaoTipo,
        dataInicio: editing.dataInicio,
        dataFim: editing.dataFim ?? "",
        renovacaoAutomatica: editing.renovacaoAutomatica,
        periodoRenovacaoMeses: editing.periodoRenovacaoMeses,
        periodicidade: editing.periodicidade,
        momentoPagamento: editing.momentoPagamento,
        meioPagamentoAcordado: editing.meioPagamentoAcordado,
        diaPagamento: editing.diaPagamento,
        rendaBase: editing.rendaBase,
        despesasArrendamento: editing.despesasArrendamento ?? 0,
        tipoDespesas: editing.tipoDespesas ?? "taxas_fixas",
        outrosPagamentos: editing.outrosPagamentos ?? [],
        primeiraRendaProRata: editing.primeiraRendaProRata,
        dataFimPrimeiroPeriodo: editing.dataFimPrimeiroPeriodo ?? "",
        valorPrimeiraRenda: editing.valorPrimeiraRenda ?? 0,
        caucao: editing.caucao,
        caucaoTipo: editing.caucaoTipo,
        caucaoDataRecebimento: editing.caucaoDataRecebimento ?? "",
        atualizacaoTipo: editing.atualizacaoTipo,
        indiceReferencia: editing.indiceReferencia ?? "Coeficiente anual INE",
        valorIndice: editing.valorIndice ?? 0,
        percentagemAcordada: editing.percentagemAcordada ?? 0,
        atualizacaoPeriodoAnos: editing.atualizacaoPeriodoAnos,
        atualizacaoData: editing.atualizacaoData,
        dataAtualizacaoEspecifica: editing.dataAtualizacaoEspecifica ?? "",
        inquilinos: editing.inquilinos,
        fiadores: editing.fiadores ?? [],
        seguro: editing.seguro ?? { temSeguro: false },
        alertas: editing.alertas ?? { ...ALERTAS_DEFAULT },
      });
      // anexos existentes (já na Pasta Digital)
      const existentes = docsStore.filter((d) => d.arrendamentoId === editing.id);
      setAnexos(
        existentes.map((d) => ({ localId: localId(), nome: d.nome, ficheiroUrl: d.ficheiroUrl, mimeType: d.mimeType, existingId: d.id }))
      );
    } else {
      const preselect = params.get("imovel") ?? "";
      setForm({
        ...EMPTY,
        propertyId: preselect,
        identificador: sugerirIdentificador(arrStore.arrendamentos),
      });
    }
  }, [editing, params, arrStore.arrendamentos, docsStore]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  // ── Derivados ──
  const rendaTot = rendaRecorrente(form);
  const durMeses = form.duracaoTipo === "fixa" ? duracaoMeses(form.dataInicio, form.dataFim) : 0;
  const arrendamentoAtivoNoImovel = useMemo(
    () => arrStore.arrendamentos.find((a) => a.propertyId === form.propertyId && a.estado !== "terminado" && !a.rascunho && a.id !== id),
    [arrStore.arrendamentos, form.propertyId, id]
  );

  // ── Inquilinos ──
  const inquilinosSelecionados = form.inquilinos.map((tid) => tenants.find((t) => t.id === tid)).filter(Boolean) as Tenant[];
  const inquilinosDisponiveis = tenants.filter((t) => !form.inquilinos.includes(t.id));

  const addInquilino = (tid: string) => {
    if (!tid || form.inquilinos.includes(tid)) return;
    set({ inquilinos: [...form.inquilinos, tid] });
  };
  const removeInquilino = (tid: string) => set({ inquilinos: form.inquilinos.filter((x) => x !== tid) });

  // ── Anexos ──
  const onFiles = (files: FileList) => {
    Array.from(files).forEach((f) => {
      const r = new FileReader();
      r.onload = () =>
        setAnexos((prev) => [...prev, { localId: localId(), nome: f.name, ficheiroUrl: String(r.result), mimeType: f.type || "application/octet-stream" }]);
      r.readAsDataURL(f);
    });
  };
  const removeAnexo = (lid: string) => setAnexos((prev) => prev.filter((a) => a.localId !== lid));

  // ── Primeira renda pro-rata ──
  const calcularProRata = () => {
    if (!form.dataInicio || !form.dataFimPrimeiroPeriodo) {
      toastError("Indique a data de início e o fim do 1.º período.");
      return;
    }
    const ini = new Date(`${form.dataInicio}T00:00:00`);
    const fim = new Date(`${form.dataFimPrimeiroPeriodo}T00:00:00`);
    if (fim <= ini) {
      toastError("O fim do 1.º período tem de ser depois do início.");
      return;
    }
    const dias = Math.round((fim.getTime() - ini.getTime()) / 86400000) + 1;
    const diasNoMes = new Date(ini.getFullYear(), ini.getMonth() + 1, 0).getDate();
    const valor = Math.round((rendaTot / diasNoMes) * dias);
    set({ valorPrimeiraRenda: valor });
    toastInfo("1.ª renda calculada (pro-rata)", { description: `${dias} dias × ${eur(rendaTot)}/${diasNoMes} = ${eur(valor)}` });
  };

  // ── Validação + persistência ──
  const validarBase = (): string | null => {
    if (!form.propertyId) return "Escolha o imóvel do arrendamento.";
    if (!form.dataInicio) return "Indique a data de início.";
    if (form.duracaoTipo === "fixa" && !form.dataFim) return "Indique a data de fim (ou escolha duração aberta).";
    if (rendaTot <= 0) return "Indique a renda base.";
    return null;
  };

  const construirInput = (rascunho: boolean): ArrendamentoInput => ({
    propertyId: form.propertyId,
    identificador: form.identificador.trim() || sugerirIdentificador(arrStore.arrendamentos),
    tipo: form.tipo,
    duracaoTipo: form.duracaoTipo,
    dataInicio: form.dataInicio,
    dataFim: form.duracaoTipo === "fixa" ? form.dataFim || undefined : undefined,
    renovacaoAutomatica: form.renovacaoAutomatica,
    periodoRenovacaoMeses: form.periodoRenovacaoMeses || 12,
    periodicidade: form.periodicidade,
    momentoPagamento: form.momentoPagamento,
    meioPagamentoAcordado: form.meioPagamentoAcordado,
    diaPagamento: form.diaPagamento || 1,
    rendaBase: form.rendaBase || 0,
    despesasArrendamento: form.despesasArrendamento || undefined,
    tipoDespesas: form.despesasArrendamento ? form.tipoDespesas : undefined,
    outrosPagamentos: form.outrosPagamentos,
    primeiraRendaProRata: form.primeiraRendaProRata,
    dataFimPrimeiroPeriodo: form.primeiraRendaProRata ? form.dataFimPrimeiroPeriodo || undefined : undefined,
    valorPrimeiraRenda: form.primeiraRendaProRata ? form.valorPrimeiraRenda || undefined : undefined,
    caucao: form.caucao || 0,
    caucaoTipo: form.caucaoTipo,
    caucaoDataRecebimento: form.caucaoDataRecebimento || undefined,
    caucaoRegistada: editing?.caucaoRegistada ?? false,
    atualizacaoTipo: form.atualizacaoTipo,
    indiceReferencia: form.atualizacaoTipo === "indice_referencia" ? form.indiceReferencia : undefined,
    valorIndice: form.atualizacaoTipo === "indice_referencia" ? form.valorIndice || undefined : undefined,
    percentagemAcordada: form.atualizacaoTipo === "percentagem_acordada" ? form.percentagemAcordada || undefined : undefined,
    atualizacaoPeriodoAnos: form.atualizacaoPeriodoAnos || 1,
    atualizacaoData: form.atualizacaoData,
    dataAtualizacaoEspecifica: form.atualizacaoData === "data_especifica" ? form.dataAtualizacaoEspecifica || undefined : undefined,
    inquilinos: form.inquilinos,
    fiadores: form.fiadores,
    seguro: form.seguro,
    documentos: [],
    alertas: form.alertas,
    estado: "ativo",
    rascunho,
  });

  /** Cria os anexos novos na Pasta Digital e devolve todos os ids de documentos. */
  const commitAnexos = (arrendamentoId: string): string[] => {
    const ids: string[] = [];
    for (const a of anexos) {
      if (a.existingId) {
        ids.push(a.existingId);
        continue;
      }
      const docId = addDoc({
        nome: a.nome,
        ficheiroUrl: a.ficheiroUrl,
        mimeType: a.mimeType,
        uploadedAt: new Date().toISOString().slice(0, 10),
        categoria: "Contratos",
        propertyId: form.propertyId,
        arrendamentoId,
        tenantId: form.inquilinos[0],
      });
      ids.push(docId);
    }
    return ids;
  };

  /** Lança a caução em Finanças (uma vez), se recebida pelo senhorio. */
  const registarCaucao = (arrendamentoId: string, jaRegistada: boolean) => {
    if (jaRegistada) return false;
    if (form.caucao > 0 && form.caucaoTipo === "posse_senhorio" && form.caucaoDataRecebimento) {
      addTransaction({
        tipo: "receita",
        propertyId: form.propertyId,
        categoria: "Caução",
        valor: form.caucao,
        data: form.caucaoDataRecebimento,
        descricao: `Caução recebida · ${form.identificador}`,
        recorrente: false,
        deduzivelIrs: false,
        notas: `Arrendamento ${arrendamentoId}`,
      });
      return true;
    }
    return false;
  };

  const guardar = (rascunho: boolean) => {
    const erro = validarBase();
    if (erro) {
      toastError(erro);
      setTab("gerais");
      return;
    }
    // Contrato assinado é OBRIGATÓRIO para criar (rascunho pode ficar sem ele).
    if (!rascunho && anexos.length === 0) {
      toastError("Anexe o contrato de arrendamento", {
        description: "Carregue o contrato assinado na tab Documentos — ou use «Guardar rascunho» para terminar mais tarde.",
      });
      setTab("documentos");
      return;
    }

    const input = construirInput(rascunho);

    if (editing) {
      arrStore.update(editing.id, input);
      const docIds = commitAnexos(editing.id);
      const jaReg = editing.caucaoRegistada ?? false;
      const registou = !rascunho && registarCaucao(editing.id, jaReg);
      arrStore.update(editing.id, { documentos: docIds, caucaoRegistada: jaReg || registou });
      toastSuccess("Arrendamento atualizado", { description: input.identificador });
      navigate(`/imoveis/arrendamentos/${editing.id}`);
    } else {
      const newId = arrStore.add(input);
      const docIds = commitAnexos(newId);
      const registou = !rascunho && registarCaucao(newId, false);
      arrStore.update(newId, { documentos: docIds, caucaoRegistada: registou });
      if (rascunho) {
        toastSuccess("Rascunho guardado", { description: input.identificador });
        navigate("/imoveis/arrendamentos");
      } else {
        toastSuccess("Arrendamento criado", {
          description: registou ? "Caução lançada em Finanças. Rendas previstas na tab Rendas." : "Rendas previstas disponíveis na tab Rendas.",
        });
        navigate(`/imoveis/arrendamentos/${newId}`);
      }
    }
  };

  const propertySel = properties.find((p) => p.id === form.propertyId);

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/imoveis/arrendamentos" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Arrendamentos
      </Link>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            {editing ? "Editar arrendamento" : "Novo arrendamento"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {form.identificador ? <span className="num">{form.identificador}</span> : "Contrato de arrendamento"}
            {propertySel ? ` · ${propertySel.name}` : ""}
          </p>
        </div>
        <Badge tone="gold">A app regista e alerta — não movimenta dinheiro</Badge>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
                tab === t.key ? "border-primary font-medium text-primary" : "border-transparent text-muted hover:text-ink"
              )}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ───────── TAB: Informações gerais ───────── */}
      {tab === "gerais" && (
        <div className="space-y-5">
          {/* Imóvel + tipo + referência */}
          <Section title="Imóvel e identificação">
            <Field label="Imóvel" className="sm:col-span-2">
              <select value={form.propertyId} onChange={(e) => set({ propertyId: e.target.value })} className={inputCls}>
                <option value="">— Selecionar imóvel —</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                ))}
              </select>
              {arrendamentoAtivoNoImovel && (
                <span className="mt-1 flex items-center gap-1.5 text-[11px] text-warning">
                  <Info size={12} /> Este imóvel já tem um arrendamento ativo ({arrendamentoAtivoNoImovel.identificador}). Vários arrendamentos só fazem sentido para quartos.
                </span>
              )}
            </Field>
            <Field label="Tipo de arrendamento">
              <select value={form.tipo} onChange={(e) => set({ tipo: e.target.value as ArrendamentoTipo })} className={inputCls}>
                {TIPO_OPCOES.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
            </Field>
            <Field label="Identificador / referência">
              <input value={form.identificador} onChange={(e) => set({ identificador: e.target.value })} placeholder="ARR-2026-001" className={inputCls} />
            </Field>
          </Section>

          {/* Duração */}
          <Section title="Duração">
            <Field label="Tipo de duração">
              <select value={form.duracaoTipo} onChange={(e) => set({ duracaoTipo: e.target.value as DuracaoTipo })} className={inputCls}>
                <option value="fixa">Prazo certo (fixa)</option>
                <option value="aberta">Duração indeterminada (aberta)</option>
              </select>
            </Field>
            <Field label="Duração">
              <div className="flex h-10 items-center rounded-lg border border-line bg-bg px-3 text-sm text-muted">
                {form.duracaoTipo === "aberta" ? "Sem termo definido" : durMeses > 0 ? `${durMeses} meses` : "—"}
              </div>
            </Field>
            <Field label="Data de início">
              <input type="date" value={form.dataInicio} onChange={(e) => set({ dataInicio: e.target.value })} className={inputCls} />
            </Field>
            {form.duracaoTipo === "fixa" && (
              <Field label="Data de fim">
                <input type="date" value={form.dataFim} onChange={(e) => set({ dataFim: e.target.value })} className={inputCls} />
              </Field>
            )}
            <Toggle
              label="Renovação automática"
              hint="Renova por períodos sucessivos se nenhuma parte se opuser."
              checked={form.renovacaoAutomatica}
              onChange={(v) => set({ renovacaoAutomatica: v })}
            />
            {form.renovacaoAutomatica && (
              <Num label="Período de renovação (meses)" value={form.periodoRenovacaoMeses} onChange={(v) => set({ periodoRenovacaoMeses: v })} />
            )}
          </Section>

          {/* Pagamento */}
          <Section title="Pagamento">
            <Field label="Periodicidade">
              <select value={form.periodicidade} onChange={(e) => set({ periodicidade: e.target.value as Periodicidade })} className={inputCls}>
                {(Object.keys(PERIODICIDADE_LABEL) as Periodicidade[]).map((k) => <option key={k} value={k}>{PERIODICIDADE_LABEL[k]}</option>)}
              </select>
            </Field>
            <Field label="Momento do pagamento">
              <select value={form.momentoPagamento} onChange={(e) => set({ momentoPagamento: e.target.value as MomentoPagamento })} className={inputCls}>
                <option value="adiantado">Adiantado (início do período)</option>
                <option value="em_atraso">Em atraso (fim do período)</option>
              </select>
            </Field>
            <Num label="Dia de pagamento" value={form.diaPagamento} onChange={(v) => set({ diaPagamento: Math.max(1, Math.min(31, v)) })} />
            <Field label="Meio de pagamento acordado">
              <select value={form.meioPagamentoAcordado} onChange={(e) => set({ meioPagamentoAcordado: e.target.value as MeioPagamento })} className={inputCls}>
                {(Object.keys(MEIO_PAGAMENTO_LABEL) as MeioPagamento[]).map((k) => <option key={k} value={k}>{MEIO_PAGAMENTO_LABEL[k]}</option>)}
              </select>
            </Field>
            <p className="sm:col-span-2 flex items-center gap-1.5 text-[11px] text-muted">
              <Info size={12} /> O meio de pagamento é informativo. A app não movimenta dinheiro — serve para registo e alertas.
            </p>
          </Section>

          {/* Renda */}
          <Section title="Renda">
            <Num label="Renda base" value={form.rendaBase} onChange={(v) => set({ rendaBase: v })} suffix="€" />
            <Num label="Despesas de arrendamento (opcional)" value={form.despesasArrendamento} onChange={(v) => set({ despesasArrendamento: v })} suffix="€" />
            {form.despesasArrendamento > 0 && (
              <Field label="Tipo de despesas">
                <select value={form.tipoDespesas} onChange={(e) => set({ tipoDespesas: e.target.value as TipoDespesas })} className={inputCls}>
                  <option value="taxas_fixas">Taxas fixas</option>
                  <option value="provisao">Provisão (acerto anual)</option>
                </select>
              </Field>
            )}
            <div className="flex flex-col justify-end">
              <span className="mb-1 block text-xs font-medium text-muted">Renda total (auto)</span>
              <div className="flex h-10 items-center rounded-lg border border-primary/30 bg-accent px-3 text-sm font-bold text-primary num">
                {eur(rendaTot)}
              </div>
            </div>
          </Section>

          {/* Outros pagamentos */}
          <Section title="Outros pagamentos (opcional)">
            <div className="sm:col-span-2 space-y-2">
              {form.outrosPagamentos.map((o) => (
                <div key={o.id} className="flex items-center gap-2">
                  <input
                    value={o.descricao}
                    onChange={(e) => set({ outrosPagamentos: form.outrosPagamentos.map((x) => (x.id === o.id ? { ...x, descricao: e.target.value } : x)) })}
                    placeholder="Ex.: Limpeza, estacionamento…"
                    className={cn(inputCls, "flex-1")}
                  />
                  <div className="flex items-center rounded-lg border border-line bg-card">
                    <input
                      type="number"
                      value={o.montante || ""}
                      onChange={(e) => set({ outrosPagamentos: form.outrosPagamentos.map((x) => (x.id === o.id ? { ...x, montante: Number(e.target.value) || 0 } : x)) })}
                      className="h-10 w-24 bg-transparent px-3 text-sm outline-none"
                    />
                    <span className="px-2 text-sm text-muted">€</span>
                  </div>
                  <button onClick={() => set({ outrosPagamentos: form.outrosPagamentos.filter((x) => x.id !== o.id) })} className="rounded p-2 text-muted hover:bg-danger/10 hover:text-danger">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set({ outrosPagamentos: [...form.outrosPagamentos, { id: localId(), descricao: "", montante: 0 }] })}>
                <Plus size={14} /> Adicionar pagamento
              </Button>
            </div>
          </Section>

          {/* Primeira renda pro-rata */}
          <Section title="Primeira renda">
            <div className="sm:col-span-2">
              <Toggle
                label="Primeira renda em pro-rata"
                hint="Quando o contrato começa a meio do mês, a 1.ª renda é proporcional aos dias."
                checked={form.primeiraRendaProRata}
                onChange={(v) => set({ primeiraRendaProRata: v })}
              />
            </div>
            {form.primeiraRendaProRata && (
              <>
                <Field label="Fim do 1.º período">
                  <input type="date" value={form.dataFimPrimeiroPeriodo} onChange={(e) => set({ dataFimPrimeiroPeriodo: e.target.value })} className={inputCls} />
                </Field>
                <div className="flex items-end gap-2">
                  <Num label="Valor da 1.ª renda" value={form.valorPrimeiraRenda} onChange={(v) => set({ valorPrimeiraRenda: v })} suffix="€" className="flex-1" />
                  <Button variant="outline" size="md" onClick={calcularProRata} className="mb-0"><Calculator size={14} /> Calcular</Button>
                </div>
              </>
            )}
          </Section>

          {/* Caução */}
          <Section title="Caução">
            <Num label="Valor da caução" value={form.caucao} onChange={(v) => set({ caucao: v })} suffix="€" />
            <Field label="Tipo de caução">
              <select value={form.caucaoTipo} onChange={(e) => set({ caucaoTipo: e.target.value as CaucaoTipo })} className={inputCls}>
                {(Object.keys(CAUCAO_TIPO_LABEL) as CaucaoTipo[]).map((k) => <option key={k} value={k}>{CAUCAO_TIPO_LABEL[k]}</option>)}
              </select>
            </Field>
            <Field label="Data de recebimento (opcional)">
              <input type="date" value={form.caucaoDataRecebimento} onChange={(e) => set({ caucaoDataRecebimento: e.target.value })} className={inputCls} />
            </Field>
            {form.caucaoTipo === "posse_senhorio" && form.caucao > 0 && (
              <p className="sm:col-span-2 flex items-center gap-1.5 rounded-lg border border-gold/25 bg-gold/5 px-3 py-2 text-[11px] text-ink">
                <Info size={12} className="shrink-0 text-gold-dark" />
                Recebida pelo senhorio → é registada como movimento (receita · categoria «Caução») em Finanças na data indicada.
              </p>
            )}
          </Section>

          {/* Atualização de renda */}
          <Section title="Atualização de renda">
            <Field label="Como atualiza" className="sm:col-span-2">
              <select value={form.atualizacaoTipo} onChange={(e) => set({ atualizacaoTipo: e.target.value as AtualizacaoTipo })} className={inputCls}>
                {(Object.keys(ATUALIZACAO_TIPO_LABEL) as AtualizacaoTipo[]).map((k) => <option key={k} value={k}>{ATUALIZACAO_TIPO_LABEL[k]}</option>)}
              </select>
            </Field>
            {form.atualizacaoTipo === "indice_referencia" && (
              <>
                <Field label="Índice de referência">
                  <input value={form.indiceReferencia} onChange={(e) => set({ indiceReferencia: e.target.value })} placeholder="Coeficiente anual INE" className={inputCls} />
                </Field>
                <Num label="Valor do coeficiente (%)" value={form.valorIndice} onChange={(v) => set({ valorIndice: v })} suffix="%" />
              </>
            )}
            {form.atualizacaoTipo === "percentagem_acordada" && (
              <Num label="Percentagem acordada (%)" value={form.percentagemAcordada} onChange={(v) => set({ percentagemAcordada: v })} suffix="%" />
            )}
            {form.atualizacaoTipo !== "nao_rever" && (
              <>
                <Num label="Período (anos)" value={form.atualizacaoPeriodoAnos} onChange={(v) => set({ atualizacaoPeriodoAnos: v })} />
                <Field label="Quando atualiza">
                  <select value={form.atualizacaoData} onChange={(e) => set({ atualizacaoData: e.target.value as AtualizacaoData })} className={inputCls}>
                    <option value="aniversario">Na data de aniversário</option>
                    <option value="data_especifica">Numa data específica</option>
                  </select>
                </Field>
                {form.atualizacaoData === "data_especifica" && (
                  <Field label="Data específica">
                    <input type="date" value={form.dataAtualizacaoEspecifica} onChange={(e) => set({ dataAtualizacaoEspecifica: e.target.value })} className={inputCls} />
                  </Field>
                )}
                <p className="sm:col-span-2 text-[11px] text-muted">
                  Nota legal (PT): o coeficiente de atualização anual das rendas é publicado pelo INE — introduza aqui o valor aplicável.
                </p>
              </>
            )}
          </Section>

          {/* Inquilinos */}
          <Section title="Inquilinos">
            <div className="sm:col-span-2 space-y-3">
              {inquilinosSelecionados.length > 0 && (
                <div className="space-y-2">
                  {inquilinosSelecionados.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 rounded-xl border border-line bg-bg/40 p-2.5">
                      <MiniAvatar tenant={t} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{t.nomeCompleto}</p>
                        <p className="text-[11px] text-muted">{TENANT_TIPO_LABEL[t.tipoInquilino]}{t.nif ? ` · NIF ${t.nif}` : ""}</p>
                      </div>
                      <button onClick={() => removeInquilino(t.id)} className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger">
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                  {form.inquilinos.length > 1 && (
                    <p className="text-[11px] text-muted">Vários inquilinos = contrato solidário (respondem todos pela totalidade da renda).</p>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value=""
                  onChange={(e) => { addInquilino(e.target.value); e.target.value = ""; }}
                  className={cn(inputCls, "max-w-xs")}
                >
                  <option value="">+ Adicionar inquilino existente…</option>
                  {inquilinosDisponiveis.map((t) => (
                    <option key={t.id} value={t.id}>{t.nomeCompleto}{t.nif ? ` (NIF ${t.nif})` : ""}</option>
                  ))}
                </select>
                <NovoInquilinoInline
                  onCreate={(payload) => {
                    const tid = addTenant(payload);
                    addInquilino(tid);
                    toastSuccess("Inquilino criado e associado", { description: payload.nomeCompleto });
                  }}
                  propertyId={form.propertyId}
                />
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ───────── TAB: Fiadores ───────── */}
      {tab === "fiadores" && (
        <div className="space-y-4">
          {form.fiadores.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center">
              <Users2 size={28} className="mx-auto mb-2 text-secondary" />
              <p className="text-sm text-muted">Sem fiadores. Adicione um se o contrato o exigir.</p>
            </div>
          )}
          {form.fiadores.map((f, i) => (
            <div key={f.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Fiador {i + 1}</p>
                <button onClick={() => set({ fiadores: form.fiadores.filter((x) => x.id !== f.id) })} className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldRaw label="Nome"><input value={f.nome} onChange={(e) => updFiador(form, set, f.id, { nome: e.target.value })} className={inputCls} /></FieldRaw>
                <FieldRaw label="NIF"><input value={f.nif} onChange={(e) => updFiador(form, set, f.id, { nif: e.target.value })} className={inputCls} /></FieldRaw>
                <FieldRaw label="Morada" className="sm:col-span-2"><input value={f.morada} onChange={(e) => updFiador(form, set, f.id, { morada: e.target.value })} className={inputCls} /></FieldRaw>
                <FieldRaw label="Telefone"><input value={f.telefone} onChange={(e) => updFiador(form, set, f.id, { telefone: e.target.value })} className={inputCls} /></FieldRaw>
                <FieldRaw label="Email"><input value={f.email} onChange={(e) => updFiador(form, set, f.id, { email: e.target.value })} className={inputCls} /></FieldRaw>
                <FieldRaw label="Rendimento mensal">
                  <div className="flex items-center rounded-lg border border-line bg-card">
                    <input type="number" value={f.rendimento || ""} onChange={(e) => updFiador(form, set, f.id, { rendimento: Number(e.target.value) || 0 })} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
                    <span className="px-3 text-sm text-muted">€</span>
                  </div>
                </FieldRaw>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() => set({ fiadores: [...form.fiadores, { id: localId(), nome: "", nif: "", morada: "", telefone: "", email: "", rendimento: 0 }] })}
          >
            <Plus size={15} /> Adicionar fiador
          </Button>
        </div>
      )}

      {/* ───────── TAB: Seguro ───────── */}
      {tab === "seguro" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-card p-4">
            <Toggle
              label="Tem seguro associado"
              hint="Alertamos automaticamente 30 dias antes da renovação."
              checked={form.seguro.temSeguro}
              onChange={(v) => set({ seguro: { ...form.seguro, temSeguro: v } })}
            />
          </div>
          {form.seguro.temSeguro && (
            <div className="grid gap-3 rounded-2xl border border-line bg-card p-4 sm:grid-cols-2">
              <FieldRaw label="Seguradora"><input value={form.seguro.seguradora ?? ""} onChange={(e) => set({ seguro: { ...form.seguro, seguradora: e.target.value } })} className={inputCls} /></FieldRaw>
              <FieldRaw label="Nº de apólice"><input value={form.seguro.apolice ?? ""} onChange={(e) => set({ seguro: { ...form.seguro, apolice: e.target.value } })} className={inputCls} /></FieldRaw>
              <FieldRaw label="Valor anual">
                <div className="flex items-center rounded-lg border border-line bg-card">
                  <input type="number" value={form.seguro.valorAnual || ""} onChange={(e) => set({ seguro: { ...form.seguro, valorAnual: Number(e.target.value) || 0 } })} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
                  <span className="px-3 text-sm text-muted">€</span>
                </div>
              </FieldRaw>
              <FieldRaw label="Data de renovação"><input type="date" value={form.seguro.dataRenovacao ?? ""} onChange={(e) => set({ seguro: { ...form.seguro, dataRenovacao: e.target.value } })} className={inputCls} /></FieldRaw>
            </div>
          )}
        </div>
      )}

      {/* ───────── TAB: Documentos ───────── */}
      {tab === "documentos" && (
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-card py-8 text-sm text-muted hover:bg-accent">
            <Upload size={18} /> Carregar contrato assinado + anexos (auto de entrega, inventário, comprovativo de caução)
            <input type="file" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ""; }} />
          </label>
          {anexos.length === 0 ? (
            <p className="flex items-center gap-1.5 text-[11px] text-muted"><Info size={12} /> O contrato assinado é recomendado para ativar o arrendamento. Vai para a Pasta Digital, associado ao imóvel e ao inquilino.</p>
          ) : (
            <ul className="space-y-2">
              {anexos.map((a) => (
                <li key={a.localId} className="flex items-center justify-between rounded-xl border border-line bg-card p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent"><FileText size={16} className="text-secondary" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{a.nome}</p>
                      <p className="text-[11px] text-muted">{a.existingId ? "Já na Pasta Digital" : "Novo · Contratos"}</p>
                    </div>
                  </div>
                  <button onClick={() => removeAnexo(a.localId)} className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger"><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ───────── TAB: Alertas ───────── */}
      {tab === "alertas" && (
        <div className="space-y-4">
          <div className="space-y-2 rounded-2xl border border-line bg-card p-4">
            <AlertaCheck label="Quando a renda está a vencer" checked={form.alertas.rendaAVencer} onChange={(v) => set({ alertas: { ...form.alertas, rendaAVencer: v } })} />
            <AlertaCheck label="Quando a renda está em atraso (8 dias após o vencimento)" checked={form.alertas.rendaAtrasada} onChange={(v) => set({ alertas: { ...form.alertas, rendaAtrasada: v } })} />
            <AlertaCheck label="6 meses antes do fim do contrato" checked={form.alertas.fimContrato6m} onChange={(v) => set({ alertas: { ...form.alertas, fimContrato6m: v } })} />
            <AlertaCheck label="3 meses antes do fim do contrato" checked={form.alertas.fimContrato3m} onChange={(v) => set({ alertas: { ...form.alertas, fimContrato3m: v } })} />
            <AlertaCheck label="Quando a renda vai ser atualizada" checked={form.alertas.atualizacaoRenda} onChange={(v) => set({ alertas: { ...form.alertas, atualizacaoRenda: v } })} />
          </div>
          <p className="flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/5 px-3 py-2.5 text-xs text-ink">
            <BellRing size={14} className="shrink-0 text-gold-dark" />
            Os inquilinos <strong>não</strong> recebem notificações — o redegest é uma ferramenta do senhorio.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-2 border-t border-line bg-bg/95 py-4 backdrop-blur">
        <Button variant="ghost" onClick={() => navigate("/imoveis/arrendamentos")}>Cancelar</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => guardar(true)}><Save size={15} /> Guardar rascunho</Button>
          <Button variant="gold" onClick={() => guardar(false)}><Check size={15} /> {editing ? "Guardar arrendamento" : "Criar arrendamento"}</Button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Sub-componentes ─────────────────────────

const inputCls = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-4 sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-widest text-secondary">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
const FieldRaw = Field;

function Num({ label, value, onChange, suffix, className }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; className?: string }) {
  return (
    <Field label={label} className={className}>
      <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
        <input
          type="number"
          step="any"
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-10 w-full bg-transparent px-3 text-sm outline-none"
        />
        {suffix && <span className="px-3 text-sm text-muted">{suffix}</span>}
      </div>
    </Field>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors", checked ? "border-primary/40 bg-accent" : "border-line hover:bg-accent")}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        {hint && <p className="text-[11px] text-muted">{hint}</p>}
      </div>
      <div className={cn("h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors", checked ? "bg-primary" : "bg-line")}>
        <div className={cn("h-5 w-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
      </div>
    </button>
  );
}

function AlertaCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-bg/60">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#5C3D2E]" />
      <span className="text-sm text-ink">{label}</span>
    </label>
  );
}

function MiniAvatar({ tenant }: { tenant: Tenant }) {
  const initials = tenant.nomeCompleto.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-semibold text-white">
      {tenant.fotoUrl ? <img src={tenant.fotoUrl} alt="" className="h-full w-full object-cover" /> : initials}
    </div>
  );
}

function updFiador(form: FormState, set: (p: Partial<FormState>) => void, id: string, patch: Partial<Fiador>) {
  set({ fiadores: form.fiadores.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
}

/** Criação rápida de inquilino dentro do wizard (sem sair da página). */
function NovoInquilinoInline({ onCreate, propertyId }: { onCreate: (payload: Parameters<ReturnType<typeof useTenantsStore.getState>["add"]>[0]) => void; propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<Tenant["tipoInquilino"]>("regular");
  const [nif, setNif] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const criar = () => {
    if (nome.trim().length < 2) { toastError("Indique o nome do inquilino."); return; }
    onCreate({
      nomeCompleto: nome.trim(),
      nif: nif.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      nacionalidade: "Portuguesa",
      docIdentificacao: { tipo: "CC", numero: "", validade: "" },
      entidadePatronal: "—",
      rendimentoMensal: 0,
      tipoInquilino: tipo,
      propertyId: propertyId || undefined,
      status: "ativo",
      notas: "",
    });
    setNome(""); setNif(""); setEmail(""); setTelefone(""); setTipo("regular"); setOpen(false);
  };

  if (!open) {
    return (
      <Button variant="outline" size="md" onClick={() => setOpen(true)}>
        <UserPlus size={15} /> Novo inquilino
      </Button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-primary/30 bg-accent/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Novo inquilino rápido</p>
        <button onClick={() => setOpen(false)} className="text-muted hover:text-ink"><X size={15} /></button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" className={inputCls} />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as Tenant["tipoInquilino"])} className={inputCls}>
          <option value="regular">Regular</option>
          <option value="estudante">Estudante</option>
        </select>
        <input value={nif} onChange={(e) => setNif(e.target.value)} placeholder="NIF (opcional)" className={inputCls} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (opcional)" className={inputCls} />
        <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone (opcional)" className={cn(inputCls, "sm:col-span-2")} />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] text-muted">Cria a ficha e associa já a este arrendamento.</p>
        <Button size="sm" onClick={criar}><Check size={14} /> Criar e associar</Button>
      </div>
    </div>
  );
}
