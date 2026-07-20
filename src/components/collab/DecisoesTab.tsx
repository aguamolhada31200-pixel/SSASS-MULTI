import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  X,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Paperclip,
  Hammer,
  Wallet,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  useDecisionsStore,
  resumoVotos,
  prazoExpirado,
  DECISAO_TIPO_LABEL,
  DECISAO_CONTEXTO_LABEL,
  MAIORIA_LABEL,
  MAIORIA_LABEL_SHORT,
  type Decisao,
  type DecisaoTipo,
  type DecisaoContexto,
  type MaioriaRegra,
  type VotoValor,
} from "@/store/useDecisionsStore";
import { useCollabStore, type CollabProject } from "@/store/useCollabStore";
import { useNotificationsStore } from "@/store/useNotificationsStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useObrasStore, relativaTempo } from "@/store/useObrasStore";
import { RoleAvatar, nomeProprio } from "@/components/obras/CoGestao";
import { CollabSH, sociosIds, inputCls } from "./shared";
import { eur, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

const TIPO_ICON: Record<DecisaoTipo, typeof Wallet> = {
  despesa: Wallet,
  obra: Hammer,
  venda: Sparkles,
  geral: MessageCircle,
};

type FiltroContexto = "todas" | DecisaoContexto;

const FILTROS_CONTEXTO: { key: FiltroContexto; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "geral", label: "Gerais" },
  { key: "obra", label: "Obras" },
  { key: "financas", label: "Finanças" },
  { key: "contrato", label: "Contratos" },
];

export function DecisoesTab({ project: p }: { project: CollabProject }) {
  const decisoes = useDecisionsStore((s) => s.decisoes.filter((d) => d.projectId === p.id));
  const syncEstados = useDecisionsStore((s) => s.syncEstados);
  const [formOpen, setFormOpen] = useState(false);
  // Deep-link: /comunidade/colaborativa/:id?tab=decisoes&obra=<obraId> chega já filtrado à obra.
  const [params] = useSearchParams();
  const obraParam = params.get("obra");
  const [filtro, setFiltro] = useState<FiltroContexto>(obraParam ? "obra" : "todas");
  const [obraFiltro, setObraFiltro] = useState<string | null>(obraParam);

  // Auto-fecho por prazo ao abrir a tab.
  useEffect(() => {
    syncEstados(p.id, p.partners);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);

  const filtradas = useMemo(
    () =>
      decisoes.filter((d) => {
        const ctx = d.contexto ?? "geral";
        if (obraFiltro) return ctx === "obra" && d.contextoId === obraFiltro;
        if (filtro === "todas") return true;
        return ctx === filtro;
      }),
    [decisoes, filtro, obraFiltro]
  );

  const ordenadas = useMemo(
    () =>
      [...filtradas].sort((a, b) => {
        if (a.estado === "pendente" && b.estado !== "pendente") return -1;
        if (b.estado === "pendente" && a.estado !== "pendente") return 1;
        return a.createdAt < b.createdAt ? 1 : -1;
      }),
    [filtradas]
  );

  const pendentes = decisoes.filter((d) => d.estado === "pendente").length;
  const souSocio = p.partners.some((s) => s.id === CURRENT_USER_ID && (s.status ?? "ativo") === "ativo");
  const obraFiltroLabel = obraFiltro
    ? decisoes.find((d) => d.contextoId === obraFiltro)?.contextoLabel ?? "esta obra"
    : null;

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {decisoes.length} decisão(ões) · <span className={cn(pendentes > 0 && "font-semibold text-warning")}>{pendentes} a aguardar voto</span>
        </p>
        {souSocio && (
          <Button size="sm" variant="gold" onClick={() => setFormOpen(true)}>
            <Plus size={14} /> Nova decisão
          </Button>
        )}
      </div>

      {/* Filtros por contexto */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS_CONTEXTO.map((f) => (
          <button
            key={f.key}
            onClick={() => { setFiltro(f.key); setObraFiltro(null); }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              filtro === f.key && !obraFiltro ? "border-gold bg-gold text-sidebar" : "border-line bg-card text-muted hover:text-ink"
            )}
          >
            {f.label}
          </button>
        ))}
        {obraFiltro && (
          <button
            onClick={() => { setObraFiltro(null); setFiltro("obra"); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold bg-gold/15 px-3 py-1.5 text-sm font-semibold text-gold-dark"
            title="Remover filtro da obra"
          >
            {obraFiltroLabel} <X size={13} />
          </button>
        )}
      </div>

      {ordenadas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <MessageCircle size={28} className="mx-auto mb-2" />
            <p className="text-sm">
              {decisoes.length === 0 ? "Ainda sem decisões neste projeto." : "Nenhuma decisão neste filtro."}
            </p>
            {souSocio && decisoes.length === 0 && (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setFormOpen(true)}>
                <Plus size={14} /> Propor primeira decisão
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ordenadas.map((d) => <DecisaoCard key={d.id} decisao={d} project={p} />)}
        </div>
      )}

      {formOpen && <NovaDecisaoModal project={p} onClose={() => setFormOpen(false)} />}
    </div>
  );
}

/* ───────────────────── Card de decisão ───────────────────── */

function EstadoBadge({ d }: { d: Decisao }) {
  if (d.estado === "aprovada")
    return <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-semibold text-success"><CheckCircle2 size={12} /> Aprovada</span>;
  if (d.estado === "rejeitada")
    return <span className="inline-flex items-center gap-1 rounded-full bg-danger/12 px-2.5 py-1 text-[11px] font-semibold text-danger"><XCircle size={12} /> Rejeitada</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2.5 py-1 text-[11px] font-semibold text-warning"><Clock size={12} /> Pendente</span>;
}

function DecisaoCard({ decisao: d, project: p }: { decisao: Decisao; project: CollabProject }) {
  const profiles = useProfilesStore((s) => s.profiles);
  const votar = useDecisionsStore((s) => s.votar);
  const comentar = useDecisionsStore((s) => s.comentar);
  const marcarAplicada = useDecisionsStore((s) => s.marcarAplicada);
  const broadcast = useNotificationsStore((s) => s.broadcast);
  const addTx = useTransactionsStore((s) => s.add);
  const addObra = useObrasStore((s) => s.addObra);

  const [comentario, setComentario] = useState("");

  const r = resumoVotos(d, p.partners);
  const votantes = p.partners.filter((s) => (s.status ?? "ativo") === "ativo" && (s.role ?? "investidor") !== "observador");
  const meuVoto = d.votos.find((v) => v.userId === CURRENT_USER_ID);
  const possoVotar = d.estado === "pendente" && votantes.some((s) => s.id === CURRENT_USER_ID);
  const souGestor = p.partners.find((s) => s.id === CURRENT_USER_ID)?.role === "gestor";
  const propositor = profiles.find((x) => x.id === d.proposedBy);
  const nomePropositor = propositor?.fullName ?? p.partners.find((s) => s.id === d.proposedBy)?.name ?? "Sócio";
  const Icon = TIPO_ICON[d.tipo];

  const onVote = (valor: VotoValor) => {
    const estado = votar(d.id, CURRENT_USER_ID, valor, p.partners);
    const labelVoto = valor === "a_favor" ? "a favor" : valor === "contra" ? "contra" : "abstenção";
    broadcast(sociosIds(p, CURRENT_USER_ID), {
      tipo: estado === "pendente" ? "decisao_voto" : "decisao_fechada",
      titulo:
        estado === "pendente"
          ? `Novo voto (${labelVoto}) em «${d.titulo}»`
          : `Decisão ${estado === "aprovada" ? "aprovada" : "rejeitada"}: «${d.titulo}»`,
      actorId: CURRENT_USER_ID,
      link: `/comunidade/colaborativa/${p.id}`,
    });
    if (estado === "aprovada") toast.success("Maioria atingida — decisão aprovada");
    else if (estado === "rejeitada") toast("Decisão rejeitada", { description: "Aprovação já não era possível." });
    else toast.success(`Voto registado · ${labelVoto}`);
  };

  const onComment = () => {
    const txt = comentario.trim();
    if (!txt) return;
    comentar(d.id, CURRENT_USER_ID, txt);
    broadcast(sociosIds(p, CURRENT_USER_ID), {
      tipo: "decisao_comentario",
      titulo: `Novo comentário em «${d.titulo}»`,
      descricao: txt.slice(0, 80),
      actorId: CURRENT_USER_ID,
      link: `/comunidade/colaborativa/${p.id}`,
    });
    setComentario("");
  };

  const aplicar = () => {
    const hoje = new Date().toISOString().slice(0, 10);
    if (d.tipo === "despesa") {
      if (!p.propertyId) { toast.error("O projeto não tem imóvel associado."); return; }
      addTx({
        tipo: "despesa",
        propertyId: p.propertyId,
        categoria: "Obras",
        valor: d.valor ?? 0,
        data: hoje,
        descricao: `${d.titulo} (decisão aprovada)`,
        recorrente: false,
        deduzivelIrs: true,
      });
      toast.success("Despesa criada nas Finanças ✓");
    } else if (d.tipo === "obra") {
      const fim = new Date();
      fim.setDate(fim.getDate() + 30);
      addObra({
        projectId: p.id,
        titulo: d.titulo,
        categoria: "geral",
        orcamento: d.valor ?? 0,
        gasto: 0,
        dataInicio: hoje,
        dataFimPrevista: fim.toISOString().slice(0, 10),
        estado: "por_iniciar",
        progresso: 0,
        notas: d.descricao,
      });
      toast.success("Obra criada no kanban ✓");
    }
    marcarAplicada(d.id);
  };

  // Barra ponderada
  const seg = (w: number) => `${Math.max(0, Math.min(100, w))}%`;

  return (
    <Card className={cn(d.estado === "pendente" && "border-gold/40")}>
      <CardContent>
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", d.estado === "pendente" ? "bg-gold/15 text-gold-dark" : "bg-accent text-secondary")}>
              <Icon size={17} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-base font-semibold leading-snug text-ink">{d.titulo}</p>
              {/* Chip do contexto — decisões de obra levam à obra */}
              {(d.contexto ?? "geral") === "obra" && d.contextoId && (
                <Link
                  to={`/obra/${d.contextoId}`}
                  className="mt-1 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold text-gold-dark hover:bg-gold/20"
                >
                  <Hammer size={10} /> {d.contextoLabel ?? "Obra"}
                </Link>
              )}
              {d.contexto && d.contexto !== "geral" && d.contexto !== "obra" && (
                <span className="mt-1 inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-secondary">
                  {DECISAO_CONTEXTO_LABEL[d.contexto]}
                </span>
              )}
              <p className="mt-0.5 text-[11px] text-muted">
                {DECISAO_TIPO_LABEL[d.tipo]}
                {d.valor ? <> · <span className="num font-semibold text-ink">{eur(d.valor)}</span></> : null}
                {" · proposto por "}{nomeProprio(nomePropositor)}
                {" · "}{relativaTempo(d.createdAt)}
                {d.prazo && d.estado === "pendente" && (
                  <span className={cn(prazoExpirado(d) ? "text-danger" : "text-warning")}> · prazo {dataPT(d.prazo)}</span>
                )}
              </p>
            </div>
          </div>
          <EstadoBadge d={d} />
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted">{d.descricao}</p>

        {d.anexos && d.anexos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {d.anexos.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] text-secondary hover:bg-accent/70">
                <Paperclip size={11} /> {a.nome}
              </a>
            ))}
          </div>
        )}

        {/* Barra de votos ponderada */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>
              <span className="font-semibold text-success">{Math.round(r.pesoFavor)}%</span> a favor ·{" "}
              <span className="font-semibold text-danger">{Math.round(r.pesoContra)}%</span> contra
              {r.pesoAbstencao > 0 && <> · {Math.round(r.pesoAbstencao)}% abstenção</>}
            </span>
            <span>{MAIORIA_LABEL_SHORT[d.maioria]}</span>
          </div>
          <div className="mt-1 flex h-2.5 overflow-hidden rounded-full bg-accent">
            <div className="h-full bg-success transition-all" style={{ width: seg(r.pesoFavor) }} />
            <div className="h-full bg-danger transition-all" style={{ width: seg(r.pesoContra) }} />
            <div className="h-full bg-line transition-all" style={{ width: seg(r.pesoAbstencao) }} />
          </div>
          {/* Avatares + voto de cada sócio */}
          <div className="mt-2.5 flex flex-wrap gap-2">
            {votantes.map((s) => {
              const v = d.votos.find((x) => x.userId === s.id);
              return (
                <span
                  key={s.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px]",
                    v?.valor === "a_favor"
                      ? "border-success/40 bg-success/8 text-success"
                      : v?.valor === "contra"
                        ? "border-danger/40 bg-danger/8 text-danger"
                        : v?.valor === "abstencao"
                          ? "border-line bg-accent text-muted"
                          : "border-line bg-bg/40 text-muted"
                  )}
                >
                  <RoleAvatar profile={profiles.find((x) => x.id === s.id)} role={(s.role ?? "investidor") as any} size="xs" />
                  {nomeProprio(s.name)} · {s.pct}%
                  {v?.valor === "a_favor" && <ThumbsUp size={11} />}
                  {v?.valor === "contra" && <ThumbsDown size={11} />}
                  {v?.valor === "abstencao" && <MinusCircle size={11} />}
                  {!v && "· por votar"}
                </span>
              );
            })}
          </div>
        </div>

        {/* Botões de voto */}
        {possoVotar && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              onClick={() => onVote("a_favor")}
              className={cn("flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                meuVoto?.valor === "a_favor" ? "border-success bg-success text-white" : "border-success/40 text-success hover:bg-success/10")}
            >
              <ThumbsUp size={14} /> A favor
            </button>
            <button
              onClick={() => onVote("contra")}
              className={cn("flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                meuVoto?.valor === "contra" ? "border-danger bg-danger text-white" : "border-danger/40 text-danger hover:bg-danger/10")}
            >
              <ThumbsDown size={14} /> Contra
            </button>
            <button
              onClick={() => onVote("abstencao")}
              className={cn("flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                meuVoto?.valor === "abstencao" ? "border-secondary bg-secondary text-white" : "border-line text-muted hover:bg-accent")}
            >
              <MinusCircle size={14} /> Abster
            </button>
          </div>
        )}
        {possoVotar && meuVoto && <p className="mt-1.5 text-[11px] text-muted">Pode alterar o seu voto até a decisão fechar.</p>}

        {/* Aplicar (despesa/obra aprovada) */}
        {d.estado === "aprovada" && (d.tipo === "despesa" || d.tipo === "obra") && (
          d.aplicada ? (
            <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-success/8 px-3 py-2 text-xs font-medium text-success">
              <CheckCircle2 size={13} /> Aplicada — {d.tipo === "despesa" ? "despesa registada nas Finanças" : "obra criada no kanban"}.
            </p>
          ) : souGestor ? (
            <Button size="sm" variant="gold" className="mt-3" onClick={aplicar}>
              <Sparkles size={14} /> Aplicar — criar {d.tipo === "despesa" ? "despesa" : "obra"}
            </Button>
          ) : (
            <p className="mt-3 text-[11px] text-muted">Aprovada — o gestor pode aplicar (criar {d.tipo}).</p>
          )
        )}

        {/* Comentários */}
        <div className="mt-4 border-t border-line/60 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Comentários · {d.comentarios.length}
          </p>
          <div className="space-y-2">
            {d.comentarios.map((c) => {
              const prof = profiles.find((x) => x.id === c.userId);
              const nome = prof?.fullName ?? p.partners.find((s) => s.id === c.userId)?.name ?? "Sócio";
              return (
                <div key={c.id} className="flex items-start gap-2.5">
                  <RoleAvatar profile={prof} size="xs" />
                  <div className="min-w-0 flex-1 rounded-xl bg-bg/60 px-3 py-2">
                    <p className="text-[11px] font-medium text-ink">
                      {nomeProprio(nome)} <span className="font-normal text-muted">· {relativaTempo(c.ts)}</span>
                    </p>
                    <p className="text-[13px] leading-relaxed text-ink">{renderMentions(c.texto)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 flex gap-2">
            <input
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onComment(); } }}
              placeholder="Comentar… use @Nome para mencionar"
              className={inputCls}
            />
            <Button size="sm" variant="outline" onClick={onComment}><Send size={14} /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Destaca @mentions a dourado. */
function renderMentions(texto: string): React.ReactNode {
  const parts = texto.split(/(@[\wÀ-ÿ]+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-semibold text-gold-dark">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/* ───────────────────── Modal: nova decisão ───────────────────── */

/** Prefill quando a decisão nasce noutro contexto (ex.: dentro de uma obra). */
export interface DecisaoPrefill {
  contexto?: DecisaoContexto;
  contextoId?: string;
  contextoLabel?: string;
  tituloSugerido?: string;
  tipo?: DecisaoTipo;
}

export function NovaDecisaoModal({
  project: p,
  onClose,
  prefill,
}: {
  project: CollabProject;
  onClose: () => void;
  prefill?: DecisaoPrefill;
}) {
  const add = useDecisionsStore((s) => s.add);
  const broadcast = useNotificationsStore((s) => s.broadcast);
  // Estado vazio: sem outros sócios ativos, não há com quem decidir.
  const outrosSocios = p.partners.filter((s) => s.id !== CURRENT_USER_ID && (s.status ?? "ativo") === "ativo");

  const [titulo, setTitulo] = useState(prefill?.tituloSugerido ?? "");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<DecisaoTipo>(prefill?.tipo ?? "despesa");
  const [valor, setValor] = useState("");
  const [prazo, setPrazo] = useState("");
  const [maioria, setMaioria] = useState<MaioriaRegra>("simples");
  const [anexoNome, setAnexoNome] = useState("");
  const [anexoUrl, setAnexoUrl] = useState("");
  const [anexos, setAnexos] = useState<{ nome: string; url: string }[]>([]);

  const addAnexo = () => {
    if (!anexoNome.trim() || !anexoUrl.trim()) return;
    setAnexos((a) => [...a, { nome: anexoNome.trim(), url: anexoUrl.trim() }]);
    setAnexoNome("");
    setAnexoUrl("");
  };

  const submit = () => {
    if (titulo.trim().length < 3) { toast.error("Indique o título da decisão."); return; }
    if ((tipo === "despesa" || tipo === "venda") && !(Number(valor) > 0)) { toast.error("Indique o valor."); return; }
    add({
      projectId: p.id,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      tipo,
      contexto: prefill?.contexto ?? "geral",
      contextoId: prefill?.contextoId,
      contextoLabel: prefill?.contextoLabel,
      valor: Number(valor) > 0 ? Number(valor) : undefined,
      prazo: prazo || undefined,
      maioria,
      proposedBy: CURRENT_USER_ID,
      anexos: anexos.length > 0 ? anexos : undefined,
    });
    broadcast(sociosIds(p, CURRENT_USER_ID), {
      tipo: "decisao_criada",
      titulo: `Nova decisão: «${titulo.trim()}»`,
      descricao: Number(valor) > 0 ? eur(Number(valor)) : undefined,
      actorId: CURRENT_USER_ID,
      link: `/comunidade/colaborativa/${p.id}`,
    });
    toast.success("Decisão proposta", { description: "Todos os sócios foram notificados." });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">Nova decisão</h3>
            <p className="text-xs text-muted">
              {prefill?.contextoLabel ? `${prefill.contextoLabel} · ` : ""}#{p.number} {p.title}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          {outrosSocios.length === 0 && (
            <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-accent p-5 text-center">
              <MessageCircle size={20} className="text-muted" />
              <p className="mt-2 text-[15px] font-medium text-ink">Ainda não tem sócios neste projeto.</p>
              <p className="mt-0.5 text-[13px] text-muted">As decisões são votadas pelos sócios — convide primeiro.</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-gold px-4 text-sm font-semibold text-sidebar hover:opacity-90"
              >
                Convidar sócio (tab Sócios) →
              </button>
            </div>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Título *</span>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Aprovar orçamento da cozinha" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Descrição</span>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="Contexto e justificação…" className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-secondary" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Tipo</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as DecisaoTipo)} className={inputCls}>
                {(Object.keys(DECISAO_TIPO_LABEL) as DecisaoTipo[]).map((t) => (
                  <option key={t} value={t}>{DECISAO_TIPO_LABEL[t]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Valor € {tipo === "geral" ? "(opcional)" : "*"}</span>
              <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="numeric" placeholder="1500" className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Prazo de votação</span>
              <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Maioria requerida</span>
              <select value={maioria} onChange={(e) => setMaioria(e.target.value as MaioriaRegra)} className={inputCls}>
                {(Object.keys(MAIORIA_LABEL) as MaioriaRegra[]).map((m) => (
                  <option key={m} value={m}>{MAIORIA_LABEL[m]}</option>
                ))}
              </select>
            </label>
          </div>
          {/* Anexos */}
          <div className="rounded-xl border border-line/60 bg-bg/40 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted"><Paperclip size={12} /> Anexos</p>
            {anexos.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {anexos.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] text-secondary">
                    {a.nome}
                    <button onClick={() => setAnexos((x) => x.filter((_, idx) => idx !== i))} className="text-muted hover:text-danger"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input value={anexoNome} onChange={(e) => setAnexoNome(e.target.value)} placeholder="Nome" className={inputCls} />
              <input value={anexoUrl} onChange={(e) => setAnexoUrl(e.target.value)} placeholder="URL" className={inputCls} />
              <Button size="sm" variant="outline" onClick={addAnexo}><Plus size={13} /></Button>
            </div>
          </div>
          <p className="text-[11px] text-muted">
            Os votos são ponderados pela percentagem de cada sócio. A decisão fecha automaticamente quando a maioria é atingida (ou impossível) ou o prazo termina.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="gold" onClick={submit}><Send size={15} /> Propor aos sócios</Button>
        </div>
      </div>
    </div>
  );
}
