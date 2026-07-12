import { create } from "zustand";
import { persist } from "zustand/middleware";
import { usePropertiesStore, type Property } from "./usePropertiesStore";

// ───────────────────────── Tipos ─────────────────────────

export type ArrendamentoTipo =
  | "habitacional"
  | "estudante"
  | "trabalhador"
  | "comercial"
  | "sazonal"
  | "quarto";

export type DuracaoTipo = "fixa" | "aberta";
export type Periodicidade = "mensal" | "trimestral" | "semestral" | "anual";
export type MomentoPagamento = "adiantado" | "em_atraso";
export type MeioPagamento =
  | "transferencia"
  | "mbway"
  | "multibanco"
  | "numerario"
  | "cheque"
  | "outro";
export type TipoDespesas = "provisao" | "taxas_fixas";
export type CaucaoTipo = "posse_senhorio" | "conta_caucao" | "garantia_bancaria" | "fiador";
export type AtualizacaoTipo = "nao_rever" | "indice_referencia" | "percentagem_acordada";
export type AtualizacaoData = "aniversario" | "data_especifica";
export type ArrendamentoEstado = "ativo" | "a_expirar" | "expirado" | "terminado";
export type MotivoTerminacao =
  | "fim_contrato"
  | "denuncia_senhorio"
  | "denuncia_inquilino"
  | "incumprimento"
  | "acordo";

export interface OutroPagamento {
  id: string;
  descricao: string;
  montante: number;
}

export interface Fiador {
  id: string;
  nome: string;
  nif: string;
  morada: string;
  telefone: string;
  email: string;
  rendimento: number;
  documentoId?: string;
}

export interface SeguroArrendamento {
  temSeguro: boolean;
  seguradora?: string;
  apolice?: string;
  valorAnual?: number;
  dataRenovacao?: string;
  documentoId?: string;
}

export interface AlertasArrendamento {
  rendaAVencer: boolean;
  rendaAtrasada: boolean;
  fimContrato6m: boolean;
  fimContrato3m: boolean;
  atualizacaoRenda: boolean;
}

export interface Arrendamento {
  id: string;
  propertyId: string;
  identificador: string;
  tipo: ArrendamentoTipo;

  // Duração
  duracaoTipo: DuracaoTipo;
  dataInicio: string; // YYYY-MM-DD
  dataFim?: string;
  renovacaoAutomatica: boolean;
  periodoRenovacaoMeses: number;

  // Pagamento (REGISTO apenas — a app não movimenta dinheiro)
  periodicidade: Periodicidade;
  momentoPagamento: MomentoPagamento;
  meioPagamentoAcordado: MeioPagamento;
  diaPagamento: number; // 1-31

  // Valores
  rendaBase: number;
  despesasArrendamento?: number;
  tipoDespesas?: TipoDespesas;
  outrosPagamentos: OutroPagamento[];
  primeiraRendaProRata: boolean;
  dataFimPrimeiroPeriodo?: string;
  valorPrimeiraRenda?: number;

  // Caução
  caucao: number;
  caucaoTipo: CaucaoTipo;
  caucaoDataRecebimento?: string;
  caucaoDocumentoId?: string;
  caucaoRegistada?: boolean; // já lançou o movimento em Finanças

  // Atualização de renda
  atualizacaoTipo: AtualizacaoTipo;
  indiceReferencia?: string;
  valorIndice?: number;
  percentagemAcordada?: number;
  atualizacaoPeriodoAnos: number;
  atualizacaoData: AtualizacaoData;
  dataAtualizacaoEspecifica?: string;

  // Inquilinos (um ou vários — solidários) e fiadores
  inquilinos: string[]; // tenantId[]
  fiadores: Fiador[];

  // Seguro
  seguro: SeguroArrendamento;

  // Documentos (ids na Pasta Digital)
  documentos: string[];

  // Notificações internas (só para o senhorio)
  alertas: AlertasArrendamento;

  // Estado
  estado: ArrendamentoEstado;
  dataTerminacao?: string;
  motivoTerminacao?: MotivoTerminacao;
  rascunho?: boolean;
  createdAt: string;
}

export type ArrendamentoInput = Omit<Arrendamento, "id" | "createdAt">;

// ───────────────────────── Labels ─────────────────────────

export const TIPO_LABEL: Record<ArrendamentoTipo, string> = {
  habitacional: "Habitacional",
  estudante: "Estudante",
  trabalhador: "Trabalhador deslocado",
  comercial: "Comercial",
  sazonal: "Sazonal",
  quarto: "Quarto",
};

export const TIPO_OPCOES: ArrendamentoTipo[] = [
  "habitacional",
  "estudante",
  "trabalhador",
  "comercial",
  "sazonal",
  "quarto",
];

export const ESTADO_LABEL: Record<ArrendamentoEstado, string> = {
  ativo: "Ativo",
  a_expirar: "A expirar",
  expirado: "Expirado",
  terminado: "Terminado",
};

export const PERIODICIDADE_LABEL: Record<Periodicidade, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

export const PERIODICIDADE_MESES: Record<Periodicidade, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

export const MEIO_PAGAMENTO_LABEL: Record<MeioPagamento, string> = {
  transferencia: "Transferência bancária",
  mbway: "MB WAY",
  multibanco: "Referência Multibanco",
  numerario: "Numerário",
  cheque: "Cheque",
  outro: "Outro",
};

export const CAUCAO_TIPO_LABEL: Record<CaucaoTipo, string> = {
  posse_senhorio: "Na posse do senhorio",
  conta_caucao: "Conta caução",
  garantia_bancaria: "Garantia bancária",
  fiador: "Fiador",
};

export const ATUALIZACAO_TIPO_LABEL: Record<AtualizacaoTipo, string> = {
  nao_rever: "Não rever",
  indice_referencia: "Índice de referência (INE)",
  percentagem_acordada: "Percentagem acordada",
};

export const MOTIVO_TERMINACAO_LABEL: Record<MotivoTerminacao, string> = {
  fim_contrato: "Fim de contrato",
  denuncia_senhorio: "Denúncia do senhorio",
  denuncia_inquilino: "Denúncia do inquilino",
  incumprimento: "Incumprimento",
  acordo: "Acordo entre as partes",
};

export const ALERTAS_DEFAULT: AlertasArrendamento = {
  rendaAVencer: true,
  rendaAtrasada: true,
  fimContrato6m: true,
  fimContrato3m: true,
  atualizacaoRenda: true,
};

// ───────────────────────── Helpers de data / valores ─────────────────────────

export function rendaTotal(a: Pick<Arrendamento, "rendaBase" | "despesasArrendamento" | "outrosPagamentos">): number {
  const extras = (a.outrosPagamentos ?? []).reduce((s, o) => s + (o.montante || 0), 0);
  return (a.rendaBase || 0) + (a.despesasArrendamento || 0) + extras;
}

/** Renda "recorrente" (base + despesas de arrendamento), sem outros pagamentos pontuais. */
export function rendaRecorrente(a: Pick<Arrendamento, "rendaBase" | "despesasArrendamento">): number {
  return (a.rendaBase || 0) + (a.despesasArrendamento || 0);
}

export function diasAteFim(dataFim?: string): number | null {
  if (!dataFim) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(`${dataFim}T00:00:00`);
  if (isNaN(fim.getTime())) return null;
  return Math.round((fim.getTime() - hoje.getTime()) / 86400000);
}

/** Duração em meses entre início e fim (arredondada). */
export function duracaoMeses(dataInicio?: string, dataFim?: string): number {
  if (!dataInicio || !dataFim) return 0;
  const ini = new Date(`${dataInicio}T00:00:00`);
  const fim = new Date(`${dataFim}T00:00:00`);
  if (isNaN(ini.getTime()) || isNaN(fim.getTime()) || fim <= ini) return 0;
  return Math.max(0, Math.round((fim.getTime() - ini.getTime()) / (86400000 * 30.4375)));
}

/**
 * Estado efetivo: 'terminado' fica fixo; caso contrário deriva das datas.
 * Duração aberta (sem fim) → sempre "ativo".
 */
export function estadoEfetivo(a: Pick<Arrendamento, "estado" | "dataFim">): ArrendamentoEstado {
  if (a.estado === "terminado") return "terminado";
  const d = diasAteFim(a.dataFim);
  if (d === null) return "ativo";
  if (d < 0) return "expirado";
  if (d <= 90) return "a_expirar";
  return "ativo";
}

/** Um arrendamento "ocupa" o imóvel enquanto não for rascunho nem terminado. */
export function ocupaImovel(a: Arrendamento): boolean {
  return !a.rascunho && a.estado !== "terminado";
}

/** Progresso temporal [0..1] do arrendamento. */
export function progressoTemporal(a: Pick<Arrendamento, "dataInicio" | "dataFim">): number {
  if (!a.dataInicio || !a.dataFim) return 0;
  const ini = new Date(`${a.dataInicio}T00:00:00`).getTime();
  const fim = new Date(`${a.dataFim}T00:00:00`).getTime();
  const agora = Date.now();
  if (!isFinite(ini) || !isFinite(fim) || fim <= ini) return 0;
  return Math.max(0, Math.min(1, (agora - ini) / (fim - ini)));
}

// ───────────────────────── Rendas previstas (agenda virtual) ─────────────────────────

export interface RendaPrevista {
  periodoIso: string; // YYYY-MM-01 (mês de referência do período)
  vencimentoIso: string; // YYYY-MM-DD
  valor: number;
  primeiro: boolean;
}

/**
 * Agenda de rendas de um arrendamento — calculada (nunca persistida como
 * "movimento pendente"). O estado Pago/Pendente/Atrasado é derivado depois,
 * cruzando com os movimentos reais em Finanças (fonte única de dinheiro).
 */
export function gerarRendasPrevistas(a: Arrendamento, horizonteMesesAberta = 24): RendaPrevista[] {
  if (!a.dataInicio) return [];
  const passo = PERIODICIDADE_MESES[a.periodicidade] ?? 1;
  const ini = new Date(`${a.dataInicio}T00:00:00`);
  if (isNaN(ini.getTime())) return [];

  let fim: Date;
  if (a.dataFim) {
    fim = new Date(`${a.dataFim}T00:00:00`);
  } else {
    fim = new Date(ini);
    fim.setMonth(fim.getMonth() + horizonteMesesAberta);
  }
  if (a.estado === "terminado" && a.dataTerminacao) {
    const term = new Date(`${a.dataTerminacao}T00:00:00`);
    if (!isNaN(term.getTime()) && term < fim) fim = term;
  }

  const out: RendaPrevista[] = [];
  const cursor = new Date(ini.getFullYear(), ini.getMonth(), 1);
  let i = 0;
  while (cursor <= fim && i < 240) {
    const primeiro = i === 0;
    const dia = Math.min(a.diaPagamento || 1, 28);
    const venc = new Date(cursor.getFullYear(), cursor.getMonth(), dia);
    const valor = primeiro && a.primeiraRendaProRata && a.valorPrimeiraRenda
      ? a.valorPrimeiraRenda
      : rendaRecorrente(a);
    out.push({
      periodoIso: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-01`,
      vencimentoIso: `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, "0")}-${String(venc.getDate()).padStart(2, "0")}`,
      valor,
      primeiro,
    });
    cursor.setMonth(cursor.getMonth() + passo);
    i++;
  }
  return out;
}

// ───────────────────────── Sincronização com o imóvel ─────────────────────────

/**
 * A renda pertence ao ARRENDAMENTO, não ao imóvel. Sempre que os arrendamentos
 * de um imóvel mudam, recalculamos a renda mensal efetiva (soma dos ativos) e a
 * ocupação. Assim todos os cálculos existentes (yield, cashflow, dashboard) —
 * que leem property.rendaMensal — continuam a funcionar sem alterações.
 * Estados manuais (em_obras/inativo) nunca são pisados por aqui.
 */
function sincronizarImovel(propertyId?: string) {
  if (!propertyId) return;
  const props = usePropertiesStore.getState();
  const prop = props.properties.find((p) => p.id === propertyId);
  if (!prop) return;
  const ativos = useArrendamentosStore
    .getState()
    .arrendamentos.filter((a) => a.propertyId === propertyId && ocupaImovel(a));
  const renda = ativos.reduce((s, a) => s + rendaRecorrente(a), 0);
  const patch: Partial<Property> = { rendaMensal: renda };
  if (prop.status !== "em_obras" && prop.status !== "inativo") {
    patch.status = ativos.length > 0 ? "ocupado" : "disponivel";
  }
  props.update(propertyId, patch);
}

// ───────────────────────── Identificador automático ─────────────────────────

export function sugerirIdentificador(existentes: Arrendamento[]): string {
  const ano = new Date().getFullYear();
  const prefixo = `ARR-${ano}-`;
  const nums = existentes
    .map((a) => a.identificador)
    .filter((id) => id?.startsWith(prefixo))
    .map((id) => parseInt(id.slice(prefixo.length), 10))
    .filter((n) => isFinite(n));
  const proximo = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefixo}${String(proximo).padStart(3, "0")}`;
}

// ───────────────────────── Seed ─────────────────────────

function emDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function base(p: Partial<Arrendamento> & { id: string; propertyId: string; identificador: string }): Arrendamento {
  return {
    tipo: "habitacional",
    duracaoTipo: "fixa",
    dataInicio: "2024-01-01",
    renovacaoAutomatica: false,
    periodoRenovacaoMeses: 12,
    periodicidade: "mensal",
    momentoPagamento: "adiantado",
    meioPagamentoAcordado: "transferencia",
    diaPagamento: 1,
    rendaBase: 0,
    outrosPagamentos: [],
    primeiraRendaProRata: false,
    caucao: 0,
    caucaoTipo: "posse_senhorio",
    atualizacaoTipo: "nao_rever",
    atualizacaoPeriodoAnos: 1,
    atualizacaoData: "aniversario",
    inquilinos: [],
    fiadores: [],
    seguro: { temSeguro: false },
    documentos: [],
    alertas: { ...ALERTAS_DEFAULT },
    estado: "ativo",
    createdAt: `${p.dataInicio ?? "2024-01-01"}T09:00:00.000Z`,
    ...p,
  } as Arrendamento;
}

const SEED: Arrendamento[] = [
  // T2 Arroios — ATIVO (Ana Martins)
  base({
    id: "arr-arroios-ana",
    propertyId: "seed-arroios",
    identificador: "ARR-2024-001",
    tipo: "habitacional",
    dataInicio: "2024-05-01",
    dataFim: "2027-04-30",
    renovacaoAutomatica: true,
    periodoRenovacaoMeses: 12,
    diaPagamento: 1,
    momentoPagamento: "adiantado",
    rendaBase: 1350,
    caucao: 2700,
    caucaoTipo: "posse_senhorio",
    caucaoDataRecebimento: "2024-05-01",
    caucaoRegistada: true,
    atualizacaoTipo: "indice_referencia",
    indiceReferencia: "Coeficiente anual INE",
    valorIndice: 2.16,
    atualizacaoPeriodoAnos: 1,
    atualizacaoData: "aniversario",
    inquilinos: ["tenant-ana-martins"],
    seguro: { temSeguro: true, seguradora: "Fidelidade", apolice: "MR-2024-88120", valorAnual: 180, dataRenovacao: emDias(60) },
    documentos: ["seed-doc-contrato-ana"],
    estado: "ativo",
  }),
  // T2 Arroios — TERMINADO (inquilino anterior, Rita Soares)
  base({
    id: "arr-arroios-rita",
    propertyId: "seed-arroios",
    identificador: "ARR-2021-014",
    tipo: "habitacional",
    dataInicio: "2021-06-01",
    dataFim: "2024-03-31",
    diaPagamento: 1,
    rendaBase: 850,
    caucao: 1700,
    caucaoTipo: "posse_senhorio",
    atualizacaoTipo: "indice_referencia",
    indiceReferencia: "Coeficiente anual INE",
    inquilinos: ["tenant-rita-soares"],
    documentos: ["seed-doc-contrato-anterior"],
    estado: "terminado",
    dataTerminacao: "2024-03-31",
    motivoTerminacao: "fim_contrato",
  }),
  // Studio AL Baixa (Porto) — ATIVO a expirar (~45 dias) — Tiago Nunes
  base({
    id: "arr-porto-tiago",
    propertyId: "seed-porto-al",
    identificador: "ARR-2025-006",
    tipo: "habitacional",
    dataInicio: "2025-09-01",
    dataFim: emDias(45),
    renovacaoAutomatica: false,
    diaPagamento: 5,
    rendaBase: 1050,
    despesasArrendamento: 50,
    tipoDespesas: "taxas_fixas",
    caucao: 1100,
    caucaoTipo: "posse_senhorio",
    caucaoDataRecebimento: "2025-09-01",
    caucaoRegistada: true,
    atualizacaoTipo: "nao_rever",
    inquilinos: ["tenant-tiago-nunes"],
    estado: "ativo",
  }),
  // Apartamento Príncipe Real — ATIVO (Sofia Rocha) · projeto colaborativo #003
  base({
    id: "arr-principe-sofia",
    propertyId: "seed-principe-real",
    identificador: "ARR-2026-001",
    tipo: "habitacional",
    dataInicio: "2026-02-01",
    dataFim: "2029-01-31",
    renovacaoAutomatica: true,
    periodoRenovacaoMeses: 12,
    diaPagamento: 8,
    rendaBase: 1850,
    caucao: 3700,
    caucaoTipo: "posse_senhorio",
    caucaoDataRecebimento: "2026-02-01",
    caucaoRegistada: true,
    atualizacaoTipo: "indice_referencia",
    indiceReferencia: "Coeficiente anual INE",
    valorIndice: 2.16,
    atualizacaoPeriodoAnos: 1,
    atualizacaoData: "aniversario",
    inquilinos: ["tenant-sofia-rocha"],
    seguro: { temSeguro: true, seguradora: "Ageas", apolice: "MR-2026-3391", valorAnual: 220, dataRenovacao: emDias(120) },
    documentos: ["seed-doc-contrato-principe"],
    estado: "ativo",
  }),
];

// ───────────────────────── Store ─────────────────────────

interface ArrendamentosState {
  arrendamentos: Arrendamento[];
  add: (input: ArrendamentoInput) => string;
  update: (id: string, patch: Partial<Arrendamento>) => void;
  remove: (id: string) => void;
  getById: (id: string) => Arrendamento | undefined;
  byProperty: (propertyId: string) => Arrendamento[];
  byTenant: (tenantId: string) => Arrendamento[];
  ativoDoImovel: (propertyId: string) => Arrendamento | undefined;
  terminate: (id: string, motivo: MotivoTerminacao, data?: string) => void;
  resetSeed: () => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `arr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useArrendamentosStore = create<ArrendamentosState>()(
  persist(
    (set, get) => ({
      arrendamentos: SEED,
      add: (input) => {
        const id = uid();
        const arrendamento: Arrendamento = { ...input, id, createdAt: new Date().toISOString() };
        set((s) => ({ arrendamentos: [arrendamento, ...s.arrendamentos] }));
        sincronizarImovel(input.propertyId);
        return id;
      },
      update: (id, patch) => {
        const antes = get().arrendamentos.find((a) => a.id === id)?.propertyId;
        set((s) => ({
          arrendamentos: s.arrendamentos.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }));
        const depois = get().arrendamentos.find((a) => a.id === id)?.propertyId;
        sincronizarImovel(antes);
        if (depois && depois !== antes) sincronizarImovel(depois);
      },
      remove: (id) => {
        const pid = get().arrendamentos.find((a) => a.id === id)?.propertyId;
        set((s) => ({ arrendamentos: s.arrendamentos.filter((a) => a.id !== id) }));
        sincronizarImovel(pid);
      },
      getById: (id) => get().arrendamentos.find((a) => a.id === id),
      byProperty: (propertyId) => get().arrendamentos.filter((a) => a.propertyId === propertyId),
      byTenant: (tenantId) => get().arrendamentos.filter((a) => a.inquilinos.includes(tenantId)),
      ativoDoImovel: (propertyId) =>
        get().arrendamentos.find((a) => a.propertyId === propertyId && ocupaImovel(a)),
      terminate: (id, motivo, data) => {
        const pid = get().arrendamentos.find((a) => a.id === id)?.propertyId;
        set((s) => ({
          arrendamentos: s.arrendamentos.map((a) =>
            a.id === id
              ? {
                  ...a,
                  estado: "terminado",
                  dataTerminacao: data ?? new Date().toISOString().slice(0, 10),
                  motivoTerminacao: motivo,
                }
              : a
          ),
        }));
        sincronizarImovel(pid);
      },
      resetSeed: () => set({ arrendamentos: SEED }),
    }),
    {
      name: "redegest-arrendamentos",
      version: 1,
    }
  )
);
