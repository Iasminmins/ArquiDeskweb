import { Building2, LogOut, Menu, PanelLeftClose } from "lucide-react";
import { useState } from "react";
import type { AppContext } from "../App";
import type { NavKey } from "../lib/permissions";
import { labels, roleNav } from "../lib/permissions";
import { supabase } from "../lib/supabase";

export function Layout({
  ctx,
  active,
  onNavigate,
  children,
}: {
  ctx: AppContext;
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const primary = ctx.company?.primary_color || "#15201d";
  const secondary = ctx.company?.secondary_color || "#b8664b";
  const nav = roleNav[ctx.profile.role];

  return (
    <div style={{ "--brand": primary, "--accent": secondary } as React.CSSProperties} className="min-h-screen bg-fog text-ink lg:grid lg:grid-cols-[280px_1fr]">
      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 w-72 border-r border-line bg-white transition lg:static lg:w-auto lg:translate-x-0`}>
        <div className="flex h-16 items-center gap-3 border-b border-line px-4">
          {ctx.company?.logo_url ? (
            <img src={ctx.company.logo_url} className="h-10 w-10 rounded-md object-cover" alt="" />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-md text-white" style={{ background: primary }}>
              <Building2 size={20} />
            </div>
          )}
          <div className="min-w-0">
            <strong className="block truncate">{ctx.company?.name || "Arquidesk"}</strong>
            <span className="text-xs text-ink/55">{ctx.profile.role.replace("_", " ")}</span>
          </div>
          <button className="ml-auto grid h-9 w-9 place-items-center rounded-md hover:bg-fog lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <PanelLeftClose size={18} />
          </button>
        </div>
        <nav className="grid gap-1 p-3">
          {nav.map((key) => (
            <button
              key={key}
              onClick={() => {
                onNavigate(key);
                setOpen(false);
              }}
              className={`min-h-10 rounded-md px-3 text-left text-sm font-semibold transition ${active === key ? "text-white" : "hover:bg-fog"}`}
              style={active === key ? { background: primary } : undefined}
            >
              {labels[key]}
            </button>
          ))}
        </nav>
      </aside>
      {open ? <div className="fixed inset-0 z-30 bg-ink/35 lg:hidden" onClick={() => setOpen(false)} /> : null}
      <main className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/92 px-4 backdrop-blur">
          <button className="grid h-10 w-10 place-items-center rounded-md hover:bg-fog lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold">{labels[active]}</h1>
            <p className="text-xs text-ink/55">{ctx.profile.name}</p>
          </div>
          <button
            className="ml-auto grid h-10 w-10 place-items-center rounded-md hover:bg-fog"
            onClick={() => supabase.auth.signOut()}
            aria-label="Sair"
          >
            <LogOut size={19} />
          </button>
        </header>
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
