import { useEffect } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Diálogo de confirmação estilizado — substitui window.confirm em toda a app.
// variant "danger" (padrão) para ações destrutivas; "primary" para confirmações neutras.
export function ConfirmDialog({ titulo, mensagem, cta, variant = "danger", onConfirm, onClose }: {
  titulo: string;
  mensagem: string;
  cta: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const danger = variant === "danger";
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl border border-line bg-card p-5 shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center gap-2.5">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", danger ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary")}>
            <AlertTriangle size={18} />
          </span>
          <h3 className="font-display text-base font-semibold text-ink">{titulo}</h3>
        </div>
        <p className="text-sm text-muted">{mensagem}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant={danger ? "danger" : "primary"} size="sm" onClick={onConfirm}>
            {danger && <Trash2 size={14} />} {cta}
          </Button>
        </div>
      </div>
    </div>
  );
}
