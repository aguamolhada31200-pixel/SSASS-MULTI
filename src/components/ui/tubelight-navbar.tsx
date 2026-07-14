import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Tubelight navbar (adaptado de shadcn/ui community para Vite + react-router):
// - sem "use client"/next-link — o pai controla navegação via onClick
// - `active` vem por prop (as tabs da Rede vivem no URL, não em estado interno)
// - fica NO FLUXO da página (sem fixed/sticky — regra da Rede)
// - cores do design system madeira: cartão sobre o fundo creme da página,
//   ativo em accent + lâmpada em primary

export interface NavBarItem {
  name: string;
  /** Texto mostrado (permite contadores, ex.: "Guardados (3)"). Default: name. */
  label?: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface NavBarProps {
  items: NavBarItem[];
  /** name do item ativo ("" = nenhum) */
  active: string;
  className?: string;
}

export function NavBar({ items, active, className }: NavBarProps) {
  return (
    <div className={cn("z-10", className)}>
      <div className="flex items-center gap-1 rounded-full border border-line bg-card px-1 py-1 shadow-sm">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.name;

          return (
            <button
              key={item.name}
              onClick={item.onClick}
              className={cn(
                "relative cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-6",
                "text-muted hover:text-primary",
                isActive && "bg-accent text-primary"
              )}
            >
              <span className="hidden md:inline">{item.label ?? item.name}</span>
              <span className="md:hidden">
                <Icon size={18} strokeWidth={2.5} />
              </span>
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 -z-10 w-full rounded-full bg-primary/5"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <div className="absolute -top-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-t-full bg-primary">
                    <div className="absolute -left-2 -top-2 h-6 w-12 rounded-full bg-primary/20 blur-md" />
                    <div className="absolute -top-1 h-6 w-8 rounded-full bg-primary/20 blur-md" />
                    <div className="absolute left-2 top-0 h-4 w-4 rounded-full bg-primary/20 blur-sm" />
                  </div>
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
