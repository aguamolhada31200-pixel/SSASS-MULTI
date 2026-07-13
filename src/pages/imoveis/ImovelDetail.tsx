import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Building2, Pencil, Trash2, ArrowLeft, TriangleAlert, Clock, Plus, Hammer, KeyRound } from "lucide-react";
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
import { usePropertiesStore, PROP_TYPE_LABEL, STATUS_LABEL, type Property } from "@/store/usePropertiesStore";
import { useObrasStore, CATEGORIA_LABEL, ESTADO_LABEL, type Obra, type ObraCategoria, type ObraEstado } from "@/store/useObrasStore";
import { useTenantsStore, TIPO_LABEL as TENANT_TIPO_LABEL, urgenciaContrato, diasAteFim, type Tenant } from "@/store/useTenantsStore";
import {
  useContractsStore,
  statusEfetivo,
  diasAteFim as diasAteFimContrato,
  STATUS_LABEL as CONTRACT_STATUS_LABEL,
  TIPO_LABEL as CONTRACT_TIPO_LABEL,
} from "@/store/useContractsStore";
import { useDocumentsStore, DOC_CATEGORIAS, type DocCategoria } from "@/store/useDocumentsStore";
import { useMaintenanceStore, PRIORIDADE_LABEL, ESTADO_PEDIDO_LABEL, type Prioridade, type EstadoPedido } from "@/store/useMaintenanceStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useModalStore } from "@/store/useModalStore";
import { useArrendamentosStore, rendaRecorrente, ocupaImovel } from "@/store/useArrendamentosStore";
import { EstadoBadge, TipoBadge, InquilinoAvatares } from "@/components/arrendamentos/shared";
import { computeImovel, gerarAlertas, type AlertaNivel } from "@/lib/calc/imovel";
import { FinancasTab } from "./FinancasTab";
import { PropertyGallery } from "./PropertyGallery";
import { situacaoImovel } from "@/lib/property";
import { eur, eurSigned, pct, n1, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Users2,
  GraduationCap,
  User as UserIcon,
  FileSignature,
  FileText,
  Upload,
  Download,
  Eye,
  X,
  Wrench,
  Phone,
  History as HistoryIcon,
  Sparkles,
  CheckCircle2,
  PauseCircle,
} from "lucide-react";

const TABS = ["Visão geral", "Inquilinos", "Arrendamentos", "Contratos", "Finanças", "Obras", "Documentos", "Manutenção", "Histórico"] as const;

/** "Rua X, 4.º Dto · 1250-100 Lisboa" — só junta o que existe, ignora vazios. */
function moradaFormatada(p: Property): string {
  const rua = [p.address, p.morada2].filter((x) => x && x.trim()).join(", ");
  const cp = [p.codigoPostal, p.city].filter((x) => x && x.trim()).join(" ");
  return [rua, cp].filter((x) => x && x.trim()).join(" · ") || p.city || "—";
}

export default function ImovelDetail() {
  const { id } = useParams();
  const property = usePropertiesStore((s) => s.properties.find((p) => p.id === id));
  const remove = usePropertiesStore((s) => s.remove);
  const openPropertyForm = useModalStore((s) => s.openPropertyForm);
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Visão geral");

  if (!property)
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Imóvel não encontrado.</p>
        <Link to="/imoveis" className="mt-2 inline-block text-secondary hover:underline">
          ← Voltar aos imóveis
        </Link>
      </div>
    );

  const k = computeImovel(property);
  const alertas = gerarAlertas(property, k);
  const s = situacaoImovel(property);

  const onDelete = () => {
    if (!confirm(`Eliminar "${property.name}"? Esta ação não pode ser anulada.`)) return;
    remove(property.id);
    toast.success("Imóvel eliminado", { description: property.name });
    navigate("/imoveis");
  };

  return (
    <>
      <Link to="/imoveis" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Imóveis
      </Link>

      {/* Cabeçalho discreto: nome + badges · ações */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{property.name}</h1>
            <Badge tone="gold">{PROP_TYPE_LABEL[property.type]}</Badge>
            <Badge tone={property.status === "ocupado" ? "success" : property.status === "em_obras" ? "info" : "warning"}>
              {STATUS_LABEL[property.status]}
            </Badge>
            {property.areaUtil ? <Badge tone="neutral">{property.areaUtil} m²</Badge> : null}
            {property.numQuartos ? <Badge tone="neutral">{property.numQuartos} quartos</Badge> : null}
            {property.classeEnergetica ? (
              <Badge tone="success">Energia {property.classeEnergetica}</Badge>
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm text-muted">{moradaFormatada(property)}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={() => openPropertyForm(property.id)}>
            <Pencil size={14} /> Editar
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 size={14} /> Eliminar
          </Button>
        </div>
      </div>

      {/* Galeria de fotos — full-width */}
      <PropertyGallery property={property} />

      {/* Tabs */}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
              tab === t ? "border-primary font-medium text-primary" : "border-transparent text-muted hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "Visão geral" && (
          <VisaoGeral property={property} k={k} alertas={alertas} situacao={s} onEdit={() => openPropertyForm(property.id)} />
        )}
        {tab === "Inquilinos" && <ImovelInquilinosTab propertyId={property.id} />}
        {tab === "Arrendamentos" && <ImovelArrendamentosTab propertyId={property.id} />}
        {tab === "Contratos" && <ImovelContratosTab propertyId={property.id} />}
        {tab === "Finanças" && <FinancasTab property={property} />}
        {tab === "Obras" && <ImovelObrasTab propertyId={property.id} />}
        {tab === "Documentos" && <ImovelDocumentosTab propertyId={property.id} />}
        {tab === "Manutenção" && <ImovelManutencaoTab propertyId={property.id} />}
        {tab === "Histórico" && <ImovelHistoricoTab property={property} />}
      </div>
    </>
  );
}

// ───────────────────────── Painel financeiro ─────────────────────────
function VisaoGeral({
  property,
  k,
  alertas,
  situacao,
  onEdit,
}: {
  property: ReturnType<typeof usePropertiesStore.getState>["properties"][number];
  k: ReturnType<typeof computeImovel>;
  alertas: ReturnType<typeof gerarAlertas>;
  situacao: ReturnType<typeof situacaoImovel>;
  onEdit: () => void;
}) {
  const navigate = useNavigate();
  const arrendamentoAtivo = useArrendamentosStore((s) =>
    s.arrendamentos.find((a) => a.propertyId === property.id && ocupaImovel(a))
  );
  const tempo =
    k.tempoRecuperacao === null ? "Não recupera" : `${n1(k.tempoRecuperacao)} anos`;

  const receitasVsDespesas = [
    { periodo: "Mensal", Receita: Math.round(k.receitaMensal), Despesas: Math.round(k.totalDespesasMensais) },
    { periodo: "Anual", Receita: Math.round(k.receitaAnual), Despesas: Math.round(k.totalDespesasAnuais) },
  ];
  const distribDespesas = [
    { name: "IMI", value: property.imiAnual, color: "#5C3D2E" },
    { name: "Seguro", value: property.seguroAnual, color: "#C8A664" },
    { name: "Condomínio", value: property.condominioMensal * 12, color: "#8B5E3C" },
    { name: "Outras", value: property.outrasMensais * 12, color: "#E8D5BE" },
  ].filter((d) => d.value > 0);
  const composicaoCustos = [
    { name: "Prestação bancária", value: Math.round(k.prestacaoAnual), color: "#5C3D2E" },
    { name: "Impostos (IRS)", value: Math.round(k.irsEstimado), color: "#9B3A2A" },
    { name: "Despesas operacionais", value: Math.round(k.despesasOperAnuais), color: "#C8A664" },
  ].filter((d) => d.value > 0);
  const cashflowEvol = Array.from({ length: 12 }, (_, i) => ({
    mes: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][i],
    Mensal: Math.round(k.cashflowMensal),
    Acumulado: Math.round(k.cashflowMensal * (i + 1)),
  }));

  return (
    <div className="space-y-5">
      {/* CTA — imóvel sem arrendamento ativo */}
      {!arrendamentoAtivo && property.status !== "inativo" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15">
              <KeyRound size={22} className="text-gold-dark" />
            </span>
            <div>
              <p className="font-display text-base font-semibold text-ink">Este imóvel ainda não tem arrendamento</p>
              <p className="text-xs text-muted">A renda pertence ao arrendamento — crie um para começar a registar rendas, caução e alertas.</p>
            </div>
          </div>
          <Button variant="gold" onClick={() => navigate(`/imoveis/arrendamentos/novo?imovel=${property.id}`)}>
            <Plus size={16} /> Criar arrendamento
          </Button>
        </div>
      )}

      {/* Situação Financeira — veredito */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5"
        style={{ borderColor: situacao.cor, background: `color-mix(in srgb, ${situacao.cor} 8%, transparent)` }}
      >
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: situacao.cor }} />
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">Situação Financeira</p>
            <p className="font-display text-xl font-bold" style={{ color: situacao.cor }}>{situacao.titulo}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Resultado líquido anual</p>
          <p className="num text-2xl font-bold" style={{ color: situacao.cor }}>{eurSigned(k.cashflowAnual)}</p>
        </div>
      </div>

      {/* KPIs destacados */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <BigKpi label="Yield líquida" value={pct(k.yieldLiquida)} tone={k.yieldLiquida > 4 ? "pos" : k.yieldLiquida >= 2 ? "warn" : "neg"} />
        <BigKpi label="Rentab. s/ entrada" value={pct(k.rentabEntrada)} tone={k.rentabEntrada >= 8 ? "pos" : k.rentabEntrada >= 0 ? "warn" : "neg"} />
        <BigKpi label="Cashflow mensal" value={eurSigned(k.cashflowMensal)} tone={k.cashflowMensal > 0 ? "pos" : "neg"} />
        <BigKpi label="Recuperação da entrada" value={tempo} icon />
      </div>

      {/* Descrição + caracterização física + nota privada */}
      {(property.descricao || property.notaPrivada || property.areaUtil || property.numDivisoes || property.numQuartos || property.numCasasBanho || property.classeEnergetica) && (
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-ink">Descrição do imóvel</h3>
              <button onClick={onEdit} className="text-sm text-secondary hover:underline">Editar →</button>
            </div>
            {(property.areaUtil || property.numDivisoes || property.numQuartos || property.numCasasBanho || property.classeEnergetica) && (
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {property.areaUtil ? <MiniStat label="Área útil" value={`${property.areaUtil} m²`} /> : null}
                {property.numDivisoes ? <MiniStat label="Divisões" value={String(property.numDivisoes)} /> : null}
                {property.numQuartos ? <MiniStat label="Quartos" value={String(property.numQuartos)} /> : null}
                {property.numCasasBanho ? <MiniStat label="WCs" value={String(property.numCasasBanho)} /> : null}
                {property.classeEnergetica ? <MiniStat label="Classe energética" value={property.classeEnergetica} tone="pos" /> : null}
              </div>
            )}
            {property.descricao && (
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Descrição</p>
                <p className="whitespace-pre-line text-sm text-ink">{property.descricao}</p>
              </div>
            )}
            {property.notaPrivada && (
              <div className={cn("rounded-xl border border-gold/25 bg-gold/5 p-3", property.descricao && "mt-3")}>
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold-dark">
                  🔒 Nota privada · só visível para si
                </p>
                <p className="whitespace-pre-line text-sm text-ink">{property.notaPrivada}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPIs detalhados */}
      <Card>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink">Indicadores do investimento</h3>
            <button onClick={onEdit} className="text-sm text-secondary hover:underline">Editar dados →</button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Kpi label="Valor de compra" value={eur(k.valorCompra)} />
            <Kpi label="Valor financiado" value={eur(k.valorFinanciado)} />
            <Kpi label="Valor da entrada" value={eur(k.entrada)} />
            <Kpi label="Prestação mensal" value={eur(k.prestacaoMensal)} />
            <Kpi label="Receita mensal" value={eur(k.receitaMensal)} tone="pos" />
            <Kpi label="Receita anual" value={eur(k.receitaAnual)} tone="pos" />
            <Kpi label="Despesas mensais" value={eur(k.totalDespesasMensais)} tone="neg" />
            <Kpi label="Despesas anuais" value={eur(k.totalDespesasAnuais)} tone="neg" />
            <Kpi label="IRS estimado" value={eur(k.irsEstimado)} tone="neg" />
            <Kpi label="Rend. antes de impostos" value={eurSigned(k.rendimentoAntesImpostos)} tone={k.rendimentoAntesImpostos >= 0 ? "pos" : "neg"} />
            <Kpi label="Rend. líquido final" value={eurSigned(k.rendimentoLiquidoFinal)} tone={k.rendimentoLiquidoFinal >= 0 ? "pos" : "neg"} />
            <Kpi label="Cashflow anual" value={eurSigned(k.cashflowAnual)} tone={k.cashflowAnual >= 0 ? "pos" : "neg"} />
            <Kpi label="Yield bruta" value={pct(k.yieldBruta)} />
          </div>
        </CardContent>
      </Card>

      {/* Alertas automáticos */}
      {alertas.length > 0 && (
        <Card>
          <CardContent>
            <h3 className="mb-3 font-display text-base font-semibold text-ink">Alertas inteligentes</h3>
            <div className="flex flex-wrap gap-2">
              {alertas.map((a, i) => (
                <AlertaPill key={i} nivel={a.nivel} emoji={a.emoji} texto={a.texto} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <h3 className="mb-3 font-display text-base font-semibold text-ink">Receitas vs Despesas</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={receitasVsDespesas} barGap={6}>
                <CartesianGrid vertical={false} stroke="#E8D5BE" />
                <XAxis dataKey="periodo" tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} width={48} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
                <Tooltip formatter={(v: number) => eur(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Receita" fill="#4A7C59" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#9B3A2A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <DonutCard title="Distribuição das despesas" data={distribDespesas} />

        <Card>
          <CardContent>
            <h3 className="mb-3 font-display text-base font-semibold text-ink">Evolução do cashflow</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={cashflowEvol}>
                <CartesianGrid vertical={false} stroke="#E8D5BE" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} width={48} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${v / 1000}k` : String(v))} />
                <Tooltip formatter={(v: number) => eur(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Mensal" stroke="#C8A664" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Acumulado" stroke="#5C3D2E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <DonutCard title="Composição dos custos" data={composicaoCustos} />
      </div>
    </div>
  );
}

const tooltipStyle = { borderRadius: 12, border: "1px solid #E8D5BE", fontSize: 13 } as const;

function BigKpi({ label, value, tone, icon }: { label: string; value: string; tone?: "pos" | "neg" | "warn"; icon?: boolean }) {
  const color = tone === "pos" ? "text-success" : tone === "neg" ? "text-danger" : tone === "warn" ? "text-warning" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        {icon && <Clock size={12} />} {label}
      </p>
      <p className={cn("num mt-2 text-3xl font-bold", color)}>{value}</p>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const color = tone === "pos" ? "text-success" : tone === "neg" ? "text-danger" : "text-ink";
  return (
    <div className="rounded-lg bg-bg p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={cn("num mt-0.5 text-base font-bold", color)}>{value}</p>
    </div>
  );
}

/** Célula compacta para caracterização física (área, quartos, WCs…). */
function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const color = tone === "pos" ? "text-success" : tone === "neg" ? "text-danger" : "text-ink";
  return (
    <div className="rounded-lg border border-line bg-card p-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("num mt-0.5 text-sm font-bold", color)}>{value}</p>
    </div>
  );
}

function DonutCard({ title, data }: { title: string; data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <Card>
      <CardContent>
        <h3 className="mb-3 font-display text-base font-semibold text-ink">{title}</h3>
        {total === 0 ? (
          <p className="py-12 text-center text-sm text-muted">Sem dados suficientes.</p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <PieChart width={170} height={170}>
              <Pie data={data} dataKey="value" innerRadius={48} outerRadius={78} stroke="none">
                {data.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => eur(v)} />
            </PieChart>
            <div className="flex-1 space-y-1.5 self-stretch">
              {data.map((d) => (
                <div key={d.name} className="flex items-center justify-between border-b border-line/60 py-1.5 text-sm last:border-0">
                  <span className="flex items-center gap-2 text-muted">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} /> {d.name}
                  </span>
                  <span className="num font-medium text-ink">{eur(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertaPill({ nivel, texto }: { nivel: AlertaNivel; emoji?: string; texto: string }) {
  const tone =
    nivel === "positivo"
      ? "border-success/30 bg-success/10 text-success"
      : nivel === "atencao"
        ? "border-warning/30 bg-warning/10 text-warning"
        : "border-danger/30 bg-danger/10 text-danger";
  const dot = nivel === "positivo" ? "bg-success" : nivel === "atencao" ? "bg-warning" : "bg-danger";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium", tone)}>
      {nivel === "critico" ? <TriangleAlert size={14} /> : <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />}
      {texto}
    </span>
  );
}

function ObraStatusBadge({ estado }: { estado: ObraEstado }) {
  if (estado === "concluida") return <Badge tone="success">Concluída</Badge>;
  if (estado === "em_curso") return <Badge tone="warning">Em curso</Badge>;
  return <Badge tone="neutral">Por iniciar</Badge>;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function ObraCard({ o }: { o: Obra }) {
  const desvio = o.gasto - o.orcamento;
  const pctUsed = o.orcamento > 0 ? (o.gasto / o.orcamento) * 100 : 0;
  const barColor = pctUsed > 100 ? "bg-danger" : pctUsed >= 85 ? "bg-warning" : "bg-success";
  const today = new Date().toISOString().slice(0, 10);
  const diasRestantes = o.dataFimPrevista ? daysBetween(today, o.dataFimPrevista) : null;
  const atrasada = diasRestantes !== null && diasRestantes < 0 && o.estado !== "concluida";

  return (
    <div className="rounded-xl border border-line bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs">
            <Hammer size={14} className="text-secondary" />
          </span>
          <div>
            <Link to={`/obra/${o.id}`} className="text-sm font-medium text-ink hover:text-primary">{o.titulo}</Link>
            <p className="text-[11px] text-muted">{CATEGORIA_LABEL[o.categoria]}</p>
          </div>
        </div>
        <ObraStatusBadge estado={o.estado} />
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-[10px] text-muted">
          <span>{eur(o.gasto)} / {eur(o.orcamento)}</span>
          <span className={cn("font-semibold", desvio > 0 ? "text-danger" : desvio < 0 ? "text-success" : "text-muted")}>
            {desvio !== 0 ? `${desvio > 0 ? "+" : ""}${eur(desvio)}` : "em linha"}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-accent">
          <div className={cn("h-full rounded-full", barColor)} style={{ width: `${Math.min(100, pctUsed)}%` }} />
        </div>
      </div>
      {o.progresso > 0 && o.estado !== "concluida" && (
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-muted">
            <span>Progresso</span>
            <span className="font-semibold text-warning">{o.progresso}%</span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-accent">
            <div className="h-full rounded-full bg-warning" style={{ width: `${o.progresso}%` }} />
          </div>
        </div>
      )}
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted">
        <span>
          {o.dataInicio && dataPT(o.dataInicio)}
          {o.dataFimPrevista && ` → ${dataPT(o.dataFimPrevista)}`}
        </span>
        {diasRestantes !== null && o.estado !== "concluida" && (
          <span className={cn("font-semibold", atrasada ? "text-danger" : "text-muted")}>
            {atrasada ? `${Math.abs(diasRestantes)}d atrasada` : `${diasRestantes}d restantes`}
          </span>
        )}
      </div>
    </div>
  );
}

const inputClsObra = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";
const CATEGORIAS_LIST = Object.entries(CATEGORIA_LABEL) as [ObraCategoria, string][];

function NovaObraForm({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const addObra = useObrasStore((s) => s.addObra);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<ObraCategoria>("geral");
  const [orcamento, setOrcamento] = useState(0);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [estado, setEstado] = useState<ObraEstado>("por_iniciar");

  const onSubmit = () => {
    if (!titulo.trim()) { toast.error("Indique o nome da obra"); return; }
    addObra({
      propertyId,
      titulo: titulo.trim(),
      categoria,
      orcamento,
      gasto: 0,
      dataInicio,
      dataFimPrevista: dataFim,
      estado,
      progresso: 0,
    });
    toast.success("Obra adicionada", { description: titulo });
    onClose();
  };

  return (
    <Card>
      <CardContent>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-warning">Nova obra</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-muted">Nome / descrição</span>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Remodelação cozinha" className={inputClsObra} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Categoria</span>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as ObraCategoria)} className={inputClsObra}>
              {CATEGORIAS_LIST.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Orçamento previsto</span>
            <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
              <input type="number" step="any" value={orcamento || ""} onChange={(e) => setOrcamento(Number(e.target.value) || 0)} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
              <span className="px-3 text-sm text-muted">€</span>
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Data de início</span>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className={inputClsObra} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Conclusão prevista</span>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className={inputClsObra} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Estado</span>
            <select value={estado} onChange={(e) => setEstado(e.target.value as ObraEstado)} className={inputClsObra}>
              <option value="por_iniciar">Por iniciar</option>
              <option value="em_curso">Em curso</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={onSubmit}><Plus size={14} /> Adicionar obra</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ImovelObrasTab({ propertyId }: { propertyId: string }) {
  const obras = useObrasStore((s) => s.obras.filter((o) => o.propertyId === propertyId));
  const [showForm, setShowForm] = useState(false);

  const total = obras.reduce((s, o) => s + o.orcamento, 0);
  const gasto = obras.reduce((s, o) => s + o.gasto, 0);
  const concluidas = obras.filter((o) => o.estado === "concluida").length;
  const emCurso = obras.filter((o) => o.estado === "em_curso").length;

  const columns: { key: ObraEstado; title: string; color: string }[] = [
    { key: "por_iniciar", title: "Por iniciar", color: "border-line" },
    { key: "em_curso", title: "Em curso", color: "border-warning" },
    { key: "concluida", title: "Concluída", color: "border-success" },
  ];

  return (
    <div className="space-y-4">
      {/* Header with button */}
      <div className="flex items-center justify-between">
        <div />
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : <><Plus size={14} /> Nova obra</>}
        </Button>
      </div>

      {showForm && <NovaObraForm propertyId={propertyId} onClose={() => setShowForm(false)} />}

      {obras.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <Hammer size={28} className="mx-auto mb-2" />
            <p className="text-sm">Nenhuma obra registada neste imóvel.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Adicionar primeira obra
            </Button>
          </CardContent>
        </Card>
      ) : obras.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MiniKpi label="Total itens" value={String(obras.length)} />
            <MiniKpi label="Concluídos" value={`${concluidas}/${obras.length}`} tone="pos" />
            <MiniKpi label="Em curso" value={String(emCurso)} tone="warn" />
            <MiniKpi label="Orçamento" value={eur(total)} />
            <MiniKpi label="Gasto" value={eur(gasto)} tone={gasto > total ? "neg" : "warn"} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {columns.map((col) => {
              const items = obras.filter((o) => o.estado === col.key);
              return (
                <div key={col.key} className={cn("rounded-2xl border-t-4 bg-bg/50 p-3", col.color)}>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{col.title} · {items.length}</p>
                  <div className="space-y-2">
                    {items.map((o) => <ObraCard key={o.id} o={o} />)}
                    {items.length === 0 && <p className="py-4 text-center text-xs text-muted">Nenhum item</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function MiniKpi({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" | "warn" }) {
  const color = tone === "pos" ? "text-success" : tone === "neg" ? "text-danger" : tone === "warn" ? "text-warning" : "text-ink";
  return (
    <div className="rounded-xl border border-line/60 bg-bg/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={cn("num mt-1 text-base font-bold", color)}>{value}</p>
    </div>
  );
}

// ───────────────────────── Comuns das tabs ─────────────────────────

function TabSectionHeader({ title }: { title: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-widest text-secondary">
      <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {title}
    </h3>
  );
}

function TenantAvatar({ tenant, size = 40 }: { tenant: Tenant; size?: number }) {
  const initials = tenant.nomeCompleto.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex shrink-0 overflow-hidden rounded-full" style={{ width: size, height: size }}>
      {tenant.fotoUrl ? (
        <img src={tenant.fotoUrl} alt={tenant.nomeCompleto} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-secondary text-xs font-semibold text-white">{initials}</div>
      )}
    </div>
  );
}

function TenantTipoBadge({ tipo }: { tipo: Tenant["tipoInquilino"] }) {
  return (
    <Badge tone={tipo === "estudante" ? "gold" : "info"}>
      {tipo === "estudante" ? <GraduationCap size={11} /> : <UserIcon size={11} />}
      {TENANT_TIPO_LABEL[tipo]}
    </Badge>
  );
}

function FimContratoInline({ dataFim }: { dataFim?: string }) {
  if (!dataFim) return <span className="text-xs text-muted">—</span>;
  const u = urgenciaContrato(dataFim);
  const dias = diasAteFim(dataFim);
  const cor = u === "expirado" || u === "urgente" ? "text-danger" : u === "proximo" ? "text-warning" : "text-muted";
  const sub =
    dias === null ? "" : u === "expirado" ? `há ${Math.abs(dias)}d` : `em ${dias}d`;
  return (
    <span className={cn("num text-xs font-semibold", cor)}>
      {dataPT(dataFim)} {sub && <span className="font-normal">· {sub}</span>}
    </span>
  );
}

// ───────────────────────── Inquilinos ─────────────────────────

export function ImovelInquilinosTab({ propertyId }: { propertyId: string }) {
  const tenants = useTenantsStore((s) => s.tenants.filter((t) => t.propertyId === propertyId));
  const semImovel = useTenantsStore((s) => s.tenants.filter((t) => t.propertyId !== propertyId));
  const update = useTenantsStore((s) => s.update);
  const openTenantForm = useModalStore((s) => s.openTenantForm);
  const [assocOpen, setAssocOpen] = useState(false);
  const [q, setQ] = useState("");

  const associar = (id: string) => {
    update(id, { propertyId });
    toast.success("Inquilino associado");
    setAssocOpen(false);
    setQ("");
  };

  const disponiveis = semImovel.filter(
    (t) => !q || t.nomeCompleto.toLowerCase().includes(q.toLowerCase()) || (t.nif ?? "").includes(q)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
        <div className="grid grid-cols-1 gap-2 sm:flex sm:justify-end">
          <Button size="sm" onClick={() => setAssocOpen(true)}>
            <Plus size={14} /> Associar inquilino existente
          </Button>
          <Button size="sm" onClick={() => openTenantForm(null, propertyId)}>
            <Plus size={14} /> Novo inquilino
          </Button>
        </div>
        <p className="text-[11px] text-muted sm:text-right">
          “Associar” liga inquilinos já registados · “Novo” cria do zero.
        </p>
      </div>

      {tenants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <Users2 size={28} className="mx-auto mb-2" />
            <p className="text-sm">Sem inquilinos associados a este imóvel.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tenants.map((t) => (
            <Link
              key={t.id}
              to={`/pessoas/inquilinos/${t.id}`}
              className="flex items-center gap-3 rounded-xl border border-line bg-card p-3 shadow-sm transition-colors hover:bg-bg"
            >
              <TenantAvatar tenant={t} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{t.nomeCompleto}</p>
                  <TenantTipoBadge tipo={t.tipoInquilino} />
                </div>
                <p className="text-xs text-muted">{t.email} · {t.telefone}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="num text-sm font-bold text-primary">{t.rendaMensal ? `${eur(t.rendaMensal)}/mês` : "—"}</p>
                <FimContratoInline dataFim={t.dataFimContrato} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal: associar inquilino existente */}
      {assocOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={() => setAssocOpen(false)}>
          <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="font-display text-base font-semibold text-ink">Associar inquilino existente</h3>
              <button onClick={() => setAssocOpen(false)} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>
            <div className="border-b border-line p-3">
              <div className="flex items-center gap-2 rounded-lg border border-line bg-bg px-3">
                <Eye size={14} className="text-muted" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar por nome ou NIF…" className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted" />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {disponiveis.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">Sem inquilinos disponíveis para associar.</p>
              ) : (
                disponiveis.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-accent/50">
                    <TenantAvatar tenant={t} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-ink">{t.nomeCompleto}</p>
                        <TenantTipoBadge tipo={t.tipoInquilino} />
                      </div>
                      <p className="text-xs text-muted">{t.nif ? `NIF ${t.nif}` : "NIF —"}</p>
                    </div>
                    <Button size="sm" onClick={() => associar(t.id)}><Plus size={14} /> Associar</Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Arrendamentos ─────────────────────────

function ImovelArrendamentosTab({ propertyId }: { propertyId: string }) {
  const arrendamentos = useArrendamentosStore((s) => s.arrendamentos.filter((a) => a.propertyId === propertyId));
  const navigate = useNavigate();
  const criarUrl = `/imoveis/arrendamentos/novo?imovel=${propertyId}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{arrendamentos.length} arrendamento(s) neste imóvel</p>
        <Button size="sm" onClick={() => navigate(criarUrl)}>
          <Plus size={14} /> Criar arrendamento
        </Button>
      </div>

      {arrendamentos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <KeyRound size={28} className="mx-auto mb-2" />
            <p className="text-sm">Este imóvel ainda não tem arrendamento.</p>
            <Button size="sm" variant="gold" className="mt-3" onClick={() => navigate(criarUrl)}>
              <Plus size={14} /> Criar arrendamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {arrendamentos.map((a) => (
            <Link
              key={a.id}
              to={`/imoveis/arrendamentos/${a.id}`}
              className="block rounded-xl border border-line bg-card p-4 shadow-sm transition-colors hover:bg-bg"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-sm font-semibold text-ink">{a.identificador}</span>
                    <EstadoBadge a={a} />
                    <TipoBadge tipo={a.tipo} />
                  </div>
                  <div className="mt-1.5"><InquilinoAvatares tenantIds={a.inquilinos} showNames /></div>
                </div>
                <p className="num text-base font-bold text-primary">{eur(rendaRecorrente(a))}/mês</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniKpi label="Início" value={a.dataInicio ? dataPT(a.dataInicio) : "—"} />
                <MiniKpi label="Fim" value={a.dataFim ? dataPT(a.dataFim) : "Sem termo"} />
                <MiniKpi label="Caução" value={a.caucao ? eur(a.caucao) : "—"} />
                <MiniKpi label="Dia pgto." value={`Dia ${a.diaPagamento}`} />
              </div>
              <p className="mt-2 text-sm text-secondary">Ver arrendamento →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Contratos ─────────────────────────

export function ImovelContratosTab({ propertyId }: { propertyId: string }) {
  const contracts = useContractsStore((s) => s.contracts.filter((c) => c.propertyId === propertyId));
  const tenants = useTenantsStore((s) => s.tenants);
  const openContractDoc = useModalStore((s) => s.openContractDoc);
  const tenantNome = (id?: string) => tenants.find((t) => t.id === id)?.nomeCompleto;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{contracts.length} contrato(s) neste imóvel</p>
        <Button size="sm" variant="outline" onClick={() => openContractDoc({ initialPropertyId: propertyId })}>
          <Upload size={14} /> Novo documento de contrato
        </Button>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <FileSignature size={28} className="mx-auto mb-2" />
            <p className="text-sm">Sem contratos associados a este imóvel.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => openContractDoc({ initialPropertyId: propertyId })}>
              <Upload size={14} /> Carregar documento de contrato
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => {
            const se = statusEfetivo(c);
            const dias = diasAteFimContrato(c.endDate);
            const statusTone = se === "active" ? "success" : se === "expiring" || se === "pending_signature" ? "warning" : "danger";
            return (
              <Link
                key={c.id}
                to={`/contratos/${c.id}`}
                className="block rounded-xl border border-line bg-card p-4 shadow-sm transition-colors hover:bg-bg"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-semibold text-ink">{tenantNome(c.primaryTenantId) ?? c.inquilinoLabel ?? "Inquilino"}</p>
                    <p className="text-xs text-muted">{CONTRACT_TIPO_LABEL[c.tipo]}{c.fileName ? ` · ${c.fileName}` : ""}</p>
                  </div>
                  <Badge tone={statusTone as "danger" | "warning" | "success"}>{CONTRACT_STATUS_LABEL[se]}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniKpi label="Início" value={c.startDate ? dataPT(c.startDate) : "—"} />
                  <MiniKpi label="Fim" value={c.endDate ? dataPT(c.endDate) : "—"} />
                  <MiniKpi label="Renda" value={c.monthlyRent ? eur(c.monthlyRent) : "—"} />
                  <MiniKpi label="Prazo" value={se === "expired" ? "Expirado" : dias !== null ? `${dias}d` : "—"} tone={se === "expired" ? "neg" : se === "expiring" ? "warn" : undefined} />
                </div>
                {se === "expiring" && dias !== null && dias >= 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
                    <TriangleAlert size={13} /> Contrato a expirar em {dias} dias — considere renovar.
                  </p>
                )}
                <p className="mt-2 text-sm text-secondary">Ver contrato →</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Documentos ─────────────────────────

export function ImovelDocumentosTab({ propertyId }: { propertyId: string }) {
  const docs = useDocumentsStore((s) => s.documents.filter((d) => d.propertyId === propertyId));
  const add = useDocumentsStore((s) => s.add);
  const remove = useDocumentsStore((s) => s.remove);
  const rename = useDocumentsStore((s) => s.rename);

  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<DocCategoria>("Contratos");
  const [url, setUrl] = useState("");

  const filtrados = docs.filter((d) => !q || d.nome.toLowerCase().includes(q.toLowerCase()));
  const porCategoria = DOC_CATEGORIAS.map((cat) => ({ cat, items: filtrados.filter((d) => d.categoria === cat) })).filter((g) => g.items.length > 0);

  const onAdd = (fileName?: string, dataUrl?: string) => {
    const finalNome = (fileName ?? nome).trim();
    const finalUrl = dataUrl ?? url.trim();
    if (!finalNome || !finalUrl) {
      toast.error("Indique nome e ficheiro/URL");
      return;
    }
    add({ propertyId, categoria, nome: finalNome, ficheiroUrl: finalUrl, mimeType: dataUrl ? "application/octet-stream" : "link", uploadedAt: new Date().toISOString().slice(0, 10) });
    setNome("");
    setUrl("");
    setShowForm(false);
    toast.success("Documento adicionado");
  };

  const onFiles = (files: FileList) => {
    Array.from(files).forEach((f) => {
      const r = new FileReader();
      r.onload = () => add({ propertyId, categoria, nome: f.name, ficheiroUrl: String(r.result), mimeType: f.type || "application/octet-stream", uploadedAt: new Date().toISOString().slice(0, 10) });
      r.readAsDataURL(f);
    });
    toast.success("Documento(s) carregado(s)");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3">
          <Eye size={15} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar documento…" className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted sm:w-56" />
        </div>
        <Button size="sm" variant={showForm ? "ghost" : "primary"} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : <><Upload size={14} /> Carregar documento</>}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Nome</span>
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Contrato 2026" className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Categoria</span>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value as DocCategoria)} className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary">
                  {DOC_CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted">URL (opcional)</span>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary" />
              </label>
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-bg py-6 text-sm text-muted hover:bg-accent">
              <Upload size={18} /> Arrastar ou escolher ficheiros (multi)
              <input type="file" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ""; }} />
            </label>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={() => onAdd()}><FileText size={14} /> Adicionar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {porCategoria.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <FileText size={28} className="mx-auto mb-2" />
            <p className="text-sm">Sem documentos para este imóvel.</p>
          </CardContent>
        </Card>
      ) : (
        porCategoria.map((g) => (
          <Card key={g.cat}>
            <CardContent>
              <TabSectionHeader title={`${g.cat} · ${g.items.length}`} />
              <ul className="space-y-2">
                {g.items.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-lg border border-line/60 bg-bg/40 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                        <FileText size={16} className="text-secondary" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{d.nome}</p>
                        <p className="text-[11px] text-muted">{dataPT(d.uploadedAt)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <a href={d.ficheiroUrl} target="_blank" rel="noreferrer" className="rounded p-1 text-muted hover:text-ink" title="Ver"><Eye size={14} /></a>
                      <a href={d.ficheiroUrl} download={d.nome} className="rounded p-1 text-muted hover:text-ink" title="Download"><Download size={14} /></a>
                      <button onClick={() => { const n = prompt("Novo nome:", d.nome); if (n?.trim()) rename(d.id, n.trim()); }} className="rounded p-1 text-muted hover:text-ink" title="Renomear"><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm(`Eliminar "${d.nome}"?`)) remove(d.id); }} className="rounded p-1 text-muted hover:text-danger" title="Eliminar"><Trash2 size={14} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ───────────────────────── Manutenção ─────────────────────────

const PRIORIDADE_TONE: Record<Prioridade, string> = {
  urgente: "bg-danger/12 text-danger",
  alta: "bg-warning/15 text-warning",
  normal: "bg-secondary/12 text-secondary",
  baixa: "bg-accent text-muted",
};

function ImovelManutencaoTab({ propertyId }: { propertyId: string }) {
  const requests = useMaintenanceStore((s) => s.requests.filter((r) => r.propertyId === propertyId));
  const add = useMaintenanceStore((s) => s.add);
  const update = useMaintenanceStore((s) => s.update);
  const remove = useMaintenanceStore((s) => s.remove);

  const [prioFiltro, setPrioFiltro] = useState<"todos" | Prioridade>("todos");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | EstadoPedido>("todos");
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>("normal");
  const [tecnico, setTecnico] = useState("");
  const [contacto, setContacto] = useState("");
  const [custoEst, setCustoEst] = useState(0);

  const filtrados = requests
    .filter((r) => prioFiltro === "todos" || r.prioridade === prioFiltro)
    .filter((r) => estadoFiltro === "todos" || r.estado === estadoFiltro);

  const onAdd = () => {
    if (!titulo.trim()) { toast.error("Indique o título do pedido"); return; }
    add({
      propertyId,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      categoria: "Geral",
      prioridade,
      estado: "aberto",
      tecnicoNome: tecnico.trim() || undefined,
      tecnicoContacto: contacto.trim() || undefined,
      custoEstimado: custoEst || undefined,
    });
    setTitulo(""); setDescricao(""); setPrioridade("normal"); setTecnico(""); setContacto(""); setCustoEst(0);
    setShowForm(false);
    toast.success("Pedido de manutenção criado");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <select value={prioFiltro} onChange={(e) => setPrioFiltro(e.target.value as typeof prioFiltro)} className="h-9 rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary">
            <option value="todos">Prioridade: Todas</option>
            {(Object.keys(PRIORIDADE_LABEL) as Prioridade[]).map((p) => <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>)}
          </select>
          <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value as typeof estadoFiltro)} className="h-9 rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary">
            <option value="todos">Estado: Todos</option>
            {(Object.keys(ESTADO_PEDIDO_LABEL) as EstadoPedido[]).map((e) => <option key={e} value={e}>{ESTADO_PEDIDO_LABEL[e]}</option>)}
          </select>
        </div>
        <Button size="sm" variant={showForm ? "ghost" : "primary"} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : <><Plus size={14} /> Novo pedido</>}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted">Título</span>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Esquentador a falhar" className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted">Descrição</span>
                <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-secondary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Prioridade</span>
                <select value={prioridade} onChange={(e) => setPrioridade(e.target.value as Prioridade)} className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary">
                  {(Object.keys(PRIORIDADE_LABEL) as Prioridade[]).map((p) => <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Custo estimado</span>
                <div className="flex items-center rounded-lg border border-line bg-card">
                  <input type="number" value={custoEst || ""} onChange={(e) => setCustoEst(Number(e.target.value) || 0)} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
                  <span className="px-3 text-sm text-muted">€</span>
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Técnico</span>
                <input value={tecnico} onChange={(e) => setTecnico(e.target.value)} placeholder="Nome" className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Contacto</span>
                <input value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Telefone" className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary" />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={onAdd}><Plus size={14} /> Criar pedido</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <Wrench size={28} className="mx-auto mb-2" />
            <p className="text-sm">Sem pedidos de manutenção para estes filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtrados.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", PRIORIDADE_TONE[r.prioridade])}>{PRIORIDADE_LABEL[r.prioridade]}</span>
                      <Badge tone={r.estado === "concluido" ? "success" : r.estado === "cancelado" ? "neutral" : r.estado === "em_curso" ? "warning" : "info"}>{ESTADO_PEDIDO_LABEL[r.estado]}</Badge>
                    </div>
                    <p className="mt-1.5 font-medium text-ink">{r.titulo}</p>
                    {r.descricao && <p className="text-xs text-muted">{r.descricao}</p>}
                  </div>
                  <button onClick={() => { if (confirm(`Eliminar "${r.titulo}"?`)) remove(r.id); }} className="rounded p-1 text-muted hover:text-danger"><Trash2 size={14} /></button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {r.tecnicoNome && <MiniKpi label="Técnico" value={r.tecnicoNome} />}
                  {r.tecnicoContacto && <MiniKpi label="Contacto" value={r.tecnicoContacto} />}
                  {r.custoEstimado ? <MiniKpi label="Custo estimado" value={eur(r.custoEstimado)} /> : null}
                  {r.custoFinal ? <MiniKpi label="Custo final" value={eur(r.custoFinal)} tone="neg" /> : null}
                </div>
                {r.estado !== "concluido" && r.estado !== "cancelado" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.estado === "aberto" && (
                      <Button size="sm" variant="outline" onClick={() => update(r.id, { estado: "em_curso" })}>
                        <PauseCircle size={13} /> Marcar em curso
                      </Button>
                    )}
                    <Button size="sm" variant="gold" onClick={() => update(r.id, { estado: "concluido", resolvedAt: new Date().toISOString().slice(0, 10) })}>
                      <CheckCircle2 size={13} /> Marcar concluído
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Histórico ─────────────────────────

function ImovelHistoricoTab({ property }: { property: Property }) {
  const tenants = useTenantsStore((s) => s.tenants.filter((t) => t.propertyId === property.id));
  const obras = useObrasStore((s) => s.obras.filter((o) => o.propertyId === property.id));
  const requests = useMaintenanceStore((s) => s.requests.filter((r) => r.propertyId === property.id));
  const docs = useDocumentsStore((s) => s.documents.filter((d) => d.propertyId === property.id));
  const txs = useTransactionsStore((s) => s.transactions.filter((t) => t.propertyId === property.id));

  const [filtro, setFiltro] = useState<"todos" | "imovel" | "inquilinos" | "obras" | "manutencao" | "movimentos">("todos");

  type Ev = { ts: string; tipo: typeof filtro; titulo: string; descricao: string; cor: string; icon: React.ReactNode };
  const eventos: Ev[] = [];

  eventos.push({ ts: property.createdAt.slice(0, 10), tipo: "imovel", titulo: "Imóvel criado", descricao: `${property.name} adicionado à carteira.`, cor: "bg-gold/15 text-gold-dark", icon: <Sparkles size={14} /> });

  for (const t of tenants) {
    if (t.dataInicioContrato) eventos.push({ ts: t.dataInicioContrato, tipo: "inquilinos", titulo: "Contrato iniciado", descricao: `${t.nomeCompleto}${t.rendaMensal ? ` · ${eur(t.rendaMensal)}/mês` : ""}.`, cor: "bg-success/12 text-success", icon: <FileSignature size={14} /> });
    if (t.dataFimContrato) {
      const exp = urgenciaContrato(t.dataFimContrato) === "expirado";
      eventos.push({ ts: t.dataFimContrato, tipo: "inquilinos", titulo: exp ? "Contrato terminado" : "Fim de contrato (previsto)", descricao: `${t.nomeCompleto} · ${dataPT(t.dataFimContrato)}.`, cor: exp ? "bg-danger/12 text-danger" : "bg-warning/15 text-warning", icon: <Clock size={14} /> });
    }
  }
  for (const o of obras) {
    eventos.push({ ts: o.createdAt, tipo: "obras", titulo: "Obra criada", descricao: `${o.titulo} · orç. ${eur(o.orcamento)}.`, cor: "bg-secondary/12 text-secondary", icon: <Hammer size={14} /> });
    if (o.estado === "concluida" && o.dataFimReal) eventos.push({ ts: o.dataFimReal, tipo: "obras", titulo: "Obra concluída", descricao: `${o.titulo} · gasto ${eur(o.gasto)}.`, cor: "bg-success/12 text-success", icon: <CheckCircle2 size={14} /> });
  }
  for (const r of requests) {
    eventos.push({ ts: r.createdAt, tipo: "manutencao", titulo: "Pedido de manutenção", descricao: `${r.titulo} · ${PRIORIDADE_LABEL[r.prioridade]}.`, cor: "bg-warning/15 text-warning", icon: <Wrench size={14} /> });
  }
  for (const d of docs) {
    eventos.push({ ts: d.uploadedAt, tipo: "imovel", titulo: "Documento adicionado", descricao: `${d.nome} (${d.categoria}).`, cor: "bg-accent text-muted", icon: <FileText size={14} /> });
  }
  // Movimentos relevantes (despesas grandes + rendas mais recentes)
  for (const t of txs.filter((x) => x.tipo === "despesa" && x.valor >= 150)) {
    eventos.push({ ts: t.data, tipo: "movimentos", titulo: "Despesa registada", descricao: `${t.categoria} · ${eur(t.valor)}.`, cor: "bg-danger/12 text-danger", icon: <FileText size={14} /> });
  }

  const filtrados = eventos
    .filter((e) => filtro === "todos" || e.tipo === filtro)
    .sort((a, b) => (a.ts < b.ts ? 1 : -1));

  const FILTROS: { k: typeof filtro; label: string }[] = [
    { k: "todos", label: "Todos" },
    { k: "inquilinos", label: "Inquilinos" },
    { k: "obras", label: "Obras" },
    { k: "manutencao", label: "Manutenção" },
    { k: "movimentos", label: "Movimentos" },
    { k: "imovel", label: "Imóvel" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.k}
            onClick={() => setFiltro(f.k)}
            className={cn("rounded-full px-3 py-1.5 text-sm transition-colors", filtro === f.k ? "bg-primary text-white" : "border border-line bg-card text-muted hover:bg-accent")}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <TabSectionHeader title="Timeline do imóvel" />
          {filtrados.length === 0 ? (
            <p className="text-sm text-muted">Sem eventos para este filtro.</p>
          ) : (
            <ol className="relative space-y-3 border-l border-line/60 pl-5">
              {filtrados.map((e, i) => (
                <li key={i} className="relative">
                  <span className={cn("absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full", e.cor)}>{e.icon}</span>
                  <p className="text-sm font-medium text-ink">{e.titulo}</p>
                  <p className="text-xs text-muted">{e.descricao}</p>
                  <p className="num mt-0.5 text-[11px] text-muted">{dataPT(e.ts)}</p>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 flex items-center gap-2 text-[11px] text-muted">
            <HistoryIcon size={12} /> Gerado automaticamente dos eventos nos vários stores.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
