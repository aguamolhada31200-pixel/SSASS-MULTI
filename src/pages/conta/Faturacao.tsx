import { useMemo, useState } from "react";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Download,
  Tag,
  Check,
  Minus,
  Building2,
  Megaphone,
  Users2,
  UserPlus,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, SectionCard, inputCls } from "@/components/conta/ContaUI";
import { useAccountStore, PLANOS, type PlanoId, type Ciclo } from "@/store/useAccountStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useListingsStore } from "@/store/useListingsStore";
import { useCollabStore } from "@/store/useCollabStore";
import { eurCents, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

const ORDER: PlanoId[] = ["gratuito", "starter", "pro", "business"];

function limiteTxt(n: number): string {
  return n === Infinity ? "Ilimitado" : String(n);
}

export default function Faturacao() {
  const plano = useAccountStore((s) => s.plano);
  const faturas = useAccountStore((s) => s.faturas);
  const updatePlano = useAccountStore((s) => s.updatePlano);
  const aplicarPromo = useAccountStore((s) => s.aplicarPromo);

  const nImoveis = usePropertiesStore((s) => s.properties.length);
  const nAnuncios = useListingsStore((s) => s.listings.length);
  const nProjetos = useCollabStore((s) => s.projects.length);

  const [ciclo, setCiclo] = useState<Ciclo>(plano.cicloFaturacao);
  const [promo, setPromo] = useState("");
  const [mudar, setMudar] = useState<PlanoId | null>(null);

  const info = PLANOS[plano.atual];
  const precoAtual = plano.cicloFaturacao === "anual" ? info.precoAnual : info.precoMensal;

  const usos = [
    { label: "Imóveis", icon: Building2, atual: nImoveis, limite: info.limites.imoveis },
    { label: "Anúncios na Rede", icon: Megaphone, atual: nAnuncios, limite: info.limites.anuncios },
    { label: "Projetos colaborativos", icon: Users2, atual: nProjetos, limite: info.limites.projetos },
    ...(plano.atual === "business" ? [{ label: "Utilizadores extra", icon: UserPlus, atual: 1, limite: info.limites.utilizadores }] : []),
  ];

  const exportarCsv = () => {
    const head = "Data;Descrição;Valor;Estado";
    const linhas = faturas.map((f) => `${f.data};${f.descricao};${f.valor.toFixed(2)};${f.estado}`);
    const blob = new Blob(["﻿" + [head, ...linhas].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "faturas-redegest.csv";
    a.click();
    toastSuccess("Faturas exportadas");
  };

  return (
    <div>
      <PageHeader title="Faturação" subtitle="Gestão do plano redegest, método de pagamento e faturas." />

      {/* A) Plano atual */}
      <div className="mb-6 rounded-xl border border-gold/30 bg-gradient-to-br from-accent/60 to-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge tone="gold">Plano atual</Badge>
            <p className="mt-1.5 font-display text-3xl font-bold text-ink">{info.nome}</p>
            <p className="text-sm text-muted">
              {precoAtual === 0 ? "Grátis" : `${eurCents(precoAtual)}/mês`} · ciclo {plano.cicloFaturacao}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted">Próxima cobrança</p>
            <p className="num font-display text-lg font-semibold text-ink">{eurCents(precoAtual)}</p>
            <p className="text-xs text-muted">{dataPT(plano.proximoPagamento)}</p>
          </div>
        </div>

        {/* Uso vs limites */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {usos.map((u) => {
            const Icon = u.icon;
            const inf = u.limite === Infinity;
            const ratio = inf ? 0 : Math.min(1, u.atual / u.limite);
            const cheio = !inf && u.atual >= u.limite;
            const quase = !inf && ratio >= 0.8 && !cheio;
            const cor = cheio ? "bg-danger" : quase ? "bg-warning" : "bg-primary";
            return (
              <div key={u.label}>
                <div className="mb-1 flex items-center gap-1.5 text-sm">
                  <Icon size={14} className="text-secondary" />
                  <span className="text-ink">{u.label}</span>
                  <span className="ml-auto num text-muted">{u.atual} / {limiteTxt(u.limite)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div className={cn("h-full rounded-full", cor)} style={{ width: inf ? "12%" : `${Math.max(4, ratio * 100)}%` }} />
                </div>
                {cheio && <p className="mt-1 flex items-center gap-1 text-[11px] text-danger"><AlertTriangle size={11} /> Limite atingido — faça upgrade</p>}
                {quase && <p className="mt-1 flex items-center gap-1 text-[11px] text-warning"><AlertTriangle size={11} /> A aproximar-se do limite</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* B) Comparação de planos */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">Planos</h2>
          <div className="flex items-center gap-2 rounded-full border border-line bg-card p-1 text-xs">
            <button onClick={() => setCiclo("mensal")} className={cn("rounded-full px-3 py-1.5", ciclo === "mensal" ? "bg-primary text-white" : "text-muted")}>Mensal</button>
            <button onClick={() => setCiclo("anual")} className={cn("rounded-full px-3 py-1.5", ciclo === "anual" ? "bg-primary text-white" : "text-muted")}>
              Anual <span className={cn("ml-1", ciclo === "anual" ? "text-gold-soft" : "text-success")}>-16%</span>
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {ORDER.map((id) => {
            const pl = PLANOS[id];
            const preco = ciclo === "anual" ? pl.precoAnual : pl.precoMensal;
            const atual = id === plano.atual && ciclo === plano.cicloFaturacao;
            const todasFeatures = featuresParaCard(id);
            return (
              <div key={id} className={cn("flex flex-col rounded-xl border bg-card p-5 shadow-sm", atual ? "border-gold ring-1 ring-gold/40" : "border-line")}>
                <div className="flex items-center gap-2">
                  <p className="font-display text-lg font-semibold text-ink">{pl.nome}</p>
                  {atual && <Badge tone="gold">Atual</Badge>}
                </div>
                <p className="mt-2">
                  <span className="font-display text-4xl font-bold text-ink">{preco === 0 ? "0€" : eurCents(preco)}</span>
                  <span className="text-sm text-muted">/mês</span>
                </p>
                {ciclo === "anual" && preco > 0 && <p className="text-[11px] text-success">faturado anualmente</p>}
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {todasFeatures.map((f) => (
                    <li key={f.label} className="flex items-start gap-2">
                      {f.incluido ? <Check size={15} className="mt-0.5 shrink-0 text-success" /> : <Minus size={15} className="mt-0.5 shrink-0 text-muted/50" />}
                      <span className={f.incluido ? "text-ink" : "text-muted/60"}>{f.label}</span>
                    </li>
                  ))}
                </ul>
                {atual ? (
                  <Button variant="outline" className="mt-4 w-full" disabled>Plano atual</Button>
                ) : (
                  <Button variant={ORDER.indexOf(id) > ORDER.indexOf(plano.atual) ? "gold" : "outline"} className="mt-4 w-full" onClick={() => setMudar(id)}>
                    {ORDER.indexOf(id) > ORDER.indexOf(plano.atual) ? "Fazer upgrade" : "Mudar para este"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* C) Método de pagamento */}
        <SectionCard title="Método de pagamento" icon={CreditCard}>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-bg/40 px-3 py-3">
            <div className="flex h-9 w-12 items-center justify-center rounded bg-primary text-xs font-bold text-white">{plano.metodoPagamento.tipo}</div>
            <div className="flex-1">
              <p className="text-sm text-ink">•••• •••• •••• {plano.metodoPagamento.ultimosDigitos}</p>
              <p className="text-xs text-muted">Validade {plano.metodoPagamento.validade}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => toastInfo("Atualização de cartão via Stripe (Fase 4)")}>Atualizar cartão</Button>
            <Button variant="ghost" size="sm" disabled>Adicionar MB WAY (Em breve)</Button>
          </div>
        </SectionCard>

        {/* F) Código promocional */}
        <SectionCard title="Código promocional" icon={Tag}>
          <div className="flex gap-2">
            <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Ex.: REDEGEST10" className={inputCls} />
            <Button variant="outline" size="sm" onClick={() => { aplicarPromo(promo) ? toastSuccess("Código aplicado") : toastError("Código inválido"); setPromo(""); }}>Aplicar</Button>
          </div>
          {plano.promo && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-success"><CheckCircle2 size={14} /> {plano.promo.codigo} — {plano.promo.desconto}% de desconto ativo</p>
          )}
        </SectionCard>

        {/* D) Dados de faturação */}
        <SectionCard title="Dados de faturação" icon={Building2} desc="Estes dados aparecem nas faturas que o redegest emite para si.">
          <DadosFaturacaoForm />
        </SectionCard>

        {/* E) Histórico de faturas */}
        <SectionCard title="Histórico de faturas" icon={Download} badge={<Button variant="ghost" size="sm" className="ml-auto" onClick={exportarCsv}><Download size={13} /> Exportar CSV</Button>}>
          <FaturasTabela />
        </SectionCard>
      </div>

      {/* Modal mudar plano */}
      {mudar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" onMouseDown={() => setMudar(null)}>
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <h4 className="font-display text-lg font-semibold text-ink">Mudar para {PLANOS[mudar].nome}</h4>
            <p className="mt-2 text-sm text-muted">
              O novo valor é {eurCents(ciclo === "anual" ? PLANOS[mudar].precoAnual : PLANOS[mudar].precoMensal)}/mês ({ciclo}).
              A diferença é cobrada/creditada <strong className="text-ink">pró-rata</strong> no ciclo atual.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMudar(null)}>Cancelar</Button>
              <Button variant="gold" onClick={() => { updatePlano({ atual: mudar, cicloFaturacao: ciclo }); setMudar(null); toastSuccess(`Plano alterado para ${PLANOS[mudar].nome}`); }}>
                <Check size={15} /> Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Linhas de feature unificadas para a tabela comparativa (✓/—). */
function featuresParaCard(id: PlanoId): { label: string; incluido: boolean }[] {
  const linhas = [
    { label: "Imóveis ilimitados", req: ["pro", "business"] },
    { label: "Anúncios na Rede", req: ["gratuito", "starter", "pro", "business"] },
    { label: "Contratos PDF", req: ["starter", "pro", "business"] },
    { label: "Contabilidade completa", req: ["starter", "pro", "business"] },
    { label: "Projetos colaborativos", req: ["starter", "pro", "business"] },
    { label: "Assistente IA", req: ["pro", "business"] },
    { label: "Acesso à API + Webhooks", req: ["business"] },
    { label: "Até 5 utilizadores", req: ["business"] },
  ];
  return linhas.map((l) => ({ label: l.label, incluido: l.req.includes(id) }));
}

function DadosFaturacaoForm() {
  const dados = useAccountStore((s) => s.plano.dadosFaturacao);
  const updatePlano = useAccountStore((s) => s.updatePlano);
  const [d, setD] = useState(dados);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome / Empresa"><input value={d.nome} onChange={(e) => set("nome", e.target.value)} className={inputCls} /></Field>
        <Field label="NIF"><input value={d.nif} onChange={(e) => set("nif", e.target.value)} className={inputCls} /></Field>
        <Field label="Morada" className="sm:col-span-2"><input value={d.morada} onChange={(e) => set("morada", e.target.value)} className={inputCls} /></Field>
        <Field label="Código postal"><input value={d.codigoPostal} onChange={(e) => set("codigoPostal", e.target.value)} className={inputCls} /></Field>
        <Field label="Cidade"><input value={d.cidade} onChange={(e) => set("cidade", e.target.value)} className={inputCls} /></Field>
        <Field label="País" className="sm:col-span-2"><input value={d.pais} onChange={(e) => set("pais", e.target.value)} className={inputCls} /></Field>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { updatePlano({ dadosFaturacao: d }); toastSuccess("Dados de faturação atualizados"); }}>Guardar</Button>
      </div>
    </div>
  );
}

function FaturasTabela() {
  const faturas = useAccountStore((s) => s.faturas);
  const anos = useMemo(() => [...new Set(faturas.map((f) => f.data.slice(0, 4)))].sort().reverse(), [faturas]);
  const [ano, setAno] = useState<string>("todos");
  const lista = faturas.filter((f) => ano === "todos" || f.data.startsWith(ano)).sort((a, b) => (a.data < b.data ? 1 : -1));

  const tone = { paga: "success", pendente: "warning", falhada: "danger" } as const;
  const txt = { paga: "Paga", pendente: "Pendente", falhada: "Falhada" } as const;

  return (
    <>
      <select value={ano} onChange={(e) => setAno(e.target.value)} className={cn(inputCls, "mb-3 w-40")}>
        <option value="todos">Todos os anos</option>
        {anos.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-accent/40 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2.5 text-left">Data</th>
              <th className="px-3 py-2.5 text-left">Descrição</th>
              <th className="px-3 py-2.5 text-right">Valor</th>
              <th className="px-3 py-2.5 text-center">Estado</th>
              <th className="px-3 py-2.5 text-right">PDF</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id} className="border-b border-line/60 last:border-0">
                <td className="px-3 py-2.5 text-muted">{dataPT(f.data)}</td>
                <td className="px-3 py-2.5 text-ink">{f.descricao}</td>
                <td className="px-3 py-2.5 num text-right text-ink">{eurCents(f.valor)}</td>
                <td className="px-3 py-2.5 text-center"><Badge tone={tone[f.estado]}>{txt[f.estado]}</Badge></td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => toastSuccess("A descarregar fatura…")} className="text-secondary hover:text-primary"><Download size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
