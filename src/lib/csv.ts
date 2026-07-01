/** Escapa um valor para CSV (rodeia com aspas se necessário, duplica aspas internas). */
function esc(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export interface CsvColumn<Row> {
  header: string;
  accessor: (row: Row) => string | number;
}

/** Gera uma string CSV a partir de linhas tipadas. Separador `;` (Excel PT). */
export function toCsv<Row>(rows: Row[], cols: CsvColumn<Row>[]): string {
  const head = cols.map((c) => esc(c.header)).join(";");
  const body = rows
    .map((r) => cols.map((c) => esc(c.accessor(r))).join(";"))
    .join("\n");
  // BOM para o Excel detetar UTF-8
  return "﻿" + head + "\n" + body;
}

/** Dispara o download de um Blob com o conteúdo dado. */
export function downloadFile(name: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
