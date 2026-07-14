import { useState } from "react";
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
  MapPin,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Stars } from "@/components/rede/Stars";
import { ListingCard } from "@/components/rede/ListingCard";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { useListingsStore } from "@/store/useListingsStore";
import { usePartnerRatingsStore } from "@/store/usePartnerRatingsStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useGaleriaStore, duracaoLabel } from "@/store/useGaleriaStore";
import { ComparacaoCard } from "@/components/galeria/ComparacaoCard";
import { eur, pct, dataPTShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function InvestorProfile() {
  const params = useParams();
  // Rota /comunidade/rede/meu-perfil não tem :userId — é a vista do próprio.
  const userId = params.userId ?? CURRENT_USER_ID;
  const navigate = useNavigate();
  // Pré-visualizar como investidor — o dono vê o perfil tal como os outros o veem
  const [preview, setPreview] = useState(false);
  const profile = useProfilesStore((s) => s.profiles.find((p) => p.id === userId));
  const listings = useListingsStore((s) => s.listings.filter((l) => l.authorId === userId && l.status === "active"));
  const ratings = usePartnerRatingsStore((s) => s.ratings.filter((r) => r.ratedUserId === userId));
  const getOrCreate = useConversationsStore((s) => s.getOrCreate);
  const properties = usePropertiesStore((s) => s.properties);
  // Transformações partilháveis — prova visual de track record (não-falsificável: liga a obras reais)
  const transformacoes = useGaleriaStore((s) =>
    s.comparacoes.filter((c) => c.criadoPor === userId && c.visibilidade === "partilhavel_na_rede")
  )
    .slice()
    .sort((a, b) => Number(b.destaque) - Number(a.destaque) || (a.createdAt < b.createdAt ? 1 : -1));

  // "Imóveis registados" — conta em usePropertiesStore por owner (ownerId ausente = utilizador atual).
  const imoveisRegistados = properties.filter((p) => (p.ownerId ?? CURRENT_USER_ID) === userId).length;
  const imoveisCount = imoveisRegistados > 0
    ? imoveisRegistados
    : profile?.imoveisAutoDeclarados ?? 0;

  if (!profile)
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Investidor não encontrado.</p>
        <Link to="/comunidade/rede" className="mt-2 inline-block text-secondary hover:underline">← Voltar à Rede</Link>
      </div>
    );

  const isMe = profile.id === CURRENT_USER_ID;
  // Em pré-visualização, tudo renderiza como se fosse outra pessoa a ver
  const vistaPropria = isMe && !preview;

  const mensagem = () => {
    if (isMe) {
      toast("Modo de pré-visualização", { description: "É assim que os outros investidores contactam consigo." });
      return;
    }
    const convId = getOrCreate(profile.id, "direct");
    navigate(`/mensagens?c=${convId}`);
  };
  const convidar = () => {
    if (isMe) {
      toast("Modo de pré-visualização", { description: "É assim que os outros investidores contactam consigo." });
      return;
    }
    toast.success("Convite de parceria enviado", { description: `${profile.fullName} foi notificado(a).` });
  };

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      {/* Barra de pré-visualização — toggle claro para voltar à vista própria */}
      {isMe && preview && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-accent px-4 py-2.5 sm:px-6">
          <p className="flex items-center gap-2 text-sm text-ink">
            <Eye size={15} className="text-secondary" /> Vista pública — é isto que os outros investidores veem.
          </p>
          <button
            onClick={() => setPreview(false)}
            className="rounded-md border border-line bg-card px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-bg"
          >
            Voltar à minha vista
          </button>
        </div>
      )}
      {/* Cover (altura fixa ~200px, botão Rede sobreposto) */}
      <div className="relative h-[200px] overflow-hidden">
        {profile.coverUrl ? (
          <img src={profile.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#8B5E3C] to-[#5C3D2E]" />
        )}
        <div className="azulejo absolute inset-0 opacity-[0.06]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
        <Link
          to="/comunidade/rede"
          className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-card/85 px-3 py-1.5 text-sm text-ink backdrop-blur hover:bg-card sm:left-6"
        >
          <ArrowLeft size={15} /> Rede
        </Link>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Cabeçalho do perfil — avatar sobreposto + info + ação */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Bloco avatar + nome/tagline */}
          <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-end sm:gap-5">
            <div
              className={cn(
                "-mt-14 h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-bg bg-card shadow-md",
                profile.isVerified && "ring-2 ring-gold ring-offset-2 ring-offset-bg"
              )}
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary text-3xl font-semibold text-white">
                  {profile.fullName[0]}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-2 text-center sm:pt-4 sm:text-left">
              <h1 className="flex flex-wrap items-center justify-center gap-1.5 font-display text-2xl font-bold text-ink sm:justify-start sm:text-3xl">
                {profile.fullName}
                {profile.isVerified && <BadgeCheck size={20} className="text-gold-dark" />}
              </h1>
              {profile.tagline && <p className="mt-0.5 text-sm text-muted">{profile.tagline}</p>}
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-muted sm:justify-start">
                {profile.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {profile.city}
                  </span>
                )}
                {profile.availableForPartnership && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 font-medium text-success">
                    Disponível para parceria
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Ações — vista própria mostra Editar/Pré-visualizar; vista pública mostra contacto */}
          <div className="flex w-full flex-wrap gap-2 sm:mt-4 sm:w-auto">
            {vistaPropria ? (
              <>
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setPreview(true)}>
                  <Eye size={15} /> Pré-visualizar como investidor
                </Button>
                <Button variant="gold" className="flex-1 sm:flex-none" onClick={() => navigate("/comunidade/rede/perfil/editar")}>
                  <Pencil size={15} /> Editar perfil
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={mensagem}>
                  <MessageCircle size={15} /> Mensagem
                </Button>
                <Button variant="gold" className="flex-1 sm:flex-none" onClick={convidar}>
                  <Handshake size={15} /> Convidar parceria
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Portfólio (track record — ganho-na-plataforma) */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Anúncios ativos" value={String(listings.length)} />
          <Stat label="Imóveis registados" value={String(imoveisCount)} />
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

            {/* Transformações — prova visual de track record */}
            {transformacoes.length > 0 && (
              <div>
                <h3 className="mb-1 font-display text-lg font-semibold text-ink">Transformações · {transformacoes.length}</h3>
                <p className="mb-3 text-xs text-muted">
                  {transformacoes.length} {transformacoes.length === 1 ? "obra" : "obras"} ·{" "}
                  <span className="num">{eur(transformacoes.reduce((a, c) => a + c.custoReal, 0))}</span> investidos · média{" "}
                  {duracaoLabel(Math.round(transformacoes.reduce((a, c) => a + c.duracaoDias, 0) / transformacoes.length))}
                </p>
                <div className="grid gap-5 sm:grid-cols-2">
                  {transformacoes.map((c) => (
                    <ComparacaoCard key={c.id} c={c} readOnly />
                  ))}
                </div>
              </div>
            )}

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
                <Linha k="Membro desde" v={dataPTShort(profile.createdAt)} />
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
