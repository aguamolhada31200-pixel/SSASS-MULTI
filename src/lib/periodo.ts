export type Periodo = "mes" | "trimestre" | "ano" | "tudo";

export const PERIODO_LABEL: Record<Periodo, string> = {
  mes: "Este mês",
  trimestre: "Trimestre",
  ano: "Ano",
  tudo: "Tudo",
};

export const PERIODOS: Periodo[] = ["mes", "trimestre", "ano", "tudo"];

/** Aceita uma data ISO (YYYY-MM-DD) e devolve se entra no período. */
export function dentroPeriodo(dataIso: string, p: Periodo, hoje = new Date()): boolean {
  if (p === "tudo") return true;
  const d = new Date(`${dataIso}T00:00:00`);
  if (isNaN(d.getTime())) return false;
  if (p === "mes") return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
  if (p === "ano") return d.getFullYear() === hoje.getFullYear();
  // trimestre = últimos 3 meses (corrente + 2 anteriores)
  const limite = new Date(hoje);
  limite.setMonth(limite.getMonth() - 2);
  limite.setDate(1);
  return d >= limite;
}
