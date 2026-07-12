import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, Trash2, LogOut, Building2, Users2, ShieldCheck,
  FileText, History as HistoryIcon, CheckCircle2, Clock, TrendingUp, Wallet,
  CalendarClock, BellRing, Info as InfoIcon, Sparkles, Receipt, Download, Eye, Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useTenantsStore, type Tenant } from "@/store/useTenantsStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import {
  useArrendamentosStore,
  gerarRendasPrevistas,
  rendaRecorrente,
  duracaoMeses,
  progressoTemporal,
  diasAteFim,
  PERIODICIDADE_LABEL,
  MEIO_PAGAMENTO_LABEL,
  CAUCAO_TIPO_LABEL,
  ATUALIZACAO_TIPO_LABEL,
  MOTIVO_TERMINACAO_LABEL,
  type Arrendamento,
  type RendaPrevista,
} from "@/store/useArrendamentosStore";
import { EstadoBadge, TipoBadge } from "@/components/arrendamentos/shared";
import { TerminarModal } from "@/components/arrendamentos/TerminarModal";
import { eur, dataPT, mesPT, n1 } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = ["Resumo", "Rendas", "Inquilinos", "Documentos", "Histórico"] as const;
type Tab = (typeof TABS)[number];

export default function ArrendamentoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const arrendamento = useArrendamentosStore((s) => s.arrendamentos.find((a) => a.id === id));
  const remove = useArrendamentosStore((s) => s.remove);
  const property = usePropertiesStore((s) => (arrendamento ? s.properties.find((p) => p.id === arrendamento.propertyId) : undefined));
  const [tab, setTab] = useState<Tab>("Resumo");
  const [terminar, setTerminar] = useState(false);

  if (!arrendamento) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Arrendamento não encontrado.</p>
        <Link to="/imoveis/arrendamentos" className="mt-2 inline-block text-secondary hover:underline">
          ← Voltar aos arrendamentos
        </Link>
      </div>
    );
  }

  const onDelete = () => {
    if (!confirm(`Eliminar o arrendamento ${arrendamento.identificador}? Esta ação não pode ser anulada.`)) return;
    remove(arrendamento.id);
    toast.success("Arrendamento eliminado");
    navigate("/imoveis/arrendamentos");
  };

  const term = arrendamento.estado === "terminado";

  return (
    <>
      <Link to="/imoveis/arrendamentos" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Arrendamentos
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <EstadoBadge a={arrendamento} />
                <TipoBadge tipo={arrendamento.tipo} />
                <span className="num text-xs text-muted">{arrendamento.identificador}</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-ink">
                {property ? (
                  <Link to={`/imoveis/${property.id}`} className="hover:text-primary">{property.name}</Link>
                ) : "Imóvel"}
              </h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
                <Building2 size={13} /> {property?.city ?? "—"}
                <span className="text-line">·</span>
                <InquilinoNomes tenantIds={arrendamento.inquilinos} />
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">Renda mensal</p>
              <p className="num text-2xl font-bold text-primary">{eur(rendaRecorrente(arrendamento))}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/imoveis/arrendamentos/${arrendamento.id}/editar`}>
              <Button size="sm" variant="outline"><Pencil size={14} /> Editar</Button>
            </Link>
            {!term && (
              <Button size="sm" variant="ghost" onClick={() => setTerminar(true)} className="text-warning hover:bg-warning/10">
                <LogOut size={14} /> Terminar
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-danger hover:bg-danger/10">
              <Trash2 size={14} /> Eliminar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
              tab === t ? "border-primary font-medium text-primary" : "border-transparent text-muted hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "Resumo" && <ResumoTab a={arrendamento} />}
        {tab === "Rendas" && <RendasTab a={arrendamento} />}
        {tab === "Inquilinos" && <InquilinosTab a={arrendamento} />}
        {tab === "Documentos" && <DocumentosTab a={arrendamento} />}
        {tab === "Histórico" && <HistoricoTab a={arrendamento} />}
      </div>

      {terminar && <TerminarModal arrendamento={arrendamento} onClose={() => setTerminar(false)} />}
    </>
  );
}

// ───────────────────────── Resumo ─────────────────────────

function ResumoTab({ a }: { a: Arrendamento }) {
  const dur = duracaoMeses(a.dataInicio, a.dataFim);
  const prog = progressoTemporal(a);
  const dias = diasAteFim(a.dataFim);
  const alertasAtivos = [
    a.alertas.rendaAVencer && "Renda a vencer",
    a.alertas.rendaAtrasada && "Renda em atraso (8 dias após)",
    a.alertas.fimContrato6m && "6 meses antes do fim",
    a.alertas.fimContrato3m && "3 meses antes do fim",
    a.alertas.atualizacaoRenda && "Atualização de renda",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Renda total" value={eur(rendaRecorrente(a))} icon={Wallet} tone="pos" />
        <Kpi label="Caução" value={a.caucao ? eur(a.caucao) : "—"} icon={Landmark} />
        <Kpi label="Duração" value={a.duracaoTipo === "aberta" ? "Aberta" : dur > 0 ? `${dur} meses` : "—"} icon={CalendarClock} />
        <Kpi
          label={a.estado === "terminado" ? "Terminado" : "Fim do contrato"}
          value={a.estado === "terminado" ? (a.dataTerminacao ? dataPT(a.dataTerminacao) : "—") : dias === null ? "Sem termo" : dias < 0 ? "Expirado" : `${dias}d`}
          icon={Clock}
          tone={a.estado === "terminado" ? undefined : dias !== null && dias < 30 ? "neg" : dias !== null && dias < 90 ? "warn" : undefined}
        />
      </div>

      {/* Progresso temporal */}
      {a.duracaoTipo === "fixa" && a.dataInicio && a.dataFim && (
        <Card>
          <CardContent>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted">Progresso do contrato</span>
              <span className="num font-semibold text-ink">{Math.round(prog * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-accent">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(prog * 100)}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted num">
              <span>{dataPT(a.dataInicio)}</span>
              <span>{dataPT(a.dataFim)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pagamento */}
        <SectionCard title="Pagamento" icon={Wallet}>
          <Info label="Renda base" value={eur(a.rendaBase)} />
          {a.despesasArrendamento ? <Info label="Despesas de arrendamento" value={eur(a.despesasArrendamento)} /> : null}
          <Info label="Renda total" value={eur(rendaRecorrente(a))} strong />
          <Info label="Periodicidade" value={PERIODICIDADE_LABEL[a.periodicidade]} />
          <Info label="Momento" value={a.momentoPagamento === "adiantado" ? "Adiantado" : "Em atraso"} />
          <Info label="Dia de pagamento" value={`Dia ${a.diaPagamento}`} />
          <Info label="Meio acordado" value={MEIO_PAGAMENTO_LABEL[a.meioPagamentoAcordado]} />
          {a.outrosPagamentos.length > 0 && (
            <div className="mt-2 border-t border-line/50 pt-2">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Outros pagamentos</p>
              {a.outrosPagamentos.map((o) => (
                <Info key={o.id} label={o.descricao || "—"} value={eur(o.montante)} />
              ))}
            </div>
          )}
        </SectionCard>

        {/* Caução + atualização */}
        <div className="space-y-4">
          <SectionCard title="Caução" icon={Landmark}>
            <Info label="Valor" value={a.caucao ? eur(a.caucao) : "—"} />
            <Info label="Tipo" value={CAUCAO_TIPO_LABEL[a.caucaoTipo]} />
            {a.caucaoDataRecebimento && <Info label="Recebida em" value={dataPT(a.caucaoDataRecebimento)} />}
            {a.caucaoRegistada && (
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-success">
                <CheckCircle2 size={12} /> Registada como movimento em Finanças.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Atualização de renda" icon={TrendingUp}>
            <Info label="Método" value={ATUALIZACAO_TIPO_LABEL[a.atualizacaoTipo]} />
            {a.atualizacaoTipo === "indice_referencia" && (
              <>
                <Info label="Índice" value={a.indiceReferencia ?? "—"} />
                {a.valorIndice ? <Info label="Coeficiente" value={`${n1(a.valorIndice)}%`} /> : null}
              </>
            )}
            {a.atualizacaoTipo === "percentagem_acordada" && a.percentagemAcordada ? (
              <Info label="Percentagem" value={`${n1(a.percentagemAcordada)}%`} />
            ) : null}
            {a.atualizacaoTipo !== "nao_rever" && (
              <>
                <Info label="Período" value={`${a.atualizacaoPeriodoAnos} ano(s)`} />
                <Info label="Quando" value={a.atualizacaoData === "aniversario" ? "Na data de aniversário" : a.dataAtualizacaoEspecifica ? dataPT(a.dataAtualizacaoEspecifica) : "Data específica"} />
              </>
            )}
          </SectionCard>
        </div>

        {/* Seguro */}
        {a.seguro.temSeguro && (
          <SectionCard title="Seguro" icon={ShieldCheck}>
            <Info label="Seguradora" value={a.seguro.seguradora || "—"} />
            <Info label="Apólice" value={a.seguro.apolice || "—"} />
            {a.seguro.valorAnual ? <Info label="Valor anual" value={eur(a.seguro.valorAnual)} /> : null}
            {a.seguro.dataRenovacao && <Info label="Renovação" value={dataPT(a.seguro.dataRenovacao)} />}
          </SectionCard>
        )}

        {/* Fiadores */}
        {a.fiadores.length > 0 && (
          <SectionCard title={`Fiadores · ${a.fiadores.length}`} icon={Users2}>
            {a.fiadores.map((f) => (
              <div key={f.id} className="border-b border-line/40 py-2 last:border-0">
                <p className="text-sm font-medium text-ink">{f.nome || "—"}{f.nif ? <span className="num text-xs font-normal text-muted"> · NIF {f.nif}</span> : null}</p>
                <p className="text-[11px] text-muted">{[f.telefone, f.email].filter(Boolean).join(" · ") || "Sem contacto"}{f.rendimento ? ` · ${eur(f.rendimento)}/mês` : ""}</p>
              </div>
            ))}
          </SectionCard>
        )}

        {/* Alertas */}
        <SectionCard title="Alertas ativos" icon={BellRing}>
          {alertasAtivos.length === 0 ? (
            <p className="text-sm text-muted">Sem alertas ativos.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {alertasAtivos.map((al) => (
                <span key={al} className="inline-flex items-center gap-1 rounded-full border border-gold/25 bg-gold/5 px-2.5 py-1 text-[11px] font-medium text-gold-dark">
                  <BellRing size={11} /> {al}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted">Os inquilinos não recebem notificações — são alertas para si.</p>
        </SectionCard>
      </div>

      {a.estado === "terminado" && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="neutral">Terminado</Badge>
            <span className="text-muted">
              {a.dataTerminacao ? dataPT(a.dataTerminacao) : ""}
              {a.motivoTerminacao ? ` · ${MOTIVO_TERMINACAO_LABEL[a.motivoTerminacao]}` : ""}
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ───────────────────────── Rendas ─────────────────────────

type RendaEstado = "pago" | "pendente" | "atrasado" | "por_registar";

function RendasTab({ a }: { a: Arrendamento }) {
  const transactions = useTransactionsStore((s) => s.transactions);
  const addTransaction = useTransactionsStore((s) => s.add);
  const tenants = useTenantsStore((s) => s.tenants);
  const inquilinoNome = a.inquilinos.map((id) => tenants.find((t) => t.id === id)?.nomeCompleto).filter(Boolean).join(", ") || "Inquilino";

  const rendasProperty = useMemo(
    () => transactions.filter((t) => t.tipo === "receita" && (t.categoria === "Renda" || t.categoria === "Receita AL") && t.propertyId === a.propertyId),
    [transactions, a.propertyId]
  );

  const linhas = useMemo(() => {
    const todas = gerarRendasPrevistas(a);
    // Janela: 6 meses de histórico + previsão futura (evita ruído de anos sem registo)
    const hoje = new Date();
    const inicioJanela = new Date(hoje.getFullYear(), hoje.getMonth() - 6, 1);
    const dentroJanela = todas.filter((p) => new Date(`${p.periodoIso}T00:00:00`) >= inicioJanela);
    const janela = dentroJanela.length > 0 ? dentroJanela : todas.slice(-6);

    return janela
      .map((p) => {
        const mesPrefixo = p.periodoIso.slice(0, 7); // YYYY-MM
        const tx = rendasProperty.find((t) => t.data.startsWith(mesPrefixo) && t.valor >= p.valor * 0.95);
        const venc = new Date(`${p.vencimentoIso}T00:00:00`);
        const diasVenc = Math.round((hoje.getTime() - venc.getTime()) / 86400000);
        let estado: RendaEstado;
        if (tx) estado = "pago";
        else if (diasVenc < 8) estado = "pendente"; // futuro ou dentro do prazo de graça
        else if (diasVenc <= 120) estado = "atrasado"; // atraso recente relevante
        else estado = "por_registar"; // histórico antigo sem registo — não afirmamos atraso
        return { ...p, estado, txData: tx?.data, txValor: tx?.valor };
      })
      .reverse(); // mais recente primeiro
  }, [a, rendasProperty]);

  const marcarPago = (p: RendaPrevista) => {
    // Data do movimento = vencimento do período, para o registo ficar associado
    // ao mês correto (a deteção de pago cruza pelo mês da renda).
    addTransaction({
      tipo: "receita",
      propertyId: a.propertyId,
      categoria: "Renda",
      valor: p.valor,
      data: p.vencimentoIso,
      descricao: `Renda ${mesPT(p.periodoIso)} · ${inquilinoNome}`,
      recorrente: false,
      deduzivelIrs: false,
      notas: `Arrendamento ${a.identificador}`,
    });
    toast.success("Renda registada em Finanças", { description: `${mesPT(p.periodoIso)} · ${eur(p.valor)}` });
  };

  const pagas = linhas.filter((l) => l.estado === "pago").length;
  const emAtraso = linhas.filter((l) => l.estado === "atrasado").length;

  if (a.estado === "terminado") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted">
          <Receipt size={26} className="mx-auto mb-2" />
          <p className="text-sm">Arrendamento terminado — sem rendas futuras a prever.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MiniKpi label="Rendas na janela" value={String(linhas.length)} />
        <MiniKpi label="Registadas" value={String(pagas)} tone="pos" />
        <MiniKpi label="Em atraso" value={String(emAtraso)} tone={emAtraso > 0 ? "neg" : undefined} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg/50 text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Período</th>
                <th className="px-4 py-2.5 text-left font-semibold">Vencimento</th>
                <th className="px-4 py-2.5 text-right font-semibold">Valor</th>
                <th className="px-4 py-2.5 text-left font-semibold">Estado</th>
                <th className="px-4 py-2.5 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.periodoIso} className="border-t border-line/40">
                  <td className="px-4 py-2.5 capitalize">{mesPT(l.periodoIso)}{l.primeiro && a.primeiraRendaProRata ? <span className="ml-1 text-[10px] text-gold-dark">(pro-rata)</span> : null}</td>
                  <td className="num px-4 py-2.5 text-xs text-muted">{dataPT(l.vencimentoIso)}</td>
                  <td className="num px-4 py-2.5 text-right font-semibold text-ink">{eur(l.valor)}</td>
                  <td className="px-4 py-2.5"><RendaBadge estado={l.estado} /></td>
                  <td className="px-4 py-2.5 text-right">
                    {l.estado === "pago" ? (
                      <span className="num text-[11px] text-muted">{l.txData ? dataPT(l.txData) : ""}</span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => marcarPago(l)}>
                        <CheckCircle2 size={13} /> Marcar pago
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5 text-[11px] text-muted">
        <InfoIcon size={13} className="shrink-0" />
        O redegest regista o pagamento e alimenta a Contabilidade (fonte única). A emissão do <strong>recibo de renda oficial</strong> é feita no Portal das Finanças — a app não gera recibos nem submete à AT.
      </p>
    </div>
  );
}

function RendaBadge({ estado }: { estado: RendaEstado }) {
  const map: Record<RendaEstado, { tone: "success" | "warning" | "danger" | "neutral"; label: string }> = {
    pago: { tone: "success", label: "Pago" },
    pendente: { tone: "warning", label: "Pendente" },
    atrasado: { tone: "danger", label: "Atrasado" },
    por_registar: { tone: "neutral", label: "Por registar" },
  };
  return <Badge tone={map[estado].tone}>{map[estado].label}</Badge>;
}

// ───────────────────────── Inquilinos ─────────────────────────

function InquilinosTab({ a }: { a: Arrendamento }) {
  const tenants = useTenantsStore((s) => s.tenants);
  const found = a.inquilinos.map((id) => tenants.find((t) => t.id === id)).filter(Boolean) as Tenant[];

  if (found.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted">
          <Users2 size={26} className="mx-auto mb-2" />
          <p className="text-sm">Sem inquilinos associados a este arrendamento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {a.inquilinos.length > 1 && (
        <p className="rounded-lg border border-line bg-card px-3 py-2 text-[11px] text-muted">
          Contrato solidário — {a.inquilinos.length} inquilinos respondem pela totalidade da renda.
        </p>
      )}
      {found.map((t) => {
        const initials = t.nomeCompleto.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
        return (
          <Link key={t.id} to={`/pessoas/inquilinos/${t.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-card p-3 shadow-sm transition-colors hover:bg-bg">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-white">
              {t.fotoUrl ? <img src={t.fotoUrl} alt="" className="h-full w-full object-cover" /> : initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{t.nomeCompleto}</p>
              <p className="text-xs text-muted">{[t.email, t.telefone].filter(Boolean).join(" · ") || (t.nif ? `NIF ${t.nif}` : "—")}</p>
            </div>
            <span className="text-sm text-secondary">Ver →</span>
          </Link>
        );
      })}
    </div>
  );
}

// ───────────────────────── Documentos ─────────────────────────

function DocumentosTab({ a }: { a: Arrendamento }) {
  const docs = useDocumentsStore((s) => s.documents.filter((d) => a.documentos.includes(d.id)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{docs.length} documento(s) do arrendamento</p>
        <Link to={`/imoveis/arrendamentos/${a.id}/editar`}>
          <Button size="sm" variant="outline"><FileText size={14} /> Gerir na edição</Button>
        </Link>
      </div>
      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted">
            <FileText size={26} className="mx-auto mb-2" />
            <p className="text-sm">Sem documentos. Anexe o contrato assinado na edição do arrendamento.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-xl border border-line bg-card p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent"><FileText size={16} className="text-secondary" /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{d.nome}</p>
                  <p className="text-[11px] text-muted">{d.categoria} · {dataPT(d.uploadedAt)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <a href={d.ficheiroUrl} target="_blank" rel="noreferrer" className="rounded p-1.5 text-muted hover:text-ink" title="Ver"><Eye size={15} /></a>
                <a href={d.ficheiroUrl} download={d.nome} className="rounded p-1.5 text-muted hover:text-ink" title="Download"><Download size={15} /></a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Histórico ─────────────────────────

function HistoricoTab({ a }: { a: Arrendamento }) {
  const transactions = useTransactionsStore((s) => s.transactions);
  const tenants = useTenantsStore((s) => s.tenants);

  const eventos = useMemo(() => {
    const arr: { ts: string; titulo: string; descricao: string; icon: React.ReactNode; cor: string }[] = [];
    arr.push({ ts: a.dataInicio, titulo: "Arrendamento iniciado", descricao: `${a.identificador} · ${eur(rendaRecorrente(a))}/mês.`, icon: <Sparkles size={14} />, cor: "bg-gold/15 text-gold-dark" });

    const nomes = a.inquilinos.map((id) => tenants.find((t) => t.id === id)?.nomeCompleto).filter(Boolean).join(", ");
    if (nomes) arr.push({ ts: a.dataInicio, titulo: "Inquilino(s) associado(s)", descricao: nomes, icon: <Users2 size={14} />, cor: "bg-secondary/12 text-secondary" });

    if (a.caucaoRegistada && a.caucaoDataRecebimento) {
      arr.push({ ts: a.caucaoDataRecebimento, titulo: "Caução recebida", descricao: `${eur(a.caucao)} lançada em Finanças.`, icon: <Landmark size={14} />, cor: "bg-success/12 text-success" });
    }

    // Rendas pagas (movimentos)
    const rendas = transactions.filter((t) => t.tipo === "receita" && (t.categoria === "Renda" || t.categoria === "Receita AL") && t.propertyId === a.propertyId);
    for (const r of rendas) {
      arr.push({ ts: r.data, titulo: "Renda registada", descricao: `${eur(r.valor)} · ${r.descricao}`, icon: <Receipt size={14} />, cor: "bg-success/12 text-success" });
    }

    if (a.estado === "terminado" && a.dataTerminacao) {
      arr.push({ ts: a.dataTerminacao, titulo: "Arrendamento terminado", descricao: a.motivoTerminacao ? MOTIVO_TERMINACAO_LABEL[a.motivoTerminacao] : "—", icon: <LogOut size={14} />, cor: "bg-danger/12 text-danger" });
    }

    return arr.sort((x, y) => (x.ts < y.ts ? 1 : -1));
  }, [a, transactions, tenants]);

  return (
    <Card>
      <CardContent>
        <h3 className="mb-3 flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-widest text-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Timeline do arrendamento
        </h3>
        <ol className="relative space-y-3 border-l border-line/60 pl-5">
          {eventos.map((e, i) => (
            <li key={i} className="relative">
              <span className={cn("absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full", e.cor)}>{e.icon}</span>
              <p className="text-sm font-medium text-ink">{e.titulo}</p>
              <p className="text-xs text-muted">{e.descricao}</p>
              <p className="num mt-0.5 text-[11px] text-muted">{dataPT(e.ts)}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-center gap-2 text-[11px] text-muted">
          <HistoryIcon size={12} /> Derivado do arrendamento + movimentos de renda em Finanças.
        </p>
      </CardContent>
    </Card>
  );
}

// ───────────────────────── Comuns ─────────────────────────

function InquilinoNomes({ tenantIds }: { tenantIds: string[] }) {
  const tenants = useTenantsStore((s) => s.tenants);
  const nomes = tenantIds.map((id) => tenants.find((t) => t.id === id)?.nomeCompleto).filter(Boolean);
  if (nomes.length === 0) return <span>Sem inquilino</span>;
  return <span className="truncate">{nomes.join(", ")}</span>;
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: typeof Wallet; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent>
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-ink">
          <Icon size={15} className="text-secondary" /> {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}

function Info({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/40 py-1.5 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className={cn("num text-sm text-ink", strong ? "font-bold text-primary" : "font-medium")}>{value}</span>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Wallet; tone?: "pos" | "neg" | "warn" }) {
  const color = tone === "pos" ? "text-success" : tone === "neg" ? "text-danger" : tone === "warn" ? "text-warning" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-card p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted"><Icon size={12} /> {label}</p>
      <p className={cn("num mt-1.5 text-xl font-bold", color)}>{value}</p>
    </div>
  );
}

function MiniKpi({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const color = tone === "pos" ? "text-success" : tone === "neg" ? "text-danger" : "text-ink";
  return (
    <div className="rounded-xl border border-line/60 bg-bg/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={cn("num mt-1 text-lg font-bold", color)}>{value}</p>
    </div>
  );
}
