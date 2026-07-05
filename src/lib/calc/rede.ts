import type { Listing } from "@/store/useListingsStore";

/**
 * Impostos consolidados (reabilitação) = IMT + IS + Registos.
 * Prioriza o campo `impostos` (v8). Fallback: IMT + Escritura (legado).
 */
export function impostosReab(l: Pick<Listing, "impostos" | "imt" | "escritura">): number {
  if (l.impostos != null) return l.impostos;
  return (l.imt ?? 0) + (l.escritura ?? 0);
}

/**
 * Custo Total da Aquisição (CTA) — reabilitação:
 * CTA = Valor do imóvel (CPCV) + Impostos (IMT + IS + Registos).
 */
export function ctaReab(l: Pick<Listing, "valorImovel" | "impostos" | "imt" | "escritura">): number {
  return (l.valorImovel ?? 0) + impostosReab(l);
}

/**
 * Investimento Total (reabilitação):
 * CTA + Orçamento das obras + Outros custos do projeto.
 */
export function investimentoTotalReab(l: Pick<Listing, "valorImovel" | "orcamentoObras" | "impostos" | "imt" | "escritura" | "outrosCustos">): number {
  return ctaReab(l) + (l.orcamentoObras ?? 0) + (l.outrosCustos ?? 0);
}

/** Valor de mercado atual (reabilitação) — antes das obras. */
export function valorMercadoAtualReab(l: Pick<Listing, "valorMercadoAtual" | "valorImovel">): number {
  return l.valorMercadoAtual ?? l.valorImovel ?? 0;
}

/**
 * Valor de mercado pós-obras (reabilitação):
 * usa `valorMercadoPosObras` quando disponível, fallback ao (legado) `valorVendaPrevisto`.
 */
export function valorMercadoPosObrasReab(l: Pick<Listing, "valorMercadoPosObras" | "valorVendaPrevisto">): number {
  return l.valorMercadoPosObras ?? l.valorVendaPrevisto ?? 0;
}

/**
 * Lucro estimado pós-obras (reabilitação):
 * Lucro = Valor de mercado pós-obras − Investimento Total.
 */
export function lucroReab(l: Listing): number {
  return valorMercadoPosObrasReab(l) - investimentoTotalReab(l);
}

/** Alias legado — mantém compat com componentes antigos (simulador). */
export function lucroBrutoReab(l: Listing): number {
  return lucroReab(l);
}

/**
 * ROI da operação prevista (reabilitação):
 * ROI = Lucro / Investimento Total × 100.
 */
export function roiReab(l: Listing): number {
  const inv = investimentoTotalReab(l);
  if (inv <= 0) return 0;
  return (lucroReab(l) / inv) * 100;
}

/**
 * Retorno sobre a entrada (reabilitação):
 * Lucro / Capital próprio investido (capital procurado) × 100.
 */
export function retornoEntradaReab(l: Listing): number {
  const cap = l.capitalProcurado ?? 0;
  if (cap <= 0) return 0;
  return (lucroReab(l) / cap) * 100;
}

/**
 * Preço acordado (CPCV) = Valor do Imóvel − Valor Negociado.
 * O "valor negociado" é o desconto conseguido (quanto se baixou ao preço do imóvel),
 * por isso o preço efetivamente acordado é o valor do imóvel menos esse desconto.
 */
export function precoAcordadoCedencia(
  l: Pick<Listing, "valorImovel" | "valorNegociado">
): number {
  return Math.max(0, (l.valorImovel ?? 0) - (l.valorNegociado ?? 0));
}

/**
 * Restante a pagar ao Promitente Vendedor = Valor do Imóvel − Sinal já pago pelo cedente.
 * Esta é a parcela que o cessionário paga na escritura ao senhorio original.
 */
export function restanteAoPromitenteVendedor(
  l: Pick<Listing, "valorImovel" | "sinalPagoCedente">
): number {
  return Math.max(0, (l.valorImovel ?? 0) - (l.sinalPagoCedente ?? 0));
}

/**
 * Custo Total da Aquisição (CTA) — fórmula v3:
 * CTA = Valor da Cedência + Restante a Pagar ao Promitente Vendedor + Impostos (IMT + IS + Registo).
 */
export function ctaCedencia(l: Listing): number {
  return (
    (l.valorCedencia ?? 0) +
    restanteAoPromitenteVendedor(l) +
    (l.impostos ?? 0)
  );
}

/**
 * Há obras quando o imóvel está "a recuperar" — a app assume cenário com reabilitação.
 */
export function comObrasCedencia(l: Pick<Listing, "estado">): boolean {
  return l.estado === "a recuperar";
}

/**
 * Capital Necessário = dinheiro do bolso do investidor para entrar na cedência:
 * Valor da Cedência + Impostos (IMT + IS + Registo) [+ Valor previsto das obras, se houver obras].
 */
export function capitalNecessarioCedencia(l: Listing): number {
  const base = (l.valorCedencia ?? 0) + (l.impostos ?? 0);
  return comObrasCedencia(l) ? base + (l.obra ?? 0) : base;
}

/**
 * Lucro Estimado.
 * Sem obras: Valor de Mercado Atual − CTA.
 * Com obras: Valor de Mercado Pós-Obras − (CTA + Valor previsto das obras).
 */
/** Valor de mercado pós-obras (com fallback ao valor de mercado atual quando não preenchido). */
export function valorMercadoPosObrasCedencia(l: Pick<Listing, "valorMercadoPosObras" | "valorVendaPrevisto">): number {
  return l.valorMercadoPosObras || l.valorVendaPrevisto || 0;
}

export function lucroCedencia(l: Listing): number {
  if (comObrasCedencia(l)) {
    return valorMercadoPosObrasCedencia(l) - (ctaCedencia(l) + (l.obra ?? 0));
  }
  return (l.valorVendaPrevisto ?? 0) - ctaCedencia(l);
}

/**
 * ROI (Retorno sobre o Investimento) % = (Lucro Estimado / Custo Total) × 100.
 * Sem obras: Lucro / CTA.  Com obras: Lucro Pós-Obras / (CTA + Valor previsto das obras).
 */
export function roiCedencia(l: Listing): number {
  const denom = comObrasCedencia(l) ? ctaCedencia(l) + (l.obra ?? 0) : ctaCedencia(l);
  if (denom <= 0) return 0;
  return (lucroCedencia(l) / denom) * 100;
}

/**
 * Retorno sobre a Entrada % = (Lucro / Capital Investido) × 100.
 * Capital Investido = capital necessário (dinheiro do bolso: cedência + impostos).
 */
export function retornoEntradaCedencia(l: Listing): number {
  const cap = capitalNecessarioCedencia(l);
  if (cap <= 0) return 0;
  return (lucroCedencia(l) / cap) * 100;
}

/** @deprecated Usado por código antigo — devolve agora o Capital Necessário. */
export function capitalCedencia(l: Listing): number {
  return capitalNecessarioCedencia(l);
}

export interface ArrendamentoAuto {
  rendaAnual: number;
  yieldBruto: number;
  yieldLiquido: number;
  rentabilidadeCapital: number;
  roi: number;
}

/** Indicadores de arrendamento (live no publicar) a partir de preço/capital/renda. */
export function arrendamentoAuto(preco: number, capital: number, rendaMensal: number): ArrendamentoAuto {
  const NET = 0.75; // fator líquido aproximado (após despesas correntes)
  const rendaAnual = rendaMensal * 12;
  const yieldBruto = preco > 0 ? (rendaAnual / preco) * 100 : 0;
  const yieldLiquido = yieldBruto * NET;
  const rentabilidadeCapital = capital > 0 ? ((rendaAnual * NET) / capital) * 100 : 0;
  return { rendaAnual, yieldBruto, yieldLiquido, rentabilidadeCapital, roi: rentabilidadeCapital };
}

export interface MetricaCard {
  k: string;
  v: string;
  hero?: boolean;
}

/** Capital "em jogo" do anúncio — usado pelos filtros de capital necessário. */
export function capitalDoAnuncio(l: Listing): number {
  if (l.type === "reabilitacao") return l.capitalProcurado ?? 0;
  if (l.type === "cedencia") return capitalCedencia(l);
  return l.capitalNecessario ?? 0;
}

/** ROI representativo do anúncio (para filtro de ROI mínimo). */
export function roiDoAnuncio(l: Listing): number {
  if (l.type === "reabilitacao") return roiReab(l);
  if (l.type === "cedencia") return roiCedencia(l);
  return l.roi ?? 0;
}

/** Yield representativa (para filtro de yield mínima) — só arrendamento. */
export function yieldDoAnuncio(l: Listing): number {
  return l.type === "arrendamento" ? l.yieldLiquido ?? 0 : 0;
}
