import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toastSuccess, toastError, toastWarning, toastInfo, toastDismiss } from "@/lib/toast";
import { ArrowLeft, X, Plus, ImagePlus, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useProfilesStore, useCurrentUser, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { cn } from "@/lib/utils";

const inputCls = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

export default function EditProfile() {
  const navigate = useNavigate();
  const me = useCurrentUser();
  const update = useProfilesStore((s) => s.update);

  const [tagline, setTagline] = useState(me?.tagline ?? "");
  const [bio, setBio] = useState(me?.bio ?? "");
  const [city, setCity] = useState(me?.city ?? "");
  const [avatarUrl, setAvatarUrl] = useState(me?.avatarUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(me?.coverUrl ?? "");
  const [available, setAvailable] = useState(me?.availableForPartnership ?? false);
  const [interesses, setInteresses] = useState<string[]>(me?.interesses ?? []);
  const [anos, setAnos] = useState<number | undefined>(me?.experienciaAutoDeclaradaAnos);
  const [novaTag, setNovaTag] = useState("");

  if (!me) return null;

  const onFile = (file: File, set: (v: string) => void) => {
    const r = new FileReader();
    r.onload = () => set(String(r.result));
    r.readAsDataURL(file);
  };

  const addTag = () => {
    const t = novaTag.trim();
    if (t && !interesses.includes(t)) setInteresses([...interesses, t]);
    setNovaTag("");
  };

  const guardar = () => {
    update(CURRENT_USER_ID, {
      tagline,
      bio,
      city,
      avatarUrl: avatarUrl || undefined,
      coverUrl: coverUrl || undefined,
      availableForPartnership: available,
      interesses,
      experienciaAutoDeclaradaAnos: anos,
    });
    toastSuccess("Perfil atualizado");
    navigate("/comunidade/rede/meu-perfil");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/comunidade/rede/meu-perfil" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> O meu perfil
      </Link>

      <h1 className="mb-1 font-display text-2xl font-bold text-ink">Editar perfil de investidor</h1>
      <p className="mb-5 text-sm text-muted">Estes campos são públicos e aparecem na Rede de Investidores.</p>

      <Card>
        <CardContent className="space-y-4">
          {/* Cover */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">Imagem de capa</p>
            <div className="relative h-28 overflow-hidden rounded-xl border border-line bg-accent">
              {coverUrl && <img src={coverUrl} alt="" className="h-full w-full object-cover" />}
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-card/90 px-2.5 text-xs text-ink backdrop-blur hover:bg-card">
                  <ImagePlus size={13} /> Carregar
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f, setCoverUrl); e.target.value = ""; }} />
                </label>
              </div>
            </div>
            <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="ou colar URL da capa…" className={cn(inputCls, "mt-2")} />
          </div>

          {/* Avatar + Nome */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-line bg-accent">
              {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xl text-muted">{me.fullName[0]}</div>}
            </div>
            <div className="flex-1">
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-medium text-muted"><Lock size={11} /> Nome (vem da conta)</span>
                <input value={me.fullName} disabled className={cn(inputCls, "cursor-not-allowed opacity-60")} />
              </label>
            </div>
          </div>
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="URL do avatar (ou carregue acima)…" className={inputCls} />

          <Field label="Tagline">
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputCls} placeholder="Ex.: Compra e revenda no Grande Porto" />
          </Field>
          <Field label="Bio">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className={cn(inputCls, "h-auto py-2")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cidade">
              <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Experiência (auto-declarada, anos)">
              <input type="number" value={anos ?? ""} onChange={(e) => setAnos(e.target.value ? Number(e.target.value) : undefined)} className={inputCls} />
            </Field>
          </div>

          {/* Disponibilidade */}
          <div className="flex items-center justify-between rounded-lg border border-line bg-bg p-3">
            <div>
              <p className="text-sm font-medium text-ink">Disponível para parceria</p>
              <p className="text-xs text-muted">Mostra um selo verde no seu perfil e cards.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={available}
              onClick={() => setAvailable((v) => !v)}
              className={cn("inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors", available ? "bg-success" : "bg-line")}
            >
              <span className={cn("h-5 w-5 rounded-full bg-white shadow transition-transform", available && "translate-x-5")} />
            </button>
          </div>

          {/* Interesses */}
          <Field label="Interesses">
            <div className="flex flex-wrap gap-1.5">
              {interesses.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs text-secondary">
                  {t}
                  <button onClick={() => setInteresses(interesses.filter((x) => x !== t))} className="hover:text-danger"><X size={11} /></button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input value={novaTag} onChange={(e) => setNovaTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Adicionar interesse…" className={inputCls} />
              <Button type="button" variant="outline" onClick={addTag}><Plus size={15} /></Button>
            </div>
          </Field>
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate("/comunidade/rede/meu-perfil")}>Cancelar</Button>
        <Button variant="gold" onClick={guardar}>Guardar perfil</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
