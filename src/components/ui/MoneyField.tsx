import { useEffect, useState } from "react";
import { useController, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";

// Input de valores com separador de milhares automático (ex.: 160.000).
// O <input type="number"> nativo não permite pontos de milhares — por isso
// usamos type="text" + inputMode numérico e formatamos/desformatamos à mão.
// Convenção PT: ponto de milhares, vírgula decimal.

/** Agrupa dígitos em milhares: "160000" → "160.000". */
function agruparMilhares(digitos: string): string {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Número (ou string) → texto formatado para mostrar. 0/vazio → "" (campo limpo). */
function paraTexto(v: unknown, comDecimais: boolean): string {
  if (v === undefined || v === null || v === "") return "";
  const num = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."));
  if (!isFinite(num) || num === 0) return "";
  const neg = num < 0;
  const abs = Math.abs(num);
  if (comDecimais) {
    const [i, d] = String(abs).split(".");
    const g = agruparMilhares(i);
    return (neg ? "-" : "") + (d ? `${g},${d.slice(0, 2)}` : g);
  }
  return (neg ? "-" : "") + agruparMilhares(String(Math.round(abs)));
}

interface MoneyBoxProps {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  onBlur?: () => void;
  suffix?: string;
  placeholder?: string;
  comDecimais?: boolean;
  className?: string;
}

/** Caixa de valor controlada (value/onChange numéricos) — reutilizável fora do RHF. */
export function MoneyBox({ value, onChange, onBlur, suffix = "€", placeholder, comDecimais = false, className }: MoneyBoxProps) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState<string>(() => paraTexto(value, comDecimais));

  // Sincroniza o display quando o valor muda por fora (reset, cálculo automático)
  // e o campo não está a ser editado.
  useEffect(() => {
    if (!focused) setText(paraTexto(value, comDecimais));
  }, [value, focused, comDecimais]);

  const handleChange = (raw: string) => {
    if (comDecimais) {
      let cleaned = raw.replace(/[^\d,]/g, "");
      const firstComma = cleaned.indexOf(",");
      if (firstComma !== -1) {
        cleaned = cleaned.slice(0, firstComma + 1) + cleaned.slice(firstComma + 1).replace(/,/g, "");
      }
      const [i, d] = cleaned.split(",");
      const g = agruparMilhares(i || "");
      setText(cleaned.includes(",") ? `${g},${(d ?? "").slice(0, 2)}` : g);
      if (cleaned === "" || cleaned === ",") { onChange(undefined); return; }
      const numeric = Number(`${i || "0"}.${(d ?? "").slice(0, 2) || "0"}`);
      onChange(isFinite(numeric) ? numeric : undefined);
    } else {
      const digits = raw.replace(/[^\d]/g, "");
      setText(agruparMilhares(digits));
      onChange(digits === "" ? undefined : Number(digits));
    }
  };

  return (
    <div className={cn("flex items-center rounded-lg border border-line bg-card focus-within:border-secondary", className)}>
      <input
        inputMode={comDecimais ? "decimal" : "numeric"}
        value={text}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur?.(); }}
        onChange={(e) => handleChange(e.target.value)}
        className="h-10 w-full bg-transparent px-3 text-sm outline-none"
      />
      {suffix && <span className="px-3 text-sm text-muted">{suffix}</span>}
    </div>
  );
}

interface RHFMoneyProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  suffix?: string;
  placeholder?: string;
  comDecimais?: boolean;
  className?: string;
}

/** Caixa de valor ligada ao react-hook-form (sem label) — para usar dentro de um Field próprio. */
export function RHFMoney<T extends FieldValues>({ control, name, suffix, placeholder, comDecimais, className }: RHFMoneyProps<T>) {
  const { field } = useController({ control, name });
  return (
    <MoneyBox
      value={field.value as number | undefined}
      onChange={field.onChange}
      onBlur={field.onBlur}
      suffix={suffix}
      placeholder={placeholder}
      comDecimais={comDecimais}
      className={className}
    />
  );
}

/** Campo de valor completo (label + caixa + erro) ligado ao react-hook-form. */
export function MoneyInput<T extends FieldValues>({
  control,
  name,
  label,
  error,
  suffix = "€",
  placeholder,
  comDecimais,
  hint,
  className,
}: RHFMoneyProps<T> & { label: string; error?: string; hint?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <RHFMoney control={control} name={name} suffix={suffix} placeholder={placeholder} comDecimais={comDecimais} />
      {hint && <span className="mt-1 block text-[10px] text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
