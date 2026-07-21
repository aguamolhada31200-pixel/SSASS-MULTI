import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Hammer,
  ChevronRight,
  ChevronDown,
  Lock,
  Star,
  ShieldCheck,
  Vote,
  TrendingDown,
  Wallet,
  Clock,
  Activity,
  Users2,
  Camera,
  CheckSquare,
  Phone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  useObrasStore,
  CATEGORIA_LABEL,
  ESTADO_LABEL,
  REGRA_LABEL,
  gastoReal,
  progressoReal,
  diasRestantes,
  estaAtrasada,
  saudeObra,
  podeGerir,
  roleDe,
  membrosDe,
  thresholdDe,
  gastoComprovado,
  gastoNaoComprovado,
  pctTransparencia,
  pctVerificadoSocios,
  toneTransparencia,
  TRANSP_HEX,
  TRANSP_LABEL,
  SAUDE_LABEL,
  SAUDE_HEX,
  ROLE_LABEL,
  divisaoDe,
  DIVISAO_LABEL,
  saudePrazoScore,
  custoObrasProjeto,
  type ObraEstado,
} from "@/store/useObrasStore";
import { useCollabStore, roleNoProjeto } from "@/store/useCollabStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { useModalStore } from "@/store/useModalStore";
import { useTechniciansStore } from "@/store/useTechniciansStore";
import { useViewAs } from "@/store/useViewAs";
import { VerComoToggle } from "@/components/collab/VerComoToggle";
import { useNotificationsStore } from "@/store/useNotificationsStore";
import { financasFlipProjeto } from "@/lib/calc/obraProjeto";
import { EmpreiteiroDialog, AvaliarEmpreiteiroDialog } from "@/components/obras/EmpreiteiroCard";
import { SaudeRing, RoleAvatar, nomeProprio } from "@/components/obras/CoGestao";
import { DinheiroScreen } from "@/components/obras/DinheiroScreen";
import { DiarioScreen, TarefasScreen, ContactosScreen } from "@/components/obras/ObraScreens";
import { eur, pct, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

// A OBRA POR DENTRO: 4 ecrãs, nada mais — 💰 Dinheiro · 📸 Diário · ✓ Tarefas · 📞 Contactos.
// Barra fixa no fundo no mobile; tabs grandes no desktop.

const ECRAS = [
  { key: "dinheiro", label: "Dinheiro", icon: Wallet },
  { key: "diario", label: "Diário", icon: Camera },
  { key: "tarefas", label: "Tarefas", icon: CheckSquare },
  { key: "contactos", label: "Contactos", icon: Phone },
] as const;
type EcraKey = (typeof ECRAS)[number]["key"];

export default function ObraDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const obra = useObrasStore((s) => s.obras.find((o) => o.id === id));
  const despesas = useObrasStore((s) => s.despesas);
  const fases = useObrasStore((s) => s.fases);
  const removeObra = useObrasStore((s) => s.removeObra);
  const togglePausada = useObrasStore((s) => s.togglePausada);
  const marcarConcluida = useObrasStore((s) => s.marcarConcluida);

  const projects = useCollabStore((s) => s.projects);
  const properties = usePropertiesStore((s) => s.properties);
  const profiles = useProfilesStore((s) => s.profiles);
  const openObraForm = useModalStore((s) => s.openObraForm);
  const openGaleriaForm = useModalStore((s) => s.openGaleriaForm);

  const [ecra, setEcra] = useState<EcraKey>("dinheiro");
  const [gestaoAberta, setGestaoAberta] = useState(false);
  const [empreiteiroOpen, setEmpreiteiroOpen] = useState(false);
  const [avaliarOpen, setAvaliarOpen] = useState(false);
  const [editandoRegras, setEditandoRegras] = useState(false);
  const [thVal, setThVal] = useState(0);
  const [regraVal, setRegraVal] = useState<"maioria_simples" | "unanimidade">("maioria_simples");

  const obrasAll = useObrasStore((s) => s.obras);
  const marcosAll = useObrasStore((s) => s.marcos);
  const updateObraProg = useObrasStore((s) => s.updateObra);
  const technicians = useTechniciansStore((s) => s.technicians);
  const broadcastNotif = useNotificationsStore((s) => s.broadcast);
  useViewAs((s) => s.modo); // "Ver como" — re-renderiza o detalhe ao alternar o papel

  if (!obra) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Obra não encontrada.</p>
        <Link to="/comunidade/colaborativa/obras" className="mt-2 inline-block text-secondary hover:underline">
          ← Voltar às obras
        </Link>
      </div>
    );
  }

  const project = obra.projectId ? projects.find((p) => p.id === obra.projectId) : undefined;
  const property = obra.propertyId ? properties.find((p) => p.id === obra.propertyId) : undefined;

  const g = gastoReal(obra, despesas);
  const prog = progressoReal(obra, fases);
  const desv = g - obra.orcamento;
  const dias = diasRestantes(obra);
  const atrasada = estaAtrasada(obra);

  // Co-gestão + saúde (50% dinheiro · 50% prazo — nunca verde com orçamento estourado)
  const saude = saudeObra(obra, fases, despesas, marcosAll);
  const temCoGestao = membrosDe(obra).length > 0;
  const souGestor = podeGerir(obra, CURRENT_USER_ID);
  const meuRole = roleDe(obra, CURRENT_USER_ID);

  // Transparência (prova das despesas) — DUAS métricas: com fatura × confirmado pelos sócios
  const pctComp = pctTransparencia(obra, despesas);
  const pctVerif = pctVerificadoSocios(obra, despesas);
  const naoComp = gastoNaoComprovado(obra, despesas);
  const compVal = gastoComprovado(obra, despesas);
  // Verde só quando ambas ≥90% (a 2.ª métrica só conta quando a obra tem investidores).
  const transpTone = pctVerif != null && pctVerif < 90 && pctComp >= 90 ? "ambar" : toneTransparencia(pctComp);

  // ── Cartão TEMPO: texto humano por estado (nunca dias negativos) ──
  const temDatas = !!obra.dataInicio && !!obra.dataFimPrevista;
  const totalDias = temDatas
    ? Math.max(0, Math.round((new Date(`${obra.dataFimPrevista}T00:00:00`).getTime() - new Date(`${obra.dataInicio}T00:00:00`).getTime()) / 86400000))
    : 0;
  const decorridos = totalDias > 0 ? Math.max(0, Math.min(totalDias, Math.round((Date.now() - new Date(`${obra.dataInicio}T00:00:00`).getTime()) / 86400000))) : 0;
  const prazoPct = obra.estado === "concluida" ? 100 : totalDias > 0 ? Math.round((decorridos / totalDias) * 100) : 0;
  const gastoPct = obra.orcamento > 0 ? Math.round((g / obra.orcamento) * 100) : 0;

  const hoje = new Date().toISOString().slice(0, 10);
  const diasAteInicio = obra.dataInicio ? Math.round((new Date(`${obra.dataInicio}T00:00:00`).getTime() - new Date(`${hoje}T00:00:00`).getTime()) / 86400000) : 0;
  const noPrazo = saudePrazoScore(obra) === 100;
  let tempoTitulo: string;
  let tempoTone: "success" | "warning" | "danger" | "neutral";
  if (obra.estado === "concluida") {
    const atrasoFinal = obra.dataFimReal && obra.dataFimReal > obra.dataFimPrevista
      ? Math.round((new Date(`${obra.dataFimReal}T00:00:00`).getTime() - new Date(`${obra.dataFimPrevista}T00:00:00`).getTime()) / 86400000)
      : 0;
    tempoTitulo = atrasoFinal > 0 ? `Terminou ${atrasoFinal} ${atrasoFinal === 1 ? "dia" : "dias"} depois` : "Terminou no prazo";
    tempoTone = atrasoFinal > 0 ? "warning" : "success";
  } else if (obra.estado === "pausada") {
    tempoTitulo = "Obra parada";
    tempoTone = "warning";
  } else if (obra.estado === "por_iniciar") {
    tempoTitulo = diasAteInicio > 0 ? `Começa em ${diasAteInicio} ${diasAteInicio === 1 ? "dia" : "dias"}` : obra.dataInicio ? `Início a ${dataPT(obra.dataInicio)}` : "Por começar";
    tempoTone = "neutral";
  } else if (atrasada) {
    tempoTitulo = `Atrasada ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`;
    tempoTone = "danger";
  } else {
    tempoTitulo = Number.isFinite(dias) ? `Faltam ${dias} ${dias === 1 ? "dia" : "dias"}` : "Sem datas definidas";
    tempoTone = "success";
  }
  const tempoSub = obra.estado === "concluida"
    ? `Concluída · ${dataPT(obra.dataFimReal ?? obra.dataFimPrevista)}`
    : temDatas
      ? `${decorridos} de ${totalDias} dias · até ${dataPT(obra.dataFimPrevista)}`
      : "Defina as datas na edição";

  // ── Cartão DINHEIRO ──
  const aindaNaoComecou = g === 0 && prog === 0;
  const estOrcCor = desv > 0 ? "#9B3A2A" : gastoPct >= 85 ? "#C17E2A" : "#4A7C59";
  const dinheiroVeredito = aindaNaoComecou
    ? { texto: "Ainda não começou", tone: "neutral" as const }
    : desv > 0
      ? { texto: `${eur(desv)} acima do orçamento`, tone: "danger" as const }
      : { texto: `Sobram ${eur(Math.abs(desv))}`, tone: "success" as const };

  // ── Resumo humano (nota de causa) ──
  const resumoHumano = desv > 0 && obra.notaCausa
    ? `Ficou ${eur(desv)} acima do previsto — ${obra.notaCausa.toLowerCase()}.`
    : desv > 0
      ? `Está ${eur(desv)} acima do orçamento.`
      : obra.estado === "por_iniciar"
        ? obra.notas || "Adjudicada — à espera de início."
        : atrasada && obra.notaCausa
          ? `Atrasada — ${obra.notaCausa.toLowerCase()}.`
          : atrasada
            ? `Está ${Math.abs(dias)} dias atrasada.`
            : obra.estado === "concluida"
              ? "Concluída dentro do orçamento e do prazo."
              : "Dentro do orçamento e no prazo.";

  const tecDaObra = technicians.find((t) => t.id === obra.empreiteiroId) ?? technicians.find((t) => t.nome === obra.empreiteiro);

  // ── Impacto no lucro do projeto (flip) ──
  const flip = project && project.type === "reabilitacao" ? project : undefined;
  const custoObrasAtual = flip ? custoObrasProjeto(flip.id, obrasAll, despesas) : 0;
  const finAtual = flip ? financasFlipProjeto(flip, custoObrasAtual) : undefined;
  const derrapagemDesta = Math.max(0, desv);
  const finSemDerrapagem = flip ? financasFlipProjeto(flip, custoObrasAtual - derrapagemDesta) : undefined;

  const socioEu = project?.partners.find((s) => s.id === CURRENT_USER_ID);
  const souInvestidorProj = project ? roleNoProjeto(project, CURRENT_USER_ID) === "investidor" : false;
  const arr = project && project.type === "arrendamento" ? project : undefined;
  const cashflowAnualProj = arr ? ((arr.rendaMensal ?? 0) - (arr.despesasMensais ?? 0)) * 12 : 0;

  const onDelete = () => {
    if (!confirm(`Eliminar a obra "${obra.titulo}"?`)) return;
    removeObra(obra.id);
    toastSuccess("Obra eliminada");
    navigate("/comunidade/colaborativa/obras");
  };

  // Navegação Casa → Divisão → Obra
  const casaId = obra.projectId ?? obra.propertyId;
  const casaHref = casaId ? `/comunidade/colaborativa/obras/${casaId}` : "/comunidade/colaborativa/obras";
  const casaNome = project ? project.title : property?.name ?? "Obras";
  const divisao = divisaoDe(obra);

  return (
    <div className="pb-24 lg:pb-4">
      {/* Breadcrumb: Casa › Divisão › Obra + "Ver como" (obras partilhadas) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <Link to={casaHref} className="inline-flex items-center gap-1.5 text-muted hover:text-ink">
            <ArrowLeft size={15} /> {casaNome}
          </Link>
          <span className="text-muted/50">›</span>
          <Link to={casaHref} className="text-muted hover:text-ink">{DIVISAO_LABEL[divisao]}</Link>
          <span className="text-muted/50">›</span>
          <span className="font-medium text-ink">{obra.titulo}</span>
        </div>
        {temCoGestao && <VerComoToggle />}
      </div>

      {/* Header — 3 cartões-história */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <ObraEstadoBadge estado={obra.estado} />
                <span className="rounded-full bg-accent px-2 py-0.5 text-muted">{CATEGORIA_LABEL[obra.categoria]}</span>
                {temCoGestao && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold",
                      souGestor
                        ? "border-gold/40 bg-gold/15 text-gold-dark"
                        : meuRole === "investidor"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-line bg-accent text-muted"
                    )}
                    title={
                      souGestor
                        ? "Executas as ações; acima do threshold os sócios votam."
                        : meuRole === "investidor"
                          ? "Vês tudo, votas e propões. O gestor executa."
                          : "Acesso só de leitura."
                    }
                  >
                    {souGestor ? "Tu: Gestor" : meuRole === "investidor" ? "Tu: Sócio investidor" : "Tu: Observador"}
                  </span>
                )}
                {tecDaObra ? (
                  <button
                    onClick={() => setEmpreiteiroOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-2 py-0.5 font-medium text-secondary hover:bg-accent"
                  >
                    <Hammer size={10} /> {tecDaObra.nome}
                  </button>
                ) : obra.empreiteiro ? (
                  <span className="text-muted">· {obra.empreiteiro}</span>
                ) : null}
                {obra.estado === "concluida" && obra.avaliacaoTecnico ? <Estrelas n={obra.avaliacaoTecnico} /> : null}
              </div>
              <h1 className="font-display text-2xl font-bold text-ink">{obra.titulo}</h1>
              <p className={cn("mt-1 max-w-2xl text-base", desv > 0 ? "font-medium text-danger" : "text-muted")}>
                {resumoHumano}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {souGestor ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => openObraForm({ editingId: obra.id })}>
                    <Pencil size={14} /> Editar
                  </Button>
                  {obra.estado !== "concluida" && (
                    <Button size="sm" variant="outline" onClick={() => togglePausada(obra.id)}>
                      {obra.estado === "pausada" ? <><PlayCircle size={14} /> Retomar</> : <><PauseCircle size={14} /> Pausar</>}
                    </Button>
                  )}
                  {obra.estado !== "concluida" && (
                    <Button
                      size="sm"
                      variant="gold"
                      onClick={() => {
                        marcarConcluida(obra.id);
                        const outros = membrosDe(obra).map((m) => m.userId).filter((uid) => uid !== CURRENT_USER_ID);
                        if (outros.length > 0)
                          broadcastNotif(outros, {
                            tipo: "geral",
                            titulo: `Obra concluída: «${obra.titulo}»`,
                            descricao: project ? project.title : property?.name,
                            actorId: CURRENT_USER_ID,
                            link: `/obra/${obra.id}`,
                          });
                        toastSuccess("Obra concluída", {
                          description: "Quer criar um antes/depois com as fotos desta obra?",
                          action: { label: "Criar", onClick: () => openGaleriaForm({ initialObraId: obra.id }) },
                        });
                        if (tecDaObra) setAvaliarOpen(true);
                      }}
                    >
                      <CheckCircle2 size={14} /> Marcar concluída
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={onDelete}>
                    <Trash2 size={14} /> Eliminar
                  </Button>
                </>
              ) : meuRole === "investidor" ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg/40 px-3 py-1.5 text-xs text-muted"
                  title="Podes votar nas decisões, confirmar gastos e propor despesas/tarefas ao gestor."
                >
                  <Vote size={12} /> Vês tudo · votas · o gestor executa
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg/40 px-3 py-1.5 text-xs text-muted">
                  <Lock size={12} /> Observador · só leitura
                </span>
              )}
            </div>
          </div>

          {/* 3 cartões-história: DINHEIRO · TEMPO · ESTADO */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StoryCard icon={<Wallet size={15} />} label="Dinheiro">
              <BarraHistoria pct={gastoPct} color={estOrcCor} pctLabel={`${gastoPct}%`} />
              <p className="num mt-2 font-display text-xl font-bold text-ink">{eur(g)}</p>
              <p className="num text-xs text-muted">de {eur(obra.orcamento)}</p>
              <Veredito tone={dinheiroVeredito.tone}>{dinheiroVeredito.texto}</Veredito>
            </StoryCard>

            <StoryCard icon={<Clock size={15} />} label="Tempo">
              <BarraHistoria pct={prazoPct} color="#8B5E3C" pctLabel={`${prazoPct}%`} />
              <p className="mt-2 font-display text-xl font-bold text-ink">{tempoTitulo}</p>
              <p className="num text-xs text-muted">{tempoSub}</p>
              <Veredito tone={tempoTone}>{noPrazo ? "a horas" : obra.estado === "concluida" ? "fora do prazo" : "em atraso"}</Veredito>
            </StoryCard>

            <StoryCard icon={<Activity size={15} />} label="Estado">
              <div className="flex items-center gap-3">
                <SaudeRing score={saude.score} saude={saude.saude} size={56} />
                <div>
                  <p className="font-display text-xl font-bold" style={{ color: SAUDE_HEX[saude.saude] }}>
                    {SAUDE_LABEL[saude.saude]}
                  </p>
                  <p className="text-xs text-muted">{saude.problema ?? "Dinheiro e prazo em ordem"}</p>
                </div>
              </div>
            </StoryCard>
          </div>

          {/* Progresso em 1 toque (só o gestor; automático com passos/tarefas) */}
          <ProgressoRapido
            prog={prog}
            temFases={fases.some((f) => f.obraId === obra.id) || (obra.tarefas?.length ?? 0) > 0}
            souGestor={souGestor}
            concluida={obra.estado === "concluida"}
            onChange={(v) => updateObraProg(obra.id, { progresso: v })}
          />

          {/* Impacto no lucro do projeto (flip) */}
          {flip && finAtual && finSemDerrapagem && (
            <Link
              to={`/comunidade/colaborativa/${flip.id}`}
              className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-gold/25 bg-gold/5 px-3 py-2.5 text-[13px] text-ink transition-colors hover:bg-gold/10"
            >
              <TrendingDown size={14} className="shrink-0 text-gold-dark" />
              {derrapagemDesta > 0 ? (
                <span>
                  Impacto no lucro do projeto: gastar <strong className="num">+{eur(derrapagemDesta)}</strong> nesta obra baixa o lucro estimado de{" "}
                  <strong className="num">{eur(finSemDerrapagem.lucroEstimado)}</strong> para <strong className="num text-danger">{eur(finAtual.lucroEstimado)}</strong>{" "}
                  (ROI {pct(finSemDerrapagem.roi)} → {pct(finAtual.roi)})
                </span>
              ) : (
                <span>
                  Lucro estimado do projeto: <strong className="num text-success">{eur(finAtual.lucroEstimado)}</strong> · ROI {pct(finAtual.roi)} — cada euro acima do orçamento sai daqui
                </span>
              )}
              {souInvestidorProj && socioEu && (
                <span className="whitespace-nowrap">
                  · A tua parte ({socioEu.pct}%): <strong className="num">{eur(finAtual.lucroEstimado * (socioEu.pct / 100))}</strong>
                </span>
              )}
              <ChevronRight size={13} className="ml-auto shrink-0 text-muted" />
            </Link>
          )}

          {/* Impacto no resultado do projeto (arrendamento) */}
          {arr && (
            <Link
              to={`/comunidade/colaborativa/${arr.id}`}
              className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-gold/25 bg-gold/5 px-3 py-2.5 text-[13px] text-ink transition-colors hover:bg-gold/10"
            >
              <TrendingDown size={14} className="shrink-0 text-gold-dark" />
              <span>
                Cashflow anual do projeto: <strong className="num text-success">{eur(cashflowAnualProj)}</strong>
                {souInvestidorProj && socioEu && (
                  <> · A tua parte ({socioEu.pct}%): <strong className="num">{eur(cashflowAnualProj * (socioEu.pct / 100))}</strong></>
                )}
                {desv > 0 && <> — esta obra vai <strong className="num text-danger">{eur(desv)}</strong> acima do orçamento</>}
              </span>
              <ChevronRight size={13} className="ml-auto shrink-0 text-muted" />
            </Link>
          )}

          {/* Co-gestão + transparência — 1 linha discreta, expande ao clicar */}
          {(temCoGestao || g > 0) && (
            <div className="mt-3">
              <button
                onClick={() => setGestaoAberta((v) => !v)}
                className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-line/60 bg-bg/40 px-3 py-2.5 text-left text-[13px] text-muted transition-colors hover:bg-bg/70"
              >
                {temCoGestao && (
                  <span className="flex items-center gap-1.5">
                    <Users2 size={13} />
                    {membrosDe(obra)
                      .map((m) => `${nomeProprio(profiles.find((p) => p.id === m.userId)?.fullName)}${m.role === "gestor" ? " (gestor)" : ""}`)
                      .join(", ")}
                  </span>
                )}
                {g > 0 && (
                  <span className="flex items-center gap-1" style={{ color: TRANSP_HEX[transpTone] }}>
                    <ShieldCheck size={13} /> {pctComp}% com fatura{pctVerif != null ? ` · ${pctVerif}% confirmado pelos sócios` : ""}
                  </span>
                )}
                {temCoGestao && <span>· Threshold {eur(thresholdDe(obra))}</span>}
                <ChevronDown size={14} className={cn("ml-auto shrink-0 transition-transform", gestaoAberta && "rotate-180")} />
              </button>

              {gestaoAberta && (
                <div className="mt-2 space-y-3 rounded-xl border border-line/60 bg-bg/40 p-3 animate-fade-in">
                  {temCoGestao && (
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        {membrosDe(obra).map((m) => (
                          <span key={m.userId} className="flex items-center gap-1.5">
                            <RoleAvatar profile={profiles.find((p) => p.id === m.userId)} role={m.role} size="xs" />
                            <span className="text-xs text-ink">{nomeProprio(profiles.find((p) => p.id === m.userId)?.fullName)}</span>
                            <span className="text-[10px] text-muted">{ROLE_LABEL[m.role]}</span>
                          </span>
                        ))}
                      </div>
                      {!editandoRegras ? (
                        <span className="flex items-center gap-1.5 text-[11px] text-muted">
                          <ShieldCheck size={12} className="text-gold-dark" />
                          Threshold: {eur(thresholdDe(obra))}
                          {obra.orcamento > 0 && <> ({Math.round((thresholdDe(obra) / obra.orcamento) * 100)}%)</>}
                          {" · "}{REGRA_LABEL[obra.regraVotacao ?? "maioria_simples"]}
                          {souGestor && (
                            <button
                              onClick={() => {
                                setThVal(thresholdDe(obra));
                                setRegraVal(obra.regraVotacao ?? "maioria_simples");
                                setEditandoRegras(true);
                              }}
                              className="ml-1 font-medium text-secondary underline hover:text-ink"
                            >
                              Editar
                            </button>
                          )}
                        </span>
                      ) : (
                        <span className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="text-muted">Acima de</span>
                          <span className="flex items-center rounded-lg border border-line bg-card">
                            <input
                              type="number"
                              value={thVal || ""}
                              onChange={(e) => setThVal(Number(e.target.value) || 0)}
                              className="num h-7 w-20 bg-transparent px-2 text-xs outline-none"
                            />
                            <span className="pr-2 text-muted">€</span>
                          </span>
                          <span className="text-muted">vai a votos ·</span>
                          <select
                            value={regraVal}
                            onChange={(e) => setRegraVal(e.target.value as "maioria_simples" | "unanimidade")}
                            className="h-7 rounded-lg border border-line bg-card px-1.5 text-xs outline-none"
                          >
                            <option value="maioria_simples">Maioria simples</option>
                            <option value="unanimidade">Unanimidade</option>
                          </select>
                          <button
                            onClick={() => {
                              updateObraProg(obra.id, { thresholdAprovacao: Math.max(0, thVal), regraVotacao: regraVal });
                              setEditandoRegras(false);
                              toastSuccess("Regras de aprovação atualizadas ✓");
                            }}
                            className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-white hover:bg-primary/90"
                          >
                            Guardar
                          </button>
                          <button onClick={() => setEditandoRegras(false)} className="text-muted hover:text-ink">
                            Cancelar
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                  {g > 0 && (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Transparência da obra</p>
                        <p className="num text-xs font-semibold" style={{ color: TRANSP_HEX[transpTone] }}>
                          {TRANSP_LABEL[transpTone]}
                        </p>
                      </div>
                      {/* Barra 1 — tem fatura */}
                      <p className="num mt-1.5 text-[11px] text-muted">{pctComp}% com fatura</p>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-accent">
                        <div className="h-full origin-left rounded-full animate-grow-x" style={{ width: `${pctComp}%`, background: pctComp >= 90 ? "#4A7C59" : "#C17E2A" }} />
                      </div>
                      {/* Barra 2 — confirmado pelos sócios (só obras com investidores) */}
                      {pctVerif != null && (
                        <>
                          <p className="num mt-1.5 text-[11px] text-muted">{pctVerif}% confirmado pelos sócios</p>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-accent">
                            <div className="h-full origin-left rounded-full animate-grow-x" style={{ width: `${pctVerif}%`, background: pctVerif >= 90 ? "#4A7C59" : "#C17E2A" }} />
                          </div>
                        </>
                      )}
                      <p className="num mt-1.5 text-[11px] text-muted">
                        {eur(compVal)} comprovado
                        {naoComp > 0 && <> · <span className="font-medium text-warning">{eur(naoComp)} por comprovar</span></>}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogos: cartão do empreiteiro + avaliação ao concluir */}
      {empreiteiroOpen && tecDaObra && <EmpreiteiroDialog technicianId={tecDaObra.id} onClose={() => setEmpreiteiroOpen(false)} />}
      {avaliarOpen && tecDaObra && (
        <AvaliarEmpreiteiroDialog
          technician={tecDaObra}
          onClose={(estrelas) => {
            if (estrelas) updateObraProg(obra.id, { avaliacaoTecnico: estrelas });
            setAvaliarOpen(false);
          }}
        />
      )}

      {/* Tabs grandes no desktop (escondidas no mobile — lá vive a barra fixa) */}
      <div className="mt-5 hidden gap-2 lg:flex">
        {ECRAS.map((e) => {
          const Icon = e.icon;
          const ativo = ecra === e.key;
          return (
            <button
              key={e.key}
              onClick={() => setEcra(e.key)}
              className={cn(
                "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border text-base font-semibold transition-colors",
                ativo ? "border-gold bg-gold text-sidebar shadow-sm" : "border-line bg-card text-ink hover:bg-accent"
              )}
            >
              <Icon size={20} /> {e.label}
            </button>
          );
        })}
      </div>

      {/* Ecrã ativo */}
      <div className="mt-4">
        {ecra === "dinheiro" && <DinheiroScreen obra={obra} souGestor={souGestor} />}
        {ecra === "diario" && <DiarioScreen obra={obra} souGestor={souGestor} />}
        {ecra === "tarefas" && <TarefasScreen obra={obra} souGestor={souGestor} />}
        {ecra === "contactos" && <ContactosScreen obra={obra} souGestor={souGestor} />}
      </div>

      {/* MOBILE: barra fixa no fundo — 4 ícones grandes, sem menus escondidos */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {ECRAS.map((e) => {
            const Icon = e.icon;
            const ativo = ecra === e.key;
            return (
              <button
                key={e.key}
                onClick={() => {
                  setEcra(e.key);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors",
                  ativo ? "text-gold-dark" : "text-muted"
                )}
              >
                <Icon size={24} strokeWidth={ativo ? 2.4 : 1.8} />
                {e.label}
                {ativo && <span className="h-1 w-8 rounded-full bg-gold" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ───────────────────── Cartões-história (Dinheiro · Tempo · Estado) ─────────────────────

function StoryCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line/60 bg-bg/40 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {icon} {label}
      </p>
      {children}
    </div>
  );
}

function BarraHistoria({ pct: p, color, pctLabel }: { pct: number; color: string; pctLabel: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-accent">
        <div className="h-full origin-left rounded-full animate-grow-x" style={{ width: `${Math.min(100, Math.max(0, p))}%`, background: color }} />
      </div>
      <span className="num text-xs font-semibold text-ink">{pctLabel}</span>
    </div>
  );
}

function Veredito({ tone, children }: { tone: "success" | "warning" | "danger" | "neutral"; children: React.ReactNode }) {
  const cls = { success: "text-success", warning: "text-warning", danger: "text-danger", neutral: "text-muted" }[tone];
  const dot = { success: "bg-success", warning: "bg-warning", danger: "bg-danger", neutral: "bg-line" }[tone];
  return (
    <p className={cn("mt-1.5 flex items-center gap-1.5 text-xs font-medium", cls)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} /> {children}
    </p>
  );
}

/** Slider de progresso + botões rápidos — fricção zero (só o gestor mexe). */
function ProgressoRapido({
  prog,
  temFases,
  souGestor,
  concluida,
  onChange,
}: {
  prog: number;
  temFases: boolean;
  souGestor: boolean;
  concluida: boolean;
  onChange: (v: number) => void;
}) {
  const bloqueado = !souGestor || temFases || concluida;
  const motivo = !souGestor
    ? "Só o gestor atualiza o progresso"
    : temFases
      ? "Automático: média dos passos/tarefas"
      : concluida
        ? "Obra concluída"
        : undefined;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line/60 bg-bg/40 px-3 py-2.5" title={motivo}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Progresso</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={prog}
        disabled={bloqueado}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 min-w-[120px] flex-1 accent-[#C8A664] disabled:opacity-50"
      />
      <span className="num w-11 text-right text-sm font-bold text-ink">{prog}%</span>
      {!bloqueado && (
        <span className="flex gap-1.5">
          <button
            onClick={() => onChange(Math.min(100, prog + 25))}
            className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-accent"
          >
            +25%
          </button>
          <button
            onClick={() => onChange(100)}
            className="rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success hover:bg-success/20"
          >
            Concluído
          </button>
        </span>
      )}
      {motivo && <span className="text-[10px] text-muted">{motivo}</span>}
    </div>
  );
}

function Estrelas({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${n}/5 ao técnico`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12} className={i <= n ? "fill-gold text-gold" : "text-line"} />
      ))}
    </span>
  );
}

function ObraEstadoBadge({ estado }: { estado: ObraEstado }) {
  const map: Record<ObraEstado, "neutral" | "info" | "warning" | "success" | "danger"> = {
    por_iniciar: "neutral",
    em_curso: "info",
    pausada: "warning",
    concluida: "success",
    atrasada: "danger",
  };
  return <Badge tone={map[estado]}>{ESTADO_LABEL[estado]}</Badge>;
}
