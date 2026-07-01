import type { LucideIcon } from "lucide-react";
import { Button } from "./ui/Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon: Icon, title, description, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center animate-fade-in">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-accent">
        <Icon className="h-9 w-9 text-secondary" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>
      {ctaLabel && (
        <Button className="mt-6" onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
