import { Database } from "lucide-react";
import { useExampleData } from "@/store/useExampleData";
import { cn } from "@/lib/utils";

/** Toggle "Dados de exemplo" (ferramenta de dev/demo do blueprint). */
export function ExampleDataToggle() {
  const { enabled, toggle } = useExampleData();
  return (
    <button
      onClick={toggle}
      title="Alternar dados de exemplo (vazio ↔ populado)"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        enabled
          ? "border-secondary/30 bg-accent text-secondary"
          : "border-line bg-card text-muted hover:bg-accent"
      )}
    >
      <Database size={13} />
      Dados de exemplo
      <span
        className={cn(
          "ml-1 inline-flex h-4 w-7 items-center rounded-full p-0.5 transition-colors",
          enabled ? "bg-secondary" : "bg-line"
        )}
      >
        <span
          className={cn(
            "h-3 w-3 rounded-full bg-white transition-transform",
            enabled && "translate-x-3"
          )}
        />
      </span>
    </button>
  );
}
