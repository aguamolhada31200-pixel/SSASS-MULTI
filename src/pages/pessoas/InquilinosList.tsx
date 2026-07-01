import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users2,
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  User,
  GraduationCap,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useExampleData } from "@/store/useExampleData";
import { useModalStore } from "@/store/useModalStore";
import {
  useTenantsStore,
  STATUS_LABEL,
  TIPO_LABEL,
  urgenciaContrato,
  diasAteFim,
  type StatusInquilino,
  type Tenant,
  type TipoInquilino,
  type UrgenciaContrato,
} from "@/store/useTenantsStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { eur, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

type VistaMode = "lista" | "cards";

export default function InquilinosList() {
  const { enabled } = useExampleData();
  const tenants = useTenantsStore((s) => s.tenants);
  const properties = usePropertiesStore((s) => s.properties);
  const openTenantForm = useModalStore((s) => s.openTenantForm);

  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"todos" | TipoInquilino>("todos");
  const [status, setStatus] = useState<"todos" | StatusInquilino>("todos");
  const [propertyId, setPropertyId] = useState<"todos" | string>("todos");
  const [vista, setVista] = useState<VistaMode>("lista");

  const list = enabled ? tenants : [];

  const filtered = useMemo(() => {
    const qLow = q.trim().toLowerCase();
    return list
      .filter((t) => tipo === "todos" || t.tipoInquilino === tipo)
      .filter((t) => status === "todos" || t.status === status)
      .filter((t) => propertyId === "todos" || t.propertyId === propertyId)
      .filter((t) => {
        if (!qLow) return true;
        return (
          t.nomeCompleto.toLowerCase().includes(qLow) ||
          t.email.toLowerCase().includes(qLow) ||
          t.nif.toLowerCase().includes(qLow)
        );
      })
      .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
  }, [list, tipo, status, propertyId, q]);

  // KPIs
  const total = list.length;
  const ativos = list.filter((t) => t.status === "ativo").length;
  const aExpirar = list.filter((t) => {
    const u = urgenciaContrato(t.dataFimContrato);
    return u === "urgente" || u === "proximo";
  }).length;
  const semContrato = list.filter((t) => t.status === "sem_contrato").length;

  const propertyMap = new Map(properties.map((p) => [p.id, p]));

  return (
    <>
      <PageHeader
        title="Inquilinos"
        subtitle={enabled ? `${total} inquilinos na sua carteira` : "Gestão de inquilinos · regulares e estudantes"}
        showExampleToggle
        actions={
          <Button onClick={() => openTenantForm()}>
            <Plus size={16} /> Novo inquilino
          </Button>
        }
      />

      {!enabled ? (
        <EmptyState
          icon={Users2}
          title="Ainda não tem inquilinos"
          description="Adicione o primeiro inquilino para começar a gerir contratos, rendas e documentos."
          ctaLabel="+ Adicionar primeiro inquilino"
          onCta={() => openTenantForm()}
        />
      ) : (
        <>
          {/* KPIs */}
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total" value={String(total)} icon={Users2} iconTone="default" />
            <StatCard label="Ativos" value={String(ativos)} hint={`${total > 0 ? Math.round((ativos / total) * 100) : 0}% do total`} hintTone="success" icon={User} iconTone="success" />
            <StatCard label="A expirar (90d)" value={String(aExpirar)} hint={aExpirar > 0 ? "Renovar em breve" : "Sem urgências"} hintTone={aExpirar > 0 ? "warning" : "success"} icon={GraduationCap} iconTone="warning" />
            <StatCard label="Sem contrato" value={String(semContrato)} hint={semContrato > 0 ? "Pré-reservas / pendentes" : "Todos contratados"} hintTone={semContrato > 0 ? "warning" : "success"} icon={Users2} iconTone="default" />
          </div>

          {/* Filtros */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3">
              <Search size={15} className="text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar nome, email ou NIF…"
                className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted sm:w-56"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Chip ativo={tipo === "todos"} onClick={() => setTipo("todos")}>Todos</Chip>
              <Chip ativo={tipo === "regular"} onClick={() => setTipo("regular")}>Regular</Chip>
              <Chip ativo={tipo === "estudante"} onClick={() => setTipo("estudante")}>Estudante</Chip>
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="h-9 rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary"
            >
              <option value="todos">Status: Todos</option>
              <option value="ativo">Ativo</option>
              <option value="expirado">Expirado</option>
              <option value="sem_contrato">Sem contrato</option>
            </select>

            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="h-9 rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary"
            >
              <option value="todos">Imóvel: Todos</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <div className="ml-auto inline-flex rounded-lg border border-line bg-card p-0.5">
              <button
                onClick={() => setVista("lista")}
                className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", vista === "lista" ? "bg-primary text-white" : "text-muted")}
              >
                <ListIcon size={14} /> Lista
              </button>
              <button
                onClick={() => setVista("cards")}
                className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", vista === "cards" ? "bg-primary text-white" : "text-muted")}
              >
                <LayoutGrid size={14} /> Cards
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center text-sm text-muted">
              Nenhum inquilino corresponde aos filtros.
            </p>
          ) : vista === "lista" ? (
            <TenantsTable tenants={filtered} propertyMap={propertyMap} />
          ) : (
            <TenantsCards tenants={filtered} propertyMap={propertyMap} />
          )}
        </>
      )}
    </>
  );
}

// ───────────────────────── Chip ─────────────────────────

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm transition-colors",
        ativo ? "bg-primary text-white" : "border border-line bg-card text-muted hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

// ───────────────────────── Table ─────────────────────────

function TenantsTable({
  tenants,
  propertyMap,
}: {
  tenants: Tenant[];
  propertyMap: Map<string, { id: string; name: string; city: string }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-bg/40 text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">Inquilino</th>
              <th className="px-4 py-2.5 text-left font-semibold">NIF</th>
              <th className="px-4 py-2.5 text-left font-semibold">Imóvel</th>
              <th className="px-4 py-2.5 text-left font-semibold">Tipo</th>
              <th className="px-4 py-2.5 text-right font-semibold">Renda</th>
              <th className="px-4 py-2.5 text-left font-semibold">Fim do contrato</th>
              <th className="px-4 py-2.5 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => {
              const prop = t.propertyId ? propertyMap.get(t.propertyId) : null;
              return (
                <tr key={t.id} className="cursor-pointer border-t border-line/40 transition-colors hover:bg-bg/40">
                  <td className="px-4 py-3">
                    <Link to={`/pessoas/inquilinos/${t.id}`} className="flex items-center gap-3">
                      <Avatar tenant={t} size={36} />
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{t.nomeCompleto}</p>
                        <p className="text-[11px] text-muted">{t.email}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="num px-4 py-3 text-xs text-muted">{t.nif}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {prop ? `${prop.name} · ${prop.city}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <TipoBadge tipo={t.tipoInquilino} />
                  </td>
                  <td className="num px-4 py-3 text-right font-semibold text-ink">
                    {t.rendaMensal ? eur(t.rendaMensal) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <FimContratoCell dataFim={t.dataFimContrato} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────────────────── Cards ─────────────────────────

function TenantsCards({
  tenants,
  propertyMap,
}: {
  tenants: Tenant[];
  propertyMap: Map<string, { id: string; name: string; city: string }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tenants.map((t) => {
        const prop = t.propertyId ? propertyMap.get(t.propertyId) : null;
        return (
          <Link
            key={t.id}
            to={`/pessoas/inquilinos/${t.id}`}
            className="group overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-3 p-4">
              <Avatar tenant={t} size={52} />
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base font-semibold text-ink">{t.nomeCompleto}</h3>
                <p className="truncate text-xs text-muted">{prop ? `${prop.name} · ${prop.city}` : "Sem imóvel associado"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <TipoBadge tipo={t.tipoInquilino} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-line/40 px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted">Renda mensal</p>
                <p className="num text-base font-bold text-primary">{t.rendaMensal ? eur(t.rendaMensal) : "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted">Fim contrato</p>
                <FimContratoCell dataFim={t.dataFimContrato} compact />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ───────────────────────── Badges + Cells ─────────────────────────

function Avatar({ tenant, size = 40 }: { tenant: Tenant; size?: number }) {
  const initials = tenant.nomeCompleto.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="flex shrink-0 overflow-hidden rounded-full"
      style={{ width: size, height: size }}
    >
      {tenant.fotoUrl ? (
        <img src={tenant.fotoUrl} alt={tenant.nomeCompleto} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-secondary text-xs font-semibold text-white">
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

const URGENCIA_COLOR: Record<UrgenciaContrato, string> = {
  expirado: "text-danger",
  urgente: "text-danger",
  proximo: "text-warning",
  calmo: "text-muted",
  sem: "text-muted",
};

function FimContratoCell({ dataFim, compact = false }: { dataFim?: string; compact?: boolean }) {
  const u = urgenciaContrato(dataFim);
  const dias = diasAteFim(dataFim);
  if (!dataFim) {
    return <span className="text-xs text-muted">—</span>;
  }
  const cor = URGENCIA_COLOR[u];
  const sub =
    u === "expirado" && dias !== null
      ? `há ${Math.abs(dias)} dias`
      : u === "urgente" && dias !== null
        ? `em ${dias} dias`
        : u === "proximo" && dias !== null
          ? `em ${dias} dias`
          : dias !== null
            ? `${dias} dias`
            : "";
  return (
    <div className="flex flex-col">
      <span className={cn("num text-xs font-semibold", cor)}>{dataPT(dataFim)}</span>
      {!compact && sub && <span className={cn("text-[10px]", cor)}>{sub}</span>}
    </div>
  );
}
