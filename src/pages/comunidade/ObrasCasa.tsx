import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Building2, Users2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useExampleData } from "@/store/useExampleData";
import { useModalStore } from "@/store/useModalStore";
import {
  useObrasStore,
  divisaoDe,
  progressoReal,
  gastoReal,
  estadoHumanoObras,
  DIVISAO_LABEL,
  DIVISAO_ORDEM,
  ESTADO_HUMANO_CASA,
  ESTADO_HUMANO_DIVISAO,
  ESTADO_HUMANO_HEX,
  type Obra,
  type Divisao,
} from "@/store/useObrasStore";
import { useCollabStore } from "@/store/useCollabStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { DIVISAO_ICON } from "@/components/obras/Divisoes";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

// NÍVEL 2 da navegação de obras: Casa → DIVISÃO → Obra.
// Mostra só as divisões desta casa que têm obra. Uma pergunta por ecrã.

export default function ObrasCasa() {
  const { casaId } = useParams();
  const navigate = useNavigate();
  const { enabled } = useExampleData();
  const openObraForm = useModalStore((s) => s.openObraForm);

  const project = useCollabStore((s) => s.projects.find((p) => p.id === casaId));
  const property = usePropertiesStore((s) => s.properties.find((p) => p.id === casaId));

  const obras = useObrasStore((s) => s.obras);
  const fases = useObrasStore((s) => s.fases);
  const despesas = useObrasStore((s) => s.despesas);
  const marcos = useObrasStore((s) => s.marcos);

  const [divisaoAberta, setDivisaoAberta] = useState<Divisao | null>(null);

  const daCasa = useMemo(
    () =>
      enabled
        ? obras.filter((o) => (project ? o.projectId === project.id : o.propertyId === casaId))
        : [],
    [obras, enabled, project, casaId]
  );

  const porDivisao = useMemo(() => {
    const map = new Map<Divisao, Obra[]>();
    daCasa.forEach((o) => {
      const d = divisaoDe(o);
      map.set(d, [...(map.get(d) ?? []), o]);
    });
    return map;
  }, [daCasa]);

  const nome = project ? project.title : property?.name ?? "Casa";
  const cidade = project ? project.city : property?.city ?? "";
  const foto = project ? project.coverImageUrl : property?.photos?.[0]?.url;
  const estadoCasa = estadoHumanoObras(daCasa, fases, despesas, marcos);

  if (!project && !property) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Casa não encontrada.</p>
        <Link to="/comunidade/colaborativa/obras" className="mt-2 inline-block text-secondary hover:underline">
          ← Voltar às obras
        </Link>
      </div>
    );
  }

  const abrirDivisao = (d: Divisao) => {
    const lista = porDivisao.get(d) ?? [];
    if (lista.length === 1) navigate(`/comunidade/colaborativa/obras/${casaId}/${lista[0].id}`);
    else setDivisaoAberta((atual) => (atual === d ? null : d));
  };

  const divisoesComObra = DIVISAO_ORDEM.filter((d) => d !== "casa_toda" && porDivisao.has(d));
  const casaToda = porDivisao.get("casa_toda") ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header simples: voltar · foto pequena + nome · estado humano · nova obra */}
      <Link to="/comunidade/colaborativa/obras" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Obras
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-accent">
            {foto ? (
              <img src={foto} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted">
                {project ? <Users2 size={18} /> : <Building2 size={18} />}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold text-ink sm:text-2xl">{nome}</h1>
            <p className="flex items-center gap-2 text-sm text-muted">
              {cidade}
              <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: ESTADO_HUMANO_HEX[estadoCasa] }}>
                <span className="h-2 w-2 rounded-full" style={{ background: ESTADO_HUMANO_HEX[estadoCasa] }} />
                {ESTADO_HUMANO_CASA[estadoCasa]}
              </span>
            </p>
          </div>
        </div>
        <Button
          variant="gold"
          onClick={() =>
            openObraForm(project ? { initialProjectId: project.id } : { initialPropertyId: casaId })
          }
        >
          <Plus size={15} /> Nova obra
        </Button>
      </div>

      {/* A pergunta do ecrã */}
      <h2 className="mt-8 font-display text-xl font-semibold text-ink sm:text-[20px]">Onde estamos a mexer?</h2>

      {daCasa.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-card/50 px-6 py-14 text-center text-sm text-muted">
          {enabled ? "Esta casa ainda não tem obras. Comece por «Nova obra»." : "Ative «Dados de exemplo» para explorar."}
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {divisoesComObra.map((d) => (
              <DivisaoCard
                key={d}
                divisao={d}
                obras={porDivisao.get(d)!}
                aberta={divisaoAberta === d}
                onClick={() => abrirDivisao(d)}
              />
            ))}
          </div>

          {/* Lista de obras da divisão escolhida (quando tem várias) */}
          {divisaoAberta && (porDivisao.get(divisaoAberta)?.length ?? 0) > 1 && (
            <ListaObrasDivisao
              casaId={casaId!}
              divisao={divisaoAberta}
              obras={porDivisao.get(divisaoAberta)!}
            />
          )}

          {/* Casa toda — obras gerais, cartão à parte no fim */}
          {casaToda.length > 0 && (
            <div className="mt-6">
              <DivisaoCard
                divisao="casa_toda"
                obras={casaToda}
                aberta={divisaoAberta === "casa_toda"}
                onClick={() => abrirDivisao("casa_toda")}
                larga
              />
              {divisaoAberta === "casa_toda" && casaToda.length > 1 && (
                <ListaObrasDivisao casaId={casaId!} divisao="casa_toda" obras={casaToda} />
              )}
            </div>
          )}
        </>
      )}
      <div className="h-10" />
    </div>
  );
}

function DivisaoCard({
  divisao,
  obras,
  aberta,
  onClick,
  larga,
}: {
  divisao: Divisao;
  obras: Obra[];
  aberta: boolean;
  onClick: () => void;
  larga?: boolean;
}) {
  const fases = useObrasStore((s) => s.fases);
  const despesas = useObrasStore((s) => s.despesas);
  const marcos = useObrasStore((s) => s.marcos);
  const Icon = DIVISAO_ICON[divisao];
  const prog = Math.round(obras.reduce((s, o) => s + progressoReal(o, fases), 0) / obras.length);
  const estado = estadoHumanoObras(obras, fases, despesas, marcos);
  const hex = ESTADO_HUMANO_HEX[estado];

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        aberta ? "border-gold" : "border-line",
        larga && "flex w-full items-center gap-4 sm:gap-5"
      )}
    >
      <div className={cn("flex flex-col items-center", larga ? "shrink-0" : "")}>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-secondary">
          <Icon size={30} strokeWidth={1.8} />
        </span>
      </div>
      <div className={cn(larga ? "min-w-0 flex-1" : "mt-3 text-center")}>
        <p className="text-sm font-semibold text-ink">{DIVISAO_LABEL[divisao]}</p>
        <p className="text-xs text-muted">
          {obras.length} {obras.length === 1 ? "obra" : "obras"}
          {larga && " · Obras gerais (canalização, eletricidade…)"}
        </p>
        <div className={cn("mt-2 flex items-center gap-2", !larga && "justify-center")}>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-accent">
            <div className="h-full rounded-full" style={{ width: `${prog}%`, background: hex }} />
          </div>
          <span className="num text-[11px] text-muted">{prog}%</span>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium" style={{ color: hex, justifyContent: larga ? "flex-start" : "center" }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: hex }} />
          {ESTADO_HUMANO_DIVISAO[estado]}
        </p>
      </div>
    </button>
  );
}

/** Quando a divisão tem várias obras: cartões simples para escolher qual abrir. */
function ListaObrasDivisao({ casaId, divisao, obras }: { casaId: string; divisao: Divisao; obras: Obra[] }) {
  const navigate = useNavigate();
  const fases = useObrasStore((s) => s.fases);
  const despesas = useObrasStore((s) => s.despesas);
  const marcos = useObrasStore((s) => s.marcos);
  return (
    <Card className="mt-4">
      <CardContent className="p-0">
        <p className="border-b border-line bg-bg/40 px-4 py-2.5 text-xs font-semibold text-muted">
          Obras — {DIVISAO_LABEL[divisao]}
        </p>
        <div className="divide-y divide-line/60">
          {obras.map((o) => {
            const prog = progressoReal(o, fases);
            const estado = estadoHumanoObras([o], fases, despesas, marcos);
            const hex = ESTADO_HUMANO_HEX[estado];
            return (
              <button
                key={o.id}
                onClick={() => navigate(`/comunidade/colaborativa/obras/${casaId}/${o.id}`)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{o.titulo}</p>
                  <p className="num text-[11px] text-muted">{eur(gastoReal(o, despesas))} de {eur(o.orcamento)}</p>
                </div>
                <div className="flex w-24 items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent">
                    <div className="h-full rounded-full" style={{ width: `${prog}%`, background: hex }} />
                  </div>
                  <span className="num text-[11px] text-muted">{prog}%</span>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: hex }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: hex }} />
                  {ESTADO_HUMANO_DIVISAO[estado]}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
