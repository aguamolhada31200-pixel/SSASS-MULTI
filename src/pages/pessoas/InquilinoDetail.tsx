import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  User,
  GraduationCap,
  FileText,
  Upload,
  Download,
  Eye,
  X,
  FileSignature,
  Receipt,
  History as HistoryIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { useTenantsStore, STATUS_LABEL, TIPO_LABEL, urgenciaContrato, diasAteFim, type StatusInquilino, type TipoInquilino } from "@/store/useTenantsStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useContractsStore } from "@/store/useContractsStore";
import { useArrendamentosStore, rendaRecorrente } from "@/store/useArrendamentosStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { useModalStore } from "@/store/useModalStore";
import { EstadoBadge } from "@/components/arrendamentos/shared";
import { eur, dataPT } from "@/lib/format";
import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = ["Perfil", "Contratos", "Pagamentos", "Documentos", "Histórico"] as const;
type Tab = (typeof TABS)[number];

export default function InquilinoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tenant = useTenantsStore((s) => s.tenants.find((t) => t.id === id));
  const remove = useTenantsStore((s) => s.remove);
  const openTenantForm = useModalStore((s) => s.openTenantForm);
  const [tab, setTab] = useState<Tab>("Perfil");

  if (!tenant) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Inquilino não encontrado.</p>
        <Link to="/pessoas/inquilinos" className="mt-2 inline-block text-secondary hover:underline">
          ← Voltar à lista
        </Link>
      </div>
    );
  }

  const onDelete = () => {
    if (!confirm(`Eliminar "${tenant.nomeCompleto}"? Esta ação não pode ser anulada.`)) return;
    remove(tenant.id);
    toast.success("Inquilino eliminado");
    navigate("/pessoas/inquilinos");
  };

  return (
    <>
      <Link to="/pessoas/inquilinos" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Inquilinos
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <Avatar tenant={tenant} size={72} />
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <TipoBadge tipo={tenant.tipoInquilino} />
                  <StatusBadge status={tenant.status} />
                </div>
                <h1 className="font-display text-2xl font-bold text-ink">{tenant.nomeCompleto}</h1>
                <p className="text-sm text-muted">{tenant.email} · {tenant.telefone}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => openTenantForm(tenant.id)}>
                <Pencil size={14} /> Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={onDelete} className="text-danger hover:bg-danger/10">
                <Trash2 size={14} /> Eliminar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
              tab === t ? "border-primary font-medium text-primary" : "border-transparent text-muted hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "Perfil" && <PerfilTab tenantId={tenant.id} />}
        {tab === "Contratos" && <ContratosTab tenantId={tenant.id} />}
        {tab === "Pagamentos" && <PagamentosTab tenantId={tenant.id} />}
        {tab === "Documentos" && <DocumentosTab tenantId={tenant.id} />}
        {tab === "Histórico" && <HistoricoTab tenantId={tenant.id} />}
      </div>
    </>
  );
}

// ───────────────────────── Perfil ─────────────────────────

function PerfilTab({ tenantId }: { tenantId: string }) {
  const tenant = useTenantsStore((s) => s.tenants.find((t) => t.id === tenantId))!;
  const property = usePropertiesStore((s) =>
    tenant.propertyId ? s.properties.find((p) => p.id === tenant.propertyId) : undefined
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent>
          <SectionHeader title="Dados pessoais" />
          <Info label="Nome completo" value={tenant.nomeCompleto} />
          <Info label="NIF" value={tenant.nif} mono />
          <Info label="Email" value={tenant.email} />
          <Info label="Telefone" value={tenant.telefone} />
          <Info label="Nacionalidade" value={tenant.nacionalidade} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <SectionHeader title="Documento de identificação" />
          <Info label="Tipo" value={tenant.docIdentificacao.tipo} />
          <Info label="Número" value={tenant.docIdentificacao.numero} mono />
          <Info label="Validade" value={dataPT(tenant.docIdentificacao.validade)} mono />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <SectionHeader title={tenant.tipoInquilino === "estudante" ? "Situação académica" : "Situação financeira"} />
          {tenant.tipoInquilino === "regular" ? (
            <>
              <Info label="Entidade patronal" value={tenant.entidadePatronal} />
              <Info label="Rendimento mensal" value={eur(tenant.rendimentoMensal)} mono />
            </>
          ) : (
            <>
              <Info label="Universidade" value={tenant.universidade ?? "—"} />
              <Info label="Curso" value={tenant.curso ?? "—"} />
              <Info label="Ano letivo" value={tenant.anoLetivo ?? "—"} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <SectionHeader title="Associação" />
          {property ? (
            <>
              <Info
                label="Imóvel"
                value={
                  <Link to={`/imoveis/${property.id}`} className="text-primary hover:underline">
                    {property.name} · {property.city}
                  </Link>
                }
              />
              {tenant.rendaMensal ? <Info label="Renda mensal" value={eur(tenant.rendaMensal)} mono /> : null}
              {tenant.dataInicioContrato && <Info label="Início" value={dataPT(tenant.dataInicioContrato)} mono />}
              {tenant.dataFimContrato && <Info label="Fim" value={dataPT(tenant.dataFimContrato)} mono />}
            </>
          ) : (
            <p className="text-sm text-muted">Sem imóvel associado.</p>
          )}
          {tenant.notas && (
            <div className="mt-3 rounded-lg border border-line/60 bg-bg/40 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Notas</p>
              <p className="text-sm text-ink">{tenant.notas}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────────────── Contratos ─────────────────────────

function ContratosTab({ tenantId }: { tenantId: string }) {
  const tenant = useTenantsStore((s) => s.tenants.find((t) => t.id === tenantId))!;
  const property = usePropertiesStore((s) =>
    tenant.propertyId ? s.properties.find((p) => p.id === tenant.propertyId) : undefined
  );
  const contract = useContractsStore((s) => s.contracts.find((c) => c.primaryTenantId === tenantId));
  const arrendamentos = useArrendamentosStore((s) => s.arrendamentos.filter((a) => a.inquilinos.includes(tenantId)));
  const openContractDoc = useModalStore((s) => s.openContractDoc);

  if (arrendamentos.length === 0 && !contract && !tenant.contractId && !tenant.dataInicioContrato) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted">
          <FileSignature size={28} className="mx-auto mb-2" />
          <p className="text-sm">Este inquilino ainda não tem contrato associado.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => openContractDoc({ initialTenantId: tenantId, initialPropertyId: tenant.propertyId ?? null })}>
            <Upload size={14} /> Carregar documento de contrato
          </Button>
        </CardContent>
      </Card>
    );
  }

  const u = urgenciaContrato(tenant.dataFimContrato);

  return (
    <div className="space-y-4">
      {arrendamentos.length > 0 && (
        <Card>
          <CardContent>
            <SectionHeader title="Arrendamentos" />
            <div className="space-y-2">
              {arrendamentos.map((a) => (
                <Link
                  key={a.id}
                  to={`/imoveis/arrendamentos/${a.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg/40 p-3 transition-colors hover:bg-accent/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                      <KeyRound size={16} className="text-secondary" />
                    </span>
                    <div className="min-w-0">
                      <p className="num truncate text-sm font-medium text-ink">{a.identificador}</p>
                      <p className="text-[11px] text-muted">
                        {a.dataInicio ? dataPT(a.dataInicio) : "—"}{a.dataFim ? ` → ${dataPT(a.dataFim)}` : " · sem termo"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="num text-sm font-bold text-primary">{eur(rendaRecorrente(a))}</span>
                    <EstadoBadge a={a} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(contract || tenant.contractId || tenant.dataInicioContrato) && (
      <Card>
      <CardContent>
        <SectionHeader title="Contratos associados" />
        <div className="rounded-2xl border border-line p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-base font-semibold text-ink">
                Contrato {tenant.contractId ?? "—"}
              </p>
              {property && (
                <p className="text-xs text-muted">{property.name} · {property.city}</p>
              )}
            </div>
            <StatusBadge status={tenant.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini label="Início" value={tenant.dataInicioContrato ? dataPT(tenant.dataInicioContrato) : "—"} />
            <Mini label="Fim" value={tenant.dataFimContrato ? dataPT(tenant.dataFimContrato) : "—"} />
            <Mini label="Renda" value={tenant.rendaMensal ? eur(tenant.rendaMensal) : "—"} />
            <Mini
              label="Estado prazo"
              value={
                u === "expirado" ? "Expirado"
                  : u === "urgente" ? "Urgente"
                  : u === "proximo" ? "Próximo"
                  : u === "calmo" ? "OK"
                  : "—"
              }
              tone={u === "expirado" || u === "urgente" ? "danger" : u === "proximo" ? "warning" : "default"}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {contract ? (
              <Link to={`/contratos/${contract.id}`}>
                <Button variant="outline" size="sm">
                  <FileSignature size={14} /> Ver contrato →
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" onClick={() => openContractDoc({ initialTenantId: tenantId, initialPropertyId: tenant.propertyId ?? null })}>
                <Upload size={14} /> Carregar documento de contrato
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
      )}
    </div>
  );
}

// ───────────────────────── Pagamentos ─────────────────────────

type PagamentoEstado = "pago" | "pendente" | "atrasado";

function PagamentosTab({ tenantId }: { tenantId: string }) {
  const tenant = useTenantsStore((s) => s.tenants.find((t) => t.id === tenantId))!;
  const transactions = useTransactionsStore((s) => s.transactions);

  const pagamentos = useMemo(() => {
    if (!tenant.propertyId) return [];
    const rendaEsperada = tenant.rendaMensal ?? 0;
    const txs = transactions.filter(
      (t) => t.tipo === "receita" && t.categoria === "Renda" && t.propertyId === tenant.propertyId
    );
    return txs.map((t) => {
      const data = new Date(`${t.data}T00:00:00`);
      const mesLabel = data.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
      const estado: PagamentoEstado =
        rendaEsperada > 0 && t.valor < rendaEsperada * 0.95
          ? "atrasado"
          : "pago";
      return {
        id: t.id,
        mes: mesLabel,
        data: t.data,
        valor: t.valor,
        estado,
      };
    }).sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [transactions, tenant]);

  const ytd = pagamentos
    .filter((p) => new Date(p.data).getFullYear() === new Date().getFullYear())
    .reduce((s, p) => s + p.valor, 0);

  if (!tenant.propertyId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted">
          <Receipt size={28} className="mx-auto mb-2" />
          <p className="text-sm">Sem imóvel associado — não há pagamentos para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Total pago YTD" value={eur(ytd)} tone="success" icon={<CheckCircle2 size={16} />} />
        <KpiCard label="Pagamentos registados" value={String(pagamentos.length)} tone="info" icon={<Receipt size={16} />} />
        <KpiCard label="Em atraso" value={String(pagamentos.filter((p) => p.estado === "atrasado").length)} tone="danger" icon={<AlertTriangle size={16} />} />
      </div>

      <Card>
        <CardContent className="p-0">
          {pagamentos.length === 0 ? (
            <div className="py-12 text-center text-muted">
              <Receipt size={28} className="mx-auto mb-2" />
              <p className="text-sm">Sem pagamentos registados.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-bg/40 text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Mês</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Data</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Valor</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagamentos.map((p) => (
                  <tr key={p.id} className="border-t border-line/40">
                    <td className="px-4 py-3 text-sm capitalize">{p.mes}</td>
                    <td className="num px-4 py-3 text-xs text-muted">{dataPT(p.data)}</td>
                    <td className="num px-4 py-3 text-right font-semibold text-ink">{eur(p.valor)}</td>
                    <td className="px-4 py-3">
                      <PagamentoBadge estado={p.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PagamentoBadge({ estado }: { estado: PagamentoEstado }) {
  const map: Record<PagamentoEstado, { tone: "success" | "warning" | "danger"; label: string }> = {
    pago: { tone: "success", label: "Pago" },
    pendente: { tone: "warning", label: "Pendente" },
    atrasado: { tone: "danger", label: "Atrasado" },
  };
  return <Badge tone={map[estado].tone}>{map[estado].label}</Badge>;
}

// ───────────────────────── Documentos ─────────────────────────

interface DocumentoLocal {
  id: string;
  nome: string;
  url: string;
  ts: string;
}

function DocumentosTab({ tenantId }: { tenantId: string }) {
  const [docs, setDocs] = useState<DocumentoLocal[]>([]);
  const [url, setUrl] = useState("");
  const [nome, setNome] = useState("");

  const add = () => {
    if (!nome.trim() || !url.trim()) {
      toast.error("Indique nome e URL/ficheiro do documento");
      return;
    }
    setDocs((d) => [
      { id: `doc-${Date.now()}`, nome: nome.trim(), url: url.trim(), ts: new Date().toISOString().slice(0, 10) },
      ...d,
    ]);
    setNome("");
    setUrl("");
    toast.success("Documento adicionado");
  };

  const onFile = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      setDocs((d) => [
        { id: `doc-${Date.now()}`, nome: file.name, url: String(r.result), ts: new Date().toISOString().slice(0, 10) },
        ...d,
      ]);
      toast.success("Documento carregado");
    };
    r.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <SectionHeader title="Adicionar documento" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome (ex.: Cópia do CC)"
              className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary"
            />
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL ou cole link…"
                className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary"
              />
              <label className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg border border-line bg-card px-3 text-sm text-muted hover:bg-accent">
                <Upload size={14} />
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={add}>
              <FileText size={14} /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <SectionHeader title="Documentos guardados" />
          {docs.length === 0 ? (
            <p className="text-sm text-muted">Sem documentos.</p>
          ) : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-lg border border-line/60 bg-bg/40 p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                      <FileText size={16} className="text-secondary" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink">{d.nome}</p>
                      <p className="text-[11px] text-muted">{dataPT(d.ts)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={d.url} target="_blank" rel="noreferrer" className="rounded p-1 text-muted hover:text-ink">
                      <Eye size={14} />
                    </a>
                    <a href={d.url} download={d.nome} className="rounded p-1 text-muted hover:text-ink">
                      <Download size={14} />
                    </a>
                    <button
                      onClick={() => setDocs((cur) => cur.filter((x) => x.id !== d.id))}
                      className="rounded p-1 text-muted hover:text-danger"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted">
            * Documentos são guardados localmente nesta sessão. Persistência real vem com Supabase Storage.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────────────── Histórico ─────────────────────────

function HistoricoTab({ tenantId }: { tenantId: string }) {
  const tenant = useTenantsStore((s) => s.tenants.find((t) => t.id === tenantId))!;
  const transactions = useTransactionsStore((s) => s.transactions);

  const eventos = useMemo(() => {
    const arr: { ts: string; titulo: string; descricao: string; icon: React.ReactNode; cor: string }[] = [];

    arr.push({
      ts: tenant.createdAt,
      titulo: "Inquilino registado",
      descricao: `${tenant.nomeCompleto} foi adicionado à plataforma.`,
      icon: <Sparkles size={14} />,
      cor: "bg-gold/15 text-gold-dark",
    });

    if (tenant.dataInicioContrato) {
      arr.push({
        ts: `${tenant.dataInicioContrato}T08:00:00.000Z`,
        titulo: "Contrato iniciado",
        descricao: tenant.rendaMensal ? `Renda mensal ${eur(tenant.rendaMensal)}.` : "Início do contrato.",
        icon: <FileSignature size={14} />,
        cor: "bg-success/12 text-success",
      });
    }
    if (tenant.dataFimContrato) {
      const u = urgenciaContrato(tenant.dataFimContrato);
      arr.push({
        ts: `${tenant.dataFimContrato}T18:00:00.000Z`,
        titulo: u === "expirado" ? "Contrato expirado" : "Fim do contrato (previsto)",
        descricao: `Termina em ${dataPT(tenant.dataFimContrato)}.`,
        icon: u === "expirado" ? <AlertTriangle size={14} /> : <Clock size={14} />,
        cor: u === "expirado" ? "bg-danger/12 text-danger" : "bg-warning/15 text-warning",
      });
    }

    // Pagamentos como eventos
    if (tenant.propertyId) {
      const pagamentos = transactions.filter(
        (t) => t.tipo === "receita" && t.categoria === "Renda" && t.propertyId === tenant.propertyId
      );
      for (const p of pagamentos) {
        arr.push({
          ts: `${p.data}T09:00:00.000Z`,
          titulo: "Pagamento recebido",
          descricao: `${eur(p.valor)} · ${p.descricao}`,
          icon: <Receipt size={14} />,
          cor: "bg-secondary/15 text-secondary",
        });
      }
    }

    return arr.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  }, [tenant, transactions]);

  return (
    <Card>
      <CardContent>
        <SectionHeader title="Timeline" />
        {eventos.length === 0 ? (
          <p className="text-sm text-muted">Sem eventos registados.</p>
        ) : (
          <ol className="relative space-y-3 border-l border-line/60 pl-5">
            {eventos.map((e, i) => (
              <li key={i} className="relative">
                <span
                  className={cn(
                    "absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full",
                    e.cor
                  )}
                >
                  {e.icon}
                </span>
                <p className="text-sm font-medium text-ink">{e.titulo}</p>
                <p className="text-xs text-muted">{e.descricao}</p>
                <p className="num mt-0.5 text-[11px] text-muted">{dataPT(e.ts.slice(0, 10))}</p>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 flex items-center gap-2 text-[11px] text-muted">
          <HistoryIcon size={12} /> Eventos derivados do estado atual + pagamentos do imóvel associado.
        </p>
      </CardContent>
    </Card>
  );
}

// ───────────────────────── Comuns ─────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-widest text-secondary">
      <span className="h-1.5 w-1.5 rounded-full bg-gold" />
      {title}
    </h3>
  );
}

function Info({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between border-b border-line/40 py-2 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className={cn("text-sm font-medium text-ink", mono && "num")}>{value}</span>
    </div>
  );
}

function Mini({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "danger" | "warning" }) {
  const color = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink";
  return (
    <div className="rounded-lg border border-line/60 bg-bg/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={cn("num mt-1 text-sm font-bold", color)}>{value}</p>
    </div>
  );
}

function KpiCard({ label, value, tone, icon }: { label: string; value: string; tone: "success" | "info" | "danger"; icon: React.ReactNode }) {
  const map = {
    success: "bg-success/12 text-success",
    info: "bg-secondary/12 text-secondary",
    danger: "bg-danger/12 text-danger",
  } as const;
  return (
    <div className="flex items-start justify-between rounded-xl border border-line bg-card p-4 shadow-sm">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
        <p className="num mt-1 text-2xl font-bold text-ink">{value}</p>
      </div>
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", map[tone])}>{icon}</span>
    </div>
  );
}

function Avatar({ tenant, size = 40 }: { tenant: { nomeCompleto: string; fotoUrl?: string }; size?: number }) {
  const initials = tenant.nomeCompleto.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex shrink-0 overflow-hidden rounded-full" style={{ width: size, height: size }}>
      {tenant.fotoUrl ? (
        <img src={tenant.fotoUrl} alt={tenant.nomeCompleto} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-secondary text-base font-semibold text-white">
          {initials}
        </div>
      )}
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: TipoInquilino }) {
  return (
    <Badge tone={tipo === "estudante" ? "gold" : "info"}>
      {tipo === "estudante" ? <GraduationCap size={11} /> : <User size={11} />}
      {TIPO_LABEL[tipo]}
    </Badge>
  );
}

function StatusBadge({ status }: { status: StatusInquilino }) {
  const map: Record<StatusInquilino, "success" | "danger" | "warning"> = {
    ativo: "success",
    expirado: "danger",
    sem_contrato: "warning",
  };
  return <Badge tone={map[status]}>{STATUS_LABEL[status]}</Badge>;
}
