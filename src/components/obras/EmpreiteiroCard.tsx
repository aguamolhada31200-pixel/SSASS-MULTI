import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { X, Phone, Mail, Star, Hammer, MapPin, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTechniciansStore, ESPECIALIDADE_LABEL, type Technician } from "@/store/useTechniciansStore";
import { useObrasStore, gastoReal } from "@/store/useObrasStore";
import { eur, dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

// Cartão/diálogo do EMPREITEIRO — contacto vivo (tel/email) + histórico de
// obras com este empreiteiro + avaliação. Aberto do header da obra e do diretório.

export function Estrelinhas({ n, size = 13 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(n) ? "fill-gold text-gold" : "text-line"} />
      ))}
    </span>
  );
}

export function EmpreiteiroDialog({ technicianId, onClose }: { technicianId: string; onClose: () => void }) {
  const tec = useTechniciansStore((s) => s.technicians.find((t) => t.id === technicianId));
  const obras = useObrasStore((s) => s.obras);
  const despesas = useObrasStore((s) => s.despesas);

  if (!tec) return null;
  const historico = obras
    .filter((o) => o.empreiteiroId === tec.id || o.empreiteiro === tec.nome)
    .sort((a, b) => (a.dataInicio < b.dataInicio ? 1 : -1));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-base font-semibold text-white">
              {tec.nome.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="flex items-center gap-1.5 font-display text-base font-semibold text-ink">
                {tec.nome}
                {tec.favorito && <BadgeCheck size={15} className="text-gold-dark" />}
              </p>
              {tec.empresa && <p className="text-xs text-muted">{tec.empresa}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Contacto direto */}
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${tec.telefone.replace(/\s/g, "")}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-white hover:bg-secondary">
              <Phone size={15} /> Ligar
            </a>
            <a href={`mailto:${tec.email}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-card text-sm text-ink hover:bg-accent">
              <Mail size={15} /> Email
            </a>
          </div>
          <div className="space-y-1 text-sm">
            <p className="num text-muted">{tec.telefone} · {tec.email}</p>
            {tec.nif && <p className="num text-xs text-muted">NIF {tec.nif}</p>}
          </div>

          {/* Especialidades + zonas + avaliação */}
          <div className="flex flex-wrap items-center gap-1.5">
            {tec.especialidades.map((e) => (
              <span key={e} className="rounded-full bg-accent px-2.5 py-1 text-xs text-secondary">{ESPECIALIDADE_LABEL[e]}</span>
            ))}
            {tec.zonas.map((z) => (
              <span key={z} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs text-muted"><MapPin size={11} /> {z}</span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Estrelinhas n={tec.avaliacaoMedia} />
            <span className="num font-semibold text-ink">{tec.avaliacaoMedia.toFixed(1)}</span>
            <span className="text-xs text-muted">· {tec.numTrabalhos} {tec.numTrabalhos === 1 ? "trabalho" : "trabalhos"}</span>
          </div>
          {tec.notas && <p className="rounded-lg bg-bg/60 px-3 py-2 text-xs text-muted">{tec.notas}</p>}

          {/* Histórico de obras com este empreiteiro */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Obras com {tec.nome}</p>
            {historico.length === 0 ? (
              <p className="text-sm text-muted">Ainda sem obras registadas.</p>
            ) : (
              <div className="space-y-1.5">
                {historico.map((o) => {
                  const casaId = o.projectId ?? o.propertyId;
                  return (
                    <Link
                      key={o.id}
                      to={`/comunidade/colaborativa/obras/${casaId}/${o.id}`}
                      onClick={onClose}
                      className="flex items-center justify-between gap-2 rounded-lg border border-line bg-bg/40 px-3 py-2 text-sm hover:bg-accent"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Hammer size={13} className="shrink-0 text-secondary" />
                        <span className="truncate text-ink">{o.titulo}</span>
                      </span>
                      <span className="num shrink-0 text-xs text-muted">
                        {eur(gastoReal(o, despesas))}{o.dataFimReal ? ` · ${dataPT(o.dataFimReal)}` : ""}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Diálogo de avaliação ao concluir uma obra — atualiza a média do empreiteiro. */
export function AvaliarEmpreiteiroDialog({
  technician,
  onClose,
}: {
  technician: Technician;
  onClose: (estrelas?: number) => void;
}) {
  const avaliar = useTechniciansStore((s) => s.avaliar);
  const [estrelas, setEstrelas] = useState(0);
  const [comentario, setComentario] = useState("");

  const submeter = () => {
    if (estrelas < 1) {
      toast.error("Escolha as estrelas (1 a 5)");
      return;
    }
    avaliar(technician.id, estrelas);
    if (comentario.trim()) {
      useTechniciansStore.getState().update(technician.id, {
        notas: [technician.notas, comentario.trim()].filter(Boolean).join(" · "),
      });
    }
    toast.success(`Avaliação registada · ${technician.nome}`, { description: `${estrelas} de 5 estrelas.` });
    onClose(estrelas);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={() => onClose()}>
      <div className="w-full max-w-sm overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="border-b border-line px-5 py-4">
          <p className="font-display text-base font-semibold text-ink">Avaliar {technician.nome}?</p>
          <p className="text-xs text-muted">Como correu o trabalho? A avaliação fica no diretório.</p>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} onClick={() => setEstrelas(i)} className="p-1 transition-transform hover:scale-110">
                <Star size={28} className={cn(i <= estrelas ? "fill-gold text-gold" : "text-line")} />
              </button>
            ))}
          </div>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={2}
            placeholder="Comentário (opcional) — Ex.: cumpriu prazos, bom acabamento…"
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-secondary"
          />
        </div>
        <div className="flex items-center justify-between border-t border-line bg-bg/40 px-5 py-4">
          <Button variant="ghost" onClick={() => onClose()}>Agora não</Button>
          <Button variant="gold" onClick={submeter}><Star size={14} /> Avaliar</Button>
        </div>
      </div>
    </div>
  );
}
