"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Publisher", icon: "⚡" },
  { href: "/sites", label: "Sites", icon: "🌐" },
  { href: "/groups", label: "Groups", icon: "📍" },
  { href: "/history", label: "History", icon: "📋" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f1f5f9" }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" }}>
        {/* Brand */}
        <div className="px-5 py-6 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              ⚡
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">WP Publisher</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Multi-Site Dashboard</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: active ? "#fff" : "rgba(255,255,255,0.5)",
                  background: active ? "rgba(99,102,241,0.25)" : "transparent",
                  borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
                }}
              >
                <span style={{ fontSize: "15px" }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Powered by Grok 4.1 Fast</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
