import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { X, ChevronLeft, ChevronRight, Check, ImagePlus, Hammer, Globe, Lock, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BeforeAfterSlider } from "@/components/galeria/BeforeAfterSlider";
import { useModalStore } from "@/store/useModalStore";
import { useObrasStore, CATEGORIA_LABEL, type Obra } from "@/store/useObrasStore";
import { useCollabStore } from "@/store/useCollabStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import {
  useGaleriaStore,
  DIVISAO_LABEL,
  type Divisao,
  type VisibilidadeComparacao,
} from "@/store/useGaleriaStore";
import { eur, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

const inputCls = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

/** Foto disponível numa obra (da própria obra ou das despesas) — a Galeria puxa, não duplica. */
interface FotoPool {
  url: string;
  grupo: string; // "Fotos da obra" ou data da despesa
  origem?: string; // descrição da despesa
}

function divisaoDefault(o: Obra): Divisao {
  if (o.categoria === "cozinha") return "cozinha";
  if (o.categoria === "wc") return "wc";
  return "geral";
}

function diasEntre(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

export function GaleriaFormModal() {
  const { galeriaForm, closeGaleriaForm } = useModalStore();
  const { open, editingId, initialObraId } = galeriaForm;
  const navigate = useNavigate();
  const location = useLocation();

  const obras = useObrasStore((s) => s.obras);
  const despesas = useObrasStore((s) => s.despesas);
  const addFotoObra = useObrasStore((s) => s.addFoto);
  const projects = useCollabStore((s) => s.projects);
  const properties = usePropertiesStore((s) => s.properties);
  const profiles = useProfilesStore((s) => s.profiles);
  const add = useGaleriaStore((s) => s.add);
  const update = useGaleriaStore((s) => s.update);
  const getById = useGaleriaStore((s) => s.getById);

  const [step, setStep] = useState(0);
  const [mostrarErros, setMostrarErros] = useState(false);
  const [obraId, setObraId] = useState<string>("");
  const [antes, setAntes] = useState("");
  const [depois, setDepois] = useState("");
  const [novas, setNovas] = useState<FotoPool[]>([]);
  const [titulo, setTitulo] = useState("");
  const [divisao, setDivisao] = useState<Divisao>("geral");
  const [custo, setCusto] = useState<number>(0);
  const [duracao, setDuracao] = useState<number>(0);
  const [valorizacao, setValorizacao] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [visibilidade, setVisibilidade] = useState<VisibilidadeComparacao>("partilhavel_na_rede");
  const [destaque, setDestaque] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const obra = obras.find((o) => o.id === obraId);

  const origemTitulo = (o: Obra): string => {
    if (o.projectId) {
      const p = projects.find((x) => x.id === o.projectId);
      if (p) return `#${p.number} ${p.title}`;
    }
    if (o.propertyId) {
      const p = properties.find((x) => x.id === o.propertyId);
      if (p) return p.name;
    }
    return "";
  };

  /** Auto-preenche o contexto real a partir da obra (custo = soma das despesas; duração = datas reais). */
  const aplicarContextoDaObra = (o: Obra) => {
    const ds = despesas.filter((d) => d.obraId === o.id);
    const soma = ds.reduce((acc, d) => acc + d.valor, 0);
    setCusto(soma > 0 ? soma : o.gasto);
    setDuracao(diasEntre(o.dataInicio, o.dataFimReal ?? new Date().toISOString().slice(0, 10)));
    const div = divisaoDefault(o);
    setDivisao(div);
    const origem = origemTitulo(o);
    setTitulo(origem ? `${DIVISAO_LABEL[div]} — ${origem.replace(/^#\d+ /, "")}` : `${DIVISAO_LABEL[div]} — ${o.titulo}`);
  };

  // Reset ao abrir (novo, com obra pré-selecionada, ou edição)
  useEffect(() => {
    if (!open) return;
    setNovas([]);
    setMostrarErros(false);
    if (editingId) {
      const c = getById(editingId);
      if (c) {
        setObraId(c.obraId);
        setAntes(c.fotoAntesUrl);
        setDepois(c.fotoDepoisUrl);
        setTitulo(c.titulo);
        setDivisao(c.divisao);
        setCusto(c.custoReal);
        setDuracao(c.duracaoDias);
        setValorizacao(c.valorizacaoEstimada ? String(c.valorizacaoEstimada) : "");
        setDescricao(c.descricao);
        setVisibilidade(c.visibilidade);
        setDestaque(c.destaque);
        setStep(1);
        return;
      }
    }
    setAntes("");
    setDepois("");
    setTitulo("");
    setDivisao("geral");
    setCusto(0);
    setDuracao(0);
    setValorizacao("");
    setDescricao("");
    setVisibilidade("partilhavel_na_rede");
    setDestaque(false);
    if (initialObraId) {
      setObraId(initialObraId);
      const o = obras.find((x) => x.id === initialObraId);
      if (o) aplicarContextoDaObra(o);
      setStep(1);
    } else {
      setObraId("");
      setStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId, initialObraId]);

  // Pool de fotos da obra escolhida — obra.fotos + fotos das despesas, agrupadas por data
  const pool = useMemo<FotoPool[]>(() => {
    if (!obra) return [];
    const daObra: FotoPool[] = obra.fotos.map((url) => ({ url, grupo: "Fotos da obra" }));
    const dasDespesas: FotoPool[] = despesas
      .filter((d) => d.obraId === obra.id && (d.fotos?.length ?? 0) > 0)
      .flatMap((d) => (d.fotos ?? []).map((url) => ({ url, grupo: dataPT(d.data), origem: d.descricao })));
    const extra = [antes, depois].filter((u) => u && !daObra.some((f) => f.url === u) && !dasDespesas.some((f) => f.url === u) && !novas.some((f) => f.url === u));
    return [...novas, ...daObra, ...dasDespesas, ...extra.map((url) => ({ url, grupo: "Desta comparação" }))];
  }, [obra, despesas, novas, antes, depois]);

  const grupos = useMemo(() => {
    const m = new Map<string, FotoPool[]>();
    pool.forEach((f) => m.set(f.grupo, [...(m.get(f.grupo) ?? []), f]));
    return [...m.entries()];
  }, [pool]);

  if (!open) return null;

  const escolherFoto = (url: string) => {
    if (antes === url) return setAntes("");
    if (depois === url) return setDepois("");
    if (!antes) return setAntes(url);
    if (!depois) return setDepois(url);
    setDepois(url); // ambas cheias → substitui a DEPOIS
  };

  const onUpload = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      const url = String(r.result);
      setNovas((n) => [{ url, grupo: "Novas (agora)" }, ...n]);
      if (obraId) addFotoObra(obraId, url); // fica também na obra — fonte única, sem duplicados
      toastSuccess("Foto adicionada à obra");
    };
    r.readAsDataURL(file);
  };

  const podeAvancar = () => {
    if (step === 0) return !!obraId;
    if (step === 1) return !!antes && !!depois;
    if (step === 2) return titulo.trim().length >= 3 && duracao > 0;
    return true;
  };

  const next = () => {
    if (!podeAvancar()) {
      setMostrarErros(true);
      toastError(step === 1 ? "Selecione a foto ANTES e a foto DEPOIS" : "Preencha os campos obrigatórios");
      return;
    }
    setMostrarErros(false);
    setStep((s) => Math.min(s + 1, 3));
  };

  const submeter = () => {
    if (!obra || !antes || !depois) return;
    const payload = {
      obraId: obra.id,
      projectId: obra.projectId,
      propertyId: obra.propertyId,
      titulo: titulo.trim(),
      divisao,
      fotoAntesUrl: antes,
      fotoDepoisUrl: depois,
      custoReal: Number(custo) || 0,
      duracaoDias: Number(duracao) || 1,
      valorizacaoEstimada: Number(valorizacao) > 0 ? Number(valorizacao) : undefined,
      descricao: descricao.trim(),
      visibilidade,
      destaque,
    };
    if (editingId) {
      update(editingId, payload);
      toastSuccess("Comparação atualizada");
    } else {
      add({ ...payload, criadoPor: CURRENT_USER_ID });
      const nome = profiles.find((p) => p.id === CURRENT_USER_ID)?.fullName ?? "";
      toastSuccess("Comparação criada", {
        description: visibilidade === "partilhavel_na_rede" ? `Já reforça o track record de ${nome.split(" ")[0]} na Rede.` : undefined,
        action: location.pathname.includes("/galeria")
          ? undefined
          : { label: "Ver galeria", onClick: () => navigate("/comunidade/colaborativa/galeria") },
      });
    }
    closeGaleriaForm();
  };

  const passos = ["Obra", "Fotos", "Contexto", "Visibilidade"];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={closeGaleriaForm}>
      <div
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">{editingId ? "Editar comparação" : "Nova comparação"}</h2>
            <p className="text-xs text-muted">Passo {step + 1} de 4 · {passos[step]}</p>
          </div>
          <button onClick={closeGaleriaForm} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>

        <div className="flex gap-1.5 px-5 pt-4">
          {passos.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-gold" : "bg-line")} />
              <p className={cn("mt-1 text-[10px]", i === step ? "font-medium text-gold-dark" : "text-muted")}>{s}</p>
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* PASSO 1 — escolher a obra de origem */}
          {step === 0 && (
            <div className="space-y-2">
              <p className="mb-3 text-sm text-muted">As fotos vêm da obra — escolha a origem da transformação.</p>
              {mostrarErros && !obraId && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">Selecione a obra de origem.</p>
              )}
              {obras.length === 0 && (
                <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-accent p-5 text-center">
                  <p className="text-[15px] font-medium text-ink">Ainda não tem obras com fotos.</p>
                  <p className="mt-0.5 text-[13px] text-muted">O antes/depois nasce das fotos do diário da obra.</p>
                  <button
                    type="button"
                    onClick={() => { closeGaleriaForm(); navigate("/comunidade/colaborativa/obras"); }}
                    className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-gold px-4 text-sm font-semibold text-sidebar hover:opacity-90"
                  >
                    Ir para as obras →
                  </button>
                </div>
              )}
              {obras.map((o) => {
                const nFotos = o.fotos.length + despesas.filter((d) => d.obraId === o.id).reduce((a, d) => a + (d.fotos?.length ?? 0), 0);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setObraId(o.id);
                      if (!editingId) aplicarContextoDaObra(o);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                      obraId === o.id ? "border-gold bg-gold/8" : "border-line hover:bg-accent"
                    )}
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", obraId === o.id ? "bg-gold text-sidebar" : "bg-accent text-secondary")}>
                      <Hammer size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{o.titulo}</p>
                      <p className="truncate text-xs text-muted">
                        {origemTitulo(o)} · {CATEGORIA_LABEL[o.categoria]}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] text-secondary">
                      {nFotos} {nFotos === 1 ? "foto" : "fotos"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* PASSO 2 — selecionar ANTES e DEPOIS das fotos existentes */}
          {step === 1 && obra && (
            <div className="space-y-4">
              {mostrarErros && (!antes || !depois) && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">Selecione a foto ANTES e a foto DEPOIS.</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Slot label="Antes" url={antes} onClear={() => setAntes("")} />
                <Slot label="Depois" url={depois} onClear={() => setDepois("")} gold />
              </div>
              <p className="text-xs text-muted">
                Clique numa foto para a usar como <strong className="text-ink">ANTES</strong> e noutra como <strong className="text-ink">DEPOIS</strong>. Clique de novo para desmarcar.
              </p>

              {grupos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                  Esta obra ainda não tem fotos. Carregue as primeiras abaixo.
                </div>
              ) : (
                grupos.map(([grupo, fotos]) => (
                  <div key={grupo}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{grupo}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {fotos.map((f) => {
                        const sel = f.url === antes ? "antes" : f.url === depois ? "depois" : null;
                        return (
                          <button
                            key={f.url}
                            type="button"
                            onClick={() => escolherFoto(f.url)}
                            title={f.origem}
                            className={cn(
                              "relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-all",
                              sel ? "border-gold" : "border-transparent hover:border-line"
                            )}
                          >
                            <img src={f.url} alt="" className="h-full w-full object-cover" />
                            {sel && (
                              <span className={cn(
                                "absolute left-1 top-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                                sel === "antes" ? "bg-ink/70 text-white" : "bg-gold text-sidebar"
                              )}>
                                {sel === "antes" ? "Antes" : "Depois"}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <ImagePlus size={14} /> Carregar nova foto
                </Button>
                <span className="ml-2 text-[11px] text-muted">Fica também guardada na obra.</span>
              </div>
            </div>
          )}

          {/* PASSO 3 — contexto real (pré-preenchido da obra) */}
          {step === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted">Título</span>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={cn(inputCls, mostrarErros && titulo.trim().length < 3 && "border-danger")} placeholder='Ex.: "Cozinha — Príncipe Real"' />
                {mostrarErros && titulo.trim().length < 3 && <span className="mt-1 block text-xs text-danger">Dê um título (mín. 3 letras)</span>}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Divisão</span>
                <select value={divisao} onChange={(e) => setDivisao(e.target.value as Divisao)} className={inputCls}>
                  {(Object.keys(DIVISAO_LABEL) as Divisao[]).map((d) => (
                    <option key={d} value={d}>{DIVISAO_LABEL[d]}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Custo real (auto · soma das despesas)</span>
                <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
                  <input type="number" step="any" value={custo || ""} onChange={(e) => setCusto(Number(e.target.value))} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
                  <span className="px-3 text-sm text-muted">€</span>
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Duração (auto · datas da obra)</span>
                <div className={cn("flex items-center rounded-lg border bg-card focus-within:border-secondary", mostrarErros && duracao <= 0 ? "border-danger" : "border-line")}>
                  <input type="number" value={duracao || ""} onChange={(e) => setDuracao(Number(e.target.value))} className="h-10 w-full bg-transparent px-3 text-sm outline-none" />
                  <span className="px-3 text-sm text-muted">dias</span>
                </div>
                {mostrarErros && duracao <= 0 && <span className="mt-1 block text-xs text-danger">Indique a duração em dias</span>}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Valorização estimada (opcional)</span>
                <div className="flex items-center rounded-lg border border-line bg-card focus-within:border-secondary">
                  <input type="number" step="any" value={valorizacao} onChange={(e) => setValorizacao(e.target.value)} className="h-10 w-full bg-transparent px-3 text-sm outline-none" placeholder="Ex.: 25000" />
                  <span className="px-3 text-sm text-muted">€</span>
                </div>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted">Descrição</span>
                <textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-secondary" placeholder="O que foi feito, materiais, decisões…" />
              </label>
            </div>
          )}

          {/* PASSO 4 — visibilidade + destaque + pré-visualização */}
          {step === 3 && (
            <div className="space-y-4">
              {antes && depois && <BeforeAfterSlider antes={antes} depois={depois} alt={titulo} className="aspect-video" />}

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setVisibilidade("privada")}
                  className={cn("rounded-xl border p-3.5 text-left transition-all", visibilidade === "privada" ? "border-gold bg-gold/8" : "border-line hover:bg-accent")}
                >
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Lock size={14} /> Privada</p>
                  <p className="mt-0.5 text-xs text-muted">Só você e os sócios do projeto a veem.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibilidade("partilhavel_na_rede")}
                  className={cn("rounded-xl border p-3.5 text-left transition-all", visibilidade === "partilhavel_na_rede" ? "border-gold bg-gold/8" : "border-line hover:bg-accent")}
                >
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Globe size={14} /> Partilhável na Rede</p>
                  <p className="mt-0.5 text-xs text-muted">Aparece no seu perfil público como prova de track record.</p>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setDestaque((d) => !d)}
                className={cn("flex w-full items-center justify-between rounded-xl border p-3.5 transition-all", destaque ? "border-gold bg-gold/8" : "border-line hover:bg-accent")}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <Star size={14} className={cn(destaque && "fill-gold text-gold-dark")} /> Destacar
                </span>
                <span className="text-xs text-muted">Aparece em primeiro no perfil</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-4">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => { setMostrarErros(false); setStep((s) => s - 1); }}>
              <ChevronLeft size={15} /> Voltar
            </Button>
          ) : (
            <Button variant="ghost" onClick={closeGaleriaForm}>Cancelar</Button>
          )}
          {step < 3 ? (
            <Button variant="gold" onClick={next}>
              Próximo <ChevronRight size={15} />
            </Button>
          ) : (
            <Button variant="gold" onClick={submeter}>
              {editingId ? <><Check size={15} /> Guardar alterações</> : <><Sparkles size={15} /> Criar comparação</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Slot({ label, url, onClear, gold }: { label: string; url: string; onClear: () => void; gold?: boolean }) {
  return (
    <div className={cn("relative aspect-[4/3] overflow-hidden rounded-xl border-2 border-dashed", url ? (gold ? "border-gold" : "border-ink/40") : "border-line bg-bg/40")}>
      {url ? (
        <>
          <img src={url} alt="" className="h-full w-full object-cover" />
          <button onClick={onClear} className="absolute right-1 top-1 rounded-md bg-ink/60 p-1 text-white hover:bg-ink/80"><X size={13} /></button>
        </>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-muted">Escolher abaixo…</span>
      )}
      <span className={cn("absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", gold ? "bg-gold text-sidebar" : "bg-ink/70 text-white")}>
        {label}
      </span>
    </div>
  );
}
