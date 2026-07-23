import { create } from "zustand";
import { persist } from "zustand/middleware";

// Secção de topo onde vive uma pasta manual que NÃO pertence a um imóvel/projeto.
export type SecaoTopo = "imoveis" | "colaborativa" | "sem";

// Subpastas MANUAIS da Pasta Digital (as únicas guardadas). As pastas dos
// imóveis e projetos NÃO vivem aqui — são derivadas em runtime.
export interface Folder {
  id: string;
  nome: string;
  propertyId: string | null;
  projectId: string | null;
  parentId: string | null; // subpasta de outra subpasta manual
  // Pastas de topo criadas pelo utilizador (sem imóvel/projeto) guardam aqui
  // a secção onde aparecem. Subpastas (parentId != null) e pastas dentro de
  // um imóvel/projeto não usam este campo.
  secao?: SecaoTopo;
}

export type FolderInput = Omit<Folder, "id">;

interface FoldersState {
  folders: Folder[];
  add: (input: FolderInput) => string;
  rename: (id: string, nome: string) => void;
  /** Remove a pasta e todas as descendentes. Devolve os ids removidos (para desligar os documentos). */
  remove: (id: string) => string[];
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `fld-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useFoldersStore = create<FoldersState>()(
  persist(
    (set, get) => ({
      folders: [],
      add: (input) => {
        const id = uid();
        set((s) => ({ folders: [...s.folders, { ...input, id }] }));
        return id;
      },
      rename: (id, nome) =>
        set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, nome } : f)) })),
      remove: (id) => {
        const all = get().folders;
        const removidos: string[] = [];
        const marcar = (fid: string) => {
          removidos.push(fid);
          all.filter((f) => f.parentId === fid).forEach((f) => marcar(f.id));
        };
        marcar(id);
        set({ folders: all.filter((f) => !removidos.includes(f.id)) });
        return removidos;
      },
    }),
    { name: "redegest-folders", version: 1 }
  )
);
