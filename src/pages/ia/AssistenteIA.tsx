import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import {
  Plus,
  Search,
  Send,
  Paperclip,
  Sparkles,
  Pencil,
  Download,
  Trash2,
  PanelLeft,
  TrendingUp,
  AlertCircle,
  Calculator,
  Receipt,
  FileSignature,
  Building2,
  Copy,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NomeModal } from "@/components/ui/NomeModal";
import { useAiConversationsStore, type AiMessage } from "@/store/useAiConversationsStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useTenantsStore } from "@/store/useTenantsStore";
import { useContractsStore } from "@/store/useContractsStore";
import { useCurrentUser } from "@/store/useProfilesStore";
import { respondToQuery, SUGESTOES, type AiContext } from "@/lib/ai/engine";
import { dataPTShort } from "@/lib/format";
import { cn } from "@/lib/utils";

const SUG_ICONS = [TrendingUp, AlertCircle, Calculator, Receipt, FileSignature, Building2];

export default function AssistenteIA() {
  const conversations = useAiConversationsStore((s) => s.conversations);
  const createConv = useAiConversationsStore((s) => s.create);
  const renameConv = useAiConversationsStore((s) => s.rename);
  const removeConv = useAiConversationsStore((s) => s.remove);
  const addMessage = useAiConversationsStore((s) => s.addMessage);

  const properties = usePropertiesStore((s) => s.properties);
  const transactions = useTransactionsStore((s) => s.transactions);
  const tenants = useTenantsStore((s) => s.tenants);
  const contracts = useContractsStore((s) => s.contracts);
  const user = useCurrentUser();
  const navigate = useNavigate();

  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [q, setQ] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [renomearOpen, setRenomearOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const mensagens = active?.messages ?? [];
  const vazia = !active || mensagens.length === 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens.length, thinking]);

  const ctx = (): AiContext => ({
    userName: user?.fullName?.split(" ")[0] ?? "Daniel",
    properties,
    transactions,
    tenants,
    contracts,
  });

  const enviar = async (texto: string) => {
    const msg = texto.trim();
    if (!msg || thinking) return;
    let id = activeId;
    if (!id) {
      id = createConv();
      setActiveId(id);
    }
    addMessage(id, { role: "user", content: msg });
    setInput("");
    setThinking(true);
    try {
      const resp = await respondToQuery(msg, ctx());
      addMessage(id, {
        role: "assistant",
        content: resp.content,
        actions: resp.actions,
        chart: resp.chart,
        followups: resp.followups,
      });
    } finally {
      setThinking(false);
    }
  };

  const novaConversa = () => {
    const id = createConv();
    setActiveId(id);
    setShowSidebar(false);
    setInput("");
  };

  const exportar = () => {
    if (!active) return;
    const md = active.messages
      .map((m) => `### ${m.role === "user" ? "Eu" : "Assistente"}\n\n${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([`# ${active.title}\n\n${md}`], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${active.title}.md`;
    a.click();
    toastSuccess("Conversa exportada");
  };

  const grupos = useMemo(() => agruparPorRecencia(conversations.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()))), [conversations, q]);
  const saud = greeting();

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] gap-4">
      {/* ───────── Sidebar histórico ───────── */}
      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-30 flex w-72 flex-col rounded-xl border border-line bg-card p-3 transition-transform lg:static lg:translate-x-0",
          showSidebar ? "translate-x-0 shadow-2xl" : "-translate-x-[110%]"
        )}
      >
        <Button onClick={novaConversa} variant="gold" className="w-full">
          <Plus size={16} /> Nova conversa
        </Button>
        <div className="my-3 flex items-center gap-2 rounded-lg border border-line bg-bg px-2.5">
          <Search size={14} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar…" className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted" />
        </div>
        <div className="-mr-1 flex-1 space-y-3 overflow-y-auto pr-1">
          {grupos.map((g) => (
            <div key={g.label}>
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted">{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors",
                      c.id === activeId ? "bg-accent text-primary" : "text-ink hover:bg-accent/60"
                    )}
                  >
                    <button onClick={() => { setActiveId(c.id); setShowSidebar(false); }} className="min-w-0 flex-1 truncate text-left">
                      {c.title}
                    </button>
                    <button
                      onClick={() => { removeConv(c.id); if (activeId === c.id) setActiveId(null); }}
                      className="text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {grupos.length === 0 && <p className="px-1 text-xs text-muted">Sem conversas.</p>}
        </div>
        <p className="mt-2 border-t border-line pt-2 text-center text-[10px] text-muted">Modelo: simulado local</p>
      </aside>
      {showSidebar && <div className="fixed inset-0 z-20 bg-ink/30 lg:hidden" onClick={() => setShowSidebar(false)} />}

      {/* ───────── Chat ───────── */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-card">
        {/* Topo */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <button onClick={() => setShowSidebar(true)} className="text-muted hover:text-ink lg:hidden"><PanelLeft size={18} /></button>
          <p className="min-w-0 flex-1 truncate font-display text-base font-semibold text-ink">
            {active ? active.title : "Assistente IA"}
          </p>
          {active && (
            <div className="flex items-center gap-1">
              <button onClick={() => setRenomearOpen(true)} className="rounded-lg p-1.5 text-muted hover:bg-accent hover:text-ink" title="Renomear"><Pencil size={15} /></button>
              <button onClick={exportar} className="rounded-lg p-1.5 text-muted hover:bg-accent hover:text-ink" title="Exportar (.md)"><Download size={15} /></button>
              <button onClick={() => { removeConv(active.id); setActiveId(null); }} className="rounded-lg p-1.5 text-muted hover:bg-accent hover:text-danger" title="Eliminar"><Trash2 size={15} /></button>
            </div>
          )}
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
          {vazia ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark">
                <Sparkles size={26} />
              </div>
              <h2 className="font-display text-2xl font-bold text-ink">{saud}, {user?.fullName?.split(" ")[0] ?? "Daniel"}.</h2>
              <p className="mt-1 text-sm text-muted">Como posso ajudar na gestão imobiliária hoje?</p>
              <div className="mt-6 grid w-full gap-2.5 sm:grid-cols-2">
                {SUGESTOES.map((s, i) => {
                  const Icon = SUG_ICONS[i] ?? Sparkles;
                  return (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="flex items-center gap-3 rounded-xl border border-line bg-bg/50 p-3 text-left text-sm text-ink transition-colors hover:border-primary/40 hover:bg-accent"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-secondary"><Icon size={16} /></span>
                      <span className="flex-1">{s}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {mensagens.map((m) => (
                <MessageBubble key={m.id} m={m} onAction={(a) => a.to && navigate(a.to)} onFollowup={(t) => enviar(t)} />
              ))}
              {thinking && <Thinking />}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-line p-3">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-line bg-bg px-3 py-2 focus-within:border-secondary">
            <button onClick={() => toastInfo("Anexos chegam em breve.")} className="pb-1.5 text-muted hover:text-ink" title="Anexar"><Paperclip size={18} /></button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); enviar(input); } }}
              rows={1}
              placeholder="Escreva a sua pergunta…  (⌘/Ctrl + Enter para enviar)"
              className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted"
            />
            <Button size="icon" className="h-9 w-9 shrink-0 rounded-xl" disabled={!input.trim() || thinking} onClick={() => enviar(input)}>
              <Send size={16} />
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted">Respostas geradas localmente a partir dos seus dados — confirme decisões com um profissional.</p>
        </div>
      </section>

      {renomearOpen && active && (
        <NomeModal
          titulo="Renomear conversa"
          valorInicial={active.title}
          cta="Guardar"
          placeholder="Título da conversa"
          onClose={() => setRenomearOpen(false)}
          onConfirm={(t) => { renameConv(active.id, t); toastSuccess("Conversa renomeada", t); setRenomearOpen(false); }}
        />
      )}
    </div>
  );
}

// ───────────────────────── Bolha de mensagem ─────────────────────────

function MessageBubble({ m, onAction, onFollowup }: { m: AiMessage; onAction: (a: { to?: string }) => void; onFollowup: (t: string) => void }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-white">{m.content}</div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar font-display text-sm font-bold text-gold-soft">d</div>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-sm border border-line bg-bg/40 px-4 py-3 text-sm text-ink">
          <Markdown text={m.content} />
          {m.chart && m.chart.dados.length > 0 && (
            <div className="mt-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.chart.dados} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <XAxis dataKey="nome" tick={{ fontSize: 11, fill: "#8a7a66" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8a7a66" }} width={48} />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString("pt-PT")} €`} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {m.chart.dados.map((d, i) => (
                      <Cell key={i} fill={d.valor >= 0 ? "#4A7C59" : "#9B3A2A"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        {(m.actions?.length || m.followups?.length) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {m.actions?.map((a, i) => (
              <button
                key={`a${i}`}
                onClick={() => (a.kind === "copy" ? (navigator.clipboard?.writeText(m.content), toastSuccess("Copiado")) : onAction(a))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent"
              >
                {a.kind === "copy" ? <Copy size={13} /> : <ArrowRight size={13} />} {a.label}
              </button>
            ))}
            {m.followups?.map((fu, i) => (
              <button key={`f${i}`} onClick={() => onFollowup(fu)} className="rounded-full bg-accent px-3 py-1.5 text-xs text-secondary hover:bg-accent/70">
                {fu}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar font-display text-sm font-bold text-gold-soft">d</div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-line bg-bg/40 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-secondary" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Markdown mínimo ─────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-ink">{p.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} className="rounded bg-accent px-1 py-0.5 font-mono text-[12px] text-secondary">{p.slice(1, -1)}</code>;
    const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a key={i} href={link[2]} className="text-secondary underline">{link[1]}</a>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Tabela
    if (line.trim().startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i]);
        i++;
      }
      const parse = (r: string) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const header = parse(rows[0]);
      const body = rows.slice(1).filter((r) => !/^[\s|:-]+$/.test(r)).map(parse);
      blocks.push(
        <table key={key++} className="my-2 w-full border-collapse text-xs">
          <thead>
            <tr>{header.map((h, hi) => <th key={hi} className="border-b border-line px-2 py-1 text-left font-semibold text-secondary">{renderInline(h)}</th>)}</tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri}>{row.map((c, ci) => <td key={ci} className="border-b border-line/50 px-2 py-1 text-ink">{renderInline(c)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      );
      continue;
    }
    // Lista não ordenada
    if (/^\s*-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ""));
        i++;
      }
      blocks.push(<ul key={key++} className="my-1.5 list-disc space-y-1 pl-5">{items.map((it, ii) => <li key={ii}>{renderInline(it)}</li>)}</ul>);
      continue;
    }
    // Lista ordenada
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(<ol key={key++} className="my-1.5 list-decimal space-y-1 pl-5">{items.map((it, ii) => <li key={ii}>{renderInline(it)}</li>)}</ol>);
      continue;
    }
    // Linha vazia
    if (line.trim() === "") {
      i++;
      continue;
    }
    // Itálico em linha própria (disclaimer _..._)
    if (/^_.+_$/.test(line.trim())) {
      blocks.push(<p key={key++} className="my-1 text-xs italic text-muted">{line.trim().slice(1, -1)}</p>);
      i++;
      continue;
    }
    // Parágrafo
    blocks.push(<p key={key++} className="my-1 leading-relaxed">{renderInline(line)}</p>);
    i++;
  }
  return <>{blocks}</>;
}

// ───────────────────────── Helpers ─────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 20 ? "Boa tarde" : "Boa noite";
}

function agruparPorRecencia<T extends { updatedAt: string }>(convs: T[]): { label: string; items: T[] }[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const semana = new Date(hoje);
  semana.setDate(semana.getDate() - 7);

  const buckets: Record<string, T[]> = { Hoje: [], Ontem: [], "Esta semana": [], "Mais antigas": [] };
  [...convs]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .forEach((c) => {
      const d = new Date(c.updatedAt);
      if (d >= hoje) buckets["Hoje"].push(c);
      else if (d >= ontem) buckets["Ontem"].push(c);
      else if (d >= semana) buckets["Esta semana"].push(c);
      else buckets["Mais antigas"].push(c);
    });
  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// dataPTShort exportado para uso futuro (datas nas conversas)
void dataPTShort;
