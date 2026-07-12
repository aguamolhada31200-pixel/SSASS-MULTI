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
 * CONVENÇÃO DO SPLIT: o formato é "investidor / promotor" e o **primeiro número
 * é sempre a parte do PARCEIRO investidor** (quem entra com o capital).
 * Ex.: "60 / 40" → investidor 60%, promotor (dono do anúncio) 40%.
 * Sem split definido → assume 100 (sem partilha, o investidor fica com o lucro todo).
 */
export function splitParceiroPct(l: Pick<Listing, "split">): number {
  if (!l.split || !l.split.trim()) return 100;
  const m = l.split.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return 100;
  const v = parseFloat(m[1].replace(",", "."));
  return isFinite(v) && v > 0 && v <= 100 ? v : 100;
}

/** Parte do lucro que fica para o PROMOTOR (dono do anúncio) = 100 − parte do investidor. */
export function splitPromotorPct(l: Pick<Listing, "split">): number {
  return Math.max(0, 100 - splitParceiroPct(l));
}

/**
 * Lucro estimado do PARCEIRO = Lucro estimado pós-obras × (Split ÷ 100).
 * Representa o que efetivamente cabe ao investidor externo depois de partilhar
 * com o dono do anúncio.
 */
export function lucroParceiroReab(l: Listing): number {
  return lucroReab(l) * (splitParceiroPct(l) / 100);
}

/**
 * Retorno sobre a Entrada % = (Lucro do PARCEIRO ÷ Capital Procurado) × 100.
 * Bug corrigido: usava o lucro TOTAL do projeto, ignorando o split — o retorno
 * vinha inflacionado quando o autor ficava com metade.
 * Exemplo: Lucro 42.000 · Split 50 · Capital 25.000
 *   → Lucro parceiro = 21.000 → Retorno = 84% (era 168% antes).
 */
export function retornoEntradaReab(l: Listing): number {
  const cap = l.capitalProcurado ?? 0;
  if (cap <= 0) return 0;
  return (lucroParceiroReab(l) / cap) * 100;
}

/**
 * Folga Financeira (reabilitação) = Valor de Mercado Pós-Obras − Investimento Total.
 * Numericamente igual ao lucro pós-obras, mas noutra ótica: a almofada em euros
 * até ao break-even (quanto o preço de venda pode cair sem gerar prejuízo).
 */
export function folgaFinanceiraReab(l: Listing): number {
  return lucroReab(l);
}

/**
 * Margem de Segurança (%) = (Folga Financeira ÷ Valor de Mercado Pós-Obras) × 100.
 * Mede a folga sobre o PREÇO DE VENDA (não sobre o investimento, como o ROI) —
 * quanto o valor de venda pode descer antes de o negócio deixar de dar lucro.
 */
export function margemSegurancaReab(l: Listing): number {
  const pos = valorMercadoPosObrasReab(l);
  if (pos <= 0) return 0;
  return (folgaFinanceiraReab(l) / pos) * 100;
}

export type NivelSeguranca = "muito_segura" | "boa" | "atencao" | "risco";

/** Classificação da margem de segurança: >20% muito segura · 15–20% boa · 10–15% atenção · <10% risco. */
export function nivelSegurancaReab(margemPct: number): NivelSeguranca {
  if (margemPct >= 20) return "muito_segura";
  if (margemPct >= 15) return "boa";
  if (margemPct >= 10) return "atencao";
  return "risco";
}

export const NIVEL_SEGURANCA_LABEL: Record<NivelSeguranca, string> = {
  muito_segura: "Excelente",
  boa: "Boa",
  atencao: "Atenção",
  risco: "Elevado risco",
};

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
 * Há obras quando o NEGÓCIO envolve reabilitação:
 * · valor de obras previsto > 0; ou
 * · tipo de cedência ≠ "apenas CPCV" (projeto aprovado, licença e obra
 *   iniciada implicam reabilitação à frente).
 * Uma cedência "apenas CPCV" sem obras previstas avalia-se pelo mercado ATUAL
 * — o estado do imóvel ("a recuperar") descreve o imóvel, não o plano.
 */
export function comObrasCedencia(
  l: Pick<Listing, "tipoCedencia" | "obra" | "valorMercadoPosObras" | "estado">
): boolean {
  if ((l.obra ?? 0) > 0) return true;
  if (l.tipoCedencia) return l.tipoCedencia !== "cpcv";
  // retro-compat: anúncios antigos sem tipo definido
  return (l.valorMercadoPosObras ?? 0) > 0 || l.estado === "a recuperar";
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
 * Investimento Total (cedência):
 * Sem obras: CTA.  Com obras: CTA + Valor previsto das obras.
 */
export function investimentoTotalCedencia(l: Listing): number {
  return comObrasCedencia(l) ? ctaCedencia(l) + (l.obra ?? 0) : ctaCedencia(l);
}

/** Label do ROI em cedência — muda consoante o cenário. */
export function roiLabelCedencia(
  l: Pick<Listing, "tipoCedencia" | "obra" | "valorMercadoPosObras" | "estado">
): string {
  return comObrasCedencia(l) ? "ROI pós-obras" : "ROI da operação";
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
