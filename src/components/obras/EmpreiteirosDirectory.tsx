import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Phone, Mail, Pencil, Plus, Star, MapPin, X, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  useTechniciansStore,
  ESPECIALIDADE_LABEL,
  type Technician,
  type Especialidade,
} from "@/store/useTechniciansStore";
import { EmpreiteiroDialog, Estrelinhas } from "@/components/obras/EmpreiteiroCard";
import { cn } from "@/lib/utils";

// Diretório de EMPREITEIROS (nível 1 da Gestão de Obras) — contacto vivo:
// ligar/email num toque, filtros por especialidade/zona/favoritos, CRUD completo.

const inputCls = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

export function EmpreiteirosDirectory() {
  const technicians = useTechniciansStore((s) => s.technicians);
  const toggleFavorito = useTechniciansStore((s) => s.toggleFavorito);

  const [espFiltro, setEspFiltro] = useState<Especialidade | "">("");
  const [zonaFiltro, setZonaFiltro] = useState("");
  const [soFavoritos, setSoFavoritos] = useState(false);
  const [editar, setEditar] = useState<Technician | "novo" | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  const zonas = useMemo(() => [...new Set(technicians.flatMap((t) => t.zonas))].sort(), [technicians]);

  const lista = technicians.filter((t) => {
    if (espFiltro && !t.especialidades.includes(espFiltro)) return false;
    if (zonaFiltro && !t.zonas.includes(zonaFiltro)) return false;
    if (soFavoritos && !t.favorito) return false;
    return true;
  });

  return (
    <div className="mt-4">
      {/* Filtros simples */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={espFiltro} onChange={(e) => setEspFiltro(e.target.value as Especialidade | "")} className={cn(inputCls, "h-9 w-auto")}>
          <option value="">Todas as especialidades</option>
          {(Object.keys(ESPECIALIDADE_LABEL) as Especialidade[]).map((e) => (
            <option key={e} value={e}>{ESPECIALIDADE_LABEL[e]}</option>
          ))}
        </select>
        <select value={zonaFiltro} onChange={(e) => setZonaFiltro(e.target.value)} className={cn(inputCls, "h-9 w-auto")}>
          <option value="">Todas as zonas</option>
          {zonas.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <button
          onClick={() => setSoFavoritos((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            soFavoritos ? "border-gold bg-gold/10 text-gold-dark" : "border-line bg-card text-muted hover:text-ink"
          )}
        >
          <Star size={13} className={cn(soFavoritos && "fill-gold text-gold")} /> Favoritos
        </button>
        <Button size="sm" variant="gold" className="ml-auto" onClick={() => setEditar("novo")}>
          <Plus size={14} /> Novo empreiteiro
        </Button>
      </div>

      {lista.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-card/50 px-6 py-14 text-center text-sm text-muted">
          Sem empreiteiros nesta vista. <button onClick={() => setEditar("novo")} className="text-secondary underline">Adicionar o primeiro</button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((t) => (
            <Card key={t.id} className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-white">
                    {t.nome.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => setAberto(t.id)} className="block truncate text-left text-sm font-semibold text-ink hover:text-primary">
                      {t.nome}
                    </button>
                    {t.empresa && <p className="truncate text-[11px] text-muted">{t.empresa}</p>}
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                      <Estrelinhas n={t.avaliacaoMedia} size={11} />
                      <span className="num font-semibold text-ink">{t.avaliacaoMedia.toFixed(1)}</span>
                      <span className="text-muted">· {t.numTrabalhos} {t.numTrabalhos === 1 ? "trabalho" : "trabalhos"}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFavorito(t.id)}
                    className="shrink-0 p-1"
                    title={t.favorito ? "Remover dos favoritos" : "Marcar favorito"}
                  >
                    <Star size={16} className={t.favorito ? "fill-gold text-gold" : "text-line hover:text-gold"} />
                  </button>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1">
                  {t.especialidades.map((e) => (
                    <span key={e} className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-secondary">{ESPECIALIDADE_LABEL[e]}</span>
                  ))}
                  {t.zonas.map((z) => (
                    <span key={z} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] text-muted"><MapPin size={10} /> {z}</span>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <a href={`tel:${t.telefone.replace(/\s/g, "")}`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-medium text-white hover:bg-secondary">
                    <Phone size={13} /> Ligar
                  </a>
                  <a href={`mailto:${t.email}`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-card text-xs text-ink hover:bg-accent">
                    <Mail size={13} /> Email
                  </a>
                  <button onClick={() => setEditar(t)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-card text-xs text-muted hover:bg-accent hover:text-ink">
                    <Pencil size={13} /> Editar
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {aberto && <EmpreiteiroDialog technicianId={aberto} onClose={() => setAberto(null)} />}
      {editar && <EmpreiteiroForm inicial={editar === "novo" ? null : editar} onClose={() => setEditar(null)} />}
    </div>
  );
}

/** Formulário de criar/editar empreiteiro (modal simples). */
function EmpreiteiroForm({ inicial, onClose }: { inicial: Technician | null; onClose: () => void }) {
  const add = useTechniciansStore((s) => s.add);
  const update = useTechniciansStore((s) => s.update);
  const remove = useTechniciansStore((s) => s.remove);

  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [empresa, setEmpresa] = useState(inicial?.empresa ?? "");
  const [telefone, setTelefone] = useState(inicial?.telefone ?? "");
  const [email, setEmail] = useState(inicial?.email ?? "");
  const [nif, setNif] = useState(inicial?.nif ?? "");
  const [zonasTxt, setZonasTxt] = useState(inicial?.zonas.join(", ") ?? "");
  const [esp, setEsp] = useState<Especialidade[]>(inicial?.especialidades ?? []);
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [erros, setErros] = useState<Record<string, string>>({});

  const toggleEsp = (e: Especialidade) =>
    setEsp((p) => (p.includes(e) ? p.filter((x) => x !== e) : [...p, e]));

  const guardar = () => {
    const errs: Record<string, string> = {};
    if (!nome.trim()) errs.nome = "Indique o nome";
    if (!telefone.trim()) errs.telefone = "Indique o telefone";
    if (!email.trim()) errs.email = "Indique o email";
    if (Object.keys(errs).length > 0) {
      setErros(errs);
      toast.error("Faltam campos obrigatórios");
      return;
    }
    const payload = {
      nome: nome.trim(),
      empresa: empresa.trim() || undefined,
      telefone: telefone.trim(),
      email: email.trim(),
      nif: nif.trim() || undefined,
      zonas: zonasTxt.split(",").map((z) => z.trim()).filter(Boolean),
      especialidades: esp.length > 0 ? esp : (["geral"] as Especialidade[]),
      notas: notas.trim(),
      favorito: inicial?.favorito ?? false,
    };
    if (inicial) {
      update(inicial.id, payload);
      toast.success("Empreiteiro atualizado");
    } else {
      add(payload);
      toast.success("Empreiteiro adicionado ao diretório");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-semibold text-ink">{inicial ? "Editar empreiteiro" : "Novo empreiteiro"}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <Campo label="Nome" erro={erros.nome}>
            <input value={nome} onChange={(e) => { setNome(e.target.value); setErros((p) => ({ ...p, nome: "" })); }} placeholder="Ex.: Hidro Lisboa" className={inputCls} />
          </Campo>
          <Campo label="Empresa (opcional)">
            <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={inputCls} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Telefone" erro={erros.telefone}>
              <input value={telefone} onChange={(e) => { setTelefone(e.target.value); setErros((p) => ({ ...p, telefone: "" })); }} placeholder="+351 …" className={inputCls} />
            </Campo>
            <Campo label="Email" erro={erros.email}>
              <input value={email} onChange={(e) => { setEmail(e.target.value); setErros((p) => ({ ...p, email: "" })); }} className={inputCls} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="NIF (opcional)">
              <input value={nif} onChange={(e) => setNif(e.target.value)} placeholder="9 dígitos" className={inputCls} />
            </Campo>
            <Campo label="Zonas (separadas por vírgula)">
              <input value={zonasTxt} onChange={(e) => setZonasTxt(e.target.value)} placeholder="Lisboa, Setúbal" className={inputCls} />
            </Campo>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">Especialidades</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ESPECIALIDADE_LABEL) as Especialidade[]).map((e) => (
                <button
                  key={e}
                  onClick={() => toggleEsp(e)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    esp.includes(e) ? "border-gold bg-gold/10 text-gold-dark" : "border-line bg-card text-muted hover:text-ink"
                  )}
                >
                  {ESPECIALIDADE_LABEL[e]}
                </button>
              ))}
            </div>
          </div>
          <Campo label="Notas (opcional)">
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-secondary" />
          </Campo>
        </div>
        <div className="flex items-center justify-between border-t border-line bg-bg/40 px-5 py-4">
          {inicial ? (
            <button
              onClick={() => {
                if (confirm(`Remover "${inicial.nome}" do diretório?`)) {
                  remove(inicial.id);
                  toast.success("Empreiteiro removido");
                  onClose();
                }
              }}
              className="text-xs text-muted underline hover:text-danger"
            >
              Remover do diretório
            </button>
          ) : (
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          )}
          <Button variant="gold" onClick={guardar}><Check size={15} /> Guardar</Button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, erro, children }: { label: string; erro?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {erro && <span className="mt-1 block text-xs text-danger">{erro}</span>}
    </label>
  );
}
