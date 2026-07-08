import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  UserPlus,
  Hammer,
  Home,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Users2,
  Calendar,
  TrendingUp,
  Wallet,
  Receipt,
  FileText,
  Pencil,
  Trash2,
  Building2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import {
  useCollabStore,
  STATUS_LABEL,
  STATUS_TONE,
  SOCIO_ROLE_LABEL,
  podeGerir,
  type CollabProject,
  type ObraItem,
} from "@/store/useCollabStore";
import {
  useObrasStore,
  CATEGORIA_LABEL,
  ESTADO_LABEL,
  gastoReal,
  progressoReal,
  diasRestantes,
  estaAtrasada,
  estadoOrcamento,
  type Obra,
  type ObraEstado,
} from "@/store/useObrasStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { useModalStore } from "@/store/useModalStore";
import {
  ImovelInquilinosTab,
  ImovelContratosTab,
  ImovelDocumentosTab,
} from "@/pages/imoveis/ImovelDetail";
import { FinancasTab } from "@/pages/imoveis/FinancasTab";
import { SociosTab } from "@/components/collab/SociosTab";
import { DecisoesTab } from "@/components/collab/DecisoesTab";
import { AtividadeTab } from "@/components/collab/AtividadeTab";
import { calcularIMT } from "@/lib/calc/imt";
import { eur, pct, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

const TABS_REAB = ["Visão geral", "Cronograma", "Obras", "Sócios", "Decisões", "Galeria", "Documentos", "Atividade"] as const;
const TABS_ARR = ["Visão geral", "Inquilinos", "Contratos", "Finanças", "Obras", "Documentos", "Sócios", "Decisões", "Atividade"] as const;

type TabReab = (typeof TABS_REAB)[number];
type TabArr = (typeof TABS_ARR)[number];

export default function ProjectRoom() {
  const { id } = useParams();
  const project = useCollabStore((s) => s.projects.find((p) => p.id === id));

  if (!project)
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Projeto não encontrado.</p>
        <Link to="/comunidade/colaborativa" className="mt-2 inline-block text-secondary hover:underline">← Voltar</Link>
      </div>
    );

  return project.type === "reabilitacao" ? <ReabRoom project={project} /> : <ArrRoom project={project} />;
}

/* ═══════════════════════════ Shared helpers ═══════════════════════════ */

const tooltipStyle = { borderRadius: 12, border: "1px solid #E8D5BE", fontSize: 13 } as const;

function SH({ title }: { title: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-widest text-secondary">
      <span className="h-1.5 w-1.5 rounded-full bg-gold" />
      {title}
      <Sparkles size={10} className="text-gold/40" />
    </h3>
  );
}

function MC({ label, value, tone, highlighted }: { label: string; value: string; tone?: "gold" | "success" | "danger" | "warning"; highlighted?: boolean }) {
  const color = tone === "gold" ? "text-gold-dark" : tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink";
  const dot = tone === "gold" ? "bg-gold" : tone === "success" ? "bg-success" : tone === "danger" ? "bg-danger" : tone === "warning" ? "bg-warning" : "bg-secondary";
  return (
    <div className={cn("rounded-xl border border-line/60 p-3", highlighted ? "bg-gradient-to-br from-accent to-card" : "bg-bg/40")}>
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
        <span className={cn("inline-block h-1.5 w-1.5 rounded-full", dot)} />{label}
      </p>
      <p className={cn("mt-1 num text-base font-bold", color)}>{value}</p>
    </div>
  );
}

function BigKpi({ label, value, tone }: { label: string; value: string; tone?: "gold" | "success" | "danger" | "warning" }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : tone === "gold" ? "text-gold-dark" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-card p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={cn("num mt-1 text-2xl font-bold", color)}>{value}</p>
    </div>
  );
}

function HeroProject({ project: p }: { project: CollabProject }) {
  const navigate = useNavigate();
  const openCollabForm = useModalStore((s) => s.openCollabForm);
  const removeProject = useCollabStore((s) => s.remove);
  const isReab = p.type === "reabilitacao";
  const gestor = podeGerir(p, CURRENT_USER_ID);
  const inv = isReab ? (p.precoAquisicao ?? 0) + (p.custosAquisicao ?? 0) + (p.orcamentoObras ?? 0) : (p.capitalInvestido ?? 0);
  const lucro = isReab
    ? (() => { const v = (p.valorVendaPrevisto ?? 0) - inv; return v - v * ((p.taxaImpostos ?? 0) / 100); })()
    : ((p.rendaMensal ?? 0) - (p.despesasMensais ?? 0)) * 12;

  const eliminar = () => {
    if (!confirm(`Eliminar o projeto "${p.title}"? Esta ação não pode ser anulada.`)) return;
    removeProject(p.id);
    toast.success("Projeto eliminado");
    navigate("/comunidade/colaborativa");
  };

  return (
    <>
      <Link to="/comunidade/colaborativa" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Gestão colaborativa
      </Link>
      <div className="relative overflow-hidden rounded-2xl">
        {p.coverImageUrl ? <img src={p.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-gradient-to-br from-[#2E1A0E] to-[#5C3D2E]" />}
        <div className="azulejo absolute inset-0 opacity-[0.06]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/40 to-transparent" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm text-gold-soft">PROJETO #{p.number}</span>
              <Badge tone={STATUS_TONE[p.status] as any}>{STATUS_LABEL[p.status]}</Badge>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", isReab ? "bg-secondary/20 text-white" : "bg-success/20 text-white")}>
                {isReab ? "Reabilitação" : "Arrendamento"}
              </span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">{p.title}</h1>
            <p className="text-sm text-white/70">{p.city} · {p.partners.length} sócios</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="mr-2 text-right">
              <p className="text-xs text-white/50">{isReab ? "Lucro líquido est." : "Cashflow anual"}</p>
              <p className="num text-2xl font-bold text-success">{eur(lucro)}</p>
            </div>
            {gestor && (
              <>
                <Button variant="gold" onClick={() => openCollabForm(p.id)}><UserPlus size={15} /> Convidar sócio</Button>
                <Button variant="outline" className="bg-card/90" onClick={() => openCollabForm(p.id)}><Pencil size={15} /> Editar</Button>
                <Button variant="danger" onClick={eliminar}><Trash2 size={15} /> Eliminar</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Placeholder({ name }: { name: string }) {
  return (
    <Card className="mt-5"><CardContent className="py-12 text-center text-muted">
      <p className="text-sm">O separador «{name}» faz parte da Fase 3 — Colaboração, a ligar ao backend Supabase.</p>
    </CardContent></Card>
  );
}

function DonutCard({ title, data }: { title: string; data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  if (total === 0) return null;
  return (
    <Card>
      <CardContent>
        <SH title={title} />
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <PieChart width={170} height={170}>
            <Pie data={data} dataKey="value" innerRadius={48} outerRadius={78} stroke="none">
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v: number) => eur(v)} />
          </PieChart>
          <div className="flex-1 space-y-1.5">
            {data.map((d) => (
              <div key={d.name} className="flex items-center justify-between border-b border-line/60 py-1.5 text-sm last:border-0">
                <span className="flex items-center gap-2 text-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} /> {d.name}</span>
                <span className="num font-medium text-ink">{eur(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PartnerBars({ partners, valuePerPct, suffix }: { partners: CollabProject["partners"]; valuePerPct: number; suffix?: string }) {
  return (
    <div className="space-y-3">
      {partners.map((s) => (
        <div key={s.id}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="flex items-center gap-2 text-ink">
              <span className="h-3 w-3 rounded-full" style={{ background: s.color }} /> {s.name} · {s.pct}%
            </span>
            <span className="num font-semibold text-success">{eur(valuePerPct * (s.pct / 100))}{suffix ?? ""}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-accent">
            <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BuroItem({ label, value, info, done }: { label: string; value?: string; info?: string; done?: boolean }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", done ? "border-success/30 bg-success/5" : "border-line bg-bg/40")}>
      {done ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" /> : <Clock size={16} className="mt-0.5 shrink-0 text-muted" />}
      <div>
        <p className={cn("text-sm font-medium", done ? "text-success" : "text-ink")}>{label}</p>
        {value && <p className="num text-xs text-muted">{value}</p>}
        {info && <p className="text-[11px] text-muted">{info}</p>}
      </div>
    </div>
  );
}

function ObraStatusBadge({ status }: { status: ObraItem["status"] }) {
  if (status === "concluida") return <Badge tone="success"><CheckCircle2 size={10} /> Concluída</Badge>;
  if (status === "em_curso") return <Badge tone="warning"><Clock size={10} /> Em curso</Badge>;
  return <Badge tone="neutral">Pendente</Badge>;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━ REABILITAÇÃO ROOM ━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ReabRoom({ project: p }: { project: CollabProject }) {
  const [tab, setTab] = useState<TabReab>("Visão geral");

  const inv = (p.precoAquisicao ?? 0) + (p.custosAquisicao ?? 0) + (p.orcamentoObras ?? 0);
  const totalGasto = (p.precoAquisicao ?? 0) + (p.custosAquisicao ?? 0) + (p.gastoObras ?? 0);
  const saldo = (p.orcamentoObras ?? 0) - (p.gastoObras ?? 0);
  const venda = p.valorVendaReal ?? p.valorVendaPrevisto ?? 0;
  const maisValia = venda - inv;
  const impostos = maisValia * ((p.taxaImpostos ?? 0) / 100);
  const lucro = maisValia - impostos;
  const roi = inv > 0 ? (lucro / inv) * 100 : 0;
  const obraPct = p.orcamentoObras && p.orcamentoObras > 0 ? ((p.gastoObras ?? 0) / p.orcamentoObras) * 100 : 0;

  const hoje = new Date();
  const diasDecorridos = p.dataCompra ? daysBetween(p.dataCompra, hoje.toISOString().slice(0, 10)) : 0;
  const diasPrevistos = p.dataCompra && p.dataVendaPrevista ? daysBetween(p.dataCompra, p.dataVendaPrevista) : 1;
  const tempoPct = Math.min(100, (diasDecorridos / diasPrevistos) * 100);

  return (
    <>
      <HeroProject project={p} />

      {/* KPI strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <BigKpi label="Investimento total" value={eur(inv)} tone="gold" />
        <BigKpi label="Valor de venda" value={eur(venda)} />
        <BigKpi label="Lucro líquido" value={eur(lucro)} tone="success" />
        <BigKpi label="Rentabilidade" value={pct(roi)} tone="gold" />
        <BigKpi label="Tempo" value={`${diasDecorridos} / ${diasPrevistos} dias`} tone={diasDecorridos > diasPrevistos ? "danger" : "warning"} />
        <BigKpi label="Obra" value={pct(obraPct, 0)} tone="warning" />
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS_REAB.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors", tab === t ? "border-gold font-medium text-gold-dark" : "border-transparent text-muted hover:text-ink")}>{t}</button>
        ))}
      </div>

      {tab === "Visão geral" && <ReabVisaoGeral p={p} inv={inv} totalGasto={totalGasto} saldo={saldo} venda={venda} maisValia={maisValia} impostos={impostos} lucro={lucro} roi={roi} obraPct={obraPct} />}
      {tab === "Cronograma" && <CronogramaTab project={p} />}
      {tab === "Obras" && <ObrasTab project={p} />}
      {tab === "Documentos" && <ProjectPropertyTab project={p} render={(pid) => <ImovelDocumentosTab propertyId={pid} />} />}
      {tab === "Sócios" && <SociosTab project={p} />}
      {tab === "Decisões" && <DecisoesTab project={p} />}
      {tab === "Atividade" && <AtividadeTab project={p} />}
      {tab === "Galeria" && <Placeholder name={tab} />}
    </>
  );
}

function ReabVisaoGeral({ p, inv, totalGasto, saldo, venda, maisValia, impostos, lucro, roi, obraPct }: {
  p: CollabProject; inv: number; totalGasto: number; saldo: number; venda: number; maisValia: number; impostos: number; lucro: number; roi: number; obraPct: number;
}) {
  const composition = [
    { name: "Compra", value: p.precoAquisicao ?? 0, color: "#5C3D2E" },
    { name: "Obra", value: p.orcamentoObras ?? 0, color: "#C8A664" },
    { name: "Custos aquisição", value: p.custosAquisicao ?? 0, color: "#8B5E3C" },
    { name: "Impostos venda", value: impostos, color: "#9B3A2A" },
  ];
  const resultado = [
    { name: "Lucro líquido", value: lucro, color: "#4A7C59" },
    { name: "Investimento", value: inv, color: "#5C3D2E" },
    { name: "Impostos", value: impostos, color: "#9B3A2A" },
  ];

  return (
    <div className="mt-5 space-y-5">
      {/* Resumo executivo */}
      <Card>
        <CardContent>
          <SH title="Resumo executivo" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MC label="Investimento total" value={eur(inv)} tone="gold" highlighted />
            <MC label="Total gasto" value={eur(totalGasto)} />
            <MC label="Saldo disponível" value={eur(saldo)} tone={saldo >= 0 ? "success" : "danger"} />
            <MC label="Valor de venda" value={eur(venda)} tone="gold" />
            <MC label="Mais-valia bruta" value={eur(maisValia)} tone="success" highlighted />
            <MC label="Impostos estimados" value={eur(impostos)} tone="danger" />
            <MC label="Lucro líquido" value={eur(lucro)} tone="success" highlighted />
            <MC label="Rentabilidade" value={pct(roi)} tone="gold" highlighted />
            <MC label="Estado da obra" value={pct(obraPct, 0)} tone="warning" />
          </div>
        </CardContent>
      </Card>

      {/* Burocracia */}
      <Card>
        <CardContent>
          <SH title="Burocracia — flip" />
          <div className="grid gap-2 sm:grid-cols-2">
            <BuroItem label="IMT na compra" value={eur(calcularIMT(p.precoAquisicao ?? 0, "HS"))} done />
            <BuroItem label="Licença de obras (Câmara)" done={p.cronograma?.find((e) => e.nome.toLowerCase().includes("licen"))?.concluida ?? false} />
            <BuroItem label={`IVA da obra ${p.zonaARU ? "6% (zona ARU)" : "23%"}`} info={p.zonaARU ? "Benefício fiscal ARU aplicável" : "Taxa normal"} />
            <BuroItem label="Certificação energética" />
            <BuroItem label="Mais-valias (IRS/IRC) na venda" info={`Taxa estimada: ${p.taxaImpostos ?? 0}%`} />
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {p.budgetTimeline && p.budgetTimeline.length > 0 && (
          <Card>
            <CardContent>
              <SH title="Orçamento previsto vs real" />
              <div className="overflow-x-auto">
                <BarChart width={440} height={220} data={p.budgetTimeline} barGap={4}>
                  <CartesianGrid vertical={false} stroke="#E8D5BE" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} width={40} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => eur(v)} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="previsto" name="Previsto" fill="#E8D5BE" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="real" name="Real" fill="#5C3D2E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </div>
            </CardContent>
          </Card>
        )}

        {p.expensesByCategory && p.expensesByCategory.length > 0 && (
          <Card>
            <CardContent>
              <SH title="Despesas por categoria" />
              <div className="overflow-x-auto">
                <BarChart width={440} height={220} data={p.expensesByCategory} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="categoria" width={90} tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => eur(v)} contentStyle={tooltipStyle} />
                  <Bar dataKey="valor" fill="#C8A664" radius={[0, 4, 4, 0]} />
                </BarChart>
              </div>
            </CardContent>
          </Card>
        )}

        <DonutCard title="Composição do investimento" data={composition} />
        <DonutCard title="Resultado final" data={resultado} />

        {/* Evolução no tempo */}
        {p.budgetTimeline && p.budgetTimeline.length > 0 && (
          <Card className="lg:col-span-2">
            <CardContent>
              <SH title="Evolução acumulada" />
              <div className="overflow-x-auto">
                <LineChart width={700} height={220} data={p.budgetTimeline}>
                  <CartesianGrid vertical={false} stroke="#E8D5BE" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} width={48} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => eur(v)} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="previsto" name="Previsto" stroke="#E8D5BE" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Line type="monotone" dataKey="real" name="Real" stroke="#5C3D2E" strokeWidth={2.5} dot={{ r: 3, fill: "#5C3D2E" }} />
                </LineChart>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Distribuição do lucro */}
      <Card>
        <CardContent>
          <SH title="Distribuição do lucro" />
          <PartnerBars partners={p.partners} valuePerPct={lucro} />
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────────────────────── Cronograma ─────────────────────────  */

function CronogramaTab({ project: p }: { project: CollabProject }) {
  const etapas = p.cronograma ?? [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const holdingMensal = (p.jurosMensais ?? 0) + (p.imiMensal ?? 0) + (p.condominioMensal ?? 0) + (p.seguroMensal ?? 0);
  const mesesDecorridos = p.dataCompra ? Math.max(0, (today.getFullYear() - new Date(p.dataCompra).getFullYear()) * 12 + today.getMonth() - new Date(p.dataCompra).getMonth()) : 0;
  const holdingTotal = holdingMensal * mesesDecorridos;

  const diasTotal = p.dataCompra && p.dataVendaPrevista ? daysBetween(p.dataCompra, p.dataVendaPrevista) : 0;
  const diasDecorridos = p.dataCompra ? Math.max(0, daysBetween(p.dataCompra, todayStr)) : 0;

  if (etapas.length === 0)
    return (
      <Card className="mt-5"><CardContent className="py-12 text-center text-muted">
        <Calendar size={28} className="mx-auto mb-2" />
        <p className="text-sm">Nenhuma etapa definida. Adicione etapas ao cronograma.</p>
      </CardContent></Card>
    );

  return (
    <div className="mt-5 space-y-4">
      {/* Tempo global */}
      <Card>
        <CardContent>
          <SH title="Holding period" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MC label="Data de compra" value={p.dataCompra ? dataPT(p.dataCompra) : "—"} />
            <MC label="Venda prevista" value={p.dataVendaPrevista ? dataPT(p.dataVendaPrevista) : "—"} tone="gold" />
            <MC label="Dias decorridos / previstos" value={`${diasDecorridos} / ${diasTotal}`} tone={diasDecorridos > diasTotal ? "danger" : "warning"} highlighted />
            <MC label="Duração obra" value={p.tempoDeObra ?? "—"} />
          </div>
          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted">
              <span>Compra</span>
              <span className={cn("rounded-full px-2 py-0.5", diasDecorridos > diasTotal ? "bg-danger/15 text-danger" : "bg-gold/15 text-gold-dark")}>
                Hoje · dia {diasDecorridos}
              </span>
              <span>Venda</span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-accent">
              <div
                className={cn("h-full rounded-full transition-all", diasDecorridos > diasTotal ? "bg-danger" : "bg-gold")}
                style={{ width: `${Math.min(100, (diasDecorridos / Math.max(1, diasTotal)) * 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent>
          <SH title="Fases do projeto" />
          <div className="space-y-0">
            {etapas.map((e) => {
              const start = new Date(`${e.dataInicio}T00:00:00`);
              const end = new Date(`${e.dataFim}T00:00:00`);
              const isLate = !e.concluida && end < today;
              const isCurrent = !e.concluida && start <= today && end >= today;
              const dias = daysBetween(e.dataInicio, e.dataFim);
              return (
                <div key={e.id} className={cn("relative flex gap-4 border-l-2 pb-6 pl-6 last:pb-0", e.concluida ? "border-success" : isCurrent ? "border-gold" : isLate ? "border-danger" : "border-line")}>
                  <div className={cn("absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-card", e.concluida ? "bg-success" : isCurrent ? "bg-gold" : isLate ? "bg-danger" : "bg-line")} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={cn("font-medium", e.concluida ? "text-muted line-through" : isCurrent ? "text-gold-dark" : isLate ? "text-danger" : "text-ink")}>{e.nome}</h4>
                      {e.concluida && <CheckCircle2 size={14} className="text-success" />}
                      {isLate && <Badge tone="danger"><AlertTriangle size={10} /> Atrasada</Badge>}
                      {isCurrent && <Badge tone="gold">Em curso</Badge>}
                    </div>
                    <p className="text-xs text-muted">{dataPT(e.dataInicio)} → {dataPT(e.dataFim)} · {dias} dias</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custos de detenção */}
      {holdingMensal > 0 && (
        <Card>
          <CardContent>
            <SH title="Custos de detenção" />
            <p className="mb-3 text-sm text-muted">Cada mês a mais custa <strong className="text-danger">{eur(holdingMensal)}</strong> — estes custos correm enquanto o imóvel não é vendido.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MC label="Juros do crédito" value={eur(p.jurosMensais ?? 0)} tone="danger" />
              <MC label="IMI (mensal)" value={eur(p.imiMensal ?? 0)} tone="danger" />
              <MC label="Condomínio" value={eur(p.condominioMensal ?? 0)} />
              <MC label="Seguro" value={eur(p.seguroMensal ?? 0)} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MC label="Total mensal" value={eur(holdingMensal)} tone="danger" highlighted />
              <MC label={`Acumulado (${mesesDecorridos} meses)`} value={eur(holdingTotal)} tone="danger" highlighted />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ───────────────────────── Obras tab ───────────────────────── */

function ObrasTab({ project: p }: { project: CollabProject }) {
  const obras = useObrasStore((s) => s.obras.filter((o) => o.projectId === p.id));
  const fases = useObrasStore((s) => s.fases);
  const despesas = useObrasStore((s) => s.despesas);
  const openObraForm = useModalStore((s) => s.openObraForm);

  const total = obras.reduce((s, o) => s + o.orcamento, 0);
  const gastoTot = obras.reduce((s, o) => s + gastoReal(o, despesas), 0);
  const concluidas = obras.filter((o) => o.estado === "concluida").length;
  const emCurso = obras.filter((o) => o.estado === "em_curso" || o.estado === "atrasada").length;
  const atrasadasCount = obras.filter((o) => estaAtrasada(o)).length;

  const columns: { key: ObraEstado | "ativa"; title: string; color: string; match: (o: Obra) => boolean }[] = [
    { key: "por_iniciar", title: "Por iniciar", color: "border-line", match: (o) => o.estado === "por_iniciar" },
    { key: "ativa", title: "Em curso", color: "border-warning", match: (o) => o.estado === "em_curso" || o.estado === "atrasada" },
    { key: "pausada", title: "Pausada", color: "border-secondary", match: (o) => o.estado === "pausada" },
    { key: "concluida", title: "Concluída", color: "border-success", match: (o) => o.estado === "concluida" },
  ];

  return (
    <div className="mt-5 space-y-4">
      {/* Summary + acção */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-5">
          <MC label="Total" value={String(obras.length)} />
          <MC label="Concluídas" value={`${concluidas}/${obras.length}`} tone="success" />
          <MC label="Em curso" value={String(emCurso)} tone="warning" />
          <MC label="Atrasadas" value={String(atrasadasCount)} tone={atrasadasCount > 0 ? "danger" : undefined} />
          <MC label="Gasto / Orç." value={`${eur(gastoTot)} / ${eur(total)}`} tone={gastoTot > total ? "danger" : "gold"} highlighted />
        </div>
        <Button size="sm" variant="gold" onClick={() => openObraForm({ initialProjectId: p.id })}>
          <Plus size={14} /> Nova obra
        </Button>
      </div>

      {/* Kanban */}
      {obras.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted">
          <Hammer size={28} className="mx-auto mb-2" />
          <p className="text-sm">Nenhuma obra registada neste projeto.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => openObraForm({ initialProjectId: p.id })}>
            <Plus size={14} /> Adicionar primeira obra
          </Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) => {
            const items = obras.filter(col.match);
            return (
              <div key={col.key} className={cn("rounded-2xl border-t-4 bg-bg/50 p-3", col.color)}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{col.title} · {items.length}</p>
                <div className="space-y-2">
                  {items.map((o) => <ProjectObraCard key={o.id} obra={o} fases={fases} despesas={despesas} />)}
                  {items.length === 0 && <p className="py-4 text-center text-xs text-muted">Nenhum item</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectObraCard({ obra: o, fases, despesas }: { obra: Obra; fases: ReturnType<typeof useObrasStore.getState>["fases"]; despesas: ReturnType<typeof useObrasStore.getState>["despesas"] }) {
  const g = gastoReal(o, despesas);
  const prog = progressoReal(o, fases);
  const desvio = g - o.orcamento;
  const pctUsed = o.orcamento > 0 ? (g / o.orcamento) * 100 : 0;
  const estOrc = estadoOrcamento(o, despesas);
  const barColor = estOrc === "vermelho" ? "bg-danger" : estOrc === "ambar" ? "bg-warning" : "bg-success";
  const dias = diasRestantes(o);
  const atrasada = estaAtrasada(o);
  return (
    <Link to={`/obra/${o.id}`} className="block rounded-xl border border-line bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink">{o.titulo}</p>
          <p className="text-[11px] text-muted">{CATEGORIA_LABEL[o.categoria]}</p>
        </div>
        <ObraEstadoBadgeMini estado={o.estado} />
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-[10px] text-muted">
          <span>{eur(g)} / {eur(o.orcamento)}</span>
          <span className={cn("font-semibold", desvio > 0 ? "text-danger" : desvio < 0 ? "text-success" : "text-muted")}>
            {desvio !== 0 ? `${desvio > 0 ? "+" : ""}${eur(desvio)}` : "em linha"}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-accent">
          <div className={cn("h-full rounded-full", barColor)} style={{ width: `${Math.min(100, pctUsed)}%` }} />
        </div>
      </div>
      {prog > 0 && o.estado !== "concluida" && (
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-muted">
            <span>Progresso</span>
            <span className="font-semibold text-warning">{prog}%</span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-accent">
            <div className="h-full rounded-full bg-warning" style={{ width: `${prog}%` }} />
          </div>
        </div>
      )}
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted">
        <span>{dataPT(o.dataInicio)} → {dataPT(o.dataFimPrevista)}</span>
        {o.estado !== "concluida" && (
          <span className={cn("font-semibold", atrasada ? "text-danger" : "text-muted")}>
            {atrasada ? `${Math.abs(dias)}d atrasada` : `${dias}d restantes`}
          </span>
        )}
      </div>
    </Link>
  );
}

function ObraEstadoBadgeMini({ estado }: { estado: ObraEstado }) {
  const map: Record<ObraEstado, "neutral" | "info" | "warning" | "success" | "danger"> = {
    por_iniciar: "neutral",
    em_curso: "info",
    pausada: "warning",
    concluida: "success",
    atrasada: "danger",
  };
  return <Badge tone={map[estado]}>{ESTADO_LABEL[estado]}</Badge>;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━ ARRENDAMENTO ROOM ━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ArrRoom({ project: p }: { project: CollabProject }) {
  const [tab, setTab] = useState<TabArr>("Visão geral");

  const rendaAnual = (p.rendaMensal ?? 0) * 12;
  const despAnual = (p.despesasMensais ?? 0) * 12;
  const cashflowMensal = (p.rendaMensal ?? 0) - (p.despesasMensais ?? 0);
  const cashflowAnual = rendaAnual - despAnual;

  return (
    <>
      <HeroProject project={p} />

      {/* KPI strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <BigKpi label="Capital investido" value={eur(p.capitalInvestido ?? 0)} tone="gold" />
        <BigKpi label="Renda mensal" value={eur(p.rendaMensal ?? 0)} tone="success" />
        <BigKpi label="Cashflow mensal" value={eur(cashflowMensal)} tone={cashflowMensal >= 0 ? "success" : "danger"} />
        <BigKpi label="Yield líquido" value={pct(p.yieldLiquido ?? 0)} tone="gold" />
        <BigKpi label="Ocupação" value={pct(p.taxaOcupacao ?? 0, 0)} tone="success" />
        <BigKpi label="Cashflow anual" value={eur(cashflowAnual)} tone="success" />
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS_ARR.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors", tab === t ? "border-gold font-medium text-gold-dark" : "border-transparent text-muted hover:text-ink")}>{t}</button>
        ))}
      </div>

      {tab === "Visão geral" && <ArrVisaoGeral p={p} cashflowMensal={cashflowMensal} cashflowAnual={cashflowAnual} />}
      {tab === "Inquilinos" && <ProjectPropertyTab project={p} render={(pid) => <ImovelInquilinosTab propertyId={pid} />} />}
      {tab === "Contratos" && <ProjectPropertyTab project={p} render={(pid) => <ImovelContratosTab propertyId={pid} />} />}
      {tab === "Finanças" && <FinancasComSocios project={p} />}
      {tab === "Obras" && <ObrasTab project={p} />}
      {tab === "Documentos" && <ProjectPropertyTab project={p} render={(pid) => <ImovelDocumentosTab propertyId={pid} />} />}
      {tab === "Sócios" && <SociosTab project={p} />}
      {tab === "Decisões" && <DecisoesTab project={p} />}
      {tab === "Atividade" && <AtividadeTab project={p} />}
    </>
  );
}

/* ───────────────────────── Reuso das tabs do imóvel ───────────────────────── */

/** Envolve uma tab operacional do imóvel; mostra estado vazio quando o projeto não tem imóvel associado. */
function ProjectPropertyTab({ project: p, render }: { project: CollabProject; render: (propertyId: string) => React.ReactNode }) {
  const property = usePropertiesStore((s) => (p.propertyId ? s.properties.find((x) => x.id === p.propertyId) : undefined));
  if (!p.propertyId || !property) {
    return (
      <Card className="mt-5"><CardContent className="py-12 text-center text-muted">
        <Building2 size={28} className="mx-auto mb-2" />
        <p className="text-sm">Este projeto ainda não tem um imóvel associado.</p>
        <p className="mt-1 text-xs">Edite o projeto e associe um imóvel para ativar esta secção.</p>
      </CardContent></Card>
    );
  }
  return <div className="mt-5">{render(p.propertyId)}</div>;
}

/** Finanças do imóvel (reutilizado) + distribuição do resultado por sócios. */
function FinancasComSocios({ project: p }: { project: CollabProject }) {
  const property = usePropertiesStore((s) => (p.propertyId ? s.properties.find((x) => x.id === p.propertyId) : undefined));
  const txs = useTransactionsStore((s) => s.transactions);

  const resultado = useMemo(() => {
    if (!p.propertyId) return 0;
    return txs
      .filter((t) => t.propertyId === p.propertyId)
      .reduce((acc, t) => acc + (t.tipo === "receita" ? t.valor : -t.valor), 0);
  }, [txs, p.propertyId]);

  if (!p.propertyId || !property) {
    return (
      <Card className="mt-5"><CardContent className="py-12 text-center text-muted">
        <Building2 size={28} className="mx-auto mb-2" />
        <p className="text-sm">Associe um imóvel ao projeto para acompanhar as finanças.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      {/* Distribuição por sócios */}
      <Card>
        <CardContent>
          <SH title="Distribuição por sócios" />
          <p className="mb-3 text-xs text-muted">
            Resultado acumulado do imóvel (receitas − despesas) repartido pela percentagem de cada sócio.
          </p>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.partners.map((s) => (
              <div key={s.id} className="rounded-xl border border-line bg-bg/40 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                  <p className="truncate text-sm font-medium text-ink">{s.name}</p>
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted">{s.pct}% do capital</p>
                <p className={cn("num mt-1 text-base font-bold", resultado >= 0 ? "text-success" : "text-danger")}>
                  {eur(resultado * (s.pct / 100))}
                </p>
              </div>
            ))}
          </div>
          <PartnerBars partners={p.partners} valuePerPct={resultado} />
        </CardContent>
      </Card>

      {/* Deep dive financeiro do imóvel (reutilizado dos imóveis solo) */}
      <FinancasTab property={property} />
    </div>
  );
}

/* Tab Sócios agora vive em components/collab/SociosTab (donut + convites + gestão). */

function ArrVisaoGeral({ p, cashflowMensal, cashflowAnual }: { p: CollabProject; cashflowMensal: number; cashflowAnual: number }) {
  const prestacao = p.prestacaoBancaria ?? 0;
  const imi = (p.imiAnual ?? 0) / 12;
  const seguro = (p.seguroAnual ?? 0) / 12;
  const cond = p.condominioArr ?? 0;
  const outras = p.outrasDespesas ?? 0;

  const distribDespesas = [
    { name: "Prestação bancária", value: prestacao * 12, color: "#5C3D2E" },
    { name: "IMI", value: p.imiAnual ?? 0, color: "#9B3A2A" },
    { name: "Seguro", value: p.seguroAnual ?? 0, color: "#C8A664" },
    { name: "Condomínio", value: cond * 12, color: "#8B5E3C" },
    { name: "Outras", value: outras * 12, color: "#E8D5BE" },
  ].filter((d) => d.value > 0);

  const cashflowEvol = (p.distribuicaoMensal ?? []).map((m, i) => ({
    mes: m.mes,
    Receita: m.receita,
    Despesa: m.despesa,
    Cashflow: m.receita - m.despesa,
    Acumulado: (p.distribuicaoMensal ?? []).slice(0, i + 1).reduce((s, x) => s + x.receita - x.despesa, 0),
  }));

  const rendaAnual = (p.rendaMensal ?? 0) * 12;
  const despAnual = (p.despesasMensais ?? 0) * 12;

  // Alertas
  const alertas: { cor: string; texto: string }[] = [];
  if ((p.yieldLiquido ?? 0) >= 4) alertas.push({ cor: "success", texto: `Yield líquido ${pct(p.yieldLiquido ?? 0)} — bom` });
  else if ((p.yieldLiquido ?? 0) >= 2) alertas.push({ cor: "warning", texto: `Yield líquido ${pct(p.yieldLiquido ?? 0)} — atenção` });
  else alertas.push({ cor: "danger", texto: `Yield líquido ${pct(p.yieldLiquido ?? 0)} — baixo` });
  if (cashflowMensal > 0) alertas.push({ cor: "success", texto: `Cashflow positivo: ${eur(cashflowMensal)}/mês` });
  else alertas.push({ cor: "danger", texto: `Cashflow negativo: ${eur(cashflowMensal)}/mês` });
  if ((p.taxaOcupacao ?? 0) >= 95) alertas.push({ cor: "success", texto: `Ocupação ${pct(p.taxaOcupacao ?? 0, 0)} — excelente` });

  return (
    <div className="mt-5 space-y-5">
      {/* 17 KPIs */}
      <Card>
        <CardContent>
          <SH title="Indicadores do investimento" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <MC label="Preço do imóvel" value={eur(p.precoImovel ?? 0)} />
            <MC label="Capital investido" value={eur(p.capitalInvestido ?? 0)} tone="gold" highlighted />
            <MC label="Renda mensal" value={eur(p.rendaMensal ?? 0)} tone="success" />
            <MC label="Receita anual" value={eur(rendaAnual)} tone="success" />
            <MC label="Despesas mensais" value={eur(p.despesasMensais ?? 0)} tone="danger" />
            <MC label="Despesas anuais" value={eur(despAnual)} tone="danger" />
            <MC label="Cashflow mensal" value={eur(cashflowMensal)} tone={cashflowMensal >= 0 ? "success" : "danger"} highlighted />
            <MC label="Cashflow anual" value={eur(cashflowAnual)} tone="success" highlighted />
            <MC label="Yield bruto" value={pct(p.yieldBruto ?? 0)} tone="gold" />
            <MC label="Yield líquido" value={pct(p.yieldLiquido ?? 0)} tone="gold" highlighted />
            <MC label="Taxa de ocupação" value={pct(p.taxaOcupacao ?? 0, 0)} tone="success" />
            <MC label="Recibos emitidos" value={String(p.recibosEmitidos ?? 0)} />
            <MC label="Contrato" value={p.contratoTipo ?? "—"} />
            <MC label="Início contrato" value={p.contratoInicio ? dataPT(p.contratoInicio) : "—"} />
            <MC label="Fim contrato" value={p.contratoFim ? dataPT(p.contratoFim) : "—"} tone="warning" />
            <MC label="Inquilino" value={p.inquilino ?? "—"} />
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {alertas.length > 0 && (
        <Card>
          <CardContent>
            <SH title="Alertas" />
            <div className="flex flex-wrap gap-2">
              {alertas.map((a, i) => (
                <span key={i} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
                  a.cor === "success" ? "border-success/30 bg-success/10 text-success" : a.cor === "warning" ? "border-warning/30 bg-warning/10 text-warning" : "border-danger/30 bg-danger/10 text-danger"
                )}>{a.texto}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Burocracia */}
      <Card>
        <CardContent>
          <SH title="Burocracia — arrendamento" />
          <div className="grid gap-2 sm:grid-cols-2">
            <BuroItem label="Contrato NRAU" value={p.contratoTipo} done={!!p.contratoInicio} />
            <BuroItem label="Recibos de renda" value={p.recibosEmitidos ? `${p.recibosEmitidos} emitidos` : undefined} done={(p.recibosEmitidos ?? 0) > 0} />
            <BuroItem label="IRS Categoria F" info="Declaração anual obrigatória" />
            <BuroItem label="IMI anual" info={p.imiAnual ? `${eur(p.imiAnual)} (pago em prestações)` : "Pagamento em 1, 2 ou 3 prestações"} />
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Receita vs Despesa */}
        {cashflowEvol.length > 0 && (
          <Card>
            <CardContent>
              <SH title="Receita vs despesa mensal" />
              <div className="overflow-x-auto">
                <BarChart width={440} height={220} data={cashflowEvol} barGap={4}>
                  <CartesianGrid vertical={false} stroke="#E8D5BE" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} width={40} />
                  <Tooltip formatter={(v: number) => eur(v)} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Receita" fill="#4A7C59" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesa" fill="#9B3A2A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </div>
            </CardContent>
          </Card>
        )}

        <DonutCard title="Distribuição das despesas" data={distribDespesas} />

        {/* Cashflow evolution */}
        {cashflowEvol.length > 0 && (
          <Card className="lg:col-span-2">
            <CardContent>
              <SH title="Evolução do cashflow" />
              <div className="overflow-x-auto">
                <LineChart width={700} height={220} data={cashflowEvol}>
                  <CartesianGrid vertical={false} stroke="#E8D5BE" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6B4C3B", fontSize: 12 }} width={48} />
                  <Tooltip formatter={(v: number) => eur(v)} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Cashflow" name="Mensal" stroke="#C8A664" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Acumulado" name="Acumulado" stroke="#4A7C59" strokeWidth={2.5} dot={{ r: 3, fill: "#4A7C59" }} />
                </LineChart>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Distribuição de rendimento */}
      <Card>
        <CardContent>
          <SH title="Distribuição de rendimento" />
          <p className="mb-3 text-xs text-muted">Rendimento recorrente distribuído proporcionalmente entre sócios — mensal e anual.</p>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.partners.map((s) => (
              <div key={s.id} className="rounded-xl border border-line bg-bg/40 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                  <p className="text-sm font-medium text-ink">{s.name}</p>
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted">{s.pct}% do capital</p>
                <p className="num mt-1 text-base font-bold text-success">{eur(cashflowMensal * (s.pct / 100))}<span className="text-xs font-normal text-muted">/mês</span></p>
                <p className="num text-xs text-muted">{eur(cashflowAnual * (s.pct / 100))}/ano</p>
              </div>
            ))}
          </div>
          <PartnerBars partners={p.partners} valuePerPct={cashflowMensal} suffix="/mês" />
        </CardContent>
      </Card>
    </div>
  );
}
