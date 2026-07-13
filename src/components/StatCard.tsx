import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "danger" | "warning" | "gold";

const iconToneMap: Record<Tone, string> = {
  default: "text-primary bg-accent",
  success: "text-success bg-success/10",
  danger: "text-danger bg-danger/10",
  warning: "text-warning bg-warning/12",
  gold: "text-gold-dark bg-gold/15",
};

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  hintTone?: Tone;
  icon?: LucideIcon;
  iconTone?: Tone;
}

export function StatCard({
  label,
  value,
  hint,
  hintTone = "default",
  icon: Icon,
  iconTone = "default",
}: StatCardProps) {
  const hintColor =
    hintTone === "success"
      ? "text-success"
      : hintTone === "danger"
        ? "text-danger"
        : hintTone === "warning"
          ? "text-warning"
          : "text-muted";
  return (
    <div className="flex items-start justify-between rounded-xl border border-line bg-card p-5">
      <div className="min-w-0">
        <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted">{label}</p>
        <p className="num mt-1.5 text-[26px] font-semibold leading-tight text-ink">{value}</p>
        {hint && <p className={cn("mt-1 text-xs", hintColor)}>{hint}</p>}
      </div>
      {Icon && (
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconToneMap[iconTone])}>
          <Icon size={18} />
        </div>
      )}
    </div>
  );
}
