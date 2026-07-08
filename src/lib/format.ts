// Formatação PT — separador de milhares "1.350", vírgula decimal.
// Nota: o Intl "pt-PT" usa ESPAÇO como separador ("245 000") e não agrupa
// números de 4 dígitos ("1350"). O padrão do produto é ponto de milhares
// SEMPRE ("1.350", "245.000") com vírgula decimal — exatamente a convenção
// numérica "de-DE" do Intl, que usamos aqui só para números (datas ficam pt-PT).

const eur0 = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eur2 = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const num0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

/** Evita "-0" / "-0,0" quando o arredondamento dá zero. */
function semZeroNegativo(value: number, digits: number): number {
  const arred = Number(value.toFixed(digits));
  return Object.is(arred, -0) || arred === 0 ? 0 : arred;
}

/** Moeda sem casas decimais: 1.350 € */
export function eur(value: number): string {
  if (!isFinite(value)) return "—";
  return eur0.format(semZeroNegativo(value, 0));
}

/** Moeda com 2 casas: 1.350,00 € */
export function eurCents(value: number): string {
  if (!isFinite(value)) return "—";
  return eur2.format(semZeroNegativo(value, 2));
}

/** Percentagem: 6,2% */
export function pct(value: number, digits = 1): string {
  if (!isFinite(value)) return "—";
  return `${semZeroNegativo(value, digits).toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/** Número simples com milhares: 1.350 */
export function n(value: number): string {
  if (!isFinite(value)) return "—";
  return num0.format(semZeroNegativo(value, 0));
}

/** Número com 1 casa decimal e vírgula: 10,8 (para "10,8 anos", "4,5 meses"…) */
export function n1(value: number): string {
  if (!isFinite(value)) return "—";
  return semZeroNegativo(value, 1).toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
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

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Mês por extenso: "julho de 2026" — recebe "YYYY-MM", YYYY-MM-DD ou Date. */
export function mesPT(input: string | Date): string {
  const d = typeof input === "string" ? new Date(`${input.length === 7 ? `${input}-01` : input}T00:00:00`) : input;
  if (isNaN(d.getTime())) return "—";
  return `${MESES_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Plural simples: plural(1, "visualização", "visualizações") → "1 visualização". */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${n(count)} ${count === 1 ? singular : pluralForm}`;
}
