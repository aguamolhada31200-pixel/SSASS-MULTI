import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { Plus, KanbanSquare, LayoutList, ChevronDown, Hammer, Wrench, AlertTriangle, Euro, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  useMaintenanceStore,
  PRIORIDADE_LABEL,
  ESTADO_PEDIDO_LABEL,
  CATEGORIA_PEDIDO_LABEL,
  pedidoAberto,
  diasDesdeCriacao,
  proximoPasso,
  sugereConversaoEmObra,
  type MaintenanceRequest,
  type Prioridade,
  type EstadoPedido,
  type CategoriaPedido,
  type Responsabilidade,
} from "@/store/useMaintenanceStore";
import { useMaintenancePlanStore, estadoPlano } from "@/store/useMaintenancePlanStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useTechniciansStore } from "@/store/useTechniciansStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useModalStore } from "@/store/useModalStore";
import { CATEGORIA_PEDIDO_ICON, PRIORIDADE_BORDA, PRIORIDADE_TONE, ESTADO_TONE, RespBadge } from "./shared";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ═════════════════ KPIs (página e tab do imóvel — mesma faixa, filtrada) ═════════════════ */

export function KpisManutencao({ propertyId }: { propertyId?: string }) {
  const requests = useMaintenanceStore((s) => s.requests);
  const tasks = useMaintenancePlanStore((s) => s.tasks);
  const txs = useTransactionsStore((s) => s.transactions);

  const meus = propertyId ? requests.filter((r) => r.propertyId === propertyId) : requests;
  const abertos = meus.filter(pedidoAberto);
  const urgentes = abertos.filter((r) => r.prioridade === "urgente");
  const planTasks = propertyId ? tasks.filter((t) => t.propertyId === propertyId) : tasks;
  const vencidas = planTasks.filter((t) => estadoPlano(t) === "vencida");

  // Custo: transações "Manutenção/Reparações" — mês corrente na página; últimos 12 meses no imóvel
  const agora = new Date();
  const mesCorrente = agora.toISOString().slice(0, 7);
  const há12m = new Date(agora.getFullYear() - 1, agora.getMonth(), agora.getDate()).toISOString().slice(0, 10);
  const custo = txs
    .filter((t) => t.tipo === "despesa" && t.categoria === "Manutenção/Reparações")
    .filter((t) => (propertyId ? t.propertyId === propertyId : true))
    .filter((t) => (propertyId ? t.data >= há12m : t.data.slice(0, 7) === mesCorrente))
    .reduce((s, t) => s + t.valor, 0);

  const Item = ({ label, value, tone, icon: Icon }: { label: string; value: string; tone?: "danger" | "success"; icon: typeof Wrench }) => (
    <div className="rounded-xl border border-line bg-card p-3 shadow-sm">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
        <Icon size={12} /> {label}
      </p>
      <p className={cn("num mt-1 font-display text-xl font-bold", tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-ink")}>
        {value}
      </p>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Item label="Abertos" value={String(abertos.length)} icon={Wrench} />
      <Item label="Urgentes" value={String(urgentes.length)} tone={urgentes.length > 0 ? "danger" : undefined} icon={AlertTriangle} />
      <Item label="Prevenção vencida" value={String(vencidas.length)} tone={vencidas.length > 0 ? "danger" : undefined} icon={ShieldCheck} />
      <Item label={propertyId ? "Custo 12 meses" : "Custo este mês"} value={eur(custo)} icon={Euro} />
    </div>
  );
}

/* ═════════════════ Frase-resumo (linguagem humana) ═════════════════ */

export function FraseResumo({ propertyId }: { propertyId?: string }) {
  const requests = useMaintenanceStore((s) => s.requests);
  const tasks = useMaintenancePlanStore((s) => s.tasks);
  const meus = propertyId ? requests.filter((r) => r.propertyId === propertyId) : requests;
  const urgentes = meus.filter((r) => pedidoAberto(r) && r.prioridade === "urgente").length;
  const emCurso = meus.filter((r) => r.estado === "em_curso" || r.estado === "agendado").length;
  const vencidas = (propertyId ? tasks.filter((t) => t.propertyId === propertyId) : tasks).filter(
    (t) => estadoPlano(t) === "vencida"
  ).length;

  const partes: string[] = [];
  if (urgentes > 0) partes.push(`${urgentes} ${urgentes === 1 ? "avaria urgente" : "avarias urgentes"}`);
  if (vencidas > 0) partes.push(`${vencidas} ${vencidas === 1 ? "revisão obrigatória vencida" : "revisões obrigatórias vencidas"}`);

  if (partes.length === 0) {
    return (
      <p className="text-sm text-muted">
        <span className="font-medium text-success">Nada urgente.</span>{" "}
        {emCurso > 0 ? `${emCurso} ${emCurso === 1 ? "pedido em curso" : "pedidos em curso"}.` : "Tudo em dia."}
      </p>
    );
  }
  return (
    <p className="text-sm font-medium text-danger">
      {partes.join(" e ")} {urgentes + vencidas === 1 ? "precisa" : "precisam"} de si.
    </p>
  );
}

/* ═════════════════ Board de pedidos (kanban ⇄ lista) ═════════════════ */

const COLUNAS: { estado: EstadoPedido; titulo: string; borda: string }[] = [
  { estado: "aberto", titulo: "Aberto", borda: "border-danger" },
  { estado: "agendado", titulo: "Agendado", borda: "border-[#5C7CB3]" },
  { estado: "em_curso", titulo: "Em curso", borda: "border-warning" },
  { estado: "aguarda_pecas", titulo: "Aguarda peças", borda: "border-secondary" },
];

type PeriodoFiltro = "todos" | "30d" | "90d" | "ano";

export function PedidosBoard({ propertyId }: { propertyId?: string }) {
  const navigate = useNavigate();
  const requests = useMaintenanceStore((s) => s.requests);
  const setEstado = useMaintenanceStore((s) => s.setEstado);
  const properties = usePropertiesStore((s) => s.properties);
  const technicians = useTechniciansStore((s) => s.technicians);
  const openMaintenanceForm = useModalStore((s) => s.openMaintenanceForm);

  const [modo, setModo] = useState<"kanban" | "lista">("kanban");
  const [prio, setPrio] = useState<"todas" | Prioridade>("todas");
  const [imovel, setImovel] = useState<string>("todos");
  const [categoria, setCategoria] = useState<"todas" | CategoriaPedido>("todas");
  const [resp, setResp] = useState<"todas" | Responsabilidade>("todas");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("todos");
  const [concluidosAbertos, setConcluidosAbertos] = useState(false);

  const nomeImovel = (id: string) => properties.find((p) => p.id === id)?.name ?? "Imóvel";

  const filtrados = useMemo(() => {
    const limite = (() => {
      const d = new Date();
      if (periodo === "30d") d.setDate(d.getDate() - 30);
      else if (periodo === "90d") d.setDate(d.getDate() - 90);
      else if (periodo === "ano") d.setMonth(0, 1);
      else return null;
      return d.toISOString().slice(0, 10);
    })();
    return requests
      .filter((r) => (propertyId ? r.propertyId === propertyId : true))
      .filter((r) => (imovel === "todos" ? true : r.propertyId === imovel))
      .filter((r) => (prio === "todas" ? true : r.prioridade === prio))
      .filter((r) => (categoria === "todas" ? true : r.categoria === categoria))
      .filter((r) => (resp === "todas" ? true : r.responsabilidade === resp))
      .filter((r) => (limite ? r.createdAt >= limite : true))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [requests, propertyId, imovel, prio, categoria, resp, periodo]);

  const concluidos = filtrados.filter((r) => r.estado === "concluido" || r.estado === "cancelado");

  const selectCls = "h-9 shrink-0 rounded-lg border border-line bg-card px-2 text-sm text-muted outline-none focus:border-secondary";

  const mover = (r: MaintenanceRequest, estado: EstadoPedido) => {
    setEstado(r.id, estado);
    toastSuccess(`Estado atualizado · ${ESTADO_PEDIDO_LABEL[estado]}`);
  };

  return (
    <div className="space-y-4">
      {/* Filtros: chips de prioridade + selects */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {(["todas", "urgente", "alta", "normal", "baixa"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPrio(p)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                prio === p ? "bg-primary text-white" : "border border-line bg-card text-muted hover:bg-accent"
              )}
            >
              {p === "todas" ? "Todas" : PRIORIDADE_LABEL[p]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!propertyId && (
            <select value={imovel} onChange={(e) => setImovel(e.target.value)} className={selectCls} title="Imóvel">
              <option value="todos">Imóvel: todos</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <select value={categoria} onChange={(e) => setCategoria(e.target.value as typeof categoria)} className={selectCls} title="Categoria">
            <option value="todas">Categoria: todas</option>
            {(Object.keys(CATEGORIA_PEDIDO_LABEL) as CategoriaPedido[]).map((c) => (
              <option key={c} value={c}>{CATEGORIA_PEDIDO_LABEL[c]}</option>
            ))}
          </select>
          <select value={resp} onChange={(e) => setResp(e.target.value as typeof resp)} className={selectCls} title="Responsabilidade">
            <option value="todas">Responsabilidade: todas</option>
            <option value="senhorio">Senhorio</option>
            <option value="inquilino">Inquilino</option>
            <option value="partilhada">Partilhada</option>
          </select>
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)} className={selectCls} title="Período">
            <option value="todos">Sempre</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="ano">Este ano</option>
          </select>
          <div className="inline-flex rounded-full border border-line bg-card p-1 shadow-sm">
            <button
              onClick={() => setModo("kanban")}
              className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors", modo === "kanban" ? "bg-primary text-white" : "text-muted hover:text-ink")}
            >
              <KanbanSquare size={14} /> Kanban
            </button>
            <button
              onClick={() => setModo("lista")}
              className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors", modo === "lista" ? "bg-primary text-white" : "text-muted hover:text-ink")}
            >
              <LayoutList size={14} /> Lista
            </button>
          </div>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <Wrench size={28} className="mx-auto mb-2" />
            <p className="text-sm">Sem pedidos de manutenção{propertyId ? " neste imóvel" : ""} para estes filtros.</p>
            <Button
              size="sm"
              variant="gold"
              className="mt-3"
              onClick={() => openMaintenanceForm({ initialPropertyId: propertyId ?? null, lockProperty: !!propertyId })}
            >
              <Plus size={14} /> Novo pedido
            </Button>
          </CardContent>
        </Card>
      ) : modo === "kanban" ? (
        <>
          {/* Kanban — 4 colunas; mobile: swipe horizontal */}
          <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
            {COLUNAS.map((col) => {
              const items = filtrados.filter((r) => r.estado === col.estado);
              return (
                <div key={col.estado} className={cn("w-[300px] shrink-0 snap-start rounded-2xl border-t-4 bg-bg/50 p-3 lg:w-auto", col.borda)}>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {col.titulo} · {items.length}
                  </p>
                  <div className="space-y-2">
                    {items.map((r) => (
                      <PedidoCard key={r.id} r={r} nomeImovel={nomeImovel} technicians={technicians} escondeImovel={!!propertyId} onMover={mover} />
                    ))}
                    {items.length === 0 && <p className="py-4 text-center text-xs text-muted">Nenhum item</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Concluídos — colapsável no fim */}
          {concluidos.length > 0 && (
            <div>
              <button
                onClick={() => setConcluidosAbertos((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
              >
                <ChevronDown size={15} className={cn("transition-transform", concluidosAbertos && "rotate-180")} />
                Concluídos e cancelados ({concluidos.length})
              </button>
              {concluidosAbertos && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
                  {concluidos.map((r) => (
                    <PedidoCard key={r.id} r={r} nomeImovel={nomeImovel} technicians={technicians} escondeImovel={!!propertyId} onMover={mover} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Lista */
        <div className="space-y-2">
          {filtrados.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/manutencao/${r.id}`)}
              className={cn(
                "flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line border-l-4 bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-bg",
                PRIORIDADE_BORDA[r.prioridade]
              )}
            >
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", ESTADO_TONE[r.estado])}>{ESTADO_PEDIDO_LABEL[r.estado]}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{r.titulo}</span>
              {!propertyId && <span className="text-xs text-muted">{nomeImovel(r.propertyId)}</span>}
              <span className="text-xs text-muted">{CATEGORIA_PEDIDO_LABEL[r.categoria]}</span>
              <RespBadge resp={r.responsabilidade} />
              <span className="num text-xs font-semibold text-ink">{r.custoFinal ? eur(r.custoFinal) : r.custoEstimado ? `~${eur(r.custoEstimado)}` : "—"}</span>
              <span className="num text-[11px] text-muted">há {diasDesdeCriacao(r)}d</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═════════════════ Card de pedido ═════════════════ */

function PedidoCard({
  r,
  nomeImovel,
  technicians,
  escondeImovel,
  onMover,
}: {
  r: MaintenanceRequest;
  nomeImovel: (id: string) => string;
  technicians: ReturnType<typeof useTechniciansStore.getState>["technicians"];
  escondeImovel: boolean;
  onMover: (r: MaintenanceRequest, estado: EstadoPedido) => void;
}) {
  const navigate = useNavigate();
  const Icon = CATEGORIA_PEDIDO_ICON[r.categoria];
  const tec = technicians.find((t) => t.id === r.tecnicoId);
  const nomeTec = tec?.nome ?? r.tecnicoNome;
  const foto = r.fotosAntes[0] ?? r.fotosDepois[0];
  const dias = diasDesdeCriacao(r);
  const fechado = r.estado === "concluido" || r.estado === "cancelado";

  return (
    <div
      onClick={() => navigate(`/manutencao/${r.id}`)}
      className={cn(
        "cursor-pointer rounded-xl border border-line border-l-4 bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        PRIORIDADE_BORDA[r.prioridade]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", PRIORIDADE_TONE[r.prioridade])}>
              {PRIORIDADE_LABEL[r.prioridade]}
            </span>
            <RespBadge resp={r.responsabilidade} />
          </div>
          <p className="mt-1.5 text-sm font-medium leading-snug text-ink">{r.titulo}</p>
          {!escondeImovel && (
            <Link
              to={`/imoveis/${r.propertyId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-secondary hover:underline"
            >
              {nomeImovel(r.propertyId)}
            </Link>
          )}
        </div>
        {foto && (
          <img src={foto} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover" loading="lazy" />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5">
          <Icon size={11} /> {CATEGORIA_PEDIDO_LABEL[r.categoria]}
        </span>
        {nomeTec && (
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[9px] font-semibold text-white">
              {nomeTec.split(" ").map((x) => x[0]).join("").slice(0, 2)}
            </span>
            {nomeTec}
          </span>
        )}
        {(r.custoFinal ?? r.custoEstimado) != null && (
          <span className="num font-semibold text-ink">
            {r.custoFinal ? eur(r.custoFinal) : `~${eur(r.custoEstimado!)}`}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line/60 pt-2 text-[11px]">
        <span className="text-muted">
          há {dias} {dias === 1 ? "dia" : "dias"} · <span className="text-ink">{proximoPasso(r)}</span>
        </span>
        {!fechado && (
          <select
            value={r.estado}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onMover(r, e.target.value as EstadoPedido)}
            className="h-6 rounded-md border border-line bg-card px-1 text-[10px] text-muted outline-none"
            title="Mover para…"
          >
            {(Object.keys(ESTADO_PEDIDO_LABEL) as EstadoPedido[]).map((e) => (
              <option key={e} value={e}>{ESTADO_PEDIDO_LABEL[e]}</option>
            ))}
          </select>
        )}
      </div>

      {sugereConversaoEmObra(r) && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-gold/10 px-2 py-1.5 text-[11px] font-medium text-gold-dark">
          <Hammer size={12} /> Sugerido: converter em obra
        </p>
      )}
      {r.convertidoEmObraId && (
        <Link
          to={`/obra/${r.convertidoEmObraId}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-accent px-2 py-1.5 text-[11px] font-medium text-secondary hover:underline"
        >
          <Hammer size={12} /> Convertido em obra →
        </Link>
      )}
    </div>
  );
}
