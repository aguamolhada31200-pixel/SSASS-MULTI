import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputCls =
  "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export function Toggle({
  on,
  onChange,
  tone = "primary",
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  tone?: "primary" | "success";
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
        on ? (tone === "success" ? "bg-success" : "bg-primary") : "bg-line"
      )}
    >
      <span className={cn("h-4 w-4 rounded-full bg-white shadow transition-transform", on && "translate-x-4")} />
    </button>
  );
}

export function SectionCard({
  title,
  icon: Icon,
  badge,
  desc,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {Icon && <Icon size={17} className="text-secondary" />}
        <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
        {badge}
      </div>
      {desc && <p className="-mt-2 mb-4 text-xs text-muted">{desc}</p>}
      {children}
    </section>
  );
}
