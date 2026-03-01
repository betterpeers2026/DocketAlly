"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { renderMarkdown } from "@/lib/renderMarkdown";
import { useSubscription } from "@/components/SubscriptionProvider";
import { hasActiveAccess } from "@/lib/subscription";
import ProGate from "@/components/ProGate";
import CaseFileDocument from "@/components/CaseFileDocument";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CaseData {
  id: string;
  user_id: string;
  name: string;
  case_type: string;
  case_types: string[];
  status: string;
  description: string | null;
  start_date: string | null;
  employment_end_date: string | null;
  employer: string | null;
  role: string | null;
  department: string | null;
  location: string | null;
  key_people: string | null;
  protected_classes: string[];
  impact_statement: string | null;
  case_theory_protected_activity: string | null;
  case_theory_employer_response: string | null;
  case_theory_connection: string | null;
  case_theory_outcome: string | null;
  case_status: string | null;
  open_questions: string | null;
  created_at: string;
  updated_at: string;
}

interface DocketRecord {
  id: string;
  user_id: string;
  title: string;
  entry_type: string;
  event_type: string | null;
  date: string;
  time: string | null;
  narrative: string;
  people: string | null;
  facts: string | null;
  follow_up: string | null;
  employer_stated_reason: string | null;
  my_response: string | null;
  created_at: string;
  updated_at: string;
}

interface VaultDocument {
  id: string;
  file_name: string;
  file_url: string;
  category: string;
  linked_record_id: string | null;
  created_at: string;
}

interface DetectedPattern {
  type: "frequency" | "warning" | "people" | "gap" | "plan";
  label: string;
  detail: string;
}

interface Contradiction {
  type: "performance" | "shifting" | "exclusion" | "plan";
  detail: string;
}

interface Plan {
  id: string;
  user_id: string;
  name: string;
  plan_type?: string;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PlanGoal {
  id: string;
  plan_id: string;
  description: string;
  status: string;
  deadline: string | null;
  original_description: string | null;
  revised_date: string | null;
  revision_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PlanCheckin {
  id: string;
  plan_id: string;
  checkin_date: string;
  summary: string;
  manager_feedback: string | null;
  private_notes: string | null;
  linked_record_id: string | null;
  created_at: string;
}

type TimelineItem =
  | { kind: "record"; date: string; record: DocketRecord }
  | { kind: "plan-start"; date: string; plan: Plan; goals: PlanGoal[] }
  | { kind: "plan-end"; date: string; plan: Plan }
  | { kind: "checkin"; date: string; checkin: PlanCheckin; planName: string; planType?: string }
  | { kind: "goal-revised"; date: string; goal: PlanGoal; planName: string; planType?: string };

type DateRangeOption = "all" | "7" | "30" | "90" | "custom";

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

const POSITIVE_KEYWORDS = [
  "meets expectations", "exceeds", "good performance", "positive review",
  "strong work", "on track", "excellent", "great job", "well done",
  "above average", "commended", "praised", "successful",
];

const PIP_KEYWORDS = [
  "performance improvement plan", "pip", "underperforming",
  "below expectations", "not meeting", "failing to meet",
];

const SHIFTING_KEYWORDS = [
  "goals changed", "new expectations", "moved the target",
  "different criteria", "revised objectives", "unclear expectations",
  "changed requirements", "new goals", "revised goals",
];

const COMPLAINT_KEYWORDS = [
  "complaint", "reported", "escalated", "filed", "grievance", "raised concerns",
];

const EXCLUSION_KEYWORDS = [
  "excluded", "removed from", "not invited", "reassigned",
  "schedule changed", "left out", "sidelined", "demoted",
  "taken off", "stripped of",
];

const POSITIVE_FEEDBACK_KEYWORDS = [
  "good progress", "on track", "well done", "excellent",
  "meets expectations", "strong", "great", "positive",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getBadgeStyle(entryType: string): React.CSSProperties {
  const isEscalation = WARNING_TYPES.has(entryType);
  return {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    color: isEscalation ? "#DC2626" : "#15803D",
    background: isEscalation ? "#FEF2F2" : "#F0FDF4",
    border: isEscalation ? "1px solid #FECACA" : "1px solid #BBF7D0",
  };
}

function getTypeBadgeStyle(): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    color: "#57534E",
    background: "#FAFAF9",
    border: "1px solid #D6D3D1",
  };
}

function getStatusBadgeStyle(status: string): React.CSSProperties {
  const isActive = status.toLowerCase() === "active";
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    color: isActive ? "#15803D" : "#57534E",
    background: isActive ? "#F0FDF4" : "#F5F5F4",
    border: isActive ? "1px solid #BBF7D0" : "1px solid #D6D3D1",
  };
}

const CASE_TYPES = [
  "General",
  "Discrimination",
  "Harassment",
  "Retaliation",
  "Wrongful Termination",
  "Hostile Work Environment",
  "Wage & Hour",
  "PIP Dispute",
  "ADA / Accommodation",
  "FMLA Violation",
  "Whistleblower",
];

const PROTECTED_CLASSES = [
  "Race",
  "Color",
  "Sex / Gender",
  "Sexual Orientation",
  "Gender Identity",
  "Age (40+)",
  "Religion",
  "National Origin",
  "Disability",
  "Pregnancy",
  "Veteran Status",
  "Genetic Information",
];

const DISCRIMINATION_TYPES = [
  "Discrimination",
  "Harassment",
  "Hostile Work Environment",
  "Retaliation",
];

function resolveTypes(c: { case_types?: string[]; case_type?: string } | null): string[] {
  if (!c) return ["General"];
  if (c.case_types && c.case_types.length > 0) return c.case_types;
  if (c.case_type) return [c.case_type];
  return ["General"];
}

function parsePeople(peopleStr: string | null): string[] {
  if (!peopleStr) return [];
  return peopleStr.split(",").map((p) => p.trim()).filter(Boolean);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

const AVATAR_COLOR = "#1c1917";

function getPlanBadgeStyle(): React.CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    color: "#16A34A",
  };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function formatDatetime(record: { date: string; time: string | null }): string {
  const date = formatDate(record.date);
  if (record.time) return `${date} \u00b7 ${formatTime(record.time)}`;
  return date;
}

function textContainsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

/* ------------------------------------------------------------------ */
/*  Shared Styles                                                      */
/* ------------------------------------------------------------------ */

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  color: "#292524",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #D6D3D1",
  fontSize: 15,
  fontFamily: "var(--font-sans)",
  color: "#292524",
  outline: "none",
  background: "#fff",
};

const filterInputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #D6D3D1",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
  color: "#292524",
  outline: "none",
  background: "#fff",
};

/* ------------------------------------------------------------------ */
/*  Pattern Detection                                                  */
/* ------------------------------------------------------------------ */

function detectPatterns(records: DocketRecord[]): DetectedPattern[] {
  if (records.length === 0) return [];
  const patterns: DetectedPattern[] = [];
  const now = new Date();

  const last7 = records.filter((r) => (now.getTime() - new Date(r.date + "T00:00:00").getTime()) / 86400000 <= 7).length;
  const last14 = records.filter((r) => (now.getTime() - new Date(r.date + "T00:00:00").getTime()) / 86400000 <= 14).length;
  const last30 = records.filter((r) => (now.getTime() - new Date(r.date + "T00:00:00").getTime()) / 86400000 <= 30).length;

  if (last30 > 0) {
    let detail = `${last30} record${last30 !== 1 ? "s" : ""} in the last 30 days`;
    if (last7 > 0) detail += `, ${last7} in the last 7 days`;
    if (last7 > 0 && last14 > 0 && last7 > last14 / 2) detail += ". Frequency is increasing";
    patterns.push({ type: "frequency", label: "Recording Frequency", detail });
  }

  const warningCount = records.filter((r) => WARNING_TYPES.has(r.entry_type)).length;
  if (warningCount > 0) {
    patterns.push({ type: "warning", label: "Flagged Entries", detail: `${warningCount} of ${records.length} records are flagged entries (PIP, HR, Incident)` });
  }

  const peopleCounts: Record<string, number> = {};
  records.forEach((r) => {
    if (r.people) {
      r.people.split(/[,;]/).map((p) => p.trim()).filter(Boolean).forEach((name) => { peopleCounts[name] = (peopleCounts[name] || 0) + 1; });
    }
  });
  const topPeople = Object.entries(peopleCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topPeople.length > 0) {
    const detail = topPeople.map(([name, count]) => `${name} (${count} record${count !== 1 ? "s" : ""})`).join(", ");
    patterns.push({ type: "people", label: "Key People", detail });
  }

  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date + "T00:00:00");
    const curr = new Date(sorted[i].date + "T00:00:00");
    const gap = (curr.getTime() - prev.getTime()) / 86400000;
    if (gap > 14) {
      patterns.push({ type: "gap", label: "Recording Gap", detail: `No records between ${formatDate(sorted[i - 1].date)} and ${formatDate(sorted[i].date)} (${Math.round(gap)} days)` });
    }
  }

  return patterns;
}

function detectContradictions(records: DocketRecord[]): Contradiction[] {
  if (records.length < 2) return [];
  const contradictions: Contradiction[] = [];
  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const positiveRecords = sorted.filter((r) => textContainsAny(r.narrative + " " + (r.title || "") + " " + (r.facts || ""), POSITIVE_KEYWORDS));
  const pipRecords = sorted.filter((r) => r.entry_type === "PIP Conversation" || textContainsAny(r.narrative + " " + (r.title || "") + " " + (r.facts || ""), PIP_KEYWORDS));

  for (const pos of positiveRecords) {
    for (const pip of pipRecords) {
      const posDate = new Date(pos.date + "T00:00:00");
      const pipDate = new Date(pip.date + "T00:00:00");
      const daysDiff = Math.abs(pipDate.getTime() - posDate.getTime()) / 86400000;
      if (daysDiff <= 90 && daysDiff > 0) {
        const earlier = posDate < pipDate ? pos : pip;
        const later = posDate < pipDate ? pip : pos;
        const isPositiveFirst = posDate < pipDate;
        contradictions.push({
          type: "performance",
          detail: isPositiveFirst
            ? `Positive performance noted on ${formatDate(earlier.date)} followed by PIP on ${formatDate(later.date)} (${Math.round(daysDiff)} days apart)`
            : `PIP on ${formatDate(earlier.date)} followed by positive performance noted on ${formatDate(later.date)} (${Math.round(daysDiff)} days apart)`,
        });
      }
    }
  }

  const shiftingRecords = sorted.filter((r) => textContainsAny(r.narrative + " " + (r.title || "") + " " + (r.facts || ""), SHIFTING_KEYWORDS));
  if (shiftingRecords.length >= 2) {
    contradictions.push({ type: "shifting", detail: `Goals or criteria appear to have changed across ${shiftingRecords.length} records` });
  }

  const complaintRecords = sorted.filter((r) => r.entry_type === "HR Interaction" || textContainsAny(r.narrative + " " + (r.title || "") + " " + (r.facts || ""), COMPLAINT_KEYWORDS));
  const exclusionRecords = sorted.filter((r) => textContainsAny(r.narrative + " " + (r.title || "") + " " + (r.facts || ""), EXCLUSION_KEYWORDS));

  for (const complaint of complaintRecords) {
    const complaintDate = new Date(complaint.date + "T00:00:00");
    for (const exclusion of exclusionRecords) {
      const exclusionDate = new Date(exclusion.date + "T00:00:00");
      const daysDiff = (exclusionDate.getTime() - complaintDate.getTime()) / 86400000;
      if (daysDiff > 0 && daysDiff <= 30) {
        contradictions.push({ type: "exclusion", detail: `Treatment appears to have changed within ${Math.round(daysDiff)} days of HR interaction on ${formatDate(complaint.date)}` });
      }
    }
  }

  const seen = new Set<string>();
  return contradictions.filter((c) => { if (seen.has(c.detail)) return false; seen.add(c.detail); return true; });
}

function detectPlanPatterns(plans: Plan[], goals: PlanGoal[], checkins: PlanCheckin[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const now = new Date();

  for (const plan of plans) {
    const pGoals = goals.filter((g) => g.plan_id === plan.id);
    const pCheckins = checkins.filter((c) => c.plan_id === plan.id);
    const revisions = pGoals.filter((g) => g.revised_date);
    const startDate = new Date(plan.start_date + "T00:00:00");
    const endDate = plan.end_date ? new Date(plan.end_date + "T00:00:00") : null;
    const totalDays = endDate ? Math.round((endDate.getTime() - startDate.getTime()) / 86400000) : null;
    const daysIn = Math.max(0, Math.round((now.getTime() - startDate.getTime()) / 86400000));

    let detail: string;
    if (plan.status === "active" && totalDays) {
      detail = `Active PIP: ${Math.min(daysIn, totalDays)} of ${totalDays} days completed, ${pGoals.length} goal${pGoals.length !== 1 ? "s" : ""} tracked, ${revisions.length} revision${revisions.length !== 1 ? "s" : ""} flagged`;
    } else if (plan.status === "active") {
      detail = `Active PIP: ${daysIn} days in, ${pGoals.length} goal${pGoals.length !== 1 ? "s" : ""} tracked, ${revisions.length} revision${revisions.length !== 1 ? "s" : ""} flagged`;
    } else {
      detail = `PIP (${plan.status}): ${pGoals.length} goal${pGoals.length !== 1 ? "s" : ""}, ${pCheckins.length} check-in${pCheckins.length !== 1 ? "s" : ""}, ${revisions.length} revision${revisions.length !== 1 ? "s" : ""} flagged`;
    }
    patterns.push({ type: "plan", label: plan.name, detail });
  }
  return patterns;
}

function detectPlanContradictions(plans: Plan[], goals: PlanGoal[], checkins: PlanCheckin[]): Contradiction[] {
  const contradictions: Contradiction[] = [];

  for (const goal of goals) {
    if (goal.revised_date && goal.deadline) {
      const revisedDate = new Date(goal.revised_date + "T00:00:00");
      const deadlineDate = new Date(goal.deadline + "T00:00:00");
      if (revisedDate < deadlineDate) {
        const plan = plans.find((p) => p.id === goal.plan_id);
        contradictions.push({ type: "plan", detail: `Goal revised on ${formatDate(goal.revised_date)} before its deadline of ${formatDate(goal.deadline)}${plan ? ` (${plan.name})` : ""}. Goalposts may have shifted` });
      }
    }
  }

  for (const checkin of checkins) {
    if (checkin.manager_feedback) {
      const plan = plans.find((p) => p.id === checkin.plan_id);
      if (plan && (plan.status === "expired" || plan.status === "failed")) {
        const hasPositive = POSITIVE_FEEDBACK_KEYWORDS.some((kw) => checkin.manager_feedback!.toLowerCase().includes(kw));
        if (hasPositive) {
          contradictions.push({ type: "plan", detail: `Positive feedback in check-in on ${formatDate(checkin.checkin_date)} contradicts plan outcome (${plan.status}) (${plan.name})` });
        }
      }
    }
  }

  return contradictions;
}

/* ------------------------------------------------------------------ */
/*  Document Preview Sub-Component                                     */
/* ------------------------------------------------------------------ */

function CaseFileDocPreview({ records, vaultDocs, patterns, contradictions, linkedDocsMap, caseData, starredIds, keyDates }: {
  records: DocketRecord[];
  vaultDocs: VaultDocument[];
  patterns: DetectedPattern[];
  contradictions: Contradiction[];
  linkedDocsMap: Record<string, VaultDocument[]>;
  caseData: CaseData | null;
  starredIds: Set<string>;
  keyDates: DocketRecord[];
}) {
  const today = new Date();
  const genDate = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const genTime = today.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const sortedDates = records.map((r) => r.date).sort();
  const firstDate = sortedDates.length > 0 ? sortedDates[0] : null;
  const lastDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
  const daySpan = firstDate && lastDate ? Math.round((new Date(lastDate + "T00:00:00").getTime() - new Date(firstDate + "T00:00:00").getTime()) / 86400000) : 0;
  const linkedDocs = vaultDocs.filter((d) => d.linked_record_id);

  const dLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#292524", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 };

  const runningHeader = (
    <div style={{ marginBottom: 28 }}>
      <div style={{ height: 4, background: "#22C55E", marginBottom: 12 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid #D6D3D1" }}>
        <div>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 800, color: "#292524" }}>Docket</span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 800, color: "#22C55E" }}>Ally</span>
        </div>
        <span style={{ fontSize: 13, color: "#44403C" }}>Confidential Case File</span>
      </div>
    </div>
  );

  const sectionHeading = (num: number, title: string) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#22C55E" }}>{num}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#292524", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</span>
      </div>
      <div style={{ width: 32, height: 3, background: "#22C55E", borderRadius: 2 }} />
    </div>
  );

  const pageFooter = (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#78716C", paddingTop: 20, borderTop: "1px solid #D6D3D1", marginTop: 40 }}>
      <span>Generated {genDate} at {genTime}</span>
      <span>DocketAlly Confidential</span>
    </div>
  );

  const caseName = caseData?.name || "Case File";
  const caseTypes = resolveTypes(caseData);
  const nonGeneralTypes = caseTypes.filter((t) => t.toLowerCase() !== "general");
  const pdfSubtitle = nonGeneralTypes.length > 0 ? `${nonGeneralTypes.join(" \u00b7 ")} Case File` : "Case File";
  const pdfProtectedClasses = (caseData?.protected_classes ?? []).length > 0 ? (caseData?.protected_classes ?? []).join(", ") : null;

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: "#292524", lineHeight: 1.6 }}>
      {/* Cover Page */}
      <div style={{ padding: 56, minHeight: 700 }}>
        <div style={{ height: 4, background: "#22C55E", marginBottom: 40 }} />
        <div style={{ marginBottom: 80 }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 800, color: "#292524" }}>Docket</span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 800, color: "#22C55E" }}>Ally</span>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <div style={{ width: 24, height: 3, background: "#22C55E", borderRadius: 2 }} />
            <div style={{ width: 24, height: 3, background: "#22C55E", borderRadius: 2 }} />
          </div>
        </div>
        <h1 style={{ fontFamily: "var(--font-sans)", fontSize: 48, fontWeight: 900, color: "#292524", lineHeight: 1.1, marginBottom: 12 }}>{caseName}</h1>
        <div style={{ width: 40, height: 3, background: "#22C55E", borderRadius: 2, marginBottom: 16 }} />
        <p style={{ fontSize: 18, color: "#292524", marginBottom: pdfProtectedClasses ? 8 : 60 }}>{pdfSubtitle}</p>
        {pdfProtectedClasses && (
          <p style={{ fontSize: 14, color: "#57534E", marginBottom: 60 }}>Protected Classes: {pdfProtectedClasses}</p>
        )}
        <div style={{ maxWidth: 500 }}>
          {[
            { l: "Employer", v: caseData?.employer || "-" },
            { l: "Role", v: caseData?.role || "-" },
            { l: "Documentation period", v: firstDate && lastDate ? `${formatDate(firstDate)} to ${formatDate(lastDate)}` : "-" },
            { l: "Records", v: records.length > 0 ? `${records.length} entr${records.length !== 1 ? "ies" : "y"} over ${daySpan} days` : "-" },
            { l: "Patterns identified", v: String(patterns.length + contradictions.length) },
            { l: "Attachments", v: `${linkedDocs.length} file${linkedDocs.length !== 1 ? "s" : ""} referenced` },
          ].map((row) => (
            <div key={row.l} style={{ display: "flex", padding: "14px 0", borderBottom: "1px solid #F5F5F4" }}>
              <div style={{ width: 180, fontSize: 13, color: "#292524", flexShrink: 0 }}>{row.l}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{row.v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 80 }}>
          <div style={{ height: 1, background: "#FECACA", opacity: 0.5, marginBottom: 16 }} />
          <p style={{ fontSize: 11, color: "#292524", lineHeight: 1.6 }}>
            This document was generated by DocketAlly. It contains user-created records and is not legal advice.<br />
            DocketAlly provides documentation and risk awareness tools. Consult an employment attorney for legal guidance.
          </p>
        </div>
      </div>

      {/* Table of Contents */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 28, fontWeight: 800, marginBottom: 32 }}>Contents</h2>
        {[
          { n: 1, t: "Case Summary" },
          { n: 2, t: "Key Dates" },
          { n: 3, t: `Complete Timeline (${records.length} records)` },
          { n: 4, t: `Pattern Analysis (${patterns.length + contradictions.length} patterns)` },
          { n: 5, t: "Attachments Index" },
        ].map((item) => (
          <div key={item.n} style={{ display: "flex", alignItems: "center", padding: "16px 0", borderBottom: "1px solid #F5F5F4" }}>
            <span style={{ width: 48, fontSize: 16, fontWeight: 700, color: "#22C55E" }}>{item.n}</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{item.t}</span>
          </div>
        ))}
        {pageFooter}
      </div>

      {/* 1. Case Summary */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        {sectionHeading(1, "CASE SUMMARY")}
        <div className="da-doc-summary-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          {[
            { l: "Employer", v: caseData?.employer || "-" },
            { l: "Role", v: caseData?.role || "-" },
            { l: "Start Date", v: caseData?.start_date ? formatDate(caseData.start_date) : "-" },
            { l: "Department", v: caseData?.department || "-" },
            { l: "Location", v: caseData?.location || "-" },
            { l: "Key People", v: caseData?.key_people || "-" },
          ].map((item, i) => (
            <div key={item.l} style={{ padding: "16px 0", borderBottom: "1px solid #F5F5F4", paddingRight: i % 2 === 0 ? 24 : 0 }}>
              <div style={dLabel}>{item.l}</div>
              <div style={{ fontSize: 15 }}>{item.v}</div>
            </div>
          ))}
        </div>
        {caseData?.description && (
          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Situation</h3>
            <p style={{ fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{caseData.description}</p>
          </div>
        )}
        {pageFooter}
      </div>

      {/* 2. Key Dates */}
      {keyDates.length > 0 && (
        <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
          {runningHeader}
          {sectionHeading(2, "KEY DATES")}
          {keyDates.map((record) => (
            <div key={record.id} style={{ display: "flex", padding: "14px 0", borderBottom: "1px solid #F5F5F4", gap: 32 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#22C55E", whiteSpace: "nowrap", minWidth: 200 }}>
                {new Date(record.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                {record.time && ` \u00b7 ${formatTime(record.time)}`}
              </span>
              <span style={{ fontSize: 14 }}>{record.title}</span>
            </div>
          ))}
          {pageFooter}
        </div>
      )}

      {/* 3. Complete Timeline */}
      <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
        {runningHeader}
        {sectionHeading(3, "COMPLETE TIMELINE")}
        <p style={{ fontSize: 13, color: "#292524", lineHeight: 1.6, marginBottom: 24 }}>All records in chronological order.</p>
        {records.map((record) => {
          const docsForRecord = linkedDocsMap[record.id] || [];
          return (
            <div key={record.id} style={{ borderLeft: "3px solid #22C55E", paddingLeft: 24, marginBottom: 28, pageBreakInside: "avoid" }}>
              <div style={{ fontSize: 14, fontFamily: "var(--font-mono)", fontWeight: 700, color: "#22C55E", marginBottom: 4 }}>
                {new Date(record.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                {record.time && ` \u00b7 ${formatTime(record.time)}`}
              </div>
              <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase" }}>{record.entry_type}</span>
                {record.people && <span style={{ fontSize: 13, color: "#292524" }}>{record.people}</span>}
                {WARNING_TYPES.has(record.entry_type) && <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 600 }}>[Escalation]</span>}
              </div>
              <div style={dLabel}>WHAT HAPPENED</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{renderMarkdown(record.narrative)}</div>
              {record.facts && (<><div style={dLabel}>ADDITIONAL CONTEXT</div><div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{renderMarkdown(record.facts)}</div></>)}
              {record.follow_up && (<><div style={{ ...dLabel, color: "#22C55E" }}>NEXT STEPS</div><div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{renderMarkdown(record.follow_up)}</div></>)}
              {docsForRecord.length > 0 && (<><div style={dLabel}>ATTACHMENTS</div><p style={{ fontSize: 14 }}>{docsForRecord.map((d) => d.file_name).join(", ")}</p></>)}
            </div>
          );
        })}
        {pageFooter}
      </div>

      {/* 4. Pattern Analysis */}
      {(patterns.length > 0 || contradictions.length > 0) && (
        <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
          {runningHeader}
          {sectionHeading(4, "PATTERN ANALYSIS")}
          <p style={{ fontSize: 13, color: "#292524", lineHeight: 1.6, marginBottom: 24 }}>Patterns are recurring themes identified across multiple records.</p>
          {patterns.map((pattern, idx) => (
            <div key={`p-${idx}`} style={{ borderLeft: "3px solid #22C55E", paddingLeft: 24, marginBottom: 24, pageBreakInside: "avoid" }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 700 }}>{pattern.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#22C55E", marginLeft: 12 }}>[{pattern.type === "plan" ? "Plan Pattern" : "Notable Pattern"}]</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7 }}>{pattern.detail}</p>
            </div>
          ))}
          {contradictions.map((c, idx) => (
            <div key={`c-${idx}`} style={{ borderLeft: "3px solid #F59E0B", paddingLeft: 24, marginBottom: 24, pageBreakInside: "avoid" }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 700 }}>
                  {c.type === "performance" ? "Contradictory Performance Signals" : c.type === "shifting" ? "Shifting Expectations" : c.type === "exclusion" ? "Post-Complaint Changes" : "Plan Contradiction"}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#F59E0B", marginLeft: 12 }}>[Potential Contradiction]</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7 }}>{c.detail}</p>
            </div>
          ))}
          {pageFooter}
        </div>
      )}

      {/* 5. Attachments Index */}
      {linkedDocs.length > 0 && (
        <div style={{ padding: "0 56px 56px", pageBreakBefore: "always" }}>
          {runningHeader}
          {sectionHeading(5, "ATTACHMENTS INDEX")}
          <div className="da-doc-attach-row" style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px", borderBottom: "2px solid #292524", padding: "10px 0" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>File</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Record Date</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Record Type</span>
          </div>
          {linkedDocs.map((doc) => {
            const record = records.find((r) => r.id === doc.linked_record_id);
            return (
              <div key={doc.id} className="da-doc-attach-row" style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px", borderBottom: "1px solid #F5F5F4", padding: "10px 0" }}>
                <span style={{ fontSize: 13, color: "#22C55E", fontWeight: 600 }}>{doc.file_name}</span>
                <span style={{ fontSize: 13 }}>{record ? formatDatetime(record) : "-"}</span>
                <span style={{ fontSize: 13 }}>{record ? record.entry_type : "-"}</span>
              </div>
            );
          })}
          {pageFooter}
        </div>
      )}

      {/* End Disclaimer */}
      <div style={{ padding: "24px 56px 40px", borderTop: "1px solid #D6D3D1" }}>
        <p style={{ fontSize: 11, color: "#292524", lineHeight: 1.6 }}>
          End of case file. This document was generated by DocketAlly from user-created records. It is not legal advice.
          DocketAlly provides documentation and risk awareness tools. Consult a qualified employment attorney for legal guidance specific to your situation.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CaseDetailPage() {
  const subscription = useSubscription();
  if (!hasActiveAccess(subscription)) return <ProGate feature="Cases" />;

  const params = useParams();
  const router = useRouter();
  const caseId = params.caseId as string;
  const supabase = createClient();
  const caseFileRef = useRef<HTMLDivElement>(null);

  // Auth
  const [userId, setUserId] = useState<string | null>(null);

  // Case
  const [caseData, setCaseData] = useState<CaseData | null>(null);

  // Data
  const [records, setRecords] = useState<DocketRecord[]>([]);
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planGoals, setPlanGoals] = useState<PlanGoal[]>([]);
  const [planCheckins, setPlanCheckins] = useState<PlanCheckin[]>([]);

  // All user records (for Add Records modal)
  const [allRecords, setAllRecords] = useState<DocketRecord[]>([]);
  const [caseRecordIds, setCaseRecordIds] = useState<Set<string>>(new Set());

  // UI
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "caseinfo" | "casefile" | "patterns" | "strength">("timeline");
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingPacket, setGeneratingPacket] = useState(false);
  const [expandedCFRecord, setExpandedCFRecord] = useState<string | null>(null);
  const [caseFileView, setCaseFileView] = useState<"interactive" | "document">("document");

  // Case info edit
  const [editingCaseInfo, setEditingCaseInfo] = useState(false);
  const [editForm, setEditForm] = useState({ employer: "", role: "", department: "", location: "", key_people: "", description: "", start_date: "", employment_end_date: "", case_types: [] as string[], protected_classes: [] as string[], impact_statement: "", case_theory_protected_activity: "", case_theory_employer_response: "", case_theory_connection: "", case_theory_outcome: "", case_status: "", open_questions: "" });
  const [savingCaseInfo, setSavingCaseInfo] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Inline name edit
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Status dropdown
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  // Case type dropdown
  const [caseTypeOpen, setCaseTypeOpen] = useState(false);
  const caseTypeRef = useRef<HTMLDivElement>(null);

  // Add Records modal
  const [showAddRecords, setShowAddRecords] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalTypeFilter, setModalTypeFilter] = useState("All");

  // Filters
  const [filterType, setFilterType] = useState("All");
  const [filterPeople, setFilterPeople] = useState("");
  const [filterDateRange, setFilterDateRange] = useState<DateRangeOption>("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  // Starred records (per case)
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  // Density tooltip
  const [densityTooltip, setDensityTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchCase = useCallback(async () => {
    if (!caseId) return;
    const { data, error } = await supabase.from("cases").select("*").eq("id", caseId).single();
    if (error) console.error("fetchCase error:", error);
    if (!error && data) setCaseData(data);
  }, [caseId, supabase]);

  const fetchCaseRecords = useCallback(async () => {
    if (!userId || !caseId) return;
    setLoading(true);

    // Step 1: Get record IDs linked to this case
    const { data: links, error: linksErr } = await supabase
      .from("case_records")
      .select("record_id")
      .eq("case_id", caseId);

    if (linksErr) { console.error("fetchCaseRecords links error:", linksErr); setLoading(false); return; }

    const recordIds = (links || []).map((l: { record_id: string }) => l.record_id);
    setCaseRecordIds(new Set(recordIds));

    if (recordIds.length === 0) { setRecords([]); setLoading(false); return; }

    // Step 2: Fetch only linked records
    const { data, error } = await supabase
      .from("records")
      .select("*")
      .in("id", recordIds)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) console.error("fetchCaseRecords error:", error);
    if (!error && data) setRecords(data);
    setLoading(false);
  }, [userId, caseId, supabase]);

  const fetchVaultDocs = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("vault_documents")
      .select("id, file_name, file_url, category, linked_record_id, created_at")
      .eq("user_id", userId);
    if (error) console.error("fetchVaultDocs error:", error);
    if (!error && data) setVaultDocs(data);
  }, [userId, supabase]);

  const fetchPlans = useCallback(async () => {
    if (!userId) return;
    const { data: plansData, error: plansErr } = await supabase
      .from("plans").select("*").eq("user_id", userId).order("start_date", { ascending: true });
    if (plansErr) { console.error("fetchPlans error:", plansErr); return; }
    if (plansData) {
      setPlans(plansData);
      const planIds = plansData.map((p: Plan) => p.id);
      if (planIds.length > 0) {
        const [goalsRes, checkinsRes] = await Promise.all([
          supabase.from("plan_goals").select("*").in("plan_id", planIds).order("created_at", { ascending: true }),
          supabase.from("plan_checkins").select("*").in("plan_id", planIds).order("checkin_date", { ascending: true }),
        ]);
        if (!goalsRes.error && goalsRes.data) setPlanGoals(goalsRes.data);
        if (!checkinsRes.error && checkinsRes.data) setPlanCheckins(checkinsRes.data);
      }
    }
  }, [userId, supabase]);

  const fetchAllRecords = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("records").select("*").eq("user_id", userId).order("date", { ascending: false });
    if (!error && data) setAllRecords(data);
  }, [userId, supabase]);

  // Init auth
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    }
    init();
  }, [supabase]);

  // Fetch data when userId is ready
  useEffect(() => {
    if (userId) {
      fetchCase();
      fetchCaseRecords();
      fetchVaultDocs();
      fetchPlans();
    }
  }, [userId, fetchCase, fetchCaseRecords, fetchVaultDocs, fetchPlans]);

  // Load starred records from localStorage (per case)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`docketally_starred_${caseId}`);
      if (saved) setStarredIds(new Set(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, [caseId]);

  // Close status/case-type dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
      if (caseTypeRef.current && !caseTypeRef.current.contains(e.target as Node)) setCaseTypeOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Star handlers                                                    */
  /* ---------------------------------------------------------------- */

  function toggleStar(recordId: string) {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId); else next.add(recordId);
      localStorage.setItem(`docketally_starred_${caseId}`, JSON.stringify([...next]));
      return next;
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Add/Remove records from case                                     */
  /* ---------------------------------------------------------------- */

  async function addRecordToCase(recordId: string) {
    if (!userId) return;
    const { error } = await supabase.from("case_records").insert({ case_id: caseId, record_id: recordId, user_id: userId });
    if (!error) setCaseRecordIds((prev) => new Set([...prev, recordId]));
  }

  async function removeRecordFromCase(recordId: string) {
    const { error } = await supabase.from("case_records").delete().eq("case_id", caseId).eq("record_id", recordId);
    if (!error) setCaseRecordIds((prev) => { const next = new Set(prev); next.delete(recordId); return next; });
  }

  function closeAddRecordsModal() {
    setShowAddRecords(false);
    setModalSearch("");
    setModalTypeFilter("All");
    fetchCaseRecords();
  }

  /* ---------------------------------------------------------------- */
  /*  Status update                                                    */
  /* ---------------------------------------------------------------- */

  async function updateStatus(newStatus: string) {
    if (!caseData) return;
    const { error } = await supabase.from("cases").update({ status: newStatus }).eq("id", caseId);
    if (!error) setCaseData({ ...caseData, status: newStatus });
    setStatusOpen(false);
  }

  async function updateCaseTypes(newTypes: string[]) {
    if (!caseData || newTypes.length === 0) return;
    const { error } = await supabase.from("cases").update({ case_types: newTypes, case_type: newTypes[0] }).eq("id", caseId);
    if (!error) setCaseData({ ...caseData, case_types: newTypes, case_type: newTypes[0] });
  }

  function startEditingName() {
    if (!caseData) return;
    setNameInput(caseData.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  async function saveNameEdit() {
    const trimmed = nameInput.trim();
    if (!caseData || !trimmed || trimmed === caseData.name) { setEditingName(false); return; }
    const { error } = await supabase.from("cases").update({ name: trimmed }).eq("id", caseId);
    if (!error) setCaseData({ ...caseData, name: trimmed });
    setEditingName(false);
  }

  /* ---------------------------------------------------------------- */
  /*  Case info save                                                   */
  /* ---------------------------------------------------------------- */

  async function saveCaseInfo() {
    if (!caseData || !userId) return;
    setSavingCaseInfo(true);
    const typesToSave = editForm.case_types.length > 0 ? editForm.case_types : ["General"];
    const classesToSave = typesToSave.some((t) => DISCRIMINATION_TYPES.includes(t)) ? editForm.protected_classes : [];
    const raw: Record<string, unknown> = {
      employer: editForm.employer || null,
      role: editForm.role || null,
      department: editForm.department || null,
      location: editForm.location || null,
      key_people: editForm.key_people || null,
      description: editForm.description || null,
      impact_statement: editForm.impact_statement || null,
      start_date: editForm.start_date || null,
      employment_end_date: editForm.employment_end_date || null,
      case_types: typesToSave,
      case_type: typesToSave[0],
      protected_classes: classesToSave,
      case_theory_protected_activity: editForm.case_theory_protected_activity || null,
      case_theory_employer_response: editForm.case_theory_employer_response || null,
      case_theory_connection: editForm.case_theory_connection || null,
      case_theory_outcome: editForm.case_theory_outcome || null,
      case_status: editForm.case_status || null,
      open_questions: editForm.open_questions || null,
    };
    const updates = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
    console.log('SAVE DEBUG:', {
      caseId,
      userId,
      updates: JSON.stringify(updates, null, 2)
    });
    const { error, data, status, statusText } = await supabase.from("cases").update(updates).eq("id", caseId).select();
    console.log('SAVE RESULT:', { error, data, status, statusText });
    if (error) {
      console.error("Failed to save case info:", error);
      setSavingCaseInfo(false);
      return;
    }
    await fetchCase();
    setEditingCaseInfo(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    setSavingCaseInfo(false);
  }

  function startEditCaseInfo() {
    if (!caseData) return;
    setEditForm({
      employer: caseData.employer || "",
      role: caseData.role || "",
      department: caseData.department || "",
      location: caseData.location || "",
      key_people: caseData.key_people || "",
      description: caseData.description || "",
      start_date: caseData.start_date || "",
      employment_end_date: caseData.employment_end_date || "",
      case_types: resolveTypes(caseData),
      protected_classes: caseData.protected_classes || [],
      impact_statement: caseData.impact_statement || "",
      case_theory_protected_activity: caseData.case_theory_protected_activity || "",
      case_theory_employer_response: caseData.case_theory_employer_response || "",
      case_theory_connection: caseData.case_theory_connection || "",
      case_theory_outcome: caseData.case_theory_outcome || "",
      case_status: caseData.case_status || "",
      open_questions: caseData.open_questions || "",
    });
    setEditingCaseInfo(true);
  }

  /* ---------------------------------------------------------------- */
  /*  Computed data                                                    */
  /* ---------------------------------------------------------------- */

  const patterns = useMemo(() => {
    const base = detectPatterns(records);
    const planPats = detectPlanPatterns(plans, planGoals, planCheckins);
    return [...base, ...planPats];
  }, [records, plans, planGoals, planCheckins]);

  const contradictions = useMemo(() => {
    const base = detectContradictions(records);
    const planCons = detectPlanContradictions(plans, planGoals, planCheckins);
    return [...base, ...planCons];
  }, [records, plans, planGoals, planCheckins]);

  const linkedDocsMap = useMemo(() => {
    const map: Record<string, VaultDocument[]> = {};
    vaultDocs.forEach((doc) => { if (doc.linked_record_id) { if (!map[doc.linked_record_id]) map[doc.linked_record_id] = []; map[doc.linked_record_id].push(doc); } });
    return map;
  }, [vaultDocs]);

  const entryTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach((r) => { counts[r.entry_type] = (counts[r.entry_type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [records]);

  const allPeople = useMemo(() => {
    const people: Record<string, number> = {};
    records.forEach((r) => { if (r.people) { r.people.split(/[,;]/).map((p) => p.trim()).filter(Boolean).forEach((name) => { people[name] = (people[name] || 0) + 1; }); } });
    return Object.entries(people).sort((a, b) => b[1] - a[1]);
  }, [records]);

  const filteredRecords = useMemo(() => {
    const now = new Date();
    return records.filter((r) => {
      if (filterType !== "All" && r.entry_type !== filterType) return false;
      if (filterPeople.trim()) { const q = filterPeople.trim().toLowerCase(); if (!r.people || !r.people.toLowerCase().includes(q)) return false; }
      if (filterDateRange !== "all") {
        const recordDate = new Date(r.date + "T00:00:00");
        if (filterDateRange === "custom") {
          if (customDateFrom && recordDate < new Date(customDateFrom + "T00:00:00")) return false;
          if (customDateTo && recordDate > new Date(customDateTo + "T23:59:59")) return false;
        } else {
          const days = parseInt(filterDateRange);
          if (recordDate < new Date(now.getTime() - days * 86400000)) return false;
        }
      }
      return true;
    });
  }, [records, filterType, filterPeople, filterDateRange, customDateFrom, customDateTo]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterType !== "All") count++;
    if (filterPeople.trim()) count++;
    if (filterDateRange !== "all") count++;
    return count;
  }, [filterType, filterPeople, filterDateRange]);

  const starredCount = useMemo(() => records.filter((r) => starredIds.has(r.id)).length, [records, starredIds]);

  const densityWeeks = useMemo(() => {
    if (records.length === 0) return [];
    const firstDate = new Date(records[0].date + "T00:00:00");
    const lastDate = new Date(records[records.length - 1].date + "T00:00:00");
    const weekCounts: Record<string, number> = {};
    records.forEach((r) => { const ws = getWeekStart(new Date(r.date + "T00:00:00")); weekCounts[ws] = (weekCounts[ws] || 0) + 1; });
    const weeks: { weekStart: string; count: number }[] = [];
    const current = new Date(getWeekStart(firstDate) + "T00:00:00");
    const end = new Date(getWeekStart(lastDate) + "T00:00:00");
    while (current <= end) {
      const ws = current.toISOString().split("T")[0];
      weeks.push({ weekStart: ws, count: weekCounts[ws] || 0 });
      current.setDate(current.getDate() + 7);
    }
    return weeks;
  }, [records]);

  const keyDates = useMemo(() => {
    const starred = records.filter((r) => starredIds.has(r.id));
    const pool = starred.length > 0 ? starred : records.filter((r) => WARNING_TYPES.has(r.entry_type) || r.entry_type === "Performance Review" || r.entry_type === "Role/Responsibility Change");
    return [...pool].sort((a, b) => new Date(a.date + "T00:00:00").getTime() - new Date(b.date + "T00:00:00").getTime());
  }, [records, starredIds]);

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    filteredRecords.forEach((record) => { items.push({ kind: "record", date: record.date, record }); });
    const dateInRange = (d: string) => {
      if (filterDateRange === "all") return true;
      const dt = new Date(d + "T00:00:00");
      if (filterDateRange === "custom") {
        if (customDateFrom && dt < new Date(customDateFrom + "T00:00:00")) return false;
        if (customDateTo && dt > new Date(customDateTo + "T23:59:59")) return false;
        return true;
      }
      return dt >= new Date(Date.now() - parseInt(filterDateRange) * 86400000);
    };
    plans.forEach((plan) => {
      const pGoals = planGoals.filter((g) => g.plan_id === plan.id);
      if (dateInRange(plan.start_date)) items.push({ kind: "plan-start", date: plan.start_date, plan, goals: pGoals });
      if (plan.end_date && plan.status !== "active" && dateInRange(plan.end_date)) items.push({ kind: "plan-end", date: plan.end_date, plan });
    });
    planCheckins.forEach((checkin) => {
      if (dateInRange(checkin.checkin_date)) {
        const plan = plans.find((p) => p.id === checkin.plan_id);
        items.push({ kind: "checkin", date: checkin.checkin_date, checkin, planName: plan?.name || "Plan", planType: plan?.plan_type });
      }
    });
    planGoals.forEach((goal) => {
      if (goal.revised_date && dateInRange(goal.revised_date)) {
        const plan = plans.find((p) => p.id === goal.plan_id);
        items.push({ kind: "goal-revised", date: goal.revised_date, goal, planName: plan?.name || "Plan", planType: plan?.plan_type });
      }
    });
    items.sort((a, b) => new Date(a.date + "T00:00:00").getTime() - new Date(b.date + "T00:00:00").getTime());
    return items;
  }, [filteredRecords, plans, planGoals, planCheckins, filterDateRange, customDateFrom, customDateTo]);

  /* ---------------------------------------------------------------- */
  /*  Filter handlers                                                  */
  /* ---------------------------------------------------------------- */

  function clearAllFilters() { setFilterType("All"); setFilterPeople(""); setFilterDateRange("all"); setCustomDateFrom(""); setCustomDateTo(""); }

  /* ---------------------------------------------------------------- */
  /*  PDF generation                                                   */
  /* ---------------------------------------------------------------- */

  async function generatePdf() {
    const el = caseFileRef.current;
    if (!el) return;
    setGeneratingPdf(true);
    // Temporarily remove overflow:hidden so html2canvas captures the full document
    const prevOverflow = el.style.overflow;
    const prevMaxHeight = el.style.maxHeight;
    el.style.overflow = "visible";
    el.style.maxHeight = "none";
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import("html2pdf.js");
      const html2pdf = ((mod as any).default || mod) as any;
      if (typeof html2pdf !== "function") throw new Error("html2pdf.js failed to load");
      const today = new Date().toISOString().split("T")[0];
      const safeName = (caseData?.name || "Case").replace(/[^a-zA-Z0-9]/g, "-");
      await html2pdf().set({
        margin: [15, 15, 15, 15],
        filename: `DocketAlly-${safeName}-${today}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowWidth: 720 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      }).from(el).save();
    } catch (err) {
      console.error("PDF generation error:", err);
      window.alert("PDF generation failed. Please use the Print button instead.");
    }
    // Restore original styles
    el.style.overflow = prevOverflow;
    el.style.maxHeight = prevMaxHeight;
    setGeneratingPdf(false);
  }

  /* ---------------------------------------------------------------- */
  /*  Attorney Packet (ZIP) generation                                 */
  /* ---------------------------------------------------------------- */

  async function generatePacket() {
    const el = caseFileRef.current;
    if (!el) return;
    setGeneratingPacket(true);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const today = new Date().toISOString().split("T")[0];
      const safeName = (caseData?.name || "Case").replace(/[^a-zA-Z0-9]/g, "-");
      const folderName = `DocketAlly-${safeName}-${today}`;
      const folder = zip.folder(folderName)!;
      const evidenceFolder = folder.folder("Evidence")!;

      /* --- 1. Generate PDF in memory --- */
      const prevOverflow = el.style.overflow;
      const prevMaxHeight = el.style.maxHeight;
      el.style.overflow = "visible";
      el.style.maxHeight = "none";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import("html2pdf.js");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2pdf = ((mod as any).default || mod) as any;
      if (typeof html2pdf !== "function") throw new Error("html2pdf.js failed to load");

      const pdfBlob: Blob = await html2pdf().set({
        margin: [15, 15, 15, 15],
        filename: `Case-File-${safeName}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowWidth: 720 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      }).from(el).outputPdf("blob");

      el.style.overflow = prevOverflow;
      el.style.maxHeight = prevMaxHeight;

      folder.file(`Case-File-${safeName}.pdf`, pdfBlob);

      /* --- 2. Compute exhibit letters (same logic as CaseFileDocument) --- */
      const sortedRecords = [...records].sort(
        (a, b) => new Date(a.date + "T00:00:00").getTime() - new Date(b.date + "T00:00:00").getTime()
      );
      const exhibitMap = new Map<string, string>();
      let letterIdx = 0;
      for (const record of sortedRecords) {
        const docs = linkedDocsMap[record.id] || [];
        for (const doc of docs) {
          if (!exhibitMap.has(doc.id)) {
            let label = "";
            let n = letterIdx;
            do {
              label = String.fromCharCode(65 + (n % 26)) + label;
              n = Math.floor(n / 26) - 1;
            } while (n >= 0);
            exhibitMap.set(doc.id, label);
            letterIdx++;
          }
        }
      }

      /* --- 3. Download vault files and add to Evidence folder --- */
      const linkedDocIds = new Set(exhibitMap.keys());
      for (const doc of vaultDocs) {
        if (!doc.file_url) continue;
        const letter = exhibitMap.get(doc.id);
        const ext = doc.file_name.includes(".") ? doc.file_name.substring(doc.file_name.lastIndexOf(".")) : "";
        const baseName = doc.file_name.includes(".")
          ? doc.file_name.substring(0, doc.file_name.lastIndexOf("."))
          : doc.file_name;
        const safeBase = baseName.replace(/[^a-zA-Z0-9_\-. ]/g, "_");

        let fileName: string;
        if (letter) {
          fileName = `Ex-${letter}_${safeBase}${ext}`;
        } else if (!linkedDocIds.has(doc.id)) {
          fileName = `Unlinked-${safeBase}${ext}`;
        } else {
          continue;
        }

        try {
          const { data, error } = await supabase.storage
            .from("vault-files")
            .download(doc.file_url);
          if (error || !data) {
            console.error(`Failed to download ${doc.file_name}:`, error);
            continue;
          }
          evidenceFolder.file(fileName, data);
        } catch (err) {
          console.error(`Error fetching ${doc.file_name}:`, err);
        }
      }

      /* --- 4. README.txt --- */
      const caseName = caseData?.name || "Case";
      const readmeText = `Attorney Packet -- ${caseName}
Generated by DocketAlly on ${today}.

This packet contains:
- Case File document (PDF) with full narrative, timeline, and analysis
- Evidence folder with all referenced exhibits

Exhibit letters in the Case File (Ex. A, Ex. B, etc.) correspond to file prefixes in the Evidence folder.

DocketAlly provides documentation and risk awareness tools. This is not legal advice. Consult a qualified employment attorney for guidance specific to your situation.`;

      folder.file("README.txt", readmeText);

      /* --- 5. Generate and download ZIP --- */
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Attorney packet generation error:", err);
      window.alert("Packet generation failed. Please try again or download the PDF separately.");
    }

    setGeneratingPacket(false);
  }

  /* ---------------------------------------------------------------- */
  /*  Helper renderers                                                 */
  /* ---------------------------------------------------------------- */

  function patternIcon(type: string): string {
    switch (type) {
      case "frequency": return "M23 6l-9.5 9.5-5-5L1 18";
      case "warning": return "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01";
      case "people": return "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2 M9 11a4 4 0 100-8 4 4 0 000 8 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75";
      case "gap": return "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z";
      case "plan": return "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2";
      default: return "";
    }
  }

  function densityColor(count: number): string {
    if (count === 0) return "#D6D3D1";
    if (count <= 2) return "#86EFAC";
    return "#22C55E";
  }

  /* ---------------------------------------------------------------- */
  /*  PLACEHOLDER — Render sections added next                         */
  /* ---------------------------------------------------------------- */

  if (!caseData && !loading) {
    return (
      <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto", textAlign: "center", paddingTop: 120 }}>
        <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 600, color: "#292524", marginBottom: 10 }}>Case not found</h2>
        <button onClick={() => router.push("/dashboard/case")} style={{ padding: "14px 32px", borderRadius: 10, border: "none", background: "var(--color-green)", color: "#fff", fontSize: 15, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer" }}>Back to Cases</button>
      </div>
    );
  }

  return (
    <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto", position: "relative", overflow: "hidden" }}>
      {/* TOP BAR */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={() => router.push("/dashboard/case")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-stone-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
          </button>
          <span style={{ fontSize: 13, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)", cursor: "pointer" }} onClick={() => router.push("/dashboard/case")}>Cases</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {editingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={saveNameEdit}
              onKeyDown={(e) => { if (e.key === "Enter") saveNameEdit(); if (e.key === "Escape") setEditingName(false); }}
              style={{ fontFamily: "var(--font-sans)", fontSize: 28, fontWeight: 600, color: "#292524", margin: 0, padding: "0 4px", border: "none", borderBottom: "2px solid var(--color-green)", outline: "none", background: "transparent", minWidth: 120, maxWidth: "100%" }}
            />
          ) : (
            <h1
              onClick={startEditingName}
              title="Click to rename"
              style={{ fontFamily: "var(--font-sans)", fontSize: 28, fontWeight: 600, color: "#292524", margin: 0, cursor: "pointer", borderBottom: "2px solid transparent", transition: "border-color 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-stone-300)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
            >
              {caseData?.name || "Loading..."}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-stone-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8, verticalAlign: "middle", opacity: 0.6 }}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </h1>
          )}
          {caseData && (
            <div ref={caseTypeRef} style={{ position: "relative", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {resolveTypes(caseData).slice(0, 2).map((t) => (
                <button key={t} onClick={() => setCaseTypeOpen(!caseTypeOpen)} style={{ ...getTypeBadgeStyle(), cursor: "pointer", border: "1px solid #D6D3D1" }}>
                  {t}
                </button>
              ))}
              {resolveTypes(caseData).length > 2 && (
                <button onClick={() => setCaseTypeOpen(!caseTypeOpen)} style={{ ...getTypeBadgeStyle(), cursor: "pointer", color: "#78716C" }} title={resolveTypes(caseData).slice(2).join(", ")}>
                  +{resolveTypes(caseData).length - 2}
                </button>
              )}
              <button onClick={() => setCaseTypeOpen(!caseTypeOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 8, color: "var(--color-stone-400)" }}>{caseTypeOpen ? "\u25B2" : "\u25BC"}</button>
              {caseTypeOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #D6D3D1", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 50, padding: 12, minWidth: 280 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {CASE_TYPES.map((t) => {
                      const sel = resolveTypes(caseData).includes(t);
                      return (
                        <button
                          key={t}
                          onClick={() => {
                            const current = resolveTypes(caseData);
                            let next: string[];
                            if (sel) {
                              next = current.filter((x) => x !== t);
                            } else {
                              next = t === "General" ? ["General"] : [...current.filter((x) => x !== "General"), t];
                            }
                            if (next.length === 0) next = ["General"];
                            updateCaseTypes(next);
                          }}
                          style={{
                            padding: "5px 12px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: "var(--font-sans)",
                            cursor: "pointer",
                            border: sel ? "1px solid #BBF7D0" : "1px solid #E7E5E4",
                            background: sel ? "#F0FDF4" : "#FAFAF9",
                            color: sel ? "#15803D" : "#78716C",
                          }}
                        >
                          {sel && <span style={{ marginRight: 3 }}>&#10003;</span>}{t}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={() => setCaseTypeOpen(false)} style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid #D6D3D1", background: "#fff", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-sans)", color: "#292524", cursor: "pointer" }}>Done</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {caseData && (
            <div ref={statusRef} style={{ position: "relative" }}>
              <button onClick={() => setStatusOpen(!statusOpen)} style={{ ...getStatusBadgeStyle(caseData.status), cursor: "pointer", border: "1px solid " + (caseData.status.toLowerCase() === "active" ? "#BBF7D0" : "#D6D3D1") }}>
                {caseData.status} <span style={{ marginLeft: 4, fontSize: 8 }}>{statusOpen ? "\u25B2" : "\u25BC"}</span>
              </button>
              {statusOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #D6D3D1", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 50, overflow: "hidden", minWidth: 120 }}>
                  {["Active", "Resolved", "Archived"].map((s) => (
                    <button key={s} onClick={() => updateStatus(s)} style={{ display: "block", width: "100%", padding: "8px 16px", background: caseData.status === s ? "#F0FDF4" : "#fff", border: "none", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", color: "#292524", cursor: "pointer", textAlign: "left" }}>{s}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={() => { fetchAllRecords(); setShowAddRecords(true); }} style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: 10, border: "1px solid #22C55E", background: "#fff", color: "#22C55E", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer" }}>+ Add Records</button>
        </div>
      </div>

      {/* TAB BAR */}
      <div style={{ display: "flex", gap: 0, marginBottom: 28, borderBottom: "1px solid var(--color-stone-300)" }}>
        {(["timeline", "caseinfo", "casefile", "patterns", "strength"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "12px 24px", fontSize: 14, fontWeight: activeTab === tab ? 700 : 600, fontFamily: "var(--font-sans)", color: activeTab === tab ? "#292524" : "var(--color-stone-500)", background: "none", border: "none", borderBottom: activeTab === tab ? "2px solid var(--color-green)" : "2px solid transparent", cursor: "pointer", marginBottom: -1 }}>
            {tab === "timeline" ? "Timeline" : tab === "caseinfo" ? "Case Info" : tab === "casefile" ? "Case File" : tab === "patterns" ? "Patterns" : "Strength"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "var(--color-stone-500)", fontSize: 15, fontFamily: "var(--font-sans)" }}>Loading case data...</div>
      ) : (
        <>
          {/* ============================================================ */}
          {/*  TIMELINE TAB                                                 */}
          {/* ============================================================ */}
          {activeTab === "timeline" && (
            <>
              <p style={{ fontSize: 13, color: "#57534E", fontFamily: "var(--font-sans)", lineHeight: 1.5, marginBottom: 16 }}>
                Your chronological record of events. Star key records and filter by type to surface patterns.
              </p>
              {/* Filter Bar */}
              {records.length > 0 && (
                <div className="da-case-filters" style={{ background: "#fff", borderRadius: 12, border: "1px solid var(--color-stone-300)", padding: "16px 20px", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...filterInputStyle, minWidth: 140, cursor: "pointer" }}>
                      <option value="All">All Types</option>
                      {ENTRY_TYPES.map((et) => (<option key={et} value={et}>{et}</option>))}
                    </select>
                    <input type="text" value={filterPeople} onChange={(e) => setFilterPeople(e.target.value)} placeholder="Filter by person..." style={{ ...filterInputStyle, minWidth: 150, flex: 1, maxWidth: 220 }} />
                    <select value={filterDateRange} onChange={(e) => setFilterDateRange(e.target.value as DateRangeOption)} style={{ ...filterInputStyle, minWidth: 130, cursor: "pointer" }}>
                      <option value="all">All Time</option>
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 90 days</option>
                      <option value="custom">Custom range</option>
                    </select>
                    {activeFilterCount > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#1E40AF", background: "#EFF6FF", border: "1px solid #BFDBFE" }}>{activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active</span>
                        <button onClick={clearAllFilters} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-sans)", color: "var(--color-stone-600)", textDecoration: "underline", padding: 0 }}>Clear all</button>
                      </div>
                    )}
                    {starredCount > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#166534", background: "#F0FDF4", border: "1px solid #BBF7D0", marginLeft: "auto" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#22C55E" stroke="#22C55E" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        {starredCount} key event{starredCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {filterDateRange === "custom" && (
                    <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
                      <label style={{ fontSize: 12, color: "var(--color-stone-600)", fontFamily: "var(--font-mono)" }}>From</label>
                      <input type="date" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)} style={{ ...filterInputStyle, width: 150 }} />
                      <label style={{ fontSize: 12, color: "var(--color-stone-600)", fontFamily: "var(--font-mono)" }}>To</label>
                      <input type="date" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)} style={{ ...filterInputStyle, width: 150 }} />
                    </div>
                  )}
                </div>
              )}

              {/* Density Chart */}
              {records.length >= 5 && densityWeeks.length > 0 && (
                <div style={{ marginBottom: 20, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Record Density</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                      <span style={{ fontSize: 10, color: "var(--color-stone-500)", fontFamily: "var(--font-mono)" }}>Less</span>
                      {[0, 1, 3].map((c) => (<div key={c} style={{ width: 8, height: 8, borderRadius: 2, background: densityColor(c) }} />))}
                      <span style={{ fontSize: 10, color: "var(--color-stone-500)", fontFamily: "var(--font-mono)" }}>More</span>
                    </div>
                  </div>
                  <div style={{ overflowX: "auto", paddingBottom: 4 }}>
                    <div style={{ display: "flex", gap: 2, height: 8, minWidth: "fit-content" }}>
                      {densityWeeks.map((week) => (
                        <div key={week.weekStart} style={{ width: 8, height: 8, borderRadius: 2, background: densityColor(week.count), cursor: "default", flexShrink: 0 }}
                          onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setDensityTooltip({ text: `Week of ${formatDate(week.weekStart)}: ${week.count} record${week.count !== 1 ? "s" : ""}`, x: rect.left + rect.width / 2, y: rect.top - 8 }); }}
                          onMouseLeave={() => setDensityTooltip(null)}
                        />
                      ))}
                    </div>
                  </div>
                  {densityTooltip && (
                    <div style={{ position: "fixed", left: densityTooltip.x, top: densityTooltip.y, transform: "translate(-50%, -100%)", background: "#292524", color: "#fff", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 50 }}>{densityTooltip.text}</div>
                  )}
                </div>
              )}

              {/* Empty states */}
              {records.length === 0 && plans.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
                  <div style={{ textAlign: "center", maxWidth: 420, background: "#fff", borderRadius: 16, border: "1px solid var(--color-stone-300)", padding: "56px 40px" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>
                    </div>
                    <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 600, color: "#292524", marginBottom: 10 }}>No records in this case yet</h2>
                    <p style={{ fontSize: 14, color: "var(--color-stone-600)", lineHeight: 1.6, marginBottom: 20 }}>Use the &quot;Add Records&quot; button above to link records to this case.</p>
                    <button onClick={() => { fetchAllRecords(); setShowAddRecords(true); }} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #22C55E", background: "#fff", color: "#22C55E", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer" }}>+ Add Records</button>
                  </div>
                </div>
              ) : timelineItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "56px 40px", background: "#fff", borderRadius: 16, border: "1px solid var(--color-stone-300)" }}>
                  <p style={{ fontSize: 14, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)" }}>No records match your filters.</p>
                  <button onClick={clearAllFilters} style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", color: "var(--color-green)" }}>Clear all filters</button>
                </div>
              ) : (
                /* Timeline items */
                <div className="da-case-timeline" style={{ position: "relative", paddingLeft: 44 }}>
                  <div style={{ position: "absolute", left: 20, top: 8, bottom: 8, width: 2, background: "#22C55E", borderRadius: 1 }} />
                  {timelineItems.map((item) => {
                    if (item.kind === "record") {
                      const record = item.record;
                      const isWarning = WARNING_TYPES.has(record.entry_type);
                      const isExpanded = expandedRecord === record.id;
                      const linkedDocs = linkedDocsMap[record.id] || [];
                      const isStarred = starredIds.has(record.id);
                      const people = parsePeople(record.people);
                      return (
                        <div key={record.id} style={{ position: "relative", marginBottom: 20 }}>
                          <div style={{ position: "absolute", left: -29, top: 8, width: 12, height: 12, borderRadius: "50%", background: "#22C55E", zIndex: 1 }} />
                          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--color-stone-200)", overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s, border-color 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)", display: "flex" }}
                            onClick={() => setExpandedRecord(isExpanded ? null : record.id)}
                            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "var(--color-stone-300)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--color-stone-200)"; }}
                          >
                            <div style={{ width: 4, flexShrink: 0, background: isWarning ? "#DC2626" : "#22C55E", borderRadius: "16px 0 0 16px" }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="da-case-timeline-card" style={{ padding: "18px 24px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                  <span style={getBadgeStyle(record.entry_type)}>{record.entry_type}</span>
                                  <span style={{ fontSize: 12, color: "var(--color-stone-500)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{formatDatetime(record)}</span>
                                  <button className="da-case-star" onClick={(e) => { e.stopPropagation(); toggleStar(record.id); }} title={isStarred ? "Unmark as key event" : "Mark as key event"} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", flexShrink: 0 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill={isStarred ? "#F59E0B" : "none"} stroke={isStarred ? "#F59E0B" : "#D6D3D1"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                  </button>
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: "#292524", fontFamily: "var(--font-sans)", marginBottom: 6 }}>{record.title}</div>
                                {!isExpanded && (
                                  <div style={{ fontSize: 13, color: "var(--color-stone-600)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as never, overflow: "hidden", marginBottom: 8 }}>{renderMarkdown(record.narrative)}</div>
                                )}
                                {!isExpanded && people.length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                                    {people.map((person, i) => (
                                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 14px 4px 4px", borderRadius: 100, background: "#F5F5F4", border: "1px solid #E7E5E4", fontSize: 13, color: "#44403C", fontFamily: "var(--font-sans)", fontWeight: 500 }}>
                                        <span style={{ width: 28, height: 28, borderRadius: "50%", background: AVATAR_COLOR, color: "#22C55E", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)" }}>{getInitials(person)}</span>
                                        {person}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                                  {linkedDocs.length > 0 && (
                                    <span style={{ fontSize: 11, color: "var(--color-stone-500)", display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
                                      {linkedDocs.length} document{linkedDocs.length !== 1 ? "s" : ""} linked
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isExpanded && (
                                <div style={{ padding: "0 24px 20px", borderTop: "1px solid var(--color-stone-100)" }}>
                                  <div style={{ marginTop: 16 }}>
                                    <label style={labelStyle}>What Happened</label>
                                    <div style={{ fontSize: 14, color: "var(--color-stone-800)", lineHeight: 1.7 }}>{renderMarkdown(record.narrative)}</div>
                                  </div>
                                  {people.length > 0 && (
                                    <div style={{ marginTop: 14 }}>
                                      <label style={labelStyle}>People Involved</label>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                        {people.map((person, i) => (
                                          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 14px 4px 4px", borderRadius: 100, background: "#F5F5F4", border: "1px solid #E7E5E4", fontSize: 13, color: "#44403C", fontFamily: "var(--font-sans)", fontWeight: 500 }}>
                                            <span style={{ width: 28, height: 28, borderRadius: "50%", background: AVATAR_COLOR, color: "#22C55E", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)" }}>{getInitials(person)}</span>
                                            {person}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {record.facts && (<div style={{ marginTop: 14 }}><label style={labelStyle}>Key Facts</label><div style={{ fontSize: 14, color: "var(--color-stone-800)", lineHeight: 1.7 }}>{renderMarkdown(record.facts)}</div></div>)}
                                  {record.follow_up && (<div style={{ marginTop: 14 }}><label style={labelStyle}>Follow-Up Needed</label><div style={{ fontSize: 14, color: "var(--color-stone-800)", lineHeight: 1.7 }}>{renderMarkdown(record.follow_up)}</div></div>)}
                                  {linkedDocs.length > 0 && (
                                    <div style={{ marginTop: 14 }}>
                                      <label style={labelStyle}>Linked Documents</label>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        {linkedDocs.map((doc) => (
                                          <div key={doc.id} style={{ fontSize: 13, color: "var(--color-stone-800)", display: "flex", alignItems: "center", gap: 6 }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-stone-500)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                            {doc.file_name} <span style={{ color: "var(--color-stone-500)", fontSize: 11 }}>({doc.category})</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    /* Plan event cards */
                    const planEventKey = item.kind === "plan-start" ? `plan-start-${item.plan.id}` : item.kind === "plan-end" ? `plan-end-${item.plan.id}` : item.kind === "checkin" ? `checkin-${item.checkin.id}` : `goal-revised-${item.goal.id}`;
                    const badgeLabel = item.kind === "plan-start" ? "PLAN STARTED" : item.kind === "plan-end" ? "PLAN ENDED" : item.kind === "checkin" ? "CHECK-IN" : "GOAL REVISED";
                    const title = item.kind === "plan-start" ? item.plan.name : item.kind === "plan-end" ? item.plan.name : item.kind === "checkin" ? `${item.planName}: Check-in` : `${item.planName}: Goal Updated`;
                    const subtitle = item.kind === "plan-start" ? `${item.goals.length} goal${item.goals.length !== 1 ? "s" : ""} assigned${item.plan.end_date ? ` \u00b7 Target end: ${formatDate(item.plan.end_date)}` : ""}` : item.kind === "plan-end" ? `Plan ${item.plan.status}` : item.kind === "checkin" ? item.checkin.summary : item.goal.description;
                    const planBadge = getPlanBadgeStyle();
                    const dotBg = "#F0FDF4";
                    const dotBorder = "#16A34A";
                    return (
                      <div key={planEventKey} style={{ position: "relative", marginBottom: 20 }}>
                        <div style={{ position: "absolute", left: -29, top: 8, width: 12, height: 12, borderRadius: "50%", background: dotBg, border: `2px solid ${dotBorder}`, zIndex: 1 }} />
                        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid var(--color-stone-300)", borderLeft: `3px solid ${dotBorder}`, overflow: "hidden" }}>
                          <div style={{ padding: "18px 24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                              <span style={{ fontSize: 12, color: "var(--color-stone-600)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{formatDate(item.date)}</span>
                              <span style={planBadge}>{badgeLabel}</span>
                              {item.kind === "plan-end" && (
                                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.02em", padding: "3px 10px", borderRadius: 20, color: item.plan.status === "completed" ? "#166534" : "#991B1B", background: item.plan.status === "completed" ? "#F0FDF4" : "#FEF2F2", border: item.plan.status === "completed" ? "1px solid #BBF7D0" : "1px solid #FECACA" }}>{item.plan.status}</span>
                              )}
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "#292524", fontFamily: "var(--font-sans)", marginBottom: 6 }}>{title}</div>
                            <div style={{ fontSize: 13, color: "var(--color-stone-600)", lineHeight: 1.6 }}>{subtitle}</div>
                            {item.kind === "goal-revised" && item.goal.revision_notes && (
                              <div style={{ fontSize: 12, color: "#92400E", marginTop: 8, fontStyle: "italic", fontFamily: "var(--font-sans)" }}>Revision: {item.goal.revision_notes}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* REMAINING TABS PLACEHOLDER — will be added next */}
          {/* ============================================================ */}
          {/*  CASE INFO TAB                                                  */}
          {/* ============================================================ */}
          {activeTab === "caseinfo" && (
            <div>
              {editingCaseInfo ? (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid var(--color-stone-300)", padding: "28px 28px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 700, color: "#292524" }}>Edit Case Information</h3>
                    <button onClick={() => setEditingCaseInfo(false)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #D6D3D1", background: "#fff", color: "#292524", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer" }}>Cancel</button>
                  </div>
                  <div className="da-case-info-grid da-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Employer</label>
                      <input type="text" value={editForm.employer} onChange={(e) => setEditForm((prev) => ({ ...prev, employer: e.target.value }))} placeholder="Company name" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Role / Title</label>
                      <input type="text" value={editForm.role} onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))} placeholder="Your job title" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Department</label>
                      <input type="text" value={editForm.department} onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))} placeholder="Department or team" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Location</label>
                      <input type="text" value={editForm.location} onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Office location or remote" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Start Date (at company)</label>
                      <input type="date" value={editForm.start_date} onChange={(e) => setEditForm((prev) => ({ ...prev, start_date: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Case Type (select all that apply)</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {CASE_TYPES.map((ct) => {
                        const sel = editForm.case_types.includes(ct);
                        return (
                          <button
                            key={ct}
                            type="button"
                            onClick={() => {
                              setEditForm((prev) => {
                                let next: string[];
                                if (sel) {
                                  next = prev.case_types.filter((t) => t !== ct);
                                } else {
                                  next = ct === "General" ? ["General"] : [...prev.case_types.filter((t) => t !== "General"), ct];
                                }
                                if (next.length === 0) next = ["General"];
                                return { ...prev, case_types: next };
                              });
                            }}
                            style={{
                              padding: "5px 12px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 600,
                              fontFamily: "var(--font-sans)",
                              cursor: "pointer",
                              border: sel ? "1px solid #BBF7D0" : "1px solid #E7E5E4",
                              background: sel ? "#F0FDF4" : "#FAFAF9",
                              color: sel ? "#15803D" : "#78716C",
                            }}
                          >
                            {sel && <span style={{ marginRight: 3 }}>&#10003;</span>}{ct}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {editForm.case_types.some((t) => DISCRIMINATION_TYPES.includes(t)) && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>Protected Class (if applicable)</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {PROTECTED_CLASSES.map((pc) => {
                          const sel = editForm.protected_classes.includes(pc);
                          return (
                            <button
                              key={pc}
                              type="button"
                              onClick={() => {
                                setEditForm((prev) => ({
                                  ...prev,
                                  protected_classes: sel
                                    ? prev.protected_classes.filter((c) => c !== pc)
                                    : [...prev.protected_classes, pc],
                                }));
                              }}
                              style={{
                                padding: "5px 12px",
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 600,
                                fontFamily: "var(--font-sans)",
                                cursor: "pointer",
                                border: sel ? "1px solid #BBF7D0" : "1px solid #E7E5E4",
                                background: sel ? "#F0FDF4" : "#FAFAF9",
                                color: sel ? "#15803D" : "#78716C",
                              }}
                            >
                              {sel && <span style={{ marginRight: 3 }}>&#10003;</span>}{pc}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Key People</label>
                    <textarea value={editForm.key_people} onChange={(e) => setEditForm((prev) => ({ ...prev, key_people: e.target.value }))} placeholder="Managers, HR contacts, witnesses. One per line." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Brief Summary</label>
                    <textarea value={editForm.description} onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="2-3 sentence overview of your situation" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Impact Statement</label>
                    <p style={{ fontSize: 12.5, color: "#78716C", fontFamily: "var(--font-sans)", lineHeight: 1.5, margin: "0 0 10px" }}>In your own words, describe how these events have affected your work, career, health, or wellbeing.</p>
                    <textarea value={editForm.impact_statement} onChange={(e) => setEditForm((prev) => ({ ...prev, impact_statement: e.target.value }))} placeholder="How has this affected you professionally or personally?" rows={4} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>

                  {/* Employment End Date + Case Status */}
                  <div className="da-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                    <div>
                      <label style={labelStyle}>Employment End Date</label>
                      <input type="date" value={editForm.employment_end_date} onChange={(e) => setEditForm((prev) => ({ ...prev, employment_end_date: e.target.value }))} style={inputStyle} />
                      <p style={{ fontSize: 11, color: "#A8A29E", fontFamily: "var(--font-sans)", marginTop: 4 }}>Leave blank if still employed</p>
                    </div>
                    <div>
                      <label style={labelStyle}>Case Status</label>
                      <select value={editForm.case_status} onChange={(e) => setEditForm((prev) => ({ ...prev, case_status: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                        <option value="">Select status</option>
                        <option value="Active documentation">Active documentation</option>
                        <option value="Under review">Under review</option>
                        <option value="Preparing attorney packet">Preparing attorney packet</option>
                        <option value="Referred to attorney">Referred to attorney</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                  </div>

                  {/* Case Theory Section */}
                  <div style={{ marginBottom: 24, padding: 20, borderRadius: 12, border: "1px solid #BBF7D0", background: "#F0FDF4" }}>
                    <label style={{ ...labelStyle, color: "#15803D", marginBottom: 4 }}>Case Theory</label>
                    <p style={{ fontSize: 12.5, color: "#78716C", fontFamily: "var(--font-sans)", lineHeight: 1.5, margin: "0 0 16px" }}>In your own words, describe the connection between your experience and the actions taken.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div>
                        <label style={{ ...labelStyle, fontSize: 9, color: "#44403C" }}>What I did that was protected or relevant</label>
                        <textarea value={editForm.case_theory_protected_activity} onChange={(e) => setEditForm((prev) => ({ ...prev, case_theory_protected_activity: e.target.value }))} placeholder="Describe what you did or what happened to you" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: 9, color: "#44403C" }}>What the employer did next</label>
                        <textarea value={editForm.case_theory_employer_response} onChange={(e) => setEditForm((prev) => ({ ...prev, case_theory_employer_response: e.target.value }))} placeholder="What actions did the employer take?" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: 9, color: "#44403C" }}>Why I believe it is connected</label>
                        <textarea value={editForm.case_theory_connection} onChange={(e) => setEditForm((prev) => ({ ...prev, case_theory_connection: e.target.value }))} placeholder="What makes you think these events are related?" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: 9, color: "#44403C" }}>What outcome occurred</label>
                        <textarea value={editForm.case_theory_outcome} onChange={(e) => setEditForm((prev) => ({ ...prev, case_theory_outcome: e.target.value }))} placeholder="What happened as a result?" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                      </div>
                    </div>
                  </div>

                  {/* Open Questions */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Open Questions and Next Steps</label>
                    <p style={{ fontSize: 12.5, color: "#78716C", fontFamily: "var(--font-sans)", lineHeight: 1.5, margin: "0 0 10px" }}>What documentation would strengthen your records? What conversations or decisions are coming up?</p>
                    <textarea value={editForm.open_questions} onChange={(e) => setEditForm((prev) => ({ ...prev, open_questions: e.target.value }))} placeholder="Notes on what to document next, follow-ups pending, upcoming deadlines..." rows={4} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>

                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <button onClick={() => setEditingCaseInfo(false)} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid #D6D3D1", background: "#fff", color: "#292524", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer" }}>Cancel</button>
                    <button onClick={saveCaseInfo} disabled={savingCaseInfo} style={{ padding: "12px 20px", borderRadius: 10, border: "none", background: "var(--color-green)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: savingCaseInfo ? "not-allowed" : "pointer", opacity: savingCaseInfo ? 0.6 : 1 }}>{savingCaseInfo ? "Saving..." : "Save Info"}</button>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid var(--color-stone-300)", padding: "28px 28px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 700, color: "#292524" }}>Case Information</h3>
                    <button onClick={startEditCaseInfo} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-stone-300)", background: "#fff", color: "var(--color-stone-800)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer" }}>Edit Case Info</button>
                  </div>
                  {/* Row 1: Case Name + Case Type */}
                  <div className="da-case-info-grid da-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                    {[
                      { l: "Case Name", v: caseData?.name },
                      { l: "Case Type", v: "__pills__" },
                    ].map((item, i) => (
                      <div key={item.l} style={{ padding: "16px 0", borderBottom: "1px solid #F5F5F4", paddingRight: i % 2 === 0 ? 24 : 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#78716C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{item.l}</div>
                        <div style={{ fontSize: 15, fontWeight: 400, fontFamily: "var(--font-sans)", color: item.v ? "#292524" : "#78716C" }}>
                          {item.v === "__pills__" ? (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {resolveTypes(caseData).map((t) => (
                                <span key={t} style={getTypeBadgeStyle()}>{t}</span>
                              ))}
                            </div>
                          ) : (item.v || "-")}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Protected Class — only for discrimination-related types */}
                  {resolveTypes(caseData).some((t) => DISCRIMINATION_TYPES.includes(t)) && (
                    <div style={{ padding: "16px 0", borderBottom: "1px solid #F5F5F4" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#78716C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Protected Class</div>
                      {(caseData?.protected_classes ?? []).length > 0 ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {(caseData?.protected_classes ?? []).map((pc) => (
                            <span key={pc} style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", padding: "4px 10px", borderRadius: 6, background: "#F5F5F4", color: "#57534E", border: "1px solid #E7E5E4" }}>{pc}</span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 14, fontFamily: "var(--font-sans)" }}>
                          <span style={{ color: "#A8A29E", fontStyle: "italic" }}>Not specified</span>
                          {" -- "}
                          <button onClick={startEditCaseInfo} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 14, fontFamily: "var(--font-sans)", color: "var(--color-stone-500)", textDecoration: "underline" }}>Add in Edit Mode</button>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Remaining fields: Employer, Role, etc. */}
                  <div className="da-case-info-grid da-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                    {[
                      { l: "Employer", v: caseData?.employer },
                      { l: "Role", v: caseData?.role },
                      { l: "Department", v: caseData?.department },
                      { l: "Location", v: caseData?.location },
                      { l: "Start Date", v: caseData?.start_date ? formatDate(caseData.start_date) : null },
                      { l: "Status", v: caseData?.status },
                    ].map((item, i) => (
                      <div key={item.l} style={{ padding: "16px 0", borderBottom: "1px solid #F5F5F4", paddingRight: i % 2 === 0 ? 24 : 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#78716C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{item.l}</div>
                        <div style={{ fontSize: 15, fontWeight: 400, fontFamily: "var(--font-sans)", color: item.v ? "#292524" : "#78716C" }}>{item.v || "-"}</div>
                      </div>
                    ))}
                  </div>
                  {/* Key People as avatar pills */}
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#78716C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Key People</div>
                    {caseData?.key_people ? (() => {
                      const people = parsePeople(caseData.key_people);
                      return people.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {people.map((person, i) => (
                            <div key={person} style={{ display: "flex", alignItems: "center", gap: 8, background: "#F5F5F4", borderRadius: 20, padding: "6px 14px 6px 6px" }}>
                              <span style={{ width: 28, height: 28, borderRadius: "50%", background: AVATAR_COLOR, color: "#22C55E", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)" }}>{getInitials(person)}</span>
                              <span style={{ fontSize: 13, fontWeight: 500, color: "#292524", fontFamily: "var(--font-sans)" }}>{person}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 15, fontFamily: "var(--font-sans)", color: "#78716C" }}>-</div>
                      );
                    })() : (
                      <div style={{ fontSize: 15, fontFamily: "var(--font-sans)", color: "#78716C" }}>-</div>
                    )}
                  </div>
                  {/* Brief Summary — full width */}
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #F5F5F4" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#78716C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Brief Summary</div>
                    {caseData?.description ? (
                      <p style={{ fontSize: 14, fontFamily: "var(--font-sans)", lineHeight: 1.6, color: "#292524", whiteSpace: "pre-wrap", margin: 0 }}>{caseData.description}</p>
                    ) : (
                      <div style={{ fontSize: 15, fontFamily: "var(--font-sans)", color: "#78716C" }}>-</div>
                    )}
                  </div>
                  {/* Impact Statement — full width */}
                  {caseData?.impact_statement && (
                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #F5F5F4" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#78716C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Impact Statement</div>
                      <p style={{ fontSize: 14, fontFamily: "var(--font-sans)", lineHeight: 1.6, color: "#292524", whiteSpace: "pre-wrap", margin: 0 }}>{caseData.impact_statement}</p>
                    </div>
                  )}
                  {!caseData?.employer && !caseData?.role && !caseData?.description && (
                    <div style={{ marginTop: 20, background: "var(--color-green-soft)", borderRadius: 10, border: "1px solid var(--color-green-border)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-green-text)", fontFamily: "var(--font-sans)", marginBottom: 4 }}>Add your case details to strengthen your case file</div>
                        <div style={{ fontSize: 13, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)" }}>Employer, role, and a brief summary of your situation.</div>
                      </div>
                      <button onClick={startEditCaseInfo} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "var(--color-green)", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>Add Info</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* ============================================================ */}
          {/*  CASE FILE TAB                                                  */}
          {/* ============================================================ */}
          {activeTab === "casefile" && (
            <>
              {/* Action Bar + View Toggle */}
              <div className="da-cf-action-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, maxWidth: caseFileView === "document" ? 720 : 800, margin: "0 auto 28px" }}>
                <div>
                  <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 600, color: "#292524", marginBottom: 4 }}>{(() => { const nt = resolveTypes(caseData).filter((t) => t.toLowerCase() !== "general"); return nt.length > 0 ? `${nt.join(" \u00b7 ")} Case File` : "Case File"; })()}</h2>
                  <p style={{ fontSize: 13, color: "#292524", fontFamily: "var(--font-sans)" }}>
                    Generated {formatDate(new Date().toISOString().split("T")[0])}
                    {records.length > 0 && ` \u00b7 ${records.length} record${records.length !== 1 ? "s" : ""}`}
                    {plans.length > 0 && ` \u00b7 ${plans.length} plan${plans.length !== 1 ? "s" : ""}`}
                  </p>
                  <p style={{ fontSize: 11, color: "#78716C", fontFamily: "var(--font-sans)", fontStyle: "italic", display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    This file is private. Only you can view or download it.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", background: "#F5F5F4", borderRadius: 10, padding: 4 }}>
                    {(["interactive", "document"] as const).map((view) => (
                      <button key={view} onClick={() => setCaseFileView(view)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: caseFileView === view ? 700 : 500, fontFamily: "var(--font-sans)", color: caseFileView === view ? "#292524" : "#292524", background: caseFileView === view ? "#fff" : "transparent", boxShadow: caseFileView === view ? "0 1px 3px rgba(0,0,0,0.08)" : "none", cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap" }}>
                        {view === "interactive" ? "Interactive" : "Document Preview"}
                      </button>
                    ))}
                  </div>
                  <div className="da-cf-action-buttons" style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => window.print()} style={{ height: 38, padding: "0 16px", borderRadius: 8, border: "1px solid #D6D3D1", background: "#fff", color: "#292524", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                      Print
                    </button>
                    <button onClick={generatePdf} disabled={generatingPdf} style={{ height: 38, padding: "0 20px", borderRadius: 8, border: "none", background: "#22C55E", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: generatingPdf ? "not-allowed" : "pointer", opacity: generatingPdf ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 4px rgba(34,197,94,0.15)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      {generatingPdf ? "Generating..." : "Download PDF"}
                    </button>
                    <button onClick={generatePacket} disabled={generatingPacket} style={{ height: 38, padding: "0 20px", borderRadius: 8, border: "1px solid #22C55E", background: "#fff", color: "#22C55E", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: generatingPacket ? "not-allowed" : "pointer", opacity: generatingPacket ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                      {generatingPacket ? "Building..." : "Download Packet"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Document Preview (visible when document view) */}
              {caseFileView === "document" && (
                <div ref={caseFileRef} className="da-print-casefile" style={{ maxWidth: 720, margin: "0 auto", background: "#fff", border: "1px solid #D6D3D1", borderRadius: 3, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                  <CaseFileDocument records={records} vaultDocs={vaultDocs} patterns={patterns} contradictions={contradictions} linkedDocsMap={linkedDocsMap} caseData={caseData} starredIds={starredIds} keyDates={keyDates} plans={plans} planGoals={planGoals} planCheckins={planCheckins} />
                </div>
              )}

              {/* Interactive View */}
              {caseFileView === "interactive" && (
                <div style={{ maxWidth: 800, margin: "0 auto" }}>
                  {/* Stats grid */}
                  {records.length > 0 && (
                    <div className="da-case-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
                      <div style={{ background: "#fff", border: "1px solid #D6D3D1", borderRadius: 10, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 600, color: "#292524", marginBottom: 4 }}>{records.length}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#292524", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Records</div>
                      </div>
                      <div style={{ background: "#fff", border: "1px solid #D6D3D1", borderRadius: 10, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "#292524", marginBottom: 4, lineHeight: 1.6 }}>
                          {formatDate(records[0].date).replace(/, \d{4}/, "")} to {formatDate(records[records.length - 1].date).replace(/, \d{4}/, "")}
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#292524", textTransform: "uppercase", letterSpacing: "0.06em" }}>Date Range</div>
                      </div>
                      <div style={{ background: "#fff", border: "1px solid #D6D3D1", borderRadius: 10, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 600, color: "#292524", marginBottom: 4 }}>{entryTypeCounts.length}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#292524", textTransform: "uppercase", letterSpacing: "0.06em" }}>Entry Types</div>
                      </div>
                      <div style={{ background: "#fff", border: "1px solid #D6D3D1", borderRadius: 10, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 600, color: "#292524", marginBottom: 4 }}>{allPeople.length}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#292524", textTransform: "uppercase", letterSpacing: "0.06em" }}>Key People</div>
                      </div>
                    </div>
                  )}

                  {/* Entry Types + Key People */}
                  {(entryTypeCounts.length > 0 || allPeople.length > 0) && (
                    <div style={{ background: "#fff", border: "1px solid #D6D3D1", borderRadius: 10, padding: 20, marginBottom: 32 }}>
                      {entryTypeCounts.length > 0 && (
                        <div style={{ marginBottom: allPeople.length > 0 ? 16 : 0 }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "#292524", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Entry Types</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {entryTypeCounts.map(([type, count]) => (
                              <span key={type} style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap", color: "#15803D", background: "#F0FDF4", border: "1px solid #BBF7D0" }}>{type}: {count}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {allPeople.length > 0 && entryTypeCounts.length > 0 && <div style={{ height: 1, background: "#D6D3D1", margin: "0 0 16px" }} />}
                      {allPeople.length > 0 && (
                        <div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "#292524", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Key People</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {allPeople.map(([name, count]) => (
                              <span key={name} style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.04em", whiteSpace: "nowrap", color: "#292524", background: "#F5F5F4", border: "1px solid #D6D3D1" }}>{name} ({count})</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Interactive Record Timeline */}
                  {records.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                      <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 600, color: "#292524", marginBottom: 16 }}>Record Timeline</h3>
                      <div style={{ position: "relative", paddingLeft: 32 }}>
                        <div style={{ position: "absolute", left: 9, top: 8, bottom: 8, width: 2, background: "#22C55E", borderRadius: 1 }} />
                        {records.map((record) => {
                          const isExpanded = expandedCFRecord === record.id;
                          const docsForRecord = linkedDocsMap[record.id] || [];
                          const isLong = record.narrative.length > 200;
                          return (
                            <div key={record.id} style={{ position: "relative", marginBottom: 16 }}>
                              <div style={{ position: "absolute", left: -27, top: 8, width: 10, height: 10, borderRadius: "50%", background: "#22C55E", zIndex: 1 }} />
                              <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderLeft: "3px solid #22C55E", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#292524" }}>{formatDatetime(record)}</span>
                                  <span style={getBadgeStyle(record.entry_type)}>{record.entry_type}</span>
                                  {starredIds.has(record.id) && <span style={{ fontSize: 13, color: "#22C55E" }}>&#9733;</span>}
                                </div>
                                <div style={{ fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 600, color: "#292524", marginBottom: 6 }}>{record.title}</div>
                                <div style={{ fontSize: 14, color: "#292524", lineHeight: 1.7, ...(isLong && !isExpanded ? { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, overflow: "hidden" } : {}) }}>{renderMarkdown(record.narrative)}</div>
                                {isLong && (
                                  <button onClick={() => setExpandedCFRecord(isExpanded ? null : record.id)} style={{ background: "none", border: "none", padding: 0, fontSize: 13, fontWeight: 600, color: "#22C55E", cursor: "pointer", fontFamily: "var(--font-sans)", marginTop: 4 }}>{isExpanded ? "Show less" : "Show more"}</button>
                                )}
                                {isExpanded && record.facts && <div style={{ fontSize: 13, color: "#292524", lineHeight: 1.6, marginTop: 8 }}><strong>Key Facts:</strong> {renderMarkdown(record.facts)}</div>}
                                {isExpanded && record.follow_up && <div style={{ fontSize: 13, color: "#292524", lineHeight: 1.6, marginTop: 4 }}><strong>Follow-Up:</strong> {renderMarkdown(record.follow_up)}</div>}
                                {record.people && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
                                    {record.people.split(/[,;]/).map((p) => p.trim()).filter(Boolean).map((name) => (
                                      <span key={name} style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#292524", background: "#F5F5F4", border: "1px solid #D6D3D1" }}>{name}</span>
                                    ))}
                                  </div>
                                )}
                                {docsForRecord.length > 0 && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12, color: "#292524" }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#292524" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
                                    {docsForRecord.length} file{docsForRecord.length !== 1 ? "s" : ""} attached
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {/* ============================================================ */}
          {/*  PATTERNS TAB                                                   */}
          {/* ============================================================ */}
          {activeTab === "patterns" && (
            <div>
              {patterns.length === 0 && contradictions.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
                  <div style={{ textAlign: "center", maxWidth: 420, background: "#fff", borderRadius: 16, border: "1px solid var(--color-stone-300)", padding: "56px 40px" }}>
                    <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 600, color: "#292524", marginBottom: 10 }}>No patterns detected yet</h2>
                    <p style={{ fontSize: 14, color: "var(--color-stone-600)", lineHeight: 1.6 }}>Add more records to this case. Patterns become clearer over time.</p>
                  </div>
                </div>
              ) : (
                <>
                  <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 600, color: "#292524", marginBottom: 6 }}>Patterns</h3>
                  <p style={{ fontSize: 14, color: "#78716C", fontFamily: "var(--font-sans)", fontStyle: "italic", marginBottom: 20 }}>These patterns are observations from your records, not legal analysis.</p>
                  <div className="da-pattern-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                    {patterns.map((pattern, idx) => (
                      <div key={idx} style={{ background: pattern.type === "plan" ? "#FFFBEB" : "#FAFAF9", border: pattern.type === "plan" ? "1px solid #FDE68A" : "1px solid #E7E5E4", borderLeft: pattern.type === "plan" ? "3px solid #F59E0B" : "3px solid #22C55E", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={pattern.type === "warning" ? "#DC2626" : pattern.type === "plan" ? "#92400E" : "#292524"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={patternIcon(pattern.type)} /></svg>
                          <span style={{ fontSize: 15, fontWeight: 600, color: "#292524", fontFamily: "var(--font-sans)" }}>{pattern.label}</span>
                        </div>
                        <p style={{ fontSize: 14, color: "#57534E", lineHeight: 1.5, fontFamily: "var(--font-sans)" }}>{pattern.detail}</p>
                      </div>
                    ))}
                  </div>
                  {/* Contradictions Card */}
                  <div style={{ marginTop: 16, background: contradictions.length > 0 ? "#FEF2F2" : "#FAFAF9", border: contradictions.length > 0 ? "1px solid #FECACA" : "1px solid #E7E5E4", borderLeft: contradictions.length > 0 ? "3px solid #DC2626" : "3px solid #22C55E", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={contradictions.length > 0 ? "#DC2626" : "#292524"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                      <span style={{ fontSize: 15, fontWeight: 600, color: contradictions.length > 0 ? "#991B1B" : "#292524", fontFamily: "var(--font-sans)" }}>Potential Contradictions</span>
                    </div>
                    {contradictions.length > 0 ? (
                      <>
                        <p style={{ fontSize: 12, color: "#991B1B", fontFamily: "var(--font-sans)", fontStyle: "italic", marginBottom: 12, lineHeight: 1.5 }}>These patterns may indicate inconsistency in your employer&apos;s actions.</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {contradictions.map((c, idx) => (
                            <div key={idx} style={{ fontSize: 13, color: "#991B1B", lineHeight: 1.6, fontFamily: "var(--font-sans)", paddingLeft: 12, borderLeft: "2px solid #FECACA" }}>{c.detail}</div>
                          ))}
                        </div>
                        <p style={{ fontSize: 11, color: "#B91C1C", fontFamily: "var(--font-sans)", fontStyle: "italic", marginTop: 12, opacity: 0.8 }}>These are automated observations, not legal conclusions.</p>
                      </>
                    ) : (
                      <p style={{ fontSize: 13, color: "var(--color-stone-600)", lineHeight: 1.6, fontFamily: "var(--font-sans)" }}>No contradictions detected yet. Keep documenting. Patterns become clearer over time.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/*  STRENGTH TAB                                                  */}
          {/* ============================================================ */}
          {activeTab === "strength" && (() => {
            /* Compute strength pillars scoped to this case */
            const recordCount = records.length;
            const caseRecordIds = new Set(records.map((r) => r.id));
            const linkedEvidence = vaultDocs.filter((d) => d.linked_record_id && caseRecordIds.has(d.linked_record_id));
            const evidenceCount = linkedEvidence.length;

            const theoryFields = [
              caseData?.case_theory_protected_activity,
              caseData?.case_theory_employer_response,
              caseData?.case_theory_connection,
              caseData?.case_theory_outcome,
            ];
            const theoryFilled = theoryFields.filter((f) => f && f.trim()).length;
            const hasImpact = !!(caseData?.impact_statement && caseData.impact_statement.trim());
            const hasDescription = !!(caseData?.description && caseData.description.trim());
            const detailsFilledCount = theoryFilled + (hasImpact ? 1 : 0) + (hasDescription ? 1 : 0);

            let daySpan = 0;
            if (records.length >= 2) {
              const sorted = [...records].sort((a, b) => new Date(a.date + "T00:00:00").getTime() - new Date(b.date + "T00:00:00").getTime());
              const first = new Date(sorted[0].date + "T00:00:00").getTime();
              const last = new Date(sorted[sorted.length - 1].date + "T00:00:00").getTime();
              daySpan = Math.round((last - first) / 86400000);
            }

            type PillarStatus = "green" | "amber" | "gray";
            const pillars: { key: string; label: string; status: PillarStatus; detail: string }[] = [
              {
                key: "records",
                label: "Records documented",
                status: recordCount >= 5 ? "green" : recordCount >= 1 ? "amber" : "gray",
                detail: recordCount === 0 ? "No records linked to this case" : `${recordCount} record${recordCount !== 1 ? "s" : ""} linked`,
              },
              {
                key: "evidence",
                label: "Evidence linked",
                status: evidenceCount >= 3 ? "green" : evidenceCount >= 1 ? "amber" : "gray",
                detail: evidenceCount === 0 ? "No files linked to records" : `${evidenceCount} file${evidenceCount !== 1 ? "s" : ""} linked to records`,
              },
              {
                key: "caseinfo",
                label: "Case details complete",
                status: detailsFilledCount >= 6 ? "green" : detailsFilledCount >= 1 ? "amber" : "gray",
                detail: detailsFilledCount >= 6 ? "Theory, impact, and description filled" : detailsFilledCount > 0 ? `${detailsFilledCount} of 6 detail fields filled` : "No case details filled",
              },
              {
                key: "consistency",
                label: "Documentation consistency",
                status: daySpan >= 30 && records.length >= 3 ? "green" : records.length >= 2 ? "amber" : "gray",
                detail: records.length < 2 ? "Fewer than 2 records" : daySpan >= 30 ? `${daySpan} days documented` : `${daySpan} day${daySpan !== 1 ? "s" : ""} covered so far`,
              },
            ];

            const strongCount = pillars.filter((p) => p.status === "green").length;

            function sColor(s: PillarStatus): string { return s === "green" ? "#15803D" : s === "amber" ? "#D97706" : "#78716C"; }
            function sBg(s: PillarStatus): string { return s === "green" ? "#F0FDF4" : s === "amber" ? "#FFFBEB" : "#F5F5F4"; }
            function sBorder(s: PillarStatus): string { return s === "green" ? "#BBF7D0" : s === "amber" ? "#FDE68A" : "#D6D3D1"; }
            function sText(s: PillarStatus): string { return s === "green" ? "Complete" : s === "amber" ? "In progress" : "Not started"; }

            const pillarIconMap: Record<string, React.ReactNode> = {
              records: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
              evidence: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>,
              caseinfo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>,
              consistency: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
            };

            /* Build actionable next steps */
            const nextSteps: { text: string; action: (() => void) | null }[] = [];
            if (pillars[0].status !== "green") nextSteps.push({ text: "Add more records to strengthen your timeline", action: null });
            if (pillars[1].status !== "green") nextSteps.push({ text: "Link evidence files to your records", action: null });
            if (pillars[2].status !== "green") {
              if (!hasImpact) nextSteps.push({ text: "Add an impact statement", action: () => setActiveTab("caseinfo") });
              if (theoryFilled < 4) nextSteps.push({ text: "Complete your case theory in Case Info", action: () => setActiveTab("caseinfo") });
              if (!hasDescription) nextSteps.push({ text: "Add a case description", action: () => setActiveTab("caseinfo") });
            }
            if (pillars[3].status !== "green") nextSteps.push({ text: "Keep documenting regularly to show a consistent pattern", action: null });

            return (
              <div>
                {/* Strength Card */}
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E7E5E4", borderTop: "3px solid #22C55E", padding: 32, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)" }}>
                  <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 600, color: "#292524", marginBottom: 24 }}>
                    Documentation Strength
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {pillars.map((p) => (
                      <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: sBg(p.status), border: `1px solid ${sBorder(p.status)}`, display: "flex", alignItems: "center", justifyContent: "center", color: sColor(p.status), flexShrink: 0 }}>
                          {pillarIconMap[p.key]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 14, color: "#292524", fontFamily: "var(--font-sans)", fontWeight: 500, display: "block" }}>{p.label}</span>
                          <span style={{ fontSize: 12, color: "#78716C", fontFamily: "var(--font-mono)" }}>{p.detail}</span>
                        </div>
                        <span style={{
                          display: "inline-block", padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          fontFamily: "var(--font-mono)", color: sColor(p.status), background: sBg(p.status),
                          border: `1px solid ${sBorder(p.status)}`, whiteSpace: "nowrap",
                        }}>
                          {sText(p.status)}
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

                {/* Actionable Next Steps */}
                {strongCount === 4 ? (
                  <div style={{ background: "#F0FDF4", borderRadius: 12, border: "1px solid #BBF7D0", padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#15803D", fontFamily: "var(--font-sans)" }}>Your documentation is strong. Keep recording as events happen.</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 600, color: "#292524", marginBottom: 12 }}>Next Steps</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {nextSteps.map((step, idx) => (
                        <div
                          key={idx}
                          onClick={step.action || undefined}
                          style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
                            background: "#fff", borderRadius: 10, border: "1px solid #E7E5E4",
                            cursor: step.action ? "pointer" : "default",
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                          <span style={{ fontSize: 14, color: "#292524", fontFamily: "var(--font-sans)" }}>{step.text}</span>
                          {step.action && <span style={{ marginLeft: "auto", fontSize: 11, color: "#78716C", fontFamily: "var(--font-mono)" }}>Go</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}


      {/* ============================================================ */}
      {/*  ADD RECORDS MODAL                                            */}
      {/* ============================================================ */}
      {showAddRecords && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(e) => { if (e.target === e.currentTarget) closeAddRecordsModal(); }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "90%", maxWidth: 720, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Modal header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E7E5E4", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 700, color: "#292524", marginBottom: 4 }}>Add Records to Case</h3>
                <p style={{ fontSize: 13, color: "var(--color-stone-500)" }}>{caseRecordIds.size} record{caseRecordIds.size !== 1 ? "s" : ""} in this case</p>
              </div>
              <button onClick={closeAddRecordsModal} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-stone-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            {/* Search + filter */}
            <div style={{ padding: "12px 24px", borderBottom: "1px solid #F5F5F4", display: "flex", gap: 10, flexShrink: 0 }}>
              <input type="text" value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} placeholder="Search records..." style={{ ...filterInputStyle, flex: 1 }} />
              <select value={modalTypeFilter} onChange={(e) => setModalTypeFilter(e.target.value)} style={{ ...filterInputStyle, minWidth: 140, cursor: "pointer" }}>
                <option value="All">All Types</option>
                {ENTRY_TYPES.map((et) => (<option key={et} value={et}>{et}</option>))}
              </select>
            </div>
            {/* Record list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
              {allRecords
                .filter((r) => {
                  if (modalTypeFilter !== "All" && r.entry_type !== modalTypeFilter) return false;
                  if (modalSearch.trim()) {
                    const q = modalSearch.trim().toLowerCase();
                    if (!r.title.toLowerCase().includes(q) && !r.narrative.toLowerCase().includes(q)) return false;
                  }
                  return true;
                })
                .map((r) => {
                  const inCase = caseRecordIds.has(r.id);
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", borderBottom: "1px solid #F5F5F4", cursor: "pointer", background: inCase ? "#F0FDF4" : "#fff", transition: "background 0.15s" }}
                      onClick={() => inCase ? removeRecordFromCase(r.id) : addRecordToCase(r.id)}
                      onMouseEnter={(e) => { if (!inCase) e.currentTarget.style.background = "#FAFAF9"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = inCase ? "#F0FDF4" : "#fff"; }}
                    >
                      {/* Checkbox */}
                      <div style={{ width: 22, height: 22, borderRadius: 6, border: inCase ? "2px solid #22C55E" : "2px solid #D6D3D1", background: inCase ? "#22C55E" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                        {inCase && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-stone-500)" }}>{formatDate(r.date)}</span>
                          <span style={getBadgeStyle(r.entry_type)}>{r.entry_type}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#292524", fontFamily: "var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                        {r.people && <div style={{ fontSize: 12, color: "var(--color-stone-500)", marginTop: 2 }}>{r.people}</div>}
                      </div>
                    </div>
                  );
                })}
              {allRecords.length === 0 && (
                <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--color-stone-500)", fontSize: 14 }}>No records found. Create records in the Record tab first.</div>
              )}
            </div>
            {/* Modal footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #E7E5E4", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
              <button onClick={closeAddRecordsModal} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "var(--color-green)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer" }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {showToast && (
        <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", background: "#166534", color: "#fff", padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 1000, display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          Case info saved
        </div>
      )}
    </div>
  );
}
