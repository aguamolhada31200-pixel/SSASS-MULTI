import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  X,
  Upload,
  FileText,
  Camera,
  AlertTriangle,
  Lock,
  Sparkles,
  CheckCircle2,
  ScanLine,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import {
  useObrasStore,
  requerAprovacao,
  thresholdDe,
  PROVA_TIPO_LABEL,
  type Comprovativo,
  type ProvaTipo,
} from "@/store/useObrasStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { CURRENT_USER_ID } from "@/store/useProfilesStore";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

const inpCls = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

// Pequenas listas mock para a "leitura" do comprovativo (sem OCR real).
const MOCK_FORN = ["AKI", "Leroy Merlin", "Hidroplan", "Pintor Joaquim", "Cozinhas Modernas", "Roca Lisboa", "Robbialac"];

type FilePreview = { name: string; mime: string; dataUrl: string; size: number };

async function fileToPreview(f: File): Promise<FilePreview> {
  const dataUrl = await new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.readAsDataURL(f);
  });
  return { name: f.name, mime: f.type || "application/octet-stream", dataUrl, size: f.size };
}

export function ObraExpenseModal() {
  const { obraExpenseForm, closeObraExpense } = useModalStore();
  const { open, obraId, initialFaseId } = obraExpenseForm;

  const obra = useObrasStore((s) => (obraId ? s.obras.find((o) => o.id === obraId) : undefined));
  const fasesAll = useObrasStore((s) => s.fases);
  const registarDespesa = useObrasStore((s) => s.registarDespesa);
  const adicionarComprovativo = useObrasStore((s) => s.adicionarComprovativo);
  const updateDespesa = useObrasStore((s) => s.updateDespesa);
  const addDoc = useDocumentsStore((s) => s.add);
  const addTransaction = useTransactionsStore((s) => s.add);

  const fases = useMemo(() => (obra ? fasesAll.filter((f) => f.obraId === obra.id) : []), [fasesAll, obra]);

  const [descricao, setDescricao] = useState("");
  const [faseId, setFaseId] = useState<string>("");
  const [valor, setValor] = useState<number>(0);
  const [data, setData] = useState<string>("");
  const [fornecedor, setFornecedor] = useState("");
  const [nif, setNif] = useState("");
  const [comprovativo, setComprovativo] = useState<FilePreview | null>(null);
  const [tipoProva, setTipoProva] = useState<ProvaTipo>("fatura");
  const [valorComprovativo, setValorComprovativo] = useState<number | null>(null);
  const [fotos, setFotos] = useState<FilePreview[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const fotosRef = useRef<HTMLInputElement>(null);

  // Reset quando abre / fecha
  useEffect(() => {
    if (open) {
      setDescricao("");
      setFaseId(initialFaseId ?? "");
      setValor(0);
      setData(new Date().toISOString().slice(0, 10));
      setFornecedor("");
      setNif("");
      setComprovativo(null);
      setTipoProva("fatura");
      setValorComprovativo(null);
      setFotos([]);
    }
  }, [open, initialFaseId]);

  if (!open || !obra) return null;

  const onPickFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Ficheiro demasiado grande (máx 8 MB)");
      return;
    }
    const preview = await fileToPreview(f);
    setComprovativo(preview);
    // adivinha tipo
    if (/recibo/i.test(f.name)) setTipoProva("recibo");
    else if (/or[çc]amento/i.test(f.name)) setTipoProva("orcamento");
    else setTipoProva("fatura");
  };

  const onPickFotos = async (files: FileList | null) => {
    if (!files) return;
    const next: FilePreview[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      next.push(await fileToPreview(f));
    }
    setFotos((p) => [...p, ...next]);
  };

  const lerComprovativo = () => {
    if (!comprovativo) {
      toast.error("Carregue primeiro um comprovativo");
      return;
    }
    // mock OCR — sample por hash do nome
    const n = comprovativo.name.toLowerCase();
    let fornDetetado = MOCK_FORN[Math.abs([...n].reduce((s, c) => s + c.charCodeAt(0), 0)) % MOCK_FORN.length];
    if (/aki|leroy|robbialac|roca/.test(n)) {
      const hit = MOCK_FORN.find((x) => n.includes(x.toLowerCase().split(" ")[0]));
      if (hit) fornDetetado = hit;
    }
    // gera um valor ligeiramente diferente do introduzido (para mostrar divergência)
    const valorLido = valor > 0 ? valor : Math.round((Math.random() * 800 + 200) / 5) * 5;
    setFornecedor(fornDetetado);
    setNif(`50${Math.floor(Math.random() * 9_000_000) + 1_000_000}`);
    setValorComprovativo(valorLido);
    if (!valor) setValor(valorLido);
    if (!descricao) setDescricao(`Fornecimento ${fornDetetado}`);
    toast.success("Comprovativo lido", {
      description: `Fornecedor: ${fornDetetado} · Valor: ${eur(valorLido)}`,
    });
  };

  const valorDifere =
    comprovativo &&
    valorComprovativo != null &&
    Math.abs(valorComprovativo - valor) > 0.5;

  const podeSubmeter = descricao.trim().length > 0 && valor > 0 && data;
  const precisaVoto = requerAprovacao(obra, valor);

  const guardar = (semProva: boolean) => {
    if (!podeSubmeter) {
      toast.error("Preencha descrição, valor e data");
      return;
    }
    if (!semProva && !comprovativo) {
      toast.error("Anexe um comprovativo ou escolha 'sem comprovativo agora'");
      return;
    }
    // 1. Despesa (com aprovação automática se exceder threshold)
    const despesaId = registarDespesa(
      {
        obraId: obra.id,
        faseId: faseId || undefined,
        descricao: descricao.trim(),
        valor,
        data,
        fornecedor: fornecedor.trim() || undefined,
        nif: nif.trim() || undefined,
        fotos: fotos.map((f) => f.dataUrl),
        estadoProva: semProva ? "por_comprovar" : undefined,
      },
      CURRENT_USER_ID
    );

    // 2. Documento + Comprovativo
    if (!semProva && comprovativo) {
      const docId = addDoc({
        nome: comprovativo.name,
        ficheiroUrl: comprovativo.dataUrl,
        mimeType: comprovativo.mime,
        uploadedAt: data,
        categoria: "Faturas",
        propertyId: obra.propertyId,
        projectId: obra.projectId,
        obraId: obra.id,
        tamanho: comprovativo.size,
        notas: `${PROVA_TIPO_LABEL[tipoProva]} de "${descricao.trim()}".`,
        uploadedBy: CURRENT_USER_ID,
      });
      adicionarComprovativo(despesaId, {
        documentId: docId,
        tipo: tipoProva,
        nomeFicheiro: comprovativo.name,
        valorNoComprovativo: valorComprovativo ?? undefined,
        addedBy: CURRENT_USER_ID,
      });
    }

    // 3. Transação na Contabilidade quando a obra está num imóvel solo
    if (obra.propertyId) {
      addTransaction({
        tipo: "despesa",
        propertyId: obra.propertyId,
        categoria: "Obras",
        valor,
        data,
        descricao: `${obra.titulo} — ${descricao.trim()}`,
        recorrente: false,
        deduzivelIrs: true,
        notas: fornecedor ? `Fornecedor: ${fornecedor}` : undefined,
        reciboUrl: !semProva && comprovativo ? comprovativo.dataUrl : undefined,
      });
    }

    // mensagem
    if (precisaVoto && obra.members) {
      toast.success("Despesa submetida a votação dos sócios", {
        description: `${eur(valor)} acima de ${eur(thresholdDe(obra))} → precisa de aprovação.`,
      });
    } else if (semProva) {
      toast.success("Despesa registada (por comprovar)", {
        description: "Anexe o comprovativo mais tarde para subir a transparência.",
      });
    } else {
      toast.success("Despesa registada e comprovada", {
        description: fotos.length > 0 ? `${fotos.length} foto${fotos.length === 1 ? "" : "s"} anexada${fotos.length === 1 ? "" : "s"}.` : undefined,
      });
    }
    // ⚠️ se o utilizador trocar de despesa sem comprovativo após criação, mantém-se.
    void despesaId; void updateDespesa;
    closeObraExpense();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={closeObraExpense}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-ink">Nova despesa</h2>
            <p className="truncate text-xs text-muted">{obra.titulo}</p>
          </div>
          <button onClick={closeObraExpense} className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {/* Comprovativo — zona de upload em destaque */}
          <label
            htmlFor="comp-input"
            className={cn(
              "block rounded-2xl border-2 border-dashed p-4 text-center transition-colors cursor-pointer",
              comprovativo ? "border-success/40 bg-success/5" : "border-gold/30 bg-gold/5 hover:border-gold/60"
            )}
          >
            <input
              id="comp-input"
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files)}
            />
            {comprovativo ? (
              <>
                <CheckCircle2 size={22} className="mx-auto mb-1 text-success" />
                <p className="text-sm font-medium text-ink">{comprovativo.name}</p>
                <p className="text-[11px] text-muted">{Math.round(comprovativo.size / 1024)} KB · {comprovativo.mime}</p>
                <div className="mt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      lerComprovativo();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold-dark hover:bg-gold/20"
                  >
                    <ScanLine size={12} /> Ler dados do comprovativo
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setComprovativo(null);
                      setValorComprovativo(null);
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
                <p className="text-sm font-medium text-ink">Carregar fatura / recibo</p>
                <p className="mt-0.5 text-[11px] text-muted">PDF ou foto — obrigatório para confiar nos sócios.</p>
              </>
            )}
          </label>

          {/* Tipo de prova (só visível depois de carregar) */}
          {comprovativo && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Tipo de comprovativo</span>
                <select value={tipoProva} onChange={(e) => setTipoProva(e.target.value as ProvaTipo)} className={inpCls}>
                  <option value="fatura">Fatura</option>
                  <option value="recibo">Recibo</option>
                  <option value="comprovativo_pagamento">Comprovativo de pagamento</option>
                  <option value="orcamento">Orçamento</option>
                </select>
              </label>
              {valorComprovativo != null && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Valor no comprovativo</span>
                  <div className="flex h-10 items-center rounded-lg border border-line bg-bg/40 px-3">
                    <span className="num text-sm text-ink">{eur(valorComprovativo)}</span>
                  </div>
                </label>
              )}
            </div>
          )}

          {valorDifere && (
            <div className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-[11px] text-warning">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                O valor do comprovativo ({eur(valorComprovativo!)}) difere do introduzido ({eur(valor)}). Reveja antes de submeter.
              </span>
            </div>
          )}

          {/* Campos */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Descrição</span>
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Pintura completa — mão de obra" className={inpCls} />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Fase (opcional)</span>
            <select value={faseId} onChange={(e) => setFaseId(e.target.value)} className={inpCls}>
              <option value="">— Sem fase específica —</option>
              {fases.map((f) => (
                <option key={f.id} value={f.id}>{f.titulo}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Valor</span>
              <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
                <input
                  type="number"
                  value={valor || ""}
                  onChange={(e) => setValor(Number(e.target.value) || 0)}
                  className="h-10 w-full bg-transparent px-3 text-sm outline-none"
                />
                <span className="px-3 text-sm text-muted">€</span>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Data</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inpCls} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Fornecedor</span>
              <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex.: AKI" className={inpCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">NIF (opcional)</span>
              <input value={nif} onChange={(e) => setNif(e.target.value)} placeholder="9 dígitos" className={inpCls} />
            </label>
          </div>

          {precisaVoto && (
            <div className="flex items-start gap-2 rounded-lg bg-secondary/10 px-3 py-2 text-[11px] text-secondary">
              <Sparkles size={13} className="mt-0.5 shrink-0 text-gold-dark" />
              <span>
                Acima de {eur(thresholdDe(obra))} (5% do orçamento) → será submetida a votação dos sócios investidores. O comprovativo é exigido na mesma.
              </span>
            </div>
          )}

          {/* Fotos */}
          <div>
            <span className="mb-1 block text-xs font-medium text-muted">Fotos da obra (opcional, recomendado)</span>
            <input ref={fotosRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPickFotos(e.target.files)} />
            <div className="flex flex-wrap items-center gap-2">
              {fotos.map((f, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-line">
                  <img src={f.dataUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setFotos((p) => p.filter((_, j) => j !== i))}
                    className="absolute right-0.5 top-0.5 rounded-md bg-ink/60 p-0.5 text-white hover:bg-danger"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fotosRef.current?.click()}
                className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-bg/40 text-[10px] text-muted hover:border-secondary/40"
              >
                <Camera size={16} className="mb-0.5" /> Adicionar
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-line bg-bg/40 px-5 py-4">
          <Button
            variant="gold"
            disabled={!podeSubmeter || !comprovativo}
            onClick={() => guardar(false)}
            className="w-full"
          >
            <FileText size={15} /> Registar despesa comprovada
          </Button>
          <button
            type="button"
            disabled={!podeSubmeter}
            onClick={() => {
              if (confirm("Registar sem comprovativo? Aparece como ⚠ Por comprovar aos sócios.")) guardar(true);
            }}
            className="text-center text-[11px] text-muted underline transition-colors hover:text-danger disabled:opacity-40"
          >
            <Lock size={11} className="inline" /> Registar sem comprovativo agora
          </button>
        </div>
      </div>
    </div>
  );
}
