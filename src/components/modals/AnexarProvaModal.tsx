import { useEffect, useState } from "react";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { X, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import { useObrasStore, PROVA_TIPO_LABEL, type ProvaTipo } from "@/store/useObrasStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { FaturaScanZone, type FilePreview } from "@/components/obras/FaturaScanZone";
import { eur } from "@/lib/format";

// Anexa um comprovativo a uma despesa JÁ existente (por comprovar → comprovada).
// Reutiliza o widget de scan QR/PDF e grava o documento na Pasta Digital.

const inpCls = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

export function AnexarProvaModal() {
  const { anexarProvaForm, closeAnexarProva } = useModalStore();
  const { open, despesaId } = anexarProvaForm;

  const despesa = useObrasStore((s) => (despesaId ? s.despesas.find((d) => d.id === despesaId) : undefined));
  const obra = useObrasStore((s) => (despesa ? s.obras.find((o) => o.id === despesa.obraId) : undefined));
  const adicionarComprovativo = useObrasStore((s) => s.adicionarComprovativo);
  const addDoc = useDocumentsStore((s) => s.add);
  const perfilEu = useProfilesStore((s) => s.profiles.find((p) => p.id === CURRENT_USER_ID));

  const [comprovativo, setComprovativo] = useState<FilePreview | null>(null);
  const [tipoProva, setTipoProva] = useState<ProvaTipo>("fatura");
  const [valorLido, setValorLido] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setComprovativo(null);
      setTipoProva("fatura");
      setValorLido(null);
    }
  }, [open]);

  if (!open || !despesa || !obra) return null;

  const valorDifere = comprovativo && valorLido != null && Math.abs(valorLido - despesa.valor) > 0.5;

  const guardar = () => {
    if (!comprovativo) {
      toastError("Anexe a foto ou o PDF do comprovativo");
      return;
    }
    const docId = addDoc({
      nome: comprovativo.name,
      ficheiroUrl: comprovativo.dataUrl,
      mimeType: comprovativo.mime,
      uploadedAt: despesa.data,
      categoria: "Faturas",
      propertyId: obra.propertyId,
      projectId: obra.projectId,
      obraId: obra.id,
      tamanho: comprovativo.size,
      notas: `${PROVA_TIPO_LABEL[tipoProva]} de "${despesa.descricao}".`,
      uploadedBy: CURRENT_USER_ID,
    });
    adicionarComprovativo(despesa.id, {
      documentId: docId,
      tipo: tipoProva,
      nomeFicheiro: comprovativo.name,
      valorNoComprovativo: valorLido ?? undefined,
      addedBy: CURRENT_USER_ID,
    });
    void perfilEu;
    toastSuccess("Comprovativo anexado", {
      description: `${despesa.descricao} · ${eur(despesa.valor)} · a obra subiu de transparência.`,
    });
    closeAnexarProva();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={closeAnexarProva}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-ink">Anexar comprovativo</h2>
            <p className="truncate text-xs text-muted">
              {despesa.descricao} · <span className="num">{eur(despesa.valor)}</span> · {obra.titulo}
            </p>
          </div>
          <button onClick={closeAnexarProva} className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <FaturaScanZone
            comprovativo={comprovativo}
            onComprovativo={(f) => {
              setComprovativo(f);
              if (!f) setValorLido(null);
              else if (/recibo/i.test(f.name)) setTipoProva("recibo");
              else if (/or[çc]amento/i.test(f.name)) setTipoProva("orcamento");
              else setTipoProva("fatura");
            }}
            onLido={(fat) => {
              if (fat.total != null) setValorLido(fat.total);
            }}
          />

          {comprovativo && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Tipo de comprovativo</span>
              <select value={tipoProva} onChange={(e) => setTipoProva(e.target.value as ProvaTipo)} className={inpCls}>
                <option value="fatura">Fatura</option>
                <option value="recibo">Recibo</option>
                <option value="comprovativo_pagamento">Comprovativo de pagamento</option>
                <option value="orcamento">Orçamento</option>
              </select>
            </label>
          )}

          {valorDifere && (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-[11px] text-warning">
              A fatura diz <strong className="num">{eur(valorLido!)}</strong>, a despesa está registada com{" "}
              <strong className="num">{eur(despesa.valor)}</strong>. Confirme se são a mesma coisa.
            </p>
          )}
        </div>

        <div className="border-t border-line bg-bg/40 px-5 py-4">
          <Button variant="gold" size="lg" className="w-full" disabled={!comprovativo} onClick={guardar}>
            <FileText size={16} /> Anexar e marcar comprovada
          </Button>
        </div>
      </div>
    </div>
  );
}
