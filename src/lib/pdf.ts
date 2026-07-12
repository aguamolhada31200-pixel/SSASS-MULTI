// Gerador PDF mínimo — sem dependências. Helvetica + WinAnsi, A4 vertical,
// multi-página. Devolve uma string ASCII pura (bytes >127 escapados em octal),
// segura para Blob/btoa. Suficiente para relatórios de texto (Resumo IRS).

const A4W = 595.28;
const A4H = 841.89;
const MARGEM = 56;

export type Rgb = [number, number, number];

export const PDF_CORES = {
  ink: [0.18, 0.16, 0.14] as Rgb,
  madeira: [0.36, 0.24, 0.18] as Rgb,
  muted: [0.42, 0.3, 0.23] as Rgb,
  success: [0.29, 0.49, 0.35] as Rgb,
  danger: [0.61, 0.23, 0.16] as Rgb,
  line: [0.91, 0.84, 0.75] as Rgb,
};

/** Escapa texto para string PDF (WinAnsi); >127 vai em \ooo octal. */
function escTxt(s: string): string {
  let out = "";
  for (const ch of s) {
    let code = ch.codePointAt(0) ?? 63;
    // Mapeamentos Unicode → WinAnsi (cp1252)
    if (code === 0x20ac) code = 128; // €
    else if (code === 0x2013) code = 150; // –
    else if (code === 0x2014) code = 151; // —
    else if (code === 0x2018) code = 145;
    else if (code === 0x2019) code = 146;
    else if (code === 0x201c) code = 147;
    else if (code === 0x201d) code = 148;
    else if (code === 0x2026) code = 133; // …
    if (code > 255) code = 63; // '?'
    if (code === 40 || code === 41 || code === 92) out += "\\" + String.fromCharCode(code);
    else if (code < 32 || code > 126) out += "\\" + code.toString(8).padStart(3, "0");
    else out += String.fromCharCode(code);
  }
  return out;
}

/** Largura aproximada Helvetica (milésimos de em). Chega para alinhar à direita. */
function chW(ch: string): number {
  if (" .,:;'()[]!|/·".includes(ch)) return 278;
  if ("ijl".includes(ch)) return 222;
  if ("ftrI-".includes(ch)) return 320;
  if ("mMW".includes(ch)) return 850;
  if (ch >= "A" && ch <= "Z") return 667;
  return 556;
}

export function textWidth(s: string, size: number): number {
  let w = 0;
  for (const ch of s) w += chW(ch);
  return (w / 1000) * size;
}

interface TextOpts {
  x?: number;
  size?: number;
  bold?: boolean;
  color?: Rgb;
  /** Alinha o fim do texto a esta coordenada x. */
  rightX?: number;
  /** Espaço vertical extra depois da linha. */
  gap?: number;
}

export interface Cell {
  text: string;
  x?: number;
  rightX?: number;
  size?: number;
  bold?: boolean;
  color?: Rgb;
}

export class PdfBuilder {
  readonly left = MARGEM;
  readonly right = A4W - MARGEM;
  private pages: string[] = [];
  private cur: string[] = [];
  private y = A4H - MARGEM;

  private flushPage() {
    this.pages.push(this.cur.join("\n"));
    this.cur = [];
    this.y = A4H - MARGEM;
  }

  /** Garante `espaco` pt disponíveis; senão abre página nova. */
  ensure(espaco: number) {
    if (this.y - espaco < MARGEM) this.flushPage();
  }

  space(pt: number) {
    this.y -= pt;
  }

  private putText(text: string, y: number, o: TextOpts) {
    const size = o.size ?? 10;
    const [r, g, b] = o.color ?? PDF_CORES.ink;
    const x = o.rightX !== undefined ? o.rightX - textWidth(text, size) : o.x ?? this.left;
    this.cur.push(
      `BT /F${o.bold ? 2 : 1} ${size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${escTxt(text)}) Tj ET`
    );
  }

  /** Linha de texto; avança o cursor. */
  text(str: string, o: TextOpts = {}) {
    const size = o.size ?? 10;
    const leading = size * 1.45;
    this.ensure(leading);
    this.y -= size; // baseline
    this.putText(str, this.y, o);
    this.y -= leading - size + (o.gap ?? 0);
  }

  /** Várias células na MESMA linha (tabela). */
  row(cells: Cell[], size = 10) {
    const leading = size * 1.5;
    this.ensure(leading);
    this.y -= size;
    for (const c of cells) this.putText(c.text, this.y, { ...c, size: c.size ?? size });
    this.y -= leading - size;
  }

  /** Régua horizontal. */
  hr(color: Rgb = PDF_CORES.line, gap = 8) {
    this.ensure(gap + 2);
    const [r, g, b] = color;
    this.cur.push(
      `q ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG 0.75 w ${this.left} ${this.y.toFixed(2)} m ${this.right} ${this.y.toFixed(2)} l S Q`
    );
    this.y -= gap;
  }

  /** Monta o ficheiro PDF (string ASCII). */
  build(): string {
    this.flushPage();
    const objs: string[] = [];
    const kids = this.pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ");
    objs[1] = "<</Type /Catalog /Pages 2 0 R>>";
    objs[2] = `<</Type /Pages /Kids [${kids}] /Count ${this.pages.length}>>`;
    objs[3] = "<</Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding>>";
    objs[4] = "<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding>>";
    this.pages.forEach((content, i) => {
      const pid = 5 + i * 2;
      objs[pid] = `<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4W} ${A4H}] /Resources <</Font <</F1 3 0 R /F2 4 0 R>>>> /Contents ${pid + 1} 0 R>>`;
      objs[pid + 1] = `<</Length ${content.length}>>\nstream\n${content}\nendstream`;
    });

    let out = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (let i = 1; i < objs.length; i++) {
      offsets[i] = out.length;
      out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objs.length; i++) out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    out += `trailer\n<</Size ${objs.length} /Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
    return out;
  }
}

/** Converte o PDF (string ASCII) em data URL base64 — para guardar na Pasta Digital. */
export function pdfDataUrl(pdf: string): string {
  return `data:application/pdf;base64,${btoa(pdf)}`;
}
