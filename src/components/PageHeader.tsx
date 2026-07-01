import { ExampleDataToggle } from "./ExampleDataToggle";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showExampleToggle?: boolean;
}

export function PageHeader({ title, subtitle, actions, showExampleToggle }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {showExampleToggle && <ExampleDataToggle />}
        {actions}
      </div>
    </div>
  );
}
