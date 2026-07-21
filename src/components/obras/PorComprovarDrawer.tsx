import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { X, AlertTriangle, ShieldCheck, Trash2, ChevronRight, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import {
  useObrasStore,
  listaPorComprovar,
  listaPorVerificar,
  listaContestadas,
  verificacaoDe,
  diasDesdeRegisto,
  divisaoDe,
  podeGerir,
  DIVISAO_LABEL,
  MOTIVOS_CONTESTACAO,
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
type TabProva = "sem_fatura" | "por_verificar" | "contestados";

const TAB_PROVA_LABEL: Record<TabProva, string> = {
  sem_fatura: "Sem fatura",
  por_verificar: "Aguarda sócios",
  contestados: "Contestados",
};

interface Linha {
  despesa: Despesa;
  obra: Obra;
  casaId?: string;
  casaNome: string;
  divisaoLabel: string;
  souGestor: boolean;
}

export function PorComprovarDrawer() {
  const navigate = useNavigate();
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
  const [tab, setTab] = useState<TabProva>("sem_fatura");

  // Contagens por separador (respeitam o filtro da obra do deep-link)
  const noEscopo = (d: Despesa) => (obraId ? d.obraId === obraId : true);
  const nSemFatura = listaPorComprovar(despesas).filter(noEscopo).length;
  const nPorVerificar = listaPorVerificar(obras, despesas).filter(noEscopo).length;
  const nContestados = listaContestadas(obras, despesas).filter(noEscopo).length;

  const linhas = useMemo<Linha[]>(() => {
    const fonte =
      tab === "sem_fatura"
        ? listaPorComprovar(despesas)
        : tab === "por_verificar"
          ? listaPorVerificar(obras, despesas)
          : listaContestadas(obras, despesas);
    const base = fonte.filter((d) => (obraId ? d.obraId === obraId : true));
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
  }, [despesas, obras, projects, properties, obraId, tab]);

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
    toastSuccess("Despesa eliminada");
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

        {/* Separadores: Sem fatura · Por verificar · Contestados */}
        <div className="flex gap-1.5 border-b border-line bg-card px-5 pb-3">
          {(Object.keys(TAB_PROVA_LABEL) as TabProva[]).map((t) => {
            const n = t === "sem_fatura" ? nSemFatura : t === "por_verificar" ? nPorVerificar : nContestados;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  tab === t
                    ? t === "contestados"
                      ? "border-danger bg-danger text-white"
                      : "border-gold bg-gold text-sidebar"
                    : "border-line bg-card text-muted hover:text-ink"
                )}
              >
                {TAB_PROVA_LABEL[t]}
                {n > 0 && <span className="num">({n})</span>}
              </button>
            );
          })}
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
              <p className="text-lg font-semibold text-success">
                {tab === "sem_fatura" ? "Está tudo comprovado." : tab === "por_verificar" ? "Nada a aguardar." : "Sem contestações."}
              </p>
              <p className="text-sm text-muted">
                {tab === "sem_fatura"
                  ? "Nenhuma despesa à espera de fatura."
                  : tab === "por_verificar"
                    ? "Todas as faturas foram vistas e confirmadas pelos sócios."
                    : "Nenhum sócio contestou gastos."}
              </p>
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

                    {/* Motivo da contestação (separador Contestados) */}
                    {tab === "contestados" && (() => {
                      const v = verificacaoDe(l.obra, l.despesa);
                      const c = v.contestadaPor[0];
                      if (!c) return null;
                      return (
                        <p className="mt-2 rounded-lg bg-danger/8 px-3 py-2 text-sm text-danger">
                          {c.motivo && MOTIVOS_CONTESTACAO[c.motivo] ? MOTIVOS_CONTESTACAO[c.motivo] : "Contestada"}
                          {c.comentario ? ` — "${c.comentario}"` : ""}
                        </p>
                      );
                    })()}

                    {tab === "sem_fatura" ? (
                      l.souGestor ? (
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
                      )
                    ) : tab === "contestados" && l.souGestor ? (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button variant="gold" size="lg" className="w-full sm:flex-1" onClick={() => openAnexarProva(l.despesa.id)}>
                          <ShieldCheck size={16} /> Anexar novo comprovativo
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            closePorComprovar();
                            navigate(l.casaId ? `/comunidade/colaborativa/obras/${l.casaId}/${l.obra.id}` : `/obra/${l.obra.id}`);
                          }}
                        >
                          Responder na obra
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="lg"
                        className="mt-3 w-full"
                        onClick={() => {
                          closePorComprovar();
                          navigate(l.casaId ? `/comunidade/colaborativa/obras/${l.casaId}/${l.obra.id}` : `/obra/${l.obra.id}`);
                        }}
                      >
                        {tab === "por_verificar" ? "Ver fatura na obra" : "Abrir na obra"}
                      </Button>
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
