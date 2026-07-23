import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Diálogo de texto (criar / renomear) estilizado — substitui window.prompt em toda a app.
export function NomeModal({ titulo, valorInicial, cta, placeholder, onConfirm, onClose }: {
  titulo: string;
  valorInicial: string;
  cta: string;
  placeholder?: string;
  onConfirm: (nome: string) => void;
  onClose: () => void;
}) {
  const [v, setV] = useState(valorInicial);
  const submeter = () => { const n = v.trim(); if (!n) return; onConfirm(n); };
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl border border-line bg-card p-5 shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink">{titulo}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>
        <input
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submeter(); } if (e.key === "Escape") onClose(); }}
          placeholder={placeholder ?? "Nome"}
          className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={submeter} disabled={!v.trim()}>{cta}</Button>
        </div>
      </div>
    </div>
  );
}
