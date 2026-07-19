import { Eye, ShieldCheck, Users2 } from "lucide-react";
import { useViewAs, type ViewAsModo } from "@/store/useViewAs";
import { cn } from "@/lib/utils";

const OPCOES: { modo: ViewAsModo; label: string; icon?: typeof Eye }[] = [
  { modo: "auto", label: "Auto" },
  { modo: "gestor", label: "Gestor", icon: ShieldCheck },
  { modo: "investidor", label: "Parceiro", icon: Users2 },
];

/**
 * "Ver como" — alterna a vista da Gestão Colaborativa entre Gestor e Parceiro
 * (sócio investidor) para pré-visualizar as funcionalidades de cada papel.
 * Afeta só o que o utilizador atual vê/pode fazer; os sócios reais não mudam.
 */
export function VerComoToggle({ className, tomEscuro = false }: { className?: string; tomEscuro?: boolean }) {
  const modo = useViewAs((s) => s.modo);
  const setModo = useViewAs((s) => s.setModo);

  return (
    <div
      title="Pré-visualiza as funcionalidades de cada papel. Só muda a tua vista — os sócios reais mantêm-se."
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-dashed px-1.5 py-1",
        tomEscuro ? "border-white/25 bg-white/5" : "border-gold/40 bg-gold/5",
        className
      )}
    >
      <span className={cn("flex items-center gap-1 pl-1.5 pr-0.5 text-[11px] font-medium", tomEscuro ? "text-white/70" : "text-muted")}>
        <Eye size={12} /> Ver como
      </span>
      <div className={cn("inline-flex rounded-full p-0.5", tomEscuro ? "bg-black/20" : "bg-black/5")}>
        {OPCOES.map((o) => {
          const ativo = modo === o.modo;
          const Icon = o.icon;
          return (
            <button
              key={o.modo}
              onClick={() => setModo(o.modo)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
                ativo
                  ? tomEscuro
                    ? "bg-gold text-sidebar shadow-sm"
                    : "bg-primary text-white shadow-sm"
                  : tomEscuro
                    ? "text-white/70 hover:text-white"
                    : "text-muted hover:text-ink"
              )}
            >
              {Icon && <Icon size={12} />}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
