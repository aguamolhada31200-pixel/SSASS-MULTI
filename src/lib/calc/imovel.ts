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

/**
 * Painel financeiro do imóvel — definições canónicas usadas em TODA a app:
 *
 * · IRS (cat. F): taxa × (rendas − despesas dedutíveis). A prestação do crédito
 *   NÃO é dedutível — só IMI, condomínio, seguro e manutenção/outras.
 * · Yield líquida: (renda anual − despesas operacionais) / preço de compra —
 *   antes de IRS e de financiamento (padrão de mercado; financiamento e taxa
 *   de IRS variam com o investidor, não com o imóvel).
 * · Cashflow: o que sobra depois de TUDO — prestação, despesas e IRS.
 * · Rentabilidade s/ entrada (cash-on-cash): cashflow anual / capital próprio.
 */
export function computeImovel(p: Property): ImovelKPIs {
  const receitaAnual = p.rendaMensal * 12;
  const despesasOperAnuais =
    p.imiAnual + p.seguroAnual + p.condominioMensal * 12 + p.outrasMensais * 12;
  const prestacaoAnual = p.prestacaoMensal * 12;
  const totalDespesasMensais = despesasOperAnuais / 12 + p.prestacaoMensal;
  const totalDespesasAnuais = despesasOperAnuais + prestacaoAnual;
  const rendimentoAntesImpostos = receitaAnual - totalDespesasAnuais;
  // Base fiscal cat. F = rendas − despesas dedutíveis (SEM a prestação do crédito)
  const baseFiscal = Math.max(receitaAnual - despesasOperAnuais, 0);
  const irsEstimado = (p.irsPct / 100) * baseFiscal;
  const rendimentoLiquidoFinal = rendimentoAntesImpostos - irsEstimado;
  const cashflowAnual = rendimentoLiquidoFinal;
  const cashflowMensal = rendimentoLiquidoFinal / 12;
  const yieldBruta = p.valorCompra > 0 ? (receitaAnual / p.valorCompra) * 100 : 0;
  const yieldLiquida =
    p.valorCompra > 0 ? ((receitaAnual - despesasOperAnuais) / p.valorCompra) * 100 : 0;
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

/**
 * Alertas automáticos — UMA mensagem por dimensão (yield, cashflow, retorno,
 * despesas, IRS, recuperação), para nunca haver alertas contraditórios.
 */
export function gerarAlertas(p: Property, k: ImovelKPIs): Alerta[] {
  const out: Alerta[] = [];
  const pos = (texto: string) => out.push({ nivel: "positivo", emoji: "🟢", texto });
  const ate = (texto: string) => out.push({ nivel: "atencao", emoji: "🟡", texto });
  const cri = (texto: string) => out.push({ nivel: "critico", emoji: "🔴", texto });

  const temRenda = k.receitaAnual > 0;
  const despesasRatio = temRenda ? k.despesasOperAnuais / k.receitaAnual : 0;

  // Yield líquida (uma só mensagem)
  if (temRenda) {
    if (k.yieldLiquida >= 6) pos("Yield líquida acima da média");
    else if (k.yieldLiquida >= 4) pos("Yield líquida saudável");
    else if (k.yieldLiquida >= 2) ate("Yield líquida baixa");
    else cri("Yield líquida muito baixa");
  }

  // Cashflow (uma só mensagem)
  if (temRenda) {
    if (k.cashflowMensal < 0) cri("Cashflow negativo");
    else if (k.cashflowMensal < 100) ate("Cashflow reduzido");
    else pos("Cashflow positivo");
  }

  // Retorno sobre o capital próprio (dimensão distinta da yield)
  if (temRenda && k.entrada > 0) {
    if (k.rentabEntrada < 0) cri("Risco de prejuízo sobre o capital investido");
    else if (k.rentabEntrada > 8) pos("Retorno s/ capital próprio excelente");
  }

  // Estrutura de despesas
  if (temRenda && despesasRatio > 0.4) ate("Despesas operacionais elevadas");
  if (temRenda && k.totalDespesasAnuais > k.receitaAnual) cri("Despesas totais superiores às receitas");

  // IRS
  if (p.irsPct >= 28 && temRenda) ate("Taxa de IRS elevada — a taxa especial atual é 25%");

  // Recuperação da entrada (uma só mensagem)
  if (temRenda && k.entrada > 0) {
    if (k.tempoRecuperacao === null) cri("Não recupera a entrada com o cashflow atual");
    else if (k.tempoRecuperacao < 12) pos("Recuperação rápida da entrada");
    else if (k.tempoRecuperacao > 20) ate("Recuperação lenta da entrada");
  }

  return out;
}
