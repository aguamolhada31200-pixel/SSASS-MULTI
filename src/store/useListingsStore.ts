import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CURRENT_USER_ID } from "./useProfilesStore";
import type { TipoImovel } from "./usePropertiesStore";
export { TIPO_IMOVEL_LABEL, type TipoImovel } from "./usePropertiesStore";

export type ListingType = "reabilitacao" | "cedencia" | "arrendamento";
export type EstadoAnuncio = "ativo" | "financiado" | "concluido";
export type Tipologia = "T0" | "T1" | "T2" | "T3" | "T4" | "T5+";
export type EstadoImovel = "a recuperar" | "bom" | "renovado" | "novo";
export type EnergyCert = "A+" | "A" | "B" | "B-" | "C" | "D" | "E" | "F";
export type MotivoCedencia = "falta_capital" | "falta_tempo" | "mudanca_estrategia" | "outro";
export type Visibility = "public" | "verified";
export type ContactPreference = "mensagem" | "email" | "telefone";
export type TipoCedencia = "cpcv" | "projeto_aprovado" | "licenca" | "obra_iniciada";

/** Foto de anúncio com legenda opcional (ex.: Sala, Cozinha). */
export interface ListingPhoto {
  url: string;
  legenda?: string;
}

/** Aceita string[] (formato antigo) ou ListingPhoto[] e devolve sempre ListingPhoto[]. */
export function normalizeListingPhotos(raw: unknown): ListingPhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) =>
    typeof p === "string" ? { url: p, legenda: undefined } : (p as ListingPhoto)
  );
}

export interface Listing {
  // ── Comum ──
  id: string;
  authorId: string;
  type: ListingType;
  title: string;
  description: string;
  district: string;
  city: string;
  exactAddress: string;
  tipologia: Tipologia;
  tipoImovel?: TipoImovel;
  areaUtil: number;
  estado: EstadoImovel;
  coverImageUrl: string;
  galleryUrls: ListingPhoto[];
  floorPlanUrl?: string;
  energyCertificate: EnergyCert;
  estadoAnuncio: EstadoAnuncio;
  status: "active" | "paused" | "closed";
  viewsCount: number;
  contactsCount: number;
  savedCount: number;
  contactPreference: ContactPreference;
  visibility: Visibility;
  createdAt: string;

  // ── Reabilitação ──
  valorImovel?: number;           // Valor do imóvel (CPCV)
  orcamentoObras?: number;        // Orçamento das obras previstas
  imt?: number;                   // (legado) IMT — usado se `impostos` não estiver preenchido
  escritura?: number;             // (legado) IS + registo — usado se `impostos` não estiver preenchido
  outrosCustos?: number;          // Outros custos do projeto (advogado, comissões, etc.)
  valorMercadoAtual?: number;     // Valor de mercado atual (sem obras) — reabilitação
  valorVendaPrevisto?: number;    // (legado) — cai para valor de mercado pós-obras se este não existir
  rentabilidadePrevista?: number;
  capitalProcurado?: number;
  split?: string;
  tempoAteVenda?: string;

  // ── Cedência ──
  valorMercadoEstimado?: number;
  sinalPagoCedente?: number;
  valorNegociado?: number;
  valorCedencia?: number;
  temObra?: boolean;
  obras?: number;
  comissaoImobiliaria?: number;
  lucroEstimado?: number;
  prazoAteEscritura?: string;
  margemSeguranca?: string;
  motivoCedencia?: MotivoCedencia;
  // Cedência v2 — viabilidade do negócio
  tipoCedencia?: TipoCedencia;
  impostos?: number;          // IMT + IS + Registo
  custosLegais?: number;      // (legado v2) escritura + registo + advogado
  custosOperacionais?: number; // (legado v2) obras feitas + comissão imobiliária + outros
  capitalInvestido?: number;  // (legado v2) dinheiro do bolso do investidor
  // Cedência v3
  obra?: number;              // valor PREVISTO das obras (só quando estado = "a recuperar")
  terminoCpcv?: string;       // data YYYY-MM-DD do término do CPCV (substitui prazoAteEscritura)
  // Cedência v4 — cenário com obras (estado "a recuperar")
  valorMercadoPosObras?: number; // valor de mercado estimado após as obras
  prazoObras?: string;           // prazo estimado das obras (opcional, texto livre)

  // ── Arrendamento ──
  precoImovel?: number;
  capitalNecessario?: number;
  yieldLiquido?: number;
  rentabilidadeCapital?: number;
  rendaMensal?: number;
  roi?: number;
}

export type ListingInput = Omit<
  Listing,
  "id" | "viewsCount" | "contactsCount" | "savedCount" | "createdAt"
>;

export const TYPE_LABEL: Record<ListingType, string> = {
  reabilitacao: "Parceiros para Compra e Revenda",
  cedencia: "Parceiros para Cedência de Posição",
  arrendamento: "Oportunidades para Arrendamento (Buy e Hold)",
};

export const TYPE_LABEL_SHORT: Record<ListingType, string> = {
  reabilitacao: "Compra e Revenda",
  cedencia: "Cedência de Posição",
  arrendamento: "Arrendamento (Buy e Hold)",
};

export const ESTADO_ANUNCIO_LABEL: Record<EstadoAnuncio, string> = {
  ativo: "Ativo",
  financiado: "Financiado",
  concluido: "Concluído",
};

export const MOTIVO_LABEL: Record<MotivoCedencia, string> = {
  falta_capital: "Falta de capital",
  falta_tempo: "Falta de tempo",
  mudanca_estrategia: "Mudança de estratégia",
  outro: "Outro",
};

export const TIPO_CEDENCIA_LABEL: Record<TipoCedencia, string> = {
  cpcv: "Cedência apenas do CPCV",
  projeto_aprovado: "Cedência com projeto aprovado",
  licenca: "Cedência com licença",
  obra_iniciada: "Cedência com obra iniciada",
};

export const TIPO_CEDENCIA_LABEL_SHORT: Record<TipoCedencia, string> = {
  cpcv: "CPCV",
  projeto_aprovado: "Projeto aprovado",
  licenca: "Licença",
  obra_iniciada: "Em obras",
};

export const ENERGY_SCALE: EnergyCert[] = ["A+", "A", "B", "B-", "C", "D", "E", "F"];

const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1100&q=70`;

const RAW_SEED: Array<Omit<Listing, "galleryUrls"> & { galleryUrls: string[] }> = [
  {
    id: "reab-porto",
    authorId: "joao-pereira",
    type: "reabilitacao",
    title: "Compra e Revenda Baixa do Porto",
    description:
      "Apartamento T3 para compra e revenda na Baixa do Porto, a 5 minutos da Avenida dos Aliados. Projeto de arquitetura aprovado, licença de obras em curso. Procuro parceiro de capital para concluir a obra e vender com forte margem.",
    district: "Porto",
    city: "Porto",
    exactAddress: "Rua de Cedofeita 212, 2.º",
    tipoImovel: "apartamento",
    tipologia: "T3",
    areaUtil: 95,
    estado: "a recuperar",
    coverImageUrl: IMG("1502672260266-1c1ef2d93688"),
    galleryUrls: [IMG("1502672260266-1c1ef2d93688"), IMG("1560448204-e02f11c3d0e2"), IMG("1556909211-36987daf7b4d")],
    floorPlanUrl: IMG("1503387762-592deb58ef4e"),
    energyCertificate: "D",
    estadoAnuncio: "ativo",
    status: "active",
    viewsCount: 184,
    contactsCount: 7,
    savedCount: 21,
    contactPreference: "mensagem",
    visibility: "public",
    createdAt: "2026-05-30",
    valorImovel: 280000,
    valorNegociado: 20000,
    orcamentoObras: 60000,
    impostos: 5000,
    imt: 3500,
    escritura: 1500,
    outrosCustos: 2000,
    valorMercadoAtual: 320000,
    valorMercadoPosObras: 420000,
    valorVendaPrevisto: 420000,
    prazoObras: "8 meses",
    rentabilidadePrevista: 21.7,
    capitalProcurado: 95000,
    split: "50 / 50",
    tempoAteVenda: "14 meses",
  },
  // ─── CPCV ───
  {
    id: "ced-cpcv-arroios",
    authorId: "mariana-sousa",
    type: "cedencia",
    title: "Cedência CPCV T2 Arroios",
    description:
      "Cedo posição de CPCV de um T2 em Arroios, negociado abaixo do mercado. Escritura marcada para daqui a 3 meses. Cedo por falta de capital para a escritura — oportunidade limpa para quem tem liquidez imediata.",
    district: "Lisboa",
    city: "Lisboa",
    exactAddress: "Rua Pascoal de Melo 44, 3.º Esq.",
    tipoImovel: "apartamento",
    tipologia: "T2",
    areaUtil: 70,
    estado: "bom",
    coverImageUrl: IMG("1522708323590-d24dbb6b0267"),
    galleryUrls: [IMG("1522708323590-d24dbb6b0267"), IMG("1484154218962-a197022b5858"), IMG("1493809842364-78817add7ffb")],
    floorPlanUrl: IMG("1560448204-e02f11c3d0e2"),
    energyCertificate: "C",
    estadoAnuncio: "ativo",
    status: "active",
    viewsCount: 312,
    contactsCount: 14,
    savedCount: 47,
    contactPreference: "mensagem",
    visibility: "verified",
    createdAt: "2026-06-02",
    tipoCedencia: "cpcv",
    valorImovel: 210000,
    valorNegociado: 10000,
    sinalPagoCedente: 20000,
    valorCedencia: 25000,
    impostos: 8091,
    obra: 0,
    capitalNecessario: 33091,
    valorVendaPrevisto: 245000,
    lucroEstimado: 31909,
    terminoCpcv: "2026-09-02",
    margemSeguranca: "Alta",
    motivoCedencia: "falta_capital",
  },
  {
    id: "ced-cpcv-marvila",
    authorId: "rui-tavares",
    type: "cedencia",
    title: "Cedência CPCV T1 Marvila",
    description:
      "T1 negociado em Marvila com escritura em 2 meses. Posição limpa — sem obras nem projeto. Boa entrada para quem quer giro rápido em zona com forte valorização.",
    district: "Lisboa",
    city: "Lisboa",
    exactAddress: "Rua do Açúcar 28, 1.º",
    tipoImovel: "apartamento",
    tipologia: "T1",
    areaUtil: 52,
    estado: "bom",
    coverImageUrl: IMG("1484154218962-a197022b5858"),
    galleryUrls: [IMG("1484154218962-a197022b5858"), IMG("1493809842364-78817add7ffb")],
    floorPlanUrl: IMG("1556909211-36987daf7b4d"),
    energyCertificate: "C",
    estadoAnuncio: "ativo",
    status: "active",
    viewsCount: 198,
    contactsCount: 8,
    savedCount: 26,
    contactPreference: "mensagem",
    visibility: "public",
    createdAt: "2026-06-04",
    tipoCedencia: "cpcv",
    valorImovel: 158000,
    valorNegociado: 8000,
    sinalPagoCedente: 15000,
    valorCedencia: 18000,
    impostos: 4708,
    obra: 0,
    capitalNecessario: 22708,
    valorVendaPrevisto: 180000,
    lucroEstimado: 22292,
    terminoCpcv: "2026-08-04",
    margemSeguranca: "Média",
    motivoCedencia: "falta_capital",
  },
  // ─── PROJETO APROVADO ───
  {
    id: "ced-proj-cedofeita",
    authorId: "joao-pereira",
    type: "cedencia",
    title: "Cedência com projeto T3 Cedofeita Porto",
    description:
      "Cedo posição com projeto de arquitetura aprovado pela Câmara do Porto. T3 amplo a transformar em duas frações — projeto já com plantas finais e certificado energético previsto B.",
    district: "Porto",
    city: "Porto",
    exactAddress: "Rua de Cedofeita 198, 1.º",
    tipoImovel: "apartamento",
    tipologia: "T3",
    areaUtil: 110,
    estado: "a recuperar",
    coverImageUrl: IMG("1502672260266-1c1ef2d93688"),
    galleryUrls: [IMG("1502672260266-1c1ef2d93688"), IMG("1556909114-f6e7ad7d3136"), IMG("1556909211-36987daf7b4d")],
    floorPlanUrl: IMG("1503387762-592deb58ef4e"),
    energyCertificate: "D",
    estadoAnuncio: "ativo",
    status: "active",
    viewsCount: 264,
    contactsCount: 11,
    savedCount: 38,
    contactPreference: "mensagem",
    visibility: "verified",
    createdAt: "2026-05-28",
    tipoCedencia: "projeto_aprovado",
    valorImovel: 295000,
    valorNegociado: 15000,
    sinalPagoCedente: 28000,
    valorCedencia: 45000,
    impostos: 12698,
    obra: 0,
    capitalNecessario: 57698,
    valorVendaPrevisto: 360000,
    lucroEstimado: 50302,
    terminoCpcv: "2026-09-28",
    margemSeguranca: "Alta",
    motivoCedencia: "falta_tempo",
  },
  {
    id: "ced-proj-almada",
    authorId: "carlos-mendes",
    type: "cedencia",
    title: "Cedência com projeto Loja Almada",
    description:
      "Cedência de loja comercial em Almada, com projeto aprovado para mudança de uso (loja → habitação T1 + estúdio). Aprovação em Área de Reabilitação Urbana.",
    district: "Setúbal",
    city: "Almada",
    exactAddress: "Rua Cândido dos Reis 56, R/C",
    tipoImovel: "loja",
    tipologia: "T1",
    areaUtil: 80,
    estado: "a recuperar",
    coverImageUrl: IMG("1505691938895-1758d7feb511"),
    galleryUrls: [IMG("1505691938895-1758d7feb511"), IMG("1560448204-e02f11c3d0e2")],
    floorPlanUrl: IMG("1556909211-36987daf7b4d"),
    energyCertificate: "E",
    estadoAnuncio: "ativo",
    status: "active",
    viewsCount: 142,
    contactsCount: 5,
    savedCount: 17,
    contactPreference: "mensagem",
    visibility: "public",
    createdAt: "2026-05-22",
    tipoCedencia: "projeto_aprovado",
    valorImovel: 190000,
    valorNegociado: 10000,
    sinalPagoCedente: 18000,
    valorCedencia: 32000,
    impostos: 7440,
    obra: 0,
    capitalNecessario: 39440,
    valorVendaPrevisto: 230000,
    lucroEstimado: 28560,
    terminoCpcv: "2026-10-22",
    margemSeguranca: "Média",
    motivoCedencia: "mudanca_estrategia",
  },
  // ─── LICENÇA ───
  {
    id: "ced-lic-belem",
    authorId: "mariana-sousa",
    type: "cedencia",
    title: "Cedência com licença T2 Belém",
    description:
      "Cedência com licença de obras já emitida — pronto para arrancar imediatamente. T2 em zona nobre de Belém, com excelente liquidez de venda após renovação.",
    district: "Lisboa",
    city: "Lisboa",
    exactAddress: "Rua de Belém 142, 2.º",
    tipoImovel: "apartamento",
    tipologia: "T2",
    areaUtil: 88,
    estado: "a recuperar",
    coverImageUrl: IMG("1493809842364-78817add7ffb"),
    galleryUrls: [IMG("1493809842364-78817add7ffb"), IMG("1502005229762-cf1b2da7c5d6")],
    floorPlanUrl: IMG("1503387762-592deb58ef4e"),
    energyCertificate: "D",
    estadoAnuncio: "ativo",
    status: "active",
    viewsCount: 287,
    contactsCount: 18,
    savedCount: 41,
    contactPreference: "mensagem",
    visibility: "verified",
    createdAt: "2026-05-30",
    tipoCedencia: "licenca",
    valorImovel: 335000,
    valorNegociado: 15000,
    sinalPagoCedente: 32000,
    valorCedencia: 55000,
    impostos: 14560,
    obra: 0,
    capitalNecessario: 69560,
    valorVendaPrevisto: 420000,
    lucroEstimado: 62440,
    terminoCpcv: "2026-07-30",
    margemSeguranca: "Alta",
    motivoCedencia: "falta_capital",
  },
  {
    id: "ced-lic-boavista",
    authorId: "rui-tavares",
    type: "cedencia",
    title: "Cedência com licença T4 Boavista",
    description:
      "T4 amplo na Avenida da Boavista, Porto. Licença de obras emitida pela Câmara, projeto de luxo aprovado. Cedência por mudança de estratégia.",
    district: "Porto",
    city: "Porto",
    exactAddress: "Av. da Boavista 1284, 5.º",
    tipoImovel: "apartamento",
    tipologia: "T4",
    areaUtil: 165,
    estado: "a recuperar",
    coverImageUrl: IMG("1556909114-f6e7ad7d3136"),
    galleryUrls: [IMG("1556909114-f6e7ad7d3136"), IMG("1502672260266-1c1ef2d93688")],
    floorPlanUrl: IMG("1503387762-592deb58ef4e"),
    energyCertificate: "C",
    estadoAnuncio: "ativo",
    status: "active",
    viewsCount: 213,
    contactsCount: 9,
    savedCount: 24,
    contactPreference: "email",
    visibility: "verified",
    createdAt: "2026-05-18",
    tipoCedencia: "licenca",
    valorImovel: 440000,
    valorNegociado: 20000,
    sinalPagoCedente: 42000,
    valorCedencia: 70000,
    impostos: 23160,
    obra: 0,
    capitalNecessario: 93160,
    valorVendaPrevisto: 540000,
    lucroEstimado: 68840,
    terminoCpcv: "2026-08-18",
    margemSeguranca: "Média",
    motivoCedencia: "mudanca_estrategia",
  },
  // ─── OBRA INICIADA ───
  {
    id: "ced-obra-areeiro",
    authorId: "joao-pereira",
    type: "cedencia",
    title: "Cedência com obra T3 Areeiro",
    description:
      "Obra já iniciada — demolições, canalização e parte da eletricidade concluídas. Falta acabamento (cozinha, WC, pintura). 45.000€ já investidos em obra, faturas disponíveis.",
    district: "Lisboa",
    city: "Lisboa",
    exactAddress: "Rua do Areeiro 38, 3.º",
    tipoImovel: "apartamento",
    tipologia: "T3",
    areaUtil: 105,
    estado: "a recuperar",
    coverImageUrl: IMG("1556909211-36987daf7b4d"),
    galleryUrls: [IMG("1556909211-36987daf7b4d"), IMG("1502672260266-1c1ef2d93688"), IMG("1560448204-e02f11c3d0e2")],
    floorPlanUrl: IMG("1503387762-592deb58ef4e"),
    energyCertificate: "D",
    estadoAnuncio: "ativo",
    status: "active",
    viewsCount: 320,
    contactsCount: 16,
    savedCount: 52,
    contactPreference: "mensagem",
    visibility: "verified",
    createdAt: "2026-05-25",
    tipoCedencia: "obra_iniciada",
    valorImovel: 260000,
    valorNegociado: 10000,
    sinalPagoCedente: 25000,
    valorCedencia: 60000,
    impostos: 9000,
    obra: 45000,
    capitalNecessario: 69000,
    valorVendaPrevisto: 380000,
    valorMercadoPosObras: 470000,
    prazoObras: "5 meses",
    lucroEstimado: 86000,
    terminoCpcv: "2026-06-25",
    margemSeguranca: "Média",
    motivoCedencia: "falta_capital",
  },
  {
    id: "ced-obra-aveiro",
    authorId: "carlos-mendes",
    type: "cedencia",
    title: "Cedência com obra T1 Aveiro centro",
    description:
      "T1 no centro de Aveiro com obra iniciada (28.000€ já investidos). Margem apertada — só aconselho a investidor que conheça muito bem a zona. Transparência total nas contas.",
    district: "Aveiro",
    city: "Aveiro",
    exactAddress: "Rua Direita 88, 2.º",
    tipoImovel: "apartamento",
    tipologia: "T1",
    areaUtil: 48,
    estado: "a recuperar",
    coverImageUrl: IMG("1512917774080-9991f1c4c750"),
    galleryUrls: [IMG("1512917774080-9991f1c4c750"), IMG("1556909114-f6e7ad7d3136")],
    floorPlanUrl: IMG("1556909211-36987daf7b4d"),
    energyCertificate: "D",
    estadoAnuncio: "ativo",
    status: "active",
    viewsCount: 95,
    contactsCount: 3,
    savedCount: 8,
    contactPreference: "telefone",
    visibility: "public",
    createdAt: "2026-06-08",
    tipoCedencia: "obra_iniciada",
    valorImovel: 135000,
    valorNegociado: 5000,
    sinalPagoCedente: 13000,
    valorCedencia: 38000,
    impostos: 4040,
    obra: 28000,
    capitalNecessario: 42040,
    valorVendaPrevisto: 195000,
    valorMercadoPosObras: 240000,
    prazoObras: "4 meses",
    lucroEstimado: 35960,
    terminoCpcv: "2026-08-08",
    margemSeguranca: "Baixa",
    motivoCedencia: "outro",
  },
  {
    id: "arr-arroios",
    authorId: "carlos-mendes",
    type: "arrendamento",
    title: "T2 Arroios pronto a arrendar",
    description:
      "T2 totalmente renovado em Arroios, mobilado e pronto a arrendar. Já com procura confirmada na zona a 1.100€/mês. Ideal para investidor que quer rendimento passivo imediato, sem obras.",
    district: "Lisboa",
    city: "Lisboa",
    exactAddress: "Av. Almirante Reis 120, 4.º Dto.",
    tipologia: "T2",
    areaUtil: 78,
    estado: "renovado",
    coverImageUrl: IMG("1493809842364-78817add7ffb"),
    galleryUrls: [IMG("1493809842364-78817add7ffb"), IMG("1484154218962-a197022b5858"), IMG("1502005229762-cf1b2da7c5d6")],
    floorPlanUrl: IMG("1556909211-36987daf7b4d"),
    energyCertificate: "B",
    estadoAnuncio: "ativo",
    status: "active",
    viewsCount: 256,
    contactsCount: 9,
    savedCount: 33,
    contactPreference: "mensagem",
    visibility: "public",
    createdAt: "2026-06-05",
    precoImovel: 185000,
    capitalNecessario: 45000,
    yieldLiquido: 4.3,
    rentabilidadeCapital: 12.5,
    rendaMensal: 1100,
    roi: 12.5,
  },
  {
    id: "reab-aveiro",
    authorId: "joao-pereira",
    type: "reabilitacao",
    title: "Prédio para compra e revenda em Aveiro",
    description:
      "Prédio de 4 frações no centro de Aveiro, para compra, reabilitação e revenda fracionada. Parceria já financiada parcialmente — resta uma quota disponível.",
    district: "Aveiro",
    city: "Aveiro",
    exactAddress: "Rua de Coimbra 18",
    tipoImovel: "predio",
    tipologia: "T4",
    areaUtil: 140,
    estado: "a recuperar",
    coverImageUrl: IMG("1564013799919-ab600027ffc6"),
    galleryUrls: [IMG("1564013799919-ab600027ffc6"), IMG("1512917774080-9991f1c4c750")],
    floorPlanUrl: IMG("1556909114-f6e7ad7d3136"),
    energyCertificate: "E",
    estadoAnuncio: "financiado",
    status: "active",
    viewsCount: 143,
    contactsCount: 11,
    savedCount: 19,
    contactPreference: "mensagem",
    visibility: "public",
    createdAt: "2026-04-18",
    valorImovel: 220000,
    valorNegociado: 15000,
    orcamentoObras: 90000,
    impostos: 5800,
    imt: 4000,
    escritura: 1800,
    outrosCustos: 3000,
    valorMercadoAtual: 260000,
    valorMercadoPosObras: 410000,
    valorVendaPrevisto: 410000,
    prazoObras: "10 meses",
    rentabilidadePrevista: 29.8,
    capitalProcurado: 120000,
    split: "60 / 40",
    tempoAteVenda: "18 meses",
  },
  {
    id: "arr-porto-al",
    authorId: "mariana-sousa",
    type: "arrendamento",
    title: "Studio renovado no Porto",
    description:
      "Studio renovado junto à Trindade, com excelente histórico de ocupação. Projeto concluído e a render — partilho como case de sucesso e referência.",
    district: "Porto",
    city: "Porto",
    exactAddress: "Rua de Camões 60, 1.º",
    tipologia: "T0",
    areaUtil: 38,
    estado: "renovado",
    coverImageUrl: IMG("1502005229762-cf1b2da7c5d6"),
    galleryUrls: [IMG("1502005229762-cf1b2da7c5d6"), IMG("1556909114-f6e7ad7d3136")],
    floorPlanUrl: IMG("1556909211-36987daf7b4d"),
    energyCertificate: "B",
    estadoAnuncio: "concluido",
    status: "active",
    viewsCount: 401,
    contactsCount: 22,
    savedCount: 58,
    contactPreference: "mensagem",
    visibility: "public",
    createdAt: "2026-01-22",
    precoImovel: 130000,
    capitalNecessario: 40000,
    yieldLiquido: 5.1,
    rentabilidadeCapital: 14.0,
    rendaMensal: 950,
    roi: 14.0,
  },
  {
    id: "reab-braga",
    authorId: "rui-tavares",
    type: "reabilitacao",
    title: "Apartamento a recuperar em Braga",
    description:
      "Primeiro anúncio na rede. T2 no centro de Braga com bom potencial de valorização após obra ligeira. Procuro parceiro local para avançar.",
    district: "Braga",
    city: "Braga",
    exactAddress: "Rua do Souto 91, 2.º",
    tipoImovel: "apartamento",
    tipologia: "T2",
    areaUtil: 65,
    estado: "a recuperar",
    coverImageUrl: IMG("1512917774080-9991f1c4c750"),
    galleryUrls: [IMG("1512917774080-9991f1c4c750"), IMG("1505691938895-1758d7feb511")],
    floorPlanUrl: IMG("1560448204-e02f11c3d0e2"),
    energyCertificate: "D",
    estadoAnuncio: "ativo",
    status: "active",
    viewsCount: 38,
    contactsCount: 1,
    savedCount: 4,
    contactPreference: "mensagem",
    visibility: "public",
    createdAt: "2026-06-09",
    valorImovel: 95000,
    valorNegociado: 5000,
    orcamentoObras: 35000,
    impostos: 2200,
    imt: 1200,
    escritura: 1000,
    outrosCustos: 800,
    valorMercadoAtual: 115000,
    valorMercadoPosObras: 175000,
    valorVendaPrevisto: 175000,
    prazoObras: "6 meses",
    rentabilidadePrevista: 32.4,
    capitalProcurado: 50000,
    split: "50 / 50",
    tempoAteVenda: "10 meses",
  },
  // Anúncio do utilizador atual — alimenta a vista de autor (Atividade do anúncio).
  {
    id: "arr-campo-ourique",
    authorId: "me-daniel",
    type: "arrendamento",
    title: "T2 em Campo de Ourique pronto a render",
    description:
      "T2 renovado em Campo de Ourique, mobilado e com inquilino interessado. Procuro parceiro de capital para fechar a aquisição — rendimento estável desde o primeiro mês.",
    district: "Lisboa",
    city: "Lisboa",
    exactAddress: "Rua Ferreira Borges 55, 2.º Esq.",
    tipologia: "T2",
    areaUtil: 72,
    estado: "renovado",
    coverImageUrl: IMG("1484154218962-a197022b5858"),
    galleryUrls: [IMG("1484154218962-a197022b5858"), IMG("1493809842364-78817add7ffb")],
    floorPlanUrl: IMG("1556909211-36987daf7b4d"),
    energyCertificate: "B",
    estadoAnuncio: "ativo",
    status: "active",
    viewsCount: 47,
    contactsCount: 3,
    savedCount: 12,
    contactPreference: "mensagem",
    visibility: "public",
    createdAt: "2026-06-18",
    precoImovel: 210000,
    capitalNecessario: 55000,
    yieldLiquido: 4.6,
    rentabilidadeCapital: 13.2,
    rendaMensal: 1250,
    roi: 13.2,
  },
];

const SEED: Listing[] = RAW_SEED.map((l) => ({
  ...l,
  galleryUrls: normalizeListingPhotos(l.galleryUrls),
}));

interface ListingsState {
  listings: Listing[];
  add: (input: ListingInput) => string;
  update: (id: string, patch: Partial<Listing>) => void;
  remove: (id: string) => void;
  getById: (id: string) => Listing | undefined;
  incrementViews: (id: string) => void;
  incrementContacts: (id: string) => void;
  setStatus: (id: string, status: Listing["status"]) => void;
  resetSeed: () => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `l-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useListingsStore = create<ListingsState>()(
  persist(
    (set, get) => ({
      listings: SEED,
      add: (input) => {
        const id = uid();
        const listing: Listing = {
          ...input,
          id,
          viewsCount: 0,
          contactsCount: 0,
          savedCount: 0,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        set((s) => ({ listings: [listing, ...s.listings] }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({ listings: s.listings.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      remove: (id) => set((s) => ({ listings: s.listings.filter((l) => l.id !== id) })),
      getById: (id) => get().listings.find((l) => l.id === id),
      incrementViews: (id) =>
        set((s) => ({
          listings: s.listings.map((l) => (l.id === id ? { ...l, viewsCount: l.viewsCount + 1 } : l)),
        })),
      incrementContacts: (id) =>
        set((s) => ({
          listings: s.listings.map((l) => (l.id === id ? { ...l, contactsCount: l.contactsCount + 1 } : l)),
        })),
      setStatus: (id, status) =>
        set((s) => ({ listings: s.listings.map((l) => (l.id === id ? { ...l, status } : l)) })),
      resetSeed: () => set({ listings: SEED }),
    }),
    {
      name: "redegest-listings",
      version: 9,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { listings?: Listing[] } | undefined;
        if (state?.listings && version < 5) {
          // v4 guardava galleryUrls como string[] — converter para ListingPhoto[].
          state.listings = state.listings.map((l) => ({
            ...l,
            galleryUrls: normalizeListingPhotos(l.galleryUrls as unknown),
          }));
        }
        if (state?.listings && version < 9) {
          // v6: cedência com/sem obras. v7: anúncio do utilizador (vista autor).
          // v8: reabilitação — valorMercadoAtual/PosObras, impostos consolidados, prazoObras.
          // v9: tipo de imóvel nas cedências que faltavam (Belém, Boavista, Areeiro, Aveiro).
          // Refresca os seeds mantendo anúncios criados pelo utilizador.
          const seedIds = new Set(SEED.map((l) => l.id));
          const userListings = state.listings.filter((l) => !seedIds.has(l.id));
          state.listings = [...SEED, ...userListings];
        }
        return state as ListingsState;
      },
    }
  )
);

export const CIDADES = ["Lisboa", "Porto", "Aveiro", "Braga", "Coimbra", "Cascais", "Faro"];
export const DISTRITOS = ["Lisboa", "Porto", "Aveiro", "Braga", "Coimbra", "Setúbal", "Faro"];
