import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "danger" | "warning" | "gold" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-accent text-muted",
  success: "bg-success/12 text-success",
  danger: "bg-danger/12 text-danger",
  warning: "bg-warning/15 text-warning",
  gold: "bg-gold/15 text-gold-dark",
  info: "bg-secondary/12 text-secondary",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
