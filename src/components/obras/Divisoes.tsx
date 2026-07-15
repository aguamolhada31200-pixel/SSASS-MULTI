import { ChefHat, Sofa, BedDouble, ShowerHead, DoorOpen, Sun, Trees, Home, type LucideIcon } from "lucide-react";
import type { Divisao } from "@/store/useObrasStore";

// Ícones das divisões da casa — partilhados pelo nível 2 (grelha) e pelo
// modal de nova obra ("Em que parte da casa?").

export const DIVISAO_ICON: Record<Divisao, LucideIcon> = {
  cozinha: ChefHat,
  sala: Sofa,
  quarto: BedDouble,
  wc: ShowerHead,
  hall: DoorOpen,
  varanda: Sun,
  exterior: Trees,
  casa_toda: Home,
};
