import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  X,
  FileText,
  Camera,
  AlertTriangle,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import {
  useObrasStore,
  requerAprovacao,
  thresholdDe,
  gastoReal,
  membrosDe,
  investidoresDe,
  custoObrasProjeto,
  PROVA_TIPO_LABEL,
  type ProvaTipo,
} from "@/store/useObrasStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useTechniciansStore } from "@/store/useTechniciansStore";
import { useNotificationsStore } from "@/store/useNotificationsStore";
import { useCollabStore } from "@/store/useCollabStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { financasFlipProjeto } from "@/lib/calc/obraProjeto";
import { nomeProprio } from "@/components/obras/CoGestao";
import { FaturaScanZone, type FilePreview } from "@/components/obras/FaturaScanZone";
import { MoneyBox } from "@/components/ui/MoneyField";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

const inpCls = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

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
  const despesasAll = useObrasStore((s) => s.despesas);
  const obrasAll = useObrasStore((s) => s.obras);
  const collabProjects = useCollabStore((s) => s.projects);
  const broadcast = useNotificationsStore((s) => s.broadcast);
  const perfilEu = useProfilesStore((s) => s.profiles.find((p) => p.id === CURRENT_USER_ID));
  const registarDespesa = useObrasStore((s) => s.registarDespesa);
  const adicionarComprovativo = useObrasStore((s) => s.adicionarComprovativo);
  const updateObra = useObrasStore((s) => s.updateObra);
  const addDoc = useDocumentsStore((s) => s.add);
  const addTransaction = useTransactionsStore((s) => s.add);
  const technicians = useTechniciansStore((s) => s.technicians);
  const byNif = useTechniciansStore((s) => s.byNif);

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
  const [notaCausa, setNotaCausa] = useState("");
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
      setNotaCausa("");
    }
  }, [open, initialFaseId]);

  if (!open || !obra) return null;

  const onPickFotos = async (files: FileList | null) => {
    if (!files) return;
    const next: FilePreview[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      next.push(await fileToPreview(f));
    }
    setFotos((p) => [...p, ...next]);
  };

  const valorDifere =
    comprovativo &&
    valorComprovativo != null &&
    valor > 0 &&
    Math.abs(valorComprovativo - valor) > 0.5;

  // Nota de causa OBRIGATÓRIA quando este gasto faz o total estourar o orçamento.
  const gastoAtual = gastoReal(obra, despesasAll);
  const vaiEstourar = obra.orcamento > 0 && gastoAtual + valor > obra.orcamento && valor > 0;
  const faltaNota = vaiEstourar && notaCausa.trim().length === 0;

  const podeSubmeter = descricao.trim().length > 0 && valor > 0 && !!data && !faltaNota;
  const precisaVoto = requerAprovacao(obra, valor);

  const guardar = (semProva: boolean) => {
    if (!podeSubmeter) {
      toast.error(faltaNota ? "Explique porquê o valor a mais (o orçamento vai ser ultrapassado)" : "Preencha descrição, valor e data");
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

    // 4. Nota de causa da derrapagem → vira o resumo humano do header da obra
    if (vaiEstourar && notaCausa.trim()) {
      updateObra(obra.id, { notaCausa: notaCausa.trim() });
    }

    // 5. Notificações por papel (transparência total)
    const meuNome = nomeProprio(perfilEu?.fullName) || "O gestor";
    const outros = membrosDe(obra).map((m) => m.userId).filter((id) => id !== CURRENT_USER_ID);
    if (outros.length > 0) {
      if (precisaVoto) {
        // Acima do threshold → cada investidor é chamado a votar
        broadcast(
          investidoresDe(obra).map((m) => m.userId).filter((id) => id !== CURRENT_USER_ID),
          {
            tipo: "decisao_criada",
            titulo: `Gasto «${descricao.trim()}» aguarda o teu voto`,
            descricao: `${eur(valor)} · ${obra.titulo}`,
            actorId: CURRENT_USER_ID,
            link: `/obra/${obra.id}`,
          }
        );
      } else {
        // Abaixo do threshold → aplicado já, sócios só são informados
        broadcast(outros, {
          tipo: "geral",
          titulo: `${meuNome} registou um gasto de ${eur(valor)} em ${obra.titulo}`,
          descricao: descricao.trim(),
          actorId: CURRENT_USER_ID,
          link: `/obra/${obra.id}`,
        });
      }
    }

    // 6. Lucro do flip mudou >5% com este gasto? Avisar os sócios em concreto.
    const flip = obra.projectId
      ? collabProjects.find((p) => p.id === obra.projectId && p.type === "reabilitacao")
      : undefined;
    if (flip && !precisaVoto && outros.length > 0) {
      const custoAntes = custoObrasProjeto(flip.id, obrasAll, despesasAll);
      const gastoAntes = gastoReal(obra, despesasAll);
      const custoDepois =
        custoAntes - Math.max(obra.orcamento, gastoAntes) + Math.max(obra.orcamento, gastoAntes + valor);
      const finAntes = financasFlipProjeto(flip, custoAntes);
      const finDepois = financasFlipProjeto(flip, custoDepois);
      const base = Math.abs(finAntes.lucroEstimado);
      if (base > 0 && Math.abs(finDepois.lucroEstimado - finAntes.lucroEstimado) / base > 0.05) {
        broadcast(outros, {
          tipo: "geral",
          titulo: `Lucro estimado do projeto mudou: ${eur(finAntes.lucroEstimado)} → ${eur(finDepois.lucroEstimado)}`,
          descricao: `${obra.titulo} · ${flip.title}`,
          actorId: CURRENT_USER_ID,
          link: `/comunidade/colaborativa/${flip.id}`,
        });
      }
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
    void despesaId;
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
          {/* Fatura — scan QR real em destaque: preenche Fornecedor · NIF · Valor · Data */}
          <FaturaScanZone
            comprovativo={comprovativo}
            onComprovativo={(f) => {
              setComprovativo(f);
              if (!f) setValorComprovativo(null);
              else {
                if (/recibo/i.test(f.name)) setTipoProva("recibo");
                else if (/or[çc]amento/i.test(f.name)) setTipoProva("orcamento");
                else setTipoProva("fatura");
              }
            }}
            onLido={(fat) => {
              if (fat.total != null) {
                setValorComprovativo(fat.total);
                if (!valor) setValor(fat.total);
              }
              if (fat.data) setData(fat.data);
              if (fat.nifEmitente) {
                setNif(fat.nifEmitente);
                const tec = byNif(fat.nifEmitente);
                if (tec && !fornecedor) setFornecedor(tec.nome);
              }
            }}
          />

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
                A fatura diz <strong className="num">{eur(valorComprovativo!)}</strong>, escreveu <strong className="num">{eur(valor)}</strong>. Qual está certo?{" "}
                <button type="button" onClick={() => setValor(valorComprovativo!)} className="underline hover:text-ink">Usar o da fatura</button>
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
              <MoneyBox value={valor || undefined} onChange={(n) => setValor(n ?? 0)} comDecimais />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Data</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inpCls} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Fornecedor / empreiteiro</span>
              <select
                value={technicians.some((t) => t.nome === fornecedor) ? fornecedor : fornecedor ? "__outro" : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__outro") return; // mantém o texto atual
                  const tec = technicians.find((t) => t.nome === v);
                  setFornecedor(v);
                  if (tec?.nif) setNif(tec.nif);
                }}
                className={inpCls}
              >
                <option value="">— Selecionar —</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.nome}>{t.nome}</option>
                ))}
                <option value="__outro">Outro (escrever abaixo)</option>
              </select>
              <input
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                placeholder="Nome do fornecedor"
                className={cn(inpCls, "mt-1.5")}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">NIF (opcional)</span>
              <input value={nif} onChange={(e) => setNif(e.target.value)} placeholder="9 dígitos" className={inpCls} />
            </label>
          </div>

          {/* Nota de causa — obrigatória quando o gasto faz estourar o orçamento */}
          {vaiEstourar && (
            <label className="block rounded-xl border border-danger/30 bg-danger/5 p-3">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-danger">
                <AlertTriangle size={13} /> Este gasto ultrapassa o orçamento ({eur(gastoAtual + valor)} de {eur(obra.orcamento)}). Porquê o valor a mais?
              </span>
              <input
                value={notaCausa}
                onChange={(e) => setNotaCausa(e.target.value)}
                placeholder='Ex.: "Troca de loiças"'
                className={cn(inpCls, faltaNota && "border-danger")}
              />
              <span className="mt-1 block text-[10px] text-muted">Esta nota fica visível no topo da obra e no histórico — os sócios percebem logo o porquê.</span>
            </label>
          )}

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
