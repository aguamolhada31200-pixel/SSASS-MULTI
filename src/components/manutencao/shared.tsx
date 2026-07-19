import {
  Droplets,
  Zap,
  Flame,
  AirVent,
  Lock,
  WashingMachine,
  Paintbrush,
  CloudRain,
  Frame,
  Blinds,
  HardHat,
  Wrench,
  FireExtinguisher,
  ShieldAlert,
  FileBadge,
  Wind,
  Fan,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import {
  RESPONSABILIDADE_LABEL,
  type CategoriaPedido,
  type Prioridade,
  type Responsabilidade,
  type EstadoPedido,
} from "@/store/useMaintenanceStore";
import type { CategoriaPlano } from "@/store/useMaintenancePlanStore";
import { cn } from "@/lib/utils";

// ───────────────────── Ícones por categoria (Lucide 16px) ─────────────────────

export const CATEGORIA_PEDIDO_ICON: Record<CategoriaPedido, LucideIcon> = {
  canalizacao: Droplets,
  eletricidade: Zap,
  aquecimento: Flame,
  climatizacao: AirVent,
  fechaduras: Lock,
  eletrodomesticos: WashingMachine,
  pintura: Paintbrush,
  humidade: CloudRain,
  janelas: Frame,
  estores: Blinds,
  telhado: HardHat,
  outros: Wrench,
};

export const CATEGORIA_PLANO_ICON: Record<CategoriaPlano, LucideIcon> = {
  caldeira: Flame,
  ac: AirVent,
  extintor: FireExtinguisher,
  detetor_co: ShieldAlert,
  certificado_energetico: FileBadge,
  chamine: Wind,
  inspecao_gas: Flame,
  inspecao_eletrica: Zap,
  vistoria_al: ClipboardCheck,
  limpeza_condutas: Fan,
  outros: Wrench,
};

// ───────────────────── Tons ─────────────────────

/** Borda esquerda do card pela prioridade. */
export const PRIORIDADE_BORDA: Record<Prioridade, string> = {
  urgente: "border-l-danger",
  alta: "border-l-warning",
  normal: "border-l-[#5C7CB3]",
  baixa: "border-l-line",
};

export const PRIORIDADE_TONE: Record<Prioridade, string> = {
  urgente: "bg-danger/12 text-danger",
  alta: "bg-warning/15 text-warning",
  normal: "bg-[#5C7CB3]/12 text-[#5C7CB3]",
  baixa: "bg-accent text-muted",
};

export const ESTADO_TONE: Record<EstadoPedido, string> = {
  aberto: "bg-danger/10 text-danger",
  agendado: "bg-[#5C7CB3]/12 text-[#5C7CB3]",
  em_curso: "bg-warning/15 text-warning",
  aguarda_pecas: "bg-accent text-secondary",
  concluido: "bg-success/12 text-success",
  cancelado: "bg-accent text-muted",
};

const RESP_TONE: Record<Responsabilidade, string> = {
  senhorio: "border-primary/30 bg-primary/8 text-primary",
  inquilino: "border-gold/40 bg-gold/10 text-gold-dark",
  partilhada: "border-line bg-accent text-secondary",
};

export function RespBadge({ resp, className }: { resp: Responsabilidade; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", RESP_TONE[resp], className)}>
      {RESPONSABILIDADE_LABEL[resp]}
    </span>
  );
}

export const inputCls =
  "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";
