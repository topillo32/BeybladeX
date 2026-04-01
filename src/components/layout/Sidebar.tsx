"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { useAuthContext } from "@/lib/AuthContext";
import { logoutUser } from "@/services/authService";
import { RoleBadge } from "@/components/ui/Badges";
import { LangToggle } from "@/components/ui/LangToggle";
import { useLang } from "@/lib/LangContext";

export const Sidebar = () => {
  const { user, isAdmin } = useAuthContext();
  const { t } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV_ADMIN = [
    { href: "/dashboard",   label: t("dashboard"),   icon: "📊" },
    { href: "/tournaments", label: t("tournaments"), icon: "🏆" },
    { href: "/leagues",     label: t("leagues"),     icon: "🏅" },
    { href: "/players",     label: t("players"),     icon: "👤" },
    { href: "/parts",       label: "Piezas",         icon: "⚙️" },
    { href: "/users",       label: t("users"),       icon: "🛡️" },
  ];
  const NAV_STAFF = [
    { href: "/dashboard",   label: t("dashboard"),   icon: "📊" },
    { href: "/tournaments", label: t("tournaments"), icon: "🏆" },
    { href: "/leagues",     label: t("leagues"),     icon: "🏅" },
    { href: "/players",     label: t("players"),     icon: "👤" },
    { href: "/parts",       label: "Piezas",         icon: "⚙️" },
  ];
  const NAV_PLAYER = [
    { href: "/player/tournaments", label: t("availableTournaments"), icon: "🏆" },
    { href: "/player/leagues",     label: t("myLeagues"),            icon: "🏅" },
    { href: "/player/combos",      label: "Mis Combos",              icon: "🌀" },
  ];

  const nav = isAdmin ? NAV_ADMIN : user?.role === "staff" ? NAV_STAFF : NAV_PLAYER;

  const handleLogout = async () => {
    await logoutUser();
    router.push("/auth");
  };

  const navStyle = { background: "rgba(15, 23, 42, 0.7)" };

  return (
    <>
      {/* ── MOBILE: top navbar ── */}
      <header className="md:hidden sticky top-0 z-50 border-b border-white/5 backdrop-blur-md" style={navStyle}>
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo mobile */}
          <div className="flex items-center gap-2">
            <Image src="/logo.jpeg" alt="Logo" width={28} height={28} className="rounded-full object-cover shrink-0" />
            <span className="font-gaming font-bold tracking-widest text-xs text-white">
              BEYBLADE<span className="text-cyan-400">X</span> PAC
            </span>
          </div>
          {/* Hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="border-t border-white/5 px-4 py-4 space-y-1" style={navStyle}>
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-base font-medium
                    ${active ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20" : "text-white hover:bg-white/5"}`}>
                  <span className="text-xl w-7 text-center">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between px-2">
              <div>
                {user && (
                  <>
                    <p className="text-white text-sm font-medium">{user.displayName}</p>
                    <RoleBadge role={user.role} />
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <LangToggle />
                <button onClick={handleLogout}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm px-3 py-2 rounded-lg hover:bg-red-500/10 transition-all">
                  🚪 {t("signOut")}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── DESKTOP: sidebar lateral ── */}
      <aside className={`hidden md:flex flex-col border-r border-white/5 transition-all duration-300 ${collapsed ? "w-16" : "w-56"} shrink-0`} style={navStyle}>
        {/* Logo desktop */}
        <div className="h-16 flex items-center px-4 border-b border-white/5 gap-3">
          <Image src="/logo.jpeg" alt="Logo" width={32} height={32} className="rounded-full object-cover shrink-0" />
          {!collapsed && (
            <span className="font-gaming font-bold tracking-widest text-sm text-white">
              BEYBLADE<span className="text-cyan-400">X</span> PAC
            </span>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-white hover:text-white transition-colors text-xs">
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium
                  ${active ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20" : "text-white hover:bg-white/5"}`}>
                <span className="text-base shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        {user && (
          <div className="p-3 border-t border-white/5 space-y-2">
            <LangToggle collapsed={collapsed} />
            {!collapsed && (
              <div className="px-2">
                <p className="text-white text-sm font-medium truncate">{user.displayName}</p>
                <RoleBadge role={user.role} />
              </div>
            )}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white hover:text-red-400 hover:bg-red-500/5 transition-all text-sm">
              <span>🚪</span>
              {!collapsed && <span>{t("signOut")}</span>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
