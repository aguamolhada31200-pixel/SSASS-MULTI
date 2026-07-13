import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Plus, Search, MapPin, KeyRound } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useExampleData } from "@/store/useExampleData";
import { useModalStore } from "@/store/useModalStore";
import { usePropertiesStore, PROP_TYPE_LABEL, STATUS_LABEL, type PropStatus, type PropType } from "@/store/usePropertiesStore";
import { useArrendamentosStore, ocupaImovel } from "@/store/useArrendamentosStore";
import { situacaoImovel } from "@/lib/property";
import { eur, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS: { key: "todos" | PropStatus; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "ocupado", label: "Ocupados" },
  { key: "disponivel", label: "Disponíveis" },
  { key: "em_obras", label: "Em obras" },
];

const statusTone: Record<PropStatus, "success" | "warning" | "info" | "neutral"> = {
  ocupado: "success",
  disponivel: "warning",
  em_obras: "info",
  inativo: "neutral",
};

const typeGradient: Record<PropType, string> = {
  // Categoria física
  apartamento: "from-[#8B5E3C] to-[#5C3D2E]",
  moradia: "from-[#A47C5B] to-[#6B4C3B]",
  predio: "from-[#5C3D2E] to-[#2E1A0E]",
  quinta: "from-[#4A7C59] to-[#2E4A34]",
  loja: "from-[#C17E2A] to-[#7A4E1A]",
  casa: "from-[#B08560] to-[#6B4C3B]",
  casa_ferias: "from-[#E8C77E] to-[#B08A45]",
  // Modo de exploração (legado)
  tradicional: "from-[#8B5E3C] to-[#5C3D2E]",
  al: "from-[#C8A664] to-[#9B7F3F]",
  estudantes: "from-[#9B7F3F] to-[#5C3D2E]",
  comercial: "from-[#6B4C3B] to-[#2E1A0E]",
};

export default function ImoveisList() {
  const { enabled } = useExampleData();
  const properties = usePropertiesStore((s) => s.properties);
  const arrendamentos = useArrendamentosStore((s) => s.arrendamentos);
  const openPropertyForm = useModalStore((s) => s.openPropertyForm);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("todos");
  const [q, setQ] = useState("");

  const idsArrendados = new Set(arrendamentos.filter(ocupaImovel).map((a) => a.propertyId));

  const list = enabled ? properties : [];
  const filtered = list.filter(
    (p) =>
      (filter === "todos" || p.status === filter) &&
      (q === "" || p.name.toLowerCase().includes(q.toLowerCase()) || p.city.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <>
      <PageHeader
        title="Os meus imóveis"
        subtitle={enabled ? `${properties.length} imóveis registados` : undefined}
        showExampleToggle
        actions={
          <Button onClick={() => openPropertyForm()}>
            <Plus size={16} /> Adicionar imóvel
          </Button>
        }
      />

      {!enabled ? (
        <EmptyState
          icon={Building2}
          title="Ainda não tem imóveis"
          description="Adicione o seu primeiro imóvel para começar a gerir rendas, contratos e finanças."
          ctaLabel="+ Adicionar primeiro imóvel"
          onCta={() => openPropertyForm()}
        />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3">
              <Search size={15} className="text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar imóvel ou cidade…"
                className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted sm:w-56"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm transition-colors",
                    filter === f.key ? "bg-primary text-white" : "border border-line bg-card text-muted hover:bg-accent"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => {
              const s = situacaoImovel(p);
              const photo = p.photos[0]?.url;
              return (
                <Link
                  key={p.id}
                  to={`/imoveis/${p.id}`}
                  className="group overflow-hidden rounded-xl border border-line bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={cn("relative h-36 bg-gradient-to-br", typeGradient[p.type])}>
                    {photo && (
                      <img src={photo} alt={p.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    )}
                    <div className="absolute right-3 top-3">
                      <Badge tone={statusTone[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                    </div>
                    {!photo && <Building2 className="absolute bottom-3 left-3 h-7 w-7 text-white/40" />}
                    <span className="absolute bottom-3 right-3 rounded-md bg-black/30 px-2 py-0.5 text-[11px] text-white/90">
                      {PROP_TYPE_LABEL[p.type]}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-base font-semibold text-ink">{p.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <MapPin size={12} /> {p.address}, {p.city}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="num text-lg font-bold text-primary">
                          {p.rendaMensal ? `${eur(p.rendaMensal)}/mês` : "Sem renda"}
                        </p>
                        <p className="text-xs text-muted">Compra {eur(p.valorCompra)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted">Yield líq.</p>
                        <p className="num text-sm font-semibold text-ink">{pct(s.yieldAtual)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t border-line/60 pt-2.5 text-xs" style={{ color: s.cor }}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.cor }} />
                      <span className="truncate font-medium">{s.titulo}</span>
                    </div>
                    {!idsArrendados.has(p.id) && p.status !== "em_obras" && p.status !== "inativo" && (
                      <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-gold/10 px-2 py-1 text-[11px] font-medium text-gold-dark">
                        <KeyRound size={12} /> Sem arrendamento — criar →
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <p className="mt-10 text-center text-sm text-muted">Nenhum imóvel corresponde aos filtros.</p>
          )}
        </>
      )}
    </>
  );
}
