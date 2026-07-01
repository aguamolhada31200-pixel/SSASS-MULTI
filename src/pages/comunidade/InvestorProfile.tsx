import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Star,
  MessageCircle,
  Handshake,
  ShieldCheck,
  ShieldAlert,
  Info,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Stars } from "@/components/rede/Stars";
import { ListingCard } from "@/components/rede/ListingCard";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { useListingsStore } from "@/store/useListingsStore";
import { usePartnerRatingsStore } from "@/store/usePartnerRatingsStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { eur, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function InvestorProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const profile = useProfilesStore((s) => s.profiles.find((p) => p.id === userId));
  const listings = useListingsStore((s) => s.listings.filter((l) => l.authorId === userId && l.status === "active"));
  const ratings = usePartnerRatingsStore((s) => s.ratings.filter((r) => r.ratedUserId === userId));
  const getOrCreate = useConversationsStore((s) => s.getOrCreate);

  if (!profile)
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Investidor não encontrado.</p>
        <Link to="/comunidade/rede" className="mt-2 inline-block text-secondary hover:underline">← Voltar à Rede</Link>
      </div>
    );

  const isMe = profile.id === CURRENT_USER_ID;

  const mensagem = () => {
    const convId = getOrCreate(profile.id, "direct");
    navigate(`/mensagens?c=${convId}`);
  };
  const convidar = () => toast.success("Convite de parceria enviado", { description: `${profile.fullName} foi notificado(a).` });

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      {/* Cover */}
      <div className="relative h-44 overflow-hidden sm:h-56">
        {profile.coverUrl ? (
          <img src={profile.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#8B5E3C] to-[#5C3D2E]" />
        )}
        <div className="azulejo absolute inset-0 opacity-[0.06]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
        <Link to="/comunidade/rede" className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-card/85 px-3 py-1.5 text-sm text-ink backdrop-blur hover:bg-card sm:left-6">
          <ArrowLeft size={15} /> Rede
        </Link>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Cabeçalho do perfil */}
        <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className={cn("h-24 w-24 overflow-hidden rounded-full border-4 border-bg", profile.isVerified && "ring-2 ring-gold")}>
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-secondary text-2xl text-white">{profile.fullName[0]}</div>}
            </div>
            <div className="pb-1">
              <h1 className="flex items-center gap-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">
                {profile.fullName}
                {profile.isVerified && <BadgeCheck size={20} className="text-gold-dark" />}
              </h1>
              <p className="text-sm text-muted">{profile.tagline}</p>
              {profile.availableForPartnership && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-medium text-success">Disponível para parceria</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isMe ? (
              <Button variant="gold" onClick={() => navigate("/comunidade/rede/perfil/editar")}><Pencil size={15} /> Editar perfil</Button>
            ) : (
              <>
                <Button variant="outline" onClick={mensagem}><MessageCircle size={15} /> Mensagem</Button>
                <Button variant="gold" onClick={convidar}><Handshake size={15} /> Convidar parceria</Button>
              </>
            )}
          </div>
        </div>

        {/* Portfólio (track record — ganho-na-plataforma) */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Anúncios ativos" value={String(listings.length)} />
          <Stat label="Valor portfólio" value={profile.valorPortfolio > 0 ? eur(profile.valorPortfolio) : "—"} />
          <Stat label="Yield médio" value={profile.yieldMedio > 0 ? pct(profile.yieldMedio) : "—"} />
          <Stat label="Projetos concluídos" value={String(profile.projetosConcluidos)} />
          <Stat label="Avaliação" value={profile.numAvaliacoes > 0 ? `${profile.rating.toFixed(1)} ★` : "—"} hint={profile.numAvaliacoes > 0 ? `${profile.numAvaliacoes} avaliações` : undefined} />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-5">
            {/* Bio */}
            <Card>
              <CardContent>
                <h3 className="mb-2 font-display text-lg font-semibold text-ink">Sobre</h3>
                <p className="text-sm leading-relaxed text-muted">{profile.bio}</p>
                {profile.interesses.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {profile.interesses.map((i) => (
                      <span key={i} className="rounded-full bg-accent px-2.5 py-1 text-xs text-secondary">{i}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Avaliações de parceiros */}
            <Card>
              <CardContent>
                <h3 className="mb-1 font-display text-lg font-semibold text-ink">Avaliações de parceiros</h3>
                <p className="mb-3 flex items-center gap-1.5 text-xs text-muted"><ShieldCheck size={13} className="text-gold-dark" /> Só de quem partilhou um projeto — não falsificável.</p>
                {ratings.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">Ainda sem avaliações.</p>
                ) : (
                  <div className="space-y-3">
                    {ratings.map((r) => (
                      <div key={r.id} className="rounded-xl border border-line/60 bg-bg p-4">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium text-ink">{r.raterName}</span>
                          <Stars value={r.rating} />
                        </div>
                        <p className="text-xs text-muted">{r.projectName}</p>
                        <p className="mt-1.5 text-sm italic text-ink">“{r.testimonial}”</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Anúncios ativos */}
            <div>
              <h3 className="mb-3 font-display text-lg font-semibold text-ink">Anúncios ativos · {listings.length}</h3>
              {listings.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-card/50 px-6 py-10 text-center text-sm text-muted">Sem anúncios ativos.</p>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar de confiança */}
          <div className="space-y-4">
            <Card>
              <CardContent>
                <h3 className="mb-3 font-display text-base font-semibold text-ink">Confiança</h3>
                <div className={cn("mb-3 flex items-center gap-2 rounded-lg p-2.5", profile.isVerified ? "bg-gold/10 text-gold-dark" : "bg-accent text-muted")}>
                  {profile.isVerified ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                  <div>
                    <p className="text-sm font-medium">{profile.isVerified ? "Identidade verificada" : "Identidade por verificar"}</p>
                    {profile.isVerified && profile.verifiedAt && <p className="text-[11px] opacity-80">desde {profile.verifiedAt}</p>}
                  </div>
                </div>
                <Linha k="Track record" v={`${profile.projetosConcluidos} projetos`} />
                {profile.taxaResposta != null && <Linha k="Responde em" v={`~${profile.respostaHoras}h`} />}
                {profile.taxaResposta != null && <Linha k="Taxa de resposta" v={`${profile.taxaResposta}%`} />}
                <Linha k="Membro desde" v={profile.createdAt} />
              </CardContent>
            </Card>

            {/* Auto-declarado (rotulado) */}
            {(profile.experienciaAutoDeclaradaAnos || profile.imoveisAutoDeclarados) && (
              <Card>
                <CardContent>
                  <h3 className="mb-1 flex items-center gap-1.5 font-display text-base font-semibold text-ink"><Info size={15} className="text-muted" /> Auto-declarado</h3>
                  <p className="mb-3 text-[11px] text-muted">Informação fornecida pelo próprio — não verificada pela plataforma.</p>
                  {profile.experienciaAutoDeclaradaAnos != null && <Linha k="Experiência" v={`${profile.experienciaAutoDeclaradaAnos} anos`} />}
                  {profile.imoveisAutoDeclarados != null && <Linha k="Imóveis em portfólio" v={String(profile.imoveisAutoDeclarados)} />}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <div className="h-10" />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4 text-center shadow-sm">
      <p className="num text-xl font-bold text-ink">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      {hint && <p className="text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 py-1.5 text-sm last:border-0">
      <span className="text-muted">{k}</span>
      <span className="font-medium text-ink">{v}</span>
    </div>
  );
}
