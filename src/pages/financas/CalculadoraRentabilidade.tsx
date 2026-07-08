import { useMemo, useState } from "react";
import { Sparkles, Save, Home, Repeat, Handshake, Users } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { eur, eurSigned, pct } from "@/lib/format";
import {
  calcArrendamento,
  calcFlip,
  calcCedencia,
  calcInvestidores,
  vereditoPorRentabilidade,
  YIELD_MERCADO_MEDIO,
} from "@/lib/calc";

type Mode = "arrendamento" | "flip" | "cedencia" | "investidores";

const MODES: { key: Mode; label: string; icon: typeof Home }[] = [
  { key: "arrendamento", label: "Arrendamento", icon: Home },
  { key: "flip", label: "Compra & Revenda", icon: Repeat },
  { key: "cedencia", label: "Cedência de Posição", icon: Handshake },
  { key: "investidores", label: "Investidores Privados", icon: Users },
];

export default function CalculadoraRentabilidade() {
  const [mode, setMode] = useState<Mode>("arrendamento");
  return (
    <>
      <PageHeader
        title="Calculadora de Rentabilidade"
        subtitle="Simule o retorno do investimento antes de comprar — 4 modelos de negócio."
        actions={
          <Button variant="outline">
            <Save size={16} /> Guardar análise
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all",
                mode === m.key
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-line bg-card text-muted hover:border-secondary/40"
              )}
            >
              <Icon size={18} />
              <span className="text-left leading-tight">{m.label}</span>
            </button>
          );
        })}
      </div>

      {mode === "arrendamento" && <Arrendamento />}
      {mode === "flip" && <Flip />}
      {mode === "cedencia" && <Cedencia />}
      {mode === "investidores" && <Investidores />}
    </>
  );
}

// ────────────────────────────── UI helpers ──────────────────────────────
function NumberField({
  label,
  value,
  onChange,
  suffix = "€",
  step = 1000,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="h-10 w-full bg-transparent px-3 text-sm outline-none"
        />
        <span className="px-3 text-sm text-muted">{suffix}</span>
      </div>
    </label>
  );
}

function ResultsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#3a2417] to-[#2E1A0E] p-6 text-sidebar-text shadow-md">
      {children}
    </div>
  );
}

function VereditoHero({
  valuePct,
  reference,
  heroLabel,
  heroValue,
  oneliner,
}: {
  valuePct: number;
  reference: number;
  heroLabel: string;
  heroValue: string;
  oneliner: string;
}) {
  const v = vereditoPorRentabilidade(valuePct, reference);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-1 flex items-center gap-2 text-sm">
          <span>{v.emoji}</span>
          <span style={{ color: v.cor }} className="font-medium">{v.label}</span>
        </div>
        <p className="text-xs uppercase tracking-widest text-sidebar-text/50">{heroLabel}</p>
        <p className="num text-5xl font-bold" style={{ color: v.cor }}>{heroValue}</p>
        <p className="mt-1 max-w-xs text-sm text-sidebar-text/70">{oneliner}</p>
      </div>
      <Gauge value={valuePct} reference={reference} />
    </div>
  );
}

function Gauge({ value, reference }: { value: number; reference: number }) {
  const max = Math.max(reference * 2.5, value * 1.2, 10);
  const ratio = Math.max(0, Math.min(1, value / max));
  const refRatio = Math.max(0, Math.min(1, reference / max));
  const r = 70;
  const cx = 90;
  const cy = 90;
  const arc = (frac: number) => {
    const a = Math.PI * (1 - frac);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
  const [ex, ey] = arc(ratio);
  const [rx, ry] = arc(refRatio);
  const v = vereditoPorRentabilidade(value, reference);
  return (
    <svg viewBox="0 0 180 110" className="w-44">
      <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="rgba(245,236,215,0.15)" strokeWidth="12" strokeLinecap="round" />
      <path
        d={`M20 90 A70 70 0 0 1 ${ex} ${ey}`}
        fill="none"
        stroke={v.cor}
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* marcador da média de mercado */}
      <line x1={cx} y1={cy} x2={rx} y2={ry} stroke="#F5ECD7" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
      <text x="90" y="78" textAnchor="middle" className="num" fill="#F5ECD7" fontSize="20" fontWeight="700">
        {pct(value)}
      </text>
      <text x="90" y="104" textAnchor="middle" fill="rgba(245,236,215,0.5)" fontSize="9">
        média mercado {pct(reference)}
      </text>
    </svg>
  );
}

function KeyCard({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-xl bg-white/[0.06] p-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-sidebar-text/50">{label}</p>
      <p
        className={cn("num mt-1 text-lg font-bold", tone === "pos" && "text-success", tone === "neg" && "text-danger")}
        style={!tone ? { color: "#F5ECD7" } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function SecRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-2 text-sm last:border-0">
      <span className="text-sidebar-text/60">{k}</span>
      <span className="num font-medium text-sidebar-text">{v}</span>
    </div>
  );
}

function ParamsCard({ title, children, onExample }: { title: string; children: React.ReactNode; onExample?: () => void }) {
  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
          {onExample && (
            <button onClick={onExample} className="inline-flex items-center gap-1 text-xs text-secondary hover:underline">
              <Sparkles size={13} /> Gerar exemplo
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────── MODO 1 — Arrendamento ──────────────────────────────
function Arrendamento() {
  const ex = { preco: 165000, entrada: 40000, rendaMensal: 950, prestacaoMensal: 520, despesasFixasMensais: 90 };
  const [i, setI] = useState(ex);
  const r = useMemo(() => calcArrendamento({ ...i, taxaIRS: 0.25 }), [i]);
  const set = (k: keyof typeof i) => (v: number) => setI((s) => ({ ...s, [k]: v }));

  const proj = useMemo(
    () =>
      Array.from({ length: 10 }, (_, y) => ({
        ano: `A${y + 1}`,
        cashflow: Math.round(r.cashflowAnual * Math.pow(1.02, y)),
      })),
    [r.cashflowAnual]
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ParamsCard title="Dados do investimento" onExample={() => setI(ex)}>
        <NumberField label="Preço de compra" value={i.preco} onChange={set("preco")} />
        <NumberField label="Entrada (capital próprio)" value={i.entrada} onChange={set("entrada")} />
        <NumberField label="Renda mensal" value={i.rendaMensal} onChange={set("rendaMensal")} step={50} />
        <NumberField label="Prestação mensal" value={i.prestacaoMensal} onChange={set("prestacaoMensal")} step={50} />
        <NumberField label="Despesas fixas / mês" value={i.despesasFixasMensais} onChange={set("despesasFixasMensais")} step={10} />
      </ParamsCard>

      <ResultsShell>
        <VereditoHero
          valuePct={r.yieldLiquidoPct}
          reference={YIELD_MERCADO_MEDIO}
          heroLabel="Yield líquida (antes de IRS e crédito)"
          heroValue={pct(r.yieldLiquidoPct)}
          oneliner={`Gera ${eurSigned(r.cashflowMensal)} por mês depois de tudo pago (crédito e IRS incluídos).`}
        />
        <div className="mt-5 grid grid-cols-3 gap-2">
          <KeyCard label="Cashflow / mês" value={eurSigned(r.cashflowMensal)} tone={r.cashflowMensal >= 0 ? "pos" : "neg"} />
          <KeyCard label="Yield bruto" value={pct(r.yieldBrutoPct)} />
          <KeyCard label="Rent. s/ entrada" value={pct(r.rentabEntradaPct)} />
        </div>
        <div className="mt-5">
          <SecRow k="Rendimento bruto anual" v={eur(r.rendBrutoAnual)} />
          <SecRow k="Despesas anuais" v={eur(r.despesasAnuais)} />
          <SecRow k="Imposto (IRS 25% s/ rendas − despesas dedutíveis)" v={eur(r.impostos)} />
          <SecRow k="Rendimento líquido final" v={eur(r.rendLiquidoFinal)} />
        </div>
        <div className="mt-5">
          <p className="mb-2 text-xs uppercase tracking-widest text-sidebar-text/50">Cashflow a 10 anos</p>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={proj}>
              <defs>
                <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C8A664" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#C8A664" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(245,236,215,0.1)" />
              <XAxis dataKey="ano" tick={{ fill: "rgba(245,236,215,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v: number) => eur(v)} contentStyle={{ borderRadius: 10, border: "none", background: "#1A0F08", color: "#F5ECD7" }} />
              <Area type="monotone" dataKey="cashflow" stroke="#C8A664" strokeWidth={2} fill="url(#cf)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ResultsShell>
    </div>
  );
}

// ────────────────────────────── MODO 2 — Flip ──────────────────────────────
function Flip() {
  const ex = {
    compra: 180000,
    custosAquisicaoExtra: 6000,
    obra: 25000,
    financiado: 120000,
    mesesRetencao: 8,
    despesasMensais: 150,
    venda: 240000,
    custosVenda: 9600,
  };
  const [i, setI] = useState(ex);
  const [regime, setRegime] = useState<"empresa" | "particular">("particular");
  const r = useMemo(
    () => calcFlip({ ...i, tan: 0.04, prazoAnos: 30, finalidade: "HS", regime }),
    [i, regime]
  );
  const set = (k: keyof typeof i) => (v: number) => setI((s) => ({ ...s, [k]: v }));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ParamsCard title="Compra, obra e venda" onExample={() => setI(ex)}>
        <NumberField label="Valor de compra" value={i.compra} onChange={set("compra")} />
        <NumberField label="Custos de aquisição (extra)" value={i.custosAquisicaoExtra} onChange={set("custosAquisicaoExtra")} step={500} />
        <NumberField label="Orçamento de obra" value={i.obra} onChange={set("obra")} />
        <NumberField label="Crédito (financiado)" value={i.financiado} onChange={set("financiado")} />
        <NumberField label="Meses de retenção" value={i.mesesRetencao} onChange={set("mesesRetencao")} suffix="meses" step={1} />
        <NumberField label="Despesas / mês (holding)" value={i.despesasMensais} onChange={set("despesasMensais")} step={50} />
        <NumberField label="Valor de venda" value={i.venda} onChange={set("venda")} />
        <NumberField label="Custos de venda" value={i.custosVenda} onChange={set("custosVenda")} step={500} />
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Regime fiscal</span>
          <div className="flex gap-2">
            {(["particular", "empresa"] as const).map((rg) => (
              <button
                key={rg}
                onClick={() => setRegime(rg)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm capitalize",
                  regime === rg ? "border-primary bg-accent text-primary" : "border-line text-muted"
                )}
              >
                {rg}
              </button>
            ))}
          </div>
        </div>
      </ParamsCard>

      <ResultsShell>
        <VereditoHero
          valuePct={r.retornoTotalPct}
          reference={12}
          heroLabel="Lucro líquido"
          heroValue={eurSigned(r.lucroAposImp)}
          oneliner={`ROI de ${pct(r.retornoTotalPct)} · ${pct(r.retornoAnualizadoPct)} anualizado.`}
        />
        <div className="mt-5 grid grid-cols-3 gap-2">
          <KeyCard label="ROI total" value={pct(r.retornoTotalPct)} />
          <KeyCard label="Cash-on-cash" value={pct(r.cashOnCashPct)} />
          <KeyCard label="Capitais próprios" value={eur(r.capitaisProprios)} />
        </div>
        <div className="mt-5">
          <SecRow k="IMT" v={eur(r.imt)} />
          <SecRow k="Imposto de Selo" v={eur(r.is)} />
          <SecRow k="Prestação mensal" v={eur(r.prestacaoMensal)} />
          <SecRow k="Custos associados" v={eur(r.custosAssociados)} />
          <SecRow k="Lucro bruto" v={eurSigned(r.lucroBruto)} />
          <SecRow k={`Impostos (${regime})`} v={eur(r.impostos)} />
          <SecRow k="Lucro líquido" v={eurSigned(r.lucroAposImp)} />
        </div>
      </ResultsShell>
    </div>
  );
}

// ────────────────────────────── MODO 3 — Cedência ──────────────────────────────
function Cedencia() {
  const ex = { compra: 200000, sinalPct: 10, vendaPosicao: 235000, custosCPCV: 1500, custosAcordo: 800 };
  const [i, setI] = useState(ex);
  const r = useMemo(
    () =>
      calcCedencia({
        compra: i.compra,
        sinalPct: i.sinalPct / 100,
        vendaPosicao: i.vendaPosicao,
        custosCPCV: i.custosCPCV,
        custosAcordo: i.custosAcordo,
        regime: "particular",
      }),
    [i]
  );
  const set = (k: keyof typeof i) => (v: number) => setI((s) => ({ ...s, [k]: v }));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ParamsCard title="Posição contratual (CPCV)" onExample={() => setI(ex)}>
        <NumberField label="Valor de escritura (CPCV)" value={i.compra} onChange={set("compra")} />
        <NumberField label="Sinal pago" value={i.sinalPct} onChange={set("sinalPct")} suffix="%" step={1} />
        <NumberField label="Valor da cedência" value={i.vendaPosicao} onChange={set("vendaPosicao")} />
        <NumberField label="Custos CPCV" value={i.custosCPCV} onChange={set("custosCPCV")} step={100} />
        <NumberField label="Custos de acordo" value={i.custosAcordo} onChange={set("custosAcordo")} step={100} />
      </ParamsCard>

      <ResultsShell>
        <VereditoHero
          valuePct={r.retornoTotalPct}
          reference={20}
          heroLabel="Lucro da cedência"
          heroValue={eurSigned(r.lucroAposImp)}
          oneliner={`Retorno líquido de ${pct(r.retornoTotalPct)} sobre ${eur(r.capitais)} de capital empatado.`}
        />
        <div className="mt-5 grid grid-cols-3 gap-2">
          <KeyCard label="Sinal" value={eur(r.sinalValor)} />
          <KeyCard label="Capital empatado" value={eur(r.capitais)} />
          <KeyCard label="Retorno líquido" value={pct(r.retornoTotalPct)} />
        </div>
        <div className="mt-5">
          <SecRow k="IMT (sobre sinal)" v={eur(r.imt)} />
          <SecRow k="Capitais necessários" v={eur(r.capitais)} />
          <SecRow k="Lucro bruto" v={eurSigned(r.lucroBruto)} />
          <SecRow k="Impostos" v={eur(r.impostos)} />
          <SecRow k="Lucro líquido" v={eurSigned(r.lucroAposImp)} />
        </div>
      </ResultsShell>
    </div>
  );
}

// ────────────────────────────── MODO 4 — Investidores ──────────────────────────────
function Investidores() {
  const ex = { compra: 180000, venda: 240000, custosAssociados: 47000, ativoPct: 50 };
  const [i, setI] = useState(ex);
  const [comEmpresa, setComEmpresa] = useState(false);
  const r = useMemo(
    () =>
      calcInvestidores({
        compra: i.compra,
        venda: i.venda,
        custosAssociados: i.custosAssociados,
        ativoPct: i.ativoPct / 100,
        passivoPct: (100 - i.ativoPct) / 100,
        comEmpresaMenos1Ano: comEmpresa,
      }),
    [i, comEmpresa]
  );
  const set = (k: keyof typeof i) => (v: number) => setI((s) => ({ ...s, [k]: v }));
  const roi = i.custosAssociados + i.compra > 0 ? (r.lucroAposImp / (i.compra + i.custosAssociados)) * 100 : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ParamsCard title="Negócio e divisão de lucro" onExample={() => setI(ex)}>
        <NumberField label="Valor de compra" value={i.compra} onChange={set("compra")} />
        <NumberField label="Valor de venda" value={i.venda} onChange={set("venda")} />
        <NumberField label="Custos associados" value={i.custosAssociados} onChange={set("custosAssociados")} step={500} />
        <NumberField label="Parceiro ATIVO (negócio)" value={i.ativoPct} onChange={set("ativoPct")} suffix="%" step={5} />
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Estrutura fiscal</span>
          <button
            onClick={() => setComEmpresa((v) => !v)}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-sm",
              comEmpresa ? "border-primary bg-accent text-primary" : "border-line text-muted"
            )}
          >
            {comEmpresa ? "Com empresa (IRC 19% · ×0,81)" : "Particular (mais-valias 50%×48% · ×0,76)"}
          </button>
        </div>
      </ParamsCard>

      <ResultsShell>
        <VereditoHero
          valuePct={roi}
          reference={12}
          heroLabel="Lucro líquido do negócio"
          heroValue={eurSigned(r.lucroAposImp)}
          oneliner={`Dividido entre parceiro ativo (${i.ativoPct}%) e passivo (${100 - i.ativoPct}%).`}
        />
        <div className="mt-5 grid grid-cols-2 gap-2">
          <KeyCard label={`Ativo (${i.ativoPct}%)`} value={eur(r.ativoLiquido)} tone="pos" />
          <KeyCard label={`Passivo (${100 - i.ativoPct}%)`} value={eur(r.passivoLiquido)} tone="pos" />
        </div>
        <div className="mt-5">
          <SecRow k="Lucro bruto do negócio" v={eurSigned(r.lucroBruto)} />
          <SecRow k="Fator fiscal" v={comEmpresa ? "×0,81 (IRC 19%)" : "×0,76 (mais-valias particular)"} />
          <SecRow k="Lucro líquido total" v={eurSigned(r.lucroAposImp)} />
        </div>
      </ResultsShell>
    </div>
  );
}
