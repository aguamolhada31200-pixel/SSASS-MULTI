import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
  ReceiptText,
  Pencil,
  Trash2,
  Search,
  Filter,
  X,
  Sparkles,
  Paperclip,
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
  Legend,
} from "recharts";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/Card";
import { ChartCard } from "@/components/ui/chart-card";
import { Badge } from "@/components/ui/Badge";
import { useExampleData } from "@/store/useExampleData";
import { useModalStore } from "@/store/useModalStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import {
  useTransactionsStore,
  CATEGORIAS_DESPESA,
  CATEGORIAS_RECEITA,
  type Transaction,
  type TipoMov,
} from "@/store/useTransactionsStore";
import { eur, eurSigned, dataPTShort, pct } from "@/lib/format";
import { toCsv, downloadFile } from "@/lib/csv";
import { cn } from "@/lib/utils";

type Periodo = "mes" | "trimestre" | "ano" | "tudo";

const PERIODO_LABEL: Record<Periodo, string> = {
  mes: "Este mês",
  trimestre: "Trimestre",
  ano: "Ano",
  tudo: "Tudo",
};

const TIPO_LABEL: Record<"todos" | TipoMov, string> = {
  todos: "Todos",
  receita: "Receitas",
  despesa: "Despesas",
};

const TODAS_CATEGORIAS = Array.from(
  new Set<string>([...CATEGORIAS_DESPESA, ...CATEGORIAS_RECEITA])
);

const PAGE_SIZE = 10;

function periodoFiltro(t: Transaction, p: Periodo, hoje = new Date()): boolean {
  if (p === "tudo") return true;
  const d = new Date(`${t.data}T00:00:00`);
  if (p === "mes") return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
  if (p === "ano") return d.getFullYear() === hoje.getFullYear();
  // trimestre = últimos 3 meses incluindo o corrente
  const limite = new Date(hoje);
  limite.setMonth(limite.getMonth() - 2);
  limite.setDate(1);
  return d >= limite;
}

function ytdFiltro(t: Transaction, hoje = new Date()): boolean {
  return new Date(`${t.data}T00:00:00`).getFullYear() === hoje.getFullYear();
}

function nomeMesCurto(m: number): string {
  return ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][m];
}

export default function Contabilidade() {
  const { enabled } = useExampleData();
  const allTransactions = useTransactionsStore((s) => s.transactions);
  const removeTx = useTransactionsStore((s) => s.remove);
  const properties = usePropertiesStore((s) => s.properties);
  const openExpenseForm = useModalStore((s) => s.openExpenseForm);

  // Deep-link (ex.: Balanço/IRS → "Ver movimentos"): ?imovel=<id>&periodo=ano
  const [searchParams] = useSearchParams();
  const periodoParam = searchParams.get("periodo") as Periodo | null;
  const [periodo, setPeriodo] = useState<Periodo>(periodoParam && periodoParam in PERIODO_LABEL ? periodoParam : "ano");
  const [propertyId, setPropertyId] = useState<string>(searchParams.get("imovel") ?? "todos");
  const [categoria, setCategoria] = useState<string>("todas");
  const [tipo, setTipo] = useState<"todos" | TipoMov>("todos");
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [txAEliminar, setTxAEliminar] = useState<Transaction | null>(null);

  const transactions = enabled ? allTransactions : [];
  const propMap = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);

  // Filtragem principal
  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return transactions
      .filter((t) => periodoFiltro(t, periodo))
      .filter((t) => propertyId === "todos" || t.propertyId === propertyId)
      .filter((t) => categoria === "todas" || t.categoria === categoria)
      .filter((t) => tipo === "todos" || t.tipo === tipo)
      .filter((t) => {
        if (!q) return true;
        return (
          t.descricao.toLowerCase().includes(q) ||
          t.categoria.toLowerCase().includes(q) ||
          (propMap.get(t.propertyId)?.name ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [transactions, periodo, propertyId, categoria, tipo, busca, propMap]);

  // KPIs do período filtrado
  const kpis = useMemo(() => {
    let rec = 0,
      desp = 0,
      despDed = 0;
    for (const t of filtered) {
      if (t.tipo === "receita") rec += t.valor;
      else {
        desp += t.valor;
        if (t.deduzivelIrs) despDed += t.valor;
      }
    }
    return {
      receitas: rec,
      despesas: desp,
      liquido: rec - desp,
      pctDeduzivel: desp > 0 ? (despDed / desp) * 100 : 0,
    };
  }, [filtered]);

  // Saldo YTD (independente dos filtros — sempre ano corrente)
  const ytdSaldo = useMemo(() => {
    let rec = 0,
      desp = 0;
    for (const t of transactions) {
      if (!ytdFiltro(t)) continue;
      if (t.tipo === "receita") rec += t.valor;
      else desp += t.valor;
    }
    return rec - desp;
  }, [transactions]);

  // Série mensal (ano corrente)
  const serieMensal = useMemo(() => {
    const meses: { mes: string; Receita: number; Despesa: number }[] = Array.from(
      { length: 12 },
      (_, i) => ({ mes: nomeMesCurto(i), Receita: 0, Despesa: 0 })
    );
    for (const t of filtered) {
      const d = new Date(`${t.data}T00:00:00`);
      const row = meses[d.getMonth()];
      if (t.tipo === "receita") row.Receita += t.valor;
      else row.Despesa += t.valor;
    }
    return meses;
  }, [filtered]);

  // Distribuição despesas por categoria
  const donutDespesas = useMemo(() => {
    const palette = ["#5C3D2E", "#8B5E3C", "#C8A664", "#9B3A2A", "#C17E2A", "#6B4C3B", "#E8D5BE", "#9B7F3F", "#4A7C59", "#2E1A0E"];
    const map = new Map<string, number>();
    for (const t of filtered) {
      if (t.tipo !== "despesa") continue;
      map.set(t.categoria, (map.get(t.categoria) ?? 0) + t.valor);
    }
    return Array.from(map.entries())
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const exportar = () => {
    if (filtered.length === 0) {
      toastInfo("Nada para exportar");
      return;
    }
    const csv = toCsv(filtered, [
      { header: "Data", accessor: (t) => t.data },
      { header: "Tipo", accessor: (t) => t.tipo },
      { header: "Imóvel", accessor: (t) => propMap.get(t.propertyId)?.name ?? "—" },
      { header: "Categoria", accessor: (t) => t.categoria },
      { header: "Descrição", accessor: (t) => t.descricao },
      { header: "Valor", accessor: (t) => (t.tipo === "despesa" ? -t.valor : t.valor) },
      { header: "Dedutível IRS", accessor: (t) => (t.deduzivelIrs ? "Sim" : "Não") },
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`contabilidade-${stamp}.csv`, csv);
    toastSuccess("CSV exportado", { description: `${filtered.length} movimentos` });
  };

  const resetFiltros = () => {
    setPeriodo("ano");
    setPropertyId("todos");
    setCategoria("todas");
    setTipo("todos");
    setBusca("");
    setPage(0);
  };

  const onDelete = (t: Transaction) => setTxAEliminar(t);
  const doDelete = () => {
    if (!txAEliminar) return;
    removeTx(txAEliminar.id);
    toastSuccess("Movimento eliminado");
    setTxAEliminar(null);
  };

  return (
    <>
      <PageHeader
        title="Contabilidade"
        subtitle="Livro-razão de todos os imóveis · receitas, despesas e dedutíveis em IRS."
        showExampleToggle
        actions={
          <>
            <Button variant="outline" size="md" onClick={() => openExpenseForm({ initialTipo: "receita" })}>
              <Plus size={16} /> Receita
            </Button>
            <Button size="md" onClick={() => openExpenseForm({ initialTipo: "despesa" })}>
              <Plus size={16} /> Despesa
            </Button>
            <Button variant="ghost" size="md" onClick={exportar} title="Exportar CSV">
              <Download size={16} /> Exportar
            </Button>
          </>
        }
      />

      {!enabled || transactions.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={enabled ? "Ainda não há movimentos" : "Comece a registar as suas finanças"}
          description="Registe receitas e despesas para acompanhar o resultado de cada imóvel e preparar o IRS."
          ctaLabel="+ Registar primeiro movimento"
          onCta={() => openExpenseForm({ initialTipo: "despesa" })}
        />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Receitas" value={eur(kpis.receitas)} icon={TrendingUp} iconTone="success" hint={PERIODO_LABEL[periodo]} />
            <StatCard label="Despesas" value={eur(kpis.despesas)} icon={TrendingDown} iconTone="danger" hint={PERIODO_LABEL[periodo]} />
            <StatCard
              label="Resultado líquido"
              value={eurSigned(kpis.liquido)}
              icon={Wallet}
              iconTone={kpis.liquido >= 0 ? "success" : "danger"}
              hint={kpis.liquido >= 0 ? "Positivo" : "Negativo"}
              hintTone={kpis.liquido >= 0 ? "success" : "danger"}
            />
            <StatCard
              label="Saldo do ano (YTD)"
              value={eurSigned(ytdSaldo)}
              hint="Acumulado 2026"
              hintTone={ytdSaldo >= 0 ? "success" : "danger"}
            />
            <StatCard label="% deduzível em IRS" value={pct(kpis.pctDeduzivel, 0)} hint="das despesas" />
          </div>

          {/* Filtros */}
          <div className="mt-5">
            <Filtros
              periodo={periodo}
              setPeriodo={setPeriodo}
              propertyId={propertyId}
              setPropertyId={setPropertyId}
              categoria={categoria}
              setCategoria={setCategoria}
              tipo={tipo}
              setTipo={setTipo}
              busca={busca}
              setBusca={setBusca}
              properties={properties}
              onReset={resetFiltros}
              drawerOpen={drawerOpen}
              setDrawerOpen={setDrawerOpen}
            />
          </div>

          {/* Gráficos */}
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <ChartCard title="Receitas vs Despesas — 2026" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={serieMensal} barGap={4}>
                    <CartesianGrid vertical={false} stroke="#E8D5BE" />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#6B4C3B", fontSize: 12 }}
                      width={44}
                      tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${v / 1000}k` : String(v))}
                    />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => eur(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Receita" fill="#4A7C59" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesa" fill="#9B3A2A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Despesas por categoria">
                {donutDespesas.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted">Sem despesas no período.</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={donutDespesas} dataKey="value" innerRadius={48} outerRadius={78} stroke="none">
                          {donutDespesas.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => eur(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-1.5">
                      {donutDespesas.slice(0, 5).map((d) => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-muted">
                            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                            {d.name}
                          </span>
                          <span className="num font-medium text-ink">{eur(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
            </ChartCard>
          </div>

          {/* Tabela / cards */}
          <Card className="mt-5">
            <CardContent className="p-0 sm:p-0">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <h3 className="font-display text-base font-semibold text-ink">
                  Movimentos <span className="text-sm font-normal text-muted">· {filtered.length}</span>
                </h3>
                <p className="text-xs text-muted">
                  Página {safePage + 1} de {totalPages}
                </p>
              </div>

              {filtered.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted">Sem movimentos para estes filtros.</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <table className="w-full text-sm">
                      <thead className="bg-bg text-left text-xs font-medium uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-5 py-3">Data</th>
                          <th className="px-2 py-3">Tipo</th>
                          <th className="px-2 py-3">Imóvel</th>
                          <th className="px-2 py-3">Categoria</th>
                          <th className="px-2 py-3">Descrição</th>
                          <th className="px-2 py-3 text-right">Valor</th>
                          <th className="px-2 py-3 text-center">Recibo</th>
                          <th className="px-2 py-3 text-center">IRS</th>
                          <th className="px-5 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((t) => {
                          const prop = propMap.get(t.propertyId);
                          const isRec = t.tipo === "receita";
                          return (
                            <tr
                              key={t.id}
                              onClick={() => openExpenseForm({ editingId: t.id })}
                              className="cursor-pointer border-t border-line/60 hover:bg-bg"
                            >
                              <td className="px-5 py-3 text-muted">{dataPTShort(t.data)}</td>
                              <td className="px-2 py-3">
                                <Badge tone={isRec ? "success" : "danger"}>
                                  {isRec ? "Receita" : "Despesa"}
                                </Badge>
                              </td>
                              <td className="px-2 py-3 text-ink">{prop?.name ?? "—"}</td>
                              <td className="px-2 py-3 text-muted">{t.categoria}</td>
                              <td className="px-2 py-3 text-ink">
                                <span className="block max-w-[28ch] truncate">{t.descricao}</span>
                                {t.recorrente && (
                                  <span className="text-[10px] uppercase tracking-wide text-muted">
                                    ↻ {t.periodicidade}
                                  </span>
                                )}
                              </td>
                              <td
                                className={cn("num px-2 py-3 text-right font-semibold", isRec ? "text-success" : "text-danger")}
                              >
                                {isRec ? "+" : "−"}
                                {eur(t.valor)}
                              </td>
                              <td className="px-2 py-3 text-center">
                                {t.reciboUrl && <Paperclip size={13} className="mx-auto text-muted" />}
                              </td>
                              <td className="px-2 py-3 text-center">
                                {t.deduzivelIrs && <Sparkles size={13} className="mx-auto text-gold-dark" />}
                              </td>
                              <td className="px-5 py-3 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openExpenseForm({ editingId: t.id });
                                    }}
                                    className="rounded-md p-1 text-muted hover:bg-accent hover:text-ink"
                                    title="Editar"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDelete(t);
                                    }}
                                    className="rounded-md p-1 text-muted hover:bg-danger/10 hover:text-danger"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="space-y-2 p-3 md:hidden">
                    {pageRows.map((t) => {
                      const prop = propMap.get(t.propertyId);
                      const isRec = t.tipo === "receita";
                      return (
                        <button
                          key={t.id}
                          onClick={() => openExpenseForm({ editingId: t.id })}
                          className="flex w-full items-start justify-between gap-3 rounded-xl border border-line bg-card p-3 text-left hover:bg-bg"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted">{dataPTShort(t.data)} · {prop?.name ?? "—"}</p>
                            <p className="truncate text-sm font-medium text-ink">{t.descricao}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              <Badge tone={isRec ? "success" : "danger"}>{isRec ? "Receita" : "Despesa"}</Badge>
                              <span className="text-[11px] text-muted">{t.categoria}</span>
                              {t.deduzivelIrs && <Badge tone="gold">IRS</Badge>}
                            </div>
                          </div>
                          <div className={cn("num shrink-0 text-right text-base font-bold", isRec ? "text-success" : "text-danger")}>
                            {isRec ? "+" : "−"}
                            {eur(t.valor)}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(p - 1, 0))}
                        disabled={safePage === 0}
                      >
                        ← Anterior
                      </Button>
                      <p className="text-xs text-muted">
                        {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                        disabled={safePage >= totalPages - 1}
                      >
                        Seguinte →
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {txAEliminar && (
        <ConfirmDialog
          titulo="Eliminar movimento"
          mensagem={`Eliminar este movimento de ${eur(txAEliminar.valor)}?`}
          cta="Eliminar"
          onClose={() => setTxAEliminar(null)}
          onConfirm={doDelete}
        />
      )}
    </>
  );
}

const tooltipStyle = { borderRadius: 12, border: "1px solid #E8D5BE", fontSize: 13 } as const;

// ───────────────────────── Filtros ─────────────────────────
interface FiltrosProps {
  periodo: Periodo;
  setPeriodo: (p: Periodo) => void;
  propertyId: string;
  setPropertyId: (id: string) => void;
  categoria: string;
  setCategoria: (c: string) => void;
  tipo: "todos" | TipoMov;
  setTipo: (t: "todos" | TipoMov) => void;
  busca: string;
  setBusca: (q: string) => void;
  properties: { id: string; name: string }[];
  onReset: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
}

function Filtros(p: FiltrosProps) {
  const Body = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {/* Período */}
      <div className="lg:col-span-2">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Período</p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PERIODO_LABEL) as Periodo[]).map((per) => (
            <button
              key={per}
              onClick={() => p.setPeriodo(per)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                p.periodo === per
                  ? "bg-primary text-white"
                  : "border border-line bg-card text-muted hover:bg-accent"
              )}
            >
              {PERIODO_LABEL[per]}
            </button>
          ))}
        </div>
      </div>

      {/* Imóvel */}
      <SelectField label="Imóvel" value={p.propertyId} onChange={p.setPropertyId}>
        <option value="todos">Todos os imóveis</option>
        {p.properties.map((prop) => (
          <option key={prop.id} value={prop.id}>
            {prop.name}
          </option>
        ))}
      </SelectField>

      {/* Categoria */}
      <SelectField label="Categoria" value={p.categoria} onChange={p.setCategoria}>
        <option value="todas">Todas</option>
        {TODAS_CATEGORIAS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectField>

      {/* Tipo */}
      <SelectField label="Tipo" value={p.tipo} onChange={(v) => p.setTipo(v as "todos" | TipoMov)}>
        {(Object.keys(TIPO_LABEL) as Array<keyof typeof TIPO_LABEL>).map((t) => (
          <option key={t} value={t}>
            {TIPO_LABEL[t]}
          </option>
        ))}
      </SelectField>

      {/* Busca */}
      <div className="sm:col-span-2 lg:col-span-5">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Pesquisa livre</p>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3">
          <Search size={15} className="text-muted" />
          <input
            value={p.busca}
            onChange={(e) => p.setBusca(e.target.value)}
            placeholder="Procurar por descrição, categoria ou imóvel…"
            className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
          {p.busca && (
            <button onClick={() => p.setBusca("")} className="text-muted hover:text-ink" title="Limpar">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: botão filtros */}
      <div className="mb-3 flex items-center justify-between md:hidden">
        <Button variant="outline" size="sm" onClick={() => p.setDrawerOpen(true)}>
          <Filter size={14} /> Filtros
        </Button>
        <button onClick={p.onReset} className="text-xs text-muted hover:text-ink">
          Limpar filtros
        </button>
      </div>

      {/* Desktop: inline */}
      <Card className="hidden md:block">
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink">Filtros</h3>
            <button onClick={p.onReset} className="text-xs text-muted hover:text-ink">
              Limpar
            </button>
          </div>
          {Body}
        </CardContent>
      </Card>

      {/* Mobile drawer */}
      {p.drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => p.setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-line bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink">Filtros</h3>
              <button onClick={() => p.setDrawerOpen(false)} className="text-muted">
                <X size={20} />
              </button>
            </div>
            {Body}
            <div className="mt-5 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={p.onReset}>
                Limpar
              </Button>
              <Button className="flex-1" onClick={() => p.setDrawerOpen(false)}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary"
      >
        {children}
      </select>
    </div>
  );
}
