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
  employer: string | null;
  role: string | null;
  description: string | null;
  created_at: string;
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
  const [hasActivePlan, setHasActivePlan] = useState(false);

  /* ----- Fetch ----- */
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const uid = user.id;

      const [profileRes, recordsRes, vaultRes, casesRes, plansRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", uid).single(),
        supabase.from("records").select("id, title, date, entry_type, created_at").eq("user_id", uid).order("date", { ascending: true }),
        supabase.from("vault_documents").select("id, file_name, created_at").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("cases").select("id, name, case_type, case_types, status, employer, role, description, created_at").eq("user_id", uid),
        supabase.from("plans").select("id").eq("user_id", uid).eq("status", "active").limit(1),
      ]);

      if (profileRes.data?.full_name) setFullName(profileRes.data.full_name);
      setRecords(recordsRes.data ?? []);
      setVaultDocs(vaultRes.data ?? []);
      setCases(casesRes.data ?? []);
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

  return (
    <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
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
  );
}
