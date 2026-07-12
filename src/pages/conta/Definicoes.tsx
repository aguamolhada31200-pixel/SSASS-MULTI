import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  UserCog,
  BellRing,
  ShieldCheck,
  Palette,
  Plug,
  KeyRound,
  Trash2,
  Monitor,
  Sun,
  Moon,
  LogOut,
  Download,
  Check,
  X,
  Lock,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Toggle, SectionCard, inputCls } from "@/components/conta/ContaUI";
import {
  useAccountStore,
  NOTIF_EVENTS,
  PLANOS,
  type EstadoIntegracao,
} from "@/store/useAccountStore";
import { dataPTShort } from "@/lib/format";
import { cn } from "@/lib/utils";

type TabId = "conta" | "notificacoes" | "privacidade" | "aparencia" | "integracoes" | "api" | "apagar";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "conta", label: "Conta", icon: UserCog },
  { id: "notificacoes", label: "Notificações", icon: BellRing },
  { id: "privacidade", label: "Privacidade", icon: ShieldCheck },
  { id: "aparencia", label: "Aparência", icon: Palette },
  { id: "integracoes", label: "Integrações", icon: Plug },
  { id: "api", label: "API", icon: KeyRound },
  { id: "apagar", label: "Apagar conta", icon: Trash2 },
];

export default function Definicoes() {
  const [tab, setTab] = useState<TabId>("conta");

  return (
    <div>
      <PageHeader title="Definições" subtitle="Gestão da conta, notificações, privacidade e integrações." />

      {/* nav mobile */}
      <select value={tab} onChange={(e) => setTab(e.target.value as TabId)} className={cn(inputCls, "mb-4 lg:hidden")}>
        {TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* nav desktop */}
        <aside className="hidden lg:block">
          <nav className="sticky top-2 space-y-0.5 rounded-xl border border-line bg-card p-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const danger = t.id === "apagar";
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    tab === t.id ? (danger ? "bg-danger/10 font-medium text-danger" : "bg-accent font-medium text-primary") : danger ? "text-danger/80 hover:bg-danger/5" : "text-ink hover:bg-accent/60"
                  )}
                >
                  <Icon size={16} /> {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-5">
          {tab === "conta" && <TabConta />}
          {tab === "notificacoes" && <TabNotificacoes />}
          {tab === "privacidade" && <TabPrivacidade />}
          {tab === "aparencia" && <TabAparencia />}
          {tab === "integracoes" && <TabIntegracoes />}
          {tab === "api" && <TabApi />}
          {tab === "apagar" && <TabApagar />}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── TAB 1 — Conta ─────────────────────────

function forcaPassword(pw: string): { score: number; label: string; tone: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ["Muito fraca", "Fraca", "Razoável", "Forte", "Muito forte"];
  const tones = ["bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success"];
  return { score: s, label: labels[s], tone: tones[s] };
}

function TabConta() {
  const privado = useAccountStore((s) => s.privado);
  const seguranca = useAccountStore((s) => s.definicoes.seguranca);
  const updateSeguranca = useAccountStore((s) => s.updateSeguranca);
  const [novaPw, setNovaPw] = useState("");
  const forca = forcaPassword(novaPw);

  return (
    <>
      <SectionCard title="Email da conta" icon={UserCog}>
        <Field label="Email" hint="Alterar o email requer confirmação no novo endereço.">
          <div className="flex gap-2">
            <input defaultValue={privado.email} className={inputCls} />
            <Button variant="outline" size="sm" onClick={() => toast.success("Email de confirmação enviado")}>Alterar</Button>
          </div>
        </Field>
      </SectionCard>

      <SectionCard title="Palavra-passe" icon={Lock}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Atual"><input type="password" className={inputCls} /></Field>
          <Field label="Nova"><input type="password" value={novaPw} onChange={(e) => setNovaPw(e.target.value)} className={inputCls} /></Field>
          <Field label="Confirmar"><input type="password" className={inputCls} /></Field>
        </div>
        {novaPw && (
          <div className="mt-2">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < forca.score ? forca.tone : "bg-line")} />
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted">Força: {forca.label}</p>
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={() => { toast.success("Palavra-passe atualizada"); setNovaPw(""); }}>Guardar</Button>
        </div>
      </SectionCard>

      <SectionCard title="Autenticação em dois passos" icon={ShieldCheck} badge={<Badge tone="neutral" className="ml-auto">Em breve</Badge>}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Proteja a conta com um segundo fator (app autenticadora ou SMS).</p>
          <Toggle on={seguranca.dois_fatores} onChange={() => toast.info("2FA chega na Fase 4")} />
        </div>
      </SectionCard>

      <SectionCard title="Sessões ativas" icon={Monitor}>
        <ul className="space-y-2">
          {seguranca.ultimosLogins.map((l, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg border border-line/70 bg-bg/30 px-3 py-2.5 text-sm">
              <div>
                <p className="text-ink">{l.dispositivo} {l.atual && <Badge tone="success">Sessão atual</Badge>}</p>
                <p className="text-xs text-muted">{l.localizacao} · {dataPTShort(l.data)}</p>
              </div>
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => { updateSeguranca({ ultimosLogins: seguranca.ultimosLogins.filter((l) => l.atual) }); toast.success("Outras sessões terminadas"); }}>
          <LogOut size={14} /> Terminar todas as outras sessões
        </Button>
      </SectionCard>

      <SectionCard title="Exportar os meus dados (RGPD)" icon={Download}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Gera um ZIP com todos os seus dados na plataforma.</p>
          <Button variant="outline" size="sm" onClick={() => toast.success("A preparar exportação… receberá um email com o ZIP.")}><Download size={14} /> Exportar</Button>
        </div>
      </SectionCard>
    </>
  );
}

// ───────────────────────── TAB 2 — Notificações ─────────────────────────

function TabNotificacoes() {
  const notificacoes = useAccountStore((s) => s.definicoes.notificacoes);
  const setNotif = useAccountStore((s) => s.setNotif);
  return (
    <SectionCard title="Notificações" icon={BellRing} desc="Escolha como quer ser avisado de cada evento.">
      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-accent/40 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2.5 text-left">Evento</th>
              <th className="px-3 py-2.5 text-center">Email</th>
              <th className="px-3 py-2.5 text-center">Push</th>
              <th className="px-3 py-2.5 text-center">In-app</th>
            </tr>
          </thead>
          <tbody>
            {NOTIF_EVENTS.map((e) => {
              const v = notificacoes[e.key];
              return (
                <tr key={e.key} className="border-b border-line/60 last:border-0">
                  <td className="px-3 py-2.5 text-ink">{e.label}</td>
                  {(["email", "push", "inApp"] as const).map((canal) => (
                    <td key={canal} className="px-3 py-2.5 text-center">
                      <div className="flex justify-center">
                        <Toggle on={v?.[canal] ?? false} onChange={(val) => setNotif(e.key, canal, val)} />
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ───────────────────────── TAB 3 — Privacidade ─────────────────────────

function TabPrivacidade() {
  const priv = useAccountStore((s) => s.definicoes.privacidade);
  const update = useAccountStore((s) => s.updatePrivacidade);
  return (
    <>
      <SectionCard title="Visibilidade pública" icon={ShieldCheck}>
        <div className="space-y-1">
          <RowToggle label="Mostrar perfil na Rede de Investidores" desc="Se desligar, sai completamente da Rede." on={priv.mostrarNaRede} onChange={(v) => update({ mostrarNaRede: v })} />
          <RowToggle label="Indexar perfil em motores de busca" desc="Permitir que o Google liste o seu perfil público." on={priv.indexavelPesquisaPublica} onChange={(v) => update({ indexavelPesquisaPublica: v })} />
          <RowToggle label="Mostrar contacto no perfil público" desc="Só após 'Tenho interesse' / 'Contactar'." on={priv.mostrarContacto} onChange={(v) => update({ mostrarContacto: v })} />
        </div>
      </SectionCard>

      <SectionCard title="Utilizadores bloqueados" icon={X}>
        <input placeholder="Pesquisar utilizador a bloquear…" className={inputCls} />
        {priv.bloqueados.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Não tem utilizadores bloqueados.</p>
        ) : (
          <ul className="mt-3 space-y-1">{priv.bloqueados.map((b) => <li key={b} className="text-sm text-ink">{b}</li>)}</ul>
        )}
      </SectionCard>

      <SectionCard title="Eliminação de dados pessoais (RGPD)" icon={Trash2}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Peça a remoção dos seus dados pessoais da plataforma.</p>
          <Button variant="outline" size="sm" onClick={() => toast.success("Pedido de eliminação registado")}>Pedir eliminação</Button>
        </div>
      </SectionCard>
    </>
  );
}

function RowToggle({ label, desc, on, onChange }: { label: string; desc?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-line/70 bg-bg/30 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-ink">{label}</p>
        {desc && <p className="text-xs text-muted">{desc}</p>}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

// ───────────────────────── TAB 4 — Aparência ─────────────────────────

function TabAparencia() {
  const ap = useAccountStore((s) => s.definicoes.aparencia);
  const update = useAccountStore((s) => s.updateAparencia);
  const temas = [
    { v: "claro", label: "Claro", icon: Sun },
    { v: "escuro", label: "Escuro", icon: Moon },
    { v: "sistema", label: "Sistema", icon: Monitor },
  ] as const;
  return (
    <>
      <SectionCard title="Tema" icon={Palette}>
        <div className="grid grid-cols-3 gap-3">
          {temas.map((t) => {
            const Icon = t.icon;
            const ativo = ap.tema === t.v;
            return (
              <button key={t.v} onClick={() => { update({ tema: t.v }); if (t.v !== "claro") toast.info("Tema escuro madeira chega em breve"); }} className={cn("flex flex-col items-center gap-2 rounded-xl border p-4 transition-all", ativo ? "border-primary bg-accent" : "border-line hover:bg-accent/60")}>
                <Icon size={20} className={ativo ? "text-primary" : "text-muted"} />
                <span className={cn("text-sm", ativo ? "font-medium text-primary" : "text-ink")}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Densidade" icon={Palette}>
        <div className="grid grid-cols-2 gap-3">
          {(["compacta", "normal"] as const).map((d) => (
            <button key={d} onClick={() => update({ densidade: d })} className={cn("rounded-xl border p-3 text-sm capitalize transition-all", ap.densidade === d ? "border-primary bg-accent font-medium text-primary" : "border-line text-ink hover:bg-accent/60")}>
              {d}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Região" icon={Palette}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Idioma">
            <select className={inputCls} defaultValue="pt-PT"><option value="pt-PT">Português (PT)</option></select>
          </Field>
          <Field label="Moeda"><input value="€ (Euro)" disabled className={cn(inputCls, "opacity-60")} /></Field>
          <Field label="Formato de data"><input value="DD/MM/AAAA" disabled className={cn(inputCls, "opacity-60")} /></Field>
        </div>
      </SectionCard>
    </>
  );
}

// ───────────────────────── TAB 5 — Integrações ─────────────────────────

const INTEGRACAO_INFO: { key: keyof ReturnType<typeof useAccountStore.getState>["integracoes"]; nome: string; desc: string }[] = [
  { key: "stripe", nome: "Stripe", desc: "Subscrição redegest (pagamento do plano)." },
  { key: "mbway", nome: "MB WAY + Multibanco", desc: "Cobrança de rendas aos inquilinos." },
  { key: "openBanking", nome: "Open Banking", desc: "Importar transações bancárias automaticamente." },
  { key: "docuseal", nome: "DocuSeal", desc: "Assinatura digital de contratos." },
  { key: "nuki", nome: "Nuki", desc: "Fechaduras inteligentes para Alojamento Local." },
  { key: "claude", nome: "Claude API", desc: "Assistente IA com mais profundidade." },
];

function estadoBadge(e: EstadoIntegracao) {
  if (e === "ligada") return <Badge tone="success">Ligada</Badge>;
  if (e === "disponivel") return <Badge tone="info">Disponível</Badge>;
  return <Badge tone="neutral">Em breve</Badge>;
}

function TabIntegracoes() {
  const integracoes = useAccountStore((s) => s.integracoes);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {INTEGRACAO_INFO.map((it) => {
        const estado = integracoes[it.key];
        return (
          <div key={it.key} className="rounded-xl border border-line bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-secondary"><Plug size={17} /></div>
              <p className="font-medium text-ink">{it.nome}</p>
              <span className="ml-auto">{estadoBadge(estado)}</span>
            </div>
            <p className="mt-2 text-xs text-muted">{it.desc}</p>
            <Button variant="outline" size="sm" className="mt-3 w-full" disabled={estado !== "disponivel"} onClick={() => toast.success(`${it.nome} ligada`)}>
              {estado === "ligada" ? "Gerir" : "Ligar"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────── TAB 6 — API ─────────────────────────

function TabApi() {
  const plano = useAccountStore((s) => s.plano.atual);
  const apiKeys = useAccountStore((s) => s.apiKeys);
  const addApiKey = useAccountStore((s) => s.addApiKey);
  const revokeApiKey = useAccountStore((s) => s.revokeApiKey);
  const navigate = useNavigate();

  if (plano !== "business") {
    return (
      <SectionCard title="Acesso à API" icon={KeyRound}>
        <div className="rounded-xl border border-dashed border-gold/40 bg-gold/5 p-6 text-center">
          <KeyRound size={28} className="mx-auto mb-2 text-gold-dark" />
          <p className="font-display text-lg font-semibold text-ink">Disponível no plano Business</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">Gere chaves de API, configure webhooks e integre o redegest nos seus sistemas.</p>
          <Button variant="gold" className="mt-4" onClick={() => navigate("/faturacao")}>Fazer upgrade para Business</Button>
        </div>
      </SectionCard>
    );
  }

  return (
    <>
      <SectionCard title="Chaves de API" icon={KeyRound} desc="Máximo 5 chaves ativas.">
        <Button variant="outline" size="sm" disabled={apiKeys.length >= 5} onClick={() => { const n = window.prompt("Nome da chave:"); if (n?.trim()) addApiKey(n.trim(), ["read"]); }}>
          <Plus size={14} /> Gerar API key
        </Button>
        {apiKeys.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Sem chaves geradas.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {apiKeys.map((k) => (
              <li key={k.id} className="flex items-center justify-between rounded-lg border border-line/70 bg-bg/30 px-3 py-2.5 text-sm">
                <div>
                  <p className="text-ink">{k.nome} <span className="font-mono text-xs text-muted">{k.prefixo}…</span></p>
                  <p className="text-xs text-muted">Criada {dataPTShort(k.criadaEm)} · {k.scopes.join(", ")}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => revokeApiKey(k.id)}>Revogar</Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <SectionCard title="Webhooks" icon={Plug}>
        <Field label="URL do endpoint"><input placeholder="https://o-seu-servidor.pt/webhooks" className={inputCls} /></Field>
        <p className="mt-2 text-xs text-muted">Documentação: docs.redegest.pt</p>
      </SectionCard>
    </>
  );
}

// ───────────────────────── TAB 7 — Apagar conta ─────────────────────────

function TabApagar() {
  const email = useAccountStore((s) => s.privado.email);
  const [open, setOpen] = useState(false);
  const [conf, setConf] = useState("");
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-5">
      <h3 className="font-display text-base font-semibold text-danger">Zona de perigo</h3>
      <p className="mt-1 text-sm text-muted">Antes de apagar, exporte os seus dados.</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => toast.success("A preparar exportação…")}><Download size={14} /> Exportar dados</Button>

      <ul className="mt-4 space-y-1 text-sm text-ink">
        <li>• Todos os imóveis, contratos, mensagens e ficheiros serão removidos.</li>
        <li>• Os seus anúncios saem da Rede de Investidores.</li>
        <li>• <strong>Esta ação é irreversível.</strong></li>
      </ul>

      <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}><Trash2 size={15} /> Apagar a minha conta</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <h4 className="font-display text-lg font-semibold text-danger">Confirmar eliminação</h4>
            <p className="mt-2 text-sm text-muted">Escreva o seu email <strong className="text-ink">{email}</strong> para confirmar.</p>
            <input value={conf} onChange={(e) => setConf(e.target.value)} placeholder={email} className={cn(inputCls, "mt-3")} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="danger" disabled={conf.trim() !== email} onClick={() => { setOpen(false); toast.success("Conta marcada para eliminação (placeholder)"); }}>
                <Check size={15} /> Apagar definitivamente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
