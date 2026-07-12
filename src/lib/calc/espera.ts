import type { Property } from "@/store/usePropertiesStore";

// Custo de espera: quanto custa deter o imóvel por mês enquanto não rende.
// custoEspera/mês = prestação + IMI/12 + condomínio + seguro/12 + outras

/** Custo mensal de detenção do imóvel (0 se ainda não há imóvel associado). */
export function custoEsperaMes(p?: Property): number {
  if (!p) return 0;
  return p.prestacaoMensal + p.imiAnual / 12 + p.condominioMensal + p.seguroAnual / 12 + p.outrasMensais;
}

/** Custo de detenção por dia. */
export function custoEsperaDia(p?: Property): number {
  return custoEsperaMes(p) / 30;
}
