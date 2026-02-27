"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const labels: Record<string, string> = {
  "/dashboard/home": "Home",
  "/dashboard": "Record",
  "/dashboard/plans": "Plans",
  "/dashboard/case": "Cases",
  "/dashboard/comms": "Comms",
  "/dashboard/vault": "Vault",
  "/dashboard/billing": "Billing",
};

export default function TopBar() {
  const pathname = usePathname();
  const [caseName, setCaseName] = useState<string | null>(null);

  // If on a case detail page, fetch the case name for breadcrumb
  const caseDetailMatch = pathname.match(/^\/dashboard\/case\/([^/]+)$/);
  const caseId = caseDetailMatch ? caseDetailMatch[1] : null;

  useEffect(() => {
    if (!caseId) { setCaseName(null); return; }
    const supabase = createClient();
    supabase.from("cases").select("name").eq("id", caseId).single().then(({ data }) => {
      if (data?.name) setCaseName(data.name);
    });
  }, [caseId]);

  const baseLabel = labels[pathname] || (caseId ? "Cases" : "Dashboard");

  return (
    <div
      className="da-topbar"
      style={{
        height: 52,
        borderBottom: "1px solid var(--color-stone-300)",
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
          color: "var(--color-stone-500)",
          fontFamily: "var(--font-sans)",
        }}
      >
        DocketAlly
      </span>
      <span
        className="da-topbar-crumb"
        style={{
          margin: "0 10px",
          color: "var(--color-stone-300)",
          fontSize: 13,
        }}
      >
        /
      </span>
      <span
        className="da-topbar-crumb"
        style={{
          fontSize: 13,
          fontWeight: caseId ? 400 : 600,
          color: caseId ? "var(--color-stone-500)" : "var(--color-stone-800)",
          fontFamily: "var(--font-sans)",
        }}
      >
        {baseLabel}
      </span>
      {caseId && caseName && (
        <>
          <span
            className="da-topbar-crumb"
            style={{
              margin: "0 10px",
              color: "var(--color-stone-300)",
              fontSize: 13,
            }}
          >
            /
          </span>
          <span
            className="da-topbar-crumb"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-stone-800)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {caseName}
          </span>
        </>
      )}
    </div>
  );
}
