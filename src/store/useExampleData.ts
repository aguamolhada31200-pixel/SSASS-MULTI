import { create } from "zustand";

/**
 * Toggle global "Dados de exemplo" (blueprint secção 3 / 10.3).
 * Alterna o estado das páginas com listas/dashboards entre vazio e populado.
 * Default: true (populado) — para a app mostrar conteúdo realista logo à entrada.
 */
interface ExampleDataState {
  enabled: boolean;
  toggle: () => void;
  set: (v: boolean) => void;
}

export const useExampleData = create<ExampleDataState>((set) => ({
  enabled: true,
  toggle: () => set((s) => ({ enabled: !s.enabled })),
  set: (v) => set({ enabled: v }),
}));
