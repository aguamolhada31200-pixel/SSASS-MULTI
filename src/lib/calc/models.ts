// Motor financeiro — 4 modelos de negócio (blueprint secção 6).
// Funções puras. Dinheiro em euros, percentagens em fração de entrada e %.
import { calcularIMT, calcularIS, pmt, type Finalidade } from "./imt";

export type Regime = "empresa" | "particular";

// ─────────────────────────────────────────────────────────────
// MODELO 1 — ARRENDAMENTO
// ─────────────────────────────────────────────────────────────
export interface ArrendamentoInput {
  preco: number; // valor de compra
  entrada: number; // capital próprio investido
  rendaMensal: number;
  prestacaoMensal: number;
  despesasFixasMensais: number; // IMI mensalizado, seguro, condomínio, etc.
  taxaIRS?: number; // fração (default 0,25 — taxa especial cat. F)
}

export interface ArrendamentoResult {
  rendBrutoAnual: number;
  despesasAnuais: number;
  rendLiquidoAImp: number;
  impostos: number;
  rendLiquidoFinal: number;
  cashflowMensal: number;
  cashflowAnual: number;
  rentabEntradaPct: number;
  yieldBrutoPct: number;
  yieldLiquidoPct: number;
}

export function calcArrendamento(i: ArrendamentoInput): ArrendamentoResult {
  const taxa = i.taxaIRS ?? 0.25;
  const rendBrutoAnual = i.rendaMensal * 12;
  const despesasOperAnuais = i.despesasFixasMensais * 12;
  const despesasAnuais = (i.prestacaoMensal + i.despesasFixasMensais) * 12;
  const rendLiquidoAImp = rendBrutoAnual - despesasAnuais;
  // Base fiscal cat. F = rendas − despesas dedutíveis (a prestação NÃO deduz)
  const impostos = Math.max(0, rendBrutoAnual - despesasOperAnuais) * taxa;
  const rendLiquidoFinal = rendLiquidoAImp - impostos;
  return {
    rendBrutoAnual,
    despesasAnuais,
    rendLiquidoAImp,
    impostos,
    rendLiquidoFinal,
    cashflowMensal: rendLiquidoFinal / 12,
    cashflowAnual: rendLiquidoFinal,
    rentabEntradaPct: i.entrada > 0 ? (rendLiquidoFinal / i.entrada) * 100 : 0,
    yieldBrutoPct: i.preco > 0 ? (rendBrutoAnual / i.preco) * 100 : 0,
    // Definição canónica da app: (renda − despesas operacionais) / preço,
    // antes de IRS e de financiamento — igual a lib/calc/imovel.ts
    yieldLiquidoPct: i.preco > 0 ? ((rendBrutoAnual - despesasOperAnuais) / i.preco) * 100 : 0,
  };
}

// ─────────────────────────────────────────────────────────────
// MODELO 2 — COMPRA & REVENDA (FLIP)
// ─────────────────────────────────────────────────────────────
export interface FlipInput {
  compra: number;
  finalidade?: Finalidade; // HS por defeito
  vpt?: number;
  custosAquisicaoExtra?: number; // escritura, registos, comissão de compra... (além de IMT/IS)
  obra: number;
  obraFinanciada?: number;
  financiado: number; // montante de crédito
  tan?: number; // taxa anual nominal (fração)
  prazoAnos?: number;
  custosFinanciamento?: number; // comissões de banco
  mesesRetencao: number; // holding period
  despesasMensais: number; // condomínio, IMI, seguros durante o holding
  venda: number;
  custosVenda?: number; // comissão imobiliária de venda + outros
  regime?: Regime;
}

export interface FlipResult {
  imt: number;
  is: number;
  prestacaoMensal: number;
  custosAquisicao: number;
  custosRetencao: number;
  custosAssociados: number;
  capitaisProprios: number;
  lucroBruto: number;
  impostos: number;
  lucroAposImp: number;
  retornoTotalPct: number;
  cashOnCashPct: number;
  retornoAnualizadoPct: number;
}

export function calcFlip(i: FlipInput): FlipResult {
  const finalidade = i.finalidade ?? "HS";
  const imt = calcularIMT(i.compra, finalidade, i.vpt ?? 0);
  const is = calcularIS(i.compra, i.vpt ?? 0);
  const prestacaoMensal = pmt(i.tan ?? 0, i.prazoAnos ?? 0, i.financiado);

  const custosAquisicao = imt + is + (i.custosAquisicaoExtra ?? 0);
  const custosRetencao = i.mesesRetencao * (i.despesasMensais + prestacaoMensal);
  const custosVenda = i.custosVenda ?? 0;
  const custosFinanciamento = i.custosFinanciamento ?? 0;

  const custosAssociados =
    custosAquisicao + custosFinanciamento + i.obra + custosRetencao + custosVenda;

  const lucroBruto = i.venda - i.compra - custosAssociados;
  const impostos =
    i.regime === "empresa"
      ? Math.max(0, lucroBruto) * 0.19
      : Math.max(0, lucroBruto) * 0.5 * 0.48;
  const lucroAposImp = lucroBruto - impostos;

  const capitalProprioAquisicao = Math.max(0, i.compra + custosAquisicao - i.financiado);
  const obraNaoFinanciada = Math.max(0, i.obra - (i.obraFinanciada ?? 0));
  const capitaisProprios = capitalProprioAquisicao + obraNaoFinanciada + custosRetencao;

  const baseRetorno = i.compra + custosAssociados;
  const retornoTotalPct = baseRetorno > 0 ? (lucroAposImp / baseRetorno) * 100 : 0;
  const cashOnCashPct =
    capitaisProprios > 0 ? (lucroAposImp / capitaisProprios) * 100 : 0;
  const retornoAnualizadoPct =
    i.mesesRetencao > 0 ? retornoTotalPct * (12 / i.mesesRetencao) : 0;

  return {
    imt,
    is,
    prestacaoMensal,
    custosAquisicao,
    custosRetencao,
    custosAssociados,
    capitaisProprios,
    lucroBruto,
    impostos,
    lucroAposImp,
    retornoTotalPct,
    cashOnCashPct,
    retornoAnualizadoPct,
  };
}

// ─────────────────────────────────────────────────────────────
// MODELO 3 — CEDÊNCIA DE POSIÇÃO
// ─────────────────────────────────────────────────────────────
export interface CedenciaInput {
  compra: number; // valor da escritura acordado no CPCV
  vpt?: number;
  sinalPct: number; // fração paga como sinal (ex.: 0,10)
  vendaPosicao: number; // valor pelo qual cede a posição
  custosCPCV?: number;
  custosAcordo?: number;
  regime?: Regime;
}

export interface CedenciaResult {
  sinalValor: number;
  imt: number;
  capitais: number;
  lucroBruto: number;
  impostos: number;
  lucroAposImp: number;
  retornoTotalPct: number;
}

export function calcCedencia(i: CedenciaInput): CedenciaResult {
  const sinalValor = i.compra * i.sinalPct;
  const imt = calcularIMT(Math.max(i.compra, i.vpt ?? 0) * i.sinalPct, "HS");
  const capitais = imt + (i.custosCPCV ?? 0) + (i.custosAcordo ?? 0) + sinalValor;
  // Fórmula do blueprint (secção 6).
  const lucroBruto = i.vendaPosicao - i.compra - capitais + sinalValor;
  const impostos =
    i.regime === "empresa"
      ? Math.max(0, lucroBruto) * 0.19
      : Math.max(0, lucroBruto) * 0.5 * 0.48;
  const lucroAposImp = lucroBruto - impostos;
  return {
    sinalValor,
    imt,
    capitais,
    lucroBruto,
    impostos,
    lucroAposImp,
    // Retorno coerente com o KPI principal (lucro LÍQUIDO / capital empatado)
    retornoTotalPct: capitais > 0 ? (lucroAposImp / capitais) * 100 : 0,
  };
}

// ─────────────────────────────────────────────────────────────
// MODELO 4 — INVESTIDORES PRIVADOS (ativo vs passivo)
// ─────────────────────────────────────────────────────────────
export interface InvestidoresInput {
  compra: number;
  venda: number;
  custosAssociados: number;
  ativoPct: number; // fração para o parceiro ativo (quem tem o negócio)
  passivoPct: number; // fração para o parceiro passivo (quem tem o capital)
  comEmpresaMenos1Ano?: boolean; // true → ×0,81 (IRC 19%) ; false → ×0,76 (particular)
}

export interface InvestidoresResult {
  lucroBruto: number;
  lucroAposImp: number;
  ativoLiquido: number;
  passivoLiquido: number;
}

export function calcInvestidores(i: InvestidoresInput): InvestidoresResult {
  const lucroBruto = i.venda - i.compra - i.custosAssociados;
  // Mesmos regimes do modo Flip: empresa = IRC 19% (×0,81);
  // particular = mais-valias 50% × 48% ⇒ 24% efetivo (×0,76).
  const factor = i.comEmpresaMenos1Ano ? 0.81 : 0.76;
  const lucroAposImp = lucroBruto > 0 ? lucroBruto * factor : lucroBruto;
  return {
    lucroBruto,
    lucroAposImp,
    ativoLiquido: lucroAposImp * i.ativoPct,
    passivoLiquido: lucroAposImp * i.passivoPct,
  };
}
