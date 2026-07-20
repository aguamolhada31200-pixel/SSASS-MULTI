import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Estado vazio DENTRO de formulários (padrão transversal, Parte 3):
// nenhum seletor de entidade fica num beco sem saída — mensagem curta +
// botão que leva à criação, e regresso ao fluxo depois de criar.

export function EmptyPicker({
  icon: Icon,
  titulo,
  linha,
  ctaLabel,
  onCta,
  secundario,
  className,
}: {
  icon: LucideIcon;
  titulo: string;
  linha: string;
  ctaLabel: string;
  onCta: () => void;
  /** Alternativa discreta (ex.: "Ou criar esta obra num imóvel meu"). */
  secundario?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed border-line bg-accent p-5 text-center",
        className
      )}
    >
      <Icon size={20} className="text-muted" />
      <p className="mt-2 text-[15px] font-medium text-ink">{titulo}</p>
      <p className="mt-0.5 text-[13px] text-muted">{linha}</p>
      <button
        type="button"
        onClick={onCta}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-gold px-4 text-sm font-semibold text-sidebar transition-colors hover:bg-gold-dark hover:text-white sm:w-auto"
      >
        {ctaLabel}
      </button>
      {secundario && (
        <button
          type="button"
          onClick={secundario.onClick}
          className="mt-2 text-[13px] text-secondary underline hover:text-ink"
        >
          {secundario.label}
        </button>
      )}
    </div>
  );
}
