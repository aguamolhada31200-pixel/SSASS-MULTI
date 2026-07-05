import { Sparkles } from "lucide-react";
import type { CollabProject } from "@/store/useCollabStore";

/** Cabeçalho de secção premium (dourado + Playfair), igual ao do ProjectRoom. */
export function CollabSH({ title }: { title: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-widest text-secondary">
      <span className="h-1.5 w-1.5 rounded-full bg-gold" />
      {title}
      <Sparkles size={10} className="text-gold/40" />
    </h3>
  );
}

/** Ids dos sócios ativos do projeto (para broadcasts de notificações). */
export function sociosIds(project: CollabProject, exceto?: string): string[] {
  return project.partners
    .filter((s) => (s.status ?? "ativo") === "ativo" && s.id !== exceto)
    .map((s) => s.id);
}

export const inputCls =
  "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";
