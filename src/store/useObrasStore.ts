import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CURRENT_USER_ID } from "./useProfilesStore";
import { papelOverride } from "./useViewAs";

// ───────────────────── Types ─────────────────────

export type ObraCategoria =
  | "cozinha"
  | "wc"
  | "pintura"
  | "eletricidade"
  | "canalizacao"
  | "estrutural"
  | "mobiliario"
  | "arquitetura"
  | "geral";

export type ObraEstado =
  | "por_iniciar"
  | "em_curso"
  | "pausada"
  | "concluida"
  | "atrasada";

/** Divisão da casa onde a obra acontece — base da navegação Casa → Divisão → Obra. */
export type Divisao =
  | "cozinha"
  | "sala"
  | "quarto"
  | "wc"
  | "hall"
  | "varanda"
  | "exterior"
  | "casa_toda";

export const DIVISAO_LABEL: Record<Divisao, string> = {
  cozinha: "Cozinha",
  sala: "Sala",
  quarto: "Quarto",
  wc: "WC",
  hall: "Hall",
  varanda: "Varanda",
  exterior: "Exterior",
  casa_toda: "Casa toda",
};

/** Ordem de apresentação no nível 2 — "casa_toda" fica sempre no fim (cartão à parte). */
export const DIVISAO_ORDEM: Divisao[] = ["cozinha", "sala", "quarto", "wc", "hall", "varanda", "exterior", "casa_toda"];

/** Divisão efetiva de uma obra — obras antigas sem divisão inferem-na da categoria. */
export function divisaoDe(o: Pick<Obra, "divisao" | "categoria">): Divisao {
  if (o.divisao) return o.divisao;
  if (o.categoria === "cozinha") return "cozinha";
  if (o.categoria === "wc") return "wc";
  return "casa_toda";
}

export type MarcoEstado = "pendente" | "pago" | "atrasado";

export const CATEGORIA_LABEL: Record<ObraCategoria, string> = {
  cozinha: "Cozinha",
  wc: "Casa de banho",
  pintura: "Pintura",
  eletricidade: "Eletricidade",
  canalizacao: "Canalização",
  estrutural: "Estrutural",
  mobiliario: "Mobiliário",
  arquitetura: "Arquitetura",
  geral: "Geral",
};

export const ESTADO_LABEL: Record<ObraEstado, string> = {
  por_iniciar: "Por iniciar",
  em_curso: "Em curso",
  pausada: "Pausada",
  concluida: "Concluída",
  atrasada: "Atrasada",
};

export const MARCO_ESTADO_LABEL: Record<MarcoEstado, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
};

// ───────────────────── Co-gestão (permissões + votação) ─────────────────────

export type ObraRole = "gestor" | "investidor" | "observador";

export interface ObraMember {
  userId: string;
  role: ObraRole;
  joinedAt: string;
}

export const ROLE_LABEL: Record<ObraRole, string> = {
  gestor: "Gestor",
  investidor: "Sócio investidor",
  observador: "Observador",
};

/** Cor do anel à volta do avatar, por papel. */
export const ROLE_RING: Record<ObraRole, string> = {
  gestor: "ring-gold",
  investidor: "ring-primary",
  observador: "ring-line",
};

export type VotoValor = "a_favor" | "contra";

export interface Voto {
  userId: string;
  valor: VotoValor;
  ts: string;
}

export type AprovacaoEstado = "aplicado" | "pendente" | "rejeitado";

export interface Aprovacao {
  estado: AprovacaoEstado;
  requeridoPor: string; // userId do gestor que registou
  requeridoEm: string; // ISO date
  prazoVoto?: string; // ISO date limite
  votos: Voto[];
  decididoEm?: string;
}

export type RegraVotacao = "maioria_simples" | "unanimidade";

export const REGRA_LABEL: Record<RegraVotacao, string> = {
  maioria_simples: "Maioria simples",
  unanimidade: "Unanimidade",
};

// ───────────────────── Prova (comprovativos) ─────────────────────

export type ProvaTipo = "fatura" | "recibo" | "comprovativo_pagamento" | "orcamento";

export const PROVA_TIPO_LABEL: Record<ProvaTipo, string> = {
  fatura: "Fatura",
  recibo: "Recibo",
  comprovativo_pagamento: "Comprovativo de pagamento",
  orcamento: "Orçamento",
};

export interface Comprovativo {
  id: string;
  documentId: string;       // referência em useDocumentsStore
  tipo: ProvaTipo;
  nomeFicheiro: string;
  valorNoComprovativo?: number; // o valor lido do documento (para detetar divergências)
  addedBy: string;           // userId
  addedAt: string;           // ISO datetime
}

export type EstadoProva = "comprovada" | "por_comprovar";

export const ESTADO_PROVA_LABEL: Record<EstadoProva, string> = {
  comprovada: "Comprovada",
  por_comprovar: "Por comprovar",
};

export interface ConfirmacaoDespesa {
  userId: string;
  valor: "confirma" | "contesta";
  comentario?: string;
  ts: string; // ISO
}

// ───────────────────── Orçamento detalhado (custos à portuguesa) ─────────────────────
// Dado rico, interface burra: tudo opcional exceto título/divisão/orçamento.
// Quando os blocos detalhados existem, o orçamento da obra é recalculado a partir deles.

export type EspecialidadeMO =
  | "demolicao" | "pichelaria" | "eletricidade" | "alvenaria" | "carpintaria"
  | "pintura" | "estuque" | "serralharia" | "acabamentos" | "outros";

export const ESPECIALIDADE_MO_LABEL: Record<EspecialidadeMO, string> = {
  demolicao: "Demolição",
  pichelaria: "Pichelaria",
  eletricidade: "Eletricidade",
  alvenaria: "Alvenaria",
  carpintaria: "Carpintaria",
  pintura: "Pintura",
  estuque: "Estuque",
  serralharia: "Serralharia",
  acabamentos: "Acabamentos",
  outros: "Outros",
};

export type ModalidadeMO = "empreitada_fechada" | "por_hora" | "por_dia";

export const MODALIDADE_MO_LABEL: Record<ModalidadeMO, string> = {
  empreitada_fechada: "Empreitada fechada",
  por_hora: "Por hora",
  por_dia: "Por dia",
};

export interface MaoDeObraItem {
  id: string;
  especialidade: EspecialidadeMO;
  modalidade: ModalidadeMO;
  valorFechado?: number;
  /** €/hora ou €/dia, conforme a modalidade. */
  valorHora?: number;
  horasPrevistas?: number;
  horasReais?: number;
  empreiteiroId?: string;
}

export function subtotalMaoDeObra(i: MaoDeObraItem): number {
  if (i.modalidade === "empreitada_fechada") return i.valorFechado ?? 0;
  return (i.valorHora ?? 0) * (i.horasReais ?? i.horasPrevistas ?? 0);
}

export type UnidadeMaterial = "un" | "m2" | "m" | "m3" | "kg" | "saco" | "l";

export const UNIDADE_LABEL: Record<UnidadeMaterial, string> = {
  un: "un", m2: "m²", m: "m", m3: "m³", kg: "kg", saco: "saco", l: "L",
};

export interface MaterialItem {
  id: string;
  descricao: string;
  quantidade: number;
  unidade: UnidadeMaterial;
  precoUnitario: number;
  fornecedor?: string;
  dataPrecoAtualizado?: string; // YYYY-MM-DD
}

export function subtotalMaterial(m: MaterialItem): number {
  return (m.quantidade || 0) * (m.precoUnitario || 0);
}

/** Preço com mais de 60 dias — "preços de materiais podem ter mudado". */
export function precoDesatualizado(m: MaterialItem): boolean {
  if (!m.dataPrecoAtualizado) return false;
  const dias = Math.round((Date.now() - new Date(`${m.dataPrecoAtualizado}T00:00:00`).getTime()) / 86400000);
  return dias > 60;
}

export type TipoEquipamento = "andaimes" | "betoneira" | "elevacao" | "contentor_rcd" | "taxa_vazadouro" | "outros";

export const EQUIPAMENTO_LABEL: Record<TipoEquipamento, string> = {
  andaimes: "Andaimes",
  betoneira: "Betoneira",
  elevacao: "Elevação",
  contentor_rcd: "Contentor RCD",
  taxa_vazadouro: "Taxa de vazadouro",
  outros: "Outros",
};

export interface EquipamentoItem {
  id: string;
  tipo: TipoEquipamento;
  descricao?: string;
  custo: number;
  dias?: number;
}

export type TipoLicenciamento = "nao_aplicavel" | "comunicacao_previa" | "licenciamento" | "isento";

export const LICENCIAMENTO_LABEL: Record<TipoLicenciamento, string> = {
  nao_aplicavel: "Não aplicável",
  comunicacao_previa: "Comunicação prévia",
  licenciamento: "Licenciamento",
  isento: "Isento",
};

export type EstadoProcesso = "nao_iniciado" | "submetido" | "aprovado" | "indeferido";

export const ESTADO_PROCESSO_LABEL: Record<EstadoProcesso, string> = {
  nao_iniciado: "Não iniciado",
  submetido: "Submetido",
  aprovado: "Aprovado",
  indeferido: "Indeferido",
};

export interface Licenciamento {
  tipo: TipoLicenciamento;
  taxaCamararia?: number;
  custoAlvara?: number;
  /** OVP — ocupação de via pública (andaimes/contentores). */
  ovpNecessaria?: boolean;
  ovpCusto?: number;
  ovpDias?: number;
  numeroProcesso?: string;
  dataSubmissao?: string;
  dataAprovacao?: string;
  estadoProcesso?: EstadoProcesso;
}

export type TipoProjetoEsp =
  | "arquitetura" | "estabilidade" | "termica" | "acustica"
  | "aguas_esgotos" | "eletricidade_ited" | "gas" | "outros";

export const PROJETO_ESP_LABEL: Record<TipoProjetoEsp, string> = {
  arquitetura: "Arquitetura",
  estabilidade: "Estabilidade",
  termica: "Térmica",
  acustica: "Acústica",
  aguas_esgotos: "Águas e esgotos",
  eletricidade_ited: "Eletricidade / ITED",
  gas: "Gás",
  outros: "Outros",
};

export interface ProjetoHonorario {
  id: string;
  tipo: TipoProjetoEsp;
  gabinete?: string;
  custo: number;
  estado: "por_contratar" | "em_curso" | "entregue";
}

export interface SegurosObra {
  rcContratado?: boolean;
  rcSeguradora?: string;
  rcApolice?: string;
  rcCapital?: number;
  rcCusto?: number;
  rcValidade?: string;
  rcDocumentId?: string;
  /** Seguro de acidentes de trabalho do empreiteiro — obrigação dele; aqui verifica-se. */
  atVerificado?: boolean;
  atValidade?: string;
  atDocumentId?: string;
}

export interface FiscalObraInfo {
  contratado?: boolean;
  nome?: string;
  contacto?: string;
  custo?: number;
  periodicidadeVisitas?: string;
}

export interface CoordenacaoSegurancaInfo {
  necessaria?: boolean;
  coordenador?: string;
  custo?: number;
  documentId?: string;
}

export type IvaJustificacao = "aru" | "reabilitacao_habitacao" | "normal";

export interface IvaObra {
  /** Resposta do assistente: ARU / reabilitação de habitação / normal. */
  justificacao?: IvaJustificacao;
  /** "Tenho contrato com trabalhos e materiais discriminados" (requisito legal fora de ARU). */
  contratoDiscriminado?: boolean;
}

export interface ContingenciaObra {
  /** 10–20%, default 15. */
  percentagem?: number;
}

export interface ContratoObra {
  assinado?: boolean;
  documentId?: string;
  alvaraEmpreiteiro?: string;
  alvaraVerificadoIMPIC?: boolean;
  prazoExecucaoDias?: number;
  penalizacaoAtrasoDia?: number;
}

export interface Tarefa {
  id: string;
  titulo: string;
  feito: boolean;
  dataFeito?: string;
  feitoPor?: string; // userId
  responsavel?: string;
  criadoEm: string;
}

export type DiarioTipo = "antes" | "durante" | "depois" | "nota";

export const DIARIO_TIPO_LABEL: Record<DiarioTipo, string> = {
  antes: "Antes",
  durante: "Durante",
  depois: "Depois",
  nota: "Nota",
};

export interface DiarioEntry {
  id: string;
  data: string; // ISO datetime
  texto?: string;
  fotos: string[];
  autorId: string;
  tipo: DiarioTipo;
}

export interface Obra {
  id: string;
  projectId?: string;
  propertyId?: string;
  titulo: string;
  categoria: ObraCategoria;
  /** Divisão da casa (Casa → Divisão → Obra). Ausente em obras antigas — usar divisaoDe(). */
  divisao?: Divisao;
  orcamento: number;
  /** Stored fallback when there are no despesas linked. Auto-replaced by sum(despesas) in selectors. */
  gasto: number;
  dataInicio: string;
  dataFimPrevista: string;
  dataFimReal?: string;
  estado: ObraEstado;
  /** Stored fallback when there are no fases linked. Auto-replaced by avg(fases.progresso). */
  progresso: number;
  empreiteiro?: string;
  /** Liga ao diretório de empreiteiros (useTechniciansStore). */
  empreiteiroId?: string;
  contactoEmpreiteiro?: string;
  /** Nota de causa da derrapagem (ex.: "Troca de loiças") — vira o resumo humano do header. */
  notaCausa?: string;
  fotos: string[];
  notas: string;
  createdAt: string;
  // ── Co-gestão (opcional; ausente = obra solo, só o senhorio) ──
  members?: ObraMember[];
  /** Valor (€) acima do qual despesas/marcos precisam de voto. Default = 5% do orçamento. */
  thresholdAprovacao?: number;
  regraVotacao?: RegraVotacao;
  /** Avaliação ao técnico após conclusão (1–5). */
  avaliacaoTecnico?: number;
  // ── Orçamento detalhado (opcional — quando existe, recalcula o orçamento) ──
  maoDeObra?: MaoDeObraItem[];
  materiais?: MaterialItem[];
  equipamentos?: EquipamentoItem[];
  licenciamento?: Licenciamento;
  projetosHonorarios?: ProjetoHonorario[];
  seguros?: SegurosObra;
  fiscalObra?: FiscalObraInfo;
  cso?: CoordenacaoSegurancaInfo;
  iva?: IvaObra;
  contingencia?: ContingenciaObra;
  contrato?: ContratoObra;
  // ── Operação simples ──
  tarefas?: Tarefa[];
  diario?: DiarioEntry[];
  /** IDs de avisos legais que o gestor marcou como "Já tratei". */
  avisosDispensados?: string[];
  /** Contactos desta obra (IDs do diretório de técnicos), além do empreiteiro. */
  contactosIds?: string[];
}

export interface Fase {
  id: string;
  obraId: string;
  titulo: string;
  dataInicio: string;
  dataFim: string;
  progresso: number;
  custoEstimado: number;
  responsavel?: string;
  dependeDe?: string;
  ordem: number;
}

export interface Despesa {
  id: string;
  obraId: string;
  faseId?: string;
  descricao: string;
  valor: number;
  data: string;
  faturaUrl?: string;
  fornecedor?: string;
  nif?: string;
  categoria?: string;
  registadoPor?: string; // userId
  registadoEm?: string; // ISO datetime
  aprovacao?: Aprovacao; // presente quando excede o threshold
  // ── Prova ──
  comprovativos?: Comprovativo[];
  fotos?: string[]; // dataURLs / urls
  /** Sobrescreve o estado derivado dos comprovativos (caso o utilizador queira flagar manualmente). */
  estadoProva?: EstadoProva;
  confirmacoes?: ConfirmacaoDespesa[];
}

export interface Marco {
  id: string;
  obraId: string;
  titulo: string;
  valor: number;
  dataPrevista: string;
  dataPago?: string;
  estado: MarcoEstado;
  empreiteiro?: string;
  registadoPor?: string; // userId
  pagoPor?: string; // userId
  aprovacao?: Aprovacao;
  /** Obrigatório para passar o marco a "pago". */
  comprovativoPagamento?: Comprovativo;
}

export interface LogEntry {
  id: string;
  obraId: string;
  ts: string;
  texto: string;
}

/** Sugestão enviada por um sócio investidor ao gestor da obra (passo ou gasto proposto). */
export interface SugestaoFase {
  id: string;
  obraId: string;
  titulo: string;
  autorId: string;
  ts: string; // ISO
  estado: "pendente" | "aceite" | "rejeitada";
  /** "passo" (default, retro-compat) ou "gasto" proposto pelo sócio. */
  tipo?: "passo" | "gasto";
  /** Valor estimado quando tipo === "gasto". */
  valor?: number;
}

// ───────────────────── Inputs ─────────────────────

export type ObraInput = Omit<Obra, "id" | "createdAt" | "fotos" | "notas"> & {
  fotos?: string[];
  notas?: string;
};

// ───────────────────── Sugestão de fases por categoria ─────────────────────

export const FASES_SUGERIDAS: Record<ObraCategoria, string[]> = {
  cozinha: ["Demolição", "Canalização", "Eletricidade", "Mobiliário", "Eletrodomésticos"],
  wc: ["Demolição", "Canalização", "Pavimento & azulejo", "Loiças & torneiras"],
  pintura: ["Preparação paredes", "Tetos", "Paredes"],
  eletricidade: ["Quadro elétrico", "Cablagem", "Tomadas & interruptores"],
  canalizacao: ["Demolição", "Rede de águas", "Rede de esgotos", "Testes de pressão"],
  estrutural: ["Estudo & projeto", "Demolição", "Reforço estrutural", "Acabamentos"],
  mobiliario: ["Medições", "Produção", "Montagem"],
  arquitetura: ["Levantamento", "Estudo prévio", "Projeto base", "Projeto execução"],
  geral: ["Planeamento", "Execução", "Acabamentos"],
};

// ── Assistentes por categoria (poupam escrita) ──

export const ESPECIALIDADES_SUGERIDAS: Record<ObraCategoria, EspecialidadeMO[]> = {
  cozinha: ["demolicao", "pichelaria", "eletricidade", "alvenaria", "carpintaria", "pintura"],
  wc: ["demolicao", "pichelaria", "alvenaria", "acabamentos"],
  pintura: ["estuque", "pintura"],
  eletricidade: ["eletricidade"],
  canalizacao: ["demolicao", "pichelaria"],
  estrutural: ["demolicao", "alvenaria", "serralharia", "acabamentos"],
  mobiliario: ["carpintaria"],
  arquitetura: ["outros"],
  geral: ["demolicao", "alvenaria", "pintura", "acabamentos"],
};

export const MATERIAIS_SUGERIDOS: Record<ObraCategoria, string[]> = {
  cozinha: ["Azulejo", "Tinta", "Loiça sanitária", "Torneira", "Bancada", "Eletrodomésticos"],
  wc: ["Azulejo", "Loiça sanitária", "Torneiras", "Base de duche", "Móvel WC"],
  pintura: ["Tinta", "Massa de reparação", "Rolos e fitas", "Lonas de proteção"],
  eletricidade: ["Quadro elétrico", "Cabo", "Tomadas e interruptores", "Iluminação"],
  canalizacao: ["Tubagem PEX", "Válvulas", "Sifões", "Autoclismo"],
  estrutural: ["Cimento", "Varão de aço", "Vigas", "Tijolo"],
  mobiliario: ["Painéis", "Ferragens", "Puxadores"],
  arquitetura: [],
  geral: ["Cimento", "Tinta", "Pavimento", "Rodapés"],
};

export const TAREFAS_SUGERIDAS: Record<ObraCategoria, string[]> = {
  cozinha: ["Escolher azulejos", "Marcar entrega dos móveis", "Ligar ao picheleiro", "Escolher eletrodomésticos"],
  wc: ["Escolher loiças", "Escolher azulejos", "Confirmar medidas do duche"],
  pintura: ["Escolher cores", "Comprar tinta", "Proteger móveis"],
  eletricidade: ["Marcar certificação", "Escolher iluminação"],
  canalizacao: ["Fechar a água geral", "Testar pressão"],
  estrutural: ["Pedir parecer do engenheiro", "Confirmar licença"],
  mobiliario: ["Confirmar medidas", "Marcar montagem"],
  arquitetura: ["Reunir com o arquiteto", "Levantamento do existente"],
  geral: ["Pedir 3 orçamentos", "Marcar visita do empreiteiro"],
};

// ───────────────────── Totais do orçamento detalhado ─────────────────────

export interface TotaisObra {
  /** Há blocos detalhados preenchidos? Sem eles, vale o orçamento simples. */
  temDetalhe: boolean;
  custosDiretos: number;
  totalMateriais: number;
  custosLegais: number;
  custosTecnicos: number;
  subtotalSemIva: number;
  /** % dos materiais no subtotal — regra dos 20% do IVA a 6%. */
  pctMateriais: number;
  ivaElegivel6: boolean;
  ivaTaxa: 6 | 23;
  valorIva: number;
  /** Quanto poupa com 6% face a 23% (0 se não elegível). */
  poupancaIva: number;
  contingenciaPct: number;
  contingenciaValor: number;
  contingenciaUsado: number;
  orcamentoTotal: number;
}

/** Aviso do assistente de IVA — texto humano gerado dos dados. */
export function avisoElegibilidadeIva(t: TotaisObra, iva?: IvaObra): string {
  if (!iva?.justificacao) return "Responda às perguntas para estimar o IVA.";
  if (iva.justificacao === "aru") return "Imóvel em ARU → IVA a 6%. Confirme na sua câmara municipal.";
  if (iva.justificacao === "normal") return "Obra sem enquadramento de reabilitação → IVA a 23%.";
  if (t.pctMateriais > 20)
    return `Os materiais representam ${Math.round(t.pctMateriais)}% da obra. Para IVA a 6% fora de ARU, os materiais não podem passar de 20% do valor total. Neste momento a obra é taxada a 23%.`;
  if (!iva.contratoDiscriminado)
    return "Materiais dentro do limite dos 20% — falta o contrato com trabalhos e materiais discriminados para os 6%.";
  return "Elegível para IVA a 6% (reabilitação de habitação, materiais ≤ 20% e contrato discriminado).";
}

/**
 * Totais auto-calculados da obra. Se os blocos detalhados estiverem vazios,
 * o subtotal é o orçamento simples da camada rápida (IVA/contingência não somam).
 */
export function totaisObra(obra: Obra, despesas: Despesa[]): TotaisObra {
  const mo = (obra.maoDeObra ?? []).reduce((s, i) => s + subtotalMaoDeObra(i), 0);
  const totalMateriais = (obra.materiais ?? []).reduce((s, m) => s + subtotalMaterial(m), 0);
  const equip = (obra.equipamentos ?? []).reduce((s, e) => s + (e.custo || 0), 0);
  const custosDiretos = mo + totalMateriais + equip;

  const lic = obra.licenciamento;
  const custosLicenca = (lic?.taxaCamararia ?? 0) + (lic?.custoAlvara ?? 0) + (lic?.ovpNecessaria ? lic?.ovpCusto ?? 0 : 0);
  const honorarios = (obra.projetosHonorarios ?? []).reduce((s, p) => s + (p.custo || 0), 0);
  const seguros = obra.seguros?.rcContratado ? obra.seguros?.rcCusto ?? 0 : 0;
  const custosLegais = custosLicenca + honorarios + seguros;

  const custosTecnicos = (obra.fiscalObra?.contratado ? obra.fiscalObra?.custo ?? 0 : 0) + (obra.cso?.necessaria ? obra.cso?.custo ?? 0 : 0);

  const temDetalhe = custosDiretos > 0 || custosLegais > 0 || custosTecnicos > 0;
  const subtotalSemIva = temDetalhe ? custosDiretos + custosLegais + custosTecnicos : obra.orcamento;

  const pctMateriais = subtotalSemIva > 0 ? (totalMateriais / subtotalSemIva) * 100 : 0;
  const j = obra.iva?.justificacao;
  const ivaElegivel6 =
    j === "aru" || (j === "reabilitacao_habitacao" && pctMateriais <= 20 && !!obra.iva?.contratoDiscriminado);
  const ivaTaxa: 6 | 23 = ivaElegivel6 ? 6 : 23;
  const valorIva = Math.round(subtotalSemIva * (ivaTaxa / 100));
  const poupancaIva = ivaElegivel6 ? Math.round(subtotalSemIva * 0.17) : 0;

  const contingenciaPct = Math.min(20, Math.max(10, obra.contingencia?.percentagem ?? 15));
  const contingenciaValor = temDetalhe ? Math.round(subtotalSemIva * (contingenciaPct / 100)) : 0;

  const orcamentoTotal = temDetalhe ? subtotalSemIva + valorIva + contingenciaValor : obra.orcamento;

  const gasto = gastoReal(obra, despesas);
  const contingenciaUsado = temDetalhe
    ? Math.min(contingenciaValor, Math.max(0, gasto - (subtotalSemIva + valorIva)))
    : 0;

  return {
    temDetalhe,
    custosDiretos,
    totalMateriais,
    custosLegais,
    custosTecnicos,
    subtotalSemIva,
    pctMateriais,
    ivaElegivel6,
    ivaTaxa,
    valorIva,
    poupancaIva,
    contingenciaPct,
    contingenciaValor,
    contingenciaUsado,
    orcamentoTotal,
  };
}

// ───────────────────── Avisos legais automáticos (PT) ─────────────────────
// Informativos, não aconselhamento jurídico. Dispensáveis com "Já tratei".

export interface AvisoLegal {
  id: string;
  texto: string;
  acao: string;
}

export function avisosLegais(obra: Obra, totais: TotaisObra): AvisoLegal[] {
  const avisos: AvisoLegal[] = [];
  const dispensados = new Set(obra.avisosDispensados ?? []);
  const temEmpreiteiro = !!(obra.empreiteiroId || obra.empreiteiro);

  if (totais.orcamentoTotal > 20000 && !obra.contrato?.assinado)
    avisos.push({
      id: "contrato",
      texto: "Obras acima de 20.000 € exigem contrato escrito com partes, alvarás, trabalhos, materiais, valor, prazo e penalizações por atraso.",
      acao: "Anexar contrato",
    });
  if (temEmpreiteiro && !obra.contrato?.alvaraVerificadoIMPIC)
    avisos.push({
      id: "impic",
      texto: "Confirme o alvará do empreiteiro no portal do IMPIC antes de começar.",
      acao: "Marcar como verificado",
    });
  const estrutural = obra.categoria === "estrutural";
  const processoParado = !obra.licenciamento || obra.licenciamento.tipo === "nao_aplicavel" || (obra.licenciamento.estadoProcesso ?? "nao_iniciado") === "nao_iniciado";
  if (estrutural && processoParado && obra.estado !== "concluida")
    avisos.push({
      id: "licenca",
      texto: "Obras na estrutura ou fachada exigem licença camarária. Coimas de 500 € a 200.000 €.",
      acao: "Registar processo",
    });
  if (obra.licenciamento?.ovpNecessaria && !obra.licenciamento.ovpCusto)
    avisos.push({
      id: "ovp",
      texto: "Andaimes ou contentores na via pública exigem licença de ocupação de via pública.",
      acao: "Adicionar taxa",
    });
  if (temEmpreiteiro && !obra.seguros?.rcContratado)
    avisos.push({
      id: "seguro-rc",
      texto: "Recomendado: seguro de responsabilidade civil do empreiteiro.",
      acao: "Registar seguro",
    });
  if (temEmpreiteiro && !obra.seguros?.atVerificado)
    avisos.push({
      id: "seguro-at",
      texto: "O empreiteiro é obrigado a ter seguro de acidentes de trabalho.",
      acao: "Confirmar",
    });
  return avisos.filter((a) => !dispensados.has(a.id));
}

// ───────────────────── Seeds ─────────────────────

// Membros de co-gestão. "Você" (utilizador atual) é gestor no #001 e investidor no #003.
const MEMBROS_PORTO: ObraMember[] = [
  { userId: CURRENT_USER_ID, role: "gestor", joinedAt: "2026-03-01" },
  { userId: "pedro-alves", role: "investidor", joinedAt: "2026-03-01" },
  { userId: "rita-santos", role: "investidor", joinedAt: "2026-03-01" },
];
const MEMBROS_PRINCIPE: ObraMember[] = [
  { userId: "pedro-alves", role: "gestor", joinedAt: "2026-03-05" },
  { userId: CURRENT_USER_ID, role: "investidor", joinedAt: "2026-03-05" },
  { userId: "rita-santos", role: "investidor", joinedAt: "2026-03-05" },
];

/** Anexa membros de co-gestão às obras dos projetos partilhados (obras solo ficam sem membros). */
function withMembers(o: Obra): Obra {
  if (o.projectId === "porto-flip") return { ...o, members: MEMBROS_PORTO, regraVotacao: "maioria_simples" };
  if (o.projectId === "principe-real") return { ...o, members: MEMBROS_PRINCIPE, regraVotacao: "maioria_simples" };
  return o;
}

/** Data ISO a N dias de hoje — para seeds com datas relativas. */
function seedEmDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const IMG_OBRA = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

const SEED_OBRAS: Obra[] = ([
  // PORTO FLIP — projeto colaborativo #001
  {
    id: "o-porto-1",
    divisao: "sala",
    projectId: "porto-flip",
    titulo: "Estudo arquitetura",
    categoria: "arquitetura",
    orcamento: 4500,
    gasto: 2200,
    dataInicio: "2026-03-10",
    dataFimPrevista: "2026-04-15",
    estado: "em_curso",
    progresso: 49,
    empreiteiro: "Atelier Soares",
    contactoEmpreiteiro: "geral@ateliersoares.pt",
    fotos: [],
    notas: "Plantas finais em revisão pelo arquiteto. À espera de aprovação da câmara.",
    createdAt: "2026-03-10",
  },
  {
    id: "o-porto-2",
    divisao: "casa_toda",
    projectId: "porto-flip",
    titulo: "Canalização total",
    categoria: "canalizacao",
    orcamento: 8000,
    gasto: 9500,
    dataInicio: "2026-04-15",
    dataFimPrevista: "2026-05-30",
    estado: "em_curso",
    progresso: 95,
    empreiteiro: "Hidroplan Porto",
    fotos: [],
    notas: "Custo extra com substituição de prumadas que estavam corroídas.",
    notaCausa: "Substituição de prumadas corroídas",
    createdAt: "2026-04-15",
  },
  {
    id: "o-porto-3",
    divisao: "casa_toda",
    projectId: "porto-flip",
    titulo: "Reforço estrutural piso 1",
    categoria: "estrutural",
    orcamento: 14000,
    gasto: 4500,
    dataInicio: "2026-05-01",
    dataFimPrevista: "2026-07-15",
    estado: "em_curso",
    progresso: 32,
    empreiteiro: "Constru Forte Lda.",
    fotos: [],
    notas: "",
    createdAt: "2026-05-01",
  },
  {
    id: "o-porto-4",
    divisao: "casa_toda",
    projectId: "porto-flip",
    titulo: "Eletricidade ITED",
    categoria: "eletricidade",
    orcamento: 2500,
    gasto: 2400,
    dataInicio: "2026-04-20",
    dataFimPrevista: "2026-06-01",
    estado: "atrasada",
    progresso: 95,
    empreiteiro: "ElectroPorto",
    empreiteiroId: "tec-electroporto",
    fotos: [],
    notas: "Atrasada 5 dias — fornecimento de quadro com atraso.",
    notaCausa: "Fornecimento do quadro elétrico com atraso",
    createdAt: "2026-04-20",
  },

  // ── Obra grande de demonstração dos AVISOS LEGAIS (Parte 7): contrato >20k,
  // IVA 23% (materiais ≈ 34% > 20%), alvará IMPIC por verificar, OVP, CSO. ──
  // Subtotal 41.850 € · IVA 23% 9.626 € · contingência 20% 8.370 € → ≈ 59.846 €.
  {
    id: "o-porto-reab",
    divisao: "casa_toda",
    projectId: "porto-flip",
    titulo: "Reabilitação total",
    categoria: "estrutural",
    orcamento: 59846,
    gasto: 0,
    dataInicio: "2026-07-01",
    dataFimPrevista: "2026-11-30",
    estado: "em_curso",
    progresso: 10,
    empreiteiro: "Reabilita Norte Lda.",
    fotos: [],
    notas: "Reabilitação integral do edifício — fase de preparação e licenciamento.",
    createdAt: "2026-06-20",
    maoDeObra: [
      { id: "mo-r1", especialidade: "outros", modalidade: "empreitada_fechada", valorFechado: 14000 },
    ],
    materiais: [
      { id: "mat-r1", descricao: "Caixilharia (vidro duplo)", quantidade: 1, unidade: "un", precoUnitario: 6900, dataPrecoAtualizado: seedEmDias(-20) },
      { id: "mat-r2", descricao: "Pavimentos", quantidade: 95, unidade: "m2", precoUnitario: 43.16, dataPrecoAtualizado: seedEmDias(-75) },
      { id: "mat-r3", descricao: "Cerâmicos WC e cozinha", quantidade: 1, unidade: "un", precoUnitario: 2200, dataPrecoAtualizado: seedEmDias(-20) },
      { id: "mat-r4", descricao: "Tintas e primários", quantidade: 1, unidade: "un", precoUnitario: 800, dataPrecoAtualizado: seedEmDias(-20) },
    ],
    equipamentos: [
      { id: "eq-r1", tipo: "andaimes", custo: 1400, dias: 30 },
      { id: "eq-r2", tipo: "contentor_rcd", custo: 600, dias: 15 },
      { id: "eq-r3", tipo: "taxa_vazadouro", custo: 250 },
    ],
    licenciamento: {
      tipo: "comunicacao_previa",
      taxaCamararia: 480,
      ovpNecessaria: true,
      ovpCusto: 620,
      ovpDias: 30,
      numeroProcesso: "CP-2026/1184",
      dataSubmissao: "2026-06-25",
      estadoProcesso: "submetido",
    },
    projetosHonorarios: [
      { id: "ph-r1", tipo: "arquitetura", gabinete: "Atelier Soares", custo: 3200, estado: "em_curso" },
      { id: "ph-r2", tipo: "estabilidade", custo: 1800, estado: "em_curso" },
      { id: "ph-r3", tipo: "termica", custo: 900, estado: "por_contratar" },
      { id: "ph-r4", tipo: "eletricidade_ited", custo: 700, estado: "por_contratar" },
    ],
    fiscalObra: { contratado: true, nome: "Eng. Marta Silva", contacto: "91 555 20 20", custo: 2400, periodicidadeVisitas: "Semanal" },
    cso: { necessaria: true, coordenador: "SafeWork Porto", custo: 1500 },
    iva: { justificacao: "reabilitacao_habitacao", contratoDiscriminado: false },
    contingencia: { percentagem: 20 },
    contrato: { assinado: false, alvaraVerificadoIMPIC: false },
    tarefas: [
      { id: "t-r1", titulo: "Submeter comunicação prévia", feito: true, dataFeito: "2026-06-25", feitoPor: CURRENT_USER_ID, criadoEm: "2026-06-20" },
      { id: "t-r2", titulo: "Assinar contrato de empreitada", feito: false, criadoEm: "2026-06-20" },
      { id: "t-r3", titulo: "Verificar alvará no IMPIC", feito: false, criadoEm: "2026-06-20" },
      { id: "t-r4", titulo: "Pedir licença de ocupação de via pública", feito: false, criadoEm: "2026-06-26" },
    ],
    diario: [
      { id: "di-r1", data: "2026-06-28T10:00:00.000Z", tipo: "antes", autorId: CURRENT_USER_ID, texto: "Estado atual do edifício antes da reabilitação.", fotos: [IMG_OBRA("1487958449943-2429e8be8625")] },
      { id: "di-r2", data: "2026-07-10T16:00:00.000Z", tipo: "durante", autorId: CURRENT_USER_ID, texto: "Montagem de andaimes e proteções na fachada.", fotos: [IMG_OBRA("1541888946425-d81bb19240f5")] },
    ],
  },

  // PRÍNCIPE REAL — projeto colaborativo #003 (novo)
  {
    id: "o-principe-1",
    divisao: "sala",
    projectId: "principe-real",
    titulo: "Pintura completa",
    categoria: "pintura",
    orcamento: 4500,
    gasto: 2800,
    dataInicio: "2026-05-10",
    dataFimPrevista: "2026-06-20",
    estado: "em_curso",
    progresso: 61,
    empreiteiro: "Pintor Joaquim",
    empreiteiroId: "tec-pintor-joaquim",
    contactoEmpreiteiro: "joaquim.pintor@gmail.com · 96 333 22 11",
    fotos: [],
    notas: "",
    createdAt: "2026-05-10",
  },
  // ── Obra de demonstração COMPLETA (Parte 7): orçamento profundo à portuguesa ──
  // Subtotal 12.512 € (diretos 12.332 + seguro RC 180) · IVA 6% ARU 751 € ·
  // contingência 15% 1.877 € → orçamento total ≈ 15.140 € (recalculado dos blocos).
  {
    id: "o-principe-2",
    divisao: "cozinha",
    projectId: "principe-real",
    titulo: "Cozinha nova",
    categoria: "cozinha",
    orcamento: 15140,
    gasto: 0,
    dataInicio: "2026-06-15",
    dataFimPrevista: "2026-08-15",
    estado: "em_curso",
    progresso: 25,
    empreiteiro: "Cozinhas Modernas Lx",
    empreiteiroId: "tec-cozinhas-lx",
    fotos: [],
    notas: "Adjudicação assinada — demolição concluída, canalização a começar.",
    createdAt: "2026-06-01",
    maoDeObra: [
      { id: "mo-c1", especialidade: "demolicao", modalidade: "empreitada_fechada", valorFechado: 800, empreiteiroId: "tec-cozinhas-lx" },
      { id: "mo-c2", especialidade: "pichelaria", modalidade: "empreitada_fechada", valorFechado: 1800, empreiteiroId: "tec-cozinhas-lx" },
      { id: "mo-c3", especialidade: "eletricidade", modalidade: "empreitada_fechada", valorFechado: 1500, empreiteiroId: "tec-cozinhas-lx" },
      { id: "mo-c4", especialidade: "alvenaria", modalidade: "empreitada_fechada", valorFechado: 1200, empreiteiroId: "tec-cozinhas-lx" },
      { id: "mo-c5", especialidade: "carpintaria", modalidade: "empreitada_fechada", valorFechado: 3400, empreiteiroId: "tec-cozinhas-lx" },
      { id: "mo-c6", especialidade: "pintura", modalidade: "empreitada_fechada", valorFechado: 700, empreiteiroId: "tec-cozinhas-lx" },
    ],
    materiais: [
      { id: "mat-c1", descricao: "Azulejo", quantidade: 25, unidade: "m2", precoUnitario: 28, fornecedor: "Love Tiles", dataPrecoAtualizado: seedEmDias(-12) },
      { id: "mat-c2", descricao: "Tinta", quantidade: 6, unidade: "l", precoUnitario: 42, fornecedor: "Robbialac", dataPrecoAtualizado: seedEmDias(-12) },
      { id: "mat-c3", descricao: "Loiça sanitária", quantidade: 1, unidade: "un", precoUnitario: 480, fornecedor: "Roca", dataPrecoAtualizado: seedEmDias(-12) },
      { id: "mat-c4", descricao: "Torneira", quantidade: 1, unidade: "un", precoUnitario: 180, fornecedor: "Roca", dataPrecoAtualizado: seedEmDias(-12) },
      { id: "mat-c5", descricao: "Bancada", quantidade: 1, unidade: "un", precoUnitario: 950, fornecedor: "Cozinhas Modernas Lx", dataPrecoAtualizado: seedEmDias(-12) },
    ],
    equipamentos: [
      { id: "eq-c1", tipo: "contentor_rcd", descricao: "Contentor de entulho", custo: 280, dias: 5 },
      { id: "eq-c2", tipo: "taxa_vazadouro", custo: 90 },
    ],
    licenciamento: { tipo: "nao_aplicavel" },
    seguros: { rcContratado: true, rcSeguradora: "Fidelidade", rcCusto: 180, atVerificado: true },
    iva: { justificacao: "aru" },
    contingencia: { percentagem: 15 },
    contrato: { assinado: true, alvaraVerificadoIMPIC: true },
    tarefas: [
      { id: "t-c1", titulo: "Escolher azulejos", feito: true, dataFeito: "2026-06-18", feitoPor: "pedro-alves", criadoEm: "2026-06-10" },
      { id: "t-c2", titulo: "Confirmar medidas da bancada", feito: true, dataFeito: "2026-06-20", feitoPor: "pedro-alves", criadoEm: "2026-06-10" },
      { id: "t-c3", titulo: "Marcar entrega dos móveis", feito: true, dataFeito: "2026-07-02", feitoPor: "pedro-alves", criadoEm: "2026-06-10" },
      { id: "t-c4", titulo: "Escolher eletrodomésticos", feito: false, criadoEm: "2026-06-10" },
      { id: "t-c5", titulo: "Ligar ao picheleiro para agendar", feito: false, criadoEm: "2026-06-25" },
      { id: "t-c6", titulo: "Escolher iluminação do teto", feito: false, criadoEm: "2026-07-01" },
    ],
    diario: [
      { id: "di-c1", data: "2026-06-14T18:30:00.000Z", tipo: "antes", autorId: "pedro-alves", texto: "Cozinha antiga antes da demolição.", fotos: [IMG_OBRA("1556909212-d5b604d0c90d")] },
      { id: "di-c2", data: "2026-06-18T17:00:00.000Z", tipo: "durante", autorId: "pedro-alves", texto: "Demolição concluída em 3 dias. Entulho no contentor.", fotos: [IMG_OBRA("1581858726788-75bc0f6a952d")] },
      { id: "di-c3", data: "2026-06-26T16:20:00.000Z", tipo: "durante", autorId: CURRENT_USER_ID, texto: "Passei na obra — tubagem nova a entrar. Bom ritmo.", fotos: [IMG_OBRA("1504307651254-35680f356dfd")] },
      { id: "di-c4", data: "2026-07-08T15:45:00.000Z", tipo: "durante", autorId: "pedro-alves", texto: "Paredes fechadas e eletricidade pronta para os móveis.", fotos: [IMG_OBRA("1503387762-592deb58ef4e")] },
    ],
  },
  {
    id: "o-principe-3",
    divisao: "wc",
    projectId: "principe-real",
    titulo: "Casa de banho completa",
    categoria: "wc",
    orcamento: 3500,
    gasto: 3700,
    dataInicio: "2026-04-01",
    dataFimPrevista: "2026-05-05",
    dataFimReal: "2026-05-05",
    estado: "concluida",
    progresso: 100,
    empreiteiro: "Hidro Lisboa",
    empreiteiroId: "tec-hidro-lisboa",
    notaCausa: "Troca de loiças",
    avaliacaoTecnico: 4,
    fotos: [],
    notas: "Excedeu orçamento em 200€ por troca de loiças.",
    createdAt: "2026-04-01",
  },

  // T3 COIMBRA — imóvel solo
  {
    id: "o-coimbra-1",
    divisao: "casa_toda",
    propertyId: "seed-coimbra",
    titulo: "Remodelação total",
    categoria: "geral",
    orcamento: 35000,
    gasto: 12000,
    dataInicio: "2026-05-01",
    dataFimPrevista: "2026-08-01",
    estado: "em_curso",
    progresso: 35,
    empreiteiro: "Reabilita Coimbra",
    contactoEmpreiteiro: "info@reabilita-coimbra.pt",
    fotos: [],
    notas: "Obra integral — coordenada por empreiteiro geral.",
    createdAt: "2026-05-01",
  },

  // T2 ARROIOS — imóvel solo
  {
    id: "o-arroios-pintura",
    divisao: "casa_toda",
    propertyId: "seed-arroios",
    titulo: "Pintura geral",
    categoria: "pintura",
    orcamento: 1800,
    gasto: 1650,
    dataInicio: "2024-04-20",
    dataFimPrevista: "2024-04-30",
    dataFimReal: "2024-04-29",
    estado: "concluida",
    progresso: 100,
    empreiteiro: "Pintor Joaquim",
    fotos: [],
    notas: "Pintura completa antes da entrada da inquilina.",
    createdAt: "2024-04-20",
  },
  {
    id: "o-arroios-1",
    divisao: "sala",
    propertyId: "seed-arroios",
    titulo: "Pavimento flutuante quartos e sala",
    categoria: "geral",
    orcamento: 3200,
    gasto: 1800,
    dataInicio: "2026-05-15",
    dataFimPrevista: "2026-06-15",
    estado: "em_curso",
    progresso: 55,
    fotos: [],
    notas: "",
    createdAt: "2026-05-15",
  },
  {
    id: "o-arroios-2",
    divisao: "casa_toda",
    propertyId: "seed-arroios",
    titulo: "Estores elétricos",
    categoria: "geral",
    orcamento: 1800,
    gasto: 540,
    dataInicio: "2026-06-10",
    dataFimPrevista: "2026-07-15",
    estado: "pausada",
    progresso: 30,
    fotos: [],
    notas: "Em pausa — à espera de stock do fornecedor.",
    createdAt: "2026-06-15",
  },
] as Obra[]).map(withMembers);

const SEED_FASES: Fase[] = [
  // Cozinha nova do Príncipe Real — 4 fases sugeridas
  { id: "f1", obraId: "o-principe-2", titulo: "Demolição cozinha existente", dataInicio: "2026-06-15", dataFim: "2026-06-22", progresso: 100, custoEstimado: 800, ordem: 1 },
  { id: "f2", obraId: "o-principe-2", titulo: "Canalização nova", dataInicio: "2026-06-22", dataFim: "2026-07-05", progresso: 0, custoEstimado: 1800, ordem: 2 },
  { id: "f3", obraId: "o-principe-2", titulo: "Eletricidade & iluminação", dataInicio: "2026-07-05", dataFim: "2026-07-15", progresso: 0, custoEstimado: 1500, ordem: 3 },
  { id: "f4", obraId: "o-principe-2", titulo: "Mobiliário & bancada", dataInicio: "2026-07-15", dataFim: "2026-08-15", progresso: 0, custoEstimado: 7900, ordem: 4 },

  // Pintura Príncipe Real
  { id: "f5", obraId: "o-principe-1", titulo: "Preparação paredes", dataInicio: "2026-05-10", dataFim: "2026-05-20", progresso: 100, custoEstimado: 1200, ordem: 1 },
  { id: "f6", obraId: "o-principe-1", titulo: "Tetos", dataInicio: "2026-05-20", dataFim: "2026-06-01", progresso: 80, custoEstimado: 1400, ordem: 2 },
  { id: "f7", obraId: "o-principe-1", titulo: "Paredes", dataInicio: "2026-06-01", dataFim: "2026-06-20", progresso: 30, custoEstimado: 1900, ordem: 3 },

  // Remodelação Coimbra — 3 fases
  { id: "f8", obraId: "o-coimbra-1", titulo: "Demolições", dataInicio: "2026-05-01", dataFim: "2026-05-20", progresso: 100, custoEstimado: 4000, ordem: 1 },
  { id: "f9", obraId: "o-coimbra-1", titulo: "Especialidades (águas/luz)", dataInicio: "2026-05-15", dataFim: "2026-06-30", progresso: 50, custoEstimado: 11000, ordem: 2 },
  { id: "f10", obraId: "o-coimbra-1", titulo: "Acabamentos finais", dataInicio: "2026-07-01", dataFim: "2026-08-01", progresso: 0, custoEstimado: 20000, ordem: 3 },
];

const SEED_DESPESAS: Despesa[] = [
  // PINTURA PRÍNCIPE REAL (#003) — acima do orçamento + 1 decisão a aguardar voto
  // Material tinta comprovado (com fatura) + Mão de obra POR COMPROVAR → transparência baixa
  {
    id: "d1",
    obraId: "o-principe-1",
    faseId: "f5",
    descricao: "Massa + lixar paredes",
    valor: 1200,
    data: "2026-05-18",
    fornecedor: "AKI",
    nif: "503000000",
    registadoPor: "pedro-alves",
    registadoEm: "2026-05-18T14:00:00.000Z",
    comprovativos: [
      {
        id: "cp-d1",
        documentId: "seed-doc-fatura-massa",
        tipo: "fatura",
        nomeFicheiro: "Fatura AKI 18-05.pdf",
        valorNoComprovativo: 1200,
        addedBy: "pedro-alves",
        addedAt: "2026-05-18T14:05:00.000Z",
      },
    ],
  },
  {
    id: "d2",
    obraId: "o-principe-1",
    faseId: "f6",
    descricao: "Tinta tetos (20L) brancura plus",
    valor: 800,
    data: "2026-05-25",
    fornecedor: "Robbialac",
    nif: "501122334",
    registadoPor: "pedro-alves",
    registadoEm: "2026-05-25T10:30:00.000Z",
    comprovativos: [
      {
        id: "cp-d2",
        documentId: "seed-doc-fatura-tinta-tetos",
        tipo: "fatura",
        nomeFicheiro: "Fatura Robbialac 25-05.pdf",
        valorNoComprovativo: 800,
        addedBy: "pedro-alves",
        addedAt: "2026-05-25T10:35:00.000Z",
      },
    ],
    fotos: [
      "https://images.unsplash.com/photo-1591628001888-76bf6747c8d3?auto=format&fit=crop&w=800&q=70",
    ],
  },
  // Mão de obra de pintura — SEM COMPROVATIVO (por_comprovar) e CONTESTADA pela Rita → âmbar
  {
    id: "d3",
    obraId: "o-principe-1",
    faseId: "f7",
    descricao: "Mão de obra pintura — semana 22",
    valor: 1300,
    data: "2026-06-03",
    fornecedor: "Pintor Joaquim",
    registadoPor: "pedro-alves",
    registadoEm: "2026-06-03T18:00:00.000Z",
    // sem comprovativos → por_comprovar
    confirmacoes: [
      {
        userId: "rita-santos",
        valor: "contesta",
        comentario: "Sem fatura não consigo confirmar — pedi o documento ao Joaquim.",
        ts: "2026-07-14T12:00:00.000Z",
      },
    ],
  },
  {
    id: "d-estuque",
    obraId: "o-principe-1",
    faseId: "f7",
    descricao: "Estuque e reparação de tetos (imprevisto)",
    valor: 1750,
    data: "2026-06-08",
    fornecedor: "Estuques Lx",
    registadoPor: "pedro-alves",
    aprovacao: {
      estado: "aplicado",
      requeridoPor: "pedro-alves",
      requeridoEm: "2026-06-06",
      decididoEm: "2026-06-08",
      votos: [
        { userId: CURRENT_USER_ID, valor: "a_favor", ts: "2026-06-07T09:10:00" },
        { userId: "rita-santos", valor: "a_favor", ts: "2026-06-08T11:30:00" },
      ],
    },
  },
  // Acima do threshold → a aguardar votos: Rita já votou a favor, FALTA O VOTO DO DANIEL.
  {
    id: "d-tinta",
    obraId: "o-principe-1",
    faseId: "f7",
    descricao: "Tinta especial premium (Farrow & Ball)",
    valor: 1500,
    data: "2026-07-12",
    fornecedor: "Farrow & Ball",
    registadoPor: "pedro-alves",
    registadoEm: "2026-07-12T09:00:00.000Z",
    aprovacao: {
      estado: "pendente",
      requeridoPor: "pedro-alves",
      requeridoEm: "2026-07-12",
      prazoVoto: "2026-07-22",
      votos: [{ userId: "rita-santos", valor: "a_favor", ts: "2026-07-13T08:00:00" }],
    },
  },
  // Abaixo do threshold → aplicado logo, sócios só foram notificados.
  {
    id: "d-material",
    obraId: "o-principe-1",
    faseId: "f7",
    descricao: "Material de pintura (rolos, fitas, lonas)",
    valor: 300,
    data: "2026-07-06",
    fornecedor: "AKI",
    nif: "503000000",
    registadoPor: "pedro-alves",
    registadoEm: "2026-07-06T10:00:00.000Z",
    comprovativos: [
      {
        id: "cp-d-material",
        documentId: "seed-doc-fatura-material",
        tipo: "fatura",
        nomeFicheiro: "Fatura AKI 06-07.pdf",
        valorNoComprovativo: 300,
        addedBy: "pedro-alves",
        addedAt: "2026-07-06T10:05:00.000Z",
      },
    ],
  },

  // CASA DE BANHO (#003) — totalmente comprovada, confirmada por 3/3 sócios
  {
    id: "d4",
    obraId: "o-principe-3",
    descricao: "Loiças sanitárias completas",
    valor: 1900,
    data: "2026-04-12",
    fornecedor: "Roca Lisboa",
    nif: "503456789",
    registadoPor: "pedro-alves",
    registadoEm: "2026-04-12T11:00:00.000Z",
    comprovativos: [
      {
        id: "cp-d4",
        documentId: "seed-doc-fatura-roca",
        tipo: "fatura",
        nomeFicheiro: "Fatura Roca 12-04.pdf",
        valorNoComprovativo: 1900,
        addedBy: "pedro-alves",
        addedAt: "2026-04-12T11:05:00.000Z",
      },
    ],
    fotos: [
      "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=800&q=70",
      "https://images.unsplash.com/photo-1564540583246-934409427776?auto=format&fit=crop&w=800&q=70",
      "https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=800&q=70",
    ],
    confirmacoes: [
      { userId: CURRENT_USER_ID, valor: "confirma", ts: "2026-04-13T09:00:00.000Z" },
      { userId: "rita-santos", valor: "confirma", ts: "2026-04-13T15:20:00.000Z" },
    ],
  },
  {
    id: "d5",
    obraId: "o-principe-3",
    descricao: "Torneiras Hansgrohe",
    valor: 950,
    data: "2026-04-18",
    fornecedor: "Roca Lisboa",
    nif: "503456789",
    registadoPor: "pedro-alves",
    registadoEm: "2026-04-18T16:00:00.000Z",
    comprovativos: [
      {
        id: "cp-d5",
        documentId: "seed-doc-fatura-hansgrohe",
        tipo: "fatura",
        nomeFicheiro: "Fatura Hansgrohe 18-04.pdf",
        valorNoComprovativo: 950,
        addedBy: "pedro-alves",
        addedAt: "2026-04-18T16:05:00.000Z",
      },
    ],
    confirmacoes: [
      { userId: CURRENT_USER_ID, valor: "confirma", ts: "2026-04-19T10:00:00.000Z" },
      { userId: "rita-santos", valor: "confirma", ts: "2026-04-19T11:00:00.000Z" },
    ],
  },
  {
    id: "d6",
    obraId: "o-principe-3",
    descricao: "Mão-de-obra WC",
    valor: 850,
    data: "2026-05-05",
    fornecedor: "Hidro Lisboa",
    nif: "504777111",
    registadoPor: "pedro-alves",
    registadoEm: "2026-05-05T17:30:00.000Z",
    comprovativos: [
      {
        id: "cp-d6",
        documentId: "seed-doc-recibo-hidro",
        tipo: "recibo",
        nomeFicheiro: "Recibo Hidro 05-05.pdf",
        valorNoComprovativo: 850,
        addedBy: "pedro-alves",
        addedAt: "2026-05-05T17:35:00.000Z",
      },
    ],
    confirmacoes: [
      { userId: CURRENT_USER_ID, valor: "confirma", ts: "2026-05-06T09:00:00.000Z" },
      { userId: "rita-santos", valor: "confirma", ts: "2026-05-06T13:00:00.000Z" },
    ],
  },

  // COZINHA NOVA (#003) — despesas com fatura + 1 por comprovar (Parte 7)
  {
    id: "d-coz-demolicao",
    obraId: "o-principe-2",
    faseId: "f1",
    descricao: "Demolição da cozinha existente",
    valor: 800,
    data: "2026-06-18",
    fornecedor: "Cozinhas Modernas Lx",
    nif: "509888777",
    registadoPor: "pedro-alves",
    registadoEm: "2026-06-18T17:30:00.000Z",
    comprovativos: [
      {
        id: "cp-coz-1",
        documentId: "seed-doc-fatura-demolicao",
        tipo: "fatura",
        nomeFicheiro: "Fatura Cozinhas Modernas 18-06.pdf",
        valorNoComprovativo: 800,
        addedBy: "pedro-alves",
        addedAt: "2026-06-18T17:35:00.000Z",
      },
    ],
    confirmacoes: [{ userId: CURRENT_USER_ID, valor: "confirma", ts: "2026-06-19T09:00:00.000Z" }],
  },
  {
    id: "d-coz-tubagem",
    obraId: "o-principe-2",
    faseId: "f2",
    descricao: "Materiais de canalização (adiantamento)",
    valor: 350,
    data: "2026-06-26",
    fornecedor: "Cozinhas Modernas Lx",
    registadoPor: "pedro-alves",
    registadoEm: "2026-06-26T18:00:00.000Z",
    // sem comprovativos → por_comprovar
  },

  // REABILITAÇÃO TOTAL (Porto) — honorários com fatura
  {
    id: "d-reab-arq",
    obraId: "o-porto-reab",
    descricao: "Honorários arquitetura — adjudicação",
    valor: 1600,
    data: "2026-07-02",
    fornecedor: "Atelier Soares",
    nif: "507333222",
    registadoPor: CURRENT_USER_ID,
    registadoEm: "2026-07-02T11:00:00.000Z",
    comprovativos: [
      {
        id: "cp-reab-1",
        documentId: "seed-doc-fatura-arq",
        tipo: "fatura",
        nomeFicheiro: "Fatura Atelier Soares 02-07.pdf",
        valorNoComprovativo: 1600,
        addedBy: CURRENT_USER_ID,
        addedAt: "2026-07-02T11:05:00.000Z",
      },
    ],
  },

  { id: "d7", obraId: "o-porto-2", descricao: "Substituição prumadas (extra)", valor: 1500, data: "2026-05-10", fornecedor: "Hidroplan Porto", registadoPor: CURRENT_USER_ID },
  { id: "d8", obraId: "o-porto-2", descricao: "Tubagem PEX kit", valor: 4200, data: "2026-04-22", fornecedor: "Hidroplan Porto", registadoPor: CURRENT_USER_ID },
  { id: "d9", obraId: "o-porto-2", descricao: "Mão-de-obra fase 1", valor: 3800, data: "2026-05-25", fornecedor: "Hidroplan Porto", registadoPor: CURRENT_USER_ID },

  // REFORÇO ESTRUTURAL PORTO (#001) — custo extra aprovado por @Pedro e @Rita
  { id: "d-estr-1", obraId: "o-porto-3", descricao: "Mão-de-obra reforço estrutural", valor: 2700, data: "2026-05-20", fornecedor: "Constru Forte Lda.", registadoPor: CURRENT_USER_ID },
  // Submetido pelo DANIEL (gestor no Porto) — Pedro já votou, falta a Rita → vista "A pedir aos sócios".
  {
    id: "d-caixilharia",
    obraId: "o-porto-3",
    descricao: "Caixilharia acústica (vidro duplo)",
    valor: 2600,
    data: "2026-07-10",
    fornecedor: "Constru Forte Lda.",
    registadoPor: CURRENT_USER_ID,
    registadoEm: "2026-07-10T09:30:00.000Z",
    aprovacao: {
      estado: "pendente",
      requeridoPor: CURRENT_USER_ID,
      requeridoEm: "2026-07-10",
      prazoVoto: "2026-07-20",
      votos: [{ userId: "pedro-alves", valor: "a_favor", ts: "2026-07-11T08:00:00" }],
    },
  },
  {
    id: "d-estr-2",
    obraId: "o-porto-3",
    descricao: "Escoramento adicional (imprevisto)",
    valor: 1800,
    data: "2026-06-02",
    fornecedor: "Constru Forte Lda.",
    registadoPor: CURRENT_USER_ID,
    aprovacao: {
      estado: "aplicado",
      requeridoPor: CURRENT_USER_ID,
      requeridoEm: "2026-05-31",
      decididoEm: "2026-06-02",
      votos: [
        { userId: "pedro-alves", valor: "a_favor", ts: "2026-06-01T10:00:00" },
        { userId: "rita-santos", valor: "a_favor", ts: "2026-06-02T14:20:00" },
      ],
    },
  },

  { id: "d10", obraId: "o-coimbra-1", faseId: "f8", descricao: "Aluguer contentor + demolição", valor: 4000, data: "2026-05-19", fornecedor: "Reabilita Coimbra", registadoPor: CURRENT_USER_ID },
  { id: "d11", obraId: "o-coimbra-1", faseId: "f9", descricao: "Adiantamento canalização", valor: 5000, data: "2026-05-30", fornecedor: "Reabilita Coimbra", registadoPor: CURRENT_USER_ID },
  { id: "d12", obraId: "o-coimbra-1", faseId: "f9", descricao: "Material elétrico", valor: 3000, data: "2026-06-10", fornecedor: "Schneider PT", registadoPor: CURRENT_USER_ID },
];

const SEED_MARCOS: Marco[] = [
  {
    id: "m1",
    obraId: "o-principe-2",
    titulo: "Adjudicação cozinha (30%)",
    valor: 3600,
    dataPrevista: "2026-06-01",
    dataPago: "2026-06-01",
    estado: "pago",
    empreiteiro: "Cozinhas Modernas Lx",
    registadoPor: "pedro-alves",
    pagoPor: "pedro-alves",
    comprovativoPagamento: {
      id: "cp-m1",
      documentId: "seed-doc-transf-cozinha",
      tipo: "comprovativo_pagamento",
      nomeFicheiro: "Transferência CGD 01-06.pdf",
      valorNoComprovativo: 3600,
      addedBy: "pedro-alves",
      addedAt: "2026-06-01T18:00:00.000Z",
    },
  },
  // Acima do threshold → precisa do voto dos sócios antes de poder ser pago (falta o Daniel e a Rita).
  {
    id: "m2",
    obraId: "o-principe-2",
    titulo: "A meio da obra (40%)",
    valor: 4800,
    dataPrevista: "2026-07-20",
    estado: "pendente",
    empreiteiro: "Cozinhas Modernas Lx",
    registadoPor: "pedro-alves",
    aprovacao: {
      estado: "pendente",
      requeridoPor: "pedro-alves",
      requeridoEm: "2026-07-13",
      prazoVoto: "2026-07-19",
      votos: [],
    },
  },
  { id: "m3", obraId: "o-principe-2", titulo: "Conclusão (30%)", valor: 3600, dataPrevista: "2026-08-15", estado: "pendente", empreiteiro: "Cozinhas Modernas Lx", registadoPor: "pedro-alves" },

  {
    id: "m4",
    obraId: "o-porto-2",
    titulo: "Adjudicação canalização",
    valor: 2400,
    dataPrevista: "2026-04-15",
    dataPago: "2026-04-15",
    estado: "pago",
    empreiteiro: "Hidroplan Porto",
    registadoPor: CURRENT_USER_ID,
    pagoPor: CURRENT_USER_ID,
    comprovativoPagamento: {
      id: "cp-m4",
      documentId: "seed-doc-transf-canalizacao",
      tipo: "comprovativo_pagamento",
      nomeFicheiro: "Transferência Millennium 15-04.pdf",
      valorNoComprovativo: 2400,
      addedBy: CURRENT_USER_ID,
      addedAt: "2026-04-15T18:00:00.000Z",
    },
  },
  { id: "m5", obraId: "o-porto-2", titulo: "Meio (50%)", valor: 4000, dataPrevista: "2026-05-15", dataPago: "2026-05-20", estado: "pago", empreiteiro: "Hidroplan Porto", registadoPor: CURRENT_USER_ID, pagoPor: CURRENT_USER_ID },
  { id: "m6", obraId: "o-porto-2", titulo: "Final + reforço prumadas", valor: 3100, dataPrevista: "2026-05-30", estado: "atrasado", empreiteiro: "Hidroplan Porto", registadoPor: CURRENT_USER_ID },

  { id: "m7", obraId: "o-coimbra-1", titulo: "Avanço inicial 30%", valor: 10500, dataPrevista: "2026-05-01", dataPago: "2026-05-02", estado: "pago", empreiteiro: "Reabilita Coimbra", registadoPor: CURRENT_USER_ID, pagoPor: CURRENT_USER_ID },
  { id: "m8", obraId: "o-coimbra-1", titulo: "A meio da obra 40%", valor: 14000, dataPrevista: "2026-06-20", estado: "pendente", empreiteiro: "Reabilita Coimbra", registadoPor: CURRENT_USER_ID },
  { id: "m9", obraId: "o-coimbra-1", titulo: "Final 30%", valor: 10500, dataPrevista: "2026-08-01", estado: "pendente", empreiteiro: "Reabilita Coimbra", registadoPor: CURRENT_USER_ID },

  // Marcos da pintura (#003) e do pavimento (Arroios) — diamantes espalhados
  { id: "m-pint-1", obraId: "o-principe-1", titulo: "Adjudicação pintura (50%)", valor: 1500, dataPrevista: "2026-05-12", dataPago: "2026-05-12", estado: "pago", empreiteiro: "Pintor Joaquim", registadoPor: "pedro-alves", pagoPor: "pedro-alves" },
  { id: "m-pint-2", obraId: "o-principe-1", titulo: "Final pintura (50%)", valor: 1500, dataPrevista: "2026-07-10", estado: "pendente", empreiteiro: "Pintor Joaquim", registadoPor: "pedro-alves" },
  { id: "m-pav-1", obraId: "o-arroios-1", titulo: "Material + adjudicação", valor: 1200, dataPrevista: "2026-05-22", dataPago: "2026-05-22", estado: "pago", empreiteiro: "—", registadoPor: CURRENT_USER_ID, pagoPor: CURRENT_USER_ID },
];

const SEED_LOGS: LogEntry[] = [
  { id: "l1", obraId: "o-porto-2", ts: "2026-04-15", texto: "Obra criada." },
  { id: "l2", obraId: "o-porto-2", ts: "2026-04-22", texto: "Despesa: Tubagem PEX kit (4.200 €)." },
  { id: "l3", obraId: "o-porto-2", ts: "2026-05-10", texto: "Despesa: substituição prumadas (1.500 €) — extra ao orçamento." },
  { id: "l4", obraId: "o-coimbra-1", ts: "2026-05-01", texto: "Obra criada." },
  { id: "l5", obraId: "o-coimbra-1", ts: "2026-05-02", texto: "Marco pago: Avanço inicial 30% (10.500 €)." },
];

// ───────────────────── Helpers (derivações) ─────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function diffDays(aISO: string, bISO: string): number {
  const a = new Date(`${aISO}T00:00:00`).getTime();
  const b = new Date(`${bISO}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

/** Uma despesa só CONTA no gasto quando não está pendente/rejeitada em votação. */
export function despesaAplicada(d: Despesa): boolean {
  return d.aprovacao?.estado !== "pendente" && d.aprovacao?.estado !== "rejeitado";
}

export function gastoReal(obra: Obra, despesas: Despesa[]): number {
  const ds = despesas.filter((d) => d.obraId === obra.id);
  if (ds.length === 0) return obra.gasto;
  return ds.filter(despesaAplicada).reduce((s, d) => s + d.valor, 0);
}

export function progressoReal(obra: Obra, fases: Fase[]): number {
  const fs = fases.filter((f) => f.obraId === obra.id);
  if (fs.length > 0) return Math.round(fs.reduce((s, f) => s + f.progresso, 0) / fs.length);
  // Sem fases: % de tarefas feitas (checklist), se existirem.
  const ts = obra.tarefas ?? [];
  if (ts.length > 0) return Math.round((ts.filter((t) => t.feito).length / ts.length) * 100);
  return obra.progresso;
}

export function custoRealFase(faseId: string, despesas: Despesa[]): number {
  return despesas.filter((d) => d.faseId === faseId && despesaAplicada(d)).reduce((s, d) => s + d.valor, 0);
}

/** Linear: orcamento × (dias_decorridos / dias_totais). */
export function gastoPrevistoAteHoje(obra: Obra): number {
  const total = diffDays(obra.dataInicio, obra.dataFimPrevista);
  if (total <= 0) return obra.orcamento;
  const decorridos = Math.max(0, Math.min(total, diffDays(obra.dataInicio, todayISO())));
  return Math.round(obra.orcamento * (decorridos / total));
}

export function diasRestantes(obra: Obra): number {
  return diffDays(todayISO(), obra.dataFimPrevista);
}

export function estaAtrasada(obra: Obra): boolean {
  if (obra.estado === "concluida") return false;
  return diffDays(todayISO(), obra.dataFimPrevista) < 0;
}

export type EstadoOrcamento = "verde" | "ambar" | "vermelho";

export function estadoOrcamento(obra: Obra, despesas: Despesa[]): EstadoOrcamento {
  const g = gastoReal(obra, despesas);
  const ratio = obra.orcamento > 0 ? (g / obra.orcamento) * 100 : 0;
  if (ratio > 100) return "vermelho";
  if (ratio >= 85) return "ambar";
  return "verde";
}

export type EstadoRitmo = "no_prazo" | "a_abrandar" | "atrasada";

export function estadoRitmo(obra: Obra, fases: Fase[]): EstadoRitmo {
  if (estaAtrasada(obra)) return "atrasada";
  const total = diffDays(obra.dataInicio, obra.dataFimPrevista);
  if (total <= 0) return "no_prazo";
  const decorridos = Math.max(0, Math.min(total, diffDays(obra.dataInicio, todayISO())));
  const pctTempo = (decorridos / total) * 100;
  const prog = progressoReal(obra, fases);
  if (prog + 10 < pctTempo) return "a_abrandar";
  return "no_prazo";
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Tempo relativo curto em PT: "há 2h", "há 3 dias", "agora". */
export function relativaTempo(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  if (d < 30) return `há ${d} ${d === 1 ? "dia" : "dias"}`;
  const meses = Math.round(d / 30);
  return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

// ── Co-gestão: membros, papéis, permissões ──

export function membrosDe(obra: Obra): ObraMember[] {
  return obra.members ?? [];
}

/** Obra partilhada (tem sócios) vs solo (só o senhorio). */
export function temCoGestao(obra: Obra): boolean {
  return membrosDe(obra).length > 0;
}

export function roleDe(obra: Obra, userId: string): ObraRole | undefined {
  const real = membrosDe(obra).find((m) => m.userId === userId)?.role;
  if (!real) return undefined; // não é membro → nunca impõe papel
  // "Ver como": pré-visualização do papel do utilizador atual.
  return papelOverride(userId) ?? real;
}

/** Pode gerir = gestor da obra, OU obra solo (sem co-gestão). */
export function podeGerir(obra: Obra, userId: string): boolean {
  if (!temCoGestao(obra)) return true;
  const ov = papelOverride(userId);
  if (ov && membrosDe(obra).some((m) => m.userId === userId)) return ov === "gestor";
  return roleDe(obra, userId) === "gestor";
}

export function investidoresDe(obra: Obra): ObraMember[] {
  return membrosDe(obra).filter((m) => m.role === "investidor");
}

/** Threshold de aprovação (€). Default = 5% do orçamento. */
export function thresholdDe(obra: Obra): number {
  return obra.thresholdAprovacao ?? Math.round(obra.orcamento * 0.05);
}

/** Uma despesa/marco precisa de voto dos sócios? */
export function requerAprovacao(obra: Obra, valor: number): boolean {
  return investidoresDe(obra).length > 0 && valor > thresholdDe(obra);
}

// ── Votação ──

export interface VotosResumo {
  total: number;
  favor: number;
  contra: number;
  pendentes: number;
}

export function votosResumo(obra: Obra, ap?: Aprovacao): VotosResumo {
  const total = investidoresDe(obra).length;
  const favor = ap ? ap.votos.filter((v) => v.valor === "a_favor").length : 0;
  const contra = ap ? ap.votos.filter((v) => v.valor === "contra").length : 0;
  return { total, favor, contra, pendentes: Math.max(0, total - favor - contra) };
}

/** Resolve o estado de uma aprovação segundo a regra de votação da obra. */
export function resolverAprovacao(obra: Obra, ap: Aprovacao): AprovacaoEstado {
  const { total, favor, contra } = votosResumo(obra, ap);
  if (total === 0) return "aplicado";
  const regra = obra.regraVotacao ?? "maioria_simples";
  if (regra === "unanimidade") {
    if (contra > 0) return "rejeitado";
    return favor === total ? "aplicado" : "pendente";
  }
  const maioria = Math.floor(total / 2) + 1;
  if (favor >= maioria) return "aplicado";
  if (contra >= maioria) return "rejeitado";
  return "pendente";
}

// ── Índice de saúde da obra ──

export type Saude = "saudavel" | "atencao" | "risco" | "parada";

export const SAUDE_LABEL: Record<Saude, string> = {
  saudavel: "Saudável",
  atencao: "Atenção",
  risco: "Em risco",
  parada: "Parada",
};

export const SAUDE_HEX: Record<Saude, string> = {
  saudavel: "#4A7C59",
  atencao: "#C17E2A",
  risco: "#9B3A2A",
  parada: "#6B4C3B",
};

export interface SaudeObra {
  saude: Saude;
  score: number; // 0–100 (maior = melhor)
  problema?: string; // problema-chave, se houver
}

/** Sub-índice de ORÇAMENTO (0–100): dentro=100 · até +5%=55 · +5% a +15%=35 · >+15%=15. */
export function saudeOrcamentoScore(obra: Obra, despesas: Despesa[]): number {
  const gasto = gastoReal(obra, despesas);
  if (obra.orcamento <= 0) return gasto > 0 ? 15 : 100;
  const over = (gasto - obra.orcamento) / obra.orcamento;
  if (over <= 0) return 100;
  if (over <= 0.05) return 55;
  if (over <= 0.15) return 35;
  return 15;
}

/** Sub-índice de PRAZO (0–100): no prazo=100 · atraso até 15% do tempo=60 · >15%=25. */
export function saudePrazoScore(obra: Obra): number {
  const total = diffDays(obra.dataInicio, obra.dataFimPrevista);
  const fimReferencia = obra.estado === "concluida" ? (obra.dataFimReal ?? obra.dataFimPrevista) : todayISO();
  const atrasoDias = diffDays(obra.dataFimPrevista, fimReferencia);
  if (atrasoDias <= 0) return 100; // terminou/está dentro do prazo
  const pctAtraso = total > 0 ? atrasoDias / total : 1;
  if (pctAtraso <= 0.15) return 60;
  return 25;
}

/**
 * Saúde da obra = 50% dinheiro + 50% prazo (nunca só progresso).
 * ≥80 Saudável (verde) · 50–79 Atenção (âmbar) · <50 Em risco (vermelho).
 * REGRA DURA: com o orçamento estourado, o sub-índice de dinheiro ≤55
 * ⇒ o índice final nunca chega a 80 nem fica verde.
 */
export function saudeObra(
  obra: Obra,
  _fases: Fase[],
  despesas: Despesa[],
  marcos: Marco[]
): SaudeObra {
  if (obra.estado === "pausada") return { saude: "parada", score: 25, problema: "Obra parada" };

  const sOrc = saudeOrcamentoScore(obra, despesas);
  const sPrazo = saudePrazoScore(obra);
  const score = Math.round(sOrc * 0.5 + sPrazo * 0.5);

  const saude: Saude = score >= 80 ? "saudavel" : score >= 50 ? "atencao" : "risco";

  // O problema-chave: aquilo que puxou o índice para baixo.
  let problema: string | undefined;
  const gasto = gastoReal(obra, despesas);
  const marcoVencido =
    obra.estado !== "concluida" &&
    marcos.some((m) => m.obraId === obra.id && m.estado !== "pago" && m.dataPrevista < todayISO());
  if (sOrc < 100 && gasto > obra.orcamento) {
    const overPct = obra.orcamento > 0 ? Math.round(((gasto - obra.orcamento) / obra.orcamento) * 100) : 100;
    problema = `${overPct}% acima do orçamento`;
  } else if (sPrazo < 100) {
    problema = obra.estado === "concluida" ? "Terminou fora do prazo" : "Prazo ultrapassado";
  } else if (marcoVencido) {
    problema = "Marco de pagamento vencido";
  }
  return { saude, score, problema };
}

/**
 * Custo total das obras de um projeto (para o lucro do flip):
 * por obra, o MAIOR entre orçamento e gasto real — se já derrapou, conta a
 * derrapagem; se ainda não gastou, conta o orçamento previsto.
 */
export function custoObrasProjeto(projectId: string, obras: Obra[], despesas: Despesa[]): number {
  return obras
    .filter((o) => o.projectId === projectId)
    .reduce((s, o) => s + Math.max(o.orcamento, gastoReal(o, despesas)), 0);
}

// ── Estado humano de um conjunto de obras (capa da casa / cartão da divisão) ──

export type EstadoHumano = "tudo_em_dia" | "atraso" | "atencao" | "concluidas" | "nao_comecou";

/** Rótulos para a capa da CASA (nível 1) — semáforo de 3 cores, frase humana. */
export const ESTADO_HUMANO_CASA: Record<EstadoHumano, string> = {
  tudo_em_dia: "Tudo a correr bem",
  atraso: "Precisa de atenção",
  atencao: "Há problemas",
  concluidas: "Obras concluídas",
  nao_comecou: "Ainda não começou",
};

/** Rótulos curtos para o cartão da DIVISÃO (nível 2). */
export const ESTADO_HUMANO_DIVISAO: Record<EstadoHumano, string> = {
  tudo_em_dia: "A correr bem",
  atraso: "Precisa de atenção",
  atencao: "Há problemas",
  concluidas: "Pronta",
  nao_comecou: "Por começar",
};

export const ESTADO_HUMANO_HEX: Record<EstadoHumano, string> = {
  tudo_em_dia: "#4A7C59",
  atraso: "#C17E2A",
  atencao: "#9B3A2A",
  concluidas: "#4A7C59",
  nao_comecou: "#6B4C3B",
};

/**
 * Estado em linguagem humana de um conjunto de obras (nunca números crus):
 * concluídas > não começou > precisa de atenção (risco/marco vencido) >
 * vai com atraso (atrasada/a abrandar/pausada) > tudo em dia.
 */
export function estadoHumanoObras(
  obras: Obra[],
  fases: Fase[],
  despesas: Despesa[],
  marcos: Marco[]
): EstadoHumano {
  if (obras.length === 0) return "nao_comecou";
  if (obras.every((o) => o.estado === "concluida")) return "concluidas";
  if (obras.every((o) => o.estado === "por_iniciar")) return "nao_comecou";
  const ativas = obras.filter((o) => o.estado !== "concluida");
  const algumaRisco = ativas.some((o) => saudeObra(o, fases, despesas, marcos).saude === "risco");
  if (algumaRisco) return "atencao";
  const algumaAtrasada = ativas.some(
    (o) => o.estado === "pausada" || estaAtrasada(o) || estadoRitmo(o, fases) !== "no_prazo"
  );
  if (algumaAtrasada) return "atraso";
  return "tudo_em_dia";
}

// ───────────────────── Helpers de prova (transparência) ─────────────────────

/** Estado de prova derivado. Pode ser sobrescrito pelo campo manual. */
export function estadoProvaDe(d: Despesa): EstadoProva {
  if (d.estadoProva) return d.estadoProva;
  return (d.comprovativos?.length ?? 0) > 0 ? "comprovada" : "por_comprovar";
}

export function gastoComprovado(obra: Obra, despesas: Despesa[]): number {
  return despesas
    .filter((d) => d.obraId === obra.id && despesaAplicada(d) && estadoProvaDe(d) === "comprovada")
    .reduce((s, d) => s + d.valor, 0);
}

export function gastoNaoComprovado(obra: Obra, despesas: Despesa[]): number {
  const total = despesas.filter((d) => d.obraId === obra.id && despesaAplicada(d)).reduce((s, d) => s + d.valor, 0);
  return Math.max(0, total - gastoComprovado(obra, despesas));
}

export function pctTransparencia(obra: Obra, despesas: Despesa[]): number {
  const totalDoObra = despesas.filter((d) => d.obraId === obra.id && despesaAplicada(d)).reduce((s, d) => s + d.valor, 0);
  if (totalDoObra <= 0) return 100;
  return Math.round((gastoComprovado(obra, despesas) / totalDoObra) * 100);
}

export type ToneTransparencia = "verde" | "ambar" | "vermelho";
export const TRANSP_HEX: Record<ToneTransparencia, string> = {
  verde: "#4A7C59",
  ambar: "#C17E2A",
  vermelho: "#9B3A2A",
};
export const TRANSP_LABEL: Record<ToneTransparencia, string> = {
  verde: "Alta",
  ambar: "A melhorar",
  vermelho: "Baixa",
};

export function toneTransparencia(pct: number): ToneTransparencia {
  if (pct >= 90) return "verde";
  if (pct >= 70) return "ambar";
  return "vermelho";
}

/** Data efetiva de registo de uma despesa (para "há N dias"). */
export function dataRegistoDespesa(d: Despesa): string {
  return (d.registadoEm ?? `${d.data}T09:00:00`).slice(0, 10);
}

/** Há quantos dias a despesa foi registada. */
export function diasDesdeRegisto(d: Despesa): number {
  return Math.max(0, diffDays(dataRegistoDespesa(d), todayISO()));
}

/**
 * Despesas por comprovar (aplicadas, sem comprovativo) — o coração da vista
 * "Por comprovar". Ordena por antiguidade (mais antigas primeiro). Exclui as
 * que ainda estão em votação (não aplicadas).
 */
export function listaPorComprovar(despesas: Despesa[]): Despesa[] {
  return despesas
    .filter((d) => despesaAplicada(d) && estadoProvaDe(d) === "por_comprovar")
    .sort((a, b) => (dataRegistoDespesa(a) < dataRegistoDespesa(b) ? -1 : 1));
}

/** Total (€) por comprovar num conjunto de despesas. */
export function totalPorComprovar(despesas: Despesa[]): number {
  return listaPorComprovar(despesas).reduce((s, d) => s + d.valor, 0);
}

/** Quantos sócios investidores confirmaram esta despesa (não conta o registador). */
export function confirmacoesDespesa(
  obra: Obra,
  d: Despesa
): { confirmadosBy: string[]; contestadosBy: string[]; totalInvestidores: number } {
  const investidores = investidoresDe(obra).map((m) => m.userId);
  const cs = d.confirmacoes ?? [];
  return {
    confirmadosBy: cs.filter((c) => c.valor === "confirma" && investidores.includes(c.userId)).map((c) => c.userId),
    contestadosBy: cs.filter((c) => c.valor === "contesta" && investidores.includes(c.userId)).map((c) => c.userId),
    totalInvestidores: investidores.length,
  };
}

// ───────────────────── Store ─────────────────────

interface ObrasState {
  obras: Obra[];
  fases: Fase[];
  despesas: Despesa[];
  marcos: Marco[];
  logs: LogEntry[];
  sugestoes: SugestaoFase[];

  // Sugestões (sócio investidor → gestor)
  sugerirFase: (obraId: string, titulo: string, autorId: string) => string;
  /** Sócio investidor propõe um gasto — o gestor decide se o regista. */
  sugerirGasto: (obraId: string, titulo: string, valor: number, autorId: string) => string;
  resolverSugestao: (id: string, estado: "aceite" | "rejeitada") => void;

  // CRUD obras
  addObra: (input: ObraInput) => string;
  updateObra: (id: string, patch: Partial<Obra>) => void;
  removeObra: (id: string) => void;
  togglePausada: (id: string) => void;
  marcarConcluida: (id: string) => void;

  // CRUD fases
  addFase: (input: Omit<Fase, "id">) => string;
  updateFase: (id: string, patch: Partial<Fase>) => void;
  removeFase: (id: string) => void;
  reorderFases: (obraId: string, orderedIds: string[]) => void;

  // CRUD despesas
  addDespesa: (input: Omit<Despesa, "id">) => string;
  /** Regista despesa pelo autor; se exceder o threshold, entra em votação. */
  registarDespesa: (input: Omit<Despesa, "id" | "registadoPor" | "aprovacao">, autorId: string) => string;
  updateDespesa: (id: string, patch: Partial<Despesa>) => void;
  removeDespesa: (id: string) => void;
  /** Anexa um comprovativo (fatura/recibo) a uma despesa já existente. */
  adicionarComprovativo: (despesaId: string, c: Omit<Comprovativo, "id" | "addedAt">) => void;
  removerComprovativo: (despesaId: string, comprovativoId: string) => void;
  /** Sócio investidor confirma ou contesta uma despesa. */
  confirmarDespesa: (despesaId: string, userId: string, valor: "confirma" | "contesta", comentario?: string) => void;
  removerConfirmacaoDespesa: (despesaId: string, userId: string) => void;

  // CRUD marcos
  addMarco: (input: Omit<Marco, "id">) => string;
  /** Cria marco pelo autor; se exceder o threshold, entra em votação. */
  registarMarco: (input: Omit<Marco, "id" | "registadoPor" | "aprovacao">, autorId: string) => string;
  updateMarco: (id: string, patch: Partial<Marco>) => void;
  /** Versão antiga (legado) — usa pagarMarcoComProva para impor o comprovativo. */
  pagarMarco: (id: string, pagoPor?: string) => void;
  /** Marca o marco como pago obrigando a um comprovativo de transferência/recibo. */
  pagarMarcoComProva: (
    marcoId: string,
    comprovativo: Omit<Comprovativo, "id" | "addedAt">,
    autorId: string
  ) => void;
  removeMarco: (id: string) => void;

  // Votação (co-gestão)
  votar: (tipo: "despesa" | "marco", id: string, userId: string, valor: VotoValor) => AprovacaoEstado;

  // Selectores
  getObra: (id: string) => Obra | undefined;
  byProject: (projectId: string) => Obra[];
  byProperty: (propertyId: string) => Obra[];
  fasesDe: (obraId: string) => Fase[];
  despesasDe: (obraId: string) => Despesa[];
  marcosDe: (obraId: string) => Marco[];
  logsDe: (obraId: string) => LogEntry[];

  // Notas/fotos
  setNotas: (obraId: string, notas: string) => void;
  addFoto: (obraId: string, url: string) => void;
  removeFoto: (obraId: string, idx: number) => void;

  // Orçamento detalhado — merges e recalcula obra.orcamento quando há blocos
  updateDetalhe: (obraId: string, patch: Partial<Obra>) => void;

  // Tarefas (checklist simples)
  addTarefa: (obraId: string, titulo: string) => void;
  toggleTarefa: (obraId: string, tarefaId: string, userId: string) => void;
  removeTarefa: (obraId: string, tarefaId: string) => void;

  // Diário (fotos + notas com etiqueta)
  addDiario: (obraId: string, entry: Omit<DiarioEntry, "id">) => void;
  removeDiario: (obraId: string, entryId: string) => void;

  // Avisos legais + contactos da obra
  dispensarAviso: (obraId: string, avisoId: string) => void;
  addContactoObra: (obraId: string, technicianId: string) => void;
  removeContactoObra: (obraId: string, technicianId: string) => void;

  resetSeed: () => void;
}

function uid(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function appendLog(s: ObrasState, obraId: string, texto: string): LogEntry[] {
  return [
    { id: uid("l"), obraId, ts: todayISO(), texto },
    ...s.logs,
  ];
}

export const useObrasStore = create<ObrasState>()(
  persist(
    (set, get) => ({
      obras: SEED_OBRAS,
      fases: SEED_FASES,
      despesas: SEED_DESPESAS,
      marcos: SEED_MARCOS,
      logs: SEED_LOGS,
      sugestoes: [],

      sugerirFase: (obraId, titulo, autorId) => {
        const id = uid("sug");
        set((s) => ({
          sugestoes: [
            { id, obraId, titulo: titulo.trim(), autorId, ts: new Date().toISOString(), estado: "pendente", tipo: "passo" as const },
            ...s.sugestoes,
          ],
          logs: appendLog(s, obraId, `Sugestão de passo enviada ao gestor: "${titulo.trim()}".`),
        }));
        return id;
      },
      sugerirGasto: (obraId, titulo, valor, autorId) => {
        const id = uid("sug");
        set((s) => ({
          sugestoes: [
            { id, obraId, titulo: titulo.trim(), autorId, ts: new Date().toISOString(), estado: "pendente", tipo: "gasto" as const, valor },
            ...s.sugestoes,
          ],
          logs: appendLog(s, obraId, `Gasto proposto ao gestor: "${titulo.trim()}" (${valor.toLocaleString("pt-PT")} €).`),
        }));
        return id;
      },
      resolverSugestao: (id, estado) =>
        set((s) => {
          const sug = s.sugestoes.find((x) => x.id === id);
          return {
            sugestoes: s.sugestoes.map((x) => (x.id === id ? { ...x, estado } : x)),
            logs: sug
              ? appendLog(s, sug.obraId, estado === "aceite" ? `Sugestão aceite: "${sug.titulo}".` : `Sugestão rejeitada: "${sug.titulo}".`)
              : s.logs,
          };
        }),

      addObra: (input) => {
        const id = uid("o");
        const obra: Obra = {
          ...input,
          id,
          createdAt: todayISO(),
          fotos: input.fotos ?? [],
          notas: input.notas ?? "",
        };
        set((s) => ({
          obras: [obra, ...s.obras],
          logs: appendLog(s, id, `Obra criada: ${obra.titulo}.`),
        }));
        return id;
      },
      updateObra: (id, patch) =>
        set((s) => ({
          obras: s.obras.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),
      removeObra: (id) =>
        set((s) => ({
          obras: s.obras.filter((o) => o.id !== id),
          fases: s.fases.filter((f) => f.obraId !== id),
          despesas: s.despesas.filter((d) => d.obraId !== id),
          marcos: s.marcos.filter((m) => m.obraId !== id),
          logs: s.logs.filter((l) => l.obraId !== id),
        })),
      togglePausada: (id) =>
        set((s) => {
          const obra = s.obras.find((o) => o.id === id);
          if (!obra) return s;
          const novoEstado: ObraEstado = obra.estado === "pausada" ? "em_curso" : "pausada";
          return {
            obras: s.obras.map((o) => (o.id === id ? { ...o, estado: novoEstado } : o)),
            logs: appendLog(s, id, novoEstado === "pausada" ? "Obra pausada." : "Obra retomada."),
          };
        }),
      marcarConcluida: (id) =>
        set((s) => ({
          obras: s.obras.map((o) =>
            o.id === id
              ? { ...o, estado: "concluida" as ObraEstado, progresso: 100, dataFimReal: todayISO() }
              : o
          ),
          logs: appendLog(s, id, "Obra marcada como concluída."),
        })),

      addFase: (input) => {
        const id = uid("f");
        set((s) => ({
          fases: [...s.fases, { ...input, id }],
          logs: appendLog(s, input.obraId, `Fase adicionada: ${input.titulo}.`),
        }));
        return id;
      },
      updateFase: (id, patch) =>
        set((s) => {
          const old = s.fases.find((f) => f.id === id);
          const fases = s.fases.map((f) => (f.id === id ? { ...f, ...patch } : f));
          const logs =
            old && patch.progresso === 100 && old.progresso !== 100
              ? appendLog(s, old.obraId, `Fase concluída: ${old.titulo}.`)
              : s.logs;
          return { fases, logs };
        }),
      removeFase: (id) =>
        set((s) => ({
          fases: s.fases.filter((f) => f.id !== id),
        })),
      reorderFases: (obraId, orderedIds) =>
        set((s) => ({
          fases: s.fases.map((f) =>
            f.obraId === obraId
              ? { ...f, ordem: Math.max(1, orderedIds.indexOf(f.id) + 1) }
              : f
          ),
        })),

      addDespesa: (input) => {
        const id = uid("d");
        set((s) => ({
          despesas: [{ ...input, id }, ...s.despesas],
          logs: appendLog(s, input.obraId, `Despesa adicionada: ${input.descricao} (${input.valor.toLocaleString("pt-PT")} €).`),
        }));
        return id;
      },
      registarDespesa: (input, autorId) => {
        const id = uid("d");
        const obra = get().obras.find((o) => o.id === input.obraId);
        const requer = obra ? requerAprovacao(obra, input.valor) : false;
        const aprovacao: Aprovacao | undefined = requer
          ? {
              estado: "pendente",
              requeridoPor: autorId,
              requeridoEm: todayISO(),
              prazoVoto: addDaysISO(todayISO(), 5),
              votos: [],
            }
          : undefined;
        const registadoEm = new Date().toISOString();
        set((s) => ({
          despesas: [{ ...input, id, registadoPor: autorId, registadoEm, aprovacao }, ...s.despesas],
          logs: appendLog(
            s,
            input.obraId,
            requer
              ? `Despesa a aguardar aprovação: ${input.descricao} (${input.valor.toLocaleString("pt-PT")} €).`
              : `Despesa registada: ${input.descricao} (${input.valor.toLocaleString("pt-PT")} €).`
          ),
        }));
        return id;
      },
      adicionarComprovativo: (despesaId, c) =>
        set((s) => {
          const d = s.despesas.find((x) => x.id === despesaId);
          if (!d) return s;
          const comprovativo: Comprovativo = { ...c, id: uid("cp"), addedAt: new Date().toISOString() };
          const lista = [...(d.comprovativos ?? []), comprovativo];
          return {
            despesas: s.despesas.map((x) =>
              x.id === despesaId ? { ...x, comprovativos: lista, estadoProva: undefined } : x
            ),
            logs: appendLog(s, d.obraId, `Comprovativo (${PROVA_TIPO_LABEL[c.tipo]}) anexado a "${d.descricao}".`),
          };
        }),
      removerComprovativo: (despesaId, comprovativoId) =>
        set((s) => ({
          despesas: s.despesas.map((d) =>
            d.id === despesaId
              ? { ...d, comprovativos: (d.comprovativos ?? []).filter((c) => c.id !== comprovativoId) }
              : d
          ),
        })),
      confirmarDespesa: (despesaId, userId, valor, comentario) =>
        set((s) => {
          const d = s.despesas.find((x) => x.id === despesaId);
          if (!d) return s;
          const semMeu = (d.confirmacoes ?? []).filter((c) => c.userId !== userId);
          const lista: ConfirmacaoDespesa[] = [
            ...semMeu,
            { userId, valor, comentario, ts: new Date().toISOString() },
          ];
          return {
            despesas: s.despesas.map((x) => (x.id === despesaId ? { ...x, confirmacoes: lista } : x)),
            logs: appendLog(s, d.obraId, valor === "confirma" ? `Despesa confirmada por sócio: "${d.descricao}".` : `Despesa contestada por sócio: "${d.descricao}".`),
          };
        }),
      removerConfirmacaoDespesa: (despesaId, userId) =>
        set((s) => ({
          despesas: s.despesas.map((d) =>
            d.id === despesaId ? { ...d, confirmacoes: (d.confirmacoes ?? []).filter((c) => c.userId !== userId) } : d
          ),
        })),
      updateDespesa: (id, patch) =>
        set((s) => ({
          despesas: s.despesas.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      removeDespesa: (id) =>
        set((s) => ({
          despesas: s.despesas.filter((d) => d.id !== id),
        })),

      addMarco: (input) => {
        const id = uid("m");
        set((s) => ({
          marcos: [...s.marcos, { ...input, id }],
          logs: appendLog(s, input.obraId, `Marco criado: ${input.titulo}.`),
        }));
        return id;
      },
      registarMarco: (input, autorId) => {
        const id = uid("m");
        const obra = get().obras.find((o) => o.id === input.obraId);
        const requer = obra ? requerAprovacao(obra, input.valor) : false;
        const aprovacao: Aprovacao | undefined = requer
          ? {
              estado: "pendente",
              requeridoPor: autorId,
              requeridoEm: todayISO(),
              prazoVoto: addDaysISO(todayISO(), 5),
              votos: [],
            }
          : undefined;
        set((s) => ({
          marcos: [...s.marcos, { ...input, id, registadoPor: autorId, aprovacao }],
          logs: appendLog(
            s,
            input.obraId,
            requer
              ? `Marco a aguardar aprovação: ${input.titulo} (${input.valor.toLocaleString("pt-PT")} €).`
              : `Marco criado: ${input.titulo}.`
          ),
        }));
        return id;
      },
      updateMarco: (id, patch) =>
        set((s) => ({
          marcos: s.marcos.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      pagarMarco: (id, pagoPor) =>
        set((s) => {
          const marco = s.marcos.find((m) => m.id === id);
          if (!marco) return s;
          return {
            marcos: s.marcos.map((m) =>
              m.id === id
                ? { ...m, estado: "pago" as MarcoEstado, dataPago: todayISO(), pagoPor: pagoPor ?? m.pagoPor }
                : m
            ),
            logs: appendLog(s, marco.obraId, `Marco pago: ${marco.titulo} (${marco.valor.toLocaleString("pt-PT")} €).`),
          };
        }),
      pagarMarcoComProva: (id, comprovativoIn, autorId) =>
        set((s) => {
          const marco = s.marcos.find((m) => m.id === id);
          if (!marco) return s;
          const comprovativoPagamento: Comprovativo = {
            ...comprovativoIn,
            id: uid("cp"),
            addedAt: new Date().toISOString(),
          };
          return {
            marcos: s.marcos.map((m) =>
              m.id === id
                ? {
                    ...m,
                    estado: "pago" as MarcoEstado,
                    dataPago: todayISO(),
                    pagoPor: autorId,
                    comprovativoPagamento,
                  }
                : m
            ),
            logs: appendLog(
              s,
              marco.obraId,
              `Marco pago com comprovativo: ${marco.titulo} (${marco.valor.toLocaleString("pt-PT")} €).`
            ),
          };
        }),
      removeMarco: (id) =>
        set((s) => ({
          marcos: s.marcos.filter((m) => m.id !== id),
        })),

      votar: (tipo, id, userId, valor) => {
        let estadoFinal: AprovacaoEstado = "pendente";
        set((s) => {
          const aplicarVoto = (obra: Obra | undefined, ap: Aprovacao): Aprovacao => {
            const votos = [
              ...ap.votos.filter((v) => v.userId !== userId),
              { userId, valor, ts: new Date().toISOString() },
            ];
            const next: Aprovacao = { ...ap, votos };
            const estado = obra ? resolverAprovacao(obra, next) : "pendente";
            estadoFinal = estado;
            return { ...next, estado, decididoEm: estado !== "pendente" ? todayISO() : undefined };
          };
          if (tipo === "despesa") {
            const d = s.despesas.find((x) => x.id === id);
            if (!d?.aprovacao) return s;
            const obra = s.obras.find((o) => o.id === d.obraId);
            const aprovacao = aplicarVoto(obra, d.aprovacao);
            return {
              despesas: s.despesas.map((x) => (x.id === id ? { ...x, aprovacao } : x)),
              logs: appendLog(s, d.obraId, `Voto ${valor === "a_favor" ? "a favor" : "contra"}: ${d.descricao}.`),
            };
          }
          const m = s.marcos.find((x) => x.id === id);
          if (!m?.aprovacao) return s;
          const obra = s.obras.find((o) => o.id === m.obraId);
          const aprovacao = aplicarVoto(obra, m.aprovacao);
          return {
            marcos: s.marcos.map((x) => (x.id === id ? { ...x, aprovacao } : x)),
            logs: appendLog(s, m.obraId, `Voto ${valor === "a_favor" ? "a favor" : "contra"}: ${m.titulo}.`),
          };
        });
        return estadoFinal;
      },

      getObra: (id) => get().obras.find((o) => o.id === id),
      byProject: (projectId) => get().obras.filter((o) => o.projectId === projectId),
      byProperty: (propertyId) => get().obras.filter((o) => o.propertyId === propertyId),
      fasesDe: (obraId) =>
        get().fases.filter((f) => f.obraId === obraId).sort((a, b) => a.ordem - b.ordem),
      despesasDe: (obraId) =>
        get().despesas.filter((d) => d.obraId === obraId).sort((a, b) => (a.data < b.data ? 1 : -1)),
      marcosDe: (obraId) =>
        get().marcos.filter((m) => m.obraId === obraId).sort((a, b) => (a.dataPrevista < b.dataPrevista ? -1 : 1)),
      logsDe: (obraId) =>
        get().logs.filter((l) => l.obraId === obraId).sort((a, b) => (a.ts < b.ts ? 1 : -1)),

      setNotas: (obraId, notas) =>
        set((s) => ({
          obras: s.obras.map((o) => (o.id === obraId ? { ...o, notas } : o)),
        })),
      addFoto: (obraId, url) =>
        set((s) => ({
          obras: s.obras.map((o) =>
            o.id === obraId ? { ...o, fotos: [...o.fotos, url] } : o
          ),
        })),
      removeFoto: (obraId, idx) =>
        set((s) => ({
          obras: s.obras.map((o) =>
            o.id === obraId
              ? { ...o, fotos: o.fotos.filter((_, i) => i !== idx) }
              : o
          ),
        })),

      updateDetalhe: (obraId, patch) =>
        set((s) => ({
          obras: s.obras.map((o) => {
            if (o.id !== obraId) return o;
            const next = { ...o, ...patch };
            // Se há blocos detalhados, o orçamento simples passa a ser o total calculado.
            const t = totaisObra(next, s.despesas);
            return t.temDetalhe ? { ...next, orcamento: Math.round(t.orcamentoTotal) } : next;
          }),
        })),

      addTarefa: (obraId, titulo) =>
        set((s) => ({
          obras: s.obras.map((o) =>
            o.id === obraId
              ? { ...o, tarefas: [...(o.tarefas ?? []), { id: uid("t"), titulo: titulo.trim(), feito: false, criadoEm: todayISO() }] }
              : o
          ),
        })),
      toggleTarefa: (obraId, tarefaId, userId) =>
        set((s) => {
          const obra = s.obras.find((o) => o.id === obraId);
          const tarefa = obra?.tarefas?.find((t) => t.id === tarefaId);
          return {
            obras: s.obras.map((o) =>
              o.id === obraId
                ? {
                    ...o,
                    tarefas: (o.tarefas ?? []).map((t) =>
                      t.id === tarefaId
                        ? t.feito
                          ? { ...t, feito: false, dataFeito: undefined, feitoPor: undefined }
                          : { ...t, feito: true, dataFeito: todayISO(), feitoPor: userId }
                        : t
                    ),
                  }
                : o
            ),
            logs: tarefa && !tarefa.feito ? appendLog(s, obraId, `Tarefa concluída: ${tarefa.titulo}.`) : s.logs,
          };
        }),
      removeTarefa: (obraId, tarefaId) =>
        set((s) => ({
          obras: s.obras.map((o) =>
            o.id === obraId ? { ...o, tarefas: (o.tarefas ?? []).filter((t) => t.id !== tarefaId) } : o
          ),
        })),

      addDiario: (obraId, entry) =>
        set((s) => ({
          obras: s.obras.map((o) =>
            o.id === obraId ? { ...o, diario: [{ ...entry, id: uid("di") }, ...(o.diario ?? [])] } : o
          ),
          logs: appendLog(s, obraId, `Registo no diário da obra (${DIARIO_TIPO_LABEL[entry.tipo]}).`),
        })),
      removeDiario: (obraId, entryId) =>
        set((s) => ({
          obras: s.obras.map((o) =>
            o.id === obraId ? { ...o, diario: (o.diario ?? []).filter((e) => e.id !== entryId) } : o
          ),
        })),

      dispensarAviso: (obraId, avisoId) =>
        set((s) => ({
          obras: s.obras.map((o) =>
            o.id === obraId
              ? { ...o, avisosDispensados: [...new Set([...(o.avisosDispensados ?? []), avisoId])] }
              : o
          ),
        })),
      addContactoObra: (obraId, technicianId) =>
        set((s) => ({
          obras: s.obras.map((o) =>
            o.id === obraId
              ? { ...o, contactosIds: [...new Set([...(o.contactosIds ?? []), technicianId])] }
              : o
          ),
        })),
      removeContactoObra: (obraId, technicianId) =>
        set((s) => ({
          obras: s.obras.map((o) =>
            o.id === obraId
              ? { ...o, contactosIds: (o.contactosIds ?? []).filter((id) => id !== technicianId) }
              : o
          ),
        })),

      resetSeed: () =>
        set({
          obras: SEED_OBRAS,
          fases: SEED_FASES,
          despesas: SEED_DESPESAS,
          marcos: SEED_MARCOS,
          logs: SEED_LOGS,
          sugestoes: [],
        }),
    }),
    {
      name: "redegest-obras",
      version: 11,
      // v4: co-gestão. v5/v6: obra parada + marcos espalhados. v7: comprovativos + confirmações.
      // v8: divisão da casa. v9: empreiteiroId + notaCausa + sugestões + saúde 50/50.
      // v10: camada de papéis — d-tinta aguarda o voto do Daniel, m2 em votação, gasto contestado, proposta do Daniel no Porto.
      // v11: orçamento detalhado à portuguesa (mão de obra/materiais/licenças/IVA/contingência/contrato),
      //      tarefas + diário, Cozinha nova completa e Reabilitação total (avisos legais).
      // Re-semeia os exemplos mantendo obras/itens criados pelo utilizador.
      migrate: (persisted: unknown, version: number) => {
        const s = (persisted ?? {}) as {
          obras?: Obra[];
          fases?: Fase[];
          despesas?: Despesa[];
          marcos?: Marco[];
          logs?: LogEntry[];
          sugestoes?: SugestaoFase[];
        };
        s.sugestoes = s.sugestoes ?? [];
        if (version < 11) {
          const seedObraIds = new Set(SEED_OBRAS.map((o) => o.id));
          const seedFaseIds = new Set(SEED_FASES.map((f) => f.id));
          const seedDespIds = new Set(SEED_DESPESAS.map((d) => d.id));
          const seedMarcoIds = new Set(SEED_MARCOS.map((m) => m.id));
          const seedLogIds = new Set(SEED_LOGS.map((l) => l.id));
          s.obras = [...SEED_OBRAS, ...(s.obras ?? []).filter((o) => !seedObraIds.has(o.id))];
          s.fases = [...SEED_FASES, ...(s.fases ?? []).filter((f) => !seedFaseIds.has(f.id))];
          s.despesas = [...SEED_DESPESAS, ...(s.despesas ?? []).filter((d) => !seedDespIds.has(d.id))];
          s.marcos = [...SEED_MARCOS, ...(s.marcos ?? []).filter((m) => !seedMarcoIds.has(m.id))];
          s.logs = [...SEED_LOGS, ...(s.logs ?? []).filter((l) => !seedLogIds.has(l.id))];
        }
        return s as ObrasState;
      },
    }
  )
);

// ───────────────────── Aliases de compatibilidade ─────────────────────
// Componentes antigos importam .add e .obras / .nome etc. Mantemos atalhos.

/** Acesso simples para selectores .nome / .filter (legado). */
export type ObraLegado = Obra & { nome: string };
