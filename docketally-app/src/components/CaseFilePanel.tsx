"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

  // Auto-select case
  useEffect(() => {
    if (cases.length === 1) {
      setSelectedCaseId(cases[0].id);
    } else if (cases.length > 1 && !selectedCaseId) {
      setSelectedCaseId(cases[0].id);
    }
  }, [cases, selectedCaseId]);

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

  const firstDate = records.length > 0 ? records[0].date : null;
  const lastDate = records.length > 0 ? records[records.length - 1].date : null;

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
    return (
      <div style={{ padding: 20 }}>
        {/* Document card */}
        <div
          ref={docRef}
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #E7E5E4",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          {/* Green header bar */}
          <div
            style={{
              height: 4,
              background: "#22C55E",
              width: "70%",
            }}
          />

          <div style={{ padding: "28px 24px" }}>
            {/* Logo */}
            <div style={{ marginBottom: 20 }}>
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#292524",
                }}
              >
                Docket
              </span>
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#22C55E",
                }}
              >
                Ally
              </span>
            </div>

            {/* Case name */}
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 28,
                fontWeight: 700,
                color: "#292524",
                lineHeight: 1.15,
                marginBottom: 6,
              }}
            >
              {caseData?.name || "Case File"}
            </h2>

            {/* Case type subtitle */}
            {nonGeneralTypes.length > 0 && (
              <p
                style={{
                  fontSize: 13,
                  color: "#57534E",
                  marginBottom: showProtectedClasses ? 4 : 20,
                }}
              >
                {nonGeneralTypes.join(" \u00b7 ")} Case File
              </p>
            )}

            {/* Protected classes */}
            {showProtectedClasses && (
              <p
                style={{
                  fontSize: 11.5,
                  color: "#78716C",
                  marginBottom: 20,
                }}
              >
                Protected Classes:{" "}
                {(caseData?.protected_classes ?? []).join(", ")}
              </p>
            )}

            {/* Details table */}
            <div
              style={{
                borderTop: "1px solid #F5F5F4",
                marginBottom: 28,
              }}
            >
              {[
                {
                  label: "Employer",
                  value: caseData?.employer || "--",
                },
                { label: "Role", value: caseData?.role || "--" },
                {
                  label: "Period",
                  value:
                    firstDate && lastDate
                      ? `${formatDate(firstDate)} - ${formatDate(lastDate)}`
                      : "--",
                },
                {
                  label: "Records",
                  value: String(records.length),
                },
                {
                  label: "Key People",
                  value: String(peopleCounts.length),
                },
                {
                  label: "Attachments",
                  value: String(linkedDocsCount),
                },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    padding: "8px 0",
                    borderBottom: "1px solid #F5F5F4",
                    fontSize: 12.5,
                  }}
                >
                  <span
                    style={{
                      width: 100,
                      color: "#78716C",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      flexShrink: 0,
                      paddingTop: 1,
                    }}
                  >
                    {row.label}
                  </span>
                  <span
                    style={{
                      color: "#292524",
                      fontWeight: 500,
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Documented Timeline */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#292524",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 16,
                }}
              >
                Documented Timeline
              </div>

              {records.length === 0 ? (
                <p
                  style={{
                    fontSize: 13,
                    color: "#A8A29E",
                    fontStyle: "italic",
                    padding: "12px 0",
                  }}
                >
                  No records assigned to this case yet.
                </p>
              ) : (
                <div style={{ position: "relative", paddingLeft: 20 }}>
                  {/* Vertical timeline line */}
                  <div
                    style={{
                      position: "absolute",
                      left: 5,
                      top: 6,
                      bottom: 6,
                      width: 2,
                      background: "#E7E5E4",
                      borderRadius: 1,
                    }}
                  />

                  {records.map((record, idx) => {
                    const isNewest = idx === records.length - 1;
                    const isEscalation = WARNING_TYPES.has(record.entry_type);
                    const people = parsePeople(record.people);

                    return (
                      <div
                        key={record.id}
                        style={{
                          position: "relative",
                          paddingBottom: idx < records.length - 1 ? 16 : 0,
                          animation: isNewest
                            ? "entryPulse 2s ease-out"
                            : undefined,
                          borderRadius: 6,
                          padding: "8px 0 8px 8px",
                        }}
                      >
                        {/* Timeline dot */}
                        <div
                          style={{
                            position: "absolute",
                            left: -17,
                            top: 12,
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: isEscalation ? "#DC2626" : "#22C55E",
                            border: "2px solid #fff",
                            boxShadow: "0 0 0 1px #E7E5E4",
                          }}
                        />

                        {/* Date */}
                        <div
                          style={{
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                            color: "#A8A29E",
                            fontWeight: 600,
                            marginBottom: 3,
                          }}
                        >
                          {formatDate(record.date)}
                          {record.time && ` \u00b7 ${formatTime(record.time)}`}
                        </div>

                        {/* Type badge + title */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 7px",
                              borderRadius: 4,
                              fontSize: 8.5,
                              fontWeight: 700,
                              fontFamily: "var(--font-mono)",
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              color: isEscalation ? "#DC2626" : "#15803D",
                              background: isEscalation ? "#FEF2F2" : "#F0FDF4",
                              border: isEscalation
                                ? "1px solid #FECACA"
                                : "1px solid #BBF7D0",
                            }}
                          >
                            {record.entry_type}
                          </span>
                        </div>

                        {/* Title */}
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

                        {/* 2-line narrative preview */}
                        <div
                          style={{
                            fontSize: 12,
                            color: "#78716C",
                            lineHeight: 1.5,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical" as never,
                            overflow: "hidden",
                            marginBottom: people.length > 0 ? 6 : 0,
                          }}
                        >
                          {record.narrative}
                        </div>

                        {/* People */}
                        {people.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              flexWrap: "wrap",
                            }}
                          >
                            {people.slice(0, 3).map((person, i) => (
                              <span
                                key={i}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2px 8px 2px 2px",
                                  borderRadius: 12,
                                  background: "#FAFAF9",
                                  border: "1px solid #E7E5E4",
                                  fontSize: 10.5,
                                  color: "#57534E",
                                  fontWeight: 500,
                                }}
                              >
                                <span
                                  style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: "50%",
                                    background: "#A8A29E",
                                    color: "#fff",
                                    fontSize: 7,
                                    fontWeight: 700,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontFamily: "var(--font-mono)",
                                  }}
                                >
                                  {getInitials(person)}
                                </span>
                                {person}
                              </span>
                            ))}
                            {people.length > 3 && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "#A8A29E",
                                  alignSelf: "center",
                                }}
                              >
                                +{people.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Key People */}
            {peopleCounts.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#292524",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  Key People
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {peopleCounts.map(([name, count]) => (
                    <div
                      key={name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "#A8A29E",
                            color: "#fff",
                            fontSize: 8,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {getInitials(name)}
                        </span>
                        <span style={{ fontWeight: 500, color: "#44403C" }}>
                          {name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10.5,
                          color: "#A8A29E",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {count} record{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                borderTop: "1px solid #F5F5F4",
                paddingTop: 16,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "#A8A29E",
              }}
            >
              <span>Generated by DocketAlly</span>
              <span>Confidential</span>
            </div>
          </div>
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
