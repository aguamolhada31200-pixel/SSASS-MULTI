import type { Property } from "@/store/usePropertiesStore";
import { computeImovel } from "@/lib/calc/imovel";
import { n } from "@/lib/format";

export type SituacaoEstado = "ganha" | "perde" | "vago" | "obras";

export interface SituacaoImovel {
  estado: SituacaoEstado;
  emoji: string;
  cor: string; // token css
  titulo: string;
  resultadoMensal: number;
  resultadoAnual: number;
  yieldAtual: number; // yield líquida %
}

/** "Veredito num relance" da Situação Financeira do imóvel — derivado dos KPIs. */
export function situacaoImovel(p: Property): SituacaoImovel {
  const k = computeImovel(p);
  const base = {
    resultadoMensal: k.cashflowMensal,
    resultadoAnual: k.cashflowAnual,
    yieldAtual: k.yieldLiquida,
  };

  if (p.status === "em_obras")
    return { estado: "obras", emoji: "🟠", cor: "var(--warning)", titulo: "Em obras — sem rendimento ativo", ...base };

  if (p.rendaMensal === 0)
    return {
      estado: "vago",
      emoji: "🔴",
      cor: "var(--danger)",
      titulo: `Vago — cada mês custa ${n(Math.round(k.totalDespesasMensais))} €`,
      ...base,
    };

  if (k.cashflowMensal > 0)
    return { estado: "ganha", emoji: "🟢", cor: "var(--success)", titulo: `A gerar +${n(Math.round(k.cashflowMensal))} €/mês`, ...base };

  return {
    estado: "perde",
    emoji: "🟡",
    cor: "var(--warning)",
    titulo: `Arrendado mas perde ${n(Math.abs(Math.round(k.cashflowMensal)))} €/mês`,
    ...base,
  };
}
