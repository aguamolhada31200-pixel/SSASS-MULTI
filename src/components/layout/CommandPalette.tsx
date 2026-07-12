import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { NAV } from "./nav";
import { cn } from "@/lib/utils";

interface Entry {
  label: string;
  group: string;
  to: string;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    for (const g of NAV)
      for (const i of g.items) {
        out.push({ label: i.label, group: g.label, to: i.to });
        i.children?.forEach((c) => out.push({ label: c.label, group: g.label, to: c.to }));
      }
    return out;
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.label.toLowerCase().includes(q));
  }, [entries, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
        if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
        if (e.key === "Enter" && results[active]) go(results[active].to);
      }}
    >
      <div
        className="mx-auto mt-[15vh] w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search size={18} className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar ou executar comando…"
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          />
          <kbd className="rounded border border-line bg-bg px-1.5 py-0.5 text-[10px] text-muted">ESC</kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted">Sem resultados para «{query}»</p>
          )}
          {results.map((r, i) => (
            <button
              key={r.to + r.label}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.to)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm",
                i === active ? "bg-primary text-white" : "hover:bg-accent"
              )}
            >
              <span>{r.label}</span>
              <span className={cn("text-[11px]", i === active ? "text-white/60" : "text-muted")}>{r.group}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-muted">
          <span>↑↓ navegar · ↵ abrir · esc fechar</span>
          <span>redegest</span>
        </div>
      </div>
    </div>
  );
}
