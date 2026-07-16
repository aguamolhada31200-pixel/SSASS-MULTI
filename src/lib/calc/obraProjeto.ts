import type { CollabProject } from "@/store/useCollabStore";

// Liga as OBRAS ao LUCRO do projeto de reabilitação (flip):
// cada euro orçamentado/gasto nas obras entra no investimento total e
// desce o lucro estimado e o ROI — em tempo real.

export interface FinancasFlip {
  custoObras: number;
  investimentoTotal: number;
  lucroEstimado: number; // líquido de impostos de mais-valias
  roi: number; // %
}

/**
 * Finanças do flip com o custo de obras DINÂMICO (vem de custoObrasProjeto):
 * investimentoTotal = compra + custos de aquisição + obras
 * lucroBruto = venda prevista − investimentoTotal
 * lucroEstimado = lucroBruto − lucroBruto × taxaImpostos% (quando positivo)
 * ROI = lucroEstimado ÷ investimentoTotal × 100
 */
export function financasFlipProjeto(p: CollabProject, custoObras: number): FinancasFlip {
  const investimentoTotal = (p.precoAquisicao ?? 0) + (p.custosAquisicao ?? 0) + custoObras;
  const lucroBruto = (p.valorVendaPrevisto ?? 0) - investimentoTotal;
  const impostos = lucroBruto > 0 ? lucroBruto * ((p.taxaImpostos ?? 0) / 100) : 0;
  const lucroEstimado = lucroBruto - impostos;
  const roi = investimentoTotal > 0 ? (lucroEstimado / investimentoTotal) * 100 : 0;
  return { custoObras, investimentoTotal, lucroEstimado, roi };
}
