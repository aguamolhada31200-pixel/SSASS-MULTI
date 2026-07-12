import { useState } from "react";
import { toast } from "sonner";
import { Lock, X, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAccountStore, type Privado, type RegimeFiscal } from "@/store/useAccountStore";
import { cn } from "@/lib/utils";

/** Campos sensíveis que podem ser pedidos por uma feature. */
export type CampoSensivel =
  | "nif"
  | "iban"
  | "cc"
  | "ccValidade"
  | "moradaFiscal"
  | "codigoPostal"
  | "regimeFiscal"
  | "contabilistaEmail";

interface CampoMeta {
  label: string;
  micro?: string; // etiqueta de confiança
  type?: "text" | "date" | "select";
  placeholder?: string;
}

const CAMPO_META: Record<CampoSensivel, CampoMeta> = {
  nif: { label: "NIF", micro: "Aparece apenas em contratos. Nunca partilhamos.", placeholder: "9 dígitos" },
  iban: { label: "IBAN", micro: "Apenas para constar nos contratos. Não fazemos cobranças.", placeholder: "PT50 …" },
  cc: { label: "Cartão de Cidadão", micro: "Apenas para verificação. Eliminado após validação.", placeholder: "Nº do documento" },
  ccValidade: { label: "Validade do CC", type: "date" },
  moradaFiscal: { label: "Morada fiscal", micro: "Aparece na fatura do redegest (RGPD).", placeholder: "Rua, nº, andar" },
  codigoPostal: { label: "Código postal", placeholder: "0000-000" },
  regimeFiscal: { label: "Regime fiscal", type: "select" },
  contabilistaEmail: { label: "Email do contabilista", placeholder: "nome@contab.pt" },
};

const REGIMES: { v: RegimeFiscal; l: string }[] = [
  { v: "categoria_F", l: "Categoria F (predial)" },
  { v: "atividade_aberta", l: "Atividade aberta" },
  { v: "empresa", l: "Empresa" },
];

/** Devolve os campos em falta de uma lista, lendo o perfil privado. */
export function camposEmFalta(privado: Privado, campos: CampoSensivel[]): CampoSensivel[] {
  return campos.filter((c) => {
    const v = privado[c];
    return v === undefined || v === null || String(v).trim() === "";
  });
}

/** Hook: lista de campos em falta (reativo). */
export function useCamposEmFalta(campos: CampoSensivel[]): CampoSensivel[] {
  const privado = useAccountStore((s) => s.privado);
  return camposEmFalta(privado, campos);
}

function frase(campos: CampoSensivel[]): string {
  const labels = campos.map((c) => CAMPO_META[c].label);
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
}

const inputCls = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

// ───────────────────────── Mini-modal (só os campos necessários) ─────────────────────────

export function UnlockModal({
  campos,
  feature,
  explicacao,
  onClose,
  onDone,
}: {
  campos: CampoSensivel[];
  feature: string;
  explicacao?: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  const privado = useAccountStore((s) => s.privado);
  const updatePrivado = useAccountStore((s) => s.updatePrivado);
  // só pedimos os que faltam (se nenhum falta, pedimos todos os listados)
  const emFalta = camposEmFalta(privado, campos);
  const aPedir = emFalta.length ? emFalta : campos;

  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(aPedir.map((c) => [c, String(privado[c] ?? "")]))
  );
  const set = (c: string, v: string) => setValores((p) => ({ ...p, [c]: v }));

  const guardar = () => {
    const patch: Partial<Privado> = {};
    aPedir.forEach((c) => {
      if (c === "regimeFiscal") patch.regimeFiscal = (valores[c] || "categoria_F") as RegimeFiscal;
      else (patch as Record<string, string>)[c] = valores[c]?.trim() ?? "";
    });
    const faltou = aPedir.some((c) => c !== "regimeFiscal" && !valores[c]?.trim());
    if (faltou) {
      toast.error("Preencha os campos para destravar a funcionalidade");
      return;
    }
    updatePrivado(patch);
    toast.success(`Tudo pronto para ${feature} ✨`);
    onClose();
    onDone?.();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold-dark"><Lock size={16} /></span>
            <h2 className="font-display text-base font-semibold text-ink">Preencher para {feature}</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {explicacao && <p className="rounded-lg bg-accent/60 px-3 py-2 text-xs text-secondary">{explicacao}</p>}
          {aPedir.map((c) => {
            const meta = CAMPO_META[c];
            return (
              <label key={c} className="block">
                <span className="mb-1 block text-xs font-medium text-muted">{meta.label}</span>
                {meta.type === "select" ? (
                  <select value={valores[c] || "categoria_F"} onChange={(e) => set(c, e.target.value)} className={inputCls}>
                    {REGIMES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                ) : (
                  <input
                    type={meta.type === "date" ? "date" : "text"}
                    value={valores[c] ?? ""}
                    onChange={(e) => set(c, e.target.value)}
                    placeholder={meta.placeholder}
                    className={inputCls}
                  />
                )}
                {meta.micro && <span className="mt-1 block text-[11px] text-muted">🔒 {meta.micro}</span>}
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-4">
          <Button variant="ghost" onClick={onClose}>Agora não</Button>
          <Button variant="gold" onClick={guardar}>Guardar e continuar</Button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Soft-block (envolve children) ─────────────────────────

export function UnlockGate({
  feature,
  camposNecessarios,
  explicacao,
  valor,
  onUnlock,
  children,
  className,
}: {
  feature: string;
  camposNecessarios: CampoSensivel[];
  explicacao: string;
  valor?: string;
  onUnlock?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const faltam = useCamposEmFalta(camposNecessarios);
  const [modal, setModal] = useState(false);

  if (faltam.length === 0) return <>{children}</>;

  return (
    <>
      <div className={cn("rounded-2xl border border-gold/30 bg-gold/5 p-6 text-center", className)}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark">
          <Lock size={22} />
        </div>
        <h3 className="font-display text-lg font-semibold text-ink">
          Para {feature}, precisamos do seu {frase(faltam)}
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{explicacao}</p>
        {valor && (
          <p className="mx-auto mt-3 flex max-w-md items-start justify-center gap-1.5 rounded-lg bg-accent/60 px-3 py-2 text-xs text-secondary">
            <Sparkles size={13} className="mt-0.5 shrink-0 text-gold-dark" /> <span>Vai destravar: {valor}</span>
          </p>
        )}
        <div className="mt-4 flex flex-col items-center gap-2">
          <Button variant="gold" onClick={() => setModal(true)}>Preencher agora (30 segundos)</Button>
          <button onClick={() => toast.message("Sem problema — pode preencher quando quiser.")} className="text-xs text-muted hover:text-ink">
            Continuar a explorar
          </button>
        </div>
      </div>

      {modal && (
        <UnlockModal
          campos={camposNecessarios}
          feature={feature}
          explicacao={explicacao}
          onClose={() => setModal(false)}
          onDone={onUnlock}
        />
      )}
    </>
  );
}

/** Botão que destrava: se faltam campos, abre o mini-modal; senão dispara a ação. */
export function UnlockButton({
  campos,
  feature,
  explicacao,
  onReady,
  children,
  variant = "primary",
  size = "md",
  className,
}: {
  campos: CampoSensivel[];
  feature: string;
  explicacao?: string;
  onReady: () => void;
  children: React.ReactNode;
  variant?: "primary" | "gold" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const faltam = useCamposEmFalta(campos);
  const [modal, setModal] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => (faltam.length ? setModal(true) : onReady())}>
        {faltam.length > 0 && <Lock size={14} />} {children}
      </Button>
      {modal && (
        <UnlockModal campos={campos} feature={feature} explicacao={explicacao} onClose={() => setModal(false)} onDone={onReady} />
      )}
    </>
  );
}

export { ArrowRight as UnlockArrow };
