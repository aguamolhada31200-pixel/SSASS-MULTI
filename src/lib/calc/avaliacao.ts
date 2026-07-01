// Módulo Avaliação (blueprint secção 6):
// (a) checklist qualitativa de 15 critérios → score/15 + semáforo
// (b) método comparativo (comparáveis com ajustes) → valor justo estimado

export interface CriterioAvaliacao {
  id: string;
  label: string;
  ok: boolean | null; // null = não avaliado
}

export const CRITERIOS_BASE: Omit<CriterioAvaliacao, "ok">[] = [
  { id: "localizacao", label: "Boa localização" },
  { id: "ano", label: "Ano de construção / reabilitação recente" },
  { id: "elevador", label: "Tem elevador" },
  { id: "certificado", label: "Certificado energético favorável (≥ C)" },
  { id: "estado", label: "Bom estado geral" },
  { id: "cozinha", label: "Cozinha em boas condições" },
  { id: "quartos_luz", label: "Quartos com boa luz natural" },
  { id: "wcs", label: "Número adequado de WCs" },
  { id: "sala", label: "Sala ampla / convertível" },
  { id: "manutencao", label: "Prédio bem mantido" },
  { id: "renovacoes", label: "Sem renovações pesadas pendentes" },
  { id: "condominio_imi", label: "Condomínio / IMI razoáveis" },
  { id: "rentabilidade", label: "Bom potencial de rentabilidade" },
  { id: "vacancia", label: "Baixo risco de vacância" },
  { id: "andar", label: "Andar valorizado" },
];

export type Semaforo = "verde" | "amarelo" | "vermelho";

export interface ScoreAvaliacao {
  score: number; // 0..15
  total: number;
  semaforo: Semaforo;
}

export function avaliarChecklist(criterios: CriterioAvaliacao[]): ScoreAvaliacao {
  const total = criterios.length;
  const score = criterios.filter((c) => c.ok === true).length;
  const ratio = total > 0 ? score / total : 0;
  const semaforo: Semaforo = ratio >= 0.73 ? "verde" : ratio >= 0.5 ? "amarelo" : "vermelho";
  return { score, total, semaforo };
}

// ── Método comparativo ──
export interface Comparavel {
  id: string;
  preco: number;
  m2: number;
  ajustePct: number; // ajuste relativo ao imóvel-alvo (ex.: -5 = comparável 5% melhor)
}

export interface ResultadoComparativo {
  precoM2Medio: number; // €/m² médio ajustado
  valorEstimado: number;
}

export function metodoComparativo(
  comparaveis: Comparavel[],
  areaAlvo: number
): ResultadoComparativo {
  const validos = comparaveis.filter((c) => c.m2 > 0 && c.preco > 0);
  if (validos.length === 0) return { precoM2Medio: 0, valorEstimado: 0 };
  const ajustados = validos.map((c) => (c.preco / c.m2) * (1 + c.ajustePct / 100));
  const precoM2Medio = ajustados.reduce((a, b) => a + b, 0) / ajustados.length;
  return { precoM2Medio, valorEstimado: precoM2Medio * areaAlvo };
}
