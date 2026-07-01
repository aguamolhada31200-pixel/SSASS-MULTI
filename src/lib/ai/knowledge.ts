// Base de conhecimento estática — legislação imobiliária PT (resumos).
// Disclaimer: informação geral, não substitui consulta a contabilista/advogado.

export interface KnowledgeTopic {
  id: string;
  titulo: string;
  resumo: string; // markdown curto
  fonte: string;
  lastUpdated: string;
  keywords: string[];
}

export const DISCLAIMER =
  "_Informação geral de apoio — não substitui aconselhamento de um contabilista ou advogado._";

export const KNOWLEDGE: KnowledgeTopic[] = [
  {
    id: "nrau",
    titulo: "NRAU — prazos de denúncia e pré-aviso",
    resumo: [
      "**Novo Regime do Arrendamento Urbano (NRAU)** — pré-avisos típicos de denúncia pelo arrendatário:",
      "- Contrato **≥ 6 anos**: pré-aviso de **120 dias**.",
      "- Contrato **1 a 6 anos**: pré-aviso de **90 dias**.",
      "- Contrato **6 meses a 1 ano**: pré-aviso de **60 dias**.",
      "- Contrato **< 6 meses**: pré-aviso de **1/3 da duração**.",
      "O senhorio só pode denunciar nos termos legais (ex.: necessidade de habitação própria) com pré-avisos mais longos.",
    ].join("\n"),
    fonte: "Lei n.º 6/2006 (NRAU), com alterações",
    lastUpdated: "2025",
    keywords: ["nrau", "denuncia", "denúncia", "pre-aviso", "pré-aviso", "rescis", "prazo", "arrendamento"],
  },
  {
    id: "irs-f",
    titulo: "IRS — Categoria F (rendimentos prediais)",
    resumo: [
      "**Categoria F (arrendamento)** — tributação autónoma à taxa de **28%**, com opção pelo englobamento.",
      "Taxas reduzidas por duração do contrato: **25%** (≥5 anos), **15%** (≥10 anos), **10%** (≥20 anos).",
      "**Despesas dedutíveis:** IMI, condomínio, seguros, obras de conservação/manutenção, e despesas suportadas e documentadas. **Não** são dedutíveis os juros do crédito nem mobiliário.",
    ].join("\n"),
    fonte: "Código do IRS, art.º 8.º e 41.º",
    lastUpdated: "2025",
    keywords: ["irs", "categoria f", "deduç", "deducoes", "deduções", "rendimento predial", "28%", "englobamento"],
  },
  {
    id: "imt",
    titulo: "IMT — Imposto Municipal sobre Transmissões",
    resumo: [
      "**IMT** incide sobre o maior valor entre o **preço** e o **VPT**.",
      "Cálculo: `Base × Taxa do escalão − Parcela a abater`. Existem tabelas distintas para **HPP** (habitação própria permanente) e **HS** (habitação secundária).",
      "Acresce **Imposto de Selo de 0,8%** sobre o mesmo valor. Use a Calculadora para o valor exato.",
    ].join("\n"),
    fonte: "Código do IMT",
    lastUpdated: "2025",
    keywords: ["imt", "transmiss", "compra", "aquisi", "escalão", "escalao"],
  },
  {
    id: "is",
    titulo: "Imposto de Selo (compra)",
    resumo: "Na compra de imóvel aplica-se **Imposto de Selo de 0,8%** sobre o maior valor entre o preço e o VPT, pago na escritura.",
    fonte: "Código do Imposto de Selo, Verba 1.1",
    lastUpdated: "2025",
    keywords: ["imposto de selo", "selo", "0,8", "escritura"],
  },
  {
    id: "imi",
    titulo: "IMI — Imposto Municipal sobre Imóveis",
    resumo: [
      "**IMI** anual sobre o **VPT**: prédios urbanos **0,3%–0,45%** (taxa definida pelo município); rústicos **0,8%**.",
      "Pagamento em **maio** (até 100 €), **maio/novembro** (100–500 €) ou **maio/agosto/novembro** (>500 €).",
    ].join("\n"),
    fonte: "Código do IMI",
    lastUpdated: "2025",
    keywords: ["imi", "vpt", "imposto municipal", "prestaç"],
  },
  {
    id: "aimi",
    titulo: "AIMI — Adicional ao IMI",
    resumo: "**AIMI** incide sobre a soma dos VPT detidos: isenção até **600.000 €** por sujeito passivo; **0,7%** até 1M€, **1%** de 1M€ a 2M€, **1,5%** acima. Casais podem optar por tributação conjunta (1,2M€ de dedução).",
    fonte: "Código do IMI, art.º 135.º",
    lastUpdated: "2025",
    keywords: ["aimi", "adicional", "patriménio", "patrimonio", "600"],
  },
  {
    id: "al",
    titulo: "Alojamento Local (AL)",
    resumo: [
      "**Alojamento Local** exige **registo** no Balcão Único Eletrónico (n.º de registo obrigatório nos anúncios).",
      "Rendimentos tributados na **Categoria B** (coeficiente de 0,35 para moradias/apartamentos). Sujeito a regras municipais, seguro e livro de reclamações.",
    ].join("\n"),
    fonte: "Decreto-Lei n.º 128/2014 (AL)",
    lastUpdated: "2025",
    keywords: ["alojamento local", "\bal\b", "airbnb", "categoria b", "registo"],
  },
  {
    id: "cedencia",
    titulo: "Cedência de posição contratual (CPCV)",
    resumo: [
      "Na **cedência de posição** num CPCV, o cessionário assume os direitos/obrigações do contrato-promessa.",
      "**Custo total de aquisição (CTA)** = valor de cedência + restante a pagar ao promitente-vendedor + impostos (IMT + IS calculados sobre o preço total da escritura).",
      "Atenção à tributação de **mais-valias** sobre o ganho da cedência.",
    ].join("\n"),
    fonte: "Código Civil (cessão da posição contratual)",
    lastUpdated: "2025",
    keywords: ["cedencia", "cedência", "cpcv", "posiç", "cessão", "cessao", "promitente"],
  },
  {
    id: "mais-valias",
    titulo: "Mais-valias imobiliárias (IRS)",
    resumo: [
      "**Mais-valia** = valor de venda − (valor de aquisição corrigido + encargos + obras dos últimos 12 anos).",
      "Para residentes, **50% da mais-valia** é englobada às taxas progressivas de IRS. **Reinvestimento** em HPP pode isentar (com condições).",
    ].join("\n"),
    fonte: "Código do IRS, art.º 10.º e 43.º",
    lastUpdated: "2025",
    keywords: ["mais-valia", "mais valias", "venda", "ganho", "reinvestimento", "flip"],
  },
];

export function procurarTopico(msg: string): KnowledgeTopic | undefined {
  const m = msg.toLowerCase();
  return KNOWLEDGE.find((t) => t.keywords.some((k) => m.includes(k.replace(/\\b/g, ""))));
}
