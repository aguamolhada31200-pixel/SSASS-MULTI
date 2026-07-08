// Motor de respostas do Assistente IA (simulado, local).
// SUBSTITUIR por fetch('/api/ai/chat') quando a Edge Function (proxy Claude API) existir.
// A assinatura respondToQuery(message, context) mantém-se estável para essa troca.

import type { Property } from "@/store/usePropertiesStore";
import type { Transaction } from "@/store/useTransactionsStore";
import type { Tenant } from "@/store/useTenantsStore";
import type { Contract } from "@/store/useContractsStore";
import { statusEfetivo, diasAteFim, TIPO_LABEL } from "@/store/useContractsStore";
import { calcularIMT, calcularIS, type Finalidade } from "@/lib/calc/imt";
import { eur, pct, dataPTShort, mesPT } from "@/lib/format";
import { KNOWLEDGE, DISCLAIMER, procurarTopico } from "./knowledge";

export interface AiContext {
  userName: string;
  properties: Property[];
  transactions: Transaction[];
  tenants: Tenant[];
  contracts: Contract[];
}

export interface AiAction {
  label: string;
  to?: string;
  kind?: "navigate" | "copy" | "contract";
}

export interface AiResponse {
  content: string; // markdown
  followups?: string[];
  actions?: AiAction[];
  chart?: { dados: { nome: string; valor: number }[] };
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function has(msg: string, ...terms: string[]): boolean {
  const m = norm(msg);
  return terms.some((t) => m.includes(norm(t)));
}

function yieldBruto(p: Property): number {
  return p.valorCompra > 0 ? (p.rendaMensal * 12) / p.valorCompra * 100 : 0;
}

// ───────────────────────── Respostas ─────────────────────────

function respPortfolio(ctx: AiContext): AiResponse {
  const receita = ctx.transactions.filter((t) => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
  const despesa = ctx.transactions.filter((t) => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);
  const lucro = receita - despesa;
  const yields = ctx.properties.map(yieldBruto).filter((y) => y > 0);
  const yieldMedio = yields.length ? yields.reduce((a, b) => a + b, 0) / yields.length : 0;

  const porImovel = ctx.properties.map((p) => {
    const r = ctx.transactions.filter((t) => t.propertyId === p.id && t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
    const d = ctx.transactions.filter((t) => t.propertyId === p.id && t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);
    return { p, lucro: r - d };
  });
  const ordenado = [...porImovel].sort((a, b) => b.lucro - a.lucro);
  const melhor = ordenado[0];
  const pior = ordenado[ordenado.length - 1];

  const linhas = porImovel
    .map((x) => `| ${x.p.name} | ${eur(x.p.rendaMensal)} | ${pct(yieldBruto(x.p))} | ${eur(x.lucro)} |`)
    .join("\n");

  const content = [
    `**Resumo do portefólio** (${ctx.properties.length} imóveis, dados acumulados):`,
    "",
    `- Receita total: **${eur(receita)}**`,
    `- Despesa total: **${eur(despesa)}**`,
    `- Resultado líquido: **${eur(lucro)}**`,
    `- Yield bruto médio: **${pct(yieldMedio)}**`,
    "",
    "| Imóvel | Renda/mês | Yield bruto | Resultado |",
    "| --- | --- | --- | --- |",
    linhas,
    "",
    melhor && pior ? `🏆 Melhor desempenho: **${melhor.p.name}** (${eur(melhor.lucro)}). ⚠️ A melhorar: **${pior.p.name}** (${eur(pior.lucro)}).` : "",
  ].join("\n");

  return {
    content,
    chart: { dados: porImovel.map((x) => ({ nome: x.p.name, valor: Math.round(x.lucro) })) },
    actions: [{ label: "Abrir Contabilidade", to: "/financas/contabilidade", kind: "navigate" }],
    followups: ["Resumo financeiro do T2 Arroios", "Que deduções IRS posso aproveitar?"],
  };
}

function respRendas(ctx: AiContext): AiResponse {
  const now = new Date();
  const mesAtual = now.toISOString().slice(0, 7);
  const ocupados = ctx.properties.filter((p) => p.status === "ocupado" && p.rendaMensal > 0);
  const atrasos = ocupados.filter(
    (p) => !ctx.transactions.some((t) => t.propertyId === p.id && t.tipo === "receita" && t.categoria === "Renda" && t.data.startsWith(mesAtual))
  );

  if (atrasos.length === 0) {
    return {
      content: [
        "✅ **Não há rendas em atraso** este mês.",
        "",
        ocupados.map((p) => `- ${p.name}: renda de **${eur(p.rendaMensal)}** recebida.`).join("\n"),
      ].join("\n"),
      followups: ["Analisar a rentabilidade do meu portfólio"],
    };
  }
  const tenantDe = (pid: string) => ctx.tenants.find((t) => t.propertyId === pid)?.nomeCompleto ?? "—";
  return {
    content: [
      `⚠️ **${atrasos.length} renda(s) por regularizar** em ${mesPT(mesAtual)}:`,
      "",
      "| Inquilino | Imóvel | Valor |",
      "| --- | --- | --- |",
      atrasos.map((p) => `| ${tenantDe(p.id)} | ${p.name} | ${eur(p.rendaMensal)} |`).join("\n"),
    ].join("\n"),
    actions: [{ label: "Ver inquilinos", to: "/pessoas/inquilinos", kind: "navigate" }],
  };
}

function respImt(msg: string): AiResponse {
  // extrai valor: aceita "250.000", "250000", "250 mil"
  const milMatch = norm(msg).match(/(\d[\d.\s]*)\s*mil/);
  let valor = 0;
  if (milMatch) {
    valor = Number(milMatch[1].replace(/[.\s]/g, "")) * 1000;
  } else {
    const m = msg.match(/(\d[\d.\s]{2,})/);
    if (m) valor = Number(m[1].replace(/[.\s]/g, ""));
  }
  const finalidade: Finalidade = has(msg, "propria", "própria", "permanente", "hpp", "viver", "morar", "habitação propria") ? "HPP" : "HS";

  if (!valor || valor < 1000) {
    return {
      content: "Para calcular o **IMT**, indique o valor do imóvel. Ex.: _“Calcular o IMT para um imóvel de 250.000 € para habitação própria”_.",
      actions: [{ label: "Abrir Calculadora", to: "/financas/calculadora-rentabilidade", kind: "navigate" }],
    };
  }
  const imt = calcularIMT(valor, finalidade);
  const is = calcularIS(valor);
  return {
    content: [
      `**Cálculo do IMT** — imóvel de ${eur(valor)} · finalidade **${finalidade === "HPP" ? "Habitação Própria Permanente" : "Habitação Secundária"}**`,
      "",
      `1. Base de incidência: **${eur(valor)}** (maior entre preço e VPT)`,
      `2. IMT (tabela ${finalidade}): **${eur(imt)}**`,
      `3. Imposto de Selo (0,8%): **${eur(is)}**`,
      "",
      `💰 Total de impostos na compra: **${eur(imt + is)}**`,
      "",
      DISCLAIMER,
    ].join("\n"),
    actions: [{ label: "Abrir Calculadora", to: "/financas/calculadora-rentabilidade", kind: "navigate" }],
    followups: ["Que deduções IRS posso aproveitar?"],
  };
}

function respDeducoes(ctx: AiContext): AiResponse {
  const ano = new Date().getFullYear();
  const ded = ctx.transactions.filter((t) => t.tipo === "despesa" && t.deduzivelIrs && t.data.startsWith(String(ano)));
  const porCat = new Map<string, number>();
  ded.forEach((t) => porCat.set(t.categoria, (porCat.get(t.categoria) ?? 0) + t.valor));
  const total = ded.reduce((s, t) => s + t.valor, 0);
  const linhas = [...porCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => `| ${c} | ${eur(v)} |`).join("\n");

  return {
    content: [
      `**Deduções IRS — Categoria F (${ano})**`,
      "",
      "Despesas dedutíveis já registadas este ano:",
      "",
      "| Categoria | Valor |",
      "| --- | --- |",
      linhas || "| — | — |",
      `| **Total** | **${eur(total)}** |`,
      "",
      "Lembre-se: na Categoria F são dedutíveis IMI, condomínio, seguros e obras de conservação. **Juros do crédito e mobiliário não** são dedutíveis. Taxa autónoma de **28%** (ou reduzida por contratos de maior duração).",
      "",
      DISCLAIMER,
    ].join("\n"),
    actions: [{ label: "Abrir Contabilidade", to: "/financas/contabilidade", kind: "navigate" }],
  };
}

function respContrato(): AiResponse {
  return {
    content: [
      "Um contrato de arrendamento deve cobrir as **cláusulas-tipo**:",
      "",
      "1. **Objeto e renda** — valor mensal e dia de pagamento",
      "2. **Duração** — prazo e renovação automática",
      "3. **Caução** — meses e condições de devolução",
      "4. **Denúncia** — pré-avisos do NRAU",
      "5. **Atualização anual** — coeficiente IPC",
      "6. **Regras** — animais, fumadores, sublocação e regras da casa",
      "",
      "Depois de assinar com o inquilino, **carregue o documento** no separador Contratos do imóvel — a decogest organiza tudo por contrato e arquiva na Pasta Digital.",
    ].join("\n"),
    actions: [{ label: "Abrir os meus imóveis →", to: "/imoveis", kind: "navigate" }],
    followups: ["Quais os prazos de denúncia do NRAU?"],
  };
}

function respResumoImovel(msg: string, ctx: AiContext): AiResponse | null {
  const m = norm(msg);
  const p = ctx.properties.find((pr) => {
    const tokens = norm(pr.name).split(/\s+/).filter((t) => t.length > 3);
    return tokens.some((t) => m.includes(t)) || m.includes(norm(pr.city));
  });
  if (!p) return null;

  const receita = ctx.transactions.filter((t) => t.propertyId === p.id && t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
  const despesa = ctx.transactions.filter((t) => t.propertyId === p.id && t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);
  const tenant = ctx.tenants.find((t) => t.propertyId === p.id);
  const contrato = ctx.contracts.find((c) => c.propertyId === p.id && statusEfetivo(c) !== "expired" && statusEfetivo(c) !== "terminated");

  return {
    content: [
      `**Resumo — ${p.name}** (${p.city})`,
      "",
      `- Estado: **${p.status}** · Renda: **${eur(p.rendaMensal)}/mês**`,
      `- Yield bruto: **${pct(yieldBruto(p))}** · Valor de compra: ${eur(p.valorCompra)}`,
      `- Acumulado: receita ${eur(receita)} · despesa ${eur(despesa)} · líquido **${eur(receita - despesa)}**`,
      tenant ? `- Inquilino: **${tenant.nomeCompleto}**` : "- Sem inquilino associado",
      contrato ? `- Contrato ${TIPO_LABEL[contrato.tipo]} ativo até ${dataPTShort(contrato.endDate)}` : "- Sem contrato ativo",
    ].join("\n"),
    actions: [{ label: `Ver ${p.name}`, to: `/imoveis/${p.id}`, kind: "navigate" }],
    followups: ["Analisar a rentabilidade do meu portfólio"],
  };
}

function respConhecimento(msg: string): AiResponse | null {
  const topico = procurarTopico(msg);
  if (!topico) return null;
  return {
    content: [`**${topico.titulo}**`, "", topico.resumo, "", `_Fonte: ${topico.fonte} · ${topico.lastUpdated}_`, "", DISCLAIMER].join("\n"),
  };
}

const FALLBACK: AiResponse = {
  content: [
    "Não tenho informação fiável sobre isso. Sou especialista em **gestão imobiliária portuguesa** e posso ajudar com:",
    "",
    "- Rentabilidade e resumo do portefólio",
    "- Rendas em atraso e situação dos inquilinos",
    "- Cálculo de **IMT / Imposto de Selo**",
    "- Deduções de **IRS (Categoria F)**",
    "- Redação de **contratos de arrendamento**",
    "- Legislação: **NRAU**, IMI, AIMI, Alojamento Local, cedência de posição, mais-valias",
  ].join("\n"),
  followups: ["Analisar a rentabilidade do meu portfólio", "Calcular o IMT para um imóvel de 250.000 € HPP"],
};

/** Ponto de entrada estável — trocar implementação por chamada à Edge Function no futuro. */
export async function respondToQuery(message: string, ctx: AiContext): Promise<AiResponse> {
  // delay de "thinking" simulado
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 800));

  if (has(message, "rentabilidade", "portfolio", "portefolio", "portefólio", "desempenho", "como esta o meu", "como está o meu"))
    return respPortfolio(ctx);
  if (has(message, "renda", "atraso", "deve", "em falta", "por pagar")) return respRendas(ctx);
  if (has(message, "imt")) return respImt(message);
  if (has(message, "irs", "deduç", "deducoes", "deduções", "categoria f")) return respDeducoes(ctx);
  if (has(message, "redigir", "fazer contrato", "criar contrato", "novo contrato", "minuta")) return respContrato();

  const resumo = respResumoImovel(message, ctx);
  if (resumo && has(message, "resumo", "resume", "situaç", "como esta", "como está")) return resumo;

  const conhecimento = respConhecimento(message);
  if (conhecimento) return conhecimento;

  // resumo de imóvel sem palavra-chave explícita (ex.: "T2 Arroios")
  if (resumo) return resumo;

  return FALLBACK;
}

/** Sugestões do ecrã inicial. */
export const SUGESTOES = [
  "Analisar a rentabilidade do meu portfólio",
  "Que rendas estão em atraso?",
  "Calcular o IMT para um imóvel de 250.000 € HPP",
  "Que deduções IRS posso aproveitar este ano?",
  "Redigir um contrato de arrendamento para o T3 Coimbra",
  "Resumo financeiro do T2 Arroios",
];

/** Tópicos da base de conhecimento (para UI futura). */
export const TOPICOS_CONHECIMENTO = KNOWLEDGE.map((k) => k.titulo);
