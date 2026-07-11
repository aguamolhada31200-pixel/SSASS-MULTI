import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Plus, Search, Eye, Pencil, LogOut, Building2, Wallet, Percent, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useExampleData } from "@/store/useExampleData";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import {
  useArrendamentosStore,
  estadoEfetivo,
  rendaRecorrente,
  ocupaImovel,
  TIPO_LABEL,
  TIPO_OPCOES,
  type Arrendamento,
  type ArrendamentoEstado,
  type ArrendamentoTipo,
} from "@/store/useArrendamentosStore";
import { EstadoBadge, TipoBadge, InquilinoAvatares, FimInline } from "@/components/arrendamentos/shared";
import { TerminarModal } from "@/components/arrendamentos/TerminarModal";
import { eur, dataPT, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const ESTADO_FILTROS: { key: "todos" | ArrendamentoEstado; label: string }[] = [
  { key: "todos", label: "Todos os estados" },
  { key: "ativo", label: "Ativo" },
  { key: "a_expirar", label: "A expirar" },
  { key: "expirado", label: "Expirado" },
  { key: "terminado", label: "Terminado" },
];

export default function ArrendamentosList() {
  const { enabled } = useExampleData();
  const arrendamentos = useArrendamentosStore((s) => s.arrendamentos);
  const properties = usePropertiesStore((s) => s.properties);
  const navigate = useNavigate();

  const [imovelFiltro, setImovelFiltro] = useState<string>("todos");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | ArrendamentoEstado>("todos");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | ArrendamentoTipo>("todos");
  const [q, setQ] = useState("");
  const [terminar, setTerminar] = useState<Arrendamento | null>(null);

  const list = enabled ? arrendamentos : [];
  const propName = (id: string) => properties.find((p) => p.id === id)?.name ?? "Imóvel";
  const propCity = (id: string) => properties.find((p) => p.id === id)?.city ?? "";

  // ── KPIs ──
  const kpis = useMemo(() => {
    const ativos = list.filter((a) => ocupaImovel(a));
    const idsArrendados = new Set(ativos.map((a) => a.propertyId));
    const totalImoveis = enabled ? properties.length : 0;
    const arrendados = idsArrendados.size;
    const rendaTotalMensal = ativos.reduce((s, a) => s + rendaRecorrente(a), 0);
    const ocupacao = totalImoveis > 0 ? (arrendados / totalImoveis) * 100 : 0;
    const aExpirar = list.filter((a) => estadoEfetivo(a) === "a_expirar" && !a.rascunho).length;
    return { arrendados, naoArrendados: Math.max(0, totalImoveis - arrendados), rendaTotalMensal, ocupacao, aExpirar };
  }, [list, properties, enabled]);

  // ── Filtro + ordenação ──
  const filtrados = useMemo(() => {
    return list
      .filter((a) => imovelFiltro === "todos" || a.propertyId === imovelFiltro)
      .filter((a) => estadoFiltro === "todos" || estadoEfetivo(a) === estadoFiltro)
      .filter((a) => tipoFiltro === "todos" || a.tipo === tipoFiltro)
      .filter((a) => {
        if (!q.trim()) return true;
        const needle = q.toLowerCase();
        return (
          a.identificador.toLowerCase().includes(needle) ||
          propName(a.propertyId).toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => {
        // Grupo: rascunhos → ativos/a_expirar → expirados → terminados
        const grupo = (x: Arrendamento) => {
          if (x.rascunho) return 0;
          const e = estadoEfetivo(x);
          return e === "terminado" ? 3 : e === "expirado" ? 2 : 1;
        };
        const ga = grupo(a);
        const gb = grupo(b);
        if (ga !== gb) return ga - gb;
        // Dentro do grupo: fim mais próximo primeiro (ativos) / mais recente (terminados no fim)
        const fa = a.dataFim ?? "9999";
        const fb = b.dataFim ?? "9999";
        return ga >= 2 ? (fa < fb ? 1 : -1) : fa < fb ? -1 : fa > fb ? 1 : 0;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, imovelFiltro, estadoFiltro, tipoFiltro, q]);

  const imoveisComArrend = useMemo(() => {
    const ids = Array.from(new Set(list.map((a) => a.propertyId)));
    return ids.map((id) => ({ id, name: propName(id) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  return (
    <>
      <PageHeader
        title="Arrendamentos"
        subtitle={enabled ? `${list.length} arrendamento(s) registado(s)` : undefined}
        showExampleToggle
        actions={
          <Button onClick={() => navigate("/imoveis/arrendamentos/novo")}>
            <Plus size={16} /> Novo arrendamento
          </Button>
        }
      />

      {!enabled || list.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Ainda não tem arrendamentos"
          description="Crie o primeiro para começar a registar rendas, caução, atualizações e alertas de fim de contrato."
          ctaLabel="+ Novo arrendamento"
          onCta={() => navigate("/imoveis/arrendamentos/novo")}
        />
      ) : (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Arrendados / Não arrendados"
              value={`${kpis.arrendados} / ${kpis.naoArrendados}`}
              hint="imóveis da carteira"
              icon={Building2}
              iconTone="gold"
            />
            <StatCard
              label="Rendas mensais"
              value={eur(kpis.rendaTotalMensal)}
              hint="soma dos arrendamentos ativos"
              icon={Wallet}
              iconTone="success"
            />
            <StatCard
              label="Taxa de ocupação"
              value={pct(kpis.ocupacao, 0)}
              hint={`${kpis.arrendados} de ${kpis.arrendados + kpis.naoArrendados}`}
              icon={Percent}
              iconTone={kpis.ocupacao >= 66 ? "success" : "warning"}
            />
            <StatCard
              label="A expirar (90 dias)"
              value={String(kpis.aExpirar)}
              hint={kpis.aExpirar > 0 ? "requerem atenção" : "tudo em dia"}
              icon={CalendarClock}
              iconTone={kpis.aExpirar > 0 ? "warning" : "success"}
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3">
              <Search size={15} className="text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar por referência ou imóvel…"
                className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted lg:w-56"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={imovelFiltro} onChange={(e) => setImovelFiltro(e.target.value)} className={selectCls}>
                <option value="todos">Todos os imóveis</option>
                {imoveisComArrend.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value as typeof estadoFiltro)} className={selectCls}>
                {ESTADO_FILTROS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value as typeof tipoFiltro)} className={selectCls}>
                <option value="todos">Todos os tipos</option>
                {TIPO_OPCOES.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabela (desktop) */}
          <Card className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg/50 text-[11px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Imóvel</th>
                    <th className="px-4 py-3 text-left font-semibold">Inquilino(s)</th>
                    <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold">Início</th>
                    <th className="px-4 py-3 text-left font-semibold">Fim</th>
                    <th className="px-4 py-3 text-right font-semibold">Renda</th>
                    <th className="px-4 py-3 text-left font-semibold">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((a) => {
                    const term = a.estado === "terminado";
                    return (
                      <tr key={a.id} className="border-t border-line/50 hover:bg-bg/40">
                        <td className="px-4 py-3">
                          <Link to={`/imoveis/arrendamentos/${a.id}`} className="font-medium text-ink hover:text-primary">
                            {propName(a.propertyId)}
                          </Link>
                          <p className="text-[11px] text-muted">{a.identificador} · {propCity(a.propertyId)}</p>
                        </td>
                        <td className="px-4 py-3"><InquilinoAvatares tenantIds={a.inquilinos} /></td>
                        <td className="px-4 py-3"><TipoBadge tipo={a.tipo} /></td>
                        <td className="num px-4 py-3 text-xs text-muted">{a.dataInicio ? dataPT(a.dataInicio) : "—"}</td>
                        <td className="px-4 py-3"><FimInline dataFim={a.dataFim} terminado={term} /></td>
                        <td className="num px-4 py-3 text-right font-semibold text-primary">{eur(rendaRecorrente(a))}</td>
                        <td className="px-4 py-3"><EstadoBadge a={a} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/imoveis/arrendamentos/${a.id}`} className="rounded p-1.5 text-muted hover:bg-accent hover:text-ink" title="Ver">
                              <Eye size={15} />
                            </Link>
                            <Link to={`/imoveis/arrendamentos/${a.id}/editar`} className="rounded p-1.5 text-muted hover:bg-accent hover:text-ink" title="Editar">
                              <Pencil size={15} />
                            </Link>
                            {!term && (
                              <button onClick={() => setTerminar(a)} className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger" title="Terminar">
                                <LogOut size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtrados.length === 0 && (
              <p className="py-10 text-center text-sm text-muted">Nenhum arrendamento corresponde aos filtros.</p>
            )}
          </Card>

          {/* Cards (mobile) */}
          <div className="space-y-3 lg:hidden">
            {filtrados.length === 0 && (
              <p className="py-10 text-center text-sm text-muted">Nenhum arrendamento corresponde aos filtros.</p>
            )}
            {filtrados.map((a) => {
              const term = a.estado === "terminado";
              return (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/imoveis/arrendamentos/${a.id}`} className="min-w-0">
                        <p className="truncate font-display text-base font-semibold text-ink">{propName(a.propertyId)}</p>
                        <p className="text-[11px] text-muted">{a.identificador} · {propCity(a.propertyId)}</p>
                      </Link>
                      <EstadoBadge a={a} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <InquilinoAvatares tenantIds={a.inquilinos} showNames />
                      <span className="num shrink-0 text-sm font-bold text-primary">{eur(rendaRecorrente(a))}/mês</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
                      <div className="flex items-center gap-2">
                        <TipoBadge tipo={a.tipo} />
                        <FimInline dataFim={a.dataFim} terminado={term} />
                      </div>
                      <div className="flex items-center gap-1">
                        <Link to={`/imoveis/arrendamentos/${a.id}/editar`} className="rounded p-1.5 text-muted hover:bg-accent hover:text-ink" title="Editar">
                          <Pencil size={15} />
                        </Link>
                        {!term && (
                          <button onClick={() => setTerminar(a)} className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger" title="Terminar">
                            <LogOut size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {terminar && <TerminarModal arrendamento={terminar} onClose={() => setTerminar(null)} />}
    </>
  );
}

const selectCls = cn(
  "h-9 rounded-lg border border-line bg-card px-3 text-sm text-ink outline-none focus:border-secondary"
);
