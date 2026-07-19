import { create } from "zustand";
import { CURRENT_USER_ID } from "./useProfilesStore";

/**
 * "Ver como" — alterna a vista da Gestão Colaborativa entre o papel real do
 * utilizador (auto), o de Gestor e o de Parceiro (sócio investidor). É uma
 * ferramenta de pré-visualização: afeta apenas o que o UTILIZADOR ATUAL vê e
 * pode fazer; a estrutura de sócios/votação (membros reais) mantém-se.
 */
export type ViewAsModo = "auto" | "gestor" | "investidor";

export const VIEW_AS_LABEL: Record<ViewAsModo, string> = {
  auto: "Auto",
  gestor: "Gestor",
  investidor: "Parceiro",
};

interface ViewAsState {
  modo: ViewAsModo;
  setModo: (m: ViewAsModo) => void;
}

export const useViewAs = create<ViewAsState>((set) => ({
  modo: "auto",
  setModo: (modo) => set({ modo }),
}));

/**
 * Papel a impor ao utilizador atual (ou null = usar o papel real).
 * Só se aplica a CURRENT_USER_ID — os outros sócios mantêm sempre o papel real.
 */
export function papelOverride(userId: string): "gestor" | "investidor" | null {
  if (userId !== CURRENT_USER_ID) return null;
  const m = useViewAs.getState().modo;
  return m === "auto" ? null : m;
}
