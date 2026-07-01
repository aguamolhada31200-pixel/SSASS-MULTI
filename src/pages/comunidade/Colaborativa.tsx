import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Users2,
  ArrowRight,
  Hammer,
  Home,
  Sparkles,
  TrendingUp,
  Calendar,
  Banknote,
} from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import {
  useCollabStore,
  STATUS_LABEL,
  STATUS_TONE,
  TYPE_LABEL,
  type CollabType,
  type CollabProject,
} from "@/store/useCollabStore";
import { useExampleData } from "@/store/useExampleData";
import { useModalStore } from "@/store/useModalStore";
import { eur, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filtro = "todos" | CollabType;

function investimentoTotal(p: CollabProject): number {
  if (p.type === "reabilitacao")
    return (p.precoAquisicao ?? 0) + (p.custosAquisicao ?? 0) + (p.orcamentoObras ?? 0);
  return p.capitalInvestido ?? 0;
}

function lucroOuCashflow(p: CollabProject): number {
  if (p.type === "reabilitacao") {
    const inv = investimentoTotal(p);
    const venda = p.valorVendaReal ?? p.valorVendaPrevisto ?? 0;
    const maisValia = venda - inv;
    return maisValia * (1 - (p.taxaImpostos ?? 0) / 100);
  }
  return ((p.rendaMensal ?? 0) - (p.despesasMensais ?? 0)) * 12;
}

function metricLabel(p: CollabProject): string {
  return p.type === "reabilitacao" ? "Lucro líq. est." : "Cashflow anual";
}

function obraProgress(p: CollabProject): number | null {
  if (p.type !== "reabilitacao" || !p.orcamentoObras) return null;
  return Math.min(100, ((p.gastoObras ?? 0) / p.orcamentoObras) * 100);
}

export default function Colaborativa() {
  const { enabled } = useExampleData();
  const projects = useCollabStore((s) => s.projects);
  const openCollabForm = useModalStore((s) => s.openCollabForm);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const filtered = useMemo(() => {
    if (!enabled) return [];
    return projects
      .filter((p) => filtro === "todos" || p.type === filtro)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [projects, filtro, enabled]);

  const countReab = projects.filter((p) => p.type === "reabilitacao").length;
  const countArr = projects.filter((p) => p.type === "arrendamento").length;

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2E1A0E] via-[#5C3D2E] to-[#3a2417] px-6 pb-20 pt-12 text-sidebar-text sm:px-10">
        <div className="azulejo absolute inset-0 opacity-[0.06]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="mb-2 flex items-center gap-2 text-sm text-gold-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Comunidade
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            Gestão <span className="italic text-gold">colaborativa</span>
          </h1>
          <p className="mt-2 max-w-xl text-sidebar-text/70">
            Acompanhe finanças, obras e decisões com os seus sócios, em tempo
            real. Dois modelos — flip ou rendimento recorrente.
          </p>
        </div>
      </div>

      {/* Tabs + action */}
      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-line bg-card p-1 shadow-md">
            {([
              { key: "todos", label: "Todos", count: projects.length },
              { key: "reabilitacao", label: "Reabilitação", count: countReab },
              { key: "arrendamento", label: "Arrendamento", count: countArr },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setFiltro(t.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  filtro === t.key
                    ? "bg-gold text-sidebar"
                    : "text-muted hover:text-ink"
                )}
              >
                {t.key === "reabilitacao" && <Hammer size={13} />}
                {t.key === "arrendamento" && <Home size={13} />}
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    filtro === t.key
                      ? "bg-white/20 text-sidebar"
                      : "bg-accent text-muted"
                  )}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <Button variant="gold" size="sm" onClick={() => openCollabForm()}>
            <Plus size={15} /> Novo projeto
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {!enabled ? (
          <p className="rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center text-sm text-muted">
            Ative o toggle «Dados de exemplo» para explorar a Gestão
            Colaborativa.
          </p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center">
            <p className="text-sm text-muted">
              Nenhum projeto{" "}
              {filtro !== "todos" ? `do tipo ${TYPE_LABEL[filtro]}` : ""}{" "}
              encontrado.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setFiltro("todos")}
            >
              Ver todos
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((pr) => (
              <ProjectCard key={pr.id} project={pr} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Project Card ─────────────────────────

function ProjectCard({ project: pr }: { project: CollabProject }) {
  const donut = pr.partners.map((s) => ({
    name: s.name,
    value: s.pct,
    color: s.color,
  }));
  const inv = investimentoTotal(pr);
  const lucro = lucroOuCashflow(pr);
  const obra = obraProgress(pr);
  const isReab = pr.type === "reabilitacao";

  return (
    <Link
      to={`/comunidade/colaborativa/${pr.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Cover */}
      <div className="relative h-32 overflow-hidden">
        {pr.coverImageUrl ? (
          <img
            src={pr.coverImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#8B5E3C] to-[#5C3D2E]" />
        )}
        <div className="azulejo absolute inset-0 opacity-[0.08]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span className="font-display text-xs font-semibold text-white/70">
            PROJETO #{pr.number}
          </span>
          <Badge tone={STATUS_TONE[pr.status] as any}>
            {STATUS_LABEL[pr.status]}
          </Badge>
        </div>

        <div className="absolute bottom-3 left-3">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm",
              isReab
                ? "bg-secondary/15 text-white"
                : "bg-success/15 text-white"
            )}
          >
            {isReab ? (
              <span className="flex items-center gap-1">
                <Hammer size={10} /> Reabilitação
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Home size={10} /> Arrendamento
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex gap-3">
          {/* Donut */}
          <div className="relative h-16 w-16 shrink-0">
            <PieChart width={64} height={64}>
              <Pie
                data={donut}
                dataKey="value"
                innerRadius={20}
                outerRadius={30}
                stroke="none"
              >
                {donut.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
            <Users2 className="absolute inset-0 m-auto h-4 w-4 text-muted" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-semibold leading-snug text-ink transition-colors group-hover:text-secondary">
              {pr.title}
            </h3>
            <p className="text-xs text-muted">
              {pr.city} · {pr.partners.length} sócios
            </p>
          </div>
        </div>

        {/* Partners strip */}
        <div className="mt-3 flex flex-wrap gap-1">
          {pr.partners.map((s) => (
            <span
              key={s.id}
              className="flex items-center gap-1 rounded-full bg-bg px-2 py-0.5 text-[10px] text-muted"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: s.color }}
              />
              {s.name.split(" ")[0]} · {s.pct}%
            </span>
          ))}
        </div>

        {/* Obra progress (reab only) */}
        {obra !== null && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-medium uppercase tracking-wider text-muted">
                Obra
              </span>
              <span className="num font-semibold text-warning">
                {pct(obra, 0)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-accent">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  obra >= 100
                    ? "bg-success"
                    : obra >= 70
                      ? "bg-warning"
                      : "bg-gold"
                )}
                style={{ width: `${Math.min(100, obra)}%` }}
              />
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line/40 pt-3">
          <div>
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {isReab ? "Investimento" : "Capital investido"}
            </p>
            <p className="num text-[13px] font-bold text-ink">{eur(inv)}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {metricLabel(pr)}
            </p>
            <p className="num text-[13px] font-bold text-success">
              {eur(lucro)}
            </p>
          </div>
          {isReab && (
            <>
              <div>
                <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                  ROI
                </p>
                <p className="num text-[13px] font-bold text-gold-dark">
                  {inv > 0 ? pct((lucro / inv) * 100) : "—"}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                  Até venda
                </p>
                <p className="num text-[13px] font-bold text-ink">
                  {pr.dataVendaPrevista
                    ? monthsUntil(pr.dataVendaPrevista)
                    : "—"}
                </p>
              </div>
            </>
          )}
          {!isReab && (
            <>
              <div>
                <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                  Yield líq.
                </p>
                <p className="num text-[13px] font-bold text-gold-dark">
                  {pct(pr.yieldLiquido ?? 0)}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Ocupação
                </p>
                <p className="num text-[13px] font-bold text-success">
                  {pct(pr.taxaOcupacao ?? 0, 0)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-1 border-t border-line/60 px-4 py-2.5 text-sm text-secondary">
        Abrir projeto{" "}
        <ArrowRight
          size={14}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}

function monthsUntil(iso: string): string {
  const target = new Date(`${iso}T00:00:00`);
  const now = new Date();
  const diff =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());
  if (diff <= 0) return "iminente";
  return `${diff} ${diff === 1 ? "mês" : "meses"}`;
}
