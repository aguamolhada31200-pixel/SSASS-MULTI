import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, CheckCircle2, Banknote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import { useObrasStore, membrosDe } from "@/store/useObrasStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useNotificationsStore } from "@/store/useNotificationsStore";
import { CURRENT_USER_ID } from "@/store/useProfilesStore";
import { FaturaScanZone, type FilePreview } from "@/components/obras/FaturaScanZone";
import { eur, dataPT } from "@/lib/format";

export function MarcoPayModal() {
  const { marcoPayForm, closeMarcoPay } = useModalStore();
  const { open, marcoId } = marcoPayForm;

  const marco = useObrasStore((s) => (marcoId ? s.marcos.find((m) => m.id === marcoId) : undefined));
  const obra = useObrasStore((s) => (marco ? s.obras.find((o) => o.id === marco.obraId) : undefined));
  const pagarMarcoComProva = useObrasStore((s) => s.pagarMarcoComProva);
  const addDoc = useDocumentsStore((s) => s.add);
  const addTransaction = useTransactionsStore((s) => s.add);
  const broadcast = useNotificationsStore((s) => s.broadcast);

  const [comprovativo, setComprovativo] = useState<FilePreview | null>(null);
  const [valorLido, setValorLido] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setComprovativo(null);
      setValorLido(null);
    }
  }, [open]);

  if (!open || !marco || !obra) return null;

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
    // Tesouraria: o pagamento entra na Contabilidade (obras de imóvel solo)
    if (obra.propertyId) {
      addTransaction({
        tipo: "despesa",
        propertyId: obra.propertyId,
        categoria: "Obras",
        valor: marco.valor,
        data: new Date().toISOString().slice(0, 10),
        descricao: `${obra.titulo} — pagamento "${marco.titulo}"`,
        recorrente: false,
        deduzivelIrs: true,
        notas: marco.empreiteiro ? `Empreiteiro: ${marco.empreiteiro}` : undefined,
        reciboUrl: comprovativo.dataUrl,
      });
    }
    // Sócios ficam a saber que o marco foi pago (com comprovativo arquivado)
    const outros = membrosDe(obra).map((m) => m.userId).filter((id) => id !== CURRENT_USER_ID);
    if (outros.length > 0)
      broadcast(outros, {
        tipo: "geral",
        titulo: `Pagamento efetuado: «${marco.titulo}» · ${eur(marco.valor)}`,
        descricao: `${obra.titulo} · comprovativo arquivado`,
        actorId: CURRENT_USER_ID,
        link: `/obra/${obra.id}`,
      });
    toast.success(`Pagamento efetuado · ${eur(marco.valor)}`, {
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

          {/* Upload/scan partilhado — leitura real do QR quando for foto de fatura */}
          <FaturaScanZone
            comprovativo={comprovativo}
            onComprovativo={(f) => { setComprovativo(f); if (!f) setValorLido(null); }}
            onLido={(fat) => { if (fat.total != null) setValorLido(fat.total); }}
            titulo="Anexar transferência / recibo"
            subtitulo="Obrigatório · PDF ou foto do comprovativo de pagamento"
          />

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
