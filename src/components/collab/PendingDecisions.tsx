import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, BellRing, Vote, CheckCircle2, Clock, X, Banknote } from "lucide-react";
import {
  useObrasStore,
  investidoresDe,
  membrosDe,
  type Obra,
  type Aprovacao,
} from "@/store/useObrasStore";
import {
  useDecisionsStore,
  resumoVotos,
  type Decisao,
} from "@/store/useDecisionsStore";
import {
  roleNoProjeto,
  gestorDoProjeto,
  type CollabProject,
} from "@/store/useCollabStore";
import { useNotificationsStore } from "@/store/useNotificationsStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { useModalStore } from "@/store/useModalStore";
import { nomeProprio } from "@/components/obras/CoGestao";
import { sociosIds } from "./shared";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ═════════════════ Modelo agregado (despesas + marcos + decisões pendentes) ═════════════════
   Uma só fonte de verdade: os votos vivem no useObrasStore (gastos/marcos) e no
   useDecisionsStore (decisões do projeto). Aqui apenas se agregam e se vota nos mesmos stores. */

type VotoSimples = "a_favor" | "contra";

export interface ItemPendente {
  kind: "despesa" | "marco" | "decisao";
  id: string;
  project: CollabProject;
  titulo: string;
  /** "1.500 € · Pintura completa · proposto por Pedro" */
  contexto: string;
  link: string;
  /** Quem deve votar + o voto atual de cada um. */
  votantes: { userId: string; nome: string; voto?: "a_favor" | "contra" | "abstencao" }[];
  favor: number;
  contra: number;
  faltamLabel: string;
  obra?: Obra;
}

function votosNecessarios(obra: Obra): number {
  const n = investidoresDe(obra).length;
  return (obra.regraVotacao ?? "maioria_simples") === "unanimidade" ? n : Math.floor(n / 2) + 1;
}

/** Agrega tudo o que está a aguardar votos nos projetos dados. */
export function usePendentes(projects: CollabProject[]): {
  paraMim: ItemPendente[];
  submetidos: ItemPendente[];
  marcosAprovados: { marco: { id: string; titulo: string; valor: number }; obra: Obra; project: CollabProject }[];
} {
  const obras = useObrasStore((s) => s.obras);
  const despesas = useObrasStore((s) => s.despesas);
  const marcos = useObrasStore((s) => s.marcos);
  const decisoes = useDecisionsStore((s) => s.decisoes);
  const profiles = useProfilesStore((s) => s.profiles);

  return useMemo(() => {
    const nomeDe = (id: string) =>
      nomeProprio(profiles.find((p) => p.id === id)?.fullName) ||
      nomeProprio(projects.flatMap((p) => p.partners).find((s) => s.id === id)?.name) ||
      "Sócio";

    const itens: ItemPendente[] = [];
    const marcosAprovados: { marco: { id: string; titulo: string; valor: number }; obra: Obra; project: CollabProject }[] = [];

    projects.forEach((project) => {
      const obrasProj = obras.filter((o) => o.projectId === project.id);

      const pushObraItem = (
        kind: "despesa" | "marco",
        id: string,
        obra: Obra,
        titulo: string,
        valor: number,
        ap: Aprovacao
      ) => {
        const investidores = investidoresDe(obra);
        const votantes = investidores.map((m) => ({
          userId: m.userId,
          nome: nomeDe(m.userId),
          voto: ap.votos.find((v) => v.userId === m.userId)?.valor,
        }));
        const favor = ap.votos.filter((v) => v.valor === "a_favor").length;
        const contra = ap.votos.filter((v) => v.valor === "contra").length;
        const faltam = Math.max(0, votosNecessarios(obra) - favor);
        itens.push({
          kind,
          id,
          project,
          obra,
          titulo,
          contexto: `${eur(valor)} · ${obra.titulo} · proposto por ${nomeDe(ap.requeridoPor)}`,
          link: `/obra/${obra.id}`,
          votantes,
          favor,
          contra,
          faltamLabel: faltam > 0 ? `falta ${faltam} ${faltam === 1 ? "voto" : "votos"} para maioria` : "maioria atingida",
        });
      };

      obrasProj.forEach((obra) => {
        despesas
          .filter((d) => d.obraId === obra.id && d.aprovacao?.estado === "pendente")
          .forEach((d) => pushObraItem("despesa", d.id, obra, `Gasto extra «${d.descricao}»`, d.valor, d.aprovacao!));
        marcos
          .filter((m) => m.obraId === obra.id && m.aprovacao?.estado === "pendente")
          .forEach((m) => pushObraItem("marco", m.id, obra, `Pagamento «${m.titulo}»`, m.valor, m.aprovacao!));
        // Aprovados mas ainda por pagar → o gestor pode APLICAR (pagar)
        marcos
          .filter((m) => m.obraId === obra.id && m.aprovacao?.estado === "aplicado" && m.estado !== "pago")
          .forEach((m) => marcosAprovados.push({ marco: { id: m.id, titulo: m.titulo, valor: m.valor }, obra, project }));
      });

      // Decisões do projeto (sistema project_decisions/decision_votes)
      decisoes
        .filter((d) => d.projectId === project.id && d.estado === "pendente")
        .forEach((d) => {
          const socios = project.partners.filter(
            (s) => (s.status ?? "ativo") === "ativo" && (s.role ?? "investidor") !== "observador"
          );
          const votantes = socios.map((s) => ({
            userId: s.id,
            nome: nomeDe(s.id),
            voto: d.votos.find((v) => v.userId === s.id)?.valor,
          }));
          const r = resumoVotos(d, project.partners);
          itens.push({
            kind: "decisao",
            id: d.id,
            project,
            titulo: `Decisão «${d.titulo}»`,
            contexto: `${d.valor ? `${eur(d.valor)} · ` : ""}proposta por ${nomeDe(d.proposedBy)}`,
            link: `/comunidade/colaborativa/${project.id}`,
            votantes,
            favor: d.votos.filter((v) => v.valor === "a_favor").length,
            contra: d.votos.filter((v) => v.valor === "contra").length,
            faltamLabel: r.atingido
              ? "maioria atingida"
              : `${Math.round(r.pesoFavor)}% a favor · maioria simples (>50% do capital)`,
          });
        });
    });

    const paraMim = itens.filter((it) => {
      const eu = it.votantes.find((v) => v.userId === CURRENT_USER_ID);
      return !!eu && !eu.voto;
    });
    const submetidos = itens.filter((it) => roleNoProjeto(it.project, CURRENT_USER_ID) === "gestor");
    const marcosDoGestor = marcosAprovados.filter(
      (x) => roleNoProjeto(x.project, CURRENT_USER_ID) === "gestor"
    );

    return { paraMim, submetidos, marcosAprovados: marcosDoGestor };
  }, [projects, obras, despesas, marcos, decisoes, profiles]);
}

/* ═════════════════ Votar (liga aos stores existentes + notifica) ═════════════════ */

function useVotar() {
  const votarObra = useObrasStore((s) => s.votar);
  const votarDecisao = useDecisionsStore((s) => s.votar);
  const addNotif = useNotificationsStore((s) => s.add);
  const broadcast = useNotificationsStore((s) => s.broadcast);
  const profiles = useProfilesStore((s) => s.profiles);

  return (item: ItemPendente, valor: VotoSimples) => {
    const meuNome = nomeProprio(profiles.find((p) => p.id === CURRENT_USER_ID)?.fullName) || "Sócio";
    const labelVoto = valor === "a_favor" ? "a favor" : "contra";

    if (item.kind === "decisao") {
      const estado = votarDecisao(item.id, CURRENT_USER_ID, valor, item.project.partners);
      broadcast(sociosIds(item.project, CURRENT_USER_ID), {
        tipo: estado === "pendente" ? "decisao_voto" : "decisao_fechada",
        titulo:
          estado === "pendente"
            ? `${meuNome} votou ${labelVoto} em ${item.titulo}`
            : `Decisão ${estado === "aprovada" ? "aprovada" : "rejeitada"}: ${item.titulo}`,
        actorId: CURRENT_USER_ID,
        link: item.link,
      });
      if (estado === "aprovada") toast.success("Maioria atingida — decisão aprovada");
      else if (estado === "rejeitada") toast("Decisão rejeitada");
      else toast.success("Voto registado ✓");
      return;
    }

    const estado = votarObra(item.kind, item.id, CURRENT_USER_ID, valor);
    const obra = item.obra!;
    const gestorId = membrosDe(obra).find((m) => m.role === "gestor")?.userId;
    if (estado === "pendente") {
      if (gestorId && gestorId !== CURRENT_USER_ID)
        addNotif({
          userId: gestorId,
          tipo: "decisao_voto",
          titulo: `${meuNome} votou ${labelVoto} em ${item.titulo}`,
          descricao: `${obra.titulo} · ${item.project.title}`,
          actorId: CURRENT_USER_ID,
          link: item.link,
        });
      toast.success("Voto registado ✓", { description: "O gestor foi notificado." });
    } else {
      broadcast(
        membrosDe(obra).map((m) => m.userId).filter((id) => id !== CURRENT_USER_ID),
        {
          tipo: "decisao_fechada",
          titulo:
            estado === "aplicado"
              ? `Aprovado: ${item.titulo} — o gestor pode aplicar`
              : `Rejeitado: ${item.titulo}`,
          descricao: `${obra.titulo} · ${item.project.title}`,
          actorId: CURRENT_USER_ID,
          link: item.link,
        }
      );
      if (estado === "aplicado") toast.success("Maioria atingida — aprovado ✓", { description: "Sócios notificados." });
      else toast("Rejeitado", { description: "Os sócios foram notificados." });
    }
  };
}

/* ═════════════════ BLOCO — A AGUARDAR A TUA DECISÃO (investidor) ═════════════════ */

export function BlocoAguardarDecisao({
  projects,
  onVerDecisao,
}: {
  projects: CollabProject[];
  onVerDecisao?: (projectId: string) => void;
}) {
  const { paraMim } = usePendentes(projects);
  const votar = useVotar();

  if (paraMim.length === 0) return null;

  return (
    <div className="animate-fade-in rounded-2xl border-2 border-gold/50 bg-accent p-4 shadow-sm">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gold-dark">
        <Vote size={14} /> A aguardar a tua decisão ({paraMim.length})
      </p>
      <div className="mt-3 space-y-2.5">
        {paraMim.map((it) => (
          <div
            key={`${it.kind}-${it.id}`}
            className="flex flex-col gap-2 rounded-xl border border-line bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{it.titulo}</p>
              <p className="num mt-0.5 text-[11px] text-muted">{it.contexto}</p>
              <p className="num mt-0.5 text-[11px] text-muted">
                Votos até agora: <span className="font-semibold text-success">{it.favor} a favor</span> ·{" "}
                <span className={cn("font-semibold", it.contra > 0 ? "text-danger" : "text-muted")}>{it.contra} contra</span> ·{" "}
                <span className="font-semibold text-warning">falta o teu voto</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => votar(it, "a_favor")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-success/40 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/10"
              >
                <ThumbsUp size={13} /> A favor
              </button>
              <button
                onClick={() => votar(it, "contra")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
              >
                <ThumbsDown size={13} /> Contra
              </button>
              {it.kind === "decisao" && onVerDecisao ? (
                <button
                  onClick={() => onVerDecisao(it.project.id)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:bg-bg hover:text-ink"
                >
                  Ver detalhe
                </button>
              ) : (
                <Link
                  to={it.link}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:bg-bg hover:text-ink"
                >
                  Ver detalhe
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════ BLOCO — A PEDIR AOS SÓCIOS (gestor) ═════════════════ */

export function BlocoPedirAosSocios({
  projects,
  onVerDecisao,
}: {
  projects: CollabProject[];
  onVerDecisao?: (projectId: string) => void;
}) {
  const { submetidos, marcosAprovados } = usePendentes(projects);
  const addNotif = useNotificationsStore((s) => s.add);
  const openMarcoPay = useModalStore((s) => s.openMarcoPay);
  const [lembrados, setLembrados] = useState<Set<string>>(new Set());

  const total = submetidos.length + marcosAprovados.length;
  if (total === 0) return null;

  const lembrar = (it: ItemPendente) => {
    const pendentes = it.votantes.filter((v) => !v.voto && v.userId !== CURRENT_USER_ID);
    pendentes.forEach((v) =>
      addNotif({
        userId: v.userId,
        tipo: "decisao_criada",
        titulo: `Lembrete: ${it.titulo} aguarda o teu voto`,
        descricao: it.contexto,
        actorId: CURRENT_USER_ID,
        link: it.link,
      })
    );
    setLembrados((s) => new Set(s).add(`${it.kind}-${it.id}`));
    toast.success(`Lembrete enviado ✓`, {
      description: pendentes.map((v) => v.nome).join(", ") || "Sem sócios por votar.",
    });
  };

  return (
    <div className="animate-fade-in rounded-2xl border border-line bg-card p-4 shadow-sm">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-secondary">
        <Clock size={14} /> A pedir aos sócios ({total})
      </p>
      <div className="mt-3 space-y-2.5">
        {submetidos.map((it) => {
          const key = `${it.kind}-${it.id}`;
          return (
            <div key={key} className="rounded-xl border border-warning/30 bg-warning/5 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {it.titulo} <span className="text-[11px] font-normal text-warning">· a aguardar votos</span>
                  </p>
                  <p className="num mt-0.5 text-[11px] text-muted">{it.contexto}</p>
                  {/* Estado voto-a-voto */}
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    {it.votantes.map((v) => (
                      <span
                        key={v.userId}
                        className={cn(
                          "inline-flex items-center gap-1",
                          v.voto === "a_favor" ? "text-success" : v.voto === "contra" ? "text-danger" : "text-muted"
                        )}
                      >
                        {v.voto === "a_favor" ? <CheckCircle2 size={12} /> : v.voto === "contra" ? <X size={12} /> : <Clock size={12} />}
                        {v.nome} {v.voto === "a_favor" ? "a favor" : v.voto === "contra" ? "contra" : "pendente"}
                      </span>
                    ))}
                    <span className="text-muted">({it.faltamLabel})</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {it.kind === "decisao" && onVerDecisao ? (
                    <button
                      onClick={() => onVerDecisao(it.project.id)}
                      className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-muted transition-colors hover:bg-bg hover:text-ink"
                    >
                      Ver
                    </button>
                  ) : (
                    <Link
                      to={it.link}
                      className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-muted transition-colors hover:bg-bg hover:text-ink"
                    >
                      Ver
                    </Link>
                  )}
                  <button
                    onClick={() => lembrar(it)}
                    disabled={lembrados.has(key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      lembrados.has(key)
                        ? "border-line text-muted opacity-60"
                        : "border-gold/40 text-gold-dark hover:bg-gold/10"
                    )}
                  >
                    <BellRing size={13} /> {lembrados.has(key) ? "Lembrete enviado" : "Lembrar sócios"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Aprovados → o gestor aplica (pagar o marco) */}
        {marcosAprovados.map(({ marco, obra }) => (
          <div
            key={marco.id}
            className="flex flex-col gap-2 rounded-xl border border-success/30 bg-success/5 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                Pagamento «{marco.titulo}» <span className="text-[11px] font-normal text-success">· aprovado pelos sócios</span>
              </p>
              <p className="num mt-0.5 text-[11px] text-muted">{eur(marco.valor)} · {obra.titulo}</p>
            </div>
            <button
              onClick={() => openMarcoPay(marco.id)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-success/90"
            >
              <Banknote size={13} /> Aplicar (pagar)
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════ Badge de papel — "Tu: Gestor" / "Tu: Sócio investidor" ═════════════════ */

export function BadgePapel({ project }: { project: CollabProject }) {
  const role = roleNoProjeto(project, CURRENT_USER_ID);
  if (!role) return null;
  const cls =
    role === "gestor"
      ? "bg-gold/20 text-gold-dark border-gold/40"
      : role === "investidor"
        ? "bg-primary/10 text-primary border-primary/30"
        : "bg-accent text-muted border-line";
  const label = role === "gestor" ? "Tu: Gestor" : role === "investidor" ? "Tu: Sócio investidor" : "Tu: Observador";
  const gestor = gestorDoProjeto(project);
  const title =
    role === "gestor"
      ? "Executas as ações operacionais; acima do threshold, os sócios votam."
      : role === "investidor"
        ? `Vês tudo, comentas e votas. Só o gestor${gestor ? ` (${nomeProprio(gestor.name)})` : ""} executa.`
        : "Acesso só de leitura.";
  return (
    <span title={title} className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", cls)}>
      {label}
    </span>
  );
}
