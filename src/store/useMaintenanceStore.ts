import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CURRENT_USER_ID } from "./useProfilesStore";

// ─────────────────────────────────────────────────────────────────
// MANUTENÇÃO = avaria/reparação pontual ou tarefa preventiva (horas/dias).
// OBRAS = projeto planeado com orçamento, fases e marcos (semanas/meses).
// Um pedido pode CRESCER e ser convertido em obra (convertidoEmObraId).
// Fonte única: alimenta /manutencao E o tab Manutenção do imóvel.
// ─────────────────────────────────────────────────────────────────

export type Prioridade = "urgente" | "alta" | "normal" | "baixa";

export type EstadoPedido =
  | "aberto"
  | "agendado"
  | "em_curso"
  | "aguarda_pecas"
  | "concluido"
  | "cancelado";

export type CategoriaPedido =
  | "canalizacao"
  | "eletricidade"
  | "aquecimento"
  | "climatizacao"
  | "fechaduras"
  | "eletrodomesticos"
  | "pintura"
  | "humidade"
  | "janelas"
  | "estores"
  | "telhado"
  | "outros";

export type Responsabilidade = "senhorio" | "inquilino" | "partilhada";
export type OrigemPedido = "senhorio" | "inquilino" | "preventivo";

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  urgente: "Urgente",
  alta: "Alta",
  normal: "Normal",
  baixa: "Baixa",
};

export const ESTADO_PEDIDO_LABEL: Record<EstadoPedido, string> = {
  aberto: "Aberto",
  agendado: "Agendado",
  em_curso: "Em curso",
  aguarda_pecas: "Aguarda peças",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const CATEGORIA_PEDIDO_LABEL: Record<CategoriaPedido, string> = {
  canalizacao: "Canalização",
  eletricidade: "Eletricidade",
  aquecimento: "Aquecimento",
  climatizacao: "Climatização",
  fechaduras: "Fechaduras",
  eletrodomesticos: "Eletrodomésticos",
  pintura: "Pintura",
  humidade: "Humidade",
  janelas: "Janelas",
  estores: "Estores",
  telhado: "Telhado",
  outros: "Outros",
};

export const RESPONSABILIDADE_LABEL: Record<Responsabilidade, string> = {
  senhorio: "Senhorio",
  inquilino: "Inquilino",
  partilhada: "Partilhada",
};

export const ORIGEM_LABEL: Record<OrigemPedido, string> = {
  senhorio: "Criado pelo senhorio",
  inquilino: "Reportado pelo inquilino",
  preventivo: "Tarefa preventiva",
};

/**
 * Responsabilidade SUGERIDA por categoria + nota informativa (não é
 * aconselhamento jurídico). Sempre editável, com justificação.
 */
export const RESP_SUGERIDA: Record<CategoriaPedido, { resp: Responsabilidade; nota: string }> = {
  canalizacao: { resp: "senhorio", nota: "Reparação estrutural — encargo do senhorio." },
  eletricidade: { resp: "senhorio", nota: "Instalação elétrica do imóvel — encargo do senhorio." },
  aquecimento: { resp: "senhorio", nota: "Equipamento do imóvel (caldeira/esquentador) — encargo do senhorio." },
  climatizacao: { resp: "senhorio", nota: "AC instalado no imóvel — encargo do senhorio." },
  humidade: { resp: "senhorio", nota: "Humidade estrutural — encargo do senhorio." },
  telhado: { resp: "senhorio", nota: "Cobertura e estrutura — encargo do senhorio." },
  janelas: { resp: "senhorio", nota: "Rotura estrutural — senhorio. Vidro partido pelo inquilino — inquilino." },
  estores: { resp: "senhorio", nota: "Avaria do mecanismo — senhorio. Uso indevido — inquilino." },
  fechaduras: { resp: "senhorio", nota: "Avaria — senhorio. Perda de chave — inquilino (negligência)." },
  eletrodomesticos: { resp: "senhorio", nota: "Incluídos no contrato/mobilado — senhorio. Do inquilino — inquilino." },
  pintura: { resp: "senhorio", nota: "Desgaste normal — senhorio. Danos causados — inquilino." },
  outros: { resp: "senhorio", nota: "Pequenas reparações de uso corrente são normalmente do inquilino." },
};

/** Sugerir conversão em obra? (custo alto ou natureza estrutural) */
export function sugereConversaoEmObra(r: MaintenanceRequest): boolean {
  if (r.estado === "concluido" || r.estado === "cancelado" || r.convertidoEmObraId) return false;
  return (r.custoEstimado ?? 0) > 1500 || r.categoria === "humidade" || r.categoria === "telhado";
}

export interface EventoPedido {
  ts: string; // ISO datetime
  texto: string;
  autor?: string; // userId
}

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  arrendamentoId?: string;
  tenantId?: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaPedido;
  prioridade: Prioridade;
  estado: EstadoPedido;
  responsabilidade: Responsabilidade;
  justificacaoResponsabilidade?: string;
  tecnicoId?: string;
  /** Retro-compat (pedidos antigos sem diretório). */
  tecnicoNome?: string;
  tecnicoContacto?: string;
  dataAgendada?: string; // YYYY-MM-DD
  custoEstimado?: number;
  custoFinal?: number;
  faturaDocumentId?: string;
  transactionId?: string;
  fotosAntes: string[];
  fotosDepois: string[];
  avaliacaoTecnico?: number; // 1..5
  comentarioAvaliacao?: string;
  /** Se nasceu de uma mensagem do inquilino. */
  conversationId?: string;
  origem: OrigemPedido;
  /** Se foi promovido a obra. */
  convertidoEmObraId?: string;
  /** Se nasceu de uma tarefa do plano preventivo. */
  planTaskId?: string;
  notasInternas?: string;
  historico: EventoPedido[];
  createdAt: string; // YYYY-MM-DD
  updatedAt: string;
  resolvedAt?: string;
}

export type MaintenanceInput = Omit<
  MaintenanceRequest,
  "id" | "createdAt" | "updatedAt" | "historico" | "fotosAntes" | "fotosDepois"
> & { fotosAntes?: string[]; fotosDepois?: string[] };

// ───────────────────── Seeds ─────────────────────

const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

const SEED: MaintenanceRequest[] = [
  {
    id: "mnt-esquentador",
    propertyId: "seed-arroios",
    tenantId: "tenant-ana-martins",
    titulo: "Esquentador não aquece",
    descricao:
      "O esquentador deixa de aquecer a água a meio do duche, sobretudo de manhã. A inquilina reportou 3 dias seguidos.",
    categoria: "aquecimento",
    prioridade: "urgente",
    estado: "em_curso",
    responsabilidade: "senhorio",
    tecnicoId: "tec-joao-silva",
    custoEstimado: 180,
    fotosAntes: [IMG("1585129777188-94600bc7b4b3")],
    fotosDepois: [],
    conversationId: "conv-tenant-ana",
    origem: "inquilino",
    historico: [
      { ts: "2026-07-16T08:45:00", texto: "Pedido criado a partir da conversa com Ana Martins.", autor: CURRENT_USER_ID },
      { ts: "2026-07-16T09:10:00", texto: "Técnico atribuído: João Silva.", autor: CURRENT_USER_ID },
      { ts: "2026-07-17T10:00:00", texto: "Estado: Em curso — técnico no local.", autor: CURRENT_USER_ID },
    ],
    createdAt: "2026-07-16",
    updatedAt: "2026-07-17",
  },
  {
    id: "mnt-fuga-torneira",
    propertyId: "seed-coimbra",
    titulo: "Fuga na torneira da cozinha",
    descricao: "Pinga constantemente mesmo fechada. Contador a andar mais depressa que o normal.",
    categoria: "canalizacao",
    prioridade: "alta",
    estado: "aberto",
    responsabilidade: "senhorio",
    fotosAntes: [],
    fotosDepois: [],
    origem: "senhorio",
    historico: [{ ts: "2026-07-18T09:00:00", texto: "Pedido criado.", autor: CURRENT_USER_ID }],
    createdAt: "2026-07-18",
    updatedAt: "2026-07-18",
  },
  {
    id: "mnt-estore-sala",
    propertyId: "seed-porto-al",
    titulo: "Estore da sala encravado",
    descricao: "Estore elétrico da sala não sobe. Hóspedes de sábado precisam da sala funcional.",
    categoria: "estores",
    prioridade: "normal",
    estado: "agendado",
    responsabilidade: "senhorio",
    dataAgendada: "2026-07-22",
    fotosAntes: [],
    fotosDepois: [],
    origem: "senhorio",
    historico: [
      { ts: "2026-07-15T15:00:00", texto: "Pedido criado.", autor: CURRENT_USER_ID },
      { ts: "2026-07-15T15:20:00", texto: "Agendado para 22/07/2026.", autor: CURRENT_USER_ID },
    ],
    createdAt: "2026-07-15",
    updatedAt: "2026-07-15",
  },
  {
    id: "mnt-humidade-quarto",
    propertyId: "seed-arroios",
    titulo: "Mancha de humidade no quarto",
    descricao:
      "Mancha a crescer na parede exterior do quarto principal. Suspeita de infiltração pela fachada — pode exigir intervenção estrutural.",
    categoria: "humidade",
    prioridade: "alta",
    estado: "aberto",
    responsabilidade: "senhorio",
    custoEstimado: 2400,
    fotosAntes: [IMG("1585421514738-01798e348b17")],
    fotosDepois: [],
    origem: "senhorio",
    historico: [{ ts: "2026-07-12T11:30:00", texto: "Pedido criado.", autor: CURRENT_USER_ID }],
    createdAt: "2026-07-12",
    updatedAt: "2026-07-12",
  },
  {
    id: "mnt-repintura-wc",
    propertyId: "seed-arroios",
    titulo: "Repintura do WC após saída de inquilino",
    descricao: "Pintura completa do WC (tetos com fungos superficiais) antes da entrada da nova inquilina.",
    categoria: "pintura",
    prioridade: "normal",
    estado: "concluido",
    responsabilidade: "senhorio",
    tecnicoId: "tec-carlos-pinto",
    custoFinal: 220,
    fotosAntes: [IMG("1584622650111-993a426fbf0a")],
    fotosDepois: [IMG("1552321554-5fefe8c9ef14")],
    avaliacaoTecnico: 4,
    comentarioAvaliacao: "Trabalho limpo e no prazo.",
    origem: "senhorio",
    historico: [
      { ts: "2026-06-14T09:00:00", texto: "Pedido criado.", autor: CURRENT_USER_ID },
      { ts: "2026-06-18T09:00:00", texto: "Estado: Em curso.", autor: CURRENT_USER_ID },
      { ts: "2026-06-20T17:30:00", texto: "Concluído · custo final 220 € (fatura arquivada, transação criada).", autor: CURRENT_USER_ID },
      { ts: "2026-06-20T17:35:00", texto: "Técnico avaliado: Carlos Pinto (4/5).", autor: CURRENT_USER_ID },
    ],
    createdAt: "2026-06-14",
    updatedAt: "2026-06-20",
    resolvedAt: "2026-06-20",
  },
  {
    id: "mnt-lampadas",
    propertyId: "seed-porto-al",
    titulo: "Substituição de lâmpadas",
    descricao: "Duas lâmpadas fundidas no corredor e na kitchenette.",
    categoria: "eletricidade",
    prioridade: "baixa",
    estado: "concluido",
    responsabilidade: "inquilino",
    justificacaoResponsabilidade: "Consumível de uso corrente — encargo do utilizador do imóvel.",
    custoFinal: 35,
    fotosAntes: [],
    fotosDepois: [],
    origem: "senhorio",
    historico: [
      { ts: "2026-07-03T10:00:00", texto: "Pedido criado.", autor: CURRENT_USER_ID },
      { ts: "2026-07-05T12:00:00", texto: "Concluído · custo final 35 €.", autor: CURRENT_USER_ID },
    ],
    createdAt: "2026-07-03",
    updatedAt: "2026-07-05",
    resolvedAt: "2026-07-05",
  },
];

// ───────────────────── Helpers ─────────────────────

const ESTADOS_ABERTOS: EstadoPedido[] = ["aberto", "agendado", "em_curso", "aguarda_pecas"];

export function pedidoAberto(r: MaintenanceRequest): boolean {
  return ESTADOS_ABERTOS.includes(r.estado);
}

export function diasDesdeCriacao(r: MaintenanceRequest): number {
  const t = new Date(`${r.createdAt}T00:00:00`).getTime();
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

/** Próximo passo em linguagem simples (para o card). */
export function proximoPasso(r: MaintenanceRequest): string {
  if (r.convertidoEmObraId) return "Convertido em obra";
  switch (r.estado) {
    case "aberto":
      return r.tecnicoId || r.tecnicoNome ? "Agendar visita do técnico" : "Atribuir técnico";
    case "agendado":
      return r.dataAgendada ? `Visita a ${r.dataAgendada.slice(8, 10)}/${r.dataAgendada.slice(5, 7)}` : "Visita agendada";
    case "em_curso":
      return "Reparação em curso";
    case "aguarda_pecas":
      return "À espera de peças";
    case "concluido":
      return r.custoFinal ? "Concluído" : "Registar custo final";
    case "cancelado":
      return "Cancelado";
  }
}

// ───────────────────── Store ─────────────────────

interface MaintenanceState {
  requests: MaintenanceRequest[];
  add: (input: MaintenanceInput) => string;
  update: (id: string, patch: Partial<MaintenanceRequest>) => void;
  /** Muda o estado registando o passo no histórico do pedido. */
  setEstado: (id: string, estado: EstadoPedido) => void;
  /** Regista um evento livre no histórico. */
  log: (id: string, texto: string) => void;
  remove: (id: string) => void;
  /** Marca como convertido em obra (concluído + link cruzado). */
  converterEmObra: (id: string, obraId: string, obraTitulo: string) => void;
  byProperty: (propertyId: string) => MaintenanceRequest[];
  resetSeed: () => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `mnt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useMaintenanceStore = create<MaintenanceState>()(
  persist(
    (set, get) => ({
      requests: SEED,
      add: (input) => {
        const id = uid();
        const agora = new Date().toISOString();
        set((s) => ({
          requests: [
            {
              ...input,
              id,
              fotosAntes: input.fotosAntes ?? [],
              fotosDepois: input.fotosDepois ?? [],
              historico: [
                { ts: agora, texto: input.origem === "inquilino" ? "Pedido criado a partir de conversa com o inquilino." : input.origem === "preventivo" ? "Pedido criado a partir do plano preventivo." : "Pedido criado.", autor: CURRENT_USER_ID },
                ...(input.estado === "agendado" && input.dataAgendada
                  ? [{ ts: agora, texto: `Agendado para ${input.dataAgendada.slice(8, 10)}/${input.dataAgendada.slice(5, 7)}/${input.dataAgendada.slice(0, 4)}.`, autor: CURRENT_USER_ID }]
                  : []),
              ],
              createdAt: hojeISO(),
              updatedAt: hojeISO(),
            },
            ...s.requests,
          ],
        }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: hojeISO() } : r)),
        })),
      setEstado: (id, estado) =>
        set((s) => ({
          requests: s.requests.map((r) => {
            if (r.id !== id || r.estado === estado) return r;
            return {
              ...r,
              estado,
              resolvedAt: estado === "concluido" ? hojeISO() : r.resolvedAt,
              updatedAt: hojeISO(),
              historico: [
                ...r.historico,
                { ts: new Date().toISOString(), texto: `Estado: ${ESTADO_PEDIDO_LABEL[estado]}.`, autor: CURRENT_USER_ID },
              ],
            };
          }),
        })),
      log: (id, texto) =>
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id
              ? { ...r, historico: [...r.historico, { ts: new Date().toISOString(), texto, autor: CURRENT_USER_ID }] }
              : r
          ),
        })),
      remove: (id) => set((s) => ({ requests: s.requests.filter((r) => r.id !== id) })),
      converterEmObra: (id, obraId, obraTitulo) =>
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id
              ? {
                  ...r,
                  estado: "concluido" as EstadoPedido,
                  resolvedAt: hojeISO(),
                  convertidoEmObraId: obraId,
                  updatedAt: hojeISO(),
                  historico: [
                    ...r.historico,
                    { ts: new Date().toISOString(), texto: `Convertido em obra: «${obraTitulo}».`, autor: CURRENT_USER_ID },
                  ],
                }
              : r
          ),
        })),
      byProperty: (propertyId) => get().requests.filter((r) => r.propertyId === propertyId),
      resetSeed: () => set({ requests: SEED }),
    }),
    {
      name: "redegest-maintenance",
      version: 2,
      // v2: modelo completo (categoria tipada, responsabilidade, técnico do diretório,
      // fotos, histórico, origem, conversão em obra). Re-semeia mantendo pedidos do utilizador.
      migrate: (persisted: unknown, version: number) => {
        const s = (persisted ?? {}) as { requests?: MaintenanceRequest[] };
        if (version < 2) {
          const seedIds = new Set([...SEED.map((r) => r.id), "mnt-arroios-esquentador"]);
          const categoriasValidas = new Set(Object.keys(CATEGORIA_PEDIDO_LABEL));
          const doUtilizador = (s.requests ?? [])
            .filter((r) => !seedIds.has(r.id))
            .map((r) => {
              const antigo = r as Partial<MaintenanceRequest> & MaintenanceRequest;
              return {
                ...antigo,
                categoria: (categoriasValidas.has(antigo.categoria as string) ? antigo.categoria : "outros") as CategoriaPedido,
                responsabilidade: antigo.responsabilidade ?? ("senhorio" as Responsabilidade),
                origem: antigo.origem ?? ("senhorio" as OrigemPedido),
                fotosAntes: antigo.fotosAntes ?? [],
                fotosDepois: antigo.fotosDepois ?? [],
                historico: antigo.historico ?? [{ ts: `${antigo.createdAt}T09:00:00`, texto: "Pedido criado.", autor: CURRENT_USER_ID }],
                updatedAt: antigo.updatedAt ?? antigo.createdAt,
              };
            });
          s.requests = [...SEED, ...doUtilizador];
        }
        return s as MaintenanceState;
      },
    }
  )
);
