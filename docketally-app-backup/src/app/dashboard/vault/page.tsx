"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VaultDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  category: string;
  notes: string | null;
  linked_record_id: string | null;
  created_at: string;
  updated_at: string;
}

interface LinkedRecord {
  id: string;
  title: string;
}

interface PendingFile {
  file: File;
  category: string;
  notes: string;
  linkedRecordId: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const VAULT_CATEGORIES = [
  "General",
  "Performance Review",
  "PIP Document",
  "Offer Letter",
  "Email/Correspondence",
  "Slack/Chat Export",
  "Meeting Notes",
  "HR Document",
  "Legal Document",
  "Other",
];

const WARNING_CATEGORIES = new Set(["PIP Document", "HR Document", "Legal Document"]);
const INFO_CATEGORIES = new Set(["Email/Correspondence", "Slack/Chat Export"]);

const ACCEPTED_TYPES = ".pdf,.png,.jpg,.jpeg,.docx,.doc,.xlsx,.txt,.csv";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getCategoryBadgeStyle(category: string): React.CSSProperties {
  const isWarning = WARNING_CATEGORIES.has(category);
  const isInfo = INFO_CATEGORIES.has(category);
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
    color: isWarning ? "#991B1B" : isInfo ? "#1E40AF" : "#57534E",
    background: isWarning ? "#FEF2F2" : isInfo ? "#EFF6FF" : "#F5F5F4",
    border: isWarning
      ? "1px solid #FECACA"
      : isInfo
        ? "1px solid #BFDBFE"
        : "1px solid #E7E5E4",
  };
}

function getFileIcon(fileType: string | null, fileName: string): { color: string; path: string } {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf" || fileType?.includes("pdf")) {
    return { color: "#EF4444", path: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6" };
  }
  if (["png", "jpg", "jpeg"].includes(ext) || fileType?.startsWith("image/")) {
    return { color: "#3B82F6", path: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11 M17.5 2.5l4 4 M3 15l5-5 3 3 4-4 6 6" };
  }
  if (["doc", "docx"].includes(ext)) {
    return { color: "#3B82F6", path: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" };
  }
  if (["xlsx", "csv"].includes(ext)) {
    return { color: "#22C55E", path: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M8 13h2 M14 13h2 M8 17h2 M14 17h2" };
  }
  if (ext === "txt") {
    return { color: "#78716C", path: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8" };
  }
  return { color: "#9CA3AF", path: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6" };
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function VaultPage() {
  const supabase = createClient();

  // Auth
  const [userId, setUserId] = useState<string | null>(null);

  // Data
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [records, setRecords] = useState<LinkedRecord[]>([]);

  // UI
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "name">("newest");

  // Upload
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadError, setUploadError] = useState("");

  // Inline edit
  const [editCategory, setEditCategory] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLinkedRecord, setEditLinkedRecord] = useState("");

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchDocuments = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("vault_documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Vault fetchDocuments error:", error);
    }
    if (!error && data) {
      setDocuments(data);
    }
    setLoading(false);
  }, [userId, supabase]);

  const fetchRecords = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("records")
      .select("id, title")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (data) {
      setRecords(data);
    }
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
      fetchDocuments();
      fetchRecords();
    }
  }, [userId, fetchDocuments, fetchRecords]);

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
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

  function handleFileSelect(fileList: FileList | null) {
    if (!fileList) return;
    setUploadError("");

    const newPending: PendingFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`"${file.name}" exceeds 10MB limit.`);
        continue;
      }
      newPending.push({
        file,
        category: "General",
        notes: "",
        linkedRecordId: "",
      });
    }

    if (newPending.length > 0) {
      setPendingFiles((prev) => [...prev, ...newPending]);
      setShowUpload(true);
    }
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePendingFile(index: number, updates: Partial<PendingFile>) {
    setPendingFiles((prev) =>
      prev.map((pf, i) => (i === index ? { ...pf, ...updates } : pf))
    );
  }

  function resetUpload() {
    setPendingFiles([]);
    setShowUpload(false);
    setUploadError("");
  }

  function startEdit(doc: VaultDocument) {
    setEditingDoc(doc.id);
    setEditCategory(doc.category);
    setEditNotes(doc.notes || "");
    setEditLinkedRecord(doc.linked_record_id || "");
  }

  function cancelEdit() {
    setEditingDoc(null);
  }

  /* ---------------------------------------------------------------- */
  /*  CRUD                                                             */
  /* ---------------------------------------------------------------- */

  async function handleUploadAll() {
    if (!userId || pendingFiles.length === 0) return;
    setUploading(true);
    setUploadError("");

    // Refresh session to ensure auth token is current
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error("Vault auth session error:", sessionError || "No active session");
      setUploadError("Authentication expired. Please refresh the page and log in again.");
      setUploading(false);
      return;
    }

    for (const pf of pendingFiles) {
      const docId = crypto.randomUUID();
      const path = `${userId}/${pf.file.name}`;

      console.log("Vault upload: storage path =", path, "| bucket = vault-files");
      const { error: storageError } = await supabase.storage
        .from("vault-files")
        .upload(path, pf.file, { upsert: true });

      if (storageError) {
        console.error("Vault storage upload error:", storageError);
        setUploadError(`Failed to upload "${pf.file.name}": ${storageError.message}`);
        continue;
      }

      console.log("Vault upload: inserting doc into vault_documents, id =", docId);
      const { error: insertError } = await supabase.from("vault_documents").insert({
        id: docId,
        user_id: userId,
        file_name: pf.file.name,
        file_url: path,
        file_type: pf.file.type,
        file_size: pf.file.size,
        category: pf.category,
        notes: pf.notes.trim() || null,
        linked_record_id: pf.linkedRecordId || null,
      });

      if (insertError) {
        console.error("Vault document insert error:", insertError);
        setUploadError(`Failed to save "${pf.file.name}": ${insertError.message}`);
      }
    }

    await fetchDocuments();
    resetUpload();
    setUploading(false);
  }

  async function handleDownload(doc: VaultDocument) {
    const { data, error } = await supabase.storage
      .from("vault-files")
      .createSignedUrl(doc.file_url, 3600);

    if (error) {
      console.error("Vault download error:", error);
      return;
    }
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  }

  async function handleSaveEdit(docId: string) {
    const { data: updated, error } = await supabase
      .from("vault_documents")
      .update({
        category: editCategory,
        notes: editNotes.trim() || null,
        linked_record_id: editLinkedRecord || null,
      })
      .eq("id", docId)
      .select()
      .single();

    if (!error && updated) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d))
      );
    }
    setEditingDoc(null);
  }

  async function handleDelete(docId: string) {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    const { error: storageError } = await supabase.storage.from("vault-files").remove([doc.file_url]);
    if (storageError) {
      console.error("Vault storage delete error:", storageError);
    }

    const { error } = await supabase
      .from("vault_documents")
      .delete()
      .eq("id", docId);

    if (error) {
      console.error("Vault document delete error:", error);
    } else {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setExpandedDoc(null);
      setDeleteConfirm(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Filtering & sorting                                              */
  /* ---------------------------------------------------------------- */

  const filteredDocs = documents
    .filter((d) => {
      const matchesCat = !filterCategory || d.category === filterCategory;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        d.file_name.toLowerCase().includes(query) ||
        (d.notes && d.notes.toLowerCase().includes(query));
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => {
      if (sortOrder === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortOrder === "name") return a.file_name.localeCompare(b.file_name);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  function getLinkedRecordTitle(recordId: string | null): string | null {
    if (!recordId) return null;
    return records.find((r) => r.id === recordId)?.title || null;
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      {/* ---- UPLOAD FORM ---- */}
      {showUpload ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid var(--color-stone-200)",
            padding: "40px 36px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 28,
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
              Upload Documents
            </h2>
            <button
              onClick={resetUpload}
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

          {/* Drop zone for adding more files */}
          <div
            style={{
              border: "2px dashed #D6D3D1",
              borderRadius: 10,
              padding: "20px 14px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 24,
              position: "relative",
            }}
            onClick={() => document.getElementById("vault-file-input")?.click()}
          >
            <input
              id="vault-file-input"
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              onChange={(e) => handleFileSelect(e.target.files)}
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
            <div
              style={{
                fontSize: 13,
                color: "var(--color-stone-400)",
                fontFamily: "var(--font-sans)",
              }}
            >
              + Add more files
            </div>
          </div>

          {/* Pending file cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {pendingFiles.map((pf, idx) => (
              <div
                key={idx}
                style={{
                  padding: "20px 20px",
                  borderRadius: 12,
                  border: "1px solid var(--color-stone-200)",
                  background: "var(--color-stone-50)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={getFileIcon(pf.file.type, pf.file.name).color}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={getFileIcon(pf.file.type, pf.file.name).path} />
                    </svg>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#1C1917",
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        {pf.file.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-stone-400)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {formatFileSize(pf.file.size)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removePendingFile(idx)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-stone-400)",
                      fontSize: 18,
                      lineHeight: 1,
                    }}
                  >
                    x
                  </button>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <label style={labelStyle}>Category</label>
                    <select
                      value={pf.category}
                      onChange={(e) => updatePendingFile(idx, { category: e.target.value })}
                      style={{ ...inputStyle, cursor: "pointer", fontSize: 13, padding: "10px 12px" }}
                    >
                      {VAULT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 2, minWidth: 200 }}>
                    <label style={labelStyle}>Notes (optional)</label>
                    <input
                      type="text"
                      value={pf.notes}
                      onChange={(e) => updatePendingFile(idx, { notes: e.target.value })}
                      placeholder="Add context about this document"
                      style={{ ...inputStyle, fontSize: 13, padding: "10px 12px" }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <label style={labelStyle}>Link to Record</label>
                    <select
                      value={pf.linkedRecordId}
                      onChange={(e) => updatePendingFile(idx, { linkedRecordId: e.target.value })}
                      style={{ ...inputStyle, cursor: "pointer", fontSize: 13, padding: "10px 12px" }}
                    >
                      <option value="">None</option>
                      {records.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Error */}
          {uploadError && (
            <p style={{ fontSize: 13, color: "#EF4444", marginTop: 16 }}>
              {uploadError}
            </p>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
              marginTop: 28,
            }}
          >
            <button
              onClick={resetUpload}
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
              onClick={handleUploadAll}
              disabled={uploading || pendingFiles.length === 0}
              style={{
                padding: "14px 24px",
                borderRadius: 10,
                border: "none",
                background: "var(--color-green)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                cursor: uploading || pendingFiles.length === 0 ? "not-allowed" : "pointer",
                opacity: uploading || pendingFiles.length === 0 ? 0.6 : 1,
              }}
            >
              {uploading ? "Uploading..." : `Upload ${pendingFiles.length} File${pendingFiles.length !== 1 ? "s" : ""}`}
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
          Loading documents...
        </div>
      ) : documents.length === 0 ? (
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
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
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
              No documents yet
            </h2>

            <p
              style={{
                fontSize: 14,
                color: "var(--color-stone-500)",
                lineHeight: 1.6,
                marginBottom: 28,
              }}
            >
              Upload emails, screenshots, reviews, and other evidence.
              Everything stays private and encrypted.
            </p>

            <label
              style={{
                display: "inline-block",
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
              Upload Document
              <input
                type="file"
                multiple
                accept={ACCEPTED_TYPES}
                onChange={(e) => handleFileSelect(e.target.files)}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>
      ) : (
        /* ---- DOCUMENT LIST ---- */
        <>
          {/* Header */}
          <div
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
                color: "#1C1917",
              }}
            >
              {filteredDocs.length}{" "}
              {filteredDocs.length === 1 ? "Document" : "Documents"}
            </h1>

            <div
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
                placeholder="Search files..."
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #D6D3D1",
                  fontSize: 13,
                  fontFamily: "var(--font-sans)",
                  color: "#1C1917",
                  outline: "none",
                  width: 180,
                  background: "#fff",
                }}
              />

              {/* Category filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #D6D3D1",
                  fontSize: 13,
                  fontFamily: "var(--font-sans)",
                  color: "#1C1917",
                  outline: "none",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <option value="">All Categories</option>
                {VAULT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest" | "name")}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #D6D3D1",
                  fontSize: 13,
                  fontFamily: "var(--font-sans)",
                  color: "#1C1917",
                  outline: "none",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name A-Z</option>
              </select>

              {/* Upload button */}
              <label
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
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                + Upload
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED_TYPES}
                  onChange={(e) => handleFileSelect(e.target.files)}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>

          {/* Drag-and-drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFileSelect(e.dataTransfer.files);
            }}
            style={{
              border: dragOver ? "2px dashed var(--color-green)" : "2px dashed #D6D3D1",
              borderRadius: 10,
              padding: "16px",
              textAlign: "center",
              marginBottom: 20,
              background: dragOver ? "var(--color-green-soft)" : "transparent",
              transition: "all 0.15s",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: dragOver ? "var(--color-green-dark)" : "var(--color-stone-400)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {dragOver ? "Drop files here" : "Drag and drop files here to upload"}
            </div>
          </div>

          {/* Document grid */}
          {filteredDocs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: "var(--color-stone-400)",
                fontSize: 14,
              }}
            >
              No documents match your search.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 12,
              }}
            >
              {filteredDocs.map((doc) => {
                const isExpanded = expandedDoc === doc.id;
                const isEditing = editingDoc === doc.id;
                const icon = getFileIcon(doc.file_type, doc.file_name);
                const linkedTitle = getLinkedRecordTitle(doc.linked_record_id);

                return (
                  <div
                    key={doc.id}
                    style={{
                      background: "#fff",
                      borderRadius: 14,
                      border: "1px solid var(--color-stone-200)",
                      overflow: "hidden",
                      transition: "border-color 0.15s",
                      gridColumn: isExpanded ? "1 / -1" : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (!isExpanded) e.currentTarget.style.borderColor = "var(--color-stone-300)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isExpanded) e.currentTarget.style.borderColor = "var(--color-stone-200)";
                    }}
                  >
                    {/* Card header */}
                    <div
                      onClick={() => {
                        setExpandedDoc(isExpanded ? null : doc.id);
                        if (isExpanded) cancelEdit();
                      }}
                      style={{
                        padding: "18px 20px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 14,
                      }}
                    >
                      {/* File icon */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: icon.color + "10",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={icon.color}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d={icon.path} />
                        </svg>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* File name */}
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#1C1917",
                            fontFamily: "var(--font-sans)",
                            marginBottom: 4,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {doc.file_name}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={getCategoryBadgeStyle(doc.category)}>
                            {doc.category}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--color-stone-400)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {formatDate(doc.created_at)}
                          </span>
                          {doc.file_size && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--color-stone-400)",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {formatFileSize(doc.file_size)}
                            </span>
                          )}
                        </div>

                        {linkedTitle && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--color-stone-500)",
                              marginTop: 4,
                              fontFamily: "var(--font-sans)",
                            }}
                          >
                            Linked: {linkedTitle}
                          </div>
                        )}
                      </div>

                      {/* Chevron */}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-stone-300)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          flexShrink: 0,
                          marginTop: 4,
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
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
                          padding: "0 20px 20px",
                          borderTop: "1px solid var(--color-stone-100)",
                        }}
                      >
                        {/* Image preview */}
                        {doc.file_type?.startsWith("image/") && (
                          <div style={{ marginTop: 16, marginBottom: 16 }}>
                            <ImagePreview doc={doc} supabase={supabase} />
                          </div>
                        )}

                        {/* Metadata */}
                        <div style={{ marginTop: 16 }}>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 12,
                              marginBottom: 16,
                            }}
                          >
                            <div>
                              <label style={labelStyle}>File Type</label>
                              <p style={{ fontSize: 13, color: "var(--color-stone-700)" }}>
                                {doc.file_type || "Unknown"}
                              </p>
                            </div>
                            <div>
                              <label style={labelStyle}>File Size</label>
                              <p style={{ fontSize: 13, color: "var(--color-stone-700)" }}>
                                {formatFileSize(doc.file_size)}
                              </p>
                            </div>
                          </div>

                          {/* Editable fields */}
                          {isEditing ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                              <div>
                                <label style={labelStyle}>Category</label>
                                <select
                                  value={editCategory}
                                  onChange={(e) => setEditCategory(e.target.value)}
                                  style={{ ...inputStyle, cursor: "pointer", fontSize: 13, padding: "10px 12px" }}
                                >
                                  {VAULT_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label style={labelStyle}>Notes</label>
                                <textarea
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  placeholder="Add context about this document"
                                  rows={3}
                                  style={{ ...inputStyle, resize: "vertical", fontSize: 13, padding: "10px 12px" }}
                                />
                              </div>
                              <div>
                                <label style={labelStyle}>Link to Record</label>
                                <select
                                  value={editLinkedRecord}
                                  onChange={(e) => setEditLinkedRecord(e.target.value)}
                                  style={{ ...inputStyle, cursor: "pointer", fontSize: 13, padding: "10px 12px" }}
                                >
                                  <option value="">None</option>
                                  {records.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div style={{ display: "flex", gap: 10 }}>
                                <button
                                  onClick={() => handleSaveEdit(doc.id)}
                                  style={{
                                    padding: "10px 20px",
                                    borderRadius: 8,
                                    border: "none",
                                    background: "var(--color-green)",
                                    color: "#fff",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    fontFamily: "var(--font-sans)",
                                    cursor: "pointer",
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  style={{
                                    padding: "10px 20px",
                                    borderRadius: 8,
                                    border: "1px solid #D6D3D1",
                                    background: "#fff",
                                    color: "#44403C",
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
                          ) : (
                            <>
                              {doc.notes && (
                                <div style={{ marginBottom: 12 }}>
                                  <label style={labelStyle}>Notes</label>
                                  <p
                                    style={{
                                      fontSize: 13,
                                      color: "var(--color-stone-700)",
                                      lineHeight: 1.6,
                                      whiteSpace: "pre-wrap",
                                    }}
                                  >
                                    {doc.notes}
                                  </p>
                                </div>
                              )}
                              {linkedTitle && (
                                <div style={{ marginBottom: 12 }}>
                                  <label style={labelStyle}>Linked Record</label>
                                  <p style={{ fontSize: 13, color: "var(--color-stone-700)" }}>
                                    {linkedTitle}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Action buttons */}
                        {!isEditing && (
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              marginTop: 16,
                              paddingTop: 16,
                              borderTop: "1px solid var(--color-stone-100)",
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(doc);
                              }}
                              style={{
                                padding: "10px 20px",
                                borderRadius: 8,
                                border: "none",
                                background: "var(--color-green)",
                                color: "#fff",
                                fontSize: 13,
                                fontWeight: 600,
                                fontFamily: "var(--font-sans)",
                                cursor: "pointer",
                              }}
                            >
                              Download
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(doc);
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
                                setDeleteConfirm(doc.id);
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
                        )}
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
                color: "#1C1917",
                marginBottom: 10,
              }}
            >
              Delete this document?
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-stone-500)",
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              This action cannot be undone. The document will be permanently
              removed from your vault.
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

/* ------------------------------------------------------------------ */
/*  Image Preview (sub-component)                                      */
/* ------------------------------------------------------------------ */

function ImagePreview({
  doc,
  supabase,
}: {
  doc: VaultDocument;
  supabase: ReturnType<typeof createClient>;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.storage
        .from("vault-files")
        .createSignedUrl(doc.file_url, 3600);
      if (data?.signedUrl) setUrl(data.signedUrl);
    }
    load();
  }, [doc.file_url, supabase]);

  if (!url) return null;

  return (
    <img
      src={url}
      alt={doc.file_name}
      style={{
        maxWidth: "100%",
        maxHeight: 300,
        borderRadius: 8,
        border: "1px solid var(--color-stone-200)",
      }}
    />
  );
}
