import { useMemo } from "react";
import { toast } from "sonner";
import { Check, X, ThumbsUp, ThumbsDown, Lock } from "lucide-react";
import {
  useObrasStore,
  membrosDe,
  roleDe,
  investidoresDe,
  votosResumo,
  ROLE_LABEL,
  ROLE_RING,
  SAUDE_HEX,
  type Obra,
  type ObraMember,
  type ObraRole,
  type Aprovacao,
  type Saude,
} from "@/store/useObrasStore";
import { useProfilesStore, CURRENT_USER_ID, type Profile } from "@/store/useProfilesStore";
import { useNotificationsStore } from "@/store/useNotificationsStore";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

// ───────────────────── Avatares de membros ─────────────────────

export function nomeProprio(full?: string): string {
  if (!full) return "—";
  return full.split(" ")[0];
}

const SIZE_CLS = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
} as const;
type AvatarSize = keyof typeof SIZE_CLS;

export function RoleAvatar({
  profile,
  role,
  size = "sm",
  title,
  className,
}: {
  profile?: Profile;
  role?: ObraRole;
  size?: AvatarSize;
  title?: string;
  className?: string;
}) {
  const ring = role ? ROLE_RING[role] : "ring-line";
  const label = title ?? (profile ? `${profile.fullName}${role ? ` · ${ROLE_LABEL[role]}` : ""}` : "");
  return (
    <span
      title={label}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-semibold text-white ring-2 ring-offset-1 ring-offset-card",
        SIZE_CLS[size],
        ring,
        className
      )}
    >
      {profile?.avatarUrl ? (
        <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        nomeProprio(profile?.fullName)[0] ?? "?"
      )}
    </span>
  );
}

/** Pilha de avatares dos membros da obra (até `max` + "+N"), com anel por papel. */
export function MemberStack({
  obra,
  max = 3,
  size = "sm",
}: {
  obra: Obra;
  max?: number;
  size?: AvatarSize;
}) {
  const profiles = useProfilesStore((s) => s.profiles);
  const membros = membrosDe(obra);
  if (membros.length === 0) return null;

  // gestor primeiro
  const ordenados = [...membros].sort((a, b) => (a.role === "gestor" ? -1 : b.role === "gestor" ? 1 : 0));
  const visiveis = ordenados.slice(0, max);
  const resto = ordenados.length - visiveis.length;

  return (
    <div className="flex items-center -space-x-2">
      {visiveis.map((m) => (
        <RoleAvatar
          key={m.userId}
          profile={profiles.find((p) => p.id === m.userId)}
          role={m.role}
          size={size}
        />
      ))}
      {resto > 0 && (
        <span
          className={cn(
            "relative inline-flex items-center justify-center rounded-full bg-accent font-semibold text-muted ring-2 ring-line ring-offset-1 ring-offset-card",
            SIZE_CLS[size]
          )}
        >
          +{resto}
        </span>
      )}
    </div>
  );
}

// ───────────────────── Anel de saúde ─────────────────────

export function SaudeRing({
  score,
  saude,
  size = 56,
  stroke = 6,
  showValue = true,
}: {
  score: number;
  saude: Saude;
  size?: number;
  stroke?: number;
  showValue?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;
  const color = SAUDE_HEX[saude];
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8D5BE" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.6s ease-out, stroke 0.3s" }}
        />
      </svg>
      {showValue && (
        <span className="num absolute font-display font-bold text-ink" style={{ fontSize: size * 0.26 }}>
          {Math.round(score)}
        </span>
      )}
    </span>
  );
}

// ───────────────────── Painel de votação ─────────────────────

export function VotacaoPanel({
  obra,
  tipo,
  itemId,
  aprovacao,
  titulo,
  valor,
  onResolved,
}: {
  obra: Obra;
  tipo: "despesa" | "marco";
  itemId: string;
  aprovacao: Aprovacao;
  titulo: string;
  valor: number;
  onResolved?: () => void;
}) {
  const profiles = useProfilesStore((s) => s.profiles);
  const votar = useObrasStore((s) => s.votar);
  const addNotif = useNotificationsStore((s) => s.add);
  const broadcast = useNotificationsStore((s) => s.broadcast);
  const investidores = investidoresDe(obra);
  const resumo = votosResumo(obra, aprovacao);
  const meuRole = roleDe(obra, CURRENT_USER_ID);
  const meuVoto = aprovacao.votos.find((v) => v.userId === CURRENT_USER_ID);
  const podeVotar = meuRole === "investidor" && aprovacao.estado === "pendente";

  const onVote = (valorVoto: "a_favor" | "contra") => {
    const estado = votar(tipo, itemId, CURRENT_USER_ID, valorVoto);
    const meuNome = nomeProprio(profiles.find((p) => p.id === CURRENT_USER_ID)?.fullName) || "Sócio";
    const labelVoto = valorVoto === "a_favor" ? "a favor" : "contra";
    const gestorId = membrosDe(obra).find((m) => m.role === "gestor")?.userId;
    if (estado === "pendente") {
      // O gestor fica a saber que o sócio votou
      if (gestorId && gestorId !== CURRENT_USER_ID)
        addNotif({
          userId: gestorId,
          tipo: "decisao_voto",
          titulo: `${meuNome} votou ${labelVoto} em «${titulo}»`,
          descricao: `${eur(valor)} · ${obra.titulo}`,
          actorId: CURRENT_USER_ID,
          link: `/obra/${obra.id}`,
        });
      toast.success(`Voto registado · ${labelVoto}`, { description: "O gestor foi notificado." });
    } else {
      broadcast(
        membrosDe(obra).map((m) => m.userId).filter((id) => id !== CURRENT_USER_ID),
        {
          tipo: "decisao_fechada",
          titulo:
            estado === "aplicado"
              ? `Aprovado: «${titulo}» — o gestor pode aplicar`
              : `Rejeitado: «${titulo}»`,
          descricao: `${eur(valor)} · ${obra.titulo}`,
          actorId: CURRENT_USER_ID,
          link: `/obra/${obra.id}`,
        }
      );
      if (estado === "aplicado") toast.success("Decisão aprovada · sócios notificados");
      else toast("Decisão rejeitada", { description: "Os sócios foram notificados." });
    }
    onResolved?.();
  };

  const votoDe = (userId: string) => aprovacao.votos.find((v) => v.userId === userId);

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{titulo}</p>
          <p className="num mt-0.5 text-xs text-muted">
            {eur(valor)} · pedido por {nomeProprio(profiles.find((p) => p.id === aprovacao.requeridoPor)?.fullName)}
          </p>
        </div>
        <EstadoAprovacaoBadge estado={aprovacao.estado} />
      </div>

      {/* Contagem */}
      <div className="mt-3 flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-success">
          <ThumbsUp size={13} /> {resumo.favor}
        </span>
        <span className="flex items-center gap-1 text-danger">
          <ThumbsDown size={13} /> {resumo.contra}
        </span>
        <span className="text-muted">{resumo.pendentes} por votar</span>
        <span className="ml-auto text-muted">
          {obra.regraVotacao === "unanimidade" ? "Unanimidade" : "Maioria simples"}
        </span>
      </div>

      {/* Avatares dos sócios + voto */}
      <div className="mt-3 flex flex-wrap gap-2">
        {investidores.map((m) => {
          const v = votoDe(m.userId);
          return (
            <span
              key={m.userId}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px]",
                v?.valor === "a_favor"
                  ? "border-success/40 bg-success/8 text-success animate-pop-in"
                  : v?.valor === "contra"
                    ? "border-danger/40 bg-danger/8 text-danger animate-pop-in"
                    : "border-line bg-bg/40 text-muted"
              )}
            >
              <RoleAvatar profile={profiles.find((p) => p.id === m.userId)} role={m.role} size="xs" />
              {nomeProprio(profiles.find((p) => p.id === m.userId)?.fullName)}
              {v?.valor === "a_favor" && <Check size={12} />}
              {v?.valor === "contra" && <X size={12} />}
            </span>
          );
        })}
      </div>

      {/* Ações */}
      {podeVotar ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => onVote("a_favor")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              meuVoto?.valor === "a_favor"
                ? "border-success bg-success text-white"
                : "border-success/40 text-success hover:bg-success/10"
            )}
          >
            <ThumbsUp size={14} /> A favor
          </button>
          <button
            onClick={() => onVote("contra")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              meuVoto?.valor === "contra"
                ? "border-danger bg-danger text-white"
                : "border-danger/40 text-danger hover:bg-danger/10"
            )}
          >
            <ThumbsDown size={14} /> Contra
          </button>
        </div>
      ) : aprovacao.estado === "pendente" ? (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
          <Lock size={12} /> {meuRole === "gestor" ? "Aguarda o voto dos sócios investidores." : "Só os sócios investidores votam."}
        </p>
      ) : null}
    </div>
  );
}

export function EstadoAprovacaoBadge({ estado }: { estado: Aprovacao["estado"] }) {
  const map = {
    aplicado: { cls: "bg-success/12 text-success", label: "Aprovado" },
    pendente: { cls: "bg-warning/12 text-warning", label: "A aguardar voto" },
    rejeitado: { cls: "bg-danger/12 text-danger", label: "Rejeitado" },
  } as const;
  const m = map[estado];
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", m.cls)}>{m.label}</span>
  );
}

// ───────────────────── Hooks utilitários ─────────────────────

export function useMembro(obra: Obra, userId: string): { member?: ObraMember; profile?: Profile } {
  const profiles = useProfilesStore((s) => s.profiles);
  return useMemo(
    () => ({
      member: membrosDe(obra).find((m) => m.userId === userId),
      profile: profiles.find((p) => p.id === userId),
    }),
    [obra, userId, profiles]
  );
}
