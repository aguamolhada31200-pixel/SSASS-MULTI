import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CURRENT_USER_ID } from "./useProfilesStore";

// ───────────────────────── Categorias ─────────────────────────
// (Extensão — mantém as antigas + acrescenta as da Pasta Digital.)

export type DocCategoria =
  | "Contratos"
  | "Recibos"
  | "Escrituras"
  | "CC/Documentos"
  | "Faturas"
  | "Seguros"
  | "IMI"
  | "Licenças"
  | "Plantas"
  | "Certificados"
  | "Outros";

export const DOC_CATEGORIAS: DocCategoria[] = [
  "Contratos",
  "Recibos",
  "Escrituras",
  "CC/Documentos",
  "Faturas",
  "Seguros",
  "IMI",
  "Licenças",
  "Plantas",
  "Certificados",
  "Outros",
];

/** Sugere a categoria a partir do nome do ficheiro. */
export function sugerirCategoria(nome: string): DocCategoria {
  const n = nome.toLowerCase();
  if (/recibo/.test(n)) return "Recibos";
  if (/contrato|arrend|cpcv|aditamento/.test(n)) return "Contratos";
  if (/escritur/.test(n)) return "Escrituras";
  if (/\bcc\b|cart[aã]o|cidad[aã]o|passaporte|identifica/.test(n)) return "CC/Documentos";
  if (/fatura|recibo|invoice|or[çc]amento/.test(n)) return "Faturas";
  if (/seguro|ap[oó]lice|multirrisco/.test(n)) return "Seguros";
  if (/imi|liquida[çc][aã]o/.test(n)) return "IMI";
  if (/licen[çc]a|alvar[aá]|al\b/.test(n)) return "Licenças";
  if (/planta|projeto|arquitet/.test(n)) return "Plantas";
  if (/certificad|energ[ée]tic/.test(n)) return "Certificados";
  return "Outros";
}

// ───────────────────────── Modelo ─────────────────────────

export interface PropertyDocument {
  id: string;
  nome: string;
  ficheiroUrl: string;
  mimeType: string;
  uploadedAt: string; // YYYY-MM-DD
  categoria: DocCategoria;
  // Associações
  propertyId?: string;
  tenantId?: string;
  contractId?: string;
  projectId?: string;
  obraId?: string;
  // Organização / metadados
  pasta?: string; // pasta personalizada (nome)
  tamanho?: number; // bytes
  tags?: string[];
  notas?: string;
  expiraEm?: string; // YYYY-MM-DD
  partilhadoCom?: string[];
  uploadedBy?: string;
  deletedAt?: string; // ISO — quando vai para o Lixo
}

export type DocumentInput = Omit<PropertyDocument, "id">;

// ───────────────────────── Helpers de data ─────────────────────────

function isoHoje(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Data ISO a N dias de hoje (dinâmico — para os alertas de expiração funcionarem sempre). */
function emDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function diasAte(dataIso?: string): number | null {
  if (!dataIso) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${dataIso}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

/** Documento expira nos próximos `janela` dias (e ainda não expirou há muito). */
export function expiraEmBreve(doc: PropertyDocument, janela = 30): boolean {
  const d = diasAte(doc.expiraEm);
  return d !== null && d <= janela;
}

export { diasAte as diasAteExpiracao };

/** Formata bytes → "1,2 MB". */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "—";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / Math.pow(1024, i);
  return `${v.toLocaleString("pt-PT", { maximumFractionDigits: i === 0 ? 0 : 1 })} ${u[i]}`;
}

const PDF = "application/pdf";
const PNG = "image/png";
const JPG = "image/jpeg";

// ───────────────────────── Seed ─────────────────────────

const SEED: PropertyDocument[] = [
  // ── Contratos ──
  {
    id: "seed-doc-contrato-ana",
    nome: "Contrato de arrendamento — Ana Martins.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2024-05-01",
    categoria: "Contratos",
    propertyId: "seed-arroios",
    tenantId: "tenant-ana-martins",
    contractId: "contrato-arroios",
    tamanho: 184_320,
    uploadedBy: CURRENT_USER_ID,
  },
  {
    id: "seed-doc-contrato-anterior",
    nome: "Contrato anterior T2 Arroios (2021) — expirado.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2021-06-01",
    categoria: "Contratos",
    propertyId: "seed-arroios",
    contractId: "contrato-arroios-anterior",
    tamanho: 161_200,
    notas: "Contrato anterior, substituído em 2024.",
    uploadedBy: CURRENT_USER_ID,
  },
  {
    id: "seed-doc-aditamento-anterior",
    nome: "Aditamento 1 — alteração de renda (2023).pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2023-05-15",
    categoria: "Contratos",
    propertyId: "seed-arroios",
    contractId: "contrato-arroios-anterior",
    tamanho: 48_900,
    notas: "Aditamento ao contrato anterior — atualização da renda.",
    uploadedBy: CURRENT_USER_ID,
  },
  // ── Escrituras ──
  {
    id: "seed-doc-escritura-arroios",
    nome: "Escritura de compra — T2 Arroios.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2022-04-12",
    categoria: "Escrituras",
    propertyId: "seed-arroios",
    tamanho: 512_000,
    uploadedBy: CURRENT_USER_ID,
  },
  {
    id: "seed-doc-escritura-porto",
    nome: "Escritura de compra — Studio AL Baixa.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2023-02-20",
    categoria: "Escrituras",
    propertyId: "seed-porto-al",
    tamanho: 498_700,
    uploadedBy: CURRENT_USER_ID,
  },
  // ── CC / Documentos (com expiração) ──
  {
    id: "seed-doc-cc-ana",
    nome: "Cartão de Cidadão — Ana Martins.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2024-04-28",
    categoria: "CC/Documentos",
    propertyId: "seed-arroios",
    tenantId: "tenant-ana-martins",
    expiraEm: emDias(14),
    tamanho: 92_160,
    notas: "Renovar antes do fim do contrato.",
    uploadedBy: CURRENT_USER_ID,
  },
  {
    id: "seed-doc-cc-mariana",
    nome: "Cartão de Cidadão — Mariana Costa.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2026-05-30",
    categoria: "CC/Documentos",
    propertyId: "seed-coimbra",
    tamanho: 88_400,
    uploadedBy: CURRENT_USER_ID,
  },
  // ── Faturas ──
  {
    id: "seed-doc-fatura-canalizacao",
    nome: "Fatura reparação canalização — T2 Arroios.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2026-05-18",
    categoria: "Faturas",
    propertyId: "seed-arroios",
    tamanho: 54_300,
    notas: "220 € · fuga na cozinha · com QR ATCUD.",
    uploadedBy: CURRENT_USER_ID,
  },
  {
    id: "seed-doc-fatura-pintura",
    nome: "Fatura pintura — Príncipe Real.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2026-06-02",
    categoria: "Faturas",
    projectId: "proj-principe",
    tamanho: 71_900,
    notas: "2.800 € · obra de pintura interior.",
    uploadedBy: CURRENT_USER_ID,
  },
  // ── Comprovativos de obras (despesas / pagamentos) ──
  {
    id: "seed-doc-fatura-massa",
    nome: "Fatura AKI 18-05.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2026-05-18",
    categoria: "Faturas",
    projectId: "principe-real",
    obraId: "o-principe-1",
    tamanho: 41_200,
    notas: "1.200 € · massa + lixas para preparação.",
    uploadedBy: "pedro-alves",
  },
  {
    id: "seed-doc-fatura-tinta-tetos",
    nome: "Fatura Robbialac 25-05.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2026-05-25",
    categoria: "Faturas",
    projectId: "principe-real",
    obraId: "o-principe-1",
    tamanho: 48_700,
    notas: "800 € · 20L Brancura Plus.",
    uploadedBy: "pedro-alves",
  },
  {
    id: "seed-doc-fatura-roca",
    nome: "Fatura Roca Lisboa 12-04.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2026-04-12",
    categoria: "Faturas",
    projectId: "principe-real",
    obraId: "o-principe-3",
    tamanho: 62_400,
    notas: "1.900 € · loiças sanitárias.",
    uploadedBy: "pedro-alves",
  },
  {
    id: "seed-doc-fatura-hansgrohe",
    nome: "Fatura Hansgrohe 18-04.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2026-04-18",
    categoria: "Faturas",
    projectId: "principe-real",
    obraId: "o-principe-3",
    tamanho: 33_900,
    notas: "950 € · torneiras.",
    uploadedBy: "pedro-alves",
  },
  {
    id: "seed-doc-recibo-hidro",
    nome: "Recibo Hidro Lisboa 05-05.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2026-05-05",
    categoria: "Faturas",
    projectId: "principe-real",
    obraId: "o-principe-3",
    tamanho: 28_500,
    notas: "850 € · mão de obra WC.",
    uploadedBy: "pedro-alves",
  },
  {
    id: "seed-doc-transf-canalizacao",
    nome: "Transferência Millennium 15-04.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2026-04-15",
    categoria: "Faturas",
    projectId: "porto-flip",
    obraId: "o-porto-2",
    tamanho: 18_700,
    notas: "2.400 € · adjudicação canalização → Hidroplan Porto.",
    uploadedBy: CURRENT_USER_ID,
  },
  // ── Seguros (com expiração) ──
  {
    id: "seed-doc-seguro-arroios",
    nome: "Apólice multirriscos — T2 Arroios.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2025-03-15",
    categoria: "Seguros",
    propertyId: "seed-arroios",
    expiraEm: emDias(22),
    tamanho: 138_000,
    uploadedBy: CURRENT_USER_ID,
  },
  {
    id: "seed-doc-seguro-porto",
    nome: "Apólice multirriscos — Studio AL Baixa.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2026-01-10",
    categoria: "Seguros",
    propertyId: "seed-porto-al",
    expiraEm: emDias(210),
    tamanho: 129_500,
    uploadedBy: CURRENT_USER_ID,
  },
  // ── IMI ──
  {
    id: "seed-doc-imi-arroios",
    nome: "Nota de liquidação IMI 2025 — T2 Arroios.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2026-04-30",
    categoria: "IMI",
    propertyId: "seed-arroios",
    tamanho: 41_000,
    uploadedBy: CURRENT_USER_ID,
  },
  {
    id: "seed-doc-imi-porto",
    nome: "Nota de liquidação IMI 2025 — Studio AL Baixa.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2026-04-30",
    categoria: "IMI",
    propertyId: "seed-porto-al",
    tamanho: 39_500,
    uploadedBy: CURRENT_USER_ID,
  },
  {
    id: "seed-doc-imi-coimbra",
    nome: "Nota de liquidação IMI 2025 — T3 Coimbra.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2026-04-30",
    categoria: "IMI",
    propertyId: "seed-coimbra",
    tamanho: 40_100,
    uploadedBy: CURRENT_USER_ID,
  },
  // ── Plantas ──
  {
    id: "seed-doc-planta-arroios",
    nome: "Planta do apartamento — T2 Arroios.png",
    ficheiroUrl:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=70",
    mimeType: PNG,
    uploadedAt: "2022-04-12",
    categoria: "Plantas",
    propertyId: "seed-arroios",
    tamanho: 220_000,
    uploadedBy: CURRENT_USER_ID,
  },
  {
    id: "seed-doc-planta-coimbra",
    nome: "Planta do apartamento — T3 Coimbra.png",
    ficheiroUrl:
      "https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=1200&q=70",
    mimeType: PNG,
    uploadedAt: "2026-04-15",
    categoria: "Plantas",
    propertyId: "seed-coimbra",
    tamanho: 198_000,
    uploadedBy: CURRENT_USER_ID,
  },
  // ── Licenças ──
  {
    id: "seed-doc-licenca-al",
    nome: "Registo de Alojamento Local — Studio Porto.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2023-03-01",
    categoria: "Licenças",
    propertyId: "seed-porto-al",
    tamanho: 67_000,
    uploadedBy: CURRENT_USER_ID,
  },
  // ── Certificados ──
  {
    id: "seed-doc-cert-arroios",
    nome: "Certificado energético (C) — T2 Arroios.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2022-03-20",
    categoria: "Certificados",
    propertyId: "seed-arroios",
    tamanho: 156_000,
    uploadedBy: CURRENT_USER_ID,
  },
  {
    id: "seed-doc-cert-coimbra",
    nome: "Certificado energético (D) — T3 Coimbra.pdf",
    ficheiroUrl: "#",
    mimeType: PDF,
    uploadedAt: "2026-04-18",
    categoria: "Certificados",
    propertyId: "seed-coimbra",
    tamanho: 151_000,
    uploadedBy: CURRENT_USER_ID,
  },
];

/** Prefixos de ids de seeds antigos (v1) — substituídos pela migração. */
const OLD_SEED_PREFIX = "doc-arroios";

// ───────────────────────── Store ─────────────────────────

interface DocumentsState {
  documents: PropertyDocument[];
  customFolders: string[];
  // CRUD base (compatível com versões anteriores)
  add: (input: DocumentInput) => string;
  update: (id: string, patch: Partial<PropertyDocument>) => void;
  remove: (id: string) => void; // hard delete (usado por outras secções)
  rename: (id: string, nome: string) => void;
  byProperty: (propertyId: string) => PropertyDocument[];
  resetSeed: () => void;
  // Lixo (soft delete)
  trash: (id: string) => void;
  restore: (id: string) => void;
  // Organização
  move: (id: string, pasta: string | undefined) => void;
  setCategoria: (id: string, categoria: DocCategoria) => void;
  associate: (
    id: string,
    assoc: Pick<PropertyDocument, "propertyId" | "tenantId" | "contractId" | "projectId" | "obraId">
  ) => void;
  // Pastas personalizadas
  addFolder: (nome: string) => void;
  removeFolder: (nome: string) => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useDocumentsStore = create<DocumentsState>()(
  persist(
    (set, get) => ({
      documents: SEED,
      customFolders: [],
      add: (input) => {
        const id = uid();
        set((s) => ({
          documents: [{ uploadedBy: CURRENT_USER_ID, ...input, id }, ...s.documents],
        }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      remove: (id) => set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
      rename: (id, nome) =>
        set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, nome } : d)) })),
      byProperty: (propertyId) => get().documents.filter((d) => d.propertyId === propertyId),
      resetSeed: () => set({ documents: SEED, customFolders: [] }),
      trash: (id) =>
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, deletedAt: new Date().toISOString() } : d
          ),
        })),
      restore: (id) =>
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, deletedAt: undefined } : d
          ),
        })),
      move: (id, pasta) =>
        set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, pasta } : d)) })),
      setCategoria: (id, categoria) =>
        set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, categoria } : d)) })),
      associate: (id, assoc) =>
        set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, ...assoc } : d)) })),
      addFolder: (nome) =>
        set((s) =>
          s.customFolders.includes(nome) ? s : { customFolders: [...s.customFolders, nome] }
        ),
      removeFolder: (nome) =>
        set((s) => ({ customFolders: s.customFolders.filter((f) => f !== nome) })),
    }),
    {
      name: "decogest-documents",
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as Partial<DocumentsState>;
        if (version < 4) {
          // Mantém documentos do utilizador; substitui os seeds (antigos e atuais) pelos atualizados.
          const userDocs = (state.documents ?? []).filter(
            (d) => !d.id.startsWith(OLD_SEED_PREFIX) && !d.id.startsWith("seed-doc-")
          );
          return {
            ...state,
            documents: [...SEED, ...userDocs],
            customFolders: state.customFolders ?? [],
          } as DocumentsState;
        }
        return state as DocumentsState;
      },
    }
  )
);
