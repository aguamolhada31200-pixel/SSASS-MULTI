import { create } from "zustand";
import { persist } from "zustand/middleware";

export type StageStatus = "pendente" | "em_curso" | "concluida" | "bloqueada";
export type InvestMode = "arrendamento" | "flip";

export interface ChecklistItem {
  id: string;
  texto: string;
  feito: boolean;
  dataFeito?: string;
}

export interface Stage {
  id: string;
  projectId: string;
  stageNumber: number; // 1..11
  stageName: string;
  status: StageStatus;
  dataInicioPrevista?: string;
  dataFimPrevista?: string;
  dataInicioReal?: string;
  dataFimReal?: string;
  checklist: ChecklistItem[];
  notas: string;
  documentosAssociados: string[];
  responsavel?: string;
  custoEstimado?: number;
  custoReal?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentProject {
  id: string;
  nome: string;
  propertyId?: string;
  modo: InvestMode;
  fotoUrl?: string;
  createdAt: string;
}

// ───────────────────── Template das 11 etapas ─────────────────────

interface StageTemplate {
  nome: string;
  descricao: string;
  checklist: string[];
  checklistFlip?: string[];
  nomeFlip?: string;
}

export const STAGE_TEMPLATES: StageTemplate[] = [
  { nome: "Simulação", descricao: "Análise inicial de viabilidade", checklist: ["Definir orçamento", "Definir tipo de imóvel", "Calcular rentabilidade alvo"] },
  { nome: "Financiamento", descricao: "Pré-aprovação bancária", checklist: ["Comparar bancos", "Reunir documentos", "Pedir pré-aprovação", "Receber FINE"] },
  { nome: "Procura", descricao: "Visitar imóveis", checklist: ["Definir zonas-alvo", "Visitar pelo menos 5 imóveis", "Avaliar com checklist"] },
  { nome: "Due Diligence", descricao: "Análise legal e técnica", checklist: ["Caderneta predial", "Certidão permanente", "Licença de utilização", "Certificado energético", "Vistoria técnica"] },
  { nome: "Proposta", descricao: "Negociação", checklist: ["Apresentar proposta", "Negociar valor", "Acordo verbal"] },
  { nome: "CPCV", descricao: "Contrato Promessa de Compra e Venda", checklist: ["Minuta CPCV", "Pagamento do sinal", "Assinatura", "Pagamento IMT (se com livre cessão)"] },
  { nome: "Escritura", descricao: "Fechar a compra", checklist: ["Pagamento IMT", "Pagamento IS", "Liquidação financiamento", "Escritura", "Registo predial"] },
  { nome: "Obras", descricao: "Remodelação (se aplicável)", checklist: ["Licença de obras (câmara)", "Adjudicação empreiteiro", "Início da obra", "Conclusão", "Fiscalização"] },
  { nome: "Certificação", descricao: "Após obras", checklist: ["Certificado energético atualizado", "Vistoria municipal (se aplicável)", "Atualização caderneta"] },
  {
    nome: "Mercado", descricao: "Colocar a render",
    checklist: ["Fotos profissionais", "Anúncio publicado", "Definir renda", "Triagem candidatos"],
    checklistFlip: ["Anúncio de venda", "Visitas", "Receber propostas"],
  },
  {
    nome: "Primeiro Inquilino", descricao: "Começa a gerar", nomeFlip: "Venda",
    checklist: ["Assinar contrato", "Recibo de caução", "Entrega de chaves", "Primeira renda recebida"],
    checklistFlip: ["CPCV de venda", "Escritura de venda", "Lucro realizado"],
  },
];

export const STAGE_COUNT = STAGE_TEMPLATES.length; // 11

// ───────────────────── Helpers ─────────────────────

function uid(prefix = "ps"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function checklistFor(stageNumber: number, modo: InvestMode, ratio: number): ChecklistItem[] {
  const t = STAGE_TEMPLATES[stageNumber - 1];
  const items = modo === "flip" && t.checklistFlip ? t.checklistFlip : t.checklist;
  const cut = Math.round(items.length * ratio);
  return items.map((texto, i) => ({
    id: `${stageNumber}-${i}`,
    texto,
    feito: i < cut,
    dataFeito: i < cut ? daysAgoISO(5) : undefined,
  }));
}

function stageNameFor(stageNumber: number, modo: InvestMode): string {
  const t = STAGE_TEMPLATES[stageNumber - 1];
  return stageNumber === STAGE_COUNT && modo === "flip" && t.nomeFlip ? t.nomeFlip : t.nome;
}

/** Cria as 11 etapas (todas pendentes) para um projeto novo. */
export function buildPendingStages(projectId: string, modo: InvestMode, anchorISO?: string): Stage[] {
  const now = new Date().toISOString();
  const anchor = anchorISO ?? new Date().toISOString().slice(0, 10);
  return STAGE_TEMPLATES.map((_, idx) => {
    const n = idx + 1;
    return {
      id: `${projectId}-s${n}`,
      projectId,
      stageNumber: n,
      stageName: stageNameFor(n, modo),
      status: "pendente" as StageStatus,
      dataInicioPrevista: addDays(anchor, (n - 1) * 30),
      dataFimPrevista: addDays(anchor, n * 30),
      checklist: checklistFor(n, modo, 0),
      notas: "",
      documentosAssociados: [],
      createdAt: now,
      updatedAt: now,
    };
  });
}

/** Versão para seeds: aceita estados por etapa + dias na etapa em curso. */
function seedStages(
  projectId: string,
  modo: InvestMode,
  statuses: StageStatus[],
  anchorISO: string,
  stepDays: number,
  emCursoDias: number
): Stage[] {
  const now = new Date().toISOString();
  return STAGE_TEMPLATES.map((_, idx) => {
    const n = idx + 1;
    const status = statuses[idx] ?? "pendente";
    const ratio = status === "concluida" ? 1 : status === "em_curso" ? 0.5 : 0;
    const inicioPrev = addDays(anchorISO, idx * stepDays);
    const fimPrev = addDays(anchorISO, (idx + 1) * stepDays);
    let inicioReal: string | undefined;
    let fimReal: string | undefined;
    if (status === "concluida") {
      inicioReal = inicioPrev;
      fimReal = fimPrev;
    } else if (status === "em_curso") {
      inicioReal = daysAgoISO(emCursoDias);
    }
    return {
      id: `${projectId}-s${n}`,
      projectId,
      stageNumber: n,
      stageName: stageNameFor(n, modo),
      status,
      dataInicioPrevista: inicioPrev,
      dataFimPrevista: fimPrev,
      dataInicioReal: inicioReal,
      dataFimReal: fimReal,
      checklist: checklistFor(n, modo, ratio),
      notas: "",
      documentosAssociados: [],
      createdAt: now,
      updatedAt: now,
    };
  });
}

// ───────────────────── Seeds ─────────────────────

const C: StageStatus = "concluida";
const EC: StageStatus = "em_curso";
const P: StageStatus = "pendente";

// Etapas SEMPRE coerentes com o estado real dos imóveis na carteira:
// Arroios e Studio AL estão comprados e a render → 11/11; Príncipe Real está
// arrendado → 11/11; o T3 de Coimbra está "em obras" → etapa 8 em curso.
const SEED_PROJECTS: InvestmentProject[] = [
  { id: "proj-arroios", nome: "T2 Arroios", propertyId: "seed-arroios", modo: "arrendamento", createdAt: "2022-02-01" },
  { id: "proj-porto", nome: "Studio AL Baixa", propertyId: "seed-porto-al", modo: "arrendamento", createdAt: "2022-12-01" },
  { id: "proj-coimbra", nome: "T3 a remodelar — Coimbra", propertyId: "seed-coimbra", modo: "arrendamento", createdAt: "2026-02-01" },
  {
    id: "proj-principe",
    nome: "Apartamento Príncipe Real",
    propertyId: "seed-principe-real",
    modo: "arrendamento",
    fotoUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=70",
    createdAt: "2026-01-15",
  },
];

const SEED_STAGES: Stage[] = [
  // T2 Arroios — comprado e arrendado: 11/11 concluídas
  ...seedStages("proj-arroios", "arrendamento", [C, C, C, C, C, C, C, C, C, C, C], "2022-02-01", 38, 0),
  // Studio AL Baixa — comprado e a render desde 2023: 11/11 concluídas
  ...seedStages("proj-porto", "arrendamento", [C, C, C, C, C, C, C, C, C, C, C], "2022-12-01", 30, 0),
  // T3 Coimbra — escritura feita (abr 2026), obras a decorrer: etapa 8 em curso
  ...seedStages("proj-coimbra", "arrendamento", [C, C, C, C, C, C, C, EC, P, P, P], "2026-02-01", 28, 50),
  // Príncipe Real — comprado (mar 2026) e arrendado: 11/11 concluídas
  ...seedStages("proj-principe", "arrendamento", [C, C, C, C, C, C, C, C, C, C, C], "2026-01-15", 25, 0),
];

// ───────────────────── Store ─────────────────────

interface ProjectStagesState {
  projects: InvestmentProject[];
  stages: Stage[];
  addProject: (input: Omit<InvestmentProject, "id" | "createdAt"> & { id?: string }) => string;
  removeProject: (id: string) => void;
  stagesOf: (projectId: string) => Stage[];
  updateStage: (id: string, patch: Partial<Stage>) => void;
  setStageStatus: (id: string, status: StageStatus) => void;
  toggleChecklist: (stageId: string, itemId: string) => void;
  advanceStage: (projectId: string) => void;
  associarDoc: (stageId: string, docId: string) => void;
  desassociarDoc: (stageId: string, docId: string) => void;
  ensureProjectForProperty: (p: { id: string; name: string; modo?: InvestMode }) => void;
  resetSeed: () => void;
}

function touch(stage: Stage, patch: Partial<Stage>): Stage {
  return { ...stage, ...patch, updatedAt: new Date().toISOString() };
}

export const useProjectStagesStore = create<ProjectStagesState>()(
  persist(
    (set, get) => ({
      projects: SEED_PROJECTS,
      stages: SEED_STAGES,

      addProject: (input) => {
        const id = input.id ?? uid("proj");
        const project: InvestmentProject = {
          id,
          nome: input.nome,
          propertyId: input.propertyId,
          modo: input.modo,
          fotoUrl: input.fotoUrl,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        const stages = buildPendingStages(id, input.modo);
        // primeira etapa arranca em curso
        stages[0] = { ...stages[0], status: "em_curso", dataInicioReal: new Date().toISOString().slice(0, 10) };
        set((s) => ({ projects: [project, ...s.projects], stages: [...s.stages, ...stages] }));
        return id;
      },

      removeProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          stages: s.stages.filter((st) => st.projectId !== id),
        })),

      stagesOf: (projectId) =>
        get().stages.filter((s) => s.projectId === projectId).sort((a, b) => a.stageNumber - b.stageNumber),

      updateStage: (id, patch) =>
        set((s) => ({ stages: s.stages.map((st) => (st.id === id ? touch(st, patch) : st)) })),

      setStageStatus: (id, status) =>
        set((s) => ({
          stages: s.stages.map((st) => {
            if (st.id !== id) return st;
            const patch: Partial<Stage> = { status };
            if (status === "em_curso" && !st.dataInicioReal) patch.dataInicioReal = new Date().toISOString().slice(0, 10);
            if (status === "concluida" && !st.dataFimReal) patch.dataFimReal = new Date().toISOString().slice(0, 10);
            return touch(st, patch);
          }),
        })),

      toggleChecklist: (stageId, itemId) =>
        set((s) => ({
          stages: s.stages.map((st) => {
            if (st.id !== stageId) return st;
            const checklist = st.checklist.map((c) =>
              c.id === itemId
                ? { ...c, feito: !c.feito, dataFeito: !c.feito ? new Date().toISOString().slice(0, 10) : undefined }
                : c
            );
            return touch(st, { checklist });
          }),
        })),

      advanceStage: (projectId) =>
        set((s) => {
          const stages = get().stagesOf(projectId);
          const atual = stages.find((st) => st.status === "em_curso") ?? stages.find((st) => st.status === "pendente" || st.status === "bloqueada");
          if (!atual) return s;
          const hoje = new Date().toISOString().slice(0, 10);
          const proxima = stages.find((st) => st.stageNumber === atual.stageNumber + 1);
          return {
            stages: s.stages.map((st) => {
              if (st.id === atual.id) return touch(st, { status: "concluida", dataFimReal: st.dataFimReal ?? hoje });
              if (proxima && st.id === proxima.id && st.status === "pendente")
                return touch(st, { status: "em_curso", dataInicioReal: st.dataInicioReal ?? hoje });
              return st;
            }),
          };
        }),

      associarDoc: (stageId, docId) =>
        set((s) => ({
          stages: s.stages.map((st) =>
            st.id === stageId && !st.documentosAssociados.includes(docId)
              ? touch(st, { documentosAssociados: [...st.documentosAssociados, docId] })
              : st
          ),
        })),

      desassociarDoc: (stageId, docId) =>
        set((s) => ({
          stages: s.stages.map((st) =>
            st.id === stageId
              ? touch(st, { documentosAssociados: st.documentosAssociados.filter((d) => d !== docId) })
              : st
          ),
        })),

      ensureProjectForProperty: ({ id, name, modo = "arrendamento" }) => {
        const exists = get().projects.some((p) => p.propertyId === id);
        if (exists) return;
        const projectId = `proj-${id}`;
        const stages = buildPendingStages(projectId, modo);
        set((s) => ({
          projects: [...s.projects, { id: projectId, nome: name, propertyId: id, modo, createdAt: new Date().toISOString().slice(0, 10) }],
          stages: [...s.stages, ...stages],
        }));
      },

      resetSeed: () => set({ projects: SEED_PROJECTS, stages: SEED_STAGES }),
    }),
    {
      name: "decogest-project-stages",
      version: 2,
      // v2: etapas seed alinhadas com o estado real dos imóveis (Studio AL e
      // Príncipe Real concluídos; T3 Coimbra em Obras). Substitui projetos/etapas
      // seed antigos e mantém projetos criados pelo utilizador.
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as { projects?: InvestmentProject[]; stages?: Stage[] };
        if (version < 2 && state.projects && state.stages) {
          const seedIds = new Set(SEED_PROJECTS.map((p) => p.id));
          state.projects = [
            ...SEED_PROJECTS,
            ...state.projects.filter((p) => !seedIds.has(p.id)),
          ];
          state.stages = [
            ...SEED_STAGES,
            ...state.stages.filter((st) => !seedIds.has(st.projectId)),
          ];
        }
        return state as ProjectStagesState;
      },
    }
  )
);

// ───────────────────── Derivações (puras) ─────────────────────

export function progressoProjeto(stages: Stage[]): number {
  if (stages.length === 0) return 0;
  const concl = stages.filter((s) => s.status === "concluida").length;
  return Math.round((concl / stages.length) * 100);
}

export function etapaAtual(stages: Stage[]): Stage | undefined {
  return (
    stages.find((s) => s.status === "em_curso") ??
    stages.find((s) => s.status === "bloqueada") ??
    stages.find((s) => s.status === "pendente")
  );
}

export function diasNaEtapa(stage?: Stage): number | null {
  if (!stage?.dataInicioReal) return null;
  const ini = new Date(`${stage.dataInicioReal}T00:00:00`).getTime();
  return Math.max(0, Math.round((Date.now() - ini) / 86400000));
}

export function checklistProgresso(stage: Stage): number {
  if (stage.checklist.length === 0) return 0;
  return Math.round((stage.checklist.filter((c) => c.feito).length / stage.checklist.length) * 100);
}

/** Alerta: parado >30 dias na etapa atual (em curso/bloqueada). */
export function projetoParado(stages: Stage[]): number | null {
  const atual = etapaAtual(stages);
  if (!atual || (atual.status !== "em_curso" && atual.status !== "bloqueada")) return null;
  const dias = diasNaEtapa(atual);
  return dias !== null && dias > 30 ? dias : null;
}

/** Data prevista ultrapassada na etapa atual não concluída. */
export function prazoUltrapassado(stages: Stage[]): boolean {
  const atual = etapaAtual(stages);
  if (!atual?.dataFimPrevista || atual.status === "concluida") return false;
  return new Date(`${atual.dataFimPrevista}T00:00:00`).getTime() < Date.now();
}

export const STATUS_LABEL: Record<StageStatus, string> = {
  pendente: "Pendente",
  em_curso: "Em curso",
  concluida: "Concluída",
  bloqueada: "Bloqueada",
};
