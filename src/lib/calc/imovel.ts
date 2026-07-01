import type { Property } from "@/store/usePropertiesStore";

export interface ImovelKPIs {
  // diretos
  valorCompra: number;
  valorFinanciado: number;
  entrada: number;
  prestacaoMensal: number;
  receitaMensal: number;
  // receita
  receitaAnual: number;
  // despesas
  despesasOperAnuais: number;
  prestacaoAnual: number;
  totalDespesasMensais: number;
  totalDespesasAnuais: number;
  // resultado
  rendimentoAntesImpostos: number;
  irsEstimado: number;
  rendimentoLiquidoFinal: number;
  cashflowMensal: number;
  cashflowAnual: number;
  // indicadores
  yieldBruta: number;
  yieldLiquida: number;
  rentabEntrada: number;
  tempoRecuperacao: number | null; // anos; null = não recupera
}

/** Painel financeiro do imóvel — todas as fórmulas do documento (em tempo real). */
export function computeImovel(p: Property): ImovelKPIs {
  const receitaAnual = p.rendaMensal * 12;
  const despesasOperAnuais =
    p.imiAnual + p.seguroAnual + p.condominioMensal * 12 + p.outrasMensais * 12;
  const prestacaoAnual = p.prestacaoMensal * 12;
  const totalDespesasMensais = despesasOperAnuais / 12 + p.prestacaoMensal;
  const totalDespesasAnuais = despesasOperAnuais + prestacaoAnual;
  const rendimentoAntesImpostos = receitaAnual - totalDespesasAnuais;
  const irsEstimado = (p.irsPct / 100) * Math.max(rendimentoAntesImpostos, 0);
  const rendimentoLiquidoFinal = rendimentoAntesImpostos - irsEstimado;
  const cashflowAnual = rendimentoLiquidoFinal;
  const cashflowMensal = rendimentoLiquidoFinal / 12;
  const yieldBruta = p.valorCompra > 0 ? (receitaAnual / p.valorCompra) * 100 : 0;
  const yieldLiquida = p.valorCompra > 0 ? (rendimentoLiquidoFinal / p.valorCompra) * 100 : 0;
  const rentabEntrada = p.entrada > 0 ? (rendimentoLiquidoFinal / p.entrada) * 100 : 0;
  const tempoRecuperacao =
    rendimentoLiquidoFinal > 0 ? p.entrada / rendimentoLiquidoFinal : null;

  return {
    valorCompra: p.valorCompra,
    valorFinanciado: p.financiado,
    entrada: p.entrada,
    prestacaoMensal: p.prestacaoMensal,
    receitaMensal: p.rendaMensal,
    receitaAnual,
    despesasOperAnuais,
    prestacaoAnual,
    totalDespesasMensais,
    totalDespesasAnuais,
    rendimentoAntesImpostos,
    irsEstimado,
    rendimentoLiquidoFinal,
    cashflowMensal,
    cashflowAnual,
    yieldBruta,
    yieldLiquida,
    rentabEntrada,
    tempoRecuperacao,
  };
}

export type AlertaNivel = "positivo" | "atencao" | "critico";

export interface Alerta {
  nivel: AlertaNivel;
  emoji: string;
  texto: string;
}

/** Alertas automáticos gerados a partir dos indicadores (regras do documento). */
export function gerarAlertas(p: Property, k: ImovelKPIs): Alerta[] {
  const out: Alerta[] = [];
  const pos = (texto: string) => out.push({ nivel: "positivo", emoji: "🟢", texto });
  const ate = (texto: string) => out.push({ nivel: "atencao", emoji: "🟡", texto });
  const cri = (texto: string) => out.push({ nivel: "critico", emoji: "🔴", texto });

  const despesasRatio = k.receitaAnual > 0 ? k.despesasOperAnuais / k.receitaAnual : Infinity;

  // 🔴 Críticos
  if (k.cashflowMensal < 0) cri("Cashflow negativo");
  if (k.totalDespesasAnuais > k.receitaAnual) cri("Despesas superiores às receitas");
  if (k.rentabEntrada < 0) cri("Risco de prejuízo");

  // 🟡 Atenção
  if (k.yieldLiquida >= 2 && k.yieldLiquida <= 4) ate("Rentabilidade baixa");
  if (k.receitaAnual > 0 && despesasRatio > 0.4) ate("Despesas elevadas");
  if (p.irsPct >= 28 && k.rendimentoAntesImpostos > 0) ate("IRS elevado");
  if (k.cashflowMensal > 0 && k.cashflowMensal < 100) ate("Cashflow reduzido");

  // 🟢 Positivos
  if (k.yieldLiquida > 4) pos("Yield acima da média");
  if (k.cashflowMensal > 0) pos("Cashflow positivo");
  if (k.rentabEntrada > 8) pos("Excelente rentabilidade");
  if (k.tempoRecuperacao !== null && k.tempoRecuperacao < 12) pos("Recuperação rápida");

  return out;
}
