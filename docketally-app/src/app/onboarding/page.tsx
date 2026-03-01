"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const REASONS = [
  "Performance Improvement Plan (PIP)",
  "Discrimination or bias",
  "Starting a new role, documenting proactively",
  "Retaliation after speaking up",
  "Building a record of my contributions",
  "Hostile work environment",
  "Wrongful termination concern",
  "Just want to protect myself",
];

const REASON_TO_CASE_TYPE: Record<string, string> = {
  "Performance Improvement Plan (PIP)": "PIP Dispute",
  "Discrimination or bias": "Discrimination",
  "Starting a new role, documenting proactively": "General",
  "Retaliation after speaking up": "Retaliation",
  "Building a record of my contributions": "General",
  "Hostile work environment": "Hostile Work Environment",
  "Wrongful termination concern": "Wrongful Termination",
  "Just want to protect myself": "General",
};

const EVENT_CARDS = [
  { value: "1:1 Meeting", label: "1:1 Meeting", desc: "A conversation with your manager or HR" },
  { value: "Written Communication", label: "Written Communication", desc: "An email, Slack message, or letter" },
  { value: "Incident", label: "Incident", desc: "Something that happened at work" },
  { value: "Performance Review", label: "Performance Review", desc: "A formal evaluation or feedback" },
];

const EVENT_TO_ENTRY: Record<string, string> = {
  "1:1 Meeting": "1:1 Meeting",
  "Written Communication": "Written Communication",
  "Incident": "Incident",
  "Performance Review": "Feedback Received",
};

const WHATS_NEXT = [
  "Add more records as events happen",
  "Upload evidence files to your Vault",
  "Use Comms templates to respond professionally",
  "Download your case file PDF anytime",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  // Auth
  const [userId, setUserId] = useState<string | null>(null);

  // Step
  const [step, setStep] = useState(1);

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);

  // Step 2
  const [employer, setEmployer] = useState("");
  const [role, setRole] = useState("");
  const [startDate, setStartDate] = useState("");

  // Step 3
  const [eventType, setEventType] = useState("");
  const [recordTitle, setRecordTitle] = useState("");
  const [narrative, setNarrative] = useState("");
  const [people, setPeople] = useState("");
  const [eventDate, setEventDate] = useState("");

  // Saving
  const [saving, setSaving] = useState(false);

  /* ---- Auth check ---- */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
    })();
  }, [supabase, router]);

  /* ---- Helpers ---- */
  function toggleReason(r: string) {
    setReasons((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }

  function mapReasonsToCaseTypes(selected: string[]): string[] {
    const mapped = selected.map((r) => REASON_TO_CASE_TYPE[r] || "General");
    const unique = [...new Set(mapped)];
    // If there are non-General types, filter out General
    const nonGeneral = unique.filter((t) => t !== "General");
    return nonGeneral.length > 0 ? nonGeneral : ["General"];
  }

  /* ---- Step validation ---- */
  const step1Valid = firstName.trim().length > 0 && reasons.length > 0;
  const step2Valid = employer.trim().length > 0;
  const step3Valid = recordTitle.trim().length > 0 && narrative.trim().length > 0;

  /* ---- Finish handler ---- */
  async function handleFinish() {
    if (!userId || saving) return;
    setSaving(true);

    // 1. Create case
    const caseTypes = mapReasonsToCaseTypes(reasons);
    const { data: newCase } = await supabase
      .from("cases")
      .insert({
        user_id: userId,
        name: employer.trim(),
        case_types: caseTypes,
        case_type: caseTypes[0] || "General",
        status: "active",
        employer: employer.trim(),
        role: role.trim() || null,
        start_date: startDate || null,
      })
      .select()
      .single();

    // 2. Create record
    const entryType = EVENT_TO_ENTRY[eventType] || "Other";
    const { data: newRecord } = await supabase
      .from("records")
      .insert({
        user_id: userId,
        title: recordTitle.trim(),
        entry_type: entryType,
        date: eventDate || new Date().toISOString().split("T")[0],
        narrative: narrative.trim(),
        people: people.trim() || null,
      })
      .select()
      .single();

    // 3. Link record to case
    if (newCase && newRecord) {
      await supabase.from("case_records").insert({
        case_id: newCase.id,
        record_id: newRecord.id,
        user_id: userId,
      });
    }

    // 4. Update profile
    await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        full_name: firstName.trim(),
      })
      .eq("id", userId);

    setSaving(false);
    setStep(4);
  }

  /* ---- Progress indicator ---- */
  function ProgressBar() {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 36 }}>
        {[1, 2, 3, 4].map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
                background: s < step ? "#22C55E" : s === step ? "#22C55E" : "#E7E5E4",
                color: s <= step ? "#fff" : "#A8A29E",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {s < step ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              ) : (
                s
              )}
            </div>
            {i < 3 && (
              <div
                style={{
                  width: 48,
                  height: 2,
                  background: s < step ? "#22C55E" : "#E7E5E4",
                  transition: "background 0.2s",
                }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  /* ---- Render ---- */
  if (!userId) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 14, color: "#A8A29E" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF9", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Logo */}
      <div style={{ padding: "40px 0 32px", textAlign: "center" }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 700, color: "#292524" }}>Docket</span>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 700, color: "#22C55E" }}>Ally</span>
      </div>

      {/* Progress */}
      <ProgressBar />

      {/* Step card */}
      <div style={{ maxWidth: 560, width: "100%", padding: "0 20px", marginBottom: 40 }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid #E7E5E4",
            borderRadius: 16,
            padding: "36px 40px",
          }}
        >

          {/* ========== STEP 1: WELCOME ========== */}
          {step === 1 && (
            <>
              <h1 style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 700, color: "#292524", marginBottom: 8, letterSpacing: "-0.02em" }}>
                Welcome to DocketAlly
              </h1>
              <p style={{ fontSize: 15, color: "#78716C", lineHeight: 1.6, marginBottom: 28 }}>
                We'll set up your workspace in under 2 minutes. Everything you create here is private and encrypted.
              </p>

              {/* First name */}
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#292524", marginBottom: 6 }}>
                What's your first name?
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                style={{ width: "100%", marginBottom: 24, padding: "12px 14px", border: "1px solid #D6D3D1", borderRadius: 8, fontSize: 14, fontFamily: "var(--font-sans)", outline: "none" }}
              />

              {/* Reasons */}
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#292524", marginBottom: 10 }}>
                What brings you here? <span style={{ fontWeight: 400, color: "#A8A29E" }}>(select all that apply)</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {REASONS.map((r) => {
                  const sel = reasons.includes(r);
                  return (
                    <button
                      key={r}
                      onClick={() => toggleReason(r)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: sel ? "2px solid #22C55E" : "1px solid #D6D3D1",
                        background: sel ? "#F0FDF4" : "#fff",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: 14,
                        fontFamily: "var(--font-sans)",
                        fontWeight: 500,
                        color: "#292524",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      <span>{r}</span>
                      {sel && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Continue */}
              <button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  borderRadius: 10,
                  border: "none",
                  background: step1Valid ? "#22C55E" : "#D6D3D1",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: step1Valid ? "pointer" : "not-allowed",
                }}
              >
                Continue
              </button>
            </>
          )}

          {/* ========== STEP 2: YOUR SITUATION ========== */}
          {step === 2 && (
            <>
              <h1 style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 700, color: "#292524", marginBottom: 8, letterSpacing: "-0.02em" }}>
                Your situation
              </h1>
              <p style={{ fontSize: 15, color: "#78716C", lineHeight: 1.6, marginBottom: 28 }}>
                This creates your first case. You can always update these details later.
              </p>

              {/* Employer */}
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#292524", marginBottom: 6 }}>
                Employer name <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                type="text"
                value={employer}
                onChange={(e) => setEmployer(e.target.value)}
                placeholder="Company or organization"
                style={{ width: "100%", marginBottom: 20, padding: "12px 14px", border: "1px solid #D6D3D1", borderRadius: 8, fontSize: 14, fontFamily: "var(--font-sans)", outline: "none" }}
              />

              {/* Role */}
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#292524", marginBottom: 6 }}>
                Your role / title
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Analyst"
                style={{ width: "100%", marginBottom: 20, padding: "12px 14px", border: "1px solid #D6D3D1", borderRadius: 8, fontSize: 14, fontFamily: "var(--font-sans)", outline: "none" }}
              />

              {/* Start date */}
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#292524", marginBottom: 6 }}>
                When did you start?
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: "100%", marginBottom: 4, padding: "12px 14px", border: "1px solid #D6D3D1", borderRadius: 8, fontSize: 14, fontFamily: "var(--font-sans)", outline: "none" }}
              />
              <p style={{ fontSize: 12, color: "#A8A29E", marginBottom: 28 }}>Approximate is fine.</p>

              {/* Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button
                  onClick={() => setStep(3)}
                  disabled={!step2Valid}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    borderRadius: 10,
                    border: "none",
                    background: step2Valid ? "#22C55E" : "#D6D3D1",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                    cursor: step2Valid ? "pointer" : "not-allowed",
                  }}
                >
                  Continue
                </button>
                <button
                  onClick={() => setStep(1)}
                  style={{ background: "none", border: "none", fontSize: 14, color: "#78716C", cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left", padding: 0 }}
                >
                  &larr; Back
                </button>
              </div>
            </>
          )}

          {/* ========== STEP 3: FIRST EVENT ========== */}
          {step === 3 && (
            <>
              <h1 style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 700, color: "#292524", marginBottom: 8, letterSpacing: "-0.02em" }}>
                Document your first event
              </h1>
              <p style={{ fontSize: 15, color: "#78716C", lineHeight: 1.6, marginBottom: 28 }}>
                What happened most recently? Write it how you'd tell a trusted friend.
              </p>

              {/* Event type cards */}
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#292524", marginBottom: 10 }}>
                Event type
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
                {EVENT_CARDS.map((ec) => {
                  const sel = eventType === ec.value;
                  return (
                    <button
                      key={ec.value}
                      onClick={() => setEventType(ec.value)}
                      style={{
                        padding: "16px 14px",
                        borderRadius: 10,
                        border: sel ? "2px solid #22C55E" : "1px solid #D6D3D1",
                        background: sel ? "#F0FDF4" : "#fff",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)", color: "#292524", marginBottom: 4 }}>{ec.label}</div>
                      <div style={{ fontSize: 12, color: "#78716C", lineHeight: 1.4 }}>{ec.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Title */}
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#292524", marginBottom: 6 }}>
                Give it a short title <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                type="text"
                value={recordTitle}
                onChange={(e) => setRecordTitle(e.target.value)}
                placeholder="e.g. Manager denied my accommodation request"
                style={{ width: "100%", marginBottom: 20, padding: "12px 14px", border: "1px solid #D6D3D1", borderRadius: 8, fontSize: 14, fontFamily: "var(--font-sans)", outline: "none" }}
              />

              {/* Narrative */}
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#292524", marginBottom: 6 }}>
                What happened? <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                placeholder="Describe what happened in your own words. Include dates, details, and anything you think is relevant."
                rows={4}
                style={{ width: "100%", marginBottom: 20, padding: "12px 14px", border: "1px solid #D6D3D1", borderRadius: 8, fontSize: 14, fontFamily: "var(--font-sans)", outline: "none", resize: "vertical", lineHeight: 1.6 }}
              />

              {/* People */}
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#292524", marginBottom: 6 }}>
                Who was involved?
              </label>
              <input
                type="text"
                value={people}
                onChange={(e) => setPeople(e.target.value)}
                placeholder="e.g. Sarah Chen, Mike Ross"
                style={{ width: "100%", marginBottom: 20, padding: "12px 14px", border: "1px solid #D6D3D1", borderRadius: 8, fontSize: 14, fontFamily: "var(--font-sans)", outline: "none" }}
              />

              {/* Event date */}
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#292524", marginBottom: 6 }}>
                When did it happen?
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                style={{ width: "100%", marginBottom: 28, padding: "12px 14px", border: "1px solid #D6D3D1", borderRadius: 8, fontSize: 14, fontFamily: "var(--font-sans)", outline: "none" }}
              />

              {/* Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button
                  onClick={handleFinish}
                  disabled={!step3Valid || saving}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    borderRadius: 10,
                    border: "none",
                    background: step3Valid && !saving ? "#22C55E" : "#D6D3D1",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                    cursor: step3Valid && !saving ? "pointer" : "not-allowed",
                  }}
                >
                  {saving ? "Saving..." : "Save & finish"}
                </button>
                <button
                  onClick={() => setStep(2)}
                  style={{ background: "none", border: "none", fontSize: 14, color: "#78716C", cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left", padding: 0 }}
                >
                  &larr; Back
                </button>
              </div>
            </>
          )}

          {/* ========== STEP 4: CONFIRMATION ========== */}
          {step === 4 && (
            <div style={{ textAlign: "center" }}>
              {/* Green checkmark circle */}
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F0FDF4", border: "2px solid #22C55E", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>

              <h1 style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 700, color: "#292524", marginBottom: 8, letterSpacing: "-0.02em" }}>
                You're documenting, {firstName}.
              </h1>
              <p style={{ fontSize: 15, color: "#78716C", lineHeight: 1.6, marginBottom: 28 }}>
                Your case file is already building. Every record you add strengthens your position.
              </p>

              {/* What's next card */}
              <div style={{ background: "#FAFAF9", border: "1px solid #E7E5E4", borderRadius: 12, padding: "20px 24px", textAlign: "left", marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#292524", marginBottom: 12 }}>What's next</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {WHATS_NEXT.map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: "#44403C", lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Go to records */}
              <button
                onClick={() => router.push("/dashboard?welcome=1")}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "#22C55E",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                }}
              >
                Go to my records
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "0 20px 40px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#A8A29E" }}>
          Your data is encrypted and private. Only you can see your records.
        </p>
      </div>
    </div>
  );
}
