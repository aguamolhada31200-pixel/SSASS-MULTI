// Formatação PT — separador de milhares "1.350", vírgula decimal.

const eur0 = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eur2 = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const num0 = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 });

/** Moeda sem casas decimais: 1.350 € */
export function eur(value: number): string {
  if (!isFinite(value)) return "—";
  return eur0.format(value);
}

/** Moeda com 2 casas: 1.350,00 € */
export function eurCents(value: number): string {
  if (!isFinite(value)) return "—";
  return eur2.format(value);
}

/** Percentagem: 6,2% */
export function pct(value: number, digits = 1): string {
  if (!isFinite(value)) return "—";
  return `${value.toLocaleString("pt-PT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/** Número simples com milhares */
export function n(value: number): string {
  if (!isFinite(value)) return "—";
  return num0.format(value);
}

/** Sinal explícito: +1.200 € / -300 € */
export function eurSigned(value: number): string {
  const s = eur(Math.abs(value));
  return value < 0 ? `-${s}` : `+${s}`;
}

const dateLong = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
const dateShort = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Data PT: "14 jun 2026" — recebe YYYY-MM-DD ou Date. */
export function dataPT(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(`${iso}T00:00:00`) : iso;
  if (isNaN(d.getTime())) return "—";
  return dateLong.format(d);
}

/** Data numérica PT: "14/06/2026". */
export function dataPTShort(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(`${iso}T00:00:00`) : iso;
  if (isNaN(d.getTime())) return "—";
  return dateShort.format(d);
}
