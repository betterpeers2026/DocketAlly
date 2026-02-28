"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { renderMarkdown } from "@/lib/renderMarkdown";
import type { SubscriptionInfo } from "@/lib/subscription";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CaseBasic {
  id: string;
  name: string;
  case_type: string;
  case_types?: string[];
}

interface CaseData {
  id: string;
  user_id: string;
  name: string;
  case_type: string;
  case_types: string[];
  status: string;
  description: string | null;
  start_date: string | null;
  employer: string | null;
  role: string | null;
  department: string | null;
  location: string | null;
  key_people: string | null;
  protected_classes: string[];
  created_at: string;
  updated_at: string;
}

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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DISCRIMINATION_TYPES = [
  "Discrimination",
  "Harassment",
  "Hostile Work Environment",
  "Retaliation",
];

const WARNING_TYPES = new Set([
  "PIP Conversation",
  "HR Interaction",
  "Incident",
]);

interface DetectedPattern {
  type: "frequency" | "warning" | "people" | "gap" | "plan";
  label: string;
  detail: string;
}

interface Contradiction {
  type: "performance" | "shifting" | "exclusion" | "plan";
  detail: string;
}

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function parsePeople(peopleStr: string | null): string[] {
  if (!peopleStr) return [];
  return peopleStr
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

function resolveTypes(
  c: { case_types?: string[]; case_type?: string } | null
): string[] {
  if (!c) return ["General"];
  if (c.case_types && c.case_types.length > 0) return c.case_types;
  if (c.case_type) return [c.case_type];
  return ["General"];
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

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CaseFilePanelProps {
  cases: CaseBasic[];
  userId: string;
  subscription: SubscriptionInfo;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CaseFilePanel({
  cases,
  userId,
  subscription,
}: CaseFilePanelProps) {
  const supabase = createClient();
  const router = useRouter();
  const docRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);

  // State
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [records, setRecords] = useState<DocketRecord[]>([]);
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [activeTab, setActiveTab] = useState<"casefile" | "timeline" | "info">(
    "casefile"
  );
  const [loadingData, setLoadingData] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showCaseDropdown, setShowCaseDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-select case (restore from localStorage or default to first)
  useEffect(() => {
    if (cases.length === 0) return;
    const stored = localStorage.getItem("da-selected-case-id");
    if (stored && cases.some((c) => c.id === stored)) {
      setSelectedCaseId(stored);
    } else {
      setSelectedCaseId(cases[0].id);
    }
  }, [cases]);

  // Persist selected case to localStorage
  useEffect(() => {
    if (selectedCaseId) {
      localStorage.setItem("da-selected-case-id", selectedCaseId);
    }
  }, [selectedCaseId]);

  // Reset initial-load flag when case changes
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [selectedCaseId]);

  // Fetch case data when selection changes
  const fetchCaseData = useCallback(async () => {
    if (!selectedCaseId || !userId) return;

    // Only show loading spinner on the first fetch, not on interval refetches
    if (!hasFetchedRef.current) {
      setLoadingData(true);
    }

    const [caseRes, linksRes, vaultRes] = await Promise.all([
      supabase.from("cases").select("*").eq("id", selectedCaseId).single(),
      supabase
        .from("case_records")
        .select("record_id")
        .eq("case_id", selectedCaseId),
      supabase
        .from("vault_documents")
        .select("id, file_name, category, linked_record_id, created_at")
        .eq("user_id", userId),
    ]);

    if (caseRes.data) setCaseData(caseRes.data);
    if (vaultRes.data) setVaultDocs(vaultRes.data);

    // Fetch records linked to this case
    if (linksRes.data && linksRes.data.length > 0) {
      const recordIds = linksRes.data.map(
        (l: { record_id: string }) => l.record_id
      );
      const { data: recs } = await supabase
        .from("records")
        .select("*")
        .in("id", recordIds)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });
      if (recs) setRecords(recs);
      else setRecords([]);
    } else {
      setRecords([]);
    }

    setLoadingData(false);
    hasFetchedRef.current = true;
  }, [selectedCaseId, userId, supabase]);

  useEffect(() => {
    fetchCaseData();
  }, [fetchCaseData]);

  // Refresh data periodically (every 10 seconds) for "live" feel
  useEffect(() => {
    if (!selectedCaseId) return;
    const interval = setInterval(fetchCaseData, 10000);
    return () => clearInterval(interval);
  }, [selectedCaseId, fetchCaseData]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowCaseDropdown(false);
      }
    }
    if (showCaseDropdown) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showCaseDropdown]);

  // Computed
  const caseTypes = resolveTypes(caseData);
  const nonGeneralTypes = caseTypes.filter(
    (t) => t.toLowerCase() !== "general"
  );
  const showProtectedClasses =
    caseData &&
    (caseData.protected_classes ?? []).length > 0 &&
    caseTypes.some((t) => DISCRIMINATION_TYPES.includes(t));

  const peopleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      parsePeople(r.people).forEach((name) => {
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [records]);

  const linkedDocsCount = vaultDocs.filter(
    (d) =>
      d.linked_record_id &&
      records.some((r) => r.id === d.linked_record_id)
  ).length;

  const sortedDates = records.map((r) => r.date).sort();
  const firstDate = sortedDates.length > 0 ? sortedDates[0] : null;
  const lastDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

  const patterns = useMemo(() => detectPatterns(records), [records]);
  const contradictions = useMemo(() => detectContradictions(records), [records]);
  const linkedDocsMap = useMemo(() => {
    const map: Record<string, VaultDocument[]> = {};
    vaultDocs.forEach((doc) => { if (doc.linked_record_id) { if (!map[doc.linked_record_id]) map[doc.linked_record_id] = []; map[doc.linked_record_id].push(doc); } });
    return map;
  }, [vaultDocs]);
  const linkedDocs = vaultDocs.filter((d) => d.linked_record_id && records.some((r) => r.id === d.linked_record_id));
  const keyDates = useMemo(() => records.filter((r) => WARNING_TYPES.has(r.entry_type)), [records]);

  // PDF export
  async function generatePdf() {
    const el = docRef.current;
    if (!el) return;
    setGeneratingPdf(true);

    // Temporarily position for A4 render
    const origStyle = el.style.cssText;
    el.style.position = "fixed";
    el.style.left = "0";
    el.style.top = "0";
    el.style.width = "720px";
    el.style.zIndex = "-1";
    el.style.opacity = "0";
    el.offsetHeight; // force reflow

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2pdf = (await import("html2pdf.js")).default as any;
      const today = new Date().toISOString().split("T")[0];
      const safeName = (caseData?.name || "Case").replace(/[^a-zA-Z0-9]/g, "-");
      await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename: `DocketAlly-${safeName}-${today}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(el)
        .save();
    } catch (err) {
      console.error("PDF generation error:", err);
    }

    el.style.cssText = origStyle;
    setGeneratingPdf(false);
  }

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  /* ---------------------------------------------------------------- */
  /*  Tab: Case File (Document Preview)                                */
  /* ---------------------------------------------------------------- */

  function renderCaseFileTab() {
    const today = new Date();
    const genDate = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const genTime = today.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const daySpan = firstDate && lastDate ? Math.round((new Date(lastDate + "T00:00:00").getTime() - new Date(firstDate + "T00:00:00").getTime()) / 86400000) : 0;

    const caseName = caseData?.name || "Case File";
    const pdfSubtitle = nonGeneralTypes.length > 0 ? `${nonGeneralTypes.join(" \u00b7 ")} Case File` : "Case File";
    const pdfProtectedClasses = (caseData?.protected_classes ?? []).length > 0 ? (caseData?.protected_classes ?? []).join(", ") : null;

    const dLabel: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#292524", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 };

    const sectionHeading = (num: number, title: string) => (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#22C55E" }}>{num}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#292524", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</span>
        </div>
        <div style={{ width: 28, height: 2.5, background: "#22C55E", borderRadius: 2 }} />
      </div>
    );

    const runningHeader = (
      <div style={{ marginBottom: 22 }}>
        <div style={{ height: 3, background: "#22C55E", marginBottom: 10 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid #D6D3D1" }}>
          <div>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 800, color: "#292524" }}>Docket</span>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 800, color: "#22C55E" }}>Ally</span>
          </div>
          <span style={{ fontSize: 11, color: "#44403C" }}>Confidential Case File</span>
        </div>
      </div>
    );

    const pageFooter = (
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "#78716C", paddingTop: 16, borderTop: "1px solid #D6D3D1", marginTop: 32 }}>
        <span>Generated {genDate} at {genTime}</span>
        <span>DocketAlly Confidential</span>
      </div>
    );

    return (
      <div ref={docRef} style={{ fontFamily: "var(--font-sans)", color: "#292524", lineHeight: 1.6 }}>
        {/* Cover Page */}
        <div style={{ padding: "40px 28px 36px" }}>
          <div style={{ height: 3, background: "#22C55E", marginBottom: 32 }} />
          <div style={{ marginBottom: 56 }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 800, color: "#292524" }}>Docket</span>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 800, color: "#22C55E" }}>Ally</span>
            <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
              <div style={{ width: 20, height: 2.5, background: "#22C55E", borderRadius: 2 }} />
              <div style={{ width: 20, height: 2.5, background: "#22C55E", borderRadius: 2 }} />
            </div>
          </div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 36, fontWeight: 900, color: "#292524", lineHeight: 1.1, marginBottom: 10 }}>{caseName}</h1>
          <div style={{ width: 32, height: 2.5, background: "#22C55E", borderRadius: 2, marginBottom: 12 }} />
          <p style={{ fontSize: 15, color: "#292524", marginBottom: pdfProtectedClasses ? 6 : 40 }}>{pdfSubtitle}</p>
          {pdfProtectedClasses && (
            <p style={{ fontSize: 12, color: "#57534E", marginBottom: 40 }}>Protected Classes: {pdfProtectedClasses}</p>
          )}
          <div>
            {[
              { l: "Employer", v: caseData?.employer || "-" },
              { l: "Role", v: caseData?.role || "-" },
              { l: "Documentation period", v: firstDate && lastDate ? `${formatDate(firstDate)} to ${formatDate(lastDate)}` : "-" },
              { l: "Records", v: records.length > 0 ? `${records.length} entr${records.length !== 1 ? "ies" : "y"} over ${daySpan} days` : "-" },
              { l: "Patterns identified", v: String(patterns.length + contradictions.length) },
              { l: "Attachments", v: `${linkedDocs.length} file${linkedDocs.length !== 1 ? "s" : ""} referenced` },
            ].map((row) => (
              <div key={row.l} style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #F5F5F4" }}>
                <div style={{ width: 140, fontSize: 11, color: "#292524", flexShrink: 0 }}>{row.l}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{row.v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 48 }}>
            <div style={{ height: 1, background: "#FECACA", opacity: 0.5, marginBottom: 12 }} />
            <p style={{ fontSize: 9.5, color: "#292524", lineHeight: 1.6 }}>
              This document was generated by DocketAlly. It contains user-created records and is not legal advice.<br />
              DocketAlly provides documentation and risk awareness tools. Consult an employment attorney for legal guidance.
            </p>
          </div>
        </div>

        {/* Table of Contents */}
        <div style={{ padding: "0 28px 36px", borderTop: "1px solid #E7E5E4" }}>
          <div style={{ paddingTop: 28 }}>{runningHeader}</div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Contents</h2>
          {[
            { n: 1, t: "Case Summary" },
            { n: 2, t: "Key Dates" },
            { n: 3, t: `Complete Timeline (${records.length} records)` },
            { n: 4, t: `Pattern Analysis (${patterns.length + contradictions.length} patterns)` },
            { n: 5, t: "Attachments Index" },
          ].map((item) => (
            <div key={item.n} style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F5F5F4" }}>
              <span style={{ width: 36, fontSize: 14, fontWeight: 700, color: "#22C55E" }}>{item.n}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{item.t}</span>
            </div>
          ))}
          {pageFooter}
        </div>

        {/* 1. Case Summary */}
        <div style={{ padding: "0 28px 36px", borderTop: "1px solid #E7E5E4" }}>
          <div style={{ paddingTop: 28 }}>{runningHeader}</div>
          {sectionHeading(1, "CASE SUMMARY")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            {[
              { l: "Employer", v: caseData?.employer || "-" },
              { l: "Role", v: caseData?.role || "-" },
              { l: "Start Date", v: caseData?.start_date ? formatDate(caseData.start_date) : "-" },
              { l: "Department", v: caseData?.department || "-" },
              { l: "Location", v: caseData?.location || "-" },
              { l: "Key People", v: caseData?.key_people || "-" },
            ].map((item, i) => (
              <div key={item.l} style={{ padding: "12px 0", borderBottom: "1px solid #F5F5F4", paddingRight: i % 2 === 0 ? 16 : 0 }}>
                <div style={dLabel}>{item.l}</div>
                <div style={{ fontSize: 12.5 }}>{item.v}</div>
              </div>
            ))}
          </div>
          {caseData?.description && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Situation</h3>
              <p style={{ fontSize: 12.5, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{caseData.description}</p>
            </div>
          )}
          {pageFooter}
        </div>

        {/* 2. Key Dates */}
        {keyDates.length > 0 && (
          <div style={{ padding: "0 28px 36px", borderTop: "1px solid #E7E5E4" }}>
            <div style={{ paddingTop: 28 }}>{runningHeader}</div>
            {sectionHeading(2, "KEY DATES")}
            {keyDates.map((record) => (
              <div key={record.id} style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #F5F5F4", gap: 16 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 700, color: "#22C55E", whiteSpace: "nowrap", minWidth: 140 }}>
                  {new Date(record.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  {record.time && ` \u00b7 ${formatTime(record.time)}`}
                </span>
                <span style={{ fontSize: 12 }}>{record.title}</span>
              </div>
            ))}
            {pageFooter}
          </div>
        )}

        {/* 3. Complete Timeline */}
        <div style={{ padding: "0 28px 36px", borderTop: "1px solid #E7E5E4" }}>
          <div style={{ paddingTop: 28 }}>{runningHeader}</div>
          {sectionHeading(3, "COMPLETE TIMELINE")}
          <p style={{ fontSize: 11, color: "#292524", lineHeight: 1.6, marginBottom: 20 }}>All records in chronological order.</p>
          {records.map((record) => {
            const docsForRecord = linkedDocsMap[record.id] || [];
            return (
              <div key={record.id} style={{ borderLeft: "3px solid #22C55E", paddingLeft: 18, marginBottom: 22 }}>
                <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color: "#22C55E", marginBottom: 3 }}>
                  {new Date(record.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  {record.time && ` \u00b7 ${formatTime(record.time)}`}
                </div>
                <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{record.entry_type}</span>
                  {record.people && <span style={{ fontSize: 11, color: "#292524" }}>{record.people}</span>}
                  {WARNING_TYPES.has(record.entry_type) && <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 600 }}>[Escalation]</span>}
                </div>
                <div style={dLabel}>WHAT HAPPENED</div>
                <div style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 10 }}>{renderMarkdown(record.narrative)}</div>
                {record.facts && (<><div style={dLabel}>ADDITIONAL CONTEXT</div><div style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 10 }}>{renderMarkdown(record.facts)}</div></>)}
                {record.follow_up && (<><div style={{ ...dLabel, color: "#22C55E" }}>NEXT STEPS</div><div style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 10 }}>{renderMarkdown(record.follow_up)}</div></>)}
                {docsForRecord.length > 0 && (<><div style={dLabel}>ATTACHMENTS</div><p style={{ fontSize: 12 }}>{docsForRecord.map((d) => d.file_name).join(", ")}</p></>)}
              </div>
            );
          })}
          {pageFooter}
        </div>

        {/* 4. Pattern Analysis */}
        {(patterns.length > 0 || contradictions.length > 0) && (
          <div style={{ padding: "0 28px 36px", borderTop: "1px solid #E7E5E4" }}>
            <div style={{ paddingTop: 28 }}>{runningHeader}</div>
            {sectionHeading(4, "PATTERN ANALYSIS")}
            <p style={{ fontSize: 11, color: "#292524", lineHeight: 1.6, marginBottom: 20 }}>Patterns are recurring themes identified across multiple records.</p>
            {patterns.map((pattern, idx) => (
              <div key={`p-${idx}`} style={{ borderLeft: "3px solid #22C55E", paddingLeft: 18, marginBottom: 20 }}>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 700 }}>{pattern.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#22C55E", marginLeft: 10 }}>[{pattern.type === "plan" ? "Plan Pattern" : "Notable Pattern"}]</span>
                </div>
                <p style={{ fontSize: 12, lineHeight: 1.7 }}>{pattern.detail}</p>
              </div>
            ))}
            {contradictions.map((c, idx) => (
              <div key={`c-${idx}`} style={{ borderLeft: "3px solid #F59E0B", paddingLeft: 18, marginBottom: 20 }}>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 700 }}>
                    {c.type === "performance" ? "Contradictory Performance Signals" : c.type === "shifting" ? "Shifting Expectations" : c.type === "exclusion" ? "Post-Complaint Changes" : "Plan Contradiction"}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#F59E0B", marginLeft: 10 }}>[Potential Contradiction]</span>
                </div>
                <p style={{ fontSize: 12, lineHeight: 1.7 }}>{c.detail}</p>
              </div>
            ))}
            {pageFooter}
          </div>
        )}

        {/* 5. Attachments Index */}
        {linkedDocs.length > 0 && (
          <div style={{ padding: "0 28px 36px", borderTop: "1px solid #E7E5E4" }}>
            <div style={{ paddingTop: 28 }}>{runningHeader}</div>
            {sectionHeading(5, "ATTACHMENTS INDEX")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", borderBottom: "2px solid #292524", padding: "8px 0" }}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>File</span>
              <span style={{ fontSize: 11, fontWeight: 700 }}>Record Date</span>
            </div>
            {linkedDocs.map((doc) => {
              const record = records.find((r) => r.id === doc.linked_record_id);
              return (
                <div key={doc.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px", borderBottom: "1px solid #F5F5F4", padding: "8px 0" }}>
                  <span style={{ fontSize: 11, color: "#22C55E", fontWeight: 600 }}>{doc.file_name}</span>
                  <span style={{ fontSize: 11 }}>{record ? formatDatetime(record) : "-"}</span>
                </div>
              );
            })}
            {pageFooter}
          </div>
        )}

        {/* End Disclaimer */}
        <div style={{ padding: "20px 28px 32px", borderTop: "1px solid #D6D3D1" }}>
          <p style={{ fontSize: 9.5, color: "#292524", lineHeight: 1.6 }}>
            End of case file. This document was generated by DocketAlly from user-created records. It is not legal advice.
            DocketAlly provides documentation and risk awareness tools. Consult a qualified employment attorney for legal guidance specific to your situation.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Tab: Timeline (Compact)                                          */
  /* ---------------------------------------------------------------- */

  function renderTimelineTab() {
    if (records.length === 0) {
      return (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "#A8A29E",
            fontSize: 13,
          }}
        >
          No records assigned to this case.
        </div>
      );
    }

    return (
      <div style={{ padding: "16px 20px" }}>
        {records.map((record) => {
          const isEscalation = WARNING_TYPES.has(record.entry_type);
          const people = parsePeople(record.people);

          return (
            <div
              key={record.id}
              style={{
                display: "flex",
                gap: 12,
                padding: "12px 0",
                borderBottom: "1px solid #F5F5F4",
              }}
            >
              {/* Date column */}
              <div
                style={{
                  width: 60,
                  flexShrink: 0,
                  textAlign: "right",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#292524",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {new Date(record.date + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" }
                  )}
                </div>
                {record.time && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#A8A29E",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {formatTime(record.time)}
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#292524",
                    fontFamily: "var(--font-serif)",
                    lineHeight: 1.3,
                    marginBottom: 4,
                  }}
                >
                  {record.title}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "1px 6px",
                      borderRadius: 4,
                      fontSize: 8,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: isEscalation ? "#DC2626" : "#15803D",
                      background: isEscalation ? "#FEF2F2" : "#F0FDF4",
                      border: isEscalation
                        ? "1px solid #FECACA"
                        : "1px solid #BBF7D0",
                    }}
                  >
                    {record.entry_type}
                  </span>
                  {/* Stacked avatars */}
                  {people.length > 0 && (
                    <div style={{ display: "flex", marginLeft: 2 }}>
                      {people.slice(0, 3).map((person, i) => (
                        <span
                          key={i}
                          title={person}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#A8A29E",
                            color: "#fff",
                            fontSize: 7,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-mono)",
                            border: "1.5px solid #fff",
                            marginLeft: i > 0 ? -6 : 0,
                          }}
                        >
                          {getInitials(person)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Tab: Info (Read-only)                                            */
  /* ---------------------------------------------------------------- */

  function renderInfoTab() {
    if (!caseData) {
      return (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "#A8A29E",
            fontSize: 13,
          }}
        >
          Loading case info...
        </div>
      );
    }

    const infoRows: { label: string; value: React.ReactNode }[] = [
      { label: "Case Name", value: caseData.name },
      {
        label: "Case Type",
        value: (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {caseTypes.map((t) => (
              <span
                key={t}
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  color: "#57534E",
                  background: "#FAFAF9",
                  border: "1px solid #D6D3D1",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        ),
      },
    ];

    if (showProtectedClasses) {
      infoRows.push({
        label: "Protected Classes",
        value: (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(caseData.protected_classes ?? []).map((pc) => (
              <span
                key={pc}
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  color: "#15803D",
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                }}
              >
                {pc}
              </span>
            ))}
          </div>
        ),
      });
    }

    infoRows.push(
      { label: "Employer", value: caseData.employer || "--" },
      { label: "Role", value: caseData.role || "--" },
      { label: "Department", value: caseData.department || "--" },
      { label: "Location", value: caseData.location || "--" },
      {
        label: "Start Date",
        value: caseData.start_date ? formatDate(caseData.start_date) : "--",
      },
      { label: "Status", value: caseData.status || "Active" }
    );

    if (caseData.description) {
      infoRows.push({
        label: "Description",
        value: caseData.description,
      });
    }

    return (
      <div style={{ padding: "16px 20px" }}>
        {infoRows.map((row) => (
          <div
            key={row.label}
            style={{
              padding: "10px 0",
              borderBottom: "1px solid #F5F5F4",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 700,
                color: "#78716C",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
              }}
            >
              {row.label}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#292524",
                lineHeight: 1.5,
              }}
            >
              {row.value}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */

  const tabs = [
    { key: "casefile" as const, label: "Case File" },
    { key: "timeline" as const, label: "Timeline" },
    { key: "info" as const, label: "Info" },
  ];

  // Empty state — always render the panel wrapper to hold its 420px space
  if (!cases || cases.length === 0) {
    return (
      <div className="da-casefile-panel">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            padding: 32,
            textAlign: "center",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#D6D3D1"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: 12 }}
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 16,
              fontWeight: 600,
              color: "#292524",
              marginBottom: 6,
            }}
          >
            No cases yet
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#A8A29E",
              lineHeight: 1.5,
              marginBottom: 20,
            }}
          >
            Create a case to see your file build in real time as you document.
          </div>
          <button
            onClick={() => router.push("/dashboard/cases")}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background: "#22C55E",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
            }}
          >
            + New Case
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="da-casefile-panel">
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: "14px 16px 10px",
          borderBottom: "1px solid #E7E5E4",
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
              flex: 1,
            }}
          >
            {/* Green dot */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22C55E",
                flexShrink: 0,
                boxShadow: "0 0 6px rgba(34,197,94,0.4)",
              }}
            />
            {/* Case name / switcher */}
            {cases.length > 1 ? (
              <div style={{ position: "relative", minWidth: 0 }} ref={dropdownRef}>
                <button
                  onClick={() => setShowCaseDropdown(!showCaseDropdown)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#292524",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selectedCase?.name || "Select Case"}
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#78716C"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {showCaseDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: 4,
                      background: "#fff",
                      borderRadius: 10,
                      border: "1px solid #E7E5E4",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                      zIndex: 20,
                      minWidth: 200,
                      maxHeight: 240,
                      overflow: "auto",
                      padding: "4px 0",
                    }}
                  >
                    {cases.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCaseId(c.id);
                          setShowCaseDropdown(false);
                          setActiveTab("casefile");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          width: "100%",
                          padding: "8px 14px",
                          background:
                            c.id === selectedCaseId
                              ? "#F0FDF4"
                              : "none",
                          border: "none",
                          fontSize: 13,
                          fontFamily: "var(--font-sans)",
                          color:
                            c.id === selectedCaseId
                              ? "#15803D"
                              : "#44403C",
                          cursor: "pointer",
                          textAlign: "left",
                          fontWeight: c.id === selectedCaseId ? 600 : 400,
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#292524",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {selectedCase?.name || "Case File"}
              </span>
            )}
          </div>

          {/* PDF button */}
          <button
            onClick={generatePdf}
            disabled={generatingPdf || records.length === 0}
            title="Export PDF"
            style={{
              background: "none",
              border: "1px solid #E7E5E4",
              borderRadius: 6,
              cursor:
                generatingPdf || records.length === 0
                  ? "not-allowed"
                  : "pointer",
              padding: "5px 8px",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
              color: "#78716C",
              opacity: generatingPdf || records.length === 0 ? 0.4 : 1,
            }}
          >
            <svg
              width="12"
              height="12"
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
            {generatingPdf ? "..." : "PDF"}
          </button>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: 0,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontFamily: "var(--font-sans)",
                color:
                  activeTab === tab.key ? "#22C55E" : "#78716C",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid #22C55E"
                    : "2px solid transparent",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="da-casefile-panel-content">
        {loadingData ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#A8A29E",
              fontSize: 13,
            }}
          >
            Loading...
          </div>
        ) : activeTab === "casefile" ? (
          renderCaseFileTab()
        ) : activeTab === "timeline" ? (
          renderTimelineTab()
        ) : (
          renderInfoTab()
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          padding: "8px 16px",
          borderTop: "1px solid #E7E5E4",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#22C55E",
              animation: "entryPulse 3s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: 10.5,
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              color: "#22C55E",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Live
          </span>
        </div>
        <span
          style={{
            fontSize: 10.5,
            fontFamily: "var(--font-mono)",
            color: "#A8A29E",
          }}
        >
          {records.length} record{records.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
