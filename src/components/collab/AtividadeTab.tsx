import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users2,
  Wallet,
  Hammer,
  FileText,
  FileSignature,
  MessageCircle,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Home,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useProfilesStore } from "@/store/useProfilesStore";
import { useTenantsStore } from "@/store/useTenantsStore";
import { useContractsStore } from "@/store/useContractsStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import { useObrasStore, estadoProvaDe, relativaTempo } from "@/store/useObrasStore";
import { useDecisionsStore } from "@/store/useDecisionsStore";
import { podeGerir, type CollabProject } from "@/store/useCollabStore";
import { RoleAvatar, nomeProprio } from "@/components/obras/CoGestao";
import { eur, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

type EventoTipo = "socios" | "arrendamento" | "financas" | "obras" | "decisoes" | "documentos";

interface Evento {
  id: string;
  ts: string; // ISO
  tipo: EventoTipo;
  actorId?: string;
  actorNome?: string;
  texto: string;
  detalhe?: string;
  link?: string;
  selo?: "comprovada" | "por_comprovar";
  icon: LucideIcon;
  tone: string;
}

const FILTROS: { key: "tudo" | EventoTipo; label: string }[] = [
  { key: "tudo", label: "Tudo" },
  { key: "socios", label: "Sócios" },
  { key: "decisoes", label: "Decisões" },
  { key: "obras", label: "Obras" },
  { key: "financas", label: "Finanças" },
  { key: "arrendamento", label: "Arrendamento" },
  { key: "documentos", label: "Documentos" },
];

const isoDe = (dataOuIso: string): string =>
  dataOuIso.includes("T") ? dataOuIso : `${dataOuIso}T12:00:00.000Z`;

export function AtividadeTab({ project: p }: { project: CollabProject }) {
  const profiles = useProfilesStore((s) => s.profiles);
  const tenants = useTenantsStore((s) => s.tenants);
  const contracts = useContractsStore((s) => s.contracts);
  const txs = useTransactionsStore((s) => s.transactions);
  const docs = useDocumentsStore((s) => s.documents);
  const obras = useObrasStore((s) => s.obras);
  const despesasObra = useObrasStore((s) => s.despesas);
  const decisoes = useDecisionsStore((s) => s.decisoes);

  const [filtro, setFiltro] = useState<"tudo" | EventoTipo>("tudo");

  const gestorId = p.partners.find((s) => s.role === "gestor")?.id ?? p.partners[0]?.id;
  const nomeSocio = (id?: string) =>
    profiles.find((x) => x.id === id)?.fullName ?? p.partners.find((s) => s.id === id)?.name;

  const eventos = useMemo<Evento[]>(() => {
    const out: Evento[] = [];
    const pid = p.propertyId;
    const obrasDoProjeto = obras.filter((o) => o.projectId === p.id || (pid && o.propertyId === pid));
    const obraIds = new Set(obrasDoProjeto.map((o) => o.id));

    // Sócios
    p.partners.forEach((s) => {
      if (!s.convidadoEm) return;
      out.push({
        id: `sc-${s.id}`,
        ts: isoDe(s.convidadoEm),
        tipo: "socios",
        actorId: s.id,
        actorNome: s.name,
        texto: s.status === "pendente" ? `${nomeProprio(s.name)} foi convidado para o projeto` : `${nomeProprio(s.name)} juntou-se ao projeto`,
        detalhe: `${s.pct}% · ${s.role === "gestor" ? "Gestor" : s.role === "observador" ? "Observador" : "Investidor"}`,
        icon: Users2,
        tone: "bg-gold/15 text-gold-dark",
      });
    });

    if (pid) {
      // Inquilinos
      tenants.filter((t) => t.propertyId === pid).forEach((t) => {
        out.push({
          id: `tn-${t.id}`,
          ts: t.createdAt,
          tipo: "arrendamento",
          actorId: gestorId,
          texto: `associou o inquilino ${t.nomeCompleto}`,
          detalhe: t.rendaMensal ? `${eur(t.rendaMensal)}/mês` : undefined,
          link: `/pessoas/inquilinos/${t.id}`,
          icon: Home,
          tone: "bg-secondary/12 text-secondary",
        });
      });

      // Contratos
      contracts.filter((c) => c.propertyId === pid).forEach((c) => {
        out.push({
          id: `ct-${c.id}`,
          ts: c.createdAt,
          tipo: "arrendamento",
          actorId: gestorId,
          texto: `carregou o contrato ${c.fileName ?? ""}`.trim(),
          detalhe: c.monthlyRent ? `${eur(c.monthlyRent)}/mês` : undefined,
          link: `/contratos/${c.id}`,
          icon: FileSignature,
          tone: "bg-secondary/12 text-secondary",
        });
      });

      // Finanças (rendas recebidas + despesas)
      txs.filter((t) => t.propertyId === pid).forEach((t) => {
        const renda = t.tipo === "receita" && t.categoria === "Renda";
        out.push({
          id: `tx-${t.id}`,
          ts: isoDe(t.data),
          tipo: "financas",
          actorId: gestorId,
          texto: renda
            ? `renda recebida · ${eur(t.valor)}`
            : t.tipo === "receita"
              ? `receita registada · ${eur(t.valor)}`
              : `despesa registada · ${eur(t.valor)} (${t.categoria})`,
          detalhe: t.descricao,
          icon: Wallet,
          tone: renda ? "bg-success/12 text-success" : "bg-danger/10 text-danger",
        });
      });
    }

    // Obras
    obrasDoProjeto.forEach((o) => {
      out.push({
        id: `ob-${o.id}`,
        ts: isoDe(o.createdAt),
        tipo: "obras",
        actorId: gestorId,
        texto: `criou a obra «${o.titulo}»`,
        detalhe: eur(o.orcamento),
        link: `/obra/${o.id}`,
        icon: Hammer,
        tone: "bg-warning/12 text-warning",
      });
      if (o.estado === "concluida" && o.dataFimReal) {
        out.push({
          id: `ob-fim-${o.id}`,
          ts: isoDe(o.dataFimReal),
          tipo: "obras",
          actorId: gestorId,
          texto: `obra concluída: «${o.titulo}»`,
          link: `/obra/${o.id}`,
          icon: CheckCircle2,
          tone: "bg-success/12 text-success",
        });
      }
    });

    // Despesas de obra (com selo de prova)
    despesasObra.filter((d) => obraIds.has(d.obraId)).forEach((d) => {
      const obra = obrasDoProjeto.find((o) => o.id === d.obraId);
      out.push({
        id: `dp-${d.id}`,
        ts: d.registadoEm ?? isoDe(d.data),
        tipo: "obras",
        actorId: d.registadoPor ?? gestorId,
        texto: `registou a despesa «${d.descricao}» · ${eur(d.valor)}`,
        detalhe: obra ? `Obra: ${obra.titulo}` : undefined,
        link: `/obra/${d.obraId}`,
        selo: estadoProvaDe(d),
        icon: Wallet,
        tone: "bg-warning/12 text-warning",
      });
    });

    // Decisões
    decisoes.filter((d) => d.projectId === p.id).forEach((d) => {
      out.push({
        id: `dc-${d.id}`,
        ts: d.createdAt,
        tipo: "decisoes",
        actorId: d.proposedBy,
        texto: `propôs a decisão «${d.titulo}»`,
        detalhe: d.valor ? eur(d.valor) : undefined,
        icon: MessageCircle,
        tone: "bg-gold/15 text-gold-dark",
      });
      d.votos.forEach((v) => {
        out.push({
          id: `dv-${d.id}-${v.userId}`,
          ts: v.ts,
          tipo: "decisoes",
          actorId: v.userId,
          texto: `votou ${v.valor === "a_favor" ? "a favor" : v.valor === "contra" ? "contra" : "abstenção"} em «${d.titulo}»`,
          icon: v.valor === "contra" ? ThumbsDown : ThumbsUp,
          tone: v.valor === "contra" ? "bg-danger/10 text-danger" : "bg-success/12 text-success",
        });
      });
      if (d.fechadaEm && d.estado !== "pendente") {
        out.push({
          id: `df-${d.id}`,
          ts: d.fechadaEm,
          tipo: "decisoes",
          actorId: d.proposedBy,
          texto: `decisão ${d.estado === "aprovada" ? "aprovada" : "rejeitada"}: «${d.titulo}»`,
          icon: d.estado === "aprovada" ? CheckCircle2 : XCircle,
          tone: d.estado === "aprovada" ? "bg-success/12 text-success" : "bg-danger/10 text-danger",
        });
      }
    });

    // Documentos
    docs
      .filter((doc) => !doc.deletedAt && ((pid && doc.propertyId === pid) || doc.projectId === p.id))
      .forEach((doc) => {
        out.push({
          id: `doc-${doc.id}`,
          ts: isoDe(doc.uploadedAt),
          tipo: "documentos",
          actorId: doc.uploadedBy ?? gestorId,
          texto: `carregou o documento «${doc.nome}»`,
          detalhe: doc.categoria,
          icon: FileText,
          tone: "bg-accent text-secondary",
        });
      });

    return out.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  }, [p, tenants, contracts, txs, docs, obras, despesasObra, decisoes, gestorId]);

  const filtrados = filtro === "tudo" ? eventos : eventos.filter((e) => e.tipo === filtro);

  // Agrupar por dia
  const grupos = useMemo(() => {
    const map = new Map<string, Evento[]>();
    filtrados.forEach((e) => {
      const dia = e.ts.slice(0, 10);
      if (!map.has(dia)) map.set(dia, []);
      map.get(dia)!.push(e);
    });
    return [...map.entries()];
  }, [filtrados]);

  const hoje = new Date().toISOString().slice(0, 10);
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const labelDia = (d: string) => (d === hoje ? "Hoje" : d === ontem ? "Ontem" : dataPT(d));

  return (
    <div className="mt-5 space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filtro === f.key ? "border-gold bg-gold text-sidebar" : "border-line bg-card text-muted hover:text-ink"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {grupos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <MessageCircle size={28} className="mx-auto mb-2" />
            <p className="text-sm">Sem atividade {filtro !== "tudo" ? "neste filtro" : "neste projeto"}.</p>
          </CardContent>
        </Card>
      ) : (
        grupos.map(([dia, evts]) => (
          <div key={dia}>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {labelDia(dia)}
            </p>
            <Card>
              <CardContent className="divide-y divide-line/50 p-0">
                {evts.map((e) => {
                  const prof = profiles.find((x) => x.id === e.actorId);
                  const nome = e.actorNome ?? nomeSocio(e.actorId) ?? "Sócio";
                  const Icon = e.icon;
                  const inner = (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <RoleAvatar profile={prof} size="sm" title={nome} />
                      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", e.tone)}>
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug text-ink">
                          <span className="font-medium">{nomeProprio(nome)}</span>{" "}
                          {e.texto.startsWith(nomeProprio(nome)) ? e.texto.slice(nomeProprio(nome).length).trim() : e.texto}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                          {relativaTempo(e.ts)}
                          {e.detalhe && <>· {e.detalhe}</>}
                          {e.selo === "comprovada" && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-success/12 px-1.5 py-0.5 font-medium text-success"><ShieldCheck size={10} /> Comprovada</span>
                          )}
                          {e.selo === "por_comprovar" && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-warning/12 px-1.5 py-0.5 font-medium text-warning"><TriangleAlert size={10} /> Por comprovar</span>
                          )}
                          {e.link && <span className="text-secondary">ver →</span>}
                        </p>
                      </div>
                    </div>
                  );
                  return e.link ? (
                    <Link key={e.id} to={e.link} className="block transition-colors hover:bg-bg/60">{inner}</Link>
                  ) : (
                    <div key={e.id}>{inner}</div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
