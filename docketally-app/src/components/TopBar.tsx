"use client";

import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  "/dashboard": "Record",
  "/dashboard/plans": "Plans",
  "/dashboard/case": "Case",
  "/dashboard/comms": "Comms",
  "/dashboard/exit": "Exit",
  "/dashboard/vault": "Vault",
  "/dashboard/integrity": "Employment Record Check",
};

export default function TopBar() {
  const pathname = usePathname();
  const label = labels[pathname] || "Dashboard";

  return (
    <div
      style={{
        height: 52,
        borderBottom: "1px solid var(--color-stone-200)",
        display: "flex",
        alignItems: "center",
        padding: "0 28px",
        background: "#fff",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: "var(--color-stone-400)",
          fontFamily: "var(--font-sans)",
        }}
      >
        DocketAlly
      </span>
      <span
        style={{
          margin: "0 10px",
          color: "var(--color-stone-300)",
          fontSize: 13,
        }}
      >
        /
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-stone-700)",
          fontFamily: "var(--font-sans)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
