import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Wallet,
  PieChart as PieIcon,
  Plus,
  UserPlus,
  FileSignature,
  ReceiptText,
  KeyRound,
  ArrowRight,
  Lightbulb,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useExampleData } from "@/store/useExampleData";
import { useModalStore } from "@/store/useModalStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useTenantsStore } from "@/store/useTenantsStore";
import { useContractsStore, statusEfetivo } from "@/store/useContractsStore";
import { useAccountStore } from "@/store/useAccountStore";
import { MONTHLY_FLOW, ALERTS, UPCOMING } from "@/data/mock";
import { eur, pct } from "@/lib/format";

const sev: Record<string, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-secondary",
  success: "bg-success",
};

export default function Dashboard() {
  const { enabled } = useExampleData();
  const properties = usePropertiesStore((s) => s.properties);
  const openPropertyForm = useModalStore((s) => s.openPropertyForm);
  const openExpenseForm = useModalStore((s) => s.openExpenseForm);
  const openTenantForm = useModalStore((s) => s.openTenantForm);
  const openContractDoc = useModalStore((s) => s.openContractDoc);

  if (!enabled) {
    return (
      <>
        <PageHeader title="Bom dia, Daniel 👋" subtitle="Segunda-feira, 14 de junho de 2026" showExampleToggle />
        <EmptyState
          icon={Building2}
          title="Vamos preparar a sua conta"
          description="Adicione o seu primeiro imóvel para começar a gerir rendas, contratos, obras e finanças."
          ctaLabel="+ Adicionar primeiro imóvel"
          onCta={() => openPropertyForm()}
        />
      </>
    );
  }

  const total = properties.length;
  const ocupados = properties.filter((p) => p.status === "ocupado").length;
  const disponiveis = properties.filter((p) => p.status === "disponivel").length;
  const emObras = properties.filter((p) => p.status === "em_obras").length;
  const rendasMes = properties.reduce((sum, p) => sum + p.rendaMensal, 0);
  const ocupacao = total > 0 ? Math.round((ocupados / total) * 100) : 0;

  const donut = [
    { name: "Ocupados", value: ocupados, color: "#5C3D2E" },
    { name: "Outros", value: Math.max(total - ocupados, 0), color: "#E8D5BE" },
  ];

  return (
    <>
      <PageHeader
        title="Bom dia, Daniel 👋"
        subtitle="Segunda-feira, 14 de junho de 2026"
        showExampleToggle
        actions={
          <>
            <Button variant="outline" size="md" onClick={() => openPropertyForm()}>
              <Plus size={16} /> Imóvel
            </Button>
            <Button size="md" onClick={() => openTenantForm()}>
              <UserPlus size={16} /> Inquilino
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total imóveis" value={String(total)} hint={`${ocupados} ocupados`} icon={Building2} />
        <StatCard label="Imóveis arrendados" value={`${ocupados}/${total}`} hint={`${disponiveis} disponíveis`} icon={KeyRound} />
        <StatCard label="Rendas este mês" value={eur(rendasMes)} hint="+8% vs mês anterior" hintTone="success" icon={Wallet} iconTone="success" />
        <StatCard label="Taxa de ocupação" value={pct(ocupacao, 0)} hint={`${disponiveis} vago · ${emObras} em obras`} hintTone="warning" icon={PieIcon} iconTone="warning" />
      </div>

      {/* Ações rápidas */}
      <div className="mt-4 flex flex-wrap gap-2">
        <QuickAction icon={Plus} label="Adicionar imóvel" onClick={() => openPropertyForm()} />
        <QuickAction icon={UserPlus} label="Adicionar inquilino" onClick={() => openTenantForm()} />
        <QuickAction icon={FileSignature} label="Criar contrato" onClick={() => openContractDoc()} />
        <QuickAction icon={ReceiptText} label="Nova despesa" onClick={() => openExpenseForm({ initialTipo: "despesa" })} />
      </div>

      {/* Próximo passo sugerido (contextual, nunca uma checklist) */}
      <ProximoPasso />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Gráfico receita vs despesa */}
        <Card className="lg:col-span-2">
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink">Receitas vs Despesas · 2026</h3>
              <Link to="/financas/contabilidade" className="text-sm text-secondary hover:underline">
                Ver contabilidade →
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={MONTHLY_FLOW} barGap={4}>
                <CartesianGrid vertical={false} stroke="#E8D5BE" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} width={44} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E8D5BE", fontSize: 13 }} formatter={(v: number) => eur(v)} />
                <Bar dataKey="receita" name="Receita" fill="#5C3D2E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa" fill="#E8D5BE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardContent>
            <h3 className="mb-3 font-display text-lg font-semibold text-ink">Alertas urgentes</h3>
            <div className="space-y-1">
              {ALERTS.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-bg">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${sev[a.severity]}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{a.title}</p>
                    <p className="truncate text-xs text-muted">{a.context} · {a.when}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Próximos eventos */}
        <Card className="lg:col-span-2">
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink">Próximos vencimentos · 30 dias</h3>
              <Link to="/financas/calendario-investimento" className="text-sm text-secondary hover:underline">
                Ver calendário →
              </Link>
            </div>
            <div className="space-y-2">
              {UPCOMING.map((e, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-line/60 py-2 last:border-0">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-accent">
                    <span className="num text-sm font-bold leading-none text-primary">{e.day}</span>
                    <span className="text-[10px] uppercase text-muted">{e.month}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{e.title}</p>
                    <p className="truncate text-xs text-muted">{e.context}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Donut ocupação */}
        <Card>
          <CardContent className="flex flex-col items-center">
            <h3 className="mb-2 self-start font-display text-lg font-semibold text-ink">Ocupação</h3>
            <div className="relative">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius={56} outerRadius={80} startAngle={90} endAngle={-270} stroke="none">
                    {donut.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="num text-2xl font-bold text-ink">{pct(ocupacao, 0)}</span>
                <span className="text-xs text-muted">{ocupados}/{total}</span>
              </div>
            </div>
            <Link to="/imoveis" className="mt-2 text-sm text-secondary hover:underline">
              Ver imóveis <ArrowRight size={13} className="inline" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

interface Sugestao {
  msg: React.ReactNode;
  cta: string;
  onClick: () => void;
}

/** Sugestão contextual (uma de cada vez), fechável e rotativa. Nunca uma checklist. */
function ProximoPasso() {
  const navigate = useNavigate();
  const properties = usePropertiesStore((s) => s.properties);
  const tenants = useTenantsStore((s) => s.tenants);
  const contracts = useContractsStore((s) => s.contracts);
  const nif = useAccountStore((s) => s.privado.nif);
  const openTenantForm = useModalStore((s) => s.openTenantForm);
  const openContractDoc = useModalStore((s) => s.openContractDoc);
  const openListingForm = useModalStore((s) => s.openListingForm);
  const [idx, setIdx] = useState(0);

  const sugestoes: Sugestao[] = [];

  const semInquilino = properties.find(
    (p) => p.status !== "em_obras" && !tenants.some((t) => t.propertyId === p.id)
  );
  if (semInquilino)
    sugestoes.push({
      msg: <>Adicione um inquilino ao <strong>{semInquilino.name}</strong> para começar a registar rendas.</>,
      cta: "Adicionar inquilino",
      onClick: () => openTenantForm(),
    });

  const inquilinoSemContrato = tenants.find(
    (t) => t.propertyId && t.status !== "expirado" && !contracts.some((c) => c.primaryTenantId === t.id)
  );
  if (inquilinoSemContrato)
    sugestoes.push({
      msg: <>Crie o contrato de <strong>{inquilinoSemContrato.nomeCompleto}</strong> para tudo ficar formal.</>,
      cta: "Criar contrato",
      onClick: () => openContractDoc({ initialTenantId: inquilinoSemContrato.id, initialPropertyId: inquilinoSemContrato.propertyId ?? null }),
    });

  const temContratoAtivo = contracts.some((c) => ["active", "expiring"].includes(statusEfetivo(c)));
  if (temContratoAtivo && !nif.trim())
    sugestoes.push({
      msg: <>Preencha o seu <strong>NIF</strong> (1 minuto) para completar os dados fiscais.</>,
      cta: "Preencher NIF",
      onClick: () => navigate("/perfil"),
    });

  sugestoes.push({
    msg: <>Publique um imóvel na <strong>Rede de Investidores</strong> para encontrar parceiros.</>,
    cta: "Publicar anúncio",
    onClick: () => openListingForm(),
  });

  if (sugestoes.length === 0) return null;
  const s = sugestoes[idx % sugestoes.length];

  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-gold/25 bg-gold/5 p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
        <Lightbulb size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-dark">Próximo passo sugerido</p>
        <p className="text-sm text-ink">{s.msg}</p>
      </div>
      <button onClick={s.onClick} className="hidden shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-secondary sm:inline-flex">
        {s.cta} <ArrowRight size={14} />
      </button>
      <button onClick={() => setIdx((i) => i + 1)} title="Mostrar outra sugestão" className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-gold/10 hover:text-ink">
        <X size={16} />
      </button>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2 text-sm text-ink shadow-sm transition-colors hover:border-secondary/40 hover:bg-accent"
    >
      <Icon size={15} className="text-secondary" />
      {label}
    </button>
  );
}
