import { Badge } from "@/components/ui/Badge";
import { useTenantsStore, type Tenant } from "@/store/useTenantsStore";
import {
  estadoEfetivo,
  diasAteFim,
  ESTADO_LABEL,
  TIPO_LABEL,
  type Arrendamento,
  type ArrendamentoEstado,
  type ArrendamentoTipo,
} from "@/store/useArrendamentosStore";
import { dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

export const estadoTone: Record<ArrendamentoEstado, "success" | "warning" | "danger" | "neutral"> = {
  ativo: "success",
  a_expirar: "warning",
  expirado: "danger",
  terminado: "neutral",
};

/** Badge do estado do arrendamento (deriva das datas; rascunho tem selo próprio). */
export function EstadoBadge({ a }: { a: Arrendamento }) {
  if (a.rascunho) return <Badge tone="neutral">Rascunho</Badge>;
  const e = estadoEfetivo(a);
  return <Badge tone={estadoTone[e]}>{ESTADO_LABEL[e]}</Badge>;
}

export function TipoBadge({ tipo }: { tipo: ArrendamentoTipo }) {
  return <Badge tone="info">{TIPO_LABEL[tipo]}</Badge>;
}

/** Iniciais / foto de um inquilino. */
function AvatarCircle({ tenant, size = 30 }: { tenant: Tenant; size?: number }) {
  const initials = tenant.nomeCompleto
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-secondary text-[10px] font-semibold text-white"
      style={{ width: size, height: size }}
      title={tenant.nomeCompleto}
    >
      {tenant.fotoUrl ? (
        <img src={tenant.fotoUrl} alt={tenant.nomeCompleto} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

/** Avatares empilhados dos inquilinos de um arrendamento + nomes (opcional). */
export function InquilinoAvatares({
  tenantIds,
  size = 30,
  showNames = false,
}: {
  tenantIds: string[];
  size?: number;
  showNames?: boolean;
}) {
  const tenants = useTenantsStore((s) => s.tenants);
  const found = tenantIds.map((id) => tenants.find((t) => t.id === id)).filter(Boolean) as Tenant[];

  if (found.length === 0) return <span className="text-xs text-muted">Sem inquilino</span>;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {found.slice(0, 3).map((t) => (
          <AvatarCircle key={t.id} tenant={t} size={size} />
        ))}
        {found.length > 3 && (
          <div
            className="flex shrink-0 items-center justify-center rounded-full border-2 border-card bg-accent text-[10px] font-semibold text-muted"
            style={{ width: size, height: size }}
          >
            +{found.length - 3}
          </div>
        )}
      </div>
      {showNames && (
        <span className="truncate text-sm text-ink">
          {found.map((t) => t.nomeCompleto).join(", ")}
        </span>
      )}
    </div>
  );
}

/** Data de fim com urgência (vermelho <30d, âmbar 30-90d — a cor já comunica). */
export function FimInline({ dataFim, terminado }: { dataFim?: string; terminado?: boolean }) {
  if (!dataFim) return <span className="text-xs text-muted">Sem termo</span>;
  const dias = diasAteFim(dataFim);
  if (terminado) return <span className="num text-xs text-muted">{dataPT(dataFim)}</span>;
  const cor =
    dias === null ? "text-muted" : dias < 0 ? "text-danger" : dias < 30 ? "text-danger" : dias < 90 ? "text-warning" : "text-muted";
  const sufixo = dias === null ? "" : dias < 0 ? ` · há ${Math.abs(dias)}d` : ` · em ${dias}d`;
  return (
    <span className={cn("num text-xs font-semibold", cor)}>
      {dataPT(dataFim)}
      <span className="font-normal">{sufixo}</span>
    </span>
  );
}
