// Barrel do motor financeiro + helper de "veredito num relance".
export * from "./imt";
export * from "./models";
export * from "./avaliacao";
export * from "./imovel";

/**
 * Média de mercado de referência para yield líquida (gauge da Calculadora).
 * Yield líquida = (renda − despesas operacionais) / preço, antes de IRS e
 * financiamento — referência nacional ~5% (Lisboa/Porto mais baixo).
 */
export const YIELD_MERCADO_MEDIO = 5.0;

export type Veredito = "bom" | "medio" | "mau";

export interface VeredictoInfo {
  estado: Veredito;
  cor: string; // token de cor
  emoji: string;
  label: string;
}

/**
 * Converte um indicador (%) num veredito visual comparando com a média de
 * mercado. Acima de 1,25× a média = bom; abaixo da média = mau.
 */
export function vereditoPorRentabilidade(
  valorPct: number,
  mediaMercado = YIELD_MERCADO_MEDIO
): VeredictoInfo {
  if (valorPct >= mediaMercado * 1.25)
    return { estado: "bom", cor: "var(--success)", emoji: "🟢", label: "Bom investimento" };
  if (valorPct >= mediaMercado)
    return { estado: "medio", cor: "var(--warning)", emoji: "🟡", label: "Investimento razoável" };
  return { estado: "mau", cor: "var(--danger)", emoji: "🔴", label: "Rentabilidade baixa" };
}
