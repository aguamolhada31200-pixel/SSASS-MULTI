import jsQR from "jsqr";

// Leitura REAL de faturas portuguesas pelo QR Code da AT (Portaria 195/2020).
// O QR das faturas PT codifica campos separados por "*" no formato "LETRA:valor":
//   A: NIF do emitente · B: NIF do adquirente · F: data (AAAAMMDD) ·
//   G: identificação do documento · O: total com IVA · N: total do IVA …
// Extraímos Data · Fornecedor (NIF→nome, se conhecido) · NIF · Valor.

export interface FaturaLida {
  nifEmitente?: string;
  nifAdquirente?: string;
  /** Data do documento em ISO (AAAA-MM-DD). */
  data?: string;
  /** Total do documento com impostos (campo O). */
  total?: number;
  /** Total do IVA (campo N). */
  iva?: number;
  /** Ex.: "FT AB2019/0035" (campo G). */
  documento?: string;
}

/** Interpreta o texto de um QR AT. Devolve null se não parecer uma fatura PT. */
export function parseQrAT(texto: string): FaturaLida | null {
  if (!texto || !texto.includes("*") || !/A:\d{9}/.test(texto)) return null;
  const campos = new Map<string, string>();
  for (const par of texto.split("*")) {
    const i = par.indexOf(":");
    if (i > 0) campos.set(par.slice(0, i).toUpperCase(), par.slice(i + 1));
  }
  const f: FaturaLida = {};
  const a = campos.get("A");
  if (a && /^\d{9}$/.test(a)) f.nifEmitente = a;
  const b = campos.get("B");
  if (b && /^\d{9}$/.test(b)) f.nifAdquirente = b;
  const dataRaw = campos.get("F");
  if (dataRaw && /^\d{8}$/.test(dataRaw)) {
    f.data = `${dataRaw.slice(0, 4)}-${dataRaw.slice(4, 6)}-${dataRaw.slice(6, 8)}`;
  }
  const total = Number(campos.get("O")?.replace(",", "."));
  if (isFinite(total) && total > 0) f.total = total;
  const iva = Number(campos.get("N")?.replace(",", "."));
  if (isFinite(iva) && iva > 0) f.iva = iva;
  const doc = campos.get("G");
  if (doc) f.documento = doc;
  if (!f.nifEmitente && !f.total) return null;
  return f;
}

/**
 * Procura e descodifica um QR numa imagem (dataURL). Leitura real via jsQR.
 * Tenta em 2 escalas para fotos grandes. Devolve o texto do QR ou null.
 */
export async function lerQrDeImagem(dataUrl: string): Promise<string | null> {
  const img = await new Promise<HTMLImageElement | null>((res) => {
    const el = new Image();
    el.onload = () => res(el);
    el.onerror = () => res(null);
    el.src = dataUrl;
  });
  if (!img) return null;

  for (const maxLado of [1400, 800]) {
    const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * escala));
    const h = Math.max(1, Math.round(img.height * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const dados = ctx.getImageData(0, 0, w, h);
    const qr = jsQR(dados.data, w, h);
    if (qr?.data) return qr.data;
  }
  return null;
}

/** Atalho: imagem → FaturaLida (null se não houver QR AT legível). */
export async function lerFaturaDeImagem(dataUrl: string): Promise<FaturaLida | null> {
  const texto = await lerQrDeImagem(dataUrl);
  if (!texto) return null;
  return parseQrAT(texto);
}
