import { GraduationCap, Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useExampleData } from "@/store/useExampleData";
import { STUDENTS } from "@/data/mock";
import { eur } from "@/lib/format";

export default function Estudantes() {
  const { enabled } = useExampleData();
  const receita = STUDENTS.reduce((s, x) => s + x.rent, 0);

  return (
    <>
      <PageHeader
        title="Estudantes"
        subtitle="Gestão de quartos académicos · Ano letivo 2025/2026"
        showExampleToggle
        actions={<Button><Plus size={16} /> Novo estudante</Button>}
      />

      {!enabled ? (
        <EmptyState
          icon={GraduationCap}
          title="Ative o Modo Estudante"
          description="Gere quartos partilhados, contratos por ano letivo e renovações em massa."
          ctaLabel="Adicionar primeiro estudante"
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Quartos ocupados" value="3/3" hint="100% ocupação" icon={GraduationCap} iconTone="success" />
            <StatCard label="Receita mensal" value={eur(receita)} hint="Quartos partilhados" />
            <StatCard label="Fim do ano letivo" value="31 jul" hint="Renovações em breve" hintTone="warning" />
            <StatCard label="Em atraso" value="1" hint="Inês Marques · 4 dias" hintTone="danger" />
          </div>

          <Card>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-ink">Apartamento Coimbra · 3 quartos</h3>
                <Button variant="outline" size="sm"><RefreshCw size={14} /> Renovar contratos</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {STUDENTS.map((s) => (
                  <div key={s.name} className="rounded-xl border border-line bg-bg p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink">{s.room}</span>
                      <Badge tone={s.status === "Em dia" ? "success" : "danger"}>{s.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink">{s.name}</p>
                    <p className="text-xs text-muted">{s.university} · {s.course} · {s.year}</p>
                    <p className="num mt-2 text-sm font-bold text-primary">{eur(s.rent)}/mês</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
