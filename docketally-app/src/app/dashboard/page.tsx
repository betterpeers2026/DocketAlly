"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RichTextarea from "@/components/RichTextarea";
import { renderMarkdown } from "@/lib/renderMarkdown";
import { useSubscription } from "@/components/SubscriptionProvider";
import { hasActiveAccess } from "@/lib/subscription";
import CaseFilePanel from "@/components/CaseFilePanel";

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

interface RecordAttachment {
  id: string;
  record_id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface CaseBasic {
  id: string;
  name: string;
  case_type: string;
  case_types?: string[];
}

interface FormData {
  entry_type: string;
  title: string;
  date: string;
  time: string;
  narrative: string;
  people: string;
  facts: string;
  follow_up: string;
  case_ids: string[];
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

const ESCALATION_TYPES = new Set(["PIP Conversation", "HR Interaction", "Incident"]);

function getBadgeStyle(entryType: string): React.CSSProperties {
  const isEscalation = ESCALATION_TYPES.has(entryType);
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 5,
    fontSize: 9.5,
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    color: isEscalation ? "#DC2626" : "#15803D",
    background: isEscalation ? "#FEF2F2" : "#F0FDF4",
    border: isEscalation ? "1px solid #FECACA" : "1px solid #BBF7D0",
  };
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
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

const AVATAR_COLOR = "#A8A29E";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

const EMPTY_FORM: FormData = {
  entry_type: "",
  title: "",
  date: todayStr(),
  time: "",
  narrative: "",
  people: "",
  facts: "",
  follow_up: "",
  case_ids: [],
};

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

export default function RecordPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subscription = useSubscription();
  const canCreate = hasActiveAccess(subscription);

  // Auth
  const [userId, setUserId] = useState<string | null>(null);

  // Data
  const [records, setRecords] = useState<DocketRecord[]>([]);
  const [attachments, setAttachments] = useState<{
    [recordId: string]: RecordAttachment[];
  }>({});

  // Cases
  const [cases, setCases] = useState<CaseBasic[]>([]);
  const [recordCaseMap, setRecordCaseMap] = useState<{
    [recordId: string]: CaseBasic[];
  }>({});
  const [addCaseDropdown, setAddCaseDropdown] = useState<string | null>(null);
  const addCaseRef = useRef<HTMLDivElement>(null);
  const [cardCaseDropdown, setCardCaseDropdown] = useState<string | null>(null);
  const cardCaseRef = useRef<HTMLDivElement>(null);

  // UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DocketRecord | null>(
    null
  );
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");

  // Form
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState("");

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
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRecords(data);
    }
    setLoading(false);
  }, [userId, supabase]);

  const fetchCases = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("cases")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setCases(data);
  }, [userId, supabase]);

  const fetchRecordCaseMap = useCallback(async () => {
    if (!userId) return;
    const { data: links } = await supabase
      .from("case_records")
      .select("record_id, cases(id, name, case_type, case_types)")
      .eq("user_id", userId);
    if (!links) return;

    const map: { [recordId: string]: CaseBasic[] } = {};
    links.forEach((link: { record_id: string; cases: CaseBasic | CaseBasic[] | null }) => {
      const c = Array.isArray(link.cases) ? link.cases[0] : link.cases;
      if (c) {
        if (!map[link.record_id]) map[link.record_id] = [];
        map[link.record_id].push(c);
      }
    });
    setRecordCaseMap(map);
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
      fetchCases();
      fetchRecordCaseMap();
    }
  }, [userId, fetchRecords, fetchCases, fetchRecordCaseMap]);

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  function resetForm() {
    setFormData({ ...EMPTY_FORM, date: todayStr() });
    setFiles([]);
    setFormError("");
    setShowForm(false);
    setEditingRecord(null);
  }

  function startEdit(record: DocketRecord) {
    setEditingRecord(record);
    const recordCases = recordCaseMap[record.id] || [];
    setFormData({
      entry_type: record.entry_type,
      title: record.title,
      date: record.date,
      time: record.time || "",
      narrative: record.narrative,
      people: record.people || "",
      facts: record.facts || "",
      follow_up: record.follow_up || "",
      case_ids: recordCases.map((c) => c.id),
    });
    setFiles([]);
    setFormError("");
    setShowForm(true);
    setExpandedRecord(null);
  }

  function nowTimeStr(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function openNewForm() {
    if (!canCreate) { router.push("/dashboard/billing"); return; }
    setEditingRecord(null);
    setFormData({ ...EMPTY_FORM, date: todayStr(), time: nowTimeStr() });
    setFiles([]);
    setFormError("");
    setShowForm(true);
  }

  // Handle ?action=new from bottom nav CTA
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (searchParams.get("action") === "new" && userId) {
      openNewForm();
      router.replace("/dashboard");
    }
  }, [searchParams, userId]);

  async function fetchAttachments(recordId: string) {
    if (attachments[recordId]) return;

    const { data } = await supabase
      .from("record_attachments")
      .select("*")
      .eq("record_id", recordId)
      .order("created_at", { ascending: true });

    if (data) {
      setAttachments((prev) => ({ ...prev, [recordId]: data }));
    }
  }

  async function uploadFiles(recordId: string, uid: string) {
    for (const file of files) {
      const path = `${uid}/${file.name}`;

      const { error: storageError } = await supabase.storage
        .from("record-files")
        .upload(path, file, { upsert: true });

      if (storageError) {
        console.error("Record storage upload error:", storageError);
        continue;
      }

      const { error: insertError } = await supabase.from("record_attachments").insert({
        record_id: recordId,
        user_id: uid,
        file_name: file.name,
        file_url: path,
        file_type: file.type,
        file_size: file.size,
      });

      if (insertError) {
        console.error("Record attachment insert error:", insertError);
      }
    }
  }

  async function downloadAttachment(att: RecordAttachment) {
    const { data, error } = await supabase.storage
      .from("record-files")
      .createSignedUrl(att.file_url, 3600);

    if (error) {
      console.error("Record download error:", error);
      return;
    }
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  }

  async function deleteAttachment(att: RecordAttachment) {
    await supabase.storage.from("record-files").remove([att.file_url]);
    await supabase.from("record_attachments").delete().eq("id", att.id);

    setAttachments((prev) => ({
      ...prev,
      [att.record_id]: (prev[att.record_id] || []).filter(
        (a) => a.id !== att.id
      ),
    }));
  }

  // Close case dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addCaseRef.current && !addCaseRef.current.contains(e.target as Node)) {
        setAddCaseDropdown(null);
      }
      if (cardCaseRef.current && !cardCaseRef.current.contains(e.target as Node)) {
        setCardCaseDropdown(null);
      }
    }
    if (addCaseDropdown || cardCaseDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [addCaseDropdown, cardCaseDropdown]);

  async function addRecordToCase(recordId: string, caseId: string) {
    if (!userId) return;
    const c = cases.find((x) => x.id === caseId);
    if (!c) return;

    await supabase.from("case_records").insert({
      case_id: caseId,
      record_id: recordId,
      user_id: userId,
    });

    setRecordCaseMap((prev) => ({
      ...prev,
      [recordId]: [...(prev[recordId] || []), c],
    }));
  }

  async function removeRecordFromCase(recordId: string, caseId: string) {
    await supabase
      .from("case_records")
      .delete()
      .eq("case_id", caseId)
      .eq("record_id", recordId);

    setRecordCaseMap((prev) => ({
      ...prev,
      [recordId]: (prev[recordId] || []).filter((x) => x.id !== caseId),
    }));
  }

  /* ---------------------------------------------------------------- */
  /*  CRUD                                                             */
  /* ---------------------------------------------------------------- */

  async function handleCreate() {
    if (!userId) return;
    setSaving(true);
    setFormError("");

    const { data: newRecord, error } = await supabase
      .from("records")
      .insert({
        user_id: userId,
        title: formData.title.trim(),
        entry_type: formData.entry_type,
        date: formData.date,
        time: formData.time || nowTimeStr(),
        narrative: formData.narrative.trim(),
        people: formData.people.trim() || null,
        facts: formData.facts.trim() || null,
        follow_up: formData.follow_up.trim() || null,
      })
      .select()
      .single();

    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }

    if (newRecord && files.length > 0) {
      await uploadFiles(newRecord.id, userId);
    }

    if (newRecord) {
      // Link to selected cases
      if (formData.case_ids.length > 0) {
        const links = formData.case_ids.map((caseId) => ({
          case_id: caseId,
          record_id: newRecord.id,
          user_id: userId,
        }));
        await supabase.from("case_records").insert(links);

        const linkedCases = cases.filter((c) => formData.case_ids.includes(c.id));
        setRecordCaseMap((prev) => ({
          ...prev,
          [newRecord.id]: linkedCases,
        }));
      }

      setRecords((prev) => [newRecord, ...prev]);
    }
    resetForm();
    setSaving(false);
  }

  async function handleUpdate() {
    if (!editingRecord || !userId) return;
    setSaving(true);
    setFormError("");

    const { data: updated, error } = await supabase
      .from("records")
      .update({
        title: formData.title.trim(),
        entry_type: formData.entry_type,
        date: formData.date,
        time: formData.time || null,
        narrative: formData.narrative.trim(),
        people: formData.people.trim() || null,
        facts: formData.facts.trim() || null,
        follow_up: formData.follow_up.trim() || null,
      })
      .eq("id", editingRecord.id)
      .select()
      .single();

    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }

    if (updated && files.length > 0) {
      await uploadFiles(updated.id, userId);
      setAttachments((prev) => {
        const next = { ...prev };
        delete next[updated.id];
        return next;
      });
    }

    if (updated) {
      // Sync case assignments
      const oldCaseIds = (recordCaseMap[updated.id] || []).map((c) => c.id);
      const newCaseIds = formData.case_ids;
      const toAdd = newCaseIds.filter((id) => !oldCaseIds.includes(id));
      const toRemove = oldCaseIds.filter((id) => !newCaseIds.includes(id));

      if (toRemove.length > 0) {
        for (const caseId of toRemove) {
          await supabase
            .from("case_records")
            .delete()
            .eq("case_id", caseId)
            .eq("record_id", updated.id);
        }
      }
      if (toAdd.length > 0) {
        const links = toAdd.map((caseId) => ({
          case_id: caseId,
          record_id: updated.id,
          user_id: userId,
        }));
        await supabase.from("case_records").insert(links);
      }

      const linkedCases = cases.filter((c) => newCaseIds.includes(c.id));
      setRecordCaseMap((prev) => ({
        ...prev,
        [updated.id]: linkedCases,
      }));

      setRecords((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    }
    resetForm();
    setSaving(false);
  }

  async function handleDelete(recordId: string) {
    if (!userId) return;

    const { data: atts } = await supabase
      .from("record_attachments")
      .select("file_url")
      .eq("record_id", recordId);

    if (atts && atts.length > 0) {
      const paths = atts.map((a) => a.file_url);
      await supabase.storage.from("record-files").remove(paths);
    }

    const { error } = await supabase
      .from("records")
      .delete()
      .eq("id", recordId);

    if (!error) {
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      setExpandedRecord(null);
      setDeleteConfirm(null);
      setAttachments((prev) => {
        const next = { ...prev };
        delete next[recordId];
        return next;
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Filtering                                                        */
  /* ---------------------------------------------------------------- */

  const filteredRecords = records.filter((r) => {
    const matchesType = !filterType || r.entry_type === filterType;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      r.title.toLowerCase().includes(query) ||
      r.narrative.toLowerCase().includes(query) ||
      (r.people && r.people.toLowerCase().includes(query));
    return matchesType && matchesSearch;
  });

  /* ---------------------------------------------------------------- */
  /*  Stats                                                            */
  /* ---------------------------------------------------------------- */

  const stats = useMemo(() => {
    const totalRecords = records.length;
    const daysDocumented = new Set(records.map((r) => r.date)).size;
    const allPeople = new Set<string>();
    records.forEach((r) => {
      parsePeople(r.people).forEach((p) => allPeople.add(p.toLowerCase()));
    });
    const evidenceFiled = records.filter(
      (r) => r.facts || r.follow_up
    ).length;
    return { totalRecords, daysDocumented, peopleTracked: allPeople.size, evidenceFiled };
  }, [records]);

  /* ---------------------------------------------------------------- */
  /*  Format helpers                                                   */
  /* ---------------------------------------------------------------- */

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

  function formatDatetime(record: DocketRecord): string {
    const date = formatDate(record.date);
    if (record.time) return `${date} · ${formatTime(record.time)}`;
    return date;
  }

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const formValid =
    formData.entry_type && formData.title.trim() && formData.narrative.trim();

  return (
    <div className="da-records-layout">
    <div className="da-page-wrapper" style={{ padding: 32, flex: 1, minWidth: 0 }}>
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
              {editingRecord ? "Edit Record" : "New Record"}
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

          {/* Entry Type */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Entry Type *</label>
            <div style={{ position: "relative" }}>
              <select
                value={formData.entry_type}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, entry_type: e.target.value }))
                }
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                  color: formData.entry_type ? "#292524" : "transparent",
                }}
              >
                <option value="" disabled>
                  Select entry type...
                </option>
                {ENTRY_TYPES.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </select>
              {!formData.entry_type && (
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#78716C",
                    pointerEvents: "none",
                    fontSize: 15,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Select entry type...
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Brief summary of what happened"
              required
              style={inputStyle}
            />
          </div>

          {/* Date & Time row */}
          <div className="da-date-time-row" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                required
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Time (optional)</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, time: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
          </div>

          {/* Narrative */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>What Happened *</label>
            <RichTextarea
              value={formData.narrative}
              onChange={(v) =>
                setFormData((prev) => ({ ...prev, narrative: v }))
              }
              placeholder="Describe what happened in your own words. Be factual and specific."
              required
              rows={5}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* People Involved */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>People Involved</label>
            <input
              type="text"
              value={formData.people}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, people: e.target.value }))
              }
              placeholder="Names and roles"
              style={inputStyle}
            />
          </div>

          {/* Add to Case */}
          {cases.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Add to Case</label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #D6D3D1",
                  background: "#fff",
                  minHeight: 44,
                }}
              >
                {/* Selected case pills */}
                {formData.case_ids.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {formData.case_ids.map((caseId) => {
                      const c = cases.find((x) => x.id === caseId);
                      if (!c) return null;
                      return (
                        <span
                          key={caseId}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "3px 8px 3px 10px",
                            borderRadius: 6,
                            background: "#F0FDF4",
                            border: "1px solid #BBF7D0",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#15803D",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {c.name.length > 20 ? c.name.slice(0, 20) + "..." : c.name}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                case_ids: prev.case_ids.filter((id) => id !== caseId),
                              }))
                            }
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              color: "#15803D",
                              fontSize: 14,
                              lineHeight: 1,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Case checkboxes */}
                {cases
                  .filter((c) => !formData.case_ids.includes(c.id))
                  .map((c) => (
                  <label
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "4px 0",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "var(--color-stone-700)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          case_ids: [...prev.case_ids, c.id],
                        }))
                      }
                      style={{ accentColor: "#22C55E" }}
                    />
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: "#57534E",
                        background: "#FAFAF9",
                        border: "1px solid #D6D3D1",
                        padding: "2px 8px",
                        borderRadius: 20,
                        textTransform: "uppercase",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {c.case_types && c.case_types.length > 0 ? c.case_types[0] : c.case_type}
                    </span>
                  </label>
                ))}
                {cases.length > 0 && cases.every((c) => formData.case_ids.includes(c.id)) && (
                  <span style={{ fontSize: 12, color: "var(--color-stone-400)", fontFamily: "var(--font-sans)" }}>
                    All cases selected
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Key Facts */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Key Facts</label>
            <RichTextarea
              value={formData.facts}
              onChange={(v) =>
                setFormData((prev) => ({ ...prev, facts: v }))
              }
              placeholder="Specific quotes, numbers, or details worth noting"
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Follow-Up */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Follow-Up Needed</label>
            <RichTextarea
              value={formData.follow_up}
              onChange={(v) =>
                setFormData((prev) => ({
                  ...prev,
                  follow_up: v,
                }))
              }
              placeholder="Any next steps or actions to take"
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* File Attachments */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Attachments</label>
            <div
              style={{
                border: "2px dashed var(--color-stone-300)",
                borderRadius: 10,
                padding: "20px 14px",
                textAlign: "center",
                cursor: "pointer",
                position: "relative",
              }}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: "pointer",
                }}
              />
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-stone-300)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ margin: "0 auto 8px", display: "block" }}
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--color-stone-500)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Click to upload files
              </div>
            </div>
            {files.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: "var(--color-stone-600)",
                }}
              >
                {files.map((f, i) => (
                  <div key={i} style={{ padding: "2px 0" }}>
                    {f.name} ({formatFileSize(f.size)})
                  </div>
                ))}
              </div>
            )}
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
              onClick={editingRecord ? handleUpdate : handleCreate}
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
                : editingRecord
                  ? "Update Record"
                  : "Save Record"}
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
          Loading records...
        </div>
      ) : records.length === 0 ? (
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
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
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
              No records yet
            </h2>

            <p
              style={{
                fontSize: 14,
                color: "var(--color-stone-600)",
                lineHeight: 1.6,
                marginBottom: 28,
              }}
            >
              Start documenting workplace events. Every record you create builds
              your case over time.
            </p>

            <p style={{ fontSize: 12, color: "#78716C", fontFamily: "var(--font-sans)", fontStyle: "italic", display: "flex", alignItems: "center", gap: 6, marginBottom: 28, justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Your records are private and only visible to you.
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
              New Record
            </button>
          </div>
        </div>
      ) : (
        /* ---- LIST VIEW ---- */
        <>
          {/* Header */}
          <div className="da-list-header" style={{ marginBottom: 24, animation: "fadeUp 0.4s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 700, color: "#292524", letterSpacing: "-0.03em" }}>
                Records
              </h1>
              <button
                className="da-record-new-btn"
                onClick={openNewForm}
                style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: "var(--color-green)", color: "#fff", fontSize: 13.5, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                + New Record
              </button>
            </div>
            <p style={{ fontSize: 14, fontFamily: "var(--font-sans)", color: "#78716C", marginBottom: 6, lineHeight: 1.5 }}>
              Document workplace events as they happen. Each record strengthens your timeline.
            </p>
            <p style={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: "#78716C", marginBottom: 0 }}>
              <strong style={{ fontWeight: 700, color: "#44403C" }}>{stats.totalRecords}</strong>{" "}
              <span>records</span>{" "}
              <span style={{ color: "#D6D3D1" }}>&middot;</span>{" "}
              <strong style={{ fontWeight: 700, color: "#44403C" }}>{stats.daysDocumented}</strong>{" "}
              <span>days</span>{" "}
              <span style={{ color: "#D6D3D1" }}>&middot;</span>{" "}
              <strong style={{ fontWeight: 700, color: "#44403C" }}>{stats.peopleTracked}</strong>{" "}
              <span>people</span>{" "}
              <span style={{ color: "#D6D3D1" }}>&middot;</span>{" "}
              <strong style={{ fontWeight: 700, color: "#44403C" }}>{stats.evidenceFiled}</strong>{" "}
              <span>evidence</span>
            </p>
            <p style={{ fontSize: 11.5, color: "#A8A29E", fontFamily: "var(--font-sans)", fontStyle: "italic", display: "flex", alignItems: "center", gap: 5, marginTop: 10 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Your records are private and only visible to you.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="da-list-controls" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 24, animation: "fadeUp 0.4s ease 0.1s both" }}>
            <div style={{ flex: 1, position: "relative", minWidth: 200 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="da-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search records..."
                style={{ width: "100%", height: 42, padding: "0 14px 0 40px", borderRadius: 10, border: "1px solid #E7E5E4", fontSize: 13.5, fontFamily: "var(--font-sans)", color: "#292524", outline: "none", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ height: 42, borderRadius: 10, border: "1px solid #E7E5E4", fontSize: 13, fontFamily: "var(--font-sans)", color: "#78716C", outline: "none", background: "#fff", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", padding: "0 36px 0 14px" }}
            >
              <option value="">All Types</option>
              {ENTRY_TYPES.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>

          {/* Cards */}
          {filteredRecords.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: "var(--color-stone-500)",
                fontSize: 14,
              }}
            >
              No records match your search.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filteredRecords.map((record, idx) => {
                const isExpanded = expandedRecord === record.id;
                const recordAtts = attachments[record.id] || [];
                const people = parsePeople(record.people);

                return (
                  <div
                    key={record.id}
                    style={{
                      background: "#fff",
                      borderRadius: 14,
                      border: "1px solid #E7E5E4",
                      overflow: "hidden",
                      transition: "box-shadow 0.2s, border-color 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
                      animation: `fadeUp 0.4s ease ${0.15 + Math.min(idx * 0.1, 0.5)}s both`,
                    }}
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
                    <div>
                      {/* Collapsed card */}
                      <div
                        className="da-record-card"
                        onClick={() => {
                          const newId = isExpanded ? null : record.id;
                          setExpandedRecord(newId);
                          if (newId) fetchAttachments(newId);
                        }}
                        style={{ padding: "20px 24px", cursor: "pointer" }}
                      >
                        {/* Top row: badge + date */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={getBadgeStyle(record.entry_type)}>{record.entry_type}</span>
                            <span style={{ fontSize: 11, color: "#A8A29E", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                              {formatDatetime(record)}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <div style={{ fontSize: 19, fontWeight: 600, color: "#292524", fontFamily: "var(--font-serif)", letterSpacing: "-0.02em", lineHeight: 1.3, margin: "0 0 8px" }}>
                          {record.title}
                        </div>

                        {/* Truncated narrative */}
                        {!isExpanded && (
                          <div style={{ fontSize: 13.5, color: "#78716C", fontFamily: "var(--font-sans)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as never, overflow: "hidden", margin: "0 0 16px" }}>
                            {record.narrative}
                          </div>
                        )}

                        {/* People pills */}
                        {!isExpanded && people.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                            {people.map((person, i) => (
                              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 12px 4px 4px", borderRadius: 20, background: "#FAFAF9", border: "1px solid #E7E5E4", fontSize: 12.5, color: "#44403C", fontFamily: "var(--font-sans)", fontWeight: 500 }}>
                                <span style={{ width: 24, height: 24, borderRadius: "50%", background: AVATAR_COLOR, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                                  {getInitials(person)}
                                </span>
                                {person}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Bottom row: case pills + chevron */}
                        {!isExpanded && (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid #F5F5F4" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                              {(() => {
                                const rc = recordCaseMap[record.id] || [];
                                if (rc.length === 0 && cases.length > 0) {
                                  return (
                                    <div style={{ position: "relative" }} ref={cardCaseDropdown === record.id ? cardCaseRef : undefined}>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setCardCaseDropdown(cardCaseDropdown === record.id ? null : record.id); }}
                                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12.5, fontFamily: "var(--font-sans)", color: "#A8A29E", fontWeight: 500 }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = "#78716C"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = "#A8A29E"; }}
                                      >
                                        + Add to case
                                      </button>
                                      {cardCaseDropdown === record.id && (
                                        <div
                                          onClick={(e) => e.stopPropagation()}
                                          style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 4, background: "#fff", borderRadius: 10, border: "1px solid var(--color-stone-200)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 10, minWidth: 200, maxHeight: 200, overflow: "auto", padding: "6px 0" }}
                                        >
                                          {cases.map((c) => {
                                            const isLinked = (recordCaseMap[record.id] || []).some((x) => x.id === c.id);
                                            return (
                                              <button
                                                key={c.id}
                                                onClick={async (e) => { e.stopPropagation(); if (!isLinked) { await addRecordToCase(record.id, c.id); } setCardCaseDropdown(null); }}
                                                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", background: "none", border: "none", fontSize: 13, fontFamily: "var(--font-sans)", color: isLinked ? "var(--color-stone-400)" : "var(--color-stone-700)", cursor: isLinked ? "default" : "pointer", textAlign: "left" }}
                                                onMouseEnter={(e) => { if (!isLinked) e.currentTarget.style.background = "var(--color-stone-50)"; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                                              >
                                                <span style={{ fontWeight: 500 }}>{c.name}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                if (rc.length === 0) return null;
                                const shown = rc.length > 2 ? rc.slice(0, 2) : rc;
                                const extra = rc.length > 2 ? rc.length - 2 : 0;
                                return (
                                  <>
                                    {shown.map((c) => (
                                      <span key={c.id} style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 5, background: "#F5F5F4", border: "1px solid #E7E5E4", fontSize: 9.5, fontWeight: 600, color: "#57534E", fontFamily: "var(--font-mono)" }}>
                                        {c.name.length > 20 ? c.name.slice(0, 20) + "..." : c.name}
                                      </span>
                                    ))}
                                    {extra > 0 && (
                                      <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 5, background: "#F5F5F4", border: "1px solid #E7E5E4", fontSize: 9.5, fontWeight: 600, color: "#57534E", fontFamily: "var(--font-mono)" }}>
                                        +{extra} more
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                            <svg className="da-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5, transition: "opacity 0.15s, transform 0.15s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: "0 24px 24px",
                            borderTop: "1px solid var(--color-stone-100)",
                          }}
                        >
                          {/* Narrative */}
                          <div style={{ marginTop: 20, marginBottom: 20 }}>
                            <label style={labelStyle}>What Happened</label>
                            <div
                              style={{
                                fontSize: 14,
                                color: "var(--color-stone-800)",
                                lineHeight: 1.7,
                              }}
                            >
                              {renderMarkdown(record.narrative)}
                            </div>
                          </div>

                          {/* People (expanded: show pills) */}
                          {people.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <label style={labelStyle}>People Involved</label>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {people.map((person, i) => (
                                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 12px 4px 4px", borderRadius: 20, background: "#FAFAF9", border: "1px solid #E7E5E4", fontSize: 12.5, color: "#44403C", fontFamily: "var(--font-sans)", fontWeight: 500 }}>
                                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: AVATAR_COLOR, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                                      {getInitials(person)}
                                    </span>
                                    {person}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Facts */}
                          {record.facts && (
                            <div style={{ marginBottom: 16 }}>
                              <label style={labelStyle}>Key Facts</label>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: "var(--color-stone-800)",
                                  lineHeight: 1.7,
                                }}
                              >
                                {renderMarkdown(record.facts)}
                              </div>
                            </div>
                          )}

                          {/* Follow-up */}
                          {record.follow_up && (
                            <div style={{ marginBottom: 16 }}>
                              <label style={labelStyle}>Follow-Up Needed</label>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: "var(--color-stone-800)",
                                  lineHeight: 1.7,
                                }}
                              >
                                {renderMarkdown(record.follow_up)}
                              </div>
                            </div>
                          )}

                          {/* Attachments */}
                          {recordAtts.length > 0 && (
                            <div style={{ marginBottom: 20 }}>
                              <label style={labelStyle}>Attachments</label>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 6,
                                }}
                              >
                                {recordAtts.map((att) => (
                                  <div
                                    key={att.id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                      padding: "8px 12px",
                                      borderRadius: 8,
                                      background: "var(--color-stone-50)",
                                      border: "1px solid var(--color-stone-100)",
                                    }}
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="var(--color-stone-500)"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                                    </svg>
                                    <span
                                      style={{
                                        flex: 1,
                                        fontSize: 13,
                                        color: "var(--color-stone-800)",
                                        fontFamily: "var(--font-sans)",
                                      }}
                                    >
                                      {att.file_name}
                                      {att.file_size && (
                                        <span
                                          style={{
                                            color: "var(--color-stone-500)",
                                            marginLeft: 6,
                                          }}
                                        >
                                          ({formatFileSize(att.file_size)})
                                        </span>
                                      )}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadAttachment(att);
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--color-green)",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        fontFamily: "var(--font-sans)",
                                      }}
                                    >
                                      Download
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteAttachment(att);
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--color-stone-500)",
                                        fontSize: 12,
                                        fontFamily: "var(--font-sans)",
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Cases (expanded) */}
                          {cases.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <label style={labelStyle}>Cases</label>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                                {(recordCaseMap[record.id] || []).map((c) => (
                                  <span
                                    key={c.id}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      padding: "3px 6px 3px 10px",
                                      borderRadius: 6,
                                      background: "#F0FDF4",
                                      border: "1px solid #BBF7D0",
                                      fontSize: 10,
                                      fontWeight: 600,
                                      color: "#15803D",
                                      fontFamily: "var(--font-mono)",
                                    }}
                                  >
                                    {c.name.length > 20 ? c.name.slice(0, 20) + "..." : c.name}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeRecordFromCase(record.id, c.id);
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: 0,
                                        color: "#15803D",
                                        fontSize: 12,
                                        lineHeight: 1,
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                      </svg>
                                    </button>
                                  </span>
                                ))}
                                {/* Add to case dropdown */}
                                {cases.filter((c) => !(recordCaseMap[record.id] || []).some((x) => x.id === c.id)).length > 0 && (
                                  <div style={{ position: "relative" }} ref={addCaseDropdown === record.id ? addCaseRef : undefined}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAddCaseDropdown(addCaseDropdown === record.id ? null : record.id);
                                      }}
                                      style={{
                                        background: "none",
                                        border: "1px dashed #D6D3D1",
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        padding: "3px 10px",
                                        fontSize: 10,
                                        fontFamily: "var(--font-mono)",
                                        color: "#78716C",
                                        fontWeight: 600,
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#22C55E";
                                        e.currentTarget.style.color = "#22C55E";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "#D6D3D1";
                                        e.currentTarget.style.color = "#78716C";
                                      }}
                                    >
                                      + Add to Case
                                    </button>
                                    {addCaseDropdown === record.id && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                          position: "absolute",
                                          top: "100%",
                                          left: 0,
                                          marginTop: 4,
                                          background: "#fff",
                                          borderRadius: 10,
                                          border: "1px solid var(--color-stone-200)",
                                          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                                          zIndex: 10,
                                          minWidth: 200,
                                          maxHeight: 200,
                                          overflow: "auto",
                                          padding: "6px 0",
                                        }}
                                      >
                                        {cases
                                          .filter((c) => !(recordCaseMap[record.id] || []).some((x) => x.id === c.id))
                                          .map((c) => (
                                          <button
                                            key={c.id}
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              await addRecordToCase(record.id, c.id);
                                              setAddCaseDropdown(null);
                                            }}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 8,
                                              width: "100%",
                                              padding: "8px 14px",
                                              background: "none",
                                              border: "none",
                                              fontSize: 13,
                                              fontFamily: "var(--font-sans)",
                                              color: "var(--color-stone-700)",
                                              cursor: "pointer",
                                              textAlign: "left",
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-stone-50)"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                                          >
                                            <span style={{ fontWeight: 500 }}>{c.name}</span>
                                            <span
                                              style={{
                                                fontSize: 9,
                                                fontWeight: 700,
                                                fontFamily: "var(--font-mono)",
                                                color: "#57534E",
                                                background: "#FAFAF9",
                                                border: "1px solid #D6D3D1",
                                                padding: "1px 6px",
                                                borderRadius: 20,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.02em",
                                              }}
                                            >
                                              {c.case_types && c.case_types.length > 0 ? c.case_types[0] : c.case_type}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              marginTop: 20,
                              paddingTop: 16,
                              borderTop: "1px solid var(--color-stone-100)",
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(record);
                              }}
                              style={{
                                padding: "10px 20px",
                                borderRadius: 8,
                                border: "1px solid var(--color-stone-300)",
                                background: "#fff",
                                color: "var(--color-stone-800)",
                                fontSize: 13,
                                fontWeight: 600,
                                fontFamily: "var(--font-sans)",
                                cursor: "pointer",
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(record.id);
                              }}
                              style={{
                                padding: "10px 20px",
                                borderRadius: 8,
                                border: "1px solid #FCA5A5",
                                background: "#fff",
                                color: "#EF4444",
                                fontSize: 13,
                                fontWeight: 600,
                                fontFamily: "var(--font-sans)",
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </div>
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
              Delete this record?
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-stone-600)",
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              This action cannot be undone. The record and all its attachments
              will be permanently removed.
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
    <CaseFilePanel cases={cases} userId={userId || ""} subscription={subscription} />
    {cases.length > 0 && (
      <button
        className="da-casefile-fab"
        onClick={() => router.push(`/dashboard/case/${cases[0].id}?tab=casefile`)}
        style={{
          position: "fixed",
          bottom: 80,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "#22C55E",
          color: "#fff",
          border: "none",
          boxShadow: "0 4px 12px rgba(34,197,94,0.35)",
          cursor: "pointer",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
        }}
        title="View Case File"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </button>
    )}
    </div>
  );
}
