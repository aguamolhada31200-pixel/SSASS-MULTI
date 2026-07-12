import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TipoMov = "receita" | "despesa";
export type Periodicidade = "mensal" | "trimestral" | "anual";

export const CATEGORIAS_DESPESA = [
  "IMI",
  "Seguro",
  "Condomínio",
  "Manutenção/Reparações",
  "Obras",
  "Água/Luz/Gás",
  "Comissão de gestão",
  "Juros do crédito",
  "Contabilista",
  "Outros",
] as const;

// "Receita AL" separada de "Renda": alojamento local é categoria B (atividade),
// não rendimento predial cat. F — não podem ir ao mesmo saco no IRS.
export const CATEGORIAS_RECEITA = ["Renda", "Receita AL", "Caução", "Outros"] as const;

export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number];
export type CategoriaReceita = (typeof CATEGORIAS_RECEITA)[number];
export type Categoria = CategoriaDespesa | CategoriaReceita;

export function categoriasPara(tipo: TipoMov): readonly string[] {
  return tipo === "despesa" ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA;
}

export interface Transaction {
  id: string;
  tipo: TipoMov;
  propertyId: string;
  categoria: string;
  valor: number;
  data: string; // YYYY-MM-DD
  descricao: string;
  reciboUrl?: string;
  recorrente: boolean;
  periodicidade?: Periodicidade;
  deduzivelIrs: boolean;
  notas?: string;
  createdAt: string;
}

export type TransactionInput = Omit<Transaction, "id" | "createdAt">;

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Seed espalhado por Jan–Jun 2026 nos 3 imóveis do seed ──
function makeId(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return `seed-tx-${Math.abs(h).toString(36)}`;
}

function tx(p: {
  tipo: TipoMov;
  propertyId: string;
  categoria: string;
  valor: number;
  data: string;
  descricao: string;
  recorrente?: boolean;
  periodicidade?: Periodicidade;
  deduzivelIrs?: boolean;
}): Transaction {
  return {
    id: makeId(`${p.propertyId}-${p.data}-${p.categoria}-${p.valor}`),
    tipo: p.tipo,
    propertyId: p.propertyId,
    categoria: p.categoria,
    valor: p.valor,
    data: p.data,
    descricao: p.descricao,
    recorrente: p.recorrente ?? false,
    periodicidade: p.periodicidade,
    deduzivelIrs: p.deduzivelIrs ?? false,
    createdAt: `${p.data}T08:00:00.000Z`,
  };
}

function buildSeed(): Transaction[] {
  const out: Transaction[] = [];
  const MESES = ["01", "02", "03", "04", "05", "06"];

  // T2 Arroios — Lisboa, ocupado
  for (const m of MESES) {
    out.push(
      tx({
        tipo: "receita",
        propertyId: "seed-arroios",
        categoria: "Renda",
        valor: 1350,
        data: `2026-${m}-05`,
        descricao: "Renda mensal · Inquilino",
        recorrente: true,
        periodicidade: "mensal",
      })
    );
    out.push(
      tx({
        tipo: "despesa",
        propertyId: "seed-arroios",
        categoria: "Condomínio",
        valor: 45,
        data: `2026-${m}-10`,
        descricao: "Quota de condomínio",
        recorrente: true,
        periodicidade: "mensal",
        deduzivelIrs: true,
      })
    );
  }
  out.push(
    tx({
      tipo: "despesa",
      propertyId: "seed-arroios",
      categoria: "IMI",
      valor: 320,
      data: "2026-05-31",
      descricao: "IMI 2025 · 1.ª prestação",
      deduzivelIrs: true,
    })
  );
  out.push(
    tx({
      tipo: "despesa",
      propertyId: "seed-arroios",
      categoria: "Seguro",
      valor: 180,
      data: "2026-03-15",
      descricao: "Seguro multirriscos · anual",
      deduzivelIrs: true,
    })
  );
  out.push(
    tx({
      tipo: "despesa",
      propertyId: "seed-arroios",
      categoria: "Manutenção/Reparações",
      valor: 220,
      data: "2026-05-18",
      descricao: "Reparação canalização — fuga na cozinha",
      deduzivelIrs: true,
    })
  );

  // Studio AL Porto — ocupado
  for (const m of MESES) {
    out.push(
      tx({
        tipo: "receita",
        propertyId: "seed-porto-al",
        categoria: "Receita AL",
        valor: 1100,
        data: `2026-${m}-05`,
        descricao: "Receita AL · mensal",
        recorrente: true,
        periodicidade: "mensal",
      })
    );
    out.push(
      tx({
        tipo: "despesa",
        propertyId: "seed-porto-al",
        categoria: "Condomínio",
        valor: 35,
        data: `2026-${m}-10`,
        descricao: "Quota de condomínio",
        recorrente: true,
        periodicidade: "mensal",
        deduzivelIrs: true,
      })
    );
  }
  out.push(
    tx({
      tipo: "despesa",
      propertyId: "seed-porto-al",
      categoria: "IMI",
      valor: 200,
      data: "2026-05-30",
      descricao: "IMI 2025 · 1.ª prestação",
      deduzivelIrs: true,
    })
  );
  out.push(
    tx({
      tipo: "despesa",
      propertyId: "seed-porto-al",
      categoria: "Outros",
      valor: 60,
      data: "2026-04-22",
      descricao: "Limpeza profissional entre hóspedes",
      deduzivelIrs: true,
    })
  );

  // Apartamento Príncipe Real — projeto colaborativo #003, arrendado (renda 1.850)
  for (const m of MESES) {
    out.push(
      tx({
        tipo: "receita",
        propertyId: "seed-principe-real",
        categoria: "Renda",
        valor: 1850,
        data: `2026-${m}-08`,
        descricao: "Renda mensal · Sofia Rocha",
        recorrente: true,
        periodicidade: "mensal",
      })
    );
    out.push(
      tx({
        tipo: "despesa",
        propertyId: "seed-principe-real",
        categoria: "Condomínio",
        valor: 80,
        data: `2026-${m}-10`,
        descricao: "Quota de condomínio",
        recorrente: true,
        periodicidade: "mensal",
        deduzivelIrs: true,
      })
    );
  }
  out.push(
    tx({
      tipo: "despesa",
      propertyId: "seed-principe-real",
      categoria: "IMI",
      valor: 420,
      data: "2026-05-31",
      descricao: "IMI 2025 · 1.ª prestação",
      deduzivelIrs: true,
    })
  );
  out.push(
    tx({
      tipo: "despesa",
      propertyId: "seed-principe-real",
      categoria: "Seguro",
      valor: 220,
      data: "2026-03-14",
      descricao: "Seguro multirriscos · anual",
      deduzivelIrs: true,
    })
  );
  out.push(
    tx({
      tipo: "despesa",
      propertyId: "seed-principe-real",
      categoria: "Obras",
      valor: 2800,
      data: "2026-06-02",
      descricao: "Pintura interior — obra partilhada",
      deduzivelIrs: true,
    })
  );

  // T3 Coimbra — vago
  for (const m of MESES) {
    out.push(
      tx({
        tipo: "despesa",
        propertyId: "seed-coimbra",
        categoria: "Condomínio",
        valor: 50,
        data: `2026-${m}-10`,
        descricao: "Quota de condomínio",
        recorrente: true,
        periodicidade: "mensal",
        deduzivelIrs: true,
      })
    );
  }
  out.push(
    tx({
      tipo: "despesa",
      propertyId: "seed-coimbra",
      categoria: "IMI",
      valor: 280,
      data: "2026-05-30",
      descricao: "IMI 2025 · 1.ª prestação",
      deduzivelIrs: true,
    })
  );
  out.push(
    tx({
      tipo: "despesa",
      propertyId: "seed-coimbra",
      categoria: "Seguro",
      valor: 170,
      data: "2026-02-12",
      descricao: "Seguro multirriscos · anual",
      deduzivelIrs: true,
    })
  );

  return out.sort((a, b) => (a.data < b.data ? 1 : -1));
}

const SEED = buildSeed();

interface TransactionsState {
  transactions: Transaction[];
  add: (input: TransactionInput) => string;
  update: (id: string, patch: Partial<Transaction>) => void;
  remove: (id: string) => void;
  getById: (id: string) => Transaction | undefined;
  resetSeed: () => void;
}

export const useTransactionsStore = create<TransactionsState>()(
  persist(
    (set, get) => ({
      transactions: SEED,
      add: (input) => {
        const id = uid();
        const transaction: Transaction = {
          ...input,
          id,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ transactions: [transaction, ...s.transactions] }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      remove: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),
      getById: (id) => get().transactions.find((t) => t.id === id),
      resetSeed: () => set({ transactions: SEED }),
    }),
    {
      name: "redegest-transactions",
      version: 3,
      // v2: movimentos do Príncipe Real (rendas + despesas). Ids determinísticos → merge idempotente.
      // v3: receitas do Studio AL passam de "Renda" para "Receita AL" (cat. B ≠ cat. F).
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as { transactions?: Transaction[] };
        if (state.transactions && version < 2) {
          const presentes = new Set(state.transactions.map((t) => t.id));
          SEED.forEach((s) => { if (!presentes.has(s.id)) state.transactions!.push(s); });
        }
        if (state.transactions && version < 3) {
          state.transactions = state.transactions.map((t) =>
            t.propertyId === "seed-porto-al" && t.tipo === "receita" && t.categoria === "Renda"
              ? { ...t, categoria: "Receita AL" }
              : t
          );
        }
        return state as TransactionsState;
      },
    }
  )
);
