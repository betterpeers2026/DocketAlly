"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Record {
  id: string;
  title: string;
  entry_type: string;
  date: string;
  narrative: string;
  people: string | null;
  facts: string | null;
  follow_up: string | null;
  created_at: string;
}

interface PlanGoal {
  id: string;
  title: string;
  deadline: string | null;
  original_description: string | null;
  revised_date: string | null;
  revision_notes: string | null;
  created_at: string;
}

interface PlanCheckin {
  id: string;
  date: string;
  manager_feedback: string | null;
}

interface Plan {
  id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface PatternCard {
  title: string;
  description: string;
  details: string[];
  severity: "green" | "amber" | "red";
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ENTRY_TYPES = [
  "1:1 Meeting",
  "Written Communication",
  "PIP Conversation",
  "Feedback Received",
  "Role/Responsibility Change",
  "HR Interaction",
  "Incident",
  "Positive Evidence",
  "Self-Documentation",
  "Other",
];

const WARNING_TYPES = new Set(["PIP Conversation", "HR Interaction", "Incident"]);

const ISOLATION_KEYWORDS = ["excluded", "not invited", "removed from", "left out", "no longer included", "reassigned"];
const MOVING_TARGET_KEYWORDS = ["goals changed", "new expectations", "different criteria", "revised", "shifted", "unclear"];
const MICROMANAGEMENT_KEYWORDS = ["checking in constantly", "monitoring", "hovering", "every detail", "cc'd on everything", "no autonomy"];
const COMMUNICATION_KEYWORDS = ["stopped responding", "delayed", "ignored", "no response", "ghosted", "short replies"];
const POSITIVE_KEYWORDS = ["good work", "thank you", "great job", "exceeds", "strong performance", "positive"];
const NEGATIVE_KEYWORDS = ["needs improvement", "below expectations", "unsatisfactory", "disappointing", "inadequate", "not meeting"];

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

const statValue: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
  color: "#1C1917",
  lineHeight: 1,
};

const statLabel: React.CSSProperties = {
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  fontWeight: 600,
  color: "#78716C",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginTop: 4,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scanText(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function countMatches(records: Record[], keywords: string[]): number {
  return records.filter((r) => {
    const combined = [r.narrative, r.facts || "", r.title].join(" ");
    return scanText(combined, keywords);
  }).length;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function IntegrityPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<Record[]>([]);
  const [vaultCount, setVaultCount] = useState(0);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [goals, setGoals] = useState<PlanGoal[]>([]);
  const [checkins, setCheckins] = useState<PlanCheckin[]>([]);

  /* ----- fetch ----- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const uid = user.id;

    const [recordsRes, vaultRes, plansRes, goalsRes, checkinsRes] = await Promise.all([
      supabase.from("records").select("id, title, entry_type, date, narrative, people, facts, follow_up, created_at").eq("user_id", uid).order("date", { ascending: true }),
      supabase.from("vault_documents").select("id").eq("user_id", uid),
      supabase.from("plans").select("id, plan_name, start_date, end_date, status").eq("user_id", uid).eq("status", "active").order("created_at", { ascending: false }).limit(1),
      supabase.from("plan_goals").select("id, title, deadline, original_description, revised_date, revision_notes, created_at").eq("user_id", uid),
      supabase.from("plan_checkins").select("id, date, manager_feedback").eq("user_id", uid).order("date", { ascending: false }),
    ]);

    setRecords(recordsRes.data ?? []);
    setVaultCount((vaultRes.data ?? []).length);
    setPlan((plansRes.data ?? [])[0] ?? null);
    setGoals(goalsRes.data ?? []);
    setCheckins(checkinsRes.data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ----- computed summary data ----- */
  const summary = useMemo(() => {
    if (records.length === 0) return null;

    const firstDate = records[0].date;
    const lastDate = records[records.length - 1].date;
    const warningRecords = records.filter((r) => WARNING_TYPES.has(r.entry_type));
    const warningPct = Math.round((warningRecords.length / records.length) * 100);

    // Entry type breakdown
    const typeCounts: { [key: string]: number } = {};
    records.forEach((r) => {
      typeCounts[r.entry_type] = (typeCounts[r.entry_type] || 0) + 1;
    });

    // People frequency
    const peopleCounts: { [key: string]: number } = {};
    records.forEach((r) => {
      if (r.people) {
        r.people.split(",").forEach((p) => {
          const name = p.trim();
          if (name) peopleCounts[name] = (peopleCounts[name] || 0) + 1;
        });
      }
    });
    const topPeople = Object.entries(peopleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Plan info
    let planDaysRemaining = 0;
    if (plan) {
      const end = new Date(plan.end_date + "T00:00:00").getTime();
      planDaysRemaining = Math.max(0, Math.round((end - Date.now()) / 86400000));
    }

    return {
      firstDate,
      lastDate,
      warningCount: warningRecords.length,
      warningPct,
      typeCounts,
      topPeople,
      planDaysRemaining,
    };
  }, [records, plan]);

  /* ----- pattern analysis ----- */
  const patterns = useMemo((): PatternCard[] => {
    if (records.length === 0) return [];
    const cards: PatternCard[] = [];

    // 1. DOCUMENTATION CONSISTENCY
    const dates = records.map((r) => new Date(r.date + "T00:00:00").getTime()).sort((a, b) => a - b);
    const gaps: { from: string; to: string; days: number }[] = [];
    for (let i = 1; i < dates.length; i++) {
      const daysDiff = Math.round((dates[i] - dates[i - 1]) / 86400000);
      if (daysDiff > 14) {
        gaps.push({
          from: new Date(dates[i - 1]).toISOString().split("T")[0],
          to: new Date(dates[i]).toISOString().split("T")[0],
          days: daysDiff,
        });
      }
    }

    // Frequency trend
    const totalSpan = Math.max(1, Math.round((dates[dates.length - 1] - dates[0]) / 86400000));
    const avgDaysBetween = records.length > 1 ? Math.round(totalSpan / (records.length - 1)) : 0;

    const twoWeeksMs = 14 * 86400000;
    const firstTwoWeeks = records.filter((r) => new Date(r.date + "T00:00:00").getTime() - dates[0] <= twoWeeksMs);
    const lastTwoWeeks = records.filter((r) => dates[dates.length - 1] - new Date(r.date + "T00:00:00").getTime() <= twoWeeksMs);
    const firstRate = firstTwoWeeks.length / 2;
    const lastRate = lastTwoWeeks.length / 2;

    const consistencyDetails: string[] = [];
    consistencyDetails.push(`Average: 1 record every ${avgDaysBetween} day${avgDaysBetween !== 1 ? "s" : ""}`);
    if (records.length >= 4) {
      consistencyDetails.push(`First 2 weeks: ${firstRate.toFixed(1)} records/week · Last 2 weeks: ${lastRate.toFixed(1)} records/week`);
    }
    gaps.forEach((g) => {
      consistencyDetails.push(`Gap: No records between ${formatDate(g.from)} and ${formatDate(g.to)} (${g.days} days)`);
    });

    let consistencyDesc = "Your documentation pattern over time.";
    let consistencySeverity: "green" | "amber" | "red" = "green";
    if (gaps.length > 0) {
      consistencySeverity = "amber";
      consistencyDesc = `${gaps.length} gap${gaps.length !== 1 ? "s" : ""} of 14+ days found in your documentation timeline.`;
    }
    if (lastRate > firstRate && records.length >= 4) {
      consistencyDetails.push("Your documentation frequency is increasing, which may indicate an escalating situation.");
      consistencySeverity = "amber";
    } else if (lastRate < firstRate * 0.5 && records.length >= 4) {
      consistencyDetails.push("Documentation has slowed. If your situation is ongoing, continue recording consistently.");
      consistencySeverity = "amber";
    }
    cards.push({ title: "Documentation Consistency", description: consistencyDesc, details: consistencyDetails, severity: consistencySeverity });

    // 2. BEHAVIORAL PATTERNS
    const isolationCount = countMatches(records, ISOLATION_KEYWORDS);
    const movingCount = countMatches(records, MOVING_TARGET_KEYWORDS);
    const microCount = countMatches(records, MICROMANAGEMENT_KEYWORDS);
    const commCount = countMatches(records, COMMUNICATION_KEYWORDS);
    const positiveCount = countMatches(records, POSITIVE_KEYWORDS);

    if (isolationCount > 0) {
      cards.push({
        title: "Possible Isolation Pattern",
        description: `${isolationCount} record${isolationCount !== 1 ? "s" : ""} mention exclusion or removal from responsibilities/meetings.`,
        details: records
          .filter((r) => scanText([r.narrative, r.facts || "", r.title].join(" "), ISOLATION_KEYWORDS))
          .map((r) => `${formatDate(r.date)} — ${r.title}`),
        severity: "red",
      });
    }

    if (movingCount > 0) {
      const revCount = goals.filter((g) => g.original_description && g.revised_date).length;
      const details = records
        .filter((r) => scanText([r.narrative, r.facts || "", r.title].join(" "), MOVING_TARGET_KEYWORDS))
        .map((r) => `${formatDate(r.date)} — ${r.title}`);
      if (revCount > 0) details.push(`${revCount} goal revision${revCount !== 1 ? "s" : ""} flagged in Plans`);
      cards.push({
        title: "Possible Shifting Expectations",
        description: `${movingCount} record${movingCount !== 1 ? "s" : ""} reference changing goals or criteria.`,
        details,
        severity: "red",
      });
    }

    if (microCount > 0) {
      cards.push({
        title: "Possible Increased Oversight",
        description: `${microCount} record${microCount !== 1 ? "s" : ""} describe heightened monitoring or micromanagement.`,
        details: records
          .filter((r) => scanText([r.narrative, r.facts || "", r.title].join(" "), MICROMANAGEMENT_KEYWORDS))
          .map((r) => `${formatDate(r.date)} — ${r.title}`),
        severity: "amber",
      });
    }

    if (commCount > 0) {
      cards.push({
        title: "Possible Communication Withdrawal",
        description: `${commCount} record${commCount !== 1 ? "s" : ""} note reduced or changed communication patterns.`,
        details: records
          .filter((r) => scanText([r.narrative, r.facts || "", r.title].join(" "), COMMUNICATION_KEYWORDS))
          .map((r) => `${formatDate(r.date)} — ${r.title}`),
        severity: "amber",
      });
    }

    if (positiveCount > 0) {
      cards.push({
        title: "Positive Evidence Found",
        description: `${positiveCount} record${positiveCount !== 1 ? "s" : ""} contain favorable feedback or recognition.`,
        details: records
          .filter((r) => scanText([r.narrative, r.facts || "", r.title].join(" "), POSITIVE_KEYWORDS))
          .map((r) => `${formatDate(r.date)} — ${r.title}`),
        severity: "green",
      });
    }

    // 3. TIMELINE ANOMALIES
    // Positive evidence before PIP
    const pipRecords = records.filter((r) => r.entry_type === "PIP Conversation");
    const positiveRecords = records.filter((r) =>
      r.entry_type === "Positive Evidence" || scanText([r.narrative, r.facts || ""].join(" "), POSITIVE_KEYWORDS)
    );
    pipRecords.forEach((pip) => {
      const pipTime = new Date(pip.date + "T00:00:00").getTime();
      const recentPositive = positiveRecords.filter((p) => {
        const pTime = new Date(p.date + "T00:00:00").getTime();
        return pTime < pipTime && pipTime - pTime <= 90 * 86400000;
      });
      if (recentPositive.length > 0) {
        cards.push({
          title: "Performance Contradiction Detected",
          description: `Positive evidence found within 90 days before PIP on ${formatDate(pip.date)}.`,
          details: recentPositive.map((r) => `${formatDate(r.date)} — ${r.title}`),
          severity: "red",
        });
      }
    });

    // Post-escalation pattern
    const hrRecords = records.filter((r) => r.entry_type === "HR Interaction");
    hrRecords.forEach((hr) => {
      const hrTime = new Date(hr.date + "T00:00:00").getTime();
      const after30 = records.filter((r) => {
        const rTime = new Date(r.date + "T00:00:00").getTime();
        return rTime > hrTime && rTime - hrTime <= 30 * 86400000 && WARNING_TYPES.has(r.entry_type) && r.id !== hr.id;
      });
      if (after30.length > 0) {
        cards.push({
          title: "Post-Escalation Pattern Detected",
          description: `${after30.length} negative event${after30.length !== 1 ? "s" : ""} within 30 days after HR interaction on ${formatDate(hr.date)}.`,
          details: after30.map((r) => `${formatDate(r.date)} — ${r.entry_type}: ${r.title}`),
          severity: "red",
        });
      }
    });

    // Escalation cluster
    for (let i = 0; i < records.length; i++) {
      const windowStart = new Date(records[i].date + "T00:00:00").getTime();
      const windowEnd = windowStart + 7 * 86400000;
      const cluster = records.filter((r) => {
        const t = new Date(r.date + "T00:00:00").getTime();
        return t >= windowStart && t <= windowEnd;
      });
      if (cluster.length >= 5) {
        const from = cluster[0].date;
        const to = cluster[cluster.length - 1].date;
        const alreadyExists = cards.some((c) => c.title === "Escalation Cluster" && c.details[0]?.includes(formatDate(from)));
        if (!alreadyExists) {
          cards.push({
            title: "Escalation Cluster",
            description: `${cluster.length} events recorded in 7 days around ${formatDate(from)} – ${formatDate(to)}.`,
            details: cluster.map((r) => `${formatDate(r.date)} — ${r.entry_type}: ${r.title}`),
            severity: "amber",
          });
        }
        break; // only report first cluster
      }
    }

    // 4. PLAN INTEGRITY
    if (plan) {
      const revisions = goals.filter((g) => g.original_description && g.revised_date);
      const planDetails: string[] = [];
      const planStart = new Date(plan.start_date + "T00:00:00").getTime();
      const planEnd = new Date(plan.end_date + "T00:00:00").getTime();
      const planDuration = Math.round((planEnd - planStart) / 86400000);
      planDetails.push(`Plan duration: ${planDuration} days. Industry standard PIPs typically run 30–90 days.`);

      if (revisions.length > 0) {
        planDetails.push(`Goals revised: ${revisions.length} time${revisions.length !== 1 ? "s" : ""}`);
        // Check if revised before deadline
        revisions.forEach((g) => {
          if (g.deadline && g.revised_date) {
            const deadlineTime = new Date(g.deadline + "T00:00:00").getTime();
            const revisedTime = new Date(g.revised_date + "T00:00:00").getTime();
            if (revisedTime < deadlineTime) {
              planDetails.push(`"${g.title}" was changed on ${formatDate(g.revised_date)}, before its deadline of ${formatDate(g.deadline)}`);
            }
          }
        });
      }

      // Check-in sentiment
      if (checkins.length > 0) {
        let positiveFeedback = 0;
        let negativeFeedback = 0;
        checkins.forEach((ci) => {
          if (ci.manager_feedback) {
            if (scanText(ci.manager_feedback, POSITIVE_KEYWORDS)) positiveFeedback++;
            if (scanText(ci.manager_feedback, NEGATIVE_KEYWORDS)) negativeFeedback++;
          }
        });
        if (positiveFeedback > 0 || negativeFeedback > 0) {
          planDetails.push(`Check-in feedback tone: ${positiveFeedback} positive, ${negativeFeedback} negative out of ${checkins.length} check-in${checkins.length !== 1 ? "s" : ""}`);
        }
        planDetails.push(`${checkins.length} check-in${checkins.length !== 1 ? "s" : ""} logged`);
      }

      let planSeverity: "green" | "amber" | "red" = "green";
      let planDesc = `Active plan: ${plan.plan_name}`;
      if (revisions.length > 0) {
        planSeverity = "amber";
        planDesc += ` — ${revisions.length} goal revision${revisions.length !== 1 ? "s" : ""} detected`;
      }
      const earlyRevisions = revisions.filter((g) => {
        if (!g.deadline || !g.revised_date) return false;
        return new Date(g.revised_date + "T00:00:00").getTime() < new Date(g.deadline + "T00:00:00").getTime();
      });
      if (earlyRevisions.length > 0) {
        planSeverity = "red";
        planDetails.push("Goals were changed before you had a chance to meet the original criteria.");
      }

      cards.push({ title: "Plan Integrity", description: planDesc, details: planDetails, severity: planSeverity });
    }

    // 5. DOCUMENT COVERAGE
    const usedTypes = new Set(records.map((r) => r.entry_type));
    const suggestions: string[] = [];
    if (!usedTypes.has("Positive Evidence") && (usedTypes.has("PIP Conversation") || usedTypes.has("Incident"))) {
      suggestions.push("Consider adding Positive Evidence entries to document favorable feedback.");
    }
    if (usedTypes.has("HR Interaction") && !records.some((r) => r.entry_type === "Written Communication" && hrRecords.some((hr) => {
      const hrTime = new Date(hr.date + "T00:00:00").getTime();
      const rTime = new Date(r.date + "T00:00:00").getTime();
      return rTime > hrTime && rTime - hrTime <= 7 * 86400000;
    }))) {
      suggestions.push("Consider following up HR interactions in writing.");
    }
    if (!usedTypes.has("Self-Documentation")) {
      suggestions.push("Consider adding Self-Documentation entries to record your own perspective.");
    }

    const coverageDetails = [`You have records for: ${[...usedTypes].join(", ")}`];
    if (suggestions.length > 0) {
      coverageDetails.push(...suggestions);
    }

    cards.push({
      title: "Document Coverage",
      description: `${usedTypes.size} of ${ENTRY_TYPES.length} entry types used.`,
      details: coverageDetails,
      severity: suggestions.length === 0 ? "green" : "amber",
    });

    return cards;
  }, [records, goals, checkins, plan]);

  /* ---------------------------------------------------------------- */
  /*  Severity border color                                            */
  /* ---------------------------------------------------------------- */

  function borderColor(severity: "green" | "amber" | "red"): string {
    if (severity === "green") return "#BBF7D0";
    if (severity === "amber") return "#FDE68A";
    return "#FECACA";
  }

  /* ---------------------------------------------------------------- */
  /*  Loading                                                          */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <p style={{ fontSize: 14, color: "var(--color-stone-400)", fontFamily: "var(--font-sans)" }}>Analyzing your records...</p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Empty state                                                      */
  /* ---------------------------------------------------------------- */

  if (records.length === 0) {
    return (
      <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ textAlign: "center", maxWidth: 480, ...cardStyle, padding: "56px 40px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--color-stone-50)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-stone-300)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: "#1C1917", marginBottom: 10 }}>
            No records to analyze
          </h2>
          <p style={{ fontSize: 14, color: "var(--color-stone-500)", lineHeight: 1.6, fontFamily: "var(--font-sans)" }}>
            Start documenting in the Record tab. Once you have entries, Integrity will scan for patterns and provide a comprehensive analysis.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 700, color: "#1C1917", marginBottom: 8 }}>
          Integrity
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-stone-500)", lineHeight: 1.6, fontFamily: "var(--font-sans)", maxWidth: 600 }}>
          A comprehensive analysis of your employment records, documentation patterns, and potential red flags.
        </p>
      </div>

      {/* ============================================================ */}
      {/*  SECTION 1: EMPLOYMENT RECORD SUMMARY                         */}
      {/* ============================================================ */}
      {summary && (
        <div style={{ ...cardStyle, marginBottom: 32 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, color: "#1C1917", marginBottom: 20 }}>
            Your Employment Record
          </h2>

          {/* Stats grid */}
          <div className="da-integrity-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 24 }}>
            <div>
              <div style={statValue}>{records.length}</div>
              <div style={statLabel}>Total Records</div>
            </div>
            <div>
              <div style={statValue}>{vaultCount}</div>
              <div style={statLabel}>Vault Documents</div>
            </div>
            <div>
              <div style={statValue}>{summary.warningCount}</div>
              <div style={statLabel}>Warning Entries</div>
            </div>
            <div>
              <div style={statValue}>{summary.warningPct}%</div>
              <div style={statLabel}>Flagged Rate</div>
            </div>
          </div>

          {/* Date range */}
          <div style={{ marginBottom: 20 }}>
            <span style={labelStyle}>Date Range</span>
            <p style={{ fontSize: 14, color: "#1C1917", fontFamily: "var(--font-sans)", margin: 0 }}>
              {formatDate(summary.firstDate)} — {formatDate(summary.lastDate)}
            </p>
          </div>

          {/* Active plan */}
          {plan && (
            <div style={{ marginBottom: 20 }}>
              <span style={labelStyle}>Active Plan</span>
              <p style={{ fontSize: 14, color: "#1C1917", fontFamily: "var(--font-sans)", margin: 0 }}>
                {plan.plan_name} — <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{summary.planDaysRemaining} day{summary.planDaysRemaining !== 1 ? "s" : ""} remaining</span>
              </p>
            </div>
          )}

          {/* Entry type breakdown */}
          <div style={{ marginBottom: 20 }}>
            <span style={labelStyle}>Entry Type Breakdown</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(summary.typeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div
                    key={type}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 12px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontFamily: "var(--font-sans)",
                      fontWeight: 500,
                      color: WARNING_TYPES.has(type) ? "#991B1B" : "#44403C",
                      background: WARNING_TYPES.has(type) ? "#FEF2F2" : "#F5F5F4",
                      border: WARNING_TYPES.has(type) ? "1px solid #FECACA" : "1px solid #E7E5E4",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{count}</span>
                    {type}
                  </div>
                ))}
            </div>
          </div>

          {/* Top people */}
          {summary.topPeople.length > 0 && (
            <div>
              <span style={labelStyle}>Most Mentioned People</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {summary.topPeople.map(([name, count]) => (
                  <div
                    key={name}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 12px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontFamily: "var(--font-sans)",
                      fontWeight: 500,
                      color: "#1E40AF",
                      background: "#EFF6FF",
                      border: "1px solid #BFDBFE",
                    }}
                  >
                    {name}
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  SECTION 2: PATTERN ANALYSIS                                  */}
      {/* ============================================================ */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, color: "#1C1917", marginBottom: 6 }}>
            Pattern Analysis
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-stone-400)", fontFamily: "var(--font-sans)", fontStyle: "italic", margin: 0 }}>
            These are observations from your records, not legal conclusions.
          </p>
        </div>

        {patterns.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "40px 24px" }}>
            <p style={{ fontSize: 14, color: "var(--color-stone-400)", fontFamily: "var(--font-sans)" }}>
              No patterns detected yet. Continue adding records for more comprehensive analysis.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {patterns.map((card, idx) => (
              <div
                key={idx}
                style={{
                  ...cardStyle,
                  borderLeft: `4px solid ${borderColor(card.severity)}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1C1917", fontFamily: "var(--font-sans)", margin: 0 }}>
                    {card.title}
                  </h3>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 600,
                      fontFamily: "var(--font-mono)",
                      textTransform: "uppercase",
                      letterSpacing: "0.02em",
                      color: card.severity === "green" ? "#15803D" : card.severity === "amber" ? "#92400E" : "#991B1B",
                      background: card.severity === "green" ? "#F0FDF4" : card.severity === "amber" ? "#FFFBEB" : "#FEF2F2",
                      border: `1px solid ${borderColor(card.severity)}`,
                    }}
                  >
                    {card.severity === "green" ? "Positive" : card.severity === "amber" ? "Note" : "Flag"}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)", lineHeight: 1.6, marginBottom: card.details.length > 0 ? 12 : 0 }}>
                  {card.description}
                </p>
                {card.details.length > 0 && (
                  <div style={{ background: "var(--color-stone-50)", borderRadius: 8, padding: "10px 14px" }}>
                    {card.details.map((detail, di) => (
                      <p
                        key={di}
                        style={{
                          fontSize: 12,
                          color: "var(--color-stone-500)",
                          fontFamily: "var(--font-sans)",
                          lineHeight: 1.6,
                          margin: 0,
                          paddingBottom: di < card.details.length - 1 ? 4 : 0,
                        }}
                      >
                        {detail}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      <div style={{ padding: "16px 20px", background: "var(--color-stone-50)", borderRadius: 10, border: "1px solid var(--color-stone-100)", marginTop: 12 }}>
        <p style={{ fontSize: 12, color: "var(--color-stone-400)", lineHeight: 1.6, fontFamily: "var(--font-sans)", fontStyle: "italic", margin: 0 }}>
          This analysis is based on keyword matching in your records. It is not a legal assessment. Consult an employment attorney for professional guidance.
        </p>
      </div>
    </div>
  );
}
