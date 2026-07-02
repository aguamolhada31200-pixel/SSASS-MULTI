import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { X, Sparkles, Send, BadgeCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import { useListingsStore, TYPE_LABEL_SHORT, type ListingType } from "@/store/useListingsStore";
import { useInterestsStore } from "@/store/useInterestsStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { capitalDoAnuncio, ctaCedencia } from "@/lib/calc/rede";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

const TEMPLATE: Record<ListingType, string> = {
  reabilitacao: "Olá, tenho interesse em ser parceiro neste projeto. Podemos falar sobre os números e o split?",
  cedencia: "Olá, tenho interesse na cedência de posição. Pode partilhar mais detalhes sobre o negócio?",
  arrendamento: "Olá, tenho interesse neste imóvel. Ainda está disponível?",
};

const inpCls = "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-gold";

export function InterestModal() {
  const { interestForm, closeInterest } = useModalStore();
  const { open, listingId } = interestForm;
  const navigate = useNavigate();

  const listing = useListingsStore((s) => (listingId ? s.listings.find((l) => l.id === listingId) : undefined));
  const incrementContacts = useListingsStore((s) => s.incrementContacts);
  const addInterest = useInterestsStore((s) => s.add);
  const getOrCreate = useConversationsStore((s) => s.getOrCreate);
  const sendMessage = useConversationsStore((s) => s.sendMessage);
  const profiles = useProfilesStore((s) => s.profiles);
  const updateProfile = useProfilesStore((s) => s.update);

  const me = profiles.find((p) => p.id === CURRENT_USER_ID);
  const author = profiles.find((p) => p.id === listing?.authorId);
  const semNome = !(me?.fullName ?? "").trim();

  const [message, setMessage] = useState("");
  const [partilharPerfil, setPartilharPerfil] = useState(true);
  const [nome, setNome] = useState("");

  useEffect(() => {
    if (open && listing) {
      setMessage(TEMPLATE[listing.type]);
      setPartilharPerfil(true);
      setNome("");
    }
  }, [open, listing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !listing) return null;

  const capital = listing.type === "cedencia" ? ctaCedencia(listing) : capitalDoAnuncio(listing);
  const capitalLabel = listing.type === "cedencia" ? "CTA" : "Capital";

  const enviar = () => {
    const txt = message.trim();
    if (!txt) {
      toast.error("Escreva uma mensagem para o anunciante");
      return;
    }
    if (semNome && !nome.trim()) {
      toast.error("Indique o seu nome — o anunciante precisa de saber com quem fala");
      return;
    }
    if (semNome) updateProfile(CURRENT_USER_ID, { fullName: nome.trim() });

    // 1. Regista o interesse
    addInterest(listing.id, txt, partilharPerfil);
    // 2. Cria/abre a conversa e insere a mensagem
    const convId = getOrCreate(listing.authorId, "listing", listing.id);
    sendMessage(convId, txt);
    // 3+4. Anunciante "notificado" + contactos do anúncio
    incrementContacts(listing.id);

    closeInterest();
    toast.success("Interesse enviado ✨", {
      description: "Pode continuar a conversa em Mensagens.",
      action: { label: "Abrir conversa", onClick: () => navigate(`/mensagens?c=${convId}`) },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={closeInterest}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold-dark">
              <Sparkles size={16} />
            </span>
            <h2 className="font-display text-base font-semibold text-ink">Manifestar interesse</h2>
          </div>
          <button onClick={closeInterest} className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {/* Mini-card do anúncio */}
          <div className="flex items-center gap-3 rounded-xl border border-gold/25 bg-gold/5 p-3">
            <img src={listing.coverImageUrl} alt="" className="h-14 w-16 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{listing.title}</p>
              <p className="text-[11px] text-muted">
                {TYPE_LABEL_SHORT[listing.type]} · <span className="num font-semibold text-gold-dark">{capitalLabel} {eur(capital)}</span>
              </p>
              <p className="flex items-center gap-1 text-[11px] text-muted">
                {author?.fullName ?? "Investidor"}
                {author?.isVerified && <BadgeCheck size={11} className="text-gold-dark" />}
              </p>
            </div>
          </div>

          {/* Nome (só se o perfil não tem) */}
          {semNome && (
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
                <UserRound size={12} /> O seu nome
              </span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como o anunciante o deve tratar" className={inpCls} />
            </label>
          )}

          {/* Mensagem */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Mensagem</span>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-line bg-card p-3 text-sm outline-none focus:border-gold"
            />
          </label>

          {/* Toggle partilhar perfil */}
          <label className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5">
            <span className="pr-3">
              <span className="block text-sm text-ink">Partilhar o meu perfil de investidor</span>
              <span className="block text-[11px] text-muted">Dá contexto e confiança ao anunciante.</span>
            </span>
            <button
              type="button"
              onClick={() => setPartilharPerfil((v) => !v)}
              className={cn(
                "inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
                partilharPerfil ? "bg-gold" : "bg-line"
              )}
            >
              <span className={cn("h-4 w-4 rounded-full bg-white transition-transform", partilharPerfil && "translate-x-4")} />
            </button>
          </label>
        </div>

        {/* Footer */}
        <div className="border-t border-line bg-bg/40 px-5 py-4">
          <Button variant="gold" className="w-full" onClick={enviar}>
            <Send size={15} /> Enviar interesse
          </Button>
        </div>
      </div>
    </div>
  );
}
