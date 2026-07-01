import { create } from "zustand";
import { persist } from "zustand/middleware";

// ───────────────────────── Tipos ─────────────────────────

export type ContractTipo =
  | "tradicional"
  | "estudante"
  | "trabalhador"
  | "casal"
  | "sazonal"
  | "comercial"
  | "outro";

export type ContractStatus =
  | "draft"
  | "pending_signature"
  | "active"
  | "expiring"
  | "expired"
  | "terminated";

export interface GuarantorData {
  nome: string;
  nif: string;
  morada: string;
  rendimento: number;
}

export interface Contract {
  id: string;
  tipo: ContractTipo;
  status: ContractStatus;
  propertyId?: string;
  imovelLabel?: string;
  primaryTenantId?: string;
  inquilinoLabel?: string;
  additionalTenants: string[];
  guarantorData?: GuarantorData;
  startDate: string;
  endDate: string;
  durationMonths: number;
  autoRenewal: boolean;
  renewalPeriodMonths: number;
  monthlyRent: number;
  paymentDay: number;
  annualUpdate: boolean;
  depositAmount: number;
  furnished: boolean;
  notas?: string;
  // Documento carregado pelo senhorio (a app organiza, não gera)
  pdfUrl?: string; // data URL ou "#" para exemplos
  fileName?: string;
  documentId?: string; // entrada correspondente na Pasta Digital
  signedAt?: string;
  terminatedAt?: string;
  terminationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContractInput = Omit<Contract, "id" | "createdAt" | "updatedAt">;

// ───────────────────────── Labels ─────────────────────────

export const TIPO_LABEL: Record<ContractTipo, string> = {
  tradicional: "Tradicional",
  estudante: "Estudante",
  trabalhador: "Trabalhador deslocado",
  casal: "Casal",
  sazonal: "Sazonal",
  comercial: "Comercial",
  outro: "Outro",
};

export const TIPO_OPCOES: ContractTipo[] = ["tradicional", "estudante", "trabalhador", "casal", "sazonal", "comercial", "outro"];

export const STATUS_LABEL: Record<ContractStatus, string> = {
  draft: "Rascunho",
  pending_signature: "Pendente de assinatura",
  active: "Ativo",
  expiring: "A expirar",
  expired: "Expirado",
  terminated: "Terminado",
};

export const LANDLORD_DEFAULT = {
  nome: "",
  nif: "",
  morada: "",
  iban: "",
};

// ───────────────────────── Helpers de data ─────────────────────────

export function diasAteFim(endDate?: string): number | null {
  if (!endDate) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(`${endDate}T00:00:00`);
  return Math.round((fim.getTime() - hoje.getTime()) / 86400000);
}

/** Status efetivo: deriva 'expiring'/'expired' das datas quando o contrato está ativo. */
export function statusEfetivo(c: Contract): ContractStatus {
  if (c.status === "draft" || c.status === "pending_signature" || c.status === "terminated") return c.status;
  const d = diasAteFim(c.endDate);
  if (d === null) return c.status;
  if (d < 0) return "expired";
  if (d <= 90) return "expiring";
  return "active";
}

export function progressoTemporal(c: Contract): number {
  const ini = new Date(`${c.startDate}T00:00:00`).getTime();
  const fim = new Date(`${c.endDate}T00:00:00`).getTime();
  const agora = Date.now();
  if (!isFinite(ini) || !isFinite(fim) || fim <= ini) return 0;
  return Math.max(0, Math.min(1, (agora - ini) / (fim - ini)));
}

export interface ProximaAcao {
  label: string;
  dataIso: string;
  tom: "info" | "warning" | "danger";
}

export function proximasAcoes(c: Contract): ProximaAcao[] {
  const out: ProximaAcao[] = [];
  const d = diasAteFim(c.endDate);
  if (c.status !== "terminated" && d !== null && d >= 0) {
    out.push({
      label: c.autoRenewal ? "Renovação automática" : "Renovar ou denunciar contrato",
      dataIso: c.endDate,
      tom: d <= 30 ? "danger" : d <= 90 ? "warning" : "info",
    });
  }
  if (c.annualUpdate && c.startDate) {
    const ini = new Date(`${c.startDate}T00:00:00`);
    const prox = new Date(ini);
    prox.setFullYear(new Date().getFullYear());
    if (prox.getTime() < Date.now()) prox.setFullYear(prox.getFullYear() + 1);
    out.push({ label: "Atualização anual da renda (IPC)", dataIso: prox.toISOString().slice(0, 10), tom: "info" });
  }
  if (c.status !== "terminated" && d !== null && d >= 0 && d <= 90) {
    const vist = new Date(`${c.endDate}T00:00:00`);
    vist.setDate(vist.getDate() - 15);
    out.push({ label: "Agendar vistoria de saída", dataIso: vist.toISOString().slice(0, 10), tom: "warning" });
  }
  return out;
}

// ───────────────────────── Seed ─────────────────────────

function build(p: Partial<Contract> & { id: string; tipo: ContractTipo; status: ContractStatus }): Contract {
  const start = p.startDate ?? "2024-01-01";
  const end = p.endDate ?? "2025-01-01";
  return {
    additionalTenants: [],
    startDate: start,
    endDate: end,
    durationMonths: p.durationMonths ?? 12,
    autoRenewal: p.autoRenewal ?? false,
    renewalPeriodMonths: p.renewalPeriodMonths ?? 12,
    monthlyRent: p.monthlyRent ?? 0,
    paymentDay: p.paymentDay ?? 8,
    annualUpdate: p.annualUpdate ?? true,
    depositAmount: p.depositAmount ?? 0,
    furnished: p.furnished ?? false,
    createdAt: p.createdAt ?? `${start}T09:00:00.000Z`,
    updatedAt: p.updatedAt ?? `${start}T09:00:00.000Z`,
    ...p,
  } as Contract;
}

const SEED: Contract[] = [
  build({
    id: "contrato-arroios",
    tipo: "tradicional",
    status: "active",
    propertyId: "seed-arroios",
    primaryTenantId: "tenant-ana-martins",
    monthlyRent: 1350,
    paymentDay: 5,
    startDate: "2024-05-01",
    endDate: "2027-04-30",
    durationMonths: 36,
    autoRenewal: true,
    depositAmount: 2700,
    furnished: true,
    pdfUrl: "#",
    fileName: "contrato-arroios-ana-martins.pdf",
    documentId: "seed-doc-contrato-ana",
  }),
  build({
    id: "contrato-porto",
    tipo: "trabalhador",
    status: "active",
    propertyId: "seed-porto-al",
    primaryTenantId: "tenant-tiago-nunes",
    monthlyRent: 1100,
    paymentDay: 5,
    startDate: "2025-04-01",
    endDate: "2026-07-15",
    durationMonths: 15,
    autoRenewal: false,
    annualUpdate: false,
    depositAmount: 1100,
    furnished: true,
    pdfUrl: "#",
    fileName: "contrato-studio-porto.pdf",
  }),
  build({
    id: "contrato-coimbra-ines",
    tipo: "estudante",
    status: "pending_signature",
    propertyId: "seed-coimbra",
    primaryTenantId: "tenant-ines-marques",
    monthlyRent: 380,
    paymentDay: 8,
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    durationMonths: 10,
    autoRenewal: false,
    annualUpdate: false,
    depositAmount: 760,
    furnished: true,
    pdfUrl: "#",
    fileName: "contrato-coimbra-mariana.pdf",
  }),
  build({
    id: "contrato-arroios-anterior",
    tipo: "tradicional",
    status: "expired",
    propertyId: "seed-arroios",
    primaryTenantId: "tenant-rita-soares",
    monthlyRent: 850,
    paymentDay: 1,
    startDate: "2021-06-01",
    endDate: "2024-03-31",
    durationMonths: 34,
    autoRenewal: false,
    annualUpdate: true,
    depositAmount: 1700,
    furnished: false,
    pdfUrl: "#",
    fileName: "contrato-anterior-arroios-2021.pdf",
    documentId: "seed-doc-contrato-anterior",
  }),
  build({
    id: "contrato-braga-comercial",
    tipo: "comercial",
    status: "active",
    imovelLabel: "Loja — Braga, centro histórico",
    inquilinoLabel: "Padaria Trindade, Lda. (NIF 514 998 220)",
    monthlyRent: 1920,
    paymentDay: 8,
    startDate: "2023-01-01",
    endDate: "2028-01-01",
    durationMonths: 60,
    autoRenewal: true,
    renewalPeriodMonths: 12,
    annualUpdate: true,
    depositAmount: 3840,
    furnished: false,
    guarantorData: { nome: "Joaquim Trindade", nif: "198445221", morada: "Rua do Souto 90, 4700-328 Braga", rendimento: 2600 },
    pdfUrl: "#",
    fileName: "contrato-loja-braga.pdf",
  }),
];

// ───────────────────────── Store ─────────────────────────

interface ContractsState {
  contracts: Contract[];
  add: (input: ContractInput) => string;
  update: (id: string, patch: Partial<Contract>) => void;
  remove: (id: string) => void;
  getById: (id: string) => Contract | undefined;
  byProperty: (propertyId: string) => Contract[];
  byTenant: (tenantId: string) => Contract[];
  terminate: (id: string, motivo: string, data?: string) => void;
  resetSeed: () => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `ct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useContractsStore = create<ContractsState>()(
  persist(
    (set, get) => ({
      contracts: SEED,
      add: (input) => {
        const id = uid();
        const now = new Date().toISOString();
        const contract: Contract = { ...input, id, createdAt: now, updatedAt: now };
        set((s) => ({ contracts: [contract, ...s.contracts] }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({
          contracts: s.contracts.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)),
        })),
      remove: (id) => set((s) => ({ contracts: s.contracts.filter((c) => c.id !== id) })),
      getById: (id) => get().contracts.find((c) => c.id === id),
      byProperty: (propertyId) => get().contracts.filter((c) => c.propertyId === propertyId),
      byTenant: (tenantId) =>
        get().contracts.filter((c) => c.primaryTenantId === tenantId || c.additionalTenants.includes(tenantId)),
      terminate: (id, motivo, data) =>
        set((s) => ({
          contracts: s.contracts.map((c) =>
            c.id === id
              ? { ...c, status: "terminated", terminatedAt: data ?? new Date().toISOString().slice(0, 10), terminationReason: motivo, updatedAt: new Date().toISOString() }
              : c
          ),
        })),
      resetSeed: () => set({ contracts: SEED }),
    }),
    { name: "decogest-contracts", version: 2 }
  )
);
