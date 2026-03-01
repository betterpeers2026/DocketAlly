"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SubscriptionInfo } from "@/lib/subscription";
import CaseFileDocument from "@/components/CaseFileDocument";

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
  impact_statement: string | null;
  case_theory_protected_activity: string | null;
  case_theory_employer_response: string | null;
  case_theory_connection: string | null;
  case_theory_outcome: string | null;
  case_status: string | null;
  employment_end_date: string | null;
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

interface Plan {
  id: string;
  user_id: string;
  name: string;
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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planGoals, setPlanGoals] = useState<PlanGoal[]>([]);
  const [planCheckins, setPlanCheckins] = useState<PlanCheckin[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingPacket, setGeneratingPacket] = useState(false);
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
        .select("id, file_name, file_url, category, linked_record_id, created_at")
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

    // Fetch plans linked to this case + their goals and check-ins
    const { data: plansData } = await supabase
      .from("plans")
      .select("*")
      .eq("case_id", selectedCaseId)
      .order("start_date", { ascending: true });
    if (plansData && plansData.length > 0) {
      setPlans(plansData);
      const planIds = plansData.map((p: Plan) => p.id);
      const [goalsRes, checkinsRes] = await Promise.all([
        supabase.from("plan_goals").select("*").in("plan_id", planIds),
        supabase.from("plan_checkins").select("*").in("plan_id", planIds),
      ]);
      if (goalsRes.data) setPlanGoals(goalsRes.data);
      else setPlanGoals([]);
      if (checkinsRes.data) setPlanCheckins(checkinsRes.data);
      else setPlanCheckins([]);
    } else {
      setPlans([]);
      setPlanGoals([]);
      setPlanCheckins([]);
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
  const showProtectedClasses =
    caseData &&
    (caseData.protected_classes ?? []).length > 0 &&
    caseTypes.some((t) => DISCRIMINATION_TYPES.includes(t));

  const patterns = useMemo(() => detectPatterns(records), [records]);
  const contradictions = useMemo(() => detectContradictions(records), [records]);
  const linkedDocsMap = useMemo(() => {
    const map: Record<string, VaultDocument[]> = {};
    vaultDocs.forEach((doc) => { if (doc.linked_record_id) { if (!map[doc.linked_record_id]) map[doc.linked_record_id] = []; map[doc.linked_record_id].push(doc); } });
    return map;
  }, [vaultDocs]);
  const keyDates = useMemo(() => records.filter((r) => WARNING_TYPES.has(r.entry_type)), [records]);

  // PDF export
  async function generatePdf() {
    const el = docRef.current;
    if (!el) return;
    setGeneratingPdf(true);
    // The docRef wraps the visible CaseFileDocument. Its parent applies a CSS
    // scale(0.72) transform for the panel preview. We temporarily undo the
    // transform and remove overflow constraints so html2canvas captures the
    // full-size document.
    const parent = el.parentElement;
    const prevParentStyle = parent ? parent.style.cssText : "";
    if (parent) { parent.style.transform = "none"; parent.style.width = "720px"; }
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
      await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename: `DocketAlly-${safeName}-${today}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowWidth: 720 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(el)
        .save();
    } catch (err) {
      console.error("PDF generation error:", err);
    }
    // Restore original styles
    el.style.overflow = prevOverflow;
    el.style.maxHeight = prevMaxHeight;
    if (parent) { parent.style.cssText = prevParentStyle; }
    setGeneratingPdf(false);
  }

  // Attorney Packet (ZIP) generation
  async function generatePacket() {
    const el = docRef.current;
    if (!el) return;
    setGeneratingPacket(true);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const today = new Date().toISOString().split("T")[0];
      const safeName = (caseData?.name || "Case").replace(/[^a-zA-Z0-9]/g, "-");
      const folderName = `DocketAlly-${safeName}-${today}`;
      const folder = zip.folder(folderName)!;

      /* --- 1. Generate PDF in memory --- */
      const parent = el.parentElement;
      const prevParentStyle = parent ? parent.style.cssText : "";
      if (parent) { parent.style.transform = "none"; parent.style.width = "720px"; }
      const prevOverflow = el.style.overflow;
      const prevMaxHeight = el.style.maxHeight;
      el.style.overflow = "visible";
      el.style.maxHeight = "none";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import("html2pdf.js");
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
      if (parent) { parent.style.cssText = prevParentStyle; }

      folder.file(`Case-File-${safeName}.pdf`, pdfBlob);

      /* --- 2. Compute exhibit letters (same logic as CaseFileDocument) --- */
      const caseRecordIds = new Set(records.map((r) => r.id));
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
      const evidenceFolder = folder.folder("Evidence")!;
      let evidenceCount = 0;

      // Only include vault files linked to records in THIS case
      const caseLinkedDocs = vaultDocs.filter(
        (d) => d.file_url && d.linked_record_id && caseRecordIds.has(d.linked_record_id)
      );

      console.log("[Packet] Case records:", caseRecordIds.size);
      console.log("[Packet] Vault docs linked to case records:", caseLinkedDocs.length);
      console.log("[Packet] Exhibit map entries:", exhibitMap.size);

      for (const doc of caseLinkedDocs) {
        const letter = exhibitMap.get(doc.id);
        if (!letter) continue;
        const ext = doc.file_name.includes(".") ? doc.file_name.substring(doc.file_name.lastIndexOf(".")) : "";
        const baseName = doc.file_name.includes(".")
          ? doc.file_name.substring(0, doc.file_name.lastIndexOf("."))
          : doc.file_name;
        const safeBase = baseName.replace(/[^a-zA-Z0-9_\-. ]/g, "_");
        const fileName = `Ex-${letter}_${safeBase}${ext}`;

        console.log(`[Packet] Downloading exhibit ${letter}: ${doc.file_name} from storage path: ${doc.file_url}`);
        try {
          const { data, error } = await supabase.storage
            .from("vault-files")
            .download(doc.file_url);
          if (error || !data) {
            console.error(`[Packet] Failed to download ${doc.file_name}:`, error);
            continue;
          }
          evidenceFolder.file(fileName, data);
          evidenceCount++;
        } catch (err) {
          console.error(`[Packet] Error fetching ${doc.file_name}:`, err);
        }
      }

      // Fallback: if no linked files, include ALL vault files with "Unlinked-" prefix
      if (evidenceCount === 0 && vaultDocs.length > 0) {
        console.log(`[Packet] No linked exhibits found. Including all ${vaultDocs.length} vault files as unlinked.`);
        for (const doc of vaultDocs) {
          if (!doc.file_url) continue;
          const ext = doc.file_name.includes(".") ? doc.file_name.substring(doc.file_name.lastIndexOf(".")) : "";
          const baseName = doc.file_name.includes(".")
            ? doc.file_name.substring(0, doc.file_name.lastIndexOf("."))
            : doc.file_name;
          const safeBase = baseName.replace(/[^a-zA-Z0-9_\-. ]/g, "_");
          const fileName = `Unlinked-${safeBase}${ext}`;

          try {
            const { data, error } = await supabase.storage
              .from("vault-files")
              .download(doc.file_url);
            if (error || !data) {
              console.error(`[Packet] Failed to download unlinked ${doc.file_name}:`, error);
              continue;
            }
            evidenceFolder.file(fileName, data);
          } catch (err) {
            console.error(`[Packet] Error fetching unlinked ${doc.file_name}:`, err);
          }
        }
      }

      /* --- 4. README.txt --- */
      const caseName = caseData?.name || "Case";
      const readmeText = `Attorney Packet: ${caseName}
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
    }

    setGeneratingPacket(false);
  }

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  /* ---------------------------------------------------------------- */
  /*  Tab: Case File (Document Preview)                                */
  /* ---------------------------------------------------------------- */

  const emptyStarredIds = useMemo(() => new Set<string>(), []);

  function renderCaseFileTab() {
    return (
      <div style={{ transformOrigin: "top left", transform: "scale(0.72)", width: "138.9%" }}>
        <div ref={docRef}>
          <CaseFileDocument
            records={records}
            vaultDocs={vaultDocs}
            patterns={patterns}
            contradictions={contradictions}
            linkedDocsMap={linkedDocsMap}
            caseData={caseData}
            starredIds={emptyStarredIds}
            keyDates={keyDates}
            plans={plans}
            planGoals={planGoals}
            planCheckins={planCheckins}
          />
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
                    fontFamily: "var(--font-sans)",
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
                            background: "#1c1917",
                            color: "#22C55E",
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

    if (caseData.impact_statement) {
      infoRows.push({
        label: "Impact Statement",
        value: caseData.impact_statement,
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
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              fontWeight: 600,
              color: "#292524",
              marginBottom: 6,
            }}
          >
            Create a case to start building your file
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#A8A29E",
              lineHeight: 1.5,
              marginBottom: 20,
            }}
          >
            A case groups your records into a single narrative, like a folder
            for everything related to one workplace situation.
          </div>
          <button
            onClick={() => router.push("/dashboard/case")}
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
            Create Case
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
                      fontFamily: "var(--font-sans)",
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
                  fontFamily: "var(--font-sans)",
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

          {/* Export buttons */}
          <div style={{ display: "flex", gap: 4 }}>
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
            <button
              onClick={generatePacket}
              disabled={generatingPacket || records.length === 0}
              title="Download Attorney Packet (ZIP)"
              style={{
                background: "none",
                border: "1px solid #E7E5E4",
                borderRadius: 6,
                cursor:
                  generatingPacket || records.length === 0
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
                opacity: generatingPacket || records.length === 0 ? 0.4 : 1,
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
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
              {generatingPacket ? "..." : "Packet"}
            </button>
          </div>
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
