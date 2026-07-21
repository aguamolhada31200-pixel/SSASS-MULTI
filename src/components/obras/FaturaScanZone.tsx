import { useRef, useState } from "react";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { Upload, Camera, CheckCircle2, Trash2, ScanLine, FileText } from "lucide-react";
import { lerFaturaDeImagem, type FaturaLida } from "@/lib/fatura";
import { eur, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

// Zona de upload/scan de faturas PT — partilhada pelos modais de gasto e de
// pagamento. Leitura REAL do QR da AT (jsQR): extrai Data · NIF · Valor.
// PDFs e fotos sem QR legível ficam anexados na mesma (preenchimento manual).

export type FilePreview = { name: string; mime: string; dataUrl: string; size: number };

async function fileToPreview(f: File): Promise<FilePreview> {
  const dataUrl = await new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.readAsDataURL(f);
  });
  return { name: f.name, mime: f.type || "application/octet-stream", dataUrl, size: f.size };
}

interface FaturaScanZoneProps {
  comprovativo: FilePreview | null;
  onComprovativo: (f: FilePreview | null) => void;
  /** Chamado quando o QR AT é lido com sucesso (campos para pré-preencher). */
  onLido?: (f: FaturaLida) => void;
  titulo?: string;
  subtitulo?: string;
}

export function FaturaScanZone({
  comprovativo,
  onComprovativo,
  onLido,
  titulo = "Tire foto da fatura ou carregue o ficheiro",
  subtitulo = "PDF ou imagem · o QR da fatura preenche os campos automaticamente",
}: FaturaScanZoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [aLer, setALer] = useState(false);
  const [lido, setLido] = useState<FaturaLida | null>(null);

  const tentarLer = async (preview: FilePreview) => {
    if (!preview.mime.startsWith("image/")) {
      toastInfo("PDF anexado", {
        description: "A leitura automática funciona com foto do QR da fatura — confirme os campos.",
      });
      return;
    }
    setALer(true);
    const fatura = await lerFaturaDeImagem(preview.dataUrl);
    setALer(false);
    if (fatura) {
      setLido(fatura);
      onLido?.(fatura);
      toastSuccess("Fatura lida pelo QR", {
        description: [
          fatura.data ? dataPT(fatura.data) : null,
          fatura.nifEmitente ? `NIF ${fatura.nifEmitente}` : null,
          fatura.total != null ? eur(fatura.total) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    } else {
      toastInfo("QR não encontrado na imagem", {
        description: "Fique com o anexo na mesma e preencha os campos manualmente.",
      });
    }
  };

  const onPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.size > 8 * 1024 * 1024) {
      toastError("Ficheiro demasiado grande (máx 8 MB)");
      return;
    }
    const preview = await fileToPreview(f);
    setLido(null);
    onComprovativo(preview);
    await tentarLer(preview);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed p-4 text-center transition-colors",
        comprovativo ? "border-success/40 bg-success/5" : "border-gold/30 bg-gold/5"
      )}
    >
      <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => { onPick(e.target.files); e.target.value = ""; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onPick(e.target.files); e.target.value = ""; }} />

      {comprovativo ? (
        <>
          {aLer ? <ScanLine size={22} className="mx-auto mb-1 animate-pulse text-gold-dark" /> : <CheckCircle2 size={22} className="mx-auto mb-1 text-success" />}
          <p className="text-sm font-medium text-ink">{comprovativo.name}</p>
          <p className="text-[11px] text-muted">{Math.round(comprovativo.size / 1024)} KB{aLer ? " · a ler o QR…" : ""}</p>
          {lido && (
            <p className="num mt-1 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
              <FileText size={11} />
              {[lido.data ? dataPT(lido.data) : null, lido.nifEmitente ? `NIF ${lido.nifEmitente}` : null, lido.total != null ? eur(lido.total) : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => tentarLer(comprovativo)}
              disabled={aLer}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold-dark hover:bg-gold/20 disabled:opacity-50"
            >
              <ScanLine size={12} /> Ler QR novamente
            </button>
            <button
              type="button"
              onClick={() => { onComprovativo(null); setLido(null); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-xs text-muted hover:text-danger"
            >
              <Trash2 size={12} /> Remover
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-ink">{titulo}</p>
          <p className="mt-0.5 text-[11px] text-muted">{subtitulo}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-medium text-sidebar hover:opacity-90"
            >
              <Camera size={15} /> Tirar foto
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-card px-4 text-sm text-ink hover:bg-accent"
            >
              <Upload size={15} /> Carregar ficheiro
            </button>
          </div>
        </>
      )}
    </div>
  );
}
