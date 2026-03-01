"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SubscriptionInfo } from "@/lib/subscription";
import { hasActiveAccess } from "@/lib/subscription";

interface MoreItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const moreItems: MoreItem[] = [
  {
    label: "Plans",
    href: "/dashboard/plans",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    label: "Comms",
    href: "/dashboard/comms",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    label: "Vault",
    href: "/dashboard/vault",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  },
  {
    label: "Support",
    href: "/dashboard/support",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
];

export default function BottomNav({ subscription }: { subscription: SubscriptionInfo }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close drawer on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";

    return pathname.startsWith(href);
  };

  const activeColor = "#22C55E";
  const inactiveColor = "#78716C";

  function handlePlusTap() {
    if (!hasActiveAccess(subscription)) {
      router.push("/dashboard/billing");
    } else {
      router.push("/dashboard?action=new");
    }
  }

  return (
    <>
      {/* More drawer backdrop */}
      {moreOpen && (
        <div
          className="da-more-backdrop da-more-open"
          onClick={() => setMoreOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 89,
          }}
        />
      )}

      {/* More drawer */}
      {moreOpen && (
        <div
          className="da-more-drawer da-more-open"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#fff",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.12)",
            zIndex: 90,
            display: "flex",
            flexDirection: "column",
            paddingBottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {/* Drag handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#D6D3D1" }} />
          </div>

          {/* Nav items */}
          <div style={{ padding: "4px 16px 16px" }}>
            {moreItems.map((item) => {
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setMoreOpen(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 12px",
                    borderRadius: 10,
                    border: "none",
                    background: active ? "#F0FDF4" : "transparent",
                    color: active ? activeColor : "#292524",
                    fontSize: 15,
                    fontWeight: active ? 700 : 500,
                    fontFamily: "var(--font-sans)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ color: active ? activeColor : "#57534E", flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav
        className="da-bottom-nav"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "calc(60px + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background: "#fff",
          borderTop: "1px solid #E7E5E4",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          zIndex: 88,
        }}
      >
        {/* Record */}
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "6px 12px",
            minWidth: 56,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive("/dashboard") ? activeColor : inactiveColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span style={{ fontSize: 10, fontWeight: 600, color: isActive("/dashboard") ? activeColor : inactiveColor, fontFamily: "var(--font-sans)" }}>
            Record
          </span>
        </button>

        {/* + New Record (CTA) */}
        <button
          onClick={handlePlusTap}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "none",
            background: activeColor,
            cursor: "pointer",
            marginTop: -16,
            boxShadow: "0 2px 8px rgba(34,197,94,0.35)",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Cases */}
        <button
          onClick={() => router.push("/dashboard/case")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "6px 12px",
            minWidth: 56,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive("/dashboard/case") ? activeColor : inactiveColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
          </svg>
          <span style={{ fontSize: 10, fontWeight: 600, color: isActive("/dashboard/case") ? activeColor : inactiveColor, fontFamily: "var(--font-sans)" }}>
            Cases
          </span>
        </button>

        {/* More */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "6px 12px",
            minWidth: 56,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={moreOpen ? activeColor : inactiveColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1.5" fill={moreOpen ? activeColor : inactiveColor} />
            <circle cx="12" cy="12" r="1.5" fill={moreOpen ? activeColor : inactiveColor} />
            <circle cx="12" cy="19" r="1.5" fill={moreOpen ? activeColor : inactiveColor} />
          </svg>
          <span style={{ fontSize: 10, fontWeight: 600, color: moreOpen ? activeColor : inactiveColor, fontFamily: "var(--font-sans)" }}>
            More
          </span>
        </button>
      </nav>
    </>
  );
}
