import { useMemo } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useExampleData } from "@/store/useExampleData";
import { useTenantsStore, type Tenant } from "@/store/useTenantsStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useModalStore } from "@/store/useModalStore";
import { eur, dataPT } from "@/lib/format";

/** Ano letivo corrente: de setembro a agosto (jul 2026 → "2025/2026"). */
function anoLetivoAtual(): string {
  const d = new Date();
  const y = d.getFullYear();
  return d.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

export default function Estudantes() {
  const { enabled } = useExampleData();
  const tenants = useTenantsStore((s) => s.tenants);
  const properties = usePropertiesStore((s) => s.properties);
  const openTenantForm = useModalStore((s) => s.openTenantForm);

  // Derivado dos inquilinos reais — a mesma pessoa, a mesma renda em toda a app.
  const estudantes = useMemo(
    () => (enabled ? tenants.filter((t) => t.tipoInquilino === "estudante") : []),
    [tenants, enabled]
  );

  const ativos = estudantes.filter((t) => t.status === "ativo");
  const preReservas = estudantes.filter((t) => t.status === "sem_contrato");
  const receitaMensal = ativos.reduce((s, t) => s + (t.rendaMensal ?? 0), 0);
  const fimAnoLetivo = ativos
    .map((t) => t.dataFimContrato)
    .filter((d): d is string => !!d)
    .sort()
    .pop();

  // Agrupar por imóvel
  const grupos = useMemo(() => {
    const map = new Map<string, Tenant[]>();
    for (const t of estudantes) {
      const key = t.propertyId ?? "sem-imovel";
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return Array.from(map.entries());
  }, [estudantes]);

  return (
    <>
      <PageHeader
        title="Estudantes"
        subtitle={`Gestão de quartos académicos · Ano letivo ${anoLetivoAtual()}`}
        showExampleToggle
        actions={<Button onClick={() => openTenantForm()}><Plus size={16} /> Novo estudante</Button>}
      />

      {!enabled || estudantes.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Sem estudantes registados"
          description="Adicione inquilinos do tipo «Estudante» para gerir quartos partilhados, contratos por ano letivo e renovações."
          ctaLabel="Adicionar primeiro estudante"
          onCta={() => openTenantForm()}
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Estudantes" value={String(estudantes.length)} hint={`${ativos.length} com contrato ativo`} icon={GraduationCap} iconTone="success" />
            <StatCard label="Receita mensal" value={eur(receitaMensal)} hint="Quartos com contrato ativo" />
            <StatCard
              label="Fim do ano letivo"
              value={fimAnoLetivo ? dataPT(fimAnoLetivo) : "—"}
              hint={fimAnoLetivo ? "Renovações em breve" : "Sem contratos ativos"}
              hintTone="warning"
            />
            <StatCard label="Pré-reservas" value={String(preReservas.length)} hint="Sem contrato (próximo ano)" hintTone={preReservas.length > 0 ? "warning" : undefined} />
          </div>

          {grupos.map(([propertyId, lista]) => {
            const prop = properties.find((p) => p.id === propertyId);
            return (
              <Card key={propertyId} className="mb-4">
                <CardContent>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display text-base font-semibold text-ink">
                      {prop ? `${prop.name} · ${prop.city}` : "Sem imóvel associado"}
                      {prop?.status === "em_obras" && (
                        <span className="ml-2 align-middle"><Badge tone="warning">Em obras</Badge></span>
                      )}
                    </h3>
                    {prop && (
                      <Link to={`/imoveis/${prop.id}`} className="text-sm text-secondary hover:underline">
                        Ver imóvel →
                      </Link>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {lista.map((t) => (
                      <Link
                        key={t.id}
                        to={`/pessoas/inquilinos/${t.id}`}
                        className="rounded-xl border border-line bg-bg p-4 transition-colors hover:border-secondary/40"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-ink">{t.nomeCompleto}</span>
                          <Badge tone={t.status === "ativo" ? "success" : t.status === "sem_contrato" ? "warning" : "danger"}>
                            {t.status === "ativo" ? "Ativo" : t.status === "sem_contrato" ? "Pré-reserva" : "Expirado"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {[t.universidade, t.curso, t.anoLetivo].filter(Boolean).join(" · ") || "Dados académicos por preencher"}
                        </p>
                        <p className="num mt-2 text-sm font-bold text-primary">
                          {t.rendaMensal ? `${eur(t.rendaMensal)}/mês` : "Renda por definir"}
                        </p>
                        {t.dataFimContrato && (
                          <p className="mt-0.5 text-[11px] text-muted">Contrato até {dataPT(t.dataFimContrato)}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}
    </>
  );
}
