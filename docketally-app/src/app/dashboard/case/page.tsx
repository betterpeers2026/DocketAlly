"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RichTextarea from "@/components/RichTextarea";
import { renderMarkdown } from "@/lib/renderMarkdown";
import { useSubscription } from "@/components/SubscriptionProvider";
import { hasActiveAccess } from "@/lib/subscription";
import ProGate from "@/components/ProGate";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Case {
  id: string;
  user_id: string;
  name: string;
  case_type: string;
  case_types: string[];
  status: string;
  description: string | null;
  start_date: string | null;
  created_at: string;
  updated_at: string;
}

interface CaseFormData {
  name: string;
  case_types: string[];
  status: string;
  description: string;
  start_date: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

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

function resolveTypes(c: { case_types?: string[]; case_type?: string }): string[] {
  if (c.case_types && c.case_types.length > 0) return c.case_types;
  if (c.case_type) return [c.case_type];
  return ["General"];
}

const STATUS_OPTIONS = ["Active", "Resolved", "Archived"];

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

const EMPTY_FORM: CaseFormData = {
  name: "",
  case_types: [],
  status: "Active",
  description: "",
  start_date: todayStr(),
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CaseViewPage() {
  const subscription = useSubscription();
  if (!hasActiveAccess(subscription)) return <ProGate feature="Cases" />;

  const supabase = createClient();
  const router = useRouter();

  // Auth
  const [userId, setUserId] = useState<string | null>(null);

  // Data
  const [cases, setCases] = useState<Case[]>([]);
  const [caseStats, setCaseStats] = useState<Record<string, { recordCount: number; people: string[]; daySpan: number }>>({});

  // UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);


  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Form
  const [formData, setFormData] = useState<CaseFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // Ref for menu outside-click
  const menuRef = useRef<HTMLDivElement>(null);

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchCases = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCases(data);
    }
    setLoading(false);
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
    if (userId) fetchCases();
  }, [userId, fetchCases]);

  // Fetch per-case stats (record count, people, day span)
  useEffect(() => {
    async function fetchStats() {
      if (!userId || cases.length === 0) return;
      const caseIds = cases.map((c) => c.id);
      const { data: links } = await supabase
        .from("case_records")
        .select("case_id, record_id")
        .in("case_id", caseIds);
      if (!links || links.length === 0) return;
      const recordIds = [...new Set(links.map((l) => l.record_id))];
      const { data: records } = await supabase
        .from("records")
        .select("id, date, people")
        .in("id", recordIds);
      if (!records) return;
      const recordMap = new Map(records.map((r) => [r.id, r]));
      const stats: Record<string, { recordCount: number; people: string[]; daySpan: number }> = {};
      for (const caseId of caseIds) {
        const caseRecordIds = links.filter((l) => l.case_id === caseId).map((l) => l.record_id);
        const caseRecords = caseRecordIds.map((rid) => recordMap.get(rid)).filter(Boolean) as { id: string; date: string; people: string | null }[];
        const peopleSet = new Set<string>();
        caseRecords.forEach((r) => {
          if (r.people) r.people.split(",").forEach((p) => { const t = p.trim(); if (t) peopleSet.add(t); });
        });
        let daySpan = 0;
        if (caseRecords.length >= 2) {
          const dates = caseRecords.map((r) => new Date(r.date + "T00:00:00").getTime()).sort((a, b) => a - b);
          daySpan = Math.round((dates[dates.length - 1] - dates[0]) / 86400000);
        }
        stats[caseId] = { recordCount: caseRecords.length, people: [...peopleSet], daySpan };
      }
      setCaseStats(stats);
    }
    fetchStats();
  }, [userId, cases, supabase]);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  function resetForm() {
    setFormData({ ...EMPTY_FORM, start_date: todayStr() });
    setFormError("");
    setShowForm(false);
    setEditingCase(null);
  }

  function startEdit(c: Case) {
    setEditingCase(c);
    setFormData({
      name: c.name,
      case_types: resolveTypes(c),
      status: c.status.charAt(0).toUpperCase() + c.status.slice(1),
      description: c.description || "",
      start_date: c.start_date || todayStr(),
    });
    setFormError("");
    setShowForm(true);
    setMenuOpen(null);
  }

  function openNewForm() {
    setEditingCase(null);
    setFormData({ ...EMPTY_FORM, start_date: todayStr() });
    setFormError("");
    setShowForm(true);
  }

  /* ---------------------------------------------------------------- */
  /*  CRUD                                                             */
  /* ---------------------------------------------------------------- */

  async function handleCreate() {
    if (!userId) return;
    setSaving(true);
    setFormError("");

    const { data: newCase, error } = await supabase
      .from("cases")
      .insert({
        user_id: userId,
        name: formData.name.trim(),
        case_types: formData.case_types,
        case_type: formData.case_types[0] || "General",
        status: formData.status.toLowerCase(),
        description: formData.description.trim() || null,
        start_date: formData.start_date || null,
      })
      .select()
      .single();

    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }

    if (newCase) {
      setCases((prev) => [newCase, ...prev]);
    }
    resetForm();
    setSaving(false);
  }

  async function handleUpdate() {
    if (!editingCase || !userId) return;
    setSaving(true);
    setFormError("");

    const { data: updated, error } = await supabase
      .from("cases")
      .update({
        name: formData.name.trim(),
        case_types: formData.case_types,
        case_type: formData.case_types[0] || "General",
        status: formData.status.toLowerCase(),
        description: formData.description.trim() || null,
        start_date: formData.start_date || null,
      })
      .eq("id", editingCase.id)
      .select()
      .single();

    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }

    if (updated) {
      setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    }
    resetForm();
    setSaving(false);
  }

  async function handleDelete(caseId: string) {
    const { error } = await supabase
      .from("cases")
      .delete()
      .eq("id", caseId);

    if (!error) {
      setCases((prev) => prev.filter((c) => c.id !== caseId));
      setDeleteConfirm(null);
      setMenuOpen(null);
    }
  }

  async function handleArchive(caseId: string) {
    const { data: updated, error } = await supabase
      .from("cases")
      .update({ status: "archived" })
      .eq("id", caseId)
      .select()
      .single();

    if (!error && updated) {
      setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    }
    setMenuOpen(null);
  }


  /* ---------------------------------------------------------------- */
  /*  Filtering                                                        */
  /* ---------------------------------------------------------------- */

  const filteredCases = cases.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      !query ||
      c.name.toLowerCase().includes(query) ||
      (c.description && c.description.toLowerCase().includes(query))
    );
  });

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const formValid = formData.name.trim() && formData.case_types.length > 0;

  return (
    <div
      className="da-page-wrapper"
      style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}
    >
      {/* ---- FORM VIEW ---- */}
      {showForm ? (
        <div
          className="da-form-card"
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid var(--color-stone-300)",
            padding: "40px 36px",
          }}
        >
          {/* Form header */}
          <div
            className="da-form-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 32,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 22,
                fontWeight: 700,
                color: "#292524",
              }}
            >
              {editingCase ? "Edit Case" : "New Case"}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, color: "#78716C", fontFamily: "var(--font-sans)", fontStyle: "italic", display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                Private
              </span>
              <button
                className="da-form-header-cancel"
                onClick={resetForm}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #D6D3D1",
                  background: "#fff",
                  color: "#292524",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Case Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Case Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Name for this case"
              required
              style={inputStyle}
            />
          </div>

          {/* Case Type */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Case Type (select all that apply) *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CASE_TYPES.map((ct) => {
                const selected = formData.case_types.includes(ct);
                return (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => {
                        let next: string[];
                        if (selected) {
                          next = prev.case_types.filter((t) => t !== ct);
                        } else {
                          next = ct === "General"
                            ? ["General"]
                            : [...prev.case_types.filter((t) => t !== "General"), ct];
                        }
                        if (next.length === 0) next = ["General"];
                        return { ...prev, case_types: next };
                      });
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "var(--font-sans)",
                      cursor: "pointer",
                      border: selected ? "1px solid #BBF7D0" : "1px solid #E7E5E4",
                      background: selected ? "#F0FDF4" : "#FAFAF9",
                      color: selected ? "#15803D" : "#78716C",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!selected) { e.currentTarget.style.background = "#F5F5F4"; e.currentTarget.style.borderColor = "#D6D3D1"; } }}
                    onMouseLeave={(e) => { if (!selected) { e.currentTarget.style.background = "#FAFAF9"; e.currentTarget.style.borderColor = "#E7E5E4"; } }}
                  >
                    {selected && <span style={{ marginRight: 4 }}>&#10003;</span>}
                    {ct}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status & Start Date row */}
          <div
            className="da-date-time-row"
            style={{ display: "flex", gap: 16, marginBottom: 20 }}
          >
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, status: e.target.value }))
                }
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                  }))
                }
                style={inputStyle}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Description</label>
            <RichTextarea
              value={formData.description}
              onChange={(v) =>
                setFormData((prev) => ({ ...prev, description: v }))
              }
              placeholder="Describe the situation and key details of this case"
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Error */}
          {formError && (
            <p
              style={{
                fontSize: 13,
                color: "#EF4444",
                marginBottom: 16,
              }}
            >
              {formError}
            </p>
          )}

          {/* Submit */}
          <div
            className="da-form-buttons"
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={resetForm}
              style={{
                padding: "14px 24px",
                borderRadius: 10,
                border: "1px solid #D6D3D1",
                background: "#fff",
                color: "#292524",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={editingCase ? handleUpdate : handleCreate}
              disabled={saving || !formValid}
              style={{
                padding: "14px 24px",
                borderRadius: 10,
                border: "none",
                background: "var(--color-green)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                cursor: saving || !formValid ? "not-allowed" : "pointer",
                opacity: saving || !formValid ? 0.6 : 1,
              }}
            >
              {saving
                ? "Saving..."
                : editingCase
                  ? "Update Case"
                  : "Save Case"}
            </button>
          </div>
        </div>
      ) : loading ? (
        /* ---- LOADING ---- */
        <div
          style={{
            textAlign: "center",
            padding: 80,
            color: "var(--color-stone-500)",
            fontSize: 15,
            fontFamily: "var(--font-sans)",
          }}
        >
          Loading cases...
        </div>
      ) : cases.length === 0 ? (
        /* ---- EMPTY STATE ---- */
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 150px)",
          }}
        >
          <div
            style={{
              textAlign: "center",
              maxWidth: 420,
              background: "#fff",
              borderRadius: 16,
              border: "1px solid var(--color-stone-300)",
              padding: "56px 40px",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--color-green-soft)",
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
                stroke="var(--color-green)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
              </svg>
            </div>

            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 22,
                fontWeight: 600,
                color: "var(--color-stone-900)",
                marginBottom: 10,
              }}
            >
              No cases yet
            </h2>

            <p
              style={{
                fontSize: 14,
                color: "var(--color-stone-600)",
                lineHeight: 1.6,
                marginBottom: 28,
              }}
            >
              Start organizing your workplace cases. Each case groups related
              records, documents, and evidence together.
            </p>

            <button
              onClick={openNewForm}
              style={{
                padding: "14px 32px",
                borderRadius: 10,
                border: "none",
                background: "var(--color-green)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(34,197,94,0.3)",
              }}
            >
              New Case
            </button>
          </div>
        </div>
      ) : (
        /* ---- LIST VIEW ---- */
        <>
          {/* Header */}
          <div
            className="da-case-list-header da-list-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 24,
                fontWeight: 600,
                color: "var(--color-stone-900)",
              }}
            >
              {filteredCases.length}{" "}
              {filteredCases.length === 1 ? "Case" : "Cases"}
            </h1>

            <div
              className="da-case-list-controls da-list-controls"
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cases..."
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "1px solid var(--color-stone-200)",
                  fontSize: 14,
                  fontFamily: "var(--font-sans)",
                  color: "var(--color-stone-800)",
                  outline: "none",
                  width: 220,
                  height: 44,
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              />

              {/* New Case */}
              <button
                onClick={openNewForm}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--color-green)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                + New Case
              </button>
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#57534E", fontFamily: "var(--font-sans)", lineHeight: 1.5, marginBottom: 12, marginTop: -12 }}>
            Organize your records into cases. Each case groups related events and generates a shareable case file.
          </p>
          <p style={{ fontSize: 12, color: "#78716C", fontFamily: "var(--font-sans)", fontStyle: "italic", display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Your cases are private and only visible to you.
          </p>

          {/* Cards */}
          {filteredCases.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: "var(--color-stone-500)",
                fontSize: 14,
              }}
            >
              No cases match your search.
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {filteredCases.map((c) => {
                const isMenuOpen = menuOpen === c.id;

                return (
                  <div
                    key={c.id}
                    className="da-case-card"
                    style={{
                      background: "#fff",
                      borderRadius: 14,
                      border: "1px solid #E7E5E4",
                      overflow: "hidden",
                      cursor: "pointer",
                      position: "relative",
                      transition: "box-shadow 0.2s, border-color 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
                    }}
                    onClick={() => router.push(`/dashboard/case/${c.id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.03)";
                      e.currentTarget.style.borderColor = "#D6D3D1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)";
                      e.currentTarget.style.borderColor = "#E7E5E4";
                    }}
                  >
                    {/* Green top accent */}
                    <div style={{ height: 3, background: "#22C55E" }} />

                    {/* Card content */}
                    <div style={{ padding: "20px 24px" }}>
                      {/* Top row: name + menu */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 8,
                        }}
                      >
                        <h3
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: 18,
                            fontWeight: 600,
                            color: "var(--color-stone-900)",
                            lineHeight: 1.3,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {c.name}
                        </h3>

                        {/* Three-dot menu */}
                        <div
                          ref={isMenuOpen ? menuRef : undefined}
                          style={{ position: "relative", flexShrink: 0 }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpen(isMenuOpen ? null : c.id);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 4,
                              borderRadius: 6,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--color-stone-400)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "var(--color-stone-100)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "none";
                            }}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <circle cx="12" cy="5" r="1.5" />
                              <circle cx="12" cy="12" r="1.5" />
                              <circle cx="12" cy="19" r="1.5" />
                            </svg>
                          </button>

                          {/* Dropdown */}
                          {isMenuOpen && (
                            <div
                              style={{
                                position: "absolute",
                                top: "100%",
                                right: 0,
                                marginTop: 4,
                                background: "#fff",
                                borderRadius: 10,
                                border: "1px solid var(--color-stone-200)",
                                boxShadow:
                                  "0 4px 16px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)",
                                zIndex: 10,
                                minWidth: 140,
                                overflow: "hidden",
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(c);
                                }}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  padding: "10px 16px",
                                  background: "none",
                                  border: "none",
                                  fontSize: 13,
                                  fontWeight: 500,
                                  fontFamily: "var(--font-sans)",
                                  color: "var(--color-stone-700)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    "var(--color-stone-50)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "none";
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchive(c.id);
                                }}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  padding: "10px 16px",
                                  background: "none",
                                  border: "none",
                                  fontSize: 13,
                                  fontWeight: 500,
                                  fontFamily: "var(--font-sans)",
                                  color: "var(--color-stone-700)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    "var(--color-stone-50)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "none";
                                }}
                              >
                                Archive
                              </button>
                              <div
                                style={{
                                  height: 1,
                                  background: "var(--color-stone-100)",
                                }}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm(c.id);
                                  setMenuOpen(null);
                                }}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  padding: "10px 16px",
                                  background: "none",
                                  border: "none",
                                  fontSize: 13,
                                  fontWeight: 500,
                                  fontFamily: "var(--font-sans)",
                                  color: "#EF4444",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#FEF2F2";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "none";
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {c.description && (
                        <div
                          style={{
                            fontSize: 14,
                            color: "var(--color-stone-600)",
                            lineHeight: 1.6,
                            marginBottom: 12,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {renderMarkdown(c.description)}
                        </div>
                      )}

                      {/* Badges */}
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 12,
                        }}
                      >
                        <span style={getStatusBadgeStyle(c.status)}>
                          {c.status}
                        </span>
                        {resolveTypes(c).slice(0, 2).map((t) => (
                          <span key={t} style={getTypeBadgeStyle()}>{t}</span>
                        ))}
                        {resolveTypes(c).length > 2 && (
                          <span style={{ ...getTypeBadgeStyle(), color: "#78716C" }} title={resolveTypes(c).slice(2).join(", ")}>+{resolveTypes(c).length - 2}</span>
                        )}
                      </div>

                      {/* Stats row + people pills */}
                      {caseStats[c.id] && caseStats[c.id].recordCount > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 12, color: "#78716C", fontFamily: "var(--font-mono)", letterSpacing: "0.02em", marginBottom: 8 }}>
                            {caseStats[c.id].recordCount} record{caseStats[c.id].recordCount !== 1 ? "s" : ""}
                            {caseStats[c.id].people.length > 0 && (<> &middot; {caseStats[c.id].people.length} {caseStats[c.id].people.length === 1 ? "person" : "people"}</>)}
                            {caseStats[c.id].daySpan > 0 && (<> &middot; {caseStats[c.id].daySpan} day{caseStats[c.id].daySpan !== 1 ? "s" : ""}</>)}
                          </div>
                          {caseStats[c.id].people.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              {caseStats[c.id].people.slice(0, 3).map((name) => (
                                <div
                                  key={name}
                                  title={name}
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: "50%",
                                    background: "#1c1917",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    fontFamily: "var(--font-mono)",
                                    color: "#22C55E",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                                  }}
                                >
                                  {name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                                </div>
                              ))}
                              {caseStats[c.id].people.length > 3 && (
                                <div
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: "50%",
                                    background: "#F5F5F4",
                                    border: "1.5px solid #D6D3D1",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 9,
                                    fontWeight: 700,
                                    fontFamily: "var(--font-mono)",
                                    color: "#78716C",
                                  }}
                                >
                                  +{caseStats[c.id].people.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom: start date */}
                      {c.start_date && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-stone-400)",
                            fontFamily: "var(--font-mono)",
                            letterSpacing: "0.02em",
                          }}
                        >
                          Started {formatDate(c.start_date)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ---- DELETE CONFIRMATION MODAL ---- */}
      {deleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "32px 28px",
              maxWidth: 400,
              width: "90%",
              border: "1px solid var(--color-stone-300)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 18,
                fontWeight: 600,
                color: "var(--color-stone-900)",
                marginBottom: 10,
              }}
            >
              Delete this case?
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-stone-600)",
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              This action cannot be undone. The case will be permanently
              removed.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "1px solid var(--color-stone-300)",
                  background: "#fff",
                  color: "var(--color-stone-700)",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "#EF4444",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
