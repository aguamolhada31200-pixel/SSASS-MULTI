import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  Download,
  XCircle,
  FilePlus2,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Lightbox } from "@/components/Lightbox";
import {
  useContractsStore,
  statusEfetivo,
  diasAteFim,
  progressoTemporal,
  proximasAcoes,
  TIPO_LABEL,
  TIPO_OPCOES,
  STATUS_LABEL,
  type ContractStatus,
  type ContractTipo,
} from "@/store/useContractsStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useTenantsStore } from "@/store/useTenantsStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import { eur, dataPT, dataPTShort } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "danger" | "warning" | "gold" | "info";
const STATUS_TONE: Record<ContractStatus, Tone> = {
  draft: "neutral",
  pending_signature: "warning",
  active: "success",
  expiring: "warning",
  expired: "danger",
  terminated: "danger",
};

const inp = "h-9 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

export default function ContratoDetalhe() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const contract = useContractsStore((s) => s.contracts.find((c) => c.id === id));
  const update = useContractsStore((s) => s.update);
  const terminate = useContractsStore((s) => s.terminate);
  const properties = usePropertiesStore((s) => s.properties);
  const tenants = useTenantsStore((s) => s.tenants);
  const documents = useDocumentsStore((s) => s.documents);
  const addDoc = useDocumentsStore((s) => s.add);
  const updateDoc = useDocumentsStore((s) => s.update);

  const [lightbox, setLightbox] = useState(false);

  if (!contract) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">Contrato não encontrado.</p>
        <Link to="/imoveis" className="mt-3 inline-block text-sm text-secondary underline">Voltar aos imóveis</Link>
      </div>
    );
  }

  const property = properties.find((p) => p.id === contract.propertyId);
  const tenant = tenants.find((t) => t.id === contract.primaryTenantId);
  const se = statusEfetivo(contract);
  const dias = diasAteFim(contract.endDate);

  const inquilinoNome = tenant?.nomeCompleto ?? contract.inquilinoLabel ?? "Arrendatário";
  const imovelNome = property?.name ?? contract.imovelLabel ?? "Imóvel";

  const aditamentos = documents.filter((d) => d.contractId === contract.id && d.id !== contract.documentId && !d.deletedAt);

  const ehDataUrl = contract.pdfUrl?.startsWith("data:");
  const ehImagem = ehDataUrl && contract.pdfUrl!.startsWith("data:image");
  const ehPdf = ehDataUrl && contract.pdfUrl!.startsWith("data:application/pdf");

  const setField = (patch: Record<string, unknown>) => update(contract.id, patch);

  const substituir = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      const url = String(r.result);
      update(contract.id, { pdfUrl: url, fileName: file.name });
      if (contract.documentId) updateDoc(contract.documentId, { ficheiroUrl: url, nome: file.name, mimeType: file.type || "application/octet-stream" });
      toast.success("Documento substituído");
    };
    r.readAsDataURL(file);
  };

  const novoAditamento = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      addDoc({
        nome: file.name,
        ficheiroUrl: String(r.result),
        mimeType: file.type || "application/octet-stream",
        tamanho: file.size,
        categoria: "Contratos",
        uploadedAt: new Date().toISOString().slice(0, 10),
        propertyId: contract.propertyId,
        tenantId: contract.primaryTenantId,
        contractId: contract.id,
        pasta: property ? `Imóveis/${property.name}/Contratos` : undefined,
      });
      toast.success("Aditamento carregado e associado");
    };
    r.readAsDataURL(file);
  };

  const baixar = () => {
    if (!ehDataUrl) {
      toast.info("Documento de exemplo — sem ficheiro real para descarregar.");
      return;
    }
    const a = document.createElement("a");
    a.href = contract.pdfUrl!;
    a.download = contract.fileName ?? "contrato";
    a.click();
  };

  const terminar = () => {
    const motivo = window.prompt("Motivo da cessação do contrato:");
    if (!motivo?.trim()) return;
    const data = window.prompt("Data da cessação (AAAA-MM-DD):", new Date().toISOString().slice(0, 10));
    terminate(contract.id, motivo.trim(), data?.trim() || undefined);
    toast.success("Contrato terminado");
  };

  return (
    <div>
      <Link to={property ? `/imoveis/${property.id}` : "/imoveis"} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> {property ? property.name : "Imóveis"}
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-ink">Contrato {TIPO_LABEL[contract.tipo]}</h1>
            <Badge tone={STATUS_TONE[se]}>{STATUS_LABEL[se]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">{inquilinoNome} · {imovelNome}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-primary/40 px-3 text-sm font-medium text-primary hover:bg-accent">
            <Upload size={14} /> Substituir documento
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) substituir(f); e.target.value = ""; }} />
          </label>
          <Button variant="outline" size="sm" onClick={baixar}><Download size={14} /> Download</Button>
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-muted hover:bg-accent">
            <FilePlus2 size={14} /> Aditamento
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) novoAditamento(f); e.target.value = ""; }} />
          </label>
          {se !== "terminated" && <Button variant="outline" size="sm" onClick={terminar}><XCircle size={14} /> Terminar</Button>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Preview */}
        <div className="order-2 lg:order-1">
          <div className="overflow-hidden rounded-xl border border-line bg-bg">
            {ehImagem ? (
              <button onClick={() => setLightbox(true)} className="group relative block w-full">
                <img src={contract.pdfUrl} alt="" className="max-h-[760px] w-full object-contain" />
                <span className="absolute right-3 top-3 rounded-full bg-ink/60 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100"><Maximize2 size={16} /></span>
              </button>
            ) : ehPdf ? (
              <iframe title={contract.fileName ?? "Contrato"} src={contract.pdfUrl} className="h-[760px] w-full" />
            ) : (
              <div className="flex h-72 flex-col items-center justify-center gap-2 text-muted">
                <FileText size={40} />
                <p className="text-sm">{contract.fileName ?? "Documento de contrato"}</p>
                <p className="text-xs">Pré-visualização indisponível (documento de exemplo).</p>
              </div>
            )}
          </div>
        </div>

        {/* Painéis */}
        <div className="order-1 space-y-4 lg:order-2">
          {/* Dados-chave editáveis */}
          <Card>
            <CardContent>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-secondary">Dados-chave</p>
              <div className="space-y-2.5">
                <EditRow label="Tipo">
                  <select value={contract.tipo} onChange={(e) => setField({ tipo: e.target.value as ContractTipo })} className={inp}>
                    {TIPO_OPCOES.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                  </select>
                </EditRow>
                <EditRow label="Estado">
                  <select value={contract.status} onChange={(e) => setField({ status: e.target.value as ContractStatus })} className={inp}>
                    {(["active", "pending_signature", "expired", "terminated"] as ContractStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </EditRow>
                <EditRow label="Renda mensal">
                  <input type="number" defaultValue={contract.monthlyRent} onBlur={(e) => setField({ monthlyRent: Number(e.target.value) || 0 })} className={inp} />
                </EditRow>
                <EditRow label="Dia de pagamento">
                  <input type="number" defaultValue={contract.paymentDay} onBlur={(e) => setField({ paymentDay: Number(e.target.value) || 1 })} className={inp} />
                </EditRow>
                <EditRow label="Caução (€)">
                  <input type="number" defaultValue={contract.depositAmount} onBlur={(e) => setField({ depositAmount: Number(e.target.value) || 0 })} className={inp} />
                </EditRow>
                <EditRow label="Início">
                  <input type="date" defaultValue={contract.startDate} onBlur={(e) => setField({ startDate: e.target.value })} className={inp} />
                </EditRow>
                <EditRow label="Fim">
                  <input type="date" defaultValue={contract.endDate} onBlur={(e) => setField({ endDate: e.target.value })} className={inp} />
                </EditRow>
                <label className="flex items-center justify-between pt-1">
                  <span className="text-sm text-muted">Renovação automática</span>
                  <button type="button" onClick={() => setField({ autoRenewal: !contract.autoRenewal })} className={cn("inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors", contract.autoRenewal ? "bg-primary" : "bg-line")}>
                    <span className={cn("h-4 w-4 rounded-full bg-white transition-transform", contract.autoRenewal && "translate-x-4")} />
                  </button>
                </label>
                <label className="block pt-1">
                  <span className="mb-1 block text-xs font-medium text-muted">Notas</span>
                  <textarea defaultValue={contract.notas ?? ""} onBlur={(e) => setField({ notas: e.target.value })} rows={2} className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-secondary" />
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Duração */}
          {se !== "terminated" && se !== "expired" && (
            <Card>
              <CardContent>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-secondary">Duração</p>
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>{dataPTShort(contract.startDate)}</span>
                  <span>{dias !== null && dias >= 0 ? `faltam ${dias}d` : "—"}</span>
                  <span>{dataPTShort(contract.endDate)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(progressoTemporal(contract) * 100)}%` }} />
                </div>
                {proximasAcoes(contract).length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {proximasAcoes(contract).map((a, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Clock size={13} className={a.tom === "danger" ? "text-danger" : a.tom === "warning" ? "text-warning" : "text-secondary"} />
                        <span className="flex-1 text-ink">{a.label}</span>
                        <span className="text-xs text-muted">{dataPTShort(a.dataIso)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {/* Aditamentos */}
          <Card>
            <CardContent>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-secondary">Aditamentos</p>
              {aditamentos.length === 0 ? (
                <p className="text-sm text-muted">Sem aditamentos. Use “Aditamento” no topo para carregar um documento adicional.</p>
              ) : (
                <ul className="space-y-2">
                  {aditamentos.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 rounded-lg border border-line/70 bg-bg/30 p-2.5 text-sm">
                      {d.mimeType.startsWith("image/") ? <ImageIcon size={15} className="text-secondary" /> : <FileText size={15} className="text-secondary" />}
                      <span className="flex-1 truncate text-ink">{d.nome}</span>
                      <span className="text-xs text-muted">{dataPTShort(d.uploadedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Pagamentos */}
          <PagamentosPanel propertyId={contract.propertyId} />
        </div>
      </div>

      {lightbox && ehImagem && <Lightbox fotos={[{ url: contract.pdfUrl!, legenda: contract.fileName }]} onClose={() => setLightbox(false)} />}
    </div>
  );
}

function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-muted">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function PagamentosPanel({ propertyId }: { propertyId?: string }) {
  const transactions = useTransactionsStore((s) => s.transactions);
  const pagamentos = transactions
    .filter((t) => t.propertyId === propertyId && t.tipo === "receita" && t.categoria === "Renda")
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .slice(0, 6);
  return (
    <Card>
      <CardContent>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-secondary">Pagamentos (Contabilidade)</p>
        {!propertyId || pagamentos.length === 0 ? (
          <p className="text-sm text-muted">Sem pagamentos registados.</p>
        ) : (
          <ul className="space-y-1.5">
            {pagamentos.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-muted">{dataPTShort(p.data)}</span>
                <span className="num text-ink">{eur(p.valor)}</span>
                <Badge tone="success">Pago</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
