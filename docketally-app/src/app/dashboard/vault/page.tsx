"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/components/SubscriptionProvider";
import { hasActiveAccess } from "@/lib/subscription";
import ProGate from "@/components/ProGate";
import EducationCard from "@/components/EducationCard";

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

interface CaseRecord {
  id: string;
  name: string;
}

interface PendingFile {
  file: File;
  category: string;
  notes: string;
  linkedRecordId: string;
}

interface UploadingFile {
  name: string;
  progress: number;
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
  "Audio",
  "HR Document",
  "Legal Document",
  "Other",
];

const WARNING_CATEGORIES = new Set(["PIP Document", "HR Document", "Legal Document"]);
const INFO_CATEGORIES = new Set(["Email/Correspondence", "Slack/Chat Export"]);

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp3,.m4a,.wav";

const ALLOWED_FILE_TYPES: Record<string, { ext: string; maxSize: number; icon: string }> = {
  "application/pdf": { ext: "PDF", maxSize: 25 * 1024 * 1024, icon: "pdf" },
  "application/msword": { ext: "DOC", maxSize: 25 * 1024 * 1024, icon: "doc" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "DOCX", maxSize: 25 * 1024 * 1024, icon: "doc" },
  "image/png": { ext: "PNG", maxSize: 10 * 1024 * 1024, icon: "image" },
  "image/jpeg": { ext: "JPG", maxSize: 10 * 1024 * 1024, icon: "image" },
  "image/webp": { ext: "WEBP", maxSize: 10 * 1024 * 1024, icon: "image" },
  "audio/mpeg": { ext: "MP3", maxSize: 50 * 1024 * 1024, icon: "audio" },
  "audio/mp4": { ext: "M4A", maxSize: 50 * 1024 * 1024, icon: "audio" },
  "audio/wav": { ext: "WAV", maxSize: 50 * 1024 * 1024, icon: "audio" },
};

const STORAGE_LIMITS = {
  trial: { maxFiles: 20, maxStorageMB: 500, label: "Free Trial" },
  paid: { maxFiles: 200, maxStorageMB: 5000, label: "Pro" },
};

function getCategoryBadgeStyle(category: string): React.CSSProperties {
  const isWarning = WARNING_CATEGORIES.has(category);
  const isInfo = INFO_CATEGORIES.has(category);
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
    color: isWarning ? "#991B1B" : isInfo ? "#1E40AF" : "#292524",
    background: isWarning ? "#FEF2F2" : isInfo ? "#EFF6FF" : "#F5F5F4",
    border: isWarning
      ? "1px solid #FECACA"
      : isInfo
        ? "1px solid #BFDBFE"
        : "1px solid #D6D3D1",
  };
}

function getFileTypeIcon(fileName: string): {
  label: string;
  bg: string;
  color: string;
  border: string;
} {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return { label: "PDF", bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" };
  if (ext === "doc" || ext === "docx") return { label: "DOC", bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" };
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return { label: "IMG", bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE" };
  if (["mp3", "m4a", "wav"].includes(ext)) return { label: ext.toUpperCase(), bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" };
  return { label: ext.toUpperCase().slice(0, 3) || "FILE", bg: "#F5F5F4", color: "#292524", border: "#E7E5E4" };
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

export default function VaultPage() {
  const subscription = useSubscription();
  if (!hasActiveAccess(subscription)) return <ProGate feature="Vault" />;

  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [recentlyUploaded, setRecentlyUploaded] = useState<Set<string>>(new Set());

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "name">("newest");

  // Cases & Packet
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [generatingPacket, setGeneratingPacket] = useState(false);
  const [showCaseSelector, setShowCaseSelector] = useState(false);
  const caseSelectorRef = useRef<HTMLDivElement>(null);

  // Upload
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [uploadErrorUpgrade, setUploadErrorUpgrade] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

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

  const fetchCases = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("cases")
      .select("id, name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setCases(data);
  }, [userId, supabase]);

  useEffect(() => {
    if (userId) {
      fetchDocuments();
      fetchRecords();
      fetchCases();
    }
  }, [userId, fetchDocuments, fetchRecords, fetchCases]);

  // Close case selector on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (caseSelectorRef.current && !caseSelectorRef.current.contains(e.target as Node)) {
        setShowCaseSelector(false);
      }
    }
    if (showCaseSelector) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showCaseSelector]);

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

  function validateUpload(file: File): { valid: boolean; error?: string; upgrade?: boolean } {
    const userPlan = subscription.subscriptionStatus === "active" ? "paid" : "trial";
    const limits = STORAGE_LIMITS[userPlan];
    const fileType = ALLOWED_FILE_TYPES[file.type];

    if (!fileType) {
      return { valid: false, error: `${file.name} is not a supported file type. Upload PDF, DOC, PNG, JPG, or audio files.` };
    }
    if (file.size > fileType.maxSize) {
      const maxMB = fileType.maxSize / (1024 * 1024);
      return { valid: false, error: `${file.name} is too large. ${fileType.ext} files must be under ${maxMB}MB.` };
    }
    if (documents.length >= limits.maxFiles) {
      return { valid: false, error: `You've reached the ${limits.maxFiles} file limit on your ${limits.label} plan.`, upgrade: userPlan === "trial" };
    }
    const currentStorageMB = documents.reduce((sum, f) => sum + (f.file_size || 0), 0) / (1024 * 1024);
    const newFileMB = file.size / (1024 * 1024);
    if (currentStorageMB + newFileMB > limits.maxStorageMB) {
      return { valid: false, error: `Not enough storage. You've used ${Math.round(currentStorageMB)}MB of ${limits.maxStorageMB}MB.`, upgrade: userPlan === "trial" };
    }
    return { valid: true };
  }

  function handleFileSelect(fileList: FileList | null) {
    if (!fileList) return;
    setUploadError("");
    setUploadErrorUpgrade(false);

    const newPending: PendingFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const result = validateUpload(file);
      if (!result.valid) {
        setUploadError(result.error || "Upload failed.");
        if (result.upgrade) setUploadErrorUpgrade(true);
        continue;
      }
      newPending.push({
        file,
        category: "General",
        notes: "",
        linkedRecordId: "",
      });
    }

    // Auto-dismiss error after 5 seconds
    if (newPending.length === 0 && fileList.length > 0) {
      setTimeout(() => { setUploadError(""); setUploadErrorUpgrade(false); }, 5000);
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
    setUploadErrorUpgrade(false);
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

    // Show uploading indicators
    setUploadingFiles(pendingFiles.map((pf) => ({ name: pf.file.name, progress: 0 })));

    // Refresh session to ensure auth token is current
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error("Vault auth session error:", sessionError || "No active session");
      setUploadError("Authentication expired. Please refresh the page and log in again.");
      setUploading(false);
      setUploadingFiles([]);
      return;
    }

    const uploadedIds: string[] = [];

    for (let i = 0; i < pendingFiles.length; i++) {
      const pf = pendingFiles[i];
      const docId = crypto.randomUUID();
      /* Sanitize filename for Supabase storage key: replace spaces with
         underscores and strip characters that aren't alphanumeric, dash,
         underscore, or dot. Keep original name for display in the DB. */
      const safeName = pf.file.name
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_\-\.]/g, "");
      const path = `${userId}/${safeName}`;

      // Simulate progress: start
      setUploadingFiles((prev) =>
        prev.map((uf, idx) => (idx === i ? { ...uf, progress: 30 } : uf))
      );

      console.log("Vault upload: storage path =", path, "| bucket = vault-files");
      const { error: storageError } = await supabase.storage
        .from("vault-files")
        .upload(path, pf.file, { upsert: true });

      if (storageError) {
        console.error("Vault storage upload error:", storageError);
        setUploadError(`Failed to upload "${pf.file.name}": ${storageError.message}`);
        continue;
      }

      // Progress: storage done
      setUploadingFiles((prev) =>
        prev.map((uf, idx) => (idx === i ? { ...uf, progress: 70 } : uf))
      );

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
      } else {
        uploadedIds.push(docId);
      }

      // Progress: complete
      setUploadingFiles((prev) =>
        prev.map((uf, idx) => (idx === i ? { ...uf, progress: 100 } : uf))
      );
    }

    await fetchDocuments();
    resetUpload();
    setUploading(false);
    setUploadingFiles([]);

    // Flash recently uploaded cards
    if (uploadedIds.length > 0) {
      setRecentlyUploaded(new Set(uploadedIds));
      setTimeout(() => setRecentlyUploaded(new Set()), 1500);
    }
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
  /*  Packet generation                                                */
  /* ---------------------------------------------------------------- */

  async function generateVaultPacket(caseId: string) {
    setGeneratingPacket(true);
    setShowCaseSelector(false);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Fetch case info and linked record IDs
      const [caseRes, linksRes] = await Promise.all([
        supabase.from("cases").select("name").eq("id", caseId).single(),
        supabase.from("case_records").select("record_id").eq("case_id", caseId),
      ]);

      const caseName = caseRes.data?.name || "Case";
      const today = new Date().toISOString().split("T")[0];
      const safeName = caseName.replace(/[^a-zA-Z0-9]/g, "-");
      const folderName = `DocketAlly-${safeName}-${today}`;
      const folder = zip.folder(folderName)!;

      const caseRecordIds = new Set(
        (linksRes.data || []).map((l: { record_id: string }) => l.record_id)
      );

      // Fetch records for exhibit letter ordering
      let caseRecords: { id: string; date: string }[] = [];
      if (caseRecordIds.size > 0) {
        const { data: recs } = await supabase
          .from("records")
          .select("id, date")
          .in("id", Array.from(caseRecordIds))
          .order("date", { ascending: true });
        if (recs) caseRecords = recs;
      }

      // Build linked docs map scoped to case records
      const linkedDocsMap: Record<string, VaultDocument[]> = {};
      documents.forEach((doc) => {
        if (doc.linked_record_id && caseRecordIds.has(doc.linked_record_id)) {
          if (!linkedDocsMap[doc.linked_record_id]) linkedDocsMap[doc.linked_record_id] = [];
          linkedDocsMap[doc.linked_record_id].push(doc);
        }
      });

      // Compute exhibit letters (same as CaseFileDocument)
      const sortedRecords = [...caseRecords].sort(
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

      // Download vault files
      const evidenceFolder = folder.folder("Evidence")!;
      let evidenceCount = 0;

      const caseLinkedDocs = documents.filter(
        (d) => d.file_url && d.linked_record_id && caseRecordIds.has(d.linked_record_id)
      );

      for (const doc of caseLinkedDocs) {
        const letter = exhibitMap.get(doc.id);
        if (!letter) continue;
        const ext = doc.file_name.includes(".") ? doc.file_name.substring(doc.file_name.lastIndexOf(".")) : "";
        const baseName = doc.file_name.includes(".")
          ? doc.file_name.substring(0, doc.file_name.lastIndexOf("."))
          : doc.file_name;
        const safeBase = baseName.replace(/[^a-zA-Z0-9_\-. ]/g, "_");
        const fileName = `Ex-${letter}_${safeBase}${ext}`;

        try {
          const { data, error } = await supabase.storage
            .from("vault-files")
            .download(doc.file_url);
          if (error || !data) continue;
          evidenceFolder.file(fileName, data);
          evidenceCount++;
        } catch {
          // skip failed downloads
        }
      }

      // Fallback: include all vault files with "Unlinked-" prefix
      if (evidenceCount === 0 && documents.length > 0) {
        for (const doc of documents) {
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
            if (error || !data) continue;
            evidenceFolder.file(fileName, data);
          } catch {
            // skip failed downloads
          }
        }
      }

      // README
      const readmeText = `Evidence Packet: ${caseName}
Generated by DocketAlly on ${today}.

This packet contains vault files linked to records in your case.
Exhibit letters (Ex-A, Ex-B, etc.) match the exhibit references in your Case File document.

To generate the full Attorney Packet with the Case File PDF, use the Packet button on the Case page.

DocketAlly provides documentation and risk awareness tools. This is not legal advice.`;

      folder.file("README.txt", readmeText);

      // Generate and download ZIP
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
      console.error("Vault packet generation error:", err);
    }

    setGeneratingPacket(false);
  }

  function handlePacketClick() {
    if (cases.length === 0) return;
    if (cases.length === 1) {
      generateVaultPacket(cases[0].id);
    } else {
      setShowCaseSelector((prev) => !prev);
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
    <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 1060, margin: "0 auto" }}>
      {/* ---- EDUCATION CARD ---- */}
      <EducationCard
        pageKey="vault"
        label="How the vault works"
        title="Your files, encrypted and private."
        description="Upload emails, screenshots, or reviews that support your records. Everything is stored securely and only visible to you. Link evidence to specific records to strengthen your documentation."
        steps={["Upload a file", "Link to a record", "Appears in your timeline"]}
        userId={userId}
      />

      {/* ---- UPLOAD FORM ---- */}
      {showUpload ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid var(--color-stone-300)",
            padding: "40px 36px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
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
                fontFamily: "var(--font-sans)",
                fontSize: 22,
                fontWeight: 700,
                color: "#292524",
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
                color: "var(--color-stone-500)",
                fontFamily: "var(--font-sans)",
              }}
            >
              + Add more files
            </div>
          </div>

          {/* Pending file cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {pendingFiles.map((pf, idx) => {
              const typeIcon = getFileTypeIcon(pf.file.name);
              return (
                <div
                  key={idx}
                  style={{
                    padding: "20px 20px",
                    borderRadius: 12,
                    border: "1px solid var(--color-stone-300)",
                    background: "var(--color-stone-50)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
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
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* File type icon */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: typeIcon.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          fontWeight: 700,
                          color: typeIcon.color,
                          letterSpacing: "0.04em",
                          flexShrink: 0,
                        }}
                      >
                        {typeIcon.label}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#292524",
                            fontFamily: "var(--font-sans)",
                          }}
                        >
                          {pf.file.name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-stone-500)",
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
                        color: "var(--color-stone-500)",
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
              );
            })}
          </div>

          {/* Error */}
          {uploadError && (
            <div style={{ background: "#FEF2F2", border: "2px dashed #FECACA", color: "#991B1B", fontFamily: "var(--font-sans)", fontSize: 13, padding: "12px 16px", borderRadius: 8, textAlign: "center", marginTop: 16 }}>
              {uploadError}
              {uploadErrorUpgrade && (
                <div style={{ marginTop: 6 }}>
                  <a href="/dashboard/billing" style={{ color: "#991B1B", fontWeight: 600, textDecoration: "underline" }}>Upgrade your plan &rarr;</a>
                </div>
              )}
            </div>
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
            color: "var(--color-stone-500)",
            fontSize: 15,
            fontFamily: "var(--font-sans)",
          }}
        >
          Loading documents...
        </div>
      ) : (
        /* ---- MAIN VIEW (empty or with documents) ---- */
        <>
          {/* Page header */}
          <div style={{ marginBottom: 28 }}>
            <h1
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 28,
                fontWeight: 600,
                color: "#292524",
                marginBottom: 6,
              }}
            >
              Vault
            </h1>
            <p
              style={{
                fontSize: 15,
                color: "#292524",
                fontFamily: "var(--font-sans)",
                lineHeight: 1.5,
              }}
            >
              Upload screenshots, emails, and documents as evidence. Link files to records for a complete picture.
            </p>
            <p style={{ fontSize: 12, color: "#78716C", fontFamily: "var(--font-sans)", fontStyle: "italic", display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Your files are encrypted and only visible to you.
            </p>
          </div>

          {/* Search/filter/upload row */}
          <div
            className="da-vault-toolbar"
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 24,
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
                color: "#292524",
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
                color: "#292524",
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
                color: "#292524",
                outline: "none",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A-Z</option>
            </select>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Packet button */}
            {cases.length > 0 && (
              <div ref={caseSelectorRef} style={{ position: "relative" }}>
                <button
                  onClick={handlePacketClick}
                  disabled={generatingPacket || documents.length === 0}
                  title="Download Evidence Packet (ZIP)"
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "1px solid #E7E5E4",
                    background: "#fff",
                    color: "#78716C",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                    cursor: generatingPacket || documents.length === 0 ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    opacity: generatingPacket || documents.length === 0 ? 0.4 : 1,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  </svg>
                  {generatingPacket ? "Generating..." : "Packet"}
                </button>

                {/* Case selector dropdown */}
                {showCaseSelector && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: 4,
                      background: "#fff",
                      borderRadius: 10,
                      border: "1px solid #E7E5E4",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      zIndex: 50,
                      minWidth: 200,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ padding: "8px 12px", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Select case
                    </div>
                    {cases.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => generateVaultPacket(c.id)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "none",
                          border: "none",
                          borderTop: "1px solid #F5F5F4",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: 13,
                          fontWeight: 500,
                          fontFamily: "var(--font-sans)",
                          color: "#292524",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F5F4"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                boxShadow: "0 1px 4px rgba(34,197,94,0.3)",
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

          {/* Storage usage indicator */}
          {(() => {
            const userPlan = subscription.subscriptionStatus === "active" ? "paid" : "trial";
            const limits = STORAGE_LIMITS[userPlan];
            const totalSizeMB = documents.reduce((sum, f) => sum + (f.file_size || 0), 0) / (1024 * 1024);
            const pct = limits.maxStorageMB > 0 ? Math.min((totalSizeMB / limits.maxStorageMB) * 100, 100) : 0;
            const barColor = pct > 95 ? "#DC2626" : pct > 80 ? "#F59E0B" : "#22C55E";
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                <div style={{ width: 120, height: 4, background: "#F5F5F4", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, transition: "width 0.3s ease" }} />
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#A8A29E" }}>
                  {Math.round(totalSizeMB)}MB of {limits.maxStorageMB >= 1000 ? `${(limits.maxStorageMB / 1000).toFixed(0)}GB` : `${limits.maxStorageMB}MB`} used &middot; {documents.length} of {limits.maxFiles} files
                </span>
              </div>
            );
          })()}

          {/* ---- Drop zone ---- */}
          <div
            className="da-vault-dropzone"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFileSelect(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: dragOver ? "#DCFCE7" : "#F0FDF4",
              border: dragOver ? "2px dashed #22C55E" : "2px dashed #BBF7D0",
              borderRadius: 14,
              padding: "40px 24px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
              marginBottom: 28,
              boxShadow: dragOver ? "0 0 0 4px rgba(34,197,94,0.08)" : "none",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              onChange={(e) => { handleFileSelect(e.target.files); if (e.target) e.target.value = ""; }}
              style={{ display: "none" }}
            />

            {/* Cloud upload icon */}
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22C55E"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: "0 auto", display: "block" }}
            >
              <path d="M16 16l-4-4-4 4" />
              <path d="M12 12v9" />
              <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
              <path d="M16 16l-4-4-4 4" />
            </svg>

            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                fontWeight: 600,
                color: "#292524",
                marginTop: 12,
              }}
            >
              {dragOver ? "Drop files here" : "Drag files here or click to upload"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "#292524",
                marginTop: 4,
              }}
            >
              PDF, DOC, PNG, JPG, MP3, M4A up to 25MB per file
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "8px 20px",
                border: "1px solid #D6D3D1",
                borderRadius: 8,
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "#292524",
                marginTop: 16,
                background: "#fff",
              }}
            >
              Browse Files
            </div>
          </div>

          {/* Drop zone validation error */}
          {uploadError && !showUpload && (
            <div style={{ background: "#FEF2F2", border: "2px dashed #FECACA", color: "#991B1B", fontFamily: "var(--font-sans)", fontSize: 13, padding: "12px 16px", borderRadius: 8, textAlign: "center", marginBottom: 20, marginTop: -16 }}>
              {uploadError}
              {uploadErrorUpgrade && (
                <span>{" "}<a href="/dashboard/billing" style={{ color: "#991B1B", fontWeight: 600, textDecoration: "underline" }}>Upgrade your plan &rarr;</a></span>
              )}
            </div>
          )}

          {documents.length === 0 && filteredDocs.length === 0 ? (
            /* ---- EMPTY STATE ---- */
            <div style={{ textAlign: "center", padding: "40px 20px 60px" }}>
              {/* Folder icon */}
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <polyline points="9 14 12 11 15 14" />
                </svg>
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#292524",
                  marginBottom: 8,
                }}
              >
                No documents yet
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#292524",
                  fontFamily: "var(--font-sans)",
                  maxWidth: 400,
                  margin: "0 auto",
                  lineHeight: 1.6,
                }}
              >
                Upload evidence, emails, reviews, and other supporting documents. Files are encrypted and stored securely.
              </p>
            </div>
          ) : (
            /* ---- DOCUMENT LIST ---- */
            <>
              {/* Upload progress cards */}
              {uploadingFiles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                  {uploadingFiles.map((uf, idx) => {
                    const typeIcon = getFileTypeIcon(uf.name);
                    return (
                      <div
                        key={`uploading-${idx}`}
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #D6D3D1",
                          borderRadius: 12,
                          padding: "16px 20px",
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
                        }}
                      >
                        {/* File type icon */}
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: typeIcon.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            fontWeight: 700,
                            color: typeIcon.color,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            flexShrink: 0,
                          }}
                        >
                          {typeIcon.label}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#292524",
                              fontFamily: "var(--font-sans)",
                              marginBottom: 8,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {uf.name}
                          </div>
                          {/* Progress bar */}
                          <div
                            style={{
                              width: "100%",
                              height: 3,
                              background: "#D6D3D1",
                              borderRadius: 2,
                              overflow: "hidden",
                              marginBottom: 4,
                            }}
                          >
                            <div
                              style={{
                                width: `${uf.progress}%`,
                                height: "100%",
                                background: "#22C55E",
                                borderRadius: 2,
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#22C55E",
                              fontFamily: "var(--font-sans)",
                              fontWeight: 600,
                            }}
                          >
                            Uploading...
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Section label */}
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#292524",
                  marginBottom: 12,
                }}
              >
                {filteredDocs.length} {filteredDocs.length === 1 ? "Document" : "Documents"}
              </div>

              {/* Document list or no-match */}
              {filteredDocs.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 60,
                    color: "var(--color-stone-500)",
                    fontSize: 14,
                  }}
                >
                  No documents match your search.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredDocs.map((doc) => {
                    const isExpanded = expandedDoc === doc.id;
                    const isEditing = editingDoc === doc.id;
                    const typeIcon = getFileTypeIcon(doc.file_name);
                    const linkedTitle = getLinkedRecordTitle(doc.linked_record_id);
                    const isRecent = recentlyUploaded.has(doc.id);

                    return (
                      <div
                        key={doc.id}
                        style={{
                          background: isRecent ? "#F0FDF4" : "#FFFFFF",
                          border: "1px solid #D6D3D1",
                          borderRadius: 12,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
                          transition: "all 0.15s ease, background 1s ease",
                          overflow: "hidden",
                        }}
                        onMouseEnter={(e) => {
                          if (!isExpanded) {
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
                            e.currentTarget.style.borderColor = "#D6D3D1";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) {
                            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                            e.currentTarget.style.borderColor = "#D6D3D1";
                          }
                        }}
                      >
                        {/* Card row */}
                        <div
                          onClick={() => {
                            setExpandedDoc(isExpanded ? null : doc.id);
                            if (isExpanded) cancelEdit();
                          }}
                          style={{
                            padding: "16px 20px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                          }}
                        >
                          {/* File type icon */}
                          <div
                            className="da-vault-file-icon"
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: typeIcon.bg,
                              border: `1px solid ${typeIcon.border}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "var(--font-mono)",
                              fontSize: 9,
                              fontWeight: 700,
                              color: typeIcon.color,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              flexShrink: 0,
                            }}
                          >
                            {typeIcon.label}
                          </div>

                          {/* File info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: "#292524",
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
                                gap: 6,
                                flexWrap: "wrap",
                                fontSize: 12,
                                color: "#292524",
                                fontFamily: "var(--font-sans)",
                              }}
                            >
                              <span style={getCategoryBadgeStyle(doc.category)}>
                                {doc.category}
                              </span>
                              <span style={{ color: "#D6D3D1" }}>&middot;</span>
                              <span>{formatDate(doc.created_at)}</span>
                              {doc.file_size ? (
                                <>
                                  <span style={{ color: "#D6D3D1" }}>&middot;</span>
                                  <span>{formatFileSize(doc.file_size)}</span>
                                </>
                              ) : null}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div
                            className="da-vault-card-actions"
                            style={{ display: "flex", gap: 4, flexShrink: 0 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Download */}
                            <button
                              onClick={() => handleDownload(doc)}
                              title="Download"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#292524",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#F5F5F4";
                                e.currentTarget.style.color = "#292524";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "#292524";
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => setDeleteConfirm(doc.id)}
                              title="Delete"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#292524",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#FEF2F2";
                                e.currentTarget.style.color = "#DC2626";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "#292524";
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          </div>
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
                                className="da-vault-fields-grid"
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: 12,
                                  marginBottom: 16,
                                }}
                              >
                                <div>
                                  <label style={labelStyle}>File Type</label>
                                  <p style={{ fontSize: 13, color: "var(--color-stone-800)" }}>
                                    {doc.file_type || "Unknown"}
                                  </p>
                                </div>
                                <div>
                                  <label style={labelStyle}>File Size</label>
                                  <p style={{ fontSize: 13, color: "var(--color-stone-800)" }}>
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
                              ) : (
                                <>
                                  {doc.notes && (
                                    <div style={{ marginBottom: 12 }}>
                                      <label style={labelStyle}>Notes</label>
                                      <p
                                        style={{
                                          fontSize: 13,
                                          color: "var(--color-stone-800)",
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
                                      <p style={{ fontSize: 13, color: "var(--color-stone-800)" }}>
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
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 18,
                fontWeight: 600,
                color: "#292524",
                marginBottom: 10,
              }}
            >
              Delete this document?
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-stone-600)",
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
                  color: "#292524",
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

      {/* Attorney packet note */}
      {documents.length > 0 && (
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--color-stone-400)", fontFamily: "var(--font-sans)", marginTop: 40, lineHeight: 1.6 }}>
          Your files can be included in an attorney packet. Download from any case&apos;s Case File tab.
        </p>
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
        border: "1px solid var(--color-stone-300)",
      }}
    />
  );
}
