import { useMemo, useState } from "react";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import {
  UserPlus,
  X,
  Pencil,
  Trash2,
  Send,
  Users2,
  BadgeCheck,
  Network,
  Check,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ChartCard } from "@/components/ui/chart-card";
import {
  useCollabStore,
  podeGerir,
  somaPercentagens,
  SOCIO_COLORS,
  SOCIO_ROLE_LABEL,
  type CollabProject,
  type Partner,
  type SocioRole,
} from "@/store/useCollabStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useDecisionsStore } from "@/store/useDecisionsStore";
import { useNotificationsStore } from "@/store/useNotificationsStore";
import { RoleAvatar, nomeProprio } from "@/components/obras/CoGestao";
import { relativaTempo } from "@/store/useObrasStore";
import { CollabSH, sociosIds, inputCls } from "./shared";
import { eur, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const ROLE_RING_CLS: Record<SocioRole, string> = {
  gestor: "ring-gold",
  investidor: "ring-primary",
  observador: "ring-line",
};

export function SociosTab({ project: p }: { project: CollabProject }) {
  const update = useCollabStore((s) => s.update);
  const profiles = useProfilesStore((s) => s.profiles);
  const txs = useTransactionsStore((s) => s.transactions);
  const decisoes = useDecisionsStore((s) => s.decisoes.filter((d) => d.projectId === p.id));
  const notify = useNotificationsStore((s) => s.add);

  const gestor = podeGerir(p, CURRENT_USER_ID);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [redeOpen, setRedeOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);

  const ativos = p.partners.filter((s) => (s.status ?? "ativo") === "ativo");
  const pendentes = p.partners.filter((s) => s.status === "pendente");

  // Resultado acumulado do imóvel (receitas − despesas) para a quota-parte.
  const resultado = useMemo(() => {
    if (!p.propertyId) return 0;
    return txs
      .filter((t) => t.propertyId === p.propertyId)
      .reduce((acc, t) => acc + (t.tipo === "receita" ? t.valor : -t.valor), 0);
  }, [txs, p.propertyId]);

  // Última atividade por sócio: voto/comentário mais recente nas decisões do projeto (fallback: convite).
  const ultimaAtividade = (userId: string): string | undefined => {
    let last: string | undefined;
    decisoes.forEach((d) => {
      d.votos.forEach((v) => { if (v.userId === userId && (!last || v.ts > last)) last = v.ts; });
      d.comentarios.forEach((c) => { if (c.userId === userId && (!last || c.ts > last)) last = c.ts; });
      if (d.proposedBy === userId && (!last || d.createdAt > last)) last = d.createdAt;
    });
    const socio = p.partners.find((s) => s.id === userId);
    if (!last && socio?.convidadoEm) last = `${socio.convidadoEm}T09:00:00.000Z`;
    return last;
  };

  const setPartners = (partners: Partner[]) => update(p.id, { partners });

  // ── Remover com reequilíbrio proporcional ──
  const remover = (socio: Partner) => {
    if (socio.role === "gestor") { toastError("O gestor não pode ser removido."); return; }
    if (!confirm(`Remover ${socio.name} do projeto?`)) return;
    if (!confirm(`Confirma? A percentagem de ${socio.pct}% será redistribuída pelos restantes sócios.`)) return;
    const restantes = p.partners.filter((s) => s.id !== socio.id);
    const somaAtiva = restantes.filter((s) => (s.status ?? "ativo") === "ativo").reduce((a, s) => a + s.pct, 0);
    let rebalanced = restantes.map((s) =>
      (s.status ?? "ativo") === "ativo" && somaAtiva > 0
        ? { ...s, pct: Math.round((s.pct / somaAtiva) * 100) }
        : s
    );
    // corrige arredondamentos para somar 100
    const drift = 100 - somaPercentagens(rebalanced);
    if (drift !== 0) {
      const first = rebalanced.find((s) => (s.status ?? "ativo") === "ativo");
      if (first) rebalanced = rebalanced.map((s) => (s.id === first.id ? { ...s, pct: s.pct + drift } : s));
    }
    setPartners(rebalanced);
    notify({ userId: socio.id, tipo: "geral", titulo: `Foi removido do projeto «${p.title}»`, actorId: CURRENT_USER_ID, link: "/comunidade/colaborativa" });
    toastSuccess(`${nomeProprio(socio.name)} removido · percentagens reequilibradas`);
  };

  const reenviar = (socio: Partner) => {
    notify({ userId: socio.id, tipo: "socio_convidado", titulo: `Convite reenviado: «${p.title}»`, descricao: `${socio.pct}% · ${SOCIO_ROLE_LABEL[socio.role ?? "investidor"]}`, actorId: CURRENT_USER_ID, link: `/comunidade/colaborativa/${p.id}` });
    toastSuccess(`Convite reenviado a ${nomeProprio(socio.name)}`);
  };

  const cancelar = (socio: Partner) => {
    if (!confirm(`Cancelar o convite a ${socio.name}?`)) return;
    setPartners(p.partners.filter((s) => s.id !== socio.id));
    toastSuccess("Convite cancelado");
  };

  const donut = ativos.map((s, i) => ({ name: s.name, value: s.pct, color: s.color || SOCIO_COLORS[i % SOCIO_COLORS.length] }));

  return (
    <div className="mt-5 space-y-5">
      {/* Donut + ações */}
      <ChartCard
        title="Distribuição de percentagens"
        action={
          gestor ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setRedeOpen(true)}>
                <Network size={14} /> Convidar da Rede
              </Button>
              <Button size="sm" variant="gold" onClick={() => setInviteOpen(true)}>
                <UserPlus size={14} /> Convidar sócio
              </Button>
            </div>
          ) : undefined
        }
      >
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <PieChart width={180} height={180}>
              <Pie data={donut} dataKey="value" innerRadius={52} outerRadius={82} stroke="none" paddingAngle={2}>
                {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => pct(v, 0)} contentStyle={{ borderRadius: 12, border: "1px solid #E8D5BE", fontSize: 13 }} />
            </PieChart>
            <div className="flex-1 space-y-2">
              {ativos.map((s) => {
                const prof = profiles.find((x) => x.id === s.id);
                return (
                  <div key={s.id} className="flex items-center gap-2.5 border-b border-line/60 pb-2 last:border-0">
                    <RoleAvatar profile={prof} role={(s.role ?? "investidor") as any} size="xs" />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{s.name}</span>
                    <span className="num text-sm font-bold text-ink">{s.pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
      </ChartCard>

      {/* Cards de sócio */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ativos.map((s) => {
          const prof = profiles.find((x) => x.id === s.id);
          const role = (s.role ?? "investidor") as SocioRole;
          const last = ultimaAtividade(s.id);
          return (
            <Card key={s.id}>
              <CardContent>
                <div className="flex items-start gap-3">
                  <span className={cn("inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-white ring-2 ring-offset-2 ring-offset-card", ROLE_RING_CLS[role])}>
                    {prof?.avatarUrl ?? s.avatarUrl ? (
                      <img src={prof?.avatarUrl ?? s.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      s.name[0]
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                      {s.name}
                      {prof?.isVerified && <BadgeCheck size={13} className="shrink-0 text-gold-dark" />}
                    </p>
                    <p className="text-[11px] text-muted">
                      <span className={cn("font-semibold", role === "gestor" ? "text-gold-dark" : role === "investidor" ? "text-primary" : "text-muted")}>
                        {SOCIO_ROLE_LABEL[role]}
                      </span>
                      {" · "}{s.id === CURRENT_USER_ID ? "você" : "ativo"}
                    </p>
                  </div>
                  {gestor && s.id !== CURRENT_USER_ID && (
                    <div className="flex shrink-0 gap-0.5">
                      <button onClick={() => setEditing(s)} className="rounded p-1 text-muted hover:text-ink" title="Editar % / papel"><Pencil size={13} /></button>
                      <button onClick={() => remover(s)} className="rounded p-1 text-muted hover:text-danger" title="Remover"><Trash2 size={13} /></button>
                    </div>
                  )}
                  {gestor && s.id === CURRENT_USER_ID && (
                    <button onClick={() => setEditing(s)} className="shrink-0 rounded p-1 text-muted hover:text-ink" title="Editar %"><Pencil size={13} /></button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line/50 pt-3 text-center">
                  <div>
                    <p className="num text-base font-bold text-ink">{s.pct}%</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted">Quota</p>
                  </div>
                  <div>
                    <p className="num text-base font-bold text-ink">{eur(s.capitalInvestido ?? 0)}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted">Capital</p>
                  </div>
                  <div>
                    <p className={cn("num text-base font-bold", resultado >= 0 ? "text-success" : "text-danger")}>{eur(resultado * (s.pct / 100))}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted">Resultado</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted">
                  Última atividade: {last ? relativaTempo(last) : "—"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Convites pendentes */}
      {pendentes.length > 0 && (
        <Card>
          <CardContent>
            <CollabSH title={`Convites pendentes · ${pendentes.length}`} />
            <div className="space-y-2">
              {pendentes.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-gold/40 bg-accent/40 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/20 text-sm font-semibold text-gold-dark">{s.name[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{s.name}</p>
                    <p className="text-[11px] text-muted">{s.email ?? "sem email"} · {s.pct}% · {SOCIO_ROLE_LABEL[s.role ?? "investidor"]} · convidado {s.convidadoEm ?? "—"}</p>
                  </div>
                  {gestor && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => reenviar(s)}><Send size={13} /> Reenviar</Button>
                      <Button size="sm" variant="ghost" onClick={() => cancelar(s)}><X size={13} /> Cancelar</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {inviteOpen && <InviteModal project={p} onClose={() => setInviteOpen(false)} />}
      {redeOpen && <RedeSelectorModal project={p} onClose={() => setRedeOpen(false)} onPick={(prof) => { setRedeOpen(false); setInviteOpen(false); }} />}
      {editing && <EditSocioModal project={p} socio={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/* ───────────────────── Modal: convidar sócio (manual) ───────────────────── */

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function InviteModal({ project: p, onClose, prefill }: { project: CollabProject; onClose: () => void; prefill?: { id?: string; name?: string; email?: string; avatarUrl?: string } }) {
  const update = useCollabStore((s) => s.update);
  const notify = useNotificationsStore((s) => s.add);
  const [nome, setNome] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [pctS, setPctS] = useState("");
  const [role, setRole] = useState<SocioRole>("investidor");
  const [capital, setCapital] = useState("");

  const somaAtual = somaPercentagens(p.partners);
  const nova = Number(pctS) || 0;
  const excede = somaAtual + nova > 100;

  const submit = () => {
    if (nome.trim().length < 2) { toastError("Indique o nome do sócio."); return; }
    if (nova <= 0) { toastError("Indique uma percentagem válida."); return; }
    if (excede) { toastError(`Soma ficaria em ${somaAtual + nova}% — o máximo é 100%.`); return; }
    const id = prefill?.id ?? `inv-${Date.now().toString(36)}`;
    if (p.partners.some((s) => s.id === id)) { toastError("Este investidor já pertence ao projeto."); return; }
    const socio: Partner = {
      id,
      name: nome.trim(),
      email: email.trim() || undefined,
      pct: nova,
      color: SOCIO_COLORS[p.partners.length % SOCIO_COLORS.length],
      role,
      status: "pendente",
      capitalInvestido: Number(capital) || 0,
      convidadoEm: new Date().toISOString().slice(0, 10),
      avatarUrl: prefill?.avatarUrl,
    };
    update(p.id, { partners: [...p.partners, socio] });
    notify({ userId: id, tipo: "socio_convidado", titulo: `Convite: «${p.title}»`, descricao: `${nova}% · ${SOCIO_ROLE_LABEL[role]}`, actorId: CURRENT_USER_ID, link: `/comunidade/colaborativa/${p.id}` });
    toastSuccess("Convite enviado", { description: `${nome} · ${nova}% · ${SOCIO_ROLE_LABEL[role]}` });
    onClose();
  };

  return (
    <ModalShell title="Convidar sócio" onClose={onClose}>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Nome *</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do sócio" className={inputCls} disabled={!!prefill?.id} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Email (convite)</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.pt" className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Percentagem *</span>
            <input value={pctS} onChange={(e) => setPctS(e.target.value)} inputMode="numeric" placeholder="%" className={cn(inputCls, excede && "border-danger")} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Papel</span>
            <select value={role} onChange={(e) => setRole(e.target.value as SocioRole)} className={inputCls}>
              <option value="investidor">Investidor</option>
              <option value="observador">Observador</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Capital investido €</span>
          <input value={capital} onChange={(e) => setCapital(e.target.value)} inputMode="numeric" placeholder="0" className={inputCls} />
        </label>
        <p className={cn("rounded-lg px-3 py-2 text-xs", excede ? "bg-danger/8 text-danger" : "bg-accent/60 text-muted")}>
          Soma atual: {somaAtual}% {nova > 0 && `→ com este convite: ${somaAtual + nova}%`} (máx. 100%)
        </p>
        <Button variant="gold" className="w-full" onClick={submit}><Send size={15} /> Enviar convite</Button>
        <p className="text-[11px] text-muted">O sócio fica <strong>pendente</strong> até aceitar (envio real de email na fase backend).</p>
      </div>
    </ModalShell>
  );
}

/* ───────────────────── Modal: convidar da Rede ───────────────────── */

function RedeSelectorModal({ project: p, onClose }: { project: CollabProject; onClose: () => void; onPick?: (id: string) => void }) {
  const profiles = useProfilesStore((s) => s.profiles);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const jaSocios = new Set(p.partners.map((s) => s.id));
  const candidatos = profiles.filter(
    (x) => !jaSocios.has(x.id) && (!q || x.fullName.toLowerCase().includes(q.toLowerCase()) || x.city.toLowerCase().includes(q.toLowerCase()))
  );

  const pickedProfile = picked ? profiles.find((x) => x.id === picked) : undefined;
  if (pickedProfile) {
    return <InviteModal project={p} onClose={onClose} prefill={{ id: pickedProfile.id, name: pickedProfile.fullName, avatarUrl: pickedProfile.avatarUrl }} />;
  }

  return (
    <ModalShell title="Convidar da Rede de Investidores" onClose={onClose}>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar por nome ou cidade…" className={inputCls} />
      <div className="mt-3 space-y-1.5">
        {candidatos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted"><Users2 size={22} className="mx-auto mb-1.5" />Sem investidores disponíveis.</p>
        ) : (
          candidatos.map((x) => (
            <button key={x.id} onClick={() => setPicked(x.id)} className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-colors hover:border-gold/30 hover:bg-accent/50">
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                {x.avatarUrl ? <img src={x.avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-secondary text-sm font-semibold text-white">{x.fullName[0]}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm font-medium text-ink">{x.fullName}{x.isVerified && <BadgeCheck size={12} className="text-gold-dark" />}</span>
                <span className="block text-[11px] text-muted">{x.city} · {x.projetosConcluidos} projetos{x.rating > 0 ? ` · ★ ${x.rating.toFixed(1)}` : ""}</span>
              </span>
              <UserPlus size={15} className="shrink-0 text-gold-dark" />
            </button>
          ))
        )}
      </div>
    </ModalShell>
  );
}

/* ───────────────────── Modal: editar sócio ───────────────────── */

function EditSocioModal({ project: p, socio, onClose }: { project: CollabProject; socio: Partner; onClose: () => void }) {
  const update = useCollabStore((s) => s.update);
  const [pctS, setPctS] = useState(String(socio.pct));
  const [role, setRole] = useState<SocioRole>(socio.role ?? "investidor");
  const [capital, setCapital] = useState(String(socio.capitalInvestido ?? 0));

  const novo = Number(pctS) || 0;
  const somaOutros = somaPercentagens(p.partners.filter((s) => s.id !== socio.id));
  const excede = somaOutros + novo > 100;

  const submit = () => {
    if (novo <= 0) { toastError("Percentagem inválida."); return; }
    if (excede) { toastError(`Soma ficaria em ${somaOutros + novo}% — o máximo é 100%.`); return; }
    if (socio.role === "gestor" && role !== "gestor") { toastError("O projeto tem de manter um gestor."); return; }
    update(p.id, {
      partners: p.partners.map((s) =>
        s.id === socio.id ? { ...s, pct: novo, role, capitalInvestido: Number(capital) || 0 } : s
      ),
    });
    toastSuccess("Sócio atualizado", { description: `${socio.name} · ${novo}%` });
    onClose();
  };

  return (
    <ModalShell title={`Editar · ${socio.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Percentagem</span>
            <input value={pctS} onChange={(e) => setPctS(e.target.value)} inputMode="numeric" className={cn(inputCls, excede && "border-danger")} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Papel</span>
            <select value={role} onChange={(e) => setRole(e.target.value as SocioRole)} className={inputCls} disabled={socio.role === "gestor"}>
              <option value="gestor">Gestor</option>
              <option value="investidor">Investidor</option>
              <option value="observador">Observador</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Capital investido €</span>
          <input value={capital} onChange={(e) => setCapital(e.target.value)} inputMode="numeric" className={inputCls} />
        </label>
        <p className={cn("rounded-lg px-3 py-2 text-xs", excede ? "bg-danger/8 text-danger" : "bg-accent/60 text-muted")}>
          Restantes sócios: {somaOutros}% → total com esta alteração: {somaOutros + novo}%
        </p>
        <Button variant="gold" className="w-full" onClick={submit}><Check size={15} /> Guardar</Button>
      </div>
    </ModalShell>
  );
}
