import { useMemo, useState } from "react";
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
  CheckCircle2,
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
import { ChartCard } from "@/components/ui/chart-card";
import { useExampleData } from "@/store/useExampleData";
import { useModalStore } from "@/store/useModalStore";
import { usePropertiesStore, type Property } from "@/store/usePropertiesStore";
import { useTenantsStore } from "@/store/useTenantsStore";
import { useContractsStore, statusEfetivo, diasAteFim } from "@/store/useContractsStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useObrasStore } from "@/store/useObrasStore";
import { useAccountStore } from "@/store/useAccountStore";
import { computeImovel } from "@/lib/calc/imovel";
import { eur, pct, dataPTShort } from "@/lib/format";

const sev: Record<string, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-secondary",
  success: "bg-success",
};

const MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Saudação pela hora real do dia. */
function saudacao(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 13) return "Bom dia";
  if (h >= 13 && h < 20) return "Boa tarde";
  return "Boa noite";
}

/** "Segunda-feira, 6 de julho de 2026" — sempre a data de HOJE. */
function hojePT(): string {
  const s = new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface AlertaDash {
  id: string;
  severity: "danger" | "warning" | "info" | "success";
  title: string;
  context: string;
  when: string;
}

interface EventoDash {
  data: Date;
  title: string;
  context: string;
}

export default function Dashboard() {
  const { enabled } = useExampleData();
  const properties = usePropertiesStore((s) => s.properties);
  const tenants = useTenantsStore((s) => s.tenants);
  const contracts = useContractsStore((s) => s.contracts);
  const transactions = useTransactionsStore((s) => s.transactions);
  const obras = useObrasStore((s) => s.obras);
  const nomeConta = useAccountStore((s) => s.privado.nomeCompleto);
  const openPropertyForm = useModalStore((s) => s.openPropertyForm);
  const openExpenseForm = useModalStore((s) => s.openExpenseForm);
  const openTenantForm = useModalStore((s) => s.openTenantForm);
  const openContractDoc = useModalStore((s) => s.openContractDoc);

  const primeiroNome = (nomeConta || "").trim().split(" ")[0] || "investidor";

  // ── KPIs derivados da carteira ──
  const total = properties.length;
  const ocupados = properties.filter((p) => p.status === "ocupado").length;
  const disponiveis = properties.filter((p) => p.status === "disponivel").length;
  const emObras = properties.filter((p) => p.status === "em_obras").length;
  const rendasEsperadas = properties
    .filter((p) => p.status === "ocupado")
    .reduce((sum, p) => sum + p.rendaMensal, 0);
  const ocupacao = total > 0 ? Math.round((ocupados / total) * 100) : 0;

  const mesCorrente = new Date().toISOString().slice(0, 7);
  const rendasRecebidas = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.tipo === "receita" &&
            (t.categoria === "Renda" || t.categoria === "Receita AL") &&
            t.data.startsWith(mesCorrente)
        )
        .reduce((s, t) => s + t.valor, 0),
    [transactions, mesCorrente]
  );

  // ── Receitas vs Despesas do ano — derivado dos movimentos reais ──
  const fluxoMensal = useMemo(() => {
    const ano = new Date().getFullYear();
    const rows = MESES_CURTO.map((mes) => ({ mes, receita: 0, despesa: 0 }));
    for (const t of transactions) {
      const d = new Date(`${t.data}T00:00:00`);
      if (d.getFullYear() !== ano) continue;
      if (t.tipo === "receita") rows[d.getMonth()].receita += t.valor;
      else rows[d.getMonth()].despesa += t.valor;
    }
    return rows;
  }, [transactions]);

  // Nome do inquilino/imóvel de um contrato (labels do contrato → stores → genérico)
  const rotuloContrato = useMemo(() => {
    return (c: (typeof contracts)[number]) => {
      const inq =
        c.inquilinoLabel ||
        tenants.find((t) => t.id === c.primaryTenantId)?.nomeCompleto ||
        "Inquilino";
      const imv =
        c.imovelLabel || properties.find((p) => p.id === c.propertyId)?.name || "Imóvel";
      return `${inq} · ${imv}`;
    };
  }, [contracts, tenants, properties]);

  // ── Alertas urgentes — derivados da carteira real ──
  const alertas = useMemo<AlertaDash[]>(() => {
    const out: AlertaDash[] = [];
    const hoje = new Date();

    // Rendas do mês em falta (só imóveis com histórico de rendas registadas)
    for (const p of properties) {
      if (p.status !== "ocupado" || p.rendaMensal <= 0) continue;
      const rendasP = transactions.filter(
        (t) => t.propertyId === p.id && t.tipo === "receita" && t.categoria === "Renda"
      );
      if (rendasP.length === 0) continue; // sem registos ≠ atraso
      if (rendasP.some((t) => t.data.startsWith(mesCorrente))) continue;
      const contrato = contracts.find(
        (c) => c.propertyId === p.id && ["active", "expiring"].includes(statusEfetivo(c))
      );
      const diaVenc = (contrato as { paymentDay?: number } | undefined)?.paymentDay ?? 8;
      if (hoje.getDate() <= diaVenc) continue; // ainda dentro do prazo → não é atraso
      const t = tenants.find((x) => x.propertyId === p.id && x.status !== "expirado");
      out.push({
        id: `renda-${p.id}`,
        severity: "danger",
        title: `Renda em atraso · ${eur(p.rendaMensal)}`,
        context: `${t?.nomeCompleto ?? "Inquilino"} · ${p.name}`,
        when: `venceu dia ${diaVenc}`,
      });
    }

    // Contratos a expirar (≤ 45 dias)
    for (const c of contracts) {
      const st = statusEfetivo(c);
      if (!["active", "expiring"].includes(st)) continue;
      const d = diasAteFim(c.endDate);
      if (d === null || d < 0 || d > 45) continue;
      out.push({
        id: `contrato-${c.id}`,
        severity: "warning",
        title: `Contrato expira em ${d} dias`,
        context: rotuloContrato(c),
        when: dataPTShort(c.endDate ?? ""),
      });
    }

    // Imóveis disponíveis (custo de estar vago)
    for (const p of properties) {
      if (p.status !== "disponivel") continue;
      const k = computeImovel(p);
      out.push({
        id: `vago-${p.id}`,
        severity: "warning",
        title: `${p.name} disponível`,
        context: `Cada mês vago custa ~${eur(Math.round(k.totalDespesasMensais))}`,
        when: "para arrendar",
      });
    }

    // Obras atrasadas
    for (const o of obras) {
      if (o.estado === "concluida") continue;
      if (!o.dataFimPrevista) continue;
      const fim = new Date(`${o.dataFimPrevista}T00:00:00`);
      if (fim.getTime() >= hoje.getTime()) continue;
      const dias = Math.floor((hoje.getTime() - fim.getTime()) / 86400000);
      if (dias <= 0) continue;
      const prop = properties.find((p) => p.id === o.propertyId);
      out.push({
        id: `obra-${o.id}`,
        severity: "warning",
        title: `Obra atrasada · ${o.titulo}`,
        context: prop?.name ?? "Projeto colaborativo",
        when: `${dias}d além do previsto`,
      });
    }

    const ordem = { danger: 0, warning: 1, info: 2, success: 3 } as const;
    return out.sort((a, b) => ordem[a.severity] - ordem[b.severity]).slice(0, 5);
  }, [properties, transactions, contracts, tenants, obras, mesCorrente, rotuloContrato]);

  // ── Próximos vencimentos (30 dias) — derivados ──
  const vencimentos = useMemo<EventoDash[]>(() => {
    const out: EventoDash[] = [];
    const hoje = new Date();
    const fim30 = new Date(hoje.getTime() + 30 * 86400000);
    const dentro = (d: Date) => d >= hoje && d <= fim30;

    for (const c of contracts) {
      if (!c.endDate || !["active", "expiring"].includes(statusEfetivo(c))) continue;
      const d = new Date(`${c.endDate}T00:00:00`);
      if (!dentro(d)) continue;
      out.push({
        data: d,
        title: "Fim de contrato",
        context: rotuloContrato(c),
      });
    }

    for (const o of obras) {
      if (o.estado === "concluida" || !o.dataFimPrevista) continue;
      const d = new Date(`${o.dataFimPrevista}T00:00:00`);
      if (!dentro(d)) continue;
      const prop = properties.find((p) => p.id === o.propertyId);
      out.push({ data: d, title: "Fim de obra previsto", context: `${o.titulo} · ${prop?.name ?? "projeto"}` });
    }

    // Prestações legais de IMI (31 mai · 31 ago · 30 nov)
    const ano = hoje.getFullYear();
    const prestacoesImi = [new Date(ano, 4, 31), new Date(ano, 7, 31), new Date(ano, 10, 30)];
    for (const d of prestacoesImi) {
      if (!dentro(d)) continue;
      const totalImi = properties.reduce((s, p) => s + p.imiAnual, 0);
      if (totalImi > 0) out.push({ data: d, title: "IMI — prestação", context: `Carteira · total anual ${eur(totalImi)}` });
    }

    return out.sort((a, b) => a.data.getTime() - b.data.getTime()).slice(0, 6);
  }, [contracts, obras, properties, rotuloContrato]);

  if (!enabled) {
    return (
      <>
        <PageHeader title={`${saudacao()}, ${primeiroNome}`} subtitle={hojePT()} showExampleToggle />
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

  const donut = [
    { name: "Ocupados", value: ocupados, color: "#5C3D2E" },
    { name: "Outros", value: Math.max(total - ocupados, 0), color: "#E8D5BE" },
  ];

  return (
    <>
      <PageHeader
        title={`${saudacao()}, ${primeiroNome}`}
        subtitle={hojePT()}
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
        <StatCard
          label="Rendas este mês"
          value={eur(rendasEsperadas)}
          hint={`${eur(rendasRecebidas)} já recebidos`}
          hintTone={rendasRecebidas >= rendasEsperadas && rendasEsperadas > 0 ? "success" : "warning"}
          icon={Wallet}
          iconTone="success"
        />
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
        <ChartCard
          title={`Receitas vs Despesas · ${new Date().getFullYear()}`}
          className="lg:col-span-2"
          action={
            <Link to="/financas/contabilidade" className="text-sm text-secondary hover:underline">
              Ver contabilidade →
            </Link>
          }
        >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={fluxoMensal} barGap={4}>
                <CartesianGrid vertical={false} stroke="#E8D5BE" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} width={44} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E8D5BE", fontSize: 13 }} formatter={(v: number) => eur(v)} />
                <Bar dataKey="receita" name="Receita" fill="#5C3D2E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa" fill="#E8D5BE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
        </ChartCard>

        {/* Alertas — derivados da carteira */}
        <Card>
          <CardContent>
            <h3 className="mb-3 font-display text-lg font-semibold text-ink">Alertas urgentes</h3>
            {alertas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <CheckCircle2 size={28} className="text-success" />
                <p className="text-sm text-muted">Sem alertas — está tudo em dia.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {alertas.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-bg">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${sev[a.severity]}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{a.title}</p>
                      <p className="truncate text-xs text-muted">{a.context} · {a.when}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Próximos eventos — derivados */}
        <Card className="lg:col-span-2">
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink">Próximos vencimentos · 30 dias</h3>
              <Link to="/financas/calendario-investimento" className="text-sm text-secondary hover:underline">
                Ver calendário →
              </Link>
            </div>
            {vencimentos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">Nada a vencer nos próximos 30 dias.</p>
            ) : (
              <div className="space-y-2">
                {vencimentos.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-line/60 py-2 last:border-0">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-accent">
                      <span className="num text-sm font-bold leading-none text-primary">{e.data.getDate()}</span>
                      <span className="text-[10px] uppercase text-muted">{MESES_CURTO[e.data.getMonth()]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{e.title}</p>
                      <p className="truncate text-xs text-muted">{e.context}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donut ocupação */}
        <ChartCard title="Ocupação" contentClassName="flex flex-col items-center">
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
        </ChartCard>
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
    (p: Property) => p.status !== "em_obras" && !tenants.some((t) => t.propertyId === p.id)
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
