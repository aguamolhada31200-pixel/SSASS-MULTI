// IMT / IS — tabelas oficiais (blueprint secção 6).
// Cada escalão: limite superior, taxa marginal, parcela a abater.

export type Finalidade = "HPP" | "HS"; // Habitação Própria Permanente | Habitação Secundária

interface Escalao {
  limite: number; // limite superior do escalão
  taxa: number; // fração (0.05 = 5%)
  abater: number; // parcela a abater (€)
}

// HPP — Habitação Própria Permanente
const TABELA_HPP: Escalao[] = [
  { limite: 106346, taxa: 0.0, abater: 0 },
  { limite: 145470, taxa: 0.02, abater: 2126.92 },
  { limite: 198347, taxa: 0.05, abater: 6491.02 },
  { limite: 330539, taxa: 0.07, abater: 10457.96 },
  { limite: 666982, taxa: 0.08, abater: 13763.35 },
  { limite: 1150853, taxa: 0.06, abater: 0 },
  { limite: Infinity, taxa: 0.075, abater: 0 },
];

// HS — Habitação Secundária
const TABELA_HS: Escalao[] = [
  { limite: 106346, taxa: 0.01, abater: 0 },
  { limite: 145470, taxa: 0.02, abater: 1063.46 },
  { limite: 198347, taxa: 0.05, abater: 5427.56 },
  { limite: 330539, taxa: 0.07, abater: 9394.5 },
  { limite: 633931, taxa: 0.08, abater: 12699.89 },
  { limite: 1150853, taxa: 0.06, abater: 0 },
  { limite: Infinity, taxa: 0.075, abater: 0 },
];

/** Base de incidência = max(valor de compra, VPT). */
export function baseImt(valorCompra: number, vpt = 0): number {
  return Math.max(valorCompra, vpt);
}

/**
 * IMT = ValorBase × Taxa(escalão) − Parcela a Abater.
 * Os escalões 6% e 7,5% são taxas únicas (sem parcela).
 */
export function calcularIMT(
  valorCompra: number,
  finalidade: Finalidade = "HS",
  vpt = 0
): number {
  const base = baseImt(valorCompra, vpt);
  const tabela = finalidade === "HPP" ? TABELA_HPP : TABELA_HS;
  const escalao = tabela.find((e) => base <= e.limite) ?? tabela[tabela.length - 1];
  return Math.max(0, base * escalao.taxa - escalao.abater);
}

/** Imposto de Selo = max(VPT, ValorCompra) × 0,8%. */
export function calcularIS(valorCompra: number, vpt = 0): number {
  return Math.max(vpt, valorCompra) * 0.008;
}

/** Prestação mensal de crédito — PMT(taxa mensal, nº meses, capital). */
export function pmt(tanAnual: number, prazoAnos: number, capital: number): number {
  if (capital <= 0) return 0;
  const i = tanAnual / 12;
  const nMeses = prazoAnos * 12;
  if (i === 0) return capital / nMeses;
  return (capital * i) / (1 - Math.pow(1 + i, -nMeses));
}
