import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";

interface PlaceholderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  fase?: string;
  bullets?: string[];
}

/** Página informativa para módulos do blueprint ainda por ligar ao backend. */
export default function Placeholder({ title, subtitle, icon: Icon = Construction, fase, bullets }: PlaceholderProps) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <CardContent className="flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
            <Icon className="h-7 w-7 text-secondary" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">Módulo especificado no blueprint</h3>
          <p className="mt-2 max-w-md text-sm text-muted">
            Esta página está desenhada na especificação do redegest{fase ? ` (${fase})` : ""}. A interface e os dados
            reais ligam-se nesta etapa do desenvolvimento.
          </p>
          {bullets && bullets.length > 0 && (
            <ul className="mt-5 max-w-md space-y-1.5 text-left text-sm text-muted">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
