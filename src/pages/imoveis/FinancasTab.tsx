import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calculator,
  Sparkles,
  Paperclip,
  RotateCcw,
  Pencil,
  Trash2,
  TriangleAlert,
  ArrowUpDown,
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
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";
import { useExampleData } from "@/store/useExampleData";
import { useModalStore } from "@/store/useModalStore";
import {
  useTransactionsStore,
  CATEGORIAS_DESPESA,
  CATEGORIAS_RECEITA,
  type Transaction,
  type TipoMov,
} from "@/store/useTransactionsStore";
import type { Property } from "@/store/usePropertiesStore";
import { computeImovel, gerarAlertas, type AlertaNivel } from "@/lib/calc/imovel";
import { eur, eurSigned, pct, dataPTShort } from "@/lib/format";
import { dentroPeriodo, PERIODO_LABEL, PERIODOS, type Periodo } from "@/lib/periodo";
import { cn } from "@/lib/utils";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type SortKey = "data" | "valor";
type RendaStatus = "Pago" | "Pendente" | "Atrasado" | "—";

const TODAS_CATEGORIAS = Array.from(new Set<string>([...CATEGORIAS_DESPESA, ...CATEGORIAS_RECEITA]));

export function FinancasTab({ property }: { property: Property }) {
  const { enabled } = useExampleData();
  const allTransactions = useTransactionsStore((s) => s.transactions);
  const removeTx = useTransactionsStore((s) => s.remove);
  const openExpenseForm = useModalStore((s) => s.openExpenseForm);

  const txs = useMemo(
    () => (enabled ? allTransactions.filter((t) => t.propertyId === property.id) : []),
    [allTransactions, enabled, property.id]
  );

  const [periodo, setPeriodo] = useState<Periodo>("ano");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | TipoMov>("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  if (!enabled || txs.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Sem movimentos para este imóvel"
        description={
          enabled
            ? "Registe a primeira receita ou despesa para começar a acompanhar o desempenho financeiro deste imóvel."
            : "Active o toggle «Dados de exemplo» no topo da página para popular movimentos, ou registe o primeiro."
        }
        ctaLabel="+ Registar primeiro movimento"
        onCta={() =>
          openExpenseForm({ initialTipo: "despesa", initialPropertyId: property.id })
        }
      />
    );
  }

  // Período aplicado a KPIs/gráficos
  const txsPeriodo = useMemo(() => txs.filter((t) => dentroPeriodo(t.data, periodo)), [txs, periodo]);

  // KPIs do período
  const k = useMemo(() => {
    let receita = 0,
      despesa = 0;
    for (const t of txsPeriodo) {
      if (t.tipo === "receita") receita += t.valor;
      else despesa += t.valor;
    }
    const liquido = receita - despesa;
    const yieldLiquido = property.valorCompra > 0 ? (liquido / property.valorCompra) * 100 : 0;
    return { receita, despesa, liquido, yieldLiquido };
  }, [txsPeriodo, property.valorCompra]);

  // Indicadores estruturais (do imóvel) — para o bloco "Desempenho como investimento"
  const imovelKpis = useMemo(() => computeImovel(property), [property]);
  const alertasEstruturais = useMemo(
    () => gerarAlertas(property, imovelKpis),
    [property, imovelKpis]
  );

  // Acumulados desde a compra (todos os movimentos, sem filtro de período)
  const acumulados = useMemo(() => {
    let rec = 0,
      desp = 0;
    for (const t of txs) {
      if (t.tipo === "receita") rec += t.valor;
      else desp += t.valor;
    }
    return { rec, desp, resultado: rec - desp };
  }, [txs]);

  // Valor atual estimado (4% ao ano desde a data de compra)
  const valorizacao = useMemo(() => {
    const dt = new Date(`${property.dataCompra}T00:00:00`);
    const anos = (Date.now() - dt.getTime()) / (365.25 * 24 * 3600 * 1000);
    const atual = isFinite(anos) && anos > 0
      ? property.valorCompra * Math.pow(1.04, anos)
      : property.valorCompra;
    const delta = atual - property.valorCompra;
    const pctDelta = property.valorCompra > 0 ? (delta / property.valorCompra) * 100 : 0;
    return { atual, delta, pctDelta };
  }, [property.valorCompra, property.dataCompra]);

  const ganhoTotal = acumulados.resultado + valorizacao.delta;
  const capitalRecuperado =
    property.entrada > 0 ? (acumulados.resultado / property.entrada) * 100 : 0;

  // Série mensal (12 meses do ano corrente)
  const serieMensal = useMemo(() => {
    const meses = MESES.map((m) => ({ mes: m, Receita: 0, Despesa: 0 }));
    for (const t of txsPeriodo) {
      const d = new Date(`${t.data}T00:00:00`);
      const row = meses[d.getMonth()];
      if (t.tipo === "receita") row.Receita += t.valor;
      else row.Despesa += t.valor;
    }
    return meses;
  }, [txsPeriodo]);

  // Donut despesas por categoria
  const donutDespesas = useMemo(() => {
    const palette = ["#5C3D2E", "#8B5E3C", "#C8A664", "#9B3A2A", "#C17E2A", "#6B4C3B", "#E8D5BE", "#9B7F3F", "#4A7C59", "#2E1A0E"];
    const map = new Map<string, number>();
    for (const t of txsPeriodo) {
      if (t.tipo !== "despesa") continue;
      map.set(t.categoria, (map.get(t.categoria) ?? 0) + t.valor);
    }
    return Array.from(map.entries())
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }))
      .sort((a, b) => b.value - a.value);
  }, [txsPeriodo]);

  // Linha — evolução do cashflow acumulado mensal (ano corrente)
  const evolCashflow = useMemo(() => {
    const ano = new Date().getFullYear();
    const meses = MESES.map((m) => ({ mes: m, "Cashflow mensal": 0, Acumulado: 0 }));
    for (const t of txs) {
      const d = new Date(`${t.data}T00:00:00`);
      if (d.getFullYear() !== ano) continue;
      const idx = d.getMonth();
      meses[idx]["Cashflow mensal"] += t.tipo === "receita" ? t.valor : -t.valor;
    }
    let acc = 0;
    for (const row of meses) {
      acc += row["Cashflow mensal"];
      row.Acumulado = Math.round(acc);
      row["Cashflow mensal"] = Math.round(row["Cashflow mensal"]);
    }
    return meses;
  }, [txs]);

  // Histórico de rendas (12 meses recentes)
  const historicoRendas = useMemo(() => {
    const hoje = new Date();
    const out: { label: string; status: RendaStatus; valor: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const recebida = txs.find(
        (t) =>
          t.tipo === "receita" &&
          t.categoria === "Renda" &&
          new Date(`${t.data}T00:00:00`).getFullYear() === d.getFullYear() &&
          new Date(`${t.data}T00:00:00`).getMonth() === d.getMonth()
      );
      const label = `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      const valorEsperado = property.rendaMensal;
      const inicio = property.dataInicioArrendamento
        ? new Date(`${property.dataInicioArrendamento}T00:00:00`)
        : null;
      const antesDoArrendamento = inicio && d < new Date(inicio.getFullYear(), inicio.getMonth(), 1);
      let status: RendaStatus;
      if (recebida) status = "Pago";
      else if (antesDoArrendamento || property.status !== "ocupado" || valorEsperado === 0) status = "—";
      else if (d > new Date(hoje.getFullYear(), hoje.getMonth(), 1)) status = "Pendente";
      else status = "Atrasado";
      out.push({ label, status, valor: recebida?.valor ?? valorEsperado });
    }
    return out;
  }, [txs, property.rendaMensal, property.dataInicioArrendamento, property.status]);

  // Tabela detalhada (filtros próprios + sort)
  const tabela = useMemo(() => {
    let rows = txs.filter((t) => dentroPeriodo(t.data, periodo));
    if (tipoFiltro !== "todos") rows = rows.filter((t) => t.tipo === tipoFiltro);
    if (categoriaFiltro !== "todas") rows = rows.filter((t) => t.categoria === categoriaFiltro);
    rows = rows.slice().sort((a, b) => {
      const va = sortKey === "data" ? a.data : a.valor;
      const vb = sortKey === "data" ? b.data : b.valor;
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [txs, periodo, tipoFiltro, categoriaFiltro, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const onDelete = (t: Transaction) => {
    if (!confirm(`Eliminar este movimento de ${eur(t.valor)}?`)) return;
    removeTx(t.id);
    toast.success("Movimento eliminado");
  };

  const previewRecibo = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-5">
      {/* Header com seletor de período e ações */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {PERIODOS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                periodo === p
                  ? "bg-primary text-white"
                  : "border border-line bg-card text-muted hover:bg-accent"
              )}
            >
              {PERIODO_LABEL[p]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              openExpenseForm({ initialTipo: "receita", initialPropertyId: property.id })
            }
          >
            <Plus size={14} /> Receita
          </Button>
          <Button
            size="sm"
            onClick={() =>
              openExpenseForm({ initialTipo: "despesa", initialPropertyId: property.id })
            }
          >
            <Plus size={14} /> Despesa
          </Button>
        </div>
      </div>

      {/* KPIs do período */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi label="Receita" value={eur(k.receita)} tone="success" icon={TrendingUp} hint={PERIODO_LABEL[periodo]} />
        <Kpi label="Despesa" value={eur(k.despesa)} tone="danger" icon={TrendingDown} hint={PERIODO_LABEL[periodo]} />
        <Kpi
          label="Resultado líquido"
          value={eurSigned(k.liquido)}
          tone={k.liquido >= 0 ? "success" : "danger"}
          icon={Wallet}
        />
        <Kpi label="Yield líquido" value={pct(k.yieldLiquido)} tone={k.yieldLiquido >= 4 ? "success" : k.yieldLiquido >= 0 ? "warning" : "danger"} />
        <Kpi label="Cashflow mensal" value={eurSigned(imovelKpis.cashflowMensal)} tone={imovelKpis.cashflowMensal >= 0 ? "success" : "danger"} hint="Configurado" />
        <Kpi
          label="Resultado acumulado"
          value={eurSigned(acumulados.resultado)}
          tone={acumulados.resultado >= 0 ? "success" : "danger"}
          hint="Desde a compra"
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent>
            <h3 className="mb-3 font-display text-base font-semibold text-ink">
              Receitas vs Despesas
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={serieMensal} barGap={4}>
                <CartesianGrid vertical={false} stroke="#E8D5BE" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} width={44} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${v / 1000}k` : String(v))} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => eur(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Receita" fill="#4A7C59" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesa" fill="#9B3A2A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="mb-3 font-display text-base font-semibold text-ink">Onde vai o dinheiro</h3>
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
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent>
            <h3 className="mb-3 font-display text-base font-semibold text-ink">Evolução do cashflow</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={evolCashflow}>
                <CartesianGrid vertical={false} stroke="#E8D5BE" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} width={48} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip formatter={(v: number) => eur(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Cashflow mensal" stroke="#C8A664" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Acumulado" stroke="#5C3D2E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Desempenho como investimento */}
      <Card>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h3 className="font-display text-base font-semibold text-ink">Desempenho como investimento</h3>
            <Link
              to="/financas/calculadora-rentabilidade"
              className="inline-flex items-center gap-1.5 text-sm text-secondary hover:underline"
            >
              <Calculator size={14} /> Simular cenário →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Bloco label="Valor de compra" value={eur(property.valorCompra)} />
            <Bloco
              label="Valor atual estimado"
              value={eur(valorizacao.atual)}
              hint={`${eurSigned(valorizacao.delta)} · ${pct(valorizacao.pctDelta)}`}
              tone={valorizacao.delta >= 0 ? "success" : "danger"}
            />
            <Bloco label="Rendas acumuladas" value={eur(acumulados.rec)} tone="success" />
            <Bloco label="Despesas acumuladas" value={eur(acumulados.desp)} tone="danger" />
            <Bloco
              label="Resultado operacional acumulado"
              value={eurSigned(acumulados.resultado)}
              tone={acumulados.resultado >= 0 ? "success" : "danger"}
            />
            <Bloco
              label="Ganho total (operacional + valorização)"
              value={eurSigned(ganhoTotal)}
              tone={ganhoTotal >= 0 ? "success" : "danger"}
            />
            <Bloco
              label="Capital recuperado"
              value={pct(capitalRecuperado, 0)}
              hint={
                capitalRecuperado >= 100
                  ? "Capital totalmente recuperado"
                  : `Sobre entrada de ${eur(property.entrada)}`
              }
              tone={capitalRecuperado >= 100 ? "success" : "default"}
            />
            <Bloco
              label="Tempo de recuperação"
              value={
                imovelKpis.tempoRecuperacao === null
                  ? "Não recupera"
                  : `${imovelKpis.tempoRecuperacao.toFixed(1)} anos`
              }
              tone={imovelKpis.tempoRecuperacao === null ? "danger" : imovelKpis.tempoRecuperacao < 12 ? "success" : "warning"}
            />
            <Bloco label="Yield bruta" value={pct(imovelKpis.yieldBruta)} />
            <Bloco label="Yield líquida" value={pct(imovelKpis.yieldLiquida)} tone={imovelKpis.yieldLiquida > 4 ? "success" : imovelKpis.yieldLiquida >= 2 ? "warning" : "danger"} />
            <Bloco label="Rentabilidade s/ entrada" value={pct(imovelKpis.rentabEntrada)} tone={imovelKpis.rentabEntrada >= 8 ? "success" : imovelKpis.rentabEntrada >= 0 ? "warning" : "danger"} />
            <Bloco label="IRS estimado anual" value={eur(imovelKpis.irsEstimado)} tone="danger" />
          </div>

          {alertasEstruturais.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {alertasEstruturais.map((a, i) => (
                <AlertaPill key={i} nivel={a.nivel} emoji={a.emoji} texto={a.texto} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de rendas */}
      <Card>
        <CardContent>
          <h3 className="mb-3 font-display text-base font-semibold text-ink">Histórico de rendas · últimos 12 meses</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {historicoRendas.map((m) => (
              <RendaCelula key={m.label} {...m} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabela detalhada */}
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">
                Movimentos <span className="text-sm font-normal text-muted">· {tabela.length}</span>
              </h3>
              <p className="text-xs text-muted">{PERIODO_LABEL[periodo]} · clique numa linha para editar.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value as "todos" | TipoMov)}
                className="h-9 rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary"
              >
                <option value="todos">Todos os tipos</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
              </select>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="h-9 rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary"
              >
                <option value="todas">Todas as categorias</option>
                {TODAS_CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {tabela.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">Sem movimentos para estes filtros.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-bg text-left text-xs font-medium uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-5 py-3">
                        <SortBtn label="Data" active={sortKey === "data"} dir={sortDir} onClick={() => toggleSort("data")} />
                      </th>
                      <th className="px-2 py-3">Tipo</th>
                      <th className="px-2 py-3">Categoria</th>
                      <th className="px-2 py-3">Descrição</th>
                      <th className="px-2 py-3 text-right">
                        <SortBtn label="Valor" active={sortKey === "valor"} dir={sortDir} onClick={() => toggleSort("valor")} alignRight />
                      </th>
                      <th className="px-2 py-3 text-center">Selos</th>
                      <th className="px-5 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabela.map((t) => {
                      const isRec = t.tipo === "receita";
                      return (
                        <tr
                          key={t.id}
                          onClick={() => openExpenseForm({ editingId: t.id })}
                          className="cursor-pointer border-t border-line/60 hover:bg-bg"
                        >
                          <td className="px-5 py-3 text-muted">{dataPTShort(t.data)}</td>
                          <td className="px-2 py-3">
                            <Badge tone={isRec ? "success" : "danger"}>{isRec ? "Receita" : "Despesa"}</Badge>
                          </td>
                          <td className="px-2 py-3 text-muted">{t.categoria}</td>
                          <td className="px-2 py-3 text-ink">
                            <span className="block max-w-[32ch] truncate">{t.descricao}</span>
                            {t.notas && <span className="block max-w-[32ch] truncate text-[11px] text-muted">{t.notas}</span>}
                          </td>
                          <td
                            className={cn(
                              "num px-2 py-3 text-right font-semibold",
                              isRec ? "text-success" : "text-danger"
                            )}
                          >
                            {isRec ? "+" : "−"}
                            {eur(t.valor)}
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {t.reciboUrl && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    previewRecibo(t.reciboUrl!);
                                  }}
                                  className="rounded p-1 text-muted hover:bg-accent hover:text-ink"
                                  title="Ver recibo"
                                >
                                  <Paperclip size={13} />
                                </button>
                              )}
                              {t.deduzivelIrs && (
                                <span title="Dedutível em IRS" className="rounded bg-gold/15 p-1 text-gold-dark">
                                  <Sparkles size={12} />
                                </span>
                              )}
                              {t.recorrente && (
                                <span title={`Recorrente · ${t.periodicidade}`} className="rounded bg-secondary/12 p-1 text-secondary">
                                  <RotateCcw size={12} />
                                </span>
                              )}
                            </div>
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
                {tabela.map((t) => {
                  const isRec = t.tipo === "receita";
                  return (
                    <button
                      key={t.id}
                      onClick={() => openExpenseForm({ editingId: t.id })}
                      className="flex w-full items-start justify-between gap-3 rounded-xl border border-line bg-card p-3 text-left hover:bg-bg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted">{dataPTShort(t.data)} · {t.categoria}</p>
                        <p className="truncate text-sm font-medium text-ink">{t.descricao}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <Badge tone={isRec ? "success" : "danger"}>{isRec ? "Receita" : "Despesa"}</Badge>
                          {t.deduzivelIrs && <Badge tone="gold">IRS</Badge>}
                          {t.recorrente && <Badge tone="info">↻ {t.periodicidade}</Badge>}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "num shrink-0 text-right text-base font-bold",
                          isRec ? "text-success" : "text-danger"
                        )}
                      >
                        {isRec ? "+" : "−"}
                        {eur(t.valor)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const tooltipStyle = { borderRadius: 12, border: "1px solid #E8D5BE", fontSize: 13 } as const;

// ───────────────────────── Auxiliares visuais ─────────────────────────

function Kpi({
  label,
  value,
  tone,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger" | "warning" | "default";
  icon?: typeof TrendingUp;
  hint?: string;
}) {
  const color =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        {Icon && <Icon size={14} className="text-muted" />}
      </div>
      <p className={cn("num mt-1 text-xl font-bold", color)}>{value}</p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function Bloco({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "success" | "danger" | "warning" | "default";
}) {
  const color =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink";
  return (
    <div className="rounded-lg bg-bg p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={cn("num mt-0.5 text-base font-bold", color)}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function RendaCelula({ label, status, valor }: { label: string; status: RendaStatus; valor: number }) {
  const cls =
    status === "Pago"
      ? "border-success/30 bg-success/10 text-success"
      : status === "Atrasado"
        ? "border-danger/30 bg-danger/10 text-danger"
        : status === "Pendente"
          ? "border-warning/30 bg-warning/10 text-warning"
          : "border-line bg-card text-muted";
  return (
    <div className={cn("rounded-lg border p-2.5 text-center", cls)}>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="num mt-0.5 text-sm font-semibold">{status}</p>
      {status !== "—" && <p className="text-[11px] opacity-70">{eur(valor)}</p>}
    </div>
  );
}

function SortBtn({
  label,
  active,
  dir,
  onClick,
  alignRight,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  alignRight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 hover:text-ink",
        alignRight && "justify-end",
        active && "text-ink"
      )}
    >
      {label}
      <ArrowUpDown size={11} className={cn(active && (dir === "asc" ? "rotate-180" : ""))} />
    </button>
  );
}

function AlertaPill({ nivel, emoji, texto }: { nivel: AlertaNivel; emoji: string; texto: string }) {
  const tone =
    nivel === "positivo"
      ? "border-success/30 bg-success/10 text-success"
      : nivel === "atencao"
        ? "border-warning/30 bg-warning/10 text-warning"
        : "border-danger/30 bg-danger/10 text-danger";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium", tone)}>
      {nivel === "critico" ? <TriangleAlert size={14} /> : <span>{emoji}</span>}
      {texto}
    </span>
  );
}
