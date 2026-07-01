import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";
import { PropertyFormModal } from "@/components/modals/PropertyFormModal";
import { ExpenseFormModal } from "@/components/modals/ExpenseFormModal";
import { PublishListingModal } from "@/components/modals/PublishListingModal";
import { NewObraModal } from "@/components/modals/NewObraModal";
import { TenantFormModal } from "@/components/modals/TenantFormModal";
import { ContractDocModal } from "@/components/modals/ContractDocModal";
import { ObraExpenseModal } from "@/components/modals/ObraExpenseModal";
import { MarcoPayModal } from "@/components/modals/MarcoPayModal";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar fixa (desktop) */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Drawer (mobile) */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={cn("absolute inset-0 bg-ink/40 transition-opacity", drawerOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={cn(
            "absolute left-0 top-0 h-full transition-transform",
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar onClose={() => setDrawerOpen(false)} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setDrawerOpen(true)} onSearch={() => setPaletteOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <PropertyFormModal />
      <ExpenseFormModal />
      <PublishListingModal />
      <NewObraModal />
      <TenantFormModal />
      <ContractDocModal />
      <ObraExpenseModal />
      <MarcoPayModal />
      <Toaster richColors position="top-center" toastOptions={{ style: { fontFamily: "DM Sans" } }} />
    </div>
  );
}
