import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { X, Sparkles, Send, BadgeCheck, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import { useListingsStore, TYPE_LABEL_SHORT, type ListingType } from "@/store/useListingsStore";
import { useInterestsStore } from "@/store/useInterestsStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useProfilesStore, CURRENT_USER_ID } from "@/store/useProfilesStore";
import { capitalDoAnuncio, ctaCedencia } from "@/lib/calc/rede";
import { eur } from "@/lib/format";

const TEMPLATE: Record<ListingType, string> = {
  reabilitacao: "Olá, tenho interesse em ser parceiro neste projeto. Podemos falar sobre os números e o split?",
  cedencia: "Olá, tenho interesse na cedência de posição. Pode partilhar mais detalhes sobre o negócio?",
  arrendamento: "Olá, tenho interesse neste imóvel. Ainda está disponível?",
};

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

  const me = profiles.find((p) => p.id === CURRENT_USER_ID);
  const author = profiles.find((p) => p.id === listing?.authorId);
  const semConta = !me || !(me.fullName ?? "").trim();

  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open && listing) setMessage(TEMPLATE[listing.type]);
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
    // 1. Regista o interesse (perfil sempre partilhado — é o mesmo perfil da conta)
    addInterest(listing.id, txt, true);
    // 2. Cria/abre a conversa e insere a mensagem
    const convId = getOrCreate(listing.authorId, "listing", listing.id);
    sendMessage(convId, txt);
    // 3. Anunciante "notificado" via contactos do anúncio
    incrementContacts(listing.id);

    closeInterest();
    toast.success("Interesse enviado ✨", {
      description: "Pode continuar a conversa em Mensagens.",
      action: { label: "Abrir conversa", onClick: () => navigate(`/mensagens?c=${convId}`) },
    });
  };

  const irParaConta = () => {
    closeInterest();
    navigate("/perfil");
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
            <h2 className="font-display text-base font-semibold text-ink">
              {semConta ? "Criar conta" : "Manifestar interesse"}
            </h2>
          </div>
          <button onClick={closeInterest} className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>

        {semConta ? (
          <div className="space-y-4 p-5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-gold-dark">
              <Sparkles size={22} />
            </div>
            <p className="text-center font-display text-lg font-semibold text-ink">
              Crie a sua conta para manifestar interesse e falar com o anunciante.
            </p>
            <p className="text-center text-sm text-muted">
              30 segundos. Guarda favoritos, envia mensagens e mostra o seu perfil de investidor aos parceiros.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Button variant="gold" className="w-full" onClick={irParaConta}>
                <UserPlus size={15} /> Criar conta
              </Button>
              <Button variant="outline" className="w-full" onClick={irParaConta}>
                <LogIn size={15} /> Entrar
              </Button>
            </div>
          </div>
        ) : (
          <>
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
            </div>

            {/* Footer */}
            <div className="border-t border-line bg-bg/40 px-5 py-4">
              <Button variant="gold" className="w-full" onClick={enviar}>
                <Send size={15} /> Enviar interesse
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
