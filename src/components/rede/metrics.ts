import type { Listing } from "@/store/useListingsStore";
import { eur, pct } from "@/lib/format";
import {
  investimentoTotalReab,
  roiReab,
  ctaCedencia,
  lucroCedencia,
  roiCedencia,
  roiLabelCedencia,
  retornoEntradaCedencia,
  capitalNecessarioCedencia,
} from "@/lib/calc/rede";

export interface Metrica {
  k: string;
  v: string;
  hero?: boolean;
  tone?: "gold" | "default";
}

/** Métricas-chave do card (capa), type-aware (documento secção 4). */
export function metricasCard(l: Listing): Metrica[] {
  if (l.type === "reabilitacao") {
    return [
      { k: "Valor do imóvel", v: eur(l.valorImovel ?? 0) },
      { k: "Investimento total", v: eur(investimentoTotalReab(l)) },
      { k: "Capital procurado", v: eur(l.capitalProcurado ?? 0) },
      { k: "ROI esperado", v: pct(roiReab(l)), hero: true, tone: "gold" },
      { k: "Split", v: l.split ?? "—" },
      { k: "Até venda", v: l.tempoAteVenda ?? "—" },
    ];
  }
  if (l.type === "cedencia") {
    return [
      { k: "Desconto obtido", v: eur(l.valorNegociado ?? 0) },
      { k: "Valor da cedência", v: eur(l.valorCedencia ?? 0) },
      { k: "CTA", v: eur(ctaCedencia(l)) },
      { k: "Lucro estimado", v: eur(lucroCedencia(l)) },
      { k: roiLabelCedencia(l), v: pct(roiCedencia(l)), hero: true, tone: "gold" },
      { k: "Retorno s/ entrada", v: pct(retornoEntradaCedencia(l)), tone: "gold" },
    ];
  }
  return [
    { k: "Preço", v: eur(l.precoImovel ?? 0) },
    { k: "Capital necessário", v: eur(l.capitalNecessario ?? 0) },
    { k: "Renda mensal", v: eur(l.rendaMensal ?? 0) },
    { k: "Yield líquido", v: pct(l.yieldLiquido ?? 0), hero: true, tone: "gold" },
    { k: "Rentab. s/ capital", v: pct(l.rentabilidadeCapital ?? 0) },
    { k: "ROI", v: pct(l.roi ?? 0) },
  ];
}

/** Faixa de métricas-chave do hero do detalhe (4 valores). */
export function metricasHero(l: Listing): Metrica[] {
  if (l.type === "reabilitacao")
    return [
      { k: "Capital procurado", v: eur(l.capitalProcurado ?? 0), hero: true },
      { k: "Investimento total", v: eur(investimentoTotalReab(l)) },
      { k: "ROI esperado", v: pct(roiReab(l)) },
      { k: "Até venda", v: l.tempoAteVenda ?? "—" },
    ];
  if (l.type === "cedencia")
    return [
      { k: "Capital Necessário", v: eur(capitalNecessarioCedencia(l)), hero: true },
      { k: "Lucro Estimado", v: eur(lucroCedencia(l)) },
      { k: "Retorno s/ Entrada", v: pct(retornoEntradaCedencia(l)) },
      { k: "Custo Total Aquisição", v: eur(ctaCedencia(l)) },
    ];
  return [
    { k: "Capital necessário", v: eur(l.capitalNecessario ?? 0), hero: true },
    { k: "Yield líquido", v: pct(l.yieldLiquido ?? 0) },
    { k: "Renda mensal", v: eur(l.rendaMensal ?? 0) },
    { k: "Preço do imóvel", v: eur(l.precoImovel ?? 0) },
  ];
}
