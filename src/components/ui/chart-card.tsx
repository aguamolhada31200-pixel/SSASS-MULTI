import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

// Cartão padrão para gráficos (anatomia shadcn Card adaptada ao design madeira):
// título limpo no header, descrição opcional, gráfico no content sem padding-top.
// Só apresentação — a lógica e os dados dos gráficos vivem em quem o usa.

interface ChartCardProps {
  title: string;
  description?: string;
  /** Elemento à direita do título (ex.: toggle, seletor de ano) */
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, description, action, className, contentClassName, children }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className={cn(action && "flex-row items-start justify-between space-y-0 gap-2")}>
        {action ? (
          <>
            <div className="space-y-1.5">
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {action}
          </>
        ) : (
          <>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </>
        )}
      </CardHeader>
      <CardContent className={cn("pt-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
