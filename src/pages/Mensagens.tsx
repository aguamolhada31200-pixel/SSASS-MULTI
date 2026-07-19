import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Send, ArrowLeft, MessageSquare, Search, Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  useConversationsStore,
  type Conversation,
} from "@/store/useConversationsStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { useListingsStore } from "@/store/useListingsStore";
import { useTenantsStore } from "@/store/useTenantsStore";
import { useMaintenanceStore } from "@/store/useMaintenanceStore";
import { useModalStore } from "@/store/useModalStore";
import { cn } from "@/lib/utils";

type Filtro = "todas" | "investidores" | "inquilinos";

/** Palavras que indicam avaria numa mensagem do inquilino → banner de manutenção. */
const PALAVRAS_AVARIA =
  /avaria|fuga|não funciona|nao funciona|partid[ao]|sem água|sem agua|sem luz|sem aquecimento|não aquece|nao aquece|entupid|infiltra|estragad|avariad|pingar|a pingar|curto-circuito/i;

function horaCurta(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  if (mesmoDia) return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

export default function Mensagens() {
  const [params, setParams] = useSearchParams();
  const conversations = useConversationsStore((s) => s.conversations);
  const sendMessage = useConversationsStore((s) => s.sendMessage);
  const markRead = useConversationsStore((s) => s.markRead);
  const profiles = useProfilesStore((s) => s.profiles);
  const listings = useListingsStore((s) => s.listings);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");

  const tenants = useTenantsStore((s) => s.tenants);
  const activeId = params.get("c");
  const active = conversations.find((c) => c.id === activeId);

  const nomeDe = (id: string) =>
    profiles.find((p) => p.id === id)?.fullName ?? tenants.find((t) => t.id === id)?.nomeCompleto ?? "Utilizador";
  const avatarDe = (id: string) => profiles.find((p) => p.id === id)?.avatarUrl;
  const otherOf = (c: Conversation) => c.participantIds.find((id) => id !== CURRENT_USER_ID) ?? "";

  const contextoLabel = (c: Conversation): { label: string; to?: string } => {
    if (c.contextType === "listing") {
      const l = listings.find((x) => x.id === c.contextId);
      return { label: l ? l.title : "Anúncio", to: l ? `/comunidade/rede/anuncio/${l.id}` : undefined };
    }
    if (c.contextType === "tenant") {
      const t = tenants.find((x) => x.id === (c.contextId ?? otherOf(c)));
      return { label: t ? `Inquilino${t.propertyId ? "" : ""}` : "Inquilino", to: t ? `/pessoas/inquilinos/${t.id}` : undefined };
    }
    return { label: "Conversa direta" };
  };

  const matchesFiltro = (c: Conversation) => {
    if (filtro === "todas") return true;
    if (filtro === "inquilinos") return c.contextType === "tenant";
    return c.contextType === "listing" || c.contextType === "direct";
  };

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return conversations
      .filter(matchesFiltro)
      .filter((c) => (q ? nomeDe(otherOf(c)).toLowerCase().includes(q) || contextoLabel(c).label.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        const la = a.messages[a.messages.length - 1]?.createdAt ?? a.createdAt;
        const lb = b.messages[b.messages.length - 1]?.createdAt ?? b.createdAt;
        return la < lb ? 1 : -1;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, filtro, busca, profiles, listings]);

  // Marcar como lida ao abrir
  useEffect(() => {
    if (activeId && conversations.some((c) => c.id === activeId)) markRead(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const selecionar = (id: string) => setParams({ c: id });

  return (
    <div className="-my-6 flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-line px-1 py-3">
        <h1 className="font-display text-2xl font-bold text-ink">Mensagens</h1>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[300px_1fr]">
        {/* Lista de conversas */}
        <div className={cn("flex min-h-0 flex-col border-r border-line", active && "hidden md:flex")}>
          <div className="space-y-2 p-3">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-3">
              <Search size={14} className="text-muted" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar…" className="h-8 w-full bg-transparent text-sm outline-none" />
            </div>
            <div className="flex gap-1">
              {(["todas", "investidores", "inquilinos"] as Filtro[]).map((f) => (
                <button key={f} onClick={() => setFiltro(f)} className={cn("flex-1 rounded-lg px-2 py-1.5 text-xs font-medium capitalize transition-colors", filtro === f ? "bg-primary text-white" : "text-muted hover:bg-accent")}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {lista.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">Sem conversas.</p>
            ) : (
              lista.map((c) => {
                const other = otherOf(c);
                const last = c.messages[c.messages.length - 1];
                const unread = c.messages.some((m) => m.senderId !== CURRENT_USER_ID && !m.read);
                const ctx = contextoLabel(c);
                return (
                  <button
                    key={c.id}
                    onClick={() => selecionar(c.id)}
                    className={cn("flex w-full items-start gap-3 border-b border-line/60 px-4 py-3 text-left hover:bg-bg", activeId === c.id && "bg-accent/60")}
                  >
                    <Avatar name={nomeDe(other)} url={avatarDe(other)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink">{nomeDe(other)}</span>
                        <span className="shrink-0 text-[11px] text-muted">{last ? horaCurta(last.createdAt) : ""}</span>
                      </div>
                      <p className="truncate text-[11px] text-secondary">{ctx.label}</p>
                      <p className={cn("truncate text-xs", unread ? "font-medium text-ink" : "text-muted")}>
                        {last ? (last.senderId === CURRENT_USER_ID ? "Tu: " : "") + last.content : "Sem mensagens"}
                      </p>
                    </div>
                    {unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Thread */}
        <div className={cn("flex min-h-0 flex-col", !active && "hidden md:flex")}>
          {active ? (
            <Thread
              conversation={active}
              other={otherOf(active)}
              nome={nomeDe(otherOf(active))}
              avatar={avatarDe(otherOf(active))}
              contexto={contextoLabel(active)}
              onBack={() => setParams({})}
              onSend={(txt) => sendMessage(active.id, txt)}
              manutencao={<BannerManutencao conversation={active} outroId={otherOf(active)} />}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-muted">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent"><MessageSquare className="text-secondary" /></div>
              <p className="mt-3 text-sm">Selecione uma conversa para começar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Banner "Parece um pedido de manutenção" — só em conversas de inquilino com palavras-chave. */
function BannerManutencao({ conversation, outroId }: { conversation: Conversation; outroId: string }) {
  const tenants = useTenantsStore((s) => s.tenants);
  const requests = useMaintenanceStore((s) => s.requests);
  const openMaintenanceForm = useModalStore((s) => s.openMaintenanceForm);

  if (conversation.contextType !== "tenant") return null;
  const msgAvaria = [...conversation.messages].reverse().find(
    (m) => m.senderId !== CURRENT_USER_ID && PALAVRAS_AVARIA.test(m.content)
  );
  if (!msgAvaria) return null;

  const tenant = tenants.find((t) => t.id === (conversation.contextId ?? outroId));
  const pedidoExistente = requests.find((r) => r.conversationId === conversation.id);

  if (pedidoExistente) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-success/8 px-4 py-2.5 text-[13px] text-success">
        <Wrench size={14} className="shrink-0" />
        Pedido de manutenção criado a partir desta conversa.
        <Link to={`/manutencao/${pedidoExistente.id}`} className="font-medium underline hover:no-underline">
          Ver pedido →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-warning/8 px-4 py-2.5 text-[13px] text-warning">
      <Wrench size={14} className="shrink-0" />
      Parece um pedido de manutenção.
      <button
        onClick={() =>
          openMaintenanceForm({
            initialPropertyId: tenant?.propertyId ?? null,
            lockProperty: !!tenant?.propertyId,
            prefill: {
              titulo: msgAvaria.content.split(/[.!?\n]/)[0].slice(0, 70),
              descricao: msgAvaria.content,
              tenantId: tenant?.id,
              conversationId: conversation.id,
            },
          })
        }
        className="rounded-full border border-warning/50 px-2.5 py-1 font-medium transition-colors hover:bg-warning/10"
      >
        Criar pedido a partir desta conversa
      </button>
    </div>
  );
}

function Thread({
  conversation,
  nome,
  avatar,
  contexto,
  onBack,
  onSend,
  manutencao,
}: {
  conversation: Conversation;
  other: string;
  nome: string;
  avatar?: string;
  contexto: { label: string; to?: string };
  onBack: () => void;
  onSend: (txt: string) => void;
  manutencao?: React.ReactNode;
}) {
  const [txt, setTxt] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages.length]);

  const enviar = () => {
    const t = txt.trim();
    if (!t) return;
    onSend(t);
    setTxt("");
  };

  return (
    <>
      {/* Cabeçalho de contexto */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button onClick={onBack} className="text-muted hover:text-ink md:hidden"><ArrowLeft size={18} /></button>
        <Avatar name={nome} url={avatar} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{nome}</p>
          {contexto.to ? (
            <Link to={contexto.to} className="truncate text-xs text-secondary hover:underline">{contexto.label} →</Link>
          ) : (
            <p className="truncate text-xs text-muted">{contexto.label}</p>
          )}
        </div>
      </div>

      {/* Banner de manutenção (conversa de inquilino com avaria detetada) */}
      {manutencao}

      {/* Mensagens */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-bg/40 p-4">
        {conversation.messages.map((m) => {
          const mine = m.senderId === CURRENT_USER_ID;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm", mine ? "rounded-br-sm bg-gold text-sidebar" : "rounded-bl-sm border border-line bg-card text-ink")}>
                <p className="whitespace-pre-line">{m.content}</p>
                <p className={cn("mt-1 text-[10px]", mine ? "text-sidebar/60" : "text-muted")}>{horaCurta(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2 border-t border-line p-3">
        <input
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder="Escrever mensagem…"
          className="h-10 flex-1 rounded-xl border border-line bg-card px-3.5 text-sm outline-none focus:border-secondary"
        />
        <Button variant="gold" size="icon" onClick={enviar} disabled={!txt.trim()}><Send size={16} /></Button>
      </div>
    </>
  );
}

function Avatar({ name, url }: { name: string; url?: string }) {
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-secondary text-sm text-white">{name[0]}</div>}
    </div>
  );
}
