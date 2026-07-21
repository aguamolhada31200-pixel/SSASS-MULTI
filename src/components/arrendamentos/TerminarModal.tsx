import { useState } from "react";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  useArrendamentosStore,
  MOTIVO_TERMINACAO_LABEL,
  type Arrendamento,
  type MotivoTerminacao,
} from "@/store/useArrendamentosStore";
import { cn } from "@/lib/utils";

const inputCls = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

/** Modal de terminação de arrendamento — data + motivo. Devolve o imóvel a «Disponível». */
export function TerminarModal({
  arrendamento,
  onClose,
  onDone,
}: {
  arrendamento: Arrendamento;
  onClose: () => void;
  onDone?: () => void;
}) {
  const terminate = useArrendamentosStore((s) => s.terminate);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState<MotivoTerminacao>("fim_contrato");

  const submit = () => {
    terminate(arrendamento.id, motivo, data);
    toastSuccess("Arrendamento terminado", {
      description: "O imóvel voltou a «Disponível» e deixou de gerar rendas previstas.",
    });
    onClose();
    onDone?.();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onMouseDown={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-display text-base font-semibold text-ink">Terminar arrendamento</h3>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <p className="text-sm text-muted">
            <strong className="text-ink">{arrendamento.identificador}</strong> — ao terminar, o imóvel
            volta a «Disponível» e deixa de gerar rendas previstas.
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Data de terminação</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Motivo</span>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoTerminacao)} className={inputCls}>
              {(Object.keys(MOTIVO_TERMINACAO_LABEL) as MotivoTerminacao[]).map((k) => (
                <option key={k} value={k}>
                  {MOTIVO_TERMINACAO_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={cn("flex items-center justify-end gap-2 border-t border-line px-5 py-4")}>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={submit}>
            <LogOut size={15} /> Terminar arrendamento
          </Button>
        </div>
      </div>
    </div>
  );
}
