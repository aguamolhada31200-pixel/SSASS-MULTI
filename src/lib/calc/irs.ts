// Fiscalidade PT — Categoria F (rendimentos prediais) · Anexo F.
// A app NÃO submete à AT: organiza, calcula e exporta. A submissão é do utilizador.

// ───────────────── Dedutibilidade por categoria (Art.º 41.º CIRS) ─────────────────

export interface RegraDedutivel {
  dedutivel: boolean;
  motivo: string;
}

/** Sugestão de dedutibilidade por categoria de despesa (usada no painel "por classificar"). */
export const REGRA_CATEGORIA: Record<string, RegraDedutivel> = {
  IMI: { dedutivel: true, motivo: "Imposto sobre o imóvel arrendado" },
  "Condomínio": { dedutivel: true, motivo: "Encargo de conservação e fruição" },
  Seguro: { dedutivel: true, motivo: "Seguro do imóvel arrendado" },
  "Manutenção/Reparações": { dedutivel: true, motivo: "Conservação e manutenção" },
  Obras: { dedutivel: true, motivo: "Dedutível se for conservação (obras de valorização não são)" },
  Contabilista: { dedutivel: true, motivo: "Despesa com a obtenção do rendimento" },
  "Comissão de gestão": { dedutivel: true, motivo: "Mediação/gestão — só no ano do contrato" },
  "Juros do crédito": { dedutivel: false, motivo: "Juros e amortização não são dedutíveis em categoria F" },
  "Água/Luz/Gás": { dedutivel: false, motivo: "Consumos correntes — em regra a cargo do inquilino" },
  Outros: { dedutivel: false, motivo: "Mobiliário, eletrodomésticos e AIMI não são dedutíveis" },
};

/** Motivo curto para despesas marcadas como não dedutíveis. */
export function motivoNaoDedutivel(categoria: string): string {
  return REGRA_CATEGORIA[categoria]?.dedutivel === false
    ? REGRA_CATEGORIA[categoria].motivo
    : "Não dedutível em categoria F";
}

// ───────────────── Taxas autónomas por duração do contrato ─────────────────

export interface TaxaContrato {
  taxa: number; // %
  label: string;
}

function mesesEntre(inicio: string, fim: string): number {
  const a = new Date(`${inicio}T00:00:00`).getTime();
  const b = new Date(`${fim}T00:00:00`).getTime();
  if (!isFinite(a) || !isFinite(b) || b <= a) return 0;
  return Math.round((b - a) / (86400000 * 30.4375));
}

/**
 * Taxa autónoma cat. F conforme a duração do contrato (Lei n.º 3/2019 e seg.):
 * <5 anos ou sem prazo → 25% · 5–10 → 15% · 10–20 → 10% · ≥20 → 5%.
 * Contratos anteriores a 2019 mantêm o regime antigo (28%).
 */
export function taxaPorContrato(dataInicio?: string, dataFim?: string): TaxaContrato {
  if (dataInicio && dataInicio < "2019-01-01") return { taxa: 28, label: "Contrato anterior a 2019 · regime antigo" };
  if (!dataInicio || !dataFim) return { taxa: 25, label: "Sem prazo definido" };
  const anos = mesesEntre(dataInicio, dataFim) / 12;
  if (anos >= 20) return { taxa: 5, label: "Contrato ≥ 20 anos" };
  if (anos >= 10) return { taxa: 10, label: "Contrato 10–20 anos" };
  if (anos >= 5) return { taxa: 15, label: "Contrato 5–10 anos" };
  const n = Math.max(1, Math.round(anos));
  return { taxa: 25, label: `Contrato ${n} ano${n === 1 ? "" : "s"} (< 5 anos)` };
}

// ───────────────── Englobamento — escalões IRS (continente) ─────────────────

/** Escalões IRS 2025/2026 (continente) — simulação informativa. */
export const ESCALOES_IRS: { ate: number; taxa: number }[] = [
  { ate: 8059, taxa: 0.125 },
  { ate: 12160, taxa: 0.16 },
  { ate: 17233, taxa: 0.215 },
  { ate: 22306, taxa: 0.244 },
  { ate: 28400, taxa: 0.314 },
  { ate: 41629, taxa: 0.349 },
  { ate: 44987, taxa: 0.431 },
  { ate: 83696, taxa: 0.446 },
  { ate: Infinity, taxa: 0.48 },
];

/** IRS por taxas progressivas sobre um rendimento coletável. */
export function irsProgressivo(rendimento: number): number {
  if (rendimento <= 0) return 0;
  let anterior = 0;
  let total = 0;
  for (const e of ESCALOES_IRS) {
    const faixa = Math.min(rendimento, e.ate) - anterior;
    if (faixa <= 0) break;
    total += faixa * e.taxa;
    anterior = e.ate;
  }
  return total;
}

/** Imposto adicional de englobar os prediais em cima dos outros rendimentos. */
export function impostoEnglobamento(outrosRendimentos: number, prediais: number): number {
  return irsProgressivo(Math.max(0, outrosRendimentos) + Math.max(0, prediais)) - irsProgressivo(Math.max(0, outrosRendimentos));
}
