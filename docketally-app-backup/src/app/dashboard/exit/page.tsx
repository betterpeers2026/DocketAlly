"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = "readiness" | "severance" | "filing";

interface CheckItem {
  label: string;
  status: "green" | "amber" | "red" | "neutral";
  group: string;
  manual?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PERSONAL_CHECKLIST_KEY = "docketally_exit_personal";

const PERSONAL_ITEMS = [
  "I have copies of my employment contract and offer letter",
  "I have copies of recent performance reviews",
  "I have saved important emails and communications externally",
  "I have reviewed my company's severance and separation policies",
  "I have consulted or plan to consult with an employment attorney",
  "I have a financial plan for a potential gap in employment",
];

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 600,
  color: "#44403C",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 8,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid var(--color-stone-200)",
  padding: "24px",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function StatusIcon({ status }: { status: "green" | "amber" | "red" | "neutral" }) {
  if (status === "green") {
    return (
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#F0FDF4", border: "1.5px solid #BBF7D0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (status === "amber") {
    return (
      <div style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
    );
  }
  if (status === "red") {
    return (
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#FEF2F2", border: "1.5px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#991B1B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
    );
  }
  // neutral
  return (
    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#F5F5F4", border: "1.5px solid #E7E5E4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#A8A29E" }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Accordion                                                          */
/* ------------------------------------------------------------------ */

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid var(--color-stone-200)", borderRadius: 12, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "16px 20px",
          background: open ? "var(--color-stone-50)" : "#fff",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: "#1C1917", fontFamily: "var(--font-sans)" }}>
          {title}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-stone-400)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: "0 20px 20px", background: "#fff" }}>
          <div style={{ fontSize: 14, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)", lineHeight: 1.7 }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ExitPage() {
  const supabase = createClient();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("readiness");
  const [loading, setLoading] = useState(true);

  // Data
  const [recordCount, setRecordCount] = useState(0);
  const [vaultCount, setVaultCount] = useState(0);
  const [recordDaysSpan, setRecordDaysSpan] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [planExists, setPlanExists] = useState(false);
  const [goalCount, setGoalCount] = useState(0);
  const [revisionCount, setRevisionCount] = useState(0);
  const [checkinCount, setCheckinCount] = useState(0);

  // localStorage data
  const [caseInfoFilled, setCaseInfoFilled] = useState(false);
  const [starredCount, setStarredCount] = useState(0);
  const [personalChecks, setPersonalChecks] = useState<Set<string>>(new Set());

  /* ----- fetch data ----- */
  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const uid = user.id;

    const [recordsRes, vaultRes, plansRes, goalsRes, checkinsRes] = await Promise.all([
      supabase.from("records").select("id, date, entry_type, follow_up").eq("user_id", uid).order("date", { ascending: true }),
      supabase.from("vault_documents").select("id").eq("user_id", uid),
      supabase.from("plans").select("id, status").eq("user_id", uid).eq("status", "active").limit(1),
      supabase.from("plan_goals").select("id, original_description, revised_date").eq("user_id", uid),
      supabase.from("plan_checkins").select("id").eq("user_id", uid),
    ]);

    const records = recordsRes.data ?? [];
    setRecordCount(records.length);
    setVaultCount((vaultRes.data ?? []).length);

    // Days span
    if (records.length >= 2) {
      const first = new Date(records[0].date + "T00:00:00").getTime();
      const last = new Date(records[records.length - 1].date + "T00:00:00").getTime();
      setRecordDaysSpan(Math.round((last - first) / 86400000));
    } else {
      setRecordDaysSpan(0);
    }

    // Warning types
    const warningTypes = ["pip", "hr", "incident", "formal warning", "written warning", "termination"];
    const warnings = records.filter((r) =>
      warningTypes.some((w) => (r.entry_type || "").toLowerCase().includes(w))
    );
    setWarningCount(warnings.length);

    // Follow-ups
    const withFollowUp = records.filter((r) => r.follow_up && r.follow_up.trim().length > 0);
    setFollowUpCount(withFollowUp.length);

    // Plans
    setPlanExists((plansRes.data ?? []).length > 0);
    const allGoals = goalsRes.data ?? [];
    setGoalCount(allGoals.length);
    setRevisionCount(allGoals.filter((g) => g.original_description && g.revised_date).length);
    setCheckinCount((checkinsRes.data ?? []).length);

    // localStorage
    try {
      const caseRaw = localStorage.getItem("docketally_case_info");
      if (caseRaw) {
        const ci = JSON.parse(caseRaw);
        setCaseInfoFilled(!!(ci.name && ci.company && ci.summary));
      }
    } catch { /* ignore */ }

    try {
      const starredRaw = localStorage.getItem("docketally_starred_records");
      if (starredRaw) {
        const arr = JSON.parse(starredRaw);
        setStarredCount(Array.isArray(arr) ? arr.length : 0);
      }
    } catch { /* ignore */ }

    try {
      const personalRaw = localStorage.getItem(PERSONAL_CHECKLIST_KEY);
      if (personalRaw) {
        const arr = JSON.parse(personalRaw);
        setPersonalChecks(new Set(Array.isArray(arr) ? arr : []));
      }
    } catch { /* ignore */ }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ----- personal checkbox toggle ----- */
  function togglePersonal(item: string) {
    setPersonalChecks((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      localStorage.setItem(PERSONAL_CHECKLIST_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  /* ----- build checklist items ----- */
  const checkItems: CheckItem[] = useMemo(() => {
    const items: CheckItem[] = [];

    // Group A — Documentation
    items.push({
      label: `You have ${recordCount} record${recordCount !== 1 ? "s" : ""} documented`,
      status: recordCount >= 5 ? "green" : recordCount >= 1 ? "amber" : "red",
      group: "Documentation",
    });
    items.push({
      label: `You have ${vaultCount} vault document${vaultCount !== 1 ? "s" : ""} uploaded`,
      status: vaultCount >= 3 ? "green" : vaultCount >= 1 ? "amber" : "red",
      group: "Documentation",
    });
    items.push({
      label: `Your records span ${recordDaysSpan} day${recordDaysSpan !== 1 ? "s" : ""}`,
      status: recordDaysSpan >= 14 ? "green" : recordDaysSpan >= 7 ? "amber" : "red",
      group: "Documentation",
    });
    items.push({
      label: `You have ${warningCount} warning-type entr${warningCount !== 1 ? "ies" : "y"} (PIP, HR, Incident)`,
      status: warningCount >= 2 ? "green" : warningCount >= 1 ? "amber" : "neutral",
      group: "Documentation",
    });
    items.push({
      label: `You have written follow-ups in ${followUpCount} record${followUpCount !== 1 ? "s" : ""}`,
      status: followUpCount >= 3 ? "green" : followUpCount >= 1 ? "amber" : "red",
      group: "Documentation",
    });

    // Group B — Case Readiness
    items.push({
      label: "Case info is filled out",
      status: caseInfoFilled ? "green" : "red",
      group: "Case Readiness",
    });
    items.push({
      label: `Timeline has ${recordCount} entr${recordCount !== 1 ? "ies" : "y"}`,
      status: recordCount >= 5 ? "green" : recordCount >= 1 ? "amber" : "red",
      group: "Case Readiness",
    });
    items.push({
      label: `Key events flagged: ${starredCount}`,
      status: starredCount >= 1 ? "green" : "amber",
      group: "Case Readiness",
    });
    items.push({
      label: "Case file can be generated",
      status: recordCount >= 3 ? "green" : "red",
      group: "Case Readiness",
    });

    // Group C — Plan Tracking
    items.push({
      label: "Active plan tracked",
      status: planExists ? "green" : "red",
      group: "Plan Tracking",
    });
    items.push({
      label: `Goals documented: ${goalCount}`,
      status: goalCount >= 2 ? "green" : goalCount >= 1 ? "amber" : "red",
      group: "Plan Tracking",
    });
    items.push({
      label: `Goal revisions flagged: ${revisionCount}`,
      status: revisionCount >= 1 ? "green" : "neutral",
      group: "Plan Tracking",
    });
    items.push({
      label: `Check-ins logged: ${checkinCount}`,
      status: checkinCount >= 3 ? "green" : checkinCount >= 1 ? "amber" : "red",
      group: "Plan Tracking",
    });

    // Group D — Personal Readiness
    PERSONAL_ITEMS.forEach((item) => {
      items.push({
        label: item,
        status: personalChecks.has(item) ? "green" : "red",
        group: "Personal Readiness",
        manual: true,
      });
    });

    return items;
  }, [recordCount, vaultCount, recordDaysSpan, warningCount, followUpCount, caseInfoFilled, starredCount, planExists, goalCount, revisionCount, checkinCount, personalChecks]);

  const greenCount = checkItems.filter((i) => i.status === "green").length;
  const totalCount = checkItems.filter((i) => i.status !== "neutral").length;
  const scorePct = totalCount > 0 ? Math.round((greenCount / totalCount) * 100) : 0;

  /* ----- action items ----- */
  const actionItems = useMemo(() => {
    const actions: { label: string; href: string }[] = [];
    if (recordCount < 5) actions.push({ label: "Add more records", href: "/dashboard" });
    if (vaultCount < 3) actions.push({ label: "Upload supporting documents", href: "/dashboard/vault" });
    if (!caseInfoFilled) actions.push({ label: "Fill out your case info", href: "/dashboard/case" });
    if (starredCount === 0) actions.push({ label: "Flag key events on your timeline", href: "/dashboard/case" });
    if (!planExists) actions.push({ label: "Track your PIP in Plans", href: "/dashboard/plans" });
    if (recordCount < 3) actions.push({ label: "Generate your case file (need 3+ records)", href: "/dashboard/case" });
    return actions;
  }, [recordCount, vaultCount, caseInfoFilled, starredCount, planExists]);

  /* ----- grouped items ----- */
  const groups = useMemo(() => {
    const order = ["Documentation", "Case Readiness", "Plan Tracking", "Personal Readiness"];
    return order.map((g) => ({
      name: g,
      items: checkItems.filter((i) => i.group === g),
    }));
  }, [checkItems]);

  /* ---------------------------------------------------------------- */
  /*  Loading                                                          */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <p style={{ fontSize: 14, color: "var(--color-stone-400)", fontFamily: "var(--font-sans)" }}>Loading...</p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 700, color: "#1C1917", marginBottom: 8 }}>
          Exit
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-stone-500)", lineHeight: 1.6, fontFamily: "var(--font-sans)", maxWidth: 600 }}>
          Evaluate your readiness, review severance basics, and understand your filing options.
        </p>
      </div>

      {/* Tab pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        {([
          { key: "readiness" as Tab, label: "Readiness" },
          { key: "severance" as Tab, label: "Severance Guide" },
          { key: "filing" as Tab, label: "Filing Guide" },
        ]).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 18px",
                borderRadius: 20,
                border: isActive ? "1px solid var(--color-green)" : "1px solid var(--color-stone-200)",
                background: isActive ? "var(--color-green-soft)" : "#fff",
                color: isActive ? "var(--color-green-text)" : "var(--color-stone-600)",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "var(--color-stone-300)";
                  e.currentTarget.style.background = "var(--color-stone-50)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "var(--color-stone-200)";
                  e.currentTarget.style.background = "#fff";
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/*  READINESS TAB                                                */}
      {/* ============================================================ */}
      {activeTab === "readiness" && (
        <>
          {/* Overall score */}
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, color: "#1C1917", margin: 0 }}>
                Readiness: {greenCount} of {totalCount} items complete
              </h2>
              <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 700, color: scorePct >= 70 ? "#15803D" : scorePct >= 40 ? "#D97706" : "#991B1B" }}>
                {scorePct}%
              </span>
            </div>
            <div style={{ width: "100%", height: 6, borderRadius: 3, background: "var(--color-stone-100)", marginBottom: 10 }}>
              <div style={{ width: `${scorePct}%`, height: "100%", borderRadius: 3, background: "var(--color-green)", transition: "width 0.3s" }} />
            </div>
            <p style={{ fontSize: 12, color: "var(--color-stone-400)", fontFamily: "var(--font-sans)", fontStyle: "italic", margin: 0 }}>
              This checklist helps you prepare. It is not a legal assessment of your situation.
            </p>
          </div>

          {/* Checklist groups */}
          {groups.map((group) => (
            <div key={group.name} style={{ marginBottom: 24 }}>
              <span style={labelStyle}>{group.name}</span>
              <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 20px",
                      borderBottom: idx < group.items.length - 1 ? "1px solid var(--color-stone-100)" : "none",
                      cursor: item.manual ? "pointer" : "default",
                    }}
                    onClick={() => {
                      if (item.manual) togglePersonal(item.label);
                    }}
                  >
                    {item.manual ? (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          border: personalChecks.has(item.label)
                            ? "2px solid var(--color-green)"
                            : "2px solid #D6D3D1",
                          background: personalChecks.has(item.label) ? "var(--color-green)" : "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "all 0.15s",
                        }}
                      >
                        {personalChecks.has(item.label) && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    ) : (
                      <StatusIcon status={item.status} />
                    )}
                    <span style={{ fontSize: 14, color: "#1C1917", fontFamily: "var(--font-sans)", lineHeight: 1.4 }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Action items */}
          {actionItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#1C1917", marginBottom: 14 }}>
                Recommended Next Steps
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {actionItems.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => router.push(action.href)}
                    style={{
                      ...cardStyle,
                      padding: "14px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-green)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-stone-200)";
                    }}
                  >
                    <span style={{ fontSize: 14, color: "#1C1917", fontFamily: "var(--font-sans)", fontWeight: 500 }}>
                      {action.label}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-green-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/*  SEVERANCE GUIDE TAB                                          */}
      {/* ============================================================ */}
      {activeTab === "severance" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            <Accordion title="What is severance?">
              <p>
                Severance is not required by law in most states. It is a negotiated agreement between you and your employer, typically offered in exchange for signing a release of claims. The amount and terms vary widely.
              </p>
            </Accordion>

            <Accordion title="What's typically included?">
              <p>
                Common components include a lump sum or continued salary payments, extended health insurance (COBRA subsidy), payment for unused PTO, outplacement services, a neutral reference agreement, non-disparagement clauses, and a release of legal claims.
              </p>
            </Accordion>

            <Accordion title="Can I negotiate?">
              <p>
                Yes. A severance offer is a starting point, not a final answer. Employers expect negotiation, especially if you have documentation of workplace issues. Common negotiation points include the payment amount, benefit continuation period, reference language, non-compete scope, and non-disparagement terms.
              </p>
            </Accordion>

            <Accordion title="When should I involve an attorney?">
              <p>
                Consider consulting an employment attorney if your severance includes a release of claims, if you believe you experienced discrimination or retaliation, if the offer feels significantly below market norms, if you&apos;re being asked to sign a non-compete, or if you&apos;re unsure about any terms. Many employment attorneys offer free initial consultations.
              </p>
            </Accordion>

            <Accordion title="What is the Older Workers Benefit Protection Act?">
              <p>
                If you are 40 or older, federal law requires your employer to give you at least 21 days to review a severance agreement (45 days in a group layoff) and 7 days to revoke after signing. This applies regardless of the amount offered.
              </p>
            </Accordion>

            <Accordion title="What should I NOT do?">
              <p>
                Do not sign anything immediately. Do not verbally agree to terms in a meeting. Do not discuss severance details with coworkers. Do not delete any documentation. Do not stop documenting while negotiations are ongoing.
              </p>
            </Accordion>
          </div>

          {/* Footer disclaimer */}
          <div style={{ padding: "16px 20px", background: "var(--color-stone-50)", borderRadius: 10, border: "1px solid var(--color-stone-100)" }}>
            <p style={{ fontSize: 12, color: "var(--color-stone-400)", lineHeight: 1.6, fontFamily: "var(--font-sans)", fontStyle: "italic", margin: 0 }}>
              This guide provides general information, not legal advice. Consult an employment attorney for advice specific to your situation.
            </p>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/*  FILING GUIDE TAB                                             */}
      {/* ============================================================ */}
      {activeTab === "filing" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            <Accordion title="What is the EEOC?">
              <p>
                The Equal Employment Opportunity Commission is the federal agency that enforces workplace anti-discrimination laws. They investigate complaints of discrimination based on race, color, religion, sex, national origin, age (40+), disability, and genetic information.
              </p>
            </Accordion>

            <Accordion title="When can I file?">
              <p>
                You generally have 180 days from the discriminatory act to file with the EEOC (300 days if your state has its own enforcement agency, which most do). Filing sooner is better. The clock starts from the date of the most recent discriminatory act.
              </p>
            </Accordion>

            <Accordion title="How do I file?">
              <p>
                You can file online at the EEOC&apos;s public portal, in person at your nearest EEOC office, or by mail. The process starts with an intake questionnaire. You do not need an attorney to file, but consulting one beforehand can be helpful.
              </p>
            </Accordion>

            <Accordion title="What happens after I file?">
              <p>
                The EEOC assigns your charge a number and notifies your employer. They may offer mediation. If mediation is declined or fails, they investigate. The process can take several months to over a year. You can request a Right to Sue letter at any time if you want to pursue the matter in court.
              </p>
            </Accordion>

            <Accordion title="What is a Right to Sue letter?">
              <p>
                This is a letter from the EEOC that gives you permission to file a lawsuit in federal court. You have 90 days from receiving this letter to file. You do not need to wait for the EEOC to complete their investigation to request one.
              </p>
            </Accordion>

            <Accordion title="State agencies and dual filing">
              <p>
                Most states have their own civil rights or human rights agencies that handle workplace discrimination complaints. When you file with the EEOC, they typically cross-file with your state agency automatically. State agencies may offer additional protections beyond federal law.
              </p>
            </Accordion>

            <Accordion title="How DocketAlly helps">
              <p>
                Your case file generated in the Case tab organizes your records, timeline, and evidence in a format that supports any filing. While DocketAlly does not file complaints on your behalf, the documentation you build here is exactly what the EEOC and attorneys ask for.
              </p>
            </Accordion>
          </div>

          {/* Footer disclaimer */}
          <div style={{ padding: "16px 20px", background: "var(--color-stone-50)", borderRadius: 10, border: "1px solid var(--color-stone-100)" }}>
            <p style={{ fontSize: 12, color: "var(--color-stone-400)", lineHeight: 1.6, fontFamily: "var(--font-sans)", fontStyle: "italic", margin: 0 }}>
              This guide provides general information about the complaint process. It is not legal advice. Consult an employment attorney for guidance specific to your situation.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
