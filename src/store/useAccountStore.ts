import { create } from "zustand";
import { persist } from "zustand/middleware";

// ───────────────────────── Tipos ─────────────────────────

export type RegimeFiscal = "categoria_F" | "atividade_aberta" | "empresa";
export type PlanoId = "gratuito" | "starter" | "pro" | "business";
export type Ciclo = "mensal" | "anual";
export type EstadoVerificacao = "nao_iniciado" | "em_revisao" | "aprovado" | "rejeitado";

export interface Privado {
  nomeCompleto: string;
  dataNascimento: string;
  nif: string;
  cc: string;
  ccValidade: string;
  moradaFiscal: string;
  codigoPostal: string;
  cidade: string;
  distrito: string;
  email: string;
  telefone: string;
  telefoneAlt: string;
  iban: string;
  bicSwift: string;
  bancoNome: string;
  regimeFiscal: RegimeFiscal;
  nipc?: string;
  contabilistaNome?: string;
  contabilistaEmail?: string;
  contabilistaNif?: string;
  avatarUrl?: string;
}

export interface MetodoPagamento {
  tipo: string; // Visa / Mastercard / Amex
  ultimosDigitos: string;
  validade: string;
}

export interface DadosFaturacao {
  nome: string;
  nif: string;
  morada: string;
  codigoPostal: string;
  cidade: string;
  pais: string;
}

export interface Plano {
  atual: PlanoId;
  cicloFaturacao: Ciclo;
  proximoPagamento: string;
  metodoPagamento: MetodoPagamento;
  dadosFaturacao: DadosFaturacao;
  promo?: { codigo: string; desconto: number }; // % desconto
}

export interface CanalNotif {
  email: boolean;
  push: boolean;
  inApp: boolean;
}

export interface Privacidade {
  mostrarNaRede: boolean;
  indexavelPesquisaPublica: boolean;
  mostrarContacto: boolean;
  bloqueados: string[];
}

export interface Aparencia {
  tema: "claro" | "escuro" | "sistema";
  densidade: "compacta" | "normal";
}

export interface Login {
  data: string;
  dispositivo: string;
  localizacao: string;
  atual?: boolean;
}

export interface Seguranca {
  dois_fatores: boolean;
  ultimosLogins: Login[];
}

export interface Definicoes {
  notificacoes: Record<string, CanalNotif>;
  privacidade: Privacidade;
  aparencia: Aparencia;
  idioma: string;
  seguranca: Seguranca;
}

export type EstadoIntegracao = "ligada" | "em_breve" | "disponivel";
export interface Integracoes {
  stripe: EstadoIntegracao;
  mbway: EstadoIntegracao;
  openBanking: EstadoIntegracao;
  docuseal: EstadoIntegracao;
  nuki: EstadoIntegracao;
  claude: EstadoIntegracao;
}

export interface ApiKey {
  id: string;
  nome: string;
  criadaEm: string;
  ultimoUso?: string;
  scopes: string[];
  prefixo: string;
}

export interface Verificacao {
  is_verified: boolean;
  verified_at?: string;
  nif_validado: EstadoVerificacao;
  doc_validado: EstadoVerificacao;
  telefone_validado: EstadoVerificacao;
}

export interface Fatura {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  estado: "paga" | "pendente" | "falhada";
}

// ───────────────────────── Eventos de notificação ─────────────────────────

export const NOTIF_EVENTS: { key: string; label: string }[] = [
  { key: "contrato_expira", label: "Contrato a expirar (90/60/30/7d)" },
  { key: "renda_recebida", label: "Renda recebida" },
  { key: "renda_atrasada", label: "Renda em atraso" },
  { key: "manutencao_nova", label: "Pedido de manutenção novo" },
  { key: "proposta_rede", label: "Nova proposta na Rede" },
  { key: "mensagem_nova", label: "Nova mensagem" },
  { key: "decisao_colaborativa", label: "Decisão colaborativa pendente" },
  { key: "resumo_semanal", label: "Resumo semanal do portfólio (sex 18h)" },
  { key: "changelog", label: "Atualizações do decogest" },
];

function notifDefaults(): Record<string, CanalNotif> {
  const out: Record<string, CanalNotif> = {};
  NOTIF_EVENTS.forEach((e) => {
    const importante = ["contrato_expira", "renda_atrasada", "proposta_rede", "mensagem_nova"].includes(e.key);
    out[e.key] = { email: importante, push: importante, inApp: true };
  });
  return out;
}

// ───────────────────────── Planos (preços + limites + features) ─────────────────────────

export interface PlanoInfo {
  id: PlanoId;
  nome: string;
  precoMensal: number;
  precoAnual: number; // por mês, faturado anualmente (-16%)
  limites: { imoveis: number; anuncios: number; projetos: number; utilizadores: number };
  features: string[];
}

export const PLANOS: Record<PlanoId, PlanoInfo> = {
  gratuito: {
    id: "gratuito",
    nome: "Gratuito",
    precoMensal: 0,
    precoAnual: 0,
    limites: { imoveis: 1, anuncios: 1, projetos: 0, utilizadores: 1 },
    features: ["1 imóvel", "1 anúncio na Rede", "Calculadora de rentabilidade", "Pasta Digital (até 100 MB)"],
  },
  starter: {
    id: "starter",
    nome: "Starter",
    precoMensal: 7.99,
    precoAnual: 6.71,
    limites: { imoveis: 5, anuncios: 3, projetos: 1, utilizadores: 1 },
    features: ["Até 5 imóveis", "3 anúncios na Rede", "Contratos PDF", "Contabilidade completa", "1 projeto colaborativo"],
  },
  pro: {
    id: "pro",
    nome: "Pro",
    precoMensal: 14.99,
    precoAnual: 12.59,
    limites: { imoveis: Infinity, anuncios: 10, projetos: 5, utilizadores: 1 },
    features: ["Imóveis ilimitados", "10 anúncios na Rede", "5 projetos colaborativos", "Assistente IA", "Calendário do investimento", "Suporte prioritário"],
  },
  business: {
    id: "business",
    nome: "Business",
    precoMensal: 39.99,
    precoAnual: 33.59,
    limites: { imoveis: Infinity, anuncios: Infinity, projetos: Infinity, utilizadores: 5 },
    features: ["Tudo do Pro", "Anúncios e projetos ilimitados", "Até 5 utilizadores", "Acesso à API + Webhooks", "Gestor de conta dedicado"],
  },
};

// ───────────────────────── Helpers de data ─────────────────────────

function emDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ───────────────────────── Seed ─────────────────────────

// "Valor primeiro, dados depois": o utilizador começa com o mínimo (nome, email, plano).
// Os campos sensíveis (NIF/CC/IBAN/morada fiscal) ficam vazios e são pedidos só quando
// uma feature precisa deles (ver UnlockGate).
const PRIVADO_SEED: Privado = {
  // Mesmo utilizador em toda a app: CURRENT_USER_ID "me-daniel" (useProfilesStore)
  nomeCompleto: "Daniel Silva",
  dataNascimento: "",
  nif: "",
  cc: "",
  ccValidade: "",
  moradaFiscal: "",
  codigoPostal: "",
  cidade: "Lisboa",
  distrito: "",
  email: "aguamolhada31200@gmail.com",
  telefone: "",
  telefoneAlt: "",
  iban: "",
  bicSwift: "",
  bancoNome: "",
  regimeFiscal: "categoria_F",
  avatarUrl: undefined,
};

const PLANO_SEED: Plano = {
  atual: "pro",
  cicloFaturacao: "mensal",
  proximoPagamento: "2026-07-15",
  metodoPagamento: { tipo: "Visa", ultimosDigitos: "4321", validade: "08/27" },
  dadosFaturacao: {
    nome: "Daniel Silva",
    nif: "",
    morada: "",
    codigoPostal: "",
    cidade: "Lisboa",
    pais: "Portugal",
  },
};

const FATURAS_SEED: Fatura[] = ["01", "02", "03", "04", "05", "06"].map((m) => ({
  id: `fat-2026-${m}`,
  data: `2026-${m}-15`,
  descricao: "Plano Pro · mensal",
  valor: 14.99,
  estado: "paga" as const,
}));

const DEFINICOES_SEED: Definicoes = {
  notificacoes: notifDefaults(),
  privacidade: {
    mostrarNaRede: true,
    indexavelPesquisaPublica: false,
    mostrarContacto: false,
    bloqueados: [],
  },
  aparencia: { tema: "sistema", densidade: "normal" },
  idioma: "pt-PT",
  seguranca: {
    dois_fatores: false,
    ultimosLogins: [
      { data: emDias(0), dispositivo: "Chrome · Windows", localizacao: "Lisboa, PT", atual: true },
      { data: emDias(-1), dispositivo: "Safari · iPhone", localizacao: "Lisboa, PT" },
      { data: emDias(-4), dispositivo: "Chrome · Windows", localizacao: "Porto, PT" },
    ],
  },
};

const INTEGRACOES_SEED: Integracoes = {
  stripe: "ligada",
  mbway: "em_breve",
  openBanking: "em_breve",
  docuseal: "em_breve",
  nuki: "em_breve",
  claude: "em_breve",
};

const VERIFICACAO_SEED: Verificacao = {
  is_verified: false,
  nif_validado: "nao_iniciado",
  doc_validado: "nao_iniciado",
  telefone_validado: "nao_iniciado",
};

// ───────────────────────── Store ─────────────────────────

interface AccountState {
  privado: Privado;
  plano: Plano;
  definicoes: Definicoes;
  integracoes: Integracoes;
  apiKeys: ApiKey[];
  verificacao: Verificacao;
  faturas: Fatura[];
  // updaters
  updatePrivado: (patch: Partial<Privado>) => void;
  updatePlano: (patch: Partial<Plano>) => void;
  setNotif: (key: string, canal: keyof CanalNotif, value: boolean) => void;
  updatePrivacidade: (patch: Partial<Privacidade>) => void;
  updateAparencia: (patch: Partial<Aparencia>) => void;
  updateSeguranca: (patch: Partial<Seguranca>) => void;
  updateVerificacao: (patch: Partial<Verificacao>) => void;
  addApiKey: (nome: string, scopes: string[]) => void;
  revokeApiKey: (id: string) => void;
  aplicarPromo: (codigo: string) => boolean;
  resetSeed: () => void;
}

function uid(prefix = "key"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const PROMOS: Record<string, number> = { DECOGEST10: 10, BEMVINDO: 20, ANUAL16: 16 };

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      privado: PRIVADO_SEED,
      plano: PLANO_SEED,
      definicoes: DEFINICOES_SEED,
      integracoes: INTEGRACOES_SEED,
      apiKeys: [],
      verificacao: VERIFICACAO_SEED,
      faturas: FATURAS_SEED,
      updatePrivado: (patch) => set((s) => ({ privado: { ...s.privado, ...patch } })),
      updatePlano: (patch) => set((s) => ({ plano: { ...s.plano, ...patch } })),
      setNotif: (key, canal, value) =>
        set((s) => ({
          definicoes: {
            ...s.definicoes,
            notificacoes: {
              ...s.definicoes.notificacoes,
              [key]: { ...s.definicoes.notificacoes[key], [canal]: value },
            },
          },
        })),
      updatePrivacidade: (patch) =>
        set((s) => ({ definicoes: { ...s.definicoes, privacidade: { ...s.definicoes.privacidade, ...patch } } })),
      updateAparencia: (patch) =>
        set((s) => ({ definicoes: { ...s.definicoes, aparencia: { ...s.definicoes.aparencia, ...patch } } })),
      updateSeguranca: (patch) =>
        set((s) => ({ definicoes: { ...s.definicoes, seguranca: { ...s.definicoes.seguranca, ...patch } } })),
      updateVerificacao: (patch) => set((s) => ({ verificacao: { ...s.verificacao, ...patch } })),
      addApiKey: (nome, scopes) =>
        set((s) =>
          s.apiKeys.length >= 5
            ? s
            : {
                apiKeys: [
                  { id: uid(), nome, criadaEm: new Date().toISOString().slice(0, 10), scopes, prefixo: `dk_${uid("").slice(0, 8)}` },
                  ...s.apiKeys,
                ],
              }
        ),
      revokeApiKey: (id) => set((s) => ({ apiKeys: s.apiKeys.filter((k) => k.id !== id) })),
      aplicarPromo: (codigo) => {
        const desconto = PROMOS[codigo.trim().toUpperCase()];
        if (!desconto) return false;
        set((s) => ({ plano: { ...s.plano, promo: { codigo: codigo.trim().toUpperCase(), desconto } } }));
        return true;
      },
      resetSeed: () =>
        set({
          privado: PRIVADO_SEED,
          plano: PLANO_SEED,
          definicoes: DEFINICOES_SEED,
          integracoes: INTEGRACOES_SEED,
          apiKeys: [],
          verificacao: VERIFICACAO_SEED,
          faturas: FATURAS_SEED,
        }),
    }),
    {
      name: "decogest-account",
      version: 3,
      // v1 trazia o perfil totalmente preenchido; v2 adota "valor primeiro" (perfil mínimo).
      // v3: corrige a identidade seed "José Felix" → "Daniel Silva" (mesmo utilizador em toda a app).
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          const s = (persisted ?? {}) as Partial<AccountState>;
          return {
            ...s,
            privado: PRIVADO_SEED,
            plano: s.plano ?? PLANO_SEED,
            definicoes: s.definicoes ?? DEFINICOES_SEED,
            integracoes: s.integracoes ?? INTEGRACOES_SEED,
            apiKeys: s.apiKeys ?? [],
            verificacao: VERIFICACAO_SEED,
            faturas: s.faturas ?? FATURAS_SEED,
          } as AccountState;
        }
        const s = persisted as AccountState;
        if (version < 3 && s?.privado?.nomeCompleto === "José Felix") {
          s.privado = { ...s.privado, nomeCompleto: "Daniel Silva" };
          if (s.plano?.dadosFaturacao?.nome === "José Felix") {
            s.plano = { ...s.plano, dadosFaturacao: { ...s.plano.dadosFaturacao, nome: "Daniel Silva" } };
          }
        }
        return s;
      },
    }
  )
);
