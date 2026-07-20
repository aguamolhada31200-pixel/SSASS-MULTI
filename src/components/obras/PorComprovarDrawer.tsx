import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { X, AlertTriangle, ShieldCheck, Trash2, ChevronRight, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import {
  useObrasStore,
  listaPorComprovar,
  diasDesdeRegisto,
  divisaoDe,
  podeGerir,
  DIVISAO_LABEL,
  type Despesa,
  type Obra,
} from "@/store/useObrasStore";
import { useCollabStore } from "@/store/useCollabStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { nomeProprio } from "@/components/obras/CoGestao";
import { eur, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

type Ordenar = "valor" | "antiguidade";

interface Linha {
  despesa: Despesa;
  obra: Obra;
  casaId?: string;
  casaNome: string;
  divisaoLabel: string;
  souGestor: boolean;
}

export function PorComprovarDrawer() {
  const { porComprovarDrawer, closePorComprovar, openAnexarProva } = useModalStore();
  const { open, obraId } = porComprovarDrawer;

  const despesas = useObrasStore((s) => s.despesas);
  const obras = useObrasStore((s) => s.obras);
  const removeDespesa = useObrasStore((s) => s.removeDespesa);
  const projects = useCollabStore((s) => s.projects);
  const properties = usePropertiesStore((s) => s.properties);
  const profiles = useProfilesStore((s) => s.profiles);

  const [filtroObra, setFiltroObra] = useState<string>("todas");
  const [filtroImovel, setFiltroImovel] = useState<string>("todos");
  const [ordenar, setOrdenar] = useState<Ordenar>("antiguidade");

  const linhas = useMemo<Linha[]>(() => {
    const base = listaPorComprovar(despesas).filter((d) => (obraId ? d.obraId === obraId : true));
    return base
      .map((d) => {
        const obra = obras.find((o) => o.id === d.obraId);
        if (!obra) return null;
        const project = obra.projectId ? projects.find((p) => p.id === obra.projectId) : undefined;
        const property = obra.propertyId ? properties.find((p) => p.id === obra.propertyId) : undefined;
        return {
          despesa: d,
          obra,
          casaId: obra.projectId ?? obra.propertyId ?? undefined,
          casaNome: project ? project.title : property?.name ?? "—",
          divisaoLabel: DIVISAO_LABEL[divisaoDe(obra)],
          souGestor: podeGerir(obra, CURRENT_USER_ID),
        } as Linha;
      })
      .filter((x): x is Linha => x !== null);
  }, [despesas, obras, projects, properties, obraId]);

  // Filtros dependem da lista base (só oferecemos opções que existem)
  const obrasDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    linhas.forEach((l) => map.set(l.obra.id, l.obra.titulo));
    return [...map.entries()];
  }, [linhas]);
  const imoveisDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    linhas.forEach((l) => { if (l.casaId) map.set(l.casaId, l.casaNome); });
    return [...map.entries()];
  }, [linhas]);

  const filtradas = useMemo(() => {
    let out = linhas;
    if (filtroObra !== "todas") out = out.filter((l) => l.obra.id === filtroObra);
    if (filtroImovel !== "todos") out = out.filter((l) => l.casaId === filtroImovel);
    out = [...out].sort((a, b) =>
      ordenar === "valor" ? b.despesa.valor - a.despesa.valor : diasDesdeRegisto(b.despesa) - diasDesdeRegisto(a.despesa)
    );
    return out;
  }, [linhas, filtroObra, filtroImovel, ordenar]);

  if (!open) return null;

  const total = filtradas.reduce((s, l) => s + l.despesa.valor, 0);
  const nObras = new Set(filtradas.map((l) => l.obra.id)).size;

  const eliminar = (l: Linha) => {
    if (!confirm(`Eliminar a despesa "${l.despesa.descricao}" (${eur(l.despesa.valor)})?`)) return;
    removeDespesa(l.despesa.id);
    toast.success("Despesa eliminada");
  };

  return (
    <div className="fixed inset-0 z-[55] flex justify-end bg-ink/40 backdrop-blur-sm" onMouseDown={closePorComprovar}>
      <div
        className="flex h-full w-full max-w-xl flex-col border-l border-line bg-bg shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line bg-card px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <AlertTriangle size={18} className="text-warning" /> Por comprovar
            </h2>
            <p className="num mt-0.5 text-2xl font-bold text-warning">
              {eur(total)}
              <span className="ml-2 text-sm font-medium text-muted">
                em {filtradas.length} {filtradas.length === 1 ? "despesa" : "despesas"}
                {nObras > 0 && ` · ${nObras} ${nObras === 1 ? "obra" : "obras"}`}
              </span>
            </p>
          </div>
          <button onClick={closePorComprovar} className="text-muted hover:text-ink">
            <X size={22} />
          </button>
        </div>

        {/* Filtros */}
        {linhas.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-card/60 px-5 py-3">
            {!obraId && obrasDisponiveis.length > 1 && (
              <select value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)} className={selCls}>
                <option value="todas">Todas as obras</option>
                {obrasDisponiveis.map(([id, nome]) => (
                  <option key={id} value={id}>{nome}</option>
                ))}
              </select>
            )}
            {!obraId && imoveisDisponiveis.length > 1 && (
              <select value={filtroImovel} onChange={(e) => setFiltroImovel(e.target.value)} className={selCls}>
                <option value="todos">Todos os imóveis</option>
                {imoveisDisponiveis.map(([id, nome]) => (
                  <option key={id} value={id}>{nome}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setOrdenar((o) => (o === "valor" ? "antiguidade" : "valor"))}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-sm text-ink hover:bg-accent"
            >
              <ArrowUpDown size={14} /> {ordenar === "valor" ? "Maior valor" : "Mais antigas"}
            </button>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtradas.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/12 text-success">
                <ShieldCheck size={30} />
              </span>
              <p className="text-lg font-semibold text-success">Está tudo comprovado.</p>
              <p className="text-sm text-muted">Nenhuma despesa à espera de fatura.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtradas.map((l) => {
                const dias = diasDesdeRegisto(l.despesa);
                const antiga = dias > 30;
                const autor = profiles.find((p) => p.id === l.despesa.registadoPor);
                return (
                  <div key={l.despesa.id} className="rounded-2xl border border-warning/30 bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-ink">{l.despesa.descricao}</p>
                        <Link
                          to={l.casaId ? `/comunidade/colaborativa/obras/${l.casaId}/${l.obra.id}` : `/obra/${l.obra.id}`}
                          onClick={closePorComprovar}
                          className="mt-0.5 inline-flex items-center gap-1 text-sm text-secondary hover:underline"
                        >
                          {l.casaNome} · {l.divisaoLabel} · {l.obra.titulo} <ChevronRight size={13} />
                        </Link>
                        <p className={cn("num mt-1 text-sm", antiga ? "font-semibold text-danger" : "text-muted")}>
                          {dataPT(l.despesa.data)}
                          {autor && ` · registada por ${nomeProprio(autor.fullName)}`}
                          {` · há ${dias} ${dias === 1 ? "dia" : "dias"}`}
                          {antiga && " · a aguardar há demasiado tempo"}
                        </p>
                      </div>
                      <span className="num text-lg font-bold text-ink">{eur(l.despesa.valor)}</span>
                    </div>

                    {l.souGestor ? (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button variant="gold" size="lg" className="w-full sm:flex-1" onClick={() => openAnexarProva(l.despesa.id)}>
                          <ShieldCheck size={16} /> Anexar fatura
                        </Button>
                        <button
                          onClick={() => eliminar(l)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted hover:text-danger"
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted">Só o gestor pode anexar o comprovativo.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const selCls = "h-9 rounded-lg border border-line bg-card px-2.5 text-sm text-ink outline-none focus:border-secondary";
