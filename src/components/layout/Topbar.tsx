import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, Bell, MessageSquare, User, Settings, CreditCard, LogOut, Sun, Moon, Monitor, ChevronDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { NAV } from "./nav";
import { useConversationsStore } from "@/store/useConversationsStore";
import { CURRENT_USER_ID, useCurrentUser, useProfilesStore } from "@/store/useProfilesStore";
import { useAccountStore, PLANOS } from "@/store/useAccountStore";
import { useNotificationsStore } from "@/store/useNotificationsStore";
import { relativaTempo, useObrasStore, listaPorComprovar, listaContestadas } from "@/store/useObrasStore";
import { useModalStore } from "@/store/useModalStore";
import { useExampleData } from "@/store/useExampleData";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

function useBreadcrumb() {
  const { pathname } = useLocation();
  for (const group of NAV) {
    for (const item of group.items) {
      if (item.children) {
        const child = item.children.find((c) => c.to === pathname);
        if (child) return [item.label, child.label];
      }
      if (item.to === pathname) return [item.label];
      if (item.to !== "/" && pathname.startsWith(item.to)) return [item.label, "Detalhe"];
    }
  }
  return ["Dashboard"];
}

interface TopbarProps {
  onMenu: () => void;
  onSearch: () => void;
}

export function Topbar({ onMenu, onSearch }: TopbarProps) {
  const crumbs = useBreadcrumb();
  const navigate = useNavigate();
  const unread = useConversationsStore((s) =>
    s.conversations.reduce(
      (n, c) => n + c.messages.filter((m) => m.senderId !== CURRENT_USER_ID && !m.read).length,
      0
    )
  );
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-card/80 px-4 backdrop-blur sm:px-6">
      <button onClick={onMenu} className="text-muted hover:text-ink lg:hidden" title="Menu">
        <Menu size={20} />
      </button>

      <nav className="hidden items-center gap-1.5 text-sm sm:flex">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted/50">›</span>}
            <span className={i === crumbs.length - 1 ? "font-medium text-ink" : "text-muted"}>{c}</span>
          </span>
        ))}
      </nav>

      <button
        onClick={onSearch}
        className="ml-auto flex h-9 w-full max-w-xs items-center gap-2 rounded-xl border border-line bg-bg px-3 text-sm text-muted transition-colors hover:border-secondary/40 sm:ml-4"
      >
        <Search size={15} />
        <span className="flex-1 text-left">Pesquisar…</span>
        <kbd className="hidden rounded border border-line bg-card px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1 sm:ml-2">
        <IconButton icon={MessageSquare} count={unread} title="Mensagens" onClick={() => navigate("/mensagens")} />
        <NotificationsBell />
        <AvatarMenu />
      </div>
    </header>
  );
}

/* ───────────────────── Sino de notificações ───────────────────── */

function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const profiles = useProfilesStore((s) => s.profiles);
  const notificacoes = useNotificationsStore((s) =>
    s.notificacoes.filter((n) => n.userId === CURRENT_USER_ID)
  );
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  // Entradas sintéticas "por comprovar" / "contestados" (live, não guardadas).
  const { enabled } = useExampleData();
  const despesas = useObrasStore((s) => s.despesas);
  const obras = useObrasStore((s) => s.obras);
  const openPorComprovar = useModalStore((s) => s.openPorComprovar);
  const porComprovar = enabled ? listaPorComprovar(despesas) : [];
  const totalPorComprovar = porComprovar.reduce((s, d) => s + d.valor, 0);
  const contestadas = enabled ? listaContestadas(obras, despesas) : [];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const abrir = (id: string, link?: string) => {
    markRead(id);
    setOpen(false);
    if (link) navigate(link);
  };

  return (
    <div ref={ref} className="relative">
      <IconButton icon={Bell} count={naoLidas} title="Notificações" onClick={() => setOpen((v) => !v)} />
      {open && (
        <div className="absolute right-0 top-11 z-40 w-80 rounded-xl border border-line bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <p className="font-display text-sm font-semibold text-ink">Notificações</p>
            {naoLidas > 0 && (
              <button onClick={markAllRead} className="text-[11px] font-medium text-secondary hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto p-1.5">
            {/* Entrada fixa: gastos contestados → vista dedicada (separador Contestados) */}
            {contestadas.length > 0 && (
              <button
                onClick={() => { setOpen(false); openPorComprovar(); }}
                className="mb-1 flex w-full items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/8 px-2.5 py-2 text-left transition-colors hover:bg-danger/15"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger/20 text-danger">
                  <AlertTriangle size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium leading-snug text-ink">
                    {contestadas.length === 1 ? "1 gasto contestado por um sócio" : `${contestadas.length} gastos contestados pelos sócios`}
                  </span>
                  <span className="block truncate text-[11px] text-danger">toque para rever e responder</span>
                </span>
              </button>
            )}
            {/* Entrada fixa: despesas por comprovar → abre a vista dedicada */}
            {porComprovar.length > 0 && (
              <button
                onClick={() => { setOpen(false); openPorComprovar(); }}
                className="mb-1 flex w-full items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/8 px-2.5 py-2 text-left transition-colors hover:bg-warning/15"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
                  <AlertTriangle size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium leading-snug text-ink">Tem despesas por comprovar</span>
                  <span className="num block truncate text-[11px] text-warning">
                    {eur(totalPorComprovar)} em {porComprovar.length} {porComprovar.length === 1 ? "despesa" : "despesas"} · toque para ver
                  </span>
                </span>
              </button>
            )}
            {notificacoes.length === 0 && porComprovar.length === 0 && contestadas.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">Sem notificações.</p>
            ) : (
              notificacoes.slice(0, 20).map((n) => {
                const actor = profiles.find((x) => x.id === n.actorId);
                return (
                  <button
                    key={n.id}
                    onClick={() => abrir(n.id, n.link)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent/60",
                      !n.lida && "bg-accent/40"
                    )}
                  >
                    <span className="mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-secondary">
                      {actor?.avatarUrl ? (
                        <img src={actor.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                          {(actor?.fullName ?? "•")[0]}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[13px] leading-snug", n.lida ? "text-muted" : "font-medium text-ink")}>
                        {n.titulo}
                      </span>
                      {n.descricao && <span className="block truncate text-[11px] text-muted">{n.descricao}</span>}
                      <span className="block text-[10px] text-muted/80">{relativaTempo(n.createdAt)}</span>
                    </span>
                    {!n.lida && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AvatarMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const me = useCurrentUser();
  const nome = useAccountStore((s) => s.privado.nomeCompleto);
  const avatarUrl = useAccountStore((s) => s.privado.avatarUrl) ?? me?.avatarUrl;
  const planoId = useAccountStore((s) => s.plano.atual);
  const tema = useAccountStore((s) => s.definicoes.aparencia.tema);
  const updateAparencia = useAccountStore((s) => s.updateAparencia);

  const iniciais = nome.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (to: string) => { setOpen(false); navigate(to); };

  const temas = [
    { v: "claro", icon: Sun },
    { v: "escuro", icon: Moon },
    { v: "sistema", icon: Monitor },
  ] as const;

  return (
    <div ref={ref} className="relative ml-1.5">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 rounded-full pl-0.5 pr-1 hover:bg-accent">
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-white">
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : iniciais}
        </span>
        <ChevronDown size={14} className="text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-60 rounded-xl border border-line bg-card p-1.5 shadow-2xl">
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-white">
              {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : iniciais}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{nome}</p>
              <p className="text-[11px] text-gold-dark">Plano {PLANOS[planoId].nome}</p>
            </div>
          </div>
          <div className="my-1 border-t border-line" />
          <MenuItem icon={User} label="Perfil" onClick={() => go("/perfil")} />
          <MenuItem icon={Settings} label="Definições" onClick={() => go("/definicoes")} />
          <MenuItem icon={CreditCard} label="Faturação" onClick={() => go("/faturacao")} />
          <div className="my-1 border-t border-line" />
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="text-xs text-muted">Tema</span>
            <div className="flex gap-1">
              {temas.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.v}
                    onClick={() => { updateAparencia({ tema: t.v }); if (t.v !== "claro") toast.info("Tema escuro chega em breve"); }}
                    className={cn("flex h-7 w-7 items-center justify-center rounded-lg", tema === t.v ? "bg-primary text-white" : "text-muted hover:bg-accent")}
                    title={t.v}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="my-1 border-t border-line" />
          <MenuItem icon={LogOut} label="Terminar sessão" danger onClick={() => { setOpen(false); toast.success("Sessão terminada (placeholder)"); }} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof User; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors", danger ? "text-danger hover:bg-danger/8" : "text-ink hover:bg-accent")}>
      <Icon size={16} /> {label}
    </button>
  );
}

function IconButton({
  icon: Icon,
  count,
  title,
  onClick,
}: {
  icon: typeof Bell;
  count?: number;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} title={title} className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-accent hover:text-ink">
      <Icon size={18} />
      {!!count && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-semibold text-white">
          {count}
        </span>
      )}
    </button>
  );
}
