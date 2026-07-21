import { toast as sonnerToast } from "sonner";
import type { ReactNode } from "react";

// Toast único e consistente com o design system madeira. Usar SEMPRE estes
// helpers — nunca chamar `toast()` do sonner diretamente. O estilo (fundo
// #FDF8F0, borda, barra lateral por variante, ícone Lucide) vive no <Toaster>
// (AppLayout) + index.css. Aqui só decidimos variante, texto e duração.

export type ToastAction = { label: string; onClick: () => void };

export interface ToastOptions {
  /** Segunda linha, mais discreta. */
  description?: ReactNode;
  /** Botão de ação opcional (ex.: "Ver gasto", "Anexar agora"). */
  action?: ToastAction;
  /** Sobrepõe a duração default (4000ms · erros 6000ms). */
  duration?: number;
}

/**
 * 2.º argumento flexível: uma string (vira a descrição) OU um objeto de opções
 * — assim tanto `toastSuccess("X", "Y")` como `toastSuccess("X", { action })`
 * funcionam.
 */
type SecondArg = string | ToastOptions;

function normalizar(a?: SecondArg, b?: ToastOptions): ToastOptions {
  if (typeof a === "string") return { description: a, ...b };
  return { ...(a ?? {}), ...b };
}

function mostrar(
  kind: "success" | "error" | "warning" | "info",
  titulo: string,
  a?: SecondArg,
  b?: ToastOptions
) {
  const o = normalizar(a, b);
  return sonnerToast[kind](titulo, {
    description: o.description,
    action: o.action,
    duration: o.duration ?? (kind === "error" ? 6000 : 4000),
  });
}

export const toastSuccess = (titulo: string, a?: SecondArg, b?: ToastOptions) =>
  mostrar("success", titulo, a, b);

export const toastError = (titulo: string, a?: SecondArg, b?: ToastOptions) =>
  mostrar("error", titulo, a, b);

export const toastWarning = (titulo: string, a?: SecondArg, b?: ToastOptions) =>
  mostrar("warning", titulo, a, b);

export const toastInfo = (titulo: string, a?: SecondArg, b?: ToastOptions) =>
  mostrar("info", titulo, a, b);

/** Fechar um toast pelo id (casos pontuais). */
export const toastDismiss = (id?: string | number) => sonnerToast.dismiss(id);
