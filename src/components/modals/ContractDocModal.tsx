import { useEffect, useState } from "react";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { useNavigate } from "react-router-dom";
import { X, Upload, FileText, Image as ImageIcon, UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import {
  useContractsStore,
  TIPO_OPCOES,
  TIPO_LABEL,
  type ContractTipo,
  type ContractStatus,
} from "@/store/useContractsStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useTenantsStore } from "@/store/useTenantsStore";
import { useDocumentsStore } from "@/store/useDocumentsStore";
import { cn } from "@/lib/utils";

const inp = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";
const MAX = 25 * 1024 * 1024;
const ACEITES = ".pdf,.doc,.docx,.jpg,.jpeg,.png";

const ESTADOS: { v: ContractStatus; l: string }[] = [
  { v: "active", l: "Ativo" },
  { v: "pending_signature", l: "Pendente de assinatura" },
  { v: "expired", l: "Expirado" },
  { v: "terminated", l: "Terminado" },
];

interface FicheiroCarregado {
  nome: string;
  mimeType: string;
  tamanho: number;
  dataUrl: string;
}

function monthsBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const d1 = new Date(`${a}T00:00:00`);
  const d2 = new Date(`${b}T00:00:00`);
  return Math.max(0, (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()));
}

export function ContractDocModal() {
  const { contractDocForm, closeContractDoc, openTenantForm } = useModalStore();
  const { open, editingId, initialPropertyId, initialTenantId } = contractDocForm;

  const addContract = useContractsStore((s) => s.add);
  const updateContract = useContractsStore((s) => s.update);
  const getContract = useContractsStore((s) => s.getById);
  const properties = usePropertiesStore((s) => s.properties);
  const tenants = useTenantsStore((s) => s.tenants);
  const addDoc = useDocumentsStore((s) => s.add);
  const navigate = useNavigate();

  const [tipo, setTipo] = useState<ContractTipo>("tradicional");
  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");
  const [autoRenewal, setAutoRenewal] = useState(false);
  const [monthlyRent, setRent] = useState(0);
  const [paymentDay, setDay] = useState(8);
  const [depositAmount, setDeposit] = useState(0);
  const [status, setStatus] = useState<ContractStatus>("active");
  const [notas, setNotas] = useState("");
  const [ficheiro, setFicheiro] = useState<FicheiroCarregado | null>(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingId) {
      const c = getContract(editingId);
      if (c) {
        setTipo(c.tipo);
        setPropertyId(c.propertyId ?? "");
        setTenantId(c.primaryTenantId ?? "");
        setStart(c.startDate);
        setEnd(c.endDate);
        setAutoRenewal(c.autoRenewal);
        setRent(c.monthlyRent);
        setDay(c.paymentDay);
        setDeposit(c.depositAmount);
        setStatus(c.status === "draft" || c.status === "expiring" ? "active" : c.status);
        setNotas(c.notas ?? "");
        setFicheiro(null);
        return;
      }
    }
    setTipo("tradicional");
    setPropertyId(initialPropertyId ?? "");
    setStart("");
    setEnd("");
    setAutoRenewal(false);
    setDay(8);
    setDeposit(0);
    setStatus("active");
    setNotas("");
    setFicheiro(null);
    const t = initialTenantId ? tenants.find((x) => x.id === initialTenantId) : undefined;
    setTenantId(initialTenantId ?? "");
    setRent(t?.rendaMensal ?? 0);
  }, [open, editingId, initialPropertyId, initialTenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const property = properties.find((p) => p.id === propertyId);
  const tenantsFiltrados = propertyId ? tenants.filter((t) => !t.propertyId || t.propertyId === propertyId) : tenants;

  const onFile = (file: File) => {
    if (file.size > MAX) {
      toastError("O ficheiro excede 25 MB");
      return;
    }
    const r = new FileReader();
    r.onload = () => setFicheiro({ nome: file.name, mimeType: file.type || "application/octet-stream", tamanho: file.size, dataUrl: String(r.result) });
    r.readAsDataURL(file);
  };

  const guardar = () => {
    if (!editingId && !ficheiro) {
      toastError("Carregue o documento do contrato para continuar");
      return;
    }
    const durationMonths = monthsBetween(startDate, endDate);
    const base = {
      tipo,
      status,
      propertyId: propertyId || undefined,
      primaryTenantId: tenantId || undefined,
      additionalTenants: [],
      startDate,
      endDate,
      durationMonths,
      autoRenewal,
      renewalPeriodMonths: 12,
      monthlyRent,
      paymentDay,
      annualUpdate: true,
      depositAmount,
      furnished: false,
      notas: notas.trim() || undefined,
    };

    if (editingId) {
      const patch: Record<string, unknown> = { ...base };
      if (ficheiro) {
        patch.pdfUrl = ficheiro.dataUrl;
        patch.fileName = ficheiro.nome;
      }
      updateContract(editingId, patch);
      toastSuccess("Contrato atualizado");
      closeContractDoc();
      navigate(`/contratos/${editingId}`);
      return;
    }

    const id = addContract({ ...base, pdfUrl: ficheiro!.dataUrl, fileName: ficheiro!.nome });
    const docId = addDoc({
      nome: ficheiro!.nome,
      ficheiroUrl: ficheiro!.dataUrl,
      mimeType: ficheiro!.mimeType,
      tamanho: ficheiro!.tamanho,
      categoria: "Contratos",
      uploadedAt: new Date().toISOString().slice(0, 10),
      propertyId: propertyId || undefined,
      tenantId: tenantId || undefined,
      contractId: id,
      pasta: property ? `Imóveis/${property.name}/Contratos` : undefined,
    });
    updateContract(id, { documentId: docId });
    toastSuccess("Documento de contrato guardado");
    closeContractDoc();
    navigate(`/contratos/${id}`);
  };

  const ehImagem = ficheiro?.mimeType.startsWith("image/");
  const ehPdf = ficheiro?.mimeType === "application/pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={closeContractDoc}>
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">{editingId ? "Editar documento de contrato" : "Novo documento de contrato"}</h2>
            <p className="text-xs text-muted">Carregue o contrato que assinou com o inquilino — a app organiza.</p>
          </div>
          <button onClick={closeContractDoc} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tipo (organização)">
              <select value={tipo} onChange={(e) => setTipo(e.target.value as ContractTipo)} className={inp}>
                {TIPO_OPCOES.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
            </Field>
            <Field label="Imóvel">
              <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inp} disabled={!!initialPropertyId && !editingId}>
                <option value="">— Selecionar imóvel —</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.city}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Inquilino">
            <div className="flex gap-2">
              <select value={tenantId} onChange={(e) => { setTenantId(e.target.value); const t = tenants.find((x) => x.id === e.target.value); if (t?.rendaMensal) setRent(t.rendaMensal); }} className={inp}>
                <option value="">— Selecionar inquilino —</option>
                {tenantsFiltrados.map((t) => <option key={t.id} value={t.id}>{t.nomeCompleto}</option>)}
              </select>
              <Button type="button" variant="outline" size="sm" onClick={() => openTenantForm()}><UserPlus size={14} /> Novo</Button>
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Início"><input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} className={inp} /></Field>
            <Field label="Fim"><input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} className={inp} /></Field>
            <Field label="Estado">
              <select value={status} onChange={(e) => setStatus(e.target.value as ContractStatus)} className={inp}>
                {ESTADOS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Renda mensal">
              <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
                <input type="number" value={monthlyRent || ""} onChange={(e) => setRent(Number(e.target.value) || 0)} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
                <span className="px-3 text-sm text-muted">€</span>
              </div>
            </Field>
            <Field label="Dia de pagamento">
              <select value={paymentDay} onChange={(e) => setDay(Number(e.target.value))} className={inp}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>Dia {d}</option>)}
              </select>
            </Field>
            <Field label="Caução">
              <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
                <input type="number" value={depositAmount || ""} onChange={(e) => setDeposit(Number(e.target.value) || 0)} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
                <span className="px-3 text-sm text-muted">€</span>
              </div>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <button type="button" onClick={() => setAutoRenewal((v) => !v)} className={cn("inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors", autoRenewal ? "bg-primary" : "bg-line")}>
              <span className={cn("h-4 w-4 rounded-full bg-white transition-transform", autoRenewal && "translate-x-4")} />
            </button>
            Renovação automática
          </label>

          <Field label="Notas (opcional)">
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Observações sobre o contrato…" className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-secondary" />
          </Field>

          {/* Upload */}
          <div>
            <p className="mb-1 text-xs font-medium text-muted">Documento do contrato {editingId ? "(opcional — substituir)" : ""}</p>
            {ficheiro ? (
              <div className="overflow-hidden rounded-xl border border-line">
                {ehImagem ? (
                  <img src={ficheiro.dataUrl} alt="" className="max-h-56 w-full object-cover" />
                ) : ehPdf ? (
                  <iframe title={ficheiro.nome} src={ficheiro.dataUrl} className="h-56 w-full" />
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center gap-1 text-muted"><FileText size={28} /><span className="text-xs">{ficheiro.nome}</span></div>
                )}
                <div className="flex items-center justify-between border-t border-line bg-bg/40 px-3 py-2 text-xs">
                  <span className="flex items-center gap-1.5 text-ink">{ehImagem ? <ImageIcon size={13} /> : <FileText size={13} />} {ficheiro.nome}</span>
                  <button onClick={() => setFicheiro(null)} className="text-muted hover:text-danger">Remover</button>
                </div>
              </div>
            ) : (
              <label
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
                className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-sm transition-colors", drag ? "border-primary bg-accent" : "border-line bg-bg text-muted hover:bg-accent")}
              >
                <Upload size={24} className="text-primary" />
                <span>Arrastar para aqui ou <span className="font-medium text-primary">escolher</span></span>
                <span className="text-[11px] text-muted">PDF, Word ou foto digitalizada · máx. 25 MB</span>
                <input type="file" accept={ACEITES} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
              </label>
            )}
            <p className="mt-1.5 text-[11px] text-muted">Carregue o contrato que assinou com o inquilino. Pode ser PDF, Word ou foto digitalizada.</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-4">
          <Button variant="ghost" onClick={closeContractDoc}>Cancelar</Button>
          <Button onClick={guardar}><Check size={16} /> {editingId ? "Guardar alterações" : "Guardar contrato"}</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
