"use client";

import { useState, useEffect, useCallback } from "react";
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

interface FormData {
  entry_type: string;
  title: string;
  date: string;
  time: string;
  narrative: string;
  people: string;
  facts: string;
  follow_up: string;
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
};

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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RecordPage() {
  const supabase = createClient();

  // Auth
  const [userId, setUserId] = useState<string | null>(null);

  // Data
  const [records, setRecords] = useState<DocketRecord[]>([]);
  const [attachments, setAttachments] = useState<{
    [recordId: string]: RecordAttachment[];
  }>({});

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
    if (userId) fetchRecords();
  }, [userId, fetchRecords]);

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
    setFormData({
      entry_type: record.entry_type,
      title: record.title,
      date: record.date,
      time: record.time || "",
      narrative: record.narrative,
      people: record.people || "",
      facts: record.facts || "",
      follow_up: record.follow_up || "",
    });
    setFiles([]);
    setFormError("");
    setShowForm(true);
    setExpandedRecord(null);
  }

  function openNewForm() {
    setEditingRecord(null);
    setFormData({ ...EMPTY_FORM, date: todayStr() });
    setFiles([]);
    setFormError("");
    setShowForm(true);
  }

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
      const path = `${uid}/${recordId}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("record-files")
        .upload(path, file);

      if (!uploadError) {
        await supabase.from("record_attachments").insert({
          record_id: recordId,
          user_id: uid,
          file_name: file.name,
          file_url: path,
          file_type: file.type,
          file_size: file.size,
        });
      }
    }
  }

  async function downloadAttachment(att: RecordAttachment) {
    const { data, error } = await supabase.storage
      .from("record-files")
      .createSignedUrl(att.file_url, 3600);

    if (!error && data?.signedUrl) {
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
        time: formData.time || null,
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
    <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      {/* ---- FORM VIEW ---- */}
      {showForm ? (
        <div
          className="da-form-card"
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid var(--color-stone-200)",
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
                color: "#1C1917",
              }}
            >
              {editingRecord ? "Edit Record" : "New Record"}
            </h2>
            <button
              className="da-form-header-cancel"
              onClick={resetForm}
              style={{
                padding: "8px 16px",
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

          {/* Entry Type */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Entry Type *</label>
            <select
              value={formData.entry_type}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, entry_type: e.target.value }))
              }
              required
              style={{
                ...inputStyle,
                cursor: "pointer",
                color: formData.entry_type ? "#1C1917" : "#78716C",
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
            <textarea
              value={formData.narrative}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, narrative: e.target.value }))
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

          {/* Key Facts */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Key Facts</label>
            <textarea
              value={formData.facts}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, facts: e.target.value }))
              }
              placeholder="Specific quotes, numbers, or details worth noting"
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Follow-Up */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Follow-Up Needed</label>
            <textarea
              value={formData.follow_up}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  follow_up: e.target.value,
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
                border: "2px dashed var(--color-stone-200)",
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
                  color: "var(--color-stone-400)",
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
                  color: "var(--color-stone-500)",
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
                color: "#44403C",
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
            color: "var(--color-stone-400)",
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
              border: "1px solid var(--color-stone-200)",
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
                color: "var(--color-stone-500)",
                lineHeight: 1.6,
                marginBottom: 28,
              }}
            >
              Start documenting workplace events. Every record you create builds
              your case over time.
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
          <div
            className="da-list-header"
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
              {filteredRecords.length}{" "}
              {filteredRecords.length === 1 ? "Record" : "Records"}
            </h1>

            <div
              className="da-list-controls"
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
                placeholder="Search records..."
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--color-stone-200)",
                  fontSize: 13,
                  fontFamily: "var(--font-sans)",
                  color: "var(--color-stone-800)",
                  outline: "none",
                  width: 200,
                  background: "#fff",
                }}
              />

              {/* Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--color-stone-200)",
                  fontSize: 13,
                  fontFamily: "var(--font-sans)",
                  color: "var(--color-stone-800)",
                  outline: "none",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <option value="">All Types</option>
                {ENTRY_TYPES.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </select>

              {/* New Record */}
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
                + New Record
              </button>
            </div>
          </div>

          {/* Cards */}
          {filteredRecords.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: "var(--color-stone-400)",
                fontSize: 14,
              }}
            >
              No records match your search.
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {filteredRecords.map((record) => {
                const isExpanded = expandedRecord === record.id;
                const recordAtts = attachments[record.id] || [];

                return (
                  <div
                    key={record.id}
                    style={{
                      background: "#fff",
                      borderRadius: 14,
                      border: "1px solid var(--color-stone-200)",
                      overflow: "hidden",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isExpanded) {
                        e.currentTarget.style.borderColor =
                          "var(--color-stone-300)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isExpanded) {
                        e.currentTarget.style.borderColor =
                          "var(--color-stone-200)";
                      }
                    }}
                  >
                    {/* Collapsed card */}
                    <div
                      onClick={() => {
                        const newId = isExpanded ? null : record.id;
                        setExpandedRecord(newId);
                        if (newId) fetchAttachments(newId);
                      }}
                      style={{
                        padding: "18px 24px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 16,
                      }}
                    >
                      {/* Left: badge + content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 6,
                          }}
                        >
                          {/* Entry type badge */}
                          <span style={getBadgeStyle(record.entry_type)}>
                            {record.entry_type}
                          </span>
                          {/* Date */}
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--color-stone-400)",
                              fontFamily: "var(--font-mono)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatDate(record.date)}
                          </span>
                        </div>

                        {/* Title */}
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: "var(--color-stone-800)",
                            fontFamily: "var(--font-sans)",
                            marginBottom: 4,
                          }}
                        >
                          {record.title}
                        </div>

                        {/* Truncated narrative */}
                        {!isExpanded && (
                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--color-stone-500)",
                              lineHeight: 1.6,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical" as never,
                              overflow: "hidden",
                            }}
                          >
                            {record.narrative}
                          </div>
                        )}
                      </div>

                      {/* Expand/collapse chevron */}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-stone-300)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          flexShrink: 0,
                          marginTop: 4,
                          transform: isExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.15s",
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
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

                        {/* Time */}
                        {record.time && (
                          <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Time</label>
                            <p
                              style={{
                                fontSize: 14,
                                color: "var(--color-stone-700)",
                              }}
                            >
                              {record.time}
                            </p>
                          </div>
                        )}

                        {/* People */}
                        {record.people && (
                          <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>People Involved</label>
                            <p
                              style={{
                                fontSize: 14,
                                color: "var(--color-stone-700)",
                              }}
                            >
                              {record.people}
                            </p>
                          </div>
                        )}

                        {/* Facts */}
                        {record.facts && (
                          <div style={{ marginBottom: 16 }}>
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

                        {/* Follow-up */}
                        {record.follow_up && (
                          <div style={{ marginBottom: 16 }}>
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
                                    stroke="var(--color-stone-400)"
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
                                      color: "var(--color-stone-700)",
                                      fontFamily: "var(--font-sans)",
                                    }}
                                  >
                                    {att.file_name}
                                    {att.file_size && (
                                      <span
                                        style={{
                                          color: "var(--color-stone-400)",
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
                                      color: "var(--color-stone-400)",
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
                              border: "1px solid var(--color-stone-200)",
                              background: "#fff",
                              color: "var(--color-stone-700)",
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
              border: "1px solid var(--color-stone-200)",
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
                color: "var(--color-stone-500)",
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
                  border: "1px solid var(--color-stone-200)",
                  background: "#fff",
                  color: "var(--color-stone-600)",
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
