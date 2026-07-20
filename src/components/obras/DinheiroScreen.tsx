import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Receipt,
  Banknote,
  FileText,
  AlertTriangle,
  Vote,
  Send,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  useObrasStore,
  gastoReal,
  totaisObra,
  avisosLegais,
  requerAprovacao,
  thresholdDe,
  membrosDe,
  investidoresDe,
  roleDe,
  votosResumo,
  estadoProvaDe,
  gastoComprovado,
  gastoNaoComprovado,
  pctTransparencia,
  despesaAplicada,
  relativaTempo,
  MARCO_ESTADO_LABEL,
  PROVA_TIPO_LABEL,
  type Obra,
  type Despesa,
  type Marco,
  type MarcoEstado,
} from "@/store/useObrasStore";
import { useProfilesStore, CURRENT_USER_ID, type Profile } from "@/store/useProfilesStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import { useModalStore } from "@/store/useModalStore";
import { useNotificationsStore } from "@/store/useNotificationsStore";
import { RoleAvatar, VotacaoPanel, EstadoAprovacaoBadge, nomeProprio } from "@/components/obras/CoGestao";
import { OrcamentoDetalhado } from "@/components/obras/OrcamentoDetalhado";
import { eur, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

// ───────────────────────── 💰 DINHEIRO — o ecrã principal da obra ─────────────────────────
// Duas barras gigantes + veredito humano + tesouraria + [+ ADICIONAR DESPESA]
// gigante + listas de gastos/pagamentos + contingência + orçamento detalhado.

const inputCls = "h-11 w-full rounded-lg border border-line bg-card px-3 text-base outline-none focus:border-secondary";

export function DinheiroScreen({ obra, souGestor }: { obra: Obra; souGestor: boolean }) {
  const despesasAll = useObrasStore((s) => s.despesas);
  const marcosAll = useObrasStore((s) => s.marcos);
  const meuRole = roleDe(obra, CURRENT_USER_ID);
  const souInvestidor = meuRole === "investidor";

  const t = totaisObra(obra, despesasAll);
  const g = gastoReal(obra, despesasAll);
  const orc = obra.orcamento;
  const pctGasto = orc > 0 ? Math.round((g / orc) * 100) : 0;
  const sobra = orc - g;

  const marcos = marcosAll.filter((m) => m.obraId === obra.id);
  const pagosVal = marcos.filter((m) => m.estado === "pago").reduce((s, m) => s + m.valor, 0);
  const porPagar = Math.max(0, marcos.reduce((s, m) => s + m.valor, 0) - pagosVal);
  const hoje = new Date().toISOString().slice(0, 10);
  const proxPend = marcos
    .filter((m) => m.estado !== "pago")
    .sort((a, b) => (a.dataPrevista < b.dataPrevista ? -1 : 1))[0];

  // Veredito humano — 3 cores, texto grande
  const veredito =
    g === 0
      ? { texto: "Ainda não gastou nada.", cor: "text-muted", barra: "#6B4C3B" }
      : sobra < 0
        ? { texto: `Passou o orçamento em ${eur(Math.abs(sobra))}.`, cor: "text-danger", barra: "#9B3A2A" }
        : pctGasto >= 85
          ? { texto: `Já usou quase tudo. Sobram ${eur(sobra)}.`, cor: "text-warning", barra: "#C17E2A" }
          : { texto: `Está dentro do previsto. Sobram ${eur(sobra)}.`, cor: "text-success", barra: "#4A7C59" };

  return (
    <div className="space-y-4">
      {/* Avisos legais automáticos (PT) — informativos, dispensáveis */}
      <AvisosLegaisBanner obra={obra} souGestor={souGestor} />

      {/* Blocos de decisão — co-gestão no topo do ecrã Dinheiro */}
      <BlocoPendentes obra={obra} souGestor={souGestor} souInvestidor={souInvestidor} />

      {/* DUAS BARRAS GIGANTES */}
      <Card>
        <CardContent className="p-5">
          <div className="space-y-4">
            <div>
              <div className="flex items-end justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted">Orçamento total</p>
                <p className="num font-display text-[30px] font-bold leading-none text-ink">{eur(orc)}</p>
              </div>
              <div className="mt-2 h-4 overflow-hidden rounded-full bg-accent">
                <div className="h-full w-full rounded-full bg-line/80" />
              </div>
            </div>
            <div>
              <div className="flex items-end justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted">Já gastou</p>
                <p className="num font-display text-[30px] font-bold leading-none" style={{ color: veredito.barra }}>
                  {eur(g)} <span className="text-base font-semibold text-muted">· {pctGasto}%</span>
                </p>
              </div>
              <div className="mt-2 h-4 overflow-hidden rounded-full bg-accent">
                <div
                  className="h-full origin-left rounded-full animate-grow-x"
                  style={{ width: `${Math.min(100, pctGasto)}%`, background: veredito.barra }}
                />
              </div>
            </div>
            <p className={cn("text-lg font-semibold", veredito.cor)}>{veredito.texto}</p>
          </div>

          {/* 3 números grandes: JÁ PAGO · POR PAGAR · PRÓXIMO */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Já pago</p>
              <p className="num mt-0.5 font-display text-[22px] font-bold text-success sm:text-[28px]">{eur(pagosVal)}</p>
            </div>
            <div className={cn("rounded-xl border p-3 text-center", porPagar > 0 ? "border-warning/30 bg-warning/5" : "border-line bg-bg/40")}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Por pagar</p>
              <p className={cn("num mt-0.5 font-display text-[22px] font-bold sm:text-[28px]", porPagar > 0 ? "text-warning" : "text-ink")}>{eur(porPagar)}</p>
            </div>
            <div className="rounded-xl border border-line bg-bg/40 p-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Próximo pagamento</p>
              {proxPend ? (
                <>
                  <p className="num mt-0.5 font-display text-[22px] font-bold text-ink sm:text-[28px]">{eur(proxPend.valor)}</p>
                  <p className={cn("num text-xs", proxPend.dataPrevista < hoje ? "font-semibold text-danger" : "text-muted")}>
                    {dataPT(proxPend.dataPrevista)}
                  </p>
                </>
              ) : (
                <p className="mt-0.5 font-display text-[22px] font-bold text-muted sm:text-[28px]">—</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOTÃO GIGANTE — adicionar/propor despesa */}
      <BotaoDespesa obra={obra} souGestor={souGestor} souInvestidor={souInvestidor} />

      {/* Contingência visível como reserva */}
      {t.temDetalhe && t.contingenciaValor > 0 && (
        <p className="rounded-xl border border-gold/25 bg-gold/5 px-4 py-3 text-base text-ink">
          Fundo para imprevistos: <strong className="num">{eur(t.contingenciaValor)}</strong>
          {t.contingenciaUsado > 0 ? (
            <>
              {" "}· já usou <strong className="num text-warning">{eur(t.contingenciaUsado)}</strong> · restam{" "}
              <strong className="num text-success">{eur(Math.max(0, t.contingenciaValor - t.contingenciaUsado))}</strong>
            </>
          ) : (
            <> · ainda intacto</>
          )}
        </p>
      )}

      {/* Orçamento detalhado — a decomposição completa, colapsada */}
      <OrcamentoDetalhado obra={obra} souGestor={souGestor} />

      {/* GASTOS registados */}
      <DespesasLista obra={obra} souGestor={souGestor} souInvestidor={souInvestidor} />

      {/* PAGAMENTOS ao empreiteiro */}
      <MarcosLista obra={obra} souGestor={souGestor} />
    </div>
  );
}

// ───────────────────────── Avisos legais (banner âmbar, dispensável) ─────────────────────────

function AvisosLegaisBanner({ obra, souGestor }: { obra: Obra; souGestor: boolean }) {
  const despesas = useObrasStore((s) => s.despesas);
  const dispensarAviso = useObrasStore((s) => s.dispensarAviso);
  const updateDetalhe = useObrasStore((s) => s.updateDetalhe);
  const t = totaisObra(obra, despesas);
  const avisos = avisosLegais(obra, t);
  if (avisos.length === 0) return null;

  const agir = (id: string) => {
    // Ações diretas quando possível; caso contrário aponta para o orçamento detalhado.
    if (id === "impic") {
      updateDetalhe(obra.id, { contrato: { ...(obra.contrato ?? {}), alvaraVerificadoIMPIC: true } });
      toast.success("Alvará marcado como verificado no IMPIC");
      return;
    }
    if (id === "seguro-at") {
      updateDetalhe(obra.id, { seguros: { ...(obra.seguros ?? {}), atVerificado: true } });
      toast.success("Seguro de acidentes de trabalho confirmado");
      return;
    }
    toast.message("Abra «Ver orçamento detalhado» em baixo", {
      description:
        id === "contrato"
          ? "Secção «Contrato e alvará» — marque o contrato como assinado."
          : id === "licenca"
            ? "Secção «Licenças e taxas camarárias» — registe o processo."
            : id === "ovp"
              ? "Secção «Licenças» — adicione a taxa de ocupação de via pública."
              : "Secção «Seguros» — registe o seguro.",
    });
  };

  return (
    <div className="space-y-2">
      {avisos.map((a) => (
        <div key={a.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-warning/40 bg-warning/8 px-4 py-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
          <p className="min-w-0 flex-1 text-base leading-snug text-ink">{a.texto}</p>
          {souGestor && (
            <span className="flex shrink-0 gap-2">
              <button
                onClick={() => agir(a.id)}
                className="rounded-lg border border-warning/50 bg-card px-3 py-2 text-sm font-semibold text-warning hover:bg-warning/10"
              >
                {a.acao}
              </button>
              <button
                onClick={() => dispensarAviso(obra.id, a.id)}
                className="rounded-lg px-2 py-2 text-sm text-muted hover:text-ink"
                title="Dispensar este aviso"
              >
                Já tratei
              </button>
            </span>
          )}
        </div>
      ))}
      <p className="px-1 text-xs text-muted">Avisos informativos gerados dos dados da obra — não substituem aconselhamento jurídico.</p>
    </div>
  );
}

// ───────────────────────── Blocos de decisão (co-gestão) ─────────────────────────
// Investidor: "A AGUARDAR A TUA DECISÃO" — vota já aqui, botões grandes.
// Gestor: "A PEDIR AOS SÓCIOS" — estado voto a voto, Lembrar, aplicar aprovados.

function BlocoPendentes({ obra, souGestor, souInvestidor }: { obra: Obra; souGestor: boolean; souInvestidor: boolean }) {
  const despesas = useObrasStore((s) => s.despesas.filter((d) => d.obraId === obra.id && d.aprovacao?.estado === "pendente"));
  const marcos = useObrasStore((s) => s.marcos.filter((m) => m.obraId === obra.id && m.aprovacao?.estado === "pendente"));
  const marcosAprovados = useObrasStore((s) =>
    s.marcos.filter((m) => m.obraId === obra.id && m.aprovacao?.estado === "aplicado" && m.estado !== "pago")
  );
  const profiles = useProfilesStore((s) => s.profiles);
  const openMarcoPay = useModalStore((s) => s.openMarcoPay);
  const broadcast = useNotificationsStore((s) => s.broadcast);

  const pendentes: { tipo: "despesa" | "marco"; id: string; titulo: string; valor: number; ap: NonNullable<Despesa["aprovacao"]> }[] = [
    ...despesas.map((d) => ({ tipo: "despesa" as const, id: d.id, titulo: d.descricao, valor: d.valor, ap: d.aprovacao! })),
    ...marcos.map((m) => ({ tipo: "marco" as const, id: m.id, titulo: m.titulo, valor: m.valor, ap: m.aprovacao! })),
  ];

  if (souInvestidor) {
    const aMeuVoto = pendentes.filter((p) => !p.ap.votos.some((v) => v.userId === CURRENT_USER_ID));
    if (aMeuVoto.length === 0) return null;
    return (
      <div className="rounded-2xl border-2 border-gold/50 bg-gold/8 p-4">
        <p className="mb-3 flex items-center gap-2 text-base font-bold uppercase tracking-wide text-gold-dark">
          <Vote size={18} /> A aguardar a tua decisão ({aMeuVoto.length})
        </p>
        <div className="space-y-3">
          {aMeuVoto.map((p) => (
            <VotacaoPanel key={p.id} obra={obra} tipo={p.tipo} itemId={p.id} aprovacao={p.ap} titulo={p.titulo} valor={p.valor} />
          ))}
        </div>
      </div>
    );
  }

  if (!souGestor || (pendentes.length === 0 && marcosAprovados.length === 0)) return null;

  const lembrar = (p: (typeof pendentes)[number]) => {
    const emFalta = investidoresDe(obra)
      .map((m) => m.userId)
      .filter((id) => !p.ap.votos.some((v) => v.userId === id) && id !== CURRENT_USER_ID);
    if (emFalta.length === 0) return;
    broadcast(emFalta, {
      tipo: "decisao_criada",
      titulo: `Lembrete: «${p.titulo}» aguarda o teu voto`,
      descricao: `${eur(p.valor)} · ${obra.titulo}`,
      actorId: CURRENT_USER_ID,
      link: `/obra/${obra.id}`,
    });
    toast.success(`Lembrete enviado a ${emFalta.length} sócio${emFalta.length === 1 ? "" : "s"}`);
  };

  return (
    <div className="rounded-2xl border-2 border-gold/50 bg-gold/8 p-4">
      <p className="mb-3 flex items-center gap-2 text-base font-bold uppercase tracking-wide text-gold-dark">
        <Vote size={18} /> A pedir aos sócios
      </p>
      <div className="space-y-2">
        {pendentes.map((p) => {
          const r = votosResumo(obra, p.ap);
          return (
            <div key={p.id} className="rounded-xl border border-line bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-medium text-ink">{p.titulo}</p>
                <span className="num text-base font-bold text-ink">{eur(p.valor)}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-muted">
                  {r.favor} a favor · {r.contra} contra ·{" "}
                  <strong className={cn(r.pendentes > 0 ? "text-warning" : "text-success")}>
                    {r.pendentes > 0 ? `falta${r.pendentes === 1 ? "" : "m"} ${r.pendentes} voto${r.pendentes === 1 ? "" : "s"}` : "completo"}
                  </strong>
                </span>
                <button
                  onClick={() => lembrar(p)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line bg-card px-3 text-sm font-medium text-ink hover:bg-accent"
                >
                  <Send size={13} /> Lembrar sócios
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {investidoresDe(obra).map((m) => {
                  const v = p.ap.votos.find((x) => x.userId === m.userId);
                  return (
                    <span
                      key={m.userId}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs",
                        v?.valor === "a_favor"
                          ? "border-success/40 bg-success/8 text-success"
                          : v?.valor === "contra"
                            ? "border-danger/40 bg-danger/8 text-danger"
                            : "border-line bg-bg/40 text-muted"
                      )}
                    >
                      {nomeProprio(profiles.find((x) => x.id === m.userId)?.fullName)}
                      {v ? (v.valor === "a_favor" ? " ✓" : " ✗") : " · por votar"}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
        {marcosAprovados.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-success/40 bg-success/5 p-3">
            <div>
              <p className="text-base font-medium text-ink">{m.titulo}</p>
              <p className="text-sm text-success">Aprovado pelos sócios — pode pagar.</p>
            </div>
            <Button variant="gold" onClick={() => openMarcoPay(m.id)}>
              <CheckCircle2 size={15} /> Aplicar (pagar {eur(m.valor)})
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Botão gigante de despesa ─────────────────────────

function BotaoDespesa({ obra, souGestor, souInvestidor }: { obra: Obra; souGestor: boolean; souInvestidor: boolean }) {
  const openObraExpense = useModalStore((s) => s.openObraExpense);
  const sugerirGasto = useObrasStore((s) => s.sugerirGasto);
  const addNotif = useNotificationsStore((s) => s.add);
  const profiles = useProfilesStore((s) => s.profiles);
  const [proporOpen, setProporOpen] = useState(false);
  const [propDesc, setPropDesc] = useState("");
  const [propValor, setPropValor] = useState(0);
  const gestorId = membrosDe(obra).find((m) => m.role === "gestor")?.userId;
  const nomeGestor = nomeProprio(profiles.find((p) => p.id === gestorId)?.fullName) || "o gestor";

  if (souGestor) {
    return (
      <button
        onClick={() => openObraExpense(obra.id)}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gold text-lg font-bold text-sidebar shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        <Plus size={22} /> ADICIONAR DESPESA
      </button>
    );
  }

  if (!souInvestidor) return null;

  const enviar = () => {
    if (!propDesc.trim() || propValor <= 0) {
      toast.error("Descreva a despesa e indique o valor");
      return;
    }
    sugerirGasto(obra.id, propDesc.trim(), propValor, CURRENT_USER_ID);
    if (gestorId)
      addNotif({
        userId: gestorId,
        tipo: "geral",
        titulo: `Despesa proposta em «${obra.titulo}»`,
        descricao: `${propDesc.trim()} · ${eur(propValor)}`,
        actorId: CURRENT_USER_ID,
        link: `/obra/${obra.id}`,
      });
    setPropDesc("");
    setPropValor(0);
    setProporOpen(false);
    toast.success(`Proposta enviada a ${nomeGestor} ✓`, { description: "Ele decide se regista a despesa." });
  };

  return (
    <div>
      <button
        onClick={() => setProporOpen((v) => !v)}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-gold bg-card text-lg font-bold text-gold-dark transition-all hover:-translate-y-0.5 hover:bg-gold/8"
      >
        <Plus size={22} /> PROPOR DESPESA
      </button>
      {proporOpen && (
        <Card className="mt-2">
          <CardContent className="p-4">
            <p className="mb-2 text-sm text-muted">A proposta vai para {nomeGestor} — ele decide se regista.</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
              <input
                value={propDesc}
                onChange={(e) => setPropDesc(e.target.value)}
                placeholder="Ex.: Tinta anti-humidade para o teto"
                className={inputCls}
                onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
              />
              <div className="flex items-center rounded-lg border border-line bg-card">
                <input
                  type="number"
                  value={propValor || ""}
                  onChange={(e) => setPropValor(Number(e.target.value) || 0)}
                  placeholder="Valor"
                  className="num h-11 w-full bg-transparent px-3 text-base outline-none"
                />
                <span className="px-3 text-base text-muted">€</span>
              </div>
              <Button onClick={enviar}><Send size={13} /> Enviar</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ───────────────────────── Lista de despesas (gastos) ─────────────────────────

function DespesasLista({ obra, souGestor, souInvestidor }: { obra: Obra; souGestor: boolean; souInvestidor: boolean }) {
  const obraId = obra.id;
  const despesasAll = useObrasStore((s) => s.despesas);
  const fasesAll = useObrasStore((s) => s.fases);
  const removeDespesa = useObrasStore((s) => s.removeDespesa);
  const confirmarDespesa = useObrasStore((s) => s.confirmarDespesa);
  const removerConfirmacaoDespesa = useObrasStore((s) => s.removerConfirmacaoDespesa);
  const registarDespesa = useObrasStore((s) => s.registarDespesa);
  const resolverSugestao = useObrasStore((s) => s.resolverSugestao);
  const sugestoesGasto = useObrasStore((s) =>
    s.sugestoes.filter((x) => x.obraId === obraId && x.estado === "pendente" && x.tipo === "gasto")
  );
  const profiles = useProfilesStore((s) => s.profiles);
  const docs = useDocumentsStore((s) => s.documents);
  const addNotif = useNotificationsStore((s) => s.add);
  const broadcast = useNotificationsStore((s) => s.broadcast);
  const openPorComprovar = useModalStore((s) => s.openPorComprovar);

  const [votandoId, setVotandoId] = useState<string | null>(null);
  const [soPorComprovar, setSoPorComprovar] = useState(false);

  const fases = fasesAll.filter((f) => f.obraId === obraId);
  const despesasObra = despesasAll.filter((d) => d.obraId === obraId).sort((a, b) => (a.data < b.data ? 1 : -1));
  const lista = soPorComprovar ? despesasObra.filter((d) => estadoProvaDe(d) === "por_comprovar") : despesasObra;

  const totalGasto = despesasObra.filter(despesaAplicada).reduce((s, d) => s + d.valor, 0);
  const pendenteAprovacao = despesasObra.filter((d) => d.aprovacao?.estado === "pendente").reduce((s, d) => s + d.valor, 0);
  const comprovado = gastoComprovado(obra, despesasObra);
  const naoComprovado = gastoNaoComprovado(obra, despesasObra);
  const pctComp = pctTransparencia(obra, despesasObra);

  const aceitarSugestao = (sgId: string, titulo: string, valor: number, autorId: string) => {
    registarDespesa({ obraId, descricao: titulo, valor, data: new Date().toISOString().slice(0, 10) }, CURRENT_USER_ID);
    resolverSugestao(sgId, "aceite");
    const precisaVoto = requerAprovacao(obra, valor);
    if (precisaVoto) {
      broadcast(
        investidoresDe(obra).map((m) => m.userId).filter((id) => id !== CURRENT_USER_ID),
        {
          tipo: "decisao_criada",
          titulo: `Gasto «${titulo}» aguarda o teu voto`,
          descricao: `${eur(valor)} · ${obra.titulo}`,
          actorId: CURRENT_USER_ID,
          link: `/obra/${obraId}`,
        }
      );
    } else if (autorId !== CURRENT_USER_ID) {
      addNotif({
        userId: autorId,
        tipo: "geral",
        titulo: `A tua proposta «${titulo}» foi registada`,
        descricao: `${eur(valor)} · ${obra.titulo}`,
        actorId: CURRENT_USER_ID,
        link: `/obra/${obraId}`,
      });
    }
    toast.success(precisaVoto ? "Registado — acima do threshold, entrou em votação" : "Gasto registado ✓");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-ink">Gastos registados</h3>
        {despesasObra.some((d) => estadoProvaDe(d) === "por_comprovar") && (
          <button
            onClick={() => setSoPorComprovar((v) => !v)}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
              soPorComprovar ? "border-warning bg-warning/10 text-warning" : "border-line bg-card text-muted hover:text-ink"
            )}
          >
            <AlertTriangle size={13} /> Só por comprovar
          </button>
        )}
      </div>

      {/* Transparência em 1 linha */}
      {totalGasto > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-muted">
          <span>
            Total: <strong className="num font-semibold text-ink">{eur(totalGasto)}</strong>
          </span>
          <span className="flex items-center gap-1 text-success">
            <ShieldCheck size={14} /> {pctComp}% comprovado
          </span>
          {naoComprovado > 0 && (
            <button
              onClick={() => openPorComprovar(obraId)}
              className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/8 px-2.5 py-0.5 font-medium text-warning transition-colors hover:bg-warning/15"
              title="Ver o que falta comprovar nesta obra"
            >
              <AlertTriangle size={14} /> {eur(naoComprovado)} por comprovar →
            </button>
          )}
          {pendenteAprovacao > 0 && (
            <span className="flex items-center gap-1 text-warning">
              <Vote size={14} /> {eur(pendenteAprovacao)} em votação (não conta ainda)
            </span>
          )}
          <span className="text-sm">{eur(comprovado)} com fatura</span>
        </div>
      )}

      {/* Gestor: propostas dos sócios */}
      {souGestor && sugestoesGasto.length > 0 && (
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-gold-dark">Despesas propostas pelos sócios</p>
            {sugestoesGasto.map((sg) => (
              <div key={sg.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-card px-3 py-2">
                <span className="text-base text-ink">
                  {sg.titulo} <span className="num font-semibold">{eur(sg.valor ?? 0)}</span>
                  <span className="ml-2 text-sm text-muted">
                    por {nomeProprio(profiles.find((p) => p.id === sg.autorId)?.fullName)} {relativaTempo(sg.ts)}
                  </span>
                </span>
                <span className="flex gap-1.5">
                  <Button size="sm" variant="gold" onClick={() => aceitarSugestao(sg.id, sg.titulo, sg.valor ?? 0, sg.autorId)}>
                    <Plus size={13} /> Registar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      resolverSugestao(sg.id, "rejeitada");
                      if (sg.autorId !== CURRENT_USER_ID)
                        addNotif({
                          userId: sg.autorId,
                          tipo: "geral",
                          titulo: `A tua proposta «${sg.titulo}» foi rejeitada`,
                          descricao: obra.titulo,
                          actorId: CURRENT_USER_ID,
                          link: `/obra/${obraId}`,
                        });
                      toast.message("Proposta rejeitada — o sócio foi avisado");
                    }}
                  >
                    Rejeitar
                  </Button>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {lista.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted">
            <Receipt size={26} className="mx-auto mb-2" />
            <p className="text-base">{soPorComprovar ? "Tudo comprovado." : "Tire foto da fatura — o QR preenche tudo."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {lista.map((d) => {
            const fase = fases.find((f) => f.id === d.faseId);
            const autor = profiles.find((p) => p.id === d.registadoPor);
            const pendente = d.aprovacao?.estado === "pendente";
            const estProva = estadoProvaDe(d);
            const provas = d.comprovativos ?? [];
            const fotosD = d.fotos ?? [];
            const contestacoes = (d.confirmacoes ?? []).filter((c) => c.valor === "contesta");
            const meuVotoConfirma = (d.confirmacoes ?? []).find((c) => c.userId === CURRENT_USER_ID);
            return (
              <Card
                key={d.id}
                className={cn(
                  pendente && "border-warning/40 bg-warning/5",
                  !pendente && estProva === "por_comprovar" && "border-warning/30 bg-warning/[0.03]",
                  contestacoes.length > 0 && "border-warning/60 bg-warning/8"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeloProva estado={estProva} />
                        <p className="text-base font-medium text-ink">{d.descricao}</p>
                      </div>
                      <p className="num mt-0.5 text-sm text-muted">
                        {dataPT(d.data)}
                        {fase && ` · ${fase.titulo}`}
                        {d.fornecedor && ` · ${d.fornecedor}`}
                        {d.nif && ` · NIF ${d.nif}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.aprovacao && <EstadoAprovacaoBadge estado={d.aprovacao.estado} />}
                      <span className="num text-lg font-semibold text-ink">{eur(d.valor)}</span>
                      {souGestor && (
                        <button onClick={() => removeDespesa(d.id)} className="text-muted hover:text-danger" title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {(provas.length > 0 || fotosD.length > 0) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {provas.map((cp) => {
                        const doc = docs.find((x) => x.id === cp.documentId);
                        return (
                          <button
                            key={cp.id}
                            onClick={() => {
                              if (doc?.ficheiroUrl && doc.ficheiroUrl !== "#") window.open(doc.ficheiroUrl, "_blank");
                              else toast.message("Pré-visualização do comprovativo", { description: cp.nomeFicheiro });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/5 px-2 py-1 text-sm text-success hover:bg-success/10"
                            title={`${PROVA_TIPO_LABEL[cp.tipo]} — ${cp.nomeFicheiro}`}
                          >
                            <FileText size={13} /> {cp.nomeFicheiro}
                          </button>
                        );
                      })}
                      {fotosD.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="relative h-11 w-11 overflow-hidden rounded-md border border-line">
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    {autor && (
                      <span className="flex items-center gap-1.5">
                        <RoleAvatar profile={autor} role={roleDe(obra, autor.id)} size="xs" />
                        por {nomeProprio(autor.fullName)} {relativaTempo(d.registadoEm ?? `${d.data}T09:00:00`)}
                      </span>
                    )}
                    {d.aprovacao?.estado === "aplicado" && d.aprovacao.votos.length > 0 && (
                      <span className="text-success">
                        Aprovada por {d.aprovacao.votos.filter((v) => v.valor === "a_favor").map((v) => nomeProprio(profiles.find((p) => p.id === v.userId)?.fullName)).join(", ")}
                      </span>
                    )}
                    {pendente && (
                      <button onClick={() => setVotandoId(votandoId === d.id ? null : d.id)} className="font-medium text-warning underline hover:text-ink">
                        {votandoId === d.id ? "Fechar" : "Ver / votar decisão"}
                      </button>
                    )}
                    {contestacoes.length > 0 && (
                      <span className="flex items-center gap-1 font-medium text-warning" title={contestacoes[0]?.comentario}>
                        <AlertTriangle size={12} />
                        {contestacoes.map((c) => nomeProprio(profiles.find((p) => p.id === c.userId)?.fullName)).join(", ")} contestou · {relativaTempo(contestacoes[0].ts)}
                      </span>
                    )}
                  </div>

                  <VerHistorico eventos={historicoDespesa(d, profiles)} />

                  {souInvestidor && estProva === "comprovada" && !pendente && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          if (meuVotoConfirma?.valor === "confirma") {
                            removerConfirmacaoDespesa(d.id, CURRENT_USER_ID);
                            toast.message("Confirmação removida");
                          } else {
                            confirmarDespesa(d.id, CURRENT_USER_ID, "confirma");
                            toast.success("Despesa confirmada ✓");
                          }
                        }}
                        className={cn(
                          "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
                          meuVotoConfirma?.valor === "confirma" ? "border-success bg-success text-white" : "border-success/40 text-success hover:bg-success/10"
                        )}
                      >
                        <CheckCircle2 size={13} /> Confirmo
                      </button>
                      <button
                        onClick={() => {
                          const c = prompt("Porque contesta esta despesa? (opcional)") ?? "";
                          confirmarDespesa(d.id, CURRENT_USER_ID, "contesta", c || undefined);
                          toast.message("Contestação enviada aos sócios");
                        }}
                        className={cn(
                          "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
                          meuVotoConfirma?.valor === "contesta" ? "border-danger bg-danger text-white" : "border-danger/40 text-danger hover:bg-danger/10"
                        )}
                      >
                        <AlertTriangle size={13} /> Contestar
                      </button>
                    </div>
                  )}

                  {pendente && votandoId === d.id && d.aprovacao && (
                    <div className="mt-3">
                      <VotacaoPanel obra={obra} tipo="despesa" itemId={d.id} aprovacao={d.aprovacao} titulo={d.descricao} valor={d.valor} onResolved={() => setVotandoId(null)} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SeloProva({ estado }: { estado: "comprovada" | "por_comprovar" }) {
  if (estado === "comprovada") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-semibold text-success">
        <ShieldCheck size={11} /> Comprovada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
      <AlertTriangle size={11} /> Por comprovar
    </span>
  );
}

// ───────────────────────── Pagamentos ao empreiteiro (marcos) ─────────────────────────

function MarcosLista({ obra, souGestor }: { obra: Obra; souGestor: boolean }) {
  const obraId = obra.id;
  const marcosAll = useObrasStore((s) => s.marcos);
  const registarMarco = useObrasStore((s) => s.registarMarco);
  const removeMarco = useObrasStore((s) => s.removeMarco);
  const profiles = useProfilesStore((s) => s.profiles);
  const docs = useDocumentsStore((s) => s.documents);
  const openMarcoPay = useModalStore((s) => s.openMarcoPay);
  const broadcastNotif = useNotificationsStore((s) => s.broadcast);

  const todayISO = new Date().toISOString().slice(0, 10);
  const marcos = marcosAll
    .filter((m) => m.obraId === obraId)
    .map((m) => ({
      ...m,
      estado: m.estado === "pago" ? m.estado : m.dataPrevista < todayISO ? ("atrasado" as MarcoEstado) : m.estado,
    }))
    .sort((a, b) => (a.dataPrevista < b.dataPrevista ? -1 : 1));

  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState(0);
  const [dataPrev, setDataPrev] = useState("");
  const [votandoId, setVotandoId] = useState<string | null>(null);
  const precisaVoto = requerAprovacao(obra, valor);

  const onAdd = () => {
    if (!titulo.trim() || valor <= 0 || !dataPrev) {
      toast.error("Preencha título, valor e data");
      return;
    }
    registarMarco(
      { obraId, titulo: titulo.trim(), valor, dataPrevista: dataPrev, estado: "pendente", empreiteiro: obra.empreiteiro },
      CURRENT_USER_ID
    );
    const outros = membrosDe(obra).map((m) => m.userId).filter((id) => id !== CURRENT_USER_ID);
    if (precisaVoto) {
      broadcastNotif(
        investidoresDe(obra).map((m) => m.userId).filter((id) => id !== CURRENT_USER_ID),
        {
          tipo: "decisao_criada",
          titulo: `Pagamento «${titulo.trim()}» aguarda o teu voto`,
          descricao: `${eur(valor)} · ${obra.titulo}`,
          actorId: CURRENT_USER_ID,
          link: `/obra/${obraId}`,
        }
      );
    } else if (outros.length > 0) {
      broadcastNotif(outros, {
        tipo: "geral",
        titulo: `Novo pagamento planeado em «${obra.titulo}»`,
        descricao: `${titulo.trim()} · ${eur(valor)}`,
        actorId: CURRENT_USER_ID,
        link: `/obra/${obraId}`,
      });
    }
    setTitulo("");
    setValor(0);
    setDataPrev("");
    setShowForm(false);
    toast.success(precisaVoto ? "Submetido a votação — sócios notificados ✓" : "Pagamento planeado");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-ink">Pagamentos ao empreiteiro</h3>
        {souGestor && (
          <Button size="sm" variant={showForm ? "ghost" : "outline"} onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancelar" : <><Plus size={14} /> Novo pagamento</>}
          </Button>
        )}
      </div>

      {showForm && souGestor && (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: A meio da obra 40%" className={cn(inputCls, "sm:col-span-3")} />
              <div className="flex items-center rounded-lg border border-line bg-card">
                <input type="number" value={valor || ""} onChange={(e) => setValor(Number(e.target.value) || 0)} placeholder="Valor" className="num h-11 w-full bg-transparent px-3 text-base outline-none" />
                <span className="px-3 text-base text-muted">€</span>
              </div>
              <input type="date" value={dataPrev} onChange={(e) => setDataPrev(e.target.value)} className={inputCls} />
              <Button onClick={onAdd}>
                {precisaVoto ? <><Vote size={14} /> Submeter a votação</> : <><Plus size={14} /> Adicionar</>}
              </Button>
            </div>
            {precisaVoto && (
              <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-warning/8 px-3 py-2 text-sm text-warning">
                <Vote size={13} /> Acima de {eur(thresholdDe(obra))} → precisa do voto dos sócios antes de poder ser pago.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {marcos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted">
            <Banknote size={26} className="mx-auto mb-2" />
            <p className="text-base">Planeie os pagamentos (ex.: 30% adjudicação · 40% a meio · 30% no fim).</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {marcos.map((m) => {
            const pendenteVoto = m.aprovacao?.estado === "pendente";
            const toneCls =
              m.estado === "pago"
                ? "border-success/40 bg-success/5"
                : pendenteVoto
                  ? "border-warning/40 bg-warning/5"
                  : m.estado === "atrasado"
                    ? "border-danger/40 bg-danger/5"
                    : "border-line";
            const autor = profiles.find((p) => p.id === m.registadoPor);
            const pagador = profiles.find((p) => p.id === m.pagoPor);
            return (
              <Card key={m.id} className={cn(toneCls)}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-medium text-ink">{m.titulo}</p>
                      <p className="mt-0.5 text-sm text-muted">
                        Previsto: {dataPT(m.dataPrevista)}
                        {m.dataPago && ` · Pago: ${dataPT(m.dataPago)}`}
                        {m.empreiteiro && ` · ${m.empreiteiro}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="num font-display text-xl font-bold text-ink">{eur(m.valor)}</p>
                      {m.aprovacao ? (
                        <EstadoAprovacaoBadge estado={m.aprovacao.estado} />
                      ) : m.estado === "pago" && m.comprovativoPagamento ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-semibold text-success">
                          <ShieldCheck size={11} /> Pago · comprovado
                        </span>
                      ) : (
                        <MarcoBadge estado={m.estado} />
                      )}
                      {m.estado !== "pago" && !pendenteVoto && souGestor && (
                        <Button size="sm" variant="gold" onClick={() => openMarcoPay(m.id)}>
                          <CheckCircle2 size={13} /> Pagar
                        </Button>
                      )}
                      {souGestor && (
                        <button onClick={() => removeMarco(m.id)} className="text-muted hover:text-danger">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {m.estado === "pago" && m.comprovativoPagamento && (() => {
                    const cp = m.comprovativoPagamento;
                    const doc = docs.find((x) => x.id === cp.documentId);
                    return (
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            if (doc?.ficheiroUrl && doc.ficheiroUrl !== "#") window.open(doc.ficheiroUrl, "_blank");
                            else toast.message("Pré-visualização do comprovativo", { description: cp.nomeFicheiro });
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/5 px-2 py-1 text-sm text-success hover:bg-success/10"
                          title={PROVA_TIPO_LABEL[cp.tipo]}
                        >
                          <FileText size={13} /> {cp.nomeFicheiro}
                        </button>
                      </div>
                    );
                  })()}

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    {autor && (
                      <span className="flex items-center gap-1.5">
                        <RoleAvatar profile={autor} role={roleDe(obra, autor.id)} size="xs" /> Criado por {nomeProprio(autor.fullName)}
                      </span>
                    )}
                    {pagador && m.estado === "pago" && (
                      <span className="flex items-center gap-1.5 text-success">
                        <RoleAvatar profile={pagador} role={roleDe(obra, pagador.id)} size="xs" /> Pago por {nomeProprio(pagador.fullName)}
                      </span>
                    )}
                    {pendenteVoto && (
                      <button onClick={() => setVotandoId(votandoId === m.id ? null : m.id)} className="font-medium text-warning underline hover:text-ink">
                        {votandoId === m.id ? "Fechar" : "Ver / votar decisão"}
                      </button>
                    )}
                  </div>

                  {pendenteVoto && votandoId === m.id && m.aprovacao && (
                    <div className="mt-3">
                      <VotacaoPanel obra={obra} tipo="marco" itemId={m.id} aprovacao={m.aprovacao} titulo={m.titulo} valor={m.valor} onResolved={() => setVotandoId(null)} />
                    </div>
                  )}

                  <VerHistorico eventos={historicoMarco(m, profiles)} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MarcoBadge({ estado }: { estado: MarcoEstado }) {
  const map: Record<MarcoEstado, "neutral" | "warning" | "danger" | "success"> = {
    pendente: "warning",
    pago: "success",
    atrasado: "danger",
  };
  return <Badge tone={map[estado]}>{MARCO_ESTADO_LABEL[estado]}</Badge>;
}

// ───────────────────── Registo de responsabilidade (histórico por item) ─────────────────────

interface EventoHistorico {
  ts: string;
  texto: string;
  tone?: "success" | "danger" | "warning";
}

function nomeDePerfil(profiles: Profile[], id?: string): string {
  return nomeProprio(profiles.find((p) => p.id === id)?.fullName) || "Sócio";
}

function eventosAprovacao(ap: NonNullable<Despesa["aprovacao"]>, profiles: Profile[]): EventoHistorico[] {
  const evs: EventoHistorico[] = [
    { ts: `${ap.requeridoEm}T09:00:00`, texto: `Submetido a votação por ${nomeDePerfil(profiles, ap.requeridoPor)} (acima do threshold)` },
    ...ap.votos.map((v) => ({
      ts: v.ts,
      texto: `${nomeDePerfil(profiles, v.userId)} votou ${v.valor === "a_favor" ? "a favor" : "contra"}`,
      tone: (v.valor === "a_favor" ? "success" : "danger") as EventoHistorico["tone"],
    })),
  ];
  if (ap.decididoEm && ap.estado !== "pendente")
    evs.push({
      ts: `${ap.decididoEm}T18:00:00`,
      texto: ap.estado === "aplicado" ? "Aprovado pela maioria — aplicado" : "Rejeitado pelos sócios",
      tone: ap.estado === "aplicado" ? "success" : "danger",
    });
  return evs;
}

export function historicoDespesa(d: Despesa, profiles: Profile[]): EventoHistorico[] {
  const evs: EventoHistorico[] = [
    { ts: d.registadoEm ?? `${d.data}T09:00:00`, texto: `Registado por ${nomeDePerfil(profiles, d.registadoPor)}` },
  ];
  if (d.aprovacao) evs.push(...eventosAprovacao(d.aprovacao, profiles));
  (d.comprovativos ?? []).forEach((c) =>
    evs.push({ ts: c.addedAt, texto: `${nomeDePerfil(profiles, c.addedBy)} anexou ${PROVA_TIPO_LABEL[c.tipo].toLowerCase()} «${c.nomeFicheiro}»` })
  );
  (d.confirmacoes ?? []).forEach((c) =>
    evs.push({
      ts: c.ts,
      texto: `${nomeDePerfil(profiles, c.userId)} ${c.valor === "confirma" ? "confirmou o gasto" : "contestou o gasto"}${c.comentario ? ` — «${c.comentario}»` : ""}`,
      tone: c.valor === "confirma" ? "success" : "warning",
    })
  );
  return evs.sort((a, b) => (a.ts < b.ts ? -1 : 1));
}

export function historicoMarco(m: Marco, profiles: Profile[]): EventoHistorico[] {
  const evs: EventoHistorico[] = [];
  if (m.registadoPor) evs.push({ ts: `${m.dataPrevista}T08:00:00`, texto: `Criado por ${nomeDePerfil(profiles, m.registadoPor)}` });
  if (m.aprovacao) evs.push(...eventosAprovacao(m.aprovacao, profiles));
  if (m.estado === "pago" && m.dataPago)
    evs.push({
      ts: `${m.dataPago}T17:00:00`,
      texto: `Pago por ${nomeDePerfil(profiles, m.pagoPor)}${m.comprovativoPagamento ? ` · comprovativo «${m.comprovativoPagamento.nomeFicheiro}»` : ""}`,
      tone: "success",
    });
  return evs.sort((a, b) => (a.ts < b.ts ? -1 : 1));
}

/** "Ver histórico" — mini-timeline expansível de quem fez o quê e quando. */
export function VerHistorico({ eventos }: { eventos: EventoHistorico[] }) {
  const [open, setOpen] = useState(false);
  if (eventos.length === 0) return null;
  return (
    <div className="mt-2">
      <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-sm text-secondary hover:underline">
        <Clock size={12} /> {open ? "Fechar histórico" : `Ver histórico (${eventos.length})`}
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1 border-l-2 border-line pl-3 animate-fade-in">
          {eventos.map((e, i) => (
            <li key={i} className="text-sm">
              <span className="num text-muted">{dataPT(e.ts.slice(0, 10))} · </span>
              <span className={e.tone === "success" ? "text-success" : e.tone === "danger" ? "text-danger" : e.tone === "warning" ? "text-warning" : "text-ink"}>
                {e.texto}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

