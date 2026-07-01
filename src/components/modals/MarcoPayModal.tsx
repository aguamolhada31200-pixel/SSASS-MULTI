import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X, Upload, CheckCircle2, Trash2, ScanLine, Banknote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import { useObrasStore } from "@/store/useObrasStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import { CURRENT_USER_ID } from "@/store/useProfilesStore";
import { eur, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

type FilePreview = { name: string; mime: string; dataUrl: string; size: number };

async function fileToPreview(f: File): Promise<FilePreview> {
  const dataUrl = await new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.readAsDataURL(f);
  });
  return { name: f.name, mime: f.type || "application/octet-stream", dataUrl, size: f.size };
}

export function MarcoPayModal() {
  const { marcoPayForm, closeMarcoPay } = useModalStore();
  const { open, marcoId } = marcoPayForm;

  const marco = useObrasStore((s) => (marcoId ? s.marcos.find((m) => m.id === marcoId) : undefined));
  const obra = useObrasStore((s) => (marco ? s.obras.find((o) => o.id === marco.obraId) : undefined));
  const pagarMarcoComProva = useObrasStore((s) => s.pagarMarcoComProva);
  const addDoc = useDocumentsStore((s) => s.add);

  const [comprovativo, setComprovativo] = useState<FilePreview | null>(null);
  const [valorLido, setValorLido] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setComprovativo(null);
      setValorLido(null);
    }
  }, [open]);

  if (!open || !marco || !obra) return null;

  const onPickFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Ficheiro demasiado grande (máx 8 MB)");
      return;
    }
    setComprovativo(await fileToPreview(f));
  };

  const lerComprovativo = () => {
    if (!comprovativo) return;
    setValorLido(marco.valor);
    toast.success("Comprovativo lido ✨", { description: `Valor confirmado: ${eur(marco.valor)}` });
  };

  const guardar = () => {
    if (!comprovativo) {
      toast.error("Anexe o comprovativo de transferência/pagamento");
      return;
    }
    const docId = addDoc({
      nome: comprovativo.name,
      ficheiroUrl: comprovativo.dataUrl,
      mimeType: comprovativo.mime,
      uploadedAt: new Date().toISOString().slice(0, 10),
      categoria: "Faturas",
      propertyId: obra.propertyId,
      projectId: obra.projectId,
      obraId: obra.id,
      tamanho: comprovativo.size,
      notas: `Comprovativo de pagamento — marco "${marco.titulo}" (${eur(marco.valor)}).`,
      uploadedBy: CURRENT_USER_ID,
    });
    pagarMarcoComProva(
      marco.id,
      {
        documentId: docId,
        tipo: "comprovativo_pagamento",
        nomeFicheiro: comprovativo.name,
        valorNoComprovativo: valorLido ?? undefined,
        addedBy: CURRENT_USER_ID,
      },
      CURRENT_USER_ID
    );
    toast.success(`Marco pago ✨ · ${eur(marco.valor)}`, {
      description: "Comprovativo arquivado · sócios notificados.",
    });
    closeMarcoPay();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={closeMarcoPay}>
      <div className="flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold-dark">
              <Banknote size={16} />
            </span>
            <h2 className="font-display text-base font-semibold text-ink">Pagar marco</h2>
          </div>
          <button onClick={closeMarcoPay} className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {/* Resumo do marco */}
          <div className="rounded-xl border border-line bg-bg/40 px-4 py-3">
            <p className="text-sm font-medium text-ink">{marco.titulo}</p>
            <p className="num mt-0.5 text-xs text-muted">
              {eur(marco.valor)} · previsto {dataPT(marco.dataPrevista)}
              {marco.empreiteiro ? ` · ${marco.empreiteiro}` : ""}
            </p>
          </div>

          {/* Upload */}
          <label
            htmlFor="marcopay-input"
            className={cn(
              "block rounded-2xl border-2 border-dashed p-4 text-center transition-colors cursor-pointer",
              comprovativo ? "border-success/40 bg-success/5" : "border-gold/30 bg-gold/5 hover:border-gold/60"
            )}
          >
            <input id="marcopay-input" ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => onPickFile(e.target.files)} />
            {comprovativo ? (
              <>
                <CheckCircle2 size={22} className="mx-auto mb-1 text-success" />
                <p className="text-sm font-medium text-ink">{comprovativo.name}</p>
                <p className="text-[11px] text-muted">{Math.round(comprovativo.size / 1024)} KB</p>
                <div className="mt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      lerComprovativo();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold-dark hover:bg-gold/20"
                  >
                    <ScanLine size={12} /> Ler comprovativo
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setComprovativo(null);
                      setValorLido(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-xs text-muted hover:text-danger"
                  >
                    <Trash2 size={12} /> Remover
                  </button>
                </div>
              </>
            ) : (
              <>
                <Upload size={22} className="mx-auto mb-1 text-gold-dark" />
                <p className="text-sm font-medium text-ink">Anexar transferência / recibo</p>
                <p className="mt-0.5 text-[11px] text-muted">Obrigatório · PDF ou foto da transferência.</p>
              </>
            )}
          </label>

          <p className="rounded-lg bg-secondary/10 px-3 py-2 text-[11px] text-secondary">
            Sem comprovativo de pagamento, o marco não pode ser marcado como pago.
            Os sócios veem que está pago e quem fez a transferência.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-line bg-bg/40 px-5 py-4">
          <Button variant="ghost" onClick={closeMarcoPay}>Cancelar</Button>
          <Button variant="gold" disabled={!comprovativo} onClick={guardar}>
            <CheckCircle2 size={15} /> Confirmar pagamento
          </Button>
        </div>
      </div>
    </div>
  );
}
