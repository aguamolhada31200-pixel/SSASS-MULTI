import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Prioridade = "urgente" | "alta" | "normal" | "baixa";
export type EstadoPedido =
  | "aberto"
  | "em_curso"
  | "aguarda_pecas"
  | "concluido"
  | "cancelado";

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  urgente: "Urgente",
  alta: "Alta",
  normal: "Normal",
  baixa: "Baixa",
};

export const ESTADO_PEDIDO_LABEL: Record<EstadoPedido, string> = {
  aberto: "Aberto",
  em_curso: "Em curso",
  aguarda_pecas: "Aguarda peças",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: Prioridade;
  estado: EstadoPedido;
  tecnicoNome?: string;
  tecnicoContacto?: string;
  custoEstimado?: number;
  custoFinal?: number;
  createdAt: string; // YYYY-MM-DD
  resolvedAt?: string;
}

export type MaintenanceInput = Omit<MaintenanceRequest, "id" | "createdAt">;

const SEED: MaintenanceRequest[] = [
  {
    id: "mnt-arroios-esquentador",
    propertyId: "seed-arroios",
    titulo: "Esquentador a falhar",
    descricao: "Esquentador deixa de aquecer água a meio do duche. Inquilina reportou que acontece sobretudo de manhã.",
    categoria: "Canalização/AQS",
    prioridade: "alta",
    estado: "em_curso",
    tecnicoNome: "João Silva",
    tecnicoContacto: "912 345 678",
    custoEstimado: 180,
    createdAt: "2026-06-08",
  },
];

interface MaintenanceState {
  requests: MaintenanceRequest[];
  add: (input: MaintenanceInput) => string;
  update: (id: string, patch: Partial<MaintenanceRequest>) => void;
  remove: (id: string) => void;
  byProperty: (propertyId: string) => MaintenanceRequest[];
  resetSeed: () => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `mnt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useMaintenanceStore = create<MaintenanceState>()(
  persist(
    (set, get) => ({
      requests: SEED,
      add: (input) => {
        const id = uid();
        set((s) => ({
          requests: [{ ...input, id, createdAt: new Date().toISOString().slice(0, 10) }, ...s.requests],
        }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({ requests: s.requests.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      remove: (id) => set((s) => ({ requests: s.requests.filter((r) => r.id !== id) })),
      byProperty: (propertyId) => get().requests.filter((r) => r.propertyId === propertyId),
      resetSeed: () => set({ requests: SEED }),
    }),
    { name: "decogest-maintenance", version: 1 }
  )
);
