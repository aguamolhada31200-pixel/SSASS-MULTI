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
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {showExampleToggle && <ExampleDataToggle />}
        {actions}
      </div>
    </div>
  );
}
