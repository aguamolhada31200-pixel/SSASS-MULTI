import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import {
  FileBarChart,
  Download,
  FileText,
  Table as TableIcon,
  ChevronDown,
  ChevronRight,
  TriangleAlert,
  Check,
  X,
  ExternalLink,
  Scale,
  Landmark,
  ReceiptText,
  Percent,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { useExampleData } from "@/store/useExampleData";
import { useTransactionsStore, type Transaction } from "@/store/useTransactionsStore";
import { usePropertiesStore, type Property } from "@/store/usePropertiesStore";
import { useArrendamentosStore, type Arrendamento } from "@/store/useArrendamentosStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import { useAccountStore } from "@/store/useAccountStore";
import { REGRA_CATEGORIA, motivoNaoDedutivel, taxaPorContrato, impostoEnglobamento } from "@/lib/calc/irs";
import { PdfBuilder, PDF_CORES, pdfDataUrl } from "@/lib/pdf";
import { toCsv, downloadFile } from "@/lib/csv";
import { eur, pct, dataPT, dataPTShort, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

// ───────────────────── Apuramento por imóvel ─────────────────────

interface LinhaImovel {
  property: Property;
  isAL: boolean;
  rendas: number; // receitas cat. F ("Renda")
  receitaAL: number; // cat. B — fora do Anexo F
  dedutiveis: number;
  nMovsDedutiveis: number;
  breakdown: { categoria: string; valor: number }[];
  naoDedutiveis: { categoria: string; valor: number; motivo: string }[];
  porClassificar: Transaction[];
  liquido: number; // rendas − dedutíveis (0 se vago)
  vago: boolean;
  taxa: number | null;
  taxaLabel: string;
  imposto: number;
}

function contratoDoAno(arrs: Arrendamento[], propertyId: string, ano: number): Arrendamento | undefined {
  const inicio = `${ano}-01-01`;
  const fim = `${ano}-12-31`;
  const doImovel = arrs.filter(
    (a) => a.propertyId === propertyId && !a.rascunho && a.dataInicio <= fim && (!a.dataFim || a.dataFim >= inicio) && a.estado !== "terminado"
  );
  // preferir o mais recente
  return doImovel.sort((a, b) => (a.dataInicio < b.dataInicio ? 1 : -1))[0];
}

export default function BalancoIRS() {
  const { enabled } = useExampleData();
  const allTx = useTransactionsStore((s) => s.transactions);
  const updateTx = useTransactionsStore((s) => s.update);
  const properties = usePropertiesStore((s) => s.properties);
  const arrendamentos = useArrendamentosStore((s) => s.arrendamentos);
  const privado = useAccountStore((s) => s.privado);
  const addDoc = useDocumentsStore((s) => s.add);
  const navigate = useNavigate();

  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [outros, setOutros] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fechar = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  const txs = enabled ? allTx : [];

  const anos = useMemo(() => {
    const set = new Set<number>([anoAtual]);
    for (const t of txs) set.add(Number(t.data.slice(0, 4)));
    return Array.from(set).filter((a) => isFinite(a)).sort((a, b) => b - a);
  }, [txs, anoAtual]);

  const txAno = useMemo(() => txs.filter((t) => t.data.startsWith(String(ano))), [txs, ano]);

  // Apuramento por imóvel
  const linhas = useMemo<LinhaImovel[]>(() => {
    return properties
      .map((property) => {
        const doImovel = txAno.filter((t) => t.propertyId === property.id);
        let rendas = 0;
        let receitaAL = 0;
        let dedutiveis = 0;
        let nMovsDedutiveis = 0;
        const bd = new Map<string, number>();
        const nd = new Map<string, number>();
        const porClassificar: Transaction[] = [];
        for (const t of doImovel) {
          if (t.tipo === "receita") {
            if (t.categoria === "Renda") rendas += t.valor;
            else if (t.categoria === "Receita AL") receitaAL += t.valor;
            continue;
          }
          if (t.deduzivelIrs === true) {
            dedutiveis += t.valor;
            nMovsDedutiveis++;
            bd.set(t.categoria, (bd.get(t.categoria) ?? 0) + t.valor);
          } else if (t.deduzivelIrs === false) {
            nd.set(t.categoria, (nd.get(t.categoria) ?? 0) + t.valor);
          } else {
            porClassificar.push(t);
          }
        }
        const isAL = property.type === "al" || (receitaAL > 0 && rendas === 0);
        const vago = rendas === 0;
        const contrato = contratoDoAno(arrendamentos, property.id, ano);
        const tc = taxaPorContrato(contrato?.dataInicio, contrato?.duracaoTipo === "aberta" ? undefined : contrato?.dataFim);
        const liquido = vago ? 0 : rendas - dedutiveis;
        return {
          property,
          isAL,
          rendas,
          receitaAL,
          dedutiveis,
          nMovsDedutiveis,
          breakdown: Array.from(bd.entries()).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor),
          naoDedutiveis: Array.from(nd.entries()).map(([categoria, valor]) => ({ categoria, valor, motivo: motivoNaoDedutivel(categoria) })).sort((a, b) => b.valor - a.valor),
          porClassificar,
          liquido,
          vago,
          taxa: vago ? null : tc.taxa,
          taxaLabel: vago ? "Sem rendimento" : tc.label,
          imposto: vago ? 0 : Math.max(0, liquido) * (tc.taxa / 100),
        };
      })
      .filter((l) => l.rendas > 0 || l.receitaAL > 0 || l.dedutiveis > 0 || l.naoDedutiveis.length > 0 || l.porClassificar.length > 0);
  }, [properties, txAno, arrendamentos, ano]);

  const linhasF = linhas.filter((l) => !l.isAL); // Anexo F (cat. F)
  const linhasAL = linhas.filter((l) => l.isAL); // cat. B — fora do Anexo F

  // Totais
  const tot = useMemo(() => {
    const rendas = linhasF.reduce((s, l) => s + l.rendas, 0);
    const dedutiveis = linhasF.reduce((s, l) => s + l.dedutiveis, 0);
    const nMovs = linhasF.reduce((s, l) => s + l.nMovsDedutiveis, 0);
    const tributavel = linhasF.reduce((s, l) => s + l.liquido, 0);
    const imposto = linhasF.reduce((s, l) => s + l.imposto, 0);
    const taxas = new Set(linhasF.filter((l) => l.taxa !== null).map((l) => l.taxa));
    return { rendas, dedutiveis, nMovs, tributavel, imposto, taxaUnica: taxas.size === 1 ? [...taxas][0] : null };
  }, [linhasF]);

  const porClassificar = useMemo(
    () => linhas.flatMap((l) => l.porClassificar).sort((a, b) => (a.data < b.data ? 1 : -1)),
    [linhas]
  );
  const valorPorClassificar = porClassificar.reduce((s, t) => s + t.valor, 0);

  // Englobamento
  const outrosNum = Number(outros.replace(",", ".")) || 0;
  const impEnglob = impostoEnglobamento(outrosNum, tot.tributavel);
  const poupancaAutonoma = impEnglob - tot.imposto;

  const propMap = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);

  // ── Exportações ──

  const exportCsv = () => {
    if (txAno.length === 0) {
      toastInfo("Sem movimentos no ano selecionado");
      return;
    }
    const csv = toCsv(
      [...txAno].sort((a, b) => (a.data > b.data ? 1 : -1)),
      [
        { header: "Data", accessor: (t) => t.data },
        { header: "Imóvel", accessor: (t) => propMap.get(t.propertyId)?.name ?? "—" },
        { header: "Tipo", accessor: (t) => (t.tipo === "receita" ? "Receita" : "Despesa") },
        { header: "Categoria", accessor: (t) => t.categoria },
        { header: "Descrição", accessor: (t) => t.descricao },
        { header: "Valor", accessor: (t) => (t.tipo === "despesa" ? -t.valor : t.valor) },
        { header: "Dedutível", accessor: (t) => (t.tipo === "receita" ? "—" : t.deduzivelIrs === true ? "S" : t.deduzivelIrs === false ? "N" : "Por classificar") },
      ]
    );
    downloadFile(`movimentos-irs-${ano}.csv`, csv);
    setExportOpen(false);
    toastSuccess("CSV exportado", { description: `${txAno.length} movimentos de ${ano}` });
  };

  const exportPdf = () => {
    const doc = new PdfBuilder();
    const M = PDF_CORES;

    // Capa / cabeçalho
    doc.text("REDEGEST", { size: 10, bold: true, color: M.madeira });
    doc.space(6);
    doc.text(`Resumo IRS ${ano} — Rendimentos prediais (Anexo F)`, { size: 18, bold: true, color: M.ink, gap: 2 });
    doc.text(`Senhorio: ${privado.nomeCompleto || "—"}  ·  NIF: ${privado.nif || "—"}  ·  Gerado em ${dataPT(new Date())}`, { size: 9, color: M.muted, gap: 4 });
    doc.hr();
    doc.space(4);

    // Totais
    doc.text(`Rendimento tributável: ${eur(tot.tributavel)}`, { size: 13, bold: true, color: M.ink });
    doc.text(
      `Rendas recebidas ${eur(tot.rendas)}  ·  Despesas dedutíveis ${eur(tot.dedutiveis)}  ·  Imposto estimado ${eur(tot.imposto)}${tot.taxaUnica !== null ? ` (${tot.taxaUnica}%)` : " (taxas por contrato)"}`,
      { size: 9.5, color: M.muted, gap: 6 }
    );

    // Tabela por imóvel
    doc.hr();
    doc.row(
      [
        { text: "Imóvel", bold: true, color: M.muted },
        { text: "Rendas", rightX: doc.left + 250, bold: true, color: M.muted },
        { text: "Dedutíveis", rightX: doc.left + 320, bold: true, color: M.muted },
        { text: "Líquido", rightX: doc.left + 390, bold: true, color: M.muted },
        { text: "Taxa", rightX: doc.left + 430, bold: true, color: M.muted },
        { text: "Imposto", rightX: doc.right, bold: true, color: M.muted },
      ],
      9
    );
    doc.hr();
    for (const l of linhasF) {
      doc.row(
        [
          { text: l.property.name.slice(0, 34), bold: true },
          { text: eur(l.rendas), rightX: doc.left + 250 },
          { text: eur(l.dedutiveis), rightX: doc.left + 320 },
          { text: eur(l.liquido), rightX: doc.left + 390 },
          { text: l.taxa !== null ? `${l.taxa}%` : "—", rightX: doc.left + 430 },
          { text: eur(l.imposto), rightX: doc.right, color: M.danger },
        ],
        9.5
      );
      doc.text(`${l.property.address}, ${l.property.city}`, { size: 8, color: M.muted, gap: 3 });
    }
    doc.hr();
    doc.row(
      [
        { text: "TOTAL", bold: true },
        { text: eur(tot.rendas), rightX: doc.left + 250, bold: true },
        { text: eur(tot.dedutiveis), rightX: doc.left + 320, bold: true },
        { text: eur(tot.tributavel), rightX: doc.left + 390, bold: true },
        { text: eur(tot.imposto), rightX: doc.right, bold: true, color: M.danger },
      ],
      9.5
    );
    doc.space(10);

    // Breakdown por imóvel
    for (const l of linhasF) {
      doc.ensure(60);
      doc.text(l.property.name, { size: 11, bold: true, color: M.madeira, gap: 1 });
      for (const b of l.breakdown)
        doc.row([{ text: `Dedutível · ${b.categoria}`, x: doc.left + 12, color: M.success }, { text: eur(b.valor), rightX: doc.left + 320 }], 9);
      for (const n of l.naoDedutiveis)
        doc.row(
          [
            { text: `Não dedutível · ${n.categoria} — ${n.motivo.slice(0, 60)}`, x: doc.left + 12, color: M.muted },
            { text: eur(n.valor), rightX: doc.left + 320, color: M.muted },
          ],
          9
        );
      if (l.vago) doc.text("Sem rendimento no ano — despesas não aproveitadas.", { x: doc.left + 12, size: 8.5, color: M.muted });
      doc.space(6);
    }

    if (linhasAL.length > 0) {
      doc.ensure(40);
      doc.hr();
      doc.text("Fora do Anexo F — Alojamento Local (categoria B)", { size: 10, bold: true, color: M.muted, gap: 1 });
      for (const l of linhasAL)
        doc.text(`${l.property.name}: receita AL ${eur(l.receitaAL)} — declarada no Anexo B, não em categoria F.`, { size: 9, color: M.muted });
      doc.space(6);
    }

    doc.ensure(50);
    doc.hr();
    doc.text("Documento informativo gerado a partir dos movimentos registados na REDEGEST.", { size: 8, color: M.muted });
    doc.text("Não constitui aconselhamento fiscal. A submissão do IRS é feita pelo próprio no Portal das Finanças.", { size: 8, color: M.muted });

    const pdf = doc.build();
    downloadFile(`resumo-irs-${ano}.pdf`, pdf, "application/pdf");
    addDoc({
      nome: `Resumo IRS ${ano}.pdf`,
      ficheiroUrl: pdfDataUrl(pdf),
      mimeType: "application/pdf",
      uploadedAt: new Date().toISOString().slice(0, 10),
      categoria: "Fiscal",
      tamanho: pdf.length,
      notas: `Apuramento Anexo F ${ano} — gerado no Balanço/IRS.`,
    });
    setExportOpen(false);
    toastSuccess("PDF exportado", { description: "Guardado na Pasta Digital · categoria Fiscal" });
  };

  const classificar = (t: Transaction, dedutivel: boolean) => {
    updateTx(t.id, { deduzivelIrs: dedutivel });
    toastSuccess(dedutivel ? "Marcada como dedutível" : "Marcada como não dedutível", { description: `${t.descricao} · ${eur(t.valor)}` });
  };

  const verMovimentos = (propertyId: string) => navigate(`/financas/contabilidade?imovel=${propertyId}&periodo=ano`);

  return (
    <>
      <PageHeader
        title="Balanço / IRS"
        subtitle={`Anexo F · Categoria F — rendimentos prediais`}
        showExampleToggle
        actions={
          <div className="relative" ref={exportRef}>
            <Button onClick={() => setExportOpen((v) => !v)}>
              <Download size={16} /> Exportar relatório
            </Button>
            {exportOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
                <button onClick={exportPdf} className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-accent">
                  <FileText size={16} className="mt-0.5 shrink-0 text-secondary" />
                  <span>
                    <span className="block text-sm font-medium text-ink">PDF · Resumo IRS {ano}</span>
                    <span className="block text-[11px] text-muted">Pronto a entregar ao contabilista</span>
                  </span>
                </button>
                <button onClick={exportCsv} className="flex w-full items-start gap-2.5 border-t border-line/60 px-4 py-3 text-left hover:bg-accent">
                  <TableIcon size={16} className="mt-0.5 shrink-0 text-secondary" />
                  <span>
                    <span className="block text-sm font-medium text-ink">CSV · Movimentos {ano}</span>
                    <span className="block text-[11px] text-muted">Data, imóvel, categoria, valor, dedutível</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        }
      />

      {!enabled ? (
        <EmptyState
          icon={FileBarChart}
          title="O seu Anexo F, apurado automaticamente"
          description="Registe rendas e despesas na Contabilidade e veja aqui o rendimento tributável por imóvel, com as deduções do art.º 41.º já separadas."
          ctaLabel="Ir para a Contabilidade"
          onCta={() => navigate("/financas/contabilidade")}
        />
      ) : (
        <>
          {/* Seletor de ano + banner honesto */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="h-9 rounded-lg border border-line bg-card px-3 font-medium text-ink outline-none focus:border-secondary"
            >
              {anos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <p className="flex-1 rounded-xl border border-gold/25 bg-gold/8 px-3.5 py-2 text-xs text-ink/80">
              Apuramos os valores do Anexo F a partir dos seus movimentos. A submissão é feita por si no Portal das Finanças.
            </p>
          </div>

          {/* O número que interessa */}
          <div className="mb-5">
            <p className="font-display text-2xl font-bold leading-snug text-ink sm:text-3xl">
              Rendimento tributável {ano}: <span className="num">{eur(tot.tributavel)}</span>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              Imposto estimado: <span className="num font-semibold text-danger">{eur(tot.imposto)}</span>
              {tot.taxaUnica !== null ? ` (${tot.taxaUnica}%)` : " (taxas por contrato)"}
              <Badge tone="neutral">Estimativa · não é aconselhamento fiscal</Badge>
            </p>
          </div>

          {/* 3 cards */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Rendas recebidas" value={eur(tot.rendas)} hint={`${ano} · todos os imóveis`} icon={Landmark} iconTone="success" />
            <StatCard label="Despesas dedutíveis" value={eur(tot.dedutiveis)} hint={`de ${plural(tot.nMovs, "movimento", "movimentos")}`} icon={ReceiptText} iconTone="gold" />
            <StatCard
              label="Imposto estimado"
              value={eur(tot.imposto)}
              hint={tot.taxaUnica !== null ? `taxa autónoma ${tot.taxaUnica}%` : "taxas por contrato"}
              hintTone="danger"
              icon={Percent}
              iconTone="danger"
            />
          </div>

          {/* Por classificar */}
          {porClassificar.length > 0 && (
            <Card className="mb-6 border-warning/40 bg-warning/5">
              <CardContent className="p-4 sm:p-5">
                <p className="flex items-center gap-2 font-display text-base font-semibold text-ink">
                  <TriangleAlert size={17} className="text-warning" />
                  {plural(porClassificar.length, "despesa por classificar", "despesas por classificar")}
                  <span className="num text-warning">({eur(valorPorClassificar)})</span>
                </p>
                <p className="mt-0.5 text-xs text-muted">Classifique-as para não perder deduções.</p>
                <div className="mt-3 space-y-1.5">
                  {porClassificar.map((t) => {
                    const regra = REGRA_CATEGORIA[t.categoria];
                    return (
                      <div key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-line/70 bg-card px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{t.descricao}</p>
                          <p className="text-[11px] text-muted">
                            {dataPTShort(t.data)} · {propMap.get(t.propertyId)?.name ?? "—"} · {t.categoria}
                          </p>
                        </div>
                        <span className="num text-sm font-semibold text-ink">{eur(t.valor)}</span>
                        {regra && (
                          <span
                            className={cn(
                              "hidden rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline",
                              regra.dedutivel ? "bg-success/10 text-success" : "bg-accent text-muted"
                            )}
                            title={regra.motivo}
                          >
                            Sugestão: {regra.dedutivel ? "dedutível" : "não dedutível"}
                          </span>
                        )}
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => classificar(t, true)}
                            className="inline-flex items-center gap-1 rounded-lg border border-success/40 px-2.5 py-1 text-xs font-medium text-success hover:bg-success/10"
                          >
                            <Check size={12} /> Dedutível
                          </button>
                          <button
                            onClick={() => classificar(t, false)}
                            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-muted hover:bg-accent"
                          >
                            <X size={12} /> Não
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela por imóvel */}
          <Card className="mb-6">
            <CardContent className="p-0 sm:p-0">
              <div className="border-b border-line px-5 py-3">
                <h3 className="font-display text-base font-semibold text-ink">
                  Por imóvel <span className="text-sm font-normal text-muted">· o que se copia para o Anexo F</span>
                </h3>
              </div>
              {linhasF.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted">Sem movimentos de categoria F em {ano}.</p>
              ) : (
                <>
                  {/* Desktop */}
                  <div className="hidden md:block">
                    <table className="w-full text-sm">
                      <thead className="bg-bg text-left text-[11px] font-medium uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-5 py-2.5">Imóvel</th>
                          <th className="px-2 py-2.5 text-right">Rendas</th>
                          <th className="px-2 py-2.5 text-right">Dedutíveis</th>
                          <th className="px-2 py-2.5 text-right">Líquido</th>
                          <th className="px-2 py-2.5 text-right">Taxa</th>
                          <th className="px-5 py-2.5 text-right">Imposto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhasF.map((l) => (
                          <LinhaDesktop key={l.property.id} l={l} aberta={expandido === l.property.id} onToggle={() => setExpandido((v) => (v === l.property.id ? null : l.property.id))} onVerMovimentos={() => verMovimentos(l.property.id)} />
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-line bg-bg/50 font-semibold">
                          <td className="px-5 py-3 text-ink">Total</td>
                          <td className="num px-2 py-3 text-right text-success">{eur(tot.rendas)}</td>
                          <td className="num px-2 py-3 text-right text-ink">{eur(tot.dedutiveis)}</td>
                          <td className="num px-2 py-3 text-right text-ink">{eur(tot.tributavel)}</td>
                          <td className="px-2 py-3" />
                          <td className="num px-5 py-3 text-right text-danger">{eur(tot.imposto)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Mobile */}
                  <div className="space-y-2 p-3 md:hidden">
                    {linhasF.map((l) => (
                      <LinhaMobile key={l.property.id} l={l} aberta={expandido === l.property.id} onToggle={() => setExpandido((v) => (v === l.property.id ? null : l.property.id))} onVerMovimentos={() => verMovimentos(l.property.id)} />
                    ))}
                    <div className="flex items-center justify-between rounded-xl bg-bg/60 px-3 py-2.5 text-sm font-semibold">
                      <span className="text-ink">Total</span>
                      <span className="num text-danger">{eur(tot.imposto)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Fora do Anexo F — AL (cat. B) */}
          {linhasAL.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-4 sm:p-5">
                <p className="font-display text-sm font-semibold text-ink">Fora do Anexo F — Alojamento Local</p>
                {linhasAL.map((l) => (
                  <div key={l.property.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-ink">{l.property.name}</span>
                    <span className="num font-medium text-ink">{eur(l.receitaAL)}</span>
                    <span className="w-full text-[11px] text-muted sm:w-auto">Receita AL é categoria B (Anexo B) — não entra nos rendimentos prediais.</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Comparação: taxa autónoma vs englobamento */}
          <Card className="mb-6">
            <CardContent className="p-5">
              <p className="flex items-center gap-2 font-display text-base font-semibold text-ink">
                <Scale size={17} className="text-gold-dark" /> Taxa autónoma vs Englobamento
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-bg/40 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Taxa autónoma {tot.taxaUnica !== null ? `(${tot.taxaUnica}%)` : "(por contrato)"}
                  </p>
                  <p className="num mt-1.5 font-display text-2xl font-bold text-ink">{eur(tot.imposto)}</p>
                  <p className="mt-1 text-[11px] text-muted">Tributação separada dos rendimentos prediais.</p>
                </div>
                <div className="rounded-xl border border-line bg-bg/40 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Englobamento</p>
                  <label className="mt-1.5 block">
                    <span className="text-[11px] text-muted">Rendimento coletável dos outros rendimentos (anual)</span>
                    <div className="mt-1 flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
                      <input
                        type="number"
                        min={0}
                        value={outros}
                        onChange={(e) => setOutros(e.target.value)}
                        placeholder="Ex.: 28.000"
                        className="h-9 w-full bg-transparent px-3 text-sm outline-none"
                      />
                      <span className="px-3 text-sm text-muted">€</span>
                    </div>
                  </label>
                  <p className="num mt-2 font-display text-2xl font-bold text-ink">{eur(impEnglob)}</p>
                  <p className="mt-1 text-[11px] text-muted">Prediais somados aos outros rendimentos · escalões progressivos.</p>
                </div>
              </div>
              {tot.tributavel > 0 && (
                <p
                  className={cn(
                    "mt-4 rounded-xl px-4 py-3 text-sm font-medium",
                    poupancaAutonoma >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  )}
                >
                  {poupancaAutonoma >= 0
                    ? <>Neste caso, a taxa autónoma poupa-lhe <span className="num font-bold">{eur(poupancaAutonoma)}</span>.</>
                    : <>Neste caso, o englobamento poupa-lhe <span className="num font-bold">{eur(-poupancaAutonoma)}</span>.</>}
                </p>
              )}
              <p className="mt-2 text-[11px] text-muted">Simulação informativa (escalões IRS continente). Confirme com o seu contabilista.</p>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

// ───────────────────── Linhas da tabela ─────────────────────

function BreakdownImovel({ l, onVerMovimentos }: { l: LinhaImovel; onVerMovimentos: () => void }) {
  return (
    <div className="space-y-3">
      {l.vago && (
        <p className="rounded-lg bg-accent px-3 py-2 text-xs text-muted">
          Sem rendimento — despesas não aproveitadas este ano.
        </p>
      )}
      {l.breakdown.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-success">Deduções (art.º 41.º CIRS)</p>
          <div className="space-y-1">
            {l.breakdown.map((b) => (
              <div key={b.categoria} className="flex items-center justify-between text-sm">
                <span className="text-ink">{b.categoria}</span>
                <span className="num font-medium text-success">{eur(b.valor)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-line/60 pt-1 text-sm font-semibold">
              <span className="text-ink">Total dedutível</span>
              <span className="num text-success">{eur(l.dedutiveis)}</span>
            </div>
          </div>
        </div>
      )}
      {l.naoDedutiveis.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Não dedutíveis</p>
          <div className="space-y-1">
            {l.naoDedutiveis.map((n) => (
              <div key={n.categoria} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-muted">
                  {n.categoria} <span className="text-[11px]">— {n.motivo}</span>
                </span>
                <span className="num shrink-0 text-muted">{eur(n.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {l.porClassificar.length > 0 && (
        <p className="text-xs font-medium text-warning">
          {plural(l.porClassificar.length, "despesa por classificar", "despesas por classificar")} — ver painel acima.
        </p>
      )}
      <Button variant="outline" size="sm" onClick={onVerMovimentos}>
        <ExternalLink size={13} /> Ver movimentos
      </Button>
    </div>
  );
}

function LinhaDesktop({ l, aberta, onToggle, onVerMovimentos }: { l: LinhaImovel; aberta: boolean; onToggle: () => void; onVerMovimentos: () => void }) {
  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer border-t border-line/60 hover:bg-bg/50">
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            {aberta ? <ChevronDown size={15} className="shrink-0 text-muted" /> : <ChevronRight size={15} className="shrink-0 text-muted" />}
            <div>
              <p className="font-medium text-ink">{l.property.name}</p>
              <p className="text-[11px] text-muted">
                {l.property.address}, {l.property.city}
                {l.vago && <span className="ml-1.5 text-warning">· vago</span>}
              </p>
            </div>
          </div>
        </td>
        <td className="num px-2 py-3 text-right text-success">{eur(l.rendas)}</td>
        <td className="num px-2 py-3 text-right text-ink">{eur(l.dedutiveis)}</td>
        <td className="num px-2 py-3 text-right font-semibold text-ink">{eur(l.liquido)}</td>
        <td className="num px-2 py-3 text-right text-ink" title={l.taxaLabel}>
          {l.taxa !== null ? pct(l.taxa, 0) : "—"}
        </td>
        <td className="num px-5 py-3 text-right font-semibold text-danger">{eur(l.imposto)}</td>
      </tr>
      {aberta && (
        <tr className="border-t border-line/40 bg-bg/40">
          <td colSpan={6} className="px-5 py-4">
            <p className="mb-2 text-[11px] text-muted">{l.taxaLabel}</p>
            <BreakdownImovel l={l} onVerMovimentos={onVerMovimentos} />
          </td>
        </tr>
      )}
    </>
  );
}

function LinhaMobile({ l, aberta, onToggle, onVerMovimentos }: { l: LinhaImovel; aberta: boolean; onToggle: () => void; onVerMovimentos: () => void }) {
  return (
    <div className="rounded-xl border border-line bg-card">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-3 text-left">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{l.property.name}</p>
          <p className="text-[11px] text-muted">
            Rendas <span className="num text-success">{eur(l.rendas)}</span> · Dedutíveis <span className="num">{eur(l.dedutiveis)}</span>
            {l.taxa !== null && <> · {l.taxa}%</>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="num text-sm font-bold text-danger">{eur(l.imposto)}</p>
          <p className="text-[10px] text-muted">imposto</p>
        </div>
      </button>
      {aberta && (
        <div className="border-t border-line/60 p-3">
          <p className="mb-2 text-[11px] text-muted">{l.taxaLabel}</p>
          <BreakdownImovel l={l} onVerMovimentos={onVerMovimentos} />
        </div>
      )}
    </div>
  );
}
