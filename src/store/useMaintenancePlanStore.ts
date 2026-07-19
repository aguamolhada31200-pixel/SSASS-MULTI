import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Property } from "./usePropertiesStore";

// ─────────────────────────────────────────────────────────────────
// PLANO PREVENTIVO — obrigações legais e revisões periódicas por imóvel.
// O diferenciador para o senhorio profissional PT: caldeira, gás, extintor
// (AL), certificado energético… com estado derivado (em dia / a vencer /
// vencida) e histórico de execuções.
// ─────────────────────────────────────────────────────────────────

export type CategoriaPlano =
  | "caldeira"
  | "ac"
  | "extintor"
  | "detetor_co"
  | "certificado_energetico"
  | "chamine"
  | "inspecao_gas"
  | "inspecao_eletrica"
  | "vistoria_al"
  | "limpeza_condutas"
  | "outros";

export type PeriodicidadePlano =
  | "mensal"
  | "trimestral"
  | "semestral"
  | "anual"
  | "bienal"
  | "6_anos"
  | "10_anos";

export type EstadoPlano = "em_dia" | "a_vencer" | "vencida";

export const CATEGORIA_PLANO_LABEL: Record<CategoriaPlano, string> = {
  caldeira: "Caldeira / esquentador",
  ac: "Ar condicionado",
  extintor: "Extintor",
  detetor_co: "Detetor de CO / fumo",
  certificado_energetico: "Certificado energético",
  chamine: "Limpeza de chaminé",
  inspecao_gas: "Inspeção da instalação de gás",
  inspecao_eletrica: "Inspeção da instalação elétrica",
  vistoria_al: "Vistoria AL",
  limpeza_condutas: "Limpeza de condutas/exaustão",
  outros: "Outra tarefa",
};

export const PERIODICIDADE_LABEL: Record<PeriodicidadePlano, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  bienal: "2 em 2 anos",
  "6_anos": "6 em 6 anos",
  "10_anos": "10 em 10 anos",
};

export const ESTADO_PLANO_LABEL: Record<EstadoPlano, string> = {
  em_dia: "Em dia",
  a_vencer: "A vencer",
  vencida: "Vencida",
};

export interface ExecucaoPlano {
  data: string; // YYYY-MM-DD
  custo?: number;
  tecnicoNome?: string;
  observacoes?: string;
  documentId?: string;
}

export interface PlanTask {
  id: string;
  propertyId: string;
  titulo: string;
  categoria: CategoriaPlano;
  periodicidade: PeriodicidadePlano;
  ultimaExecucao?: string; // YYYY-MM-DD
  proximaExecucao: string; // YYYY-MM-DD
  obrigatoriaLegal: boolean;
  notaLegal?: string;
  tecnicoId?: string;
  custoTipico?: number;
  lembreteAntecedenciaDias: number;
  historico: ExecucaoPlano[];
}

export type PlanTaskInput = Omit<PlanTask, "id" | "historico" | "lembreteAntecedenciaDias"> & {
  lembreteAntecedenciaDias?: number;
};

// ───────────────────── Derivações ─────────────────────

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** proximaExecucao = data + periodicidade. */
export function somarPeriodicidade(dataISO: string, p: PeriodicidadePlano): string {
  const d = new Date(`${dataISO}T00:00:00`);
  if (p === "mensal") d.setMonth(d.getMonth() + 1);
  else if (p === "trimestral") d.setMonth(d.getMonth() + 3);
  else if (p === "semestral") d.setMonth(d.getMonth() + 6);
  else if (p === "anual") d.setFullYear(d.getFullYear() + 1);
  else if (p === "bienal") d.setFullYear(d.getFullYear() + 2);
  else if (p === "6_anos") d.setFullYear(d.getFullYear() + 6);
  else d.setFullYear(d.getFullYear() + 10);
  return d.toISOString().slice(0, 10);
}

/** Estado derivado: vencida < hoje · a vencer ≤ hoje+antecedência · senão em dia. */
export function estadoPlano(t: PlanTask): EstadoPlano {
  const hoje = hojeISO();
  if (t.proximaExecucao < hoje) return "vencida";
  const limite = new Date(`${hoje}T00:00:00`);
  limite.setDate(limite.getDate() + (t.lembreteAntecedenciaDias || 14));
  if (t.proximaExecucao <= limite.toISOString().slice(0, 10)) return "a_vencer";
  return "em_dia";
}

export function diasParaExecucao(t: PlanTask): number {
  const alvo = new Date(`${t.proximaExecucao}T00:00:00`).getTime();
  const hoje = new Date(`${hojeISO()}T00:00:00`).getTime();
  return Math.round((alvo - hoje) / 86400000);
}

// ───────────────────── Templates recomendados (PT) ─────────────────────

interface TemplatePlano {
  categoria: CategoriaPlano;
  titulo: string;
  periodicidade: PeriodicidadePlano;
  obrigatoriaLegal: boolean;
  notaLegal?: string;
  custoTipico?: number;
  /** Só para imóveis AL. */
  soAL?: boolean;
  /** Só para moradias (chaminé/lareira). */
  soMoradia?: boolean;
}

export const TEMPLATES_PLANO: TemplatePlano[] = [
  { categoria: "caldeira", titulo: "Caldeira / esquentador a gás", periodicidade: "anual", obrigatoriaLegal: true, notaLegal: "Manutenção anual obrigatória de aparelhos a gás.", custoTipico: 90 },
  { categoria: "inspecao_gas", titulo: "Inspeção da instalação de gás", periodicidade: "bienal", obrigatoriaLegal: true, notaLegal: "Inspeção periódica obrigatória da instalação de gás.", custoTipico: 65 },
  { categoria: "inspecao_eletrica", titulo: "Inspeção da instalação elétrica", periodicidade: "6_anos", obrigatoriaLegal: false, custoTipico: 120 },
  { categoria: "detetor_co", titulo: "Detetor de CO / fumo", periodicidade: "anual", obrigatoriaLegal: false, custoTipico: 25 },
  { categoria: "extintor", titulo: "Extintor (obrigatório em AL)", periodicidade: "anual", obrigatoriaLegal: true, notaLegal: "Alojamento Local: extintor com manutenção anual válida.", custoTipico: 35, soAL: true },
  { categoria: "vistoria_al", titulo: "Vistoria AL", periodicidade: "bienal", obrigatoriaLegal: true, notaLegal: "Conforme a licença de Alojamento Local.", soAL: true },
  { categoria: "ac", titulo: "Ar condicionado (limpeza/recarga)", periodicidade: "anual", obrigatoriaLegal: false, custoTipico: 80 },
  { categoria: "chamine", titulo: "Limpeza de chaminé", periodicidade: "anual", obrigatoriaLegal: false, custoTipico: 70, soMoradia: true },
  { categoria: "limpeza_condutas", titulo: "Limpeza de condutas/exaustão", periodicidade: "anual", obrigatoriaLegal: false, custoTipico: 60 },
  { categoria: "certificado_energetico", titulo: "Certificado energético", periodicidade: "10_anos", obrigatoriaLegal: true, notaLegal: "Obrigatório para arrendar; validade de 10 anos.", custoTipico: 200 },
];

/** Templates aplicáveis a um imóvel (AL mostra extintor/vistoria; chaminé só moradia). */
export function templatesPara(p: Property): TemplatePlano[] {
  const isAL = p.type === "al" || p.tipoRendaProposto === "al";
  const isMoradia = (p.tipoImovel ?? "").startsWith("moradia");
  return TEMPLATES_PLANO.filter((t) => (!t.soAL || isAL) && (!t.soMoradia || isMoradia));
}

// ───────────────────── Seeds ─────────────────────

const SEED: PlanTask[] = [
  // T2 Arroios — tudo em dia
  { id: "plan-arroios-caldeira", propertyId: "seed-arroios", titulo: "Caldeira / esquentador a gás", categoria: "caldeira", periodicidade: "anual", ultimaExecucao: "2025-09-12", proximaExecucao: "2026-09-12", obrigatoriaLegal: true, notaLegal: "Manutenção anual obrigatória de aparelhos a gás.", tecnicoId: "tec-joao-silva", custoTipico: 90, lembreteAntecedenciaDias: 14, historico: [{ data: "2025-09-12", custo: 85, tecnicoNome: "João Silva", observacoes: "Revisão anual sem anomalias." }] },
  { id: "plan-arroios-co", propertyId: "seed-arroios", titulo: "Detetor de CO / fumo", categoria: "detetor_co", periodicidade: "anual", ultimaExecucao: "2026-03-03", proximaExecucao: "2027-03-03", obrigatoriaLegal: false, custoTipico: 25, lembreteAntecedenciaDias: 14, historico: [{ data: "2026-03-03", custo: 0, observacoes: "Teste OK, pilhas substituídas." }] },
  { id: "plan-arroios-gas", propertyId: "seed-arroios", titulo: "Inspeção da instalação de gás", categoria: "inspecao_gas", periodicidade: "bienal", ultimaExecucao: "2025-06-01", proximaExecucao: "2027-06-01", obrigatoriaLegal: true, notaLegal: "Inspeção periódica obrigatória da instalação de gás.", custoTipico: 65, lembreteAntecedenciaDias: 14, historico: [{ data: "2025-06-01", custo: 62, tecnicoNome: "João Silva" }] },

  // Studio AL Porto — extintor a vencer (amarelo)
  { id: "plan-porto-extintor", propertyId: "seed-porto-al", titulo: "Extintor (obrigatório em AL)", categoria: "extintor", periodicidade: "anual", ultimaExecucao: "2025-07-28", proximaExecucao: "2026-07-28", obrigatoriaLegal: true, notaLegal: "Alojamento Local: extintor com manutenção anual válida.", custoTipico: 35, lembreteAntecedenciaDias: 14, historico: [{ data: "2025-07-28", custo: 35, observacoes: "Selo renovado." }] },
  { id: "plan-porto-ac", propertyId: "seed-porto-al", titulo: "Ar condicionado (limpeza/recarga)", categoria: "ac", periodicidade: "anual", ultimaExecucao: "2025-07-22", proximaExecucao: "2026-07-22", obrigatoriaLegal: false, custoTipico: 80, lembreteAntecedenciaDias: 14, historico: [{ data: "2025-07-22", custo: 75, tecnicoNome: "ElectroPorto" }] },
  { id: "plan-porto-ce", propertyId: "seed-porto-al", titulo: "Certificado energético", categoria: "certificado_energetico", periodicidade: "10_anos", ultimaExecucao: "2020-05-10", proximaExecucao: "2030-05-10", obrigatoriaLegal: true, notaLegal: "Obrigatório para arrendar; validade de 10 anos.", custoTipico: 200, lembreteAntecedenciaDias: 60, historico: [{ data: "2020-05-10", custo: 180 }] },

  // T3 Coimbra — caldeira VENCIDA (dispara o banner e a frase-resumo)
  { id: "plan-coimbra-caldeira", propertyId: "seed-coimbra", titulo: "Caldeira / esquentador a gás", categoria: "caldeira", periodicidade: "anual", ultimaExecucao: "2025-07-11", proximaExecucao: "2026-07-11", obrigatoriaLegal: true, notaLegal: "Manutenção anual obrigatória de aparelhos a gás.", custoTipico: 90, lembreteAntecedenciaDias: 14, historico: [{ data: "2025-07-11", custo: 88, tecnicoNome: "João Silva" }] },
];

// ───────────────────── Store ─────────────────────

interface PlanState {
  tasks: PlanTask[];
  add: (input: PlanTaskInput) => string;
  update: (id: string, patch: Partial<PlanTask>) => void;
  remove: (id: string) => void;
  /** Regista a execução: histórico + última execução + recalcula a próxima. */
  marcarFeita: (id: string, exec: ExecucaoPlano) => void;
  /** Cria o plano recomendado para um imóvel a partir dos templates. */
  criarPlanoRecomendado: (property: Property) => number;
  byProperty: (propertyId: string) => PlanTask[];
  resetSeed: () => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useMaintenancePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      tasks: SEED,
      add: (input) => {
        const id = uid();
        set((s) => ({
          tasks: [
            { ...input, id, lembreteAntecedenciaDias: input.lembreteAntecedenciaDias ?? 14, historico: [] },
            ...s.tasks,
          ],
        }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      remove: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      marcarFeita: (id, exec) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ultimaExecucao: exec.data,
                  proximaExecucao: somarPeriodicidade(exec.data, t.periodicidade),
                  historico: [exec, ...t.historico],
                }
              : t
          ),
        })),
      criarPlanoRecomendado: (property) => {
        const jaTem = new Set(get().tasks.filter((t) => t.propertyId === property.id).map((t) => t.categoria));
        const hoje = hojeISO();
        const novas: PlanTask[] = templatesPara(property)
          .filter((tpl) => !jaTem.has(tpl.categoria))
          .map((tpl) => ({
            id: uid(),
            propertyId: property.id,
            titulo: tpl.titulo,
            categoria: tpl.categoria,
            periodicidade: tpl.periodicidade,
            proximaExecucao: somarPeriodicidade(hoje, tpl.periodicidade),
            obrigatoriaLegal: tpl.obrigatoriaLegal,
            notaLegal: tpl.notaLegal,
            custoTipico: tpl.custoTipico,
            lembreteAntecedenciaDias: 14,
            historico: [],
          }));
        if (novas.length > 0) set((s) => ({ tasks: [...novas, ...s.tasks] }));
        return novas.length;
      },
      byProperty: (propertyId) => get().tasks.filter((t) => t.propertyId === propertyId),
      resetSeed: () => set({ tasks: SEED }),
    }),
    {
      name: "redegest-maintenance-plan",
      version: 1,
    }
  )
);
