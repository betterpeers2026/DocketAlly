"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface NavItem {
  label: string;
  href: string;
  pro: boolean;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "Record",
    href: "/dashboard",
    pro: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    label: "Plans",
    href: "/dashboard/plans",
    pro: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    label: "Case",
    href: "/dashboard/case",
    pro: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
  },
  {
    label: "Comms",
    href: "/dashboard/comms",
    pro: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    label: "Exit",
    href: "/dashboard/exit",
    pro: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  },
  {
    label: "Vault",
    href: "/dashboard/vault",
    pro: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  },
  {
    label: "Integrity",
    href: "/dashboard/integrity",
    pro: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

const lifecycleStages = ["Employed", "Escalation", "Case Building", "Exit"];

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const currentStage = 0; // Default: Employed

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initial = (user.email?.[0] || "?").toUpperCase();

  return (
    <aside
      style={{
        width: 220,
        height: "100vh",
        background: "var(--color-sidebar)",
        borderRight: "1px solid var(--color-sidebar-border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px 20px",
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          fontWeight: 700,
          color: "#fff",
        }}
      >
        Docket<span style={{ color: "var(--color-green)" }}>Ally</span>
      </div>

      {/* Lifecycle bar */}
      <div style={{ padding: "0 20px 20px" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: 600,
            color: "var(--color-sidebar-text)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 8,
          }}
        >
          {lifecycleStages[currentStage]}
        </div>
        <div
          style={{
            display: "flex",
            gap: 3,
          }}
        >
          {lifecycleStages.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background:
                  i <= currentStage
                    ? "var(--color-green)"
                    : "var(--color-sidebar-border)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 10px", overflow: "auto" }}>
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <button
              key={item.href}
              onClick={() => {
                if (!item.pro) {
                  router.push(item.href);
                }
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 8,
                border: "none",
                background: isActive
                  ? "var(--color-sidebar-active)"
                  : "transparent",
                color: isActive
                  ? "var(--color-sidebar-text-active)"
                  : "var(--color-sidebar-text)",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                fontFamily: "var(--font-sans)",
                cursor: item.pro ? "default" : "pointer",
                textAlign: "left",
                marginBottom: 2,
                opacity: item.pro ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isActive && !item.pro) {
                  e.currentTarget.style.background =
                    "var(--color-sidebar-hover)";
                  e.currentTarget.style.color =
                    "var(--color-sidebar-text-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive && !item.pro) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--color-sidebar-text)";
                }
              }}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.pro && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 8,
                    fontWeight: 700,
                    color: "var(--color-green-text)",
                    background: "rgba(34,197,94,0.1)",
                    padding: "2px 6px",
                    borderRadius: 4,
                    letterSpacing: "0.04em",
                  }}
                >
                  PRO
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div
        style={{
          padding: "16px 14px",
          borderTop: "1px solid var(--color-sidebar-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--color-sidebar-active)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--color-sidebar-text-hover)",
            fontFamily: "var(--font-sans)",
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-sidebar-text-hover)",
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {user.email}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          title="Sign out"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-sidebar-text)",
            padding: 4,
            flexShrink: 0,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
