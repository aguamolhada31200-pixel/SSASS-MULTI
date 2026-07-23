import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Hammer,
  Receipt,
  Phone,
  Mail,
  Star,
  UserPlus,
  ImagePlus,
  FileText,
  Info,
  X,
  Upload,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useMaintenanceStore,
  CATEGORIA_PEDIDO_LABEL,
  PRIORIDADE_LABEL,
  ESTADO_PEDIDO_LABEL,
  RESPONSABILIDADE_LABEL,
  RESP_SUGERIDA,
  sugereConversaoEmObra,
  type EstadoPedido,
  type Responsabilidade,
  type CategoriaPedido,
} from "@/store/useMaintenanceStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useTenantsStore } from "@/store/useTenantsStore";
import { useTechniciansStore } from "@/store/useTechniciansStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import { useModalStore } from "@/store/useModalStore";
import { CURRENT_USER_ID } from "@/store/useProfilesStore";
import { CATEGORIA_PEDIDO_ICON, PRIORIDADE_TONE, ESTADO_TONE, RespBadge, inputCls } from "@/components/manutencao/shared";
import { AvaliarEmpreiteiroDialog } from "@/components/obras/EmpreiteiroCard";
import { eur, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Categoria do pedido → categoria da obra (na conversão). */
const PEDIDO_PARA_OBRA: Record<CategoriaPedido, string> = {
  canalizacao: "canalizacao",
  eletricidade: "eletricidade",
  pintura: "pintura",
  humidade: "estrutural",
  telhado: "estrutural",
  aquecimento: "canalizacao",
  climatizacao: "geral",
  fechaduras: "geral",
  eletrodomesticos: "geral",
  janelas: "geral",
  estores: "geral",
  outros: "geral",
};

export default function ManutencaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();

  const pedido = useMaintenanceStore((s) => s.requests.find((r) => r.id === id));
  const update = useMaintenanceStore((s) => s.update);
  const setEstado = useMaintenanceStore((s) => s.setEstado);
  const log = useMaintenanceStore((s) => s.log);
  const remove = useMaintenanceStore((s) => s.remove);

  const properties = usePropertiesStore((s) => s.properties);
  const tenants = useTenantsStore((s) => s.tenants);
  const technicians = useTechniciansStore((s) => s.technicians);
  const docs = useDocumentsStore((s) => s.documents);
  const addDoc = useDocumentsStore((s) => s.add);
  const openMaintenanceForm = useModalStore((s) => s.openMaintenanceForm);
  const openMaintenanceExpense = useModalStore((s) => s.openMaintenanceExpense);
  const openObraForm = useModalStore((s) => s.openObraForm);

  const [notas, setNotas] = useState(pedido?.notasInternas ?? "");
  const [alterandoResp, setAlterandoResp] = useState(false);
  const [novaResp, setNovaResp] = useState<Responsabilidade>("senhorio");
  const [justResp, setJustResp] = useState("");
  const [avaliarOpen, setAvaliarOpen] = useState(false);
  const [tecnicoDropdown, setTecnicoDropdown] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  // Notas internas — autosave com debounce curto
  useEffect(() => {
    if (!pedido) return;
    const t = setTimeout(() => {
      if (notas !== (pedido.notasInternas ?? "")) update(pedido.id, { notasInternas: notas });
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notas]);

  const docsDoPedido = useMemo(() => docs.filter((d) => d.maintenanceId === id && !d.deletedAt), [docs, id]);

  if (!pedido) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Pedido não encontrado.</p>
        <Link to="/manutencao" className="mt-2 inline-block text-secondary hover:underline">← Voltar à Manutenção</Link>
      </div>
    );
  }

  const property = properties.find((p) => p.id === pedido.propertyId);
  const tenant = tenants.find((t) => t.id === pedido.tenantId);
  const tec = technicians.find((t) => t.id === pedido.tecnicoId);
  const Icon = CATEGORIA_PEDIDO_ICON[pedido.categoria];
  const concluido = pedido.estado === "concluido";
  const sugestao = RESP_SUGERIDA[pedido.categoria];

  const eliminar = () => setConfirmDel(true);
  const doEliminar = () => {
    setConfirmDel(false);
    remove(pedido.id);
    toastSuccess("Pedido eliminado");
    navigate("/manutencao");
  };

  const converterEmObra = () => {
    openObraForm({
      initialPropertyId: pedido.propertyId,
      prefill: {
        titulo: pedido.titulo,
        categoria: PEDIDO_PARA_OBRA[pedido.categoria],
        orcamento: pedido.custoEstimado,
        descricao: `${pedido.descricao}\n\n(Origem: pedido de manutenção "${pedido.titulo}".)`.trim(),
        fotos: pedido.fotosAntes,
        maintenanceId: pedido.id,
      },
    });
  };

  const onFotosDepois = async (files: FileList | null) => {
    if (!files) return;
    const novas: string[] = [];
    for (const f of Array.from(files).slice(0, 6)) {
      const dataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(f);
      });
      novas.push(dataUrl);
    }
    update(pedido.id, { fotosDepois: [...pedido.fotosDepois, ...novas].slice(0, 8) });
    log(pedido.id, `${novas.length} ${novas.length === 1 ? "foto adicionada" : "fotos adicionadas"} (depois).`);
    toastSuccess("Fotos adicionadas ✓");
  };

  const onDocs = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files).slice(0, 5)) {
      const dataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(f);
      });
      addDoc({
        nome: f.name,
        ficheiroUrl: dataUrl,
        mimeType: f.type || "application/octet-stream",
        uploadedAt: new Date().toISOString().slice(0, 10),
        categoria: "Manutenção",
        propertyId: pedido.propertyId,
        maintenanceId: pedido.id,
        tamanho: f.size,
        notas: `Documento do pedido "${pedido.titulo}".`,
        uploadedBy: CURRENT_USER_ID,
      });
    }
    log(pedido.id, "Documento(s) anexado(s).");
    toastSuccess("Documentos anexados ✓");
  };

  return (
    <>
      {/* Voltar */}
      <Link to="/manutencao" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Manutenção
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", PRIORIDADE_TONE[pedido.prioridade])}>
                  {PRIORIDADE_LABEL[pedido.prioridade]}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-muted">
                  <Icon size={11} /> {CATEGORIA_PEDIDO_LABEL[pedido.categoria]}
                </span>
                <RespBadge resp={pedido.responsabilidade} />
                {/* ESTADO — dropdown editável */}
                <select
                  value={pedido.estado}
                  onChange={(e) => {
                    setEstado(pedido.id, e.target.value as EstadoPedido);
                    toastSuccess(`Estado: ${ESTADO_PEDIDO_LABEL[e.target.value as EstadoPedido]}`);
                  }}
                  className={cn("h-7 rounded-full border-0 px-2.5 text-[11px] font-semibold outline-none", ESTADO_TONE[pedido.estado])}
                  title="Mudar estado"
                >
                  {(Object.keys(ESTADO_PEDIDO_LABEL) as EstadoPedido[]).map((e) => (
                    <option key={e} value={e}>{ESTADO_PEDIDO_LABEL[e]}</option>
                  ))}
                </select>
              </div>
              <h1 className="font-display text-2xl font-bold text-ink">{pedido.titulo}</h1>
              <p className="mt-0.5 text-sm text-muted">
                {property ? (
                  <Link to={`/imoveis/${property.id}`} className="text-secondary hover:underline">{property.name}</Link>
                ) : (
                  "Imóvel"
                )}
                {tenant && <> · Inquilino: <Link to={`/pessoas/inquilinos/${tenant.id}`} className="text-secondary hover:underline">{tenant.nomeCompleto}</Link></>}
                {" · "}criado a {dataPT(pedido.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => openMaintenanceForm({ editingId: pedido.id })}>
                <Pencil size={14} /> Editar
              </Button>
              {!pedido.convertidoEmObraId && (
                <Button size="sm" variant="gold" onClick={converterEmObra}>
                  <Hammer size={14} /> Converter em obra
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={eliminar}>
                <Trash2 size={14} /> Eliminar
              </Button>
            </div>
          </div>

          {/* Sugestão de conversão */}
          {sugereConversaoEmObra(pedido) && (
            <button
              onClick={converterEmObra}
              className="mt-3 flex w-full flex-wrap items-center gap-2 rounded-xl border border-gold/40 bg-gold/8 px-3 py-2.5 text-left text-[13px] font-medium text-gold-dark transition-colors hover:bg-gold/15"
            >
              <Hammer size={15} />
              {pedido.custoEstimado && pedido.custoEstimado > 1500
                ? `Custo estimado de ${eur(pedido.custoEstimado)} — isto já parece uma obra. Converter?`
                : "Problema de natureza estrutural — considere converter em obra com orçamento e fases."}
            </button>
          )}
          {pedido.convertidoEmObraId && (
            <Link
              to={`/obra/${pedido.convertidoEmObraId}`}
              className="mt-3 flex items-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-[13px] font-medium text-secondary hover:underline"
            >
              <Hammer size={15} /> Este pedido foi convertido em obra — abrir a obra →
            </Link>
          )}
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* ───────── Coluna esquerda ───────── */}
        <div className="space-y-5">
          {/* Descrição + fotos */}
          <Card>
            <CardContent className="p-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Descrição</p>
              <p className="whitespace-pre-line text-sm text-ink">{pedido.descricao || "Sem descrição."}</p>

              {(pedido.fotosAntes.length > 0 || pedido.fotosDepois.length > 0 || concluido) && (
                <div className="mt-4 space-y-3">
                  {pedido.fotosAntes.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Antes</p>
                      <div className="flex flex-wrap gap-2">
                        {pedido.fotosAntes.map((f, i) => (
                          <a key={i} href={f} target="_blank" rel="noreferrer" className="block h-24 w-32 overflow-hidden rounded-xl border border-line">
                            <img src={f} alt="" className="h-full w-full object-cover transition-transform hover:scale-105" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {(pedido.fotosDepois.length > 0 || concluido) && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Depois</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {pedido.fotosDepois.map((f, i) => (
                          <a key={i} href={f} target="_blank" rel="noreferrer" className="block h-24 w-32 overflow-hidden rounded-xl border border-line">
                            <img src={f} alt="" className="h-full w-full object-cover transition-transform hover:scale-105" />
                          </a>
                        ))}
                        {concluido && (
                          <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-[11px] text-muted hover:bg-accent">
                            <ImagePlus size={16} /> Adicionar fotos
                            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFotosDepois(e.target.files)} />
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linha do tempo */}
          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Linha do tempo</p>
              <ul className="space-y-2 border-l-2 border-line pl-4">
                {pedido.historico.map((h, i) => (
                  <li key={i} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-secondary" />
                    <span className="num text-xs text-muted">{dataPT(h.ts.slice(0, 10))}</span>{" "}
                    <span className="text-ink">{h.texto}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Notas internas */}
          <Card>
            <CardContent className="p-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Notas internas (guarda automaticamente)</p>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={4}
                placeholder="Só para si — orçamentos falados, combinações com o técnico…"
                className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-secondary"
              />
            </CardContent>
          </Card>
        </div>

        {/* ───────── Coluna direita ───────── */}
        <div className="space-y-4">
          {/* Responsabilidade */}
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Responsabilidade</p>
              <div className="flex items-center justify-between gap-2">
                <RespBadge resp={pedido.responsabilidade} className="text-[12px]" />
                <button
                  onClick={() => { setAlterandoResp((v) => !v); setNovaResp(pedido.responsabilidade); setJustResp(""); }}
                  className="text-xs font-medium text-secondary hover:underline"
                >
                  Alterar
                </button>
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted">
                <Info size={12} className="mt-0.5 shrink-0" />
                {pedido.justificacaoResponsabilidade || sugestao.nota} Informativo — não é aconselhamento jurídico.
              </p>
              {alterandoResp && (
                <div className="mt-3 space-y-2 rounded-xl border border-line bg-bg/40 p-3">
                  <select value={novaResp} onChange={(e) => setNovaResp(e.target.value as Responsabilidade)} className={inputCls}>
                    {(Object.keys(RESPONSABILIDADE_LABEL) as Responsabilidade[]).map((r) => (
                      <option key={r} value={r}>{RESPONSABILIDADE_LABEL[r]}</option>
                    ))}
                  </select>
                  <input
                    value={justResp}
                    onChange={(e) => setJustResp(e.target.value)}
                    placeholder="Justificação (obrigatória)"
                    className={inputCls}
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setAlterandoResp(false)}>Cancelar</Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!justResp.trim()) { toastError("Indique a justificação"); return; }
                        update(pedido.id, { responsabilidade: novaResp, justificacaoResponsabilidade: justResp.trim() });
                        log(pedido.id, `Responsabilidade alterada para ${RESPONSABILIDADE_LABEL[novaResp]} — ${justResp.trim()}.`);
                        setAlterandoResp(false);
                        toastSuccess("Responsabilidade atualizada ✓");
                      }}
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custos */}
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Custos</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-line bg-bg/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted">Estimado</p>
                  <p className="num mt-0.5 text-lg font-bold text-ink">{pedido.custoEstimado ? eur(pedido.custoEstimado) : "—"}</p>
                </div>
                <div className={cn("rounded-xl border p-3", pedido.custoFinal ? "border-success/30 bg-success/5" : "border-line bg-bg/40")}>
                  <p className="text-[10px] uppercase tracking-wider text-muted">Final</p>
                  <p className={cn("num mt-0.5 text-lg font-bold", pedido.custoFinal ? "text-success" : "text-ink")}>
                    {pedido.custoFinal ? eur(pedido.custoFinal) : "—"}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="gold" className="mt-3 w-full" onClick={() => openMaintenanceExpense(pedido.id)}>
                <Receipt size={14} /> Registar despesa
              </Button>
              {pedido.transactionId && (
                <p className="mt-2 text-center text-[11px] text-success">Transação criada na Contabilidade ✓</p>
              )}
            </CardContent>
          </Card>

          {/* Técnico */}
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Técnico</p>
              {tec || pedido.tecnicoNome ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-white">
                      {(tec?.nome ?? pedido.tecnicoNome ?? "?").split(" ").map((x) => x[0]).join("").slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{tec?.nome ?? pedido.tecnicoNome}</p>
                      {tec && (
                        <p className="flex items-center gap-1 text-[11px] text-muted">
                          <Star size={10} className="fill-gold text-gold" /> {tec.avaliacaoMedia.toFixed(1)} · {tec.numTrabalhos} trabalhos
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(tec?.telefone ?? pedido.tecnicoContacto) && (
                      <a
                        href={`tel:${(tec?.telefone ?? pedido.tecnicoContacto ?? "").replace(/\s/g, "")}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-card py-2 text-sm font-medium text-ink hover:bg-accent"
                      >
                        <Phone size={14} /> Ligar
                      </a>
                    )}
                    {tec?.email && (
                      <a
                        href={`mailto:${tec.email}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-card py-2 text-sm font-medium text-ink hover:bg-accent"
                      >
                        <Mail size={14} /> Email
                      </a>
                    )}
                  </div>
                  {concluido && tec && !pedido.avaliacaoTecnico && (
                    <Button size="sm" variant="gold" className="mt-2 w-full" onClick={() => setAvaliarOpen(true)}>
                      <Star size={14} /> Avaliar trabalho
                    </Button>
                  )}
                  {pedido.avaliacaoTecnico && (
                    <p className="mt-2 flex items-center justify-center gap-1 text-[12px] text-muted">
                      Avaliado:
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={12} className={i <= (pedido.avaliacaoTecnico ?? 0) ? "fill-gold text-gold" : "text-line"} />
                      ))}
                    </p>
                  )}
                  <button
                    onClick={() => setTecnicoDropdown((v) => !v)}
                    className="mt-2 w-full text-center text-[11px] text-secondary hover:underline"
                  >
                    Trocar técnico
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setTecnicoDropdown((v) => !v)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-4 text-sm text-muted hover:bg-accent"
                >
                  <UserPlus size={15} /> Atribuir técnico
                </button>
              )}
              {tecnicoDropdown && (
                <select
                  className={cn(inputCls, "mt-2")}
                  defaultValue=""
                  onChange={(e) => {
                    const t = technicians.find((x) => x.id === e.target.value);
                    if (!t) return;
                    update(pedido.id, { tecnicoId: t.id });
                    log(pedido.id, `Técnico atribuído: ${t.nome}.`);
                    setTecnicoDropdown(false);
                    toastSuccess(`Técnico atribuído · ${t.nome}`);
                  }}
                >
                  <option value="" disabled>Escolher do diretório…</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome} · {t.avaliacaoMedia.toFixed(1)}</option>
                  ))}
                </select>
              )}
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card>
            <CardContent
              className="p-4"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onDocs(e.dataTransfer.files); }}
            >
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Documentos</p>
              {docsDoPedido.length === 0 ? (
                <p className="text-[12px] text-muted">Orçamentos, faturas e garantias deste pedido.</p>
              ) : (
                <ul className="space-y-1.5">
                  {docsDoPedido.map((d) => (
                    <li key={d.id}>
                      <button
                        onClick={() => {
                          if (d.ficheiroUrl && d.ficheiroUrl !== "#") window.open(d.ficheiroUrl, "_blank");
                          else toastInfo("Documento", { description: d.nome });
                        }}
                        className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border border-line bg-bg/40 px-2 py-1.5 text-[12px] text-ink hover:bg-accent"
                      >
                        <FileText size={12} className="shrink-0 text-secondary" /> <span className="truncate">{d.nome}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm text-muted hover:bg-accent">
                <Upload size={14} /> Carregar ou largar ficheiros aqui
                <input type="file" multiple className="hidden" onChange={(e) => onDocs(e.target.files)} />
              </label>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Avaliar técnico (reutiliza o diálogo do diretório das Obras) */}
      {avaliarOpen && tec && (
        <AvaliarEmpreiteiroDialog
          technician={tec}
          onClose={(estrelas) => {
            if (estrelas) {
              update(pedido.id, { avaliacaoTecnico: estrelas });
              log(pedido.id, `Técnico avaliado: ${tec.nome} (${estrelas}/5).`);
            }
            setAvaliarOpen(false);
          }}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          titulo="Eliminar pedido"
          mensagem={`Eliminar o pedido "${pedido.titulo}"?`}
          cta="Eliminar"
          onClose={() => setConfirmDel(false)}
          onConfirm={doEliminar}
        />
      )}
    </>
  );
}
