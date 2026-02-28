"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RecordRow {
  id: string;
  title: string;
  date: string;
  entry_type: string;
  created_at: string;
}

interface VaultRow {
  id: string;
  file_name: string;
  created_at: string;
}

interface CaseRow {
  id: string;
  name: string;
  case_type: string;
  case_types?: string[];
  status: string;
  case_status: string | null;
  employer: string | null;
  role: string | null;
  description: string | null;
  created_at: string;
}

interface CaseRecordLink {
  case_id: string;
  record_id: string;
}

interface ActivityItem {
  type: "record" | "vault" | "case";
  label: string;
  date: string;
  href: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #E7E5E4",
  padding: "24px",
};

const statValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
  color: "#292524",
  lineHeight: 1,
};

const statLabel: React.CSSProperties = {
  fontSize: 10,
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
  color: "#78716C",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginTop: 6,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState<string | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [vaultDocs, setVaultDocs] = useState<VaultRow[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [caseRecordLinks, setCaseRecordLinks] = useState<CaseRecordLink[]>([]);
  const [hasActivePlan, setHasActivePlan] = useState(false);

  /* ----- Fetch ----- */
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const uid = user.id;

      const [profileRes, recordsRes, vaultRes, casesRes, plansRes, caseRecordsRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", uid).single(),
        supabase.from("records").select("id, title, date, entry_type, created_at").eq("user_id", uid).order("date", { ascending: true }),
        supabase.from("vault_documents").select("id, file_name, created_at").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("cases").select("id, name, case_type, case_types, status, case_status, employer, role, description, created_at").eq("user_id", uid),
        supabase.from("plans").select("id").eq("user_id", uid).eq("status", "active").limit(1),
        supabase.from("case_records").select("case_id, record_id").eq("user_id", uid),
      ]);

      if (profileRes.data?.full_name) setFullName(profileRes.data.full_name);
      setRecords(recordsRes.data ?? []);
      setVaultDocs(vaultRes.data ?? []);
      setCases(casesRes.data ?? []);
      setCaseRecordLinks(caseRecordsRes.data ?? []);
      setHasActivePlan((plansRes.data ?? []).length > 0);
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  /* ----- Computed: Pillars ----- */
  const pillars = useMemo(() => {
    const recordCount = records.length;
    const vaultCount = vaultDocs.length;

    // Records
    const recordsStatus: "green" | "amber" | "gray" =
      recordCount >= 5 ? "green" : recordCount >= 1 ? "amber" : "gray";
    const recordsLabel = recordCount === 0
      ? "No records yet"
      : `${recordCount} record${recordCount !== 1 ? "s" : ""} documented`;

    // Evidence
    const evidenceStatus: "green" | "amber" | "gray" =
      vaultCount >= 3 ? "green" : vaultCount >= 1 ? "amber" : "gray";
    const evidenceLabel = vaultCount === 0
      ? "No evidence uploaded"
      : `${vaultCount} file${vaultCount !== 1 ? "s" : ""} in vault`;

    // Case Info — only check active cases, focus on employer & role
    const activeCases = cases.filter((c) => c.status.toLowerCase() === "active");
    const hasAll = activeCases.some((c) => c.employer && c.role);
    const hasPartial = activeCases.some((c) => c.employer || c.role);
    const caseInfoStatus: "green" | "amber" | "gray" =
      hasAll ? "green" : hasPartial ? "amber" : "gray";
    const caseInfoLabel = hasAll
      ? "Case details complete"
      : hasPartial ? "Partially filled" : "No case info";

    // Timeline span
    let daySpan = 0;
    if (records.length >= 2) {
      const first = new Date(records[0].date + "T00:00:00").getTime();
      const last = new Date(records[records.length - 1].date + "T00:00:00").getTime();
      daySpan = Math.round((last - first) / 86400000);
    }
    const timelineStatus: "green" | "amber" | "gray" =
      daySpan >= 14 ? "green" : daySpan >= 3 ? "amber" : "gray";
    const timelineLabel = daySpan >= 14
      ? `${daySpan} days documented`
      : daySpan >= 3 ? `${daySpan} days covered` : "Just getting started";

    return [
      { key: "records", label: recordsLabel, status: recordsStatus },
      { key: "evidence", label: evidenceLabel, status: evidenceStatus },
      { key: "caseinfo", label: caseInfoLabel, status: caseInfoStatus },
      { key: "timeline", label: timelineLabel, status: timelineStatus },
    ] as const;
  }, [records, vaultDocs, cases]);

  const strongCount = pillars.filter((p) => p.status === "green").length;

  /* ----- Computed: Next Best Action ----- */
  const nextAction = useMemo(() => {
    const recordCount = records.length;
    const vaultCount = vaultDocs.length;
    const hasCaseInfo = cases.some((c) => c.employer || c.role || c.description);
    const activeCases = cases.filter((c) => c.status.toLowerCase() === "active").length;

    if (recordCount === 0) {
      return { heading: "Document your first event", desc: "Start building your record by logging a workplace event, conversation, or observation.", href: "/dashboard", cta: "New Record" };
    }
    if (vaultCount === 0) {
      return { heading: "Upload your first piece of evidence", desc: "Add emails, screenshots, or documents to your secure vault.", href: "/dashboard/vault", cta: "Go to Vault" };
    }
    if (!hasCaseInfo) {
      return { heading: "Add details to your case", desc: "Fill in your employer, role, and a brief summary to strengthen your case file.", href: "/dashboard/case", cta: "Go to Cases" };
    }
    // No records in last 7 days
    const now = Date.now();
    const lastRecordDate = records.length > 0
      ? new Date(records[records.length - 1].date + "T00:00:00").getTime()
      : 0;
    if (now - lastRecordDate > 7 * 86400000) {
      return { heading: "Keep documenting", desc: "It's been over a week since your last record. Log what happened this week.", href: "/dashboard", cta: "New Record" };
    }
    if (recordCount >= 5 && activeCases === 0) {
      return { heading: "Organize your records into a case", desc: "You have enough records to start building a case file.", href: "/dashboard/case", cta: "Go to Cases" };
    }
    return { heading: "You're in good shape", desc: "Keep documenting as things happen. Consistency strengthens your case.", href: "", cta: "" };
  }, [records, vaultDocs, cases]);

  /* ----- Computed: Quick Stats ----- */
  const activeCaseCount = cases.filter((c) => c.status.toLowerCase() === "active").length;
  const uniqueDays = new Set(records.map((r) => r.date)).size;

  /* ----- Computed: Active Cases sidebar data ----- */
  const activeCases = useMemo(() => {
    // Build record count per case and last activity date
    const countMap: Record<string, number> = {};
    const lastDateMap: Record<string, string> = {};
    for (const link of caseRecordLinks) {
      countMap[link.case_id] = (countMap[link.case_id] || 0) + 1;
      const rec = records.find((r) => r.id === link.record_id);
      if (rec) {
        const prev = lastDateMap[link.case_id];
        if (!prev || rec.date > prev) lastDateMap[link.case_id] = rec.date;
      }
    }
    return cases
      .filter((c) => c.status.toLowerCase() === "active")
      .map((c) => ({
        id: c.id,
        name: c.name,
        caseStatus: c.case_status || "Active documentation",
        recordCount: countMap[c.id] || 0,
        lastActivity: lastDateMap[c.id] || c.created_at.split("T")[0],
      }))
      .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  }, [cases, caseRecordLinks, records]);

  /* ----- Computed: Recent Activity ----- */
  const recentActivity = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [];
    records.forEach((r) => items.push({
      type: "record",
      label: `You created a record: "${r.title.length > 40 ? r.title.slice(0, 40) + "..." : r.title}"`,
      date: r.created_at,
      href: "/dashboard",
    }));
    vaultDocs.forEach((v) => items.push({
      type: "vault",
      label: `You uploaded a file: "${v.file_name.length > 40 ? v.file_name.slice(0, 40) + "..." : v.file_name}"`,
      date: v.created_at,
      href: "/dashboard/vault",
    }));
    cases.forEach((c) => items.push({
      type: "case",
      label: `You created a case: "${c.name}"`,
      date: c.created_at,
      href: "/dashboard/case",
    }));
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items.slice(0, 5);
  }, [records, vaultDocs, cases]);

  /* ---------------------------------------------------------------- */
  /*  Pillar icons                                                     */
  /* ---------------------------------------------------------------- */

  const pillarIcons: Record<string, React.ReactNode> = {
    records: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    ),
    evidence: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    caseinfo: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
    timeline: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  };

  const activityIcons: Record<string, React.ReactNode> = {
    record: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    ),
    vault: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
      </svg>
    ),
    case: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
  };

  /* ---------------------------------------------------------------- */
  /*  Status helpers                                                   */
  /* ---------------------------------------------------------------- */

  function statusColor(s: "green" | "amber" | "gray"): string {
    if (s === "green") return "#15803D";
    if (s === "amber") return "#D97706";
    return "#78716C";
  }

  function statusBg(s: "green" | "amber" | "gray"): string {
    if (s === "green") return "#F0FDF4";
    if (s === "amber") return "#FFFBEB";
    return "#F5F5F4";
  }

  function statusBorder(s: "green" | "amber" | "gray"): string {
    if (s === "green") return "#BBF7D0";
    if (s === "amber") return "#FDE68A";
    return "#D6D3D1";
  }

  function statusText(s: "green" | "amber" | "gray"): string {
    if (s === "green") return "Complete";
    if (s === "amber") return "In progress";
    return "Not started";
  }

  /* ---------------------------------------------------------------- */
  /*  Loading                                                          */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <p style={{ fontSize: 14, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)" }}>Loading...</p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const greeting = fullName
    ? `${getGreeting()}, ${fullName.split(" ")[0]}`
    : "Welcome back";

  /* ---------------------------------------------------------------- */
  /*  First-time user welcome                                          */
  /* ---------------------------------------------------------------- */

  if (records.length === 0 && vaultDocs.length === 0 && cases.length === 0) {
    const steps = [
      {
        num: 1,
        heading: "Document what happened",
        desc: "Create a private record of a workplace event, conversation, or decision. Include the date, what happened, and who was involved.",
        cta: "Create your first record",
        href: "/dashboard",
        primary: true,
      },
      {
        num: 2,
        heading: "Upload evidence",
        desc: "Save emails, screenshots, performance reviews, or any documents that support your records in your secure vault.",
        cta: "Go to Vault",
        href: "/dashboard/vault",
        primary: false,
      },
      {
        num: 3,
        heading: "Build your case",
        desc: "Organize your records and evidence into a case file that you can share with an attorney or file a complaint.",
        cta: "Learn more",
        href: "/dashboard/support",
        primary: false,
      },
    ];

    return (
      <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 700, color: "#292524", marginBottom: 10 }}>
            Welcome to DocketAlly
          </h1>
          <p style={{ fontSize: 15, color: "#57534E", fontFamily: "var(--font-sans)", lineHeight: 1.6, maxWidth: 560 }}>
            DocketAlly helps you document workplace events, organize them into cases, and generate professional case files. Here&apos;s how to get started:
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {steps.map((step) => (
            <div
              key={step.num}
              style={{
                background: "#fff",
                borderRadius: 14,
                border: "1px solid #E7E5E4",
                padding: "24px 28px",
                display: "flex",
                alignItems: "flex-start",
                gap: 18,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#22C55E",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {step.num}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#292524", fontFamily: "var(--font-sans)", marginBottom: 6 }}>
                  {step.heading}
                </h3>
                <p style={{ fontSize: 14, color: "#57534E", fontFamily: "var(--font-sans)", lineHeight: 1.5, marginBottom: 14 }}>
                  {step.desc}
                </p>
                <button
                  onClick={() => router.push(step.href)}
                  style={{
                    padding: step.primary ? "10px 20px" : "8px 16px",
                    borderRadius: 10,
                    border: step.primary ? "none" : "1px solid #22C55E",
                    background: step.primary ? "#22C55E" : "transparent",
                    color: step.primary ? "#fff" : "#15803D",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                    cursor: "pointer",
                  }}
                >
                  {step.cta} &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Trust banner */}
        <div style={{ background: "#F0FDF4", borderRadius: 10, border: "1px solid #BBF7D0", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, marginTop: 28 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <p style={{ fontSize: 13, color: "#57534E", fontFamily: "var(--font-sans)", lineHeight: 1.5, margin: 0 }}>
            Your data is private. DocketAlly never shares your information with employers. You own everything you create.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Normal dashboard render                                          */
  /* ---------------------------------------------------------------- */

  /* Status chip color mapping for Active Cases sidebar */
  const sidebarStatusStyle = (s: string): { bg: string; text: string; border: string } => {
    switch (s) {
      case "Active documentation": return { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" };
      case "Preparing for counsel": return { bg: "#FFFBEB", text: "#D97706", border: "#FCD34D" };
      case "Filed with EEOC": return { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" };
      case "Referred to attorney": return { bg: "#FAF5FF", text: "#7E22CE", border: "#D8B4FE" };
      case "Resolved": return { bg: "#F5F5F4", text: "#57534E", border: "#D6D3D1" };
      default: return { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" };
    }
  };

  return (
    <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
        {/* ---- Main content ---- */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Section 1: Welcome */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 700, color: "#292524", marginBottom: 6 }}>
              {greeting}
            </h1>
            <p style={{ fontSize: 15, color: "#57534E", fontFamily: "var(--font-sans)", lineHeight: 1.5 }}>
              Here&apos;s where your documentation stands.
            </p>
            <p style={{ fontSize: 11, color: "#78716C", fontFamily: "var(--font-mono)", marginTop: 4 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>

          {/* Section 2: Documentation Strength */}
          <div style={{ ...cardStyle, padding: 32, marginBottom: 24, borderRadius: 16, borderTop: "3px solid #22C55E", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)" }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: "#292524", marginBottom: 24 }}>
              Documentation Strength
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {pillars.map((p) => (
                <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: statusBg(p.status), border: `1px solid ${statusBorder(p.status)}`, display: "flex", alignItems: "center", justifyContent: "center", color: statusColor(p.status), flexShrink: 0 }}>
                    {pillarIcons[p.key]}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: "#292524", fontFamily: "var(--font-sans)", fontWeight: 500 }}>
                    {p.label}
                  </span>
                  <span style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    color: statusColor(p.status),
                    background: statusBg(p.status),
                    border: `1px solid ${statusBorder(p.status)}`,
                    whiteSpace: "nowrap",
                  }}>
                    {statusText(p.status)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #F5F5F4" }}>
              <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)", color: "#292524" }}>
                {strongCount} of 4 areas strong
              </span>
            </div>
          </div>

          {/* Section 3: Next Best Action */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E7E5E4", padding: "24px 24px 24px 28px", marginBottom: 24, borderLeft: "4px solid #22C55E", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#292524", fontFamily: "var(--font-sans)", marginBottom: 4 }}>
                {nextAction.heading}
              </h3>
              <p style={{ fontSize: 14, color: "#57534E", fontFamily: "var(--font-sans)", lineHeight: 1.5, margin: 0 }}>
                {nextAction.desc}
              </p>
            </div>
            {nextAction.cta && (
              <button
                onClick={() => router.push(nextAction.href)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "#22C55E",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  boxShadow: "none",
                }}
              >
                {nextAction.cta}
              </button>
            )}
          </div>

          {/* Section 4: Quick Stats */}
          <div className="da-home-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
            {[
              { value: records.length, label: "Total Records" },
              { value: activeCaseCount, label: "Active Cases" },
              { value: vaultDocs.length, label: "Vault Files" },
              { value: uniqueDays, label: "Days Documented" },
            ].map((s) => (
              <div key={s.label} style={{ ...cardStyle, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)" }}>
                <div style={statValue}>{s.value}</div>
                <div style={statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Section 5: Recent Activity */}
          {recentActivity.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#292524", marginBottom: 14 }}>
                Recent Activity
              </h2>
              <div style={{ ...cardStyle, padding: 0, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)" }}>
                {recentActivity.map((item, idx) => {
                  const dotColor = "#22C55E";
                  return (
                    <button
                      key={`${item.type}-${idx}`}
                      onClick={() => router.push(item.href)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 20px",
                        borderBottom: idx < recentActivity.length - 1 ? "1px solid #F5F5F4" : "none",
                        background: "none",
                        border: "none",
                        borderBottomWidth: idx < recentActivity.length - 1 ? 1 : 0,
                        borderBottomStyle: "solid",
                        borderBottomColor: "#F5F5F4",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#FAFAF9"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 14, color: "#44403C", fontFamily: "var(--font-sans)", lineHeight: 1.4 }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: 13, color: "#78716C", fontFamily: "var(--font-sans)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {formatRelativeDate(item.date)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 6: Trust Banner */}
          <div style={{ background: "#F0FDF4", borderRadius: 10, border: "1px solid #BBF7D0", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <p style={{ fontSize: 13, color: "#57534E", fontFamily: "var(--font-sans)", lineHeight: 1.5, margin: 0 }}>
              Your data is private. DocketAlly never shares your information with employers. You own everything you create.
            </p>
          </div>
        </div>

        {/* ---- Active Cases sidebar ---- */}
        {activeCases.length > 0 && (
          <div style={{ width: 320, flexShrink: 0 }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#292524", marginBottom: 14 }}>
              Active Cases
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeCases.map((c) => {
                const ss = sidebarStatusStyle(c.caseStatus);
                return (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/dashboard/case/${c.id}`)}
                    style={{
                      ...cardStyle,
                      padding: "16px 18px",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#22C55E"; e.currentTarget.style.boxShadow = "0 1px 6px rgba(34,197,94,0.12)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E7E5E4"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
                  >
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 700, color: "#292524", marginBottom: 8, lineHeight: 1.3 }}>
                      {c.name}
                    </div>
                    <span style={{
                      display: "inline-block",
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: ss.bg,
                      color: ss.text,
                      border: `1px solid ${ss.border}`,
                      marginBottom: 10,
                    }}>
                      {c.caseStatus}
                    </span>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#78716C", fontFamily: "var(--font-mono)" }}>
                        {c.recordCount} record{c.recordCount !== 1 ? "s" : ""}
                      </span>
                      <span style={{ fontSize: 12, color: "#A8A29E", fontFamily: "var(--font-sans)" }}>
                        {formatRelativeDate(c.lastActivity + "T00:00:00")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
