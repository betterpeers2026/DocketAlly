"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { SubscriptionInfo } from "@/lib/subscription";
import { hasActiveAccess, trialDaysLeft } from "@/lib/subscription";

interface NavItem {
  label: string;
  href: string;
  pro: boolean;
  icon: React.ReactNode;
  divider?: boolean;
  adminOnly?: boolean;
  accentColor?: string;
  group?: string;
}

const navItems: NavItem[] = [
  /* ── DOCUMENT ── */
  {
    label: "Record",
    href: "/dashboard",
    pro: false,
    group: "DOCUMENT",
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
    pro: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
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
  /* ── BUILD ── */
  {
    label: "Cases",
    href: "/dashboard/case",
    pro: false,
    group: "BUILD",
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
    pro: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  /* ── account / utility ── */
  {
    label: "Support",
    href: "/dashboard/support",
    pro: false,
    divider: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
    pro: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  /* ── admin ── */
  {
    label: "Admin",
    href: "/dashboard/admin",
    pro: false,
    divider: true,
    adminOnly: true,
    accentColor: "#DC2626",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
];

export default function Sidebar({ user, subscription }: { user: User; subscription: SubscriptionInfo }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("user");

  // Documentation strength pillars
  const [docStrength, setDocStrength] = useState<[boolean, boolean, boolean, boolean]>([false, false, false, false]);

  // Fetch user role from profiles
  useEffect(() => {
    async function fetchRole() {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (data?.role) setUserRole(data.role.toLowerCase());
    }
    fetchRole();
  }, [user.id, supabase]);

  // Fetch documentation strength pillars
  useEffect(() => {
    async function fetchStrength() {
      const [recordsRes, vaultRes, casesRes] = await Promise.all([
        supabase.from("records").select("date").eq("user_id", user.id).order("date", { ascending: true }),
        supabase.from("vault_documents").select("id").eq("user_id", user.id).limit(1),
        supabase.from("cases").select("employer, role").eq("user_id", user.id),
      ]);
      const records = recordsRes.data ?? [];
      const hasRecords = records.length >= 5;
      const hasEvidence = (vaultRes.data ?? []).length >= 1;
      const hasCaseInfo = (casesRes.data ?? []).some((c) => c.employer || c.role);
      let hasTimeline = false;
      if (records.length >= 2) {
        const first = new Date(records[0].date + "T00:00:00").getTime();
        const last = new Date(records[records.length - 1].date + "T00:00:00").getTime();
        hasTimeline = Math.round((last - first) / 86400000) >= 7;
      }
      setDocStrength([hasRecords, hasEvidence, hasCaseInfo, hasTimeline]);
    }
    fetchStrength();
  }, [user.id, supabase]);

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || userRole === "admin"
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleCasesClick() {
    const { data, error } = await supabase
      .from("cases")
      .select("id")
      .eq("user_id", user.id)
      .limit(2);
    if (!error && data && data.length === 1) {
      router.push(`/dashboard/case/${data[0].id}`);
    } else {
      router.push("/dashboard/case");
    }
    setSidebarOpen(false);
  }

  const initial = (user.email?.[0] || "?").toUpperCase();

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="da-hamburger"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          display: "none",
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 200,
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          border: "none",
          background: sidebarOpen ? "transparent" : "var(--color-stone-100)",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {sidebarOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={sidebarOpen ? "#fff" : "var(--color-stone-600)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-stone-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {/* Mobile backdrop */}
      <div
        className={`da-sidebar-backdrop${sidebarOpen ? " da-sidebar-open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`da-sidebar${sidebarOpen ? " da-sidebar-open" : ""}`}
        style={{
          width: 220,
          height: "100vh",
          background: "linear-gradient(180deg, rgba(34,197,94,0.03) 0%, transparent 30%), var(--color-sidebar)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px 20px",
          fontFamily: "var(--font-sans)",
          fontSize: 18,
          fontWeight: 700,
          color: "#fff",
        }}
      >
        Docket<span style={{ color: "var(--color-green)" }}>Ally</span>
      </div>

      {/* Documentation Strength */}
      <div
        style={{ padding: "0 20px 20px", cursor: "pointer" }}
        onClick={() => { router.push("/dashboard/case"); setSidebarOpen(false); }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: 700,
            color: "#78716C",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 8,
          }}
        >
          Documentation
        </div>
        <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
          {docStrength.map((filled, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: filled ? "#22C55E" : "rgba(255,255,255,0.10)",
              }}
            />
          ))}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "#78716C",
          }}
        >
          {docStrength.filter(Boolean).length} of 4 complete
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 10px", overflow: "auto" }}>
        {visibleNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <div key={item.href}>
            {item.group && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.12em", padding: "16px 23px 6px" }}>
                {item.group}
              </div>
            )}
            {item.divider && (
              <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "12px 20px" }} />
            )}
            <button
              onClick={() => {
                if (!item.pro) {
                  if (item.href === "/dashboard/case") {
                    handleCasesClick();
                  } else {
                    router.push(item.href);
                    setSidebarOpen(false);
                  }
                }
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px 9px 7px",
                borderRadius: 8,
                border: "none",
                borderLeft: isActive ? "3px solid #22C55E" : "3px solid transparent",
                background: isActive
                  ? "rgba(34,197,94,0.10)"
                  : "transparent",
                color: isActive
                  ? "var(--color-sidebar-text-active)"
                  : "var(--color-sidebar-text)",
                fontSize: 13,
                fontWeight: isActive ? 700 : 600,
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
              <span style={item.accentColor && isActive ? { color: item.accentColor } : undefined}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.adminOnly && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 8,
                    fontWeight: 700,
                    color: "#FCA5A5",
                    background: "rgba(220,38,38,0.12)",
                    padding: "2px 6px",
                    borderRadius: 4,
                    letterSpacing: "0.04em",
                  }}
                >
                  ADMIN
                </span>
              )}
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
            </div>
          );
        })}
      </nav>

      {/* New Record button */}
      {(() => {
        const canCreate = hasActiveAccess(subscription);
        return (
          <div style={{ padding: "12px 14px 0" }}>
            <button
              onClick={() => {
                if (canCreate) {
                  router.push("/dashboard?action=new");
                } else {
                  router.push("/dashboard/billing");
                }
                setSidebarOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 10,
                border: "none",
                background: canCreate ? "var(--color-green)" : "rgba(255,255,255,0.08)",
                color: canCreate ? "#fff" : "var(--color-sidebar-text)",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                boxShadow: canCreate ? "0 2px 10px rgba(34,197,94,0.3)" : "none",
                opacity: canCreate ? 1 : 0.6,
              }}
            >
              {canCreate ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              )}
              New Record
            </button>
          </div>
        );
      })()}

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
            position: "relative",
          }}
        >
          {initial}
          <div style={{ position: "absolute", bottom: -1, right: -1, width: 8, height: 8, borderRadius: "50%", background: "#22C55E", border: "2px solid var(--color-sidebar)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-sidebar-text-hover)",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {user.email}
          </div>
          {(() => {
            const status = subscription.subscriptionStatus;
            if (status === "trial") {
              const days = trialDaysLeft(subscription.trialEndsAt);
              return (
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#22C55E",
                  marginTop: 2,
                  letterSpacing: "0.04em",
                }}>
                  Trial — {days} {days === 1 ? "day" : "days"}
                </div>
              );
            }
            if (status === "active") {
              return (
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#22C55E",
                  marginTop: 2,
                  letterSpacing: "0.04em",
                }}>
                  Pro
                </div>
              );
            }
            return (
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 700,
                color: "#78716C",
                marginTop: 2,
                letterSpacing: "0.04em",
              }}>
                Free
              </div>
            );
          })()}
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
    </>
  );
}
