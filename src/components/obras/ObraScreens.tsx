import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  Plus,
  Trash2,
  Send,
  Mic,
  Star,
  Phone,
  Mail,
  MessageCircle,
  ShieldCheck,
  Volume2,
  CheckCircle2,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Hammer,
  ImagePlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  useObrasStore,
  custoRealFase,
  roleDe,
  membrosDe,
  relativaTempo,
  DIARIO_TIPO_LABEL,
  TAREFAS_SUGERIDAS,
  type Obra,
  type DiarioTipo,
} from "@/store/useObrasStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { useTechniciansStore, ESPECIALIDADE_LABEL } from "@/store/useTechniciansStore";
import { useNotificationsStore } from "@/store/useNotificationsStore";
import { useModalStore } from "@/store/useModalStore";
import { RoleAvatar, nomeProprio } from "@/components/obras/CoGestao";
import { EmpreiteiroDialog } from "@/components/obras/EmpreiteiroCard";
import { eur, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

const inputCls = "h-11 w-full rounded-lg border border-line bg-card px-3 text-base outline-none focus:border-secondary";

// ───────────────────────── 📸 DIÁRIO ─────────────────────────
// Feed cronológico estilo mensagens — prova do que foi feito.
// Gestor e investidor adicionam; observador só vê.

export function DiarioScreen({ obra, souGestor }: { obra: Obra; souGestor: boolean }) {
  const addDiario = useObrasStore((s) => s.addDiario);
  const removeDiario = useObrasStore((s) => s.removeDiario);
  const openGaleriaForm = useModalStore((s) => s.openGaleriaForm);
  const profiles = useProfilesStore((s) => s.profiles);
  const meuRole = roleDe(obra, CURRENT_USER_ID);
  const podeAdicionar = souGestor || meuRole === "investidor";

  const [composerOpen, setComposerOpen] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<DiarioTipo>("durante");
  const [aOuvir, setAOuvir] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const entradas = [...(obra.diario ?? [])].sort((a, b) => (a.data < b.data ? 1 : -1));
  const totalFotos = entradas.reduce((s, e) => s + e.fotos.length, 0) + obra.fotos.length;

  const onPick = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      const url = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(f);
      });
      setFotos((p) => [...p, url]);
    }
    setComposerOpen(true);
  };

  // Ditar nota por voz (Web Speech API) — quando o browser suporta.
  const ditar = () => {
    const W = window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      toast.message("Ditado por voz não disponível neste browser");
      return;
    }
    const rec = new Ctor();
    rec.lang = "pt-PT";
    rec.onresult = (ev) => {
      const frase = ev.results?.[0]?.[0]?.transcript ?? "";
      setTexto((t) => (t ? `${t} ${frase}` : frase));
      setAOuvir(false);
    };
    rec.onerror = () => setAOuvir(false);
    rec.onend = () => setAOuvir(false);
    setAOuvir(true);
    rec.start();
  };

  const guardar = () => {
    if (fotos.length === 0 && !texto.trim()) {
      toast.error("Adicione uma foto ou escreva uma nota");
      return;
    }
    addDiario(obra.id, {
      data: new Date().toISOString(),
      tipo,
      texto: texto.trim() || undefined,
      fotos,
      autorId: CURRENT_USER_ID,
    });
    setFotos([]);
    setTexto("");
    setTipo("durante");
    setComposerOpen(false);
    toast.success("Registado no diário da obra");
  };

  return (
    <div className="space-y-4">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onPick(e.target.files); e.target.value = ""; }} />
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onPick(e.target.files); e.target.value = ""; }} />

      {podeAdicionar && (
        <div className="space-y-2">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gold text-lg font-bold text-sidebar shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <Camera size={22} /> TIRAR FOTO
          </button>
          <div className="flex items-center justify-center gap-4 text-sm">
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 text-secondary hover:underline">
              <ImagePlus size={14} /> Carregar da galeria
            </button>
            <button onClick={() => setComposerOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-secondary hover:underline">
              <Plus size={14} /> Só uma nota
            </button>
          </div>
        </div>
      )}

      {/* Composer — etiqueta + nota */}
      {composerOpen && podeAdicionar && (
        <Card>
          <CardContent className="space-y-3 p-4">
            {fotos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line">
                    <img src={f} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setFotos((p) => p.filter((_, j) => j !== i))}
                      className="absolute right-0.5 top-0.5 rounded-md bg-ink/60 p-0.5 text-white hover:bg-danger"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DIARIO_TIPO_LABEL) as DiarioTipo[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={cn(
                    "min-h-11 rounded-full border px-4 text-base font-medium transition-colors",
                    tipo === t ? "border-gold bg-gold text-sidebar" : "border-line bg-card text-ink hover:bg-accent"
                  )}
                >
                  {DIARIO_TIPO_LABEL[t]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Nota curta (opcional)…"
                className={inputCls}
                onKeyDown={(e) => { if (e.key === "Enter") guardar(); }}
              />
              <button
                onClick={ditar}
                title="Ditar por voz"
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors",
                  aOuvir ? "animate-pulse border-danger bg-danger/10 text-danger" : "border-line bg-card text-muted hover:text-ink"
                )}
              >
                <Mic size={18} />
              </button>
            </div>
            <Button variant="gold" size="lg" className="w-full" onClick={guardar}>
              <CheckCircle2 size={16} /> Guardar no diário
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Ligação à Galeria antes/depois */}
      {souGestor && totalFotos > 0 && (
        <button
          onClick={() => openGaleriaForm({ initialObraId: obra.id })}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-dark hover:underline"
        >
          <Star size={14} /> Criar antes/depois com as fotos desta obra
        </button>
      )}

      {/* Feed */}
      {entradas.length === 0 && obra.fotos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <Camera size={28} className="mx-auto mb-2" />
            <p className="text-base">O diário é a prova do que foi feito — evita discussões com empreiteiros.</p>
            {podeAdicionar && (
              <Button variant="gold" size="lg" className="mt-4" onClick={() => cameraRef.current?.click()}>
                <Camera size={16} /> Tirar a primeira foto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entradas.map((e) => {
            const autor = profiles.find((p) => p.id === e.autorId);
            const tone =
              e.tipo === "antes" ? "bg-accent text-secondary" : e.tipo === "depois" ? "bg-success/12 text-success" : e.tipo === "nota" ? "bg-line/60 text-muted" : "bg-gold/15 text-gold-dark";
            return (
              <Card key={e.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <RoleAvatar profile={autor} role={roleDe(obra, e.autorId)} size="sm" />
                      <span>
                        <span className="block text-base font-medium text-ink">{nomeProprio(autor?.fullName)}</span>
                        <span className="num block text-xs text-muted">{dataPT(e.data.slice(0, 10))} · {relativaTempo(e.data)}</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-1 text-sm font-semibold", tone)}>{DIARIO_TIPO_LABEL[e.tipo]}</span>
                      {(souGestor || e.autorId === CURRENT_USER_ID) && (
                        <button onClick={() => removeDiario(obra.id, e.id)} className="text-muted hover:text-danger" title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </span>
                  </div>
                  {e.fotos.length > 0 && (
                    <div className={cn("mt-3 grid gap-2", e.fotos.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                      {e.fotos.map((f, i) => (
                        <a key={i} href={f} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-line">
                          <img src={f} alt="" className="max-h-72 w-full object-cover" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  )}
                  {e.texto && <p className="mt-2.5 text-base leading-relaxed text-ink">{e.texto}</p>}
                </CardContent>
              </Card>
            );
          })}

          {/* Fotos antigas (registos sem diário) */}
          {obra.fotos.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Outras fotos</p>
                <div className="grid grid-cols-3 gap-2">
                  {obra.fotos.map((f, i) => (
                    <a key={i} href={f} target="_blank" rel="noreferrer" className="block aspect-video overflow-hidden rounded-lg border border-line">
                      <img src={f} alt="" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Nota fixa e discreta */}
      <p className="flex items-center gap-1.5 px-1 text-sm text-muted">
        <Volume2 size={13} /> Obras com ruído: dias úteis, das 8h às 20h.
      </p>
    </div>
  );
}

interface SpeechRecognitionLike {
  lang: string;
  onresult: ((ev: { results?: { [i: number]: { [j: number]: { transcript?: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

// ───────────────────────── ✓ TAREFAS ─────────────────────────
// Checklist simples com caixas grandes. Feitas riscam e descem.
// Gestor cria e pica · investidor sugere · progresso = % feitas (sem fases).

export function TarefasScreen({ obra, souGestor }: { obra: Obra; souGestor: boolean }) {
  const addTarefa = useObrasStore((s) => s.addTarefa);
  const toggleTarefa = useObrasStore((s) => s.toggleTarefa);
  const removeTarefa = useObrasStore((s) => s.removeTarefa);
  const sugerirFase = useObrasStore((s) => s.sugerirFase);
  const resolverSugestao = useObrasStore((s) => s.resolverSugestao);
  const sugestoes = useObrasStore((s) =>
    s.sugestoes.filter((x) => x.obraId === obra.id && x.estado === "pendente" && (x.tipo ?? "passo") === "passo")
  );
  const profiles = useProfilesStore((s) => s.profiles);
  const addNotif = useNotificationsStore((s) => s.add);
  const meuRole = roleDe(obra, CURRENT_USER_ID);
  const souInvestidor = meuRole === "investidor";

  const [novoOpen, setNovoOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [feitasAbertas, setFeitasAbertas] = useState(false);
  const [sugTexto, setSugTexto] = useState("");
  const [sugOpen, setSugOpen] = useState(false);

  const tarefas = obra.tarefas ?? [];
  const pendentes = tarefas.filter((t) => !t.feito);
  const feitas = tarefas.filter((t) => t.feito);
  const sugeridasCat = TAREFAS_SUGERIDAS[obra.categoria].filter(
    (s) => !tarefas.some((t) => t.titulo.toLowerCase() === s.toLowerCase())
  );
  const gestorId = membrosDe(obra).find((m) => m.role === "gestor")?.userId;
  const nomeGestor = nomeProprio(profiles.find((p) => p.id === gestorId)?.fullName) || "o gestor";

  const criar = (t: string) => {
    if (!t.trim()) return;
    addTarefa(obra.id, t.trim());
    setTitulo("");
    toast.success("Tarefa adicionada");
  };

  const enviarSugestao = () => {
    if (!sugTexto.trim()) {
      toast.error("Descreva a tarefa que sugere");
      return;
    }
    sugerirFase(obra.id, sugTexto.trim(), CURRENT_USER_ID);
    if (gestorId)
      addNotif({
        userId: gestorId,
        tipo: "geral",
        titulo: `Sugestão de tarefa em «${obra.titulo}»`,
        descricao: sugTexto.trim(),
        actorId: CURRENT_USER_ID,
        link: `/obra/${obra.id}`,
      });
    setSugTexto("");
    setSugOpen(false);
    toast.success(`Sugestão enviada a ${nomeGestor}`);
  };

  return (
    <div className="space-y-4">
      {/* Botão gigante */}
      {souGestor ? (
        <button
          onClick={() => setNovoOpen((v) => !v)}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gold text-lg font-bold text-sidebar shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <Plus size={22} /> ADICIONAR TAREFA
        </button>
      ) : souInvestidor ? (
        <button
          onClick={() => setSugOpen((v) => !v)}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-gold bg-card text-lg font-bold text-gold-dark transition-all hover:bg-gold/8"
        >
          <Send size={20} /> SUGERIR TAREFA
        </button>
      ) : null}

      {novoOpen && souGestor && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex gap-2">
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Escolher azulejos"
                autoFocus
                className={inputCls}
                onKeyDown={(e) => { if (e.key === "Enter") criar(titulo); }}
              />
              <Button onClick={() => criar(titulo)}><Plus size={15} /></Button>
            </div>
            {sugeridasCat.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sugeridasCat.map((s) => (
                  <button
                    key={s}
                    onClick={() => criar(s)}
                    className="rounded-full border border-gold/40 bg-gold/8 px-3 py-2 text-sm font-medium text-gold-dark hover:bg-gold/15"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {sugOpen && souInvestidor && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-sm text-muted">A sugestão vai para {nomeGestor} — ele decide se adiciona.</p>
            <div className="flex gap-2">
              <input
                value={sugTexto}
                onChange={(e) => setSugTexto(e.target.value)}
                placeholder="Ex.: Confirmar prazo da bancada"
                className={inputCls}
                onKeyDown={(e) => { if (e.key === "Enter") enviarSugestao(); }}
              />
              <Button onClick={enviarSugestao}><Send size={14} /> Enviar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gestor: sugestões pendentes dos sócios */}
      {souGestor && sugestoes.length > 0 && (
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-gold-dark">Sugestões dos sócios</p>
            {sugestoes.map((sg) => (
              <div key={sg.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-card px-3 py-2">
                <span className="text-base text-ink">
                  {sg.titulo}
                  <span className="ml-2 text-sm text-muted">por {nomeProprio(profiles.find((p) => p.id === sg.autorId)?.fullName)}</span>
                </span>
                <span className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="gold"
                    onClick={() => {
                      addTarefa(obra.id, sg.titulo);
                      resolverSugestao(sg.id, "aceite");
                      toast.success("Tarefa adicionada a partir da sugestão");
                    }}
                  >
                    <Plus size={13} /> Adicionar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { resolverSugestao(sg.id, "rejeitada"); toast.message("Sugestão rejeitada"); }}>
                    Rejeitar
                  </Button>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Checklist — caixas grandes */}
      {pendentes.length === 0 && feitas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <CheckCircle2 size={28} className="mx-auto mb-2" />
            <p className="text-base">Sem tarefas. Coisas simples: "Escolher azulejos", "Ligar ao picheleiro"…</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {pendentes.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
              <button
                onClick={() => {
                  if (!souGestor) { toast.message("Só o gestor pica as tarefas"); return; }
                  toggleTarefa(obra.id, t.id, CURRENT_USER_ID);
                  toast.success(`Tarefa concluída · ${t.titulo}`);
                }}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                  souGestor ? "border-line hover:border-success hover:bg-success/10" : "border-line opacity-60"
                )}
                title={souGestor ? "Marcar como feita" : "Só o gestor pica as tarefas"}
              />
              <span className="min-w-0 flex-1 text-base text-ink">{t.titulo}</span>
              {souGestor && (
                <button onClick={() => removeTarefa(obra.id, t.id)} className="text-muted hover:text-danger" title="Eliminar">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}

          {feitas.length > 0 && (
            <div className="pt-1">
              <button
                onClick={() => setFeitasAbertas((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-line/60 bg-bg/40 px-4 py-2.5 text-base text-muted"
              >
                <span>Feitas ({feitas.length})</span>
                <ChevronDown size={16} className={cn("transition-transform", feitasAbertas && "rotate-180")} />
              </button>
              {feitasAbertas && (
                <div className="mt-2 space-y-2 animate-fade-in">
                  {feitas.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 rounded-xl border border-success/25 bg-success/5 px-4 py-3">
                      <button
                        onClick={() => souGestor && toggleTarefa(obra.id, t.id, CURRENT_USER_ID)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-success bg-success text-white"
                        title={souGestor ? "Desmarcar" : undefined}
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <span className="min-w-0 flex-1 text-base text-muted line-through">{t.titulo}</span>
                      <span className="text-sm text-muted">
                        {t.feitoPor ? `${nomeProprio(profiles.find((p) => p.id === t.feitoPor)?.fullName)} · ` : ""}
                        {t.dataFeito ? dataPT(t.dataFeito) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Passos com datas e custos (avançado) — as fases estruturadas */}
      <FasesAvancado obra={obra} souGestor={souGestor} />
    </div>
  );
}

/** Fases estruturadas (datas + custos + slider) — colapsadas por baixo da checklist. */
function FasesAvancado({ obra, souGestor }: { obra: Obra; souGestor: boolean }) {
  const fasesAll = useObrasStore((s) => s.fases);
  const despesas = useObrasStore((s) => s.despesas);
  const addFase = useObrasStore((s) => s.addFase);
  const updateFase = useObrasStore((s) => s.updateFase);
  const removeFase = useObrasStore((s) => s.removeFase);
  const reorderFases = useObrasStore((s) => s.reorderFases);
  const [open, setOpen] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");

  const fases = fasesAll.filter((f) => f.obraId === obra.id).sort((a, b) => a.ordem - b.ordem);
  if (fases.length === 0 && !souGestor) return null;

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const ids = fases.map((f) => f.id);
    [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    reorderFases(obra.id, ids);
  };
  const moveDown = (idx: number) => {
    if (idx >= fases.length - 1) return;
    const ids = fases.map((f) => f.id);
    [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    reorderFases(obra.id, ids);
  };

  return (
    <div className="rounded-2xl border border-line bg-card">
      <button onClick={() => setOpen((v) => !v)} className="flex min-h-12 w-full items-center justify-between px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-base font-medium text-ink">
          <Hammer size={16} className="text-muted" /> Passos com datas e custos {fases.length > 0 ? `(${fases.length})` : "(avançado)"}
        </span>
        <ChevronDown size={16} className={cn("text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-line p-4 animate-fade-in">
          {fases.length > 0 && (
            <p className="text-sm text-muted">Com passos definidos, o progresso da obra é a média dos passos.</p>
          )}
          {fases.map((f, idx) => {
            const real = custoRealFase(f.id, despesas);
            const desvF = real - f.custoEstimado;
            return (
              <div key={f.id} className="rounded-xl border border-line/70 bg-bg/40 p-3">
                <div className="flex items-start gap-3">
                  {souGestor && (
                    <div className="flex flex-col gap-1">
                      <button onClick={() => moveUp(idx)} disabled={idx === 0} className="text-muted hover:text-ink disabled:opacity-30"><ArrowUp size={14} /></button>
                      <button onClick={() => moveDown(idx)} disabled={idx === fases.length - 1} className="text-muted hover:text-ink disabled:opacity-30"><ArrowDown size={14} /></button>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-base font-medium text-ink">
                        <span className="num mr-2 text-muted">#{idx + 1}</span>
                        {f.titulo}
                      </p>
                      <div className="flex items-center gap-2">
                        {f.dataInicio && (
                          <span className="num text-sm text-muted">{dataPT(f.dataInicio)} → {dataPT(f.dataFim)}</span>
                        )}
                        {souGestor && (
                          <button onClick={() => removeFase(f.id)} className="text-muted hover:text-danger" title="Eliminar passo">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="num mt-1 text-sm text-muted">
                      Custo: {eur(real)} / {eur(f.custoEstimado)}
                      {desvF !== 0 && (
                        <span className={cn("ml-1 font-semibold", desvF > 0 ? "text-danger" : "text-success")}>
                          {desvF > 0 ? "+" : ""}{eur(desvF)}
                        </span>
                      )}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={f.progresso}
                        disabled={!souGestor}
                        onChange={(e) => updateFase(f.id, { progresso: Number(e.target.value) })}
                        className="h-2 flex-1 accent-[#C8A664] disabled:opacity-50"
                      />
                      <span className={cn("num w-11 text-right text-sm font-bold", f.progresso === 100 ? "text-success" : "text-ink")}>{f.progresso}%</span>
                      {souGestor && f.progresso < 100 && (
                        <button
                          onClick={() => { updateFase(f.id, { progresso: 100 }); toast.success(`Passo concluído · ${f.titulo}`); }}
                          className="rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-medium text-success hover:bg-success/20"
                        >
                          Concluído
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {souGestor && (
            <div className="flex gap-2">
              <input
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Novo passo (ex.: Demolição)"
                className={inputCls}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && novoTitulo.trim()) {
                    addFase({ obraId: obra.id, titulo: novoTitulo.trim(), dataInicio: "", dataFim: "", progresso: 0, custoEstimado: 0, ordem: fases.length + 1 });
                    setNovoTitulo("");
                    toast.success("Passo adicionado");
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (!novoTitulo.trim()) return;
                  addFase({ obraId: obra.id, titulo: novoTitulo.trim(), dataInicio: "", dataFim: "", progresso: 0, custoEstimado: 0, ordem: fases.length + 1 });
                  setNovoTitulo("");
                  toast.success("Passo adicionado");
                }}
              >
                <Plus size={15} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 📞 CONTACTOS (botão de pânico) ─────────────────────────
// Um toque no cartão LIGA. Todos veem e ligam; só o gestor adiciona/edita.

export function ContactosScreen({ obra, souGestor }: { obra: Obra; souGestor: boolean }) {
  const technicians = useTechniciansStore((s) => s.technicians);
  const addContactoObra = useObrasStore((s) => s.addContactoObra);
  const removeContactoObra = useObrasStore((s) => s.removeContactoObra);
  const [addOpen, setAddOpen] = useState(false);
  const [cartaoId, setCartaoId] = useState<string | null>(null);

  const empreiteiro = technicians.find((t) => t.id === obra.empreiteiroId) ?? technicians.find((t) => t.nome === obra.empreiteiro);
  const extras = (obra.contactosIds ?? [])
    .map((id) => technicians.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t && t.id !== empreiteiro?.id);
  const lista = [...(empreiteiro ? [empreiteiro] : []), ...extras];
  const disponiveis = technicians.filter((t) => !lista.some((l) => l.id === t.id));

  const telHref = (tel: string) => `tel:${tel.replace(/\s/g, "")}`;
  const waHref = (tel: string) => `https://wa.me/${tel.replace(/[^\d]/g, "")}`;

  return (
    <div className="space-y-3">
      {/* Empreiteiro manual (sem ficha no diretório) */}
      {!empreiteiro && obra.empreiteiro && (
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-bold text-white">
              {obra.empreiteiro[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-secondary">Empreiteiro</p>
              <p className="truncate text-lg font-semibold text-ink">{obra.empreiteiro}</p>
              {obra.contactoEmpreiteiro && <p className="truncate text-sm text-muted">{obra.contactoEmpreiteiro}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {lista.map((t) => {
        const ehEmpreiteiro = t.id === empreiteiro?.id;
        const profissao = t.especialidades[0] ? ESPECIALIDADE_LABEL[t.especialidades[0]] : "Técnico";
        return (
          <Card key={t.id} className={cn(ehEmpreiteiro && "border-gold/40")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Toque no cartão → LIGA */}
                <a href={telHref(t.telefone)} className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-bold text-white">
                    {t.nome[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold uppercase tracking-wide text-secondary">
                        {ehEmpreiteiro ? "Empreiteiro · " : ""}{profissao}
                      </span>
                      {ehEmpreiteiro && obra.contrato?.alvaraVerificadoIMPIC && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-semibold text-success">
                          <ShieldCheck size={11} /> Alvará verificado
                        </span>
                      )}
                      {t.avaliacaoMedia > 0 && (
                        <span className="num inline-flex items-center gap-0.5 text-sm text-gold-dark">
                          <Star size={12} className="fill-gold text-gold" /> {t.avaliacaoMedia.toFixed(1)}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-lg font-semibold text-ink">{t.nome}</span>
                    <span className="num block truncate text-sm text-muted">{t.telefone}</span>
                  </span>
                </a>
                <div className="flex shrink-0 items-center gap-2">
                  <a href={telHref(t.telefone)} className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-white shadow-sm hover:opacity-90" title="Ligar">
                    <Phone size={20} />
                  </a>
                  <a href={`mailto:${t.email}`} className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-card text-secondary hover:bg-accent" title="Email">
                    <Mail size={19} />
                  </a>
                  <a href={waHref(t.telefone)} target="_blank" rel="noreferrer" className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-card text-success hover:bg-accent" title="WhatsApp">
                    <MessageCircle size={19} />
                  </a>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <button onClick={() => setCartaoId(t.id)} className="text-sm text-secondary hover:underline">Ver ficha completa</button>
                {souGestor && !ehEmpreiteiro && (
                  <button onClick={() => removeContactoObra(obra.id, t.id)} className="text-sm text-muted hover:text-danger">
                    Remover desta obra
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {lista.length === 0 && !obra.empreiteiro && (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <Phone size={28} className="mx-auto mb-2" />
            <p className="text-base">Sem contactos nesta obra. Adicione o eletricista, o picheleiro, o fornecedor…</p>
          </CardContent>
        </Card>
      )}

      {/* Adicionar do diretório — só o gestor */}
      {souGestor && (
        <div>
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-card text-base font-semibold text-secondary transition-colors hover:border-gold hover:text-gold-dark"
          >
            <Plus size={18} /> Adicionar contacto
          </button>
          {addOpen && (
            <Card className="mt-2">
              <CardContent className="space-y-1.5 p-3">
                {disponiveis.length === 0 ? (
                  <p className="py-3 text-center text-sm text-muted">Todos os técnicos do diretório já estão nesta obra.</p>
                ) : (
                  disponiveis.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        addContactoObra(obra.id, t.id);
                        setAddOpen(false);
                        toast.success(`${t.nome} adicionado aos contactos da obra`);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-accent"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-white">{t.nome[0]}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-medium text-ink">{t.nome}</span>
                        <span className="block text-sm text-muted">{t.especialidades[0] ? ESPECIALIDADE_LABEL[t.especialidades[0]] : "Técnico"}</span>
                      </span>
                      <Plus size={16} className="text-muted" />
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {cartaoId && <EmpreiteiroDialog technicianId={cartaoId} onClose={() => setCartaoId(null)} />}
    </div>
  );
}
