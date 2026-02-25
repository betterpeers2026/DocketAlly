"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DocketRecord {
  id: string;
  user_id: string;
  title: string;
  entry_type: string;
  date: string;
  time: string | null;
  narrative: string;
  people: string | null;
  facts: string | null;
  follow_up: string | null;
  created_at: string;
  updated_at: string;
}

interface VaultDocument {
  id: string;
  file_name: string;
  category: string;
  linked_record_id: string | null;
  created_at: string;
}

interface CaseInfo {
  fullName: string;
  company: string;
  role: string;
  department: string;
  startDate: string;
  location: string;
  keyPeople: string;
  briefSummary: string;
}

interface DetectedPattern {
  type: "frequency" | "warning" | "people" | "gap";
  label: string;
  detail: string;
}

interface Contradiction {
  type: "performance" | "shifting" | "exclusion";
  detail: string;
}

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
const CASE_INFO_KEY = "docketally_case_info";
const STARRED_KEY = "docketally_starred_records";

const EMPTY_CASE_INFO: CaseInfo = {
  fullName: "",
  company: "",
  role: "",
  department: "",
  startDate: "",
  location: "",
  keyPeople: "",
  briefSummary: "",
};

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

function getBadgeStyle(entryType: string): React.CSSProperties {
  const isWarning = WARNING_TYPES.has(entryType);
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    color: isWarning ? "#991B1B" : "#57534E",
    background: isWarning ? "#FEF2F2" : "#F5F5F4",
    border: isWarning ? "1px solid #FECACA" : "1px solid #E7E5E4",
  };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  fontWeight: 600,
  color: "#44403C",
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
  color: "#1C1917",
  outline: "none",
  background: "#fff",
};

const filterInputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #D6D3D1",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
  color: "#1C1917",
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

  // 1. Frequency
  const last7 = records.filter(
    (r) => (now.getTime() - new Date(r.date + "T00:00:00").getTime()) / 86400000 <= 7
  ).length;
  const last14 = records.filter(
    (r) => (now.getTime() - new Date(r.date + "T00:00:00").getTime()) / 86400000 <= 14
  ).length;
  const last30 = records.filter(
    (r) => (now.getTime() - new Date(r.date + "T00:00:00").getTime()) / 86400000 <= 30
  ).length;

  if (last30 > 0) {
    let detail = `${last30} record${last30 !== 1 ? "s" : ""} in the last 30 days`;
    if (last7 > 0) detail += `, ${last7} in the last 7 days`;
    if (last7 > 0 && last14 > 0 && last7 > last14 / 2) {
      detail += " — frequency is increasing";
    }
    patterns.push({ type: "frequency", label: "Recording Frequency", detail });
  }

  // 2. Warning entries
  const warningCount = records.filter((r) => WARNING_TYPES.has(r.entry_type)).length;
  if (warningCount > 0) {
    patterns.push({
      type: "warning",
      label: "Flagged Entries",
      detail: `${warningCount} of ${records.length} records are flagged entries (PIP, HR, Incident)`,
    });
  }

  // 3. People frequency
  const peopleCounts: Record<string, number> = {};
  records.forEach((r) => {
    if (r.people) {
      r.people
        .split(/[,;]/)
        .map((p) => p.trim())
        .filter(Boolean)
        .forEach((name) => {
          peopleCounts[name] = (peopleCounts[name] || 0) + 1;
        });
    }
  });
  const topPeople = Object.entries(peopleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (topPeople.length > 0) {
    const detail = topPeople
      .map(([name, count]) => `${name} (${count} record${count !== 1 ? "s" : ""})`)
      .join(", ");
    patterns.push({ type: "people", label: "Key People", detail });
  }

  // 4. Gaps > 14 days
  const sorted = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date + "T00:00:00");
    const curr = new Date(sorted[i].date + "T00:00:00");
    const gap = (curr.getTime() - prev.getTime()) / 86400000;
    if (gap > 14) {
      patterns.push({
        type: "gap",
        label: "Recording Gap",
        detail: `No records between ${formatDate(sorted[i - 1].date)} and ${formatDate(sorted[i].date)} (${Math.round(gap)} days)`,
      });
    }
  }

  return patterns;
}

/* ------------------------------------------------------------------ */
/*  Contradiction Detection                                            */
/* ------------------------------------------------------------------ */

function detectContradictions(records: DocketRecord[]): Contradiction[] {
  if (records.length < 2) return [];
  const contradictions: Contradiction[] = [];
  const sorted = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Pattern A — Performance Contradiction
  const positiveRecords = sorted.filter(
    (r) => textContainsAny(r.narrative + " " + (r.title || "") + " " + (r.facts || ""), POSITIVE_KEYWORDS)
  );
  const pipRecords = sorted.filter(
    (r) =>
      r.entry_type === "PIP Conversation" ||
      textContainsAny(r.narrative + " " + (r.title || "") + " " + (r.facts || ""), PIP_KEYWORDS)
  );

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

  // Pattern B — Shifting Expectations
  const shiftingRecords = sorted.filter(
    (r) => textContainsAny(r.narrative + " " + (r.title || "") + " " + (r.facts || ""), SHIFTING_KEYWORDS)
  );
  if (shiftingRecords.length >= 2) {
    contradictions.push({
      type: "shifting",
      detail: `Goals or criteria appear to have changed across ${shiftingRecords.length} records`,
    });
  }

  // Pattern C — Exclusion After Complaint
  const complaintRecords = sorted.filter(
    (r) =>
      r.entry_type === "HR Interaction" ||
      textContainsAny(r.narrative + " " + (r.title || "") + " " + (r.facts || ""), COMPLAINT_KEYWORDS)
  );
  const exclusionRecords = sorted.filter(
    (r) => textContainsAny(r.narrative + " " + (r.title || "") + " " + (r.facts || ""), EXCLUSION_KEYWORDS)
  );

  for (const complaint of complaintRecords) {
    const complaintDate = new Date(complaint.date + "T00:00:00");
    for (const exclusion of exclusionRecords) {
      const exclusionDate = new Date(exclusion.date + "T00:00:00");
      const daysDiff = (exclusionDate.getTime() - complaintDate.getTime()) / 86400000;
      if (daysDiff > 0 && daysDiff <= 30) {
        contradictions.push({
          type: "exclusion",
          detail: `Treatment appears to have changed within ${Math.round(daysDiff)} days of HR interaction on ${formatDate(complaint.date)}`,
        });
      }
    }
  }

  // Deduplicate by detail
  const seen = new Set<string>();
  return contradictions.filter((c) => {
    if (seen.has(c.detail)) return false;
    seen.add(c.detail);
    return true;
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CasePage() {
  const supabase = createClient();
  const caseFileRef = useRef<HTMLDivElement>(null);

  // Auth
  const [userId, setUserId] = useState<string | null>(null);

  // Data
  const [records, setRecords] = useState<DocketRecord[]>([]);
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);

  // UI
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "casefile">("timeline");
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Case info
  const [caseInfo, setCaseInfo] = useState<CaseInfo>(EMPTY_CASE_INFO);
  const [editCaseInfo, setEditCaseInfo] = useState<CaseInfo>(EMPTY_CASE_INFO);
  const [showCaseInfoForm, setShowCaseInfoForm] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState("All");
  const [filterPeople, setFilterPeople] = useState("");
  const [filterDateRange, setFilterDateRange] = useState<DateRangeOption>("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  // Starred records
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  // Density tooltip
  const [densityTooltip, setDensityTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchRecords = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("records")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) console.error("Case fetchRecords error:", error);
    if (!error && data) setRecords(data);
    setLoading(false);
  }, [userId, supabase]);

  const fetchVaultDocs = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("vault_documents")
      .select("id, file_name, category, linked_record_id, created_at")
      .eq("user_id", userId);

    if (error) console.error("Case fetchVaultDocs error:", error);
    if (!error && data) setVaultDocs(data);
  }, [userId, supabase]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    }
    init();
  }, [supabase]);

  useEffect(() => {
    if (userId) {
      fetchRecords();
      fetchVaultDocs();
    }
  }, [userId, fetchRecords, fetchVaultDocs]);

  // Load case info from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CASE_INFO_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCaseInfo(parsed);
        setEditCaseInfo(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Load starred records from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STARRED_KEY);
      if (saved) {
        setStarredIds(new Set(JSON.parse(saved)));
      }
    } catch {
      // ignore
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Star handlers                                                    */
  /* ---------------------------------------------------------------- */

  function toggleStar(recordId: string) {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      localStorage.setItem(STARRED_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Computed data                                                    */
  /* ---------------------------------------------------------------- */

  const patterns = useMemo(() => detectPatterns(records), [records]);
  const contradictions = useMemo(() => detectContradictions(records), [records]);

  const linkedDocsMap = useMemo(() => {
    const map: Record<string, VaultDocument[]> = {};
    vaultDocs.forEach((doc) => {
      if (doc.linked_record_id) {
        if (!map[doc.linked_record_id]) map[doc.linked_record_id] = [];
        map[doc.linked_record_id].push(doc);
      }
    });
    return map;
  }, [vaultDocs]);

  const caseInfoFilled = caseInfo.fullName || caseInfo.company || caseInfo.briefSummary;

  const entryTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      counts[r.entry_type] = (counts[r.entry_type] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [records]);

  const allPeople = useMemo(() => {
    const people: Record<string, number> = {};
    records.forEach((r) => {
      if (r.people) {
        r.people
          .split(/[,;]/)
          .map((p) => p.trim())
          .filter(Boolean)
          .forEach((name) => {
            people[name] = (people[name] || 0) + 1;
          });
      }
    });
    return Object.entries(people).sort((a, b) => b[1] - a[1]);
  }, [records]);

  // Filtered records for timeline
  const filteredRecords = useMemo(() => {
    const now = new Date();
    return records.filter((r) => {
      // Entry type filter
      if (filterType !== "All" && r.entry_type !== filterType) return false;

      // People filter
      if (filterPeople.trim()) {
        const q = filterPeople.trim().toLowerCase();
        const hasPeople = r.people && r.people.toLowerCase().includes(q);
        if (!hasPeople) return false;
      }

      // Date range filter
      if (filterDateRange !== "all") {
        const recordDate = new Date(r.date + "T00:00:00");
        if (filterDateRange === "custom") {
          if (customDateFrom) {
            const from = new Date(customDateFrom + "T00:00:00");
            if (recordDate < from) return false;
          }
          if (customDateTo) {
            const to = new Date(customDateTo + "T23:59:59");
            if (recordDate > to) return false;
          }
        } else {
          const days = parseInt(filterDateRange);
          const cutoff = new Date(now.getTime() - days * 86400000);
          if (recordDate < cutoff) return false;
        }
      }

      return true;
    });
  }, [records, filterType, filterPeople, filterDateRange, customDateFrom, customDateTo]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterType !== "All") count++;
    if (filterPeople.trim()) count++;
    if (filterDateRange !== "all") count++;
    return count;
  }, [filterType, filterPeople, filterDateRange]);

  // Starred count
  const starredCount = useMemo(() => {
    return records.filter((r) => starredIds.has(r.id)).length;
  }, [records, starredIds]);

  // Starred records for PDF
  const starredRecords = useMemo(() => {
    return records.filter((r) => starredIds.has(r.id));
  }, [records, starredIds]);

  // Density chart data
  const densityWeeks = useMemo(() => {
    if (records.length === 0) return [];

    const firstDate = new Date(records[0].date + "T00:00:00");
    const lastDate = new Date(records[records.length - 1].date + "T00:00:00");

    // Build week buckets
    const weekCounts: Record<string, number> = {};
    records.forEach((r) => {
      const ws = getWeekStart(new Date(r.date + "T00:00:00"));
      weekCounts[ws] = (weekCounts[ws] || 0) + 1;
    });

    // Generate all weeks from first to last
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

  /* ---------------------------------------------------------------- */
  /*  Filter handlers                                                  */
  /* ---------------------------------------------------------------- */

  function clearAllFilters() {
    setFilterType("All");
    setFilterPeople("");
    setFilterDateRange("all");
    setCustomDateFrom("");
    setCustomDateTo("");
  }

  /* ---------------------------------------------------------------- */
  /*  Case info handlers                                               */
  /* ---------------------------------------------------------------- */

  function saveCaseInfo() {
    setCaseInfo(editCaseInfo);
    localStorage.setItem(CASE_INFO_KEY, JSON.stringify(editCaseInfo));
    setShowCaseInfoForm(false);
  }

  function cancelCaseInfoEdit() {
    setEditCaseInfo(caseInfo);
    setShowCaseInfoForm(false);
  }

  function openCaseInfoForm() {
    setEditCaseInfo(caseInfo);
    setShowCaseInfoForm(true);
  }

  /* ---------------------------------------------------------------- */
  /*  PDF generation                                                   */
  /* ---------------------------------------------------------------- */

  async function generatePdf() {
    if (!caseFileRef.current) return;
    setGeneratingPdf(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2pdf = (await import("html2pdf.js")).default as any;
      const today = new Date().toISOString().split("T")[0];

      await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename: `DocketAlly-Case-File-${today}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(caseFileRef.current)
        .save();
    } catch (err) {
      console.error("PDF generation error:", err);
    }

    setGeneratingPdf(false);
  }

  /* ---------------------------------------------------------------- */
  /*  Pattern icon helper                                              */
  /* ---------------------------------------------------------------- */

  function patternIcon(type: string): string {
    switch (type) {
      case "frequency":
        return "M23 6l-9.5 9.5-5-5L1 18";
      case "warning":
        return "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01";
      case "people":
        return "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2 M9 11a4 4 0 100-8 4 4 0 000 8 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75";
      case "gap":
        return "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z";
      default:
        return "";
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Density color helper                                             */
  /* ---------------------------------------------------------------- */

  function densityColor(count: number): string {
    if (count === 0) return "#E7E5E4"; // stone-200
    if (count <= 2) return "#86EFAC"; // green-300
    return "#22C55E"; // green-500
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 28,
          borderBottom: "1px solid var(--color-stone-200)",
        }}
      >
        {(["timeline", "casefile"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: activeTab === tab ? 600 : 500,
              fontFamily: "var(--font-sans)",
              color: activeTab === tab ? "#1C1917" : "var(--color-stone-400)",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--color-green)" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {tab === "timeline" ? "Timeline" : "Case File"}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: 80,
            color: "var(--color-stone-400)",
            fontSize: 15,
            fontFamily: "var(--font-sans)",
          }}
        >
          Loading case data...
        </div>
      ) : activeTab === "timeline" ? (
        /* ============================================================ */
        /*  TIMELINE VIEW                                                */
        /* ============================================================ */
        <>
          {/* Case Info Banner */}
          {showCaseInfoForm ? (
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                border: "1px solid var(--color-stone-200)",
                padding: "28px 28px",
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 24,
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#1C1917",
                  }}
                >
                  Case Information
                </h3>
                <button
                  onClick={cancelCaseInfoEdit}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "1px solid #D6D3D1",
                    background: "#fff",
                    color: "#44403C",
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: "var(--font-sans)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input
                    type="text"
                    value={editCaseInfo.fullName}
                    onChange={(e) => setEditCaseInfo((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Your full legal name"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Company / Employer</label>
                  <input
                    type="text"
                    value={editCaseInfo.company}
                    onChange={(e) => setEditCaseInfo((prev) => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Role / Title</label>
                  <input
                    type="text"
                    value={editCaseInfo.role}
                    onChange={(e) => setEditCaseInfo((prev) => ({ ...prev, role: e.target.value }))}
                    placeholder="Your job title"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Department</label>
                  <input
                    type="text"
                    value={editCaseInfo.department}
                    onChange={(e) => setEditCaseInfo((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="Department or team"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Start Date (at company)</label>
                  <input
                    type="date"
                    value={editCaseInfo.startDate}
                    onChange={(e) => setEditCaseInfo((prev) => ({ ...prev, startDate: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Location</label>
                  <input
                    type="text"
                    value={editCaseInfo.location}
                    onChange={(e) => setEditCaseInfo((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="Office location or remote"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Key People</label>
                <textarea
                  value={editCaseInfo.keyPeople}
                  onChange={(e) => setEditCaseInfo((prev) => ({ ...prev, keyPeople: e.target.value }))}
                  placeholder="Managers, HR contacts, witnesses — one per line"
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Brief Summary</label>
                <textarea
                  value={editCaseInfo.briefSummary}
                  onChange={(e) => setEditCaseInfo((prev) => ({ ...prev, briefSummary: e.target.value }))}
                  placeholder="2-3 sentence overview of your situation"
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  onClick={cancelCaseInfoEdit}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 10,
                    border: "1px solid #D6D3D1",
                    background: "#fff",
                    color: "#44403C",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveCaseInfo}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: "var(--color-green)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                    cursor: "pointer",
                  }}
                >
                  Save Info
                </button>
              </div>
            </div>
          ) : caseInfoFilled ? (
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                border: "1px solid var(--color-stone-200)",
                padding: "20px 24px",
                marginBottom: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#1C1917",
                    fontFamily: "var(--font-sans)",
                    marginBottom: 4,
                  }}
                >
                  {caseInfo.fullName || "Case Information"}
                  {caseInfo.company && (
                    <span style={{ fontWeight: 400, color: "var(--color-stone-500)", marginLeft: 8 }}>
                      at {caseInfo.company}
                    </span>
                  )}
                </div>
                {caseInfo.role && (
                  <div style={{ fontSize: 13, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)" }}>
                    {caseInfo.role}
                    {caseInfo.department && ` — ${caseInfo.department}`}
                  </div>
                )}
              </div>
              <button
                onClick={openCaseInfoForm}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--color-stone-200)",
                  background: "#fff",
                  color: "var(--color-stone-700)",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Edit
              </button>
            </div>
          ) : (
            <div
              style={{
                background: "var(--color-green-soft)",
                borderRadius: 14,
                border: "1px solid var(--color-green-border)",
                padding: "20px 24px",
                marginBottom: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--color-green-text)",
                    fontFamily: "var(--font-sans)",
                    marginBottom: 4,
                  }}
                >
                  Add your case info to strengthen your case file
                </div>
                <div style={{ fontSize: 13, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)" }}>
                  Name, employer, role, and a brief summary of your situation.
                </div>
              </div>
              <button
                onClick={openCaseInfoForm}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--color-green)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Add Info
              </button>
            </div>
          )}

          {/* ===== FILTER BAR ===== */}
          {records.length > 0 && (
            <div
              className="da-case-filters"
              style={{
                background: "#fff",
                borderRadius: 12,
                border: "1px solid var(--color-stone-200)",
                padding: "16px 20px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                {/* Entry Type */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{
                    ...filterInputStyle,
                    minWidth: 140,
                    cursor: "pointer",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-green)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#D6D3D1"; }}
                >
                  <option value="All">All Types</option>
                  {ENTRY_TYPES.map((et) => (
                    <option key={et} value={et}>{et}</option>
                  ))}
                </select>

                {/* People filter */}
                <input
                  type="text"
                  value={filterPeople}
                  onChange={(e) => setFilterPeople(e.target.value)}
                  placeholder="Filter by person..."
                  style={{ ...filterInputStyle, minWidth: 150, flex: 1, maxWidth: 220 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-green)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#D6D3D1"; }}
                />

                {/* Date range */}
                <select
                  value={filterDateRange}
                  onChange={(e) => setFilterDateRange(e.target.value as DateRangeOption)}
                  style={{
                    ...filterInputStyle,
                    minWidth: 130,
                    cursor: "pointer",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-green)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#D6D3D1"; }}
                >
                  <option value="all">All Time</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="custom">Custom range</option>
                </select>

                {/* Filter count + clear */}
                {activeFilterCount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        color: "#1E40AF",
                        background: "#EFF6FF",
                        border: "1px solid #BFDBFE",
                      }}
                    >
                      {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
                    </span>
                    <button
                      onClick={clearAllFilters}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 500,
                        fontFamily: "var(--font-sans)",
                        color: "var(--color-stone-500)",
                        textDecoration: "underline",
                        padding: 0,
                      }}
                    >
                      Clear all
                    </button>
                  </div>
                )}

                {/* Starred count */}
                {starredCount > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: "var(--font-mono)",
                      color: "#166534",
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      marginLeft: "auto",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#22C55E" stroke="#22C55E" strokeWidth="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {starredCount} key event{starredCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Custom date range inputs */}
              {filterDateRange === "custom" && (
                <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
                  <label style={{ fontSize: 12, color: "var(--color-stone-500)", fontFamily: "var(--font-mono)" }}>From</label>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    style={{ ...filterInputStyle, width: 150 }}
                  />
                  <label style={{ fontSize: 12, color: "var(--color-stone-500)", fontFamily: "var(--font-mono)" }}>To</label>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    style={{ ...filterInputStyle, width: 150 }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ===== RECORD DENSITY CHART ===== */}
          {densityWeeks.length > 0 && (
            <div
              style={{
                marginBottom: 20,
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Record Density</label>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                  <span style={{ fontSize: 10, color: "var(--color-stone-400)", fontFamily: "var(--font-mono)" }}>Less</span>
                  {[0, 1, 3].map((c) => (
                    <div
                      key={c}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: densityColor(c),
                      }}
                    />
                  ))}
                  <span style={{ fontSize: 10, color: "var(--color-stone-400)", fontFamily: "var(--font-mono)" }}>More</span>
                </div>
              </div>
              <div
                style={{
                  overflowX: "auto",
                  paddingBottom: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 2,
                    height: 8,
                    minWidth: "fit-content",
                  }}
                >
                  {densityWeeks.map((week) => (
                    <div
                      key={week.weekStart}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: densityColor(week.count),
                        cursor: "default",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDensityTooltip({
                          text: `Week of ${formatDate(week.weekStart)}: ${week.count} record${week.count !== 1 ? "s" : ""}`,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                        });
                      }}
                      onMouseLeave={() => setDensityTooltip(null)}
                    />
                  ))}
                </div>
              </div>
              {/* Tooltip */}
              {densityTooltip && (
                <div
                  style={{
                    position: "fixed",
                    left: densityTooltip.x,
                    top: densityTooltip.y,
                    transform: "translate(-50%, -100%)",
                    background: "#1C1917",
                    color: "#fff",
                    padding: "5px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    zIndex: 50,
                  }}
                >
                  {densityTooltip.text}
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          {records.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 300,
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  maxWidth: 420,
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid var(--color-stone-200)",
                  padding: "56px 40px",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "var(--color-stone-50)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-stone-300)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 8v4l3 3" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 600,
                    color: "#1C1917",
                    marginBottom: 10,
                  }}
                >
                  No records yet
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--color-stone-500)",
                    lineHeight: 1.6,
                  }}
                >
                  Start documenting in the Record tab to build your timeline.
                </p>
              </div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "56px 40px",
                background: "#fff",
                borderRadius: 16,
                border: "1px solid var(--color-stone-200)",
              }}
            >
              <p style={{ fontSize: 14, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)" }}>
                No records match your filters.
              </p>
              <button
                onClick={clearAllFilters}
                style={{
                  marginTop: 12,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  color: "var(--color-green)",
                }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div style={{ position: "relative", paddingLeft: 44 }}>
              {/* Timeline line */}
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  top: 8,
                  bottom: 8,
                  width: 2,
                  background: "var(--color-stone-200)",
                  borderRadius: 1,
                }}
              />

              {filteredRecords.map((record) => {
                const isWarning = WARNING_TYPES.has(record.entry_type);
                const isExpanded = expandedRecord === record.id;
                const linkedDocs = linkedDocsMap[record.id] || [];
                const isStarred = starredIds.has(record.id);

                return (
                  <div
                    key={record.id}
                    style={{ position: "relative", marginBottom: 20 }}
                  >
                    {/* Timeline dot */}
                    <div
                      style={{
                        position: "absolute",
                        left: -29,
                        top: 8,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: isWarning ? "#FEF2F2" : "#fff",
                        border: isWarning
                          ? "2px solid #991B1B"
                          : "2px solid var(--color-stone-300)",
                        zIndex: 1,
                      }}
                    />

                    {/* Card */}
                    <div
                      style={{
                        background: "#fff",
                        borderRadius: 14,
                        border: "1px solid var(--color-stone-200)",
                        borderLeft: isStarred
                          ? "3px solid #22C55E"
                          : "1px solid var(--color-stone-200)",
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "border-color 0.15s",
                      }}
                      onClick={() =>
                        setExpandedRecord(isExpanded ? null : record.id)
                      }
                      onMouseEnter={(e) => {
                        if (!isExpanded)
                          e.currentTarget.style.borderColor =
                            "var(--color-stone-300)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isExpanded)
                          e.currentTarget.style.borderColor =
                            "var(--color-stone-200)";
                        if (isStarred)
                          e.currentTarget.style.borderLeftColor = "#22C55E";
                      }}
                    >
                      <div style={{ padding: "18px 24px" }}>
                        {/* Top row: date + badge + star */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--color-stone-500)",
                              fontFamily: "var(--font-mono)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatDate(record.date)}
                          </span>
                          <span style={getBadgeStyle(record.entry_type)}>
                            {record.entry_type}
                          </span>
                          {/* Star toggle */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(record.id);
                            }}
                            title={isStarred ? "Unmark as key event" : "Mark as key event"}
                            style={{
                              marginLeft: "auto",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 4,
                              display: "flex",
                              alignItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill={isStarred ? "#22C55E" : "none"}
                              stroke={isStarred ? "#22C55E" : "var(--color-stone-300)"}
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        </div>

                        {/* Title */}
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: "#1C1917",
                            fontFamily: "var(--font-sans)",
                            marginBottom: 6,
                          }}
                        >
                          {record.title}
                        </div>

                        {/* Narrative preview (collapsed) */}
                        {!isExpanded && (
                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--color-stone-500)",
                              lineHeight: 1.6,
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical" as never,
                              overflow: "hidden",
                              marginBottom: 8,
                            }}
                          >
                            {record.narrative}
                          </div>
                        )}

                        {/* Meta row */}
                        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                          {record.people && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--color-stone-500)",
                                background: "var(--color-stone-50)",
                                border: "1px solid var(--color-stone-100)",
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontFamily: "var(--font-sans)",
                              }}
                            >
                              People: {record.people}
                            </span>
                          )}
                          {linkedDocs.length > 0 && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--color-stone-500)",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                fontFamily: "var(--font-sans)",
                              }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                              </svg>
                              {linkedDocs.length} document{linkedDocs.length !== 1 ? "s" : ""} linked
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: "0 24px 20px",
                            borderTop: "1px solid var(--color-stone-100)",
                          }}
                        >
                          <div style={{ marginTop: 16 }}>
                            <label style={labelStyle}>What Happened</label>
                            <p
                              style={{
                                fontSize: 14,
                                color: "var(--color-stone-700)",
                                lineHeight: 1.7,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {record.narrative}
                            </p>
                          </div>

                          {record.people && (
                            <div style={{ marginTop: 14 }}>
                              <label style={labelStyle}>People Involved</label>
                              <p style={{ fontSize: 14, color: "var(--color-stone-700)" }}>
                                {record.people}
                              </p>
                            </div>
                          )}

                          {record.facts && (
                            <div style={{ marginTop: 14 }}>
                              <label style={labelStyle}>Key Facts</label>
                              <p
                                style={{
                                  fontSize: 14,
                                  color: "var(--color-stone-700)",
                                  lineHeight: 1.7,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {record.facts}
                              </p>
                            </div>
                          )}

                          {record.follow_up && (
                            <div style={{ marginTop: 14 }}>
                              <label style={labelStyle}>Follow-Up Needed</label>
                              <p
                                style={{
                                  fontSize: 14,
                                  color: "var(--color-stone-700)",
                                  lineHeight: 1.7,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {record.follow_up}
                              </p>
                            </div>
                          )}

                          {linkedDocs.length > 0 && (
                            <div style={{ marginTop: 14 }}>
                              <label style={labelStyle}>Linked Documents</label>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {linkedDocs.map((doc) => (
                                  <div
                                    key={doc.id}
                                    style={{
                                      fontSize: 13,
                                      color: "var(--color-stone-700)",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="var(--color-stone-400)"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                      <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    {doc.file_name}
                                    <span style={{ color: "var(--color-stone-400)", fontSize: 11 }}>
                                      ({doc.category})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Patterns Section */}
          {(patterns.length > 0 || contradictions.length > 0) && (
            <div style={{ marginTop: 40 }}>
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#1C1917",
                  marginBottom: 6,
                }}
              >
                Patterns
              </h3>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--color-stone-400)",
                  fontFamily: "var(--font-sans)",
                  fontStyle: "italic",
                  marginBottom: 16,
                }}
              >
                These patterns are observations from your records, not legal analysis.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                }}
              >
                {patterns.map((pattern, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--color-stone-50)",
                      border: "1px solid var(--color-stone-200)",
                      borderRadius: 12,
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={
                          pattern.type === "warning"
                            ? "#991B1B"
                            : "var(--color-stone-500)"
                        }
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={patternIcon(pattern.type)} />
                      </svg>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1C1917",
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        {pattern.label}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--color-stone-600)",
                        lineHeight: 1.6,
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {pattern.detail}
                    </p>
                  </div>
                ))}
              </div>

              {/* Contradictions Card */}
              <div
                style={{
                  marginTop: 16,
                  background: contradictions.length > 0 ? "#FEF2F2" : "var(--color-stone-50)",
                  border: contradictions.length > 0 ? "1px solid #FECACA" : "1px solid var(--color-stone-200)",
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={contradictions.length > 0 ? "#991B1B" : "var(--color-stone-500)"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: contradictions.length > 0 ? "#991B1B" : "#1C1917",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    Potential Contradictions
                  </span>
                </div>

                {contradictions.length > 0 ? (
                  <>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#991B1B",
                        fontFamily: "var(--font-sans)",
                        fontStyle: "italic",
                        marginBottom: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      These patterns may indicate inconsistency in your employer&apos;s actions.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {contradictions.map((c, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: 13,
                            color: "#991B1B",
                            lineHeight: 1.6,
                            fontFamily: "var(--font-sans)",
                            paddingLeft: 12,
                            borderLeft: "2px solid #FECACA",
                          }}
                        >
                          {c.detail}
                        </div>
                      ))}
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#B91C1C",
                        fontFamily: "var(--font-sans)",
                        fontStyle: "italic",
                        marginTop: 12,
                        opacity: 0.8,
                      }}
                    >
                      These are automated observations, not legal conclusions.
                    </p>
                  </>
                ) : (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--color-stone-500)",
                      lineHeight: 1.6,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    No contradictions detected yet. Keep documenting — patterns become clearer over time.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ============================================================ */
        /*  CASE FILE VIEW                                               */
        /* ============================================================ */
        <>
          {/* Download button */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 20,
            }}
          >
            <button
              onClick={generatePdf}
              disabled={generatingPdf}
              style={{
                padding: "12px 24px",
                borderRadius: 10,
                border: "none",
                background: "var(--color-green)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                cursor: generatingPdf ? "not-allowed" : "pointer",
                opacity: generatingPdf ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {generatingPdf ? "Generating..." : "Download PDF"}
            </button>
          </div>

          {/* Case File Preview */}
          <div
            ref={caseFileRef}
            style={{
              background: "#fff",
              border: "1px solid var(--color-stone-200)",
              borderRadius: 14,
              padding: 48,
              maxWidth: 800,
              margin: "0 auto",
              fontFamily: "var(--font-sans)",
            }}
          >
            {/* a. Header */}
            <div style={{ textAlign: "center", marginBottom: 40, paddingBottom: 24, borderBottom: "2px solid var(--color-stone-200)" }}>
              <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-stone-400)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                Confidential
              </div>
              <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 700, color: "#1C1917", marginBottom: 8 }}>
                Case File
              </h1>
              <div style={{ fontSize: 14, color: "var(--color-stone-500)" }}>
                Docket<span style={{ color: "var(--color-green)" }}>Ally</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--color-stone-400)", fontFamily: "var(--font-mono)", marginTop: 8 }}>
                Generated {formatDate(new Date().toISOString().split("T")[0])}
              </div>
            </div>

            {/* b. Case Information */}
            {caseInfoFilled && (
              <div style={{ marginBottom: 36 }}>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#1C1917", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--color-stone-200)" }}>
                  Case Information
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "10px 16px", fontSize: 14 }}>
                  {caseInfo.fullName && (
                    <>
                      <div style={{ color: "var(--color-stone-500)", fontWeight: 500 }}>Name</div>
                      <div style={{ color: "#1C1917" }}>{caseInfo.fullName}</div>
                    </>
                  )}
                  {caseInfo.company && (
                    <>
                      <div style={{ color: "var(--color-stone-500)", fontWeight: 500 }}>Employer</div>
                      <div style={{ color: "#1C1917" }}>{caseInfo.company}</div>
                    </>
                  )}
                  {caseInfo.role && (
                    <>
                      <div style={{ color: "var(--color-stone-500)", fontWeight: 500 }}>Role / Title</div>
                      <div style={{ color: "#1C1917" }}>{caseInfo.role}</div>
                    </>
                  )}
                  {caseInfo.department && (
                    <>
                      <div style={{ color: "var(--color-stone-500)", fontWeight: 500 }}>Department</div>
                      <div style={{ color: "#1C1917" }}>{caseInfo.department}</div>
                    </>
                  )}
                  {caseInfo.startDate && (
                    <>
                      <div style={{ color: "var(--color-stone-500)", fontWeight: 500 }}>Start Date</div>
                      <div style={{ color: "#1C1917" }}>{formatDate(caseInfo.startDate)}</div>
                    </>
                  )}
                  {caseInfo.location && (
                    <>
                      <div style={{ color: "var(--color-stone-500)", fontWeight: 500 }}>Location</div>
                      <div style={{ color: "#1C1917" }}>{caseInfo.location}</div>
                    </>
                  )}
                </div>
                {caseInfo.keyPeople && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 14, color: "var(--color-stone-500)", fontWeight: 500, marginBottom: 4 }}>Key People</div>
                    <div style={{ fontSize: 14, color: "#1C1917", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{caseInfo.keyPeople}</div>
                  </div>
                )}
                {caseInfo.briefSummary && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 14, color: "var(--color-stone-500)", fontWeight: 500, marginBottom: 4 }}>Summary</div>
                    <div style={{ fontSize: 14, color: "#1C1917", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{caseInfo.briefSummary}</div>
                  </div>
                )}
              </div>
            )}

            {/* b2. Key Events (starred) */}
            {starredRecords.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#1C1917", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--color-stone-200)" }}>
                  Key Events
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-stone-400)", fontStyle: "italic", marginBottom: 16 }}>
                  Flagged by user as significant to the case.
                </p>
                {starredRecords.map((record, idx) => (
                  <div
                    key={record.id}
                    style={{
                      paddingBottom: 24,
                      marginBottom: 24,
                      borderBottom: idx < starredRecords.length - 1 ? "1px solid var(--color-stone-100)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, color: "#22C55E" }}>&#9733;</span>
                      <span style={{ fontSize: 12, color: "var(--color-stone-500)", fontFamily: "var(--font-mono)" }}>
                        {formatDate(record.date)}
                        {record.time && ` at ${record.time}`}
                      </span>
                      <span style={getBadgeStyle(record.entry_type)}>
                        {record.entry_type}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1C1917", marginBottom: 8 }}>
                      {record.title}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--color-stone-700)", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 8 }}>
                      {record.narrative}
                    </div>
                    {record.people && (
                      <div style={{ fontSize: 13, color: "var(--color-stone-600)", marginBottom: 4 }}>
                        <strong>People:</strong> {record.people}
                      </div>
                    )}
                    {record.facts && (
                      <div style={{ fontSize: 13, color: "var(--color-stone-600)", lineHeight: 1.6, marginBottom: 4, whiteSpace: "pre-wrap" }}>
                        <strong>Key Facts:</strong> {record.facts}
                      </div>
                    )}
                    {record.follow_up && (
                      <div style={{ fontSize: 13, color: "var(--color-stone-600)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        <strong>Follow-Up:</strong> {record.follow_up}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* c. Summary Statistics */}
            {records.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#1C1917", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--color-stone-200)" }}>
                  Summary Statistics
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div style={{ background: "var(--color-stone-50)", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#1C1917" }}>{records.length}</div>
                    <div style={{ fontSize: 12, color: "var(--color-stone-500)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Total Records</div>
                  </div>
                  <div style={{ background: "var(--color-stone-50)", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1C1917" }}>
                      {formatDate(records[0].date)} — {formatDate(records[records.length - 1].date)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-stone-500)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Date Range</div>
                  </div>
                </div>

                {entryTypeCounts.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-stone-700)", marginBottom: 8 }}>Entry Types</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {entryTypeCounts.map(([type, count]) => (
                        <span key={type} style={{ ...getBadgeStyle(type), fontSize: 11 }}>
                          {type}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {allPeople.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-stone-700)", marginBottom: 8 }}>Key People</div>
                    <div style={{ fontSize: 13, color: "var(--color-stone-600)", lineHeight: 1.8 }}>
                      {allPeople.map(([name, count]) => `${name} (${count})`).join(", ")}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* d. Timeline */}
            {records.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#1C1917", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--color-stone-200)" }}>
                  Timeline of Events
                </h2>
                {records.map((record, idx) => (
                  <div
                    key={record.id}
                    style={{
                      paddingBottom: 24,
                      marginBottom: 24,
                      borderBottom: idx < records.length - 1 ? "1px solid var(--color-stone-100)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      {starredIds.has(record.id) && (
                        <span style={{ fontSize: 14, color: "#22C55E" }}>&#9733;</span>
                      )}
                      <span style={{ fontSize: 12, color: "var(--color-stone-500)", fontFamily: "var(--font-mono)" }}>
                        {formatDate(record.date)}
                        {record.time && ` at ${record.time}`}
                      </span>
                      <span style={getBadgeStyle(record.entry_type)}>
                        {record.entry_type}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1C1917", marginBottom: 8 }}>
                      {record.title}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--color-stone-700)", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 8 }}>
                      {record.narrative}
                    </div>
                    {record.people && (
                      <div style={{ fontSize: 13, color: "var(--color-stone-600)", marginBottom: 4 }}>
                        <strong>People:</strong> {record.people}
                      </div>
                    )}
                    {record.facts && (
                      <div style={{ fontSize: 13, color: "var(--color-stone-600)", lineHeight: 1.6, marginBottom: 4, whiteSpace: "pre-wrap" }}>
                        <strong>Key Facts:</strong> {record.facts}
                      </div>
                    )}
                    {record.follow_up && (
                      <div style={{ fontSize: 13, color: "var(--color-stone-600)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        <strong>Follow-Up:</strong> {record.follow_up}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* e. Patterns + Contradictions */}
            {(patterns.length > 0 || contradictions.length > 0) && (
              <div style={{ marginBottom: 36 }}>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#1C1917", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--color-stone-200)" }}>
                  Detected Patterns
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-stone-400)", fontStyle: "italic", marginBottom: 14 }}>
                  Observations from records — not legal analysis.
                </p>
                {patterns.map((pattern, idx) => (
                  <div key={idx} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1C1917", marginBottom: 2 }}>
                      {pattern.label}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--color-stone-600)", lineHeight: 1.6 }}>
                      {pattern.detail}
                    </div>
                  </div>
                ))}

                {/* Contradictions in PDF */}
                {contradictions.length > 0 && (
                  <div style={{ marginTop: 16, padding: 16, background: "#FEF2F2", borderRadius: 10, border: "1px solid #FECACA" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#991B1B", marginBottom: 8 }}>
                      Potential Contradictions
                    </div>
                    <p style={{ fontSize: 12, color: "#991B1B", fontStyle: "italic", marginBottom: 10, lineHeight: 1.5 }}>
                      These patterns may indicate inconsistency in your employer&apos;s actions.
                    </p>
                    {contradictions.map((c, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: 13,
                          color: "#991B1B",
                          lineHeight: 1.6,
                          marginBottom: 6,
                          paddingLeft: 12,
                          borderLeft: "2px solid #FECACA",
                        }}
                      >
                        {c.detail}
                      </div>
                    ))}
                    <p style={{ fontSize: 11, color: "#B91C1C", fontStyle: "italic", marginTop: 10, opacity: 0.8 }}>
                      These are automated observations, not legal conclusions.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* f. Linked Documents */}
            {vaultDocs.filter((d) => d.linked_record_id).length > 0 && (
              <div>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#1C1917", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--color-stone-200)" }}>
                  Supporting Documents
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {vaultDocs
                    .filter((d) => d.linked_record_id)
                    .map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          fontSize: 13,
                          color: "var(--color-stone-700)",
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--color-stone-400)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span style={{ fontWeight: 500 }}>{doc.file_name}</span>
                        <span style={{ color: "var(--color-stone-400)" }}>({doc.category})</span>
                        <span style={{ color: "var(--color-stone-400)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                          {formatDate(doc.created_at.split("T")[0])}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--color-stone-200)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--color-stone-400)", fontFamily: "var(--font-mono)" }}>
                Generated by DocketAlly — Confidential
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
