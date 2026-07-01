import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, Settings, LogOut, X } from "lucide-react";
import { NAV } from "./nav";
import { cn } from "@/lib/utils";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/20">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M5 12 12 6l7 6" stroke="#C8A664" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 11v7h10v-7" stroke="#F5ECD7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="font-display text-xl font-bold tracking-tight text-sidebar-text">decogest</span>
    </div>
  );
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { pathname } = useLocation();

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-text">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <Logo />
        {onClose && (
          <button onClick={onClose} className="text-sidebar-text/60 hover:text-sidebar-text lg:hidden">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 flex items-center gap-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-text/40">
              {group.gold && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const hasChildren = !!item.children?.length;
                const childActive = hasChildren && pathname.startsWith(item.to);
                return (
                  <div key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                          isActive
                            ? group.gold
                              ? "bg-gold/15 font-medium text-gold-soft"
                              : "bg-primary font-medium text-white"
                            : "text-sidebar-text/70 hover:bg-white/[0.07] hover:text-sidebar-text"
                        )
                      }
                    >
                      <Icon size={18} strokeWidth={1.9} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-sidebar-text/70">
                          {item.badge}
                        </span>
                      )}
                      {hasChildren && (
                        <ChevronDown size={14} className={cn("transition-transform", childActive && "rotate-180")} />
                      )}
                    </NavLink>
                    {hasChildren && childActive && (
                      <div className="ml-7 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                        {item.children!.map((c) => (
                          <NavLink
                            key={c.to}
                            to={c.to}
                            end
                            onClick={onClose}
                            className={({ isActive }) =>
                              cn(
                                "block rounded-md px-2 py-1.5 text-[13px] transition-colors",
                                isActive
                                  ? "text-gold-soft"
                                  : "text-sidebar-text/55 hover:text-sidebar-text"
                              )
                            }
                          >
                            {c.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
            DS
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-text">Daniel Silva</p>
            <p className="text-[11px] text-gold-soft">Plano Pro</p>
          </div>
          <button className="text-sidebar-text/50 hover:text-sidebar-text" title="Definições">
            <Settings size={16} />
          </button>
          <button className="text-sidebar-text/50 hover:text-sidebar-text" title="Terminar sessão">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
