import { useEffect, useState } from "react";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { X, Receipt } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import { useMaintenanceStore } from "@/store/useMaintenanceStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useTechniciansStore } from "@/store/useTechniciansStore";
import { CURRENT_USER_ID } from "@/store/useProfilesStore";
import { FaturaScanZone, type FilePreview } from "@/components/obras/FaturaScanZone";
import { MoneyBox } from "@/components/ui/MoneyField";
import { inputCls } from "@/components/manutencao/shared";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Registar despesa de um pedido de manutenção:
 * scan QR/PDF da fatura PT (widget partilhado) → fornecedor/NIF/valor/data →
 * transação (Manutenção/Reparações, dedutível IRS) + documento na Pasta Digital
 * + custo final no pedido.
 */
export function MaintenanceExpenseModal() {
  const { maintenanceExpenseForm, closeMaintenanceExpense } = useModalStore();
  const { open, requestId } = maintenanceExpenseForm;

  const pedido = useMaintenanceStore((s) => (requestId ? s.requests.find((r) => r.id === requestId) : undefined));
  const updatePedido = useMaintenanceStore((s) => s.update);
  const logPedido = useMaintenanceStore((s) => s.log);
  const addDoc = useDocumentsStore((s) => s.add);
  const addTransaction = useTransactionsStore((s) => s.add);
  const technicians = useTechniciansStore((s) => s.technicians);
  const byNif = useTechniciansStore((s) => s.byNif);

  const [comprovativo, setComprovativo] = useState<FilePreview | null>(null);
  const [valor, setValor] = useState(0);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [fornecedor, setFornecedor] = useState("");
  const [nif, setNif] = useState("");
  const [valorLido, setValorLido] = useState<number | null>(null);

  useEffect(() => {
    if (open && pedido) {
      setComprovativo(null);
      setValor(pedido.custoEstimado ?? 0);
      setData(new Date().toISOString().slice(0, 10));
      const tec = technicians.find((t) => t.id === pedido.tecnicoId);
      setFornecedor(tec?.nome ?? pedido.tecnicoNome ?? "");
      setNif(tec?.nif ?? "");
      setValorLido(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, requestId]);

  if (!open || !pedido) return null;

  const divergencia = valorLido != null && valor > 0 && Math.abs(valorLido - valor) > 0.01;

  const guardar = () => {
    if (valor <= 0 || !data) {
      toastError("Indique o valor e a data");
      return;
    }
    let documentId: string | undefined;
    if (comprovativo) {
      documentId = addDoc({
        nome: comprovativo.name,
        ficheiroUrl: comprovativo.dataUrl,
        mimeType: comprovativo.mime,
        uploadedAt: data,
        categoria: "Manutenção",
        propertyId: pedido.propertyId,
        maintenanceId: pedido.id,
        tamanho: comprovativo.size,
        notas: `Fatura — ${pedido.titulo}.`,
        uploadedBy: CURRENT_USER_ID,
      });
    }
    const txId = addTransaction({
      tipo: "despesa",
      propertyId: pedido.propertyId,
      categoria: "Manutenção/Reparações",
      valor,
      data,
      descricao: `${pedido.titulo}${fornecedor ? ` — ${fornecedor}` : ""}`,
      recorrente: false,
      deduzivelIrs: true,
      notas: nif ? `NIF ${nif}` : undefined,
      reciboUrl: comprovativo?.dataUrl,
    });
    updatePedido(pedido.id, {
      custoFinal: valor,
      faturaDocumentId: documentId ?? pedido.faturaDocumentId,
      transactionId: typeof txId === "string" ? txId : pedido.transactionId,
    });
    logPedido(pedido.id, `Despesa registada: ${eur(valor)}${fornecedor ? ` · ${fornecedor}` : ""} (transação criada${comprovativo ? ", fatura arquivada" : ""}).`);
    toastSuccess("Despesa registada ✓", {
      description: "Entrou na Contabilidade e no Balanço/IRS como dedutível.",
    });
    closeMaintenanceExpense();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={closeMaintenanceExpense}>
      <div
        className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-success">
              <Receipt size={18} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Registar despesa</h2>
              <p className="text-xs text-muted">{pedido.titulo}</p>
            </div>
          </div>
          <button onClick={closeMaintenanceExpense} className="text-muted hover:text-ink" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {/* Scan da fatura PT — preenche fornecedor/NIF/valor/data */}
          <FaturaScanZone
            comprovativo={comprovativo}
            onComprovativo={setComprovativo}
            onLido={(f) => {
              if (f.total != null) {
                setValorLido(f.total);
                setValor((v) => (v > 0 ? v : f.total!));
              }
              if (f.data) setData(f.data);
              if (f.nifEmitente) {
                setNif(f.nifEmitente);
                const tec = byNif(f.nifEmitente);
                if (tec) setFornecedor(tec.nome);
              }
            }}
            titulo="Fatura do técnico (QR ou PDF)"
            subtitulo="O QR das faturas PT preenche fornecedor, NIF, valor e data."
          />

          {divergencia && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning/8 px-3 py-2 text-[12px] text-warning">
              A fatura diz {eur(valorLido!)}, escreveu {eur(valor)}. Qual está certo?
              <button onClick={() => setValor(valorLido!)} className="rounded-full border border-warning/50 px-2 py-0.5 font-medium hover:bg-warning/10">
                Usar o da fatura
              </button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Valor</span>
              <MoneyBox value={valor} onChange={(v) => setValor(v ?? 0)} comDecimais />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Data</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Fornecedor</span>
              <input list="fornecedores-mnt" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className={inputCls} />
              <datalist id="fornecedores-mnt">
                {technicians.map((t) => (
                  <option key={t.id} value={t.nome} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">NIF</span>
              <input value={nif} onChange={(e) => setNif(e.target.value)} className={cn(inputCls, "num")} />
            </label>
          </div>

          <p className="rounded-lg bg-accent px-3 py-2 text-[11px] text-muted">
            Cria uma transação em <strong className="text-ink">Manutenção/Reparações</strong> (dedutível IRS) e arquiva a fatura na Pasta Digital, associada ao imóvel e a este pedido.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
          <Button variant="ghost" onClick={closeMaintenanceExpense}>Cancelar</Button>
          <Button onClick={guardar}>
            <Receipt size={15} /> Registar {valor > 0 ? eur(valor) : "despesa"}
          </Button>
        </div>
      </div>
    </div>
  );
}
