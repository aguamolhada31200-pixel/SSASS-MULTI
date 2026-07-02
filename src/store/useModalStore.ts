import { create } from "zustand";
import type { TipoMov } from "./useTransactionsStore";

/** Estado dos modais globais (abertos via store, nunca duplicados por página). */
interface ModalState {
  propertyForm: { open: boolean; editingId: string | null };
  openPropertyForm: (editingId?: string | null) => void;
  closePropertyForm: () => void;

  expenseForm: {
    open: boolean;
    initialTipo: TipoMov;
    initialPropertyId: string | null;
    editingId: string | null;
  };
  openExpenseForm: (params?: {
    initialTipo?: TipoMov;
    initialPropertyId?: string | null;
    editingId?: string | null;
  }) => void;
  closeExpenseForm: () => void;

  listingForm: { open: boolean; editingId: string | null };
  openListingForm: (editingId?: string | null) => void;
  closeListingForm: () => void;

  collabForm: { open: boolean; editingId: string | null };
  openCollabForm: (editingId?: string | null) => void;
  closeCollabForm: () => void;

  obraForm: {
    open: boolean;
    editingId: string | null;
    initialProjectId: string | null;
    initialPropertyId: string | null;
  };
  openObraForm: (params?: {
    editingId?: string | null;
    initialProjectId?: string | null;
    initialPropertyId?: string | null;
  }) => void;
  closeObraForm: () => void;

  tenantForm: { open: boolean; editingId: string | null; initialPropertyId: string | null };
  openTenantForm: (editingId?: string | null, initialPropertyId?: string | null) => void;
  closeTenantForm: () => void;

  contractDocForm: {
    open: boolean;
    editingId: string | null;
    initialPropertyId: string | null;
    initialTenantId: string | null;
  };
  openContractDoc: (params?: {
    editingId?: string | null;
    initialPropertyId?: string | null;
    initialTenantId?: string | null;
  }) => void;
  closeContractDoc: () => void;

  obraExpenseForm: { open: boolean; obraId: string | null; initialFaseId: string | null };
  openObraExpense: (obraId: string, initialFaseId?: string | null) => void;
  closeObraExpense: () => void;

  marcoPayForm: { open: boolean; marcoId: string | null };
  openMarcoPay: (marcoId: string) => void;
  closeMarcoPay: () => void;

  interestForm: { open: boolean; listingId: string | null };
  openInterest: (listingId: string) => void;
  closeInterest: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  propertyForm: { open: false, editingId: null },
  openPropertyForm: (editingId = null) => set({ propertyForm: { open: true, editingId } }),
  closePropertyForm: () => set({ propertyForm: { open: false, editingId: null } }),

  expenseForm: { open: false, initialTipo: "despesa", initialPropertyId: null, editingId: null },
  openExpenseForm: (params = {}) =>
    set({
      expenseForm: {
        open: true,
        initialTipo: params.initialTipo ?? "despesa",
        initialPropertyId: params.initialPropertyId ?? null,
        editingId: params.editingId ?? null,
      },
    }),
  closeExpenseForm: () =>
    set({
      expenseForm: { open: false, initialTipo: "despesa", initialPropertyId: null, editingId: null },
    }),

  listingForm: { open: false, editingId: null },
  openListingForm: (editingId = null) => set({ listingForm: { open: true, editingId } }),
  closeListingForm: () => set({ listingForm: { open: false, editingId: null } }),

  collabForm: { open: false, editingId: null },
  openCollabForm: (editingId = null) => set({ collabForm: { open: true, editingId } }),
  closeCollabForm: () => set({ collabForm: { open: false, editingId: null } }),

  obraForm: {
    open: false,
    editingId: null,
    initialProjectId: null,
    initialPropertyId: null,
  },
  openObraForm: (params = {}) =>
    set({
      obraForm: {
        open: true,
        editingId: params.editingId ?? null,
        initialProjectId: params.initialProjectId ?? null,
        initialPropertyId: params.initialPropertyId ?? null,
      },
    }),
  closeObraForm: () =>
    set({
      obraForm: {
        open: false,
        editingId: null,
        initialProjectId: null,
        initialPropertyId: null,
      },
    }),

  tenantForm: { open: false, editingId: null, initialPropertyId: null },
  openTenantForm: (editingId = null, initialPropertyId = null) =>
    set({ tenantForm: { open: true, editingId, initialPropertyId } }),
  closeTenantForm: () => set({ tenantForm: { open: false, editingId: null, initialPropertyId: null } }),

  contractDocForm: { open: false, editingId: null, initialPropertyId: null, initialTenantId: null },
  openContractDoc: (params = {}) =>
    set({
      contractDocForm: {
        open: true,
        editingId: params.editingId ?? null,
        initialPropertyId: params.initialPropertyId ?? null,
        initialTenantId: params.initialTenantId ?? null,
      },
    }),
  closeContractDoc: () =>
    set({ contractDocForm: { open: false, editingId: null, initialPropertyId: null, initialTenantId: null } }),

  obraExpenseForm: { open: false, obraId: null, initialFaseId: null },
  openObraExpense: (obraId, initialFaseId = null) =>
    set({ obraExpenseForm: { open: true, obraId, initialFaseId } }),
  closeObraExpense: () =>
    set({ obraExpenseForm: { open: false, obraId: null, initialFaseId: null } }),

  marcoPayForm: { open: false, marcoId: null },
  openMarcoPay: (marcoId) => set({ marcoPayForm: { open: true, marcoId } }),
  closeMarcoPay: () => set({ marcoPayForm: { open: false, marcoId: null } }),

  interestForm: { open: false, listingId: null },
  openInterest: (listingId) => set({ interestForm: { open: true, listingId } }),
  closeInterest: () => set({ interestForm: { open: false, listingId: null } }),
}));
