import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "danger" | "warning" | "gold" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-accent text-muted",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
  gold: "bg-gold/10 text-gold-dark",
  info: "bg-secondary/10 text-secondary",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-[3px] text-[11px] font-medium uppercase tracking-[0.04em]",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
